# Handoff ? B04 Test Lab interface

Base 3859c6e; canonical contract 0.4.1. Rehearsal / aster-birch-v1, unchanged source master.

Implemented enqueue by approved scenario and connected canonical profile, exact run-ID reads, bounded polling, actual assertions/build/timestamps/local artifact references, explicit operator execution dependency, real NOT_RUN/RUNNING/PASS/FAIL/ERROR display and expected-fault distinction. No test-history endpoint or results are invented. Interrupted/error execution is described without converting it to a pass.

`node tests/e2e/record.mjs B04 typecheck`: first exit 2 caught fixture_id mistakenly bound to the display profile constant. Corrected to PROFILES[profile].seed; rerun exit 0. Original browser/B04-typecheck-2026-09-17T05-13-16.956Z/command.json; corrected browser/B04-typecheck-2026-09-17T05-14-24.982Z/command.json. `git diff --check`: exit 0.

Exact paths: components/test-lab.tsx, components/shell.tsx, workspace/test-lab/page.tsx and workspace/test-lab/[id]/page.tsx, this handoff and command evidence. Dependencies/contracts unchanged. The pinned Playwright browser was provisioned locally (B06 evidence); integrated browser tests remain NOT_RUN. B04 acceptance and B06/full candidate remain pending; no Work acceptance claimed.
