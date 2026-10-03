# Original OPA HTTP 500: cause remains unresolved

This is a bounded source and historical evidence review, not another policy request or passing reproduction. Current source is `f07cf733bfb22ad958ef4a5b3ba345b90fd43af6`; the original failure belongs to frozen-iota source `3caf3b7cba1703e42018e6ba43af80ab4206287e`. No runtime, tests, restart, raw log read or product edit was performed.

## What the preserved evidence establishes

`artifacts/R8-original-iota-historical-dependency-metadata.json` records actual OPA request 4172 to the vendor authorization path, received at 04:07:39.327910516 UTC and answered at 04:07:39.413471434 UTC with HTTP 500. Its duration field is retained without assuming units. Requests 4170 and 4171 received HTTP 200 earlier in the same window. This does not show an absent OPA service at the failed request.

`artifacts/R8-original-vendor-opa-error-detail.json` exited 0 but found no allowlisted error, cause or code fields and no known internal reason in either request-bound event. The original vendor case failed its synthetic team-create operation with HTTP 503 before business controls. The original application policy gate converted a non-OK OPA response to that fail-closed refusal and discarded its response body. Consequently no internal OPA reason is available in the preserved application evidence. Successful later requests cannot establish the cause of this failure.

## Source findings and limits

`backend/policy/vendor/authorization.rego` is a fixed Boolean decision with a false default and true rules based on input equality and finite set membership. The inspected module contains no network, clock, print or custom builtin calls and no rules yielding conflicting non-Boolean decisions. Its latest source change is commit `47cc467f5108ef32d9271408c0754e6df7e10a0b`. This source inspection does not prove which module bytes the historical OPA process had loaded or exclude cancellation, process/runtime failure or an unrecorded error response.

Current `requireVendorCapability` still enforces the local capability precheck, two-second fetch deadline, non-OK HTTP 503 refusal, Boolean response validation and false-decision HTTP 403. Added safe stage/duration/status diagnostics preserve those decisions. They do not retrospectively explain request 4172.

A bounded Docker inspection was attempted for only the stopped fixed OPA container's running/status/OOM/exit/restart/timing/image/resource fields. Docker access was denied by this reviewer's Windows pipe/config permissions, not an automatic approval-review rejection. The surrounding shell exited 0 after unrelated source reads; that is not Docker inspection success. No escalation or restart was attempted.

Root separately completed the selective inspection with actual exit 0. [Current container metadata](artifacts/R8-original-opa-current-container-metadata.json) records running false, OOMKilled false, exit 0, restart count 0, the pinned OPA digest `2de1e6619246955695b982d0bcb6c73bcee22aa34ff96f2455996616ec1d21c1`, memory limit 134,217,728 bytes and NanoCpus 0. Its start/finish times are 04:21:34–04:24:52 UTC, a later MU execution window rather than the original 04:07:39 failure. These actual current-state controls therefore do not establish or disprove a historical resource/cancellation cause; the artifact explicitly records `historical_cause_proven:false`.

## Fix decision

No definitive cause is demonstrated, so no product or dependency fix is justified by this review. In particular, do not extend policy deadlines, retry authorization, weaken deny behavior, reset OPA or attribute the 500 to resource pressure without evidence. If another independently required failed-path execution encounters a non-OK response, a bounded local classifier may read a capped error response in memory and emit only allowlisted OPA error-code enums, HTTP status and elapsed metadata. Raw bodies, messages, policy inputs, headers and stacks must remain unlogged. That would diagnose a new occurrence, not rewrite the historical cause.
