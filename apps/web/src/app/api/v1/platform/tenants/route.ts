import { NextResponse } from "next/server";

import { listTenants } from "../../../../../lib/mock-data";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: listTenants(),
    meta: {},
    error: null
  });
}
