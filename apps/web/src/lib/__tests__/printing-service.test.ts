import { describe, it, expect } from "vitest";
import type { Order, OrderPrintState } from "@rcc/contracts";
import { isOrderEligibleForAutoPrint } from "../printing-service";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "order_1",
    tenantId: "tenant_1",
    orderNumber: "BR-ABC-1234",
    customerName: "Test",
    customerEmail: "test@test.com",
    customerPhone: "",
    fulfillmentType: "collection",
    items: [],
    subtotal: 10,
    deliveryFee: 0,
    discount: 0,
    total: 10,
    orderStatus: "placed",
    paymentStatus: "pending",
    paymentMethod: "cash",
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("isOrderEligibleForAutoPrint", () => {
  it("cash order with status placed is eligible", () => {
    expect(isOrderEligibleForAutoPrint(order({
      paymentMethod: "cash",
      orderStatus: "placed",
      paymentStatus: "pending"
    }))).toBe(true);
  });

  it("cash order with status pending_payment is not eligible", () => {
    expect(isOrderEligibleForAutoPrint(order({
      paymentMethod: "cash",
      orderStatus: "pending_payment",
      paymentStatus: "pending"
    }))).toBe(false);
  });

  it("stripe order with placed + paid is eligible", () => {
    expect(isOrderEligibleForAutoPrint(order({
      paymentMethod: "stripe",
      orderStatus: "placed",
      paymentStatus: "paid"
    }))).toBe(true);
  });

  it("stripe order with placed + pending payment is not eligible", () => {
    expect(isOrderEligibleForAutoPrint(order({
      paymentMethod: "stripe",
      orderStatus: "placed",
      paymentStatus: "pending"
    }))).toBe(false);
  });

  it("cancelled order is not eligible", () => {
    expect(isOrderEligibleForAutoPrint(order({
      orderStatus: "cancelled"
    }))).toBe(false);
  });

  it("refunded order is not eligible", () => {
    expect(isOrderEligibleForAutoPrint(order({
      paymentStatus: "refunded"
    }))).toBe(false);
  });

  it("failed payment order is not eligible", () => {
    expect(isOrderEligibleForAutoPrint(order({
      paymentStatus: "failed"
    }))).toBe(false);
  });

  it("already-printed order is not eligible", () => {
    const state: OrderPrintState = {
      orderId: "order_1",
      tenantId: "tenant_1",
      hasKitchenPrint: true,
      printCount: 1,
      reprintCount: 0
    };

    expect(isOrderEligibleForAutoPrint(order(), state)).toBe(false);
  });

  it("null order is not eligible", () => {
    expect(isOrderEligibleForAutoPrint(null)).toBe(false);
  });

  it("order without explicit paymentMethod inferred as cash when placed + no pending_payment", () => {
    expect(isOrderEligibleForAutoPrint(order({
      paymentMethod: undefined,
      orderStatus: "placed",
      paymentStatus: "pending"
    }))).toBe(true);
  });

  it("order without paymentMethod inferred as stripe when pending_payment status", () => {
    expect(isOrderEligibleForAutoPrint(order({
      paymentMethod: undefined,
      orderStatus: "pending_payment",
      paymentStatus: "pending"
    }))).toBe(false);
  });
});
