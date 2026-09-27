"use server";

import { serverTry } from "@/lib/api/server";

interface CreateRoleInput {
  name: string;
  description?: string;
  permissionIds: string[];
}

export async function createRole(data: CreateRoleInput) {
  const { name, description, permissionIds } = data;

  if (!name || name.trim() === "") {
    return { error: "Role name is required" };
  }

  const res = await serverTry<Record<string, unknown>>("/api/roles/", {
    method: "POST",
    body: {
      name: name.trim(),
      description: description?.trim() || null,
      permissionIds,
    },
  });

  if ("error" in res) {
    return { error: res.error };
  }
  return { success: "Role created successfully", role: res.data };
}
