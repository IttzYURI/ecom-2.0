import { contextBridge, ipcRenderer } from "electron";

import type { AgentState } from "../shared/types";

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
  }
};

contextBridge.exposeInMainWorld("printAgent", api);
