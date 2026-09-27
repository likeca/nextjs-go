/**
 * Simple in-memory rate limiter for API routes
 * For production, consider using Redis-based solution for distributed systems
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (e.g., IP address, user ID)
   * @param maxRequests - Maximum requests allowed in the window
   * @param windowMs - Time window in milliseconds
   * @returns true if request should be allowed, false if rate limited
   */
  check(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetAt) {
      // No existing entry or window expired, allow and create new entry
      this.requests.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment count and allow
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemaining(identifier: string, maxRequests: number): number {
    const entry = this.requests.get(identifier);
    if (!entry || Date.now() > entry.resetAt) {
      return maxRequests;
    }
    return Math.max(0, maxRequests - entry.count);
  }

  /**
   * Get time until rate limit reset
   */
  getResetTime(identifier: string): number {
    const entry = this.requests.get(identifier);
    if (!entry) {
      return 0;
    }
    return Math.max(0, entry.resetAt - Date.now());
  }

  /**
   * Cleanup expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetAt) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Clear all rate limit data
   */
  clear() {
    this.requests.clear();
  }

  /**
   * Destroy the rate limiter and cleanup intervals
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Rate limiter middleware for API routes
 */
export function createRateLimitMiddleware(
  maxRequests: number = 10,
  windowMs: number = 60 * 1000 // 1 minute default
) {
  return (identifier: string) => {
    const allowed = rateLimiter.check(identifier, maxRequests, windowMs);
    return {
      allowed,
      remaining: rateLimiter.getRemaining(identifier, maxRequests),
      resetAt: rateLimiter.getResetTime(identifier),
    };
  };
}

/**
 * Get client identifier from request (IP address or other identifier)
 */
export function getClientIdentifier(
  headers: Headers,
  fallback: string = "unknown"
): string {
  // Try to get real IP from various headers (for reverse proxies)
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cfConnectingIp = headers.get("cf-connecting-ip");

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return fallback;
}

// ---------------------------------------------------------------------------
// Functional API — exported for use directly in route handlers
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes (guard for edge runtimes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 10, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `rl:${identifier}`;

  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt: entry.resetAt,
    };
  }

  if (existing.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count++;
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/** Presets for common auth endpoints */
export const authRateLimit = (ip: string) =>
  rateLimit(`auth:${ip}`, { limit: 10, windowSeconds: 60 });

export const passwordResetRateLimit = (ip: string) =>
  rateLimit(`pwd-reset:${ip}`, { limit: 3, windowSeconds: 300 });

export const signupRateLimit = (ip: string) =>
  rateLimit(`signup:${ip}`, { limit: 5, windowSeconds: 60 });
