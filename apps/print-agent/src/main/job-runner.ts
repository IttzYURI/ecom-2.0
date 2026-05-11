import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

import type { AgentConfig, AgentJobSummary, AgentLogEntry, AgentState } from "../shared/types";
import { summarizeJob } from "../shared/types";
import { PrintServerClient } from "./api-client";
import { PrinterService } from "./printer-service";
import { SettingsStore } from "./settings-store";

interface RunnerOptions {
  appVersion: string;
  applyLaunchOnStartup(enabled: boolean): void;
}

export class PrintAgentRunner extends EventEmitter {
  private state: AgentState;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private busy = false;

  constructor(
    private readonly store: SettingsStore,
    private readonly apiClient: PrintServerClient,
    private readonly printerService: PrinterService,
    private readonly options: RunnerOptions
  ) {
    super();
    this.state = store.toAgentState(options.appVersion);
  }

  getState() {
    return this.state;
  }

  async initialize() {
    await this.store.load();
    this.state = {
      ...this.store.toAgentState(this.options.appVersion),
      printers: this.state.printers,
      queue: this.state.queue
    };
    this.options.applyLaunchOnStartup(this.state.config.launchOnStartup);
    await this.refreshPrinters();
    this.emitState();
  }

  start() {
    this.stop();
    void this.refreshNow();
    this.pollTimer = setInterval(() => {
      void this.refreshNow();
    }, 3000);
    this.heartbeatTimer = setInterval(() => {
      void this.sendHeartbeat();
    }, 15000);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async refreshPrinters() {
    try {
      const printers = await this.printerService.listInstalledPrinters();
      this.state = {
        ...this.state,
        printers
      };
      this.emitState();
      return printers;
    } catch (error) {
      await this.pushLog("error", this.toErrorMessage(error));
      return this.state.printers;
    }
  }

  async updateConfig(patch: Partial<AgentConfig>) {
    const config = await this.store.patchConfig(patch);

    if (typeof patch.launchOnStartup === "boolean") {
      this.options.applyLaunchOnStartup(patch.launchOnStartup);
    }

    this.state = {
      ...this.state,
      config
    };
    this.emitState();
    return config;
  }

  async registerStation() {
    this.state = {
      ...this.state,
      status: "connecting"
    };
    this.emitState();

    const registration = await this.apiClient.registerStation();
    await this.store.patchConfig({
      stationToken: registration.token,
      stationName: registration.name
    });
    await this.store.setStationId(registration.stationId);
    this.state = {
      ...this.state,
      config: this.store.getConfig(),
      stationId: registration.stationId,
      connectionState: "online",
      status: "ready"
    };
    await this.pushLog("info", `Station registered: ${registration.name}`);
    await this.refreshNow();
    return registration;
  }

  async refreshNow() {
    await this.refreshPrinters();
    const config = this.store.getConfig();

    if (!config.serverUrl.trim()) {
      this.state = {
        ...this.state,
        status: "idle",
        connectionState: "unauthenticated"
      };
      this.emitState();
      return;
    }

    if (!config.stationToken.trim()) {
      if (config.registrationKey.trim()) {
        try {
          await this.registerStation();
          return;
        } catch (error) {
          await this.setConnectionError(error, "unauthenticated");
          return;
        }
      }

      this.state = {
        ...this.state,
        status: "idle",
        connectionState: "unauthenticated"
      };
      this.emitState();
      return;
    }

    this.state = {
      ...this.state,
      status: this.busy ? "printing" : "connecting"
    };
    this.emitState();

    try {
      const [heartbeat, jobs] = await Promise.all([
        this.apiClient.heartbeat(this.state.lastActivity),
        this.apiClient.getNextJobs()
      ]);
      const queue = jobs.map((job) => summarizeJob(job));

      await this.store.setStationId(heartbeat.stationId);
      await this.store.setHeartbeat(heartbeat.serverTime);

      this.state = {
        ...this.state,
        stationId: heartbeat.stationId,
        queue,
        connectionState: "online",
        status: this.busy ? "printing" : "ready",
        lastHeartbeatAt: heartbeat.serverTime,
        lastError: undefined
      };
      this.emitState();

      if (!this.busy && config.autoPrintEnabled && config.selectedPrinter) {
        const nextJob = queue[0];

        if (nextJob) {
          void this.processJob(nextJob.id);
        }
      }
    } catch (error) {
      await this.setConnectionError(error, "offline");
    }
  }

  async sendHeartbeat() {
    const config = this.store.getConfig();

    if (!config.stationToken.trim()) {
      return;
    }

    try {
      const heartbeat = await this.apiClient.heartbeat(this.state.lastActivity);
      await this.store.setStationId(heartbeat.stationId);
      await this.store.setHeartbeat(heartbeat.serverTime);
      this.state = {
        ...this.state,
        stationId: heartbeat.stationId,
        lastHeartbeatAt: heartbeat.serverTime,
        connectionState: "online"
      };
      this.emitState();
    } catch (error) {
      await this.setConnectionError(error, "offline");
    }
  }

  async processJob(jobId: string) {
    const job = this.state.queue.find((entry) => entry.id === jobId);

    if (!job) {
      await this.refreshNow();
      return;
    }

    if (!this.state.config.selectedPrinter.trim()) {
      await this.pushLog("error", "Select a Windows printer before printing.");
      return;
    }

    this.busy = true;
    this.state = {
      ...this.state,
      currentJobId: jobId,
      status: "printing"
    };
    this.emitState();

    try {
      if (job.status === "pending" || job.status === "failed") {
        await this.apiClient.acknowledgeJob(job.id, this.state.stationId);
      }

      if (job.status !== "printing") {
        await this.apiClient.markPrinting(job.id);
      }

      await this.printerService.printJob(job, this.state.config);
      await this.apiClient.markPrinted(job.id, {
        printerName: this.state.config.selectedPrinter,
        copiesPrinted: 1
      });

      const printedJob: AgentJobSummary = {
        ...job,
        status: "printed",
        printedAt: new Date().toISOString(),
        lastError: undefined
      };
      await this.store.upsertHistory(printedJob);
      await this.pushLog("info", `Printed ${job.orderNumber}`, job);
      this.state = {
        ...this.state,
        history: this.store.getPersistedState().history,
        queue: this.state.queue.filter((entry) => entry.id !== job.id)
      };
      this.emitState();
    } catch (error) {
      const message = this.toErrorMessage(error);

      try {
        await this.apiClient.markFailed(job.id, { error: message });
      } catch {
        // Keep local failure visible even if server update fails.
      }

      const failedJob: AgentJobSummary = {
        ...job,
        status: "failed",
        lastError: message
      };
      await this.store.upsertHistory(failedJob);
      await this.pushLog("error", `Failed ${job.orderNumber}: ${message}`, job);
      this.state = {
        ...this.state,
        history: this.store.getPersistedState().history,
        lastError: message,
        status: "error"
      };
      this.emitState();
    } finally {
      this.busy = false;
      this.state = {
        ...this.state,
        currentJobId: undefined,
        status: this.state.connectionState === "online" ? "ready" : "error"
      };
      this.emitState();
      await this.refreshNow();
    }
  }

  async testPrint() {
    try {
      await this.printerService.testPrint(this.state.config);
      await this.pushLog("info", `Test print sent to ${this.state.config.selectedPrinter || "printer"}.`);
    } catch (error) {
      await this.pushLog("error", this.toErrorMessage(error));
      throw error;
    }
  }

  private async setConnectionError(error: unknown, connectionState: AgentState["connectionState"]) {
    const message = this.toErrorMessage(error);
    this.state = {
      ...this.state,
      connectionState,
      status: "error",
      lastError: message
    };
    this.emitState();
  }

  private async pushLog(level: AgentLogEntry["level"], message: string, job?: AgentJobSummary) {
    const entry: AgentLogEntry = {
      id: randomUUID(),
      level,
      message,
      createdAt: new Date().toISOString(),
      jobId: job?.id,
      orderNumber: job?.orderNumber
    };
    await this.store.appendLog(entry);
    this.state = {
      ...this.state,
      logs: this.store.getPersistedState().logs,
      lastActivity: this.store.getPersistedState().lastActivity,
      lastError: this.store.getPersistedState().lastError
    };
    this.emitState();
  }

  private emitState() {
    this.emit("state", this.state);
  }

  private toErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Unexpected error.";
  }
}
