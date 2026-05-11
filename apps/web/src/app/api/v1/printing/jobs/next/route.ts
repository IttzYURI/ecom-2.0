import { NextRequest, NextResponse } from "next/server";

import { requirePrintStationActor } from "../../../../../../lib/authz";
import { getNextJobsForStation } from "../../../../../../lib/printing-service";

export async function GET(request: NextRequest) {
  const { station, response } = await requirePrintStationActor(request);

  if (response) {
    return response;
  }

  const jobs = await getNextJobsForStation(station);

  return NextResponse.json({
    success: true,
    data: jobs,
    meta: {
      stationId: station.id,
      tenantId: station.tenantId
    },
    error: null
  });
}
