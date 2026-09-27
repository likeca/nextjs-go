'use server';

import { serverTry } from '@/lib/api/server';
import { mapAdminUser, type AdminUser } from '@/types/rbac';

export async function listUsers() {
  // Pull a large page; the Django endpoint is paginated.
  const res = await serverTry<{ results: unknown[] }>('/api/users/', {
    query: { page: 1 },
  });

  if ('error' in res) {
    return { error: 'Failed to fetch users: ' + res.error, users: [] as AdminUser[] };
  }
  return { success: true, users: res.data.results.map(mapAdminUser) };
}
