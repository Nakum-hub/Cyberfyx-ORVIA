# Handoff — AUDIT-PRACTICE-01 — Claude Code — `claude/upbeat-newton-w4h53x`

**Base commit:** `0794f7e`, which merged origin/main `2247dd8` into the revision 1.6 work.

**New commits:** `4acb8ba` … the commit adding this handoff. All are pushed to `claude/upbeat-newton-w4h53x`; nothing is merged.

**Source master:** revision 1.4, plus the revision 1.5 and 1.6 addenda. The legal review of the engagement letter and DPA is still pending.

**Contracts:**
- customer 0.43.0 → 0.44.0 (additive) → 0.45.0 (Attention items 200 → 600) → **0.46.0** (management-response personal-data review);
- vendor-internal `vendor-audit.ts` 0.2.0 plus a new `vendor-practice.ts`;
- channel protocol additions (defaults keep older peers valid).

**Profiles:** codex-a00 (customer) and vendor-a00 (vendor), synthetic data only.

**Reconciliation matrix:** `docs/engineering/2026-09-29-audit-practice-reconciliation.md`.
**Channel semantics:** `docs/engineering/audit-channel-semantics.md`.

## Delivered

**Reconciliation fixes**

- **Vendor RLS converged** on fresh and upgraded databases: migration 0007 plus a runner invariant.
- **R01:** preference ordering.
- **R04:** credential separation paths.
- **Qualification inventory** refreshed.

**Legal**

- The Rule 13 empanelment statement is withdrawn as unverified (revision 1.5 note and `DPDP_CONFORMANCE.md`).
- UI labels and report text now read "eligibility reference, not verified by ORVIA".
- `docs/regulatory/LEGAL_SOURCE_STATUS.md` records that the official sources are BLOCKED_EXTERNAL (egress denied).

**Audit practice, vendor side**

- Schema:
  - vendor 0008: practice level, acceptance, planning, fieldwork, outcomes, holds;
  - vendor 0009: integrity rules, including a report constraint that made correcting a signed report impossible;
  - vendor 0010: channel documents with the report PDF.
- Service `backend/vendor/audit/practice.ts`, contract `shared/contracts/src/vendor-practice.ts`, and routes in `backend/api/src/vendor/routes.ts`.
- New capabilities in both the TS role map and `backend/policy/vendor/authorization.rego`: `practice.manage`, `practice.approve`, `practice.activate`, `engagement.accept`.
- Legacy routes now require the practice flow:
  - results, findings, requests and reports go through practice functions;
  - channel requests need an accepted engagement;
  - the legacy finding-event route accepts only `CLIENT_RESPONSE`.
- Signed findings and report documents carry optional practice fields: snapshot digest, criteria, coverage, marks, reliance, supersession.

**Channel round trip and revision 1.6 hardening**

- Customer migration 0069:
  - mandate lease;
  - staged channel documents with acknowledgement;
  - dual-approved finding responses.
- Worker (`backend/domain/src/dpdpa-audit/channel.ts`):
  - one worker per mandate through the lease;
  - the mandate is re-read before every generation and send;
  - documents are staged after verification;
  - approved responses are signed and sent;
  - `fetch` error causes are classified correctly.
- Vendor:
  - new `/channel/responses` endpoint;
  - documents offered at check-in and acknowledged.

**Screens**

- `/vendor/engagements/[id]` is now a nine-tab workspace.
- New page `/vendor/practice`.
- The client `/workspace/dpdpa-audit` shows channel documents (with import) and management responses (prepare, approve, withdraw).

**Tests and harnesses**

- New suites:
  - `tests/integration/vendor/audit-practice.test.ts`;
  - `tests/integration/vendor/schema-equivalence.test.ts`;
  - `tests/integration/vendor/practice-flow.ts` (shared flow helper).
