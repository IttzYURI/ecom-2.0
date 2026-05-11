import { NextRequest, NextResponse } from "next/server";

import type { PrintJobAckRequest } from "@rcc/contracts";

import { requirePrintStationActor } from "../../../../../../../lib/authz";
import { acknowledgePrintJob } from "../../../../../../../lib/printing-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { station, response } = await requirePrintStationActor(request);

  if (response) {
    return response;
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as PrintJobAckRequest;

  if (body.stationId && body.stationId !== station.id) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PRINT_STATION_MISMATCH",
          message: "Authenticated station does not match the submitted stationId."
        }
      },
      { status: 403 }
    );
  }

  const job = await acknowledgePrintJob(station.tenantId, id, station.id);

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PRINT_JOB_NOT_CLAIMABLE",
          message: "The job could not be claimed."
        }
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      jobId: job.id,
      status: job.status
    },
    meta: {},
    error: null
  });
}
