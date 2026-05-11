import path from "node:path";

import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron";

import { PrintServerClient } from "./api-client";
import { PrintAgentRunner } from "./job-runner";
import { PrinterService } from "./printer-service";
import { SettingsStore } from "./settings-store";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let runner: PrintAgentRunner | null = null;
let isQuitting = false;
const DEV_RENDERER_URL = process.env.ELECTRON_RENDERER_URL?.trim() || "http://localhost:5173";

function getRendererPath() {
  return path.join(app.getAppPath(), "dist", "renderer", "index.html");
}

function getPreloadPath() {
  return path.join(app.getAppPath(), "dist", "preload", "index.js");
}

function createTrayIcon() {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const isInner = x >= 3 && x <= 12 && y >= 3 && y <= 12;
      canvas[offset] = isInner ? 0xf9 : 0x00;
      canvas[offset + 1] = isInner ? 0x71 : 0x00;
      canvas[offset + 2] = isInner ? 0x1b : 0x00;
      canvas[offset + 3] = isInner ? 255 : 0;
    }
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (app.isPackaged) {
    void mainWindow.loadFile(getRendererPath());
  } else {
    void mainWindow.loadURL(DEV_RENDERER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

function showWindow() {
  if (!mainWindow) {
    createWindow();
  }

  mainWindow!.show();
  mainWindow!.focus();
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: "RCC Print Agent", enabled: false },
    { type: "separator" },
    {
      label: "Show Window",
      click: () => showWindow()
    },
    {
      label: "Test Print",
      click: () => {
        runner?.testPrint().catch(() => {});
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip("RCC Print Agent");
  tray.setContextMenu(buildTrayMenu());
  tray.on("double-click", () => showWindow());
}

function broadcastState(state: unknown) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("print-agent:state", state);
  }
}

async function bootstrap() {
  const settingsStore = new SettingsStore(app.getPath("userData"));
  const apiClient = new PrintServerClient(() => settingsStore.getConfig());
  const printerService = new PrinterService(() => mainWindow);
  runner = new PrintAgentRunner(settingsStore, apiClient, printerService, {
    appVersion: app.getVersion(),
    applyLaunchOnStartup(enabled) {
      app.setLoginItemSettings({
        openAtLogin: enabled
      });
    }
  });

  await runner.initialize();
  runner.on("state", (state) => {
    broadcastState(state);
  });

  createTray();
  createWindow();
  runner.start();

  ipcMain.handle("print-agent:get-state", () => runner!.getState());
  ipcMain.handle("print-agent:update-config", async (_event, patch) => runner!.updateConfig(patch));
  ipcMain.handle("print-agent:refresh-printers", async () => runner!.refreshPrinters());
  ipcMain.handle("print-agent:register-station", async () => runner!.registerStation());
  ipcMain.handle("print-agent:refresh-now", async () => runner!.refreshNow());
  ipcMain.handle("print-agent:test-print", async () => runner!.testPrint());
  ipcMain.handle("print-agent:print-job", async (_event, jobId: string) => runner!.processJob(jobId));

  app.on("before-quit", () => {
    runner?.stop();
  });
}

app.whenReady().then(() => {
  void bootstrap();
});

app.on("window-all-closed", () => {
  // Do nothing — keep running in system tray
});

app.on("activate", () => {
  showWindow();
});
