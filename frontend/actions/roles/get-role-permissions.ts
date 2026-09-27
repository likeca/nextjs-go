"use server";

import { serverTry } from "@/lib/api/server";
import { mapPermission, type Permission } from "@/types/rbac";

export async function getRolePermissions(roleId: string) {
  if (!roleId) {
    return { error: "Role ID is required", permissions: [] as Permission[] };
  }
  const res = await serverTry<{ permissions: unknown[] }>(`/api/roles/${roleId}/`);
  if ("error" in res) {
    return {
      error: res.error === "Not found." ? "Role not found" : res.error,
      permissions: [] as Permission[],
    };
  }
  return { success: true, permissions: res.data.permissions.map(mapPermission) };
}
