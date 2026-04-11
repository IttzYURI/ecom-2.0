import { promises as fs } from "node:fs";
import path from "node:path";

import type { StorefrontContent } from "@rcc/contracts";

import { getDefaultStorefrontContent, getDefaultTenant, getTenantBundle } from "./mock-data";
import { getStoredStaffMembers } from "./extadmin-user-store";
import { getStoredMenuContent } from "./menu-store";
import { getStoredOperationsContent } from "./operations-store";
import { getStoredReviews } from "./reviews-store";
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

export async function getStoredStorefrontContent(tenantId: string): Promise<StorefrontContent> {
  const mongoContent = await getTenantDocument<StorefrontContent>("storefront_content", tenantId);

  if (mongoContent) {
    return {
      ...getDefaultStorefrontContent(tenantId),
      ...mongoContent
    };
  }

  const store = await readContentStore();
  return {
    ...getDefaultStorefrontContent(tenantId),
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
  const content = await getStoredStorefrontContent(tenantId);
  const menu = await getStoredMenuContent(tenantId);
  const operations = await getStoredOperationsContent(tenantId);
  const reviews = await getStoredReviews(tenantId);
  const staff = await getStoredStaffMembers(tenantId);
  const tenant = await getStoredTenantSettings(tenantId);

  const bundle = getTenantBundle(
    tenantId,
    content,
    menu.categories,
    menu.menuItems,
    tenant
  );

  return {
    ...bundle,
    reviews,
    staff,
    orders: operations.orders,
    bookings: operations.bookings
  };
}
