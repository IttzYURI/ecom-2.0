import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getCustomerSession } from "./customer-auth";
import { getStoredExtAdminRoles } from "./extadmin-role-store";
import { getExtAdminSession } from "./extadmin-auth";
import {
  getStoredExtAdminUserById,
  type ExtAdminUserRecord
} from "./extadmin-user-store";
import { getDriverSession } from "./driver-auth";
import { getStoredDrivers } from "./driver-store";
import { authenticatePrintStation } from "./printing-auth";
import { getPlatformSession } from "./platform-auth";
import { getStoredOrderById } from "./operations-store";
import {
  getTenantPermissionsFromRoles,
  hasTenantPermission,
  type TenantPermission
} from "./rbac";

function createJsonErrorResponse(
  status: number,
  code: string,
  message: string
) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      meta: {},
      error: {
        code,
        message
      }
    },
    { status }
  );
}

function createExtAdminForbiddenRedirect(request: NextRequest) {
  return NextResponse.redirect(
    new URL(
      "/extadmin?status=error&message=You+are+not+allowed+to+perform+that+action.",
      request.url
    )
  );
}

export async function requirePlatformSuperAdminApi(request: NextRequest) {
  const session = await getPlatformSession(request);

  if (!session) {
    return {
      session: null,
      response: createJsonErrorResponse(
        401,
        "PLATFORM_AUTH_REQUIRED",
        "A super admin session is required."
      )
    };
  }

  return {
    session,
    response: null
  };
}

export async function requireExtAdminPermission(
  request: NextRequest,
  permission: TenantPermission
) {
  const session = await getExtAdminSession(request);

  if (!session) {
    return {
      session: null,
      user: null,
      permissions: [] as TenantPermission[],
      response: NextResponse.redirect(new URL("/extadmin/login", request.url))
    };
  }

  const user = await getStoredExtAdminUserById(session.tenantId, session.userId);

  if (!user) {
    return {
      session: null,
      user: null,
      permissions: [] as TenantPermission[],
      response: NextResponse.redirect(new URL("/extadmin/login", request.url))
    };
  }

  const roles = await getStoredExtAdminRoles(session.tenantId);
  const permissions = getTenantPermissionsFromRoles(roles, user.roleIds);

  if (!hasTenantPermission(permissions, permission)) {
    return {
      session,
      user,
      permissions,
      response: createExtAdminForbiddenRedirect(request)
    };
  }

  return {
    session,
    user,
    permissions,
    response: null
  };
}

export async function requireExtAdminPermissionApi(
  request: NextRequest,
  permission: TenantPermission
) {
  const access = await requireExtAdminPermission(request, permission);

  if (access.response) {
    const status = access.session && access.user ? 403 : 401;
    const message =
      status === 401
        ? "A restaurant admin session is required."
        : "You are not allowed to perform this action.";

    return {
      ...access,
      response: createJsonErrorResponse(
        status,
        status === 401 ? "EXTADMIN_AUTH_REQUIRED" : "EXTADMIN_FORBIDDEN",
        message
      )
    };
  }

  return access;
}

export async function requireDriverActor(request: NextRequest) {
  const session = await getDriverSession(request);

  if (!session) {
    return {
      session: null,
      driver: null,
      response: createJsonErrorResponse(
        401,
        "DRIVER_AUTH_REQUIRED",
        "A driver session is required."
      )
    };
  }

  const driver = (await getStoredDrivers(session.tenantId)).find(
    (entry) => entry.id === session.driverId && entry.active
  );

  if (!driver) {
    return {
      session: null,
      driver: null,
      response: createJsonErrorResponse(
        403,
        "DRIVER_FORBIDDEN",
        "The active driver session is no longer valid."
      )
    };
  }

  return {
    session,
    driver,
    response: null
  };
}

export async function requireDriverAssignedOrder(
  request: NextRequest,
  orderId: string
) {
  const access = await requireDriverActor(request);

  if (access.response) {
    return {
      ...access,
      order: null,
      response: access.response
    };
  }

  const order = await getStoredOrderById(access.session.tenantId, orderId);

  if (!order?.deliveryTracking) {
    return {
      ...access,
      order: null,
      response: createJsonErrorResponse(
        404,
        "ORDER_NOT_FOUND",
        "Delivery order not found."
      )
    };
  }

  if (order.deliveryTracking.assignedDriverId !== access.session.driverId) {
    return {
      ...access,
      order: null,
      response: createJsonErrorResponse(
        403,
        "DRIVER_NOT_ALLOWED",
        "Only the assigned driver can access this order."
      )
    };
  }

  return {
    ...access,
    order,
    response: null
  };
}

export async function requireCustomerActor(request: NextRequest) {
  const session = await getCustomerSession(request);

  if (!session) {
    return {
      session: null,
      response: createJsonErrorResponse(
        401,
        "CUSTOMER_AUTH_REQUIRED",
        "A customer session is required."
      )
    };
  }

  return {
    session,
    response: null
  };
}

export async function requireCustomerOrderAccess(
  request: NextRequest,
  orderId: string
) {
  const access = await requireCustomerActor(request);

  if (access.response) {
    return {
      ...access,
      order: null,
      response: access.response
    };
  }

  const order = await getStoredOrderById(access.session.tenantId, orderId);

  if (!order) {
    return {
      ...access,
      order: null,
      response: createJsonErrorResponse(
        404,
        "TRACKING_NOT_FOUND",
        "Tracking information could not be found for that order."
      )
    };
  }

  if (order.customerEmail.trim().toLowerCase() !== access.session.email.trim().toLowerCase()) {
    return {
      ...access,
      order: null,
      response: createJsonErrorResponse(
        403,
        "CUSTOMER_FORBIDDEN",
        "Customers can only access their own orders."
      )
    };
  }

  return {
    ...access,
    order,
    response: null
  };
}

export async function requirePrintStationActor(request: NextRequest) {
  const station = await authenticatePrintStation(request);

  if (!station) {
    return {
      station: null,
      response: createJsonErrorResponse(
        401,
        "PRINT_STATION_UNAUTHORIZED",
        "A valid station token is required."
      )
    };
  }

  return {
    station,
    response: null
  };
}

export function filterOrdersForDriver<
  T extends {
    deliveryTracking?: {
      assignedDriverId?: string;
    } | null;
  }
>(
  orders: T[],
  driverId: string
) {
  return orders.filter((order) => order.deliveryTracking?.assignedDriverId === driverId);
}

export type TenantExtAdminAccess = Awaited<ReturnType<typeof requireExtAdminPermission>> & {
  user: ExtAdminUserRecord | null;
};
