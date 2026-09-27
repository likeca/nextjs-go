/**
 * Isomorphic HTTP client for the Django backend.
 *
 * Do NOT import `next/headers` here — this module must be safe to import from
 * both server and browser code (use `lib/api/server.ts` for server actions /
 * RSC). The browser-only helpers at the bottom (cookie tokens, clientRequest)
 * touch `document` inside function bodies only, so importing this module from
 * server code stays safe as long as those helpers are called in the browser.
 */

// In the browser API_INTERNAL_URL is never inlined (not NEXT_PUBLIC_), so
// client code falls back to the same-origin /api/backend proxy — Django stays
// private. Server code gets the internal origin directly.
export const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  baseUrl?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Next.js fetch cache control (server only). */
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

function buildUrl(path: string, baseUrl: string, query?: RequestOptions['query']) {
  const base = baseUrl.replace(/\/?$/, '/');
  const url = base.startsWith('/')
    ? new URL(base + path.replace(/^\//, ''), window.location.origin)
    : new URL(path.replace(/^\//, ''), base);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Low-level request. Returns parsed JSON (or `null` for 204) on success,
 * throws {@link ApiError} otherwise.
 */
export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, baseUrl = API_BASE, query, headers = {}, cache, next } = opts;

  const res = await fetch(buildUrl(path, baseUrl, query), {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next,
  });

  if (res.status === 204) return null as T;

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(data) || res.statusText, data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Pull a human-readable message out of a DRF error body. */
export function extractMessage(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    if (Array.isArray(obj.non_field_errors)) return String(obj.non_field_errors[0]);
    // First field error, e.g. {"email": ["already exists"]}
    for (const value of Object.values(obj)) {
      if (Array.isArray(value) && value.length) return String(value[0]);
      if (typeof value === 'string') return value;
    }
  }
  return null;
}
