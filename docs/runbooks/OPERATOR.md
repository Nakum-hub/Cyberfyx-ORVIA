# ORVIA prototype: operator runbook

**Owner:** Cowork (C01) · **Status:** PARTIAL (A00 commands supplied; later commands missing) · **Revision:** c01-r2, 16 Sep 2026 IST · **Documentation base:** `e839b1a`

## History

Revision c01-r1 was written against `96b8bd7`. That base had no engineering instructions, so every command slot was `MISSING`. This revision adds the commands the Codex A00 handoff supplies.

## Source of every command

Every command below is copied **exactly** from `docs/engineering/A00-LOCAL-DEVELOPMENT.md` at `e839b1a` (Codex, A00). **Cowork did not run any of them.**

Codex reports running them in its own `codex-a00` profile. The raw artifacts are indexed in `docs/demo/EVIDENCE_INDEX.json` → `engineering_reports`. Cowork only checked those artifacts for presence and matching exit codes, and 14 of the 51 reported runs exited non-zero before later successful reruns.

**Not verified for this runbook:**
- No command has been run by the human in the `rehearsal` profile.
- No command has been run on the frozen candidate.
- There is no frozen candidate yet.

Commands not yet supplied by engineering are marked `MISSING`, with the task expected to supply them. **Do not fill a `MISSING` slot with a plausible-looking command.**

## Status values

| Status | Meaning |
|---|---|
| `MISSING` | No engineering source exists. |
| `SUPPLIED` | Copied from a named engineering handoff; not run by the human in the named profile. The note says whether engineering reports its own run. |
| `VERIFIED` | Run by the human in the named profile, with the transcript and exit code indexed in `docs/demo/EVIDENCE_INDEX.json`. No command is `VERIFIED` yet. |

## Task attribution

`tracking/tasks.json` at `e839b1a` assigns:

| Task | Work |
|---|---|
| A00 | Scaffold, preflight and start; bootstrap reset |
| A01 | Auth, bootstrap and persistence |
| A06 | Regression, recovery, security and egress |
| A07 | Packaged candidate with clean-start, bootstrap, seed and reset commands |
| B00–B06 | UI (Claude Code) |

## Safety rules (apply to every section)

1. **Synthetic data only.** Use the named synthetic profile and synthetic data. Never point a procedure at a real customer store, log or credential.
2. **Human approval first.** Installation, Docker operations, reset, restore, worker interruption, fault injection, permission changes and any deployment need explicit human approval. The fact that this runbook describes them is **not** approval.
3. **Credentials stay local.** A00 generates them in the ignored `.local/profiles/<name>/`. Never print, commit or share them. Never paste them into chat, a handoff or this runbook.
4. **Export before reset.** Before any reset, export the current evidence and record the export's location in the evidence index.
5. **Run from the candidate.** Rehearsal and demonstration run from the recorded frozen candidate only. A newly built, untested candidate is never substituted.
6. **No public exposure.** A00 binds host listeners to 127.0.0.1. Do not add public ports, tunnels or website embedding (EXECUTION_PLAN §4).
7. **Isolated lane profiles.** Each lane uses its own profile. Never run `services:smoke` concurrently with another lane on the same profile, and never reset another lane's profile.
8. **No destructive shortcuts.** No `down -v`, arbitrary SQL or arbitrary shell reset. A00 exposes none.

## Command record format

| Field | Meaning |
|---|---|
| Source | Handoff path and commit |
| Working directory | Where the command runs |
| Profile | Named profile |
| Prerequisites | What must already be in place |
| Command | Exact text, copied |
| Expected effect | Engineering's description |
| Evidence status | `MISSING` / `SUPPLIED` / `VERIFIED` (evidence ID) |

---

## 1. Prerequisites

**Source:** `docs/engineering/A00-LOCAL-DEVELOPMENT.md` and `docs/engineering/REPOSITORY_INVENTORY.md` @ `e839b1a`.

