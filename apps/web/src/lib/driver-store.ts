import { promises as fs } from "node:fs";
import path from "node:path";

import type { Driver } from "@rcc/contracts";

import { getDefaultDrivers, getDefaultTenant } from "./mock-data";

const driversFilePath = path.join(process.cwd(), "data", "drivers.json");

type DriverStore = Record<string, Driver[]>;

async function ensureDriversFile() {
  try {
    await fs.access(driversFilePath);
  } catch {
    const tenantId = getDefaultTenant().id;
    const initial: DriverStore = {
      [tenantId]: getDefaultDrivers(tenantId)
    };
    await fs.mkdir(path.dirname(driversFilePath), { recursive: true });
    await fs.writeFile(driversFilePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readDriversStore() {
  await ensureDriversFile();
  const raw = await fs.readFile(driversFilePath, "utf8");
  return JSON.parse(raw) as DriverStore;
}

export async function getStoredDrivers(tenantId: string) {
  const store = await readDriversStore();
  return store[tenantId] ?? getDefaultDrivers(tenantId);
}
