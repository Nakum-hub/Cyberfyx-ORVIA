# Shared Cross-Layer Contracts

## Purpose
These contracts must be consistent across backend, frontend, workflows, connectors, evidence, and reporting.

## Canonical operational states
Do not collapse distinct states into one success flag.

### Execution
- requested
- dispatched
- accepted_by_target
- completed_by_target
- verified
- failed
- inconclusive
- not_supported

### Knowledge/evidence
- known
- unknown
- evidence_available
- evidence_missing
- needs_verification
- needs_remediation
- not_applicable
- exception_recorded

### Regulatory applicability
- applicable
- not_applicable
- unresolved
- not_yet_in_force
- superseded
- exempt_with_recorded_basis

## Unknown-state rule
Unknown is a valid persisted state. Frontend and API consumers must display it as unknown. It must never be silently converted into false, true, pass, compliant, consented, or not-applicable.

## Historical state
Versioned/effective-dated entities must support time-based reconstruction where required, including notice versions, purposes, regulatory packages, processor relationships, retention policies, consent events, and requirement mappings.

## API behavior
Use the completed V1 API conventions. New APIs must return stable machine-readable status, authorization failures, validation failures, unresolved dependencies, and partial execution results without masking them as HTTP-level success only.

## Multi-relationship principle
A single person reference may have multiple independent organisation relationships, such as patient and employee. Processing context, rights actions, retention, notices, and evidence must remain relationship-aware.

## Traceability
Operational records should be traceable where applicable through:
Official Source -> Requirement Version -> Applicability -> Processing Context -> Workflow/Action -> Target Execution -> Verification -> Evidence.
