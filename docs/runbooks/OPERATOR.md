# ORVIA prototype operator runbook

**Owner:** Work (C01; successor to Cowork). **Revision:** r4 completion, 2026-09-16. **Inspected base:** `9bb8f2900909997f63db864eeea1211523aa5819` (PR20 documentation merge; runtime source unchanged from A05).

This procedure reflects the supplied source at that base. Work did **not** execute application setup, services, bootstrap, worker, agent or browser acceptance here. There is no frozen A07 candidate or completed rehearsal. Earlier r1/r2 runbooks remain in Git history. Accepted A00/A01 and contract 0.2.1 are distinct from present A02/A03/A04/A05 code and executable transport 0.4.0 (signed commands 0.3.0) awaiting review; PR #16's expiry correction is merged but not accepted by this document.

## Command provenance and status

Commands below are **SUPPLIED_SOURCE_INSPECTED**, not operator-verified on `rehearsal`. Exact entry points/options were checked against `package.json`, `scripts/dev.ps1`, `scripts/record.mjs`, `scripts/profile-init.mjs`, `scripts/auth-init.ts`, `scripts/auth-bootstrap.ts`, `scripts/machine-init.ts`, `scripts/seed-orders.ts`, `scripts/roles-init.ts`, `scripts/simulator-fixture.ts`, `scripts/assign-manual.ts`, `scripts/services.ts`, `scripts/web.ts`, and engineering A00/A01/A03/A04/A05 instructions at the inspected base. Effects are source descriptions, not results observed by Work. The evidence index retains all 221 supplied engineering command reports, including failures and dirty source identities; none is promoted to full scenario acceptance.

`MISSING` means the specific procedure/evidence is not supplied. `VERIFIED` requires an actual operator transcript, exit/result, exact candidate/profile identity and inspected artifacts; no current runbook step has that status.

## Environment, profile and credentials

Use the repository root in **PowerShell on the supplied Windows setup**, Docker Desktop already available, and the pinned workspace Node 24.21.0 / pnpm 12.4.2 toolchain (`infrastructure/toolchain.lock.json`). These are source requirements, not qualification of another host. Work's Python document tests on Linux do not qualify this runtime.

| Profile | App | PostgreSQL | OPA | Temporal | Database / Compose namespace |
|---|---:|---:|---:|---:|---|
| codex-a00 | 4310 | 55431 | 58181 | 57233 | orvia_codex_a00 / orvia-codex-a00 |
| ui-b00 | 4320 | 55432 | 58182 | 57234 | orvia_ui_b00 / orvia-ui-b00 |
| rehearsal | 4330 | 55433 | 58183 | 57235 | orvia_rehearsal / orvia-rehearsal |

Host listeners bind loopback. Never attach another lane's active store. Set the named profile in **every** terminal before running a command:

```powershell
$env:ORVIA_PROFILE = 'rehearsal'
```

The commands below select this profile; do not substitute a real customer profile or database. No profile was started by this Work session. Installation, reset, restore and fault operations still follow the existing named-profile/operator approvals; publication of this runbook does not authorize executing them against an active environment.

Generated passwords, tokens, signing keys and `auth/bootstrap.json` stay in ignored `.local/profiles/rehearsal/`. Read credentials only through the local operator's protected file access. Do not print, paste, commit or attach these files. Staff and principal sign in using **independent browser profiles/session stores**; another window in the same profile shares cookies. Keep privileged MFA and scoped authority requirements; do not bypass them to demonstrate an unfinished screen.

## Supplied setup sequence

Prerequisites: dedicated inactive synthetic profile, approved services, current checkout, sufficient resources. Stop on any nonzero exit and preserve the report before troubleshooting. Existing or partial profiles must be inspected, not overwritten.

