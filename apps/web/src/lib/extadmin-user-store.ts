import { promises as fs } from "node:fs";
import path from "node:path";

import type { StaffMember } from "@rcc/contracts";

import { getMongoDb, isMongoConfigured } from "./mongo";
import { getDefaultStaff, getDefaultTenant, getDefaultTenantCopy } from "./mock-data";
import { hashPassword, verifyPassword } from "./password";
import { getStoredTenantSettings } from "./settings-store";

export type ExtAdminUserRecord = {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  roleIds: string[];
  name: string;
  orderEmailsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const extAdminUsersFilePath = path.join(process.cwd(), "data", "extadmin-users.json");

type ExtAdminUserStore = Record<string, ExtAdminUserRecord[]>;

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function hasMockTenantSeed(tenantId: string) {
  try {
    getDefaultTenantCopy(tenantId);
    return true;
  } catch {
    return false;
  }
}

async function getSeedOwnerDefaults(tenantId: string) {
  const tenant = (() => {
    try {
      return Promise.resolve(getDefaultTenantCopy(tenantId));
    } catch {
      return getStoredTenantSettings(tenantId);
    }
  })();
  const resolvedTenant = await tenant;
  const normalizedTenantSlug = resolvedTenant.slug.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const isDefaultTenant = tenantId === getDefaultTenant().id;

  return {
    id: "staff_owner",
    tenantId,
    email:
      process.env.EXTADMIN_EMAIL?.trim() && isDefaultTenant
        ? process.env.EXTADMIN_EMAIL.trim()
        : isDefaultTenant
          ? "owner@bellaroma.test"
          : `owner@${normalizedTenantSlug || tenantId}.test`,
    password: process.env.EXTADMIN_PASSWORD?.trim() || "demo1234",
    name:
      process.env.EXTADMIN_NAME?.trim() && isDefaultTenant
        ? process.env.EXTADMIN_NAME.trim()
        : `${resolvedTenant.name} Owner`,
    roleIds: ["role_owner"]
  };
}

function normalizeOrderEmailsEnabled(user: Pick<ExtAdminUserRecord, "roleIds"> & { orderEmailsEnabled?: boolean }) {
  if (typeof user.orderEmailsEnabled === "boolean") {
    return user.orderEmailsEnabled;
  }

  return user.roleIds.includes("role_owner");
}

function mapUserToStaffMember(user: ExtAdminUserRecord): StaffMember {
  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    roleIds: user.roleIds,
    orderEmailsEnabled: normalizeOrderEmailsEnabled(user)
  };
}

