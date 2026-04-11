import { getMongoDb, isMongoConfigured } from "./mongo";

interface TenantDocument<T> {
  tenantId: string;
  payload: T;
  updatedAt: string;
}

export async function getTenantDocument<T>(collectionName: string, tenantId: string) {
  if (!isMongoConfigured()) {
    return null;
  }

  const db = await getMongoDb();
  const collection = db.collection<TenantDocument<T>>(collectionName);
  const document = await collection.findOne({ tenantId });
  return document?.payload ?? null;
}

export async function saveTenantDocument<T>(
  collectionName: string,
  tenantId: string,
  payload: T
) {
  if (!isMongoConfigured()) {
    return false;
  }

  const db = await getMongoDb();
  const collection = db.collection<TenantDocument<T>>(collectionName);

  await collection.updateOne(
    { tenantId },
    {
      $set: {
        tenantId,
        payload,
        updatedAt: new Date().toISOString()
      }
    },
    { upsert: true }
  );

  return true;
}
