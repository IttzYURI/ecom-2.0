import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getStoredDrivers } from "./driver-store";

export const DRIVER_SESSION_COOKIE_NAME = "driver_session";
const DRIVER_SESSION_TTL_SECONDS = 60 * 60 * 12;

type DriverSessionPayload = {
  driverId: string;
  tenantId: string;
  exp: number;
};

function getAuthSecret() {
  return process.env.DRIVER_AUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim() || "bella-roma-driver-dev-secret";
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
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
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

function encodePayload(payload: DriverSessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as DriverSessionPayload;
}

export async function createDriverSessionToken(input: { driverId: string; tenantId: string }) {
  const payload: DriverSessionPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + DRIVER_SESSION_TTL_SECONDS
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifyDriverSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encoded, receivedSignature] = token.split(".");

  if (!encoded || !receivedSignature) {
    return null;
  }

  try {
    const key = await getSigningKey();
    const validSignature = await crypto.subtle.verify("HMAC", key, fromBase64Url(receivedSignature), textEncoder().encode(encoded));

    if (!validSignature) {
      return null;
    }

    const payload = decodePayload(encoded);

    if (!payload.driverId || !payload.tenantId || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const driver = (await getStoredDrivers(payload.tenantId)).find((entry) => entry.id === payload.driverId && entry.active);
    return driver ? payload : null;
  } catch {
    return null;
  }
}

export async function getDriverSession(request: NextRequest) {
  return verifyDriverSessionToken(request.cookies.get(DRIVER_SESSION_COOKIE_NAME)?.value);
}

export async function getDriverSessionFromCookieStore() {
  const cookieStore = await cookies();
  return verifyDriverSessionToken(cookieStore.get(DRIVER_SESSION_COOKIE_NAME)?.value);
}

export function getDriverCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DRIVER_SESSION_TTL_SECONDS
  };
}

export async function requireDriverSession(request: NextRequest) {
  const session = await getDriverSession(request);

  if (session) {
    return null;
  }

  return NextResponse.redirect(new URL("/driver/login", request.url));
}
