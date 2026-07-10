#!/bin/sh
set -e

echo "Starting application..."

# If the user sets RESET_DB=true in Docploy, we will wipe and reset the database.
if [ "$RESET_DB" = "true" ]; then
  echo "WARNING: RESET_DB is true. Wiping the database..."
  npx --yes prisma@latest db push --force-reset --accept-data-loss
  echo "Database reset complete."
else
  # Normally, we just apply any pending migrations without data loss
  echo "Applying database schema..."
  npx --yes prisma@latest db push --accept-data-loss
fi

# Start the Next.js standalone server
exec node server.js