| Order | Exact command, from repository root | Expected effect / limit |
|---|---|---|
| 1 | `.\scripts\bootstrap-tools.ps1` | Install the pinned local toolchain. |
| 2 | `.\scripts\dev.ps1 install --frozen-lockfile` | Install locked dependencies; do not update the lockfile. |
| 3, first use only | `.\scripts\dev.ps1 profile:init rehearsal` | Create profile identity and credentials; refuses existing/partial credentials. |
| 4 | `.\scripts\dev.ps1 services pull` | Pull pinned images. |
| 5 | `.\scripts\dev.ps1 services up` | Start this profile's containers; startup is not readiness. |
| 6a | `.\scripts\dev.ps1 roles:init confirm:rehearsal` | Create only allowlisted restricted roles before business migrations. Requires empty or matching synthetic profile; existing role secrets are preserved. It does not grant schema/table authority. |
| 6b | `.\scripts\dev.ps1 db:migrate` | Apply current versioned, checksum-checked migrations. |
| 7 | `.\scripts\dev.ps1 preflight` | Check supplied service protocols. |
| 8 | `.\scripts\dev.ps1 auth:init confirm:rehearsal` | Provision restricted auth/application roles and protected secrets after migrations. |
| 9 | `.\scripts\dev.ps1 auth:bootstrap confirm:rehearsal` | Create/resume the installation-bound owner bootstrap. |
| 10 | `.\scripts\dev.ps1 seed:auth confirm:rehearsal` | Create/resume Aster/Birch synthetic **identity** fixtures and authority scopes. |
| 11, after scoped configuration/mappings exist | `.\scripts\dev.ps1 machine:init confirm:rehearsal` | Enrol/renew worker, agent and separate sender identities for one hour; initialize isolated targets and only missing mapped memberships, preserving existing restrictions. |
| 11b, after approved order-service policy/mappings | `.\scripts\dev.ps1 seed:orders confirm:rehearsal` | Create expiring synthetic order conditions for approved mapped policies; writes protected `sender/orders.json`. Each invocation creates new conditions; not a full scenario reset or idempotent seed. |
| 12 | `.\scripts\dev.ps1 build` | Build current development web application. Does not freeze or qualify an A07 package. |

A05 requires `roles:init` **before** migrations that grant to those roles. Its existing-profile run is supplied; first-use qualification on a clean rehearsal profile remains A07. Stop on any installation/profile mismatch.

The identity seed is not a complete clean-start `aster-birch-v1` business scenario. Creating the intended purposes, notices, published policies, systems, mappings and queued attempts still needs A07's guarded, repeatable scenario procedure. Configuration/consent HTTP APIs and engineering integration tests exist; a test's private setup helper is not an operator seed/reset API. Do not invent a CLI or manually alter tables to fill that gap.

## Start and inspect

Use separate foreground PowerShell terminals, each with the profile environment set above:

| Process | Exact command | Scope |
|---|---|---|
| Web | `.\scripts\dev.ps1 start` | Requires successful build; current public page is foundation UI. |
| Worker | `.\scripts\dev.ps1 worker` | A03 dispatcher and Temporal worker; requires machine enrolment and services. |
| Restricted agent | `.\scripts\dev.ps1 agent` | A03 restricted poller; requires matching current enrolment. |

`worker`, `agent`, `start` and `dev` are **not** accepted commands for `scripts/record.mjs`; use the wrapper above. Do not silently turn a rejected record command into a supposed successful run. Machine identity renewal while processes are active requires Codex's verified lifecycle procedure; no transparent hot-reload claim is made.

Open `http://127.0.0.1:4330/` for the selected rehearsal profile. At this base it is a foundation page, not the designed `/workspace/*` or `/privacy/*` flows. `GET /healthz` supplies liveness (`{"status":"alive"}`), not workflow/auth/target health. `.\scripts\dev.ps1 services status` and `.\scripts\dev.ps1 preflight` inspect service state/readiness. Workspace/Privacy Centre sign-in, MFA enrollment screens, overview build display, target-check and export buttons remain Codex B-task work. Source auth APIs are present; do not claim missing authentication simply because UI is absent.

## Recording supplied engineering checks

`node scripts/record.mjs <allowlisted-task> [arguments]` records task, command, times, exit, profile, source commit, dirty flag, source-file hashes and log path. It requires the pinned local toolchain already installed. The producer sets `ORVIA_TASK_ID` to its **real A00–A07 task**; its default A00 is not permission to misattribute B-task, Work or rehearsal execution. Codex must supply the B-task/browser and packaged-rehearsal recorder.

