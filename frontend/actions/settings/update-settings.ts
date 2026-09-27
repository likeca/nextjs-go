'use server';

import { revalidatePath } from 'next/cache';

import { serverTry } from '@/lib/api/server';

export async function updateSettings(
  settings: Record<string, string> | { [key: string]: string },
) {
  if (!settings || typeof settings !== 'object') {
    return { error: 'Invalid settings data' };
  }

  // Bulk upsert via the Django settings endpoint.
  const res = await serverTry('/api/settings/bulk/', {
    method: 'PUT',
    body: { settings },
  });

  if ('error' in res) {
    return { error: 'Failed to update settings' };
  }

  revalidatePath('/settings');
  return { success: true, message: 'Settings updated successfully' };
}

export async function updateSetting(key: string, value: string) {
  if (!key) {
    return { error: 'Setting key is required' };
  }

  const res = await serverTry('/api/settings/bulk/', {
    method: 'PUT',
    body: { settings: { [key]: value || '' } },
  });

  if ('error' in res) {
    return { error: 'Failed to update setting' };
  }

  revalidatePath('/settings');
  return { success: true, message: 'Setting updated successfully' };
}