| Item | Engineering statement | Status |
|---|---|---|
| Operating environment | Run from the repository root in **PowerShell**. Docker Desktop must already be available and approved. | SUPPLIED |
| Toolchain | Use the workspace toolchain, not the machine's pnpm shim. Codex records workspace-local Node 24.21.0 and pnpm 12.4.2, with `infrastructure/toolchain.lock.json` pinning. | SUPPLIED |
| Services | PostgreSQL 17.11, OPA 1.20.2 and Temporal CLI 1.9.1 / Server 1.32.0, with digest-pinned images (Codex observation on its machine) | SUPPLIED |
| Machine seen by Codex | Windows 11, i5-1235U, about 7.7 GiB RAM (about 698 MiB free at one instant) | Point-in-time observation; not a qualification of the demo machine |
| TLS on exposed application paths | Not yet implemented | MISSING (A07) |
| Browser for Playwright | Claude Code lane | MISSING (B00) |

## 2. Named profiles

**Source:** A00-LOCAL-DEVELOPMENT.md. All host listeners bind 127.0.0.1.

| Profile | Compose project / Temporal namespace | App | PostgreSQL | OPA | Temporal | Database | Status |
|---|---|---|---|---|---|---|---|
| `codex-a00` | orvia-codex-a00 | 4310 | 55431 | 58181 | 57233 | orvia_codex_a00 | SUPPLIED; Codex-reported runs |
| `ui-b00` | orvia-ui-b00 | 4320 | 55432 | 58182 | 57234 | orvia_ui_b00 | SUPPLIED; not started (engineering statement) |
| `rehearsal` | orvia-rehearsal | 4330 | 55433 | 58183 | 57235 | orvia_rehearsal | SUPPLIED; not started (engineering statement) |

- **Selecting a profile.** The default is `codex-a00`. Engineering instruction: set `$env:ORVIA_PROFILE='<name>'` in the worktree before initializing or starting that profile. For the demo, use `rehearsal`.
- **Artifacts.** Evidence goes under the current worktree's `handoffs/codex/artifacts/`, with unique names. The UI lane keeps its own artifact directory.

## 3. Obtain the candidate

| Step | Command | Status |
|---|---|---|
| Frozen candidate commit and build manifest | MISSING | MISSING (A07). No candidate is identified. |
| Development checksum or signature check | MISSING | MISSING (A07). Development-only if provided. |

For inspection only, Cowork cloned the public repository in its own container: `git clone https://github.com/Nakum-hub/Cyberfyx-ORVIA.git`, followed by `git fetch origin`. That is not an ORVIA operation.

## 4. Install and start

**Working directory:** repository root. **Shell:** PowerShell. **Profile:** as selected in §2.

| # | Command | Expected effect (engineering) | Status |
|---|---|---|---|
| 4.1 | `.\scripts\bootstrap-tools.ps1` | Prepares the pinned workspace toolchain | SUPPLIED |
| 4.2 | `node scripts/record.mjs install --frozen-lockfile` | Locked dependency install, recorded | SUPPLIED; Codex-reported (earlier failures retained) |
| 4.3 | `node scripts/record.mjs profile:init codex-a00` (use the selected profile name) | One-time; generates local credentials; refuses to replace an existing or partial profile | SUPPLIED |
| 4.4 | `node scripts/record.mjs services pull` | Pulls pinned images | SUPPLIED; Codex-reported |
| 4.5 | `node scripts/record.mjs services up` | Starts containers. **Does not prove readiness.** | SUPPLIED; Codex-reported |
| 4.6 | `node scripts/record.mjs db:migrate` | Applies the checksum-protected bootstrap migration; safe to rerun | SUPPLIED; Codex-reported (earlier failures retained) |
| 4.7 | `node scripts/record.mjs preflight` | Verifies protocol readiness of the services | SUPPLIED; Codex-reported |
| 4.8 | `.\scripts\dev.ps1 start` | Starts the local development application | SUPPLIED; no separate run record indexed |

**What A00 does not start.** The A00 application has only `/` and `/healthz`. There is no staff or principal authentication, no business API, no restricted agent and no demo workflow at `e839b1a`. Their start commands are MISSING (A01–A05, A07).

## 5. Protected bootstrap and sign-in

