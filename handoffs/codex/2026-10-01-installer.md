# Handoff - R4-INSTALLER-04 - Linux install, first-run correction and upgrade

**Base:** e42f573c91340eadbcd42ad010c79c56fd50010a. **Branch:** codex/installer-20261001, this handoff's commit. **Contract:** 0.46.0 unchanged. Source master revision 1.4 and approved addenda unchanged.

**Result:** customer installation completed; the owned first-run supervisor fix passed its 14-check regression; actual upgrades bf29c43 -> 639d905 -> e46babe completed and retention/MFA verification passed. Intermittent startup failures remain recorded and are a release concern, not fixed by a passing retry.

**Qualification candidates:** previous release `bf29c436911d33cbbafcbb6ce7f6d04a5704a64d`; upgrade target `639d905bcd7f4861cd6bb02b0efe7e2919493dd4`, pinned from Claude's head at qualification start. No application/installer/dependency changes between e42f573 and 639d905.

**Later observed head:** `e46babe40f4fa12cb42e1c6ef951bee2359bd4b1`. After the initial qualification, Claude's branch advanced with audit indicators, vendor-practice changes and vendor migration 0014. A second actual upgrade of the preserved installation to this exact head also completed. See the separate latest-head results below; browser matrix evidence remains explicitly on e42f573.

## Delivered and scope

The actual customer installer completed on a clean Linux container after environment recovery. Its unmodified supervisor failed first-run startup. The owned `scripts/app-run.ts` correction keeps the web process available before organisation setup, then starts workers only after durable setup completion and local enrollment files exist. Enrollment remains the responsibility of the protected local command/renewal timer; the supervisor does not create roles, identities or credentials. Established installations retain their existing failure handling. One writer owns this path; it is outside the round-3/4 Claude-protected list.

The unchanged first-run harness passed 14 checks with that supervisor correction. The correction was then removed from the isolated previous-candidate checkout, its exact source restored, and the actual installer upgrade ran from bf29c43 to unmodified 639d905. Backup verification, migrations and build completed; post-upgrade verification passed 8 checks, retaining installation identity, completed setup, both logins and MFA.

**Do not call unmodified bf29c43 or 639d905 first-run qualified.** Their supervisor/setup/enrollment source is identical for this defect. The 14-check first-run pass includes the proposed supervisor correction. The upgrade and post-upgrade pass use clean, unmodified 639d905 after setup was completed. An earlier worker lifecycle failure is retained separately below.

Changed paths: `scripts/app-run.ts`; this handoff; qualification-only helpers `handoffs/codex/{round4-installer.Dockerfile,round4-install-host.sh,round4-resume-install.sh,round4-installer-phase.sh,round4-refresh-source-index.sh,create-installer-trust-round4.mjs,qualify-first-run-round4.mjs,publish-installer-log-round4.mjs,diagnose-worker-round4.mjs}`; the exact artifact paths in `artifacts/R4-installer-artifact-index.json`. No existing test, fixture, assertion or threshold was changed. No contract, migration or protected Claude source was edited.

`handoffs/codex/capture-installer-state-round4.mjs` additionally records only non-secret release identity, retained installation identity, supervisor duration and inner-container health/resource state.

`handoffs/codex/round4-upgrade-latest.sh` records the separately guarded upgrade to the later observed head. Exact changed-file hashes remain in the artifact index.

## Host and prerequisites

Debian 12, Node 24.21.0, pnpm 12.4.2, nested Docker 28.5.2 and Compose 2.40.3. Base images are digest-pinned in the Dockerfile. The outer Docker engine reported 29.8.0 after its restart. Source-only archives and shallow Git metadata were copied, not Windows profiles or secrets. The synthetic trust helper retained public keys only. Generated installation credentials, TLS keys, setup code and MFA material stayed inside the isolated host.

The owner approved privileged Docker-in-Docker with no host socket, mounts or published ports, and asked to stop unused Docker first. Root installations were already stopped; the three round-3 qualification containers were stopped after browser work. No shared database or volume was reset. `orvia-installer-round4` retained the failed private-cgroup attempt. The corrected host is `orvia-installer-round4-cgroup`, with 3 GiB memory, 4 GiB memory+swap, 2 CPUs, 1024 PIDs and VFS storage.

The initial private cgroup was `domain threaded`; nested services failed with `cannot enter cgroupv2 /sys/fs/cgroup/docker with domain controllers`. Docker's bundled nesting initializer also failed with `Operation not supported`. Automatic approval review rejected `--cgroupns=host` as broader host resource-control access. The owner explicitly replied **Approve dedicated host-cgroup qualification**. Only then was the corrected host created with dedicated parent `/orvia-round4-qualification`, no mounts/socket/ports. No alternative OverlayFS host was created.

