# ORVIA — API, event and state contracts

**Product:** ORVIA Version 1 · **Build-pack edition:** 1.0 · **Prepared:** 19 September 2026  
**Authority:** [Approved master, document revision 1.4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md) · **Repository baseline:** `5a07649e5115995406e62de00b73e2c9fc560060`  
**Purpose:** Existing wire compatibility and proposed extensions for remaining V1 functions; not a competing executable schema.

This is an implementation specification, not evidence of completed software. `REQ` denotes a source-derived requirement, `OBS` a repository observation, `DESIGN` a proposed implementation detail, and `OPEN` a decision requiring its named owner. Exact technical shapes not supplied by the master are labelled design proposals; they do not silently become product or legal facts. Follow [Agent build rules](AGENT_BUILD_RULES.md).

## 1. Contract authority

The executable source is currently `packages/contracts/src/index.ts` plus its generator/client/examples. At inspected commit `5a07649e5115995406e62de00b73e2c9fc560060`, transport `CONTRACT_VERSION = 0.5.0`, signed commands `COMMAND_SCHEMA_VERSION = 0.3.0`, and `PROFILE = CUSTOMER_LOCAL_SYNTHETIC`. This is an OBS, not a production contract release claim. Generate OpenAPI/types/examples from the canonical schema; do not copy these design tables into a second handwritten contract implementation.

Product Version 1, document revision 1.4, transport version, signed-command schema, database migration version, policy schema and connector version are different identities. A feature or package rename must not silently change any of them. Source requirements: [§97](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-97), [§98](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-98), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99), [§100](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-100), [§101](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-101), [§114](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-114), [§147](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-147), [§148](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-148), [§149](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-149).

## 2. Existing fragment to preserve and extend

| Current contract fact | Implication for remaining work |
|---|---|
| Scope contains `tenant_id`, `legal_entity_id`, `environment_id` | Add supported subtenant semantics deliberately; do not remove current scope checks |
| Staff and principal authority are distinct | Vendor staff/commercial authority needs independent configuration, not an extra global role accepted everywhere |
| Staff roles include ORG_SUPER_ADMIN, ORG_ADMIN, MEMBER, AUDITOR | Add specialised/delegable capability sets compatibly; no role enum is sufficient authority alone |
| Consent uses NOT_GIVEN, GRANTED, WITHDRAWN with `expected_epoch`/`interaction_id` | Preserve concurrency/retry semantics while adding expiry/provenance/other contexts |
| Grant requires exact notice version and affirmative=true; withdrawal does not request notice acceptance | Preserve this product behaviour |
| Workflow states ACCEPTED, RUNNING, NEEDS_ATTENTION, COMPLETED | Do not overload them as rights identity/response/erasure states |
| Execution states PENDING, RUNNING, ACKNOWLEDGED, EFFECT_UNKNOWN, FAILED, MANUAL_REQUIRED, SKIPPED | Add effects only through reviewed transitions; unknown is not failed or verified |
| Observation states NOT_CHECKED, OBSERVED_SATISFIED, OBSERVED_NOT_SATISFIED, UNVERIFIABLE, STALE | Keep independent methods/freshness/generation and completion criteria |
| Decisions ALLOW, BLOCK, INDETERMINATE | Extend to master's obligations/decisions with explicit SDK and adapter support |
| Reconciliation states PENDING, RECONCILING, RESOLVED, INCONCLUSIVE, FAILED | RESOLVED requires actual supported observation/receipt semantics |
| Test states NOT_RUN, RUNNING, PASS, FAIL, ERROR, SKIPPED | Interruption/unsupported dependency cannot become PASS |
| Purpose codes, language, principal email and operation enums are synthetic-limited | Define real validated schemas, not blanket removal of restrictions |
| Signed envelope uses Ed25519 and exact plan/scope/approval digests, nonce and bounded lifetime | Preserve versioned verification and key separation; no new custom crypto |

Current known routes include `/api/v1/portal/me/consents`, grant/withdraw/history/receipt endpoints; `/api/v1/admin/policies/{id}/publish` and reauthenticate; workflow/action/manual-task/evidence/test-run/control-map endpoints; machine poll/receipt and explicitly synthetic simulator endpoints. These route families are present in inspected schemas. Existing schema presence does not independently prove every implementation or current passing test. Evidence: R-CONTRACT in [baseline](REPOSITORY_BASELINE_AND_TRANSITION.md).

## 3. Global request/response obligations

