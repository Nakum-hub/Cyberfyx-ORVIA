# Application acceptance — generated from tracking/acceptance.json

**30 mandatory P0 scenarios; 4 optional P1 scenarios. All NOT_RUN.** These are scenario definitions, not a measured number of automated assertions or proof that tests exist.

When a P1 slice is selected, only its matching case becomes an additional gate; do not claim the unselected P1 tests passed. Test implementations must make real assertions, not assert that a stub returns a desired status.

| ID | Priority | Scenario | Expected evidence | Initial result |
|---|---|---|---|---|
| T01 | P0 | Clean local start | Fresh isolated profile with documented prerequisites reaches healthy application and persistent services; no hidden model/provider credentials. | NOT_RUN |
| T02 | P0 | Protected bootstrap and authentication | Create organisation and unique local owner; real login/MFA/logout/revocation work; no default-password or role-switch bypass. | NOT_RUN |
| T03 | P0 | Tenant and environment isolation | Cross-tenant and unassigned sibling-environment API read/write/export and background-job access denied; DB role cannot bypass configured RLS. | NOT_RUN |
| T04 | P0 | Principal and staff separation | Principal A cannot access principal B or workspace APIs; staff/vendor-shaped credentials cannot masquerade as a principal or vendor root. | NOT_RUN |
| T05 | P0 | Least privilege and approval | Auditor/member unauthorised writes denied server-side; policy publish by author/self or wrong digest denied; authorised distinct reviewer succeeds. | NOT_RUN |
| T06 | P0 | Persisted configuration and relationships | Create purpose, notice, policy, principal and system mapping; reload/restart and read exact immutable published version; unsupported changes rejected. | NOT_RUN |
| T07 | P0 | Grant and own receipt | Authenticated affirmative grant stores exact notice/purpose, server epoch and receipt; no unrelated purpose granted. | NOT_RUN |
| T08 | P0 | Atomic withdrawal acceptance | Committed receipt corresponds to state/event/outbox; injected pre-commit failure leaves no accepted receipt; refresh shows durable withdrawal. | NOT_RUN |
| T09 | P0 | Idempotency and concurrent epochs | Identical authorised retry returns original logical receipt; conflicting key reuse/stale epoch rejected; concurrent grant/withdraw ordering is deterministic. | NOT_RUN |
| T10 | P0 | Replay and fresh re-consent safety | Old grant cannot override newer withdrawal; legitimate new interaction advances epoch; stale cleanup cannot mutate a newly authorised target generation. | NOT_RUN |
| T11 | P0 | Outbox and worker recovery | Crash/restart after accepted withdrawal resumes stable workflow; duplicate dispatch does not create a second logical operation. | NOT_RUN |
| T12 | P0 | Restricted signed commands | Altered/wrong-tenant/wrong-installation/expired command denied; duplicate command reconciles without duplicate effect; arbitrary operation/host/SQL rejected. | NOT_RUN |
| T13 | P0 | Actual CRM mutation and readback | Real synthetic CRM membership changes via agent; separate read confirms exact target/scope/generation, not an acknowledgement copied as evidence. | NOT_RUN |
| T14 | P0 | Current send-admission enforcement | Queued marketing attempt after committed withdrawal is denied and no send row is written; concurrent case verifies documented admission ordering. | NOT_RUN |
| T15 | P0 | Independent service purpose | Service fixture only allowed under its own approved condition/context; missing condition denied; marketing withdrawal does not automatically permit or block every other purpose. | NOT_RUN |
| T16 | P0 | Degraded policy safety | OPA timeout/undefined/malformed result is INDETERMINATE and marketing is blocked/queued without send; no fail-open fallback. | NOT_RUN |
| T17 | P0 | Applied but response lost | REST sandbox applies change then times out; effect marked unknown; reconciliation obtains read/receipt evidence without blind unsafe retry. | NOT_RUN |
| T18 | P0 | Acknowledgement without effect | Sandbox returns success but unchanged target; observation detects mismatch and workflow is not falsely completed. | NOT_RUN |
| T19 | P0 | Known failure and bounded retry | Known unavailable/denied target state creates bounded attempts and explicit escalation; errors are not swallowed or retried forever. | NOT_RUN |
| T20 | P0 | Manual and missing capability | Legacy no-API target becomes assigned manual requirement; manual attestation not automated verification; permission removal changes coverage. | NOT_RUN |
| T21 | P0 | Truthful evidence and dashboard | Receipt/version/plan/observation references match persisted state; unknown/manual/unverified obligations remain visible; counters are not fabricated. | NOT_RUN |
| T22 | P0 | Local export protection | Export is authorised, scope-filtered, audited and local; another tenant/principal cannot fetch it; no vendor renderer; limits accompany digest claims. | NOT_RUN |
| T23 | P0 | Healthy regression run | Allowlisted synthetic scenario invokes real policy/boundary/target and persists assertion-level PASS/FAIL/ERROR with actual run/build references. | NOT_RUN |
| T24 | P0 | Broken fixture detection and repair | Real buggy test-only sender produces a violation, assertion detects it, healthy fixture rerun passes; no result chosen from fault selector. | NOT_RUN |
| T25 | P0 | Quarantined target restore | Old target-only synthetic snapshot remains blocked/quarantined until reconciliation against current authoritative withdrawal, then restricted simulated processing stays blocked. | NOT_RUN |
| T26 | P0 | No runtime vendor/model egress | Core scenario works with vendor/model internet blocked; browser and backend observations show no unapproved traffic/assets/telemetry for the tested interval. | NOT_RUN |
| T27 | P0 | Input/session and secret hygiene | Bounded schemas, CSRF/origin/session errors, log redaction, no committed secrets; dependency/secret scan findings triaged and no unacceptable critical finding. | NOT_RUN |
| T28 | P0 | Reset and fault isolation | Named synthetic-only reset requires authorisation/confirmation and rejects non-demo targets; fault/reset unavailable outside profile; parallel lane stores isolated. | NOT_RUN |
| T29 | P0 | Integrated browser flow and error states | Staff configure, principal withdraw, workflow/evidence/test views use real API; empty/loading/denied/service errors accessible; refresh retains truth. | NOT_RUN |
| T30 | P0 | Frozen-candidate repeatability and claims | Two rehearsals from documented state; evidence matches exact candidate; recording/live distinction and capability claims accurate; no V2 inference advertised. | NOT_RUN |
| T31 | P1 | Rights case coordination | Own-principal intake, identity scope, assigned review and status persist; no claim of unimplemented downstream erasure/access fulfilment. | NOT_RUN |
| T32 | P1 | Retention/hold review coordination | Typed review case has allowed transitions/permissions and hold reason; no destructive operation or fabricated deletion result. | NOT_RUN |
| T33 | P1 | Development licence import | Local verifier accepts valid development fixture, rejects altered/wrong-profile signature; clearly not production commerce or signing; restrictions persist on expiry. | NOT_RUN |
| T34 | P1 | Deterministic help | Reviewed rule/runbook points to authorised actual records, labels non-model behaviour; no inference/API/egress and absence does not break core. | NOT_RUN |

## Evidence schema

For every execution record: test_id, command, exit_code, started_at/finished_at, commit/build_id, contract_version, environment/profile, fixture_id, result, artifact_paths and limitations. Use actual execution artifacts. Work reviews consolidated results, but does not turn another lane's assertion into independent security certification.
