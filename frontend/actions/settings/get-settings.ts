'use server';

import { serverTry } from '@/lib/api/server';

export async function getSettings() {
  // SettingViewSet has pagination disabled → returns a plain array.
  const res = await serverTry<{ key: string; value: string }[]>('/api/settings/');
  if ('error' in res) {
    return { error: 'Failed to fetch settings' };
  }

  const settingsObject = res.data.reduce((acc: Record<string, string>, setting) => {
    acc[setting.key] = setting.value || '';
    return acc;
  }, {});

  return { success: true, data: settingsObject };
}

export async function getSetting(key: string) {
  if (!key) {
    return { error: 'Setting key is required' };
  }
  const res = await serverTry<{ value: string }>(`/api/settings/${encodeURIComponent(key)}/`);
  if ('error' in res) {
    if (res.error === 'Not found.') return { success: true, data: null };
    return { error: 'Failed to fetch setting' };
  }
  return { success: true, data: res.data.value };
}
