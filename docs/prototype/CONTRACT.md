# Shared prototype contract — accepted version 0.2.1

**Current executable candidate:** 0.3.0 from A02 at `3242521e59966885d8053747a82d96cb92ea55d5`, human-integrated in `004fe3d`. It adds configuration/consent implementation and four coordinated routes. Work's [A02 review](../reviews/work/W01_A02_REVIEW.md) requires W01-A02-F01 correction/retest before candidate acceptance. The 0.2.1 acceptance below remains the historical baseline, not a claim that current executable schemas are still 0.2.1. See section 10 for candidate additions.

**Status:** Work accepts executable version 0.2.1 at `58ceddcd73b9b9f0717553bbd1e2fff3f7389abe`; see [acceptance review](../reviews/work/W00_A00_ACCEPTANCE.md). This freezes interfaces/semantics, not completed business endpoints or full application acceptance.
**Schema writer:** Codex. **Semantic reviewer:** Work. **Consumer:** Claude Code.

**Implementation checkpoint:** Work accepts A01 at `50cb4daeded9253c4f7cca4f742cb212c10aa5b7`; see [W01 authority review](../reviews/work/AUTH_AND_CONSENT.md). Auth mounts, session and principal list/create now join health as implemented interfaces. This updates implementation status only; contract semantics remain 0.2.1 and W01 awaits A02.

A00 supplies canonical executable Zod schemas and generated OpenAPI/client types/examples in `packages/contracts/`. Consume those exact artifacts and [the coordinated producer proposal](../engineering/A00-CONTRACT-PROPOSAL.md). Do not maintain duplicate UI DTOs or invent endpoints. Producer-generated PENDING_W00 labels describe submission state; the exact acceptance above governs this version. Codex owns metadata refresh and the accepted seed; future semantic changes require coordinated versioning and retest.

## 1. Names, scope and identity

Product name: **ORVIA**. Repository/project: `cyberfyx-orvia`. Product version: 1. Plan version: 1.0. API base: `/api/v1`. JSON field names: `snake_case`. Internal TypeScript naming may use camelCase with explicit mapping. UUID identifiers; timestamps in UTC ISO 8601; UI may display Asia/Kolkata with a zone label.

Authorisation evaluates authenticated trust domain, organisation, legal entity/environment, resource and capability. Derive actor/tenant/principal context from validated server sessions or scoped machine credentials. Request-body IDs are selectors only, never grants of authority. Use tenant-aware references/constraints and transaction-scoped RLS context with a non-owner, non-superuser, non-BYPASSRLS application role.

The prototype has distinct `STAFF`, `PRINCIPAL` and `MACHINE` authorities. Vendor identities are not accepted. Staff and principal sessions are independently scoped; the person cannot choose an arbitrary principal ID in a self-service route. Privileged users use real MFA through the selected auth integration. No universal admin boolean, hardcoded password or role-switch bypass.

Default role/capability subset: ORG_SUPER_ADMIN administers the scoped installation; ORG_ADMIN prepares assigned configuration; MEMBER has only assigned workflow/task actions; AUDITOR is read-only; DATA_PRINCIPAL uses only its own Privacy Centre. Preserve specialised master roles in the roadmap/capability model. Do not pretend every role-management flow is implemented. Policy publish requires an authorised reviewer different from the author for the demonstration, approving an exact immutable version.

## 2. Core data model

Relational groups, not a generic JSON document/table editor:

- organisations, legal_entities, environments; staff/principal identities and memberships/sessions using the auth library's supported schema.
- principal_references and exact tenant-scoped target mappings; systems, purpose_versions, notice_versions, policy_versions and purpose-system edges.
- consent_aggregates, consent_events, outbox_events and idempotency_records.
- workflows, action_plans, actions, approvals, agent_commands/receipts and manual_tasks.
- observations, evidence_records, audit_events, test_runs/test_case_results and capability_records.

