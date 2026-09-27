import { NextResponse } from "next/server";

import { serverTry } from "@/lib/api/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { newEmail } = body;

  if (!newEmail) {
    return NextResponse.json({ error: "New email is required" }, { status: 400 });
  }

  // Django stores the EmailChangeRequest and emails the new + old addresses.
  const res = await serverTry<{ success: boolean; message: string }>(
    "/api/user/email-change/",
    { method: "POST", body: { newEmail } },
  );

  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json(res.data);
}
