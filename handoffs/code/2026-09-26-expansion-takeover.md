# Handoff — expanded V1 takeover — Claude Code — branch `claude/upbeat-newton-w4h53x`

**Base commit:** `211c146` (main, PR 20 merged)
**Contract version:** 0.29.0 → 0.30.0 (additive; each family bumps as it lands)
**Scope and profile:** remaining expanded-V1 work from `docs/engineering/2026-09-25-overall-completion-and-resume.md`, taken over from Codex at the user's request while Codex credits are exhausted. Isolated synthetic `codex-a00` profile in a disposable cloud container.

Codex should review every section below. Nothing here promotes a family to accepted; every family still needs exact-build acceptance and the external decisions listed at the end.

## EX06 — general impact assessments (this commit)

**Built**
- Migration `0051_impact_assessments.sql`: versioned templates; assessments; append-only answers, findings and finding events; lifecycle triggers (a template version is immutable; an assessment moves only DRAFT→SUBMITTED→APPROVED/REJECTED, APPROVED→SUPERSEDED; nothing is deleted); forced RLS on `grc.read`/`grc.write`/`grc.approve` (worker via `operations.execute`); the approver must differ from the creator and the submitter, and the publisher from the author (CHECK constraints); one answer-rule finding per question; one escalation per finding and due date.
- Contract `shared/contracts/src/expansion.ts`, `expansion-routes.ts` (13 routes), `expansion-examples.ts`; a guard in `index.ts` makes a schema-name collision fail the contract build. A collision was found and fixed: the graph module already owns `ImpactAssessment`, so this family uses `ImpactAssessmentDetail`.
- Domain `backend/domain/src/assessments/impact.ts`:
  - required answers and evidence are enforced at submission;
  - answer rules raise findings;
  - any unresolved finding blocks approval;
  - risk acceptance needs `grc.approve`, a person other than the raiser, and a future expiry (an expired acceptance blocks again);
  - a retest is a new revision carrying answers forward (marked as carried forward), and the predecessor is superseded only when the retest is approved;
  - an optional regulatory requirement link is validated against the package in force;
  - the idempotent escalation sweep is exposed as a route.
- Screen `/workspace/impact-assessments`: question builder, publish/retire, start with a subject picker, answer sheet, submit, decision, finding progress, raise finding, retest, escalation. The existing "Assessments" nav item is relabelled "Processor assessments".
- Generated OpenAPI now labels expansion routes `IMPLEMENTED_V1_EXPANSION_PENDING_REVIEW` and DPDP routes `IMPLEMENTED_DPDP_OPERATIONS_PENDING_REVIEW` (they previously fell through to `CONTRACT_ONLY_PENDING_TICKET`).

**Fixed along the way (shared UI)**
- `WriteForm` gained `keepValues` for edit forms. Detail panels are keyed by record id: Impact assessments, Data Principals, consent records and estate imports.
- Before this fix, a saved answer sheet cleared itself, and the next save silently dropped fields that were not re-typed. The breach correction form had the same latent behaviour.

**Executed**
| Command | Result |
|---|---|
| typecheck, lint, contracts:generate/check (313 route examples, 0.30.0) | PASS |
| db:migrate on codex-a00 | applied `0051_impact_assessments` |
| `tsx tests/integration/expansion/impact.test.ts` | **40/40 PASS** (first run failed on a harness detail: the fixture sends GET when the body is undefined, so body-less POSTs pass `{}`) |
| `tsx tests/e2e/expansion-screens-local.ts` (EX06 phase) | **14/14 PASS**. Earlier runs failed and exposed the form defect above, plus a race in my own test |

**Remaining for EX06:** a reviewed legal applicability mapping of templates to regulatory content (needs the official package); overdue escalation delivered through customer-controlled notification transports (EX09); full application acceptance on a frozen candidate.

## EX08 — third-party lifecycle

**Built**
- Migration `0052_third_party.sql`:
  - `processor_agreements`, changeable only by termination; supersession happens once;
  - `processor_tiers`, append-only;
  - `supplier_links`, storing only a SHA-256 digest; expiry ≤31 days; the only changes allowed are use and a single revocation;
  - `impact_answers.respondent` (`STAFF`/`SUPPLIER`);
  - `app.resolve_supplier_link(digest)` and `app.supplier_assessment()` as narrow security-definer functions;
  - RLS so a supplier actor sees exactly one draft assessment, its template and only its own answers;
  - a restrictive policy so an answer is labelled SUPPLIER exactly when a supplier actor wrote it (staff cannot forge an attestation).
- Contract 0.31.0:
  - 11 routes;
  - new route authority `SUPPLIER_LINK` with OpenAPI scheme `supplierLink` (HTTP bearer);
  - new capability `supplier.respond`;
  - the `ImpactAnswer.respondent` field;
  - supplier routes are excluded from the UI endpoint types.
- Domain `backend/domain/src/third-party/third-party.ts`: the standing derives these gaps from recorded engagements, linked activities and their current purpose versions, sub-processor engagements, tier, approved `VENDOR_DUE_DILIGENCE` assessments and dispositions:
  - `NO_AGREEMENT_IN_FORCE`
  - `AGREEMENT_EXPIRING`
  - `REGION_NOT_PERMITTED`
  - `PURPOSE_NOT_PERMITTED`
  - `SUBPROCESSOR_NOT_PERMITTED`
  - `NO_TIER`
  - `DUE_DILIGENCE_MISSING`
  - `REASSESSMENT_DUE`
  - `DISPOSITION_NOT_VERIFIED`
- EX06 integration:
  - supplier answers block approval (`supplier_attestations_not_confirmed`) until staff record the answer themselves;
  - a retest carries forward only staff-confirmed answers.
- HTTP `backend/api/src/supplier.ts`: refuses cookies, requires a same-origin write, needs a `Bearer` 64-hex token, caps the body at 256 KiB, resolves the token by digest, runs as actor `MACHINE`/role `SUPPLIER` expiring with the link, and responds with `no-store` and `no-referrer`. It is dispatched from the `[...segments]` catch-all.
- Screens:
  - `/workspace/third-parties`: overview and detail, gaps, agreements (record, supersede, terminate), tier, supplier links (issue with a show-once URL, revoke);
  - `/supplier`, the public questionnaire: the token is read from the URL fragment and removed from the address bar; it has no session.

