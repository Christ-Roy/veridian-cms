#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

command -v nomad >/dev/null || {
  echo "ERREUR CMS state split: binaire nomad absent" >&2
  exit 2
}
command -v jq >/dev/null || {
  echo "ERREUR CMS state split: jq absent" >&2
  exit 2
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

env -u NOMAD_ADDR -u NOMAD_TOKEN nomad job run -var image_tag=test -output deploy/cms.nomad.hcl >"$tmp/cms.json"
env -u NOMAD_ADDR -u NOMAD_TOKEN nomad job run -output deploy/cms-state.nomad.hcl >"$tmp/cms-state.json"

fail() {
  echo "ERREUR CMS state split: $*" >&2
  exit 1
}

jq -e '.Job.ID == "cms"' "$tmp/cms.json" >/dev/null || fail "deploy/cms.nomad.hcl ne définit pas job cms"
jq -e '.Job.ID == "cms-state"' "$tmp/cms-state.json" >/dev/null || fail "deploy/cms-state.nomad.hcl ne définit pas job cms-state"

if jq -e '.Job.TaskGroups[].Tasks[].Name | . == "postgres"' "$tmp/cms.json" >/dev/null; then
  fail "le job applicatif cms ne doit plus contenir la task postgres"
fi

jq -e '
  .Job.TaskGroups[]
  | select(.Name == "state")
  | [.Tasks[].Name] == ["postgres"]
' "$tmp/cms-state.json" >/dev/null || fail "cms-state doit porter uniquement postgres"

jq -e '
  .Job.TaskGroups[]
  | select(.Name == "state")
  | .Constraints[] | select(.LTarget == "${meta.provider}" and .RTarget == "ovh-prod")
' "$tmp/cms-state.json" >/dev/null || fail "cms-state doit être épinglé à ovh-prod"

jq -e '
  .Job.TaskGroups[]
  | select(.Name == "state")
  | .ReschedulePolicy.Attempts == 0 and .ReschedulePolicy.Unlimited == false
' "$tmp/cms-state.json" >/dev/null || fail "cms-state doit désactiver explicitement le reschedule"

jq -e '
  .Job.TaskGroups[]
  | select(.Name == "state")
  | [.Networks[].DynamicPorts[] | select(.Label == "pg" and .HostNetwork == "tailscale")]
  | length == 1
' "$tmp/cms-state.json" >/dev/null || fail "Postgres doit binder sur host_network=tailscale"

jq -e '
  [.Job.TaskGroups[].Services[]? | select(.Name == "cms-postgres") | .Provider]
  | length == 1 and .[0] == "nomad"
' "$tmp/cms-state.json" >/dev/null || fail "cms-state doit publier cms-postgres via provider nomad"

if grep -En '127[.]0[.]0[.]1:5432|DATABASE_URL=\{\{ [.]DATABASE_URL \}\}' deploy/cms.nomad.hcl >/dev/null; then
  fail "cms ne doit plus dépendre d'une DB localhost ni d'une DATABASE_URL externe opaque"
fi

rg -q 'nomadService "cms-postgres"' deploy/cms.nomad.hcl \
  || fail "cms doit découvrir Postgres via nomadService cms-postgres"

jq -e '
  .Job.TaskGroups[]
  | select([.Services[]?.Name] | index("cms"))
  | [.Tasks[].Name] as $tasks
  | ($tasks | index("postgres")) | not
' "$tmp/cms.json" >/dev/null || fail "le group routé publiquement ne doit jamais recohabiter Postgres"

jq -e '
  .Job.TaskGroups[]
  | select(.Name == "cms")
  | .ReschedulePolicy.Attempts == 0 and .ReschedulePolicy.Unlimited == false
' "$tmp/cms.json" >/dev/null || fail "cms app doit rester non-reschedulable tant que /app/media est local"

echo "OK: CMS state split"
