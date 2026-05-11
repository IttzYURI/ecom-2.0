import type { FeatureFlagKey } from "./tenant-feature-flags-store";

export type PlanCode = "basic" | "pro" | "premium" | "custom";

type FeatureDefaults = Record<FeatureFlagKey, boolean>;

interface PlanDefinition {
  name: string;
  description: string;
  defaultFeatures: FeatureDefaults;
}

export const SUBSCRIPTION_PLANS: Record<PlanCode, PlanDefinition> = {
  basic: {
    name: "Basic",
    description: "Online ordering with cash payments and basic menu.",
    defaultFeatures: {
      onlineOrdering: true,
      cashPayment: true,
      cardPayment: false,
      customerLogin: false,
      tableBooking: false,
      reviews: false,
      gallery: false,
      printerIntegration: false,
      driverModule: false,
      promotions: false,
      customDomain: false,
      advancedReports: false
    }
  },
  pro: {
    name: "Professional",
    description: "Full ordering, card payments, bookings, reviews, and printing.",
    defaultFeatures: {
      onlineOrdering: true,
      cashPayment: true,
      cardPayment: true,
      customerLogin: true,
      tableBooking: true,
      reviews: true,
      gallery: true,
      printerIntegration: true,
      driverModule: true,
      promotions: false,
      customDomain: false,
      advancedReports: false
    }
  },
  premium: {
    name: "Premium",
    description: "All features including promotions, custom domains, and advanced reports.",
    defaultFeatures: {
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
      advancedReports: true
    }
  },
  custom: {
    name: "Custom",
    description: "All features enabled, individually configurable.",
    defaultFeatures: {
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
      advancedReports: true
    }
  }
};

export function getFeatureDefaultsForPlan(planCode: string): FeatureDefaults {
  const plan = SUBSCRIPTION_PLANS[planCode as PlanCode];
  return plan?.defaultFeatures ?? SUBSCRIPTION_PLANS.basic.defaultFeatures;
}

export function isValidPlanCode(value: string): value is PlanCode {
  return value in SUBSCRIPTION_PLANS;
}
