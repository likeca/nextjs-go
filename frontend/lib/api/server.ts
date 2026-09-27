/**
 * Server-side API helpers for use inside Server Actions and React Server
 * Components. Reads the JWT from cookies and talks to Django over the internal
 * base URL.
 *
 * NOTE: importing `next/headers` already makes this module server-only — it
 * throws if pulled into a client bundle. Do NOT add a 'use server' directive
 * here: that marks every export as a server-action endpoint and forbids the
 * const/type exports below ("Only async functions are allowed").
 */
import { cookies } from 'next/headers';

import { ApiError, API_BASE, request, type RequestOptions } from './client';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export async function getServerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

/** Authenticated server request (attaches the JWT from cookies). */
export async function serverRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = await getServerToken();
  return request<T>(path, { ...opts, token, baseUrl: API_BASE });
}

/**
 * Like {@link serverRequest} but returns a discriminated `{ data } | { error }`
 * union instead of throwing. The two members share no keys so `'error' in res`
 * / `'data' in res` narrow precisely.
 */
export type ServerResult<T> = { data: T } | { error: string };

export async function serverTry<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ServerResult<T>> {
  try {
    const data = await serverRequest<T>(path, opts);
    return { data };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    return { error: e instanceof Error ? e.message : 'Request failed' };
  }
}

/** Throws if there is no authenticated session — mirrors the old requireAuth(). */
export async function requireServerToken(): Promise<string> {
  const token = await getServerToken();
  if (!token) throw new ApiError(401, 'Not authenticated');
  return token;
}
