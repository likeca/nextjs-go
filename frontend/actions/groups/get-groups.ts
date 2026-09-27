'use server';

import { serverRequest } from '@/lib/api/server';

/**
 * Fetch Django groups with serverRequest (JWT from cookies, request over
 * API_INTERNAL_BASE). Lives in its own 'use server' file because groups.tsx
 * is a client component and cannot import lib/api/server.ts directly.
 */
export async function getGroups(): Promise<string> {
  try {
    const data = await serverRequest('/api/groups/');
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return e instanceof Error ? e.message : 'Request failed';
  }
}
