import type {
  Order,
  OrderPrintState,
  PrintJob,
  PrintStation
} from "@rcc/contracts";

export type { OrderPrintState, PrintJob, PrintJobPayload, PrintStation } from "@rcc/contracts";

export interface PrintingTenantSnapshot {
  stations: PrintStation[];
  jobs: PrintJob[];
  orderPrintStates: OrderPrintState[];
}

export interface PrintJobWithOrder extends PrintJob {
  order: Order;
}