Each customer-owned row has an explicit scope strategy. Required uniqueness: `(tenant_id, legal_entity_id, principal_reference_id, purpose_id)` aggregate; scoped idempotency key/request digest; stable workflow/event ID; per-action command identity; immutable published version IDs. Use composite tenant foreign keys where relevant. Schema indexes and migrations are owned by Codex.

## 3. Separate states; do not collapse uncertainty

| Axis | Allowed prototype states |
|---|---|
| Consent | `NOT_GIVEN`, `GRANTED`, `WITHDRAWN` |
| Workflow | `ACCEPTED`, `RUNNING`, `NEEDS_ATTENTION`, `COMPLETED` |
| Action execution | `PENDING`, `RUNNING`, `ACKNOWLEDGED`, `EFFECT_UNKNOWN`, `FAILED`, `MANUAL_REQUIRED`, `SKIPPED` |
| Reconciliation | `PENDING`, `RECONCILING`, `RESOLVED`, `INCONCLUSIVE`, `FAILED` |
| Observation | `NOT_CHECKED`, `OBSERVED_SATISFIED`, `OBSERVED_NOT_SATISFIED`, `UNVERIFIABLE`, `STALE` |
| Processing decision | `ALLOW`, `BLOCK`, `INDETERMINATE` |
| Test result | `NOT_RUN`, `RUNNING`, `PASS`, `FAIL`, `ERROR`, `SKIPPED` |

`ACKNOWLEDGED` means the target acknowledged a command, not that a separate observation proved the desired effect. A historical `EFFECT_UNKNOWN` attempt remains retained; supported reconciliation adds separate evidence and never fabricates an ACK. `FAILED` means a known failed operation, not merely a network timeout. An unimplemented connector is not a success. `SKIPPED` requires an explicit non-applicability reason and must not conceal a required obligation.

A workflow is COMPLETED only when every scoped obligation meets its declared criterion; empty or unresolved sets remain NEEDS_ATTENTION. CURRENT_SCOPED_OBSERVATION requires a fresh, satisfied SCOPED_READ in current scope; provider receipts and ACKs cannot satisfy it. ATTRIBUTED_MANUAL_ATTESTATION is a distinct administrative criterion and cannot substitute for independent observation. Non-required omissions need a reason. A later supported read can satisfy an obligation while its historical attempt remains EFFECT_UNKNOWN. Observations can become STALE. A03/A05 must derive current scope and enforce exact action/resource/generation references server-side; the helper does not establish these references itself.

Reconciliation is a separate record linked to the uncertain attempt: PENDING → RECONCILING → RESOLVED/INCONCLUSIVE/FAILED. State-consistent start/end times, observation references for resolution and reasons for unresolved terminal outcomes are required. A retry creates another record rather than rewriting historical execution.

## 4. Consent and receipt semantics

Grant and withdrawal require the person's authenticated scope, a supported purpose, valid interaction/notice context and an `Idempotency-Key` header. Grant supplies `notice_version_id`; withdrawal must not force acceptance of a new notice. Both use `expected_epoch` to prevent stale updates.

Authenticate and authorise the own-principal operation before idempotency replay. Resolve supported purpose/interaction; compare the scoped key and normalized digest before checking a new operation's expected epoch. An identical authorised retry returns its original response even after later epochs; conflicting key reuse is IDEMPOTENCY_CONFLICT and a stale new operation is EPOCH_CONFLICT. Aggregate lock, state/event/outbox, receipt and idempotency response commit in one transaction. Do not use client timestamps for ordering.

The receipt exposes `receipt_id`, `event_id`, `purpose_id`, `consent_status`, `consent_epoch`, `accepted_at`, `workflow_id` when propagation is required, and `propagation_status`. A 202 acceptance response does not claim downstream completion. POST Receipt is immutable: propagation_status is ACCEPTED with a workflow ID or NOT_REQUIRED with null. GET returns ReceiptView `{receipt,current}`. The receipt stays unchanged; current consent state/epoch describe the aggregate, while current propagation status describes the original receipt's workflow at as_of. A refreshed page shows persisted state without implying the old workflow controls a newer generation.

