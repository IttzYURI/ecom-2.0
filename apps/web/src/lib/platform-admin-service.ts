import { randomBytes, randomUUID } from "node:crypto";

import type {
  Category,
  Order,
  PrintStation,
  StorefrontContent,
  Tenant
} from "@rcc/contracts";

import { createTenantRepository } from "./db/repositories/create-tenant-repository";
import type {
  SubscriptionRecord,
  TenantDomainRecord,
  TenantRecord,
  TenantSettingsRecord
} from "./db/models";
import { recordAuditEntry } from "./audit-store";
import { createExtAdminInvite } from "./extadmin-invite-store";
import { createStoredExtAdminUser } from "./extadmin-user-store";
import { updateStoredMenuContent } from "./menu-store";
import {
  getStoredOperationsContent,
  replaceStoredOperationsContent
} from "./operations-store";
import {
  PLATFORM_FEATURE_KEYS,
  type PlatformFeatureKey,
  type PlatformTenantRegistryRecord,
  getPlatformTenantRegistryRecord,
  listPlatformTenantRegistryRecords,
  savePlatformTenantRegistryRecord
} from "./platform-tenant-store";
import { createStationToken, hashStationToken } from "./printing-auth";
import { createPrintStation, listPrintStations } from "./printing-store";
import { getStoredTenantSettings, updateStoredTenantSettings } from "./settings-store";
import {
  type TenantFeatureFlagsRecord,
  saveTenantFeatureFlagsRecord
} from "./tenant-feature-flags-store";
import {
  type OwnerAccessMode,
  type TenantSetupRecord,
  type ThemePreset,
  saveTenantSetupRecord
} from "./tenant-setup-store";
import { updateStoredStorefrontContent } from "./content-store";

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80";
const DEFAULT_PRIMARY_COLOR = "#af3e2a";
const DEFAULT_ACCENT_COLOR = "#d4a95f";
const DEFAULT_PLAN_CODE = "starter";
function getPlatformDomain(): string {
  const configured = String(process.env.TENANT_PLATFORM_HOSTS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return configured[0] || "platform.test";
}
const PRINTER_ONLINE_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_COLLECTION_TIME_MINUTES = 20;
const DEFAULT_DELIVERY_TIME_MINUTES = 45;
const DEFAULT_DELIVERY_RADIUS_MILES = 5;
const DEFAULT_MINIMUM_ORDER_AMOUNT = 15;
const DEFAULT_DELIVERY_FEE = 2.99;

const THEME_PRESETS: Record<
  ThemePreset,
  { primaryColor: string; accentColor: string; heroImage: string }
> = {
  sunset: {
    primaryColor: "#af3e2a",
    accentColor: "#d4a95f",
    heroImage:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
  },
  forest: {
    primaryColor: "#2f6a50",
    accentColor: "#d9b36f",
    heroImage:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80"
  },
  midnight: {
    primaryColor: "#253746",
    accentColor: "#f1b24a",
    heroImage:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80"
  },
  minimal: {
    primaryColor: "#3b3b3b",
    accentColor: "#b98c53",
    heroImage:
      "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?auto=format&fit=crop&w=1200&q=80"
  }
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  pizzeria: "Pizzeria",
  cafe: "Cafe",
  bakery: "Bakery",
  bar: "Bar",
  takeaway: "Takeaway",
  ghost_kitchen: "Ghost Kitchen"
};

const CATEGORY_PRESETS: Record<string, Array<{ name: string; description: string }>> = {
  restaurant: [
    { name: "Starters", description: "Opening plates, snacks, and shareable dishes." },
    { name: "Mains", description: "Core dishes and most popular guest orders." },
    { name: "Sides", description: "Add-ons, extras, and supporting dishes." },
    { name: "Desserts", description: "Sweet dishes and finishers." },
    { name: "Drinks", description: "Soft drinks, juices, and bottled drinks." }
  ],
  pizzeria: [
    { name: "Signature Pizzas", description: "House pizzas and best sellers." },
    { name: "Build Your Own", description: "Custom pizzas, crusts, and toppings." },
    { name: "Sides", description: "Garlic bread, dips, and shareables." },
    { name: "Pasta", description: "Pasta dishes and oven bakes." },
    { name: "Drinks", description: "Soft drinks and bottled beverages." }
  ],
  cafe: [
    { name: "Breakfast", description: "Morning staples, eggs, and brunch plates." },
    { name: "Lunch", description: "Sandwiches, salads, and light mains." },
    { name: "Coffee", description: "Espresso, filter, iced, and specialty drinks." },
    { name: "Pastries", description: "Bakes, cakes, and grab-and-go sweets." }
  ],
  bakery: [
    { name: "Fresh Bakes", description: "Daily breads, viennoiserie, and pastries." },
    { name: "Cakes", description: "Slices, celebration cakes, and tray bakes." },
    { name: "Savoury", description: "Pies, rolls, sandwiches, and lunch options." },
    { name: "Drinks", description: "Coffee, tea, and cold drinks." }
  ],
  bar: [
    { name: "Small Plates", description: "Snacks and dishes built for sharing." },
    { name: "Cocktails", description: "Signature mixes and house classics." },
    { name: "Beer & Wine", description: "Draft, bottled, and by-the-glass choices." },
    { name: "Zero Proof", description: "Soft drinks and alcohol-free options." }
  ],
  takeaway: [
    { name: "Popular Picks", description: "Fast-moving house favorites." },
    { name: "Combos", description: "Meal deals and bundled offers." },
    { name: "Sides", description: "Extras, dips, and add-ons." },
    { name: "Drinks", description: "Soft drinks and bottled beverages." }
  ],
  ghost_kitchen: [
    { name: "Hero Items", description: "Core dishes driving most delivery orders." },
    { name: "Bundles", description: "Multi-item combos and upsell packs." },
    { name: "Sides", description: "Extras and high-margin add-ons." },
    { name: "Drinks", description: "Delivery-friendly beverages." }
  ]
};

type ProvisionFeatureFlagsInput = Omit<
  TenantFeatureFlagsRecord,
  "tenantId" | "createdAt" | "updatedAt"
>;

export interface PlatformRestaurantProvisionResult {
  tenantId: string;
  ownerEmail: string;
  ownerAccessMode: OwnerAccessMode;
  temporaryPassword?: string;
  inviteToken?: string;
}

export interface PlatformTenantOrderSummary {
  totalOrders: number;
  activeOrders: number;
  paidOrders: number;
  grossRevenue: number;
  lastOrderAt: string | null;
}

export interface PlatformTenantPrinterSummary {
  totalStations: number;
  onlineStations: number;
  status: "not_configured" | "online" | "degraded" | "offline";
  lastSeenAt: string | null;
}

export interface PlatformTenantListItem {
  tenant: TenantRecord;
  settings: TenantSettingsRecord;
  domains: TenantDomainRecord[];
  subscription: SubscriptionRecord | null;
  features: PlatformFeatureKey[];
  orderSummary: PlatformTenantOrderSummary;
  printerSummary: PlatformTenantPrinterSummary;
  adminLoginPath: string;
}

export interface PlatformTenantDetail extends PlatformTenantListItem {
  recentOrders: Order[];
  printStations: PrintStation[];
}

export interface PlatformDashboardData {
  restaurants: PlatformTenantListItem[];
  metrics: Array<{
    label: string;
    value: string;
    tone: "default" | "success" | "warning";
  }>;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function createTenantId(slug: string) {
  return `tenant_${slug.replace(/-/g, "_")}`;
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/:\d+$/g, "").replace(/\.$/g, "");
}

function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function normalizeCurrencyCode(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized || "GBP";
}

function mapCurrencyToCountryCode(currencyCode: string) {
  if (currencyCode === "GBP") {
    return "GB";
  }

  if (currencyCode === "USD") {
    return "US";
  }

  if (currencyCode === "CAD") {
    return "CA";
  }

  if (currencyCode === "AUD") {
    return "AU";
  }

  return null;
}

function normalizeNumber(
  value: number | undefined,
  fallback: number,
  options?: { min?: number }
) {
  const nextValue = Number.isFinite(value) ? Number(value) : fallback;
  const min = options?.min ?? 0;
  return Math.max(nextValue, min);
}

function normalizeBusinessType(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() || "restaurant";
  return BUSINESS_TYPE_LABELS[normalized] ? normalized : "restaurant";
}

function getBusinessTypeLabel(businessType: string) {
  return BUSINESS_TYPE_LABELS[businessType] ?? BUSINESS_TYPE_LABELS.restaurant;
}

function getThemePresetValue(themePreset: ThemePreset | undefined) {
  return THEME_PRESETS[themePreset ?? "sunset"] ? themePreset ?? "sunset" : "sunset";
}

function createTemporaryPassword() {
  return randomBytes(9).toString("base64url");
}

function toMoneyLabel(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function createInitialStorefrontContent(input: {
  tenantId: string;
  businessName: string;
  businessType: string;
  homepageTitle: string;
  shortDescription: string;
  collectionEnabled: boolean;
  deliveryEnabled: boolean;
}): StorefrontContent {
  const businessTypeLabel = getBusinessTypeLabel(input.businessType);

  return {
    heroTitle: input.homepageTitle,
    heroSubtitle: input.shortDescription,
    about:
      `${input.businessName} is live on platform with ${businessTypeLabel.toLowerCase()} setup. Update homepage copy, hero media, and offer details from restaurant admin.`,
    galleryImages: [],
    faq: [
      {
        question: "Do you offer delivery?",
        answer: input.deliveryEnabled
          ? "Yes. Delivery zones, fees, and timing can be updated from restaurant admin."
          : "Delivery is currently disabled. Restaurant can enable it later from admin settings."
      },
      {
        question: "Can I collect my order?",
        answer: input.collectionEnabled
          ? "Yes. Collection windows and preparation times can be tuned from admin."
          : "Collection is currently disabled. Restaurant can enable it later from admin."
      }
    ]
  };
}

function buildTenantSettings(input: {
  tenantId: string;
  businessName: string;
  businessType: string;
  slug: string;
  subdomain: string;
  status: Tenant["status"];
  email: string;
  phone: string;
  address: string;
  shortDescription: string;
  themePreset: ThemePreset;
  logoUrl: string | null;
}): Tenant {
  const theme = THEME_PRESETS[input.themePreset];
  const businessTypeLabel = getBusinessTypeLabel(input.businessType);

  return {
    id: input.tenantId,
    name: input.businessName,
    slug: input.slug,
    subdomain: input.subdomain,
    status: input.status,
    cuisine: businessTypeLabel,
    description: input.shortDescription,
    phone: input.phone,
    email: input.email,
    address: input.address,
    deliveryPostcodes: [],
    branding: {
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
      logoText: input.businessName,
      heroImage: theme.heroImage,
      logoUrl: input.logoUrl ?? undefined
    }
  };
}

function buildTenantRecord(input: {
  tenantId: string;
  name: string;
  slug: string;
  status: TenantRecord["status"];
  supportEmail: string;
  supportPhone: string;
  timezone: string;
  currencyCode: string;
}) {
  const now = new Date().toISOString();

  return {
    id: input.tenantId,
    tenantId: input.tenantId,
    slug: input.slug,
    name: input.name,
    status: input.status,
    legalName: input.name,
    supportEmail: input.supportEmail,
    supportPhone: input.supportPhone,
    timezone: input.timezone,
    currencyCode: input.currencyCode,
    countryCode: mapCurrencyToCountryCode(input.currencyCode),
    createdAt: now,
    updatedAt: now
  } satisfies TenantRecord;
}

function buildPrimarySubdomainDomain(tenant: TenantRecord, subdomain: string) {
  return {
    id: `domain_${tenant.id}`,
    tenantId: tenant.id,
    domain: `${subdomain}.${getPlatformDomain()}`,
    domainType: "subdomain",
    isPrimary: true,
    verificationStatus: "verified",
    sslStatus: "active",
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt
  } satisfies TenantDomainRecord;
}

function buildSubscription(input: {
  tenantId: string;
  planCode: string;
  status: SubscriptionRecord["status"];
  billingInterval: SubscriptionRecord["billingInterval"];
  existing?: SubscriptionRecord | null;
}) {
  const now = new Date().toISOString();

  return {
    id: input.existing?.id ?? `sub_${input.tenantId}_${randomUUID().slice(0, 8)}`,
    tenantId: input.tenantId,
    provider: "stripe",
    providerCustomerId: input.existing?.providerCustomerId ?? null,
    providerSubscriptionId: input.existing?.providerSubscriptionId ?? null,
    planCode: input.planCode,
    status: input.status,
    billingInterval: input.billingInterval,
    trialEndsAt: input.existing?.trialEndsAt ?? null,
    currentPeriodStartsAt: input.existing?.currentPeriodStartsAt ?? null,
    currentPeriodEndsAt: input.existing?.currentPeriodEndsAt ?? null,
    cancelAtPeriodEnd: input.existing?.cancelAtPeriodEnd ?? false,
    cancelledAt:
      input.status === "cancelled"
        ? input.existing?.cancelledAt ?? now
        : null,
    createdAt: input.existing?.createdAt ?? now,
    updatedAt: now
  } satisfies SubscriptionRecord;
}

function buildCustomDomainRecord(
  tenantId: string,
  customDomain: string,
  createdAt: string,
  updatedAt: string
) {
  return {
    id: `domain_custom_${tenantId}`,
    tenantId,
    domain: customDomain,
    domainType: "custom",
    isPrimary: false,
    verificationStatus: "pending",
    sslStatus: "pending",
    createdAt,
    updatedAt
  } satisfies TenantDomainRecord;
}

function buildPlatformFeatures(input: {
  featureFlags: ProvisionFeatureFlagsInput;
  deliveryEnabled: boolean;
  customDomain?: string | null;
}) {
  const features = new Set<PlatformFeatureKey>(["restaurant_admin", "menu_management"]);

  if (input.featureFlags.onlineOrdering) {
    features.add("storefront");
  }

  if (input.featureFlags.tableBooking) {
    features.add("bookings");
  }

  if (input.deliveryEnabled || input.featureFlags.driverModule) {
    features.add("delivery");
  }

  if (input.featureFlags.customerLogin) {
    features.add("customer_accounts");
  }

  if (input.featureFlags.cardPayment) {
    features.add("stripe_payments");
  }

  if (input.featureFlags.printerIntegration) {
    features.add("printing");
  }

  if (input.customDomain || input.featureFlags.customDomain) {
    features.add("custom_domains");
  }

  if (input.featureFlags.gallery) {
    features.add("gallery");
  }

  if (input.featureFlags.promotions) {
    features.add("promotions");
  }

  if (input.featureFlags.advancedReports) {
    features.add("advanced_reports");
  }

  return Array.from(features);
}

function buildProvisionCategories(tenantId: string, businessType: string): Category[] {
  const preset = CATEGORY_PRESETS[businessType] ?? CATEGORY_PRESETS.restaurant;

  return preset.map((entry, index) => ({
    id: createId("cat"),
    tenantId,
    name: entry.name,
    slug: slugify(entry.name),
    description: entry.description,
    sortOrder: index + 1,
    visible: true
  }));
}

function buildTenantSetupRecord(input: {
  tenantId: string;
  businessName: string;
  businessType: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  logoUrl: string | null;
  defaultCurrency: string;
  timezone: string;
  ownerName: string;
  ownerEmail: string;
  ownerAccessMode: OwnerAccessMode;
  subdomain: string;
  customDomain: string | null;
  homepageTitle: string;
  shortDescription: string;
  themePreset: ThemePreset;
  collectionEnabled: boolean;
  deliveryEnabled: boolean;
  defaultCollectionTimeMinutes: number;
  defaultDeliveryTimeMinutes: number;
  deliveryRadiusMiles: number;
  minimumOrderAmount: number;
  deliveryFee: number;
}) {
  const now = new Date().toISOString();

  return {
    ...input,
    createdAt: now,
    updatedAt: now
  } satisfies TenantSetupRecord;
}

function buildFeatureFlagsRecord(
  tenantId: string,
  flags: ProvisionFeatureFlagsInput
) {
  const now = new Date().toISOString();

  return {
    tenantId,
    ...flags,
    createdAt: now,
    updatedAt: now
  } satisfies TenantFeatureFlagsRecord;
}

function buildOrderSummary(orders: Order[]): PlatformTenantOrderSummary {
  const sortedOrders = [...orders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  return {
    totalOrders: orders.length,
    activeOrders: orders.filter((order) =>
      ["pending_payment", "placed", "accepted", "preparing"].includes(order.orderStatus)
    ).length,
    paidOrders: orders.filter((order) => order.paymentStatus === "paid").length,
    grossRevenue: orders
      .filter((order) => order.paymentStatus === "paid")
      .reduce((sum, order) => sum + order.total, 0),
    lastOrderAt: sortedOrders[0]?.createdAt ?? null
  };
}

function buildPrinterSummary(stations: PrintStation[]): PlatformTenantPrinterSummary {
  const enabledStations = stations.filter((station) => station.enabled);
  const onlineStations = enabledStations.filter((station) => {
    if (!station.lastSeenAt) {
      return false;
    }

    return Date.now() - new Date(station.lastSeenAt).getTime() <= PRINTER_ONLINE_WINDOW_MS;
  });
  const lastSeenAt = [...stations]
    .map((station) => station.lastSeenAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  return {
    totalStations: stations.length,
    onlineStations: onlineStations.length,
    status:
      !stations.length
        ? "not_configured"
        : onlineStations.length === enabledStations.length && enabledStations.length > 0
          ? "online"
          : onlineStations.length > 0
            ? "degraded"
            : "offline",
    lastSeenAt
  };
}

function getAdminLoginPath(tenantId: string) {
  return `/api/v1/platform/tenants/${encodeURIComponent(tenantId)}/open-admin`;
}

function getSubdomainValue(domains: TenantDomainRecord[], fallback: string) {
  return domains.find((domain) => domain.domainType === "subdomain")?.domain.split(".")[0] ?? fallback;
}

function ensureTenantName(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label.toUpperCase()}_REQUIRED`);
  }

  return normalized;
}

async function mapRegistryRecordToListItem(
  record: PlatformTenantRegistryRecord
): Promise<PlatformTenantListItem> {
  const [settings, operations, printStations] = await Promise.all([
    createTenantRepository().getTenantSettings({ tenantId: record.tenant.id }),
    getStoredOperationsContent(record.tenant.id),
    listPrintStations(record.tenant.id)
  ]);

  if (!settings) {
    throw new Error(`Tenant settings missing for ${record.tenant.id}`);
  }

  return {
    tenant: record.tenant,
    settings,
    domains: record.domains,
    subscription: record.subscription,
    features: record.features,
    orderSummary: buildOrderSummary(operations.orders),
    printerSummary: buildPrinterSummary(printStations),
    adminLoginPath: getAdminLoginPath(record.tenant.id)
  };
}

export class PlatformAdminService {
  async getDashboardData(): Promise<PlatformDashboardData> {
    const restaurants = await this.listRestaurants();
    const activeRestaurants = restaurants.filter((restaurant) => restaurant.tenant.status === "active");
    const trialingRestaurants = restaurants.filter((restaurant) => restaurant.tenant.status === "trialing");
    const onlinePrinterRestaurants = restaurants.filter(
      (restaurant) => restaurant.printerSummary.status === "online"
    );
    const grossRevenue = restaurants.reduce(
      (sum, restaurant) => sum + restaurant.orderSummary.grossRevenue,
      0
    );

    return {
      restaurants,
      metrics: [
        {
          label: "Restaurants",
          value: String(restaurants.length),
          tone: "default"
        },
        {
          label: "Active",
          value: String(activeRestaurants.length),
          tone: "success"
        },
        {
          label: "Trialing",
          value: String(trialingRestaurants.length),
          tone: trialingRestaurants.length ? "warning" : "default"
        },
        {
          label: "Print Healthy",
          value: String(onlinePrinterRestaurants.length),
          tone: onlinePrinterRestaurants.length ? "success" : "warning"
        },
        {
          label: "Paid Revenue",
          value: toMoneyLabel(grossRevenue),
          tone: "default"
        }
      ]
    };
  }

  async listRestaurants() {
    const registryRecords = await listPlatformTenantRegistryRecords();
    return Promise.all(registryRecords.map((record) => mapRegistryRecordToListItem(record)));
  }

  async getRestaurant(tenantId: string): Promise<PlatformTenantDetail | null> {
    const registryRecord = await getPlatformTenantRegistryRecord(tenantId);

    if (!registryRecord) {
      return null;
    }

    const [listItem, operations, printStations] = await Promise.all([
      mapRegistryRecordToListItem(registryRecord),
      getStoredOperationsContent(tenantId),
      listPrintStations(tenantId)
    ]);

    return {
      ...listItem,
      recentOrders: [...operations.orders]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 8),
      printStations
    };
  }

  async createRestaurant(input: {
    businessName: string;
    businessType: string;
    email: string;
    phone?: string;
    address?: string;
    postcode?: string;
    logoUrl?: string;
    defaultCurrency?: string;
    timezone?: string;
    ownerName: string;
    ownerEmail: string;
    ownerAccessMode: OwnerAccessMode;
    temporaryPassword?: string;
    subdomain?: string;
    customDomain?: string;
    homepageTitle?: string;
    shortDescription?: string;
    themePreset?: ThemePreset;
    collectionEnabled: boolean;
    deliveryEnabled: boolean;
    defaultCollectionTimeMinutes?: number;
    defaultDeliveryTimeMinutes?: number;
    deliveryRadiusMiles?: number;
    minimumOrderAmount?: number;
    deliveryFee?: number;
    featureFlags: ProvisionFeatureFlagsInput;
    actorEmail: string;
  }): Promise<PlatformRestaurantProvisionResult> {
    const businessName = ensureTenantName(input.businessName, "business_name");
    const businessType = normalizeBusinessType(input.businessType);
    const slug = slugify(input.subdomain || businessName);
    const supportEmail = ensureTenantName(input.email, "business_email").toLowerCase();
    const supportPhone = input.phone?.trim() || "";
    const postcode = input.postcode?.trim() || "";
    const addressLine = input.address?.trim() || "";
    const address = [addressLine, postcode].filter(Boolean).join(", ");
    const ownerName = ensureTenantName(input.ownerName, "owner_name");
    const ownerEmail = ensureTenantName(input.ownerEmail, "owner_email").toLowerCase();
    const defaultCurrency = normalizeCurrencyCode(input.defaultCurrency);
    const timezone = ensureTenantName(input.timezone || "Europe/London", "timezone");
    const themePreset = getThemePresetValue(input.themePreset);
    const customDomain = normalizeDomain(input.customDomain ?? "") || null;
    const homepageTitle =
      input.homepageTitle?.trim() || `Order direct from ${businessName}.`;
    const shortDescription =
      input.shortDescription?.trim() ||
      `${businessName} is ready for online ordering, direct guest engagement, and branded operations.`;
    const defaultCollectionTimeMinutes = normalizeNumber(
      input.defaultCollectionTimeMinutes,
      DEFAULT_COLLECTION_TIME_MINUTES,
      { min: 5 }
    );
    const defaultDeliveryTimeMinutes = normalizeNumber(
      input.defaultDeliveryTimeMinutes,
      DEFAULT_DELIVERY_TIME_MINUTES,
      { min: 5 }
    );
    const deliveryRadiusMiles = normalizeNumber(
      input.deliveryRadiusMiles,
      DEFAULT_DELIVERY_RADIUS_MILES,
      { min: 0 }
    );
    const minimumOrderAmount = normalizeNumber(
      input.minimumOrderAmount,
      DEFAULT_MINIMUM_ORDER_AMOUNT,
      { min: 0 }
    );
    const deliveryFee = normalizeNumber(input.deliveryFee, DEFAULT_DELIVERY_FEE, { min: 0 });
    const existingRestaurants = await this.listRestaurants();

    if (existingRestaurants.some((restaurant) => restaurant.tenant.slug === slug)) {
      throw new Error("TENANT_SLUG_TAKEN");
    }

    if (
      existingRestaurants.some((restaurant) =>
        restaurant.domains.some(
          (domain) =>
            domain.domainType === "subdomain" &&
            domain.domain === `${slug}.${getPlatformDomain()}`
        )
      )
    ) {
      throw new Error("TENANT_SUBDOMAIN_TAKEN");
    }

    const tenantId = createTenantId(slug);

    if (existingRestaurants.some((restaurant) => restaurant.tenant.id === tenantId)) {
      throw new Error("TENANT_ID_TAKEN");
    }

    if (
      customDomain &&
      existingRestaurants.some((restaurant) =>
        restaurant.domains.some((domain) => domain.domain === customDomain)
      )
    ) {
      throw new Error("CUSTOM_DOMAIN_TAKEN");
    }

    const ownerAccessMode = input.ownerAccessMode ?? "temporary_password";
    const temporaryPassword =
      ownerAccessMode === "temporary_password"
        ? input.temporaryPassword?.trim() || createTemporaryPassword()
        : createTemporaryPassword();

    const tenantRecord = buildTenantRecord({
      tenantId,
      name: businessName,
      slug,
      status: "trialing",
      supportEmail,
      supportPhone,
      timezone,
      currencyCode: defaultCurrency
    });
    const tenantSettings = buildTenantSettings({
      tenantId,
      businessName,
      businessType,
      slug,
      subdomain: slug,
      status: "active",
      email: supportEmail,
      phone: supportPhone,
      address,
      shortDescription,
      themePreset,
      logoUrl: input.logoUrl?.trim() || null
    });
    const storefrontContent = createInitialStorefrontContent({
      tenantId,
      businessName,
      businessType,
      homepageTitle,
      shortDescription,
      collectionEnabled: input.collectionEnabled,
      deliveryEnabled: input.deliveryEnabled
    });
    const menuCategories = buildProvisionCategories(tenantId, businessType);
    const featureFlags = buildFeatureFlagsRecord(tenantId, input.featureFlags);
    const setupRecord = buildTenantSetupRecord({
      tenantId,
      businessName,
      businessType,
      email: supportEmail,
      phone: supportPhone,
      address: addressLine,
      postcode,
      logoUrl: input.logoUrl?.trim() || null,
      defaultCurrency,
      timezone,
      ownerName,
      ownerEmail,
      ownerAccessMode,
      subdomain: slug,
      customDomain,
      homepageTitle,
      shortDescription,
      themePreset,
      collectionEnabled: input.collectionEnabled,
      deliveryEnabled: input.deliveryEnabled,
      defaultCollectionTimeMinutes,
      defaultDeliveryTimeMinutes,
      deliveryRadiusMiles,
      minimumOrderAmount,
      deliveryFee
    });

    await savePlatformTenantRegistryRecord({
      tenant: tenantRecord,
      domains: [
        buildPrimarySubdomainDomain(tenantRecord, slug),
        ...(customDomain
          ? [buildCustomDomainRecord(tenantId, customDomain, tenantRecord.createdAt, tenantRecord.updatedAt)]
          : [])
      ],
      subscription: buildSubscription({
        tenantId,
        planCode: DEFAULT_PLAN_CODE,
        status: "trialing",
        billingInterval: "monthly"
      }),
      features: buildPlatformFeatures({
        featureFlags,
        deliveryEnabled: input.deliveryEnabled,
        customDomain
      }),
      source: "platform"
    });

    await Promise.all([
      updateStoredTenantSettings(tenantId, tenantSettings),
      updateStoredStorefrontContent(tenantId, storefrontContent),
      updateStoredMenuContent(tenantId, { categories: menuCategories, menuItems: [] }),
      replaceStoredOperationsContent(tenantId, { orders: [], bookings: [] }),
      saveTenantSetupRecord(setupRecord),
      saveTenantFeatureFlagsRecord(featureFlags)
    ]);

    const ownerUser = await createStoredExtAdminUser(tenantId, {
      name: ownerName,
      email: ownerEmail,
      password: temporaryPassword,
      roleIds: ["role_owner"],
      orderEmailsEnabled: true
    });

    await createPrintStation(tenantId, {
      name: "Main Kitchen Printer",
      tokenHash: hashStationToken(createStationToken()),
      enabled: false,
      deviceId: undefined,
      printerName: undefined,
      paperWidth: "80mm",
      autoPrintEnabled: featureFlags.printerIntegration,
      appVersion: undefined,
      lastSeenAt: undefined,
      lastActivityAt: undefined,
      lastActivityMessage: "Provisioned from Super Admin. Awaiting printer agent registration."
    });

    await recordAuditEntry(tenantId, {
      action: "platform.tenant.created",
      actorEmail: input.actorEmail.trim().toLowerCase(),
      target: tenantId,
      summary: `Provisioned ${businessName} with owner ${ownerEmail} and ${ownerAccessMode.replaceAll("_", " ")} access.`
    });

    if (ownerAccessMode === "invite_link") {
      const { token } = await createExtAdminInvite({
        tenantId,
        userId: ownerUser.id,
        email: ownerEmail,
        createdByEmail: input.actorEmail
      });

      return {
        tenantId,
        ownerEmail,
        ownerAccessMode,
        inviteToken: token
      };
    }

    return {
      tenantId,
      ownerEmail,
      ownerAccessMode,
      temporaryPassword
    };
  }

  async updateRestaurantBasics(
    tenantId: string,
    input: {
      name: string;
      legalName?: string;
      supportEmail: string;
      supportPhone?: string;
      cuisine?: string;
      address?: string;
      timezone?: string;
    }
  ) {
    const current = await this.getRestaurant(tenantId);

    if (!current) {
      throw new Error("TENANT_NOT_FOUND");
    }

    const name = ensureTenantName(input.name, "name");
    const legalName = input.legalName?.trim() || name;
    const supportEmail = ensureTenantName(input.supportEmail, "support_email").toLowerCase();
    const supportPhone = input.supportPhone?.trim() || "";
    const cuisine = input.cuisine?.trim() || "";
    const address = input.address?.trim() || "";
    const timezone = input.timezone?.trim() || current.tenant.timezone;
    const now = new Date().toISOString();

    await savePlatformTenantRegistryRecord({
      ...current,
      tenant: {
        ...current.tenant,
        name,
        legalName,
        supportEmail,
        supportPhone,
        timezone,
        updatedAt: now
      },
      source: "platform"
    });

    await updateStoredTenantSettings(tenantId, {
      ...(await getStoredTenantSettings(tenantId)),
      name,
      slug: current.tenant.slug,
      cuisine,
      email: supportEmail,
      phone: supportPhone,
      address,
      description: current.settings.description || `${name} is onboarding to the platform.`,
      subdomain: getSubdomainValue(current.domains, current.tenant.slug),
      branding: {
        primaryColor: current.settings.brandingPrimaryColor ?? DEFAULT_PRIMARY_COLOR,
        accentColor: current.settings.brandingAccentColor ?? DEFAULT_ACCENT_COLOR,
        logoText: current.settings.brandingLogoText ?? name,
        heroImage: current.settings.brandingHeroImageUrl ?? DEFAULT_HERO_IMAGE
      },
      deliveryPostcodes: current.settings.deliveryPostcodes
    });
  }

  async updateRestaurantStatus(
    tenantId: string,
    status: TenantRecord["status"]
  ) {
    const current = await this.getRestaurant(tenantId);

    if (!current) {
      throw new Error("TENANT_NOT_FOUND");
    }

    const now = new Date().toISOString();
    await savePlatformTenantRegistryRecord({
      ...current,
      tenant: {
        ...current.tenant,
        status,
        updatedAt: now
      },
      source: "platform"
    });
    await updateStoredTenantSettings(tenantId, {
      ...(await getStoredTenantSettings(tenantId)),
      status: status === "trialing" ? "active" : status
    });
  }

  async updateRestaurantFeatures(tenantId: string, features: string[]) {
    const current = await this.getRestaurant(tenantId);

    if (!current) {
      throw new Error("TENANT_NOT_FOUND");
    }

    await savePlatformTenantRegistryRecord({
      ...current,
      features: features.filter((feature): feature is PlatformFeatureKey =>
        PLATFORM_FEATURE_KEYS.includes(feature as PlatformFeatureKey)
      ),
      source: "platform"
    });
  }

  async updateRestaurantSubscription(
    tenantId: string,
    input: {
      planCode: string;
      status: SubscriptionRecord["status"];
      billingInterval: SubscriptionRecord["billingInterval"];
    }
  ) {
    const current = await this.getRestaurant(tenantId);

    if (!current) {
      throw new Error("TENANT_NOT_FOUND");
    }

    await savePlatformTenantRegistryRecord({
      ...current,
      subscription: buildSubscription({
        tenantId,
        planCode: ensureTenantName(input.planCode, "plan_code"),
        status: input.status,
        billingInterval: input.billingInterval,
        existing: current.subscription
      }),
      source: "platform"
    });
  }

  async updateRestaurantDomains(
    tenantId: string,
    input: {
      subdomain: string;
      customDomain?: string;
      customDomainVerified?: boolean;
    }
  ) {
    const current = await this.getRestaurant(tenantId);

    if (!current) {
      throw new Error("TENANT_NOT_FOUND");
    }

    const subdomain = slugify(input.subdomain);

    if (!subdomain) {
      throw new Error("SUBDOMAIN_REQUIRED");
    }

    const restaurants = await this.listRestaurants();
    const nextSubdomainDomain = `${subdomain}.${getPlatformDomain()}`;

    if (
      restaurants.some(
        (restaurant) =>
          restaurant.tenant.id !== tenantId &&
          restaurant.domains.some((domain) => domain.domain === nextSubdomainDomain)
      )
    ) {
      throw new Error("TENANT_SUBDOMAIN_TAKEN");
    }

    const customDomain = normalizeDomain(input.customDomain ?? "");

    if (
      customDomain &&
      restaurants.some(
        (restaurant) =>
          restaurant.tenant.id !== tenantId &&
          restaurant.domains.some((domain) => domain.domain === customDomain)
      )
    ) {
      throw new Error("CUSTOM_DOMAIN_TAKEN");
    }

    const now = new Date().toISOString();
    const nextDomains: TenantDomainRecord[] = [
      {
        id: current.domains.find((domain) => domain.domainType === "subdomain")?.id ??
          `domain_${tenantId}`,
        tenantId,
        domain: nextSubdomainDomain,
        domainType: "subdomain",
        isPrimary: !customDomain,
        verificationStatus: "verified",
        sslStatus: "active",
        createdAt:
          current.domains.find((domain) => domain.domainType === "subdomain")?.createdAt ?? now,
        updatedAt: now
      }
    ];

    if (customDomain) {
      nextDomains.push({
        id:
          current.domains.find((domain) => domain.domainType === "custom")?.id ??
          `domain_custom_${tenantId}`,
        tenantId,
        domain: customDomain,
        domainType: "custom",
        isPrimary: true,
        verificationStatus: input.customDomainVerified ? "verified" : "pending",
        sslStatus: input.customDomainVerified ? "active" : "pending",
        createdAt:
          current.domains.find((domain) => domain.domainType === "custom")?.createdAt ?? now,
        updatedAt: now
      });
    }

    await savePlatformTenantRegistryRecord({
      ...current,
      tenant: {
        ...current.tenant,
        slug: subdomain,
        updatedAt: now
      },
      domains: nextDomains,
      source: "platform"
    });

    await updateStoredTenantSettings(tenantId, {
      ...(await getStoredTenantSettings(tenantId)),
      slug: subdomain,
      subdomain
    });
  }
}
