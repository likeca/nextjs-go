# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A monorepo produced by migrating a Next.js full-stack boilerplate onto a Django backend. **Django owns all backend concerns** (data, auth, RBAC, Stripe, email, 2FA); the Next.js app is a pure API client of the Django REST API. Prisma, better-auth, and the Node Stripe/email stacks were removed from the frontend — do not reintroduce them. See `MIGRATION.md` for the phase-by-phase record.

```
Browser → Next.js (frontend/, :3000) → Django REST API (backend/, :8000, under /api/) → PostgreSQL
```

## Commands

### Backend (`backend/`, Python 3.13, uv)

```bash
uv sync                                                    # install deps
DJANGO_ENVIRONMENT=Development uv run python manage.py runserver   # dev server :8000
uv run python manage.py migrate
uv run python manage.py makemigrations
uv run python manage.py seed_rbac --admin-email admin@example.com --admin-password 'Adm1n!2345'
uv run python manage.py check                              # quick sanity check
DJANGO_ENVIRONMENT=Development uv run python manage.py test profiles              # one app's tests
DJANGO_ENVIRONMENT=Development uv run python manage.py test profiles.tests.SomeTestCase.test_name   # single test
```

`DJANGO_ENVIRONMENT` selects the settings module in `manage.py`: `Development`, `Container`, or (default) `virtualmachine` — all under `backend/settings/environments/` (the Django project package is `backend/backend/`). Topic-specific settings (database, rest, stripe, email, allauth, graphql, …) are split into files under `backend/settings/`; env vars are read with django-environ (compose loads `backend/backend/settings/local.env`).

PostgreSQL is required (models use `ArrayField`). The database is a hosted Postgres reached via `DATABASE_URL` — the root docker-compose has **no local db service**.

Lint (dev deps): `uv run pylint <path>`, `uv run djlint <templates>`.

### Frontend (`frontend/`, Next.js 16, pnpm only — `preinstall` blocks npm/yarn)

```bash
pnpm install
pnpm dev                        # dev server :3000 (set NEXT_PUBLIC_API_URL=http://localhost:8000)
pnpm build                      # production build (output: standalone)
pnpm lint                       # eslint
pnpm exec tsc --noEmit          # typecheck
pnpm exec playwright test tests/recaptcha-login.spec.ts    # Playwright specs in tests/ (expect servers running)
```

### Docker / deploy

```bash
./build.sh [tag]                # builds + pushes likeca/django and likeca/nextjs to Docker Hub
docker compose up -d            # runs both containers, network_mode: host, env_file per service
```

Pushing to `main` triggers `.github/workflows/release.yml`, which builds/pushes both images and deploys to nextjs.ottawastem.com over SSH.

## Architecture

### Backend apps

- `accounts` — custom `User` (email login, `AUTH_USER_MODEL = accounts.User`, UUID PKs), RBAC (`Role`/`Permission`/`RolePermission`), `TwoFactor` (TOTP via pyotp), `EmailOTP`, `EmailChangeRequest`. `accounts.permissions` mirrors the frontend's `requirePermission(resource, action)` including Super Admin bypass.
- `blog` — `Blog` model behind `/api/blogs` (+ `/slug/<s>`).
- `billing` — `Plan`/`Subscription`/`Payment` + full Stripe integration (checkout, portal, cancel/resume, verify-session, signature-verified webhook at `/api/billing/webhook/`).
- `core` — `Setting`, `ApiKey`, `Organization` (+ members/invitations), `ContactSubmission`, `Log`.
- `api` — DRF serializers/views/urls tying the above together.
- Legacy skeleton apps also present: `profiles`, `chat`, `book_graphql` (graphene GraphQL), `tenants`.

**JSON contract**: DB columns are snake_case but the API serializes **camelCase** to preserve the original frontend contract. Keep new endpoints camelCase.

**Auth flow**: dj-rest-auth + simplejwt (access/refresh JWTs). For 2FA-enabled users, `/api/auth/login/` returns a short-lived signed `preAuthToken` instead of tokens; the client completes `/api/auth/2fa/login-verify/` (TOTP or backup code) to get JWTs. Password-reset emails link to the Next.js `/reset-password?uid=&token=` page using custom serializers that force Django's token decoders (allauth's can't decode the UUID PK). Login captcha (Google reCAPTCHA v3) is enforced when `GOOGLE_RECAPTCHA_SECRET_KEY` is set.

Production serves ASGI via Daphne.

### Frontend

- `lib/api/` — the typed Django client: `client.ts` (isomorphic core), `server.ts` (reads JWT from cookies in Server Components/actions), `browser.ts` (token storage + refresh-on-401).
- `lib/auth-client.ts` — drop-in Django-backed replacement for the removed better-auth client; `lib/auth.ts`, `lib/auth-utils.ts`, `lib/permissions.ts`, `lib/auth-helpers.ts` are Django-backed shims so pre-migration components keep working. Route new code through these same layers.
- `actions/*` — server actions, all of which call Django via `lib/api`. `app/api/*` route handlers proxy to Django.
- `lib/env.ts` was removed — server code reads `process.env` directly (e.g. `GOOGLE_RECAPTCHA_SITE_KEY` in `app/login/page.tsx`). The build no longer requires `DATABASE_URL`/`BETTER_AUTH_SECRET`; the `${VAR:-placeholder}` builder-stage defaults in `frontend/Dockerfile` are legacy leftovers, not load-bearing.
- `NEXT_PUBLIC_*` values are inlined into the client bundle at `next build` time — runtime `env_file` cannot change them; pass `--build-arg` for non-localhost deploys.
- Blog pages are intentionally `force-dynamic` — do not convert them to static rendering.
- UI: Tailwind v4, Radix primitives (shadcn-style `components/`), TipTap editor, Recharts.

## Local quirks

- Edits to `backend/Dockerfile` and `docker-compose.yaml` have been observed to revert to HEAD on this machine — ship backend container fixes by building/pushing the image rather than relying on repo edits to those files.
- `frontend/.dockerignore` excludes `.env*`, so Docker builds see no `.env`; build-time env comes only from the Dockerfile ARG defaults or `--build-arg`.
