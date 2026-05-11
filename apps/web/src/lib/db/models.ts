import type { StorefrontContent, TenantStatus } from "@rcc/contracts";

export interface TenantRecord {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  status: TenantStatus | "trialing";
  legalName: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  timezone: string;
  currencyCode: string;
  countryCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantDomainRecord {
  id: string;
  tenantId: string;
  domain: string;
  domainType: "subdomain" | "custom";
  isPrimary: boolean;
  verificationStatus: "pending" | "verified" | "failed";
  sslStatus: "pending" | "active" | "failed" | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  provider: "stripe";
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  planCode: string;
  status: "trialing" | "active" | "past_due" | "cancelled" | "paused";
  billingInterval: "monthly" | "yearly";
  trialEndsAt: string | null;
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettingsRecord {
  tenantId: string;
  description: string | null;
  cuisine: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  deliveryEnabled: boolean;
  collectionEnabled: boolean;
  bookingEnabled: boolean;
  defaultDeliveryFeeMinor: number;
  brandingPrimaryColor: string | null;
  brandingAccentColor: string | null;
  brandingLogoText: string | null;
  brandingHeroImageUrl: string | null;
  storefrontContent: StorefrontContent | null;
  deliveryPostcodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TenantFoundationSnapshot {
  tenant: TenantRecord;
  settings: TenantSettingsRecord | null;
  domains: TenantDomainRecord[];
  subscription: SubscriptionRecord | null;
}
