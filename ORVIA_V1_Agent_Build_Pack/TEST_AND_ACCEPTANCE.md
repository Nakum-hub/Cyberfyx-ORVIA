# ORVIA — Test strategy and acceptance specification

**Product:** ORVIA Version 1 · **Build-pack edition:** 1.0 · **Prepared:** 19 September 2026  
**Authority:** [Approved master, document revision 1.4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md) · **Repository baseline:** `5a07649e5115995406e62de00b73e2c9fc560060`  
**Purpose:** Executable acceptance expectations for extending the fragment and qualifying the complete supported product.

This is an implementation specification, not evidence of completed software. `REQ` denotes a source-derived requirement, `OBS` a repository observation, `DESIGN` a proposed implementation detail, and `OPEN` a decision requiring its named owner. Exact technical shapes not supplied by the master are labelled design proposals; they do not silently become product or legal facts. Follow [Agent build rules](AGENT_BUILD_RULES.md).

## 1. Evidence truth and test namespaces

All tests in this pack start **NOT_RUN_IN_THIS_PACK**. Existing prototype reports apply only to their recorded commit/profile/scenario. The inspected current commit reports static/unit checks but not Docker integration/E2E; do not inherit an ancestor's complete qualification automatically.

Use **MASTER:T01** etc. for source §217 cases and **PROTO:T01** etc. for any old prototype board. The same short identifier in two documents does not mean the same scenario. Keep the source's 164 acceptance rows and names; 18 `AI-xx` cases are deferred model tests and other mixed cases retain explicit V1/V2 applicability notes. Do not count deferred/not-run tests as passed. Guidance-only checks apply when the optional helper is shipped, while independence/absence/privacy checks apply regardless.

This file preserves the complete active §217 text below, including its scope notes and updated SUP-07 exclusion. It is an immutable reference to source semantics, not a second status board. Record execution in the existing candidate/test evidence mechanism and link it back.

## 2. Test layers and responsibility

| Layer | Tests | Primary roles |
|---|---|---|
| Unit/property | State transitions, epoch monotonicity, constraints, pure policy/claims/import validation | Feature author; D18 conventions |
| Contract | Canonical schema generation, old/new clients, signed envelopes, strict errors | D02/D04/D06/D15 + D18 |
| Integration | Real isolated PostgreSQL/Temporal/OPA, adapters, commit/outbox, restart | D02/D05/D06/D07/D08 |
| Product privacy tests | Synthetic customer-facing test definitions and actual control assertions | D18/D04/D06 |
| Browser/accessibility | Whole journeys, permitted/error/partial/stale states, keyboard and network boundary | D09/D10/D11/D18 |
| Security | Tenant/authority denial, malformed input, secrets, SSRF/upload, command and diagnostic isolation | D14/D15 with independent review |
| Deployment/recovery | Clean ZIP install, offline dependencies, migration, safe restore and upgrade | D16/D17/D20 |
| Performance/fault | Representative load, contention, target slowdown, pool/spool/disk pressure | D19/D17 |
| Legal/claims/collection | Reviewed packs, contact data inventory, appropriate product claims | Qualified reviewer + product owner, not automated pass alone |

The product's Privacy Test Engine does not replace internal QA. A synthetic regression detector catching a deliberate bypass records control FAIL and detector success as separate facts. Source: [§57](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-57), [§58](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-58), [§59](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-59), [§119](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-119), [§120](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-120), [§125](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-125), [§126](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-126), [§127](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-127), [§128](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-128), [§163](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-163), [§217](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-217).

## 3. Safe fixture and environment rules

Use fictional organisations/principals and isolated resource namespaces. Do not share presentation/development/customer databases, volumes, ports, keys, connector leases or result paths unknowingly. Never run a destructive script merely because it is named test/reset. Inspect commands and prove their target scope first.

Fixtures may support allowed/denied/expired/ambiguous identities, stale/new consent, changed generation, lost acknowledgements, unsupported connectors, corrupted files and restored snapshots. Do not remove safety checks to speed tests or use a production credential. Store credentials locally and keep raw sensitive traces out of shared artifacts. Scoped synthetic canaries establish tested paths, not an absolute no-leak proof.

## 4. Detailed additional implementation scenarios

The `BUILD-xx` scenarios below elaborate source acceptance; they do not replace MASTER cases or claim execution. Expected outcomes are behaviour assertions, not generated screenshots.

