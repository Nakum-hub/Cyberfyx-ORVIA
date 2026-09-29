# Source validation

The `Source validation` GitHub Actions workflow checks pull requests and pushes to `main`, with an optional manual trigger. It installs the Node version from `package.json`, pnpm 12.4.2, and the frozen lockfile, then runs contract drift, type, lint, unit, historical tracking and immutable master-inventory checks.

The workflow needs no repository secrets or customer profile. Its token has read-only repository contents access and is not persisted in Git configuration. Actions are pinned to the verified release commits for [checkout v7.0.1](https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1) and [setup-node v7.0.0](https://github.com/actions/setup-node/commit/820762786026740c76f36085b0efc47a31fe5020). New runs cancel obsolete runs for the same ref.

This closes the missing checked-in static CI definition. It does not make the workflow a required merge check: repository branch protection is an account setting and has not been changed. The first hosted execution is NOT_RUN until this change is integrated and an actual Actions result is available. Installation/network failures remain failures; no registry verification or frozen-lockfile guard is bypassed.

Integration, browser, migration, recovery, capacity, egress and independent assessments still require separate evidence on the identified candidate. A green static job must never promote T01–T34 or an expanded V1 family to accepted. The current merged deletion change has generated-contract drift; Claude's active testing/fix lane must resolve it before that merged source can pass this gate.
