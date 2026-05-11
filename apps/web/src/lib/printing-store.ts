import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { OrderPrintState, PrintJob, PrintStation } from "@rcc/contracts";

import { getMongoDb, isMongoConfigured } from "./mongo";
import type { PrintingTenantSnapshot } from "./printing-types";

const printingFilePath = path.join(process.cwd(), "data", "printing-content.json");

type JsonPrintingStore = Record<string, PrintingTenantSnapshot>;

let printingIndexesPromise: Promise<void> | null = null;

function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

function createEmptySnapshot(): PrintingTenantSnapshot {
  return {
    stations: [],
    jobs: [],
    orderPrintStates: []
  };
}

function compareIsoDate(left?: string, right?: string) {
  return new Date(left ?? 0).getTime() - new Date(right ?? 0).getTime();
}

function sortJobs(jobs: PrintJob[]) {
  return [...jobs].sort((left, right) => {
    const retryDiff = compareIsoDate(left.nextRetryAt, right.nextRetryAt);

    if (retryDiff !== 0) {
      return retryDiff;
    }

    return compareIsoDate(left.createdAt, right.createdAt);
  });
}

async function ensurePrintingStoreFile() {
  try {
    await fs.access(printingFilePath);
  } catch {
    await fs.mkdir(path.dirname(printingFilePath), { recursive: true });
    await fs.writeFile(printingFilePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readJsonStore(): Promise<JsonPrintingStore> {
  await ensurePrintingStoreFile();
  const raw = await fs.readFile(printingFilePath, "utf8");
  return JSON.parse(raw) as JsonPrintingStore;
}

async function writeJsonStore(store: JsonPrintingStore) {
  await fs.writeFile(printingFilePath, JSON.stringify(store, null, 2), "utf8");
}

async function readJsonSnapshot(tenantId: string) {
  const store = await readJsonStore();
  return store[tenantId] ?? createEmptySnapshot();
}

async function writeJsonSnapshot(tenantId: string, snapshot: PrintingTenantSnapshot) {
  const store = await readJsonStore();
  store[tenantId] = {
    stations: snapshot.stations,
    jobs: sortJobs(snapshot.jobs),
    orderPrintStates: snapshot.orderPrintStates
  };
  await writeJsonStore(store);
}

async function withJsonSnapshot<T>(
  tenantId: string,
  updater: (snapshot: PrintingTenantSnapshot) => T | Promise<T>
) {
  const snapshot = await readJsonSnapshot(tenantId);
  const result = await updater({
    stations: [...snapshot.stations],
    jobs: [...snapshot.jobs],
    orderPrintStates: [...snapshot.orderPrintStates]
  });

  if (
    typeof result === "object" &&
    result &&
    "stations" in result &&
    "jobs" in result &&
    "orderPrintStates" in result
  ) {
    await writeJsonSnapshot(tenantId, result as PrintingTenantSnapshot);
  }

  return result;
}

async function ensureMongoIndexes() {
  if (!isMongoConfigured()) {
    return;
  }

  if (!printingIndexesPromise) {
    printingIndexesPromise = (async () => {
      const db = await getMongoDb();
      await Promise.all([
        db.collection<PrintStation>("printing_stations").createIndex({ id: 1 }, { unique: true }),
        db.collection<PrintStation>("printing_stations").createIndex(
          { tokenHash: 1 },
          { unique: true }
        ),
        db.collection<PrintStation>("printing_stations").createIndex({ tenantId: 1, updatedAt: -1 }),
        db.collection<PrintJob>("printing_jobs").createIndex({ id: 1 }, { unique: true }),
        db.collection<PrintJob>("printing_jobs").createIndex(
          { tenantId: 1, jobKey: 1 },
          { unique: true }
        ),
        db.collection<PrintJob>("printing_jobs").createIndex({ tenantId: 1, status: 1, createdAt: 1 }),
        db.collection<OrderPrintState>("printing_order_states").createIndex(
          { tenantId: 1, orderId: 1 },
          { unique: true }
        )
      ]);
    })();
  }

  await printingIndexesPromise;
}

export async function getPrintingSnapshot(tenantId: string): Promise<PrintingTenantSnapshot> {
  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const db = await getMongoDb();
    const [stations, jobs, orderPrintStates] = await Promise.all([
      db.collection<PrintStation>("printing_stations").find({ tenantId }).sort({ updatedAt: -1 }).toArray(),
      db.collection<PrintJob>("printing_jobs").find({ tenantId }).sort({ createdAt: 1 }).toArray(),
      db.collection<OrderPrintState>("printing_order_states").find({ tenantId }).toArray()
    ]);

    return {
      stations,
      jobs,
      orderPrintStates
    };
  }

  return readJsonSnapshot(tenantId);
}

export async function listPrintStations(tenantId: string) {
  return (await getPrintingSnapshot(tenantId)).stations;
}

export async function getPrintStationById(tenantId: string, stationId: string) {
  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const db = await getMongoDb();
    return db.collection<PrintStation>("printing_stations").findOne({ tenantId, id: stationId });
  }

  const snapshot = await readJsonSnapshot(tenantId);
  return snapshot.stations.find((station) => station.id === stationId) ?? null;
}

export async function getPrintStationByTokenHash(tokenHash: string) {
  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const db = await getMongoDb();
    return db.collection<PrintStation>("printing_stations").findOne({ tokenHash });
  }

  const store = await readJsonStore();

  for (const tenantId of Object.keys(store)) {
    const match = store[tenantId]?.stations.find((station) => station.tokenHash === tokenHash);

    if (match) {
      return match;
    }
  }

  return null;
}

