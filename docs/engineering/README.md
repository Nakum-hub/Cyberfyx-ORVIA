# Engineering documentation

Start with the [repository README](../../README.md) for the current code map and supported commands. The approved product source is the revision 1.4 master at the repository root; [CURRENT_STATE.md](../../CURRENT_STATE.md) and [tracking/capabilities.json](../../tracking/capabilities.json) record current implementation limits.

## Operator and developer entry points

- [Local packaging and operation](local-packaging-and-operation.md) — current synthetic rehearsal commands and their limits.
- [Local development](local-development.md) — original isolated development profile instructions; verify against current scripts before use.
- [Repository inventory](REPOSITORY_INVENTORY.md) — A00 bootstrap snapshot, retained for provenance, not a current-state inventory.

## Implementation history

These documents describe the implementation at their recorded task/version. The filenames name the engineering responsibility; the task identifiers remain inside each document for audit history.

- [Executable contract proposal](executable-contract-proposal.md) and [contract change history](contract-change-history.md)
- [Dependency selection](dependency-selection.md)
- [Authentication and scope](authentication-and-scope.md)
- [Workflow and agent](workflow-and-agent.md)
- [Send admission](send-admission.md)
- [Evidence and reconciliation](evidence-and-reconciliation.md)
- [Regression and recovery](regression-and-recovery.md)

Historical `handoffs/` and review artifacts retain A00/A01-style identifiers because those are task and evidence IDs. Numbered SQL migrations retain order because changing applied filenames would break migration identity.
