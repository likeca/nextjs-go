import { redirect } from "next/navigation";

import { getSession } from "./auth-helpers";
import { hasPermission as hasPerm, hasRole as hasRoleFn } from "./permissions";

/** Require authentication; redirect to /login if not signed in. */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/** Require an admin user; redirect to / if not an admin. */
export async function requireAdmin() {
  const session = await requireAuth();
  if (!session.user.isAdmin) {
    redirect("/");
  }
  return session;
}

/** Require a specific role by name; redirect to / otherwise. */
export async function requireRole(roleName: string) {
  const session = await requireAuth();
  const ok = await hasRoleFn(session.user.id, [roleName]);
  if (!ok) {
    redirect("/");
  }
  return session;
}

/** Require a specific permission; redirect to / otherwise. */
export async function requirePermission(resource: string, action: string) {
  const session = await requireAuth();
  const ok = await hasPerm(session.user.id, resource, action);
  if (!ok) {
    redirect("/");
  }
  return session;
}

/**
 * Non-blocking admin check for the current user. The optional `userId` is kept
 * for source-compatibility; checks always apply to the authenticated session.
 */
export async function isUserAdmin(_userId?: string): Promise<boolean> {
  try {
    const session = await getSession();
    return session?.user.isAdmin ?? false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}