An old grant event cannot reduce the epoch or create a new grant. Fresh re-consent requires a new authenticated interaction at a higher epoch. Before an old worker mutates a target, re-evaluate current consent/scope/generation so stale cleanup cannot affect newly authorised records.

## 5. Administrative permission vs processing permission

A staff permission to configure a policy does not permit using personal data. Processing evaluation resolves current consent, current published policy and the separately approved condition **on the server**. The browser must not supply trusted consent state or an “approved legal basis” boolean.

Marketing ALLOW requires the configured affirmative condition and fulfilled obligations. Missing, withdrawn, malformed or indeterminate authority blocks/queues this demonstration boundary; no fail-open fallback. Order-service is evaluated from its own explicit synthetic approved condition and context. The demonstration does not declare all service messages legally exempt.

A preview evaluation has no authority to send. At actual simulated admission, re-read the authoritative scope/epoch. Use the same aggregate lock/transactional ordering for admission and withdrawal in this local supported path, or an equivalently tested protocol. If withdrawal commits first, no marketing send row can be admitted. Document the linearisation point and test concurrent requests; do not claim distributed global atomicity.

## 6. Workflow, command and connector contract

Outbox dispatch starts a stable workflow identity derived from the accepted event and scope. Duplicate dispatch attaches to the existing logical workflow. Persist Temporal development state; process restart must not discard accepted requests. Retry only classified safe operations; bounded backoff and attempts are explicit, with manual escalation rather than infinite loops.

Every action plan binds target/resource, exact subject mapping, purpose, policy version, triggering epoch, target generation, operation, capability version and scope digest. The agent independently validates the locally Ed25519-signed CommandPayload: schema/command/installation/signing-key identity, PlanBinding (workflow/action, tenant/legal entity/environment, exact subject/resource/purpose/policy, capability/version, epoch/generation and operation budget), complete scope/plan/approval digests, issued/expiry times and nonce. Approval is an independent reviewer decision or explicit authorised NOT_REQUIRED_BY_POLICY for the allowlisted synthetic non-destructive restriction. ORVIA-CJSON-1 canonicalization and digest rules are defined by the shared crypto module/proposal. Limits are one record, at most three attempts and a positive lifetime of at most five minutes; a valid signature alone is not current authority or replay protection. The agent rejects wrong scope, expiry, unauthorised operation and altered signature. Replayed known command IDs return their prior outcome or reconciliation, never duplicate effects. Scope changes require a new reviewed plan.

For the synthetic CRM, enforce generation/epoch comparison at the target mutation itself, not only in an earlier planner check. Reject a stale command against a newer record generation. A new grant must not allow processing through an unresolved older suppression state without re-evaluating/reconciling it. Record the precise ordering protocol and test it; do not claim the same atomicity for real third-party APIs that lack it.

CRM adapter: exact synthetic subject reference; natural-idempotent marketing membership removal; separate read-after-write. REST simulator adapter: restrict/read/receipt capabilities with explicit fault modes. Legacy target: no automated mutation, assigned manual task. Permission loss changes effective coverage immediately. No arbitrary-host connector or arbitrary SQL query feature.

Only the agent has target mutation credentials. The workflow/API identity does not gain target database ownership. All credentials and signing authority stay local and separate from vendor commerce/release identity.

## 7. Verification and evidence

An observation records target, resource, generation, method, observed_at, desired/observed state summary, action reference and known limits. Do not count acknowledgement, task closure or intended policy as observation. Missing read permission is UNVERIFIABLE, not an optimistic pass.

