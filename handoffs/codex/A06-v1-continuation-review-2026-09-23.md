# Handoff — A06 continuation review — Codex — not committed

**Base commit:** `ecedcce625c2469ffb413b8bd23f7730bbef6cb2`
**Repository HEAD at handoff:** `4ac66612af6d2dc7f5ea2f2798bc4668bde97e17` (advanced externally during this work; not created by this lane)
**New commit:** not committed
**Source master / hash verified:** `ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md`, SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`
**Contract version:** `0.15.0`
**Scope and profile:** review of the supplied V1 build pack and current Claude Code branch; bounded A06 test/evidence hardening on `codex-a00`; no production/customer data

## Delivered

- Reviewed the revision 1.4 master, build-pack rules/requirements, current-state documents, contract, ownership map, task/acceptance/capability registers, repository structure, recent Claude Code commits and current test evidence.
- Preserved the current package/domain structure. No mass move is justified while OPEN-01 remains unresolved; `packages/backend/src/business.ts` is a routing composition file rather than the monolith described by the prompt.
- `packages/testing/src/evidence.ts`: a battery run may stamp evidence with a validated UUID so only evidence from that execution is accepted.
- `scripts/verify-suites.ts`: added an exclusive live-PID profile lock, stale-lock takeover, per-run evidence correlation and explicit refusal of stale/concurrent artifacts. The runner keeps the original Windows shell-owned npm execution because direct `npm-cli` execution returned while TSX/Next descendants were still alive on this host. Suite names are a closed source-controlled allowlist; no user input reaches the shell arguments.
- `packages/testing/src/http-fixture.ts`: readiness now requires the anonymous business boundary to return the documented `401`, not merely any HTTP status (which previously accepted `503`).
- `tests/integration/enforcement/send.test.ts`: OPA restart readiness now proves the actual processing policy is loaded at startup and recovery; the effectful send remains single-attempt. The Docker timeout is 60 seconds because an observed local restart took 33 seconds.
- Preserved failed evidence. The final aggregate remains red and is not presented as a passing release gate.

## Commands actually executed

| Command | Exit code | Result | Artifact / environment |
|---|---:|---|---|
| `npm run contracts:check` | 0 | PASS — 8 artifacts, 162 route examples, 7 error examples, contract 0.15.0 | local source |
| `npm run typecheck` | 0 | PASS | local source |
| `npm run lint` | 0 | PASS | local source |
| `npm test` | 0 | PASS — 197/197 | local source |
| `npm run tracking:check` | 0 | PASS — 23 tasks, 34 acceptance definitions, 33 modules | local source |
| `npm run hygiene:check` | 0 | PASS — 3,483 files, 72 browser-bundle files, 79 generated credentials, 0 findings | protected local fixture read |
| `npm run services:smoke` | 0 | PASS | `handoffs/codex/artifacts/A00-service-integration-1790156943418-16ace1c2-25e3-4f1d-9b28-bcb98be88e09.json` |
| `npm run test:consent` | 0 | PASS — 50 assertions | `handoffs/codex/artifacts/A00-consent-integration-1790160411352-b4a62bc0-8e99-49cd-aa4d-3557953b3370.json` |
| `npm run test:expiry` | 0 | PASS — 87 assertions | `handoffs/codex/artifacts/A00-expiry-integration-1790160639132-b0cd208f-864a-433a-a0d9-ce4c87bd7d0e.json` |
| `npm run test:enforcement` | 0 | PASS — 46 assertions | `handoffs/codex/artifacts/A00-send-enforcement-1790157120764-fbb1b7a3-58aa-45da-878f-456155eb5906.json` |
| `npm run test:onboarding` | 0 | PASS — 33 assertions | `handoffs/codex/artifacts/A00-onboarding-integration-1790160661203-ad407cfc-a47d-4979-8841-1926463e1ce7.json` |
| `npm run test:workflows` | 0 | PASS — 32 assertions | `handoffs/codex/artifacts/A00-workflow-integration-1790160817922-46d67d59-2c5d-4f21-877d-5015e045f02b.json` |
| `npm run test:regression` | 0 | PASS — 70 assertions | `handoffs/codex/artifacts/A00-regression-integration-1790161127495-c9c7fb72-fe7d-44b3-8483-5cf7a9352ea5.json` |
| `npm run verify:suites` (original runner, before changes) | 0 | PASS — 27 suites, 1,118 assertions | `handoffs/codex/artifacts/A00-suite-battery-1790152917384-51dabb21-17f6-4c2d-ab37-ad6fe781b0a9.json` |
| `npm run verify:suites` (final changed runner) | 1 | FAIL — 27 suites, 736 assertions, 9 failing | `handoffs/codex/artifacts/A00-suite-battery-1790163789301-afa0f01e-77ac-4b6d-a8f6-ba5cafce03b9.json` |
| process/lock inventory after final battery | 0 | PASS — no ORVIA Node processes; no battery lock | local Windows process table |
| `git diff --check` | 0 | PASS | working tree |

`pnpm run ...` was attempted first but the local pnpm shim could not verify/download its signed package. The accidental lockfile edit it produced was removed; all recorded checks above used the installed npm scripts. One sandboxed Docker battery was also retained as failed evidence because Docker named-pipe access was denied: `handoffs/codex/artifacts/A00-suite-battery-1790150408939-d7f98158-e961-471e-bf84-8816f99c4478.json`.

## Acceptance

- The focused consent, expiry, enforcement, onboarding, workflow and regression suites are green after removal of the confirmed orphan process tree.
- Enforcement proves missing/malformed/outage decisions fail closed, create no send effect, and recovery waits for the exact policy module.
- The battery cannot accept a stale artifact from a prior or concurrent execution; each accepted artifact must carry the runner UUID.
- The final aggregate is **FAIL**, not application PASS: evidence, graph, portal-rights, coverage, processors, support, updates, audit and workflows had non-zero exits, principally scenario/setup timeouts. The failure artifacts carry the same run ID and are retained. Several affected suites pass individually, but that does not supersede the failed aggregate gate.
- T01–T34 full application acceptance and human rehearsals remain NOT_RUN unless an existing Work-owned artifact explicitly says otherwise.

## Contract / dependency / ownership changes

- No contract schema, generated contract, database migration, endpoint or production dependency changed.
- No Work-owned file was intentionally edited by this lane. During the run, HEAD advanced externally to commit `4ac66612af6d2dc7f5ea2f2798bc4668bde97e17` (`fix: M29 and M33 register entries no longer contradict themselves`), and untracked `500_test_cases/` appeared. Both were left untouched.
- Work should update `CURRENT_STATE.md` to the current HEAD/contract only after reviewing this handoff and the failed aggregate; it must not promote application acceptance.

## Remaining limitations and blockers

- **P0 qualification:** the final full suite battery is red (9/27 suites failed). Required retest: reproduce each run-stamped failure on a quiescent fresh approved profile and make the complete battery pass without retries of effectful operations or database reset. Codex owns the runner/test paths.
- **Product completion:** the repository is a customer-local synthetic prototype, not a complete or production-ready V1. It has no real provider connectors or notification transport, automated rights/retention execution, separate vendor commerce/support backend, actual billing, approved customer-held recovery protocol, supported deployment matrix, production signing/key custody, measured RPO/RTO/performance, independent assessment or completed accessibility/language acceptance.
- **M26 billing:** all four requirements remain blocked by OPEN-03. Payment provider, catalogue, tax/invoice semantics and authoritative reconciliation cannot be invented.
- **Vendor separation:** revision 1.4 requires separate vendor services, but operational customer data must never enter them. The current customer runtime correctly exposes no vendor actor/commercial surface; the missing vendor plane requires product decisions and a separately owned implementation.
- **Open decisions:** OPEN-01/02/03/04/06/07/08/09/10/11/12/13/14 remain material. Implementing unspecified identity recovery, retention periods, connectors, commerce, deployment, key custody or legal/performance claims would be assumption-driven.
- **Repository state:** the user-provided `ORVIA_V1_Agent_Build_Pack/`, externally introduced `500_test_cases/`, and generated evidence artifacts are untracked. No cleanup was performed because ownership and retention differ.

## Next integration action

1. Review the four tracked patches and the external HEAD advance; commit only after deciding how failed aggregate evidence is retained.
2. Reproduce the nine aggregate failures on a quiescent approved profile, beginning with the run-stamped phase/error records in the final battery artifact; do not reset durable business state without human authorization.
3. Work reviews and updates its state/capability documents without claiming application PASS.
4. Product/security owners resolve OPEN-03 and the other named decisions before Codex implements billing, real connectors, vendor services or production hosting/security claims.
