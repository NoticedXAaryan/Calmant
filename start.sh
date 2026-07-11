#!/bin/sh
set -e

echo "Starting application..."

# Ensure the server listens on all interfaces (not just 127.0.0.1)
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

# ── Prisma CLI via direct node path (no .bin symlinks in standalone) ──
PRISMA="node ./node_modules/prisma/build/index.js"

# Regenerate the Prisma client for THIS platform (the runner image)
$PRISMA generate 2>&1 || {
  echo "WARN: prisma generate failed — using build-time generated client"
}

# Push schema changes to the database
if [ "$RESET_DB" = "true" ]; then
  echo "WARNING: RESET_DB=true — force-resetting database..."
  $PRISMA db push --force-reset --accept-data-loss
  echo "Database reset complete."
else
  echo "Applying database schema..."
  $PRISMA db push --accept-data-loss 2>&1 || {
    echo "WARN: prisma db push failed — database may already be in sync or unreachable"
  }
fi

# Start the Next.js standalone server
exec node server.js
