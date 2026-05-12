#!/usr/bin/env bash
#
# sync-to-dev-server.sh — live sync local CMS → dev-server Tailscale.
#
# Watcher rsync + inotifywait : édit local → 1-2s plus tard HMR sur
# https://cms.dev.veridian.site (compose bind-mount /home/ubuntu/veridian-cms-src/cms).
#
# Prérequis côté dev-server :
#   - /home/ubuntu/veridian-cms-src/cms/ existe (clone du worktree)
#   - docker compose -f /home/ubuntu/veridian-cms/docker-compose.dev.yml up -d
#   - DB veridian_cms_dev clonée depuis prod (3 tenants : avse, demo, fgmc)
#
# Prérequis côté local :
#   - inotifywait (paquet inotify-tools)
#   - ssh dev-pub configuré (~/.ssh/config)
#
# Usage :
#   cd cms
#   bash scripts/sync-to-dev-server.sh            # boucle live
#   bash scripts/sync-to-dev-server.sh --once     # sync unique

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"   # cms/
REMOTE_HOST="${REMOTE_HOST:-dev-pub}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/veridian-cms-src/cms}"

RSYNC_OPTS=(
  -az
  --delete
  --exclude 'node_modules/'
  --exclude '.next/'
  --exclude 'test-results/'
  --exclude 'playwright-report/'
  --exclude '.env'
  --exclude '.env.local'
  --exclude '.env.dev'
  --exclude 'tsconfig.tsbuildinfo'
  --exclude '.git/'
  --exclude '*.log'
  --exclude 'src/payload-types.ts'
  --exclude 'media/'
)

log() {
  echo -e "\033[1;34m[sync-cms]\033[0m $(date +%H:%M:%S) $*"
}

do_sync() {
  local start=$(date +%s%N)
  rsync "${RSYNC_OPTS[@]}" "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_DIR/" 2>&1 | grep -v '^$' || true
  local end=$(date +%s%N)
  local ms=$(( (end - start) / 1000000 ))
  log "sync done (${ms}ms)"
}

log "initial sync $LOCAL_DIR → $REMOTE_HOST:$REMOTE_DIR"
do_sync

if [[ "${1:-}" == "--once" ]]; then
  log "single sync mode — exiting"
  exit 0
fi

if ! command -v inotifywait >/dev/null 2>&1; then
  echo "ERROR: inotifywait not found (apt install inotify-tools)" >&2
  exit 1
fi

log "watching $LOCAL_DIR for changes (Ctrl-C to stop)..."
log "→ HMR live sur https://cms.dev.veridian.site"

DEBOUNCE_MS=400
last_sync_ns=0

INOTIFY_EXCLUDE='(^|/)(node_modules|\.next|test-results|playwright-report|\.git|media)(/|$)|\.(log|tsbuildinfo)$|\.env(\.local|\.dev)?$|payload-types\.ts$'

inotifywait -mrq \
  -e modify -e create -e delete -e move \
  --exclude "$INOTIFY_EXCLUDE" \
  --format '%w%f %e' \
  "$LOCAL_DIR" | while read -r line; do
  now_ns=$(date +%s%N)
  elapsed_ms=$(( (now_ns - last_sync_ns) / 1000000 ))
  if (( elapsed_ms < DEBOUNCE_MS )); then
    continue
  fi
  sleep 0.$(printf '%03d' $DEBOUNCE_MS)
  log "change detected: $line"
  do_sync
  last_sync_ns=$(date +%s%N)
done
