import { describe, it, expect } from "vitest";
import type { MenuItem } from "@rcc/contracts";
import { calculateOrder, generateOrderNumber } from "../checkout-calculator";

function menuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: "item_1",
    tenantId: "tenant_1",
    categoryIds: [],
    name: "Test Item",
    slug: "test-item",
    description: "",
    image: "",
    basePrice: 10,
    featured: false,
    bestSeller: false,
    available: true,
    optionGroupIds: [],
    ...overrides
  };
}

describe("calculateOrder", () => {
  it("calculates subtotal from unitPrice * quantity", () => {
    const result = calculateOrder({
      items: [
        { menuItem: menuItem({ id: "a", basePrice: 10 }), quantity: 2 },
        { menuItem: menuItem({ id: "b", basePrice: 5.5 }), quantity: 3 }
      ],
      fulfillmentType: "collection",
      deliveryFee: 3
    });

    expect(result.subtotal).toBe(10 * 2 + 5.5 * 3);
    expect(result.total).toBe(result.subtotal);
  });

  it("applies delivery fee only for delivery orders", () => {
    const items = [{ menuItem: menuItem({ basePrice: 20 }), quantity: 1 }];

    const delivery = calculateOrder({ items, fulfillmentType: "delivery", deliveryFee: 3.99 });
    const collection = calculateOrder({ items, fulfillmentType: "collection", deliveryFee: 3.99 });

    expect(delivery.deliveryFee).toBe(3.99);
    expect(delivery.total).toBe(20 + 3.99);

    expect(collection.deliveryFee).toBe(0);
    expect(collection.total).toBe(20);
  });

  it("uses server-provided delivery fee, not request body", () => {
    const result = calculateOrder({
      items: [{ menuItem: menuItem({ basePrice: 15 }), quantity: 1 }],
      fulfillmentType: "delivery",
      deliveryFee: 2.5
    });

    expect(result.deliveryFee).toBe(2.5);
    expect(result.total).toBe(17.5);
  });

  it("total cannot go below zero even with large discount", () => {
    const result = calculateOrder({
      items: [{ menuItem: menuItem({ basePrice: 5 }), quantity: 1 }],
      fulfillmentType: "collection",
      deliveryFee: 0,
      discount: 100
    });

    expect(result.discount).toBe(100);
    expect(result.total).toBe(0);
  });

  it("returns zero subtotal for empty items", () => {
    const result = calculateOrder({
      items: [],
      fulfillmentType: "collection",
      deliveryFee: 3
    });

    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
    expect(result.lines).toHaveLength(0);
  });

  it("handles large quantities", () => {
    const result = calculateOrder({
      items: [{ menuItem: menuItem({ basePrice: 1.5 }), quantity: 50 }],
      fulfillmentType: "collection",
      deliveryFee: 0
    });

    expect(result.subtotal).toBe(75);
    expect(result.total).toBe(75);
  });

  it("produces correct line metadata", () => {
    const result = calculateOrder({
      items: [{ menuItem: menuItem({ id: "x", name: "Pizza", basePrice: 12.99 }), quantity: 2 }],
      fulfillmentType: "collection",
      deliveryFee: 0
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toEqual({
      menuItemId: "x",
      name: "Pizza",
      quantity: 2,
      unitPrice: 12.99,
      selectedOptions: []
    });
  });
});

describe("generateOrderNumber", () => {
  it("generates a string with prefix-timestamp-random format", () => {
    const number = generateOrderNumber("Bella Roma");
    expect(number).toMatch(/^[A-Z0-9]{2,}-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it("extracts two-letter prefix from two-word name", () => {
    const number = generateOrderNumber("Bella Roma");
    expect(number.startsWith("BR-")).toBe(true);
  });

  it("extracts two-letter prefix from single word", () => {
    const number = generateOrderNumber("Spice");
    expect(number.startsWith("SP-")).toBe(true);
  });

  it("falls back to OR for short/empty names", () => {
    const number = generateOrderNumber("");
    expect(number.startsWith("OR-")).toBe(true);
  });

  it("generates unique numbers on repeated calls", () => {
    const a = generateOrderNumber("Test");
    const b = generateOrderNumber("Test");
    expect(a).not.toBe(b);
  });
});
