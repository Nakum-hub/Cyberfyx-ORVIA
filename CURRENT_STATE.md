# ORVIA — current execution state

**Writer:** Work · **Checkpoint:** W01 / A01 accepted, A02 correction required · **Date:** 2026-09-16

| Field | Current evidence / decision |
|---|---|
| Reviewed source | main `a5b6ff73c4fca4aa02e110ee5f11a121b1a7563b`; A02 implementation `3242521e59966885d8053747a82d96cb92ea55d5`, publication `2e01b7a36d663382d82ec9310bd707f1c2d405ef`, human integration `004fe3dc43e3a278caeb9c4e4983e7e58a825b9f` in PR #9 at 15:38:53 UTC. A02 submitted/integrated trees match; subsequent Cowork PR #7 merge does not change A02 runtime source |
| Master / contract | Approved master revision 1.3, SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6` verified; Plan 1.0 and single ADR-001 retained. Accepted contract baseline 0.2.1; current executable 0.3.0 candidate pending A02 freshness correction/retest |
| Exact Work reviews | A01 review `10f8e11830c43a875bfc29d05f650c9f0d853c33`; A02 review `b3c582f86c78ca565562b95aa692a8b84f672770`. Subsequent ledger commits record these identities. Publication: `prototype/work/W01-a01-review`, PR #10, updated to include both checkpoints; human review/merge pending |
| Accepted tasks | W00 `425f079bc74e897d8ee97fa56faeea50e42ac46f`; A00 `58ceddcd73b9b9f0717553bbd1e2fff3f7389abe`; A01 `50cb4daeded9253c4f7cca4f742cb212c10aa5b7`: COMPLETED. A02/W01 BLOCKED on F01. No A02/A03 accepted commit recorded |
| Scope / owners | CUSTOMER_LOCAL_SYNTHETIC marketing-withdrawal prototype; AI DEFERRED_V2; no P1 promoted. Work owns decisions/reviews/semantic docs/trackers/views/state/common template; Codex schemas/dependencies/core/infra/tests; Claude Code UI/browser; Cowork UX/capability/demo/runbooks; human originals/access/system approvals/merges/release |
| Implemented A02 candidate | Typed scoped configuration, exact independent approval/proof, synthetic mappings/control map, own-consent grant/withdrawal/history, atomic state/event/idempotency/workflow/outbox/receipt. Rows marked ACCEPTED do not prove execution or effect; current send/agent/evidence/recovery remain later tickets |
| Blocking finding | MEDIUM W01-A02-F01: expiry is compared to transaction-start `now()` across waits; consent can also wait again after its check. Codex must enforce current expiry at consume/mutation and run real lock-wait/fresh/expired/replay controls. Source finding only; Work PostgreSQL/HTTP reproduction and temporary SQL control NOT_RUN |
| Independent Work execution | On both reviewed candidates: pinned frozen offline install, 11 unit tests, typecheck, lint and generated-contract checks PASS. A02 drift check covers eight artifacts/seed, 41 routes, seven error examples. Provenance checks verify master/lockfile and producer source/artifact identity. Final tracker validation is documentary |
| Producer A02 evidence | 50 artifact hashes verified. Two final exact-commit reports (contract + 49-check consent suite) each match all 141 source files. Earlier 87-check auth/build/lint/hygiene and unit/type reports retain their dirty-snapshot identity and documented differences. All 22 commands, including three failures, remain retained. No Work rerun of Docker/PostgreSQL/OPA/Next HTTP/build/browser |
| Full acceptance results | T01–T34 all NOT_RUN: 30 P0 and four unpromoted P1. Partial A01/A02 evidence linked; a source finding is not an executed scenario FAIL. No manufactured PASS, release, security/legal certification or internal-demo readiness |
| A03 continuation | User reports A03 coding underway; Codex's A02-A07 continuation handoff records serial implementation without intermediate review waits. Canonical A03 BLOCKED denotes unresolved acceptance dependency, not an instruction to discard/pause authorized code. No A03 source reviewed in this snapshot. Existing dependency graph is unchanged |
| Other lanes / facts | Cowork PR #7 was human-merged at 15:41:25 UTC; substantive C00–C02 acceptance is outside this A01/A02 review and is not implied. No B00 source reviewed here. C00 still needed for B00 acceptance. Exact R0/meeting deadline unknown and nonblocking; no restarted 36-hour budget |
| Isolation / remaining gates | No Work service/profile or reset. codex-a00/ui-b00/rehearsal remain separate. Loopback HTTP development only; bootstrap reset refuses business schema. Future job/export/machine scope, rate-limit/lockout, dependency advisory triage under retained approval block, TLS/egress, unknown/retry/recovery/reset, browser, frozen full suite and two rehearsals remain gates |
| Next merge / owner action | Human reviews/merges updated Work PR #10. Codex fixes/retests F01 while preserving current A03 work, then returns exact source/evidence to Work. B00/C00 retain their independent starts. No Work merge to main, deploy, release, recurring schedule or automatic future review |

| Work ticket | Status | Evidence / remaining dependency |
|---|---|---|
| W00 | COMPLETED | [A00 acceptance](docs/reviews/work/W00_A00_ACCEPTANCE.md), existing source/ADR/evidence retained |
| W01 | BLOCKED | [A01 authority checkpoint](docs/reviews/work/AUTH_AND_CONSENT.md); [A02 finding](docs/reviews/work/W01_A02_REVIEW.md) and [handoff](handoffs/work/W01-A02-a5b6ff7.md); correction/retest required |
| W02 | NOT_STARTED | Start W01/A03; accept A04/A05/A06/B04 with actual integrated failure/security/recovery evidence |
| W03 | NOT_STARTED | Start W02; accept A07/B06/C02 with exact frozen candidate, full required results and two rehearsals |

Work alone consolidates this record. Other lanes submit factual handoffs. Use the [current Codex correction prompt](docs/reviews/work/W01_A02_CODEX_FIX.md); the earlier A02-start prompt is historical. Preserve A01, existing coding work, source authority, accepted withdrawal history, path ownership, graph and human integration/release control.
