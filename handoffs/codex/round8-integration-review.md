# Round 8 serial integration evidence review

Progressive read-only review of the running frozen-alpha qualification. The reviewer did not execute suites or use runtime resources. Source/log reads and this report are the only work. Candidate: `261af33271aec3635b9415e38e7104be5281da71`; Next build: `fNbDrvmLMhoCFiUKQTohf`. Authoritative command/exit evidence: `artifacts/R8-frozen-alpha-integrations.jsonl`; each record links its complete log. Assertion counts below come from the linked A00 JSON artifacts, not inferred from exit status or console PASS lines.

Final frozen-alpha ledger: all 40 executed, 34 exit 0 and 6 exit 1. There are 1263 outer suite assertions/checks: 1258 PASS and 5 FAIL (includes vendor's 112 recorded results and web's three named smoke checks). The regression artifact additionally nests six protected-runner assertions, three PASS and three FAIL; counted separately to avoid mixing levels. Suite 14 failed before recording assertions; suite 24 failed its module-entry prerequisite before producing an assertion artifact. Neither is accepted. Reviewer execution remains NOT_RUN; this reviews root's actual evidence.

| Order | Integration suite | Assertions | Failed assertions | Exit |
|---|---|---:|---:|---:|
| 01 | operations/backup-obligations | 22 | 0 | 0 |
| 02 | expansion/policy-discovery | 30 | 0 | 0 |
| 03 | operations/notice-language-drift | 20 | 0 | 0 |
| 04 | consent/canaries | 24 | 0 | 0 |
| 05 | consent/canary-retirement | 14 | 0 | 0 |
| 06 | onboarding/owner-recovery | 26 | 0 | 0 |
| 07 | onboarding/real-principals | 25 | 0 | 0 |
| 08 | ai-governance/model-versions | 21 | 0 | 0 |
| 09 | consent/consent | 50 | 0 | 0 |
| 10 | consent/expiry | 87 | 0 | 0 |
| 11 | discovery/catalog-flow | 14 | 1 | 1 |
| 12 | discovery/schema-drift | 10 | 0 | 0 |
| 13 | enforcement/withdrawal-timing | 12 | 2 | 1 |
| 14 | evidence/evidence | 0 | 0 | 1 |
| 15 | expansion/audit-mandate | 102 | 0 | 0 |
| 16 | expansion/classification | 29 | 0 | 0 |
| 17 | expansion/cmp | 45 | 0 | 0 |
| 18 | expansion/delivery | 41 | 0 | 0 |
| 19 | expansion/grc-lifecycle | 75 | 0 | 0 |
| 20 | expansion/impact | 41 | 0 | 0 |
| 21 | expansion/preferences | 45 | 0 | 0 |
| 22 | expansion/ropa-exports | 58 | 0 | 0 |
| 23 | expansion/third-party | 43 | 0 | 0 |
| 24 | grc/http | 0 recorded | 0 recorded | 1 |
| 25 | monitoring/restore | 33 | 0 | 0 |
| 26 | notices/languages | 19 | 0 | 0 |
| 27 | onboarding/imports | 31 | 0 | 0 |
| 28 | operations/applicability | 1 | 1 | 1 |
| 29 | operations/consent-withdrawal | 38 | 0 | 0 |
| 30 | operations/correction | 12 | 0 | 0 |
| 31 | operations/notices | 15 | 0 | 0 |
| 32 | operations/organisation-intake | 44 | 0 | 0 |
| 33 | operations/processors | 14 | 0 | 0 |
| 34 | operations/regulatory | 32 | 0 | 0 |
| 35 | operations/rights | 26 | 0 | 0 |
| 36 | operations/runner | 10 | 0 | 0 |
| 37 | regression/regression | 20 outer; 6 nested | 1 outer; 3 nested | 1 |
| 38 | rights/portal | 19 | 0 | 0 |
| 39 | vendor/audit-practice | 112 | 0 | 0 |
| 40 | web | 3 named smoke checks | 0 | 0 |

