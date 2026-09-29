#!/usr/bin/env bash
# Upgrade an ORVIA installation to another release (a git tag or commit of this repository).
# Order: verified backup first, then code, dependencies, schema, build, restart.
# The previous release is recorded so orvia-rollback.sh can return to it.
# Usage: installer/linux/orvia-upgrade.sh --to <release-ref> [--no-restart]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
TO=""; RESTART=1
while [ $# -gt 0 ]; do case "$1" in --to) TO="$2"; shift 2;; --no-restart) RESTART=0; shift;; *) echo "Unknown option: $1" >&2; exit 2;; esac; done
[ -n "$TO" ] || { echo "Usage: $0 --to <release-ref>" >&2; exit 2; }
[ -r .local/installer/installation.json ] || { echo "No ORVIA installation recorded here (.local/installer/installation.json)." >&2; exit 1; }
PROFILE="$(node -p "require('./.local/installer/installation.json').profile")"; KIND="$(node -p "require('./.local/installer/installation.json').kind")"
export ORVIA_PROFILE="$PROFILE" ORVIA_WORKSPACE_ROOT="$ROOT"
PNPM="pnpm"; command -v pnpm >/dev/null 2>&1 || PNPM="$ROOT/node_modules/.bin/pnpm"
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Local changes to tracked files; refusing to upgrade over them." >&2; exit 1; }
CURRENT="$(git rev-parse HEAD)"
git rev-parse --verify --quiet "$TO^{commit}" >/dev/null || git fetch --tags origin "$TO"
TARGET="$(git rev-parse "$TO^{commit}")"
[ "$TARGET" != "$CURRENT" ] || { echo "Already at $TO."; exit 0; }
echo "== Backup before upgrade"
if [ "$KIND" = customer ]; then $PNPM run -s backup:drill "confirm:$PROFILE"; else echo "  (vendor installation: take a PostgreSQL backup of the vendor database with your platform tooling before continuing)"; fi
printf '{"previous_release":"%s","upgraded_to":"%s","at":"%s","migrations_before":%s}\n' "$CURRENT" "$TARGET" "$(date -u +%FT%TZ)" \
  "$(ls database/customer/migrations database/vendor/migrations | grep -c '\.sql$')" > .local/installer/last-upgrade.json
[ "$RESTART" -eq 1 ] && command -v systemctl >/dev/null 2>&1 && systemctl stop orvia-app.service 2>/dev/null || true
echo "== Code $CURRENT -> $TARGET"; git checkout --quiet "$TARGET"
echo "== Dependencies"; $PNPM install --frozen-lockfile
echo "== Schema (forward-only migrations)"
if [ "$KIND" = customer ]; then $PNPM run -s db:migrate; else node --import tsx scripts/vendor-init.ts confirm:vendor-a00; fi
echo "== Build"; $PNPM run -s build
if [ "$RESTART" -eq 1 ] && command -v systemctl >/dev/null 2>&1; then systemctl start orvia-app.service; fi
echo "Upgraded to $TO. Previous release $CURRENT is recorded for installer/linux/orvia-rollback.sh."