| ID | Setup and stimulus | Assert in authoritative state and interface | Evidence |
|---|---|---|---|
| BUILD-01 | Fresh isolated install; race two valid setup/ownership operations | Exactly one primary owner; losing request conflicts; setup consumed; no default vendor user | DB constraint/transaction result, auth denial, audit and UI state |
| BUILD-02 | Invite administrator; revoke inviter before invite acceptance; replay token | No escalated role, no reused invitation, no cross-subtenant grant | Local membership/invite state and API errors |
| BUILD-03 | Record consent grant; accept withdrawal; redeliver old grant and import old CSV grant | Epoch/state remain current; historic receipts unchanged; import conflict explicit | DB history/outbox, request responses, portal history |
| BUILD-04 | Pause a send after initial read; accept withdrawal/let auth expire; resume at effect boundary | No stale ALLOW/new effect; defined block/queue result and reason | Timed independent events, decision/target observations |
| BUILD-05 | External adapter applies effect then drops reply; kill worker before acknowledgement | Unknown retained; supported reconciliation; no unsafe repeated effect | Attempt/target state/reconciliation/history across restart |
| BUILD-06 | Approve plan; change target generation/scope/policy or approval expiry | No new effect from stale plan; review required; old approval retained historically | Signed binding, DB state, agent rejection |
| BUILD-07 | Adapter declares read permission then permission revoked or last page unavailable | Coverage stale/partial; no verified-all assertion; failure has owner | Capability snapshot and exact denominator UI |
| BUILD-08 | Customer diagnostic includes a hidden field/canary or modified bytes after preview | Local block before egress; no vendor body/log copy; new approval required | Intercepted allowed network scope, local approval digest, vendor canary search |
| BUILD-09 | Try remote-support/admin impersonation/proactive-report setting via direct API, entitlement and restored config | Feature absent/rejected; no persistent channel/job created | API/config/package inspection and negative network test |
| BUILD-10 | Upload malicious archive/formula/unsupported file and retry a partly committed import | Unsafe file blocked locally; safe rows deduped according to declared atomicity; snapshot provenance retained | Parser isolation result, row counts/history, no vendor upload |
| BUILD-11 | Rights request involves ambiguous contact or revoked nominee; response contains another person | Disclosure/destruction denied or reviewed; unrelated payload redacted before delivery | Scope/authority decisions and tested response bytes |
| BUILD-12 | Withdrawal plus valid restricted transaction retention and a later hold release | Marketing barred, approved copy restricted; release triggers new eligibility review | Policy/retention/target observation with copy scope |
| BUILD-13 | Incident has different regimes/recipients; correct awareness time after draft | Independent tasks/clocks; original and correction retained; unsent remains unsent | Timeline/clock versions and delivery evidence |
| BUILD-14 | Corrupt evidence; purge approved personal payload; export again | Integrity failure for tamper; truthful tombstone for intentional purge; no regenerated fake content | Offline validator output and manifest |
| BUILD-15 | Deliberately broken synthetic control; normal/failing/repaired runs and interrupted runner | Real FAIL when broken; repaired PASS only on rerun; ERROR/interrupted distinct | Assertion-level expected/actual, build and fixture identity |
| BUILD-16 | Forge/duplicate/reorder payment events and attempt paid-state via browser redirect | No unverified entitlement; one correct commercial transition and signed licence | Provider fixture verification, vendor event ledger |
| BUILD-17 | Expire/downgrade licence mid-workflow; block vendor connectivity | Safe continuity; no data destruction or privacy fail-open; local export/help works as approved | Licence decision and current workflow/target result |
| BUILD-18 | Tamper ZIP/signature/migration; attempt update with new egress/model/remote support | Reject before privileged effect; compatible legitimate update preserves data/roles/history | Installer logs/digest checks and post-update boundary suite |
| BUILD-19 | Restore stale DB/workflow/object snapshot after newer withdrawal/role revocation | Quarantine until current safety established; no resurrected access/processing; loss window measured | Restore manifests, safety checkpoints, runtime denial until reconciliation |
| BUILD-20 | Build/start V1 without model, GPU, model secrets, Lightning or external AI DNS | Core installation/auth/consent/rights/workflows/testing/support independent; no hidden fallback | Manifest/dependency/network inspections and executed flows |
| BUILD-21 | Load every declared UI surface in signed-out/member/auditor/admin/principal roles | Correct access/error/empty/stale/partial states, local assets and keyboard paths | Browser assertions and endpoint permission checks |
| BUILD-22 | Refactor path roots and deep module imports | All code/tests in compiler/lint/build inventory; thin adapters work; no duplicate services or missing tests | Package/workspace checks and exact post-refactor regression |

## 5. Candidate evidence record

Each execution record includes test namespace/ID, mapped requirement/flow/WP, exact commit and qualified-source digest, build/package digest where relevant, scope/profile/test data, dependency versions, command, execution timestamp, exit/result, expected versus observed assertion, safe artifacts, reviewer and unresolved limitations. Preserve failed runs. A command blocked by Docker/identity/setup is NOT_RUN/BLOCKED with its cause, not a product PASS.

