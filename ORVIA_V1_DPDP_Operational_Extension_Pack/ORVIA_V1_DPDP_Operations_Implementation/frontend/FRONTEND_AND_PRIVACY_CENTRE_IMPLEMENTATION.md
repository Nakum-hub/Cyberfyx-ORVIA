# Frontend Implementation Specification

## Objective
Implement the internal ORVIA user experience and external Privacy Centre surfaces required by the Product Requirements using the completed V1 frontend framework, routing, design system, authorization model, and data-access conventions.

## Internal ORVIA surfaces
Implement or extend UI for:
- Data Principals and relationship contexts;
- Data & Processing Registry;
- processing activities and purpose mappings;
- notices and versions;
- consent state/history and withdrawal operations;
- rights and grievance cases;
- retention rules, dry-runs, holds, approvals, erasure batches, and results;
- processors and data-sharing relationships;
- personal-data breach operations and deadline state;
- regulatory source/package/requirement views appropriate for authorised users;
- evidence and historical traceability;
- Coverage / Failure views;
- Attention work queue;
- relevant notifications;
- SDF-specific screens only when capability is active/applicable.

## Privacy Centre
Implement external-facing routes/components, consistent with V1 security architecture, for applicable configured functions such as:
- notice viewing;
- request intake;
- request/status interaction;
- consent/withdrawal where configured;
- correction/update/erasure request submission;
- grievance;
- nomination/representative flows where enabled;
- communications/status history where appropriate.

## UI truthfulness rules
The UI must visibly distinguish:
- verified success;
- target-reported completion awaiting verification;
- failed;
- inconclusive;
- unsupported;
- unknown;
- blocked by hold/exception;
- unresolved applicability.

Never present unknown/inconclusive/unsupported as green/pass/compliant.

## Historical views
Where the backend supports versioned state, provide authorised historical lookup so users can determine which notice, purpose, processor relationship, regulatory package, or other relevant version applied at a selected time.

## Dangerous actions
Erase/delete/anonymise and other destructive actions must show impact/scope before execution and use existing V1 confirmation/approval patterns. Where maker-checker is configured, UI must enforce it rather than merely display it.

## Accessibility and scale
Use existing V1 accessibility standards. Large datasets must use server-side pagination/filtering and must not attempt to load full populations into the browser.

## No disconnected UI
A screen is not complete if it is backed by fixture-only/sample-only data. Required production paths must call the real backend contract and correctly render partial/failure states.
