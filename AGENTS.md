# ORVIA — common agent agreement

## Authority and objective

**2026-09-25 user-approved expansion:** also read `docs/engineering/V1_EXPANDED_BASELINE.md` and `tracking/v1-expansion.json`. These add the requested competitor capability families and UPI/card commerce to the V1 delivery target without modifying the immutable 1.4 master or promoting historical acceptance. The user confirmed Claude Code is currently inactive but may resume; consult `handoffs/codex/2026-09-25-active-lane.md` before shared edits/runtime use. Its DPDP lane remains assigned.

**2026-09-28 owner decision (revision 1.5 addendum):** read `docs/engineering/V1_BASELINE_REV_1_5_AUDIT_EXCHANGE.md`: DPDPA external audit exchange, installation kinds `CUSTOMER_INSTALLATION` / `VENDOR_SERVICE`, and the vendor area inside the same application.

**2026-09-29 owner decision (revision 1.6 addendum):** read `docs/engineering/V1_BASELINE_REV_1_6_AUDIT_MANDATE.md`: audit mandate, ORVIA-generated signed evidence, auditor-driven requests over an outbound-only channel, continuous assurance under a separate mandate; file fallback retained. **2026-09-30 owner decision:** real engagements may proceed without an external legal review (recorded in that addendum); a signed engagement letter and processing agreement with each client, and the per-item exception for any personal data, remain required.

**2026-09-30 owner decision (revision 1.7 addendum):** read `docs/engineering/V1_BASELINE_REV_1_7_ORGANISATION_INTAKE.md`: the organisation's own website or app sends consent changes and rights requests to its installation with an intake key (Rule 14(1)); the Privacy Centre is optional and off by default.

**2026-09-30 owner decision (revision 1.8 addendum):** read `docs/engineering/V1_BASELINE_REV_1_8_OWNER_RECOVERY.md`: customer-held owner recovery by a protected command on the installation server (OPEN-07).

**2026-10-01 owner decision (revision 1.9 addendum):** read `docs/engineering/V1_BASELINE_REV_1_9_REAL_PRINCIPALS.md`: real people are admitted on a qualified installation only by a one-way protected command on its server (go-live C1); Data Principal identifiers are email only.

**2026-10-01 owner decisions (revision 1.10 addendum):** read `docs/engineering/V1_BASELINE_REV_1_10_CANARY_AND_CRITERIA_REVIEW.md`: an active withdrawal canary is never admitted for marketing; real-person decoys are allowed but nothing is ever delivered to them; production criteria evidence is shown and acknowledged before approval; a restore older than the erasure ledger is flagged for manual review, never reported as complete.

**2026-10-02 owner decisions (revision 1.11 addendum):** read `docs/engineering/V1_BASELINE_REV_1_11_TIERS_AND_SUBSCRIPTIONS.md`: three tiers plus a reserved CUSTOM tier; every legal DPDP duty on Tier 1; protective controls never gated; monthly, quarterly and annual terms, trials, upgrades, downgrades and seat changes through signed superseding licences; server-side entitlement enforcement. Tier migrations use 0100–0119.

**2026-10-02 owner decisions (revision 1.12 addendum):** read `docs/engineering/V1_BASELINE_REV_1_12_FILE_INTAKE.md`: every file ORVIA uses arrives automatically from a local inbox folder or by manual upload, on every plan, staged until a staff member approves; the vendor installation needs no plan; vendor member credential issuance awaits the owner's design.

**No assumptions about how people reach a feature (added 2026-09-30).** Every feature meant for the organisation's customers (Data Principals) or staff must state which channel those people actually use to reach it, checked against the law (for Data Principals, Rule 14(1)) and against the kinds of organisation it is sold to. A question about user behaviour or product direction that the master, the addenda, the law or the owner has not settled goes to the owner as an open question before it is built. Record the answer in an addendum.

Build ORVIA Version 1 as a customer-local, production-intended product. The earlier internal prototype is historical engineering evidence, not the delivery target. Read, in order:
1. `ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md` (repository root) — approved product baseline, **document revision 1.4** (vendor support and data onboarding update, 19 September 2026). This supersedes `docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md` and `ORVIA_V1_Master_with_Engineering_Breakdown(full idea).md`, both still revision 1.3 and kept only as historical reference — do not treat either as the current baseline for new work.
2. `docs/prototype/SOURCE_ALIGNMENT.md` and `docs/prototype/EXECUTION_PLAN.md` — historical bounded sprint addendum, written against revision 1.3; use as evidence of prior work, not as a limit on Version 1 scope. Re-check any section they cite against the 1.4 master.
3. `CURRENT_STATE.md`, `docs/prototype/CONTRACT.md`, `docs/prototype/FILE_OWNERSHIP.md`.
4. The current task definitions in `tracking/tasks.json` and the recorded owner transfer.

