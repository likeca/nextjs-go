'use server';

import { revalidatePath } from 'next/cache';

import { serverTry } from '@/lib/api/server';

export async function updateProfile(formData: FormData) {
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;

  if (!name || name.trim().length === 0) {
    return { error: 'Name is required' };
  }

  const phoneValue = phone && phone.trim().length > 0 ? phone.trim() : null;

  // Updates the current user via dj-rest-auth's user-details endpoint.
  // Email changes are handled separately (see /api/user/email-change).
  const res = await serverTry('/api/auth/user/', {
    method: 'PATCH',
    body: { name: name.trim(), phone: phoneValue },
  });

  if ('error' in res) {
    if (res.error.toLowerCase().includes('not authenticated')) {
      return { error: 'Not authenticated' };
    }
    return { error: 'Failed to update profile: ' + res.error };
  }

  revalidatePath('/profile');
  return { success: true, message: 'Profile updated successfully' };
}
