#!/usr/bin/env bash
# check-migration-safety.sh
#
# Standard CI Veridian — Expand & Contract obligatoire (CI-ARCHITECTURE.md §4).
# Bloque les migrations DB destructives sur PR vers main.
#
# Patterns bloqués (sauf déclaration explicite [contract-phase]) :
#   - DROP COLUMN, DROP TABLE
#   - ALTER COLUMN ... SET NOT NULL (sur table peuplée)
#   - RENAME COLUMN, RENAME TABLE
#   - CREATE INDEX sans CONCURRENTLY (Postgres)
#   - ALTER COLUMN ... TYPE (cast destructif)
#
# Le but : garantir que l'image Docker `previous` peut toujours tourner sur le
# schéma DB actuel — sinon auto-rollback crash la prod.
#
# Usage :
#   ./scripts/ci/check-migration-safety.sh                    # pre-push
#   BASE_REF=origin/main ./scripts/ci/check-migration-safety.sh  # CI
#
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
APP_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$APP_ROOT"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
NC=$'\033[0m'

# Payload stocke ses migrations dans src/migrations/*.ts (et SQL inline)
# Fallback : tout fichier sous src/migrations/ ou prisma/migrations/
MIGRATION_GLOBS=(
  "src/migrations"
  "prisma/migrations"
  "migrations"
)

# Diff
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null 2>&1; then
  echo "${YELLOW}⚠ $BASE_REF inaccessible, fallback sur HEAD~1${NC}" >&2
  BASE_REF="HEAD~1"
fi

CHANGED_FILES=$(git diff --name-only "$BASE_REF"...HEAD 2>/dev/null || true)
MIGRATION_FILES=""
for glob in "${MIGRATION_GLOBS[@]}"; do
  MATCH=$(echo "$CHANGED_FILES" | grep "^${glob}/" || true)
  MIGRATION_FILES="${MIGRATION_FILES}${MATCH}\n"
done
MIGRATION_FILES=$(echo -e "$MIGRATION_FILES" | grep -v '^$' || true)

if [ -z "$MIGRATION_FILES" ]; then
  echo "${GREEN}✓ Pas de migration touchée — skip migration-safety${NC}"
  exit 0
fi

echo "Migrations détectées :"
echo "$MIGRATION_FILES"
echo

# Lit le commit message pour détecter [contract-phase]
LAST_COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null || echo "")
IS_CONTRACT=false
if echo "$LAST_COMMIT_MSG" | grep -qi '\[contract-phase\]'; then
  IS_CONTRACT=true
  echo "${YELLOW}⚠ [contract-phase] détecté dans le commit message${NC}"
fi

VIOLATIONS=0
while IFS= read -r file; do
  [ -z "$file" ] && continue
  [ ! -f "$file" ] && continue

  CONTENT=$(cat "$file")

  # DROP COLUMN
  if echo "$CONTENT" | grep -Eiq '\bDROP\s+COLUMN\b'; then
    if [ "$IS_CONTRACT" = false ]; then
      echo "${RED}✗ $file : DROP COLUMN sans [contract-phase] dans le commit${NC}"
      VIOLATIONS=$((VIOLATIONS+1))
    fi
  fi

  # DROP TABLE
  if echo "$CONTENT" | grep -Eiq '\bDROP\s+TABLE\b'; then
    if [ "$IS_CONTRACT" = false ]; then
      echo "${RED}✗ $file : DROP TABLE sans [contract-phase] dans le commit${NC}"
      VIOLATIONS=$((VIOLATIONS+1))
    fi
  fi

  # ALTER COLUMN ... SET NOT NULL (sur table existante)
  if echo "$CONTENT" | grep -Eiq '\bALTER\s+COLUMN\b.*\bSET\s+NOT\s+NULL\b'; then
    echo "${RED}✗ $file : ALTER COLUMN SET NOT NULL — exige Expand+backfill+Contract${NC}"
    VIOLATIONS=$((VIOLATIONS+1))
  fi

  # RENAME
  if echo "$CONTENT" | grep -Eiq '\bRENAME\s+(COLUMN|TABLE|TO)\b'; then
    echo "${RED}✗ $file : RENAME — exige pattern add-new + dual-write + drop-old${NC}"
    VIOLATIONS=$((VIOLATIONS+1))
  fi

  # CREATE INDEX sans CONCURRENTLY (Postgres)
  if echo "$CONTENT" | grep -Eiq '\bCREATE\s+(UNIQUE\s+)?INDEX\b'; then
    if ! echo "$CONTENT" | grep -Eiq '\bCREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY\b'; then
      echo "${RED}✗ $file : CREATE INDEX sans CONCURRENTLY — verrouille la table en prod${NC}"
      VIOLATIONS=$((VIOLATIONS+1))
    fi
  fi

  # ALTER COLUMN ... TYPE (cast destructif)
  if echo "$CONTENT" | grep -Eiq '\bALTER\s+COLUMN\b.*\bTYPE\b'; then
    echo "${RED}✗ $file : ALTER COLUMN TYPE — exige ADD nouveau + backfill + DROP ancien${NC}"
    VIOLATIONS=$((VIOLATIONS+1))
  fi

done <<< "$MIGRATION_FILES"

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "${RED}✗ $VIOLATIONS violation(s) Expand & Contract détectée(s)${NC}"
  echo "Cf veridian-platform/CI-ARCHITECTURE.md §4 pour le pattern attendu."
  echo "Patterns interdits forcent migration à 2 phases (Expand → backfill → Contract dans une autre PR)."
  exit 1
fi

echo "${GREEN}✓ Migrations safe (Expand & Contract OK)${NC}"