async function buildSeedUsers(tenantId: string) {
  const owner = await getSeedOwnerDefaults(tenantId);
  const defaultStaff = getDefaultStaff(tenantId);
  const seedUsers: ExtAdminUserRecord[] = [
    {
      id: owner.id,
      tenantId: owner.tenantId,
      email: owner.email,
      passwordHash: await hashPassword(owner.password),
      roleIds: owner.roleIds,
      name: owner.name,
      orderEmailsEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  for (const member of defaultStaff) {
    if (member.email === owner.email) {
      continue;
    }

    seedUsers.push({
      id: member.id,
      tenantId: member.tenantId,
      email: member.email,
      passwordHash: await hashPassword("staff1234"),
      roleIds: member.roleIds,
      name: member.name,
      orderEmailsEnabled: member.orderEmailsEnabled ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return seedUsers;
}

async function ensureUsersStoreFile() {
  try {
    await fs.access(extAdminUsersFilePath);
  } catch {
    const tenantId = getDefaultTenant().id;
    const initial: ExtAdminUserStore = {
      [tenantId]: await buildSeedUsers(tenantId)
    };
    await fs.mkdir(path.dirname(extAdminUsersFilePath), { recursive: true });
    await fs.writeFile(extAdminUsersFilePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readUsersStore(): Promise<ExtAdminUserStore> {
  await ensureUsersStoreFile();
  const raw = await fs.readFile(extAdminUsersFilePath, "utf8");
  return JSON.parse(raw) as ExtAdminUserStore;
}

async function writeUsersStore(store: ExtAdminUserStore) {
  await fs.writeFile(extAdminUsersFilePath, JSON.stringify(store, null, 2), "utf8");
}

async function getUsersCollection() {
  const db = await getMongoDb();
  return db.collection<ExtAdminUserRecord>("extadmin_users");
}

export async function ensureDefaultExtAdminUsers(tenantId = getDefaultTenant().id) {
  if (!isMongoConfigured()) {
    await ensureUsersStoreFile();
    return getStoredExtAdminUsers(tenantId);
  }

  const collection = await getUsersCollection();
  const existingCount = await collection.countDocuments({ tenantId });

  if (existingCount > 0) {
    return collection.find({ tenantId }).sort({ createdAt: 1 }).toArray();
  }

  if (!hasMockTenantSeed(tenantId)) {
    return [];
  }

  const seedUsers = await buildSeedUsers(tenantId);
  await collection.insertMany(seedUsers);
  return seedUsers;
}

export async function getStoredExtAdminUsers(tenantId: string) {
  if (isMongoConfigured()) {
    await ensureDefaultExtAdminUsers(tenantId);
    const collection = await getUsersCollection();
    const users = await collection.find({ tenantId }).sort({ createdAt: 1 }).toArray();
    return users.map((user) => ({
      ...user,
      orderEmailsEnabled: normalizeOrderEmailsEnabled(user)
    }));
  }

  const store = await readUsersStore();
  const fallbackUsers = hasMockTenantSeed(tenantId) ? await buildSeedUsers(tenantId) : [];

  return (store[tenantId] ?? fallbackUsers).map((user) => ({
    ...user,
    orderEmailsEnabled: normalizeOrderEmailsEnabled(user)
  }));
}

export async function findStoredExtAdminUserByEmail(tenantId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await getStoredExtAdminUsers(tenantId);
  return users.find((entry) => entry.email === normalizedEmail) ?? null;
}

export async function getStoredStaffMembers(tenantId: string) {
  const users = await getStoredExtAdminUsers(tenantId);
  return users.map(mapUserToStaffMember);
}

export async function createStoredExtAdminUser(
  tenantId: string,
  input: {
    name: string;
    email: string;
    password: string;
    roleIds: string[];
    orderEmailsEnabled?: boolean;
  }
) {
  const existing = await findStoredExtAdminUserByEmail(tenantId, input.email);

  if (existing) {
    throw new Error("DUPLICATE_EMAIL");
  }

  const now = new Date().toISOString();
  const user: ExtAdminUserRecord = {
    id: createId("staff"),
    tenantId,
    email: input.email.trim().toLowerCase(),
    passwordHash: await hashPassword(input.password),
    roleIds: input.roleIds,
    name: input.name.trim(),
    orderEmailsEnabled:
      typeof input.orderEmailsEnabled === "boolean"
        ? input.orderEmailsEnabled
        : input.roleIds.includes("role_owner"),
    createdAt: now,
    updatedAt: now
  };

  if (isMongoConfigured()) {
    await ensureDefaultExtAdminUsers(tenantId);
    const collection = await getUsersCollection();
    await collection.insertOne(user);
    return user;
  }

  const store = await readUsersStore();
  const current = store[tenantId] ?? [];
  store[tenantId] = [...current, user];
  await writeUsersStore(store);
  return user;
}

export async function deleteStoredExtAdminUser(tenantId: string, userId: string) {
  const ownerId = (await getSeedOwnerDefaults(tenantId)).id;

  if (userId === ownerId) {
    return false;
  }

  if (isMongoConfigured()) {
    const collection = await getUsersCollection();
    const result = await collection.deleteOne({ tenantId, id: userId });
    return result.deletedCount > 0;
  }

  const store = await readUsersStore();
  const current = store[tenantId] ?? [];
  store[tenantId] = current.filter((user) => user.id !== userId);
  await writeUsersStore(store);
  return current.length !== store[tenantId].length;
}

export async function resetStoredExtAdminUserPassword(
  tenantId: string,
  userId: string,
  password: string
) {
  const passwordHash = await hashPassword(password);
  const updatedAt = new Date().toISOString();

  if (isMongoConfigured()) {
    const collection = await getUsersCollection();
    await collection.updateOne(
      { tenantId, id: userId },
      { $set: { passwordHash, updatedAt } }
    );
    return;
  }

  const store = await readUsersStore();
  const current = store[tenantId] ?? [];
  store[tenantId] = current.map((user) =>
    user.id === userId ? { ...user, passwordHash, updatedAt } : user
  );
  await writeUsersStore(store);
}

export async function updateStoredExtAdminUserRole(
  tenantId: string,
  userId: string,
  roleId: string
) {
  const updatedAt = new Date().toISOString();

  if (isMongoConfigured()) {
    const collection = await getUsersCollection();
    await collection.updateOne(
      { tenantId, id: userId },
      { $set: { roleIds: [roleId], updatedAt } }
    );
    return;
  }

  const store = await readUsersStore();
  const current = store[tenantId] ?? [];
  store[tenantId] = current.map((user) =>
    user.id === userId ? { ...user, roleIds: [roleId], updatedAt } : user
  );
  await writeUsersStore(store);
}

export async function updateStoredExtAdminUserOrderEmails(
  tenantId: string,
  userId: string,
  orderEmailsEnabled: boolean
) {
  const updatedAt = new Date().toISOString();

  if (isMongoConfigured()) {
    const collection = await getUsersCollection();
    await collection.updateOne(
      { tenantId, id: userId },
      { $set: { orderEmailsEnabled, updatedAt } }
    );
    return;
  }

  const store = await readUsersStore();
  const current = store[tenantId] ?? [];
  store[tenantId] = current.map((user) =>
    user.id === userId ? { ...user, orderEmailsEnabled, updatedAt } : user
  );
  await writeUsersStore(store);
}

export async function validateExtAdminUser(email: string, password: string, tenantId: string) {
  const user = await validateExtAdminCredentials(email, password, tenantId);
  return Boolean(user);
}

export async function validateExtAdminCredentials(
  email: string,
  password: string,
  tenantId: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await getStoredExtAdminUsers(tenantId);
  const owner = users.find((entry) => entry.email === normalizedEmail);

  if (!owner) {
    return null;
  }

  const valid = await verifyPassword(password, owner.passwordHash);
  return valid ? owner : null;
}

export async function getStoredExtAdminUserById(tenantId: string, userId: string) {
  const users = await getStoredExtAdminUsers(tenantId);
  return users.find((entry) => entry.id === userId) ?? null;
}

export async function getStoredTenantOwnerUser(tenantId: string) {
  const users = await getStoredExtAdminUsers(tenantId);
  return users.find((entry) => entry.roleIds.includes("role_owner")) ?? null;
}
