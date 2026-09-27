'use server';

import { serverTry } from '@/lib/api/server';
import { mapAdminUser } from '@/types/rbac';

export async function getAdmin(id: string) {
  if (!id) {
    return { error: 'Admin ID is required' };
  }

  // The Django backend enforces the IDOR guard (self / Super Admin / user.update_any)
  // and the user.read permission, returning 403/404 as appropriate.
  const res = await serverTry<Record<string, unknown>>(`/api/users/${id}/`);
  if ('error' in res) {
    if (res.error === 'Not found.') return { error: 'Admin not found' };
    return { error: res.error };
  }
  return { success: true, admin: mapAdminUser(res.data) };
}
