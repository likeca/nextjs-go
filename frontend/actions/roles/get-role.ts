"use server";

import { serverTry } from "@/lib/api/server";
import { mapRole } from "@/types/rbac";

export async function getRole(id: string) {
  if (!id) {
    return { error: "Role ID is required" };
  }
  const res = await serverTry<Record<string, unknown>>(`/api/roles/${id}/`);
  if ("error" in res) {
    return { error: res.error === "Not found." ? "Role not found" : res.error };
  }
  return { success: true, role: mapRole(res.data) };
}
