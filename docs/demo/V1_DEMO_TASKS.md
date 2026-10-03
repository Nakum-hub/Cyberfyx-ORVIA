# V1 demo: task list (owner request 2026-10-03, evening)

This is the working list for the CEO demo. Anyone continuing (another Claude account or Codex) starts here. Branch:
`claude/upbeat-newton-w4h53x`. Rules: AGENTS.md (synthetic data only, no shortcuts, NOT_RUN stays NOT_RUN, push often).
Status: `[ ]` not started, `[~]` in progress, `[x]` done and verified (with the command that proved it).

## What already exists (verified this session; do not rebuild)

- **Files page** (`/workspace/files`, revision 1.12): manual upload or inbox folder; staged until a staff member approves.
  Routes LICENCE, RELEASE, REGULATORY_PACKAGE, DATA_ASSET_INVENTORY (JSON), ESTATE_ROWS (JSON existing-data rows ->
  Data Principals and consent history), and DOCUMENT. **CSV is only kept as a document**, so this is the gap for T1.
- **Tiers** (revision 1.11): FOUNDATION / CONTROL / ENTERPRISE, plus CUSTOM; server-side entitlement enforcement; locked
  badges and the "Your plan" page in the interface. Tests: `tests/integration/licensing/*`, `tiers.test`, all passing.
- **Team management**: org super admin and admin create members (one-time password, then own password and MFA)
  (`team-local` 8/8). Vendor members via admin-set password or one-time setup code (`dpdpa-audit-local` 24/24).
- **Demo tooling**: `npm run demo:data`, `test:e2e:demo-data` (42/42), `demo:accounts`, `demo:code`, `start:vendor`,
  `demo:remove`. Guide: `docs/demo/CEO_DEMO_V1.md`.

## Tasks

### T1 Import button and automatic organisation of imported files  `[x]` (npm run test:e2e:demo-import 12/12; unit file-intake 6/6)
Owner ask: staff import files from their systems or data centre (instead of, or to cross-check, the automatic intake).
ORVIA reviews the file, organises it according to the DPDP Act into the right modules, and shows it there.
- T1.1 CSV recognition in file intake (`backend/domain/src/onboarding/file-intake.ts`), by header row:
  - **Customer consent export** (one row per consent event: `customer_reference, email, system, activity, decision,
    occurred_at, evidence`). Names are resolved to registered systems and activities, and rows are grouped per person
    into ESTATE_ROWS (Data Principals plus consent history). Rows that cannot be resolved are listed in the staged
    item's review before approval.
  - **Privacy requests export** (`customer_reference, email, name, right_type, description, received_at`). Routes to
    rights requests (channel RECORDED_MANUAL_INTAKE). Needs a new kind, `PRIVACY_REQUESTS`: contract bump and migration.
- T1.2 An **Import data** button in the Privacy Centre and on the Files page, with downloadable CSV templates.
- T1.3 Cross-check: imported consent for a person already known from the website appears on the same consent record's
  history (source FILE_IMPORT vs ORGANISATION_APP).
- T1.4 Tests: integration test of both CSVs (good rows, unresolvable rows, a real address refused), an e2e upload,
  approval and module check, and demo data CSVs under `fixtures/demo/`.

### T2 Policy graph and every module show the data correctly  `[x]` except the clean-installation item below
- Done 2026-10-03: `npm run demo:inventory` (also called by demo:data) adds the store's datasets, fields, backup copy,
  graph activities and relationships, so Data inventory, graph neighbourhood and change impact show data.
  `npm run demo:modules` fills organisation profile, DPDP framework/controls/risks, continuous compliance (3 tests run),
  DPIA template/DPIA/finding, processor assessment/finding, AI system, website consent site, preference topics,
  message template, retention constraint and legal hold, nominee and nomination mandate, derived gaps. Crawl of all
  70 workspace screens: the main list of each of these is no longer empty.
