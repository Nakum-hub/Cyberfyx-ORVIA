# B06 consolidated source review and browser prerequisite

Base backend 7f4f7010a908f77c036ab31951ed89fa200f722c; UI increments 3a045e6, c2bf492, 0988221, 3859c6e, a7189dc. Review is Codex engineering work, not Work acceptance. Contract remains 0.4.1; no schema/endpoint/dependency/migration change.

## Corrected findings

- Same-screen refresh previously unmounted consent request holders. Preserved refresh, identical original-payload/key replay, pending/unsettled navigation guards and an unload warning now protect them. A read alone never settles an uncertain mutation.
- Requests/responses are identity scoped; exact route-binding changes hide old query data immediately. Session expiry/auth denials clear scope. A transient session dependency error preserves the still-unexpired holder and visibly marks stale authority rather than discarding the request.
- Local canonical validation happens before dispatch, so malformed input is distinguishable from a malformed response after a potentially committed write.
- Every paginated list has actual cursor navigation (including empty filtered pages); configuration selectors read every page with bounded loop detection.
- Provider receipts are not independent observations; future/expired/mismatched observations and unconfirmed scope cannot verify; zero obligations cannot imply completion. Attributed manual closure stays administrative.
- Reconciliation polls while a real reconciliation is pending even if the aggregate workflow remains NEEDS_ATTENTION. No effect retry is offered.
- Separate staff/principal sign-in is preserved; privileged MFA uses the real mount. Native withdrawal dialog contains/restores focus and does not require a new notice.
- Counts retain separate workflow and obligation units. Programme modules come from all 33 Work-owned register entries, separately from runtime connector records. No metrics, workflow stages or endpoint fields are invented.
- Test Lab uses persisted runs and actual assertions. Broken-control FAIL and interrupted ERROR stay distinct from healthy PASS. No run-list endpoint or browser-local business database is introduced.

## Verified shared transport defect

Original real HTTPS/PostgreSQL `check_system` through packages/contracts/src/client.ts returned HTTP 400 VALIDATION_ERROR because no-input POST operations omitted JSON content type/body while the actual business route requires them. Actual failure: browser/B06-exec-2026-09-17T05-28-27.317Z/command.json. Minimal correction sends `{}` with application/json for canonical no-input POST routes; request-schema routes retain their validated body. No semantic contract change or automatic retry. Same real probe corrected PASS: browser/B06-exec-2026-09-17T05-30-07.160Z/command.json. Unit regression covers both check_system and reconcile. Earlier probe 05-24-33 failed during login because all four rehearsal services were stopped; services were restarted with retained volumes, never reset.

## Executed checks

Contract generation check: exit 0, 8 artifacts, 41 route and 7 error examples (05-31-48). Corrected type/lint checks exit 0 (05-34-33 / 05-34-51; package extension 05-38-24 / 05-38-44). Unit suite exit 0, 15/15 (05-34-56). Production build exit 0, all mandatory routes (05-34-59). Hygiene exit 0, 1,358 files, 33 browser bundles and 81 generated credentials compared, no findings (05-38-51). These are bounded checks, not a comprehensive security claim. Initial lint failure (empty fixture argument destructuring) remains in 05-32-24 artifact and was corrected.

## Browser prerequisite actually tested

Pinned Playwright 1.63.0 / Chromium headless-shell revision 1243 (Chrome 153.0.8010.12) installed locally, without changing dependencies. Real browser TLS preflight failed with BROWSER_CERTIFICATE_NOT_TRUSTED at 2026-09-17T05-36-05.334Z. Public results: browser/B06-playwright-2026-09-17T05-36-05.334Z/results.json. Authenticated suite is NOT_RUN. Raw screenshot/trace remains private; its SHA256 is recorded. No ignoreHTTPSErrors, warning click-through or certificate bypass.

CA thumbprint 8C592FC41BBD6AA18F42234085F6B8155466A190 is absent in CurrentUser and LocalMachine roots. Human approval for temporary CurrentUser trust and exact cleanup was requested and remains pending. This is an actual system-trust prerequisite; no user silence is treated as approval.

## Remaining issues

1. High / human system approval: browser trust blocks actual B00-B04/B06 runtime acceptance, final screenshots and full candidate regression. Approve/install the reviewed rehearsal CA, execute tests/e2e/playwright.config.ts suites, inspect every failure, correct and rerun; remove only an agent-added trust entry when finished.
2. Medium / Codex contract producer + Work semantic review: Obligation lacks the current manual task version required by ManualAttestation. UI truthfully leaves manual submission unavailable. Add an authorized version binding with coordinated schemas/producer/tests; retest stale concurrent attestation, evidence scope and committed replay. No guessed version zero or alternative endpoint.
3. Browser tests are implemented and statically checked but remain unverified runtime code until the trust prerequisite is cleared. No successful screenshots or business assertions are fabricated.

The new package will use the canonical A07 packager plus a small UI evidence extension, retain exact source/build/image/checksums, and mark browser acceptance blocked. It cannot reuse the old A07 candidate as though these UI files were tested there. Human merge, Work review, C01/C02 refresh, full T01-T30, rehearsals and release sign-off remain separate.
