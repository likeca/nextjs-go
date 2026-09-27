"use server";

import { revalidatePath } from "next/cache";

import { serverTry } from "@/lib/api/server";

interface UpdateRoleInput {
  id: string;
  name: string;
  description?: string;
  permissionIds: string[];
}

export async function updateRole(data: UpdateRoleInput) {
  const { id, name, description, permissionIds } = data;

  if (!id || !name || name.trim() === "") {
    return { error: "ID and role name are required" };
  }

  const res = await serverTry<Record<string, unknown>>(`/api/roles/${id}/`, {
    method: "PATCH",
    body: {
      name: name.trim(),
      description: description?.trim() || null,
      permissionIds,
    },
  });

  if ("error" in res) {
    return { error: res.error === "Not found." ? "Role not found" : res.error };
  }

  revalidatePath("/roles");
  revalidatePath(`/roles/${id}`);
  return { success: "Role updated successfully", role: res.data };
}
