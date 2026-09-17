# Handoff ? B00/B01/B02/B03/B04/B06 ? Codex UI lane

Base backend: `7f4f7010a908f77c036ab31951ed89fa200f722c`. Frozen candidate source: `766854399d411c551c4d3f657ea2b4f3f189a4bd`. The final evidence-publication commit is the commit containing this handoff; the final chat and PR identify its SHA. Branch `prototype/codex/B00-B06-ui`; draft PR https://github.com/Nakum-hub/Cyberfyx-ORVIA/pull/24. Main was last verified unchanged at the base SHA; no merge was performed. GitHub reported no status-check entries, not a CI pass.

Master SHA256: 527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6. Contract 0.4.1, commands 0.3.0; dependencies/lockfile/migrations unchanged. Rehearsal installation b4a58f9b-7f5e-4e7b-b057-2fa6d68352f4, synthetic aster-birch-v1, https://127.0.0.1:4330. No customer data, reset, public deployment or paid service.

## Delivered implementation ? runtime acceptance remains pending

- B00: preserved Claude styling/root/privacy shell; staff overview, real session/capability guard, bounded generated transport, identity invalidation and reusable state/pagination primitives.
- B01: real staff password/MFA enrollment/challenge, principal references, purposes/notices/policy drafts, distinct-reviewer MFA publication, target mappings and system checks. Complete paginated selectors; server scope remains authority.
- B02: preserved Privacy Centre journeys, real cursor navigation/history, immutable receipt/current-state separation, explicit identical-request replay after uncertainty, blocked conflicting decisions and native accessible withdrawal confirmation.
- B03: workflow/failure/evidence directories, plan/attempt/observation/reconciliation facts, safe read reconciliation, local JSON export, actual overview counts, policy preview, control map and all 33 programme modules. No fabricated stages, counts or effects.
- B04: durable Test Lab enqueue/read/poll, actual assertion/build/time/artifact display, true NOT_RUN/RUNNING/PASS/FAIL/ERROR states, expected broken-control distinction and explicit local operator dependency.
- B06: consolidated source review and fixes; 15 executable browser tests in seven suites; real no-input POST defect reproduced and fixed; new exact engineering package. Browser acceptance is BLOCKED, not complete.

Exact changed paths are in `B06-changed-files.json`. Major source paths: `apps/web/src/app/workspace/**`, the preserved privacy pages, `apps/web/src/components/{api,configuration,derive,errors,mutation-feedback,operations,session-context,shell,state-labels,test-lab,ui,workspace}.*`, `packages/contracts/src/client.ts`, `tests/e2e/**`, `tests/unit/ui-evidence.test.ts`, `tests/unit/contracts.test.ts`. Public manifest is `artifacts/release-manifest.json`. Work-owned tracking/reviews/copy/source files were not edited. Original Claude provenance remains retained; no replacement frontend.

## Exact commits

```
3a045e6 B00: preserve UI and bind shared auth, scope and recovery infrastructure
c2bf492 B01: bind staff configuration, publication and principal mappings
0988221 B02: preserve consent request replay and complete receipt pagination
3859c6e B03: expose real workflows, unresolved obligations and scoped evidence
a7189dc B04: bind Test Lab to durable synthetic regression requests and results
7668543 B06: add real browser suites and fix verified UI transport and recovery defects
```

## Commands and observed results

`B06-command-index.csv` and `.json` enumerate all 36 recorded commands with exact exit code, result, source commit and evidence path. Full source-file hashes and stdout are retained in each referenced command report. Initial failures remain recorded, separately from corrected reruns.

| Qualification | Actual result | Evidence |
|---|---|---|
| contracts:check | exit 0; 8 artifacts, 41 route examples, 7 error examples | browser/B06-contracts-check-2026-09-17T05-31-48.181Z/command.json |
| final typecheck / lint | exit 0 / 0 | browser/B06-typecheck-2026-09-17T05-41-15.640Z/command.json; browser/B06-lint-2026-09-17T05-41-32.154Z/command.json |
| unit tests | exit 0; 15/15 | browser/B06-test-2026-09-17T05-34-56.702Z/command.json |
| exact committed host build | exit 0; mandatory routes compiled | browser/B06-build-2026-09-17T05-43-31.138Z/command.json |
| real HTTP/PostgreSQL transport reproduction | original exit 1 / HTTP 400 VALIDATION_ERROR; corrected exit 0 | browser/B06-exec-2026-09-17T05-28-27.317Z/command.json; browser/B06-exec-2026-09-17T05-30-07.160Z/command.json |
| exact candidate runtime image | exit 0 | browser/B06-exec-2026-09-17T05-44-03.461Z/command.json |
| backend network qualification | exit 0; 13 qualification assertions; 6 healthy core assertions | browser/B06-exec-2026-09-17T05-47-25.058Z/command.json and A07 helper artifacts |
| real Chromium TLS preflight on frozen commit | exit 1; BLOCKED_CERTIFICATE_TRUST | browser/B06-exec-2026-09-17T05-46-18.750Z/command.json; browser/B06-playwright-2026-09-17T05-46-23.690Z/results.json |
| UI package assembly | exit 0; 5 package archives/artifacts, 75 browser-evidence files | browser/B06-exec-2026-09-17T05-49-46.217Z/command.json |
| final publication hygiene | exit 0; 1,384 files, 33 bundles, 81 credentials compared; no findings | browser/B06-hygiene-check-2026-09-17T05-53-04.236Z/command.json |
| git diff --check | unstaged check exit 0; staged full check exit 2 on preserved terminal stdout whitespace; source/non-transcript check exit 0 | Git/tool execution record |

