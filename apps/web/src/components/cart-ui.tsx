"use client";

import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { MenuItem } from "@rcc/contracts";

import { formatMoney } from "../lib/currency";
import { readCustomerInfo, readCustomerSession } from "./customer-session";

function getCartStorageKey() {
  const host = typeof window !== "undefined" ? window.location.hostname : "default";
  return `cart-${host}`;
}

function getCartUpdatedEvent() {
  const host = typeof window !== "undefined" ? window.location.hostname : "default";
  return `cart-updated-${host}`;
}

function getCheckoutPreferencesKey() {
  const host = typeof window !== "undefined" ? window.location.hostname : "default";
  return `checkout-prefs-${host}`;
}

const CHECKOUT_PREFERENCES_KEY = getCheckoutPreferencesKey();

type StoredCartItem = {
  menuItemId: string;
  quantity: number;
};

type CheckoutPreferences = {
  fulfillmentType: "collection" | "delivery";
  deliveryAddress: string;
};

export function readCart(): StoredCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getCartStorageKey());

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as StoredCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(items: StoredCartItem[]) {
  window.localStorage.setItem(getCartStorageKey(), JSON.stringify(items));
  window.dispatchEvent(new Event(getCartUpdatedEvent()));
}

function readCheckoutPreferences(): CheckoutPreferences {
  if (typeof window === "undefined") {
    return {
      fulfillmentType: "collection",
      deliveryAddress: ""
    };
  }

  try {
    const raw = window.localStorage.getItem(CHECKOUT_PREFERENCES_KEY);

    if (!raw) {
      return {
        fulfillmentType: "collection",
        deliveryAddress: ""
      };
    }

    const parsed = JSON.parse(raw) as Partial<CheckoutPreferences>;
    return {
      fulfillmentType: parsed.fulfillmentType === "delivery" ? "delivery" : "collection",
      deliveryAddress: typeof parsed.deliveryAddress === "string" ? parsed.deliveryAddress : ""
    };
  } catch {
    return {
      fulfillmentType: "collection",
      deliveryAddress: ""
    };
  }
}

function writeCheckoutPreferences(preferences: CheckoutPreferences) {
  window.localStorage.setItem(CHECKOUT_PREFERENCES_KEY, JSON.stringify(preferences));
}

function clearCheckoutPreferences() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CHECKOUT_PREFERENCES_KEY);
}

function getItemQuantity(menuItemId: string) {
  return readCart().find((item) => item.menuItemId === menuItemId)?.quantity ?? 0;
}

export function setItemQuantity(menuItemId: string, quantity: number) {
  const items = readCart();
  const existingIndex = items.findIndex((item) => item.menuItemId === menuItemId);

  if (existingIndex === -1) {
    if (quantity > 0) {
      writeCart([...items, { menuItemId, quantity }]);
      return;
    }

    writeCart(items);
    return;
  }

  if (quantity > 0) {
    const nextItems = items.slice();
    nextItems[existingIndex] = { menuItemId, quantity };
    writeCart(nextItems);
    return;
  }

  writeCart(items.filter((item) => item.menuItemId !== menuItemId));
}

