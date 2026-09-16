# Shared prototype contract — design version 0.1.0

**Status:** Ready design input; NOT yet generated, adopted or tested in a runtime repository.
**Schema writer:** Codex. **Semantic reviewer:** Work. **Consumer:** Claude Code.

A00 turns the approved design into executable Zod schemas and generated OpenAPI/client types/examples in `packages/contracts/`. Do not independently implement incompatible interfaces in two lanes. The seed route index is not an implemented API or a full OpenAPI document.

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

Each customer-owned row has an explicit scope strategy. Required uniqueness: `(tenant_id, legal_entity_id, principal_id, purpose_id)` aggregate; scoped idempotency key/request digest; stable workflow/event ID; per-action command identity; immutable published version IDs. Use composite tenant foreign keys where relevant. Schema indexes and migrations are owned by Codex.

## 3. Separate states; do not collapse uncertainty

| Axis | Allowed prototype states |
|---|---|
| Consent | `NOT_GIVEN`, `GRANTED`, `WITHDRAWN` |
| Workflow | `ACCEPTED`, `RUNNING`, `NEEDS_ATTENTION`, `COMPLETED` |
| Action execution | `PENDING`, `RUNNING`, `ACKNOWLEDGED`, `EFFECT_UNKNOWN`, `FAILED`, `MANUAL_REQUIRED`, `SKIPPED` |
| Observation | `NOT_CHECKED`, `OBSERVED_SATISFIED`, `OBSERVED_NOT_SATISFIED`, `UNVERIFIABLE`, `STALE` |
| Processing decision | `ALLOW`, `BLOCK`, `INDETERMINATE` |
| Test result | `NOT_RUN`, `RUNNING`, `PASS`, `FAIL`, `ERROR`, `SKIPPED` |

`ACKNOWLEDGED` means the target acknowledged a command, not that a separate observation proved the desired effect. `EFFECT_UNKNOWN` remains unknown until supported reconciliation supplies evidence. `FAILED` means a known failed operation, not merely a network timeout. An unimplemented connector is not a success. `SKIPPED` requires an explicit non-applicability reason and must not conceal a required obligation.

A workflow is COMPLETED only when every required scoped obligation meets its declared completion criterion. A required manual, unknown, failed or unmet observation keeps NEEDS_ATTENTION. Manual attestation can close an administrative task but never silently becomes an automated observation; retain the attestation type and evidence limits. An observed fact may later become STALE.

## 4. Consent and receipt semantics

Grant and withdrawal require the person's authenticated scope, a supported purpose, valid interaction/notice context and an `Idempotency-Key` header. Grant supplies `notice_version_id`; withdrawal must not force acceptance of a new notice. Both use `expected_epoch` to prevent stale updates.

Within one database transaction: re-check auth/scope, claim scoped idempotency key and normalized request digest, lock the aggregate, check epoch, write new state/epoch/event and outbox record, save the stable response. A duplicate identical request returns the original logical receipt; conflicting reuse or stale expected epoch returns 409. Re-authorise access before replaying a stored response. Do not use client timestamps for ordering.

The receipt exposes `receipt_id`, `event_id`, `purpose_id`, `consent_status`, `consent_epoch`, `accepted_at`, `workflow_id` when propagation is required, and `propagation_status`. A 202 acceptance response does not claim downstream completion. A refreshed page must show persisted state.

An old grant event cannot reduce the epoch or create a new grant. Fresh re-consent requires a new authenticated interaction at a higher epoch. Before an old worker mutates a target, re-evaluate current consent/scope/generation so stale cleanup cannot affect newly authorised records.

## 5. Administrative permission vs processing permission

A staff permission to configure a policy does not permit using personal data. Processing evaluation resolves current consent, current published policy and the separately approved condition **on the server**. The browser must not supply trusted consent state or an “approved legal basis” boolean.

Marketing ALLOW requires the configured affirmative condition and fulfilled obligations. Missing, withdrawn, malformed or indeterminate authority blocks/queues this demonstration boundary; no fail-open fallback. Order-service is evaluated from its own explicit synthetic approved condition and context. The demonstration does not declare all service messages legally exempt.

