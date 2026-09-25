# Implementation Rules

## Mission
Build the ORVIA V1 DPDP Operations extension into the completed ORVIA V1 repository and return a verified working product. The final result is implementation, not a plan.

## Tool and agent neutrality
Use any capable implementation environment: Codex, Claude Code, another coding agent, IDE automation, scripts, or a human engineering workflow. These rules define product correctness, not how the implementer must think or which tool it must use.

The implementer may create the necessary files, refactor locally, inspect the repository, run commands, and choose repository-consistent technical approaches needed to complete the build.

## Repository-first rule
Inspect the completed V1 before changing code. Treat actual repository structure, schemas, conventions, APIs, IAM, jobs, connectors, evidence mechanisms, deployment, and tests as implementation truth.

Do not replace unrelated working V1 architecture merely because a different architecture is preferred.

## No invented assumptions
Do not guess facts required for legal or customer-specific behavior.

Resolve implementation questions in this order:
1. existing repository behavior/schema/configuration;
2. this implementation package;
3. authoritative official DPDP source material for legal behavior;
4. explicit configurable/unknown state when the fact is genuinely customer-specific or unavailable.

If one point remains unresolved, continue all non-blocked implementation. Isolate the unresolved point clearly rather than stopping the entire build or inventing an answer.

## Real implementation only
Required deliverables are working production code/configuration/schema/migrations/UI/APIs/jobs/connectors/tests as applicable.

Do not finish with planning-only Markdown, pseudo-code, architecture-only output, TODO stubs, fixture-only APIs, fake evidence, hard-coded passes, or claims that tests passed when they were not run.

## Preserve V1
Keep unrelated existing functionality intact. Make the smallest repository-consistent integration changes needed. When an existing public contract must change, provide the required migration/compatibility path according to V1 conventions.

## Legal-source discipline
Executable DPDP behavior must be traceable to the official-source regulatory core. If package prose and a current authoritative official source conflict at implementation time, use the authoritative source for legal behavior and update the mapping/tests accordingly. Do not silently invent an interpretation.

## Data-fact discipline
Do not infer patient/customer/employee status, purpose, consent, notice delivery, retention period, processor relationship, legal hold, SDF designation, guardian relationship, breach scope, or similar customer facts without evidence/configuration.

Unknown is a legitimate state.

## Execution result discipline
Keep requested, dispatched, target-accepted, target-completed, independently-verified, failed, inconclusive, and unsupported states distinct.

## Destructive-action safety
For erase/delete/anonymise and similar actions, implement the configured scope checks, holds/exceptions, authorization/approval, idempotency, dry-run/impact visibility, post-action verification, and immutable evidence required by the specifications.

## Testing discipline
Do not run the full test suite after every file or change. Follow `quality/TESTING_STRATEGY_AND_RELEASE_ACCEPTANCE.md`.

Use minimal targeted checks while coding only when useful. Perform comprehensive unit/integration/functional/regression/security/performance validation at the defined stage gates after coding is integrated.

## External dependencies
When live production systems are unavailable in the development environment, implement the real production connector/client contract as far as the repository permits and use clearly identified test adapters for automated validation. Never claim a test adapter proves live production connectivity.

## Documentation
Update repository documentation to match the implementation that actually exists. Do not use documentation as a substitute for code.

## Final implementation report
Report:
- actual repository changes;
- migrations applied;
- APIs/UI/jobs/connectors implemented;
- official regulatory source/package versions used;
- tests and acceptance scenarios actually run with results;
- end-to-end paths verified;
- real environment-dependent limitations;
- isolated unresolved customer/product facts, if any;
- existing V1 regression status;
- produced commits/files.

Do not label an unimplemented item as done.
