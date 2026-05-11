import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermissionApi } from "../../../../../../../lib/authz";
import { getPrintStationById, updatePrintStation } from "../../../../../../../lib/printing-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { session, response } = await requireExtAdminPermissionApi(
    request,
    "tenant.print.manage"
  );

  if (response || !session) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "EXTADMIN_UNAUTHORIZED",
          message: "Owner authentication is required to manage print stations."
        }
      },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const existing = await getPrintStationById(session.tenantId, id);

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PRINT_STATION_NOT_FOUND",
          message: "The print station was not found."
        }
      },
      { status: 404 }
    );
  }

  const nextEnabled = !existing.enabled;
  const updated = await updatePrintStation(session.tenantId, id, (station) => ({
    ...station,
    enabled: nextEnabled,
    lastActivityAt: new Date().toISOString(),
    lastActivityMessage: nextEnabled ? "Station activated" : "Station deactivated"
  }));

  return NextResponse.json({
    success: true,
    data: {
      stationId: updated?.id ?? id,
      enabled: updated?.enabled ?? nextEnabled
    },
    meta: {},
    error: null
  });
}
