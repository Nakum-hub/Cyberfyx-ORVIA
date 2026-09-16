# A00 coordinated contract proposal 0.2.0

Change ID `A00-W00-F02-F03`; producer/schema writer Codex; semantic reviewer Work; consumer Claude Code. Design input remains Work's `docs/prototype/CONTRACT.md` 0.1.0. This executable 0.2.0 proposal adds explicit bindings and state projections requested by W00. It is pending W00 review, not a silently approved semantic replacement. There is no existing business database to migrate. Only the A00 bootstrap migration is executed.

Canonical runtime validators, route metadata, auth mounting and profile names live in `packages/contracts/src/index.ts`. `contracts:generate` emits OpenAPI 3.1, shared types, validated synthetic examples, interface/profile metadata, a public signature vector, a proposed seed index and a hash manifest. `contracts:check` regenerates in memory and rejects byte drift. Zod refinements remain authoritative where JSON Schema cannot represent cross-field rules. Generated files never serve as runtime fallback responses. Except `/healthz`, OpenAPI explicitly marks routes `CONTRACT_ONLY_PENDING_TICKET`.

The original `tracking/contract_seed.json` was not found. `packages/contracts/generated/contract-seed.proposed.json` is clearly a new generated proposal, not a recovered original. Work/human should confirm its semantics and seed ownership at the bootstrap handoff before it replaces the missing canonical tracking file. The source, client and all generated types remain one contract, not UI-maintained DTOs.

## Auth mount and caller boundary

| Domain | Mount / cookie prefix | Shared UI integration |
|---|---|---|
| STAFF | `/api/auth/staff` / `orvia.staff` | `staffAuthClient` from `@orvia/auth/client` |
| PRINCIPAL | `/api/auth/principal` / `orvia.principal` | `principalAuthClient` from `@orvia/auth/client` |
| MACHINE | `/api/v1/machine/**` / no human cookie authority | Scoped local machine credential; never the browser client |

Better Auth 1.7.5 owns the auth protocol, including its own `{code,message}` errors, CSRF/origin enforcement and typed response union. Exact library paths beneath each mount are POST `/sign-in/email`, GET `/get-session`, POST `/sign-out`. STAFF additionally uses POST `/two-factor/enable`, `/two-factor/verify-totp` and `/two-factor/verify-backup-code` through `twoFactorClient`. Password recovery and delivery are not wired to a real messaging provider. A01 must separately persist the two authorities, require staff MFA, disable public signup, validate the exact local origin and use independent keys/cookies. The cookie names in OpenAPI describe local HTTP development; Better Auth's secure prefix applies when HTTPS is enabled.

