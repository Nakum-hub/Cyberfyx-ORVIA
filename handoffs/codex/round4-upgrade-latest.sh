#!/usr/bin/env bash
set -euo pipefail
cd /qualification/repo
export ORVIA_PROFILE=rehearsal ORVIA_WORKSPACE_ROOT=/qualification/repo
export NODE_EXTRA_CA_CERTS=/qualification/repo/.local/profiles/rehearsal/tls/ca-cert.pem
export NEXT_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 BETTER_AUTH_TELEMETRY=0
test "$(git rev-parse HEAD)" = 639d905bcd7f4861cd6bb02b0efe7e2919493dd4
test "$(git rev-parse r4-latest-target)" = e46babe40f4fa12cb42e1c6ef951bee2359bd4b1
git diff --exit-code --quiet
cp /qualification/private-upgrade.log /qualification/private-upgrade-639d905.log
cp /qualification/private-runtime.log /qualification/private-runtime-639d905.log
pnpm run -s services up > /qualification/latest-services.log 2>&1
bash installer/linux/orvia-upgrade.sh --to r4-latest-target --no-restart > /qualification/private-upgrade.log 2>&1
echo 'Latest-head upgrade exit=0'