export async function createPrintStation(
  tenantId: string,
  input: Omit<PrintStation, "id" | "tenantId" | "createdAt" | "updatedAt">
) {
  const now = new Date().toISOString();
  const station: PrintStation = {
    id: createId("pstn"),
    tenantId,
    createdAt: now,
    updatedAt: now,
    ...input
  };

  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const db = await getMongoDb();
    await db.collection<PrintStation>("printing_stations").insertOne(station);
    return station;
  }

  await withJsonSnapshot(tenantId, (snapshot) => ({
    ...snapshot,
    stations: [station, ...snapshot.stations]
  }));

  return station;
}

export async function updatePrintStation(
  tenantId: string,
  stationId: string,
  updater: (station: PrintStation) => PrintStation
) {
  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const existing = await getPrintStationById(tenantId, stationId);

    if (!existing) {
      return null;
    }

    const nextStation = {
      ...updater(existing),
      tenantId,
      id: stationId,
      updatedAt: new Date().toISOString()
    };
    const db = await getMongoDb();
    await db.collection<PrintStation>("printing_stations").replaceOne(
      { tenantId, id: stationId },
      nextStation
    );
    return nextStation;
  }

  let updated: PrintStation | null = null;
  await withJsonSnapshot(tenantId, (snapshot) => ({
    ...snapshot,
    stations: snapshot.stations.map((station) => {
      if (station.id !== stationId) {
        return station;
      }

      updated = {
        ...updater(station),
        tenantId,
        id: stationId,
        updatedAt: new Date().toISOString()
      };

      return updated;
    })
  }));

  return updated;
}

export async function listPrintJobs(tenantId: string) {
  return sortJobs((await getPrintingSnapshot(tenantId)).jobs);
}

const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

export async function listAvailablePrintJobs(tenantId: string, stationId: string, limit = 5) {
  const now = new Date();
  const nowIso = now.toISOString();
  const jobs = await listPrintJobs(tenantId);

  return jobs
    .filter((job) => {
      if (job.stationId === stationId && ["claimed", "printing"].includes(job.status)) {
        return true;
      }

      if (job.status === "pending") {
        return true;
      }

      if (job.status === "claimed" || job.status === "printing") {
        const claimedAt = job.claimedAt ? new Date(job.claimedAt).getTime() : 0;
        return now.getTime() - claimedAt > CLAIM_TIMEOUT_MS;
      }

      if (job.status !== "failed") {
        return false;
      }

      return !job.nextRetryAt || job.nextRetryAt <= nowIso;
    })
    .slice(0, limit);
}

export async function getPrintJobById(tenantId: string, jobId: string) {
  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const db = await getMongoDb();
    return db.collection<PrintJob>("printing_jobs").findOne({ tenantId, id: jobId });
  }

  const snapshot = await readJsonSnapshot(tenantId);
  return snapshot.jobs.find((job) => job.id === jobId) ?? null;
}

export async function getPrintJobsByOrderId(tenantId: string, orderId: string) {
  const jobs = await listPrintJobs(tenantId);
  return jobs.filter((job) => job.orderId === orderId);
}

export async function getPrintJobByKey(tenantId: string, jobKey: string) {
  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const db = await getMongoDb();
    return db.collection<PrintJob>("printing_jobs").findOne({ tenantId, jobKey });
  }

  const snapshot = await readJsonSnapshot(tenantId);
  return snapshot.jobs.find((job) => job.jobKey === jobKey) ?? null;
}

export async function createPrintJob(
  tenantId: string,
  input: Omit<PrintJob, "id" | "tenantId" | "createdAt" | "updatedAt">
) {
  const now = new Date().toISOString();
  const job: PrintJob = {
    id: createId("pjob"),
    tenantId,
    createdAt: now,
    updatedAt: now,
    ...input
  };

  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const db = await getMongoDb();

    try {
      await db.collection<PrintJob>("printing_jobs").insertOne(job);
      return job;
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        Number((error as { code?: number }).code) === 11000
      ) {
        return getPrintJobByKey(tenantId, job.jobKey);
      }

      throw error;
    }
  }

  const existing = await getPrintJobByKey(tenantId, job.jobKey);

  if (existing) {
    return existing;
  }

  await withJsonSnapshot(tenantId, (snapshot) => ({
    ...snapshot,
    jobs: [...snapshot.jobs, job]
  }));

  return job;
}

