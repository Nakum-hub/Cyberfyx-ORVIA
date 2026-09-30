#!/usr/bin/env bash
set -euo pipefail
cd /qualification/repo
test "$(git rev-parse HEAD)" = bf29c436911d33cbbafcbb6ce7f6d04a5704a64d
git diff --exit-code --quiet
git diff --cached --exit-code --quiet
# Rebuild only the copied Windows Git index, not source files or installation state.
git read-tree HEAD
git update-index --refresh > /qualification/index-refresh.log 2>&1
test -z "$(git status --porcelain --untracked-files=no)"
echo 'Linux Git index refreshed; tracked source remains exactly HEAD.'
