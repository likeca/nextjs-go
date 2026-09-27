import { NextRequest, NextResponse } from "next/server";

import { serverTry } from "@/lib/api/server";

export async function GET() {
  const res = await serverTry<unknown[]>("/api/api-keys/");
  if ("error" in res) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ keys: res.data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "Key name is required" }, { status: 400 });
  }

  // Django generates the key and returns the raw value exactly once.
  const res = await serverTry<Record<string, unknown>>("/api/api-keys/", {
    method: "POST",
    body: { name },
  });
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json(res.data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");
  if (!keyId) {
    return NextResponse.json({ error: "Key ID required" }, { status: 400 });
  }

  const res = await serverTry(`/api/api-keys/${keyId}/`, { method: "DELETE" });
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
