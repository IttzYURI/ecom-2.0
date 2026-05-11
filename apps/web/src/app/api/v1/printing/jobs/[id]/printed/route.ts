import { NextRequest, NextResponse } from "next/server";

import type { PrintJobPrintedRequest } from "@rcc/contracts";

import { requirePrintStationActor } from "../../../../../../../lib/authz";
import { markPrintJobPrinted } from "../../../../../../../lib/printing-service";

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
  const body = (await request.json().catch(() => ({}))) as PrintJobPrintedRequest;
  const job = await markPrintJobPrinted(station.tenantId, id, station.id, body);

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PRINT_JOB_NOT_FOUND",
          message: "The job could not be marked as printed."
        }
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      jobId: job.id,
      status: job.status,
      printedAt: job.printedAt
    },
    meta: {},
    error: null
  });
}
