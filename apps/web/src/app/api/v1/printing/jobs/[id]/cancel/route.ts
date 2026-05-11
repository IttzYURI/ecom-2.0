import { NextRequest, NextResponse } from "next/server";

import { requireExtAdminPermissionApi } from "../../../../../../../lib/authz";
import { cancelPrintJob } from "../../../../../../../lib/printing-service";

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
          message: "Owner authentication is required to cancel print jobs."
        }
      },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const job = await cancelPrintJob(session.tenantId, id);

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "PRINT_JOB_NOT_CANCELLABLE",
          message: "The job could not be cancelled. Only pending or failed jobs can be cancelled."
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