A preview evaluation has no authority to send. At actual simulated admission, re-read the authoritative scope/epoch. Use the same aggregate lock/transactional ordering for admission and withdrawal in this local supported path, or an equivalently tested protocol. If withdrawal commits first, no marketing send row can be admitted. Document the linearisation point and test concurrent requests; do not claim distributed global atomicity.

## 6. Workflow, command and connector contract

Outbox dispatch starts a stable workflow identity derived from the accepted event and scope. Duplicate dispatch attaches to the existing logical workflow. Persist Temporal development state; process restart must not discard accepted requests. Retry only classified safe operations; bounded backoff and attempts are explicit, with manual escalation rather than infinite loops.

Every action plan binds target/resource, exact subject mapping, purpose, policy version, triggering epoch, target generation, operation, capability version and scope digest. The agent independently validates a locally signed envelope containing installation, tenant, environment, command/action IDs, operation, scope digest, epoch/generation, expiry, nonce and operation budget. The agent rejects wrong scope, expiry, unauthorised operation and altered signature. Replayed known command IDs return their prior outcome or reconciliation, never duplicate effects. Scope changes require a new reviewed plan.

For the synthetic CRM, enforce generation/epoch comparison at the target mutation itself, not only in an earlier planner check. Reject a stale command against a newer record generation. A new grant must not allow processing through an unresolved older suppression state without re-evaluating/reconciling it. Record the precise ordering protocol and test it; do not claim the same atomicity for real third-party APIs that lack it.

CRM adapter: exact synthetic subject reference; natural-idempotent marketing membership removal; separate read-after-write. REST simulator adapter: restrict/read/receipt capabilities with explicit fault modes. Legacy target: no automated mutation, assigned manual task. Permission loss changes effective coverage immediately. No arbitrary-host connector or arbitrary SQL query feature.

Only the agent has target mutation credentials. The workflow/API identity does not gain target database ownership. All credentials and signing authority stay local and separate from vendor commerce/release identity.

## 7. Verification and evidence

An observation records target, resource, generation, method, observed_at, desired/observed state summary, action reference and known limits. Do not count acknowledgement, task closure or intended policy as observation. Missing read permission is UNVERIFIABLE, not an optimistic pass.

Evidence records include consent event/receipt, immutable policy/notice versions, plan/action/command references, execution history, observations, manual attestations, tests and unresolved coverage. Exports are generated locally, authenticated, scope-filtered and audited. Use synthetic opaque references where possible; avoid unnecessary raw identifiers in logs/URLs.

A digest/hash chain can support tamper detection relative to a trusted reference, but is not proof against an administrator who can rewrite the store and keys, and not a legal certificate. Customer evidence signing, if implemented, uses customer keys; software release signing uses a different trust domain.

Dashboard cards use actual persisted counts by state, including unknown/manual/failed/unverified outcomes. Do not display a legal compliance percentage.

## 8. HTTP interface shape

All routes below are **to be implemented**. A00 supplies exact request/response schemas and example errors before UI binding. Auth-library login/MFA/logout routes use its documented integration and are separately mounted for staff/principal scope; do not invent home-grown password endpoints.

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

Agent polling/receipt and sandbox send endpoints are **private machine interfaces**, not public portal routes. Codex freezes their exact typed schemas in A00 before A03/A04 implementation. The sandbox sender must exercise the actual processing decision/enforcement adapter. Browser test orchestration cannot supply a desired test result.

## 9. Fault/reset and P1 boundaries

Faults are allowlisted test fixtures: HEALTHY, UNAVAILABLE, APPLY_THEN_TIMEOUT, ACK_WITHOUT_EFFECT and a deliberately unsafe sender fixture used only by the regression harness. Faults change target behaviour, never the reported test result. Do not add a production “disable privacy” switch.

Reset requires a named synthetic deployment/namespace, explicit confirmation, an authority check, no live jobs and a guard rejecting unrecognised/non-demo databases. Freeze/rehearsal evidence is exported before resetting. Fault/reset surfaces are unavailable outside the private synthetic profile. P1 routes require a coordinated contract extension; the frontend cannot independently create placeholder success handlers.
