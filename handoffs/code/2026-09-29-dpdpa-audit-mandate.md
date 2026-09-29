# Handoff — DPDPA-AUDIT-MANDATE (revision 1.6 addendum) — Claude Code — `claude/upbeat-newton-w4h53x`

**Base commit:** `dece9a2` (end of the revision 1.5 work, handoff `handoffs/code/2026-09-29-dpdpa-audit-exchange.md`)
**New commits:** `7b65ab8` … this handoff commit (all pushed to `claude/upbeat-newton-w4h53x`; nothing merged)
**Owner decisions (2026-09-29):** `docs/engineering/V1_BASELINE_REV_1_6_AUDIT_MANDATE.md`; `AGENTS.md` cites it.
- Adopt the audit mandate model.
- Automatic fulfilment only for personal-data-free evidence.
- Continuous assurance under a separate mandate.
- The portal is the single staff login.
- The file fallback is kept.

**Pending outside engineering:** legal review of the engagement letter and DPA before a real engagement uses the channel.
**Contract:** customer 0.42.0 → **0.43.0** (8 routes); vendor-internal 0.1.0 → **0.2.0**; new protocol module `shared/contracts/src/audit-channel.ts`.

## Why this changed

Under revision 1.5 the client chose, assembled and released every piece of evidence. That evidence is the weakest kind an auditor can rely on, and it made the audit wait on the client. Under revision 1.6 the client authorises once. From then on:
- ORVIA generates the evidence from its own records.
- The client installation signs it.
- It is delivered on schedule and on the auditor's signed request, over an outbound-only channel to one address.

The vendor still never connects to, signs in to or reads a client installation.

## Delivered

**Protocol (`shared/contracts/src/audit-channel.ts`).**
- Channel key derived from the engagement code (HMAC).
- Timestamped HMAC request signature.
- Ed25519 installation evidence key (a mandate and each delivery are signed with it).
- Vendor-signed instructions, requests and receipts.
- Deterministic sampling seeded by the auditor's request.
- Address rule: HTTPS, or plain HTTP only to loopback.

**Client (customer migration `0068`).**
- **Mandates:** draft, then dual approval, then suspend, resume, revoke or end; closing the engagement ends its mandate. The separation-of-duties rules sit in definer functions.
- **Key custody:** the channel key is readable only by the worker. The installation evidence key is created and used only by the worker, with its private half sealed.
- **Deliveries** are immutable once signed.
- **Auditor requests** are recorded with their decision; a person answers documents with a sealed package or declines them.
- **Package submissions** over the channel.
- **Worker access:** capability `audit_evidence.collect`. The worker reads evidence sources only while an active mandate exists (`app.mandate_collector()`), and never reads file content.
- **Code:** `backend/domain/src/dpdpa-audit/evidence.ts` (generation), `channel.ts` (the worker sweep, wired into `services/worker/src/operations-runner.ts`) and `mandate.ts` (staff actions).
- **Trust file:** `scripts/credentials.ts` accepts `audit_service.url` in the trust file and exports it only from there.
- **Vendor visibility** lists every mandate, delivery and channel submission. It no longer says the installation contacts nothing when an address is configured.

**Vendor (vendor migration `0006`).**
- Channels (key sealed under the vault key, pinned installation key, chain position), mandates as received, requests signed at issue, deliveries with receipts, events for health and rate limits (120 per 10 minutes per engagement).
- Packages received over the channel go through the same verification as uploads (`receivePackageForDigest`).
- **Chain:** a gap is accepted but marked broken for good.
- **Report:** unanswered or declined requests past their due date become report limitations.
- **Checklist:** counts mandate evidence per requirement.
- **Leadership:** `vendor.overview()` gives super administrators and administrators counts only, including what needs attention.
- **Code:** `backend/vendor/audit/channel.ts`; routes in `backend/api/src/vendor/routes.ts` (the channel takes no session and is authenticated by HMAC).

**Screens.**
- **Client** `/workspace/dpdpa-audit`: a mandate and channel panel with drafting, approval, state changes, requests (send a package or decline), and what ORVIA sent.
- **Client** `/workspace/vendor-visibility`: audit evidence section.
- **Vendor engagement page:** mandate as signed, health and chain, issue and withdraw requests, evidence timeline with signed entries.
- **Vendor** `/vendor`: leadership overview.

**Installer.** It prints the audit address from the trust file, or states that there is none. `docs/engineering/linux-installer.md` is updated.

## Commands actually executed (codex-a00 and vendor-a00, synthetic data)

