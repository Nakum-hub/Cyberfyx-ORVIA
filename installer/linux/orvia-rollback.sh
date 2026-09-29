#!/usr/bin/env bash
# Roll an installation back to the release recorded before the last upgrade.
# Schema migrations are forward-only. If the upgrade applied new migrations, the
# old code would run against a newer schema; that is refused here and the
# database must instead be restored from the backup taken before the upgrade
# (docs/engineering/linux-installer.md, "Rollback across a schema change").
# Usage: installer/linux/orvia-rollback.sh [--no-restart]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
RESTART=1; [ "${1:-}" = "--no-restart" ] && RESTART=0
[ -r .local/installer/last-upgrade.json ] || { echo "No upgrade recorded; nothing to roll back." >&2; exit 1; }
PROFILE="$(node -p "require('./.local/installer/installation.json').profile")"; KIND="$(node -p "require('./.local/installer/installation.json').kind")"
PREVIOUS="$(node -p "require('./.local/installer/last-upgrade.json').previous_release")"
export ORVIA_PROFILE="$PROFILE" ORVIA_WORKSPACE_ROOT="$ROOT"
PNPM="pnpm"; command -v pnpm >/dev/null 2>&1 || PNPM="$ROOT/node_modules/.bin/pnpm"
# Migrations present in the current code but not in the previous release.
NEW="$(git diff --name-only --diff-filter=A "$PREVIOUS" HEAD -- database/customer/migrations database/vendor/migrations | grep '\.sql$' || true)"
if [ -n "$NEW" ]; then
  echo "Refusing code-only rollback: the upgrade added schema migrations:" >&2; echo "$NEW" | sed 's/^/  /' >&2
  echo "Restore the database from the backup taken before the upgrade, then run this again with the same release." >&2; exit 1
fi
[ "$RESTART" -eq 1 ] && command -v systemctl >/dev/null 2>&1 && systemctl stop orvia-app.service 2>/dev/null || true
git checkout --quiet "$PREVIOUS"
$PNPM install --frozen-lockfile
$PNPM run -s build
[ "$RESTART" -eq 1 ] && command -v systemctl >/dev/null 2>&1 && systemctl start orvia-app.service || true
echo "Rolled back to $PREVIOUS ($KIND installation, profile $PROFILE)."
