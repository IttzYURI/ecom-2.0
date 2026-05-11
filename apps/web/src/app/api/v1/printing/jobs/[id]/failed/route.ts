import { NextRequest, NextResponse } from "next/server";

import type { PrintJobFailedRequest } from "@rcc/contracts";

import { requirePrintStationActor } from "../../../../../../../lib/authz";
import { markPrintJobFailed } from "../../../../../../../lib/printing-service";

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
  const body = (await request.json().catch(() => ({}))) as PrintJobFailedRequest;

  if (!body.error?.trim()) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PRINT_JOB_ERROR_REQUIRED",
          message: "A failure reason is required."
        }
      },
      { status: 400 }
    );
  }

  const job = await markPrintJobFailed(station.tenantId, id, station.id, {
    error: body.error.trim()
  });

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PRINT_JOB_NOT_FOUND",
          message: "The job could not be marked as failed."
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
      nextRetryAt: job.nextRetryAt
    },
    meta: {},
    error: null
  });
}