Supplied allowlisted checks include `contracts:check`, `typecheck`, `lint`, `test`, `test:auth`, `test:consent`, `test:expiry`, `test:workflows`, `test:enforcement`, `test:evidence`, `tracking:check`, `hygiene:check`, `build`, `preflight` and `web:smoke`. These produce engineering reports, not automatic T01–T34 results. Preserve every failed run and its later correction at their original identities. `services:smoke` deliberately restarts this profile's PostgreSQL/Temporal for a bootstrap probe; run only in its approved isolated test context, never concurrently on a shared profile. It is not a full application recovery test.

Reports and logs are written under `handoffs/codex/artifacts/` with unique names. Index the original JSON and each required child log with SHA-256. Missing artifacts stay unavailable; a command name or zero exit alone is not an inspected assertion result. Secret-safe diagnostic review is still necessary before publication.

## Rehearsal and export gate

A07 must first supply a frozen commit, build ID, contract version, profile, fixture ID and scenario scope, verified clean-start instructions and seed/reset/export operations. B06 must supply matching browser evidence. These are currently **MISSING**.

For each actual run: record operator, a JSON starting-state artifact with kind `REHEARSAL_START_STATE`, rehearsal ID, all six candidate fields, a timezone-qualified `captured_at` no later than run start, and nonempty `documented_start`, all six candidate identity values, timezone-qualified start/end times, the 12 `DEMO_SCRIPT.md` steps and actual outcomes, issues, immutable log and any referenced media. Hash and inspect every required artifact. Use distinct run IDs/logs and nonoverlapping runs. Record planned, started, aborted, completed-with-issues and successful runs separately. Two inspected, successful, issue-free runs on the same final candidate from the documented starting state are needed for qualifying completion; a newer unsuccessful attempt requires correction and new successful runs. Recordings alone do not satisfy T30.

Application workflow evidence **API** export is supplied by A05: authenticated staff with evidence.export capability uses `GET /api/v1/admin/evidence/{workflow_id}/export`, replacing workflow_id with the actual scoped workflow UUID. It returns a JSON attachment with Cache-Control: no-store and records an audit event; view uses `GET /api/v1/admin/evidence/{workflow_id}`. B03 must supply the usable application button. Keep the original download bytes, exact candidate/profile/time and SHA-256 locally. Never paste a session cookie into a shell command or use a machine sender token as staff authority. Its `tests` array is currently empty: acceptance-result export/Test Lab is still MISSING (A06/B04). Existing engineering logs can be preserved now. Before any approved reset or recovery, export available evidence and record the location; if required export is unavailable, stop the destructive procedure. Never demonstrate from an untested replacement candidate or represent a document test as a rehearsal.

## Fault, recovery, reset and shutdown

| Operation | Current executable boundary / required owner |
|---|---|
| Simulator `UNAVAILABLE`, `APPLY_THEN_TIMEOUT`, `ACK_WITHOUT_EFFECT` | A05 protected commands below exist; producer tests inspected. Full T17–T19 candidate/browser qualification remains open. |
| Broken-control detection | A06/B04 must supply T24 normal control, actual deliberately broken FAIL and healthy rerun, all matching candidate identity. |
| Worker interruption/restart | A03 engineering test exists; exact packaged operator procedure and full T11 qualification still A06/A07. |
| Target-only restore into quarantine | A06, T25: no verified operator restore command supplied. |
| Outbound-network isolation and traffic capture | A06/A07, T26: bridge or loopback alone is not egress proof. |
| Full business-profile reset and seed guard | A06/A07, T28: no full reset command supplied. `reset:bootstrap` is bootstrap-only and refuses business migrations; it must not be used as the current business reset. No `down -v` or manual SQL replacement. |
| Development shutdown | Stop each owned foreground web/worker/agent terminal with Ctrl+C, then `.\scripts\dev.ps1 services stop` keeps volumes. This is the supplied development process arrangement; clean packaged lifecycle/recovery remains A07. |

## UI troubleshooting meanings

