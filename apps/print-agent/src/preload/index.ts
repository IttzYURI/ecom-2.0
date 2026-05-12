import { contextBridge, ipcRenderer } from "electron";

import type { AgentJobSummary, AgentState } from "../shared/types";

const api = {
  getState: () => ipcRenderer.invoke("print-agent:get-state") as Promise<AgentState>,
  updateConfig: (patch: Partial<AgentState["config"]>) =>
    ipcRenderer.invoke("print-agent:update-config", patch) as Promise<AgentState["config"]>,
  refreshPrinters: () => ipcRenderer.invoke("print-agent:refresh-printers") as Promise<string[]>,
  registerStation: () => ipcRenderer.invoke("print-agent:register-station") as Promise<unknown>,
  refreshNow: () => ipcRenderer.invoke("print-agent:refresh-now") as Promise<void>,
  testPrint: () => ipcRenderer.invoke("print-agent:test-print") as Promise<void>,
  printJob: (jobId: string) => ipcRenderer.invoke("print-agent:print-job", jobId) as Promise<void>,
  subscribeState: (listener: (state: AgentState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: AgentState) => listener(state);
    ipcRenderer.on("print-agent:state", handler);
    return () => ipcRenderer.removeListener("print-agent:state", handler);
  },
  onNewOrder: (listener: (job: AgentJobSummary) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, job: AgentJobSummary) => listener(job);
    ipcRenderer.on("print-agent:new-order", handler);
    return () => ipcRenderer.removeListener("print-agent:new-order", handler);
  },
  onPrintSucceeded: (listener: () => void) => {
    const handler = () => listener();
    ipcRenderer.on("print-agent:print-succeeded", handler);
    return () => ipcRenderer.removeListener("print-agent:print-succeeded", handler);
  },
  onPrintFailed: (listener: (job: AgentJobSummary) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, job: AgentJobSummary) => listener(job);
    ipcRenderer.on("print-agent:print-failed", handler);
    return () => ipcRenderer.removeListener("print-agent:print-failed", handler);
  },
  acknowledgeOrder: (jobId: string) =>
    ipcRenderer.invoke("print-agent:acknowledge-order", jobId) as Promise<void>,
  saveAsPdf: (jobId: string) =>
    ipcRenderer.invoke("print-agent:save-as-pdf", jobId) as Promise<void>
};

contextBridge.exposeInMainWorld("printAgent", api);
