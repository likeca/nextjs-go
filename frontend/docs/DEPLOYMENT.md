# Deployment Guide

Deploy this SaaS boilerplate to Coolify (or any Docker-based host).

## Prerequisites

- Server with 4GB+ RAM (add swap if needed)
- Docker installed
- PostgreSQL database
- Domain with DNS pointing to your server

## Quick Start

### 1. Create PostgreSQL Database

In Coolify: Resources > New > Database > PostgreSQL 18. Start it and note the connection string.

### 2. Create Application

- Source: GitHub App (connect your repo)
- Build Pack: **Dockerfile**
- Branch: `main`
- Dockerfile Location: `/Dockerfile`
- Port: `3000`
- Domain: your domain (e.g., `https://app.example.com`)

### 3. Set Environment Variables

Add these in Coolify under Environment Variables (both build + runtime):

| Variable | Example | Required |
|---|---|---|
| `DATABASE_URL` | `postgres://user:pass@db-host:5432/dbname` | Yes |
| `BETTER_AUTH_SECRET` | Random 32+ char string | Yes |
| `BETTER_AUTH_URL` | `https://app.example.com` | Yes |
| `NEXT_PUBLIC_APP_NAME` | `My SaaS` | Yes |
| `NEXT_PUBLIC_APP_URL` | `https://app.example.com` | Yes |
| `NEXT_PUBLIC_APP_DESCRIPTION` | `Your app description` | No |
| `SMTP_HOST` | `mail.example.com` | For email |
| `SMTP_PORT` | `465` | For email |
| `SMTP_USER` | `noreply@example.com` | For email |
| `SMTP_PASSWORD` | `your-password` | For email |
| `SMTP_SECURE` | `true` | For email |
| `SMTP_FROM_EMAIL` | `noreply@example.com` | For email |
| `STRIPE_SECRET_KEY` | `sk_test_...` | For payments |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | For payments |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | For payments |
| `NEXT_PUBLIC_ENABLE_TWO_FACTOR` | `true`/`false` | No |
| `NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION` | `true`/`false` | No |
| `NODE_OPTIONS` | `--max-old-space-size=2048` | Low RAM servers |

### 4. Deploy

Click **Redeploy**. The Dockerfile handles everything:
- Installs dependencies
- Generates Prisma client
- Runs database migrations
- Builds the Next.js app

### 5. Post-Deploy Setup

Open the container terminal in Coolify and run:

```bash
# Create admin account (interactive prompts)
npx tsx scripts/create-admin.ts

# Seed pricing plans
npx tsx scripts/seed-plans.ts
```

## Low-Memory Servers

For servers with 4GB RAM or less:

1. Add swap:
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

2. Set `NODE_OPTIONS=--max-old-space-size=2048` as an environment variable.

## Troubleshooting

| Issue | Fix |
|---|---|
| Build OOM killed | Add swap + set `NODE_OPTIONS` |
| Static page generation fails | Pages querying DB at build time need `export const dynamic = 'force-dynamic'` |
| Pre-deploy command fails | Leave pre-deployment empty; migrations run during Docker build |
| Scripts fail with missing module | Verify `lib/` and `scripts/` are not in `.dockerignore` |