Do not fabricate percentages from number of screens/source sections. Report requirement coverage, scenario execution, supported profiles and unresolved blockers as separate dimensions. A 164-row map does not establish exhaustive security coverage. New behaviour creates new tests in existing suites where practical, not a new test framework.

## 6. Production acceptance gates

| Gate | Required evidence |
|---|---|
| Functionality | Required supported V1 journeys run end-to-end; no fake production success or hidden required gaps |
| Data and access | Tenant/domain/principal denial, safe owner/recovery, scoped connectors/imports and immutable approvals |
| Reliability | Durable acceptance, retry/reconciliation, explicit partial/unknown states, fail-safe admission and load bounds |
| Privacy | Customer data local; exact permitted diagnostic reports; no forbidden vendor feature or model path |
| Delivery | Signed full ZIP, supported clean/offline installation, versioned upgrade/migration and recovery |
| Quality | Current compiler/lint/contract/unit/integration/browser/security/performance results with actual scope |
| Independent review | Defined production surface assessed, blocking findings fixed/retested, claims/legal collection reviewed |
| Handover | Supported versions/profiles, runbooks, actual limitations, contact/support processes and human sign-off |

No checklist can waive known cross-tenant disclosure, uncontrolled destructive operation, missing artifact verification, customer operational-data egress or unresolved applicable Critical/High issues. Source: [§120](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-120), [§163](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-163), [§164](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-164), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§168](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-168).

## 7. Source acceptance matrix — active master §217

The following source text is reproduced without changing scenario/expected wording. Interpret all statuses and V1/V2 notes in its source context. It is not evidence that these tests ran.

<!-- BEGIN EXACT MASTER SECTION 217 BODY -->

| Test | Scenario | Required outcome |
|---|---|---|
| T01 | Tenant A calls Tenant B resource | Denied before data disclosure or mutation |
| T02 | Pooled DB connection retains old context | No cross-tenant query result |
| T03 | Background task has no authorized tenant | Rejected and safely audited |
| T04 | Historical policy/graph changes | Old decision resolves its original version |
| T05 | Future-effective rule evaluated today | Marked scheduled, not silently treated as commenced |
| T06 | Consent grant delivered twice | One aggregate transition |
| T07 | Old grant arrives after withdrawal | Withdrawn state remains authoritative |
| T08 | Valid new re-consent | New epoch; correct scoped authorization |
| T09 | Old deletion task reaches newly created data | Generation mismatch forces re-evaluation |
| T10 | Notice purpose expands | Approved migration/fresh-consent decision required |
| T11 | DB commit succeeds; publisher crashes | Outbox resumes without losing accepted event |
| T12 | Worker dies after remote effect | Reconciliation or safe idempotent recovery |
| T13 | Reused idempotency key has changed payload | Conflict; no external effect |
| T14 | Wrong-tenant signed agent command | Rejected |
| T15 | Replayed/expired command | Rejected without duplicate effect |
| T16 | Agent plugin asks for another secret | Access denied |
| T17 | Provider returns partial pagination | Incomplete scope explicit; no full-coverage claim |
| T18 | Provider removes mutation permission | Capability/coverage becomes degraded |
| T19 | Provider timeout and no safe receipt | Outcome unknown; no blind destructive retry |
| T20 | API success but data remains | Verification fails; action not fully verified |
| T21 | Verification observation expires | Freshness becomes stale |
| T22 | Evidence bytes changed | Integrity validation fails |
| T23 | Shared/recycled phone creates ambiguous match | No automatic disclosure or deletion |
| T24 | Nominee/guardian authority revoked | New privileged action denied |
| T25 | Access package contains third-party data | Redacted or escalated before release |
| T26 | Withdrawal accepted before supported send | Current authorization blocks/queues as configured |
| T27 | Seeded regression permits marketing send | Test fails and traces affected control |
| T28 | Cloud unavailable; revocation state stale | Explicit tested degraded behavior, no hidden fail-open |
| T29 | License expires mid-request | Continuity/hand-off policy applied; no data destruction |
| T30 | Disaster restore | Measured RPO/RTO; consent/evidence reconciliation before traffic |
| T31 | Marketing withdrawal plus valid retained transaction | Marketing stops; retained copy purpose-restricted |
| T32 | Hold released | Eligibility re-evaluated; scope not blindly deleted |
| T33 | Backup restores suppressed audience member | Quarantined and reconciled before audience use |
| T34 | Policy diff adds new data destination | Impact review and relevant tests required |
| T35 | Destructive synthetic test targets production | Blocked without explicit approved test scope |
| T36 | Incident has multiple reporting regimes | Independent triggers, deadlines and recipients |
| T37 | Awareness timestamp corrected | Correction auditable; old clock history preserved |
| T38 | Retrieved text instructs Copilot to disclose secrets | No secret/tool-permission expansion |
| T39 | AI unavailable | Deterministic privacy workflow still operates |
| T40 | Sensitive canary in connector error | No leak to telemetry, support bundle or unauthorized AI |

