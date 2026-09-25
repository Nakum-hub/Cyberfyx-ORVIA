# Handoff — production target correction — Codex — 2026-09-25

**Base commit:** `487a77f573fa1afd8a8b250c5303c58f6942cc29` (shared worktree contains other uncommitted changes)
**New commit:** not committed
**Source master:** revision 1.4, repository root; not edited
**Contract version:** 0.18.0
**Scope:** project direction and release evidence semantics; no DPDP lane paths edited

## Delivered

- `AGENTS.md`: production-intended V1 replaces the former prototype objective; old sprint documents are historical and cannot cap V1 scope.
- `README.md`: replaced stale prototype narrative with current local operation, code map, and truthful release status.
- `docs/engineering/PRODUCTION_READINESS.md`: active release gate, including actual providers, 1M total records per organisation, security/recovery, exact candidate acceptance, and human approval.
- `docs/prototype/RELEASE_CHECKLIST.md`: labelled the old demonstration checklist as historical without rewriting its results.
- `docs/prototype/UX_BRIEF.md`, `docs/prototype/DEMO_SCRIPT.md`, `docs/demo/LEADERSHIP_HANDOVER.md`, `docs/demo/index.html`, and `docs/reviews/cowork/GENERATED_MANIFEST.json`: regenerated the documentation pack after current source edits.

The 34 `NOT_RUN` entries in `tracking/acceptance.json` are complete application scenarios, not counts of unit tests. The partial engineering evidence cannot be promoted without running each scenario on an identified frozen build. The historical acceptance data was deliberately preserved.

## Commands actually executed

| Command | Exit code | Result |
|---|---:|---|
| `npm run tracking:check` | 0 | 23 tasks, 34 acceptance definitions, 33 modules; no results promoted |
| `npm run contracts:check` | 0 | 8 artifacts, 163 route examples, 7 error examples; 0.18.0 |
| `npm run typecheck` | 0 | TypeScript check passed |
| `npm test` | 0 | 206 unit tests passed |
| `git diff --check` | 0 | No whitespace errors |
| `npm run lint` | 0 | ESLint passed |
| `python docs/reviews/cowork/tools/validate_docs.py` (first run) | 1 | 97/98; generated pack stale |
| `python docs/reviews/cowork/tools/build_pack.py` | 0 | Regenerated 5 outputs |
| `python docs/reviews/cowork/tools/validate_docs.py` (final run) | 0 | 98/98 document checks passed |

The regenerated documentation pack passed its final validation.

## Acceptance and limits

T01–T34 remain `NOT_RUN`. The production candidate is not identified. Synthetic connector success, the isolated indexed 1M-row probe, and local component tests do not establish production integration, end-to-end 1M record throughput, security qualification, recovery readiness, or human release approval. Continue implementing the master V1 backlog and execute candidate acceptance with artifacts. Claude Code retains the DPDP extension lane in this shared checkout.
