# Combined Monorepo — Next.js frontend + Django backend

This repository combines two previously-separate projects into a single monorepo:

| Path        | What it is                          | Role                                    |
| ----------- | ----------------------------------- | --------------------------------------- |
| `frontend/` | `nextjs_boilerplate` (Next.js 16)   | UI layer — talks to the Django API only |
| `backend/`  | `Django_Skeleton` (Django 6 + DRF)  | Source of truth: data, auth, payments   |

## Architecture

```
Browser ──▶ Next.js (frontend/, :3000) ──▶ Django REST API (backend/, :8000) ──▶ PostgreSQL
                                              │
                                              └── JWT auth, RBAC, Stripe, email
```

Django owns **all** backend concerns. The Next.js app is a pure API client of the
Django backend (its former Prisma + better-auth + server-action backend has been removed).

- **Auth**: Django via `dj-rest-auth` + JWT. The frontend stores the access/refresh
  tokens and sends `Authorization: Bearer <token>`.
- **Data**: the entire former Prisma schema is re-modelled as Django apps
  (`accounts`, `blog`, `billing`, `core`).
- **Payments**: Stripe lives in the Django `billing` app (checkout, portal, webhook).

## Quick start (docker-compose)

```bash
cp .env.example .env
docker compose up --build
# frontend → http://localhost:3000
# backend  → http://localhost:8000  (API under /api/)
```

## Local development (without docker)

Backend (PostgreSQL required — the models use `ArrayField`):

```bash
docker compose up -d db
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py seed_rbac --admin-email admin@example.com --admin-password 'Adm1n!2345'
DJANGO_ENVIRONMENT=Development uv run python manage.py runserver   # http://localhost:8000
```

Frontend:

```bash
cd frontend
pnpm install
pnpm dev                      # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` for the frontend.

## Migration status — complete ✅

The full-stack migration is done and validated. See [MIGRATION.md](./MIGRATION.md)
for the phase-by-phase tracker and known follow-ups.

- Monorepo restructure into `frontend/` + `backend/` with root docker-compose.
- Django data model mirrors the entire former Prisma schema (custom email `User`,
  RBAC, `Blog`, `Plan`/`Subscription`/`Payment`, `Setting`, `ApiKey`, `Organization`).
- Auth is Django's (dj-rest-auth + JWT); a drop-in `lib/auth-client.ts` and Django-backed
  shims keep the existing components working, with RBAC matching `requirePermission()`.
- All server actions and `app/api/*` routes call Django via a typed client (`lib/api/`).
  Stripe (checkout/portal/cancel/resume/verify/webhook), email, email-OTP and TOTP 2FA
  all live in Django.
- Prisma, better-auth, and the Node email/Stripe stacks were removed from the frontend.

**Validated:** backend `manage.py check` clean · migrations apply on Postgres ·
auth/RBAC/CRUD/billing/API-keys/orgs/dashboard/OTP/2FA smoke-tested ·
frontend `tsc --noEmit` = 0 errors · production `next build` succeeds ·
end-to-end with both servers live (a blog created via the Django API renders through
the Next.js SSR pages).


# Locally
docker compose up --build
