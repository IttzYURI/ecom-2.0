import { promises as fs } from "node:fs";
import path from "node:path";

import { getMongoDb, isMongoConfigured } from "./mongo";
import { getTenantDocument, saveTenantDocument } from "./tenant-document-store";

export type StoredPayment = {
  id: string;
  tenantId: string;
  orderId: string;
  provider: "stripe";
  status: "pending" | "paid" | "failed" | "refunded";
  amount: number;
  currency: string;
  externalId: string;
  clientSecret: string;
  createdAt: string;
  updatedAt: string;
};

const paymentsFilePath = path.join(process.cwd(), "data", "payments-content.json");

type PaymentStore = Record<string, StoredPayment[]>;

interface StoredPaymentDocument {
  tenantId: string;
  payload: StoredPayment[];
  updatedAt: string;
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensurePaymentsStoreFile() {
  try {
    await fs.access(paymentsFilePath);
  } catch {
    await fs.mkdir(path.dirname(paymentsFilePath), { recursive: true });
    await fs.writeFile(paymentsFilePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readPaymentsStore(): Promise<PaymentStore> {
  await ensurePaymentsStoreFile();
  const raw = await fs.readFile(paymentsFilePath, "utf8");
  return JSON.parse(raw) as PaymentStore;
}

async function writePaymentsStore(store: PaymentStore) {
  await fs.writeFile(paymentsFilePath, JSON.stringify(store, null, 2), "utf8");
}

function findPaymentByExternalId(payments: StoredPayment[], externalId: string) {
  return payments.find((payment) => payment.externalId === externalId) ?? null;
}

export async function getStoredPayments(tenantId: string) {
  const mongoPayments = await getTenantDocument<StoredPayment[]>("payments_content", tenantId);

  if (mongoPayments) {
    return mongoPayments;
  }

  const store = await readPaymentsStore();
  return store[tenantId] ?? [];
}

async function persistPayments(tenantId: string, payments: StoredPayment[]) {
  const savedToMongo = await saveTenantDocument("payments_content", tenantId, payments);

  if (savedToMongo) {
    return;
  }

  const store = await readPaymentsStore();
  store[tenantId] = payments;
  await writePaymentsStore(store);
}

export async function createStoredPayment(
  tenantId: string,
  input: Omit<StoredPayment, "id" | "tenantId" | "createdAt" | "updatedAt">
) {
  const now = new Date().toISOString();
  const payments = await getStoredPayments(tenantId);
  const payment: StoredPayment = {
    id: createId("pay"),
    tenantId,
    createdAt: now,
    updatedAt: now,
    ...input
  };

  await persistPayments(tenantId, [payment, ...payments]);
  return payment;
}

export async function getStoredPaymentByExternalId(tenantId: string, externalId: string) {
  const payments = await getStoredPayments(tenantId);
  return findPaymentByExternalId(payments, externalId);
}

export async function findStoredPaymentByExternalId(
  externalId: string,
  tenantIdHint?: string
) {
  if (tenantIdHint) {
    const hintedPayment = await getStoredPaymentByExternalId(tenantIdHint, externalId);

    if (hintedPayment) {
      return hintedPayment;
    }
  }

  if (isMongoConfigured()) {
    const db = await getMongoDb();
    const collection = db.collection<StoredPaymentDocument>("payments_content");
    const document = await collection.findOne(
      tenantIdHint
        ? {
            tenantId: { $ne: tenantIdHint },
            "payload.externalId": externalId
          }
        : {
            "payload.externalId": externalId
          }
    );

    return document ? findPaymentByExternalId(document.payload, externalId) : null;
  }

  const store = await readPaymentsStore();

  for (const [tenantId, payments] of Object.entries(store)) {
    if (tenantId === tenantIdHint) {
      continue;
    }

    const payment = findPaymentByExternalId(payments, externalId);

    if (payment) {
      return payment;
    }
  }

  return null;
}

export async function updateStoredPaymentStatus(
  tenantId: string,
  paymentId: string,
  status: StoredPayment["status"]
) {
  const payments = await getStoredPayments(tenantId);
  const updatedAt = new Date().toISOString();
  await persistPayments(
    tenantId,
    payments.map((payment) =>
      payment.id === paymentId ? { ...payment, status, updatedAt } : payment
    )
  );
}
