import { NextRequest, NextResponse } from "next/server";

import { requirePlatformSuperAdminApi } from "../../../../../lib/authz";
import { PLATFORM_FEATURE_KEYS } from "../../../../../lib/platform-tenant-store";

export async function GET(request: NextRequest) {
  const { response } = await requirePlatformSuperAdminApi(request);

  if (response) {
    return response;
  }

  return NextResponse.json({
    success: true,
    data: {
      paymentProviders: ["stripe"],
      featureFlags: PLATFORM_FEATURE_KEYS,
      supportedPlans: ["starter", "growth", "enterprise"]
    },
    meta: {},
    error: null
  });
}
