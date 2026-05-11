import { BrowserWindow } from "electron";

import type { AgentConfig, AgentJobSummary } from "../shared/types";
import { createTestTicket, renderTicketHtml } from "./ticket-renderer";

type GetMainWindow = () => BrowserWindow | null;

export class PrinterService {
  constructor(private readonly getMainWindow: GetMainWindow) {}

  private readonly printTimeoutMs = 15000;

  async listInstalledPrinters() {
    const window = this.getMainWindow();

    if (!window) {
      return [];
    }

    const printers = await window.webContents.getPrintersAsync();
    return printers.map((printer) => printer.name).sort((left, right) => left.localeCompare(right));
  }

  async printJob(job: AgentJobSummary, config: Pick<AgentConfig, "paperWidth" | "stationName" | "selectedPrinter">) {
    if (!config.selectedPrinter) {
      throw new Error("Select an installed Windows printer before printing.");
    }

    const html = renderTicketHtml(job, config);
    await this.printHtml(html, config.selectedPrinter);
  }

  async testPrint(config: Pick<AgentConfig, "paperWidth" | "stationName" | "selectedPrinter">) {
    const ticket = createTestTicket(config);
    await this.printJob(ticket, config);
  }

  private async printHtml(html: string, printerName: string) {
    const printWindow = new BrowserWindow({
      show: false,
      width: 420,
      height: 640,
      webPreferences: {
        sandbox: false
      }
    });

    try {
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error(
              `Timed out after ${Math.round(this.printTimeoutMs / 1000)}s waiting for ${printerName} to accept the print job.`
            )
          );
        }, this.printTimeoutMs);

        printWindow.webContents.print(
          {
            silent: true,
            printBackground: true,
            deviceName: printerName
          },
          (success, failureReason) => {
            clearTimeout(timeout);

            if (!success) {
              reject(new Error(failureReason || "The printer rejected the job."));
              return;
            }

            resolve();
          }
        );
      });
    } finally {
      if (!printWindow.isDestroyed()) {
        printWindow.close();
      }
    }
  }
}
