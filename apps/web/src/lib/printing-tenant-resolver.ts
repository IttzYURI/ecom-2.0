import type { NextRequest } from "next/server";

import { createTenantRepository } from "./db/repositories/create-tenant-repository";
import { TenantFoundationService } from "./db/services/tenant-foundation-service";
import { getRequestHostname } from "./tenant-resolver";
import { hashStationToken } from "./printing-auth";
import { getPrintStationByTokenHash } from "./printing-store";

let tenantFoundationService: TenantFoundationService | null = null;

function getTenantFoundationService() {
  if (!tenantFoundationService) {
    tenantFoundationService = new TenantFoundationService(createTenantRepository());
  }

  return tenantFoundationService;
}

export async function resolveTenantFromPrinterDeviceToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

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

  const tenant = await getTenantFoundationService().resolveTenant({
    id: station.tenantId
  });

  return {
    tenantId: station.tenantId,
    tenant,
    source: "printer_device_token" as const,
    hostname: getRequestHostname(request),
    printerDeviceId: station.id
  };
}
