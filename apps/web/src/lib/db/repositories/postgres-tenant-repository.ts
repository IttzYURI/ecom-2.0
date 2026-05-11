import type { DatabaseConnection } from "../connection";
import type {
  TenantDomainRecord,
  TenantFoundationSnapshot,
  TenantRecord,
  TenantSettingsRecord
} from "../models";
import type { TenantScope } from "../tenant-scope";
import type { TenantRepository } from "./tenant-repository";

export class PostgresTenantRepository implements TenantRepository {
  constructor(private readonly connection: DatabaseConnection) {}

  private notReady() {
    const summary = this.connection.getSummary();

    throw new Error(
      `PostgreSQL tenant repository is not active yet. Driver=${summary.driver}, configured=${String(summary.configured)}. Keep legacy JSON storage enabled until Phase 3 wiring begins.`
    );
  }

  async listTenants(): Promise<TenantRecord[]> {
    this.notReady();
    return [];
  }

  async getTenantById(_tenantId: string): Promise<TenantRecord | null> {
    void _tenantId;
    this.notReady();
    return null;
  }

  async getTenantBySlug(_slug: string): Promise<TenantRecord | null> {
    void _slug;
    this.notReady();
    return null;
  }

  async getTenantByDomain(_domain: string): Promise<TenantRecord | null> {
    void _domain;
    this.notReady();
    return null;
  }

  async getTenantSettings(
    _scope: TenantScope
  ): Promise<TenantSettingsRecord | null> {
    void _scope;
    this.notReady();
    return null;
  }

  async getTenantDomains(_tenantId: string): Promise<TenantDomainRecord[]> {
    void _tenantId;
    this.notReady();
    return [];
  }

  async getTenantFoundationSnapshot(
    _tenantId: string
  ): Promise<TenantFoundationSnapshot | null> {
    void _tenantId;
    this.notReady();
    return null;
  }
}