| Round-3 missing prerequisite | Round-4 resolution |
|---|---|
| Docker CLI | Pinned Docker image binaries copied into qualification image |
| Compose v2 | Pinned image's CLI plugin copied; 2.40.3 executed |
| openssl executable | Installed in the disposable Debian image |
| pnpm executable | Pinned 12.4.2 installed inside the Linux host |
| reachable independent Docker daemon | Separate approved nested daemon; cgroup correction required |
| systemd warning | Still absent; units rendered only, boot/timer enablement NOT_RUN |

Actual Linux `--check --kind customer` returned 0 with zero missing prerequisites and the systemd warning. This prerequisite pass alone is not an installation pass.

## Commands and results

Commands ran in `/qualification/repo`, with `ORVIA_PROFILE=rehearsal`, the matching workspace root and process-local `NODE_EXTRA_CA_CERTS` for HTTPS. No OS trust change or verification bypass.

| Command / check | Exit | Evidence / outcome |
|---|---|---|
| Qualification image build | 0 | R4-installer-image-build.log |
| Initial archived-source preflight | 2 | Windows archive CRLF broke Bash `pipefail`; R4-installer-preflight.log, harness transport failure |
| Linux canonical checkout and installer `--check --kind customer` | 0 | R4-installer-preflight-native-checkout.log |
| Initial private-cgroup fresh install | 1 | R4-installer-install-progress.log; services cannot start |
| Bundled bounded `dind true` initialization | 1 | Operation-not-supported cgroup writes; did not repair it |
| Corrected-host initial install | INTERRUPTED | Docker Desktop restarted; no install.exit, host exit 255; no pass inferred |
| First `--resume` attempt | 1 (stopped) | R4-installer-vfs-resume.log; had reached build when host was stopped based on stale progress information |
| Subsequent supported `--resume` install | 0 | R4-installer-install-complete.log; complete customer install and rendered units |
| Original supervisor plus first-run HTTPS harness | 1 | R4-installer-runtime-initial.log and setup-initial.log; missing enrollment shuts down setup page |
| Same first-run harness with only supervisor correction | 0 | R4-installer-setup-patched.log; 14/14 checks |
| Protected `machine-init.ts confirm:rehearsal` after setup | 0 | Actual workers start; runtime-patched.log includes transition and RUNNING |
| `pnpm run typecheck` / targeted ESLint on app-run.ts | 0 / 0 | R4-installer-supervisor-typecheck.log and supervisor-lint.log |
| First upgrade request | 1 | R4-installer-upgrade-initial.log; refuses apparent tracked changes |
| Index-only refresh after content/staged diffs both clean | 0 | round4-refresh-source-index.sh; copied Windows stat metadata rebuilt, no source content changed |
| `orvia-upgrade.sh --to r4-upgrade-target --no-restart` | 0 | R4-installer-upgrade-complete.log; verified backup, checkout, migration, build |
| Initial worker diagnostic helper | 1 | Diagnostic package-resolution error, worker-diagnostic-tool-error.log; no product assertion executed |
| Corrected diagnostic, one real target worker cycle | 0 | R4-installer-worker-target-cycle.log; outbox/governance/catalog/classification/CMP stages pass |
| Unchanged first-run harness in `verify` mode on target | 0 | R4-installer-post-upgrade-verify.log; 8/8 identity/setup/login/MFA checks |
| Target source identity and tracked diff | 0 | HEAD 639d905; no tracked source changes |
| Repeat unchanged verify after sustained availability | 0 | 8/8 checks again; same assertions |
| Owned supervisor stop | 0 | Lifecycle 1790756916458-f426e0a1-573e-4fcc-b5c7-527d24f8267e: PASS; all four children exit 0, none forced |
| Stop four inner services and corrected outer host | 0 | Data retained; final `docker ps` has no running containers |

The source archive had Windows newlines; Linux Git restored exact canonical bytes before installation. Later, copied Windows index stat sizes caused dirty status despite matching blobs and empty content/staged diffs. Rebuilding only the Git index restored the upgrade's original clean-source guard. It was not bypassed. An interrupted daemon left PID 1 in its private PID file; after proving the container stopped with PID 0, its stale value was preserved and cleared. No database/profile state was deleted. A redundant local image-snapshot client was cancelled; its completion is not claimed.

## First-run defect and regression evidence

