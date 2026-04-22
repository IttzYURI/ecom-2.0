import { NextRequest, NextResponse } from "next/server";

import {
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE_NAME,
  getCustomerCookieOptions
} from "../../../../../../lib/customer-auth";
import { createStoredCustomerUser } from "../../../../../../lib/customer-user-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tenantId = body.tenantId ?? "tenant_bella";
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!name || !email || !password) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "CUSTOMER_FIELDS_REQUIRED",
          message: "Name, email, and password are required."
        }
      },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "CUSTOMER_PASSWORD_WEAK",
          message: "Password must be at least 8 characters."
        }
      },
      { status: 400 }
    );
  }

  try {
    const user = await createStoredCustomerUser(tenantId, {
      name,
      email,
      password
    });
    const response = NextResponse.json({
      success: true,
      data: {
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
  } catch (error) {
    const message =
      error instanceof Error && error.message === "DUPLICATE_EMAIL"
        ? "An account with that email already exists."
        : "Unable to create an account right now.";

    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: {},
        error: {
          code: "CUSTOMER_SIGNUP_FAILED",
          message
        }
      },
      { status: 400 }
    );
  }
}
