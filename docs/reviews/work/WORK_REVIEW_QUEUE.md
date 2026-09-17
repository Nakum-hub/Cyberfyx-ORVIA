# Work — consolidated review intake and owner handoff

> Current routing (Work delivery audit, 2026-09-16T21:51:28Z): only Work and Codex remain active. PR20 is human-merged at `9bb8f2900909997f63db864eeea1211523aa5819`; its application source equals PR19. A02 correction and A03–A05 evidence are supplied for the previously requested consolidated review; A06/A07 and B work remain. Earlier dated intake paragraphs below are historical, not current commands.

**Historical A03 intake, not acceptance:** A03 was human-merged in PR #11 at 16:26:17 UTC while this package was being published: implementation `034100943f2c2f2b8e8934921501093746962b9b`, publication `397cb370bedaf45c3f62409e88fb891f7cd3b23e`, main `8a45911be8f86f7a35bfe1153bd40f968f4aecac`. Manifest metadata still says contract 0.3.0/PENDING_WORK_REVIEW. Only commit/path/publication metadata was inspected; A03 implementation and producer results remain queued for the requested consolidated review. This does not close A02 F01 or any Work gate.

**Historical preparation integration:** Work PR #10 was human-merged to `4eb346f0974bb38abcc541744cc57bdf87428f1a` during preparation; its tree exactly matches `33aa63a630619d170e1709b8cea2b30a78b6b78f`. This package is based on that integration. The earlier application snapshot remains the last runtime reviewed.

**Date:** 2026-09-16. **Preparation:** COMPLETE. **Source:** main `a5b6ff73c4fca4aa02e110ee5f11a121b1a7563b`. This is a manually used review packet. It creates no recurring schedule, notification, automatic cross-tool orchestration or integration authorization.

The human requested completion of Work preparation now and consolidated review after Codex A03–A07. This permits preparing W02/W03 before their normal starts; it does not remove the canonical acceptance dependencies. The earlier human A02–A07 implementation continuation remains recorded in `handoffs/codex/A02-A07-continuation.md`. Work's documentary status is separate from acceptance and from the other lanes' reported coding activity.

## Work deliverables available now

| Ticket | Concrete deliverable | Remaining acceptance |
|---|---|---|
| W00 | Existing ADR-001 and accepted scope/A00 reviews, source identity and handoff | Already COMPLETED; retained without a new profile decision |
| W01 | [Authority/consent review and closure matrix](AUTH_AND_CONSENT.md), exact A01/A02 evidence, bounded [F01 correction prompt](W01_A02_CODEX_FIX.md), preparation handoff | A02 correction and real retest; approve the corrected contract candidate |
| W02 | [Integration/security/recovery review](INTEGRATION_AND_SECURITY.md), 16 concrete review checks and owner routing, preparation handoff | Accepted W01/A03 and actual A04/A05/A06/B04 source/results |
| W03 | [Current final gate report](FINAL_GATE_REPORT.md), all 34 scenario statuses, freeze/intake/rehearsal rules and human decision boundary, preparation handoff | W02, A07/B06/C02, frozen full evidence and two rehearsals |

`W01_W03_PREPARATION.json` records delivery readiness, not another application schema or acceptance-result database. `tracking/tasks.json` and `tracking/acceptance.json` remain canonical. Work alone updates those and CURRENT_STATE; other lanes submit their own handoffs.

## One consolidated submission, reviewed in dependency order

1. **A02 correction → W01:** send the F01 fix SHA, exact regression artifacts and generated-contract check. Preserve A01 and the existing A03 work. Work decides A02/W01 acceptance from actual evidence.
2. **A03 → A04/A05 → A06 plus B04 → W02:** supply each ticket's base/implementation/publication/integration identities and actual artifact index. Review durability, generation checks, current send admission, unknown/retry/observation, security, recovery and UI through the W02 matrix. Consolidation does not turn several increments into one unauditable result.
3. **A07 plus B06/C02 → W03:** identify the actual frozen integrated candidate and reproducible package. Supply full candidate-specific acceptance, browser and claims evidence, followed by two rehearsals. Work issues a scoped READY/PARTIAL/NOT_READY recommendation; human decides integration/release.

