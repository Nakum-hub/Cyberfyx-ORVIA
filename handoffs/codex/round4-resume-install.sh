#!/usr/bin/env bash
set -euo pipefail
cd /qualification/repo
test "$(git rev-parse HEAD)" = bf29c436911d33cbbafcbb6ce7f6d04a5704a64d
git diff --exit-code --quiet
cp /qualification/private-install.log "/qualification/private-install-before-resume-$(date -u +%Y%m%dT%H%M%SZ).log"
set +e
bash installer/linux/orvia-install.sh --kind customer --resume \
  --trust-file .local/qualification/vendor-public-keys.json \
  --no-systemd --unit-dir /qualification/units --service-user root \
  > /qualification/private-install.log 2>&1
result=$?
printf '%s\n' "$result" > /qualification/install.exit
printf 'Resumed fresh installer exit=%s\n' "$result"
exit "$result"