- Updated:
  - `vendor-audit`, `dpdpa-audit`, `audit-mandate` (new phases);
  - both audit browser journeys;
  - `tests/unit/audit-channel.test.ts` (loopback transport);
  - `tests/integration/migration/upgrade.test.ts` (reads through a cursor).
- The vendor harness now drops its throwaway database.

## Commands actually executed (current source; exit codes checked directly)

| Command | Exit | Result | Artifact / notes |
|---|---|---|---|
| Vendor migrations on a fresh database (scratch `rls3.mts`) | 0 | 0001–0010 applied; 0 tables without forced RLS | throwaway database dropped |
| `ORVIA_PROFILE=vendor-a00 pnpm run vendor:init confirm:vendor-a00` | 0 | 0008, 0009, 0010 applied as upgrades | — |
| `ORVIA_PROFILE=codex-a00 pnpm run db:migrate` | 0 | 0069 applied | `A00-migration-*` |
| `tests/integration/vendor/audit-practice.test.ts` | 1 → 0 | **95/95** | `handoffs/code/artifacts/audit-practice-*.json`. Earlier runs failed on my own test mistakes (a wrong requirement ID, wrong paper selection, a scaffold line) and on one product defect (report supersession constraint, fixed in 0009). The failing artifacts are committed too. |
| `tests/integration/vendor/vendor-audit.test.ts` | 1 → 0 | **74/74** | One immutability check expected the old guard's message; both guards refuse. |
| `tests/integration/expansion/dpdpa-audit.test.ts` | 0 | **52/52** | `A00-operations-dpdpa-audit-*` |
| `tests/integration/expansion/audit-mandate.test.ts` | 0 | **85/85** | Fieldwork on channel evidence, findings out and response back, replay and forgery, lease, mid-cycle suspension, past-due request |
| `tests/e2e/dpdpa-audit-local.ts` (Chromium) | 1, 1 → 0 | **20/20** | `output/playwright/practice-*.png`. The first failures were test mistakes (a textarea still held the typed address; a non-waiting check). |
| `tests/e2e/audit-mandate-local.ts` (Chromium) | 1 → 0 | **19/19** | `mandate-client-responses.png`, `mandate-vendor-response.png`. The failure found a UI defect (the panel did not reload after an import), now fixed. |
| `tests/unit/audit-channel.test.ts` | 1 → 0 | 10/10 | The failure found the `error.cause` misclassification. |
| `tests/integration/migration/upgrade.test.ts` | 1 (×4) → 0 | **10/10** | Failures: OFFSET paging exceeded the 10 s query timeout; loopback exit cut Postgres host access (see Environment). |
| `tests/integration/vendor/schema-equivalence.test.ts` | 0 | **7/7** | — |
| `pnpm run typecheck` / `lint` / `contracts:generate` / `contracts:check` | 0 | Clean; 446 route examples; 0.44.0 | — |
| `pnpm test` | 0 | 331/331 | — |
| `pnpm run tracking:check`, `qualification-inventory.ts --check`, `v1-source-inventory.ts --check` | 0 | Pass | — |

## Regression battery and review fixes (after the table above)

Five serial batteries ran on the shared codex-a00 profile. Earlier failures stay recorded; nothing below is a rerun of a failure presented as a first pass.

**Product defects the batteries and the crawl found (all fixed):**

| Found by | Defect | Fix (commit) |
|---|---|---|
| operations/sdf | Attention accepted items up to 200 in query order; kinds read late (SDF, holds, imports) vanished silently on a busy installation | Per-kind caps ordered by urgency, stated when truncated; contract 0.45.0 raises items to 600 (`a73573f`); exact limit+1 truncation, all kinds named (`a4f7651`) |
| audit-mandate | An ended mandate returned before settling queued responses | Settled locally before any call (`8115330`, `a4f7651`) |
| e2e expansion | The Data Principal portal listed a person's own requests by random id, so a new request could be on any page | Newest first (`rights/portal.ts`, `362cd62`) |
| crawl | `/setup` rendered with no frame; on an installed system one notice on an empty page | `SetupShell` (`a82f14a`) |
| crawl | `/workspace/capabilities` overflowed 310 px at phone width | Code text wraps (`a4f7651`) |

