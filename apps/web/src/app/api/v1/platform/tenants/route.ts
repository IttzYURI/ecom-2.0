import { NextRequest, NextResponse } from "next/server";

import { requirePlatformSuperAdminApi } from "../../../../../lib/authz";
import { PlatformAdminService } from "../../../../../lib/platform-admin-service";
import { saveUploadedFile } from "../../../../../lib/uploads";

export async function GET(request: NextRequest) {
  const { response } = await requirePlatformSuperAdminApi(request);

  if (response) {
    return response;
  }

  return NextResponse.json({
    success: true,
    data: await new PlatformAdminService().listRestaurants(),
    meta: {},
    error: null
  });
}

export async function POST(request: NextRequest) {
  const { response, session } = await requirePlatformSuperAdminApi(request);

  if (response) {
    return response;
  }

  const formData = await request.formData();
  const logo = formData.get("logo");
  const uploadedLogoUrl =
    logo instanceof File && logo.size ? (await saveUploadedFile(logo)).url : "";

  try {
    const result = await new PlatformAdminService().createRestaurant({
      businessName: String(formData.get("businessName") ?? ""),
      businessType: String(formData.get("businessType") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      address: String(formData.get("address") ?? ""),
      postcode: String(formData.get("postcode") ?? ""),
      logoUrl: uploadedLogoUrl || String(formData.get("logoUrl") ?? ""),
      defaultCurrency: String(formData.get("defaultCurrency") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
      ownerName: String(formData.get("ownerName") ?? ""),
      ownerEmail: String(formData.get("ownerEmail") ?? ""),
      ownerAccessMode: String(formData.get("ownerAccessMode") ?? "temporary_password") as
        | "temporary_password"
        | "invite_link",
      temporaryPassword: String(formData.get("temporaryPassword") ?? ""),
      subdomain: String(formData.get("subdomain") ?? ""),
      customDomain: String(formData.get("customDomain") ?? ""),
      homepageTitle: String(formData.get("homepageTitle") ?? ""),
      shortDescription: String(formData.get("shortDescription") ?? ""),
      themePreset: String(formData.get("themePreset") ?? "sunset") as
        | "sunset"
        | "forest"
        | "midnight"
        | "minimal",
      collectionEnabled: String(formData.get("collectionEnabled") ?? "") === "true",
      deliveryEnabled: String(formData.get("deliveryEnabled") ?? "") === "true",
      defaultCollectionTimeMinutes: Number(formData.get("defaultCollectionTimeMinutes") ?? 20),
      defaultDeliveryTimeMinutes: Number(formData.get("defaultDeliveryTimeMinutes") ?? 45),
      deliveryRadiusMiles: Number(formData.get("deliveryRadiusMiles") ?? 5),
      minimumOrderAmount: Number(formData.get("minimumOrderAmount") ?? 15),
      deliveryFee: Number(formData.get("deliveryFee") ?? 2.99),
      featureFlags: {
        onlineOrdering: String(formData.get("onlineOrdering") ?? "") === "true",
        cashPayment: String(formData.get("cashPayment") ?? "") === "true",
        cardPayment: String(formData.get("cardPayment") ?? "") === "true",
        customerLogin: String(formData.get("customerLogin") ?? "") === "true",
        tableBooking: String(formData.get("tableBooking") ?? "") === "true",
        reviews: String(formData.get("reviews") ?? "") === "true",
        gallery: String(formData.get("gallery") ?? "") === "true",
        printerIntegration: String(formData.get("printerIntegration") ?? "") === "true",
        driverModule: String(formData.get("driverModule") ?? "") === "true",
        promotions: String(formData.get("promotions") ?? "") === "true",
        customDomain: String(formData.get("customDomainFeature") ?? "") === "true",
        advancedReports: String(formData.get("advancedReports") ?? "") === "true"
      },
      actorEmail: session?.email ?? "platform@system.local"
    });
    const successParams = new URLSearchParams({
      status: "success",
      ownerEmail: result.ownerEmail,
      ownerAccessMode: result.ownerAccessMode
    });

    if (result.temporaryPassword) {
      successParams.set("temporaryPassword", result.temporaryPassword);
    }

    if (result.inviteToken) {
      successParams.set("inviteToken", result.inviteToken);
    }

    return NextResponse.redirect(
      new URL(
        `/platform/tenants/${encodeURIComponent(result.tenantId)}/created?${successParams.toString()}`,
        request.url
      )
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.replaceAll("_", " ").toLowerCase()
        : "Unable to create restaurant.";

    return NextResponse.redirect(
      new URL(
        `/platform/tenants?status=error&message=${encodeURIComponent(message)}`,
        request.url
      )
    );
  }
}
