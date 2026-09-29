# ORVIA project review and remaining delivery work — 28 September 2026

Task V1-RESUMPTION-REVIEW-01. Inspected merged source: `60f527d91779c654fbf66cf559ae02b65b3f7cb2`. Governing scope: immutable master revision 1.4 plus expansion E1. This is a repository-wide implementation/evidence inventory with targeted code review, not a claim to have dynamically tested every path or completed an independent security/legal assessment.

**ORVIA has substantially more implementation than the September 23–25 state documents describe, but it is not finished or release-qualified.** Rebuilding Claude's added features would waste work. The immediate need is to resolve concrete defects, reconcile the merged source, finish unsupported boundaries, and qualify an exact build.

The user confirmed Claude is testing the latest changes in its own cloud environment. Codex stopped overlapping feature/runtime work. Proposed contract generation, Windows credential-separation and scope-predicate changes are parked under `handoffs/codex/artifacts/V1-RESUMPTION-01-*`; they are not applied to application source. Claude's future GitHub update is not represented as already reviewed or passing here.

## What has been added

The base has scoped staff/principal authentication, MFA, policies/notices, durable withdrawal processing, restricted agent commands, synthetic target verification, privacy graph, rights, retention/holds, processors, incidents, audit/evidence, local licensing, support/update records and onboarding.

Claude's takeover adds general assessments with review/remediation; supplier links and agreements; GRC policy/issues/control tests; RoPA versions and chunked exports; redacted rights response packages; PostgreSQL classification and access exposure; SMTP/webhook transport; website consent and a one-page scanner; topic/channel preferences; readiness and backup/capacity tooling; credential separation; licensed team seats and first-login password replacement. Account deletion is present in the latest merged WIP commit and belongs to Claude's current verification lane.

