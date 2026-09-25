# ORVIA Version 1 — Agent build specification pack

**Authority:** product document revision **1.4**, supplied by the user.  
**Code evidence:** GitHub `main` pinned for this pack to `5a07649e5115995406e62de00b73e2c9fc560060`.  
**Purpose:** finish the remaining approved V1 product in the existing `cyberfyx_orvia` project, retaining useful implementation and tests.  
**Not included:** a day-by-day schedule, a new product scope, application scaffolding, a replacement repository or edits to the idea/master.

## Read in this order

| File | Owns | Read when |
|---|---|---|
| [AGENT_BUILD_RULES.md](AGENT_BUILD_RULES.md) | Mandatory boundaries, anti-bloat rules, task/review protocol | Every agent, every work session |
| [PRD.md](PRD.md) | User outcomes, modules, requirements, scope/exclusions, success criteria | Before choosing or implementing a feature |
| [REPOSITORY_BASELINE_AND_TRANSITION.md](REPOSITORY_BASELINE_AND_TRANSITION.md) | What the inspected fragment contains, gaps and safe continuation | Before assuming a feature/path/test is complete |
| [TDD.md](TDD.md) | Technical design, modular boundaries, transactions, runtime composition | Backend, platform and integration work |
| [USER_FLOWS.md](USER_FLOWS.md) | Actor journeys, permission checks, alternate/failure paths | UI, domain implementation and acceptance |
| [DESIGN_BRIEF.md](DESIGN_BRIEF.md) | Information architecture, screen contracts, accessibility and truthful states | Interface and content work |
| [DATA_MODEL.md](DATA_MODEL.md) | Data ownership, logical fields/relations, constraints, migrations and retention | Any persistent state or query change |
| [API_AND_EVENT_CONTRACTS.md](API_AND_EVENT_CONTRACTS.md) | Existing contract compatibility, proposed additions, errors/events/state transitions | Any API, job, SDK or connector change |
| [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) | Threat boundaries, control requirements and release blockers | Every sensitive change and release |
| [TEST_AND_ACCEPTANCE.md](TEST_AND_ACCEPTANCE.md) | Source acceptance cases, executable scenario detail and evidence requirements | Implementation, QA and release review |
| [ENGINEERING_PLAN.md](ENGINEERING_PLAN.md) | Retained role/WP ownership, dependencies and small integrated delivery units | Assignment and integration; no calendar schedule |
| [DECISIONS_AND_TRACEABILITY.md](DECISIONS_AND_TRACEABILITY.md) | Open decisions, source references and 218-section routing | Before resolving ambiguity or making claims |
| [traceability.json](traceability.json) | Machine-readable module/WP/requirement/test/section links | Agent retrieval and coverage validation |
| [manifest.json](manifest.json) | File hashes, source identity and document validation | Handoff/integrity checks |
| [Approved source master](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md) | Unchanged complete product requirements and historical audit | Resolve exact source wording and source priorities |

## Authority and meaning

1. Current explicit user decisions and the supplied revision 1.4 active sections govern product scope. Historical diff appendices and the older attached 1.3 combined master are not competing specifications.
2. Repository code establishes observed implementation only. It cannot override the customer's data boundary or turn a synthetic route into an approved real connector.
3. These documents translate the master into implementable requirements. `DESIGN` details are proposed engineering mechanisms, not previously approved legal/provider/physical-schema facts. Record meaningful choices in the existing decision register before dependent work; never silently guess unresolved commercial or security commitments.
4. Existing executable schemas remain the wire-format authority until deliberately versioned. Do not create another hand-maintained schema implementation from examples in this pack.
5. An agent's initial status is **unverified at its current working commit**. Read the actual files and run the relevant checks. Source presence, tests at an ancestor, a commit message and production acceptance are different facts.

## How to use the pack without adding repository clutter

Place this directory once under an existing suitable documentation location, for example `docs/build-spec/`, after checking for an equivalent maintained location. That location is a proposal, not a required source-code move. Keep one copy of each active specification; link to it from current engineering instructions. Do not paste copies into every module or generate per-agent variants. The source copy here is byte-identical reference material; do not overwrite a different existing master or edit it.

Assign an existing WP and a bounded requirement set. Read only the associated design/data/API/flow/test sections plus global rules. Implementation should produce source, migrations where required, tests and minimal updates to maintained documentation. Do not create a second PRD/TDD/roadmap to announce that coding will start.

**Repository ownership conflict:** the inspected AGENTS file still carries historical prototype role transfers. The four-track arrangement below is the user's intended development model, but actual path ownership must be recorded before concurrent writes. Do not override an active lock or another agent's work merely by reading this pack.

**Fixed development scope:** Version 1 non-model platform; custom ORVIA Intelligence is V2. No full staff-directory sync, employee-activity feed, customer-runtime replication, proactive vendor diagnostics or live vendor remote access. Optional rules-based Guided Assistance does not delay required error handling or direct support.

**Completion rule:** implement and integrate actual behaviour for the approved supported scope. An explicit unavailable state is safer than fake success during construction, but an unavailable required feature still prevents declaring the full V1 scope complete. External provider selections, legal approval, measured support matrices and independent assessment remain named dependencies.
