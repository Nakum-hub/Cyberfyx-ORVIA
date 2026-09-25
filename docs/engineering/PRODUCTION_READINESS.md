# ORVIA Version 1 production readiness

**Status (25 September 2026): BUILD_IN_PROGRESS — NOT_RELEASE_QUALIFIED.** The approved product baseline is the repository root revision 1.4 master. The former prototype sprint plan and its acceptance checklist are historical evidence, not the current delivery scope.

## What `NOT_RUN` means

`tracking/acceptance.json` contains 34 complete application scenarios (T01–T34). `NOT_RUN` means the scenario has not been executed in full, with reviewed evidence, against one identified and frozen candidate. Unit tests, isolated integration suites, and browser subsets are useful engineering evidence; they do not automatically satisfy every step of an acceptance scenario. Changing a label without executing the scenario would make the release record false. The historical checklist in `docs/prototype/RELEASE_CHECKLIST.md` preserves the original gate.

## Active release gates

| Gate | Required evidence | Current status |
|---|---|---|
| V1 capability completion | Each non-V2 module in `tracking/capabilities.json` implemented, reviewed, and traced to the revision 1.4 master | OPEN: partial and unimplemented modules remain |
| Actual customer integrations | Named provider, permitted operation, credentials, scoped readback, failure behavior, and contract tests for each claimed connector | OPEN: runtime targets are synthetic |
| Organisation scale | At least 1,000,000 total records per organisation through ingest, processing, export, recovery, and concurrent use on stated hardware | OPEN: only an isolated 1M-row indexed query probe has passed; see `CAPACITY_1M.md` |
| Application acceptance | T01–T34, plus all new V1/DPDP scenarios, executed on a frozen candidate with assertion-level artifacts | OPEN: T01–T34 remain `NOT_RUN` |
| Security and privacy | Independent threat assessment and penetration test, dependency and secret review, tenant and role isolation, customer-local data/egress evidence | OPEN: qualification not recorded |
| Operations and recovery | Clean install and upgrade, backup/restore, monitoring, incident handling, retention, rollback, supported hardware, failure drills | OPEN: full production exercise not recorded |
| Supply and licensing | Production signing/key custody, update provenance, commercial provider/terms and licence behavior as applicable | OPEN: provider and signing decisions unresolved |
| Candidate and sign-off | Immutable source/lockfile/build identity, repeatable acceptance on that exact build, human release approval | OPEN: frozen candidate not identified |

## Rules for status changes

1. Record an exact build/contract/database version, environment, command, exit code, artifact path, reviewer, and observed behavior. Keep failures and partial results.
2. Mark a scenario `PASS` only when its entire expected behavior ran on the candidate, including denial and failure branches. Use `FAIL` for an observed violation and `NOT_RUN` for unexecuted steps.
3. Re-run affected scenarios after code, schema, dependency, or deployment changes. An old passing artifact never qualifies a new candidate by itself.
4. Keep synthetic fixtures restricted to development and tests. Production claims name the real supported boundary and its evidence. Never substitute synthetic success for a missing provider.
5. Release requires human authorization after the evidence and known limitations are reviewable. The phrase “production-intended” describes the goal, not a certification.
