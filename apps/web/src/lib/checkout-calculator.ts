import type { MenuItem } from "@rcc/contracts";

type OrderLineInput = {
  menuItem: MenuItem;
  quantity: number;
};

export type CalculatedOrder = {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  lines: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    selectedOptions: Array<{ optionGroupId: string; optionIds: string[] }>;
  }>;
};

export function calculateOrder(input: {
  items: OrderLineInput[];
  fulfillmentType: "delivery" | "collection";
  deliveryFee: number;
  discount?: number;
}): CalculatedOrder {
  const lines = input.items.map((entry) => ({
    menuItemId: entry.menuItem.id,
    name: entry.menuItem.name,
    quantity: entry.quantity,
    unitPrice: entry.menuItem.basePrice,
    selectedOptions: []
  }));

  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const deliveryFee = input.fulfillmentType === "delivery" ? input.deliveryFee : 0;
  const discount = input.discount ?? 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  return { subtotal, deliveryFee, discount, total, lines };
}

export function generateOrderNumber(tenantName: string): string {
  const prefix = extractOrderPrefix(tenantName);
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function extractOrderPrefix(name: string): string {
  const words = name
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return "OR";
}
