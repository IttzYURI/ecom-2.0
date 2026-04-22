"use client";

export const CUSTOMER_SESSION_KEY = "bella-roma-customer-session";
export const CUSTOMER_INFO_KEY = "bella-roma-customer-info";

export type CustomerSession = {
  email: string;
  name?: string;
};

export type CustomerInfo = {
  name: string;
  phone: string;
  email: string;
};

export function readCustomerSession(): CustomerSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CUSTOMER_SESSION_KEY);
    return raw ? (JSON.parse(raw) as CustomerSession) : null;
  } catch {
    return null;
  }
}

export function writeCustomerSession(session: CustomerSession) {
  window.localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
}

export function clearCustomerSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CUSTOMER_SESSION_KEY);
}

export function readCustomerInfo(): CustomerInfo | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CUSTOMER_INFO_KEY);
    return raw ? (JSON.parse(raw) as CustomerInfo) : null;
  } catch {
    return null;
  }
}

export function writeCustomerInfo(info: CustomerInfo) {
  window.localStorage.setItem(CUSTOMER_INFO_KEY, JSON.stringify(info));
}

export function clearCustomerInfo() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CUSTOMER_INFO_KEY);
}
