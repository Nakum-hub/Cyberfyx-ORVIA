#!/usr/bin/env bash
# Privacy regression gate for the OPA policies (processing decision and staff authority).
# 1. The policy tests in tests/policy must pass against the real policies.
# 2. Each deliberate defect below is applied to a temporary copy of the policies; the same tests must then FAIL. A defect the
#    tests do not catch fails the gate, because a test suite that passes a broken withdrawal rule protects nothing.
# Runs the pinned OPA image (the one the installation uses) unless an `opa` binary is on PATH. Reads only; changes no files.
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE=openpolicyagent/opa@sha256:2de1e6619246955695b982d0bcb6c73bcee22aa34ff96f2455996616ec1d21c1
opa_test() { # $1 = directory holding policy/ and tests/
  local report="$1/opa-test-result.json" status=0
  if command -v opa >/dev/null 2>&1; then (cd "$1" && opa test --format=json policy tests) >"$report" 2>/dev/null || status=$?
  else docker run --rm -v "$1":/w:ro -w /w "$IMAGE" test --format=json policy tests >"$report" 2>/dev/null || status=$?; fi
  node scripts/policy-test-outcome.mjs "$report" "$status"
}
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
stage() { rm -rf "$work/case"; mkdir -p "$work/case/policy" "$work/case/tests"; cp -r backend/policy/processing backend/policy/admin "$work/case/policy/"; cp tests/policy/*.rego "$work/case/tests/"; }

stage
if opa_test "$work/case"; then echo "PASS healthy policies satisfy every privacy test"; else echo "FAIL healthy policies do not satisfy the privacy tests"; exit 1; fi

failed=0
mutate() { # name, file under policy/, sed expression
  stage; sed -i "$3" "$work/case/policy/$2"
  if cmp -s "backend/policy/$2" "$work/case/policy/$2"; then echo "FAIL defect '$1' could not be applied (the policy changed; update this gate)"; failed=1; return; fi
  if opa_test "$work/case"; then echo "FAIL defect '$1' was NOT caught by the privacy tests"; failed=1
  else
    local status=$?
    if [ "$status" -eq 2 ]; then echo "PASS defect '$1' is caught (expected regression detection)"
    else echo "FAIL defect '$1' did not produce usable failed-test evidence (OPA execution/evaluation error)"; failed=1; fi
  fi
}
mutate 'withdrawn consent still allows marketing' processing/decision.rego '/input.consent_state == "GRANTED"/d'
mutate 'an unresolved suppression is ignored' processing/decision.rego '/input.unresolved_suppression == false/d'
mutate 'a restored, quarantined installation may send' processing/decision.rego '0,/input.quarantined == false/{/input.quarantined == false/d}'
mutate 'the default decision allows' processing/decision.rego 's/default decision := {"decision":"BLOCK"/default decision := {"decision":"ALLOW"/'
mutate 'an expired service condition still sends' processing/decision.rego '/input.service_condition_current == true/d'
mutate 'owner approvals without MFA' admin/authorization.rego '/input.role == "ORG_SUPER_ADMIN"$/{n;d}'
mutate 'an administrator may release rights responses' admin/authorization.rego 's/admin_caps := {"staff.manage"/admin_caps := {"rights.release", "staff.manage"/'
mutate 'an auditor may write' admin/authorization.rego 's/input.capability in read_caps | export_audit_caps/input.capability in read_caps | export_audit_caps | admin_caps/'
exit $failed