export async function updatePrintJob(
  tenantId: string,
  jobId: string,
  updater: (job: PrintJob) => PrintJob
) {
  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const existing = await getPrintJobById(tenantId, jobId);

    if (!existing) {
      return null;
    }

    const nextJob = {
      ...updater(existing),
      id: jobId,
      tenantId,
      updatedAt: new Date().toISOString()
    };
    const db = await getMongoDb();
    await db.collection<PrintJob>("printing_jobs").replaceOne({ tenantId, id: jobId }, nextJob);
    return nextJob;
  }

  let updated: PrintJob | null = null;
  await withJsonSnapshot(tenantId, (snapshot) => ({
    ...snapshot,
    jobs: snapshot.jobs.map((job) => {
      if (job.id !== jobId) {
        return job;
      }

      updated = {
        ...updater(job),
        id: jobId,
        tenantId,
        updatedAt: new Date().toISOString()
      };

      return updated;
    })
  }));

  return updated;
}

function isClaimableStatus(job: PrintJob, now: Date): boolean {
  if (job.status === "pending") {
    return true;
  }

  if (job.status === "failed" && (!job.nextRetryAt || job.nextRetryAt <= now.toISOString())) {
    return true;
  }

  if (job.status === "claimed" || job.status === "printing") {
    const claimedAt = job.claimedAt ? new Date(job.claimedAt).getTime() : 0;
    return now.getTime() - claimedAt > CLAIM_TIMEOUT_MS;
  }

  return false;
}

export async function claimPrintJob(tenantId: string, jobId: string, stationId: string) {
  const now = new Date();
  const nowIso = now.toISOString();

  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const db = await getMongoDb();
    const collection = db.collection<PrintJob>("printing_jobs");
    const current = await collection.findOne({ tenantId, id: jobId });

    if (!current) {
      return null;
    }

    if (current.stationId === stationId && ["claimed", "printing", "printed"].includes(current.status)) {
      return current;
    }

    if (!isClaimableStatus(current, now)) {
      return null;
    }

    const nextJob = {
      ...current,
      stationId,
      status: "claimed" as const,
      claimedAt: nowIso,
      attemptCount: current.attemptCount + 1,
      updatedAt: nowIso
    };

    const result = await collection.findOneAndReplace(
      {
        tenantId,
        id: jobId,
        status: current.status,
        updatedAt: current.updatedAt
      },
      nextJob,
      { returnDocument: "after" }
    );

    return result ?? null;
  }

  let claimed: PrintJob | null = null;
  await withJsonSnapshot(tenantId, (snapshot) => ({
    ...snapshot,
    jobs: snapshot.jobs.map((job) => {
      if (job.id !== jobId) {
        return job;
      }

      if (job.stationId === stationId && ["claimed", "printing", "printed"].includes(job.status)) {
        claimed = job;
        return job;
      }

      if (!isClaimableStatus(job, now)) {
        return job;
      }

      claimed = {
        ...job,
        stationId,
        status: "claimed",
        claimedAt: nowIso,
        attemptCount: job.attemptCount + 1,
        updatedAt: nowIso
      };

      return claimed;
    })
  }));

  return claimed;
}

export async function listOrderPrintStates(tenantId: string) {
  return (await getPrintingSnapshot(tenantId)).orderPrintStates;
}

export async function getOrderPrintState(tenantId: string, orderId: string) {
  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const db = await getMongoDb();
    return db.collection<OrderPrintState>("printing_order_states").findOne({ tenantId, orderId });
  }

  const snapshot = await readJsonSnapshot(tenantId);
  return snapshot.orderPrintStates.find((state) => state.orderId === orderId) ?? null;
}

export async function saveOrderPrintState(state: OrderPrintState) {
  if (isMongoConfigured()) {
    await ensureMongoIndexes();
    const db = await getMongoDb();
    await db.collection<OrderPrintState>("printing_order_states").updateOne(
      { tenantId: state.tenantId, orderId: state.orderId },
      { $set: state },
      { upsert: true }
    );
    return state;
  }

  await withJsonSnapshot(state.tenantId, (snapshot) => {
    const nextStates = snapshot.orderPrintStates.some((entry) => entry.orderId === state.orderId)
      ? snapshot.orderPrintStates.map((entry) => (entry.orderId === state.orderId ? state : entry))
      : [state, ...snapshot.orderPrintStates];

    return {
      ...snapshot,
      orderPrintStates: nextStates
    };
  });

  return state;
}
