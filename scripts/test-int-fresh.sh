#!/usr/bin/env bash
# Reproduit exactement le job `int` de la CI (cms-ci.yml).
#
# Usage : pnpm test:int:fresh
#
# Pourquoi : la CI a déjà sauté 2× sur des races condition pushDevSchema
# que le local n'a pas reproduit (DB persistante = idempotent). Ce script
# wipe la DB et applique les migrations comme la CI le fait, pour qu'un
# agent voie EXACTEMENT le résultat avant de push.

set -euo pipefail

PG_CONTAINER="cms-test-pg-fresh"
PG_PORT=5435 # différent de la DB persistante :5434 pour ne pas l'écraser

echo "==> Stop / remove ancien container test ($PG_CONTAINER)"
docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true

echo "==> Start Postgres 16 fresh sur :$PG_PORT"
docker run -d --name "$PG_CONTAINER" \
  -p "$PG_PORT:5432" \
  -e POSTGRES_DB=veridian_cms_test \
  -e POSTGRES_USER=cms \
  -e POSTGRES_PASSWORD=testpass \
  postgres:16-alpine >/dev/null

echo -n "==> Wait for Postgres ready"
for i in {1..30}; do
  if docker exec "$PG_CONTAINER" pg_isready -U cms >/dev/null 2>&1; then
    echo " OK"
    break
  fi
  echo -n "."
  sleep 1
done

# Export env CI-like
export DATABASE_URL="postgresql://cms:testpass@localhost:$PG_PORT/veridian_cms_test"
export PAYLOAD_SECRET="${PAYLOAD_SECRET:-ci_secret_not_for_prod_64chars_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}"
export PAYLOAD_DB_PUSH="false"
export NODE_ENV="test"
export SERVER_URL="${SERVER_URL:-http://localhost:3000}"

echo "==> pnpm exec payload migrate (applique le schema sur DB vide)"
pnpm exec payload migrate

echo "==> pnpm run test:int (vitest, identique CI)"
pnpm run test:int

echo "==> Cleanup container test ($PG_CONTAINER)"
docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true

echo "✅ test:int:fresh OK — reproduit la CI à l'identique"