**Codex review of `a82f14a` (`codex/review-audit-practice`, R1–R7), all fixed and verified:**

| Finding | Fix | Verified by |
|---|---|---|
| R1 HIGH responses bypass the personal-data rule | Approver records "no personal data" (customer 0070; contract 0.46.0 `FindingResponseApproval`; signed `approval.personal_data`); worker refuses unreviewed responses; UI checkbox | audit-mandate 95/95; e2e mandate 19/19 |
| R2 HIGH offered PDFs can block check-in | Answer budget; a document that can never fit is marked `TOO_LARGE_FOR_CHANNEL` (vendor 0012) and shown to the audit team | audit-mandate 95/95 (one-per-answer, too-large, not re-offered) |
| R3 truncation notes dropped | limit+1 queries; all truncated kinds named | sdf 22/22; operations 13/13 |
| R4 breach fixture depends on history | Fixture effective just after the latest package in force at awareness, one captured clock | breach 19/19; operations 13/13 |
| R5 lease without fencing | Holder-only renewal before every generation and send | audit-mandate 95/95 (lease taken mid-cycle) |
| R6 definer helpers unscoped | Vendor 0012: PUBLIC execute revoked from every vendor definer; helpers scoped to visible engagements; `review_barred` removed from the app role | audit-practice 99/99 (as `orvia_vendor_app`) |
| R7 inactive-mandate calls | Queue settled locally before any call | audit-mandate 95/95 (vendor refusing connections). The single state-only check-in stays pending an **owner decision** (revision 1.6 says no call when no mandate is active). |

**Final results on the current source (product code as of `d820898`; later commits through `dc46ad0` change tests and records only):**

| Suite | Result |
|---|---|
| vendor-audit | 74/74 |
| audit-practice | 99/99 |
| vendor schema-equivalence | 7/7 |
| expansion audit-mandate | 95/95 (first battery5 run failed 1 on a test mistake: the unreachable-vendor simulation still reached the vendor; fixed in the test) |
| expansion dpdpa-audit | 52/52 |
| operations (13 suites, incl. breach, sdf, runner) | all PASS |
| upgrade | 10/10, **with the loopback relay raised to 256 MB by `docker update` on this container only**; with the shipped 64 MB it was OOM-killed four times today under this suite |
| commerce | 116/116 |
| unit | 331/331 |
| e2e dpdpa-audit / audit-mandate / expansion screens | 20/20, 19/19, 69/69 |
| interface crawl (105 routes, 450 visits, both installations, all roles, desktop and phone, nine workspace tabs) | 460/460 checks, 0 pages with issues |
| typecheck, lint, contracts:check (0.46.0, 446 route examples) | clean |

