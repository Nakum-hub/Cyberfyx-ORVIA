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
