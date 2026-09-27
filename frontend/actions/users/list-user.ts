'use server';

import { serverTry } from '@/lib/api/server';
import { mapAdminUser, type AdminUser } from '@/types/rbac';

interface ListAdminsParams {
  page?: number;
  limit?: number;
  filters?: {
    name?: string;
    email?: string;
    emailVerified?: string;
    isAdmin?: string;
    role?: string;
  };
}

export async function listAdmins(params?: ListAdminsParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const filters = params?.filters ?? {};

  const res = await serverTry<{ count: number; results: unknown[] }>('/api/users/', {
    query: {
      page,
      // Django SearchFilter matches name/email/phone; pass whichever was provided.
      search: filters.name || filters.email,
      emailVerified: filters.emailVerified,
      isAdmin: filters.isAdmin,
      role: filters.role,
    },
  });

  if ('error' in res) {
    return {
      error: 'Failed to fetch admins: ' + res.error,
      admins: [] as AdminUser[],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  const total = res.data.count;
  return {
    success: true,
    admins: res.data.results.map(mapAdminUser),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
