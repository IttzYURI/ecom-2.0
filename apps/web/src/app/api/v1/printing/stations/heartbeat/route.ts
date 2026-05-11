import { NextRequest, NextResponse } from "next/server";

import type { PrintStationHeartbeatRequest } from "@rcc/contracts";

import { requirePrintStationActor } from "../../../../../../lib/authz";
import { updatePrintStation } from "../../../../../../lib/printing-store";

export async function POST(request: NextRequest) {
  const { station, response } = await requirePrintStationActor(request);

  if (response) {
    return response;
  }

  const body = (await request.json()) as PrintStationHeartbeatRequest;
  const updatedStation = await updatePrintStation(station.tenantId, station.id, (current) => ({
    ...current,
    printerName: body.printerName ?? current.printerName,
    paperWidth: body.paperWidth ?? current.paperWidth,
    appVersion: body.appVersion ?? current.appVersion,
    autoPrintEnabled: body.autoPrintEnabled ?? current.autoPrintEnabled,
    lastSeenAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    lastActivityMessage: body.lastActivityMessage ?? current.lastActivityMessage ?? "Heartbeat received"
  }));

  return NextResponse.json({
    success: true,
    data: {
      stationId: updatedStation?.id ?? station.id,
      serverTime: new Date().toISOString()
    },
    meta: {},
    error: null
  });
}
