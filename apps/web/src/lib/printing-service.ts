import { randomUUID } from "node:crypto";

import type {
  Order,
  OrderPrintState,
  PaymentMethod,
  PrintCopyType,
  PrintJob,
  PrintJobFailedRequest,
  PrintJobPrintedRequest,
  PrintStation,
  ReprintOrderRequest
} from "@rcc/contracts";

import { getStoredOrderById } from "./operations-store";
import {
  claimPrintJob,
  createPrintJob,
  getOrderPrintState,
  getPrintJobById,
  getPrintJobByKey,
  getPrintJobsByOrderId,
  listAvailablePrintJobs,
  listOrderPrintStates,
  saveOrderPrintState,
  updatePrintJob,
  updatePrintStation
} from "./printing-store";
import { getStoredTenantSettings } from "./settings-store";

function addSeconds(isoDate: string, seconds: number) {
  return new Date(new Date(isoDate).getTime() + seconds * 1000).toISOString();
}

function inferPaymentMethod(order: Order): PaymentMethod {
  if (order.paymentMethod) {
    return order.paymentMethod;
  }

  if (order.paymentStatus === "paid" || order.orderStatus === "pending_payment") {
    return "stripe";
  }

  return "cash";
}

function createDefaultOrderPrintState(tenantId: string, orderId: string): OrderPrintState {
  return {
    orderId,
    tenantId,
    hasKitchenPrint: false,
    printCount: 0,
    reprintCount: 0
  };
}

function getAutoJobKey(orderId: string, copyType: PrintCopyType = "kitchen") {
  return `auto:${orderId}:${copyType}`;
}

function getManualJobKey(orderId: string, copyType: PrintCopyType) {
  return `manual:${orderId}:${copyType}:${randomUUID()}`;
}

function isOrderOperationallyCancelled(order: Order) {
  return ["cancelled", "refunded"].includes(order.orderStatus) || ["failed", "refunded"].includes(order.paymentStatus);
}

export function isOrderEligibleForAutoPrint(order: Order | null, state?: OrderPrintState | null) {
  if (!order) {
    return false;
  }

  if (isOrderOperationallyCancelled(order) || (state?.hasKitchenPrint ?? false)) {
    return false;
  }

  const paymentMethod = inferPaymentMethod(order);

  if (paymentMethod === "cash") {
    return order.orderStatus === "placed";
  }

  return order.orderStatus === "placed" && order.paymentStatus === "paid";
}

async function buildPrintPayload(tenantId: string, order: Order, printCount: number) {
  const tenant = await getStoredTenantSettings(tenantId);

  return {
    restaurantName: tenant.name,
    tenantId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    fulfillmentType: order.fulfillmentType,
    paymentMethod: inferPaymentMethod(order),
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    address: order.address,
    items: order.items,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount,
    total: order.total,
    printCount
  } satisfies PrintJob["payload"];
}

async function touchStationActivity(
  stationId: string | undefined,
  tenantId: string,
  message: string
) {
  if (!stationId) {
    return;
  }

  await updatePrintStation(tenantId, stationId, (station) => ({
    ...station,
    lastSeenAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    lastActivityMessage: message
  }));
}

async function savePrintStateFromJob(job: PrintJob, input: { status: "printed" | "failed"; error?: string }) {
  const existingState =
    (await getOrderPrintState(job.tenantId, job.orderId)) ??
    createDefaultOrderPrintState(job.tenantId, job.orderId);

  if (input.status === "printed") {
    const now = new Date().toISOString();
    const nextState: OrderPrintState = {
      ...existingState,
      hasKitchenPrint: existingState.hasKitchenPrint || job.copyType === "kitchen",
      firstPrintedAt: existingState.firstPrintedAt ?? now,
      lastPrintedAt: now,
      printCount: existingState.printCount + 1,
      reprintCount:
        existingState.reprintCount + (job.triggerType === "manual_reprint" ? 1 : 0),
      lastPrintJobId: job.id,
      lastStationId: job.stationId,
      lastPrintStatus: "printed",
      lastPrintError: undefined
    };

    return saveOrderPrintState(nextState);
  }

  const nextState: OrderPrintState = {
    ...existingState,
    lastPrintJobId: job.id,
    lastStationId: job.stationId,
    lastPrintStatus: "failed",
    lastPrintError: input.error
  };

  return saveOrderPrintState(nextState);
}

export async function getOrdersWithPrintState(tenantId: string, orders: Order[]) {
  const states = await listOrderPrintStates(tenantId);
  const byOrderId = new Map(states.map((state) => [state.orderId, state]));

  return orders.map((order) => ({
    ...order,
    printState: byOrderId.get(order.id)
  }));
}

export async function ensureAutoPrintJobForOrder(tenantId: string, orderId: string) {
  const order = await getStoredOrderById(tenantId, orderId);
  const state = await getOrderPrintState(tenantId, orderId);

  if (!order || !isOrderEligibleForAutoPrint(order, state)) {
    return {
      created: false,
      job: null
    };
  }

  const existing = await getPrintJobByKey(tenantId, getAutoJobKey(orderId));

  if (existing) {
    return {
      created: false,
      job: existing
    };
  }

  const printCount = (state?.printCount ?? 0) + 1;
  const payload = await buildPrintPayload(tenantId, order, printCount);
  const job = await createPrintJob(tenantId, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    jobKey: getAutoJobKey(order.id),
    copyType: "kitchen",
    triggerType: "auto",
    status: "pending",
    attemptCount: 0,
    copiesPrinted: 0,
    payload
  });

  return {
    created: Boolean(job && job.jobKey === getAutoJobKey(order.id)),
    job
  };
}

