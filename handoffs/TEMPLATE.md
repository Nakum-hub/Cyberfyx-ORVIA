# Handoff — <task_id> — <lane> — <commit or document revision>

**Base commit:** <actual / unavailable>
**New commit:** <actual / not committed>
**Source master / hash verified:** <actual>
**Contract version:** <actual>
**Scope and profile:** <actual>

## Delivered

Exact changed paths and meaningful behaviour. Distinguish implemented code, proposed patch, reviewed document and observation.

## Commands actually executed

| Command | Exit code | Result | Artifact / environment |
|---|---|---|---|
| <actual command only> | <actual> | <PASS / FAIL / ERROR> | <actual path/profile> |

Tests not run: <IDs and reason>. No “should pass” presented as an execution.

## Acceptance

Test IDs and actual supporting artifacts. Denials/failure cases tested. Any expected broken-fixture result is labelled separately from the healthy suite.

## Contract / dependency / ownership changes

Exact changes requested or approved. Name producer/consumer tasks and migration/config implications. No ownership transfer is implied unless recorded.

## Remaining limitations and blockers

Severity, reproduction, responsible owner and required retest. Include any unverified product/hosting/security claim.

## Next integration action

Commit to review/merge, tests to rerun on integration, next dependency-ready task and required human approval.
