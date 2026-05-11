import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const PLATFORM_SESSION_COOKIE_NAME = "platform_session";
const PLATFORM_SESSION_TTL_SECONDS = 60 * 60 * 12;

export type PlatformSessionPayload = {
  email: string;
  userType: "super_admin";
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.PLATFORM_AUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PLATFORM_AUTH_SECRET or AUTH_SECRET must be set in production.");
    }

    console.warn("[platform-auth] WARNING: Using default dev secret. Set AUTH_SECRET for production.");
    return "platform-dev-secret";
  }

  return secret;
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

function encodePayload(payload: PlatformSessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as PlatformSessionPayload;
}

export function validatePlatformCredentials(email: string, password: string) {
  const expectedEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim();
  const expectedPassword = process.env.PLATFORM_ADMIN_PASSWORD?.trim();

  return Boolean(
    expectedEmail &&
      expectedPassword &&
      email.trim().toLowerCase() === expectedEmail.toLowerCase() &&
      password === expectedPassword
  );
}

export async function createPlatformSessionToken(email: string) {
  const payload: PlatformSessionPayload = {
    email,
    userType: "super_admin",
    exp: Math.floor(Date.now() / 1000) + PLATFORM_SESSION_TTL_SECONDS
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifyPlatformSessionToken(token: string | undefined) {
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

    if (
      payload.userType !== "super_admin" ||
      !payload.email ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getPlatformSession(request: NextRequest) {
  return verifyPlatformSessionToken(request.cookies.get(PLATFORM_SESSION_COOKIE_NAME)?.value);
}

export async function getPlatformSessionFromCookieStore() {
  const cookieStore = await cookies();
  return verifyPlatformSessionToken(cookieStore.get(PLATFORM_SESSION_COOKIE_NAME)?.value);
}

export function getPlatformCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PLATFORM_SESSION_TTL_SECONDS
  };
}

export async function hasValidPlatformSession(request: NextRequest) {
  return Boolean(await getPlatformSession(request));
}

export async function requirePlatformSession(request: NextRequest) {
  if (await hasValidPlatformSession(request)) {
    return null;
  }

  return NextResponse.redirect(new URL("/platform/login", request.url));
}
