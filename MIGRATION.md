# Migration tracker — Next.js full-stack → Next.js (frontend) + Django (backend)

**Status: COMPLETE.** All backend logic moved out of `frontend/` (Prisma, better-auth,
Stripe, Node email) into the Django `backend/`. Next.js is now a pure API client.

Validation: backend `manage.py check` clean · migrations apply on Postgres · API + RBAC
+ Stripe + OTP/2FA smoke-tested via Django test client · frontend `tsc --noEmit` = 0 errors
· end-to-end verified with both servers running (a blog created via the Django API renders
through the Next.js SSR pages).

---

## Phase 1 — Monorepo restructure ✅
- `nextjs_boilerplate/` → `frontend/`, `Django_Skeleton/` → `backend/`
- Root `docker-compose.yaml` (db + backend + frontend), `.env.example`, `README.md`

## Phase 2 — Django data model ✅
- `accounts`: custom `User` (email login) + `Role`/`Permission`/`RolePermission`
  + `EmailChangeRequest` + `TwoFactor` + `EmailOTP`
- `blog`: `Blog` · `billing`: `Plan`/`Subscription`/`Payment`
- `core`: `Setting`/`ApiKey`/`Organization`(+`Member`,+`Invitation`)/`ContactSubmission`/`Log`
- `AUTH_USER_MODEL = accounts.User`; `profiles` updated; `seed_rbac` command
- Conventions: `cuid()`→`UUIDField`, `String[]`→`ArrayField` (⇒ Postgres required),
  snake_case columns, **camelCase JSON** to preserve the frontend contract.

## Phase 3 — Auth ✅
- `dj-rest-auth` + `rest_framework_simplejwt` (access/refresh); email login + registration
- password change/reset; Google social route preserved
- `accounts.permissions` mirrors `requirePermission(resource, action)` incl. Super Admin bypass

## Phase 4 — DRF API (replaces server actions) ✅
`/api/users`(+`/me`,`/permissions`) · `/api/roles` · `/api/permissions` · `/api/blogs`(+`/slug/<s>`)
· `/api/settings`(+`/public`,`/bulk`) · `/api/contact` · `/api/api-keys` · `/api/organizations`(+members)
· `/api/billing/{plans,subscriptions,payments}` · `/api/dashboard/stats`

## Phase 5 — Frontend rewiring ✅
- `lib/api/{client,server,browser}.ts` — isomorphic client, JWT-from-cookies (server),
  token storage + refresh-on-401 (browser)
- `lib/auth-client.ts` — drop-in Django-backed replacement for better-auth
- `lib/auth.ts`, `lib/auth-utils.ts`, `lib/permissions.ts`, `lib/auth-helpers.ts` — Django-backed shims
- **All** `actions/*` rewired to call Django (users, roles, permissions, blogs, settings,
  contact, payments)
- `app/api/*` route handlers proxied to Django; obsolete `auth/[...all]` + `webhooks/stripe` deleted
- Public pages (`/blog`, `/blog/[slug]`, `/sitemap`), profile, dashboard, verify-email-change rewired
- **Deleted**: `prisma/`, `lib/prisma.ts`, `lib/db.ts`, `lib/payments/`, `lib/email-service.ts`,
  `lib/email-templates/`, `lib/security/audit-logger.ts`, `scripts/`; removed `better-auth`,
  `@prisma/*`, `prisma`, `pg`, `stripe`, `nodemailer` from `package.json`

## Phase 6 — Payments / email / advanced auth ✅
- Stripe in `billing`: checkout, billing portal, cancel/resume, verify-session, **webhook**
  (`/api/billing/webhook/`) — signature-verified, syncs Subscription/Payment
- Email via Django (`send_mail`): contact notification, email-change, OTP
- **Email OTP** (`/api/auth/otp/{send,verify}`) — replaces better-auth emailOTP plugin
- **TOTP 2FA** (`/api/auth/2fa/{enable,verify,disable}`, `pyotp`) — replaces twoFactor plugin

---

## Post-migration hardening ✅
- **2FA at login** — `LoginView` (`/api/auth/login/`) gates 2FA-enabled users: it returns a
  short-lived signed `preAuthToken` instead of JWTs; the client completes
  `/api/auth/2fa/login-verify/` (TOTP or backup code) to get the tokens. Verified end-to-end.
- **Password-reset email link** — a custom `PasswordResetSerializer` (Django form + Django
  token generator) + `registration/password_reset_email.txt` send a link to the Next.js
  `/reset-password?uid=&token=` page; a matching `PasswordResetConfirmSerializer` forces
  Django's base64/token decoders (dj-rest-auth would otherwise use allauth's, which can't
  decode our UUID PK). Full request→confirm→login verified.
- Fixed a latent crash: `container.py`/`virtualmachine.py` did `eval(CSRF_TRUSTED_ORIGINS)`;
  now use `env.list` consistently with `settings/rest.py`.
- Production `next build` succeeds (43 routes).

## Remaining (operational, non-code)
- Set real `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` and seed a Plan before live payments.

## Run it
```bash
docker compose up -d db
cd backend && uv run python manage.py migrate \
  && uv run python manage.py seed_rbac --admin-email admin@example.com --admin-password 'Adm1n!2345' \
  && DJANGO_ENVIRONMENT=Development DATABASE_URL=postgres://app:app@127.0.0.1:5432/app \
     uv run python manage.py runserver
cd frontend && pnpm install && pnpm dev    # NEXT_PUBLIC_API_URL=http://localhost:8000
```
