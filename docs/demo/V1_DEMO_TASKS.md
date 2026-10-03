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

### T2 Policy graph and every module show the data correctly  `[ ]`
- Check the privacy graph and control map with demo data, and that a manual import and the automatic intake land in
  the same modules. Extend `test:e2e:demo-data` with the graph and control-map assertions.

### T3 Tier-based access visible in the interface  `[ ]`
- Demo: two organisations on the rehearsal installation (Aster = ENTERPRISE, Birch = FOUNDATION), each with a licence
  issued by the vendor's licence tool, signed with the local key and imported through the Files page (`demo:tiers`).
- Check per tier: navigation shows locked modules, a locked route is refused by the server (403 entitlement), and
  protective controls stay available on every tier. Add assertions to the demo check.
- Out of scope (owner will do later): subscription prices, payment gateway.

### T4 Organisation roles and member management demo  `[ ]`
- Org super admin creates an admin and a member through the Team page (one-time password, first sign-in replaces
  it, MFA enrolment). Show what each role sees. Add demo staff to `demo:data` and the steps to the guide.

### T5 Vendor side: super admin and admin, records, creating members  `[ ]`
- Vendor owner and admin: organisations, licences, engagements, team. Create a member with a setup code. Check with
  Playwright, then add to the guide and the demo check.

### T6 Everything else important for the demo  `[ ]`
- Rerun the full interface crawl after T1 to T5; update `docs/demo/CEO_DEMO_V1.md`; push.

## Not in V1 demo scope (owner will finish after the demo)
Subscription amounts, payment gateway, real connectors, production go-live items in `docs/GO_LIVE.md`.
