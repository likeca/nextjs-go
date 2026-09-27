import { NextResponse } from "next/server";

import { serverTry } from "@/lib/api/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();

  // The Django backend owns the database; ping its health/auth surface.
  const res = await serverTry("/api/billing/plans/");
  const backendOk = !("error" in res) || res.error !== "Request failed";

  const health = {
    status: backendOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    responseTime: `${Date.now() - startTime}ms`,
    services: {
      backend: { status: backendOk ? "ok" : "error" },
    },
  };

  return NextResponse.json(health, { status: backendOk ? 200 : 503 });
}