This ordering avoids circular acceptance: W02 reviews A03–A06/B04 evidence before A07 acceptance; W03 then reviews the final A07/B06/C02 candidate. A07's preparatory packaging can arrive in the same submission. Any candidate changes after testing need explicitly scoped reruns and refreshed final evidence.

## Owner requests ready to use

**Codex — engineering and UI:** consume the supplied A02 correction and A03–A05 source without restarting accepted A00/A01. Complete the remaining authorized A06/A07 and B00–B06 responsibilities, preserving existing task IDs and acceptance tests. B00 may start from accepted A00; C00 is needed for B00 acceptance, not its start. Return the C00 copy/producer/consumer consistency cross-check and actual component/browser evidence in your handoff. Backend completion alone does not satisfy browser gates. Use `handoffs/TEMPLATE.md`; preserve raw failures and retests. No Work task acceptance, main merge or release is inferred.

**Work — current/final evidence alignment:** C00 has been submitted with self-review; C01 independent register/runbook/claims/evidence material is delivered; C02 presentation is prepared with actual candidate gates open. Continue existing W01 → W02 → W03 consolidated review when its requested submission is available, refresh the same evidence pack, and inspect the real A07/B06 candidate and rehearsals. No unavailable Cowork session remains an owner.

**Human — review and integration:** review the Work audit corrections and the outstanding scoped engineering/consumer reviews. Supply the eventual frozen candidate and authorize only the actual named-profile runtime/reset operations needed for its tests and two rehearsals. PR20 merge does not itself accept C00–C02 or declare a release.

## Required contents of the candidate packet

| Input | Producer / exact requirement | Status at this checkpoint |
|---|---|---|
| Source and dependency chain | Codex and human: base, implementation and integration SHAs for A02 correction/A03–A07; Work compares the actual tree and preserves changed-source limits | A02 correction and A03–A05 supplied and merged, with producer artifacts indexed; consolidated review and A06/A07 remain |
| Semantic/executable contract | Codex: versioned proposal if changed, canonical schemas, generated clients/OpenAPI/examples and drift output; Codex UI consumption handoff | Accepted 0.2.1; transport 0.4.0 and signed command 0.3.0 pending consolidated review |
| Test evidence | Codex: IDs mapped to canonical scenarios, actual commands/exits/times, fixture/profile, assertion detail, raw artifacts/hashes, failures and retests | A00–A05 engineering subsets indexed separately; full T01–T34 NOT_RUN |
| Release package | Codex A07: `artifacts/release-manifest.json`, candidate build/lockfile/image/tool identity, migration and local start/bootstrap/seed/reset instructions, documented host/TLS/storage limits | Final manifest absent at inspected source; do not invent commands or platform support |
| Browser and UI | Codex B04/B06: real API journey/error/permission/network reports and final build screenshots, synthetic media only | Not reviewed/supplied for final candidate |
| Claims and operations | Work C01/C02: refreshed checklist/capability/runbook/claims/media references; identify prepared vs live vs recorded | PR20 source-aligned content merged; audit corrections submitted; candidate refresh and substantive acceptance pending |
| Rehearsals and human decision | Two independent runs from documented synthetic start state on the same frozen candidate, run order/times/results/artifacts and human sign-off | No frozen candidate or rehearsal supplied |

Missing future artifacts are explicitly pending inputs from the owning lanes. Work can complete preparation without them; it cannot certify their behavior. Do not fill these gaps with generated screenshots, invented statistics, fabricated logs, a stale commit's test pass or a changed tracker status.

## Scope and time control

Keep the accepted marketing-withdrawal slice and existing code. No new ADR, framework, runtime model/vendor operation, optional feature or website deployment is introduced. The plan's approximately 36 remaining hours is the original allocation, not a new countdown; exact R0/meeting deadline remains unknown and is not needed to prepare these documents. If time is short, remove P1 and polish before reducing required authority, durability, effect, uncertainty, recovery or evidence checks. A limited demonstration requires its own truthful PARTIAL scope; it cannot be called the completed outcome prototype while a P0 gate is unmet.
