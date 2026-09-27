'use server';

import { serverTry } from '@/lib/api/server';

export async function changePassword(formData: FormData) {
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All fields are required' };
  }
  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match' };
  }
  if (newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters long' };
  }

  // dj-rest-auth password change (requires the JWT, attached from cookies).
  const res = await serverTry('/api/auth/password/change/', {
    method: 'POST',
    body: {
      old_password: currentPassword,
      new_password1: newPassword,
      new_password2: newPassword,
    },
  });

  if ('error' in res) {
    if (res.error.toLowerCase().includes('not authenticated')) {
      return { error: 'Not authenticated' };
    }
    if (res.error.toLowerCase().includes('invalid') || res.error.toLowerCase().includes('incorrect')) {
      return { error: 'Current password is incorrect' };
    }
    return { error: 'Failed to change password. Please try again.' };
  }

  return { success: true, message: 'Password changed successfully' };
}