The initial unrecorded B00 typecheck exited 2; exact errors/correction are retained in B00-static-handoff.md. B03's first unit-file setup failed on an empty example and was corrected. B04 first typecheck caught the wrong fixture constant and was corrected. B06 first lint caught empty argument destructuring and was corrected. The first real HTTP probe stopped at login because all four rehearsal services were stopped; they were restarted with retained volumes. No auth control was bypassed. The shared-client fix is the only backend/shared behavior change: canonical no-input POSTs now carry the JSON boundary already required by the server; no schema semantics or versions changed.

Final staged whitespace inspection found carriage-return/progress-line whitespace only in the exact captured host/image build stdout. These transcripts remain byte-preserved because they are already in the checksummed evidence archive. The scoped source/non-transcript whitespace check excludes only those two command.txt files and passes; no source finding is ignored.

A fresh host frozen install was not necessary for unchanged dependencies; the Docker build reused its pinned frozen-install layer. Backend helper reports retain A07 naming, explicitly tied here to the actual B06 command/source. Backend network PASS is not browser or host-wide egress qualification. Hygiene is a bounded pattern/exact-value check, not a comprehensive security audit.

## Browser evidence and limits

Pinned Playwright 1.63.0; Chromium headless-shell revision 1243 (downloaded Chrome 153.0.8010.12), Windows x64, configured desktop 1440x1000 and mobile 390x844. Actual frozen-candidate TLS preflight ran and failed on the untrusted CA. Its certificate-failure screenshot/trace hashes and exact private paths are in the result JSON. Successful application screenshots and authenticated acceptance suites are NOT_RUN. No fake screenshots, intercepted success, cert-ignore flags or replacement HTTP profile were used.

Files: auth.spec.ts, configuration.spec.ts, consent.spec.ts, workflow.spec.ts, test-lab.spec.ts, candidate.spec.ts, tls.spec.ts. They cover real auth/scope/MFA/session expiry, configuration/publish, consent/withdraw/receipts/conflict/committed-response loss and replay, real target mutation/readback/ACK without effect/uncertainty/reconciliation/manual obligation/export, Test Lab healthy/broken/repaired/restoration/interrupted runs, outage/invalid scope/mobile navigation and the candidate walkthrough. Their type/lint success is not runtime proof. Raw authenticated artifacts remain protected under `.local/browser-evidence` and are excluded from Git and packages.

## New package identity

Git tree: `7a6e675452b7b882a8a12c4db1ced96b189fd4c6`.

- Source commit: `766854399d411c551c4d3f657ea2b4f3f189a4bd`; source hash `325d54daad807f5da2f45b182ce88bd39d914c3b01d5fb4c44e59bc311db4135`.
- Lockfile SHA256: `b2694da120310a26a6ae377ebecbd4dafcac6711b60377c4ff308fe4fc91a5c8`.
- Host build: `3rYXcWGOXlCdf_7d4FhiG`; container build: `JjG0h1a-8c8foyjBZDrjl`.
- Image: `sha256:53710a76d66eeda8ffca6da64774551a5b34488dc2bb226763e019d33d7bc1cb`; image source commit matches candidate.
- Final manifest SHA256: `bf1e7a190c808063cf2002d03bc85f506accb05661195654016249764c261d33`.
- Local package directory: `.local/releases/766854399d411c551c4d3f657ea2b4f3f189a4bd/`. Source bundle/ZIP, backend evidence ZIP, local image TAR and browser evidence ZIP exist; each SHA256 is in the final manifest. These large local archives are not Git uploads.
- Canonical A07 package producer is reused, then the UI extension adds safe browser evidence/gates. Its intermediate producer manifest checksum precedes enrichment; the final B06 manifest/checksum above is authoritative. The source bundle preserves its exact Git tree; the accompanying final manifest identifies this package.
- Gates: browser BLOCKED_CERTIFICATE_TRUST; Work PENDING; human rehearsals NOT_RUN; release NOT_APPROVED. The old A07 candidate has not been relabelled as UI-tested.

## Remaining defects / dependencies

| Severity / owner | Exact source and reproduction | Expected vs actual | Minimal action / retest |
|---|---|---|---|
| High prerequisite / human system owner | tests/e2e/tls.spec.ts; navigate actual rehearsal HTTPS with normal Chromium validation | Trusted HTTPS required; actual browser rejects CA. Thumbprint 8C592FC41BBD6AA18F42234085F6B8155466A190 absent from user/machine roots | Approve/install reviewed CurrentUser trust, run full suites, inspect/fix failures, capture real UI screenshots, remove only agent-added trust afterward |
| Medium integration / Codex producer + Work semantic review | packages/contracts/src/index.ts Obligation and ManualAttestation; read a manual obligation then attempt a version-bound attestation | Mutation requires expected_task_version; read does not expose it. UI explicitly leaves submission unavailable | Coordinated current-version read binding, producer/schema/test change; retest stale concurrent submissions, evidence scope and stable replay |
| Unverified runtime / Codex UI lane | all authenticated tests/e2e suites | Runtime evidence required; tests authored and statically checked only | Clear trust prerequisite; execute and correct every actual browser failure; refreeze/requalify candidate if source changes |

## Next action

Operational commands and trust boundaries are in browser/B06-operator-instructions.txt (also in the browser evidence archive). The temporary trust question remains pending; no silence is treated as approval. After browser qualification and human integration: Work W01/W02 consolidated review, confirmed fixes, updated candidate, full T01-T30, C01/C02 refresh, two rehearsals, W03 and human sign-off. None is self-accepted here. PR remains draft, unmerged. Rehearsal service volumes/history remain intact; test-owned web/worker/agent/canary processes were stopped by their harnesses. Other worktrees and the pre-existing stash were preserved.
