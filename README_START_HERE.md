# ORVIA — prototype sprint execution kit

**Prepared:** 16 September 2026 · **Plan:** 1.0 · **Product:** ORVIA Version 1
**Purpose:** An internal working demonstrator for Cyberfyx leadership, not a production release.

The user reports that half a day of a two-day deadline has elapsed. This kit budgets approximately **36 elapsed hours remaining**, including integration, rest, testing, rehearsal and contingency. R0 means the resumed execution start recorded by the human owner. It does not reset the original deadline or grant another 48 hours. Record the actual presentation deadline in Asia/Kolkata when known.

## Start in this order

1. Read `docs/prototype/EXECUTION_PLAN.md` and `AGENTS.md`.
2. Put the **existing, approved, unmodified** `ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md` in `docs/source/`. It is referenced, **not bundled**, because its full file bytes were not available in this creation environment. Do not mistake the source summary for the master. The earlier handoff records SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`; verify the local file rather than assuming a match.
3. Give `prompts/02_CODEX_BACKEND.md` to Codex for **A00**. It must inspect the actual repository, preserve working code, check the machine, commit a shared scaffold and generate/freeze contracts. No wholesale rewrite of an existing application.
4. In parallel, give `prompts/01_CHATGPT_WORK.md` to ChatGPT Work for **W00**, and `prompts/03_CLAUDE_COWORK.md` to Cowork for **C00**. They can work on the supplied documents immediately.
5. Give `prompts/04_CLAUDE_CODE.md` to Claude Code. It reads the UI brief immediately; **B00 implementation starts from the A00 bootstrap commit** in a separate worktree. No independently generated second application.
6. The human accepts the scaffold/contract, creates isolated worktrees, then integrates small tickets. Keep `CURRENT_STATE.md` factual. Agents write only their own handoff directories; Work is the designated state-file editor, with human approval.

Every new session needs actual access to the relevant files or attachments. A filename, ZIP link, ChatGPT project membership or another model's conversation does not automatically give a session repository access. A document-only session returns a patch/deliverable and says what it could not execute.

## Kit contents

- `docs/prototype/EXECUTION_PLAN.md`: scope, operating logic, schedule and cut rules.
- `docs/prototype/CONTRACT.md`: API, state, transaction and security semantics.
- `docs/prototype/FILE_OWNERSHIP.md`: single-writer boundaries and integration protocol.
- `docs/prototype/TASK_BOARD.md`: generated readable task/dependency board.
- `docs/prototype/ACCEPTANCE.md`: generated acceptance matrix; application tests start NOT_RUN.
- `docs/prototype/UX_BRIEF.md`: screen, copy and interaction requirements.
- `docs/prototype/DEMO_SCRIPT.md`: live walkthrough and honest fallback.
- `docs/prototype/RELEASE_CHECKLIST.md`: clean install, isolation, recovery and evidence gates.
- `docs/prototype/SOURCE_ALIGNMENT.md`: current-source precedence and deliberate prototype adaptations.
- `prompts/`: four ready role prompts plus a reusable ticket continuation prompt.
- `tracking/`: machine-readable task, acceptance, capability and contract indexes.
- `handoffs/TEMPLATE.md`: factual handoff format.
- `scripts/validate_prototype_kit.py`: validates this planning kit's internal references; it is **not an ORVIA application test**.

This is a mergeable **sprint addendum**. Do not blindly overwrite existing AGENTS/CLAUDE instructions, project configuration or other documentation when importing it. Preserve the approved product master. Treat earlier prototype kits as historical where they conflict with Version 1's non-model release or the customer-local boundary.

## What exists now

The planning files, role prompts, task/test definitions and structural validator exist. No ORVIA runtime repository was inspected, deployed or tested in preparing this kit. Application implementation status is **NOT_INSPECTED**; newly assigned sprint tasks are **NOT_STARTED**, and application acceptance cases are **NOT_RUN**. A target depth is not completion evidence.
