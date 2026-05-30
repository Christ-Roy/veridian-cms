#!/usr/bin/env bash
#
# restore-dev-db.sh — clone DB prod (dump R2) → cms-dev-db (env dev hot reload).
#
# À exécuter sur dev-pub (le container cms-dev-db doit tourner).
#
# Usage :
#   bash scripts/restore-dev-db.sh              # dernier dump dispo
#   bash scripts/restore-dev-db.sh 2026-05-28   # dump d'une date précise
#
# Prérequis :
#   - rclone configuré avec remote `r2:` (déjà OK sur dev-pub)
#   - container cms-dev-db up et healthy
#   - réseau cms-dev-internal créé (via `docker compose up -d cms-dev-db`)

set -euo pipefail

DATE="${1:-}"
if [ -z "$DATE" ]; then
  DATE=$(rclone lsf r2:veridian-backups/cms/ \
    | grep -oE 'cms_[0-9]{4}-[0-9]{2}-[0-9]{2}' \
    | sort -u | tail -1 | sed 's/cms_//')
fi

DUMP="cms_${DATE}_0400.sql.gz"
TMP="/tmp/${DUMP}"

echo "[restore-dev-db] dump : r2:veridian-backups/cms/${DUMP}"
rclone copy "r2:veridian-backups/cms/${DUMP}" /tmp/

if [ ! -f "$TMP" ]; then
  echo "ERROR: dump ${DUMP} introuvable sur R2"
  exit 1
fi

SIZE=$(du -h "$TMP" | cut -f1)
echo "[restore-dev-db] dump récupéré (${SIZE})"

# Vérifie que le container DB tourne
if ! docker exec cms-dev-db pg_isready -U cms -d postgres >/dev/null 2>&1; then
  echo "ERROR: cms-dev-db n'est pas prêt. Lance d'abord :"
  echo "  docker compose -p cms-dev -f compose/dev.yml --env-file .env up -d cms-dev-db"
  exit 1
fi

echo "[restore-dev-db] drop + recreate veridian_cms_dev"
docker exec -i cms-dev-db psql -U cms -d postgres <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE datname = 'veridian_cms_dev' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS veridian_cms_dev;
CREATE DATABASE veridian_cms_dev OWNER cms;
SQL

echo "[restore-dev-db] restore SQL (~1-2 min sur 76MB)"
gunzip -c "${TMP}" | docker exec -i cms-dev-db psql -U cms -d veridian_cms_dev -q

rm -f "${TMP}"

echo "[restore-dev-db] done — état :"
docker exec cms-dev-db psql -U cms -d veridian_cms_dev -c "
  SELECT
    (SELECT count(*) FROM tenants) AS tenants,
    (SELECT count(*) FROM pages) AS pages,
    (SELECT count(*) FROM users) AS users,
    (SELECT count(*) FROM media) AS media;
"

echo ""
echo "Si la branche dev a des migrations Payload non-prod, lance :"
echo "  docker exec cms-dev sh -c 'cd /app && pnpm payload migrate'"