- **Open (needs the owner's go-ahead: it resets the rehearsal database):** the rehearsal database also holds leftovers
  from automated test suites ("Synthetic workflow …" on the control map, "Browser purpose …" in reports). For the CEO,
  build a clean installation: fresh rehearsal profile, `npm start`, `demo:data`, `demo:modules`, `demo:tier` x2, then
  the checks in the guide. Not done here because resetting a database needs the owner's authorisation.
- Still empty by design (would need faking): releases/updates, support cases, restores, catalog readings of a live
  database, guided connections, notifications sent.

### T3 Tier-based access visible in the interface  `[x]` (npm run demo:tier; npm run test:e2e:demo-tiers 13/13). Owner input: confirm Tier 2/3 options and seats (placeholders 25 and 100 in backend/vendor/plans/catalogue.ts)
- Demo: two organisations on the rehearsal installation (Aster = ENTERPRISE, Birch = FOUNDATION), each with a licence
  issued by the vendor's licence tool, signed with the local key and imported through the Files page (`demo:tiers`).
- Check per tier: navigation shows locked modules, a locked route is refused by the server (403 entitlement), and
  protective controls stay available on every tier. Add assertions to the demo check.
- Out of scope (owner will do later): subscription prices, payment gateway.

### T4 Organisation roles and member management demo  `[~]` guide written; fresh browser rerun NOT_RUN
- Guide steps 7 and 11 in `docs/demo/CEO_DEMO_V1.md` (Team → Add member → one-time password → I have handed it over →
  first sign-in replaces password → authenticator). Verified earlier today by `team-local` 8/8 (before the layout
  change). Not rerun after the desktop-fit layout: NOT_RUN. Next: rerun team-local; optionally add demo staff.

### T5 Vendor side: super admin and admin, records, creating members  `[~]` guide written; fresh browser rerun NOT_RUN
- Guide step 12 (Organisations → Add organisation / Create vendor account; Team → Add vendor member → setup code →
  /vendor/account-setup). Verified earlier today by `dpdpa-audit-local` 24/24 including the vendor team phase (before
  the layout change). Next: `npm run start:vendor`, rerun dpdpa-audit-local, screenshot vendor screens.

### T8 Reports export as readable PDF  `[x]` (npm run test:e2e:demo-report-pdf 13/13)
- "Save as PDF" button on Reports (browser print dialog; no server-side PDF by design). Chromium print-to-PDF of the
  board, regulator and full presets: A4, 21-22 pages, workspace hidden, report and data present. Files in
  output/playwright/demo-report-pdf/.

### T9 Synthetic demo files in GitHub  `[x]` (unit file-intake 7/7 checks them)
- `fixtures/demo/` (README lists each file and what ORVIA shows). Owner deletes after the V1 demo.

### T7 Desktop layout: fit the screen, scroll inside, tabs instead of long pages  `[x]` (demo-tiers 15/15 incl. 2 layout checks; demo-import 12/12; demo-data 38/38)
- Owner request 2026-10-03. On a desktop window the shell is viewport height; navigation and content scroll separately;
  every screen with 3+ sections gets a sticky "On this page" tab bar under its heading
  (`frontend/src/components/shared/section-tabs.tsx`, CSS "Desktop fit" block in `globals.css`); tables scroll inside
  themselves with a sticky header (max 60vh). Nothing is hidden, so existing browser suites keep reading page text.
- Not done: the full interface crawl (`UI1` crawl script) was not rerun on the new layout: NOT_RUN. Rerun it, and the
  other e2e suites that take full-page screenshots (they now capture only the visible pane).

### T6 Everything else important for the demo  `[~]` guide updated 2026-10-03 (import, tiers, roles, vendor, PDF, modules)
- Rerun the full interface crawl after T1 to T5; update `docs/demo/CEO_DEMO_V1.md`; push.

## Not in V1 demo scope (owner will finish after the demo)
Subscription amounts, payment gateway, real connectors, production go-live items in `docs/GO_LIVE.md`.
