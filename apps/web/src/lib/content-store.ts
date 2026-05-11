import { promises as fs } from "node:fs";
import path from "node:path";

import type { StorefrontContent } from "@rcc/contracts";

import { getDefaultStorefrontContent, getDefaultTenant, getTenantBundle } from "./mock-data";
import { getStoredStaffMembers } from "./extadmin-user-store";
import { getStoredMenuContent } from "./menu-store";
import { getStoredOperationsContent } from "./operations-store";
import { getStoredReviews } from "./reviews-store";
import { getPlatformTenantRegistryRecord } from "./platform-tenant-store";
import { getStoredTenantSettings } from "./settings-store";
import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

const contentFilePath = path.join(process.cwd(), "data", "storefront-content.json");

type ContentStore = Record<string, StorefrontContent>;

async function ensureContentStoreFile() {
  try {
    await fs.access(contentFilePath);
  } catch {
    const initial: ContentStore = {
      [getDefaultTenant().id]: getDefaultStorefrontContent(getDefaultTenant().id)
    };
    await fs.mkdir(path.dirname(contentFilePath), { recursive: true });
    await fs.writeFile(contentFilePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readContentStore(): Promise<ContentStore> {
  await ensureContentStoreFile();
  const raw = await fs.readFile(contentFilePath, "utf8");
  return JSON.parse(raw) as ContentStore;
}

async function writeContentStore(store: ContentStore) {
  await fs.writeFile(contentFilePath, JSON.stringify(store, null, 2), "utf8");
}

async function buildFallbackStorefrontContent(tenantId: string): Promise<StorefrontContent> {
  try {
    return getDefaultStorefrontContent(tenantId);
  } catch {
    const tenant = await getStoredTenantSettings(tenantId);

    return {
      heroTitle: `Order direct from ${tenant.name}.`,
      heroSubtitle: tenant.description || `${tenant.name} is ready for online ordering.`,
      about:
        tenant.description ||
        `${tenant.name} is live on the platform. Update this homepage copy from restaurant admin.`,
      galleryImages: [],
      faq: [
        {
          question: "Do you offer delivery?",
          answer: "Delivery settings can be updated from restaurant admin."
        },
        {
          question: "Can I collect my order?",
          answer: "Collection availability can be updated from restaurant admin."
        }
      ]
    };
  }
}

export async function getStoredStorefrontContent(tenantId: string): Promise<StorefrontContent> {
  const fallback = await buildFallbackStorefrontContent(tenantId);
  const mongoContent = await getTenantDocument<StorefrontContent>("storefront_content", tenantId);

  if (mongoContent) {
    return {
      ...fallback,
      ...mongoContent
    };
  }

  const store = await readContentStore();
  return {
    ...fallback,
    ...(store[tenantId] ?? {})
  };
}

export async function updateStoredStorefrontContent(
  tenantId: string,
  content: StorefrontContent
) {
  const savedToMongo = await saveTenantDocument("storefront_content", tenantId, content);

  if (savedToMongo) {
    return;
  }

  const store = await readContentStore();
  store[tenantId] = content;
  await writeContentStore(store);
}

export async function getRuntimeTenantBundle(tenantId: string) {
  const [content, menu, operations, reviews, staff, tenant, registryRecord] = await Promise.all([
    getStoredStorefrontContent(tenantId),
    getStoredMenuContent(tenantId),
    getStoredOperationsContent(tenantId),
    getStoredReviews(tenantId),
    getStoredStaffMembers(tenantId),
    getStoredTenantSettings(tenantId),
    getPlatformTenantRegistryRecord(tenantId)
  ]);

  const bundle = getTenantBundle(
    tenantId,
    content,
    menu.categories,
    menu.menuItems,
    tenant
  );

  const domains = registryRecord?.domains.map((d) => ({
    domain: d.domain,
    domainType: d.domainType,
    isPrimary: d.isPrimary,
    verificationStatus: d.verificationStatus
  })) ?? [];

  return {
    ...bundle,
    domains,
    reviews,
    staff,
    orders: operations.orders,
    bookings: operations.bookings
  };
}