The master wins on product/security scope. Complete all Version 1 requirements for the production-intended build; historical sprint depth does not delete or defer them. Custom-model functions remain DEFERRED_V2. A conflict blocks the affected task until resolved; continue unrelated owned work. Do not use historical diff appendices or older kits to override the current numbered master sections. Never describe a synthetic connector, development licence, or incomplete acceptance as production qualified.

## Non-negotiable implementation rules

- No shipped model, hosted model API, learned embeddings, training, GPU dependency or AI-draft-import workbench in Version 1. Reviewed deterministic rule/runbook assistance remains within the approved Version 1 scope.
- Customer operational records, identifiers, evidence, logs and assets stay customer-local. No vendor analytics, crash uploads, remote fonts, CDN scripts or support upload of operational data. **Sole exception (owner decisions 2026-09-28 and 2026-09-29, `docs/engineering/V1_BASELINE_REV_1_5_AUDIT_EXCHANGE.md` and `docs/engineering/V1_BASELINE_REV_1_6_AUDIT_MANDATE.md`):** DPDPA audit evidence for an engagement, only (a) under a dual-approved audit mandate: personal-data-free evidence generated by ORVIA, signed by the installation and sent by outbound HTTPS to the single vendor audit address in the trust file while the mandate is active; or (b) as a client-approved sealed package (file or the same channel). The vendor never connects to, signs in to or reads a client installation; nothing is inbound.
- Only authorised source/code and synthetic fixtures may be shared with development AI. Never ask for real customer records, production credentials or signing keys in chat.
- Server-side authentication, tenant/principal scope, least privilege and audit apply to every request/job/export. A client role, organisation field or hidden button is not authority.
- Use durable database state. No in-memory queue or localStorage business-data substitute. Acknowledgement is not verification; timeout may mean unknown effect.
- Only allowlisted sandbox targets and operations. No arbitrary SQL, shell commands, arbitrary URLs, real messages or destructive customer actions.
- Preserve application/data version history and accepted withdrawal restrictions. No old event, reset, retry or licence error may silently reactivate marketing.
- No fake dashboard statistics, canned evidence, hardcoded passing tests or pretend real-vendor connectors. Development fixtures are visibly labelled and cannot be shipped as runtime success fallbacks.

## One writer and bounded changes

The user's 2026-09-23 transfer assigns Codex the remaining application, documentation, tracking, review, UX, runbook and delivery work in this checkout. The transfer is recorded in `handoffs/codex/2026-09-23-owner-transfer.md`. Earlier ownership and accepted work remain historical evidence; no task or acceptance result changes solely because its writer changed. The approved source master stays read-only.

On 2026-09-24 the user assigned implementation of `ORVIA_V1_DPDP_Operational_Extension_Pack/` to Claude Code while Codex continues the base V1 build. The lane boundary is recorded in `handoffs/codex/2026-09-24-dpdp-lane-boundary.md`. Coordinate before either lane edits a shared application path or uses a shared runtime resource.

Use one writer for a path at a time. Do not run concurrent work against the same database, ports, runtime volume or result file.

## Contract discipline

Before the A00 bootstrap commit, CONTRACT.md and contract_seed.json are the design input. At A00, Codex creates canonical executable schemas in packages/contracts and generated OpenAPI/types/examples. Work reviews the match; Codex implements the consumers. Future semantic changes update the version and dependent tests in one coordinated change. Do not hand-maintain a second UI DTO model or invent an endpoint.

## Evidence and handoff

Start with the task ID, base commit, allowed files and small implementation/test plan. Finish with exact changed files/commit, commands actually run, exit codes, test artifacts, limitations and next dependency using handoffs/TEMPLATE.md. Do not say tests passed without execution evidence. Unexecuted tests remain NOT_RUN; expected regression detection is distinguished from an ordinary passing control.

Do not merge yourself into the shared integration branch, deploy publicly, spend money, change account/privacy settings, grant permissions or reset a database without the appropriate human authorisation. Use normal tool approval/sandbox controls. No permission-bypass flags.
