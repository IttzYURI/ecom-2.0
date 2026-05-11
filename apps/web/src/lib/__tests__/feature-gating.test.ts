import { describe, it, expect, vi } from "vitest";

vi.mock("../tenant-feature-flags-store", () => ({
  getTenantFeatureFlagsRecord: vi.fn()
}));

vi.mock("../platform-tenant-store", () => ({
  getPlatformTenantRegistryRecord: vi.fn()
}));

import { getTenantFeatureFlagsRecord } from "../tenant-feature-flags-store";
import { getPlatformTenantRegistryRecord } from "../platform-tenant-store";
import { requireTenantFeature, isTenantAcceptingOrders } from "../feature-gating";
import type { TenantFeatureFlagsRecord } from "../tenant-feature-flags-store";
import type { PlatformTenantRegistryRecord } from "../platform-tenant-store";

const mockFlags = getTenantFeatureFlagsRecord as ReturnType<typeof vi.fn>;
const mockRegistry = getPlatformTenantRegistryRecord as ReturnType<typeof vi.fn>;

function flags(overrides: Partial<TenantFeatureFlagsRecord> = {}): TenantFeatureFlagsRecord {
  return {
    tenantId: "t1",
    onlineOrdering: true,
    cashPayment: true,
    cardPayment: true,
    customerLogin: true,
    tableBooking: true,
    reviews: true,
    gallery: true,
    printerIntegration: true,
    driverModule: true,
    promotions: true,
    customDomain: true,
    advancedReports: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function registry(overrides: Partial<PlatformTenantRegistryRecord> = {}): PlatformTenantRegistryRecord {
  return {
    tenant: {
      id: "t1",
      tenantId: "t1",
      slug: "test",
      name: "Test Restaurant",
      status: "active",
      legalName: null,
      supportEmail: null,
      supportPhone: null,
      timezone: "Europe/London",
      currencyCode: "GBP",
      countryCode: "GB",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    domains: [],
    subscription: {
      id: "sub_1",
      tenantId: "t1",
      provider: "stripe",
      providerCustomerId: null,
      providerSubscriptionId: null,
      planCode: "premium",
      status: "active",
      billingInterval: "monthly",
      trialEndsAt: null,
      currentPeriodStartsAt: null,
      currentPeriodEndsAt: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    features: [],
    source: "platform",
    ...overrides
  };
}

describe("requireTenantFeature", () => {
  it("returns allowed true when flag is enabled", async () => {
    mockFlags.mockResolvedValue(flags({ onlineOrdering: true }));

    const result = await requireTenantFeature("t1", "onlineOrdering");
    expect(result.allowed).toBe(true);
  });

  it("returns allowed false when flag is disabled", async () => {
    mockFlags.mockResolvedValue(flags({ onlineOrdering: false }));

    const result = await requireTenantFeature("t1", "onlineOrdering");
    expect(result.allowed).toBe(false);
  });

  it("returns allowed true when no flags record exists (migration-safe)", async () => {
    mockFlags.mockResolvedValue(null);

    const result = await requireTenantFeature("t1", "onlineOrdering");
    expect(result.allowed).toBe(true);
    expect(result.flags).toBeNull();
  });
});

describe("isTenantAcceptingOrders", () => {
  it("accepts orders for active tenant with active subscription and onlineOrdering enabled", async () => {
    mockRegistry.mockResolvedValue(registry());
    mockFlags.mockResolvedValue(flags({ onlineOrdering: true }));

    const result = await isTenantAcceptingOrders("t1");
    expect(result.accepting).toBe(true);
  });

  it("rejects orders for suspended tenant", async () => {
    mockRegistry.mockResolvedValue(registry({
      tenant: { ...registry().tenant, status: "suspended" }
    }));

    const result = await isTenantAcceptingOrders("t1");
    expect(result.accepting).toBe(false);
    expect(result.reason).toBe("TENANT_INACTIVE");
  });

  it("rejects orders for archived tenant", async () => {
    mockRegistry.mockResolvedValue(registry({
      tenant: { ...registry().tenant, status: "archived" }
    }));

    const result = await isTenantAcceptingOrders("t1");
    expect(result.accepting).toBe(false);
    expect(result.reason).toBe("TENANT_INACTIVE");
  });

  it("rejects orders for cancelled subscription", async () => {
    mockRegistry.mockResolvedValue(registry({
      subscription: { ...registry().subscription!, status: "cancelled" }
    }));

    const result = await isTenantAcceptingOrders("t1");
    expect(result.accepting).toBe(false);
    expect(result.reason).toBe("SUBSCRIPTION_INACTIVE");
  });

  it("rejects orders for past_due subscription", async () => {
    mockRegistry.mockResolvedValue(registry({
      subscription: { ...registry().subscription!, status: "past_due" }
    }));

    const result = await isTenantAcceptingOrders("t1");
    expect(result.accepting).toBe(false);
    expect(result.reason).toBe("SUBSCRIPTION_INACTIVE");
  });

  it("rejects orders when onlineOrdering is disabled", async () => {
    mockRegistry.mockResolvedValue(registry());
    mockFlags.mockResolvedValue(flags({ onlineOrdering: false }));

    const result = await isTenantAcceptingOrders("t1");
    expect(result.accepting).toBe(false);
    expect(result.reason).toBe("ONLINE_ORDERING_DISABLED");
  });

  it("accepts orders for legacy tenant with no registry record", async () => {
    mockRegistry.mockResolvedValue(null);
    mockFlags.mockResolvedValue(flags({ onlineOrdering: true }));

    const result = await isTenantAcceptingOrders("t1");
    expect(result.accepting).toBe(true);
  });

  it("accepts orders when subscription is null (no subscription record)", async () => {
    mockRegistry.mockResolvedValue(registry({ subscription: null }));
    mockFlags.mockResolvedValue(flags({ onlineOrdering: true }));

    const result = await isTenantAcceptingOrders("t1");
    expect(result.accepting).toBe(true);
  });
});
