export interface TenantScope {
  tenantId: string;
}

export function createTenantScope(tenantId: string): TenantScope {
  const normalizedTenantId = tenantId.trim();

  if (!normalizedTenantId) {
    throw new Error("A tenantId is required to create tenant scope.");
  }

  return {
    tenantId: normalizedTenantId
  };
}

export function requireTenantScope(
  scope: TenantScope | null | undefined
): TenantScope {
  if (!scope?.tenantId.trim()) {
    throw new Error("Tenant scope is required.");
  }

  return scope;
}
