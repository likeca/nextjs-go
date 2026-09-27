import { serverRequest, serverTry } from "./api/server";

interface PermissionSummary {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperuser: boolean;
  roleName: string | null;
  permissions: { resource: string; action: string }[];
}

async function summary(): Promise<PermissionSummary | null> {
  try {
    return await serverRequest<PermissionSummary>("/api/users/permissions/");
  } catch {
    return null;
  }
}

/**
 * Determine whether the current user may access/edit the user `targetUserId`.
 * (Self / Super Admin / explicit user.update_any.) The Django backend enforces
 * the same rule on retrieve; this mirrors it for callers that pre-check.
 */
export async function canAccessUser(
  _editorId: string,
  targetUserId: string,
): Promise<boolean> {
  const me = await serverTry<{ id: string }>("/api/auth/user/");
  if ("data" in me && me.data.id === targetUserId) return true;

  const s = await summary();
  if (!s) return false;
  if (s.isSuperuser) return true;
  if (s.isAdmin && s.roleName === "Super Admin") return true;
  return s.permissions.some((p) => p.resource === "user" && p.action === "update_any");
}

/** Check if the current user has a specific (resource, action) permission. */
export async function hasPermission(
  _userId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  const s = await summary();
  if (!s || !s.isAuthenticated) return false;
  if (s.isSuperuser) return true;
  if (s.isAdmin && s.roleName === "Super Admin") return true;
  if (!s.isAdmin) return false;
  return s.permissions.some((p) => p.resource === resource && p.action === action);
}

/** Check if the current user has any of the specified roles. */
export async function hasRole(_userId: string, roleNames: string[]): Promise<boolean> {
  const s = await summary();
  return !!s?.roleName && roleNames.includes(s.roleName);
}

/** Check if the current user can access protected (admin) routes. */
export async function canAccessProtectedRoutes(_userId: string): Promise<boolean> {
  const s = await summary();
  return !!s && (s.isAdmin || s.isSuperuser);
}
