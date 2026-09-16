# Handoff — W00 — Work — corrected A00 acceptance

**Base commit:** 58ceddcd73b9b9f0717553bbd1e2fff3f7389abe (human-merged PR #5).
**New commit:** containing Work review commit; the subsequent canonical tracking commit records this exact review SHA separately from the accepted implementation SHA.
**Source master / hash verified:** repository master revision 1.3; SHA-256 527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6; committed and checkout bytes match.
**Contract version:** 0.2.1 accepted at A00 depth.
**Scope and profile:** CUSTOMER_LOCAL_SYNTHETIC; Work static/unit review with no services.

## Delivered

- `docs/reviews/work/W00_A00_ACCEPTANCE.md`: exact correction review, finding closure, accepted semantics and next role gates.
- `docs/reviews/work/artifacts/W00-A00-58ceddc/**` and `docs/reviews/work/repro/W00-A00-source-audit.py`: independent commands/logs, four-control F07 retest, 11 unit tests and committed-source audit.
- Existing ADR-001, `docs/prototype/CONTRACT.md`, `SOURCE_ALIGNMENT.md`, `FILE_OWNERSHIP.md`, historical W00 review/evidence: consolidated accepted baseline, preserved history and explicit UI transfer.
- `handoffs/TEMPLATE.md`: restored byte-for-byte from matching v1 kit; SHA-256 8264e660ccc2d36f01c61a23f557a09639b87d7d7f5942bc8503e0f0c4e01049. This handoff uses its structure.
- The following tracking commit updates Work-owned canonical JSON, generated task/test views and CURRENT_STATE with actual accepted review/source SHAs. Application source, schemas, dependencies and other lanes' artifacts remain untouched.

## Commands actually executed

Full absolute commands/cwd/timestamps/exits are in the reports. Pinned Node is 24.21.0; pnpm is 12.4.2.

| Command | Exit code | Result | Artifact / environment |
|---|---|---|---|
| pnpm install --frozen-lockfile --offline | 0 | PASS, cached installation | install.json |
| node handoffs/codex/repro/W00-F07/provider-receipt.mjs | 0 | PASS, all four comparisons | F07-retest.json |
| node --import tsx --test tests/unit/completion.test.ts tests/unit/contracts.test.ts tests/unit/tracking.test.ts | 0 | PASS, 11 tests | unit.json |
| node --import tsx packages/contracts/src/generate.ts --check | 0 | PASS, 8 artifacts / 37 routes / 7 errors | contracts.json |
| node node_modules/typescript/bin/tsc --noEmit | 0 | PASS | typecheck.json |
| node node_modules/eslint/bin/eslint.js packages apps scripts tests --max-warnings 0 | 0 | PASS | lint.json |
| python docs/reviews/work/repro/W00-A00-source-audit.py | 0 | PASS, master/manifest/producer-source checks | source-audit.json |

All artifact names above resolve under `docs/reviews/work/artifacts/W00-A00-58ceddc/`. Post-update tracker/view/ownership checks are recorded by the tracking checkpoint.

**Tests not run:** full T01–T34 application acceptance; service/reset/PowerShell/Next build/browser/egress/recovery/advisory/rehearsal scenarios. Work lacks Docker/PowerShell here. Earlier service evidence is reviewed at its original bootstrap scope. The supported tsx loader was used; earlier CLI IPC failures and pre-fix F07 failure remain historical evidence.

## Acceptance

W00 review and A00 foundation **ACCEPTED** at integrated 58ceddc, contract 0.2.1. F07's provider-only case now remains NEEDS_ATTENTION; independent fresh read can complete; stale read/ACK cannot. Provider evidence and unknown execution history remain intact. F01 repository source placement is verified. F02/F03/F04 close at A00 depth; F06 previously closed. No application test is promoted merely because its scaffold ticket is complete.

## Contract / dependency / ownership changes

Work accepts Codex's coordinated 0.2.1 semantics and preserves the single ADR/profile. The canonical schema, generator, seed/dependency and implementation writer remains Codex. Embedded producer review labels may be refreshed from this acceptance in the next owned change. Claude Code consumes shared clients/types/auth and confirms bindings at B00.

Recorded layout/page transfer becomes effective for accepted A00 once the human integrates the shared ownership record; health/API/server/auth/configuration/manifests stay Codex-owned. Each executable lane keeps its distinct profile. No dependency edge, task/test ID or P1 promotion is changed.

## Remaining limitations and blockers

No remaining blocker to A00's bounded foundation. Human R0/deadline is still unknown/nonblocking. C00 is not submitted in the inspected repository and is required for B00 acceptance. Actual authority, consent durability/races, signed agent/current boundary, safe retries, independent observation, reset/recovery, egress/TLS and final demo evidence remain their assigned later tasks. Production security/legal/release gates remain separate.

## Next integration action

Human reviews/merges this Work acceptance/tracking PR. Use accepted implementation 58ceddc plus the integrated Work metadata as the shared starting point. Start **Codex A01** and **Claude Code B00**; **Cowork C00** remains independent. Work next takes **W01**, accepting only after actual A01/A02 evidence. A02–A07, B01–B06, W02 and W03 retain their recorded dependencies. Work performs no merge, release, deployment or recurring orchestration.
