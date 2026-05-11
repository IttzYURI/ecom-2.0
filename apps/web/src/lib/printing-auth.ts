import { randomBytes, createHash } from "node:crypto";

import type { NextRequest } from "next/server";

import type { PrintStation } from "@rcc/contracts";

import { getPrintStationByTokenHash } from "./printing-store";

function getTokenPepper() {
  const pepper =
    process.env.PRINTING_TOKEN_PEPPER?.trim() ||
    process.env.EXTADMIN_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim();

  if (!pepper) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PRINTING_TOKEN_PEPPER, EXTADMIN_AUTH_SECRET, or AUTH_SECRET must be set in production.");
    }

    console.warn("[printing-auth] WARNING: Using default dev pepper. Set AUTH_SECRET for production.");
    return "printing-dev-pepper";
  }

  return pepper;
}

export function createStationToken() {
  return `pst_${randomBytes(24).toString("base64url")}`;
}

export function hashStationToken(token: string) {
  return createHash("sha256")
    .update(`${getTokenPepper()}:${token}`)
    .digest("hex");
}

export function getPrintRegistrationKey() {
  return process.env.PRINTING_REGISTRATION_KEY?.trim() || null;
}

export function hasValidPrintRegistrationKey(request: NextRequest) {
  const expected = getPrintRegistrationKey();

  if (!expected) {
    return false;
  }

  const received = request.headers.get("x-printing-registration-key")?.trim();
  return Boolean(received && received === expected);
}

export async function authenticatePrintStation(request: NextRequest) {
  const authorization = request.headers.get("authorization")?.trim() || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice("bearer ".length).trim();

  if (!token) {
    return null;
  }

  const station = await getPrintStationByTokenHash(hashStationToken(token));

  if (!station || !station.enabled) {
    return null;
  }

  return station;
}

export function serializeAuthenticatedStation(station: PrintStation) {
  return {
    stationId: station.id,
    tenantId: station.tenantId,
    name: station.name
  };
}
