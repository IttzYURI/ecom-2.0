import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const CUSTOMER_SESSION_COOKIE_NAME = "customer_session";
const CUSTOMER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export type CustomerSessionPayload = {
  id: string;
  email: string;
  name: string;
  exp: number;
};

function getAuthSecret() {
  return (
    process.env.CUSTOMER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "bella-roma-customer-dev-secret"
  );
}

function textEncoder() {
  return new TextEncoder();
}

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  return Uint8Array.from(Buffer.from(padded, "base64"));
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    textEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(value: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function encodePayload(payload: CustomerSessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as CustomerSessionPayload;
}

export async function createCustomerSessionToken(input: {
  id: string;
  email: string;
  name: string;
}) {
  const payload: CustomerSessionPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + CUSTOMER_SESSION_TTL_SECONDS
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifyCustomerSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encoded, receivedSignature] = token.split(".");

  if (!encoded || !receivedSignature) {
    return null;
  }

  try {
    const key = await getSigningKey();
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(receivedSignature),
      textEncoder().encode(encoded)
    );

    if (!validSignature) {
      return null;
    }

    const payload = decodePayload(encoded);

    if (!payload.email || !payload.id || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getCustomerSession(request: NextRequest) {
  return verifyCustomerSessionToken(request.cookies.get(CUSTOMER_SESSION_COOKIE_NAME)?.value);
}

export async function getCustomerSessionFromCookieStore() {
  const cookieStore = await cookies();
  return verifyCustomerSessionToken(cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME)?.value);
}

export function getCustomerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_TTL_SECONDS
  };
}

export async function requireCustomerSession(request: NextRequest) {
  const session = await getCustomerSession(request);

  if (session) {
    return null;
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
