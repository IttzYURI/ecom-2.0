"use client";

import { useState, useTransition } from "react";

import type { MenuItem } from "@rcc/contracts";

import { formatMoney } from "../lib/currency";

type FormState =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function Notice({ state }: { state: FormState }) {
  if (state.type === "idle") {
    return null;
  }

  return (
    <p className={state.type === "success" ? "form-notice notice-success" : "form-notice notice-error"}>
      {state.message}
    </p>
  );
}

export function PublicBookingForm({ tenantId }: { tenantId: string }) {
  const [state, setState] = useState<FormState>({ type: "idle" });
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const payload = {
          tenantId,
          customerName: String(formData.get("customerName") ?? "").trim(),
          phone: String(formData.get("phone") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim(),
          partySize: Number(formData.get("partySize") ?? 2),
          bookingDate: String(formData.get("bookingDate") ?? ""),
          bookingTime: String(formData.get("bookingTime") ?? ""),
          notes: String(formData.get("notes") ?? "").trim()
        };

        if (!payload.customerName || !payload.phone || !payload.email || !payload.bookingDate || !payload.bookingTime) {
          setState({ type: "error", message: "Please complete the booking form before sending it." });
          return;
        }

        startTransition(async () => {
          try {
            const response = await fetch("/api/v1/public/bookings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
              throw new Error(result.error?.message ?? "Unable to request the booking right now.");
            }

            setState({
              type: "success",
              message: `Booking request received. Reference ${result.data.bookingId}. The restaurant will confirm shortly.`
            });
            form.reset();
          } catch (error) {
            setState({
              type: "error",
              message: error instanceof Error ? error.message : "Unable to request the booking right now."
            });
          }
        });
      }}
    >
      <Notice state={state} />
      <div className="split-grid">
        <input name="customerName" placeholder="Full name" />
        <input name="phone" placeholder="Phone number" />
      </div>
      <input name="email" placeholder="Email address" />
      <div className="split-grid">
        <input name="partySize" type="number" min="1" max="20" defaultValue="2" placeholder="Party size" />
        <input name="bookingDate" type="date" />
      </div>
      <input name="bookingTime" type="time" />
      <textarea name="notes" placeholder="Occasion or booking notes" rows={4} />
      <button type="submit" className="button-primary" disabled={isPending}>
        {isPending ? "Submitting request..." : "Request booking"}
      </button>
    </form>
  );
}

export function PublicContactForm({ tenantId }: { tenantId: string }) {
  const [state, setState] = useState<FormState>({ type: "idle" });
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const payload = {
          tenantId,
          name: String(formData.get("name") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim(),
          message: String(formData.get("message") ?? "").trim()
        };

        if (!payload.name || !payload.email || !payload.message) {
          setState({ type: "error", message: "Please complete your name, email, and message." });
          return;
        }

        startTransition(async () => {
          try {
            const response = await fetch("/api/v1/public/contact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
              throw new Error(result.error?.message ?? "Unable to send the enquiry right now.");
            }

            setState({
              type: "success",
              message: `Message received. Reference ${result.data.inquiryId}. The team will get back to you soon.`
            });
            form.reset();
          } catch (error) {
            setState({
              type: "error",
              message: error instanceof Error ? error.message : "Unable to send the enquiry right now."
            });
          }
        });
      }}
    >
      <Notice state={state} />
      <input name="name" placeholder="Your name" />
      <input name="email" placeholder="Your email" />
      <textarea name="message" rows={5} placeholder="Your message" />
      <button type="submit" className="button-primary" disabled={isPending}>
        {isPending ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}