| Visible state | Operator interpretation and action |
|---|---|
| Decision unavailable | No usable authorization decision; do not authorize new processing. This does not prove an earlier request had no effect. |
| Outcome unknown | Reconciliation investigates an earlier command; never manually resend as a new request. |
| Your last request is unconfirmed | Preserve the exact request key/payload/epoch in the same-tab pending context; reauthenticate as the same principal and retry only that request. A reload that loses the context cannot claim recovery; see UX_BRIEF C00-R4-RECOVERY and F-024. |
| Test could not finish | Keep assertions, failures and artifacts already observed visible. An incomplete run does not become a PASS or erase a prior FAIL. |
| Manual action required / Cannot be observed | Preserve manual-statement and unavailable-observation labels; neither implies independently verified downstream completion. |
| Counts/build identity unavailable | Treat values as unknown, stop claim-bearing steps, preserve diagnostics and request Codex correction. Unknown is not zero. |

## Remaining inputs

Work requests Codex's C00 consumer cross-check; capability schema mapping (F-029); retained-request/reload mechanism and evidence (F-024); B00–B06 UI/browser work; and A06/A07 guarded recovery/reset/seed/acceptance-export/package instructions. Human review/merge and release approval remain separate. Exact requests and acceptance evidence are in `handoffs/work/C00-C02-r4-delivery.md`.

PR #17 supplied A04 send admission while this Work branch was in progress. Its command and assertion reports (initial FAIL, then 46-assertion PASS) were inspected at original source/build identities. `test:enforcement` mutates/stops/restores OPA in the isolated test profile; it was not executed by Work and is not a routine live-demo health check. No real messaging transport is implemented.

## A05 protected fixture operations

Working directory and profile: repository root, `$env:ORVIA_PROFILE = 'rehearsal'`. Prerequisites: separately approved isolated synthetic fault context; matching initialized target installation, current enrollment and the exact REST simulator mapping. These commands were read, **not executed by Work**. They set provider behaviour, never select a test result or create observation evidence.

Set the value below to the actual mapped resource UUID from the scoped configuration. The placeholder deliberately refuses to masquerade as a real fixture identity.

```powershell
$orviaResourceId = '<actual-enrolled-simulator-resource-uuid>'
.\scripts\dev.ps1 fixture:simulator confirm:rehearsal $orviaResourceId HEALTHY read
```

| Isolated test condition | Exact command | Expected source effect / limit |
|---|---|---|
| Known provider unavailable | `.\scripts\dev.ps1 fixture:simulator confirm:rehearsal $orviaResourceId UNAVAILABLE read` | Provider rejects before applying; inspect the actual receipt and independent read. |
| Apply, lose reply | `.\scripts\dev.ps1 fixture:simulator confirm:rehearsal $orviaResourceId APPLY_THEN_TIMEOUT read` | Target may change with an unknown command response; reconcile through a separate read. |
| Acknowledge without effect | `.\scripts\dev.ps1 fixture:simulator confirm:rehearsal $orviaResourceId ACK_WITHOUT_EFFECT read` | Receipt is not proof of effect; actual observation must expose the gap. |
| Read permission loss | `.\scripts\dev.ps1 fixture:simulator confirm:rehearsal $orviaResourceId HEALTHY deny-read` | Independent read unavailable; never substitute a successful read. |
| Restore normal provider behaviour | `.\scripts\dev.ps1 fixture:simulator confirm:rehearsal $orviaResourceId HEALTHY read` | Restores only fixture mode/read access. It does not reset target data, undo effects, repeat a prior command or prove a healthy rerun. |

Preserve evidence before changing modes. Stop if the exact resource/profile cannot be confirmed. A fresh approved starting state is still needed for each scenario; applying HEALTHY to an already restricted target is not a clean seed. No database/volume reset is authorized by these examples.

For the assigned-member manual step, set `$orviaWorkflowId = '<actual-scoped-workflow-uuid>'`, then `.\scripts\dev.ps1 fixture:assign confirm:rehearsal $orviaWorkflowId`. The source checks the installation, `aster-birch-v1` fixture and fixed member scope, assigns only that workflow and audits the assignment. It does not change the member role, tenant or observation. The assignee subsequently submits the actual statement and scoped evidence references through the application/API; assignment alone is not attestation.

A05 source/report intake is recorded in `docs/reviews/cowork/artifacts/c-completion/source-intake.json`. Earlier setup, migration and interrupted-run failures are retained alongside later results, with original source hashes and build IDs. A05 publication/merge is not full task acceptance or qualification of these commands on a new rehearsal profile.
