import { redirect } from "next/navigation";

import { serverTry } from "./api/server";
import { canAccessProtectedRoutes, hasPermission, hasRole } from "./permissions";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  isAdmin: boolean;
  roleId: string | null;
  role: { id: string; name: string } | null;
}

export interface Session {
  user: SessionUser;
}

/**
 * Get the current session without redirecting. Returns null if not authenticated.
 * Backed by the Django `/api/auth/user/` endpoint (JWT from cookies).
 */
export async function getSession(): Promise<Session | null> {
  const res = await serverTry<SessionUser>("/api/auth/user/");
  if ("error" in res) return null;
  return { user: res.data };
}

/** Require authentication and optionally check for specific roles. */
export async function requireAuth(options?: { roles?: string[] }) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const canAccess = await canAccessProtectedRoutes(session.user.id);
  if (!canAccess) {
    redirect("/unauthorized");
  }

  if (options?.roles) {
    const hasRequiredRole = await hasRole(session.user.id, options.roles);
    if (!hasRequiredRole) {
      redirect("/unauthorized");
    }
  }

  return session;
}

/** Require a specific permission (redirects on failure). */
export async function requirePermission(resource: string, action: string) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const allowed = await hasPermission(session.user.id, resource, action);
  if (!allowed) {
    redirect("/unauthorized");
  }

  return session;
}

/** Check permission without redirecting. */
export async function checkPermission(resource: string, action: string): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  return hasPermission(session.user.id, resource, action);
}

/** Check role membership without redirecting. */
export async function checkRole(roles: string[]): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  return hasRole(session.user.id, roles);
}
