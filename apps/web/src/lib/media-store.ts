import { promises as fs } from "node:fs";
import path from "node:path";

import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

export type MediaAsset = {
  id: string;
  tenantId: string;
  label: string;
  url: string;
  kind: "gallery" | "hero" | "general";
  createdAt: string;
};

const mediaFilePath = path.join(process.cwd(), "data", "media-content.json");

type MediaStore = Record<string, MediaAsset[]>;

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureMediaStoreFile() {
  try {
    await fs.access(mediaFilePath);
  } catch {
    await fs.mkdir(path.dirname(mediaFilePath), { recursive: true });
    await fs.writeFile(mediaFilePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readMediaStore(): Promise<MediaStore> {
  await ensureMediaStoreFile();
  const raw = await fs.readFile(mediaFilePath, "utf8");
  return JSON.parse(raw) as MediaStore;
}

async function writeMediaStore(store: MediaStore) {
  await fs.writeFile(mediaFilePath, JSON.stringify(store, null, 2), "utf8");
}

export async function getStoredMediaAssets(tenantId: string) {
  const mongoAssets = await getTenantDocument<MediaAsset[]>("media_content", tenantId);

  if (mongoAssets) {
    return mongoAssets;
  }

  const store = await readMediaStore();
  return store[tenantId] ?? [];
}

async function persistMediaAssets(tenantId: string, assets: MediaAsset[]) {
  const savedToMongo = await saveTenantDocument("media_content", tenantId, assets);

  if (!savedToMongo) {
    const store = await readMediaStore();
    store[tenantId] = assets;
    await writeMediaStore(store);
  }
}

export async function createStoredMediaAsset(
  tenantId: string,
  input: Omit<MediaAsset, "id" | "tenantId" | "createdAt">
) {
  const assets = await getStoredMediaAssets(tenantId);
  const asset: MediaAsset = {
    id: createId("media"),
    tenantId,
    createdAt: new Date().toISOString(),
    ...input
  };

  await persistMediaAssets(tenantId, [asset, ...assets]);
  return asset;
}

export async function deleteStoredMediaAsset(tenantId: string, assetId: string) {
  const assets = await getStoredMediaAssets(tenantId);
  const next = assets.filter((asset) => asset.id !== assetId);
  await persistMediaAssets(tenantId, next);
}
