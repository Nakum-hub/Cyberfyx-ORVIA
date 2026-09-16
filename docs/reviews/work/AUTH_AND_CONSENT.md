# W01 — authority and consent review

**Current checkpoint:** A01 accepted; A02/W01 acceptance BLOCKED by the medium freshness finding in [W01_A02_REVIEW.md](W01_A02_REVIEW.md). Use the [A02 correction prompt](W01_A02_CODEX_FIX.md).
**Date:** 2026-09-16. **Reviewer:** Work. **Profile:** CUSTOMER_LOCAL_SYNTHETIC.

The A01 review below is retained as the historical 0.2.1 checkpoint. Its pending-A02 and next-start wording is superseded by the linked A02 review of contract 0.3.0. A03 continuation is reported, not accepted; no full acceptance result has been promoted.

## Advance Work completion checkpoint — 2026-09-16

The human requested completion of Work's W01–W03 preparation while Codex continues A03–A07, followed by one consolidated implementation review. The available W01 source/evidence review and the closure instructions below are complete. **W01 acceptance remains BLOCKED** until A02 is corrected and retested. Preparation does not change the dependency graph, authorize integration or promote a test result. See [the delivery record](W01_W03_PREPARATION.json), [consolidated intake](WORK_REVIEW_QUEUE.md), [W02](INTEGRATION_AND_SECURITY.md) and [W03](FINAL_GATE_REPORT.md).

| W01 closure check | Current evidence / exact remaining check | Owner / retest |
|---|---|---|
| Server authority and isolation (T03–T05) | A01 accepted at `50cb4daeded9253c4f7cca4f742cb212c10aa5b7`; its 87 producer assertions and Work subset checks are retained below. Recheck changed authority paths on the corrected candidate; extend jobs/export/machine scope with W02 rather than claiming A01 exercised absent endpoints. | Codex A02/A06; Claude Code B01/B02 for browser binding; Work reviews exact artifacts. |
| Exact, distinct publication approval (T05–T06) | A02 binds reviewer, session, policy/version/digest and one-use proof. **MEDIUM W01-A02-F01 is OPEN**: current expiry must be enforced at consumption after relevant lock waits. | Codex A02; actual HTTP/PostgreSQL fresh, expired, lock-wait expiry, one-use and wrong-binding controls. |
| Own affirmative grant and withdrawal (T07–T08) | Review of scoped interaction/notice checks and atomic state/event/outbox/receipt is complete at `a5b6ff7`. A source review cannot establish rollback or runtime freshness. Withdrawal must not require accepting a replacement notice. | Codex A02; inject pre-commit failure, verify no accepted response/effect; refresh after successful commit; repeat cross-principal denials. |
| Replay, ordering and late waits (T08–T10) | Preserve authorized identical replay of the original committed response before new-operation freshness checks. New requests that expire during aggregate/interaction locks or a later publication wait must have no committed business effects. | Codex A02; F01 regression, concurrent epochs, key conflict, new interaction and later-generation controls. A03/A06 cover stale target execution in W02. |
| Receipt truth and API/UI binding (T04, T08–T09) | Immutable POST receipt must remain distinct from GET current consent/propagation; ACCEPTED is not target completion. Generated 0.3.0 interfaces and the four A02 additions are candidates, not approved fixes. | Codex supplies versioned schema/diff and UI handoff; Claude Code consumes shared clients and verifies ambiguous sessions, expired interaction, stale epoch, safe retry and refresh behavior. |
| Evidence and decision | Existing A01/A02 reports retain exact source or dirty-snapshot identity, failures and limits. Require the corrected implementation SHA, human integration SHA, generated-contract report, raw F01 test results and applicable regression evidence. | Work checks source/artifact hashes, records each finding's retest outcome, accepts or returns a bounded correction. Human merges. |