**Invariant tests updated (review requested)**
- `tests/unit/deployment-boundary.test.ts` "there is no vendor actor": the authority list gains exactly `SUPPLIER_LINK`, with an assertion that every such route is under `/api/v1/supplier/` with capability `supplier.respond`. The vendor checks are unchanged: no /vendor/ authority or capability, and no new audit actor domain. A supplier is the customer's own processor, not the ORVIA vendor.
- `tests/unit/processors.test.ts`: the count of `processor.*` routes goes from 11 to 20. All remain staff-only, idempotent and typed.

**Executed**
| Command | Result |
|---|---|
| unit | 252/252 PASS |
| db:migrate | applied `0052_third_party` |
| `tsx tests/integration/expansion/third-party.test.ts` | **43/43 PASS** on the first run, including database-level policy checks run as `orvia_app` with supplier settings |
| `tsx tests/e2e/expansion-screens-local.ts` | **21/21 PASS** (EX06 + EX08) |

**Remaining for EX08:** actual processor outcomes beyond declarations (needs real connectors); onward-transfer checks against observed transfers (needs EX05/EX04 flow evidence); supplier link delivery by customer-controlled email (EX09).

## EX10 / EX11 — policy lifecycle, issues and continuous control tests

**Built**
- Migration `0053_grc_lifecycle.sql`:
  - `grc_policies`: versioned by `policy_key`; the text of a version is immutable, and its only allowed transitions are DRAFT→PUBLISHED and PUBLISHED→RETIRED.
  - `grc_policy_acknowledgements`: a reader may insert only their own acknowledgement (restrictive `acknowledgement_self`).
  - `control_tests`: `check_kind`, `maximum_violations` and `control_id` are fixed once created. Only `enabled` and `next_run_at` change.
  - `control_test_runs`, `grc_issues`, `grc_issue_events` and `compliance_alerts` are append-only; the guard trigger refuses UPDATE and DELETE.
  - At most one issue exists per control test (partial unique index), and at most one alert per run.
  - RLS: STAFF with `grc.read` reads, and only writers insert (restrictive `writers_only`). The MACHINE actor reads and writes through `operations.execute`.
  - `app.run_control_check(kind)` is SECURITY DEFINER with a fixed search_path. It reads only the transaction's scope and needs STAFF `grc.write` or MACHINE `operations.execute`. It returns a violation count and at most 10 identifiers, never record contents.
  - The nine deterministic checks are:
    - systems used by an activity have a connector binding;
    - consent events have evidence;
    - active retention rules state a period;
    - engaged processors have an agreement in force;
    - withdrawals have a propagation run;
    - approved assessments are not past review;
    - every `app` table has FORCE ROW LEVEL SECURITY;
    - the audit append-only trigger is enabled;
    - every control has current evidence.
- Contract 0.32.0 adds 18 routes under `/grc/policies`, `/grc/issues`, `/grc/regulatory-framework`, `/grc/control-tests`, `/grc/compliance-alerts` and `/grc/compliance-report`. The expansion policy schemas are named `GrcPolicy*`, because `Policy*` collided with the base consent-policy schemas; the collision guard caught it.
- Domain `backend/domain/src/grc/lifecycle.ts`:
  - Policies:
    - the author cannot publish their own policy;
    - publishing a new version retires the one in force;
    - a version may cite requirements only from the regulatory package in force;
    - a review date is derived on publication.
  - Issues:
    - state is derived from events: OPEN, REMEDIATION_PLANNED, REMEDIATED, VERIFIED, RISK_ACCEPTED or ACCEPTANCE_EXPIRED;
    - a remediation cites evidence;
    - verification is either an independent review by an approver who is not the remediator, or a PASS run of a covering test observed after the remediation;
    - risk acceptance needs an approver who is not the raiser and a future expiry.
  - Control tests:
    - on FAIL the test opens one issue; a later failure on an issue that was verified or accepted appends RECURRED;
    - a PASS after REMEDIATED auto-verifies the issue with the run id;
    - an alert is raised only on a change of state (DRIFT_TO_FAIL, RECOVERED, ERROR);
    - ERROR records the SQLSTATE and is never counted as a pass;
    - STALE means the test has not run within twice its interval.
  - Framework import copies the in-force package's requirements into a GRC framework, labelled `test fixture` or `production`.
  - The auditor report derives from these records: test standings, open and overdue issues, policies, and mapped versus unmapped requirements per framework. It states its limits.
- Operations runner (`services/worker/src/operations-runner.ts`): each cycle runs due control tests as the enrolled MACHINE identity and escalates overdue issues once per due date. It also now drives the EX06 finding escalation, which previously existed only as a staff button. The report gains the fields `control_tests_run`, `compliance_alerts`, `issues_escalated` and `findings_escalated`.
- Screen `/workspace/compliance` ("Continuous compliance" in the nav) shows:
  - standing and framework coverage;
  - control tests: add, run now, enable or disable, run history with observation digest, and run due tests now;
  - alerts;
  - issues: filter by state, raise one, and record progress, verification or risk acceptance;
  - policies: draft, new version, publish, acknowledge, retire;
  - framework import from the package.

