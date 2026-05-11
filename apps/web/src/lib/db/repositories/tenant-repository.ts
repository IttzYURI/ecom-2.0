import type {
  TenantDomainRecord,
  TenantFoundationSnapshot,
  TenantRecord,
  TenantSettingsRecord
} from "../models";
import type { TenantScope } from "../tenant-scope";

export interface TenantRepository {
  listTenants(): Promise<TenantRecord[]>;
  getTenantById(tenantId: string): Promise<TenantRecord | null>;
  getTenantBySlug(slug: string): Promise<TenantRecord | null>;
  getTenantByDomain(domain: string): Promise<TenantRecord | null>;
  getTenantSettings(scope: TenantScope): Promise<TenantSettingsRecord | null>;
  getTenantDomains(tenantId: string): Promise<TenantDomainRecord[]>;
  getTenantFoundationSnapshot(
    tenantId: string
  ): Promise<TenantFoundationSnapshot | null>;
}