Concrete client calls (password and code come from the user's local input, never defaults):

```typescript
await staffAuthClient.signIn.email({ email, password, rememberMe: false });
// A TOTP-enabled account can return:
// { twoFactorRedirect: true, twoFactorMethods: ["totp"] }
await staffAuthClient.twoFactor.verifyTotp({ code, trustDevice: false });
await staffAuthClient.signOut(); // library response: { success: true }
await principalAuthClient.signIn.email({ email, password, rememberMe: false });
```

A native invalid-login example is HTTP 401 `{"code":"INVALID_EMAIL_OR_PASSWORD","message":"Invalid email or password"}`. These library calls are mount/type bindings, not implemented login handlers at A00. Session bodies/tokens must not be logged or used as client-side authority. Application callers obtain the safe domain/scope/capability projection from GET `/api/v1/session`; routes use server-established scope. Its proposed ambiguity rule is 403 when both staff and principal sessions are active; use separate browser contexts or sign out of the other domain. Body IDs never switch identity. Work/Claude Code must confirm this rule before A01/B00 integration.

The consent aggregate retains `(tenant, legal_entity, principal_reference, purpose)` from the master. Every prototype purpose belongs to one environment; composite scope checks must reject using it or its mappings in a sibling environment. This does not silently add environment to the aggregate or share consent between environments. A01/A02 supply the relational constraints and denial tests.

## Receipt, transaction and retry

For grant/withdraw, authenticate and authorize the own-principal scope first; resolve supported purpose/interaction; compare the scoped idempotency key and normalized request digest before checking a new operation's expected epoch. An identical authorized retry returns the saved original response even after later epochs. Different request bytes/meaning under that key return `IDEMPOTENCY_CONFLICT`; a new operation with a stale epoch returns `EPOCH_CONFLICT`. The aggregate lock, state/event/outbox/receipt and idempotency response commit together. A02 implements this transaction; A00 defines its executable wire shape.

An input example for POST `/api/v1/portal/me/consents/{purpose_id}/withdraw` is `Idempotency-Key: synthetic_example_key_0001` with body `{ "expected_epoch": 0, "interaction_id": "00000000-0000-4000-8000-000000000074" }`. Complete generated per-route fixtures are in `examples.json`. The response is HTTP 202 `Receipt`, containing only receipt/event/purpose IDs, accepted consent state/epoch/time, workflow ID or null, and acceptance propagation `ACCEPTED` or `NOT_REQUIRED`. No tenant, connector, signing material, subject mapping, plan or staff-only observation is exposed. Unknown fields are rejected.

GET `/api/v1/portal/me/receipts/{id}` returns `{receipt,current}`. `receipt` never changes. `current.consent_status/consent_epoch` describe the current aggregate, while `current.propagation_status` describes the original receipt's workflow at `as_of`. The replay fixture retains withdrawal epoch 2 in both original/replayed POST responses while the GET projection reports a later grant epoch 3 and `NEEDS_ATTENTION` for the old workflow. This never asserts that the old workflow controls the new generation.

Application errors include a safe code/message/retry rule, optional field errors and request ID. The generated 400/401/403/404/409/429/503 examples are validated. Network timeout after a write is not proof of rollback; retry the same logical operation only with the same idempotency key after current authentication. The browser transport never automatically retries a write. Pagination is cursor-based, default 25, maximum 100. Lists have `items` and `next_cursor`. The generated interface file sets 2-second polling, 30-second maximum backoff and explicit terminal/attention behavior.

## Signed commands and private interfaces

| Method / path | Request → response |
|---|---|
| POST `/api/v1/machine/commands/poll` | PollRequest → CommandList |
| POST `/api/v1/machine/commands/{id}/receipts` | CommandReceipt → AcceptedOperation (202) |
| POST `/api/v1/machine/simulator/send` | SendRequest → SendResult |
| POST `/api/v1/machine/simulator/resources/{id}/restrict` | SignedCommand → CommandReceipt |
| GET `/api/v1/machine/simulator/resources/{id}` | UUID path → SimulatorState |
| GET `/api/v1/machine/simulator/receipts/{id}` | command UUID path → CommandReceipt |

All are private MACHINE scope, separate from staff/principal. Polling body IDs must equal enrolled credential scope. The path and body command/resource IDs must agree. Receipt, restriction and send POSTs require a scoped Idempotency-Key; a known command returns its durable prior outcome/reconciliation. A03 must persist command identity, nonce, attempt budget and generation/epoch guards before effects; the A00 signature helper alone is not agent authorization or replay protection.

`CommandPayload` binds schema version, command/installation/signing-key identity, a `PlanBinding`, scope/plan/approval digests, explicit approval, issued/expiry times and nonce. `PlanBinding` binds workflow/action, tenant/legal entity/environment, principal mapping, exact system/resource/synthetic subject, purpose, policy version, current consent epoch and target generation, an allowlisted operation, capability and capability version, maximum one record and at most three attempts. There is no arbitrary URL, SQL, command line or wildcard target. Lifetime is positive and at most five minutes. Each attempt still rechecks current authority at the mutation boundary.

`ORVIA-CJSON-1` canonicalization is UTF-8 JSON with object keys sorted by UTF-16 order, array order preserved, ordinary JSON string escaping, no whitespace, valid Unicode, finite safe integers only, and no undefined/negative-zero values. The scope digest hashes the entire parsed `CommandScope`; plan digest hashes the entire parsed `PlanBinding`; approval digest hashes the entire parsed `Approval`. The independent review or policy outcome names that plan digest and matching policy version. Ed25519 signs the canonical complete payload. A locally generated public-key/signature vector is committed; its private key was discarded. It is explicitly not a runtime trust root.

Approval is either `APPROVED` with distinct author/reviewer IDs, or `NOT_REQUIRED_BY_POLICY` with decision ID, policy version, exact plan digest and allowlisted non-destructive synthetic-restriction rule. Omission is invalid. A03 must load and authorize this persisted decision; a valid signature is not a replacement for current policy, key enrollment, epoch/generation, capability or budget checks. Any changed scope requires a new plan/decision. Unit tests reject tampering, wrong trust, invalid time and unsupported fields/versions; T12's real agent/replay tests remain NOT_RUN.

`SendRequest` carries exact synthetic principal/purpose/system selectors, attempt ID, message class and optional synthetic order reference; no browser-supplied ALLOW, consent or legal-basis flag exists. `SendResult` cannot contain a send row or admission timestamp for BLOCK/INDETERMINATE. A04 must re-read current consent/policy under the same aggregate ordering lock as withdrawal before creating a local simulated send row; preview ALLOW has no authority. No SMS/email is transmitted. Target mutation and readback remain separate calls with current generation.

## Reconciliation and completion

The uncertain command attempt remains `EFFECT_UNKNOWN`. A separate reconciliation record references it and transitions `PENDING → RECONCILING → RESOLVED | INCONCLUSIVE | FAILED`. Start/end times must match state; RESOLVED requires an observation reference; unresolved terminal outcomes require a reason. Retrying reconciliation creates another record rather than rewriting the uncertain attempt or fabricating ACK. A03/A05 persist these records transactionally; A00 provides schemas and transition checks only.

Every required obligation declares either `CURRENT_SCOPED_OBSERVATION` or `ATTRIBUTED_MANUAL_ATTESTATION`. The automated criterion needs a matching, current-scope, dated observation, satisfying desired state, non-NONE method and unexpired freshness. A01–A05 must derive `scope_still_current` server-side and enforce exact action/resource/generation matching through relational references; it is not accepted as caller authority. The manual criterion needs an attributed statement and evidence references and remains explicitly manual. It cannot satisfy an automated criterion. Non-required omissions require a reason. Empty or unsatisfied obligation sets never complete a workflow.

Unit fixtures demonstrate: ACK alone remains attention; manual attestation cannot satisfy automated observation; an unknown historical attempt remains unknown even when later scoped observation satisfies the declared obligation; stale or superseded observations fail completion. These are semantic tests, not fabricated runtime evidence. Required manual work remains attention until its approved manual criterion is met; no automated-verification label is synthesized.

## Test-run and seed/reset freeze

`TestRunCreate` permits only `MARKETING_WITHDRAWAL_HEALTHY`, `MARKETING_WITHDRAWAL_BROKEN_CONTROL`, `TARGET_RESTORE_QUARANTINE`, one canonical profile and fixture `aster-birch-v1`. Requests cannot supply results. `TestRun` records actual state/build/contract/times, bounded assertion IDs, expected/actual/result/artifact references and the separate expected-fault-detection flag. A06 supplies execution/persistence; A00's local evidence wrapper is not the application test runner.

Canonical profiles are `codex-a00`, `ui-b00`, `rehearsal`, with seed `aster-birch-v1` and reset names `<profile>-bootstrap-only`. Only the A00 probe fixture/reset exists now; full synthetic application seed, quarantined restore and fault modes remain later tickets. No route grants arbitrary reset or arbitrary test code.

Consumer handoff: import `createClient` from `@orvia/contracts/client`, generated OpenAPI types from `@orvia/contracts/generated`, and auth clients from `@orvia/auth/client`. Use generated examples for labelled development fixtures only. Before accepted A01/A02 endpoints exist, show unavailable/pending state rather than passing data. Producer/consumer and Work review must occur together for any further semantic change; bump version and regenerate in the same change.
