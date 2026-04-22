import { NextRequest, NextResponse } from "next/server";

import {
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE_NAME,
  getCustomerCookieOptions
} from "../../../../../../lib/customer-auth";
import { validateStoredCustomerUser } from "../../../../../../lib/customer-user-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tenantId = body.tenantId ?? "tenant_bella";
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  const user = await validateStoredCustomerUser(tenantId, email, password);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "CUSTOMER_LOGIN_FAILED",
          message: "Invalid email or password."
        }
      },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    success: true,
    data: {
      accessToken: `customer-session-${user.id}`,
      refreshToken: "customer-refresh-token",
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    },
    meta: {},
    error: null
  });

  response.cookies.set(
    CUSTOMER_SESSION_COOKIE_NAME,
    await createCustomerSessionToken({
      id: user.id,
      email: user.email,
      name: user.name
    }),
    getCustomerCookieOptions()
  );

  return response;
}
