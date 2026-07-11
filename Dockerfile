FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y openssl python3 make g++ libc6-dev
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build-time placeholders only. Runtime secrets come from the container env.
ARG BETTER_AUTH_SECRET=build-time-placeholder
ARG BETTER_AUTH_URL=http://localhost:3000
ARG DATABASE_URL=postgresql://user:pass@localhost:5432/build
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate
RUN npm run build

# ── Runner stage ───────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS runner
WORKDIR /app

# Install Node.js and openssl (required by Prisma engine at runtime)
RUN apt-get update && apt-get install -y curl openssl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma: copy schema, generated client, AND full CLI for runtime db push
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# We also need playwright installed locally to run chromium.launch
COPY --from=builder /app/node_modules/playwright ./node_modules/playwright
COPY --from=builder /app/node_modules/playwright-core ./node_modules/playwright-core

COPY --from=builder --chown=nextjs:nodejs /app/start.sh ./start.sh
USER root
RUN apt-get update && apt-get install -y dos2unix && dos2unix ./start.sh && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN chown nextjs:nodejs ./start.sh && chmod +x ./start.sh
USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["./start.sh"]