function getCartCount(items: StoredCartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function AddToCartButton({ menuItemId }: { menuItemId: string }) {
  const [isAdded, setIsAdded] = useState(false);
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    function syncQuantity() {
      setQuantity(getItemQuantity(menuItemId));
    }

    syncQuantity();
    window.addEventListener(getCartUpdatedEvent(), syncQuantity);
    window.addEventListener("storage", syncQuantity);

    return () => {
      window.removeEventListener(getCartUpdatedEvent(), syncQuantity);
      window.removeEventListener("storage", syncQuantity);
    };
  }, [menuItemId]);

  return (
    <div className="menu-order-controls">
      <button
        type="button"
        className={`button-ghost compact-button menu-order-button${isAdded ? " is-added" : ""}`}
        onClick={() => {
          setItemQuantity(menuItemId, quantity + 1);
          setIsAdded(true);
          window.setTimeout(() => setIsAdded(false), 1200);
        }}
      >
        {isAdded ? "Added" : "Add to order"}
      </button>
      {quantity > 0 ? (
        <div className="menu-order-quantity" aria-label="Selected quantity">
          <button type="button" onClick={() => setItemQuantity(menuItemId, quantity - 1)} aria-label="Decrease quantity">
            -
          </button>
          <span>{quantity}</span>
          <button type="button" onClick={() => setItemQuantity(menuItemId, quantity + 1)} aria-label="Increase quantity">
            +
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getCartTotal(items: StoredCartItem[], menuItems: MenuItem[]) {
  return items.reduce((sum, item) => {
    const menuItem = menuItems.find((entry) => entry.id === item.menuItemId);
    return sum + (menuItem ? menuItem.basePrice * item.quantity : 0);
  }, 0);
}

type CartLine = {
  item: MenuItem;
  quantity: number;
};

function getCartLines(items: StoredCartItem[], menuItems: MenuItem[]): CartLine[] {
  return items
    .map((entry) => {
      const item = menuItems.find((menuItem) => menuItem.id === entry.menuItemId);
      return item ? { item, quantity: entry.quantity } : null;
    })
    .filter((entry): entry is CartLine => Boolean(entry));
}

export function FloatingCartButton({ menuItems }: { menuItems: MenuItem[] }) {
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  useEffect(() => {
    function syncCartCount() {
      const cartItems = readCart();
      setCartCount(getCartCount(cartItems));
      setCartTotal(getCartTotal(cartItems, menuItems));
    }

    syncCartCount();
    window.addEventListener(getCartUpdatedEvent(), syncCartCount);
    window.addEventListener("storage", syncCartCount);

    return () => {
      window.removeEventListener(getCartUpdatedEvent(), syncCartCount);
      window.removeEventListener("storage", syncCartCount);
    };
  }, [menuItems]);

  if (cartCount < 1) {
    return null;
  }

  return (
    <Link href="/cart" className="floating-cart-button">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 5h2.1l1.7 8.1a1 1 0 0 0 1 .8h8.5a1 1 0 0 0 1-.8l1.4-5.8H7.2" />
        <circle cx="10" cy="18.5" r="1.4" />
        <circle cx="17" cy="18.5" r="1.4" />
      </svg>
      <span className="sr-only">View cart</span>
      <strong>{formatMoney(cartTotal)}</strong>
    </Link>
  );
}

export function CartPageClient({ menuItems }: { menuItems: MenuItem[] }) {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<StoredCartItem[]>([]);
  const [fulfillmentType, setFulfillmentType] = useState<"collection" | "delivery">(
    readCheckoutPreferences().fulfillmentType
  );
  const [deliveryAddress, setDeliveryAddress] = useState(readCheckoutPreferences().deliveryAddress);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    function syncCart() {
      setCartItems(readCart());
    }

    syncCart();
    window.addEventListener(getCartUpdatedEvent(), syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener(getCartUpdatedEvent(), syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const lines = getCartLines(cartItems, menuItems);
  const subtotal = lines.reduce((sum, line) => sum + line.item.basePrice * line.quantity, 0);

  useEffect(() => {
    if (!expandedItemId) {
      return;
    }

    if (!lines.some((line) => line.item.id === expandedItemId)) {
      setExpandedItemId(null);
    }
  }, [expandedItemId, lines]);

  useEffect(() => {
    writeCheckoutPreferences({
      fulfillmentType,
      deliveryAddress
    });
  }, [deliveryAddress, fulfillmentType]);

  return (
    <div className="content-grid cart-page-grid">
      <section className="panel">
        <p className="eyebrow">Your order</p>
        <div className="cart-review-header">
          <h2>Cart review</h2>
          <div className="cart-review-actions">
            <Link href="/menu" className="button-ghost compact-button">
              Add more item
            </Link>
            <button
              type="button"
              className="button-ghost compact-button cart-clear-button"
              onClick={() => writeCart([])}
              disabled={!lines.length}
            >
              Clear cart
            </button>
          </div>
        </div>
        {lines.length ? (
          <div className="cart-lines">
            {lines.map(({ item, quantity }) => (
              <article
                key={item.id}
                className={`cart-line${expandedItemId === item.id ? " is-expanded" : ""}`}
                onClick={() => setExpandedItemId((current) => (current === item.id ? null : item.id))}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setExpandedItemId((current) => (current === item.id ? null : item.id));
                  }
                }}
              >
                <Image src={item.image} alt={item.name} width={320} height={220} sizes="160px" />
                <div className="cart-line-copy">
                  <strong>{quantity}x {item.name}</strong>
                  <p>{item.description}</p>
                </div>
                <strong>{formatMoney(item.basePrice * quantity)}</strong>
                <div className="cart-line-editor">
                  <div className="cart-line-editor-actions" onClick={(event) => event.stopPropagation()}>
                    <div
                      className="menu-order-quantity cart-line-quantity"
                      aria-label={`Selected quantity for ${item.name}`}
                    >
                      <button type="button" onClick={() => setItemQuantity(item.id, quantity - 1)} aria-label="Decrease quantity">
                        -
                      </button>
                      <span>{quantity}</span>
                      <button type="button" onClick={() => setItemQuantity(item.id, quantity + 1)} aria-label="Increase quantity">
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="button-ghost compact-button cart-line-delete"
                      aria-label={`Remove ${item.name} from cart`}
                      onClick={() => setItemQuantity(item.id, 0)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 3.75h6" />
                        <path d="M4.5 6.75h15" />
                        <path d="M7.5 6.75v11.5a1.25 1.25 0 0 0 1.25 1.25h6.5a1.25 1.25 0 0 0 1.25-1.25V6.75" />
                        <path d="M10 10.25v5.5" />
                        <path d="M14 10.25v5.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-cart-card">
            <p>Your cart is empty.</p>
            <Link href="/menu" className="button-primary compact-button">
              Browse menu
            </Link>
          </div>
        )}
      </section>
      <aside className="panel tone-warm cart-summary-panel">
        <p className="eyebrow">Summary</p>
        <h2>Ready for checkout</h2>
        <div className="cart-fulfillment-toggle" aria-label="Choose fulfillment type">
          <button
            type="button"
            className={fulfillmentType === "collection" ? "is-active" : ""}
            onClick={() => setFulfillmentType("collection")}
          >
            <span>Collection</span>
            <small>30 min</small>
          </button>
          <button
            type="button"
            className={fulfillmentType === "delivery" ? "is-active" : ""}
            onClick={() => setFulfillmentType("delivery")}
          >
            <span>Delivery</span>
            <small>60 min</small>
          </button>
        </div>
        {fulfillmentType === "delivery" ? (
          <input
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            placeholder="Enter delivery address"
            className="cart-address-input"
          />
        ) : null}
        <div className="cart-summary-spacer" />
        <div className="summary-list">
          <div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
          <div><span>Discount</span><strong>{formatMoney(0)}</strong></div>
          {fulfillmentType === "delivery" ? (
            <div><span>Delivery Fee</span><strong>Calculated at checkout</strong></div>
          ) : null}
          <div><span>Total</span><strong>Finalised at checkout</strong></div>
        </div>
        <button
          type="button"
          className={`button-primary block-button${lines.length ? "" : " disabled-link"}`}
          disabled={!lines.length}
          onClick={() => {
            if (!lines.length) {
              return;
            }

            router.push(readCustomerSession() ? "/checkout" : "/customer-information");
          }}
        >
          Continue to checkout
        </button>
      </aside>
    </div>
  );
}

type CheckoutStep = "idle" | "submitting_order" | "awaiting_card" | "confirming_card";

export function CheckoutPageClient({
  menuItems
}: {
  menuItems: MenuItem[];
}) {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<StoredCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [step, setStep] = useState<CheckoutStep>("idle");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<{
    orderNumber: string;
    total: number;
    fulfillmentType: string;
    trackingToken: string | null;
  } | null>(null);
  const [orderState, setOrderState] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({
    type: "idle",
    message: ""
  });

  useEffect(() => {
    function syncCart() {
      setCartItems(readCart());
    }

    if (!readCustomerSession() && !readCustomerInfo()) {
      router.replace("/customer-information");
      return;
    }

    syncCart();
    window.addEventListener(getCartUpdatedEvent(), syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener(getCartUpdatedEvent(), syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, [router]);

  const lines = getCartLines(cartItems, menuItems);
  const checkoutPreferences = readCheckoutPreferences();
  const customerInfo = readCustomerInfo();
  const customerSession = readCustomerSession();
  const subtotal = lines.reduce((sum, line) => sum + line.item.basePrice * line.quantity, 0);

  const redirectToSuccess = useCallback(
    (data: NonNullable<typeof checkoutData>) => {
      writeCart([]);
      clearCheckoutPreferences();
      router.push(
        `/checkout/success?orderNumber=${encodeURIComponent(
          data.orderNumber
        )}&paymentMethod=${paymentMethod}&total=${encodeURIComponent(
          String(data.total)
        )}&fulfillmentType=${encodeURIComponent(
          String(data.fulfillmentType)
        )}&trackingToken=${encodeURIComponent(
          String(data.trackingToken ?? "")
        )}`
      );
    },
    [router, paymentMethod]
  );

  const handlePlaceOrder = useCallback(async () => {
    if (!lines.length || step !== "idle") {
      return;
    }

    if (!customerInfo && !customerSession) {
      setOrderState({
        type: "error",
        message: "Customer information is missing. Please complete your details before checkout."
      });
      router.push("/customer-information");
      return;
    }

    if (checkoutPreferences.fulfillmentType === "delivery" && !checkoutPreferences.deliveryAddress.trim()) {
      setOrderState({
        type: "error",
        message: "Delivery orders need an address in the cart before checkout."
      });
      router.push("/cart");
      return;
    }

    setStep("submitting_order");
    setOrderState({ type: "idle", message: "" });

    try {
      const checkoutResponse = await fetch("/api/v1/public/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillmentType: checkoutPreferences.fulfillmentType,
          paymentMethod,
          customer: {
            name: customerInfo?.name ?? customerSession?.name ?? "Guest Customer",
            phone: customerInfo?.phone ?? "",
            email: customerInfo?.email ?? customerSession?.email ?? "guest@example.com"
          },
          address: {
            line1: checkoutPreferences.deliveryAddress
          },
          items: lines.map((line) => ({
            menuItemId: line.item.id,
            quantity: line.quantity
          }))
        })
      });
      const checkoutResult = await checkoutResponse.json();

      if (!checkoutResponse.ok || !checkoutResult.success) {
        throw new Error(checkoutResult.error?.message ?? "Unable to place the order right now.");
      }

      const data = {
        orderNumber: checkoutResult.data.orderNumber,
        total: checkoutResult.data.total,
        fulfillmentType: checkoutResult.data.fulfillmentType,
        trackingToken: checkoutResult.data.trackingToken ?? null
      };
      setCheckoutData(data);

      if (paymentMethod === "cash") {
        redirectToSuccess(data);
        return;
      }

      const paymentResponse = await fetch("/api/v1/public/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: checkoutResult.data.orderId
        })
      });
      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok || !paymentResult.success) {
        throw new Error(paymentResult.error?.message ?? "Order saved, but payment setup failed.");
      }

      if (paymentResult.data.clientSecret.startsWith("pi_mock_")) {
        redirectToSuccess(data);
        return;
      }

      setClientSecret(paymentResult.data.clientSecret);
      setStep("awaiting_card");
    } catch (error) {
      setStep("idle");
      setOrderState({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to finish the order right now."
      });
    }
  }, [lines, step, customerInfo, customerSession, checkoutPreferences, paymentMethod, redirectToSuccess, router]);

  const stripePromise = clientSecret
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "")
    : null;

  return (
    <div className="content-grid checkout-grid">
      <aside className="panel tone-dark">
        {step === "awaiting_card" && stripePromise && clientSecret ? (
          <>
            <p className="eyebrow">Card payment</p>
            <h2>Enter card details</h2>
            <p>Your payment is handled securely by Stripe.</p>
            <div className="checkout-card-form">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{
                  clientSecret,
                  onComplete: () => {
                    if (checkoutData) {
                      redirectToSuccess(checkoutData);
                    }
                  }
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
            <button
              type="button"
              className="button-ghost compact-button"
              onClick={() => {
                setStep("idle");
                setClientSecret(null);
              }}
            >
              Cancel and go back
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">Payment</p>
            <h2>Order summary</h2>
            <div className="summary-list">
              <div>
                <span>Fulfillment</span>
                <strong>{checkoutPreferences.fulfillmentType === "delivery" ? "Delivery" : "Collection"}</strong>
              </div>
              {checkoutPreferences.fulfillmentType === "delivery" ? (
                <div>
                  <span>Address</span>
                  <strong>{checkoutPreferences.deliveryAddress || "Missing address"}</strong>
                </div>
              ) : null}
            </div>
            <div className="summary-list">
              <div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
              {checkoutPreferences.fulfillmentType === "delivery" ? (
                <div><span>Delivery</span><strong>Calculated at checkout</strong></div>
              ) : null}
              <div><span>Total</span><strong>Calculated at checkout</strong></div>
            </div>
            <div className="checkout-payment-options">
              <label className={`checkout-payment-card${paymentMethod === "card" ? " is-active" : ""}`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                />
                <span className="checkout-payment-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
                    <path d="M3 9.5h18" />
                    <path d="M7 15h3" />
                  </svg>
                </span>
                <span className="checkout-payment-copy">
                  <strong>Pay online by card</strong>
                  <span>Fastest checkout with secure online payment.</span>
                </span>
                <span className="checkout-payment-indicator" aria-hidden="true" />
              </label>
              <label className={`checkout-payment-card${paymentMethod === "cash" ? " is-active" : ""}`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                />
                <span className="checkout-payment-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" />
                    <circle cx="12" cy="12" r="2.2" />
                    <path d="M7 9.5h.01M17 14.5h.01" />
                  </svg>
                </span>
                <span className="checkout-payment-copy">
                  <strong>Cash on delivery or collection</strong>
                  <span>Pay in person when your order is handed over.</span>
                </span>
                <span className="checkout-payment-indicator" aria-hidden="true" />
              </label>
            </div>
            <div className="checkout-actions">
              <Link
                href="/cart"
                className={`button-secondary block-button${lines.length ? "" : " disabled-link"}`}
                aria-disabled={lines.length ? undefined : true}
                onClick={(event) => {
                  if (!lines.length) {
                    event.preventDefault();
                  }
                }}
              >
                Review cart
              </Link>
              <button
                type="button"
                className="button-primary block-button"
                disabled={!lines.length || step !== "idle"}
                onClick={handlePlaceOrder}
              >
                {step === "submitting_order" ? "Placing order..." : "Finish order"}
              </button>
            </div>
          </>
        )}
        {orderState.type !== "idle" ? (
          <p
            className={`form-notice checkout-order-notice ${
              orderState.type === "success" ? "notice-success" : "notice-error"
            }`}
          >
            {orderState.message}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
