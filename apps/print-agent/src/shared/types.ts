export type PrintPaperWidth = "58mm" | "80mm";
export type PrintJobStatus =
  | "pending"
  | "claimed"
  | "printing"
  | "printed"
  | "failed"
  | "cancelled";

export interface PrintJob {
  id: string;
  orderId: string;
  orderNumber: string;
  stationId?: string;
  copyType: string;
  triggerType: string;
  status: PrintJobStatus;
  attemptCount: number;
  copiesPrinted: number;
  lastError?: string;
  claimedAt?: string;
  printedAt?: string;
  createdAt: string;
  payload: {
    customerName: string;
    customerPhone: string;
    address?: string;
    fulfillmentType: string;
    paymentStatus: string;
    orderStatus: string;
    items: Array<{
      name: string;
      quantity: number;
      note?: string;
    }>;
    total: number;
    printCount: number;
  };
}

export interface AgentConfig {
  serverUrl: string;
  tenantId: string;
  stationName: string;
  registrationKey: string;
  stationToken: string;
  selectedPrinter: string;
  autoPrintEnabled: boolean;
  paperWidth: PrintPaperWidth;
  launchOnStartup: boolean;
  deviceId: string;
}

export interface AgentLogEntry {
  id: string;
  level: "info" | "error";
  message: string;
  createdAt: string;
  jobId?: string;
  orderNumber?: string;
}

export interface AgentJobSummary {
  id: string;
  orderId: string;
  orderNumber: string;
  status: PrintJobStatus;
  copyType: string;
  triggerType: string;
  createdAt: string;
  claimedAt?: string;
  printedAt?: string;
  lastError?: string;
  attemptCount: number;
  customerName: string;
  customerPhone: string;
  address?: string;
  fulfillmentType: string;
  paymentStatus: string;
  orderStatus: string;
  items: Array<{
    name: string;
    quantity: number;
    note?: string;
  }>;
  total: number;
  printCount: number;
}

export interface AgentState {
  appVersion: string;
  status: "idle" | "connecting" | "ready" | "printing" | "error";
  connectionState: "online" | "offline" | "unauthenticated";
  config: AgentConfig;
  stationId?: string;
  printers: string[];
  queue: AgentJobSummary[];
  history: AgentJobSummary[];
  logs: AgentLogEntry[];
  currentJobId?: string;
  lastActivity?: string;
  lastError?: string;
  lastHeartbeatAt?: string;
}

export function summarizeJob(job: PrintJob): AgentJobSummary {
  return {
    id: job.id,
    orderId: job.orderId,
    orderNumber: job.orderNumber,
    status: job.status,
    copyType: job.copyType,
    triggerType: job.triggerType,
    createdAt: job.createdAt,
    claimedAt: job.claimedAt,
    printedAt: job.printedAt,
    lastError: job.lastError,
    attemptCount: job.attemptCount,
    customerName: job.payload.customerName,
    customerPhone: job.payload.customerPhone,
    address: job.payload.address,
    fulfillmentType: job.payload.fulfillmentType,
    paymentStatus: job.payload.paymentStatus,
    orderStatus: job.payload.orderStatus,
    items: job.payload.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      note: item.note
    })),
    total: job.payload.total,
    printCount: job.payload.printCount
  };
}
