#!/usr/bin/env bash
set -euo pipefail
cd /qualification/repo
export ORVIA_PROFILE=rehearsal ORVIA_WORKSPACE_ROOT=/qualification/repo
export NODE_EXTRA_CA_CERTS=/qualification/repo/.local/profiles/rehearsal/tls/ca-cert.pem
export NEXT_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 BETTER_AUTH_TELEMETRY=0
phase="${1:?runtime, setup, stop, upgrade or verify}"
case "$phase" in
  runtime) exec node --import tsx scripts/app-run.ts confirm:rehearsal > /qualification/private-runtime.log 2>&1 ;;
  setup|verify) node --import tsx handoffs/codex/qualify-first-run-round4.mjs "$phase" > "/qualification/private-$phase.log" 2>&1 ;;
  worker) node --import tsx handoffs/codex/diagnose-worker-round4.mjs > /qualification/private-worker.log 2>&1 ;;
  stop)
    node --import tsx scripts/app-stop.ts confirm:rehearsal
    for attempt in $(seq 1 60); do
      if [ ! -e .local/profiles/rehearsal/supervisor/run.json ]; then exit 0; fi
      sleep 1
    done
    echo 'Supervisor did not complete its owned shutdown' >&2; exit 1 ;;
  upgrade)
    test "$(git rev-parse HEAD)" = bf29c436911d33cbbafcbb6ce7f6d04a5704a64d
    test "$(git rev-parse r4-upgrade-target)" = 639d905bcd7f4861cd6bb02b0efe7e2919493dd4
    bash installer/linux/orvia-upgrade.sh --to r4-upgrade-target --no-restart > /qualification/private-upgrade.log 2>&1 ;;
  *) echo 'Unknown phase' >&2; exit 2 ;;
esac
printf '%s exit=0\n' "$phase"
