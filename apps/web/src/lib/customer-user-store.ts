import { promises as fs } from "node:fs";
import path from "node:path";

import { getDefaultTenant } from "./mock-data";
import { hashPassword, verifyPassword } from "./password";
import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

export type CustomerUserRecord = {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

const customerUsersFilePath = path.join(process.cwd(), "data", "customer-users.json");
type CustomerUserStore = Record<string, CustomerUserRecord[]>;

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureCustomerUsersStoreFile() {
  try {
    await fs.access(customerUsersFilePath);
  } catch {
    const initial: CustomerUserStore = {
      [getDefaultTenant().id]: []
    };
    await fs.mkdir(path.dirname(customerUsersFilePath), { recursive: true });
    await fs.writeFile(customerUsersFilePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readCustomerUsersStore(): Promise<CustomerUserStore> {
  await ensureCustomerUsersStoreFile();
  const raw = await fs.readFile(customerUsersFilePath, "utf8");
  return JSON.parse(raw) as CustomerUserStore;
}

async function writeCustomerUsersStore(store: CustomerUserStore) {
  await fs.writeFile(customerUsersFilePath, JSON.stringify(store, null, 2), "utf8");
}

export async function getStoredCustomerUsers(tenantId: string) {
  const users = await getTenantDocument<CustomerUserRecord[]>("customer_users", tenantId);

  if (users) {
    return users;
  }

  const store = await readCustomerUsersStore();
  return store[tenantId] ?? [];
}

async function persistStoredCustomerUsers(tenantId: string, users: CustomerUserRecord[]) {
  const savedToMongo = await saveTenantDocument("customer_users", tenantId, users);

  if (savedToMongo) {
    return;
  }

  const store = await readCustomerUsersStore();
  store[tenantId] = users;
  await writeCustomerUsersStore(store);
}

export async function findStoredCustomerUserByEmail(tenantId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await getStoredCustomerUsers(tenantId);
  return users.find((entry) => entry.email === normalizedEmail) ?? null;
}

export async function createStoredCustomerUser(
  tenantId: string,
  input: { email: string; password: string; name: string }
) {
  const existing = await findStoredCustomerUserByEmail(tenantId, input.email);

  if (existing) {
    throw new Error("DUPLICATE_EMAIL");
  }

  const now = new Date().toISOString();
  const user: CustomerUserRecord = {
    id: createId("customer"),
    tenantId,
    email: input.email.trim().toLowerCase(),
    passwordHash: await hashPassword(input.password),
    name: input.name.trim(),
    createdAt: now,
    updatedAt: now
  };

  const users = await getStoredCustomerUsers(tenantId);
  await persistStoredCustomerUsers(tenantId, [user, ...users]);
  return user;
}

export async function validateStoredCustomerUser(tenantId: string, email: string, password: string) {
  const user = await findStoredCustomerUserByEmail(tenantId, email);

  if (!user) {
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}
