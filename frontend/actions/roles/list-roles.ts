"use server";

import { serverTry } from "@/lib/api/server";
import { mapRole, type Role } from "@/types/rbac";

export async function listRoles() {
  // RoleViewSet has pagination disabled → returns a plain array.
  const res = await serverTry<unknown[]>("/api/roles/");
  if ("error" in res) {
    return { error: "Failed to fetch roles: " + res.error, roles: [] as Role[] };
  }
  return { success: true, roles: res.data.map(mapRole) };
}