**REQ:** authenticate, authorise, scope, validate, rate-limit, audit and handle failure for each supported endpoint. **DESIGN:** central middleware/application wrapper supplies request context, while each domain validates its own resources/versions. Reject unknown request fields where a strict schema is required, particularly licences/commands/diagnostics. Do not rely on redaction after forwarding.

Use existing safe error envelope: stable code, human-safe message, retry classification, bounded field errors and request ID. Never include SQL, stack traces, credential fragments, internal hostnames or input body dumps. Public principal errors must not enumerate existence; distinguish staff-safe detail from external portal wording.

| Outcome | Suggested HTTP semantics (compatible extension) |
|---|---|
| Read/confirmed synchronous result | 200 |
| Created local resource | 201 |
| Durable asynchronous acceptance | 202 + stable operation/request reference; not completion |
| Invalid schema/unsupported field | 400 or existing canonical validation response |
| Missing/expired identity | 401 |
| Known caller lacks capability | 403; public non-enumeration may use a consistent safe 404 policy |
| Missing/inaccessible public resource | Scoped 404 policy; never raw DB error |
| Expected version/epoch/idempotency digest conflict | 409 with safe refresh/review semantics |
| Rate limit | 429 with bounded supported retry guidance |
| Missing service/unsupported installed capability | Explicit canonical service/unsupported response; never fake 2xx effect |

New exact codes/statuses are DESIGN, reviewed once in the canonical schema. Preserve currently generated clients. Do not introduce free-form arbitrary status strings in components.

Pagination uses bounded limits and stable cursors; current default/maximum are schema-defined. Cursor scope/filter/order must match; reject invalid/replayed cross-scope cursors safely. Reads and exports cannot bypass scope via unbounded query parameters. Query mutations require CSRF/origin protection where cookie-based; machine clients use their own credential model.

Idempotency binds actor/scope/operation/resource plus payload digest to a stable intent. Same intent/digest returns original accepted resource/result; altered payload conflicts. Transport attempt IDs differ from effect identities. Keep replay protection and authorisation freshness even on idempotent replay; an expired user does not recover privileged data through an old key.

## 4. Proposed remaining customer API families

These paths and command names are **DESIGN proposals**, not implemented endpoints. Integrate them into the existing `/api/v1/admin`, `/api/v1/portal/me` and `/api/v1/machine` conventions where coherent. A path is not permission; actual server scope is validated. Reuse an existing endpoint if it already provides the exact semantics instead of adding an alias.

| Family | Proposed operations | Authority and payload scope | Semantics / invariants |
|---|---|---|---|
| Installation claim | `POST /api/v1/setup/claim`, setup readiness | Installation-local one-use bootstrap proof | No normal admin surface before activation; exactly one owner; no vendor token |
| Members/invitations | scoped list/invite/accept/revoke, role binding | Local owner or explicit delegator; invitee claim | Expected revision, single-use token, delegable subset; no directory export to vendor |
| Ownership | propose/approve/execute transfer or customer recovery | Fresh owner/customer-held recovery | Atomic single assignment; concurrent conflict; audit |
| Organisation/environments | scoped configuration CRUD/state transition | Approved owner/delegated scope | No accidental new organisation owner per environment |
| Graph/inventory | list typed nodes/relationships, discovery job, review snapshot | Read/discovery/configuration capabilities | Bounded snapshot, typed references, asserted/observed provenance |
| Sources/applicability | register reviewed pack, assess applicability, publish mapping | Qualified reviewer workflow plus local capability | Immutable source/version; legal dates never invented by generic code |
| Notice/purpose migration | create/diff/review/publish version, migration plan | Author then required independent reviewer | Exact digest/scope; material expansion cannot inherit old grant |
| Consent import/expiry | approved provenance import, expiry reevaluation | Scoped local operator/job | Keep epoch ordering and historic receipt; no direct raw state setter |
| Rights | `POST /api/v1/portal/me/requests`; own status/response; staff scope/review/actions | Principal/mandate; customer operator separately | Accepted receipt, no enumeration, distinct identity/execution/response |
| Representation | own nomination/mandate create/amend/revoke/invoke; staff verify | Principal/representative plus reviewer | Limited authority not account takeover; revoke affects later actions |
| Plans/approvals | create/get/review/approve/cancel plan | Current scope + maker/checker where required | Immutable digest/generation/version/expiry/budget; no free SQL/shell |
| Connection setup | create draft, test TLS/permissions, select resources, map, activate | Local integration admin | Secret reference only; read-only first; actual checked capability |
| Local imports | create/upload job, map/preview/approve/run/status/purge | Local import capability and target scope | Validated format/schema; exact mapping approval; safe chunking/deduplication |
| Control decisions | current-authority check/admission, obligation receipt | Scoped service/API/SDK identity | Separate preview from use; reject unsupported obligation; no global proxy |
| Retention/holds/deletion | evaluate eligibility; create/review/release hold; create/approve plan | Scoped retention reviewer and executor | Copy-level outcomes; current hold/epoch/generation at effect |
| Processor/governance | contracts/relationships/assessments/findings/remediation | Customer privacy/governance capability | Statement vs observation; immutable assessment scope/source |
| Incidents/clocks | create/edit append event; obligation drafts/review/dispatch evidence | Customer incident/dispatch roles | Independent trigger/recipient clocks; corrections append |
| Notifications/webhooks | delivery settings, approved endpoint, task history/retry | Local notification admin/operator | Credentials local; delivery deduplication; no vendor operational relay |
| Tests/packages/drift | definitions/runs/history/fixtures/packages/simulation review | Scoped engineering/CI identities | Explicit synthetic budget; no assumed production coverage |
| Evidence/reports/export | job create/status/download/revoke; integrity metadata | Evidence/export permission + record scope | Local authenticated expiring delivery; minimised contents |
| Local support | diagnostic draft/preview/approve/transfer status | Customer Support Admin | Exact per-report fields/digest; no runtime remote session |
| Licence/update | import/verify/plan/apply/status | Local owner/IT authority | Download/entitlement not execution permission; preserve continuity |
| Backup/recovery/offboard | approved job/checklist/status/export/revoke | Customer IT/local owner | No database reset endpoint; quarantine before unsafe resume |
| Optional help/search | authorised local keyword/runbook query | Current read scope | No model endpoint, free-text execution or external fallback |

