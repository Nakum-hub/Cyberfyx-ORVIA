# Connectors, Workflow Execution and Independent Verification

## 1. Core execution invariant
For every action ORVIA claims to have performed:
`decision/input -> workflow -> downstream action -> target result -> independent verification where supported -> evidence -> final state`

A successful API call is not sufficient evidence that the intended state exists unless the connector contract explicitly defines that response as authoritative and the verification strategy records this limitation.

## 2. Action states
Minimum normalized states:
- pending;
- awaiting_approval;
- blocked;
- executing;
- succeeded_unverified;
- verified;
- failed;
- partially_failed;
- inconclusive;
- cancelled.

Do not collapse `succeeded_unverified` into `verified`.

## 3. Rights workflow
Required steps:
1. intake;
2. requester/authority verification;
3. case scope determination;
4. data/system discovery;
5. processor/data-sharing discovery;
6. exception/hold evaluation;
7. action generation;
8. approval gates;
9. connector execution;
10. independent verification;
11. response assembly;
12. communication;
13. closure only when closure criteria are met;
14. evidence package.

Unknown target coverage must be visible in the final case state.

## 4. Consent withdrawal workflow
Required behavior:
- record append-only withdrawal event;
- identify linked processing activities/actions configured to depend on that consent;
- apply configured DPDP requirement logic from active regulatory package;
- create downstream stop/suppression/erasure tasks only where legally/product-configured and target capability exists;
- honour unresolved retention/other-law holds;
- verify downstream state;
- record failures and retry;
- retain evidence of withdrawal and actions.

Do not delete data solely because consent was withdrawn if the active rules/configuration identify a valid retention obligation/exception.

## 5. Correction/update workflow
- validate authorised request;
- determine authoritative source systems;
- avoid conflicting writes across systems of record;
- propagate only through connector capabilities explicitly configured;
- verify updated values/state using protected comparisons/hashes where possible;
- record partial failure.

Do not guess the source of truth.

## 6. Retention/erasure workflow
Phases:
1. evaluate eligibility;
2. evaluate active purpose/status requirements;
3. evaluate legal holds/exceptions;
4. produce dry-run scope;
5. approval if required;
6. batch action creation;
7. execution;
8. retry/reconciliation;
9. verification;
10. evidence and failure reporting.

Bulk operations must be resumable and idempotent.

## 7. Personal-data breach workflow
Workflow definition must derive notification/timer obligations from active regulatory package.

System must support:
- awareness timestamp;
- affected-scope investigation;
- affected Data Principal population estimation with known/unknown distinction;
- processor involvement;
- containment/mitigation tasks;
- applicable regulator/Board task;
- applicable Data Principal notification task;
- deadline/timer monitoring;
- communication evidence;
- remediation;
- closure review.

## 8. Regulatory update workflow
- import verified official source;
- create/approve new package;
- diff requirements;
- compute affected customer configuration;
- create review/action items;
- apply effective-date activation;
- pin subsequent workflows to new package;
- preserve historical package usage.

## 9. Connector capability contract
Every connector must publish machine-readable capabilities:
- discovery/read metadata;
- fetch subject/reference scope;
- correction/update;
- erase/delete/anonymise if exact connector action exists;
- suppress/stop processing if exact connector action exists;
- retrieve audit/evidence;
- verify state;
- bulk support;
- idempotency support;
- rate-limit semantics;
- consistency delay semantics;
- irreversible-action semantics.

If a connector does not support an action, it must return `not_supported`; it must not fake success.

## 10. Verification contract
Verification must use the strongest available method:
1. independent read-back from target;
2. target audit/event evidence;
3. authoritative asynchronous completion event;
4. target operation response only when documented as authoritative;
5. otherwise inconclusive.

Verification result must record method and evidence.

## 11. Failure handling
On connector/API failure:
- preserve failed action state;
- retry only according to safe policy;
- never duplicate irreversible action;
- surface permanent failure;
- keep parent workflow open/partial unless explicitly resolved;
- create Attention/Coverage item;
- preserve error details without leaking sensitive payloads to logs.

## 12. Timeouts and eventual consistency
Connectors must declare expected consistency behavior. Verification jobs may wait/retry within configured limits. A timeout becomes failed/inconclusive, never verified.

## 13. Large-scale jobs
Bulk jobs must include:
- job ID;
- scope snapshot/hash;
- total discovered;
- eligible count;
- blocked count;
- submitted count;
- succeeded count;
- verified count;
- failed count;
- inconclusive count;
- resumable cursor/checkpoint;
- deterministic retry behavior.

## 14. Destructive job approvals
Before execution show:
- action type;
- target systems;
- population/record count if known;
- blocking holds/exceptions;
- unsupported targets;
- verification coverage;
- regulatory/customer rule references;
- irreversible warning.

## 15. Evidence package generation
Each material workflow must be exportable/renderable into a structured evidence package containing:
- request/event trigger;
- active regulatory package/version;
- applicability trace;
- approvals;
- actions;
- target outcomes;
- verification results;
- exceptions/holds;
- communications;
- final state;
- timestamps;
- hashes/references to source evidence.