Evidence records include consent event/receipt, immutable policy/notice versions, plan/action/command references, execution history, observations, manual attestations, tests and unresolved coverage. Exports are generated locally, authenticated, scope-filtered and audited. Use synthetic opaque references where possible; avoid unnecessary raw identifiers in logs/URLs.

A digest/hash chain can support tamper detection relative to a trusted reference, but is not proof against an administrator who can rewrite the store and keys, and not a legal certificate. Customer evidence signing, if implemented, uses customer keys; software release signing uses a different trust domain.

Dashboard cards use actual persisted counts by state, including unknown/manual/failed/unverified outcomes. Do not display a legal compliance percentage.

## 8. HTTP interface shape

At the accepted A01 checkpoint, GET `/healthz`, GET `/api/v1/session`, GET/POST `/api/v1/admin/principals` and the separately scoped auth-library mounts are implemented. A02 now also implements scoped configuration list/create, publication/reauthentication, mapping/control-map and own-consent/receipt/history routes; their acceptance is pending the linked freshness correction. Other business routes below remain **contract-only pending their assigned tickets**; schemas/examples are not runtime response fallbacks. Auth-library login/MFA/logout routes use its documented integration and are separately mounted for staff/principal scope; do not invent home-grown password endpoints. See the [A01 UI binding handoff](../../handoffs/codex/A01-UI-e1fa052.md) for actual MFA/error behavior. Principal directory creation does not provision a login account.

Common responses: 400 validation; 401 unauthenticated; 403 denied capability; 404 missing or inaccessible scoped resource (avoid enumeration); 409 version/idempotency conflict; 429 bounded request limit; 503 required service unavailable. Return `error.code`, safe `error.message`, field errors where appropriate and `request_id`; no raw stack traces, secrets or request bodies. Validate unknown fields and input sizes. Use CSRF/session protections appropriate to the auth library and deny unapproved origins.

| Method / route | Minimum semantics |
|---|---|
| GET `/healthz` | Minimal liveness only; detailed component/connection health requires staff authority |
| GET `/api/v1/session` | Server-established actor domain, own scope and permitted capabilities; no secret tokens |
| GET `/api/v1/admin/overview` | Real state counts, actual build/profile and scope; not compliance certification |
| GET/POST `/api/v1/admin/purposes` | Scoped list/create; immutable versions once published |
| GET/POST `/api/v1/admin/notices` | Scoped versioned notice content; no silent grant upgrade |
| GET/POST `/api/v1/admin/policies` | Scoped list/create draft with declared supported fields |
| POST `/api/v1/admin/policies/{id}/publish` | Authorised distinct reviewer, exact version/digest and re-authentication |
| GET `/api/v1/admin/control-map` | Declared/observed purpose-system relationships and capabilities |
| GET/POST `/api/v1/admin/systems` | Configure allowlisted synthetic connectors only; no arbitrary URL or credentials in response |
| POST `/api/v1/admin/systems/{id}/check` | Actual health/capability check with scoped credentials |
| GET/POST `/api/v1/admin/principals` | Synthetic fixture creation and scoped directory; protected, not a public lookup |
| GET `/api/v1/portal/me/consents` | Only authenticated principal's choices and supported notices |
| POST `/api/v1/portal/me/consents/{purpose_id}/grant` | Valid notice + affirmative interaction + expected_epoch + idempotency |
| POST `/api/v1/portal/me/consents/{purpose_id}/withdraw` | Expected_epoch + idempotency; receipt after durable commit |
| GET `/api/v1/portal/me/receipts/{id}` | Own receipt and suitably limited propagation status, not staff connector details |
| GET `/api/v1/admin/workflows` | Scoped paginated workflow list |
| GET `/api/v1/admin/workflows/{id}` | Plan, action/observation axes, attempts, gaps and timeline |
| POST `/api/v1/admin/actions/{id}/reconcile` | Authorised reconciliation; cannot convert unknown to success without evidence |
| POST `/api/v1/admin/manual-tasks/{id}/attest` | Attributed manual statement, no forged automated verification |
| GET `/api/v1/admin/failures` | Unresolved failed/unknown/manual/unverifiable obligations and owners |
| GET `/api/v1/admin/evidence/{workflow_id}` | Scoped evidence view |
| GET `/api/v1/admin/evidence/{workflow_id}/export` | Local audited JSON download; no vendor renderer |
| POST `/api/v1/admin/policy/evaluate` | Safe preview against server facts; explicitly not a send authorisation |
| POST `/api/v1/admin/test-runs` | Start only an allowlisted, synthetic-scoped scenario, not arbitrary code |
| GET `/api/v1/admin/test-runs/{id}` | Actual assertions, result artifacts and observed fixture/build scope |
| GET `/api/v1/admin/capabilities` | Target release/depth separate from actual implementation/test status |