export function PublicCheckoutForm({
  tenantId,
  menuItems
}: {
  tenantId: string;
  menuItems: MenuItem[];
}) {
  const checkoutItems = menuItems.slice(0, 3);
  const [state, setState] = useState<FormState>({ type: "idle" });
  const [isPending, startTransition] = useTransition();
  const [paymentMessage, setPaymentMessage] = useState<string>("");

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const customerName = String(formData.get("customerName") ?? "").trim();
        const customerPhone = String(formData.get("customerPhone") ?? "").trim();
        const customerEmail = String(formData.get("customerEmail") ?? "").trim();
        const postcode = String(formData.get("postcode") ?? "").trim();
        const city = String(formData.get("city") ?? "").trim();
        const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
        const note = String(formData.get("note") ?? "").trim();
        const fulfillmentType = String(formData.get("fulfillmentType") ?? "delivery");
        const paymentMethod = String(formData.get("paymentMethod") ?? "stripe");
        const items = checkoutItems
          .map((item) => ({
            menuItemId: item.id,
            quantity: Number(formData.get(`qty-${item.id}`) ?? 0)
          }))
          .filter((item) => item.quantity > 0);

        if (!customerName || !customerPhone || !customerEmail || !items.length) {
          setState({
            type: "error",
            message: "Please add at least one item and complete your contact details."
          });
          return;
        }

        if (fulfillmentType === "delivery" && (!postcode || !city || !addressLine1)) {
          setState({
            type: "error",
            message: "Delivery orders need postcode, city, and address details."
          });
          return;
        }

        startTransition(async () => {
          try {
            const checkoutResponse = await fetch("/api/v1/public/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tenantId,
                fulfillmentType,
                paymentMethod,
                note,
                customer: {
                  name: customerName,
                  phone: customerPhone,
                  email: customerEmail
                },
                address: {
                  line1: addressLine1,
                  city,
                  postcode
                },
                items
              })
            });
            const checkoutResult = await checkoutResponse.json();

            if (!checkoutResponse.ok || !checkoutResult.success) {
              throw new Error(checkoutResult.error?.message ?? "Unable to place the order right now.");
            }

            if (paymentMethod === "stripe") {
              const paymentResponse = await fetch("/api/v1/public/payments/intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tenantId,
                  orderId: checkoutResult.data.orderId,
                  amount: Math.round(Number(checkoutResult.data.total) * 100),
                  currency: "gbp"
                })
              });
              const paymentResult = await paymentResponse.json();

              if (!paymentResponse.ok || !paymentResult.success) {
                throw new Error(paymentResult.error?.message ?? "Order saved, but payment intent creation failed.");
              }

              setPaymentMessage(
                `Stripe payment intent ready. Reference ${paymentResult.data.paymentId}. Client secret issued for order ${checkoutResult.data.orderNumber}.`
              );
            } else {
              setPaymentMessage("Cash payment selected. The restaurant can fulfil this order without online payment.");
            }

            setState({
              type: "success",
              message: `Order ${checkoutResult.data.orderNumber} placed successfully. Total ${formatMoney(Number(checkoutResult.data.total))}.`
            });
            form.reset();
          } catch (error) {
            setPaymentMessage("");
            setState({
              type: "error",
              message: error instanceof Error ? error.message : "Unable to place the order right now."
            });
          }
        });
      }}
    >
      <Notice state={state} />
      {paymentMessage ? <p className="form-notice notice-success">{paymentMessage}</p> : null}
      <div className="stack">
        {checkoutItems.map((item) => (
          <label key={item.id} className="choice-card checkout-item-card">
            <span>
              <strong>{item.name}</strong>
              <span>{formatMoney(item.basePrice)}</span>
            </span>
            <input name={`qty-${item.id}`} type="number" min="0" max="12" defaultValue="0" />
          </label>
        ))}
      </div>
      <div className="split-grid">
        <input name="customerName" placeholder="Full name" />
        <input name="customerPhone" placeholder="Phone number" />
      </div>
      <input name="customerEmail" placeholder="Email address" />
      <div className="split-grid">
        <input name="postcode" placeholder="Postcode" />
        <input name="city" placeholder="City" />
      </div>
      <input name="addressLine1" placeholder="Address line 1" />
      <textarea name="note" rows={4} placeholder="Delivery instructions or order notes" />
      <div className="split-grid">
        <label className="choice-card">
          <input type="radio" name="fulfillmentType" value="delivery" defaultChecked />
          <span>Delivery</span>
        </label>
        <label className="choice-card">
          <input type="radio" name="fulfillmentType" value="collection" />
          <span>Collection</span>
        </label>
      </div>
      <div className="split-grid">
        <label className="choice-card">
          <input type="radio" name="paymentMethod" value="stripe" defaultChecked />
          <span>Pay online by card</span>
        </label>
        <label className="choice-card">
          <input type="radio" name="paymentMethod" value="cash" />
          <span>Cash on delivery or collection</span>
        </label>
      </div>
      <button type="submit" className="button-primary block-button" disabled={isPending}>
        {isPending ? "Placing order..." : "Place order"}
      </button>
    </form>
  );
}