| Step | Command or action | Status |
|---|---|---|
| Create the organisation and a unique local owner | MISSING | MISSING (A01). A00 has no staff or principal login. |
| Enrol MFA for privileged staff | Proposed route `POST /api/auth/staff/two-factor/enable` (0.2.0, pending W00); not implemented | MISSING (A01/B01) |
| Open the workspace | App port from §2 (for example `http://127.0.0.1:4330/` for `rehearsal`). At `e839b1a` this shows only the foundation page. | SUPPLIED (port); workspace MISSING (B00+) |
| Open the Privacy Centre | Not implemented | MISSING (B02) |

**Browser profiles.** Use separate browser profiles for staff and principal sessions. The 0.2.0 proposal returns 403 when both sessions are active in one browser (F-026).

## 6. Approved seed data

| Step | Command | Status |
|---|---|---|
| Seed `aster-birch-v1` (Aster/Birch organisations, staff, principals, purposes, systems, queued attempts; DEMO_SCRIPT §1) | MISSING. The name is frozen by A00, but no business seeder exists. The only A00 fixture is `bootstrap-probe-v1`. | MISSING (A01/A02, A07) |
| Confirm the seed guard rejects non-demo databases | MISSING | MISSING (A06, T28) |

## 7. Health checks

| Check | Command or URL | Expected effect (engineering) | Status |
|---|---|---|---|
| Liveness | `GET /healthz` on the profile's app port | `{"status":"alive"}`; no database details | SUPPLIED; Codex-reported via `web:smoke` |
| Readiness | `node scripts/record.mjs preflight` | Protected local operator preflight; not a public endpoint | SUPPLIED; Codex-reported |
| Service status | `node scripts/record.mjs services status` | Container status | SUPPLIED |
| Engineering checks | `node scripts/record.mjs contracts:check`, `typecheck`, `lint`, `test`, `tracking:check`, `hygiene:check` | Contract drift and code checks. **Not application acceptance.** | SUPPLIED; Codex-reported |
| Persistence smoke | `node scripts/record.mjs services:smoke` | Inserts a random synthetic probe, runs a real Temporal worker, restarts this profile's PostgreSQL/Temporal containers and checks persistence. Do not run it concurrently with another lane on the same profile. | SUPPLIED; Codex-reported |
| Build and web smoke | `node scripts/record.mjs build`, then `node scripts/record.mjs web:smoke` | Next build; liveness, page and 404 checks | SUPPLIED; Codex-reported (earlier build failure retained) |
| Build identity on screen | Overview build panel | Equals the build manifest | MISSING (A07/B03) |
| Target checks | W-SYSTEMS → Run check | Each synthetic system reachable, with its declared capabilities | MISSING (A03/B01) |

## 8. Rehearsal procedure

1. Record the candidate commit, build ID, `rehearsal` profile and start time (IST) in the rehearsal log.
2. Confirm the §7 health checks.
3. Run `docs/prototype/DEMO_SCRIPT.md` steps 1–12 in order. Note any deviation with its time and screen.
4. Export evidence (§9).
5. Record the end time and any issues. Index the log in `EVIDENCE_INDEX.json` → `rehearsals`.
6. Repeat from the documented starting state. **T30 needs two rehearsals on the same candidate.**

**Current state:** no rehearsal has taken place; none is possible at `e839b1a`.

## 9. Evidence export

| Step | Action | Status |
|---|---|---|
| Export a workflow's evidence | W-EVIDENCE → Download evidence (JSON) | MISSING (A05/B03) |
| Where engineering command records go | `handoffs/codex/artifacts/` in the running worktree, written by `scripts/record.mjs` with command, times, exit code, base commit and source hashes | SUPPLIED |
| Export acceptance results | MISSING | MISSING (A06/B04) |

## 10. Fault and recovery procedures

These run only in the private synthetic profile, with human approval.

