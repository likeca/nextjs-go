"use server";

import { serverTry } from "@/lib/api/server";

export async function deleteRole(id: string) {
  if (!id) {
    return { error: "Role ID is required" };
  }

  // Django blocks deletion of system roles and protects against FK constraints.
  const res = await serverTry(`/api/roles/${id}/`, { method: "DELETE" });
  if ("error" in res) {
    if (res.error === "Not found.") return { error: "Role not found" };
    return { error: res.error };
  }
  return { success: "Role deleted successfully" };
}
