"use server";

import { serverTry } from "@/lib/api/server";

interface CreatePermissionInput {
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export async function createPermission(data: CreatePermissionInput) {
  const { name, description, resource, action } = data;

  if (!name || name.trim() === "") return { error: "Permission name is required" };
  if (!resource || resource.trim() === "") return { error: "Resource is required" };
  if (!action || action.trim() === "") return { error: "Action is required" };

  const res = await serverTry<Record<string, unknown>>("/api/permissions/", {
    method: "POST",
    body: {
      name: name.trim(),
      description: description?.trim() || null,
      resource: resource.trim(),
      action: action.trim(),
    },
  });

  if ("error" in res) {
    return { error: res.error };
  }
  return { success: "Permission created successfully", permission: res.data };
}