Add property-based tests for monotonic consent ordering and invariant preservation; fuzz parsers; run load, chaos and restore exercises. A small fixed matrix does not replace security assessment.

## ADDITIVE CUSTOMER-LOCAL AND SECURITY ACCEPTANCE TESTS

These are mandatory acceptance requirements added for the two customer priorities. They do not replace T01–T40 and are **NOT RUN** until actual implementation evidence is recorded.

| Test | Scenario | Required outcome |
|---|---|---|
| T41 | Customer purchases an edition in a disclosed test checkout | Correct signed licence and supported full-runtime package; no client-record collection |
| T42 | Install full package in an isolated customer environment | Console, portal, graph, policy, workflows, stores, evidence and tests operate locally |
| T43 | Tampered package, wrong signer or substituted manifest | Installation/update refused before execution |
| T44 | Vendor website/licensing account token is used against runtime | No customer login, database access, connector command or decryption privilege |
| T45 | Vendor connection blocked with a valid local licence | Core privacy workflows continue locally; no hidden cloud dependency |
| T46 | Operational identity/canary inserted into a licence field or extra JSON field | Fixed schema/value validation rejects it; no vendor request-body retention |
| T47 | Consent, request and incident workflows run with synthetic identifying canaries | No canary, derived identity or operational record reaches vendor stores/telemetry |
| T48 | Browser page loads scripts, analytics, fonts or crash reporting | No undisclosed vendor/external asset or data endpoint; customer-hosted assets used |
| T49 | Connector/AI/plugin attempts unauthorised network egress | Destination blocked by runtime/network policy; local failure evidence recorded |
| T50 | Local AI is missing or fails | Honest unavailable status; no public-model/vendor fallback; deterministic core works |
| T51 | Diagnostic export includes workflow IDs, masked records, screenshots or secrets | Export blocked or prohibited fields excluded; local preview shows only permitted schema |
| T52 | Support requests remote production screen/terminal access | No vendor production-data session; synthetic reproduction/local diagnostics used |
| T53 | Backup/restore runs, including an encrypted operational archive | Backup stays under customer-controlled storage/keys; no ORVIA backup upload |
| T54 | Vendor/release/licence identity attempts to decrypt runtime data or sign an action | Rejected; trust roles and keys are distinct |
| T55 | Licence expires or renewal is unreachable | Documented continuity/handover; no data deletion, privacy-control fail-open or new vendor access |
| T56 | Privileged login with default credentials or missing required MFA | Access denied; unique secure bootstrap and configured privileged MFA required |
| T57 | Release has an unresolved applicable Critical/High finding or a §163 blocker | Production promotion blocked; evidence retained |
| T58 | Scanner unavailable, scan omitted or a suppression lacks rationale | No false pass; gate blocked until assessed |
| T59 | Update/plugin/rule/model package attempts to enable telemetry or broaden egress | No silent policy change; customer approval and boundary regression required |
| T60 | Signing key or distribution service is compromised in a scoped exercise | Documented containment/trust recovery; no automatic customer operational access |
| T61 | Independent test reports a flaw and fix is submitted | Finding tracked, fix retested, regression added and affected-build/advisory status updated |
| T62 | Optional external processor/model is enabled | Explicit customer decision and accurate external-processing label; never vendor-routed; strict mode blocks it |
| T63 | Security centre shows an unassessed build or stale test | NOT_ASSESSED/stale scope shown; no invented certification or “zero vulnerabilities” badge |
| T64 | Cancellation or export/offboarding | Operational data exported locally; only permitted vendor account records handled by vendor retention process |

Record build/digest, deployment profile, test scope, command/method, expected/actual outcome, timestamp, reviewer and local evidence reference. Independent assessment and representative production configuration testing remain separate from these synthetic acceptance scenarios.

## INTERFACE AND DEPLOYMENT ACCEPTANCE MATRIX

These are proposed tests, not executed results.

