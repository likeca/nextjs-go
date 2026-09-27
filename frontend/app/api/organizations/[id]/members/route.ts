import { NextRequest, NextResponse } from "next/server";

import { serverTry } from "@/lib/api/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const res = await serverTry<{ members: unknown[] }>(`/api/organizations/${id}/members/`);
  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(res.data);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { userId } = await request.json();

  const res = await serverTry(`/api/organizations/${id}/remove-member/`, {
    method: "POST",
    body: { userId },
  });
  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (res.error === "Cannot remove yourself") {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}
