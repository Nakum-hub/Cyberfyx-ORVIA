# WP14 / BUILD-14 continuation — 2026-09-25

**Base commit:** `487a77f573fa1afd8a8b250c5303c58f6942cc29`. **Working tree:** already contained uncommitted base V1 changes; no new commit or candidate was made. **Owner:** Codex for base V1. Claude Code owns the separate DPDP extension pack. **Protected source:** approved master SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b` before and after; Agent Build Pack manifest 15/15 files and root/source master hashes match.

## Requirement and change

The build pack's WP14 and BUILD-14 require evidence integrity checking and an offline verifier. The existing `GET /api/v1/admin/evidence/{workflow_id}/export` already produces a scoped, audited JSON object with a canonical SHA-256 digest and an explicit integrity limitation. This change consumes that exact executable `Evidence` contract; it does not add a shadow DTO or alter the wire format.

Changed paths in this slice:

- `scripts/verify-evidence.ts`: offline schema/digest check with optional separately held SHA-256 reference, bounded 16 MiB file, no evidence payload on stdout, no network or database access.
- `tests/unit/verify-evidence.test.ts`: valid artifact, tamper, embedded-digest rewrite against external reference, strict schema, malformed reference and operator CLI behavior.
- `package.json`: `evidence:verify` command.
- `docs/engineering/local-packaging-and-operation.md`: operator command and trust limitation.

`CURRENT_STATE.md` was left byte-identical to its historical recorded revision (SHA-256 `ea4202285c9b08200fcd94ac862633bce913f725fb3eb926af475f5389d6bc67`). Its digest is linked by the generated delivery pack; changing it would require a coordinated source/evidence revision. This handoff records the newer working-tree facts without rewriting that historical evidence.

## Commands actually run

- Agent Build Pack SHA-256 manifest check: exit 0, 15/15 entries match.
- `node --import tsx --test tests/unit/verify-evidence.test.ts`: exit 0, 5/5 tests.
- `npm test`: exit 0, 206/206 unit tests.
- `npm run lint`: exit 0.
- `npm run typecheck`: exit 0.
- `npm run tracking:check`: exit 0, 23 tasks / 34 acceptance definitions / 33 modules; no result promoted.
- `python docs/reviews/cowork/tools/validate_docs.py`: exit 0, 98/98 current document checks after restoring historical `CURRENT_STATE.md` bytes.
- `git diff --check`: final exit 0. Approved master hash rechecked and unchanged.
- After the verifier result field was named `integrity_check_passed`, the focused 5-test suite, focused ESLint, `tsc --noEmit` and `git diff --check` were rerun: all exit 0. The earlier 206-test full unit run predates only that result-field rename.
- `git diff --check`: exit 0 before final documentation edit; rerun at handoff.

## Remaining build-pack work and dependencies

The current capability register reports 22 sandbox subsets, 3 partial sandbox modules (M29, M32, M33), 1 unimplemented V1 module (M26 Billing) and 7 model modules deferred to V2. A sandbox subset is not a completed master module. The build pack's 36 WPs include substantial unfinished V1 work: protected owner recovery/delegation (WP02, OPEN-07), general policy and legal packs (WP05, OPEN-05/17), actual selected database/REST provider adapters (WP09–WP12, OPEN-02/17), general rights/guardian/nomination and durable action plans (WP07–WP08), complete evidence/export/retention/recovery paths (WP14–WP15, OPEN-09/10), separate vendor account, billing and staff services (WP23–WP27, OPEN-03/04/16), supported deployment/signing and current-candidate qualification (WP28–WP31, OPEN-06/08/13), and representative capacity/failure tests (WP32, OPEN-12). Optional reviewed rule assistance is WP33; model training/runtime WP35 is deferred V2. These are dependency groups, not a claim every line of each WP is absent.

The new verifier detects internal inconsistency and, with an independently retained digest, a rewritten artifact. It does not establish authorship, downstream effect, signed evidence packaging or production release readiness. All 34 prototype acceptance definitions remain `NOT_RUN`; source §217 tests and independent assessment have separate evidence gates. No new endpoint, provider, permission, data egress or destructive operation was added.

The user was asked for the exact pilot providers (OPEN-02), billing provider/terms (OPEN-03), and production load hardware/workload mix (OPEN-12). No answer was assumed for dependent activation or capacity claims.
