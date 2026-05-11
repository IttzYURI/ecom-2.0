import type { AgentConfig } from "../shared/types";
import type { PrintJob, PrintPaperWidth } from "../shared/types";

interface RegisterPrintStationRequest {
  tenantId: string;
  name: string;
  deviceId?: string;
  printerName?: string;
  paperWidth?: PrintPaperWidth;
  autoPrintEnabled?: boolean;
}

interface RegisterPrintStationResponse {
  stationId: string;
  token: string;
  name: string;
}

interface PrintStationHeartbeatRequest {
  printerName?: string;
  paperWidth?: PrintPaperWidth;
  autoPrintEnabled?: boolean;
  lastActivityMessage?: string;
}

interface PrintJobPrintedRequest {
  printerName?: string;
  copiesPrinted?: number;
}

interface PrintJobFailedRequest {
  error: string;
}

type GetConfig = () => AgentConfig;

export class PrintServerClient {
  constructor(private readonly getConfig: GetConfig) {}

  async registerStation() {
    const config = this.getConfig();
    const response = await this.request<RegisterPrintStationResponse>("/api/v1/printing/stations/register", {
      method: "POST",
      headers: {
        "x-printing-registration-key": config.registrationKey
      },
      body: {
        tenantId: config.tenantId,
        name: config.stationName,
        deviceId: config.deviceId,
        printerName: config.selectedPrinter || undefined,
        paperWidth: config.paperWidth,
        autoPrintEnabled: config.autoPrintEnabled
      } satisfies RegisterPrintStationRequest
    });

    return response;
  }

  async heartbeat(lastActivityMessage?: string) {
    const config = this.getConfig();
    return this.request<{ stationId: string; serverTime: string }>("/api/v1/printing/stations/heartbeat", {
      method: "POST",
      auth: true,
      body: {
        printerName: config.selectedPrinter || undefined,
        paperWidth: config.paperWidth,
        autoPrintEnabled: config.autoPrintEnabled,
        lastActivityMessage
      } satisfies PrintStationHeartbeatRequest
    });
  }

  async getNextJobs() {
    return this.request<PrintJob[]>("/api/v1/printing/jobs/next", {
      method: "GET",
      auth: true
    });
  }

  async acknowledgeJob(jobId: string, stationId?: string) {
    return this.request<{ jobId: string; status: string }>(`/api/v1/printing/jobs/${jobId}/ack`, {
      method: "POST",
      auth: true,
      body: {
        stationId
      }
    });
  }

  async markPrinting(jobId: string) {
    return this.request<{ jobId: string; status: string }>(`/api/v1/printing/jobs/${jobId}/printing`, {
      method: "POST",
      auth: true,
      body: {}
    });
  }

  async markPrinted(jobId: string, input: PrintJobPrintedRequest) {
    return this.request<{ jobId: string; status: string; printedAt?: string }>(
      `/api/v1/printing/jobs/${jobId}/printed`,
      {
        method: "POST",
        auth: true,
        body: input
      }
    );
  }

  async markFailed(jobId: string, input: PrintJobFailedRequest) {
    return this.request<{ jobId: string; status: string; nextRetryAt?: string }>(
      `/api/v1/printing/jobs/${jobId}/failed`,
      {
        method: "POST",
        auth: true,
        body: input
      }
    );
  }

  private async request<TData>(
    route: string,
    options: {
      method: "GET" | "POST";
      auth?: boolean;
      headers?: Record<string, string | undefined>;
      body?: unknown;
    }
  ) {
    const config = this.getConfig();
    const baseUrl = config.serverUrl.trim().replace(/\/+$/g, "");

    if (!baseUrl) {
      throw new Error("Server URL is required.");
    }

    const headers = new Headers();
    headers.set("Accept", "application/json");

    if (options.body) {
      headers.set("Content-Type", "application/json");
    }

    if (options.auth) {
      if (!config.stationToken.trim()) {
        throw new Error("Station token is required.");
      }

      headers.set("Authorization", `Bearer ${config.stationToken.trim()}`);
    }

    for (const [key, value] of Object.entries(options.headers ?? {})) {
      if (value) {
        headers.set(key, value);
      }
    }

    const response = await fetch(`${baseUrl}${route}`, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = (await response.json()) as {
      success: boolean;
      data: TData | null;
      error?: {
        message?: string;
      } | null;
    };

    if (!response.ok || !payload.success || payload.data === null) {
      throw new Error(payload.error?.message || `Request failed with status ${response.status}.`);
    }

    return payload.data;
  }
}
