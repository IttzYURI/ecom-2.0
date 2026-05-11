import { NextRequest, NextResponse } from "next/server";

import { calculateOrder, generateOrderNumber } from "../../../../../lib/checkout-calculator";
import { isTenantAcceptingOrders, requireTenantFeature } from "../../../../../lib/feature-gating";
import { getStoredExtAdminUsers } from "../../../../../lib/extadmin-user-store";
import { getStoredMenuContent } from "../../../../../lib/menu-store";
import { createStoredOrder } from "../../../../../lib/operations-store";
import { ensureAutoPrintJobForOrder } from "../../../../../lib/printing-service";
import { sendEmailNotification } from "../../../../../lib/notifications";
import { getStoredTenantSettings } from "../../../../../lib/settings-store";
import { getTenantSetupRecord } from "../../../../../lib/tenant-setup-store";
import { resolvePublicTenantFromRequest } from "../../../../../lib/tenant-resolver";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const appOrigin = request.nextUrl.origin;
  const tenantId = (await resolvePublicTenantFromRequest(request)).tenantId;

  const { accepting, reason } = await isTenantAcceptingOrders(tenantId);

  if (!accepting) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: reason ?? "ORDERS_DISABLED",
          message: reason === "SUBSCRIPTION_INACTIVE"
            ? "This restaurant's subscription is not active."
            : "Online ordering is currently disabled for this restaurant."
        }
      },
      { status: 403 }
    );
  }

  const [menu, tenant, extAdminUsers, setup] = await Promise.all([
    getStoredMenuContent(tenantId),
    getStoredTenantSettings(tenantId),
    getStoredExtAdminUsers(tenantId),
    getTenantSetupRecord(tenantId)
  ]);

  const fulfillmentType = body.fulfillmentType === "collection" ? "collection" : "delivery";

  if (setup && fulfillmentType === "delivery" && !setup.deliveryEnabled) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "DELIVERY_DISABLED", message: "Delivery is not enabled for this restaurant." }
      },
      { status: 400 }
    );
  }

  if (setup && fulfillmentType === "collection" && !setup.collectionEnabled) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "COLLECTION_DISABLED", message: "Collection is not enabled for this restaurant." }
      },
      { status: 400 }
    );
  }

  const requestedPaymentMethod = body.paymentMethod === "cash" ? "cash" : "stripe";

  if (requestedPaymentMethod === "cash") {
    const { allowed } = await requireTenantFeature(tenantId, "cashPayment");

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          meta: {},
          error: { code: "CASH_PAYMENT_DISABLED", message: "Cash payment is not enabled for this restaurant." }
        },
        { status: 400 }
      );
    }
  }

  if (requestedPaymentMethod === "stripe") {
    const { allowed } = await requireTenantFeature(tenantId, "cardPayment");

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          meta: {},
          error: { code: "CARD_PAYMENT_DISABLED", message: "Card payment is not enabled for this restaurant." }
        },
        { status: 400 }
      );
    }
  }

  const customerName = String(body.customer?.name ?? "").trim();
  const customerEmail = String(body.customer?.email ?? "").trim();
  const customerPhone = String(body.customer?.phone ?? "").trim();

  if (!customerName || customerName.length < 2) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "CUSTOMER_NAME_REQUIRED", message: "Customer name is required." }
      },
      { status: 400 }
    );
  }

  if (!customerEmail || !customerEmail.includes("@")) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "CUSTOMER_EMAIL_REQUIRED", message: "A valid customer email is required." }
      },
      { status: 400 }
    );
  }

  const requestedItems: Array<{ menuItemId?: string; quantity?: number }> = Array.isArray(body.items) ? body.items : [];

  if (!requestedItems.length) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "CHECKOUT_ITEMS_REQUIRED", message: "At least one menu item is required." }
      },
      { status: 400 }
    );
  }

  const validatedItems = requestedItems
    .map((line) => {
      const menuItem = menu.menuItems.find((item) => item.id === line.menuItemId);
      if (!menuItem) {
        return null;
      }
      if (!menuItem.available) {
        return null;
      }
      const quantity = Math.max(1, Math.min(99, Number(line.quantity ?? 1)));
      if (!Number.isFinite(quantity)) {
        return null;
      }
      return { menuItem, quantity };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!validatedItems.length) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "CHECKOUT_ITEMS_UNAVAILABLE", message: "None of the selected items are currently available." }
      },
      { status: 400 }
    );
  }

  const deliveryFee = fulfillmentType === "delivery" ? (setup?.deliveryFee ?? 0) : 0;
  const calculated = calculateOrder({
    items: validatedItems,
    fulfillmentType,
    deliveryFee
  });

  const minimumOrderAmount = setup?.minimumOrderAmount ?? 0;

  if (calculated.subtotal < minimumOrderAmount) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: { code: "MINIMUM_ORDER_NOT_MET", message: `Minimum order amount is ${minimumOrderAmount.toFixed(2)}.` }
      },
      { status: 400 }
    );
  }

  const orderNumber = generateOrderNumber(tenant.name);
  const paymentMethod = requestedPaymentMethod;
  const order = await createStoredOrder(tenantId, {
    orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    fulfillmentType,
    address: fulfillmentType === "delivery" ? (body.address?.line1 ?? "") : "",
    items: calculated.lines,
    subtotal: calculated.subtotal,
    deliveryFee: calculated.deliveryFee,
    discount: calculated.discount,
    total: calculated.total,
    orderStatus: paymentMethod === "cash" ? "placed" : "pending_payment",
    paymentStatus: "pending",
    paymentMethod
  });

  if (paymentMethod === "cash") {
    await ensureAutoPrintJobForOrder(tenantId, order.id);
  }

  const orderEmailRecipients = extAdminUsers.filter((user) => user.orderEmailsEnabled);
  const trackingLink =
    order.fulfillmentType === "delivery" && order.deliveryTracking
      ? `${appOrigin}/track/${order.deliveryTracking.trackingToken}`
      : null;

  for (const recipient of orderEmailRecipients) {
    await sendEmailNotification({
      tenantId,
      to: recipient.email,
      subject: `[${tenant.name}] New order ${order.orderNumber} | ${order.fulfillmentType === "delivery" ? "Delivery" : "Collection"}`,
      text: [
        `${order.customerName} placed a ${order.fulfillmentType} order.`,
        `Order number: ${order.orderNumber}`,
        `Total: ${order.total.toFixed(2)}`,
        `Customer email: ${order.customerEmail}`,
        `Customer phone: ${order.customerPhone || "Not provided"}`,
        trackingLink ? `Tracking link: ${trackingLink}` : null
      ].join("\n")
    });
  }

  if (order.customerEmail) {
    await sendEmailNotification({
      tenantId,
      to: order.customerEmail,
      subject: `[${tenant.name}] Your order ${order.orderNumber} is confirmed`,
      text: [
        `Thanks for ordering from ${tenant.name}.`,
        `Order number: ${order.orderNumber}`,
        `Fulfillment: ${order.fulfillmentType === "delivery" ? "Delivery" : "Collection"}`,
        `Total: ${order.total.toFixed(2)}`,
        trackingLink ? `Track delivery: ${trackingLink}` : null
      ].join("\n")
    });
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        total: order.total,
        totalMinor: Math.round(order.total * 100),
        fulfillmentType: order.fulfillmentType,
        trackingToken: order.deliveryTracking?.trackingToken ?? null,
        trackingLink
      },
      meta: {},
      error: null
    },
    { status: 201 }
  );
}
