import { promises as fs } from "node:fs";
import path from "node:path";

import type { Booking, Order, StorefrontContent } from "@rcc/contracts";

import {
  appendTrackingEvent,
  applyDeliveryStatusUpdate,
  createInitialDeliveryTracking,
  normalizeDeliveryTracking,
  sanitizeApproximateLocation
} from "./delivery-tracking";
import { getStoredDrivers } from "./driver-store";
import {
  getDefaultTenant,
  getTenantBundle
} from "./mock-data";
import { getStoredStorefrontContent } from "./content-store";
import { getStoredStaffMembers } from "./extadmin-user-store";
import { getStoredMenuContent } from "./menu-store";
import { getStoredTenantSettings } from "./settings-store";
import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";
import { estimateDeliveryEtaMinutes } from "./routing";

const operationsFilePath = path.join(process.cwd(), "data", "operations-content.json");

type OperationsStore = Record<
  string,
  {
    orders: Order[];
    bookings: Booking[];
  }
>;

async function ensureOperationsStoreFile() {
  try {
    await fs.access(operationsFilePath);
  } catch {
    const tenantId = getDefaultTenant().id;
    const seedBundle = getTenantBundle(tenantId);
    const initial: OperationsStore = {
      [tenantId]: {
        orders: seedBundle.orders,
        bookings: seedBundle.bookings
      }
    };
    await fs.mkdir(path.dirname(operationsFilePath), { recursive: true });
    await fs.writeFile(operationsFilePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readOperationsStore(): Promise<OperationsStore> {
  await ensureOperationsStoreFile();
  const raw = await fs.readFile(operationsFilePath, "utf8");
  return JSON.parse(raw) as OperationsStore;
}

async function writeOperationsStore(store: OperationsStore) {
  await fs.writeFile(operationsFilePath, JSON.stringify(store, null, 2), "utf8");
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeOrders(orders: Order[]) {
  return orders.map((order) => normalizeDeliveryTracking(order));
}

async function persistOperationsContent(
  tenantId: string,
  nextValue: {
    orders: Order[];
    bookings: Booking[];
  }
) {
  const savedToMongo = await saveTenantDocument("operations_content", tenantId, nextValue);

  if (savedToMongo) {
    return;
  }

  const store = await readOperationsStore();
  store[tenantId] = nextValue;
  await writeOperationsStore(store);
}

export async function getStoredOperationsContent(tenantId: string) {
  const mongoOperations = await getTenantDocument<{
    orders: Order[];
    bookings: Booking[];
  }>("operations_content", tenantId);

  if (mongoOperations) {
    return mongoOperations;
  }

  const store = await readOperationsStore();

  return (
    store[tenantId]
      ? {
          ...store[tenantId],
          orders: normalizeOrders(store[tenantId].orders)
        }
      : {
          orders: normalizeOrders(getTenantBundle(tenantId).orders),
          bookings: getTenantBundle(tenantId).bookings
        }
  );
}

export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  orderStatus: Order["orderStatus"]
) {
  const current = await getStoredOperationsContent(tenantId);
  const now = new Date().toISOString();
  const nextValue = {
    ...current,
    orders: normalizeOrders(
      current.orders.map((order) => {
        if (order.id !== orderId) {
          return order;
        }

        let nextOrder: Order = {
          ...order,
          orderStatus
        };

        if (nextOrder.deliveryTracking) {
          let nextTracking = nextOrder.deliveryTracking;

          if (orderStatus === "placed" && !nextTracking.trackingEvents.some((event) => event.type === "order_confirmed")) {
            nextTracking = appendTrackingEvent(
              nextTracking,
              "order_confirmed",
              now,
              "The restaurant has confirmed the delivery order."
            );
          }

          if (orderStatus === "accepted" || orderStatus === "preparing") {
            nextTracking = appendTrackingEvent(
              nextTracking,
              "preparing",
              now,
              "The kitchen is preparing the order."
            );
          }

          if (orderStatus === "completed" && nextTracking.deliveryStatus === "awaiting_dispatch") {
            nextTracking = applyDeliveryStatusUpdate(
              nextTracking,
              "awaiting_dispatch",
              now,
              {
                description: "The order is packed and ready to leave the restaurant."
              }
            );
          }

          if (["cancelled", "refunded"].includes(orderStatus)) {
            nextTracking = applyDeliveryStatusUpdate(
              nextTracking,
              "delivery_failed",
              now,
              {
                description: "The delivery will not continue for this order."
              }
            );
          }

          nextOrder = {
            ...nextOrder,
            deliveryTracking: nextTracking
          };
        }

        return nextOrder;
      })
    )
  };

  await persistOperationsContent(tenantId, nextValue);
}

export async function createStoredOrder(
  tenantId: string,
  input: Omit<Order, "id" | "tenantId" | "createdAt">
) {
  const current = await getStoredOperationsContent(tenantId);
  const order: Order = {
    id: createId("order"),
    tenantId,
    createdAt: new Date().toISOString(),
    ...input,
    deliveryTracking:
      input.fulfillmentType === "delivery"
        ? input.deliveryTracking ?? createInitialDeliveryTracking({
            createdAt: new Date().toISOString(),
            orderStatus: input.orderStatus
          })
        : null
  };
  const nextValue = {
    ...current,
    orders: normalizeOrders([order, ...current.orders])
  };

  await persistOperationsContent(tenantId, nextValue);

  return order;
}

export async function updateStoredOrderPayment(
  tenantId: string,
  orderId: string,
  input: {
    orderStatus?: Order["orderStatus"];
    paymentStatus?: Order["paymentStatus"];
  }
) {
  const current = await getStoredOperationsContent(tenantId);
  const nextValue = {
    ...current,
    orders: normalizeOrders(current.orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            orderStatus: input.orderStatus ?? order.orderStatus,
            paymentStatus: input.paymentStatus ?? order.paymentStatus
          }
        : order
    ))
  };

  await persistOperationsContent(tenantId, nextValue);
}

export async function getStoredCustomerOrders(tenantId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const current = await getStoredOperationsContent(tenantId);

  return current.orders
    .filter((order) => order.customerEmail.trim().toLowerCase() === normalizedEmail)
    .map((order) => normalizeDeliveryTracking(order))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export async function getStoredActiveCustomerOrder(tenantId: string, email: string) {
  const orders = await getStoredCustomerOrders(tenantId, email);
  return (
    orders.find((order) =>
      order.fulfillmentType === "delivery"
        ? !!order.deliveryTracking &&
          !["delivered", "delivery_failed"].includes(order.deliveryTracking.deliveryStatus)
        : ["pending_payment", "placed", "accepted", "preparing"].includes(order.orderStatus)
    ) ?? null
  );
}

export async function getStoredOrderById(tenantId: string, orderId: string) {
  const current = await getStoredOperationsContent(tenantId);
  return current.orders.find((order) => order.id === orderId) ?? null;
}

export async function getStoredOrderByTrackingToken(tenantId: string, trackingToken: string) {
  const current = await getStoredOperationsContent(tenantId);
  return (
    current.orders.find((order) => order.deliveryTracking?.trackingToken === trackingToken) ?? null
  );
}

export async function getStoredCustomerOrderTracking(tenantId: string, email: string, orderId: string) {
  const order = await getStoredOrderById(tenantId, orderId);

  if (!order) {
    return null;
  }

  if (order.customerEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return null;
  }

  return normalizeDeliveryTracking(order);
}

export async function assignStoredOrderDriver(
  tenantId: string,
  orderId: string,
  driverId: string,
  etaMinutes?: number
) {
  const current = await getStoredOperationsContent(tenantId);
  const drivers = await getStoredDrivers(tenantId);
  const driver = drivers.find((entry) => entry.id === driverId) ?? null;
  const now = new Date().toISOString();
  const nextValue = {
    ...current,
    orders: normalizeOrders(
      current.orders.map((order) => {
        if (order.id !== orderId || !order.deliveryTracking) {
          return order;
        }

        const baseTracking = {
          ...order.deliveryTracking,
          assignedDriverId: driver?.id,
          assignedDriverName: driver?.name,
          estimatedDeliveredAt:
            typeof etaMinutes === "number" ? new Date(Date.now() + etaMinutes * 60000).toISOString() : order.deliveryTracking.estimatedDeliveredAt,
          lastUpdatedAt: now
        };

        return {
          ...order,
          deliveryTracking: driver
            ? appendTrackingEvent(
                {
                  ...baseTracking,
                  deliveryStatus: "driver_assigned"
                },
                "driver_assigned",
                now,
                `${driver.name} has been assigned to this delivery.`
              )
            : appendTrackingEvent(
                {
                  ...baseTracking,
                  assignedDriverId: undefined,
                  assignedDriverName: undefined
                },
                "driver_unassigned",
                now,
                "The delivery assignment has been cleared."
              )
        };
      })
    )
  };

  await persistOperationsContent(tenantId, nextValue);
}

export async function updateStoredOrderDeliveryStatus(
  tenantId: string,
  orderId: string,
  deliveryStatus: NonNullable<Order["deliveryTracking"]>["deliveryStatus"],
  input?: {
    etaMinutes?: number;
    description?: string;
    location?: {
      lat: number;
      lng: number;
      accuracyMeters: number;
    };
  }
) {
  const current = await getStoredOperationsContent(tenantId);
  const now = new Date().toISOString();
  const nextValue = {
    ...current,
    orders: normalizeOrders(
      current.orders.map((order) => {
        if (order.id !== orderId || !order.deliveryTracking) {
          return order;
        }

        const estimatedDeliveredAt =
          typeof input?.etaMinutes === "number"
            ? new Date(Date.now() + input.etaMinutes * 60000).toISOString()
            : input?.location
              ? new Date(
                  Date.now() +
                    estimateDeliveryEtaMinutes(order, {
                      lat: input.location.lat,
                      lng: input.location.lng
                    }) *
                      60000
                ).toISOString()
              : order.deliveryTracking.estimatedDeliveredAt;
        const trackingWithEta =
          typeof input?.etaMinutes === "number"
            ? appendTrackingEvent(
                {
                  ...order.deliveryTracking,
                  estimatedDeliveredAt
                },
                "eta_updated",
                now,
                estimatedDeliveredAt
                  ? `Estimated arrival updated to ${new Date(estimatedDeliveredAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}.`
                  : "Estimated arrival updated."
              )
            : order.deliveryTracking;

        return {
          ...order,
          deliveryTracking: applyDeliveryStatusUpdate(trackingWithEta, deliveryStatus, now, {
            estimatedDeliveredAt,
            description: input?.description,
            lastKnownLocation: input?.location
              ? sanitizeApproximateLocation({
                  lat: input.location.lat,
                  lng: input.location.lng,
                  accuracyMeters: input.location.accuracyMeters,
                  capturedAt: now
                })
              : trackingWithEta.lastKnownLocation
          })
        };
      })
    )
  };

  await persistOperationsContent(tenantId, nextValue);
}

export async function appendStoredOrderTrackingEvent(
  tenantId: string,
  orderId: string,
  type: Parameters<typeof appendTrackingEvent>[1],
  description?: string
) {
  const current = await getStoredOperationsContent(tenantId);
  const now = new Date().toISOString();
  const nextValue = {
    ...current,
    orders: normalizeOrders(
      current.orders.map((order) =>
        order.id === orderId && order.deliveryTracking
          ? {
              ...order,
              deliveryTracking: appendTrackingEvent(order.deliveryTracking, type, now, description)
            }
          : order
      )
    )
  };

  await persistOperationsContent(tenantId, nextValue);
}

export async function updateBookingStatus(
  tenantId: string,
  bookingId: string,
  status: Booking["status"]
) {
  const current = await getStoredOperationsContent(tenantId);
  const nextValue = {
    ...current,
    bookings: current.bookings.map((booking) =>
      booking.id === bookingId ? { ...booking, status } : booking
    )
  };

  await persistOperationsContent(tenantId, nextValue);
}

export async function createStoredBooking(
  tenantId: string,
  input: Omit<Booking, "id" | "tenantId">
) {
  const current = await getStoredOperationsContent(tenantId);
  const booking: Booking = {
    id: createId("booking"),
    tenantId,
    ...input
  };
  const nextValue = {
    ...current,
    bookings: [booking, ...current.bookings]
  };

  await persistOperationsContent(tenantId, nextValue);

  return booking;
}

export async function getRuntimeTenantBundleWithOperations(
  tenantId: string,
  contentOverride?: StorefrontContent
) {
  const content = contentOverride ?? (await getStoredStorefrontContent(tenantId));
  const menu = await getStoredMenuContent(tenantId);
  const operations = await getStoredOperationsContent(tenantId);
  const staff = await getStoredStaffMembers(tenantId);
  const drivers = await getStoredDrivers(tenantId);
  const tenant = await getStoredTenantSettings(tenantId);

  const bundle = getTenantBundle(
    tenantId,
    content,
    menu.categories,
    menu.menuItems,
    tenant
  );

  return {
    ...bundle,
    staff,
    drivers,
    orders: normalizeOrders(operations.orders),
    bookings: operations.bookings
  };
}
