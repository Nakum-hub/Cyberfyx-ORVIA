# ORVIA — current execution state

**Writer:** Work · **Checkpoint:** W01 / A01 acceptance · **Date:** 2026-09-16

| Field | Current evidence / decision |
|---|---|
| Reviewed source / integration | main `50cb4daeded9253c4f7cca4f742cb212c10aa5b7`; human merged A01 PR #8 at 14:39:03 UTC. Implementation `3be3fd09c358ac851b97a381f9a856f8f0a92177`; publication `2686474a56ed774780e84179ac60457943dc075d`; submitted and integrated trees identical |
| Source / contract | Master document revision 1.3, SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`, verified in Git and checkout. Plan 1.0; semantic contract 0.2.1 accepted and unchanged. Codex-generated seed/acceptance labels now populated |
| Work review commit | `10f8e11830c43a875bfc29d05f650c9f0d853c33`; branch `prototype/work/W01-a01-review`. A separate ledger commit records this exact review identity. Human integration is pending for this record |
| Accepted tasks | W00 review `425f079bc74e897d8ee97fa56faeea50e42ac46f`; A00 implementation `58ceddcd73b9b9f0717553bbd1e2fff3f7389abe`; A01 implementation `50cb4daeded9253c4f7cca4f742cb212c10aa5b7`. All three COMPLETED. W01 IN_PROGRESS pending A02 |
| Live A01 scope | Protected synthetic bootstrap; real separate staff/principal sessions and privileged MFA; scoped RLS/admin OPA; health, session and principal directory list/create. Directory creation does not provision a login. All other business routes remain ticket-gated |
| Owners | Work: decisions/reviews/trackers/views/state/common template and semantic docs. Codex: executable schemas/dependencies/core/infra/tests/seed. Claude Code: UI/browser and transferred layout/page. Cowork: UX/capability/demo/runbooks. Human: source originals/access/system approvals/merges/release |
| Independent executed results | Pinned cached install; 11 unit tests; typecheck/lint; contract drift and accepted seed PASS. Work provenance audit verified ten final producer reports × 131 source files and all 99 artifact hashes against the merged A01 bytes |
| Producer execution reviewed | A01 87/87 real HTTP/database/MFA/RLS/restart/OPA-outage assertions and 11/11 units; build/migration/preflight/smoke/hygiene PASS on `3be3fd0`, build `7lbFfFolBo_kmvKFWs1mW`, codex-a00. Three prior command failures retained. Work did not rerun the service suite, build or browser; Docker/PowerShell unavailable here |
| Acceptance scenarios | All T01–T34 remain NOT_RUN: 30 P0 and four unpromoted P1. T02/T03/T04/T05/T27 now link partial A01 evidence; earlier bootstrap/domain evidence remains. No full-scenario promotion from partial tests or documents |
| Findings / gates | No blocking A01 finding; no A01 repair requested. W00's closed findings remain closed at their accepted depth. A02 exact approval/consent/replay/transaction tests are next. Browser, future job/export/machine scope, tested rate-limit/lockout, TLS/egress/reset/recovery, frozen full suite and two rehearsals remain gates. Dependency advisory audit remains NOT_RUN under the retained producer approval block |
| Other submissions / facts | Cowork PR #7 is an unmerged draft, head `736d1cebcd47a9286b922ff1ab065f9976042f74`, observed but not accepted/reviewed in this A01 checkpoint. C00 acceptance is still needed for B00 acceptance. No B00 or A02 submission in the inspected main. Exact R0/meeting deadline unknown and nonblocking; no restarted 36-hour budget |
| Profile / isolation | CUSTOMER_LOCAL_SYNTHETIC, customer-local operations, custom AI DEFERRED_V2, no P1 promoted. codex-a00, ui-b00 and rehearsal remain isolated. Work created no service/profile. Loopback HTTP is development transport; bootstrap reset refuses the new business schema |
| Readiness | A01 foundation ACCEPTED; W01 not complete. Full internal demo NOT_READY; production security/legal/release NOT_ASSESSED |
| Next merge / ticket | Human reviews/merges this Work acceptance/tracking branch; A01 implementation already merged. Codex then starts A02 only from the accepted integration. Work continues W01; Claude Code B00 and Cowork C00 retain their own dependencies. No agent merge, deployment or release |

| Work ticket | Status | Evidence / remaining dependency |
|---|---|---|
| W00 | COMPLETED | [A00 acceptance](docs/reviews/work/W00_A00_ACCEPTANCE.md), exact evidence and prior handoff; no profile redesign |
| W01 | IN_PROGRESS | [Authority review](docs/reviews/work/AUTH_AND_CONSENT.md), [A01 checkpoint handoff](handoffs/work/W01-A01-50cb4da.md); completion still requires A02 |
| W02 | NOT_STARTED | Start W01/A03; accept A04/A05/A06/B04 with integrated failure/security/recovery evidence |
| W03 | NOT_STARTED | Start W02; accept A07/B06/C02 with exact frozen candidate, full required tests and two rehearsals |

Work alone consolidates this state. Other lanes submit factual handoffs. Canonical JSON preserves the existing task graph and generated views. A02 → A03 → A04/A05 → A06 → A07 remains gated; A07 acceptance requires W02. [Codex next-ticket prompt](docs/reviews/work/W01_A01_CODEX_NEXT.md) requests A02, with no A01 repair or unbounded implementation. Human retains integration/release authority; no recurring scheduling or automatic orchestration is authorised.
