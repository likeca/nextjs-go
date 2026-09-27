"use server";

import { serverTry } from "@/lib/api/server";
import { mapPermission, type Permission } from "@/types/rbac";

export async function listPermissions() {
  // PermissionViewSet has pagination disabled → returns a plain array.
  const res = await serverTry<unknown[]>("/api/permissions/");
  if ("error" in res) {
    return { error: "Failed to fetch permissions: " + res.error, permissions: [] as Permission[] };
  }
  return { success: true, permissions: res.data.map(mapPermission) };
}
