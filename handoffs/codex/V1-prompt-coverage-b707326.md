# Handoff — V1 pasted-prompt coverage — Codex — working tree

**Base and ending HEAD:** `b70732693768cdd1ee814faf830d2c1d63ced567`, branch `prototype/codex/A06-evidence-hardening`. Changes are uncommitted. This direct user request spans existing tickets; no task or acceptance status in `tracking/tasks.json` was changed.

**Source:** Revision 1.4 master, SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`. The untracked `ORVIA_V1_Agent_Build_Pack/` is a specification input, not implementation or test evidence. Historical revision 1.3 files did not override revision 1.4.

**Allowed files used:** Codex-owned UI, domain, contracts/generated artifacts, tests, README, `tracking/contract_seed.json` (Codex-owned after A00) and this lane's handoffs. Work-owned `CURRENT_STATE.md` and `tracking/capabilities.json` were left to Work for truthful consolidation.

## Pasted-prompt sections — actual status

| Section | Status at this working tree | Evidence / next action |
|---|---|---|
| 1 Repository state | DONE for this session | Branch, HEAD, recent merges, one worktree, tracked/untracked state inspected; no reset or clean. |
| 2 Source of truth | PARTIAL | Master and build-pack structure/selected requirement, design, data, contract, security, test and decision sections read. The pack is based on older commit `5a07649`; a complete paragraph-by-paragraph reconciliation is still required. |
| 3 Product position | GOVERNING, NOT DELIVERED | No model/runtime vendor-data path added. Current profile remains `CUSTOMER_LOCAL_SYNTHETIC`. |
| 4 Claude review | PARTIAL | Reviewed recent report/CSV and notification work against §133, FR-M08-03 and FR-M10-01–04; preserved scoped reports, audit, durable queue and truthful separate fact model. Other Claude areas require review. |
| 5 Engineering ownership | IN PROGRESS | M08/M10 corrections made; broad V1 backend, vendor plane and production package remain. |
| 6 Module review | REGISTER INSPECTED, NOT ACCEPTED | 26 non-model V1 modules: 22 `IMPLEMENTED_SANDBOX_SUBSET`, 3 `PARTIAL_SANDBOX` (M29/M32/M33), 1 `NOT_IMPLEMENTED` (M26). None is production-complete. M19–M25 remain deferred V2. |
| 7 Gaps A–K | PARTIAL | See next table. |
| 8 Existing path before edits | DONE for M08/M10 ONLY | Checked contracts, domain, API dispatch, migrations, UI, tests, capability entry and source. Other modules need the same path review before edits. |
| 8A Organisation | PARTIAL | Maintained UI catch-all split by feature and backend governance/platform route dispatch extracted; existing app/package boundaries and README map preserved. See `handoffs/codex/8A-organization-b707326.md` for A–N. Vendor deployment/store and production/test separation remain incomplete. |
| 9–15 Code/data/security/contract/workflow/connector discipline | APPLIED TO CHANGES, NOT SYSTEMWIDE QUALIFIED | No new table or external effect. Notification semantics were versioned at 0.16.0; the Test Lab list advances the cumulative contract to 0.17.0. Customer-local boundary retained. Systemwide audit remains. |
| 16 Test while building | PARTIAL | Full unit suite, typecheck, lint, tracking and contract drift check executed for contract 0.17.0. Integration/browser/security/deployment checks still required; web build outcome is recorded below. |
| 17 Claude acceptance matrix | PARTIAL | M08 and M10 reviewed and corrected; no matrix result is asserted for untouched modules. |
| 18 Continue implementation | IN PROGRESS | M08/M10 defects fixed and M09 Test Lab run history added. Full Codex V1 scope remains far larger than these corrections. |
| 19 External decisions | OPEN | Build-pack OPEN-02/03/04/06/08/09/10/16/17 affect provider, commerce, production and release paths. No provider, price, key custody or support promise invented. |
| 20–21 Quality/ownership | APPLIED TO CHANGES | Existing implementations extended; Work-owned status files untouched. No parallel tree or owner overwrite. |
| 22 Required end state | NOT MET | Current product remains a synthetic prototype foundation, not full V1. |
| 23 Final report | THIS HANDOFF + USER REPORT | Only executed commands and actual status may be claimed. |
| 24 Principle | ONGOING | Correct existing work preserved; no completion claim. |

## Earlier named gaps A–K

| Gap | Current finding |
|---|---|
| A Real connectors | `packages/connectors` contains a synthetic CRM adapter only; no production connector catalogue or tested PostgreSQL/MySQL/CRM adapter. OPEN-02 and OPEN-17 affect provider/action scope. |
| B Onboarding | Guided local connection, preflight and one typed import exist. Production owner recovery, broader database/API setup and supported install remain incomplete. |
| C Rights | Portal intake and durable state/outcome records exist; actual real-connector action/response delivery is not established. |
| D Retention/deletion | Copy-level outcomes and hold constraints exist; production connector deletion/readback is absent. |
| E Processor/vendor management | Scoped records, assessments and manually evidenced coordination exist; no real notification/connector delivery. |
| F Incident notifications | Obligations, clocks and manual dispatch evidence exist; no electronic regulator delivery. |
| G Notification engine | Durable tasks and evidence log exist. No actual inbox, mail or webhook transport. This change now reports all channels unavailable and refuses new `SENT` claims. |
| H Billing | M26 `NOT_IMPLEMENTED`; provider, catalogue and tax decisions OPEN-03. |
| I Vendor organisation/support | Local approved-diagnostic and support-case records exist. Independent vendor deployment/store, assigned vendor staff and receipt service are absent. |
| J Production deployment | Current Windows synthetic/rehearsal packaging is not qualified Linux/Kubernetes/offline production deployment or full recovery. |
| K Status truth | README architecture map corrected. Work must reconcile `CURRENT_STATE.md` and `tracking/capabilities.json` after integration; M08 currently describes CSV quoting as formula protection, and M10 must state there is no in-app transport. |

## Delivered in this working tree

1. M08: CSV formula-like values receive a text prefix, including full-width starters; the UI warns that spreadsheet save/reopen requires checking. Reports refuse sections over 500 rows instead of presenting a partial count as complete.
2. M10: `IN_APP` is no longer advertised as deliverable merely because a workspace task list exists. `EMAIL` and `APPROVED_WEBHOOK` remain unavailable. Current `channel_available` can be false while older `SENT` history remains visible. New `SENT` claims are refused without a real transport. Contract 0.16.0 and generated artifacts reflect that semantic change.
3. README: existing domain folder map corrected; no source tree move or new dependency.
4. M09: scoped, cursor-paginated Test Lab run history from durable PostgreSQL records, with a staff read route, UI list and integration assertions for staff, principal, anonymous and tenant separation. Contract 0.17.0. No migration required. Section 7A real connectors remains deferred at the user's request.

## Commands executed

| Command | Exit | Result |
|---|---:|---|
| Pinned Node `tsx --test tests/unit/notifications.test.ts tests/unit/reports.test.ts` | 0 | 17/17 PASS. |
| Pinned Node `tsx --test` on all `tests/unit/*.test.ts` files | 0 | 199/199 PASS after M09 change. |
| Pinned Node `tsc --noEmit --pretty false` | 0 | PASS, no diagnostics. |
| Pinned Node contract generator | 0 | 8 artifacts and canonical seed generated, 163 routes/7 error examples, contract 0.17.0. |
| Pinned Node contract generator `--check` | 0 | PASS, no drift at 0.17.0. |
| Pinned Node ESLint on six M09 TS/TSX files | 0 | PASS, zero warnings. |
| `git diff --check` | 0 | PASS. |
| Pinned Node `scripts/validate-tracking.ts` | 0 | 23 tasks, 34 acceptance definitions, 33 modules; no result promoted. |
| Pinned Node `scripts/web.ts build` | 0 | Next.js production build compiled, type checked and generated 51 static pages. Runtime behaviour remains untested. |
| Pinned Node `scripts/local-hygiene.mjs` | 1 | BLOCKED by sandbox `EPERM` reading `.local/profiles/codex-a00/worker`; no hygiene result. |
| `docker ps --format ...` | 1 | Docker config/pipe access denied in this sandbox; integration runtime not inspected. |

M10/M08/M09 integration suites, browser suites, migration/recovery, security and performance checks are **NOT_RUN** at this working tree. Earlier artifacts do not qualify this change. No database migration was added. No release, deployment, merge or commit occurred.

## Next dependency

Run affected integration and browser checks in an isolated authorised runtime; then review and integrate this correction. Work reconciles its owned status files after the actual integrated result. Continue with the real connector/data-onboarding boundary and the other module paths using the build-pack WP/FR references, without relabelling synthetic behaviour as production capability.
