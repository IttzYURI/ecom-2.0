import { NextRequest, NextResponse } from "next/server";

import { requirePrintStationActor } from "../../../../../../../lib/authz";
import { markPrintJobPrinting } from "../../../../../../../lib/printing-service";

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
  const job = await markPrintJobPrinting(station.tenantId, id, station.id);

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PRINT_JOB_NOT_FOUND",
          message: "The job is not available for printing."
        }
      },
      { status: 404 }
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
