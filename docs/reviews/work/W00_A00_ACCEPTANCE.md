# W00 — corrected A00 accepted

**Decision:** ACCEPTED for the shared prototype foundation. W00-F07 and the remaining W00-F01 source gate are closed. Work accepts **A00 at `58ceddcd73b9b9f0717553bbd1e2fff3f7389abe`**, the human integration of PR #5. Contract **0.2.1** is the accepted executable baseline. A01 and B00 may start from this base after the human integrates the shared Work tracking update. No later application ticket or release is accepted here.

**Review date:** 2026-09-16. Correction implementation `732f4f50142e9b6bbe37187b07da04e3341b9621`; submitted head `aa831cdfc2051599ab812e20287664c34f30a15c`; integrated head `58ceddcd73b9b9f0717553bbd1e2fff3f7389abe`. Submission and integration trees are identical. [PR #5](https://github.com/Nakum-hub/Cyberfyx-ORVIA/pull/5) was merged by the human at 13:06:04 UTC. Prior [Work PR #4](https://github.com/Nakum-hub/Cyberfyx-ORVIA/pull/4) was closed without merging; this checkpoint supersedes its gate disposition and preserves the original failure through Codex's committed reproduction artifacts.

## Findings closed with evidence

| Finding / severity / original scope | Actual correction and independent retest | Owner / remaining scope |
|---|---|---|
| W00-F07 / High / A00, completion predicate and Observation/Obligation at e839b1a | Provider-only evidence previously returned COMPLETED for CURRENT_SCOPED_OBSERVATION. The unchanged reproducer now returns NEEDS_ATTENTION; ACK-only, fresh-read and stale-read controls all pass. Predicate requires SCOPED_READ. All 11 unit tests pass, including preservation of provider evidence/unknown history, manual distinction and freshness/current-scope controls. | Codex fix accepted at 58ceddc. A03/A05/B03 still must enforce actual reference/generation matching and truthful persistence/UI; full T18/T21/T29 remain future tests. |
| W00-F01 / High / W00/A00 required master and bootstrap evidence | Approved original now exists at docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md. Both committed and checkout bytes are 850752 bytes with SHA-256 527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6. A00 inventory/scaffold/handoff were already supplied. | Human-authorised one-time source placement is recorded in Codex's handoff and human-merged PR #5. Source ownership stays human. No further upload needed. |
| W00-F02 / High / signed bindings | Canonical 0.2.1 binds installation, tenant/legal entity/environment, workflow/action, capability/version, schema/plan/scope/approval digests, expiry, nonce and bounded operations. Signature/binding and obsolete-version negative tests pass. | Closed at contract/helper depth. A03/A06 real agent enrolment, current authority, replay, budget and epoch/generation tests remain required. |
| W00-F03 / High / receipt/reconciliation/completion semantics | Immutable receipt replay and current GET projection, typed separate reconciliation transitions and the corrected completion criterion are accepted together. Provider evidence may inform reconciliation while remaining distinct from independent observation. | Closed at A00 semantic depth. Atomic transactions, persistence, race safety and actual target observation remain A02–A06. |
| W00-F04 / Medium / progress validator | Progress-aware validator and three existing tracking unit cases pass; canonical JSON remains Work-owned. | Closed. Completion does not automatically mark linked application scenarios PASS. |
| W00-F05 / Medium / timing/runtime facts | Codex's Windows resources, pins, profiles and service preflight are recorded. R0/meeting deadline remain unknown; no reset of the 36-hour allowance. | Timing remains an explicit nonblocking human input, not an A00 blocker. Preserve rest/freeze/rehearsal reserves. |
| W00-F06 / Medium / publication | Previously resolved; Work can publish through the authorised GitHub connection. | Closed; no repeat permission or installation request. |

## Checks actually executed by Work

Executed in an isolated checkout of 58ceddc with Node 24.21.0 and pnpm 12.4.2. Full commands, cwd, timestamps, fixture/profile, source SHA, exit codes and raw logs are under `docs/reviews/work/artifacts/W00-A00-58ceddc/`.

| Check | Result | Record |
|---|---|---|
| Frozen offline install | PASS, 350 cached packages, zero downloads; no lockfile change | install.json |
| Exact original F07 reproducer, byte-identical Codex copy | PASS, all 4 expected/actual comparisons | F07-retest.json |
| Existing and new unit suite via Node tsx loader | PASS, 11 tests | unit.json |
| Contract regeneration drift/examples | PASS, 8 artifacts, 37 routes, 7 error examples | contracts.json |
| Typecheck / lint | PASS / PASS | typecheck.json / lint.json |
| Committed source, manifest and evidence provenance audit | PASS, master hash; 7 artifact hashes; 6 producer reports' source files match integration; submission/merge trees equal | source-audit.json and reproducible source-audit script |

The exact original F07 script hash is `b40598c60c17a9ff7d44fbafaf88c6d7b1090227c0f6a63bb476b8d7099d1b83`. Codex retains the pre-fix exit-1 report `handoffs/codex/artifacts/A00-test-f07-2026-09-16T12-55-42.526Z.json`; Work's new passing report does not erase or relabel it. Codex's post-fix reports identify source 732f4f5; Work's independent retests identify the integrated 58ceddc. The audit establishes byte matches, not new service execution.

No Docker/PowerShell, service mutation/reset, independent Next build/HTTP smoke, browser, egress capture, recovery, advisory audit or rehearsal was run by Work in this retest. Earlier A00 producer service/start/reset/build evidence remains bootstrap-only and retains its original source identity. Node's supported tsx loader avoids the previously denied CLI IPC listener; this does not relabel the earlier CLI failures as passes. All full prototype T01–T34 remain NOT_RUN. This review is not production security/legal approval.

## Adopted contract and ownership

Preserve ADR-001's customer-local synthetic marketing-withdrawal profile and existing working scaffold. No architecture rewrite, new P1, model runtime or vendor-hosted operation is added. Accepted contract 0.2.1 incorporates the bounded correction; no routes/fields/enums were removed. Old 0.2.0 signed envelopes are rejected and must be reissued with the accepted schema version. Only bootstrap tables exist, so no business migration is claimed.

The schema/transport/auth mounts and approved semantics are one coordinated baseline. Work's contract document now records acceptance. Embedded PENDING_W00 labels in producer-generated artifacts identify their submission state; this exact review/commit supplies the acceptance decision. Codex may refresh those metadata labels and populate the accepted seed from its canonical generator in the next owned change. Nobody hand-edits generated types or imports an older seed. B00 confirms generated-client/auth consumption; future semantic changes are versioned and reviewed together.

The recorded transfer of `apps/web/src/app/layout.tsx` and `apps/web/src/app/page.tsx` to Claude Code takes effect with this accepted A00 base and human integration of the shared ownership record. Codex retains health/API/server/auth, configurations, manifests, dependencies and schemas. Claude Code uses its own `ui-b00` profile, worktree, ports, database/volumes, Temporal namespace, credentials and artifact directory. Restore of the common template is format-only from the matching v1 kit; source originals stay human-owned.

## Next dependency-ready work and retained gates

- **Codex A01:** protected bootstrap, real staff/principal sessions, privileged MFA, tenant-aware relational persistence, least-privilege roles/RLS and negative scope/role tests. Submit exact commit and evidence for W01; do not trust client selectors or manufacture API success.
- **Claude Code B00:** shared shell and truthful loading/error/empty states using accepted generated interfaces; no second backend or fake authority. B00 may start after A00; its acceptance additionally needs **Cowork C00**. C00 has no submitted artifact in the inspected repository and remains independent/NOT_STARTED in the canonical ledger.
- **Work W01:** next Work ticket; review A01/A02 authority, consent transaction/idempotency, stale grant/re-consent races and API/UI evidence as it arrives. Its acceptance waits for A01/A02. W02/W03 are not completed by this checkpoint.
- Continue A01 → A02 → A03 → A04/A05 → A06. A07 starts after A06 and requires W02 for acceptance; W02 requires W01 and A04/A05/A06/B04 evidence. B06/C02 and W03 retain their existing dependencies. Do not start or accept A01–A07 as one ungated batch.

Later gates must prove current send-admission ordering with withdrawal; no authority from preview ALLOW; separate order-service conditions; safe bounded retries and unknown effects; ACK/provider/manual versus independent observation; scoped local exports; target-only quarantine/restore against the current ledger; full reset admission/drain isolation; actual regression failure detection and runtime egress denial. The bootstrap relay's external-capable bridge and bootstrap-only reset do not qualify these controls. W03 requires the exact frozen integrated candidate, all P0 and any promoted P1, truthful scope claims and two rehearsals. Human alone approves integration/release. No recurring scheduling or automatic cross-tool orchestration is created.
