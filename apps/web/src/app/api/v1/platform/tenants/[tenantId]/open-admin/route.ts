import { NextRequest, NextResponse } from "next/server";

import { getPlatformSession } from "../../../../../../../lib/platform-auth";
import { PlatformAdminService } from "../../../../../../../lib/platform-admin-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const session = await getPlatformSession(request);

  if (!session) {
    return NextResponse.redirect(new URL("/platform/login", request.url));
  }

  const { tenantId } = await context.params;
  const restaurant = await new PlatformAdminService().getRestaurant(tenantId);

  if (!restaurant) {
    return NextResponse.redirect(
      new URL(
        `/platform/tenants?status=error&message=${encodeURIComponent("Restaurant not found.")}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(
    new URL(
      `/extadmin/login?platformTenant=${encodeURIComponent(restaurant.tenant.id)}`,
      request.url
    )
  );
}
