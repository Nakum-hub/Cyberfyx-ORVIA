# A00 repository and machine inventory

> Historical bootstrap snapshot from 16 September 2026. Its revision 1.3 source
> references describe what existed at A00; the current product authority is the
> revision 1.4 master at the repository root. Use the root README and
> `CURRENT_STATE.md` for current navigation and implementation status.

Recorded 2026-09-16, Asia/Kolkata (UTC+05:30). Task A00; implementation base `e5cdef310d61a697edcf9e4f7bc03c9a4a0a3e8c`; branch `prototype/codex/A00-bootstrap`; remote `https://github.com/Nakum-hub/Cyberfyx-ORVIA.git`.

The initial local HEAD was `96b8bd7590de0ca662d725b7fa0d708e811d6722`. Fetch showed the human-integrated Work updates on main; the Codex branch was fast-forwarded to that base before implementation. There were 16 tracked instruction/planning/review files, no application code, manifest, lockfile, migrations or executable tests. Pre-existing untracked `.gitignore`, `scripts/bootstrap-tools.ps1`, `scripts/dev.ps1`, `scripts/resolve-toolchain.mjs` and ignored `.local/` setup material were preserved and inspected. The three scripts were completed for the actual pinned toolchain. No pre-existing tracked file was rewritten. IDE tab names were not assumed to prove a file existed on disk.

The approved master is available at `C:\Cyberfyx-projects\ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md`, 850752 bytes, document revision 1.3, Product V1. Its SHA-256 is `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`, matching W00. Current numbered requirements govern this implementation. The expected `docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md` remains absent; the human controls its placement. The historical prototype kit was not imported. Searches of this workspace, its project parent and supplied attachments did not locate the original `tracking/contract_seed.json`, `tracking/capabilities.json`, `prompts/02_CODEX_BACKEND.md` or `handoffs/TEMPLATE.md`. The new attached execution prompt supplies the role instruction; no missing original was invented.

## Preserved scope and path mapping

The logical ownership paths already fit the empty application tree. Root manifests/configuration, `shared/contracts`, `db`, `auth`, `domain`, `testing`, `frontend` server/liveness, `services/worker` infrastructure probe, `infrastructure`, `policy`, scripts and backend tests are the only code additions. `frontend/src/app/{layout,page}.tsx` are the two minimal A00 UI bootstrap files; their transfer is recorded in the Codex handoff. No UI design or later-ticket business feature is claimed. Work-owned JSON, Markdown, ADR and state remain unchanged. Their stale A00 label must be consolidated by Work from the handoff.

## Actual machine and access

The machine snapshot is `handoffs/codex/artifacts/A00-machine-snapshot.json`, captured at 2026-09-16T09:18:48Z. Windows 11 Home Single Language 10.0.26200, PowerShell, Intel i5-1235U (10 cores/12 logical), approximately 7.73 GiB physical memory, about 698 MiB free at that instant, approximately 190 GiB free on C:. Resource observations are point-in-time; Next build workers are capped at one. Git 2.47.0, Docker Desktop Engine 29.2.1, Compose 5.0.2. Host Node 24.7.0 is preserved. Workspace-local Node 24.21.0 and pnpm 12.4.2 execute the project. The global pnpm shim failed during the final inventory; it is not the supported entry point. Use `scripts/dev.ps1`.

Git read/fetch and the authorized local Docker operations succeeded with normal sandbox approvals. Public registry metadata and exact dependencies/images were downloaded during setup. No spending, deployment, permissions change, real customer record, production secret, live SMS/email or model/vendor runtime service was used. Advisory audit was NOT_RUN: automatic approval review rejected transmission of the private lockfile's dependency metadata to the public advisory service. It was not retried through another route.

No meeting deadline or R0 timestamp was supplied. The 36-hour budget was not restarted. Actual command timestamps are in evidence; absence of a deadline is not an acceptance waiver.

## Executed foundation

PostgreSQL 17.11, OPA 1.20.2 and Temporal CLI 1.9.1 / Server 1.32.0 were observed running, with digest-pinned images. Drizzle wrote a synthetic probe row; SQL read it back. A real Temporal worker executed a unique probe; the row, workflow result and five history events survived PostgreSQL/Temporal container restarts. OPA returned true for the exact readiness input and false for an arbitrary-operation negative control. Built Next liveness/page requests succeeded; the unimplemented overview endpoint returned 404. Raw failures and successful reruns are retained.

Docker Desktop does not publish internal-only network ports. The implemented fixed Node relay exposes three loopback ports and connects only to literal Compose service names. PostgreSQL, OPA and Temporal have only the internal network. This is local plumbing within ADR-001's stack, not a second backend. The relay has an external-capable bridge to support host access; it is not an independently verified egress firewall. Runtime traffic qualification remains A06. The earlier empty `orvia-codex-a00_temporal_data` volume is retained unused after correcting Temporal's unprivileged mount path; no unrelated volume was removed.

The only database tables are bootstrap profile identity, migration ledger and probe rows. The migration credential is local-operator-only; no application server uses it. A01 must create separate least-privilege auth/business roles and RLS before application access. Temporal is a persistent single-node development server, not qualified production deployment. A00's workflow is explicitly an infrastructure probe, not an in-memory substitute or a consent workflow.

See `local-development.md`, `executable-contract-proposal.md`, `dependency-selection.md` and `handoffs/codex/A00-e5cdef3.md` for reproducible commands, contract boundaries and the exact review request.
