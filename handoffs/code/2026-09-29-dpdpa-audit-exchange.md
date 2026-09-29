# Handoff — DPDPA-AUDIT-EXCHANGE (revision 1.5 addendum) — Claude Code — `claude/upbeat-newton-w4h53x`

**Base commit:** `f34900d` (DPDP conformance map)
**New commits:** `153c040` … `309e814` and this handoff commit (all pushed to `claude/upbeat-newton-w4h53x`; nothing merged)
**Source master:** `ORVIA_V1_Unified_Master_Rev_1_4_…` unchanged. Owner decision recorded as `docs/engineering/V1_BASELINE_REV_1_5_AUDIT_EXCHANGE.md`; `AGENTS.md` cites it.
**Contract version:** customer 0.41.0 → **0.42.0**; vendor-internal `VENDOR_AUDIT_CONTRACT_VERSION` 0.1.0 (new)
**Scope and profile:** codex-a00 (CUSTOMER_INSTALLATION, 4310); vendor-a00 (VENDOR_SERVICE, 4340, own database `orvia_vendor_a00` on the codex-a00 server in development); rehearsal (fresh customer install test, 4330)

## Delivered

**Baseline.** Rev 1.5 addendum, stated in the doc above:
- the company is a DPDPA auditor first, vendor second;
- DPDPA only;
- the single permitted exception: a client-approved, personal-data-free, sealed evidence package carried out as a file;
- the vendor never pulls data and never accesses a client installation.

**Installation kinds.**
- Recorded as a protected `installation.json` plus an immutable database record: customer migration `0065`, and `vendor.installation_identity` on the vendor side.
- `backend/api/src/installation.ts` (`onlyOn`, `verifiedKind`) wraps every route file.
- Server layouts gate `/workspace`, `/privacy`, `/setup` and `/supplier` to the customer kind, and `/vendor` to the vendor kind.
- On the vendor installation, `/` redirects to `/vendor`.
- Readiness reports the kind and verifies it against the database record.

**Vendor installation (vendor database `0003`–`0005`).**
- **Identity.**
  - `vendor_auth` holds staff roles `VENDOR_SUPER_ADMIN`, `VENDOR_ADMIN`, `LEAD_AUDITOR`, `AUDITOR` and `AUDIT_REVIEWER`; `account_auth` holds client upload accounts.
  - MFA is mandatory for both.
  - Authorisation is checked three ways: local role map, OPA `backend/policy/vendor/authorization.rego`, then RLS as `orvia_vendor_app`.
- **First-run setup:** `vendor:setup-code` plus `/vendor/setup`.
- **Team:** managed with the typed-DELETE confirmation; an admin cannot create or delete a super admin.
- **Organisations:** Rev 1.4 §96 data only.
- **Licences:** issued from the tier catalogue with `issueLicence`.
- **Engagements:** one-time code, digest only; team; independence and conflict check; optional empanelment reference; processing agreement.
- **Evidence inbox:**
  - Each upload is verified (manifest fingerprint, per-item hash, size, type by bytes, expiry, engagement, scope, duplicate), passed through the structural malware screen, then sealed with AES-256-GCM using a key per package.
  - Packages with personal data are quarantined until a processing agreement is recorded.
  - Every view and download is logged.
  - Uploads are rate-limited to 10 per 10 minutes per account.
  - Refusals keep no content.
- **Review and findings:** per-item review; per-requirement results; requests; findings, which must cite provisions of their requirement; signed request and findings files.
- **Report:** drafted by the lead and approved by the engagement's reviewer, a different person (enforced by trigger). It is signed with the new audit key and issued as a deterministic PDF plus signed JSON that binds the PDF hash. Signed reports are immutable.
- **Other:** wording guard; retention purge with a record of each purge; support cases; payments placeholder.
- **UI:** the whole vendor area lives inside the same app and design system (`frontend/src/app/vendor/*`).

