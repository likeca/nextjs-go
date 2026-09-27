# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A monorepo: a Next.js frontend that is a pure API client of a **Go REST API** backend. The backend was ported from an earlier Django backend (see `MIGRATION.md` for the original Next.js → Django record); the Go service keeps the Django-era URL paths and JSON contract so the frontend didn't have to change. **The backend owns all backend concerns** (data, auth, RBAC, Stripe, email, 2FA). Prisma, better-auth, and the Node Stripe/email stacks were removed from the frontend — do not reintroduce them. There is no Python/Django code left in `backend/`.

```
Browser → Next.js (frontend/, :3000) → Go API (backend/, :8080, under /api/) → PostgreSQL
```

## Commands

### Backend (`backend/`, Go 1.27, module `github.com/likeca/lhchub/go`)

One binary (`cmd/api`) serves the HTTP API and also runs the seed subcommands. Make targets load `backend/.env` (see `.env.example`).

```bash
make run                        # API server on :8080 (PORT)
make build                      # → bin/api
make test                       # go test ./...
go test ./internal/auth -run TestName   # single test
make vet / make fmt / make tidy
make migrate-create name=add_xyz        # golang-migrate pair in internal/db/migrations
make migrate-up / make migrate-down     # needs the `migrate` CLI; uses DATABASE_URL
make seed                               # load seed/**/*.json (go run ./cmd/api seed [-dry-run] [files...])
make seed-admin email=admin@example.com password='Adm1n!2345' name='Admin'
make seed-images                        # discovery photos → MEDIA_ROOT, or Cloudflare R2 if R2_BUCKET set
sqlc generate                           # regenerate internal/accounts/sqlc from queries/*.sql
swag init -g cmd/api/main.go            # regenerate docs/ (Swagger served at /swagger/)
```

PostgreSQL via `DATABASE_URL` (hosted; the root docker-compose has **no local db service**). Migrations must be applied before `seed-admin` — `000002_rbac_bootstrap` seeds roles/permissions including "Super Admin".

### Frontend (`frontend/`, Next.js 16, pnpm only — `preinstall` blocks npm/yarn)

```bash
pnpm install
pnpm dev                        # dev server :3000
pnpm build                      # production build (output: standalone)
pnpm lint                       # eslint
pnpm exec tsc --noEmit          # typecheck
pnpm exec playwright test tests/recaptcha-login.spec.ts    # Playwright specs in tests/ (expect servers running)
```

Server-side code reaches the backend via `API_INTERNAL_URL` (default `http://localhost:8080`, `lib/api/client.ts`); browser code goes through the same-origin `/api/backend` proxy.

### Docker / deploy

```bash
./build.sh [tag]                # builds + pushes likeca/go and likeca/nextjs to Docker Hub
docker compose up -d            # both containers, network_mode: host; env from backend/.env and frontend/.env
docker exec backend /app/api seed           # seed subcommands run inside the backend image
```

`backend/Dockerfile` builds a static binary on alpine (includes `seed/`; the `migrate` CLI is not in the image, so run migrations separately). Pushing to `main` triggers `.github/workflows/release.yml`, which builds/pushes `ghcr.io/<actor>/nextjs-go-backend` and `nextjs-go-frontend` and deploys to nextjs.ottawastem.com over SSH (the server needs `backend/.env` and `frontend/.env` in place).

## Architecture

### Backend layout (`backend/`)

