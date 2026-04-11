import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "extadmin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  email: string;
  role: "owner";
  exp: number;
};

function getAuthSecret() {
  return (
    process.env.EXTADMIN_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "bella-roma-dev-secret"
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

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionPayload;
}

export async function createExtAdminSessionToken(email: string) {
  const payload: SessionPayload = {
    email,
    role: "owner",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifyExtAdminSessionToken(token: string | undefined) {
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

    if (!payload.email || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getExtAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  };
}

export async function hasValidExtAdminSession(request: NextRequest) {
  return Boolean(
    await verifyExtAdminSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)
  );
}

export async function requireExtAdminSession(request: NextRequest) {
  if (await hasValidExtAdminSession(request)) {
    return null;
  }

  return NextResponse.redirect(new URL("/extadmin/login", request.url));
}

export { SESSION_COOKIE_NAME };
