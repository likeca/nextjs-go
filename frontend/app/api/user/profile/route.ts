import { NextResponse } from "next/server";

import { serverTry } from "@/lib/api/server";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  image: string | null;
  isAdmin: boolean;
}

export async function GET() {
  const res = await serverTry<ProfileUser>("/api/auth/user/");
  if ("error" in res) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(res.data);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { name, phone } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const res = await serverTry<ProfileUser>("/api/auth/user/", {
    method: "PATCH",
    body: { name, phone: phone || null },
  });

  if ("error" in res) {
    if (res.error.toLowerCase().includes("not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
  return NextResponse.json({ success: true, user: res.data });
}
