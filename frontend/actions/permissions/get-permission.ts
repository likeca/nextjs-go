"use server";

import { serverTry } from "@/lib/api/server";
import { mapPermission } from "@/types/rbac";

export async function getPermission(id: string) {
  if (!id) {
    return { error: "Permission ID is required" };
  }
  const res = await serverTry<Record<string, unknown>>(`/api/permissions/${id}/`);
  if ("error" in res) {
    return { error: res.error === "Not found." ? "Permission not found" : res.error };
  }
  return { success: true, permission: mapPermission(res.data) };
}
