import { createDatabaseConnection } from "../connection";
import { getDatabaseFoundationConfig } from "../config";
import { JsonTenantRepository } from "./json-tenant-repository";
import { PostgresTenantRepository } from "./postgres-tenant-repository";
import type { TenantRepository } from "./tenant-repository";

export function createTenantRepository(): TenantRepository {
  const config = getDatabaseFoundationConfig();

  if (config.mode === "postgres") {
    return new PostgresTenantRepository(createDatabaseConnection(config));
  }

  return new JsonTenantRepository();
}