| Command | Exit | Result | Artifact |
|---|---|---|---|
| `pnpm run typecheck` / `lint` / `contracts:generate` | 0 / 0 / 0 | clean; 442 route examples; contract 0.43.0 | `shared/contracts/generated/*` |
| `pnpm test` | 0 | 293/293 (includes the 9 new channel tests); credentials tests 7/7 after the trust-file test was added | — |
| `pnpm run db:migrate` (codex-a00) | 0 | `0068_audit_mandate_channel` applied | `A00-migration-*` |
| `pnpm run vendor:init confirm:vendor-a00` | 0 | `0006_audit_channel` applied | — |
| `tests/integration/expansion/audit-mandate.test.ts` | 0 | **64/64** | `DPDP-operations-audit-mandate-1790666116876-…json` |
| `tests/e2e/audit-mandate-local.ts` (Chromium) | 0 | **14/14**. The worker calls vendor-a00 over HTTP. The codex-a00 trust file is extended for the run and restored afterwards. | `DPDP-operations-audit-mandate-browser-1790666237951-…json`, `output/playwright/mandate-*.png` |
| `tests/integration/vendor/vendor-audit.test.ts` | 0 | 68/68 | — |
| `tests/integration/expansion/dpdpa-audit.test.ts` | 0 | 52/52 | — |
| `tests/integration/expansion/delivery.test.ts` / `grc-lifecycle.test.ts` | 0 / 0 | 41/41, 75/75 | — |
| `tests/integration/monitoring/vendor-visibility.test.ts` | 1, then 0 | The first run failed on the field list (`audit_packages` was missing, left over from the rev 1.5 change); fixed. Rerun: 18/18. | `A00-vendor-visibility-integration-1790665341783-…json` |
| `tests/e2e/dpdpa-audit-local.ts` | 1, then 0 | The first run failed on a non-waiting `isVisible` for the shared-session heading; changed to wait. Rerun: 13/13. | `DPDP-operations-dpdpa-audit-browser-1790666437132-…json` |
| `tests/e2e/expansion-screens-local.ts` | 0 | 69/69 | `DPDP-operations-expansion-screens-browser-1790666386356-…json` |

| `pnpm run test:operations` | 1 | 11 of 13 suites PASS. `regulatory` and `breach` failed only because I ran them without the release keys, which both need to sign test packages. | `A00-operations-*` |
| `scripts/run-signed-suite.sh` for `regulatory` / `breach` | 0 / 0 | 32/32, 19/19 | `A00-operations-regulatory-*`, `A00-operations-breach-*` |
| `pnpm run test:auth` | 1, 1, then 0 | The first two runs hit HTTP 429 on sign-in. The limit is 10 per minute from one address, and the runs came right after other suites signed in the same users. After a 90-second pause: 88/88. | `A00-auth-security-1790667*.json` |

**Defects the new tests found (all fixed before commit):**
- Revoking a draft mandate violated a table check. This also broke closing an engagement that had a draft.
- A second mandate in force gave a generic `already_exists` instead of a clear reason.
- A sample request carrying a seed on a non-sample kind was accepted.
- My own process error: one commit (`b8197f5`) went in while the typecheck was failing, because a pipe hid the exit code. It was fixed in the next commit (`0aa1a87`), and exit codes have been checked directly since.

**Development database note.** 0068 was amended twice after it had been applied to codex-a00 (the constraint and the approval function). This branch is unmerged and 0068 exists nowhere else. The dev ledger checksum was realigned, as was done for 0067. Any other database gets the final file.

## Acceptance

Acceptance stays **NOT_RUN**; nothing is promoted.

**Denial and failure cases executed:**
- The preparer approves their own mandate; an auditor drafts, approves or decides.
- Out-of-scope mandate; an engagement mandate beyond 120 days; a second mandate in force.
- Wrong channel key, unknown engagement, stale timestamp, session cookie on the channel.
- Replayed delivery (original receipt, stored once); delivery signed by another installation key; delivery outside the mandate (signed refusal).
- A lost response (UNKNOWN, resent, settled by the original receipt); an answer signed by an untrusted key (ignored, shown as a problem).
- A chain gap (accepted, marked broken).
- Suspension (no requests delivered, no further calls); closure (ended at the vendor, later deliveries refused).
- Staff reading channel keys or the evidence key, or changing mandates or deliveries directly.
- An auditor outside the team issuing requests; an auditor reading the leadership overview.

## Not run / remaining limits

1. **The channel over real TLS to a separately hosted vendor.** Every run used loopback HTTP; the vendor installation still needs its TLS reverse proxy (see the rev 1.5 handoff).
2. **Multi-day operation under the supervisor.** Suspension and closure were exercised in tests, not in a supervised process across days.
3. **Firefox, WebKit, systemd and reboot survival:** unchanged from rev 1.5, NOT_RUN.
4. **Regulatory criteria remain TEST_FIXTURE; the audit key remains a development fixture.** The rev 1.5 limits 1–4 still apply.
5. **The client audit event table is not hash-chained.** The chain covers deliveries only. This is stated in the addendum and in each delivery's limits.
6. **Website.** The public website is not built. Its "Vendor / Auditor login" must link to `https://<vendor-domain>/vendor/sign-in` (portal-as-login decision); no separate website credential store exists or should be created.
7. **Continuous assurance** is supported as a mandate kind. Pricing, and a vendor workflow separate from engagements, are not built.

## Next integration action

1. Codex reviews `7b65ab8..HEAD` on `claude/upbeat-newton-w4h53x`.
2. On the integration branch, rerun: `pnpm test`, the expansion suites including `audit-mandate`, the vendor suite, `test:auth`, `test:operations`, and all three browser journeys.
3. Human approval is needed to merge, to host the vendor installation behind TLS, and to complete the legal review before a real mandate.
