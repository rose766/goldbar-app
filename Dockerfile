# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps first for layer caching
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client and build Next.js
RUN npx prisma generate
RUN npm run build


# ── Runner stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Mount point for the persistent SQLite volume.
# Set DATABASE_URL=file:/app/data/goldbar.db in your hosting platform.
RUN mkdir -p /app/data

# Copy built Next.js standalone bundle
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files needed at runtime (schema, generated client, CLI)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/.bin/tsx ./node_modules/.bin/tsx
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
