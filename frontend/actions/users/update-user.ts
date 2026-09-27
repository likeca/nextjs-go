'use server';

import { serverTry } from '@/lib/api/server';

interface UpdateAdminInput {
  id: string;
  name: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  password?: string;
  role?: string;
  isAdmin?: boolean;
}

export async function updateAdmin(data: UpdateAdminInput) {
  const { id, name, email, phone, emailVerified, password, role, isAdmin } = data;

  if (!id || !name || !email) {
    return { error: 'ID, name, and email are required' };
  }
  if (password && password.trim() !== '' && password.length < 8) {
    return { error: 'Password must be at least 8 characters long' };
  }

  const body: Record<string, unknown> = { name, email };
  if (phone !== undefined) body.phone = phone || null;
  if (emailVerified !== undefined) body.emailVerified = emailVerified;
  if (isAdmin !== undefined) body.isAdmin = isAdmin;
  if (role !== undefined) body.roleId = role && role !== 'user' ? role : null;
  if (password && password.trim() !== '') body.password = password;

  // RBAC (user.update) is enforced by Django.
  const res = await serverTry<Record<string, unknown>>(`/api/users/${id}/`, {
    method: 'PATCH',
    body,
  });

  if ('error' in res) {
    if (res.error === 'Not found.') return { error: 'Admin not found' };
    return { error: res.error };
  }
  return { success: 'Admin updated successfully', admin: res.data };
}
