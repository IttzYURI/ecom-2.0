import { NextRequest, NextResponse } from "next/server";

import type { RegisterPrintStationRequest } from "@rcc/contracts";

import { requireExtAdminPermissionApi } from "../../../../../../lib/authz";
import {
  createStationToken,
  hasValidPrintRegistrationKey,
  hashStationToken
} from "../../../../../../lib/printing-auth";
import { createPrintStation, listPrintStations, updatePrintStation } from "../../../../../../lib/printing-store";
import { resolvePublicTenantFromRequest } from "../../../../../../lib/tenant-resolver";

export async function POST(request: NextRequest) {
  const extAdminAccess = await requireExtAdminPermissionApi(request, "tenant.print.manage");
  const session = extAdminAccess.response ? null : extAdminAccess.session;

  if (!session && !hasValidPrintRegistrationKey(request)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PRINTING_REGISTRATION_UNAUTHORIZED",
          message: "Station registration requires an owner session or registration key."
        }
      },
      { status: 401 }
    );
  }

  const body = (await request.json()) as RegisterPrintStationRequest;
  const resolvedTenant = session?.tenantId
    ? { tenantId: session.tenantId }
    : await resolvePublicTenantFromRequest(request);
  const tenantId = resolvedTenant.tenantId;
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PRINT_STATION_NAME_REQUIRED",
          message: "A station name is required."
        }
      },
      { status: 400 }
    );
  }

  const token = createStationToken();
  const tokenHash = hashStationToken(token);
  const stations = await listPrintStations(tenantId);
  const existing = stations.find((station) =>
    body.deviceId
      ? station.deviceId === body.deviceId
      : station.name.toLowerCase() === name.toLowerCase()
  );

  const station = existing
    ? await updatePrintStation(tenantId, existing.id, (current) => ({
        ...current,
        name,
        tokenHash,
        enabled: true,
        deviceId: body.deviceId ?? current.deviceId,
        printerName: body.printerName ?? current.printerName,
        paperWidth: body.paperWidth ?? current.paperWidth,
        autoPrintEnabled: body.autoPrintEnabled ?? current.autoPrintEnabled,
        lastSeenAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        lastActivityMessage: "Station registered"
      }))
    : await createPrintStation(tenantId, {
        name,
        tokenHash,
        enabled: true,
        deviceId: body.deviceId,
        printerName: body.printerName,
        paperWidth: body.paperWidth ?? "80mm",
        autoPrintEnabled: body.autoPrintEnabled ?? true,
        lastSeenAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        lastActivityMessage: "Station registered"
      });

  return NextResponse.json({
    success: true,
    data: {
      stationId: station?.id,
      token,
      name: station?.name ?? name
    },
    meta: {},
    error: null
  });
}