**Client installation (customer `0066`, `0067`).**
- **Screen:** `/workspace/dpdpa-audit`.
- **Gap register:**
  - applicability from recorded decisions (unresolved counts as a gap);
  - evidence expectations;
  - control standing through the imported DPDP framework;
  - aggregate indicators (`backend/domain/src/dpdpa-audit/indicators.ts`);
  - gap status, module summary and CSV export.
- **Evidence files:** 20 MB limit, type by magic bytes, SHA-256 computed on the server, and a personal-data flag confirmed by a different person.
- **Engagement:** recorded from the vendor's code.
- **Package:**
  - Screening blocks unconfirmed or UNKNOWN files and items outside scope; statements are redacted.
  - A personal-data exception needs a different approver.
  - Approval must come from someone other than the preparer, enforced in definer functions that `orvia_app` cannot bypass.
  - The package is then sealed; export produces exactly the approved bytes and is listed on vendor-visibility.
  - Revocation is relayed in the next package.
- **Imports:** signed files are imported only after verification with the audit public key in the trust file. A report requires its PDF, and findings become GRC issues (`EXTERNAL_AUDIT_FINDING`).

**Credentials.** Audit key kind: `.local/vendor/signing/audit.json`. Trust files now carry the audit public key; `customerEnvironment` exports `ORVIA_AUDIT_*`.

**Linux installer.** `installer/linux/orvia-install.sh` (both kinds, `--check`, `--resume`), systemd unit templates, `orvia-upgrade.sh` and `orvia-rollback.sh`. See `docs/engineering/linux-installer.md`.

**Docs.**
- `docs/engineering/dpdpa-audit-exchange.md`
- `docs/engineering/linux-installer.md`
- `docs/regulatory/DPDP_CONFORMANCE.md` (external audit section)
- `tracking/v1-expansion.json` (EX10, EX13, EX14 evidence and limits; acceptance still NOT_RUN)

## Commands actually executed

| Command | Exit | Result | Artifact |
|---|---|---|---|
| `pnpm run typecheck` / `pnpm run lint` | 0 / 0 | clean | — |
| `pnpm run contracts:generate` | 0 | 434 route examples validated; contract 0.42.0 | `shared/contracts/generated/*` |
| `pnpm test` | 0 | 284/284, including 13 new audit-exchange tests | — |
| `tsx tests/integration/vendor/vendor-audit.test.ts` | 0 | 68/68 | `handoffs/code/artifacts/vendor-audit-2026-09-29T02-36-40-562Z.json` |
| `scripts/run-signed-suite.sh tests/integration/expansion/dpdpa-audit.test.ts` | 0 | 52/52, including the round trip through an isolated vendor installation | `DPDP-operations-dpdpa-audit-1790646870965-…json` |
| `scripts/run-signed-suite.sh tests/e2e/dpdpa-audit-local.ts` | 0 | 13/13 in Chromium, both installations from one build. The first run also completed vendor first-run setup in the browser. | `DPDP-operations-dpdpa-audit-browser-1790647626243-…json`, screenshots `output/playwright/dpdpa-*.png` |
| Regression battery (sequential, codex-a00) | 0 | auth 88/88; first-run 23/23; first-run-http 7/7; DPDP operations 13/13 suites PASS; expansion classification 29, cmp 44, delivery 41, dpdpa-audit 52, grc-lifecycle 75, impact 41, preferences 39, response-packages 52, ropa-exports 58, staff-delete 27, staff-members 37, third-party 43 (all 0 failures); vendor 68/68; DPDPA browser 13/13 | `handoffs/code/artifacts/regression-battery-2026-09-29.txt` |
| `tests/e2e/expansion-screens-local.ts` | 1, then 0 | The first run failed only because the list now spans more than one page (31 transports, 25 per page); fixed in the test. Rerun: 69/69. | `DPDP-operations-expansion-screens-browser-1790649827843-…json` |
| `installer/linux/orvia-install.sh --check` | 0 | 0 missing, 2 warnings (Node 22 against the qualified 24.21.0; no systemd) | — |
| `installer/linux/orvia-install.sh --kind customer …` (fresh `rehearsal`), then `--resume` | 1, then 0 | Found and fixed two defects (see limitations). Then: HTTPS ready with kind verified; first-run setup 201; `/vendor/*` 404; machine enrollment after setup; restart with data retained; full supervisor start and clean `app:stop`. | `A00-application-lifecycle-1790650074366-…json` |
| `installer/linux/orvia-install.sh --kind vendor …` | 0 | existing vendor profile; setup code correctly refused after setup | — |