Source entry points: `backend/domain/src/{assessments,third-party,grc,mapping,exports,rights,discovery,delivery,cmp,preferences,staff}/`, `backend/vendor/`, `connectors/src/`, `frontend/src/app/`, and migrations through `0062_staff_delete.sql`. The primary dated evidence account is [Claude's takeover handoff](../../handoffs/code/2026-09-26-expansion-takeover.md). Its passed counts are historical component claims, not this review's new runtime results.

## Findings, in priority order

| ID | Priority | Finding and consequence | Required action / lane |
|---|---|---|---|
| R01 | High | Preference ordering trusts client `observed_at`, permits up to five minutes in the future, and marks a choice effective only if its timestamp exceeds the previous effective choice. A valid future-dated opt-in can suppress a subsequently received opt-out. Source-confirmed logic; HTTP reproduction NOT_RUN in this review. | Claude latest-feature lane: use authoritative ordering/interaction concurrency while preserving delayed-event provenance; add skew, equal-time, replay and concurrent withdrawal cases. |
| R02 | High | Merged contract source is 0.40.0 while generated artifacts/seed remain 0.39.0. Contract check failed; typecheck reported four deletion-screen errors. | Claude latest-feature lane: regenerate all canonical outputs and verify its final merged build. Codex's generated patch is parked for reference. |
| R03 | High | The documented scope-predicate performance migration is absent. The proposed name `0062_typed_scope_predicate` now conflicts numerically with `0062_staff_delete`. Historical capacity results do not qualify 1M mixed workloads. | Coordinate a new unique migration number, execute isolation/adverse tests, capture actual plans and representative performance. A proposed 0063 SQL file is parked, not applied. |
| R04 | Medium | Credential separation matches `/backups/` and `worker/signing-key.pem` against native paths, so Windows backslashes break the intended exceptions. Customer TLS `tls/server-key.pem` is also rejected by the generic private-key marker check. | Claude latest-feature lane: exact profile-relative native-path handling and tests for customer keys versus misplaced vendor keys. Codex's proposed fix/test is parked and not claimed verified. |
| R05 | Medium | `scripts/package-candidate.ts` names the historical revision 1.3 master and omits E1 from release provenance. | **Corrected locally in this lane:** revision 1.4 hash verification plus expansion/register hashes, with four passing focused tests. No candidate package or release was produced. |
| R06 | Medium | No `.github/workflows` definition exists at the inspected base, so the repo has no checked-in Actions gate to catch R02 before merge. | **Implemented locally in this lane:** pinned, read-only static workflow. YAML validation passed; hosted execution and required-check configuration remain unperformed. |
| R07 | Medium | Main status/restart documents are stale. EX06/EX10 retain older limitations contradicted by later additions; EX13 understates the new standalone licence issuer. The 218-section index still has no reviewed requirement mappings. | Current review/checkpoint supplied; reconcile the canonical expansion register after Claude's next update, preserving acceptance status. No completion percentage is defensible yet. |
| R08 | Medium | `verify:suites` lists 27 original integration suites, while DPDP and expansion suites are separate. It is not a whole-product qualification command. | Create one explicit exact-build qualification manifest covering all required suites and missing full scenarios. Keep execution serialized per profile and bind every result to its run. |
| R09 | Validation blocker | The local migration attempt returned PostgreSQL `42P07` (duplicate relation). The migration runner wraps changes in a transaction and rolls back on failure. The conflicting object and upgrade cause have not been diagnosed. | Inspect local schema/migration history in a separately coordinated continuation. Do not reset the database or treat Claude's cloud result as proof that this upgrade path works. |

### R01 reproduction to add to Claude's tests

On an active topic/channel with its other prerequisites satisfied:

1. POST `OPTED_IN` with `observed_at = server-now + 4 minutes`; this is inside both application and database bounds.
2. POST a new `OPTED_OUT` with `observed_at = server-now`, using a fresh idempotency key.
3. In the current code, the second event is `effective=false`; `latestEffective` still selects the opt-in and the returned decision remains permitted.

Relevant source: `backend/domain/src/preferences/preferences.ts` (`latestEffective`, `recordOwnChoice`), `shared/contracts/src/expansion.ts` (`PreferenceChoice`), `database/customer/migrations/0059_preferences.sql`. Clock skew is enough; no elevated role or spoofed tenant is needed. Do not fix this by discarding provenance or allowing old grants to override a withdrawal. The base consent path already demonstrates server epochs and authenticated interaction concurrency.

## Remaining scope by expanded family

Every row also requires exact-candidate positive/adverse/end-to-end evidence. “Present” does not mean production qualified.

| Family | Present | Remaining implementation / qualification |
|---|---|---|
| EX01 Consent/preferences | Portal/staff preference views, topic/channel choices, purpose dependency, existing withdrawal workers | Resolve ordering defect; staff-assisted capture; website/SDK touchpoints; actual downstream propagation/readback and offline/restart coverage; connect preference decisions to delivery where applicable. |
| EX02 Website CMP | Banner/configuration, category controls, GPC handling, one-page scanner, synthetic browser cases | Install/package Chromium; supported browser/site matrix, larger allowed crawl scope, regional rule provenance/configuration and accessibility. No TCF certification or universal tracker interception claim. |
| EX03 Rights | Intake/identity/representation, synthetic correction/deletion, reviewed redaction and portal delivery | Named real-source retrieval and action adapters; per-copy/processor failures and holds; non-portal delivery where required; aged purge and correction-package scenarios; full merged lifecycle. |
| EX04 Discovery/classification | PostgreSQL catalog/value reads, deterministic rules, synthetic quality corpus | Supported real-source conformance; file/object/API adapters; source/code flow analysis; representative classification quality, permissions, bounded workload and restart/drift evidence. |
| EX05 Mapping/RoPA | Registry/graph links, locations/transfers, versions/diff, chunked export | Complete source-linked flows across actual integrations, stale/conflict review, whole-estate completeness, large export ceiling and aged purge, reviewed report content. |
| EX06 Impact assessments | Versioned templates, questions/answers, independent decision, findings and escalation | Reviewed reusable questionnaires/applicability, integration with actual controls and outcomes, full SDF/AI/PIA journeys and adverse candidate evidence. |
| EX07 Retention/holds | Rules, hold lifecycle, DPDP evaluation/approval/action runner | Supported real-copy deletion and independent readback; backup-copy obligations; crypto-erasure/key custody; restore restrictions, uncertain effects and hold races. Its register status OPEN does not mean there is no code. |
| EX08 Third parties | Agreements, due diligence, supplier links, tier/reassessment/remediation records | Actual processor/onward outcomes and transfer restrictions, evidence expiry at scale, supported supplier identity/integration cases. Attested results must remain distinct from observed outcomes. |
| EX09 Incidents/delivery | Breach tasks, reviewed messages, customer SMTP/webhooks and loopback tests | Customer-selected transport conformance, genuine failure/unknown/receipt handling, reviewed notification obligations/content, full incident-to-remediation and follow-up journey. |
| EX10 GRC/audit | Framework/control/risk, policies, issues, audit requests/reviews | Reviewed regulatory library and mapping adoption; complete auditor journeys; mitigation effectiveness; historical version/scope reproducibility and final adverse evidence. |
| EX11 Continuous controls | Database-backed runner, deterministic tests, alerts and history | External evidence probes and connector controls; deliberately broken actual controls; recovery, freshness, alert delivery and complete auditor reports. |
| EX12 Posture/AI governance | Non-model AI inventory/monitoring, PostgreSQL sensitivity/grant exposure | Broader supported-source exposure, current independent observations, policy/incident/assessment linkage and actual coverage. No model behavior or third-party data upload qualification. |
| EX13 Commerce | Separate payment core, signed-event handling, checkout reservation, tier catalogue and standalone licence issuer | Vendor Account identity/MFA/API/UI; provider-hosted checkout and sandbox conformance; approved prices/taxes/subscriptions/refunds; unknown-work reconciliation; payment-to-licence issuance; entitled downloads/support. Tiers 2/3 and tier/edition mapping remain unresolved in source docs. |
| EX14 Enterprise delivery | Local setup/supervision, readiness, same-host backup drill, signed development licences | SSO/SCIM/customer recovery; supported installer and separate portal/admin ingress; clean install/upgrade/rollback; off-host DR/key custody; production signing; representative 1M workload; accessibility/security/legal/supply-chain review; frozen candidate and human release decision. |

The connector execution registry currently offers synthetic records and manual handling. PostgreSQL discovery/classification exists as a separate bounded source path; this does not establish production CRM, messaging or general database erasure conformance. The vendor commerce core and standalone licence issuer are separate; their existence does not establish a paid-order-to-entitled-download journey.

## Evidence and status

Read-only counts and master hash are recorded in `handoffs/codex/artifacts/V1-RESUMPTION-01-status-inventory.json`.

- 14 expansion families: 11 BUILT_PENDING_REVIEW, 2 IN_PROGRESS, 1 OPEN; all 14 full-family acceptance statuses NOT_RUN.
- All 34 canonical application scenarios remain NOT_RUN.
- All 218 indexed master sections still have UNREVIEWED mappings. This is a traceability gap, not a claim that all 218 are unimplemented.
- The old 33-module register is scoped engineering history, not the expanded product's completion denominator.
- Newly executed before the lane clarification: 271/271 unit tests and full lint passed; contract check failed; typecheck failed on deletion route typings. The unit run used locally regenerated outputs, later parked. These results do not qualify the unchanged merged source or Claude's forthcoming update.
- Newly executed independent work: release-baseline tests 4/4; workflow YAML parsed. Further exact commands/results are recorded in the handoff.
- Full application, hosted CI, new candidate packaging, real providers, capacity and release qualification were not run by this lane. Local test containers started for the initial review were subsequently stopped; volumes/data were not reset.

## Order to finish

1. **Claude's current lane:** complete latest-change testing, close R01–R04 as applicable, publish its exact source/evidence. Review the resulting GitHub diff once available; do not overwrite its work from this older base.
2. **Codex independent lane:** integrate reviewed baseline/CI corrections and use this report to reconcile completion records. Fix the source-index tooling so future requirement mappings can be preserved and validated, then map requirement-level obligations to evidence.
3. **Customer integration work:** pick the pilot systems, implement named least-privilege adapters with independent observation, and reuse them across consent, rights, retention, discovery and posture. Keep unsupported effects explicit.
4. **Commerce/delivery work:** complete provider-neutral vendor identity, order/issuance/reconciliation/download flows; plug in the chosen provider and approved commercial rules. Never activate payment or substitute synthetic success.
5. **Enterprise work:** implement the approved identity/recovery/deployment matrix, remaining backup/copy obligations and broad discovery, then qualify upgrade, restore, accessibility, capacity and security on stated hardware.
6. **Release:** freeze one exact source/lockfile/schema/build; run T01–T34 plus expansion/DPDP full scenarios and required rehearsals; resolve independent assessments and request the human release decision on the concrete result.

Decisions still needed unless recorded elsewhere: pilot connector targets and allowed operations; payment provider and commercial catalogue/terms; customer IdP/recovery and deployment profile; real signing custody and reviewed legal content. No credentials or signing keys should be supplied in chat. Custom-model work remains DEFERRED_V2.
