import type { TenantFoundationSnapshot, TenantRecord } from "../models";
import { createTenantScope } from "../tenant-scope";
import type { TenantRepository } from "../repositories/tenant-repository";

export class TenantFoundationService {
  constructor(private readonly tenantRepository: TenantRepository) {}

  listTenants(): Promise<TenantRecord[]> {
    return this.tenantRepository.listTenants();
  }

  async resolveTenant(input: {
    id?: string;
    slug?: string;
    domain?: string;
  }): Promise<TenantRecord | null> {
    if (input.id?.trim()) {
      return this.tenantRepository.getTenantById(input.id);
    }

    if (input.domain?.trim()) {
      const byDomain = await this.tenantRepository.getTenantByDomain(input.domain);

      if (byDomain) {
        return byDomain;
      }
    }

    if (input.slug?.trim()) {
      return this.tenantRepository.getTenantBySlug(input.slug);
    }

    return null;
  }

  async getTenantSnapshot(tenantId: string): Promise<TenantFoundationSnapshot | null> {
    return this.tenantRepository.getTenantFoundationSnapshot(
      createTenantScope(tenantId).tenantId
    );
  }
}