For each accepted new operation, the schema author records request/response fields, authority domain/capability, resource scope, versions, idempotency, errors, audit event and contract fixture. UI and workers consume generated types. This table is not permission to scaffold every route before implementing it.

## 5. Vendor API families — separate host/store

Use a separately composed vendor API for commercial-account and vendor-staff audiences. Proposed namespaces `/api/v1/account/...` and `/api/v1/staff/...` must be reviewed against actual deployment/auth configuration; they never route into a customer Workspace.

| Family | Required behaviour | Forbidden fields/actions |
|---|---|---|
| Commercial profile/contacts | Necessary nominated contacts, own account access, retention/correction | Runtime member IDs/roles/activity and client records |
| Catalogue/order/subscription | Reviewed server-side terms, verified payment status | Client counts as usage billing or browser-created paid state |
| Payment callback | Provider verification, deduplication, order/account binding, replay/reconciliation | Treating arbitrary body or redirect as confirmation |
| Licence/entitlement issuance | Signed immutable entitlement document and eligible download | Commands, runtime roles, operational endpoints or secrets |
| Artifact/download | Account eligibility, exact release/profile/digest and expiry | Claiming download equals installation/health |
| Assigned organisation/case | Only permitted business/contact/report facts under current assignment | Global access to customer runtime or unassigned cases |
| Diagnostic receipt | Strict approved public taxonomy/value/size checks and receipt timestamps | Operational IDs, hostname/schema names, free text, workload summaries, credentials |
| Guidance/fix assignment | Reviewed runbook/patch download eligibility | Remote apply command or auto-execution grant |
| Staff/retention/privacy administration | Audited least privilege and vendor-held contact/service lifecycle | Cross-customer disclosure or deletion of local customer records |

Do not create remote-session, staff-directory synchronisation, live fleet telemetry or runtime SQL endpoints. The absence requirement must cover direct API calls and jobs, not just navigation.

## 6. Minimum diagnostic payload contract

The master example includes schema version, vendor case/licence/random installation references, product/component version, predefined issue code, customer-selected urgency and public diagnostic check/result enums. Exact fields are admitted only when necessary under §31. **DESIGN:** canonicalise and store the approved report bytes locally, with a digest/destination/purpose/approval reference not containing operational IDs. Revalidate immediately before transfer.

A changed field, new error text, different destination, broadened component name or new report invalidates the approval. Reusing the exact immutable report for a bounded authorised delivery retry is not permission to generate another report. Vendor ingress rejects unknown/oversized fields without retaining their body in logs. A schema that accepts any string for an error or component name is not a meaningful allowlist.

Case/report IDs are vendor-side support references. Do not include local workflow/action/principal/member IDs, request URLs or stack traces. Support response contains reviewed guidance and eligible artifact references, not executable commands. Customer initiates all diagnostic execution and patch application. Sources: [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§93](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-93), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§96](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-96).

## 7. Event envelope and durability