`machine-init.ts` intentionally does not write enrollment files when no organisation scope exists. The old supervisor nevertheless immediately launched worker, agent and operations runner after HTTPS readiness. Their missing-file exceptions caused the supervisor to shut down the page required to create that scope. The original runtime log and failing lifecycle artifact preserve this trigger.

The correction lets the first-run web process stay alive, polls durable setup state, and starts the same owned machine processes after setup and enrollment. The 14 unchanged checks cover OPEN, creation, COMPLETED, setup-code reuse rejection (409), stable installation identity, and owner/admin password login, TOTP enrollment/verification and authenticated sessions. Local machine enrollment then triggered the supervisor's waiting-to-workers transition without restarting the web process. Normal authorization and enrollment validation remain in the machine processes.

The later previous-candidate worker exit remains **FAIL**: lifecycle `A00-application-lifecycle-1790756099729-50db1f04-98f5-44f1-b8a3-75be4efe0488.json`, WORKER_PROCESS_EXITED / nested UNCLASSIFIED. All four inner services reported running, zero restarts and no OOM; the sampled database error interval had no ERROR/FATAL lines. No root cause or fix is claimed for that separate exit. Target cycle and post-upgrade results do not erase it. Full runtime observation/shutdown results are recorded in the final-state evidence.

The target supervisor was observed for 265 seconds with HTTPS readiness 200, retained installation ID and a clean tracked checkout (`R4-installer-final-state.json`). The repeated identity/MFA verification passed and the complete owned shutdown passed. Backup drill evidence records 4/4 passing checks. Upgrade schema result was ALREADY_APPLIED, not a claim that new migrations were needed. The relay's actual memory limit is 268435456 bytes (256 MiB); services had no OOM or restart during this final observation.

## Limits and next dependency

### Additional latest-head upgrade

Source-object bundle transfer contains no profile or credentials. `round4-upgrade-latest.sh` guards both exact commits and runs the original backup/upgrade command from 639d905 to e46babe. It returned 0: `R4-installer-upgrade-latest.log`. The second backup drill passed and customer migrations were already applied. This customer installation does not qualify vendor migration 0014. `R4-installer-head-advance.json` records the observed open PR #33, source changes and identical supervisor blobs across all four inspected candidates.

The first latest-head runtime **FAILED**: the agent's 5-second poll timed out, the supervisor shut down, and a setup-state read also logged a database connection timeout. The unchanged verification completed only its identity check before failing to parse the empty response. Evidence: `R4-installer-runtime-latest-initial.log`, `R4-installer-verify-latest-initial-failure.log`, and lifecycle 1790757738919-584799fa-b2c6-4d0a-926f-c7dac1564cbd. A later publication command returning 0 is not the verification's result. This is not a passing startup and was not erased.

The retry executed the existing systemd unit's protected `machine-init.ts confirm:rehearsal` pre-start step (0), restarted the unchanged target, observed HTTPS readiness 200, and reran the exact same verification (0, 8/8). No assertion, fixture expectation or timeout changed. `R4-installer-verify-latest.log` records the successful retry. The retry does not establish a root cause or fix for the intermittent startup/connection failure; engineering must retain it as a release concern alongside the earlier worker exit.

`R4-installer-latest-state.json` records 206 seconds of supervisor availability, clean e46babe source, retained identity and HTTPS readiness 200. Its controlled shutdown exited 0; lifecycle 1790758109416-45d2cc41-066f-422b-8f55-aae80c9b8ae6 is PASS, all four children exit 0 and none forced. The latest backup drill is PASS (4/4). All four inner services and the outer qualification host were stopped with exit 0 afterward; profiles and volumes remain preserved.

The proposed supervisor first-run fix remains needed on e46babe: its original supervisor blob is identical to the earlier candidates. Fresh first-run qualification still includes the proposed patch, not a claim about the unmodified latest source. No additional product fix is claimed for the intermittent timeouts.

This is synthetic local Linux-container evidence. First-run was exercised through the actual HTTPS API, not a Linux browser. Systemd enablement, timer execution, boot survival, production hosting, vendor fresh install, rollback and real key custody remain NOT_RUN. Existing unsupported vendor hosting/origin/entry-point gates remain in the readiness runbook. The cgroup and interrupted-host recoveries are test-host setup, not customer deployment instructions.

Merge/review the supervisor correction before qualifying first-run installation on an integration commit. Owner release acceptance is separate. Retain the previous-candidate worker failure and investigate if it recurs; do not infer production stability from a short local run. No tracking/acceptance promotion, public deployment, main merge, production data or SCIM implementation occurred.
