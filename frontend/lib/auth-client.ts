'use client';

/**
 * Django-backed auth client. Drop-in replacement for the former better-auth
 * client: exposes the same surface (signIn / signUp / signOut / useSession /
 * changePassword / emailOtp) so existing components keep working.
 *
 * Every call is delegated to a Server Action (actions/auth/auth-actions.ts),
 * so the actual HTTP request to Django happens on the Next.js server over
 * API_INTERNAL_BASE — the browser never talks to Django. Token cookies are
 * set/cleared by the actions on their responses.
 */
import { useCallback, useSyncExternalStore } from 'react';

import {
  changePasswordAction,
  getSessionAction,
  loginAction,
  logoutAction,
  otpSendAction,
  otpVerifyAction,
  requestPasswordResetAction,
  resetPasswordAction,
  signupAction,
  twoFactorDisableAction,
  twoFactorEnableAction,
  twoFactorLoginVerifyAction,
  twoFactorVerifyAction,
} from '@/actions/auth/auth-actions';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  isAdmin: boolean;
  roleId: string | null;
  role: { id: string; name: string } | null;
}

export interface Session {
  user: AuthUser;
}

type Result<T> = { data: T; error: null } | { data: null; error: { message: string } };

function ok<T>(data: T): Result<T> {
  return { data, error: null };
}
function fail<T = null>(message: string): Result<T> {
  return { data: null, error: { message } };
}

// ─── Session store (replaces better-auth's reactive useSession) ───────────────
let sessionState: { data: Session | null; isPending: boolean } = {
  data: null,
  isPending: true,
};
const listeners = new Set<() => void>();
let fetched = false;

function emit() {
  for (const l of listeners) l();
}
function setSession(data: Session | null, isPending = false) {
  sessionState = { data, isPending };
  emit();
}

export async function fetchSession(): Promise<Session | null> {
  try {
    const user = await getSessionAction();
    const session = user ? { user } : null;
    setSession(session, false);
    return session;
  } catch {
    setSession(null, false);
    return null;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!fetched) {
    fetched = true;
    void fetchSession();
  }
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return sessionState;
}
const SERVER_SNAPSHOT = { data: null, isPending: true };

/** better-auth-compatible hook: `const { data: session, isPending } = useSession()`. */
export function useSession() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const refetch = useCallback(() => fetchSession(), []);
  return { ...state, error: null, refetch };
}

// Holds the short-lived pre-auth token between password-check and 2FA-verify at login.
let pendingPreAuthToken: string | null = null;

// ─── signIn / signUp / signOut ────────────────────────────────────────────────
export const signIn = {
  async email({
    email,
    password,
    captchaToken,
  }: {
    email: string;
    password: string;
    captchaToken?: string;
    callbackURL?: string;
  }) {
    const res = await loginAction({ email, password, captchaToken });
    if (!res.ok) return fail(res.error);

    // 2FA-enabled account: no tokens yet — surface the redirect the login form expects.
    if (res.data.twoFactorRequired && res.data.preAuthToken) {
      pendingPreAuthToken = res.data.preAuthToken;
      return ok({ twoFactorRedirect: true });
    }

    if (res.data.user) setSession({ user: res.data.user }, false);
    return ok({ user: res.data.user });
  },
};

export const signUp = {
  async email({
    email,
    password,
    name,
  }: {
    email: string;
    password: string;
    name: string;
    callbackURL?: string;
  }) {
    const res = await signupAction({ email, name, password });
    if (!res.ok) return fail(res.error);
    if (res.data.user) setSession({ user: res.data.user }, false);
    return ok({ user: res.data.user });
  },
};

export async function signOut() {
  await logoutAction(); // clears token cookies server-side
  setSession(null, false);
}

// ─── changePassword (dj-rest-auth) ────────────────────────────────────────────
export async function changePassword({
  currentPassword,
  newPassword,
}: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}) {
  const res = await changePasswordAction({ currentPassword, newPassword });
  return res.ok ? ok(res.data) : fail(res.error);
}

// ─── Password reset (dj-rest-auth) ────────────────────────────────────────────
export async function requestPasswordReset({ email }: { email: string }) {
  const res = await requestPasswordResetAction({ email });
  return res.ok ? ok(res.data) : fail(res.error);
}

export async function resetPassword({
  uid,
  token,
  newPassword,
}: {
  uid: string;
  token: string;
  newPassword: string;
}) {
  const res = await resetPasswordAction({ uid, token, newPassword });
  return res.ok ? ok(res.data) : fail(res.error);
}

// ─── Email OTP (Django: /api/auth/otp/*) ──────────────────────────────────────
export const emailOtp = {
  async sendVerificationOtp({ email, type }: { email: string; type?: string }) {
    const res = await otpSendAction({ email, type });
    return res.ok ? ok(res.data) : fail(res.error);
  },
  async verifyEmail({ email, otp, type }: { email: string; otp: string; type?: string }) {
    const res = await otpVerifyAction({ email, otp, type });
    return res.ok ? ok(res.data) : fail(res.error);
  },
};

// ─── TOTP 2FA (Django: /api/auth/2fa/*) ───────────────────────────────────────
const twoFactor = {
  /** Begin enrollment: returns { totpURI, backupCodes }. */
  async enable({ password }: { password: string }) {
    const res = await twoFactorEnableAction({ password });
    return res.ok ? ok(res.data) : fail(res.error);
  },
  /**
   * Verify a TOTP code. Two contexts:
   *  - During login (a preAuthToken is pending): exchange code+token for JWTs.
   *  - In profile settings (already authenticated): confirm/activate enrollment.
   */
  async verifyTotp({ code }: { code: string }) {
    if (pendingPreAuthToken) {
      const res = await twoFactorLoginVerifyAction({ preAuthToken: pendingPreAuthToken, code });
      if (!res.ok) return fail(res.error);
      pendingPreAuthToken = null;
      if (res.data.user) setSession({ user: res.data.user }, false);
      return ok({ user: res.data.user });
    }

    const res = await twoFactorVerifyAction({ code });
    return res.ok ? ok(res.data) : fail(res.error);
  },
  async disable({ password }: { password: string }) {
    const res = await twoFactorDisableAction({ password });
    return res.ok ? ok(res.data) : fail(res.error);
  },
};

// Aggregate object mirroring `authClient.*` usage in components.
export const authClient = {
  signIn,
  signUp,
  signOut,
  useSession,
  changePassword,
  requestPasswordReset,
  resetPassword,
  emailOtp,
  twoFactor,
};