| ID | Test | Expected result |
|---|---|---|
| UX-01 | Windows, macOS and Linux users open the same supported deployment | Consistent permitted workflow and accessible layout in the tested browser matrix |
| UX-02 | Buyer downloads from a Windows browser for a Linux host | Wizard permits the correct target package; browser OS does not choose the server silently |
| UX-03 | Vendor account holder tries runtime access | Denied without separately authorised customer identity |
| UX-04 | Data Principal requests another principal's record | Denied before disclosure |
| UX-05 | Runtime loads with vendor endpoints blocked | UI assets and core functionality remain local; declared optional features fail explicitly |
| UX-06 | Inspect vendor logs after a synthetic privacy workflow | No principal, workflow, evidence, inventory or operational payload |
| UX-07 | View downloaded release on vendor dashboard | Shows download information, not invented installation/health status |
| UX-08 | Upload diagnostic containing a forbidden field | Local validation blocks upload; no unfiltered fallback |
| UX-09 | Public principal portal attempts admin/API paths | Customer admin surface and privileges remain inaccessible |
| UX-10 | Invalid/tampered package or licence | Verification rejects it without privileged execution |
| UX-11 | Disconnected install/update | All required dependencies and trust checks work under the declared offline model |
| UX-12 | Browser closes after request acceptance | Durable customer-side workflow continues |
| UX-13 | Local evaluation host shuts down | Availability limitation is explicit; no claim of continuing execution |
| UX-14 | Upgrade or model package attempts additional egress | Rejected pending explicit supported review; boundary tests rerun |
| UX-15 | Use unsupported CPU/host/dependency combination | Preflight rejects or marks unsupported; no false compatibility badge |
| UX-16 | Renew or upgrade edition | Existing local records remain intact; new entitlement does not grant operational authority |
| UX-17 | Request outside organisation under strict profile | Unapproved processor/model destination blocked; no vendor relay |
| UX-18 | Account password reset | Does not reset or unlock the customer runtime |
| UX-19 | Runtime data export | Authorisation, local delivery and audit respected; no vendor upload |
| UX-20 | CSS/JavaScript/fonts/telemetry network audit | Only documented approved destinations; no runtime vendor asset dependency |

## ROLE, SUPPORT AND CUSTOM-AI ACCEPTANCE MATRIX

These scenarios supplement all retained tests and UX-01–UX-20. They are **requirements, not executed test results**. Store the exact tested build and applicable rule/knowledge/model version, profile, evidence, expected/actual result and reviewer when executed. Version 1 scenarios start NOT_RUN; the AI-01–AI-18 model scenarios are preserved as DEFERRED_V2. No threshold or pass rate is invented by this table.