export async function createManualReprintJob(
  tenantId: string,
  orderId: string,
  input: ReprintOrderRequest,
  createdBy?: string
) {
  const order = await getStoredOrderById(tenantId, orderId);

  if (!order) {
    return null;
  }

  const state = await getOrderPrintState(tenantId, orderId);
  const copyType = input.copyType ?? "kitchen";
  const payload = await buildPrintPayload(tenantId, order, (state?.printCount ?? 0) + 1);

  return createPrintJob(tenantId, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    jobKey: getManualJobKey(order.id, copyType),
    copyType,
    triggerType: "manual_reprint",
    status: "pending",
    attemptCount: 0,
    copiesPrinted: 0,
    createdBy,
    payload
  });
}

export async function getNextJobsForStation(station: PrintStation) {
  return listAvailablePrintJobs(station.tenantId, station.id, 10);
}

export async function acknowledgePrintJob(tenantId: string, jobId: string, stationId: string) {
  const claimed = await claimPrintJob(tenantId, jobId, stationId);

  if (claimed) {
    await touchStationActivity(stationId, tenantId, `Claimed ${claimed.orderNumber}`);
  }

  return claimed;
}

export async function markPrintJobPrinting(tenantId: string, jobId: string, stationId: string) {
  const current = await getPrintJobById(tenantId, jobId);

  if (!current || current.stationId !== stationId) {
    return null;
  }

  if (current.status === "printing") {
    return current;
  }

  if (!["claimed", "printing"].includes(current.status)) {
    return null;
  }

  const nextJob = await updatePrintJob(tenantId, jobId, (job) => ({
    ...job,
    status: "printing",
    startedPrintingAt: job.startedPrintingAt ?? new Date().toISOString()
  }));

  if (nextJob) {
    await touchStationActivity(stationId, tenantId, `Printing ${nextJob.orderNumber}`);
  }

  return nextJob;
}

export async function markPrintJobPrinted(
  tenantId: string,
  jobId: string,
  stationId: string,
  input: PrintJobPrintedRequest
) {
  const current = await getPrintJobById(tenantId, jobId);

  if (!current || current.stationId !== stationId) {
    return null;
  }

  if (current.status === "printed") {
    return current;
  }

  if (!["claimed", "printing"].includes(current.status)) {
    return null;
  }

  const now = new Date().toISOString();
  const nextJob = await updatePrintJob(tenantId, jobId, (job) => ({
    ...job,
    status: "printed",
    printedAt: now,
    printerName: input.printerName ?? job.printerName,
    copiesPrinted: Math.max(input.copiesPrinted ?? 1, 1),
    lastError: undefined,
    nextRetryAt: undefined
  }));

  if (!nextJob) {
    return null;
  }

  await savePrintStateFromJob(nextJob, { status: "printed" });
  await touchStationActivity(stationId, tenantId, `Printed ${nextJob.orderNumber}`);

  return nextJob;
}

export async function markPrintJobFailed(
  tenantId: string,
  jobId: string,
  stationId: string,
  input: PrintJobFailedRequest
) {
  const current = await getPrintJobById(tenantId, jobId);

  if (!current || current.stationId !== stationId) {
    return null;
  }

  if (current.status === "printed") {
    return current;
  }

  const now = new Date().toISOString();
  const retryDelaySeconds = Math.min(Math.max(current.attemptCount, 1) * 30, 300);
  const nextJob = await updatePrintJob(tenantId, jobId, (job) => ({
    ...job,
    status: "failed",
    lastError: input.error,
    lastFailedAt: now,
    nextRetryAt: addSeconds(now, retryDelaySeconds)
  }));

  if (!nextJob) {
    return null;
  }

  await savePrintStateFromJob(nextJob, { status: "failed", error: input.error });
  await touchStationActivity(stationId, tenantId, `Failed ${nextJob.orderNumber}: ${input.error}`);

  return nextJob;
}

export async function cancelPrintJob(tenantId: string, jobId: string) {
  const current = await getPrintJobById(tenantId, jobId);

  if (!current || !["pending", "failed"].includes(current.status)) {
    return null;
  }

  const nextJob = await updatePrintJob(tenantId, jobId, (job) => ({
    ...job,
    status: "cancelled" as const,
    nextRetryAt: undefined,
    lastError: job.lastError ?? "Cancelled by operator."
  }));

  return nextJob;
}

export function getStationConnectionStatus(station: Pick<PrintStation, "lastSeenAt">) {
  if (!station.lastSeenAt) {
    return "offline";
  }

  const elapsed = Date.now() - new Date(station.lastSeenAt).getTime();

  if (elapsed < 60_000) {
    return "online";
  }

  if (elapsed < 5 * 60_000) {
    return "stale";
  }

  return "offline";
}

export async function getOrderPrintingDetails(tenantId: string, orderId: string) {
  const [state, jobs] = await Promise.all([
    getOrderPrintState(tenantId, orderId),
    getPrintJobsByOrderId(tenantId, orderId)
  ]);

  return {
    state,
    jobs
  };
}
