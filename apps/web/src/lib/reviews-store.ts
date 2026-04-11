import { promises as fs } from "node:fs";
import path from "node:path";

import type { Review } from "@rcc/contracts";

import { getDefaultTenant, getTenantBundle } from "./mock-data";
import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

const reviewsFilePath = path.join(process.cwd(), "data", "reviews-content.json");

type ReviewStore = Record<string, Review[]>;

async function ensureReviewsStoreFile() {
  try {
    await fs.access(reviewsFilePath);
  } catch {
    const tenantId = getDefaultTenant().id;
    const initial: ReviewStore = {
      [tenantId]: getTenantBundle(tenantId).reviews
    };
    await fs.mkdir(path.dirname(reviewsFilePath), { recursive: true });
    await fs.writeFile(reviewsFilePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readReviewsStore(): Promise<ReviewStore> {
  await ensureReviewsStoreFile();
  const raw = await fs.readFile(reviewsFilePath, "utf8");
  return JSON.parse(raw) as ReviewStore;
}

async function writeReviewsStore(store: ReviewStore) {
  await fs.writeFile(reviewsFilePath, JSON.stringify(store, null, 2), "utf8");
}

export async function getStoredReviews(tenantId: string) {
  const mongoReviews = await getTenantDocument<Review[]>("reviews_content", tenantId);

  if (mongoReviews) {
    return mongoReviews;
  }

  const store = await readReviewsStore();
  return store[tenantId] ?? getTenantBundle(tenantId).reviews;
}

export async function updateStoredReviews(tenantId: string, reviews: Review[]) {
  const savedToMongo = await saveTenantDocument("reviews_content", tenantId, reviews);

  if (savedToMongo) {
    return;
  }

  const store = await readReviewsStore();
  store[tenantId] = reviews;
  await writeReviewsStore(store);
}