| Procedure | Command | Test | Status |
|---|---|---|---|
| Set simulator fault mode (`HEALTHY` / `UNAVAILABLE` / `APPLY_THEN_TIMEOUT` / `ACK_WITHOUT_EFFECT`) | MISSING | T17–T19 | MISSING (A05/A06) |
| Run the broken-control scenario | Proposed Test Lab scenario `MARKETING_WITHDRAWAL_BROKEN_CONTROL` (0.2.0); not implemented | T24 | MISSING (A06/B04) |
| Stop and restart the worker after acceptance | MISSING. A00's `services:smoke` restarts PostgreSQL/Temporal for a probe only. | T11 | MISSING (A06) |
| Target-only snapshot restore into quarantine | MISSING | T25 | MISSING (A06) |
| Block outbound internet and capture traffic | MISSING. A00 notes its relay has an external-capable bridge and is not an egress firewall. | T26 | MISSING (A06/A07) |

## 11. Reset

| Step | Command | Expected effect (engineering) | Status |
|---|---|---|---|
| Export evidence first | §9 | Export recorded | MISSING (application export) |
| Bootstrap-only reset (A00) | `node scripts/record.mjs reset:bootstrap codex-a00 codex-a00-bootstrap-only`. Other profiles use the documented name `<profile>-bootstrap-only`. | Requires the exact profile, confirmation, the local operator credential, matching installation/database identity, no running Temporal workflows, and only the three bootstrap tables. Saves an intent artifact, deletes only probe rows, and keeps the migration/profile identity and Temporal history. Refuses business tables. | SUPPLIED; Codex-reported for `codex-a00` |
| Full synthetic application reset | MISSING | Named namespace, confirmation, authority, no live jobs; refuses non-demo targets | MISSING (A06/A07, T28) |
| Re-seed | §6 | Fixtures restored | MISSING |

## 12. Shutdown

| Step | Command | Status |
|---|---|---|
| Stop services, keeping volumes | `node scripts/record.mjs services stop` | SUPPLIED |
| Stop the full application, worker and agent | MISSING | MISSING (A07) |

## 13. Troubleshooting

The first two rows are engineering-supplied observations; the rest explain what the interface states mean and do not fix anything.

| You see | What it means | What to do |
|---|---|---|
| The global `pnpm` fails | Engineering reports that the machine's pnpm shim is not the supported entry point | Use `scripts/dev.ps1` and the workspace toolchain (SUPPLIED) |
| `services up` succeeded but the app can't reach a service | Starting containers is not readiness | Run `preflight` (SUPPLIED) |
| "Build ID not available" | The server did not supply the build identity | Stop claim-bearing demo steps and report to Codex (F-011) |
| "Outcome unknown" | The effect may or may not have happened | Use Reconcile. Never resend manually. |
| "Your last request is unconfirmed" | A write timed out | Use **Retry the same request** or **Check my current choice**. Never start a new request first (F-024). |
| "Failed" repeatedly, then "Retries stopped" | Bounded retries are exhausted | Check target health (§7). The owner follows up. Do not reset during a demo. |
| "Manual action required" | The system has no supported API | The assignee records a manual statement. It stays labelled as a statement. |
| "Cannot be observed" | No permitted read method | Expected for the legacy ledger. For the CRM, check whether the read permission was removed. |
| Counts show "Not available" | The overview request failed | Retry. Never read it as zero. |

Logs must not contain secrets or raw personal identifiers (T27). Application-level diagnostics are MISSING (A07).

## 14. Engineering inputs still needed

| Needed | Owner | Unblocks |
|---|---|---|
| Work's acceptance of A00 and contract 0.2.0 | Work | Treating §4 and §7 as the accepted base |
| A01 bootstrap CLI, auth, MFA enrolment, secret handling for application roles | Codex | §5 |
| `aster-birch-v1` business seeder and seed guard | Codex | §6 |
| A06 fault, recovery, restore, egress and full reset procedures | Codex | §10, §11 |
| A07 packaged candidate, build manifest, clean-start, application start/stop | Codex | §3, §4, §12 |
| B00–B06 UI routes and browser-profile notes | Claude Code | §5, §7, §9 |
| Rehearsal logs and approvals in the `rehearsal` profile | Human | §8 and any `VERIFIED` status |
