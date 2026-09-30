#!/usr/bin/env bash
set -euo pipefail
cd /qualification/repo
test "$(git rev-parse --show-toplevel)" = /qualification/repo
test "$(git rev-parse HEAD)" = bf29c436911d33cbbafcbb6ce7f6d04a5704a64d
# The source archive came from Windows; restore exact canonical bytes using Linux Git.
# This fresh checkout has no installation state and no user edits.
git restore --source=HEAD --worktree -- .
git diff --exit-code --quiet
bash installer/linux/orvia-install.sh --check --kind customer > /qualification/preflight-native.log 2>&1
node handoffs/codex/create-installer-trust-round4.mjs
set +e
bash installer/linux/orvia-install.sh --kind customer \
  --trust-file .local/qualification/vendor-public-keys.json \
  --no-systemd --unit-dir /qualification/units --service-user root \
  > /qualification/private-install.log 2>&1
result=$?
printf '%s\n' "$result" > /qualification/install.exit
printf 'Fresh installer exit=%s\n' "$result"
exit "$result"
