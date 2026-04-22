import { NextRequest, NextResponse } from "next/server";

import { getStoredExtAdminUsers } from "../../../../../lib/extadmin-user-store";
import { getStoredMenuContent } from "../../../../../lib/menu-store";
import { createStoredOrder } from "../../../../../lib/operations-store";
import { sendEmailNotification } from "../../../../../lib/notifications";
import { getStoredTenantSettings } from "../../../../../lib/settings-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const appOrigin = request.nextUrl.origin;
  const tenantId = body.tenantId ?? "tenant_bella";
  const menu = await getStoredMenuContent(tenantId);
  const tenant = await getStoredTenantSettings(tenantId);
  const extAdminUsers = await getStoredExtAdminUsers(tenantId);
  const requestedItems = Array.isArray(body.items) ? body.items : [];

  const orderItems = requestedItems
    .map((line: { menuItemId?: string; quantity?: number }) => {
      const menuItem = menu.menuItems.find((item) => item.id === line.menuItemId);

      if (!menuItem) {
        return null;
      }

      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: Math.max(1, Number(line.quantity ?? 1)),
        unitPrice: menuItem.basePrice,
        selectedOptions: []
      };
    })
    .filter(Boolean);

  if (!orderItems.length) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "CHECKOUT_ITEMS_REQUIRED",
          message: "At least one valid menu item is required."
        }
      },
      { status: 400 }
    );
  }

  const subtotal = orderItems.reduce(
    (sum: number, item: { unitPrice: number; quantity: number }) =>
      sum + item.unitPrice * item.quantity,
    0
  );
  const deliveryFee = body.fulfillmentType === "delivery" ? 3.5 : 0;
  const paymentMethod = body.paymentMethod === "cash" ? "cash" : "stripe";
  const orderNumber = `BR-${Math.floor(1000 + Math.random() * 9000)}`;
  const order = await createStoredOrder(tenantId, {
    orderNumber,
    customerName: body.customer?.name ?? "Guest Customer",
    customerEmail: body.customer?.email ?? "guest@example.com",
    customerPhone: body.customer?.phone ?? "",
    fulfillmentType: body.fulfillmentType === "collection" ? "collection" : "delivery",
    address: body.address?.line1 ?? "",
    items: orderItems,
    subtotal,
    deliveryFee,
    discount: 0,
    total: subtotal + deliveryFee,
    orderStatus: paymentMethod === "cash" ? "placed" : "pending_payment",
    paymentStatus: "pending"
  });

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

  if (trackingLink && order.customerEmail) {
    await sendEmailNotification({
      tenantId,
      to: order.customerEmail,
      subject: `[${tenant.name}] Track your delivery order ${order.orderNumber}`,
      text: [
        `Thanks for ordering from ${tenant.name}.`,
        `Order number: ${order.orderNumber}`,
        `Track delivery: ${trackingLink}`
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
