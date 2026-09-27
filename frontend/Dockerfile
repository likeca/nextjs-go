FROM node:lts-alpine AS base

# --- 1. Dependencies ---
FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json pnpm-lock.yaml pnpm-workspace.yaml ./
# COPY prisma ./prisma/
# COPY prisma.config.ts ./
RUN npm install -g pnpm@latest
RUN pnpm install --frozen-lockfile

# --- 2. Build ---
FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
RUN npm install -g pnpm@latest
COPY . .

ARG DATABASE_URL
ARG BETTER_AUTH_SECRET
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_APP_DESCRIPTION
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ENABLE_TWO_FACTOR
ARG NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION

ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=${DATABASE_URL}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_APP_DESCRIPTION=${NEXT_PUBLIC_APP_DESCRIPTION}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_ENABLE_TWO_FACTOR=${NEXT_PUBLIC_ENABLE_TWO_FACTOR}
ENV NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION=${NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION}

RUN pnpm build

# --- 3. Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="localhost"

CMD ["node", "server.js"]
