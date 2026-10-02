# Implemented vendor policy diagnostic blindspot fix

Implemented narrowly in `backend/api/src/vendor/authority.ts` and `dependency-errors.ts`, with focused controls in `tests/unit/vendor-dependency-diagnostics.test.ts`. This fixes missing diagnostics on vendor policy refusals, not the unknown internal cause of the original OPA HTTP500.

The actual implementation records ONLY `VENDOR_POLICY_FETCH` and `VENDOR_POLICY_HTTP`. Fetch failures retain an allowlisted own error name; non-OK HTTP failures retain the numeric upstream status. Both retain bounded elapsed milliseconds in a private WeakMap and emit metadata at the existing vendorSafeRoute request UUID. Descriptor access is guarded; cause/code/message/body getters are not invoked. All other AccessError logging remains unchanged.

There is no added response-body parsing, cloning, JSON-stage instrumentation, error-code parsing, retry, database or DTO change. The original 2000ms AbortSignal, authorization input, fail-closed503, false-result403 and true-result allowance remain unchanged. Existing request audit, public envelope and headers are preserved. The earlier broader proposal was not implemented and is superseded by this exact scope.

Executed focused evidence:

- BEFORE: `artifacts/R8-vendor-policy-observability-before.log`, actual exit1, seven controls: five PASS and two expected missing-stage failures (`VENDOR_POLICY_HTTP` and `VENDOR_POLICY_FETCH` were undefined).
- AFTER: `artifacts/R8-vendor-policy-observability-after.log`, actual exit0, seven PASS, zero failures, zero skips. Reviewer read the resulting log. Actual controls traverse requireVendorCapability and vendorSafeRoute with a fake audit pool; non-OK response json/clone getters must not execute, TimeoutError code/cause getters must not execute, private sentinel must not enter logs, one fetch call only, false403 emits no dependency log and true remains allowed. Existing installedAPIError, descriptor/Proxy and actual-route controls also pass.

Root completed typecheck and three-file lint with actual exit0; see R8-scoped-fixes-typecheck.log and R8-scoped-fixes-lint.log. This agent ran no tests, database or runtime. No full matrix or full battery rerun is requested or performed by this fix.

Historical original iota vendor42 contains request4172 OPA HTTP500, but no retained allowlisted reason. The later MU vendor fixture passed112 controls with correct OPA prerequisites; it does not establish that the original failure was fixed. The original AUTH38 dependency cause likewise remains unresolved. Preserve all original failed evidence separately from these focused diagnostic regression controls.