| ID | Scenario | Required outcome | Status |
|---|---|---|---|
| ROLE-01 | Vendor Super Admin presents a vendor token to a customer runtime | Denied; vendor identity is not customer authority. | NOT_RUN |
| ROLE-02 | Vendor Admin opens an unassigned or different customer support case | Denied unless explicit vendor case permissions allow the business record; never runtime access. | NOT_RUN |
| ROLE-03 | Customer Admin attempts to grant Organisation Super Admin or expand its own scope | Denied without the independent authorised delegation procedure. | NOT_RUN |
| ROLE-04 | Member requests an unassigned system, environment or subtenant | Denied on the server before disclosure or side effect. | NOT_RUN |
| ROLE-05 | Organisation Owner migrates to the Organisation Super Admin display model | Existing scope is preserved; no duplicate privileged identity or vendor parent is created. | NOT_RUN |
| ROLE-06 | Revoke a member or service identity with a queued action | New actions recheck authorisation; stale tokens/permissions cannot preserve revoked access. | NOT_RUN |
| ROLE-07 | Vendor website account recovery attempts customer-owner recovery | No cross-domain reset, token exchange or hidden recovery key. | NOT_RUN |
| ROLE-08 | Auditor or Data Principal attempts member management or a repair | Denied under its own limited role and audience. | NOT_RUN |
| ROLE-09 | Customer user attempts another organisation even with a matching local role name | Denied; role names alone do not cross installation/organisation boundaries. | NOT_RUN |
| ROLE-10 | One vendor actor attempts support, release approval and signing without separation | Independent approval/key controls prevent an unauthorised release or trust change. | NOT_RUN |
| SUP-01 | Unreported customer runtime fails while offline | Vendor shows not reported/stale, not invented healthy or live incident detail. | NOT_RUN |
| SUP-02 | Generate support report containing a principal reference, hostname, log or raw AI text | Local fixed-schema validation blocks export; rejected content is not sent to vendor. | NOT_RUN |
| SUP-03 | Approve one support case then change the report payload | Digest/scope mismatch requires a fresh review; approval does not cover arbitrary future content. | NOT_RUN |
| SUP-04 | Send a legitimate approved minimal support report | Only permitted business/installation and diagnostic fields reach the assigned vendor case. | NOT_RUN |
| SUP-05 | Vendor supplies a diagnostic or repair instruction | Customer validates the typed supported plan and authorises execution; vendor cannot invoke a shell. | NOT_RUN |
| SUP-06 | AI is unavailable or recommends no escalation during a critical failure | Human alerting, deterministic help and direct support remain available. | NOT_RUN |
| SUP-07 | Attempt to enable or restore proactive vendor support-signal rules in Version 1 | Capability is out of Version 1 scope; no scheduled diagnostic transmission or standing permission; each report requires exact local preview and approval. | NOT_RUN |
| SUP-08 | A connection stops after an approved optional report | Local operations continue; vendor treats subsequent status as unknown or stale. | NOT_RUN |
| SUP-09 | Vendor case is closed while a local privacy action remains unverified | Local action remains unresolved; support closure is not operational verification. | NOT_RUN |
| SUP-10 | Compromised commercial licence or support credential requests customer data | No operational API, production credential or automatic data-upload path is available. | NOT_RUN |
| AI-01 | Training run specifies a third-party pretrained checkpoint or adapter | Rejected under the current own-model policy; explicit product-change review required. | DEFERRED_V2 |
| AI-02 | Candidate ORVIA run resumes its own checkpoint | Provenance traces to approved random initialisation, corpus and tokenizer; no unrelated weights. | DEFERRED_V2 |
| AI-03 | Corpus ingestion receives a customer ticket, log, conversation or disguised derivative | Rejected and quarantined under the non-customer corpus rule. | DEFERRED_V2 |
| AI-04 | Public source lacks approved reuse/provenance or contains personal/poisoned content | Excluded pending review; public accessibility is not automatic admission. | DEFERRED_V2 |
| AI-05 | A local user asks a question with authorised local context | Only local permission-filtered inference; no training, gradient export or vendor/Lightning call. | DEFERRED_V2 |
| AI-06 | Runtime inference is attempted with vendor and Lightning egress blocked | Supported local answer works, or honest unavailable state; no external fallback. | DEFERRED_V2 |
| AI-07 | Retrieved document instructs model to leak secrets or bypass roles | No permission expansion, forbidden tool execution or support export. | DEFERRED_V2 |
| AI-08 | Test question depends on stale or missing legal/product knowledge | Answer exposes limits/source dates and escalates; model memory does not invent authority. | DEFERRED_V2 |
| AI-09 | Model package is tampered with or requests executable loader/network access | Verification/runtime restrictions reject it before unsafe execution. | DEFERRED_V2 |
| AI-10 | Model is absent, fails evaluation or exceeds available hardware | AI is not advertised as ready; deterministic privacy operations and support still work. | DEFERRED_V2 |
| AI-11 | Local rating or conversation history is marked for model improvement | Training/export denied; permitted local retention is separately controlled. | DEFERRED_V2 |
| AI-12 | An auxiliary embedding/reranking component tries to download third-party weights | Blocked; every learned component must satisfy the own-model provenance requirement. | DEFERRED_V2 |
| AI-13 | Model conversion or quantisation changes output quality | Run held-out quality/safety tests; do not inherit the earlier evaluation result automatically. | DEFERRED_V2 |
| AI-14 | Model update/rollback changes consent epoch, roles or safety restrictions | Rejected; model lifecycle cannot reverse current deterministic state. | DEFERRED_V2 |
| AI-15 | Customer A question or cached context is requested by another scope | Denied; customer/role-scoped retrieval, caches and logs do not mix. | DEFERRED_V2 |
| AI-16 | Model training credentials try to publish a signed customer release | Denied without separate release approval and protected signing identity. | DEFERRED_V2 |
| AI-17 | A task asks for unsupported general advice or unsupported language | Enforce task scope; show limitations rather than claim domain training guarantees correctness. | DEFERRED_V2 |
| AI-18 | Vendor-side assistant sees a permitted support case | Inference may use permitted case context only; case content is not admitted to training. | DEFERRED_V2 |

Property-based isolation/consent tests, independent security assessment, model threat testing and real installation/restore exercises remain necessary; a fixed scenario table does not replace those programmes.

## PRODUCT-RELEASE APPLICABILITY OF RETAINED TESTS

Version 1 executes all applicable tests for its shipped non-AI surfaces, including local identity, vendor-role isolation, signed packages, rights/control correctness, recovery, permitted diagnostics, no egress and direct support. Pure model-inference/training/quality tests (AI-01–AI-18 and the model-execution part of T38) are Product Version 2 only. Do not count them as passed or as Version 1 implementation failures.

T39/T50/SUP-06 and comparable absence/failure tests apply to Version 1 as **no model is installed, no fallback is attempted, and core/support still work**; Version 2 additionally exercises a running model’s failure. T40/T49/T59/T62 and UX cases keep their Version 1 non-AI, absent-model and blocked-destination checks; their model-execution portions are rerun in Version 2. Role/support test IDs remain unchanged. Any test containing an optional capability must identify its real release scope, not be silently skipped to improve a score.

