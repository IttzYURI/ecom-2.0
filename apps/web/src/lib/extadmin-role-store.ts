import type { Role } from "@rcc/contracts";

import { getDefaultRoles } from "./mock-data";

function createGeneratedRoles(tenantId: string): Role[] {
  return [
    {
      id: "role_owner",
      tenantId,
      name: "Owner",
      permissions: [
        "menu.items.write",
        "orders.update_status",
        "settings.delivery.write",
        "staff.manage",
        "financials.manage"
      ]
    },
    {
      id: "role_manager",
      tenantId,
      name: "Manager",
      permissions: ["menu.items.write", "orders.update_status", "bookings.review"]
    }
  ];
}

export async function getStoredExtAdminRoles(tenantId: string): Promise<Role[]> {
  try {
    return getDefaultRoles(tenantId);
  } catch {
    return createGeneratedRoles(tenantId);
  }
}

export async function getStoredExtAdminRoleById(tenantId: string, roleId: string) {
  const roles = await getStoredExtAdminRoles(tenantId);
  return roles.find((role) => role.id === roleId) ?? null;
}
