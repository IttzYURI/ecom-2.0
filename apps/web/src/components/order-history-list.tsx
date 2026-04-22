"use client";

import { useEffect, useState } from "react";

import type { Order } from "@rcc/contracts";

import { formatMoney } from "../lib/currency";

function formatStatus(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function OrderHistoryList({ orders }: { orders: Order[] }) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedOrder(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedOrder]);

  return (
    <>
      <section className="panel order-history-list-panel">
        <div className="order-history-list-header">
          <p className="eyebrow">All previous orders</p>
          <h2>{orders.length} orders</h2>
        </div>
        <div className="order-history-list">
          <div className="order-history-list-row order-history-list-head" aria-hidden="true">
            <span>Order number</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Payment</span>
            <span>Status</span>
          </div>
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              className="order-history-list-row order-history-list-item"
              onClick={() => setSelectedOrder(order)}
            >
              <span>{order.orderNumber}</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              <strong>{formatMoney(order.total)}</strong>
              <span>{formatStatus(order.paymentStatus)}</span>
              <span>{formatStatus(order.orderStatus)}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedOrder ? (
        <div
          className="order-history-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="order-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-history-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="order-history-modal-header">
              <div>
                <p className="eyebrow">Order details</p>
                <h2 id="order-history-modal-title">{selectedOrder.orderNumber}</h2>
              </div>
              <button
                type="button"
                className="order-history-modal-close"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                ×
              </button>
            </div>

            <div className="order-history-modal-grid">
              <div>
                <span>Date</span>
                <strong>{new Date(selectedOrder.createdAt).toLocaleString()}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{formatStatus(selectedOrder.orderStatus)}</strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>{formatStatus(selectedOrder.paymentStatus)}</strong>
              </div>
              <div>
                <span>Fulfilment</span>
                <strong>{formatStatus(selectedOrder.fulfillmentType)}</strong>
              </div>
            </div>

            <div className="order-history-modal-section">
              <p className="eyebrow">Items</p>
              <div className="order-history-modal-lines">
                {selectedOrder.items.map((item) => (
                  <div key={`${selectedOrder.id}-${item.menuItemId}`} className="order-history-modal-line">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <strong>{formatMoney(item.unitPrice * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-history-modal-grid">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(selectedOrder.subtotal)}</strong>
              </div>
              <div>
                <span>Delivery fee</span>
                <strong>{formatMoney(selectedOrder.deliveryFee)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>{formatMoney(selectedOrder.discount)}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatMoney(selectedOrder.total)}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
