import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { AgentConfig, AgentJobSummary, AgentLogEntry, AgentState } from "../shared/types";

interface PersistedAgentState {
  config: AgentConfig;
  stationId?: string;
  history: AgentJobSummary[];
  logs: AgentLogEntry[];
  lastActivity?: string;
  lastError?: string;
  lastHeartbeatAt?: string;
}

function createDefaultConfig(): AgentConfig {
  return {
    serverUrl: "http://localhost:3000",
    tenantId: "tenant_bella",
    stationName: "Kitchen Station 1",
    registrationKey: "",
    stationToken: "",
    selectedPrinter: "",
    autoPrintEnabled: true,
    paperWidth: "80mm",
    launchOnStartup: false,
    deviceId: `win_${randomUUID()}`
  };
}

function createDefaultPersistedState(): PersistedAgentState {
  return {
    config: createDefaultConfig(),
    history: [],
    logs: []
  };
}

export class SettingsStore {
  private readonly filePath: string;
  private persistedState: PersistedAgentState = createDefaultPersistedState();

  constructor(baseDirectory: string) {
    this.filePath = path.join(baseDirectory, "print-agent-state.json");
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<PersistedAgentState>;
      const defaults = createDefaultPersistedState();
      this.persistedState = {
        ...defaults,
        ...parsed,
        config: {
          ...defaults.config,
          ...(parsed.config ?? {})
        },
        history: Array.isArray(parsed.history) ? parsed.history.slice(0, 50) : [],
        logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 200) : []
      };
    } catch {
      await this.persist();
    }
  }

  getConfig() {
    return this.persistedState.config;
  }

  getPersistedState() {
    return this.persistedState;
  }

  toAgentState(appVersion: string): AgentState {
    return {
      appVersion,
      status: "idle",
      connectionState: "unauthenticated",
      config: this.persistedState.config,
      stationId: this.persistedState.stationId,
      printers: [],
      queue: [],
      history: this.persistedState.history,
      logs: this.persistedState.logs,
      lastActivity: this.persistedState.lastActivity,
      lastError: this.persistedState.lastError,
      lastHeartbeatAt: this.persistedState.lastHeartbeatAt
    };
  }

  async patchConfig(patch: Partial<AgentConfig>) {
    this.persistedState = {
      ...this.persistedState,
      config: {
        ...this.persistedState.config,
        ...patch
      }
    };
    await this.persist();
    return this.persistedState.config;
  }

  async setStationId(stationId: string | undefined) {
    this.persistedState.stationId = stationId;
    await this.persist();
  }

  async setHeartbeat(timestamp: string) {
    this.persistedState.lastHeartbeatAt = timestamp;
    await this.persist();
  }

  async setActivity(message: string, error?: string) {
    this.persistedState.lastActivity = message;
    this.persistedState.lastError = error;
    await this.persist();
  }

  async appendLog(entry: AgentLogEntry) {
    this.persistedState.logs = [entry, ...this.persistedState.logs].slice(0, 200);
    this.persistedState.lastActivity = entry.message;
    this.persistedState.lastError = entry.level === "error" ? entry.message : undefined;
    await this.persist();
  }

  async upsertHistory(job: AgentJobSummary) {
    const withoutCurrent = this.persistedState.history.filter((entry) => entry.id !== job.id);
    this.persistedState.history = [job, ...withoutCurrent].slice(0, 50);
    await this.persist();
  }

  private async persist() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.persistedState, null, 2), "utf8");
  }
}
