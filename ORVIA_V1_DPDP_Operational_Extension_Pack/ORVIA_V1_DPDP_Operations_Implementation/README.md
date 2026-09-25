# ORVIA V1 DPDP Operations Implementation Package

## Purpose
This package is the build specification for extending the completed ORVIA V1 product with the DPDP operational capabilities defined here. It is intended for direct implementation in the real ORVIA repository after the current V1 build is complete.

This is not a strategy document, roadmap, or planning-only package. The expected result is a working ORVIA V1 product with the extension implemented, integrated, migrated, tested, and verified.

## Tool-neutral execution
This package is intentionally neutral about the coding environment. It may be implemented using Codex, Claude Code, another coding agent, or a human engineering team. No requirement depends on a specific agent, model, IDE, shell, or workflow.

The implementation system has freedom to inspect the repository, choose the safest repository-consistent implementation method, create or modify the files required by the existing architecture, and refactor locally when needed for correct integration.

It must not invent legal facts, customer facts, schemas, APIs, or product behavior that conflict with repository truth or the official DPDP regulatory source set.

## Existing V1 is the source of truth
Before implementation, inspect the completed V1 repository. Reuse its actual frameworks, package structure, database, migration system, API conventions, frontend architecture, IAM, jobs/events, evidence mechanisms, connector framework, deployment approach, and test tooling.

Do not replace unrelated working V1 functionality merely because another design is preferred. Extend the existing system cleanly.

## Scope
The extension must support applicable personal-data operations for all relevant Data Principals, including organisation-specific roles such as patients, customers, SaaS users, consumers, employees, former employees, students, applicants, guardians/representatives, sellers, prospects, visitors, and other configured categories.

It must support both:
- personal data that existed before ORVIA deployment; and
- personal data created or processed after ORVIA deployment.

## Required outcome
The completed product must operationally support the DPDP capabilities described in this package, including the Data & Processing Registry, Regulatory Core, notices, consent lifecycle, rights, privacy centre, retention/erasure, processors, breach workflows, evidence, verification, coverage/failures, Attention, notifications, IAM integration, SDF-specific capabilities where applicable, migrations/backfill, and connector execution.

## Testing approach
Do not waste compute or credits by running the entire test suite after every file edit. Use the stage-gated testing strategy in `quality/TESTING_STRATEGY_AND_RELEASE_ACCEPTANCE.md`.

During coding, use only the minimal checks needed to prevent obvious broken states, such as a focused compile/typecheck/lint or a targeted test for a risky change. Run the comprehensive automated and end-to-end suites after the implementation coding stages are complete and the integrated product is ready for validation.

## Package structure
- `requirements/` — product requirements and required behavior.
- `architecture/` — system integration and domain model contracts.
- `backend/` — backend services, APIs, jobs, persistence, workflows, and enforcement.
- `frontend/` — internal ORVIA UI and Privacy Centre implementation requirements.
- `shared/` — shared cross-layer contracts and state semantics.
- `regulatory/` — official-source regulatory core and versioning rules.
- `integrations/` — connectors, downstream execution, and independent verification.
- `security/` — IAM, security, evidence, audit, and destructive-action safeguards.
- `data/` — migrations, backfill, and existing-data onboarding.
- `quality/` — final validation, acceptance, and release gates.
- `implementation/` — execution rules and build order.

## Completion standard
Documentation alone is never completion. Required paths must contain production implementation, real persistence, real APIs/UI/jobs/connectors where applicable, real migrations, authorization, evidence, and verified tests. Placeholder data, fake passes, TODO-only delivery, hard-coded success, and fabricated evidence are prohibited.
