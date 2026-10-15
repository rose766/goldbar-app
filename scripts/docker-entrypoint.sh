#!/bin/sh
set -e

# Use the volume-mounted path if DATABASE_URL is not explicitly set to a file path.
# On fresh containers the volume will be empty; prisma db push creates the schema.
: "${DATABASE_URL:=file:/app/data/goldbar.db}"
export DATABASE_URL

echo "[entrypoint] DATABASE_URL target: $DATABASE_URL"
echo "[entrypoint] Running prisma db push (idempotent)..."
node_modules/.bin/prisma db push --skip-generate

echo "[entrypoint] Seeding scenarios (idempotent via upsert)..."
node_modules/.bin/tsx prisma/seed-scenarios.ts

echo "[entrypoint] Starting Next.js..."
exec node server.js
