'use server';

import { getSession } from './auth-helpers';
import { hasPermission } from './permissions';

/**
 * Check if current user has permission without redirecting
 * Returns the permission status for client-side checks
 */
export async function checkPermissionAction(
  resource: string,
  action: string
): Promise<{ hasPermission: boolean; isAuthenticated: boolean }> {
  const session = await getSession();
  
  if (!session?.user) {
    return { hasPermission: false, isAuthenticated: false };
  }

  const allowed = await hasPermission(session.user.id, resource, action);
  return { hasPermission: allowed, isAuthenticated: true };
}