The full severity, task/files, reproduction, expected behavior, owner and retest for F01 remain in [W01_A02_REVIEW.md](W01_A02_REVIEW.md) and [W01_A02_EVIDENCE.json](W01_A02_EVIDENCE.json). The SQL control remains NOT_RUN. There is no additional A01 repair request and no new defect inferred from later code that has not arrived. All T01–T34 full scenarios remain NOT_RUN.

Close W01 only after A02 acceptance and an explicit F01 retest decision; then review A03 and proceed through W02 in dependency order within the consolidated submission. The [W01 preparation handoff](../../../handoffs/work/W01-preparation-a5b6ff7.md) records this deliverable separately from ticket acceptance.

## Decision and exact candidate

Work accepts the bounded A01 authentication/bootstrap/scoped-persistence increment at `50cb4daeded9253c4f7cca4f742cb212c10aa5b7`. No blocking A01 defect was found in this review. There is no A01 repair request. A02 is the next Codex ticket after the human integrates this review record. This decision does not complete W01, the full application acceptance scenarios, internal-demo readiness or the master's production security/legal gates.

| Identity | Verified value |
|---|---|
| Approved master | Product V1, document revision 1.3; SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6` |
| Plan / semantic contract | Plan 1.0; accepted contract 0.2.1; existing ADR-001 retained |
| A01 base | `e1fa052c6c419e90c4783ce220dee2ef247472dc` — human integration of W00 acceptance |
| Implementation | `3be3fd09c358ac851b97a381f9a856f8f0a92177` |
| Evidence publication | `2686474a56ed774780e84179ac60457943dc075d` |
| Reviewed main | `50cb4daeded9253c4f7cca4f742cb212c10aa5b7`; human merged [PR #8](https://github.com/Nakum-hub/Cyberfyx-ORVIA/pull/8) at 14:39:03 UTC |
| Candidate tree | `4b130ebe6973f715843def3685de0e8c41a8a14b`; identical to submitted tree; publication changes only Codex handoff/evidence files |
| Producer runtime | Windows, Node 24.21.0 / pnpm 12.4.2; isolated codex-a00; aster-birch-v1 synthetic identities; build `7lbFfFolBo_kmvKFWs1mW` |
| Work runtime | Isolated Linux review worktree; same pinned Node/pnpm; no Docker or PowerShell, no application service/profile created |

The master, AGENTS.md, EXECUTION_PLAN.md, CONTRACT.md, FILE_OWNERSHIP.md, current state, task graph, A01 implementation, complete security suite and producer handoffs were reviewed. Source authority is unchanged. A01 touches no Work/Claude Code/Cowork implementation or source-original paths. The shared seed and acceptance-label refresh remain Codex-owned; executable DTO semantics and dependency pins are unchanged.

## Authority review

| Boundary / reviewed files | Result at A01 depth | Evidence and limit |
|---|---|---|
| Protected local bootstrap — `scripts/auth-bootstrap.ts`, `auth-init.ts`, `local-private.ts` | Generated unique credentials, named profile/installation checks, separate operator and runtime roles, transactional identity/scope writes and resumable local credential journal. No public signup or default password. | Source review plus producer bootstrap/seed/migration records. Customer emergency recovery and owner-transfer UI remain outside A01. |
| Staff/principal identity — `packages/auth/src/server.ts`, `packages/authz/src/index.ts`, auth mounts | Separate library servers, stores, credentials, signing secrets and cookies. Server derives one active scope. Human routes reject bearer authority; valid simultaneous domains are denied. | Producer HTTP cookie/domain/bearer tests and actual authority-guard tests. Principal A cannot read B's DB reference; own-consent HTTP paths await A02. |
| Privileged MFA and revocation — auth server/authority guard, auth schema | Owner/admin/member require a persisted proof for the exact session. Successful verification plus completed library enrollment is required; password-only and incomplete-enrollment recovery-code paths cannot create privilege. Logout/revocation checks durable sessions; session deletion cascades MFA proof. Disable/trusted-device endpoints are unavailable. | 87-assertion producer suite includes failed-code, incomplete-enrollment, old-cookie and revoked-cookie denials. Pinned Better Auth 1.7.5 implementation was inspected; replacement enrollment rejects an already verified TOTP factor. No separate Work HTTP/MFA rerun. |
| Administrative permission — `packages/authz/src/index.ts`, `policy/admin/authorization.rego` | Explicit capabilities, deny-by-default OPA, separate administrative namespace and fail-closed dependency handling. Auditor cannot mutate; member has no unassigned administrative operation; delegated admin cannot publish. | Producer HTTP/DB role denials and real OPA outage/no-write/recovery controls. Exact distinct-reviewer publication and contextual reauthentication are A02; resource-assigned member actions are A03. |
| Tenant/legal-entity/environment/principal scope — DB runtime and migrations 0001–0003 | Composite scoped references, explicit API predicates, non-owner/non-superuser/non-BYPASSRLS app role, FORCE RLS and transaction-local context. Auth roles cannot grant authority or read business/other-domain stores. | Producer cross-tenant, sibling-environment, own-principal, role-grant, FK and success/rollback pool-context checks. RLS assumes trusted server context; it is not protection from a compromised app process or DB administrator. |
| Principal list/create — versioned principal route | Bounded typed input/pagination, exact server scope, capability checks before idempotency replay, normalized digest, scoped lock/key, persisted response/reference/audit in one transaction. Directory creation does not create a login account. | Producer real creation, replay/conflict, duplicate email, key limit, selectors and persistence/restart checks. This identity operation proves no consent/outbox/send linearisation guarantee. |
| Input, audit and error handling — HTTP wrapper/auth guard/audit migrations | Bounded JSON, fixed auth path/field allowlists, exact-origin POST checks, native auth errors vs canonical versioned errors, no-store, request IDs, scoped business audit and payload-free transport denial audit. A later response-audit failure returns 503; committed creation remains replayable with its original key. | Source review and producer origin/field/denial-audit/hygiene checks. Rate-limit/lockout exhaustion, dependency advisory triage, protected TLS and egress remain later security qualification; code presence is not a tested result. |
| API/UI compatibility — canonical generator and A01 UI handoff | Same 0.2.1 schemas and shared auth clients. Only health, auth, session and principal list/create are live. A01 documents pre-MFA 403, challenge handling, domain separation and safe retries. | Independent contract drift check PASS. Browser/UI behavior was not executed; Claude Code uses isolated ui-b00 and must bind to actual routes. |

Master §§5–7 require these identity/privilege boundaries; §§16–17 and the accepted consent contract still govern A02. The official [Better Auth 2FA documentation](https://better-auth.com/docs/plugins/2fa) was checked for enrollment/verification and cookie forwarding; installed 1.7.5 source, not a generic documentation claim, governs the reviewed build. No production security qualification is inferred from using that library.

## Executed evidence and provenance

Work independently executed the following against the candidate's unchanged implementation bytes. Exact commands, timestamps, exit codes and logs are in [W01-A01-50cb4da](artifacts/W01-A01-50cb4da/).

| Work command / artifact stem | Exit / observed result | Coverage |
|---|---|---|
| Pinned pnpm `install --frozen-lockfile --offline` — `install` | 0 | Cached dependency install; not an advisory audit |
| Pinned Node `--import tsx --test` on three committed unit files — `unit` | 0; 11 tests passed | Domain/contracts/tracking; not HTTP/DB/MFA integration |
| Pinned Node `--import tsx packages/contracts/src/generate.ts --check` — `contracts` | 0; eight artifacts plus accepted seed; 37 route and seven error examples | Generated drift/schema/example checks |
| Pinned Node `node_modules/typescript/bin/tsc --noEmit` — `typecheck` | 0 | Static types |
| Pinned Node ESLint on `packages apps scripts tests --max-warnings 0` — `lint` | 0 | Static lint |
| `python docs/reviews/work/repro/W01-A01-source-audit.py` — `source-audit.json` | 0 | Git/master/artifact/producer-source provenance, not an executed application test |

The source audit independently verified all 99 producer artifact hashes, all 131 source files in each of ten successful exact-implementation command reports, their equality to the merged candidate, the published build identity, all 87 recorded security assertions and their raw-log entries, unchanged lockfile and generated hashes/seed. The publisher's 43 command records preserve 40 successes and three failures (HTTP host handling, unit tracking fixture, build type mismatch); successful final reports use the corrected implementation. Failures have not been erased or relabelled as expected fault tests.

Producer evidence is indexed by [A01-publication.json](../../../handoffs/codex/A01-publication.json). The real HTTP/database/MFA/RLS/restart/OPA-outage suite reports **87/87 PASS**, and the unit suite reports **11/11 PASS** on implementation `3be3fd0`. Build, typecheck, lint, contract drift, migration replay, HTTP smoke, service preflight and local hygiene also exited 0. Work reviewed this producer execution and independently reran the bounded checks above; Work did not rerun the service suite in this environment.

All T01–T34 full-scenario statuses remain NOT_RUN. A01 supplies partial evidence for T02/T03/T04/T05/T27; the other producing tickets and full-scenario evidence envelope remain necessary. There is no promotion from a source audit, rendered page, unit check or producer test-ID label to full application PASS.

## Findings and outstanding gates

**Open A01 repair findings: none.** No severity-labelled defect or retest failure is asserted without evidence. W00's closed F01–F07 dispositions are retained; this review does not reopen them or add another profile ADR.

| Remaining gate / owner | Current evidence or missing work | Required retest / expected behavior |
|---|---|---|
| W01 acceptance — Work, after Codex A02 | A02 not submitted in the inspected candidate. Auth/persistence acceptance cannot establish consent correctness. | Review actual A02 commit, exact immutable approval, own-principal HTTP access, scoped replay/epoch races, atomic receipt/event/outbox and stale grant/new-generation controls. |
| T02/T04/T05/T29 browser — Claude Code B01/B02 and later browser tickets | No login/portal browser evidence in A01; B00 itself still needs C00 acceptance. | Real generated-client flows with separate contexts, MFA/errors, denied roles/principals, persisted state; no canned fallbacks. |
| T03/T27 integration/security — Codex A06 and producing tickets | Current suite covers A01 surfaces; job/export/machine surfaces not implemented. Rate-limit and account-lockout exhaustion are configured but not demonstrated by this 87-assertion suite. Advisory audit is NOT_RUN under the producer's retained approval block. | Extend real scope/denial and session/input tests as surfaces appear; test budgets, failures, redaction and dependency findings through the approved process. Do not bypass the prior approval block. |
| TLS/egress/reset/recovery — Codex A06/A07, Work W02 | Loopback HTTP only. Existing bootstrap reset deliberately rejects the A01 business schema. No Work services or other-lane resets were attempted. | Verified protected transport and measured runtime egress; named isolated reset/drain/export; actual recovery/current-authority and uncertain-effect checks. |
| Internal demo / production — Work W03 and human | Full P0 suite, frozen build and two rehearsals are outstanding. Production security/legal gates are separate. | Human integration and release decisions after actual required evidence. No production/customer readiness claim. |

These are existing later-ticket gates and evidence limitations, not reasons to rewrite or block the accepted A01 foundation. The exact R0/meeting deadline remains unknown and nonblocking; the approximately 36-hour budget has not restarted. No P1 has been promoted.

## Next handoff

Human reviews/merges this Work review/tracker branch. Codex then starts **A02 only**, preserving A01 and the approved stack. See the [copyable Codex prompt](W01_A01_CODEX_NEXT.md). W01 remains open through A02 acceptance; W02/W03 retain the canonical dependencies. Claude Code/Cowork continue their own dependency-ready work. Cowork [PR #7](https://github.com/Nakum-hub/Cyberfyx-ORVIA/pull/7) exists as an unmerged draft and was not accepted or substantively reviewed in this A01 checkpoint. No lane handoff, implementation path, source original or dependency ownership is transferred.
