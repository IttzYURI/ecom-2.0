import type { ReactNode } from "react";

import type { FeatureFlagKey, TenantFeatureFlagsRecord } from "../lib/tenant-feature-flags-store";
import { FeatureUnavailablePage } from "./feature-unavailable";

export function FeatureGate({
  features,
  flag,
  children,
  fallback
}: {
  features: TenantFeatureFlagsRecord | null;
  flag: FeatureFlagKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  if (!features || features[flag]) {
    return <>{children}</>;
  }

  return fallback ?? <FeatureUnavailablePage feature={flag} />;
}