- `cmd/api/main.go` — entrypoint: config → zap logger → pgx pool → handlers → server; subcommands `seed`, `seed-admin`, `seed-images`. Swagger annotations live here and on handlers.
- `internal/server/` — chi router + recover/log middleware. Discovery/marketplace routes are declared in `server.go`; `accounts` and `billing` register their own via `RegisterRoutes(r)`.
- Per-domain packages follow `model.go` (wire DTOs, `db:`/`json:` tags) → `repository.go` (pgx SQL + `Store` interface) → `handler.go` (HTTP):
  - `accounts` — users (UUID PKs, email login), RBAC roles/permissions, 2FA (TOTP), email OTP, password reset/change, email change, Google sign-in, dashboard stats. `internal/accounts/sqlc` is **generated** by sqlc from `queries/*.sql` — don't hand-edit.
  - `billing` — plans/subscriptions/payments + Stripe (checkout, portal, cancel/resume, verify-session, signature-verified webhook at `/api/billing/webhook/`).
  - `marketplace` — categories, providers, jobs, applications, threads, transactions.
  - `discovery` — discovery items (POIs with images).
- Shared: `auth` (JWT HS256 access/refresh, argon2 passwords, signed tokens, middleware), `httpx` (JSON helpers), `db` (pool + migrations), `config` (all env vars, 12-factor), `mail` (SMTP; logs instead of sending when `SMTP_HOST` is empty), `totp`, `logging`, `idgen`, `seed`, `seedimages`.
- `seed/` — Django-fixture-style JSON loaded by `cmd/api seed`.

**Development order** (see `backend/Readme.md`): schema leads. New resource: migration → `model.go` struct → `repository.go` (keep `SELECT` column order and `Scan` order in lockstep) → `handler.go` → route. For field changes, update all three layers.

**JSON contract**: DB columns are snake_case but the API serializes **camelCase** via `json:` tags, and URLs keep Django's trailing slash (`/api/users/`). Keep new endpoints consistent with both.

**Auth flow**: `auth.Middleware` runs on every request, reads the JWT from `Authorization: Bearer` or the `access_token` cookie, and attaches a principal to the context; handlers enforce auth/permissions themselves. Super Admin (or `is_superuser`) bypasses permission checks. Endpoints mirror dj-rest-auth: `/api/auth/login/`, `registration/`, `token/refresh/`, `token/verify/`, `user/`, etc. For 2FA-enabled users, login returns a short-lived signed `preAuthToken`; the client completes `/api/auth/2fa/login-verify/` (TOTP or backup code) to get JWTs. `JWT_SECRET` must be set or no tokens can be issued. Login reCAPTCHA is **not** implemented in the Go backend.

**Not yet ported from Django**: the frontend still calls `/api/blogs/`, `/api/organizations/`, and `/api/api-keys/` (plus the old `core` settings/contact/log endpoints), which the Go server does not serve. Check `internal/server/server.go` and each `RegisterRoutes` before assuming an endpoint exists.

### Frontend

- `lib/api/` — the typed backend client: `client.ts` (isomorphic core), `server.ts` (reads JWT from cookies in Server Components/actions), `browser.ts` (token storage + refresh-on-401).
- `lib/auth-client.ts` — backend-backed replacement for the removed better-auth client; `lib/auth.ts`, `lib/auth-utils.ts`, `lib/permissions.ts`, `lib/auth-helpers.ts` are shims so pre-migration components keep working. Route new code through these same layers.
- `actions/*` — server actions, all of which call the backend via `lib/api`. `app/api/*` route handlers proxy to the backend.
- Server code reads `process.env` directly (e.g. `GOOGLE_RECAPTCHA_SITE_KEY` in `app/login/page.tsx`). The `${VAR:-placeholder}` builder-stage defaults in `frontend/Dockerfile` are legacy leftovers, not load-bearing.
- `NEXT_PUBLIC_*` values are inlined into the client bundle at `next build` time — runtime `env_file` cannot change them; pass `--build-arg` for non-localhost deploys.
- Blog pages are intentionally `force-dynamic` — do not convert them to static rendering.
- UI: Tailwind v4, Radix primitives (shadcn-style `components/`), TipTap editor, Recharts.

## Local quirks

- `frontend/.dockerignore` excludes `.env*`, so Docker builds see no `.env`; build-time env comes only from the Dockerfile ARG defaults or `--build-arg`.