The following new scenarios make the Version 1 release decision executable. They are planned requirements only; every status is initially NOT_RUN.

## VERSION 1 MODEL-FREE AND GUIDED-ASSISTANCE ACCEPTANCE

| ID | Scenario | Required result | Status |
|---|---|---|---|
| V1-01 | Install the signed Version 1 bundle with no GPU, weights, model API keys or Lightning access | Supported core installs/starts; no model provisioning or hidden downloads; required ordinary prerequisites remain enforced. | NOT_RUN |
| V1-02 | Run the full synthetic consent withdrawal, target action, verification and regression slice without a model | Actual deterministic outcomes/evidence/tests work; no model-generated success substitutes. | NOT_RUN |
| V1-03 | Set an AI flag, alter a licence or use a Super Admin role on Version 1 | Custom-model capability remains DEFERRED_V2; no secret provider or runtime activation. | NOT_RUN |
| V1-04 | Inspect package/dependency/startup/network manifests | No model, learned embedding, training or inference dependencies and no model/Lightning calls. | NOT_RUN |
| V1-05 | A known error matches a guidance rule | Show exact reviewed explanation/runbook version and permitted record links; do not invent root cause. | NOT_RUN |
| V1-06 | A guidance query has no match, missing facts or stale context | Explicit no-match/review/unknown status; human help remains available; no generated fallback. | NOT_RUN |
| V1-07 | Another role/subtenant searches restricted help context or evidence | Deny unauthorised records/snippets/cache access before output; rules never enlarge access. | NOT_RUN |
| V1-08 | A document or connector string requests a shell command or secret export | Treat it as inert untrusted content; no execution, permission change or support upload. | NOT_RUN |
| V1-09 | Accept a recommended diagnostic or repair | Use existing typed plan, supported capability, actor permissions, required approval and verification. | NOT_RUN |
| V1-10 | Omit/disable/fail optional Guided Assistance | Core workflows, accurate errors, ordinary documentation and direct human support remain available. | NOT_RUN |
| V1-11 | Prepare a report with an internal ID, client data, unrestricted log or free text | Fixed-schema local validation blocks prohibited export; no automatic helper-summary upload. | NOT_RUN |
| V1-12 | Renew/import a licence or apply a Version 1 update offline | Works under the supported offline model; no model credentials or unexpected extra egress. | NOT_RUN |
| V1-13 | Review UI, sales copy and commercial capability flags | Rules-based assistance labelled accurately; custom AI only a Version 2 roadmap item, not currently enabled. | NOT_RUN |
| V1-14 | Review pipeline tasks and artifact provenance | No Version 1 training/GPU job; external coding tools are limited to authorised code/docs/synthetic fixtures, never customer data. | NOT_RUN |
| V1-15 | Suggest saving local guidance/support history for future model improvement | Training/export prohibited; only justified local retention under the existing boundary. | NOT_RUN |
| V1-16 | Load an untrusted or incompatible rule/runbook pack | Reject signature/version/schema failure; no arbitrary code or added outbound permissions. | NOT_RUN |
| V1-17 | Compute a template summary or configured severity finding | Every fact links to scoped local inputs and rule version; unknown effects stay unknown, not verified or legally certified. | NOT_RUN |
| V1-18 | Review Version 1 release sign-off | Applicable core/security/recovery tests have real results; model-only tests are explicitly DEFERRED_V2 and not counted as passes. | NOT_RUN |

Guidance-specific tests apply only when the optional helper is shipped; absence, truthful claims, core independence and privacy/security tests apply regardless. Version 2 must retain the applicable Version 1 regression suite and add the complete deferred model suite before claiming a trained assistant.

## VERSION 1 VENDOR MANAGEMENT, LOCAL ACCOUNTS AND DATA-ONBOARDING ACCEPTANCE

The following VM scenarios implement the selection approved in `Orvia_idea` on 19 September 2026. They are additional planned requirements, not executed tests. All existing test IDs remain; SUP-07 is explicitly revised to test the exclusion of proactive vendor signals. The pre-existing custom-model tests remain DEFERRED_V2.

