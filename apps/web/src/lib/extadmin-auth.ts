import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getRequestHostname, resolveTenantIdFromExtAdminSession } from "./tenant-host-resolver";

const SESSION_COOKIE_NAME = "extadmin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type ExtAdminSessionPayload = {
  userId: string;
  email: string;
  userType: "restaurant_owner" | "restaurant_staff";
  tenantId: string;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.EXTADMIN_AUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("EXTADMIN_AUTH_SECRET or AUTH_SECRET must be set in production.");
    }

    console.warn("[extadmin-auth] WARNING: Using default dev secret. Set AUTH_SECRET for production.");
    return "bella-roma-dev-secret";
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

function encodePayload(payload: ExtAdminSessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as ExtAdminSessionPayload;
}

export async function createExtAdminSessionToken(input: {
  userId: string;
  email: string;
  tenantId: string;
  userType: "restaurant_owner" | "restaurant_staff";
}) {
  const payload: ExtAdminSessionPayload = {
    userId: input.userId,
    email: input.email,
    userType: input.userType,
    tenantId: input.tenantId,
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

    if (
      !payload.userId ||
      !payload.email ||
      !payload.tenantId ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getExtAdminSession(
  request: NextRequest
): Promise<ExtAdminSessionPayload | null> {
  const session = await verifyExtAdminSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return null;
  }

  const tenantId = resolveTenantIdFromExtAdminSession(session, {
    fallbackHostname: getRequestHostname(request),
    allowDefaultFallback: true
  });

  if (!tenantId) {
    return null;
  }

  return {
    ...session,
    tenantId
  };
}

export async function getExtAdminSessionFromCookieStore() {
  const cookieStore = await cookies();
  return verifyExtAdminSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
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
    await getExtAdminSession(request)
  );
}

export async function requireExtAdminSession(request: NextRequest) {
  if (await hasValidExtAdminSession(request)) {
    return null;
  }

  return NextResponse.redirect(new URL("/extadmin/login", request.url));
}

export async function requireResolvedExtAdminSession(request: NextRequest) {
  const session = await getExtAdminSession(request);

  if (session) {
    return {
      session,
      unauthorized: null
    };
  }

  return {
    session: null,
    unauthorized: NextResponse.redirect(new URL("/extadmin/login", request.url))
  };
}

export { SESSION_COOKIE_NAME };
