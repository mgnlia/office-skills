#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-${API_URL:-http://localhost:3100}}"
LIMIT="${2:-400}"
OUT_DIR="${3:-tmp/office-diagnose-$(date -u +%Y%m%dT%H%M%SZ)}"
SERVICE="${RAILWAY_SERVICE:-ai-office}"

mkdir -p "$OUT_DIR"

printf 'generated_at_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUT_DIR/meta.env"
printf 'api_url=%s\n' "$API_URL" >> "$OUT_DIR/meta.env"
printf 'limit=%s\n' "$LIMIT" >> "$OUT_DIR/meta.env"
printf 'railway_service=%s\n' "$SERVICE" >> "$OUT_DIR/meta.env"

fetch_get() {
  local path="$1"
  local outfile="$2"
  local code
  code="$(curl -sS -o "$outfile" -w '%{http_code}' "${API_URL%/}$path" || true)"
  printf '%s\t%s\n' "$path" "$code" >> "$OUT_DIR/http-status.tsv"
}

: > "$OUT_DIR/http-status.tsv"

fetch_get "/api/health" "$OUT_DIR/health.json"
fetch_get "/api/agents" "$OUT_DIR/agents.json"
fetch_get "/api/tasks" "$OUT_DIR/tasks.json"
fetch_get "/api/settings" "$OUT_DIR/settings.json"
fetch_get "/api/logs?limit=${LIMIT}" "$OUT_DIR/logs.json"
fetch_get "/api/logs/summary" "$OUT_DIR/logs-summary.json"

if command -v jq >/dev/null 2>&1; then
  {
    echo "# Agent errors"
    jq -r '.data[]? | select(.type=="agent_error") | "\(.createdAt)\t\(.agentId // "-")\t\(.summary)"' "$OUT_DIR/logs.json" 2>/dev/null || true
    echo
    echo "# Task status counts"
    jq -r '
      [.data[]?.status] | group_by(.) | map({status: .[0], count: length}) |
      .[] | "\(.status)\t\(.count)"
    ' "$OUT_DIR/tasks.json" 2>/dev/null || true
    echo
    echo "# Agent status"
    jq -r '.data[]? | "\(.name)\t\(.status)\t\(.lastActiveAt // "-")"' "$OUT_DIR/agents.json" 2>/dev/null || true
  } > "$OUT_DIR/quick-summary.txt"
fi

if command -v railway >/dev/null 2>&1; then
  railway status > "$OUT_DIR/railway-status.txt" 2>&1 || true
  railway logs -n "$LIMIT" --service "$SERVICE" > "$OUT_DIR/railway.log" 2>&1 || true
fi

echo "$OUT_DIR"
