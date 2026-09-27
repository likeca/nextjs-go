"use server";

import { serverTry } from "@/lib/api/server";

interface UpdatePermissionInput {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export async function updatePermission(data: UpdatePermissionInput) {
  const { id, name, description, resource, action } = data;

  if (!id || !name || name.trim() === "") return { error: "ID and permission name are required" };
  if (!resource || resource.trim() === "") return { error: "Resource is required" };
  if (!action || action.trim() === "") return { error: "Action is required" };

  const res = await serverTry<Record<string, unknown>>(`/api/permissions/${id}/`, {
    method: "PATCH",
    body: {
      name: name.trim(),
      description: description?.trim() || null,
      resource: resource.trim(),
      action: action.trim(),
    },
  });

  if ("error" in res) {
    return { error: res.error === "Not found." ? "Permission not found" : res.error };
  }
  return { success: "Permission updated successfully", permission: res.data };
}
