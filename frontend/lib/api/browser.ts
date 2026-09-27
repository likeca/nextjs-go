"use client";

/**
 * Browser-side API helpers for client components. Stores JWTs in cookies (so
 * Server Actions can read them too) and transparently refreshes the access
 * token on a 401.
 */

import { ApiError, API_BASE, request, type RequestOptions } from "./client";

const ACCESS = "access_token";
const REFRESH = "refresh_token";

// ─── Cookie helpers (non-httpOnly so server actions + JS can both read them) ───
function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  return getCookie(ACCESS);
}
export function getRefreshToken(): string | null {
  return getCookie(REFRESH);
}

export function storeTokens(access: string, refresh?: string) {
  setCookie(ACCESS, access, 60 * 30); // 30 min (matches SimpleJWT access lifetime)
  if (refresh) setCookie(REFRESH, refresh, 60 * 60 * 24 * 7); // 7 days
}

export function clearTokens() {
  deleteCookie(ACCESS);
  deleteCookie(REFRESH);
}

async function tryRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const data = await request<{ access: string; refresh?: string }>(
      "/api/auth/token/refresh/",
      { method: "POST", body: { refresh }, baseUrl: API_BASE },
    );
    storeTokens(data.access, data.refresh);
    return data.access;
  } catch {
    clearTokens();
    return null;
  }
}

/** Authenticated browser request with one transparent refresh-and-retry on 401. */
export async function clientRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const token = getAccessToken();
  try {
    return await request<T>(path, { ...opts, token, baseUrl: API_BASE });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return request<T>(path, { ...opts, token: refreshed, baseUrl: API_BASE });
      }
    }
    throw e;
  }
}
