import { NextRequest, NextResponse } from "next/server";

import { requirePlatformSuperAdminApi } from "../../../../../../lib/authz";
import { PlatformAdminService } from "../../../../../../lib/platform-admin-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { response } = await requirePlatformSuperAdminApi(request);

  if (response) {
    return response;
  }

  const { tenantId } = await context.params;
  const restaurant = await new PlatformAdminService().getRestaurant(tenantId);

  if (!restaurant) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "TENANT_NOT_FOUND",
          message: "Restaurant not found."
        }
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: restaurant,
    meta: {},
    error: null
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { response } = await requirePlatformSuperAdminApi(request);

  if (response) {
    return response;
  }

  const { tenantId } = await context.params;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "").trim();
  const platformService = new PlatformAdminService();

  try {
    if (intent === "update_basic") {
      await platformService.updateRestaurantBasics(tenantId, {
        name: String(formData.get("name") ?? ""),
        legalName: String(formData.get("legalName") ?? ""),
        supportEmail: String(formData.get("supportEmail") ?? ""),
        supportPhone: String(formData.get("supportPhone") ?? ""),
        cuisine: String(formData.get("cuisine") ?? ""),
        address: String(formData.get("address") ?? ""),
        timezone: String(formData.get("timezone") ?? "")
      });
    } else if (intent === "update_status") {
      await platformService.updateRestaurantStatus(
        tenantId,
        String(formData.get("status") ?? "") as "trialing" | "active" | "suspended" | "archived"
      );
    } else if (intent === "update_subscription") {
      await platformService.updateRestaurantSubscription(tenantId, {
        planCode: String(formData.get("planCode") ?? ""),
        status: String(formData.get("subscriptionStatus") ?? "") as
          | "trialing"
          | "active"
          | "past_due"
          | "paused"
          | "cancelled",
        billingInterval: String(formData.get("billingInterval") ?? "") as "monthly" | "yearly"
      });
    } else if (intent === "update_domains") {
      await platformService.updateRestaurantDomains(tenantId, {
        subdomain: String(formData.get("subdomain") ?? ""),
        customDomain: String(formData.get("customDomain") ?? ""),
        customDomainVerified: String(formData.get("customDomainVerified") ?? "") === "true"
      });
    } else if (intent === "update_features") {
      await platformService.updateRestaurantFeatures(
        tenantId,
        formData.getAll("features").map((feature) => String(feature))
      );
    } else {
      throw new Error("UNKNOWN_INTENT");
    }

    return NextResponse.redirect(
      new URL(
        `/platform/tenants/${encodeURIComponent(tenantId)}?status=success&message=${encodeURIComponent("Restaurant updated successfully.")}`,
        request.url
      )
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.replaceAll("_", " ").toLowerCase()
        : "Unable to update restaurant.";

    return NextResponse.redirect(
      new URL(
        `/platform/tenants/${encodeURIComponent(tenantId)}?status=error&message=${encodeURIComponent(message)}`,
        request.url
      )
    );
  }
}
