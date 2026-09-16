# ORVIA — common agent agreement

## Authority and objective

Build one customer-local, non-model ORVIA Version 1 prototype for the Cyberfyx internal demonstration. Read, in order:
1. `docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md` — approved product baseline.
2. `docs/prototype/SOURCE_ALIGNMENT.md` and `docs/prototype/EXECUTION_PLAN.md` — bounded sprint addendum.
3. `CURRENT_STATE.md`, `docs/prototype/CONTRACT.md`, `docs/prototype/FILE_OWNERSHIP.md`.
4. Your role prompt and one assigned task from `tracking/tasks.json`.

The master wins on product/security scope. This plan selects demo depth; it does not delete other Version 1 requirements. Custom-model functions remain DEFERRED_V2. A conflict blocks the affected task until resolved; continue unrelated owned work. Do not use historical diff appendices or older kits to override the current numbered master sections.

## Non-negotiable implementation rules

- No shipped model, hosted model API, learned embeddings, training, GPU dependency or AI-draft-import workbench in this sprint. Optional reviewed rule/runbook assistance is P1 only.
- Customer operational records, identifiers, evidence, logs and assets stay customer-local. No vendor analytics, crash uploads, remote fonts, CDN scripts or support upload of operational data.
- Only authorised source/code and synthetic fixtures may be shared with development AI. Never ask for real customer records, production credentials or signing keys in chat.
- Server-side authentication, tenant/principal scope, least privilege and audit apply to every request/job/export. A client role, organisation field or hidden button is not authority.
- Use durable database state. No in-memory queue or localStorage business-data substitute. Acknowledgement is not verification; timeout may mean unknown effect.
- Only allowlisted sandbox targets and operations. No arbitrary SQL, shell commands, arbitrary URLs, real messages or destructive customer actions.
- Preserve application/data version history and accepted withdrawal restrictions. No old event, reset, retry or licence error may silently reactivate marketing.
- No fake dashboard statistics, canned evidence, hardcoded passing tests or pretend real-vendor connectors. Development fixtures are visibly labelled and cannot be shipped as runtime success fallbacks.

## One writer and one ticket

Codex owns contracts, all dependency manifests/lockfiles, migrations, API/server/domain/worker/agent/connector code and infrastructure. Claude Code owns UI and browser tests, excluding API/server files. Work owns architecture decisions, task definitions, state consolidation and review documents. Cowork owns UX/copy/capability inventory/demo/runbook documents. See exact paths in FILE_OWNERSHIP.

Never edit another lane's files to fix a finding. Create a handoff/change request with path, reproduction and acceptance condition. The human may explicitly reassign a bounded path; record the transfer before editing. No parallel writes to the same worktree, database, ports, runtime volume or result file.

## Contract discipline

Before the A00 bootstrap commit, CONTRACT.md and contract_seed.json are the design input. At A00, Codex creates canonical executable schemas in packages/contracts and generated OpenAPI/types/examples. Work reviews the match; Claude Code consumes them. Future semantic changes update the version and dependent tests in one coordinated change. Do not hand-maintain a second UI DTO model or invent an endpoint.

## Evidence and handoff

Start with the task ID, base commit, allowed files and small implementation/test plan. Finish with exact changed files/commit, commands actually run, exit codes, test artifacts, limitations and next dependency using handoffs/TEMPLATE.md. Do not say tests passed without execution evidence. Unexecuted tests remain NOT_RUN; expected regression detection is distinguished from an ordinary passing control.

Do not merge yourself into the shared integration branch, deploy publicly, spend money, change account/privacy settings, grant permissions or reset a database without the appropriate human authorisation. Use normal tool approval/sandbox controls. No permission-bypass flags.
