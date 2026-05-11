import type { FeatureFlagKey, TenantFeatureFlagsRecord } from "./tenant-feature-flags-store";
import { getTenantFeatureFlagsRecord } from "./tenant-feature-flags-store";
import { getPlatformTenantRegistryRecord } from "./platform-tenant-store";

export async function requireTenantFeature(
  tenantId: string,
  feature: FeatureFlagKey
): Promise<{ allowed: boolean; flags: TenantFeatureFlagsRecord | null }> {
  const flags = await getTenantFeatureFlagsRecord(tenantId);

  if (!flags) {
    return { allowed: true, flags: null };
  }

  return { allowed: flags[feature], flags };
}

const BLOCKED_SUBSCRIPTION_STATUSES = new Set(["past_due", "cancelled"]);

export async function isTenantAcceptingOrders(tenantId: string): Promise<{
  accepting: boolean;
  reason?: string;
}> {
  const registry = await getPlatformTenantRegistryRecord(tenantId);

  if (registry) {
    if (registry.tenant.status === "suspended" || registry.tenant.status === "archived") {
      return { accepting: false, reason: "TENANT_INACTIVE" };
    }

    if (
      registry.subscription &&
      BLOCKED_SUBSCRIPTION_STATUSES.has(registry.subscription.status)
    ) {
      return { accepting: false, reason: "SUBSCRIPTION_INACTIVE" };
    }
  }

  const { allowed } = await requireTenantFeature(tenantId, "onlineOrdering");

  if (!allowed) {
    return { accepting: false, reason: "ONLINE_ORDERING_DISABLED" };
  }

  return { accepting: true };
}
