#!/bin/sh
set -e

echo "Starting application..."

# Ensure the server listens on all interfaces (not just 127.0.0.1)
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
# Ensure Prisma client is generated for this platform
npx prisma generate

# If the user sets RESET_DB=true in Dokploy, we will wipe and reset the database.
if [ "$RESET_DB" = "true" ]; then
  echo "WARNING: RESET_DB is true. Wiping the database..."
  npx prisma db push --force-reset --accept-data-loss
  echo "Database reset complete."
else
  # Normally, we just apply any pending schema changes
  echo "Applying database schema..."
  npx prisma db push --accept-data-loss
fi

# Start the Next.js standalone server
exec node server.js
