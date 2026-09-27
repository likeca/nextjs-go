"use server";

import { serverTry } from "@/lib/api/server";

export async function deletePermission(id: string) {
  if (!id) {
    return { error: "Permission ID is required" };
  }

  // Django blocks deletion when the permission is still assigned to roles
  // (PROTECT / RolePermission FK), returning a validation error.
  const res = await serverTry(`/api/permissions/${id}/`, { method: "DELETE" });
  if ("error" in res) {
    if (res.error === "Not found.") return { error: "Permission not found" };
    return { error: res.error };
  }
  return { success: "Permission deleted successfully" };
}