Vendor result artifact: `handoffs/code/artifacts/audit-practice-2026-10-01T13-09-54-974Z.json` (the suite's existing output directory differs from codex). Web artifact records three strings plus overall PASS, not per-check result objects. The completed final-five logs and JSON artifacts support these counts; no console-only count is substituted.

## Controls actually evidenced

- Backup obligations: read-only recording denied; administrator approval/re-erasure denied; restricted administrator still sees true attention counts; repeat re-erasure confirmation refused; immutable treatment facts/live ledger deletion refused. Its older-backup test precedes ledger purge; it does not establish restoration coverage after historic ledger purging.
- Policy discovery: read-only request/review denied, another tenant excluded, declared unapproved origin and third-party tracker not contacted, only home/policy documents read, disabled site refused, completed text/delete immutability controls.
- Notice drift: another tenant excluded and read-only report allowed; changed scope requires explicit acknowledgement and translation state remains independently tracked.
- Canaries: administrator/auditor sensitive reads denied, foreign tenant excluded, same decoy registration refused. Retirement: administrator/auditor/foreign tenant retirement denied and identical idempotency key returns the exact retired record; pending/activated synthetic decoys exercised.
- Owner recovery: app-role read/issue denied; administrator/unknown emails refused; five wrong attempts lock the code; expired/used codes refused; successful recovery replaces password, clears authenticator/sessions and retains exactly one owner; HTTP cookies/foreign origin refused. Scratch cleanup is evidenced.
- Real principals: before-admission real addresses refused, synthetic labelling enforced, app-role admission/table mutation denied; signed-record reference/time after admission and real/synthetic relabelling denials; HTTP pre-admission refusal. No real customer records were involved.
- Consent: auditor authoring denied; control-map pagination preserves all scoped mappings; replaying an old grant returns the old receipt and cannot reactivate; foreign tenant receipt denied. Expiry covers committed publication/grant/withdrawal replay after expiry, immutable business-row counts and new-key consumed-interaction denial.
- Catalog/schema drift: catalog registration member/foreign-tenant approval/read denials passed before the failure; schema-drift foreign target/observation exclusion passed. Remaining catalog controls beyond initial observation were not reached.
- Withdrawal timing: all 20 sends after completed withdrawal refused; controls while consent stood admitted; re-grant does not silently restart while suppression unresolved; five independently verified downstream effects. Supervised runner wake control failed.
- Audit mandate: out-of-engagement scope and read-only drafting/approval refused; self-approval refused; unknown engagement refused; replayed delivery retains its original receipt without duplicate storage; lost response stays UNKNOWN; ended mandate cannot resume; direct staff key/mandate/delivery access denied. Seeded samples and second-person file/package approval controls passed. These are actual log assertions, not assumptions from the 102 total.
- Classification: unapproved target and administrator lacking connection authority sampling denied; auditor reads but cannot request/label; foreign tenant excluded; complete-run/label/quality immutability controls passed.
- CMP: unauthorized connection/publication/self-publication denied; invalid categories/banner versions denied; scans outside approved origins denied; auditor writes and foreign-tenant reads denied; consent records/published banner/origin immutability controls passed. These suite totals do not replace separate database grant/RLS review or the three-engine browser qualification.
- Delivery: loopback SMTP/webhook controls passed for backoff retry, handed-over timeout as UNKNOWN effect, possible duplicate identity, missing credentials as final, withdrawn message never sent, administrator key read denial and one-time key reveal. Suite runtime was 21m01.415s from its exact command ledger; this duration remains evidence and is not silently shortened by changing budgets or skipping cases.
- Operations consent withdrawal: administrator lacking executor/member execution/export denials passed; missing grant stays UNKNOWN; single propagation run, independent target verification, timeout-as-UNKNOWN/readback resolution, settled replay applies nothing twice, verified-action regression to pending refused, interrupted dispatch reconciled by target replay; old withdrawals repaired once and newer grants respected. Correction independently verified both automated targets.

## Concrete failures and coverage boundaries

1. **Catalog-flow, suite 11:** artifact `A00-catalog-discovery-flow-1790855381646-ad2ce425-0eb5-4a47-93c5-4bf00d1d2c22.json` failed in `worker observation`. Assertion 14 was `independent metadata observation persisted`, expected `OBSERVED_METADATA`, actual undefined. The preceding global `processed>=2` control passed. Source calls one bounded `sweepCatalogDiscovery`, then assumes its own new target was among those processed. Sweep orders never-run first, then `next_run_at,target_id`, LIMIT 10 per scope. Existing pending jobs consuming that batch is a source-supported hypothesis, requiring job metadata to prove. Safe diagnostics are empty; do not attribute this to Temporal: this path calls `workflowActivities()` directly, which establishes DB pools without connecting Temporal.
2. **Withdrawal timing, suite 13:** post-withdrawal admission measurements p50 122 ms / p95 165 ms / max 181 ms, 20 cycles, passed. Five downstream effects had p50 39373 ms / max 45733 ms with the synthetic basis stated. The supervised runner never achieved suppression during its 25-second observation; measured 25100 ms and actual `[false,false,...]` versus expected `[true,true,...]`. The JSON includes the failing assertion plus an exception row (2 failures); only one console FAIL assertion appears. The security agent is investigating the runner cause; no cause is established by timing alone.
3. **Evidence, suite 14:** full log proves `NativeConnection.connect` failed at `127.0.0.1:57233` with connection refused while starting `services/worker/src/main.ts`; observation HEALTHY subsequently timed out. Required Temporal dependency was absent. This is a concrete environment/setup failure, not a passing regression control. The suite still requires a new evidence run with its dependency present.
4. **GRC HTTP, suite 24:** module-entry check at tests/integration/grc/http.test.ts:21 rejects missing/invalid `ORVIA_GRC_OPA_PORT`. Log proves the independently owned local OPA prerequisite was not supplied. No business assertions or suite artifact were produced. It requires its independent policy service and a retained fresh run.
5. **Applicability, suite 28:** `A00-operations-applicability-1790858661051-e5c7e435-1d69-404f-be29-658b874aadca.json` contains one failing exception assertion before business checks. `Synthetic admin login failed` originated at HttpFixture.login:66, safe diagnostic `AUTH_STAFF / Error / UNCLASSIFIED`, request `9a5260a6-3cb6-42e2-b508-69cd2dfee793`. The underlying authentication/database/transport cause is not established by that safe code; do not call this OPA failure or conflate it with the missing services above.

## Minimal dependency manifest for the selected suites

`B` = existing synthetic PostgreSQL plus qualification loopback proxy plus ordinary authorization OPA. Ordinary HTTP suites start/stop their own Next process via HttpFixture. Records adapters, observer pools and scratch/customer/vendor databases below reside on that PostgreSQL service: no separate records, S3 or SMTP container is required. Database roles, machine enrolments and target fixtures must already be initialized.

| Suite | Minimal dependencies beyond B |
|---|---|
| ai-governance/model-versions | None |
| consent/canaries | None; declares SMTP transport metadata, does not deliver through an external SMTP service |
| consent/canary-retirement | None |
| consent/consent | None |
| consent/expiry | None |
| discovery/catalog-flow | `_targets` database and enrolled read-only observer/worker pools; direct sweep, no Temporal connection |
| discovery/schema-drift | Same observer/target DB; direct sweep, no Temporal |
| enforcement/withdrawal-timing | `_targets` records adapter; direct operations runner and one owned runner child; no Temporal |
| evidence/evidence | **Temporal at synthetic profile port 57233/namespace**, `_targets`; owned worker and agent child processes |
| expansion/audit-mandate | Vendor scratch DB/profile; vendor handlers invoked through suite-owned transport, no external audit endpoint |
| expansion/classification | `_targets` fixture tables and observer pool; direct sweep, no Temporal |
| expansion/cmp | Local Chromium binary/process, suite-owned ephemeral loopback site/tracker servers |
| expansion/delivery | Suite-owned ephemeral loopback SMTP and webhook sinks; direct operations runner |
| expansion/grc-lifecycle | Direct operations runner; no extra service |
| expansion/impact | None |
| expansion/policy-discovery | Local Chromium binary/process, suite-owned loopback site/policy/tracker servers |
| expansion/preferences | None |
| expansion/ropa-exports | `_targets` observer pool/direct catalog sweep; no Temporal |
| expansion/third-party | None |
| grc/http | **Independent OPA address via ORVIA_GRC_OPA_PORT**, must be integer 1024–65535 and must not be 58181; suite-owned HTTP server/scratch DB |
| monitoring/restore | Same-PG synthetic target fixtures; no backup/S3 service |
| notices/languages | None |
| onboarding/imports | None |
| onboarding/owner-recovery | Approved PG Docker exec, suite-created scratch DB; no extra service |
| onboarding/real-principals | Approved PG Docker exec, suite-created scratch DB; no extra service |
| operations/applicability | None |
| operations/backup-obligations | `_targets` records adapter/direct operations runner; no backup/S3 service |
| operations/consent-withdrawal | `_targets` records adapter/direct operations runner; no Temporal |
| operations/correction | `_targets` records adapter |
| operations/notice-language-drift | None |
| operations/notices | None |
| operations/organisation-intake | Direct operations runner; no external intake service |
| operations/processors | None |
| operations/regulatory | Vendor release-signing fixture environment (runner supplies it), no external signer |
| operations/rights | `_targets` records adapter |
| operations/runner | `_targets` records adapter/direct operations runner; no Temporal |
| regression/regression | **Temporal at synthetic profile port 57233/namespace**, `_targets`; protected CLI starts owned worker and agent children through scripts/regression-runner.ts:66 |
| rights/portal | None |
| vendor/audit-practice | Vendor profile/keys and suite-created scratch vendor DB; in-process vendor handlers, no ordinary customer Next process; existing auth rate-limit waits remain |
| web | Owned Next start process only beyond B |

The shared runner supplies release/licence/audit development signing fixtures only to test processes; HttpFixture strips private signing variables when starting the customer application. No production connector, production custody or external legal/audit acceptance is established by these synthetic suites. The frozen matrix, RLS/init reruns, mutation gate, pagination/immutable timestamp regressions and transitive unselected integration/security suites retain their separate evidence requirements.

Pagination evidence is bounded: the executed consent suite explicitly follows control-map cursors at limit 7 and its preservation assertion passed. Executed backup/canary/consent/expiry source uses allPageList for filtered ledger/hit and own-record searches, but their existing artifacts do not record individual page counts. A passing search alone does not prove its own record resided beyond page one; the separate deterministic pagination fixtures and later-page denial unit controls provide that evidence. This report does not infer it from the long-lived profile's size.

Source-only prerequisite patch proposal: `round8-integration-prerequisites.patch`, not applied/executed. It retains the full suite manifest and existing assertions, starts the fixed existing Temporal container and a new relay exposing only 57233 just before each evidence or regression suite, then stops that service/removes only its new relay; creates an independently owned OPA only for grc/http and stops/removes that new container afterward. Existing base PG/OPA/proxy and Temporal volume remain untouched. Old Compose labels/network membership, stopped ownership, namespace and available host port are prerequisites; uncertain ownership fails setup rather than borrowing a foreign service. Temporal SDK is resolved from its worker workspace, and namespace RPC readiness is bounded with the installed Connection.withDeadline declaration. Root must verify/apply after the frozen battery.

6. **Regression, suite 37:** outer artifact `A00-regression-integration-1790859923971-16ddcbbc-a932-4fe0-a995-c16215084acd.json` records 19 outer PASS and one outer FAIL: healthy result expected PASS, actual FAIL. Its six nested real assertions have three failures: durable workflow expected COMPLETED stayed ACCEPTED, independent read restriction expected true was false, observation method expected SCOPED_READ was undefined. Policy ALLOW/BLOCK and blocked-send count controls passed. The source starts worker and agent children and explicitly lists Temporal as a dependency; absent Temporal is a concrete prerequisite gap shared with suite 14 and consistent with stalled workflow, but this run's child stderr was not retained, so this artifact alone does not prove its underlying connection error. Requalify with the dependency rather than call its failed healthy scenario a successful fault-detection control.
