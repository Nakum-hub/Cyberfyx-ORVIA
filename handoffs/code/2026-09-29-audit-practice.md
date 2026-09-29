# Handoff — AUDIT-PRACTICE-01 — Claude Code — `claude/upbeat-newton-w4h53x`

**Base commit:** `0794f7e`, which merged origin/main `2247dd8` into the revision 1.6 work.

**New commits:** `4acb8ba` … the commit adding this handoff. All are pushed to `claude/upbeat-newton-w4h53x`; nothing is merged.

**Source master:** revision 1.4, plus the revision 1.5 and 1.6 addenda. The legal review of the engagement letter and DPA is still pending.

**Contracts:**
- customer 0.43.0 → **0.44.0** (additive);
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

Regression battery on `4ba57fd` (serial, clean tree): see **Regression battery** below.

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
2. **Revocation or end with queued items** is implemented but not driven by a test.
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
