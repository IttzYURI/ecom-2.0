import { promises as fs } from "node:fs";
import path from "node:path";

import type { Category, MenuItem, StorefrontContent } from "@rcc/contracts";

import {
  getDefaultCategories,
  getDefaultMenuItems,
  getDefaultTenant,
  getTenantBundle
} from "./mock-data";
import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

const menuFilePath = path.join(process.cwd(), "data", "menu-content.json");

type MenuStore = Record<
  string,
  {
    categories: Category[];
    menuItems: MenuItem[];
  }
>;

async function ensureMenuStoreFile() {
  try {
    await fs.access(menuFilePath);
  } catch {
    const tenantId = getDefaultTenant().id;
    const initial: MenuStore = {
      [tenantId]: {
        categories: getDefaultCategories(tenantId),
        menuItems: getDefaultMenuItems(tenantId)
      }
    };
    await fs.mkdir(path.dirname(menuFilePath), { recursive: true });
    await fs.writeFile(menuFilePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readMenuStore(): Promise<MenuStore> {
  await ensureMenuStoreFile();
  const raw = await fs.readFile(menuFilePath, "utf8");
  return JSON.parse(raw) as MenuStore;
}

async function writeMenuStore(store: MenuStore) {
  await fs.writeFile(menuFilePath, JSON.stringify(store, null, 2), "utf8");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getStoredMenuContent(tenantId: string) {
  const mongoMenu = await getTenantDocument<{
    categories: Category[];
    menuItems: MenuItem[];
  }>("menu_content", tenantId);

  if (mongoMenu) {
    return mongoMenu;
  }

  const store = await readMenuStore();
  return (
    store[tenantId] ?? {
      categories: getDefaultCategories(tenantId),
      menuItems: getDefaultMenuItems(tenantId)
    }
  );
}

export async function updateStoredMenuContent(
  tenantId: string,
  content: { categories: Category[]; menuItems: MenuItem[] }
) {
  const savedToMongo = await saveTenantDocument("menu_content", tenantId, content);

  if (savedToMongo) {
    return;
  }

  const store = await readMenuStore();
  store[tenantId] = content;
  await writeMenuStore(store);
}

export async function createStoredCategory(
  tenantId: string,
  input: {
    name: string;
    slug?: string;
    description: string;
    visible: boolean;
  }
) {
  const existing = await getStoredMenuContent(tenantId);
  const category: Category = {
    id: createId("cat"),
    tenantId,
    name: input.name,
    slug: input.slug?.trim() || slugify(input.name),
    description: input.description,
    sortOrder: existing.categories.length + 1,
    visible: input.visible
  };

  await updateStoredMenuContent(tenantId, {
    ...existing,
    categories: [...existing.categories, category]
  });
}

export async function deleteStoredCategory(tenantId: string, categoryId: string) {
  const existing = await getStoredMenuContent(tenantId);
  const categories = existing.categories
    .filter((category) => category.id !== categoryId)
    .map((category, index) => ({
      ...category,
      sortOrder: index + 1
    }));

  const menuItems = existing.menuItems.map((item) => ({
    ...item,
    categoryIds: item.categoryIds.filter((id) => id !== categoryId)
  }));

  await updateStoredMenuContent(tenantId, { categories, menuItems });
}

export async function createStoredMenuItem(
  tenantId: string,
  input: {
    name: string;
    slug?: string;
    description: string;
    image: string;
    basePrice: number;
    categoryIds: string[];
    featured: boolean;
    bestSeller: boolean;
    available: boolean;
  }
) {
  const existing = await getStoredMenuContent(tenantId);
  const menuItem: MenuItem = {
    id: createId("item"),
    tenantId,
    categoryIds: input.categoryIds,
    name: input.name,
    slug: input.slug?.trim() || slugify(input.name),
    description: input.description,
    image: input.image,
    basePrice: input.basePrice,
    featured: input.featured,
    bestSeller: input.bestSeller,
    available: input.available,
    optionGroupIds: []
  };

  await updateStoredMenuContent(tenantId, {
    ...existing,
    menuItems: [...existing.menuItems, menuItem]
  });
}

export async function deleteStoredMenuItem(tenantId: string, itemId: string) {
  const existing = await getStoredMenuContent(tenantId);
  const menuItems = existing.menuItems.filter((item) => item.id !== itemId);
  await updateStoredMenuContent(tenantId, { ...existing, menuItems });
}

export async function getRuntimeTenantBundleWithMenu(
  tenantId: string,
  contentOverride?: StorefrontContent
) {
  const menu = await getStoredMenuContent(tenantId);
  return getTenantBundle(
    tenantId,
    contentOverride,
    menu.categories,
    menu.menuItems
  );
}