| ID | Scenario | Required result | Status |
|---|---|---|---|
| VM-01 | Create/open a vendor organisation profile | Only permitted business, designated-contact, licence, download and submitted support fields are available; no customer database query or replication. | NOT_RUN |
| VM-02 | Vendor Admin searches another unassigned organisation or case | List/search/detail/export access is denied before disclosure; Vendor Super Admin governance does not create runtime authority. | NOT_RUN |
| VM-03 | Open staff-directory, employee-activity or runtime-mirror endpoints/features | Not implemented or enabled in Version 1; no local member list, client activity or operational audit reaches the vendor. | NOT_RUN |
| VM-04 | Nominate or replace a designated business contact | Collect only necessary contact fields; no credential, role-sync, employee-directory import or automatic local permission change. | NOT_RUN |
| VM-05 | Inspect installation status after a licence issue/download or without a current report | Use actual download records and Last reported/Not reported labels; do not invent live runtime health or installed version. | NOT_RUN |
| VM-06 | Prepare/approve an individual support diagnostic then alter payload or destination | Preview and approval bind to exact validated payload and destination; altered content requires fresh review; approved delivery contains only allowed fields. | NOT_RUN |
| VM-07 | A diagnostic or attachment includes client data, staff list, secret, raw log or operational identifier | Local validation blocks sending; vendor ingress rejects without logging prohibited bodies; other accidental receipt enters restricted incident handling. | NOT_RUN |
| VM-08 | Premium licence, support approval or hidden setting requests live vendor access | No remote desktop, SSH, SQL console, impersonation, filesystem browser or support tunnel becomes available. | NOT_RUN |
| VM-09 | Assign a signed support fix and close its vendor support case | Customer verifies/approves/applies locally; assignment is not remote execution, and case closure does not mark the local privacy action verified. | NOT_RUN |
| VM-10 | Run direct support without Guided Assistance or vendor runtime connectivity | Customer can use reviewed runbooks and approved manual report transfer; no model/session prerequisite or invented vendor live visibility. | NOT_RUN |
| VM-11 | Complete fresh installation and replay its first-run setup claim | One primary local owner established; MFA/recovery configured; first-run claim cannot be reused or reopen on restart; no vendor master password. | NOT_RUN |
| VM-12 | Invite members and attempt admin self-elevation or excessive delegation | Invitation is scoped and expiring/single-use or valid IdP provision; admin grants need explicit delegable authority; self-elevation denied. | NOT_RUN |
| VM-13 | Transfer/recover ownership or attempt concurrent transfers | Protected customer-held procedure yields exactly one primary owner in an activated organisation; no vendor recovery key or duplicate owner. | NOT_RUN |
| VM-14 | Reset a vendor contact password or change a commercial contact | Customer-runtime credentials, ownership and role assignments are unaffected; no hashes, MFA secrets or recovery material exported. | NOT_RUN |
| VM-15 | Connect a supported source through the local wizard in Observe mode | Dedicated scoped identity and TLS checks succeed locally; no public database exposure, vendor credential receipt or mutation occurs. | NOT_RUN |
| VM-16 | Select restricted resources, encounter missing permissions or revoke credentials | Only allowed resources/actions accessible; setup stops or capability degrades explicitly; no fallback to root, unsafe TLS or expanded scope. | NOT_RUN |
| VM-17 | Enable a write/delete after connectivity test with ambiguous scope or absent approval | Denied until exact identity/scope/capability and required approval/dry-run checks pass; bounded execution and verification remain distinct. | NOT_RUN |
| VM-18 | Upload a supported import containing invalid or malicious content | Customer-local quarantine/schema/type/size/permission checks; unsafe input blocked or explicitly reported; no public scanning/vendor upload. | NOT_RUN |
| VM-19 | Import or manually enter a supported snapshot then request source-system deletion | Source/provenance and snapshot status shown; no claim of live mutation or verification; manual coordination used where no connector supports action. | NOT_RUN |
| VM-20 | Replay an import or import old consent after a newer withdrawal | Validation/conflict/idempotency rules preserve the newer authorised state and expose unsupported provenance; no silent re-grant. | NOT_RUN |
| VM-21 | Review vendor collection notices, retention and privacy/rights handling before launch | Required role/basis/date, notice, contract, field-purpose, access, retention and correction/grievance review is recorded; no compliance guarantee. | NOT_RUN |
| VM-22 | Replace contacts, close cases or offboard an organisation | Vendor minimisation/retention/deletion rules apply; local customer data and evidence are not remotely erased; no support-history training. | NOT_RUN |
| VM-23 | Restore/upgrade from older configuration containing diagnostic rules or stale identity state | Excluded reporting/access stays disabled; owner/invitation/role state is reconciled locally before normal operation; no resurrected privileges. | NOT_RUN |
| VM-24 | Run the integrated vendor/support/onboarding flow under network and database audit | Vendor stores contain only permitted fields; customer credentials/imports/member activity/operational records stay local; actual test artifacts and limitations recorded. | NOT_RUN |

Record implementation status separately from test status. Do not mark excluded functionality as passed because its UI is hidden: test the API, permissions, configuration, jobs, upgrades and data paths for absence/bypass. These scenarios complement, rather than replace, the existing security, recovery, connector, consent and legal-review requirements. Engineering ownership is recorded in Appendix G.

---

<!-- END EXACT MASTER SECTION 217 BODY -->
