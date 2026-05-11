import { NextRequest, NextResponse } from "next/server";

import type { ReprintOrderRequest } from "@rcc/contracts";

import { requireExtAdminPermissionApi } from "../../../../../../../lib/authz";
import { createManualReprintJob } from "../../../../../../../lib/printing-service";

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
          message: "Owner authentication is required to reprint orders."
        }
      },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as ReprintOrderRequest;
  const job = await createManualReprintJob(
    session.tenantId,
    id,
    {
      copyType: body.copyType,
      reason: body.reason
    },
    session.email
  );

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "ORDER_NOT_FOUND",
          message: "The order could not be found for reprint."
        }
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      jobId: job.id,
      triggerType: job.triggerType
    },
    meta: {},
    error: null
  });
}
