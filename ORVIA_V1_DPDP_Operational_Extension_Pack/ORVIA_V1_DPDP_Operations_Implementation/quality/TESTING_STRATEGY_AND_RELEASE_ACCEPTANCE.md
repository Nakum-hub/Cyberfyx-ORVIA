# Testing Strategy, Acceptance and Release Gates

## 1. Principle
Testing must prove the finished implementation, but the full suite must not be rerun after every source file or small code change.

The preferred approach is **code first in coherent implementation stages, then test at defined gates**. This reduces wasted compute/credits while retaining a strong release standard.

## 2. During coding — minimal checks only
During active coding, do not run the entire unit/integration/end-to-end/regression suite after every edit.

Use only low-cost, targeted checks when they are useful to prevent compounding obvious failures, for example:
- compile/build/typecheck for the touched package;
- lint for the touched package when the repository already uses it;
- one focused test for a risky migration, parser, state machine, or destructive operation;
- schema/migration validation when a migration is authored.

These checks are optional when the coding environment can safely proceed without them. They are not a repeated acceptance cycle.

## 3. Stage Gate A — coding complete
Run once after the implementation coding is materially complete and backend/frontend/integration wiring is in place:
- repository build/typecheck;
- new/changed unit tests;
- new/changed backend integration tests;
- frontend component/API integration checks as applicable;
- migration apply on a representative V1 test database.

Fix failures, then rerun only the failed/affected scopes until stable.

## 4. Stage Gate B — integrated functional validation
After Stage Gate A is green, run the required functional acceptance scenarios:

### Existing-data onboarding
Import a representative legacy dataset with mixed known/missing evidence. Preserve source references, do not fabricate consent/notice history, prove resumability and idempotent rerun.

### Multi-relationship Data Principal
Use one person with two relationship contexts (for example patient + employee). Prove context isolation and authorised linkage.

### Notice history
Publish v1, capture presentation, publish v2, and prove historical queries resolve the correct version.

### Consent withdrawal
Execute withdrawal, generate downstream actions, include one successful and one failing integration-test target, independently verify success, and keep failed work open with evidence.

### Rights request
Intake, verify authority, discover scope, execute supported actions, respect a recorded hold, verify results, and close only when unresolved targets are explicitly accounted for.

### Correction propagation
Propagate a corrected value to a supported target, verify target state, and surface unsupported targets honestly.

### Retention/erasure at scale
Evaluate a representative large fixture, separate eligible/blocked/unknown, dry-run, approve, batch execute, interrupt/resume, prove idempotency, and report verified/failed/inconclusive totals.

### Processor/data sharing
Map processor relationships, retrieve during rights scope, terminate relationship, create disposition tasks where configured, preserve history.

### Personal-data breach
Pin the active regulatory package, create applicable timers/tasks/communications evidence, and prove historical incidents remain pinned when a later package is activated.

### Regulatory update
Load package A, execute workflow, introduce approved package B, generate impact diff, activate according to effective date, and preserve historical A behavior.

### Applicability unknown
Omit a required fact and prove unresolved state is persisted, dependent destructive action is blocked, and no guessed value is stored.

### SDF mode
Prove non-SDF configuration does not receive mandatory SDF workflows; activate applicable/configured SDF capability and prove additional workflows/timers appear without destroying history.

## 5. Stage Gate C — final regression and non-functional validation
Run once when functional acceptance is green:
- full existing V1 regression suite;
- security/tenant-isolation tests;
- destructive-action authorization/idempotency tests;
- migration upgrade/recovery test according to repository release practice;
- bulk-operation performance/resumability tests;
- evidence integrity/history tests;
- production build/package verification.

If a failure is found, fix it and rerun the failed scope plus directly affected regression scope. Rerun the full suite again only when the failure was broad enough to make previous results unreliable or before final release if that is the repository's established release rule.

## 6. Definition of done
The extension is done only when:
- production implementation exists;
- schema/migrations apply successfully;
- required APIs/UI/jobs/connectors are integrated;
- authorization is enforced;
- audit/evidence is produced;
- Stage Gates A, B, and C pass;
- failure and partial-success behavior is proven;
- no placeholder/TODO controls a required path;
- no hard-coded/sample response stands in for the production path;
- existing V1 critical regression remains passing.

## 7. Prohibited completion claims
Do not report complete when only documentation/interfaces/types exist, UI is disconnected, migrations are unused, tests were not actually run, failures are hidden, target attempts are reported as verified success, or a mock/test adapter is presented as live production verification.

## 8. Release blockers
Release is blocked if:
- existing V1 critical regression fails;
- regulatory source package is unverified;
- destructive path lacks required idempotency/authorization;
- target failure is displayed as success;
- unknown legal/customer fact is defaulted silently;
- tenant isolation fails;
- historical evidence can be overwritten without audit/versioning;
- a required production path still depends on a stub/TODO/sample implementation;
- regulatory package integrity/versioning cannot be established.

## 9. Completion evidence
The final implementation result must record:
- tests actually run;
- exact pass/fail summary;
- acceptance scenarios executed;
- environment-dependent items not live-verified;
- migrations applied;
- known real limitations.

Do not rerun expensive suites merely to produce duplicate proof when the underlying build has not changed.
