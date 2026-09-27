import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { serverTry } from "@/lib/api/server";

const orgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255).trim(),
  description: z.string().max(1000).trim().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
});

export async function GET() {
  const res = await serverTry<unknown[]>("/api/organizations/");
  if ("error" in res) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ organizations: res.data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = orgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const res = await serverTry<Record<string, unknown>>("/api/organizations/", {
    method: "POST",
    body: parsed.data,
  });
  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ organization: res.data }, { status: 201 });
}