**Tests not run.**
- Firefox and WebKit: not installed; only Chromium is available.
- systemd enable, start on boot and reboot survival: no systemd in the container.
- RHEL-compatible host; Windows Server and macOS paths.
- Upgrade and rollback on a live installation.
- ClamAV signature scanning: not installed.
- Full V1 acceptance.

## Acceptance

Acceptance stays **NOT_RUN**; nothing is promoted.

Denial cases were executed, including:
- preparer approves their own package, or confirms their own personal-data flag;
- lead approves their own report; auditor manages the team; an admin opens evidence;
- tampered or expired packages, packages for the wrong engagement, packages using another organisation's code;
- forged or untrusted findings files; a report without its PDF, or with the wrong PDF;
- direct SQL by `orvia_app` against the definer functions;
- installation kind changed after setup;
- cross-kind 404s in both directions;
- upload rate limit.

## Contract / dependency / ownership changes

- **Contract 0.42.0 (customer):** 22 routes (`shared/contracts/src/dpdpa-audit.ts`).
- **Capabilities:** `audit_exchange.read`, `.prepare` and `.approve`, added to OPA admin policy and the role map.
- **`IssueSourceKind`** gains `EXTERNAL_AUDIT_FINDING` (not creatable manually).
- **`VendorVisibility`** gains `audit_packages`.
- **Profiles:** new profile `vendor-a00`; new `AUTH.vendor` and `AUTH.account`.
- **Migrations:** customer `0065`–`0067`, vendor `0003`–`0005`.
- **Shared scripts changed:** `scripts/credentials.ts`, `credentials-separate.ts` (audit key and `created` list) and `machine-init.ts` (no fixture needed). Coordinate with Codex (lane boundary).

## Remaining limitations and blockers

1. **Regulatory criteria are TEST_FIXTURE content.** Build and sign the official PRODUCTION package (hashed Government sources, legal review) before any real audit.
2. **The audit key is a development fixture.** Move it to vendor custody (offline or HSM) and rotate it before a real report is signed.
3. **Malware screening is structural.** Configure ClamAV with `ORVIA_CLAMSCAN` on the vendor host.
4. **Vendor TLS.** The vendor installation serves HTTP on loopback, so it needs a TLS reverse proxy hosted in India, with edge limits.
5. **Two defects found by the fresh install, both fixed in `309e814`:**
   - `machine:init` required the synthetic fixture journal;
   - the systemd app unit lacked `NODE_EXTRA_CA_CERTS`.

   `machine:init` still also provisions the synthetic target database (existing harness behaviour).
6. **Fixed profile names.** Installation profiles use them (`rehearsal`, `vendor-a00`), so one installation per host.
7. **Defect fixed today that predates this change:** `app.installation_setup` (0064, from the earlier session) lacked forced RLS. The auth suite caught it; fixed in 0067.
8. **Vendor website.** Account sign-up, subscriptions and installer downloads are not built; only the `/vendor/sign-in` link target is in scope. Payments remain a placeholder.

## Next integration action

1. Codex reviews `153c040..HEAD` on `claude/upbeat-newton-w4h53x`.
2. On the integration branch, rerun: `pnpm test`, `test:auth`, `test:operations`, all `tests/integration/expansion/*`, `tests/integration/vendor/vendor-audit.test.ts`, and both browser journeys.
3. Human approval is needed to merge, and later to replace the audit key and sign a PRODUCTION regulatory package.
