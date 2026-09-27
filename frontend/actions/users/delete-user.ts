'use server';

import { serverTry } from '@/lib/api/server';
import { getSession } from '@/lib/auth-helpers';

export async function deleteUser(id: string) {
  if (!id) {
    return { error: 'User ID is required' };
  }

  // Prevent deleting the currently logged-in user.
  const session = await getSession();
  if (session && session.user.id === id) {
    return { error: 'You cannot delete your own account' };
  }

  // RBAC (user.delete) is enforced by Django.
  const res = await serverTry(`/api/users/${id}/`, { method: 'DELETE' });
  if ('error' in res) {
    if (res.error === 'Not found.') return { error: 'User not found' };
    return { error: res.error };
  }
  return { success: 'User deleted successfully' };
}