**REQ fields:** event ID/schema version; tenant/environment; aggregate ID/version; occurrence/recording time; payload classification/minimised body or protected reference; causation and correlation IDs. **DESIGN:** use a schema-controlled event `type`, compatible `version`, source/authority domain, idempotent consumer key and explicit resource scope. Do not embed full principal records or credentials in queue/search headers.

| Event group | Producer | Consumer / outcome |
|---|---|---|
| consent accepted/withdrawn | Consent transaction/outbox | Revocation propagation and privacy workflow |
| request received/verified/scoped | Rights service | Plan/approval/execution and response tasks |
| policy published / graph changed | Reviewed policy/graph transaction | Local bundle projection, impact and regression |
| action attempted/receipt/unknown/observed | Worker/agent/verification | Evidence, reconciliation, gap and notification |
| retention eligible / hold released | Retention service | Fresh scope review and approved plan |
| incident created / clock corrected | Incident service | Independent notification/review tasks |
| test failed / drift detected | Test/drift service | Affected-control gap and owner escalation |
| import completed/partial | Import service | Provenance/index refresh, never implied source mutation |
| diagnostic approved/received | Separate local export/vendor receipt | Per-report delivery only; no persistent telemetry subscription |
| payment confirmed / licence issued | Vendor commercial service | Idempotent entitlement/download workflow only |

Keep two streams of authority: vendor commercial events do not initiate customer privacy effects. A local licence update uses its defined verifier/continuity path, not a direct remote-control event consumer.

Consumers dedupe by event/consumer identity, preserve aggregate ordering where required and reject stale generations/epochs at use. Missing tenant context rejects before reads. Delivery retries do not claim exactly-once effects. Store dead-letter reason and accountable next action with bounded inspection. Sources: [§17](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-17), [§25](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-25), [§30](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-30), [§98](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-98), [§99](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-99), [§100](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-100), [§175](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-175).

## 8. State transition contracts

| Aggregate | Allowed conceptual progression | Rejection/review condition |
|---|---|---|
| Published policy | Draft → review/approval → published → superseded/archived | Direct edit of published version; wrong/expired proof; self-review where prohibited |
| Consent | Current state + accepted new interaction → next epoch; valid new grant possible | Stale epoch, duplicate altered payload, old import/replay |
| Rights request | Master RECEIVED/PENDING_VERIFICATION/VERIFIED/SCOPING/AWAITING_APPROVAL/EXECUTING/PARTIALLY_COMPLETED/COMPLETED/FAILED/ESCALATED/REJECTED/CLOSED | Use exact transition map; CLOSED is not synonymous with verified erasure |
| Action | Planned/pending → authorised attempt → receipt/unknown/failure; separate observation | Scope/generation/approval/capability mismatch; no blind retry after unknown |
| Verification | Not checked → supported observation → satisfied/not satisfied; later stale | Unsupported method/time/scope cannot yield verified |
| Import | Draft/uploaded → validated → mapped → previewed/approved → running → completed/partial/failed → purged as policy permits | Unsafe file, changed mapping, unapproved rows or stale consent conflict |
| Diagnostic | Draft → valid preview → exact approval → approved transfer → received/failed/revoked | Changed payload/destination; new report without new approval |
| Vendor support | RECEIVED → TRIAGED → NEEDS_CUSTOMER_DIAGNOSTIC/REPRODUCING → FIX_OR_GUIDANCE_READY → AWAITING_CUSTOMER_VALIDATION → RESOLVED/REOPENED | Resolution cannot change local privacy verification |
| Update | Planned → verified → customer-approved → applying → validated/failed/recovery | Trust/schema/profile failure; unreviewed egress or feature expansion |

Unspecified wire enum names for new aggregates are DESIGN, not ready-made canonical constants. Register transition invariants and negative tests centrally with schema changes. Preserve exact older representations through tested compatibility adapters where necessary.

## 9. Required contract tests

Generate old/new request fixtures; reject unknown fields/wrong scope/invalid enum/oversized inputs; verify duplicate intent versus changed payload; validate response shape; test revoked identity and approval expiry after lock/queue waits; verify machine signature binding/replay/version; confirm pagination covers full supported scope without duplication; test unsupported decisions at old SDKs; verify diagnostic field/value denial and safe errors.

Separate production and synthetic contract variants explicitly. No wildcard connector enum or arbitrary SQL payload introduced to make the prototype accept real data. Persisted API/event histories and running workflows require migration/replay compatibility. These tests complement—not replace—the source acceptance matrix in [TEST_AND_ACCEPTANCE](TEST_AND_ACCEPTANCE.md).
