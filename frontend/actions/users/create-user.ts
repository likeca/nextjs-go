'use server';

import { serverTry } from '@/lib/api/server';

interface CreateAdminInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
  isAdmin?: boolean;
}

export async function createAdmin(data: CreateAdminInput) {
  const { name, email, phone, password, role = 'user', isAdmin = false } = data;

  if (!name || !email || !password) {
    return { error: 'Name, email, and password are required' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long' };
  }

  const res = await serverTry<{ id: string }>('/api/users/', {
    method: 'POST',
    body: {
      name,
      email,
      phone: phone || null,
      password,
      // Admin-created users are pre-verified; "user" is the sentinel for "no role".
      emailVerified: true,
      roleId: role && role !== 'user' ? role : null,
      isAdmin,
    },
  });

  if ('error' in res) {
    return { error: res.error };
  }
  return { success: 'User created successfully', adminId: res.data.id };
}
