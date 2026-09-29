# Handoff — AUDIT-LOCAL-QUALIFICATION — Codex

**Base commit:** `9e4bf8c0efa813fce677fecbabb949fcf45d63a0` (branch created from origin/main).
**New commit:** identified by `git log -1 -- handoffs/codex/2026-09-29-local-qualification.md`; publication hashes are in the final response. This file cannot contain its own commit hash.
**Source master / hash verified:** revision 1.4, SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`; addenda 1.5 and 1.6 apply.
**Contract version:** 0.43.0 on origin/main; reviewed branch 0.45.0; no shared contract edited.
**Scope and profile:** synthetic local engineering only; no main merge, Claude branch push, production qualification or acceptance promotion.

## Delivered

Task AUDIT-LOCAL-QUALIFICATION. Plan: inventory every unresolved entry, classify local versus human/other-party dependencies, run existing synthetic checks without changing test code/fixtures/thresholds, preserve original failures and exact artifacts. Allowed writes: this handoff and artifacts only. Base source is `9e4bf8c0efa813fce677fecbabb949fcf45d63a0`; this does not claim tests of Claude’s unmerged branch.

`handoffs/codex/artifacts/AUDIT-LOCAL-unexecuted-inventory.json` retains **82 unresolved source entries**, their locations, original details, classification and named next owner. Sources: `tracking/tasks.json`, `tracking/v1-expansion.json`, the audit-practice, audit-mandate and audit-exchange handoffs, and the reconciliation matrix. Historical task status is retained. Every class-(b) dependency has a `needed_from` field; compound source rows are preserved.

## Commands actually executed

Working directory `.worktrees/local-qualification`; `ORVIA_PROFILE=codex-a00`; pinned Node 24.21.0 and cached root `node_modules/.bin/tsx.cmd`. All services are on this Windows host, never Claude's container.

| Command | Exit | Result | Artifact |
|---|---:|---|---|
| `tsx --test tests/unit/*.test.ts` | 1 | Initial missing worktree dependency links | `artifacts/AUDIT-LOCAL-unit.log` |
| same after linking all existing local dependencies | 0 | **PASS 330/330**, no skipped tests | `artifacts/AUDIT-LOCAL-unit-retry.log` |
| `tsx scripts/backup-drill.ts confirm:codex-a00` | 1 | **FAIL**, missing `app.consent_records` (42P01), before backup/restore | `artifacts/AUDIT-LOCAL-backup.log` |
| `tsx tests/integration/opa/cold-start.test.ts` | 0 | **PASS 8/8**, fail-closed and readiness controls | `artifacts/AUDIT-LOCAL-opa.log`, `artifacts/A00-opa-cold-start-1790696142314-fedb5a03-de7e-4034-b87a-7d2489c8ee7b.json` |
| `tsx scripts/capacity-mixed.ts confirm:codex-a00` | 0 | **FAIL workload evidence**, 37 query cancellations despite CLI exit 0 | `artifacts/AUDIT-LOCAL-capacity.log`, `artifacts/A00-capacity-mixed-1790696424224-cc8a8948-c812-43aa-ad03-f4b31e56a477.json` |
| read-only local role/migration probe | 0 | No vendor roles; old non-contiguous customer migration ledger | `artifacts/AUDIT-LOCAL-schema-preflight.log` |
| clean-container installer `--check` command below | 1 | Prerequisites missing; full installation **NOT_RUN** | `artifacts/AUDIT-LOCAL-installer-preflight.log` |

Exact clean-container command (no downloads, network or Docker socket):

```powershell
docker run --rm --pull=never --network none --name orvia-audit-installer-preflight --mount 'type=bind,source=C:/Cyberfyx-projects/Cyberfyx_ORVIA/.worktrees/local-qualification/installer,target=/workspace/installer,readonly' --mount 'type=bind,source=C:/Cyberfyx-projects/Cyberfyx_ORVIA/.worktrees/local-qualification/package.json,target=/workspace/package.json,readonly' --entrypoint bash node@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 /workspace/installer/linux/orvia-install.sh --check
```

The cached Debian/Node container has no Docker CLI/Compose, OpenSSL or pnpm, cannot reach a Docker daemon and has no systemd. No prerequisite was installed and no permission was granted. A full clean installer run cannot be claimed from this check.

Runtime startup: the installed Docker Desktop initially had no engine endpoint. It was started hidden; then `docker start orvia-codex-a00-postgres-1 orvia-codex-a00-opa-1 orvia-codex-a00-loopback-1` exited 0. No services were previously running; no other profiles were started. These three services are stopped again at task completion; exact cleanup evidence is appended below.

## Results and root causes

- **OPA:** first ready after 1,766 ms; warm p95 12 ms. Eight assertions pass on this local configuration only.
- **Capacity:** unchanged defaults: 45 seconds, 16 clients, 1,000,000 audit events, 100,000 principals, 200,000 requests; container memory 384 MiB. Six `export_chunk:57014` and 31 `list_audit:57014` cancellations. The scratch DB was dropped by the script. Do not treat exit 0 as performance acceptance.
- **Stale schema:** the ledger has 0000–0036 and some 0040–0048 entries, including historical `0048_grc`; it lacks 0037–0039 and later migrations including 0063. Current source names the GRC creation migration `0049_grc`. This explains the missing registry table and the old RLS plans in capacity output. Do not edit ledgers, silently reapply renamed DDL, reset the profile or change thresholds to pass. Reconciliation is needed before current-schema backup/capacity proof; the known R09 migration-history issue belongs in Claude coordination.
- **Vendor runtime:** no `orvia_vendor*` roles are installed. Creating/altering them conflicts with this task’s no-permission-change constraint. The separate migration branch records the failed proof and leaves fresh/upgrade acceptance NOT_RUN.
- **SCIM:** no SCIM implementation, test or runnable runbook was found under backend/frontend/tests/scripts. This is not a test that can be converted to PASS; the identity-provider/scope decision and implementation are still missing.
- **Local TLS audit channel:** NOT_RUN. There is no provisioned local vendor installation and the customer schema is stale; the two-installation prerequisite is absent. A generic HTTPS transport test would not satisfy the requested audit round trip, so none is substituted. Production hosting remains a separate external gate.

## Acceptance

All canonical and expansion acceptance remains NOT_RUN. Only explicitly listed component results changed. No synthetic result is production-qualified. No test, fixture, expected value, threshold, skip or quarantine was changed.

## Needs a human decision or external party

| Needed | From whom |
|---|---|
| Legal review of engagement letter and DPA before real use | Privacy counsel / engagement owner |
| Retrieve and authenticate official Act, Rules and notifications; approve/sign production regulatory criteria | Regulatory content owner with permitted source access |
| Production audit/release key ceremony and custody | Authorised signing custodian; no keys requested in chat |
| Vendor-role provisioning in a separate local test installation and reconciliation of historical customer migration ledger | Authorised local environment owner, with Claude owning the DPDP migration path |
| Review fixes, adverse queued-revocation/lease tests, engagement-withdrawn closure and channel-response retest workflow | Claude, reserved-path writer; Codex reproduction/finding handoff supplied |
| Firefox/WebKit available locally and a browser selector in the reserved suites | Local environment owner and Claude |
| Clean Linux/systemd VM or container prerequisites; reboot, upgrade/rollback and platform qualification | Installer/environment owner |
| Real hosted TLS, multi-day supervised operation and real customer host qualification | Deployment owner and customer operators |
| SSO/SCIM IdP choice, integration scope and implementation | Product/identity owner, then Codex in its lane |
| Payment merchant KYC, approved prices/GST, authorised provider configuration and live conformance | Commercial owner / payment provider |
| External security/accessibility review and final frozen-candidate acceptance, including historical C00 decision | Independent reviewers and human release owner |

## Contract / dependency / ownership changes

None. Exact files are this handoff and the `AUDIT-LOCAL-*` and two named `A00-*` artifacts. No application or protected path was edited.

## Remaining limitations and blockers

The full request is not complete: real DB migration proof, current-schema backup/capacity, local TLS, installer and cross-browser qualification remain outstanding for the reasons above. A locally executable component run cannot close every unresolved acceptance item in the inventory.

## Next integration action

Resolve the local schema history and provision the permitted vendor test environment, then rerun the same commands and add original and rerun evidence. Claude acts on its findings; a human integrates branches. No production release is authorised.

## Runtime cleanup

`docker stop orvia-codex-a00-postgres-1 orvia-codex-a00-opa-1 orvia-codex-a00-loopback-1` exited **0**. Artifact: `handoffs/codex/artifacts/AUDIT-LOCAL-cleanup.log`. All three services were returned to their original stopped state; data volumes retained. Docker Desktop itself remains running.
