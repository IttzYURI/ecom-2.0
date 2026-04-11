import { MongoClient } from "mongodb";

declare global {
  var __rccMongoClientPromise: Promise<MongoClient> | undefined;
  var __rccMongoIndexesPromise: Promise<void> | undefined;
}

function getMongoUri() {
  return process.env.MONGODB_URI?.trim();
}

export function isMongoConfigured() {
  return Boolean(getMongoUri());
}

async function createClient() {
  const uri = getMongoUri();

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  const client = new MongoClient(uri);
  await client.connect();
  return client;
}

export async function getMongoClient() {
  if (!global.__rccMongoClientPromise) {
    global.__rccMongoClientPromise = createClient();
  }

  return global.__rccMongoClientPromise;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB?.trim() || "restaurant-commerce-cloud");

  if (!global.__rccMongoIndexesPromise) {
    global.__rccMongoIndexesPromise = Promise.all([
      db.collection("storefront_content").createIndex({ tenantId: 1 }, { unique: true }),
      db.collection("menu_content").createIndex({ tenantId: 1 }, { unique: true }),
      db.collection("tenant_settings").createIndex({ tenantId: 1 }, { unique: true }),
      db.collection("operations_content").createIndex({ tenantId: 1 }, { unique: true }),
      db.collection("reviews_content").createIndex({ tenantId: 1 }, { unique: true }),
      db.collection("extadmin_users").createIndex(
        { tenantId: 1, email: 1 },
        { unique: true }
      ),
      db.collection("audit_log").createIndex({ tenantId: 1, createdAt: -1 })
    ]).then(() => undefined);
  }

  await global.__rccMongoIndexesPromise;
  return db;
}
