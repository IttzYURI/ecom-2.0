import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { PrintJob } from "@rcc/contracts";
import {
  createPrintJob,
  getPrintJobById,
  claimPrintJob,
  updatePrintJob
} from "../printing-store";

const TEST_DATA_DIR = path.join(process.cwd(), "data");
const PRINTING_FILE = path.join(TEST_DATA_DIR, "printing-content.json");
let backup: string | null = null;

async function backupAndClear() {
  try {
    backup = await fs.readFile(PRINTING_FILE, "utf8");
  } catch {
    backup = null;
  }
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });
  await fs.writeFile(PRINTING_FILE, "{}", "utf8");
}

async function restore() {
  if (backup !== null) {
    await fs.writeFile(PRINTING_FILE, backup, "utf8");
  } else {
    try {
      await fs.unlink(PRINTING_FILE);
    } catch {
      // already gone
    }
  }
}

const TENANT_A = "tenant_isolation_a";
const TENANT_B = "tenant_isolation_b";
const STATION_A1 = "station_a1";
const STATION_B1 = "station_b1";

function makeJob(tenantId: string, jobId: string, status: PrintJob["status"] = "pending"): PrintJob {
  const now = new Date().toISOString();
  return {
    id: jobId,
    tenantId,
    orderId: `order_${jobId}`,
    orderNumber: `ORD-${jobId}`,
    jobKey: `key_${jobId}`,
    copyType: "kitchen",
    triggerType: "auto",
    status,
    attemptCount: 0,
    copiesPrinted: 0,
    createdAt: now,
    updatedAt: now,
    payload: {
      restaurantName: "Test",
      tenantId,
      orderId: `order_${jobId}`,
      orderNumber: `ORD-${jobId}`,
      createdAt: now,
      fulfillmentType: "collection",
      paymentMethod: "cash",
      paymentStatus: "pending",
      orderStatus: "placed",
      customerName: "Test",
      customerPhone: "",
      customerEmail: "test@test.com",
      address: "",
      items: [],
      subtotal: 10,
      deliveryFee: 0,
      discount: 0,
      total: 10,
      printCount: 1
    }
  };
}

describe("printing-store tenant isolation", () => {
  beforeEach(backupAndClear);
  afterEach(restore);

  it("tenant A can read its own job", async () => {
    const job = await createPrintJob(TENANT_A, {
      orderId: "order_a1",
      orderNumber: "ORD-A1",
      jobKey: "key_a1",
      copyType: "kitchen",
      triggerType: "auto",
      status: "pending",
      attemptCount: 0,
      copiesPrinted: 0,
      payload: makeJob(TENANT_A, "j_a1").payload
    });

    const found = await getPrintJobById(TENANT_A, job!.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(job!.id);
  });

  it("tenant A cannot read tenant B's job", async () => {
    const job = await createPrintJob(TENANT_B, {
      orderId: "order_b1",
      orderNumber: "ORD-B1",
      jobKey: "key_b1",
      copyType: "kitchen",
      triggerType: "auto",
      status: "pending",
      attemptCount: 0,
      copiesPrinted: 0,
      payload: makeJob(TENANT_B, "j_b1").payload
    });

    const found = await getPrintJobById(TENANT_A, job!.id);
    expect(found).toBeNull();
  });

  it("tenant A cannot claim tenant B's job", async () => {
    const job = await createPrintJob(TENANT_B, {
      orderId: "order_b2",
      orderNumber: "ORD-B2",
      jobKey: "key_b2",
      copyType: "kitchen",
      triggerType: "auto",
      status: "pending",
      attemptCount: 0,
      copiesPrinted: 0,
      payload: makeJob(TENANT_B, "j_b2").payload
    });

    const claimed = await claimPrintJob(TENANT_A, job!.id, STATION_A1);
    expect(claimed).toBeNull();
  });

  it("claim sets stationId and status to claimed", async () => {
    const job = await createPrintJob(TENANT_A, {
      orderId: "order_a2",
      orderNumber: "ORD-A2",
      jobKey: "key_a2",
      copyType: "kitchen",
      triggerType: "auto",
      status: "pending",
      attemptCount: 0,
      copiesPrinted: 0,
      payload: makeJob(TENANT_A, "j_a2").payload
    });

    const claimed = await claimPrintJob(TENANT_A, job!.id, STATION_A1);
    expect(claimed).not.toBeNull();
    expect(claimed!.status).toBe("claimed");
    expect(claimed!.stationId).toBe(STATION_A1);
  });

  it("re-claiming same job by same station is idempotent", async () => {
    const job = await createPrintJob(TENANT_A, {
      orderId: "order_a3",
      orderNumber: "ORD-A3",
      jobKey: "key_a3",
      copyType: "kitchen",
      triggerType: "auto",
      status: "pending",
      attemptCount: 0,
      copiesPrinted: 0,
      payload: makeJob(TENANT_A, "j_a3").payload
    });

    const first = await claimPrintJob(TENANT_A, job!.id, STATION_A1);
    const second = await claimPrintJob(TENANT_A, job!.id, STATION_A1);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.id).toBe(second!.id);
  });

  it("different station cannot claim a recently claimed job", async () => {
    const job = await createPrintJob(TENANT_A, {
      orderId: "order_a4",
      orderNumber: "ORD-A4",
      jobKey: "key_a4",
      copyType: "kitchen",
      triggerType: "auto",
      status: "pending",
      attemptCount: 0,
      copiesPrinted: 0,
      payload: makeJob(TENANT_A, "j_a4").payload
    });

    await claimPrintJob(TENANT_A, job!.id, STATION_A1);
    const stealAttempt = await claimPrintJob(TENANT_A, job!.id, "station_other");
    expect(stealAttempt).toBeNull();
  });

  it("failed job with expired nextRetryAt is claimable", async () => {
    const job = await createPrintJob(TENANT_A, {
      orderId: "order_a5",
      orderNumber: "ORD-A5",
      jobKey: "key_a5",
      copyType: "kitchen",
      triggerType: "auto",
      status: "failed",
      attemptCount: 1,
      copiesPrinted: 0,
      payload: makeJob(TENANT_A, "j_a5").payload
    });

    await updatePrintJob(TENANT_A, job!.id, (j) => ({
      ...j,
      nextRetryAt: new Date(Date.now() - 60000).toISOString()
    }));

    const reclaimed = await claimPrintJob(TENANT_A, job!.id, STATION_A1);
    expect(reclaimed).not.toBeNull();
    expect(reclaimed!.status).toBe("claimed");
    expect(reclaimed!.attemptCount).toBe(2);
  });

  it("tenant A cannot update tenant B's job", async () => {
    const job = await createPrintJob(TENANT_B, {
      orderId: "order_b3",
      orderNumber: "ORD-B3",
      jobKey: "key_b3",
      copyType: "kitchen",
      triggerType: "auto",
      status: "pending",
      attemptCount: 0,
      copiesPrinted: 0,
      payload: makeJob(TENANT_B, "j_b3").payload
    });

    const updated = await updatePrintJob(TENANT_A, job!.id, (j) => ({
      ...j,
      status: "printing"
    }));

    expect(updated).toBeNull();
  });
});
