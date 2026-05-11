import { NextResponse } from "next/server";

import { isMongoConfigured, getMongoDb } from "../../../lib/mongo";

export async function GET() {
  const checks: { name: string; status: "ok" | "error"; detail?: string }[] = [];

  let mongoStatus: "ok" | "error" = "ok";
  let mongoDetail: string | undefined;
  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      await db.command({ ping: 1 });
    } catch (err) {
      mongoStatus = "error";
      mongoDetail = err instanceof Error ? err.message : "MongoDB ping failed";
    }
  } else {
    mongoStatus = "error";
    mongoDetail = "MONGODB_URI not configured";
  }
  checks.push({ name: "mongodb", status: mongoStatus, detail: mongoDetail });

  checks.push({
    name: "stripe_key",
    status: process.env.STRIPE_SECRET_KEY?.trim() ? "ok" : "error",
    detail: process.env.STRIPE_SECRET_KEY?.trim() ? undefined : "STRIPE_SECRET_KEY not set"
  });

  checks.push({
    name: "webhook_secret",
    status: process.env.STRIPE_WEBHOOK_SECRET?.trim() ? "ok" : "error",
    detail: process.env.STRIPE_WEBHOOK_SECRET?.trim() ? undefined : "STRIPE_WEBHOOK_SECRET not set"
  });

  const hasErrors = checks.some((c) => c.status === "error");

  return NextResponse.json(
    {
      status: hasErrors ? "degraded" : "ok",
      uptime: process.uptime(),
      version: process.env.npm_package_version || "0.1.0",
      checks
    },
    { status: hasErrors ? 503 : 200 }
  );
}