**Final battery (battery7) on the complete merged branch** — `main` (including PR #31), every Codex branch (commerce rename to vendor 0011, tracking, Attention paging, relay 256 MB, both reviews and reports) and the second-review fixes (`7fe3054`: no send or resend without the personal-data review; requests budgeted; vendor 0013 offers only unacknowledged requests). Source `bd92f85`; the audit-mandate rerun includes the test-only fix `8b68c90`.

| Suite | Result |
|---|---|
| vendor-audit / audit-practice / schema-equivalence | 74/74, 99/99, 7/7 |
| commerce / migration-ledger (fresh and legacy-name upgrade) | 116/116, both PASS |
| audit-mandate | first run 80 checks, 1 failure (the backlog check expected exactly one check-in; a cycle that receives requests for approval reports them with a second check-in); after correcting the expectation: **98/98**, including the 250-request backlog (every answer readable, each request once) |
| dpdpa-audit / operations (13 suites) / upgrade | 52/52, all PASS, 10/10 with the relay at the shipped 256 MB |
| e2e dpdpa / mandate / expansion screens | 20/20, 19/19, 69/69 |
| interface crawl | 460/460 checks, 450 visits, 0 pages with issues |
| typecheck, lint, unit (334), contracts:check 0.46.0, tracking:check, qualification inventory | clean |

Earlier suites in batteries 1–2 that failed in setup (upgrade, commerce, vendor-visibility, e2e expansion) failed because the relay had been OOM-killed; they pass on rerun (vendor-visibility 18/18 in battery3).

The report PDF was checked by reading its text in order: the three marks, executive summary, engagement terms, coverage, results, finding detail with the advice-only label, opinion, limitations, reliance, independence and snapshot binding.

## Acceptance

Acceptance stays **NOT_RUN**; nothing is promoted.

Denial and failure cases executed are listed per requirement in the reconciliation matrix, sections A–H and revision 1.6.

## Contract, dependency and ownership changes

**Contract:** customer 0.44.0 adds four routes, and AuditChannel gains `documents` and `responses`.

**Migrations:** customer 0069; vendor 0007–0010.

**Development-database note.** 0069 was amended once after being applied to codex-a00, adding document acknowledgement. The ledger checksum there was realigned (as for 0067/0068). Any other database gets the final file.

**Lane:** the reservation at the top of `handoffs/codex/2026-09-25-active-lane.md`. Commerce and connectors were not touched.

**Environment actions:**
- Restarted the codex-a00 OPA container after the rego changed. It loads policies only at start.
- Restarted the codex-a00 Postgres and loopback containers.
- Dropped 41 leftover `orvia_vendor_test_*` databases and one `orvia_upgrade_*` database. All were throwaway test databases; no profile database was touched.

## Remaining limitations and blockers

1. **BLOCKED_EXTERNAL**:
   - official sources not retrieved (network policy);
   - legal review of the engagement letter and DPA;
   - production criteria (the signed regulatory package);
   - a production audit key;
   - real TLS hosting of the vendor installation;
   - installer qualification on real hosts.
2. **Loopback relay memory (Codex area, `infrastructure/compose.yaml`).** The relay idles at 45 MB under a 64 MB limit and was OOM-killed four times today, cutting the installation off from Postgres. Proposed: `mem_limit: 128m` or more, or cap Node's heap in its command. Not changed here; the upgrade result above used 256 MB on this container.
2a. **Owner decision (R7):** keep or remove the single state-only check-in after suspension, revocation or end.
2b. **Contract 0.46.0 and migrations customer 0070, vendor 0012** need Codex review. Vendor 0012 was numbered around the commerce lane's rename of its duplicate 0003 to 0011.
3. **Engagement-withdrawn closure** and a retest after a channel response were not exercised end to end in one suite.
4. **Redaction** covers e-mail, phone-like and PAN-format text only; names and other personal data are not detected.
5. **Continuous assurance** has no vendor workflow separate from engagements.
6. **UX:** action forms are always expanded; Firefox and WebKit NOT_RUN.
7. **Duplicate vendor migration prefix `0003`** (commerce vs vendor service) needs a coordinated rename with the commerce owner.
8. **Tracking:** `tracking/v1-expansion.json` has fixed families and no entry for the revision 1.5/1.6 audit work. It was left unchanged, as before.
9. **Environment:** codex-a00 Postgres is reachable from the host only while the loopback container runs. Stopping loopback removes the published port.

## Next integration action

1. Codex reviews `0794f7e..HEAD` on `claude/upbeat-newton-w4h53x`.
2. On the integration branch, rerun:
   - `pnpm test`;
   - the vendor suites (audit-practice, vendor-audit, schema-equivalence);
   - the expansion suites (including audit-mandate and dpdpa-audit);
   - migration upgrade, `test:auth` and `test:operations`;
   - the three browser journeys.
3. Human approval is needed to merge, to host the vendor installation, to complete the legal review and to record the activation gates.
