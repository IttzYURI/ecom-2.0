import { promises as fs } from "node:fs";
import path from "node:path";

import type { Booking, Order, StorefrontContent } from "@rcc/contracts";

import {
  getDefaultTenant,
  getTenantBundle
} from "./mock-data";
import { getStoredStorefrontContent } from "./content-store";
import { getStoredStaffMembers } from "./extadmin-user-store";
import { getStoredMenuContent } from "./menu-store";
import { getStoredTenantSettings } from "./settings-store";
import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

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
    store[tenantId] ?? {
      orders: getTenantBundle(tenantId).orders,
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
  const nextValue = {
    ...current,
    orders: current.orders.map((order) =>
      order.id === orderId ? { ...order, orderStatus } : order
    )
  };

  const savedToMongo = await saveTenantDocument("operations_content", tenantId, nextValue);

  if (savedToMongo) {
    return;
  }

  const store = await readOperationsStore();
  store[tenantId] = nextValue;
  await writeOperationsStore(store);
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
    ...input
  };
  const nextValue = {
    ...current,
    orders: [order, ...current.orders]
  };

  const savedToMongo = await saveTenantDocument("operations_content", tenantId, nextValue);

  if (!savedToMongo) {
    const store = await readOperationsStore();
    store[tenantId] = nextValue;
    await writeOperationsStore(store);
  }

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
    orders: current.orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            orderStatus: input.orderStatus ?? order.orderStatus,
            paymentStatus: input.paymentStatus ?? order.paymentStatus
          }
        : order
    )
  };

  const savedToMongo = await saveTenantDocument("operations_content", tenantId, nextValue);

  if (!savedToMongo) {
    const store = await readOperationsStore();
    store[tenantId] = nextValue;
    await writeOperationsStore(store);
  }
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

  const savedToMongo = await saveTenantDocument("operations_content", tenantId, nextValue);

  if (savedToMongo) {
    return;
  }

  const store = await readOperationsStore();
  store[tenantId] = nextValue;
  await writeOperationsStore(store);
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

  const savedToMongo = await saveTenantDocument("operations_content", tenantId, nextValue);

  if (!savedToMongo) {
    const store = await readOperationsStore();
    store[tenantId] = nextValue;
    await writeOperationsStore(store);
  }

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
    orders: operations.orders,
    bookings: operations.bookings
  };
}
