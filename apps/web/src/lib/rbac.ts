import type { Role } from "@rcc/contracts";

export type TenantPermission =
  | "tenant.dashboard.read"
  | "tenant.content.write"
  | "tenant.media.write"
  | "tenant.menu.write"
  | "tenant.bookings.manage"
  | "tenant.orders.read"
  | "tenant.orders.manage"
  | "tenant.orders.assign_driver"
  | "tenant.print.manage"
  | "tenant.reviews.write"
  | "tenant.settings.write"
  | "tenant.staff.manage";

export type PlatformPermission = "platform.super_admin";

export type DriverPermission =
  | "driver.dashboard.read"
  | "driver.orders.read_assigned"
  | "driver.orders.update_assigned";

export type CustomerPermission =
  | "customer.session.read"
  | "customer.orders.read_own";

export type PrinterPermission =
  | "printer.device.register"
  | "printer.device.heartbeat"
  | "printer.jobs.read"
  | "printer.jobs.update";

const ALL_TENANT_PERMISSIONS: TenantPermission[] = [
  "tenant.dashboard.read",
  "tenant.content.write",
  "tenant.media.write",
  "tenant.menu.write",
  "tenant.bookings.manage",
  "tenant.orders.read",
  "tenant.orders.manage",
  "tenant.orders.assign_driver",
  "tenant.print.manage",
  "tenant.reviews.write",
  "tenant.settings.write",
  "tenant.staff.manage"
];

const LEGACY_ROLE_PERMISSION_MAP: Record<string, TenantPermission[]> = {
  "menu.items.write": ["tenant.menu.write"],
  "orders.update_status": [
    "tenant.dashboard.read",
    "tenant.orders.read",
    "tenant.orders.manage",
    "tenant.orders.assign_driver",
    "tenant.print.manage"
  ],
  "bookings.review": ["tenant.dashboard.read", "tenant.bookings.manage"],
  "settings.delivery.write": ["tenant.settings.write"],
  "staff.manage": ["tenant.staff.manage"],
  "financials.manage": ["tenant.orders.read"]
};

const ROLE_ID_PERMISSION_MAP: Record<string, TenantPermission[]> = {
  role_owner: ALL_TENANT_PERMISSIONS,
  role_manager: [
    "tenant.dashboard.read",
    "tenant.content.write",
    "tenant.media.write",
    "tenant.menu.write",
    "tenant.bookings.manage",
    "tenant.orders.read",
    "tenant.orders.manage",
    "tenant.orders.assign_driver",
    "tenant.print.manage",
    "tenant.reviews.write"
  ]
};

export function getTenantPermissionsFromRoles(roles: Role[], roleIds: string[]) {
  const grantedPermissions = new Set<TenantPermission>();

  for (const roleId of roleIds) {
    for (const permission of ROLE_ID_PERMISSION_MAP[roleId] ?? []) {
      grantedPermissions.add(permission);
    }

    const matchedRole = roles.find((role) => role.id === roleId);

    for (const legacyPermission of matchedRole?.permissions ?? []) {
      for (const permission of LEGACY_ROLE_PERMISSION_MAP[legacyPermission] ?? []) {
        grantedPermissions.add(permission);
      }
    }
  }

  return Array.from(grantedPermissions);
}

export function hasTenantPermission(
  permissions: TenantPermission[],
  requiredPermission: TenantPermission
) {
  return permissions.includes(requiredPermission);
}