Agent polling/receipt and sandbox send endpoints are **private machine interfaces**, not public portal routes. A00 has frozen their typed schemas in the canonical routes and generated OpenAPI for A03/A04. Staff auth uses `/api/auth/staff` / `orvia.staff`, principal auth `/api/auth/principal` / `orvia.principal`; machine credentials use neither human cookie authority. `/api/v1/session` rejects ambiguity when both human domains are active. Consume shared auth clients; A01 implements independent keys/sessions, MFA, disabled public signup and exact local-origin enforcement. The sandbox sender must exercise the actual processing decision/enforcement adapter. Browser test orchestration cannot supply a desired test result.

## 9. Fault/reset and P1 boundaries

Faults are allowlisted test fixtures: HEALTHY, UNAVAILABLE, APPLY_THEN_TIMEOUT, ACK_WITHOUT_EFFECT and a deliberately unsafe sender fixture used only by the regression harness. Faults change target behaviour, never the reported test result. Do not add a production “disable privacy” switch.

Reset requires a named synthetic deployment/namespace, explicit confirmation, an authority check, no live jobs and a guard rejecting unrecognised/non-demo databases. Freeze/rehearsal evidence is exported before resetting. Fault/reset surfaces are unavailable outside the private synthetic profile. P1 routes require a coordinated contract extension; the frontend cannot independently create placeholder success handlers.

## 10. A02 candidate 0.3.0 — correction pending

Producer change [A02-C01](../engineering/A02-CONTRACT-CHANGE.md) supplies the canonical schema/consumer handoff. Work accepts the need for these bounded interfaces; this is not candidate acceptance or a transfer of schema-writing ownership.

| Added route | Candidate meaning / required boundary |
|---|---|
| POST `/api/v1/admin/policies/{id}/reauthenticate` | Verify real current TOTP for a distinct authorized reviewer; issue a 120-second, one-use proof bound to actor/session, exact policy/version/digest and scope. Reauthentication alone does not publish |
| GET/POST `/api/v1/admin/target-mappings` | Scoped synthetic mapping list/create; server generates target subject identity; no caller-selected URL, SQL, credentials or target identifier |
| GET `/api/v1/portal/me/consents/{purpose_id}/history` | Own-principal immutable receipt history with bounded pagination |

New interactions from own-consent reads are ten-minute, own-principal, epoch/notice-bound records. At the new-operation consume/mutation boundary, expired proofs/interactions must be rejected after relevant lock waits using advancing server time. The reviewed candidate's transaction-start `now()` checks do not satisfy this boundary; F01 requires a real regression/retest. Preserve authorized identical replay of an already committed operation before new-operation freshness checks. The withdrawal rule still requires no acceptance of a new notice.

Schemas/examples/client/signature vector and seed are generated together as 0.3.0; earlier-version command envelopes remain rejected. A03 must consume the coordinated version. Do not hand-edit generated artifacts, infer target success from A02 rows, or treat the pending candidate label as an implemented security fix. No additional profile ADR, dependency or product-scope change is needed.
