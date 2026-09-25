# Security, Evidence, Audit and Destructive-Action Safeguards

## 1. Security baseline
All new functionality inherits the completed V1 security architecture. Do not weaken existing controls to accelerate DPDP features.

Required properties:
- tenant isolation;
- least privilege;
- strong authentication per V1;
- RBAC/ABAC enforcement;
- secure secret handling;
- encryption in transit and at rest according to V1;
- auditability;
- tamper-evident/immutable evidence where current architecture supports it;
- sensitive-log minimisation;
- secure update path for regulatory packages.

## 2. Data minimisation in ORVIA
ORVIA should store identifiers/references and only the operational personal data required to perform the configured workflow. Where the source system remains authoritative, avoid copying full records into ORVIA without a concrete need.

## 3. Sensitive logging rule
Never write full request payloads, personal data, authentication tokens, health records, or secret values into generic application logs.

Use:
- internal protected evidence store;
- redacted structured logs;
- correlation IDs;
- hashes/references where appropriate.

## 4. Evidence integrity
Every evidence artifact/reference must record:
- origin;
- collection method;
- timestamp;
- actor/system;
- related entity/workflow;
- content hash where artifact bytes are controlled/available;
- regulatory package/version when material;
- integrity state.

## 5. Evidence immutability
Historical evidence must not be edited in place to make a later state look better. Corrections must create new records with linkage to superseded/incorrect records.

## 6. Audit events
Audit all privileged operations including:
- creating/changing purposes;
- changing processing conditions;
- publishing notice versions;
- changing consent state manually;
- creating/removing holds;
- approving erasure;
- executing destructive actions;
- changing processor mappings;
- changing SDF status/configuration;
- importing/activating regulatory packages;
- overriding applicability;
- exporting evidence;
- viewing high-risk subject data where existing V1 audit patterns support access logging.

## 7. Regulatory package security
Package must use V1 release integrity mechanism or stronger equivalent:
- signed manifest or verified integrity artifact;
- source hashes;
- package hash;
- version;
- approval identity;
- activation record;
- rollback path where technically safe.

Customer deployment must reject corrupt/untrusted package updates.

## 8. Connector credentials
Use existing secure credential vault/secret mechanism. Never persist connector secrets inside workflow/evidence/log records.

## 9. Child/guardian and representative evidence
Treat identity/authority artifacts as highly sensitive. Apply least-privilege access and retention according to configured rules; do not expose them broadly to ordinary operators.

## 10. Breach operations security
Breach workspaces may contain highly sensitive incident facts. Restrict access using incident/security roles and record access/change audit events.

## 11. Export security
Evidence exports must:
- require explicit authorization;
- apply tenant scope;
- include export audit event;
- support redaction/minimisation where user role requires;
- never expose other tenants;
- preserve integrity metadata.

## 12. Verification evidence
Verification must be distinguishable from execution evidence. Do not allow UI to imply verified state when only execution response exists.

## 13. Security-safeguard mappings
When DPDP safeguards are mapped to technical controls, reuse real V1 controls/evidence. Do not create “implemented” status without verifiable configuration/evidence.

## 14. No fake evidence
Prohibited:
- generated screenshots claiming target state;
- model-written confirmation text used as proof;
- placeholder documents treated as contracts;
- test fixtures in production evidence;
- manually changing a failed verification to pass without authorised exception and audit record.