**Honest limits**
- Compliance alerts are stored with `delivery_state = NOT_DELIVERED`. Delivery through customer-controlled email or webhook is EX09 (task #14) and has not been built yet.
- Checks read only this installation's database. They do not observe external systems, and the report says so.
- The STALE standing is computed and shown, but no suite has executed it: the run history is append-only by design, so the suite cannot age a run.
- `issueList` with a state filter scans a bounded window of 1000 issues per page request and resumes from the last scanned row. It is correct but not indexed by state, because state is derived from events.

**Executed (codex-a00, synthetic fixtures)**
| Command | Result |
|---|---|
| `pnpm run contracts:generate` | 341 route examples validated, contract 0.32.0 |
| `pnpm run typecheck` / `pnpm run lint` | clean. Lint flagged an unchecked reassignment in my EX06 test, which now asserts that `missing` is empty. |
| `pnpm test` (unit) | 252/252 PASS |
| `tsx tests/integration/expansion/grc-lifecycle.test.ts` | 75/75 PASS. The first attempt stopped on the test's own page limit (200 > max 100); that failed artifact is kept. It covers: a deliberately broken control (an unbound system linked to an activity) detected as FAIL→issue→one DRIFT alert; a repeat failure that neither duplicates nor alerts; verification by a run from before the remediation refused; binding the system gives PASS→RECOVERED→auto-VERIFIED; a new break gives RECURRED on the same issue; fault injection (EXECUTE revoked from `orvia_app`, then restored in `finally`) gives an explicit ERROR with `SQLSTATE_42501`, one alert and no issue; the runner's scheduled run as MACHINE, with a disabled test skipped; escalation exactly once across runner and HTTP sweeps; the auditor reading the report but refused writes; another tenant getting 404; database immutability (23514); and reader inserts refused at RLS (42501). |
| `tsx tests/e2e/expansion-screens-local.ts` | 29/29 PASS (EX06, EX08, EX10/11). The first attempt failed on a race in the EX08 step: it waited for text in the list, then asserted on the detail table. The wait now targets the detail table, and that failed artifact is kept. |
| impact / third-party / operations runner / consent-withdrawal suites (rerun after these changes) | 41/41, 43/43, 10/10, 38/38 PASS |

## EX05 — records of processing, and bounded resumable exports (cross-cutting "large exports")

**Built**
- Migration `0054_ropa_and_exports.sql`:
  - `system_locations`: a reviewed declaration with a region code, hosting description and basis. A new declaration closes the old one, and nothing is ever deleted.
  - `ropa_versions`: immutable snapshots with a canonical-JSON SHA-256 digest, approved once, by someone other than the recorder (enforced by a CHECK constraint and the guard).
  - `export_jobs` and `export_chunks`:
    - a job only advances while RUNNING and never rewinds;
    - a chunk is never altered, and is deleted only after its job expires;
    - RLS makes an export visible, advanceable and downloadable by its requester only;
    - the MACHINE actor may purge only the chunks of expired jobs.
- Contract 0.33.0 adds 16 routes: `/systems/{id}/locations`, `/ropa/entries`, `/ropa/summary`, `/ropa/impact`, `/ropa/versions` (+approval, +diff) and `/data-exports` (+step, +stop, +chunk).
  - The stop route is named `stop_data_export`, not "cancel": the deployment-boundary test treats "cancellation" as a commercial word, and I kept that test intact.
  - `business.ts` now looks schemas up through a typed `schemaNamed()`; the schema union had grown too large for the checker.
- Domain `backend/domain/src/mapping/ropa.ts`: entries are assembled in bulk (a fixed number of queries per page). Each entry joins these sources:
  - registry declarations, each with its basis;
  - connector bindings;
  - declared locations;
  - processor engagements with their region;
  - retention and safeguards;
  - graph edges, with provenance and review state;
  - OBSERVED graph assets, each with a freshness bound.
- Gap kinds by severity:
  - Missing: NO_CONDITION, CONDITION_UNRESOLVED, NO_SYSTEM, NO_DATA_CATEGORY, NO_PRINCIPAL_CATEGORY, NO_RETENTION_RULE, UNBOUND_SYSTEM, LOCATION_UNDECLARED, RECIPIENT_REGION_NOT_A_CODE.
  - Stale: RECIPIENT_ENDED, CATEGORY_INACTIVE, PURPOSE_VERSION_NOT_CURRENT, OBSERVATION_STALE.
  - Conflict: GRAPH_SYSTEM_NOT_DECLARED, DECLARED_SYSTEM_NOT_IN_GRAPH.
  - Info: NOT_OBSERVED.
- Transfers: a region outside `IN` is flagged cross-border. Whether a transfer is permitted is stated to be a legal question the record does not answer.
- Change impact traverses registry links, graph edges (asset → graph activity → registry activity), sub-processor engagements and purpose versions (reusing `purposeImpact`). Results are bounded with a `complete` flag.
- Snapshots are refused above 5,000 active activities rather than shortened. The diff compares canonical JSON per field.
- Domain `backend/domain/src/exports/exports.ts` covers two export kinds, `ROPA_VERSION_CSV` (from an immutable version) and `AUDIT_EVENTS_JSONL` (filter plus database-clock instant):
  - The matched count is taken at creation, with a ceiling of 2,000,000 rows; a larger match is refused.
  - Each step writes one chunk (2,000 audit rows or 200 activities) and advances a microsecond-exact keyset cursor in the same transaction.
  - On exhaustion the source is recounted. The job completes with a manifest (per-chunk SHA-256 plus a digest over them) only if the recount matches; otherwise it FAILS with `source_changed_during_export` and cannot be downloaded.
  - CSV cells beginning with `= + - @` are neutralised.
  - Steps run under the requester's authority, so audit exports also need `audit.export`.
  - Download and creation are recorded in the EXPORTS audit category (`audit.ts` map extended, and the retention test's operation list updated to match).
- Runner: purges chunk copies of expired exports (`export_chunks_purged`).
- Screen `/workspace/records-of-processing` ("Records of processing" in the nav) shows:
  - summary and gaps by kind;
  - paged entries, and a detail view with systems (declared versus read), recipients, transfers, gaps and a location declaration form;
  - a change-impact explorer;
  - versions: record, approve, and compare any two;
  - exports: start, auto-drive with resume on failure, stop, and download. The browser verifies every chunk digest and the manifest digest before saving the file and manifest.

**Honest limits**
- The existing audit export (`GET /audit-events/export`, ceiling 5,000) is unchanged. The new job export is the path for larger sets, and the old endpoint still refuses above its ceiling.
- Exports progress only while their requester drives them (the screen does this automatically). The runner does not advance them: it has no authority to read what the requester can read, by design.
- These are **NOT_RUN**:
  - the 2,000,000-row ceiling;
  - the 7-day chunk purge, which needs an expired job, and the guard forbids backdating one;
  - capacity at 1M rows.
- The registry still accepts linking an ended engagement to an activity. The record flags it as RECIPIENT_ENDED; refusing the link is a registry change I did not make.
- The home jurisdiction is fixed to `IN` (DPDP). There is no per-installation setting.

**Executed (codex-a00, synthetic fixtures)**
| Command | Result |
|---|---|
| contracts:generate / typecheck / lint / unit | 357 examples, clean, clean, 252/252 |
| `tsx tests/integration/expansion/ropa-exports.test.ts` | 58/58 PASS; the first attempt failed 1 check, detailed below. Coverage:<br>• a real catalog read (worker observer) as the only source of "observed";<br>• graph conflicts in both directions;<br>• location history and refusal of a backdated declaration;<br>• cross-border via system and recipient, and a non-code region named rather than guessed;<br>• impact via registry link, graph and sub-processor;<br>• versions approved by a second person, and the diff;<br>• CSV export with formula neutralisation and header/row count checks;<br>• a 4,500-row synthetic audit export written as 3 chunks, resumed from a new session, with every id exactly once;<br>• a late backdated row causing FAILED with no download;<br>• stop, privacy between staff and tenants, database immutability (23514) and RLS (42501, zero rows). |
| `tsx tests/e2e/expansion-screens-local.ts` | 37/37 PASS (EX06, EX08, EX10/11, EX05). The first attempts failed on my test code: pagination scope and a filename regex. |
| audit / audit-retention / operations runner / grc-lifecycle (rerun) | 51/51, 24/24, 10/10, 75/75 PASS |

What the first `ropa-exports` failure was: I assumed a terminated engagement would stay linked. In fact termination closes the activity link. The test now asserts that, and exercises the real stale path, which is re-linking an ended engagement.

## EX03 — rights response packages (redaction, second-person review, expiring and revocable delivery)

**Built**
- Connector contract: `retrieve(pools, actor, systemId, reference)` added to `ConnectorAdapter`.
  - The records test adapter reads through `orvia_target_observer` and reports READ, NOT_FOUND or UNAVAILABLE.
  - The manual adapter reports NOT_SUPPORTED.
  - Unlike `verify`, it returns values, because disclosure is its purpose. It is used only for packages.
- Migration `0055_rights_response_packages.sql`:
  - `rights_response_packages` and `rights_response_downloads`, both append-only receipts.
  - The guard allows only these moves:
    - DRAFT→REVIEWED/WITHDRAWN;
    - REVIEWED→RELEASED/WITHDRAWN;
    - one download increment while not revoked or expired;
    - one revocation;
    - one purge, which empties content only after delivery has ended.
  - What was read never changes. The reviewer must differ from the preparer (CHECK constraint).
  - At most one unreleased package per request (partial unique index). Whether a delivery is still active is checked under the request lock.
  - RLS:
    - staff read with `rights.read`;
    - the principal sees only their own RELEASED package, may only count a download, and inserts receipts only for themselves;
    - the MACHINE actor may only purge.
- Contract 0.34.0 adds seven staff routes plus portal `own_response_package` (POST, idempotent, `rights.own.read`).
- Domain `backend/domain/src/rights/response-packages.ts`. Preparing a package:
  - accepts only ACCESS or CORRECTION requests, with identity ESTABLISHED and the request executing or completed;
  - searches only a single active Data Principal (more than one is refused, not guessed);
  - reads each plan system's references (at most 20 per system) through the adapter;
  - adds ORVIA's own consent entries and request record;
  - makes deterministic suggestions (`response-redaction-rules v1`, system-read sections only): another person's email or phone number (10+ digits, word-bounded, so dates and ids are not matched), or field names suggesting another person. A suggestion never repeats the value.
- Review:
  - every suggestion must be redacted or kept with a reason;
  - unreadable or unsupported sources must be acknowledged;
  - a redacted value is removed wherever it appears in the package;
  - the serialised content is checked for leakage before it is fixed with a digest.
- Release:
  - delivery lasts at most 30 days, with a collection allowance of 1–10;
  - the first release also settles the V1 `release_response`.
- Revocation, withdrawal and the portal collection each write receipts and audit events.
- Runner: purges content 30 days after delivery ended (`response_packages_purged`).
- Screens:
  - on the staff request page: prepare, the review form (a decision per field, with suggestion hints), release, revoke and withdraw;
  - in the portal (`/privacy/rights`): "Collect your copy" shows the redacted copy, its digest and the remaining allowance.
- List ordering: the lists below were ordered by random id, so new items fell onto later pages as data grew. The e2e run exposed this, and it is a real usability defect. These lists are now newest first, using a keyset cursor that is still an id: impact templates and assessments, GRC policies, control tests, alerts, issues, RoPA entries, RoPA versions and data exports. The export list also shows each export's short id.

**Invariant tests updated (review requested)**
- `tests/unit/rights.test.ts`:
  - staff rights routes go from 14 to 21, and own routes from 4 to 5;
  - `rights.release` is now held by `release_response` plus the three EX03 disclosure decisions (review, release, revoke). Preparing and withdrawing stay `rights.write`.
- `tests/unit/portal-rights.test.ts`: portal rights routes add `own_response_package`. It is still PRINCIPAL-only, uses `rights.own.*` and names no principal in its path.

**Honest limits**
- Delivery is through the authenticated portal only. A manual-intake principal without a portal account still needs out-of-band delivery, and there is no bearer-link channel.
- The suggestion rules are deterministic pattern rules and can miss another person's data written in prose. The reviewer's decision is the control, not the rules.
- CORRECTION packages include CORRECT_RECORD systems, but the suite exercises ACCESS only.
- The 30-day purge by the runner is **NOT_RUN**, because it needs aged data. The database guard's purge rules are tested directly.

**Executed (codex-a00, synthetic fixtures)**
| Command | Result |
|---|---|
| contracts:generate / typecheck / lint / unit | 365 examples, clean, clean, 252/252 |
| `tsx tests/integration/expansion/response-packages.test.ts` | 52/52 PASS. The first run failed because the phone rule matched ISO dates in ORVIA's request section; the rule was fixed and scoped to system sections. Coverage:<br>• refusals for unverified identity, erasure and the auditor;<br>• a read through the observer role, with another principal's record in the same system excluded;<br>• UNAVAILABLE and NOT_SUPPORTED sources recorded as such;<br>• suggestions without values;<br>• preparer≠reviewer, undecided suggestions, unacknowledged sources and unknown fields refused;<br>• redaction leakage checked in the staff view and the delivered copy (a value kept in another field is scrubbed);<br>• the 30-day and past-expiry bounds;<br>• V1 response settled;<br>• another principal gets 404 and staff get 403 on the portal route;<br>• the allowance, revocation, expiry (3-second window), replacement versions and withdrawal;<br>• receipts;<br>• database immutability, the purge guard and principal RLS. |
| `tsx tests/e2e/expansion-screens-local.ts` | 42/42 PASS (EX06, EX08, EX10/11, EX05, EX03). The EX03 browser phase: the principal raises the request in the portal, staff prepare, a second person redacts on screen and releases, and the principal signs in and collects the copy with the redaction shown and the other person absent. Earlier attempts failed on list paging (fixed in the product, above), a heading selector, one auth-window timeout, and one run in which my own edit truncated the e2e file; it was restored from git and re-applied. |
| impact / grc-lifecycle / ropa-exports / rights / portal / runner (rerun) | 41/41, 75/75, 58/58, 64/64, 19/19, 10/10 PASS |

## EX04 / EX12 — PostgreSQL value classification with measured quality; grant-based access exposure

**Built**
- `connectors/src/discovery/classifiers.ts` (`value-classifiers v1`, pure functions, unit-tested):
  - EMAIL, PHONE_IN, PAN (holder-type letter checked), AADHAAR (Verhoeff check digit, leading 2–9), PAYMENT_CARD (Luhn), IFSC and IPV4 (octet ranges);
  - a column is CONFIRMED at ≥80% of non-empty sampled values and POSSIBLE at ≥30%;
  - whole-value matching only, so free text containing an address is not an address column.
- `connectors/src/discovery/postgres-classify.ts`:
  - access: observer role only, read-only transaction, 10-second timeout, identifiers validated, the observer's read-only permission re-checked;
  - sampling: at most 1,000 rows (the first rows returned, stated as such), classifiable column types only, scope columns excluded; values are counted and discarded;
  - grants come from `pg_class.relacl` and `pg_attribute.attacl` through `aclexplode`, so the list is complete and not limited to the observer's own grants.
- Synthetic target migration `services/synthetic-target/migrations/0005_classification_corpus.sql` (TEST FIXTURE):
  - `customer_profiles` holds shaped columns plus decoys: 12-digit numbers failing Verhoeff, 16-digit numbers failing Luhn, and notes containing a few addresses;
  - its grants are deliberately uneven: the write agent can read `customer_profiles`, and `legacy_contact_exports` is `GRANT SELECT … TO PUBLIC`.
- Migration `0056_value_classification.sql`:
  - `classification_runs`: queued, then completed or failed once; one queued run per target.
  - `classification_labels`: append-only; the latest label per column is in force.
  - `classification_quality`: append-only.
  - Row security: staff read with `graph.read`; requesting a run needs `connection.enable`; labels and measurements need `graph.write`; the worker uses machine scope with `workflow.execute`.
- Domain `backend/domain/src/discovery/classification.ts`:
  - request, detail and list;
  - exposure findings for relations with a CONFIRMED sensitive column:
    - PUBLIC_CAN_READ: HIGH if Aadhaar, PAN or card; otherwise MEDIUM;
    - READ_WRITE_ROLE_CAN_READ;
    - ROLE_CAN_READ;
    - OWNER and ORVIA_OBSERVER, reported as information;
    - column-level grants on unclassified columns are ignored;
  - labels;
  - quality measurement: column-level true positives, false positives and false negatives, precision, recall and accuracy against the labels in force. POSSIBLE decisions are listed and not counted as predictions;
  - an exposure list with each target's latest classification.
- Worker `services/worker/src/classification.ts` is added to `services/worker/src/main.ts`. Each run gets a savepoint, 3 attempts, then `CLASSIFICATION_READ_FAILED`. A target that is no longer approved fails with `TARGET_NOT_APPROVED`.
- Contract 0.35.0 adds 8 routes.
- Screen (`/workspace/catalog-discovery`), per target:
  - request a sample;
  - runs, classified columns and "who can read the classified columns";
  - a reviewed-labels form;
  - measure quality, shown as precision/recall by category;
  - plus an "Access exposure" overview.
- The catalog notice was corrected: it had said the screen never classifies.

**Invariant test updated (review requested)**
- `tests/unit/graph.test.ts`: graph routes go from 21 to 28, with a new assertion that `request_classification_run` is `connection.enable`.
- New `tests/unit/value-classifiers.test.ts` (5 tests):
  - Verhoeff and Luhn accept and reject;
  - look-alike shapes;
  - share thresholds;
  - exposure grading.

**Honest limits**
- These cover one PostgreSQL relation per approved catalog target on the synthetic target. The EX04 targets for files, object stores, APIs and source-code flow are **not built**.
- The sample is the first rows returned, not a random or stratified sample. The run's limits say so.
- No classifier for names, addresses or free text. Such columns are "unclassified", never "clean".
- Exposure is derived from database grants only. It does not include application-layer access, row-security effects on what a grantee actually sees, or role membership inheritance; members of a granted role are not expanded.

**Executed (codex-a00, synthetic fixtures)**
| Command | Result |
|---|---|
| machine:init | applied target migration 0005 |
| contracts / typecheck / lint / unit | 373 examples, clean, clean, 257/257 |
| `tsx tests/integration/expansion/classification.test.ts` | 29/29 PASS. The first attempts failed on test mistakes: a duplicate target registration, and my wrong expectation that notes would count as emails. Coverage:<br>• an unapproved target is refused;<br>• an admin without `connection.enable` gets 403;<br>• a single queued run per target;<br>• the real worker sweep through the observer;<br>• 7 shaped columns CONFIRMED, checksum decoys and free text NONE;<br>• no sampled value stored (the database row is checked for the seeded values and the run marker);<br>• findings: the write agent at MEDIUM, observer and owner as INFO, PUBLIC on the legacy export table at MEDIUM (email and phone only);<br>• a missing relation reported as MISSING;<br>• labels, then quality at 12/12 with precision and recall 1;<br>• a relabel dropping email recall to 0.5 and correct to 11;<br>• a disabled target failing explicitly;<br>• auditor, tenant and database immutability. |
| `tsx tests/e2e/expansion-screens-local.ts` | 48/48 PASS (EX06, EX08, EX10/11, EX05, EX03, EX04/12). The EX04/12 phase requests a sample on screen, runs the worker, and checks classified columns and grantees shown with no sampled value on screen. It then records labels on screen, measures quality and shows the exposure overview. |
| catalog-flow / postgres-catalog (rerun after the target schema change) | 58/58, 13/13 PASS |

## EX09 — customer-controlled SMTP and webhook delivery (reviewed content, retries, receipts, alert routing)

**Built**
- `backend/domain/src/delivery/clients.ts`. Both clients report SENT, FAILED (retryable or not) or UNKNOWN; UNKNOWN means the connection ended after the message was handed over. Neither logs content, follows redirects or keeps a response body.
  - SMTP client:
    - EHLO, AUTH PLAIN, MAIL, RCPT, DATA, QUIT;
    - TLS with certificate verification;
    - plaintext only to loopback;
    - header-injection-safe subject;
    - dot-stuffing;
    - a Message-ID and `X-Orvia-Message` for dedupe;
    - 4xx retryable, 5xx final.
  - Webhook client:
    - HTTPS, or HTTP to loopback only;
    - no credentials in the URL;
    - `X-Orvia-Signature: sha256=HMAC(key, timestamp + "." + body)`, plus `Idempotency-Key`;
    - 2xx is SENT; 5xx, 408 and 429 are retried; other 4xx and 3xx are final.
- Migration `0057_delivery_transports.sql`:
  - `delivery_transports`: the destination is fixed; enabled once by someone other than the author; disabled once.
  - `alert_routings`: named "routing" because the deployment-boundary test treats "subscription" as commercial.
  - `outbound_messages`: reviewed content is immutable, and outcomes move forward only.
  - `outbound_attempts`: append-only.
  - The runner may append SENT or FAILED facts to `notification_deliveries` for tasks it delivered.
  - Credentials never enter the database:
    - an SMTP credential is the name of an environment variable (`ORVIA_TRANSPORT_*`, value `user:password`) on the customer's host;
    - a webhook key is derived by HMAC from the installation secret (`OperationsEnv.webhookSecret`) and shown once to someone with `connection.enable`.
- Domain `backend/domain/src/delivery/delivery.ts`:
  - transports, routings and messages: compose, then review by a second person, then approve or reject; withdrawal;
  - the runner pipeline:
    - `raiseAlertMessages`: one message per alert and routing, enforced by a unique index;
    - `claimDue`: a 60-second lease; an expired lease without a recorded attempt is recorded as UNKNOWN;
    - `sendClaim`: runs outside the transaction;
    - `recordResult`: backoff of 5, 10, 20 and 40 seconds, up to 5 attempts, then EXHAUSTED; a retry after UNKNOWN is marked `possible_duplicate`.
- Notifications: `channel_available` is now true only while an enabled transport serves the channel. Compliance alerts derive `delivery_state` (NOT_DELIVERED, QUEUED, SENT or FAILED) from routed messages.
- The operations runner now delivers (`alert_messages_raised`, `messages_sent`, `messages_retrying`, `messages_exhausted`).
- Contract 0.36.0 adds 13 routes. Enabling a transport and revealing its key need `connection.enable`.
- Screen `/workspace/delivery` ("Delivery" in the nav) shows:
  - transports: add SMTP or webhook, enable, show the signing key once, disable;
  - alert routing;
  - messages: compose, approve or reject, withdraw, and attempts with receipts, including "unknown effect" and "possible duplicate".

**Invariant test updated (review requested)**
- `tests/unit/notifications.test.ts`: notification routes go from 8 to 19, with a new assertion that enable and reveal are `connection.enable`. "No endpoint transmits" still holds; the comment now says the runner sends reviewed messages.

**Honest limits**
- STARTTLS is not implemented: SMTP runs over implicit TLS, or plaintext to loopback only. Only AUTH PLAIN is supported.
- These are local runs only: a loopback SMTP sink and webhook receiver. No real relay or endpoint was contacted, and none is qualified.
- No regulator endpoint exists or is invented. Regulator notifications remain reviewed tasks with evidence.
- A notification task's recipient is still a reference; the concrete address is entered when the message is composed.

**Executed (codex-a00, synthetic loopback sink and receiver)**
| Command | Result |
|---|---|
| migrate / contracts / typecheck / lint / unit | applied 0057; 386 examples; clean; clean; 257/257 |
| `tsx tests/integration/expansion/delivery.test.ts` | 41/41 PASS on the first run. Coverage:<br>• off-loopback plaintext, non-HTTPS and credentials-in-URL refused;<br>• the author cannot enable a transport or approve a message;<br>• unreviewed messages not sent;<br>• SENT with a 250 receipt, and AUTH with the named credential;<br>• no resend;<br>• 451 retried after backoff; 550 exhausted after one attempt;<br>• a hang after DATA recorded as UNKNOWN, then the retry SENT marked possible duplicate (two copies sharing `X-Orvia-Message`);<br>• a missing credential is final;<br>• withdrawal;<br>• a webhook 503 retried, then a signature verified with the once-revealed key and the idempotency key checked;<br>• a notification task SENT fact with the receipt as evidence;<br>• an ERROR alert routed once, with the alert showing SENT;<br>• a disabled transport refuses approval;<br>• auditor, tenant and database immutability. |
| notifications / grc-lifecycle / runner (rerun) | 31/31, 75/75, 10/10 PASS |
| `tsx tests/e2e/expansion-screens-local.ts` | 56/56 PASS; the EX09 phase ran against a loopback receiver. Two earlier attempts failed on my test code: a check made before the list refreshed, and a weak check, both replaced. On screen: add a webhook, a second person enables it and sees the key once, compose, the server refuses the author's own approval, a second person approves, the runner delivers a signed request, the receipt shows on screen, and the transport is disabled. |

## EX02 — website consent management (banner script, script blocking, visitor records, allowlisted scanner)

**Built**
- Migration `0058_cmp.sql`:
  - `cmp_sites`: a public `site_key` and origins that are HTTPS, or HTTP on loopback only. Origins are approved by someone other than the author; the site is enabled once and disabled once.
  - `cmp_configs`: versioned and published by someone other than the author, one published version per site.
  - `cmp_consents`: append-only visitor records, pseudonymous (a random id kept in a first-party cookie). A withdrawal is a new record.
  - `cmp_scans`.
  - Two narrow SECURITY DEFINER functions:
    - `app.cmp_published(key)`;
    - `app.cmp_record_consent(...)`, which checks that the site is enabled, the origin is approved, and the version is known. Every category must be present and boolean, and the necessary category cannot be refused. A visitor is limited to 20 choices per minute.
- Banner script, `backend/domain/src/cmp/sdk.ts`, served at `/cmp/{siteKey}/orvia-cmp.js` by this installation. It loads no other resource.
  - Declarative blocking: scripts marked `type="text/plain" data-orvia-category=… data-src=…`. A MutationObserver catches marked scripts inserted later.
  - Accessible dialog:
    - `role=dialog`, `aria-modal`, labelled and described;
    - focus trapped over visible controls; Escape records a refusal;
    - accept and refuse carry equal weight;
    - a Choose view with the necessary category shown on and locked.
  - Page language: `lang`, falling back to English.
  - GPC: applied as a refusal, with no banner, when the rule says so.
  - Withdrawal clears the declared cookies for withdrawn categories and reloads the page.
  - The configuration is embedded with `<`, `>` and line separators escaped.
- Public handlers, `backend/api/src/cmp.ts`:
  - the consent POST goes through `safeRoute`, so it is request-audited;
  - an origin is required and must be approved; cookies and authorization headers are refused;
  - preflight and CORS grant only the exact approved origin;
  - the body is capped at 4 KiB and validated against the schema.
  - Wiring: the Next catch-all dispatches `/api/v1/cmp/` and exports OPTIONS; `frontend/src/app/cmp/[siteKey]/orvia-cmp.js/route.ts` serves the script.
- Scanner, `services/worker/src/cmp-scanner.ts`, added to the worker loop:
  - runs local headless Chromium against the approved origin only;
  - three visits: no choice; accept all; and refuse in a fresh profile, then reload;
  - records hosts contacted and cookies set, never content;
  - the banner's consent posts are fulfilled locally, so scans add no visitor records.
  - Findings (`scanFindings`): TRACKER_BEFORE_CONSENT, TRACKER_AFTER_REFUSAL, COOKIE_BEFORE_CONSENT, UNDECLARED_HOST, UNDECLARED_COOKIE, DECLARED_NOT_SEEN and SDK_MISSING.
- Contract 0.37.0:
  - 10 staff routes, plus the PUBLIC `record_cmp_consent`;
  - new capability `cmp.record`, like `supplier.respond`: it is held by no role, and the public handler never uses the role path.
- Screen `/workspace/website-consent` ("Website consent" in the nav):
  - sites: add, approve origins, and an embed snippet with `OrviaCMP.open()` guidance;
  - banner versions: a JSON definition editor seeded from the published version or a template, plus publish and retire;
  - visitor-choice statistics from each visitor's latest choice;
  - scans with findings.
- Also changed: the third-party processor list is now newest first. It had the same random-id paging problem.

**Honest limits**
- The regional rule is opt-in with a recorded source. There is no per-region rule engine, and IAB TCF or other interoperability frameworks are not implemented or certified.
- The scanner visits one page per scan and needs Chromium on the host (it uses `@playwright/test`, currently a dev dependency). Packaging it for production installs is open.
- A script already executed before withdrawal is stopped by reloading the page. The SDK cannot unload it in place.
- Consent posts are request-audited but not written to the audit trail per visitor. The consent record itself is the append-only evidence.

**Executed (codex-a00, loopback test site and tracker)**
| Command | Result |
|---|---|
| migrate / contracts / typecheck / lint / unit | applied 0058; 397 examples; clean; clean; 257/257 |
| `tsx tests/integration/expansion/cmp.test.ts` | 44/44 PASS on the first run. Coverage:<br>• origin rules and second-person approval;<br>• no script before publication; publication by someone other than the author;<br>• a script-breakout string safely embedded; no external URL in the script;<br>• preflight granted to the exact origin only; foreign or missing origin 403; cookies refused;<br>• unknown, missing or necessary-refused categories and unknown versions refused;<br>• withdrawal as a record; stats from latest choices (3 visitors, 4 records, 1 GPC); a flood capped at 20 per minute;<br>• scans: a correctly marked page has no HIGH finding (tracker only after acceptance, cookie only after acceptance); a leaky page gives tracker before consent, after refusal, an undeclared host and a cookie before consent; scans add no records;<br>• auditor, tenant and immutability; a disabled site serves 404 for the script and the POST. |
| `tsx tests/e2e/expansion-screens-local.ts` | 69/69 PASS (all expansion families). Coverage in the EX02 phase:<br>• site approved on screen by a second person; banner published on screen by another approver;<br>• visitor opens a modal dialog with nothing optional loaded; focus starts on Accept; Tab moves through and wraps inside the dialog; keyboard refusal is recorded and loads no tracker;<br>• Choose shows Necessary locked on; granting Analytics loads the marked script and sets its cookie; withdrawing clears the cookie, reloads, and nothing loads;<br>• GPC gives an automatic refusal with no banner; the Hindi page gets Hindi text;<br>• a scan requested on screen, run by the worker, with findings shown.<br>Four earlier attempts failed:<br>• one on a real product bug: the focus trap counted hidden checkboxes, so Tab could leave the dialog (fixed in the SDK);<br>• one on the processor list's random-id paging (fixed in the product);<br>• two on test-harness issues: a transpiled init script referencing `__name` in the browser, replaced with plain source, and a brittle wait. |
| cmp / third-party (rerun) | 44/44, 43/43 PASS |

## EX14 cross-cutting — OPA cold start and readiness, backup/restore drill, runaway-statement limit, mixed-workload probe; SCIM proposal

**Built**
- OPA cold start and readiness:
  - `authorizationReady(config, deadlineMs)` in `backend/authorization/src/index.ts` asks the policy engine two control questions: an allow (AUDITOR `grc.read`) and a deny (MEMBER `grc.write`). It is ready only when both come back correct inside the deadline. A missing policy, a partial bundle or a policy that allows everything therefore all read as not ready.
  - `backend/api/src/readiness.ts` serves `/readyz` (`frontend/src/app/readyz/route.ts`): 200 with the checks when ready, 503 otherwise. It is unauthenticated and returns no tenant data.
  - `scripts/app-run.ts` waits for `/readyz`, not only for the port.
  - `scripts/service-readiness.ts` runs the same allow and deny controls against OPA.
  - Request authorization was already fail-closed. The test proves it stays closed while the engine is down and cold.
- Backup and restore drill, `pnpm run backup:drill confirm:<profile>` (`scripts/backup-drill.ts`):
  - A full logical dump with the server's own `pg_dump`, run inside the profile's database container so the tool version matches the server. It is written mode 0600 under `<profile>/backups/`, with a SHA-256 manifest.
  - The file is re-verified against the manifest before it is restored into a scratch database.
  - The restored copy is checked against the source: identical migration ids and checksums, identical row counts for ten obligation-bearing tables, every withdrawn consent still withdrawn (a digest of the ids), and every `app` table still forcing row security.
  - The scratch database is then dropped. Nothing leaves the host.
- Server-side statement limits, a defect found by the capacity probe:
  - Runtime and service pools had only a client-side `query_timeout` (10 s). When a query outlived its caller, the server kept running it. Under load the scratch probe left 16 backends consuming the database long after the client had gone.
  - Pools now also send `statement_timeout` 9 s and `idle_in_transaction_session_timeout` 15 s (`SERVER_LIMITS` in `database/customer/src/runtime.ts`, also used by `servicePool` in `backend/auth/src/machine.ts`). The server now cancels first and the client receives a clean cancellation.
- Mixed-workload probe, `pnpm run capacity:mixed confirm:codex-a00 [seconds] [clients]` (`scripts/capacity-mixed.ts`):
  - It builds a scratch database from a schema-only dump, then seeds one scope with 1,000,000 audit events, 100,000 principals and 200,000 privacy requests.
  - It runs concurrent clients as `orvia_app` through `scopedTransaction`, with forced row security, over a weighted mix: keyset lists, point reads, inserts and 2,000-row export chunks.
  - It records throughput and p50/p95/p99 per operation, and the database container's memory limit.
  - The scratch drop is verified before it is reported. An earlier draft reported "dropped" without checking.

**SCIM and enterprise SSO: proposal, not built**
- This build has deliberately no route through which a role can be granted (`ROLE_GRANTS` in `backend/domain/src/audit/audit.ts`). Roles come only from the protected local setup, which records its own event. SCIM provisioning is by definition a remote role- and user-granting interface.
- Building SCIM would change the product's authority model. It also needs the customer's IdP choice (OIDC or SAML), a group-to-role mapping owner, and a decision on whether de-provisioning revokes sessions immediately. Those are user and customer decisions, not engineering defaults.
- Proposed shape for when they are made:
  1. OIDC sign-in against the customer's IdP, with local MFA still required for privileged roles.
  2. SCIM 2.0 `/Users` and `/Groups`, reachable only on the customer network, authenticated with a customer-held bearer credential that is rotated through the existing secret files.
  3. Group-to-role mapping held in a reviewed table that needs two people to change, with every grant audited under `ROLE_GRANTS`.
  4. De-provisioning ends sessions and supplier or response links owned by the user.
- The `ROLE_GRANTS` invariant test must be updated in the same change.

**Honest limits**
- Readiness proves the policy engine answers two known questions correctly. It does not prove every policy module is current: bundle signing and versioning are a release-packaging item.
- The drill is a same-host logical backup. Off-host copies, encryption at rest, retention and a recovery-time objective belong to the deployment and customer, and are not qualified.
- The capacity probe is diagnostic on this development host. It is not the EX14 "representative 1M mixed workload" qualification. See its result below.

**Executed (codex-a00)**
| Command | Result |
|---|---|
| `tsx tests/integration/opa/cold-start.test.ts` | 8/8 PASS. Ready about 283 ms after the engine started; warm p95 2 ms; readiness false and authorization fail-closed while the engine was down. `/readyz` probed: 200 warm, 503 with OPA stopped. |
| `tsx tests/integration/monitoring/backup-drill.test.ts` | 5/5 PASS, run before the evidence-write line was added. 12.9 MB; backup about 2 s, restore about 4.4 s; migrations, counts, withdrawals and forced RLS identical; a single-byte tamper is rejected; scratch database removed. |
| `pnpm run capacity:mixed confirm:codex-a00 45 16` | **Did not meet any reasonable bar. Recorded as a finding, not a result.** About 4 ops/s. list_requests p50 685 ms / p95 4.9 s; list_audit p50 5.4 s; export chunk p50 5.2 s; 29 client timeouts. The database container is capped at **384 MiB** on a 4-core host, and the 600 MB scratch database did not fit, so it thrashed. The client-side timeouts left 17 server backends running after the probe exited, and the scratch database `orvia_capacity_f56865f4cb3d` could not be dropped. Restarting the container to clear them was not authorised in this session. Artifact: `A00-capacity-mixed-1790425887473-…json`. |
| typecheck / lint (changed files) | clean |

**NOT_RUN, for Codex or the next session**
1. Once the backends have drained (or after the user restarts the codex-a00 Postgres container), drop `orvia_capacity_f56865f4cb3d` if it is still present.
2. Re-run the probe with the new server `statement_timeout`: first with fewer clients (4), then with a database memory limit sized for the data.
3. Run `EXPLAIN (ANALYZE)` as `orvia_app` for the keyset lists. `app.in_scope` compares `column::text = current_setting(...)`, which can never be an index condition. Plans stay indexed only while handlers also pass explicit `tenant_id=$1` predicates, and that needs verifying on the 1M dataset.
4. Re-run cold-start, drill and the full unit, e2e and DPDP battery after the `SERVER_LIMITS` pool change. It is typechecked but not yet exercised at runtime.
5. EX01 channel preferences and EX13 commerce were not built. EX13 needs a payment provider and commercial terms from the user.
6. Reconcile `tracking/v1-expansion.json` (task #17).

**Follow-up (same day):** `pnpm test` 257/257 PASS after the `SERVER_LIMITS` change. `tracking/v1-expansion.json` reconciled (acceptance still NOT_RUN everywhere). Database-backed suites stay NOT_RUN until the codex-a00 Postgres container is restarted: the 17 stuck backends from the capacity probe were still present at the time of writing.
