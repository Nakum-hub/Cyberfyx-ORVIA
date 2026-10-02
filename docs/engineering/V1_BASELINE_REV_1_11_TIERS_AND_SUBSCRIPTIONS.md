# ORVIA V1 baseline addendum, revision 1.11: tiers, subscriptions and licence lifecycle

**Status:** owner decisions of 2026-10-02 recorded below. Where the owner delegated a choice ("do appropriate and feasible"), the choice and its reasoning are marked **[delegated]** so the owner can overturn it. Prices are the owner's (`₹ —`). A **CUSTOM** tier is reserved; the owner will define it later.
**Replaces:** `docs/engineering/TIERS_PROPOSAL.md` (kept as the earlier draft).
**Basis:** master Rev 1.4 M27/M28 (billing on the vendor website, §658, §3796), addenda 1.5–1.10, DPDP Act s10(2) and Rules r13 (SDF duties, commencing 2027-05-13 per `scripts/regulatory/dpdp-baseline.ts`).

## A. Owner decisions (2026-10-02)

1. **Legal floor in Tier 1.** Every duty the DPDP Act and Rules place on an ordinary Data Fiduciary is achievable on Tier 1. Higher tiers sell automation, verification, scale and assurance.
2. **Trials:** yes, for the higher tiers.
3. **Billing periods:** monthly, quarterly and annual plans.
4. **Plan changes must work:** moving between tiers, changing plans, changing the number of members who can log in, and the other changes listed in section E.
5. **Limits:** features, members and workload all count. Tier 1 is the entry plan and must let a startup vendor survive, so limits protect revenue without breaking compliance.
6. **A fourth, CUSTOM tier** will be defined by the owner later.

## B. SDF rule [delegated]

**The legal facts.** A Significant Data Fiduciary is designated by the Central Government. On top of the ordinary duties it must:
- appoint a Data Protection Officer based in India;
- appoint an independent data auditor;
- carry out a DPIA every 12 months;
- have an audit every 12 months;
- exercise due diligence on algorithmic software.

These duties commence on 2027-05-13. They apply only to designated organisations, which are large by definition.

**Decision.**
1. **Recording and tracking the SDF duties is in every tier, as part of the legal floor.** That covers the DPO and auditor appointment records, the 12-month DPIA and audit clocks, and evidence references. An SDF on any plan can therefore prove it met its duties, even if the work was done outside ORVIA. No plan we sell leaves an SDF unable to comply.
2. **The SDF tooling is in Enterprise:** the in-product DPIA engine with its Board-observations report, the audit exchange and mandate, and algorithmic due diligence through AI governance.
3. **Vendor sales policy:** a designated SDF is offered Enterprise or Custom. If the organisation profile records SDF DESIGNATED on a lower tier, the product shows a persistent, factual notice: "Your SDF duties can be recorded here; the DPIA, audit and algorithm tooling is in Enterprise." It never blocks and never hides anything.

**Why this is fair to both sides.** The customer is never made non-compliant by our plan, which keeps DPDP and our honest-claims rule. The organisations that need the heavy tooling are exactly the large ones, so Enterprise revenue follows the real value. A smaller SDF can still comply on a lower tier by doing its DPIA and audit by hand.

## C. Tiers (each includes the one below)

Engine names reuse the existing editions. Marketing names are the owner's.

| | **T1 FOUNDATION — "Comply"** | **T2 CONTROL — "Automate & verify"** | **T3 ENTERPRISE — "Assure"** | **CUSTOM** |
|---|---|---|---|---|
| Who | Startups, SMEs, one company, one website | Growing companies, several systems and teams | Groups, regulated sectors, SDFs | Defined by contract (owner, later) |
| Promise | Every legal duty, done properly, with evidence | Stop doing it by hand; prove systems obeyed | Board- and auditor-ready, continuously | Any set of entitlements and limits |

**T1 FOUNDATION — the legal floor:**
- staff access with an authenticator, roles, the audit trail and owner recovery (M01, M33);
- 1 legal entity, 1 production and 1 test environment (M02);
- manual registry and RoPA export (M03 manual, EX05 basic);
- consent, withdrawal, preferences, expiry, enforcement for messages ORVIA sends, and the canary trap (M11, EX01 basic, P3);
- notices in all 22 Eighth Schedule languages, with the drift guard (M12);
- the website/app intake API under Rule 14(1), with the optional Privacy Centre (M13);
- every rights request type, with deadlines, manual fulfilment with evidence, and grievance (M14);
- retention rules, erasure records, and the backup treatment and ledger (M15, EX07 basic);
- the processor register, contracts and disposition (M16 basic);
- the breach register, the 72-hour Board clock and notification templates (M17, EX09 basic);
- the cookie banner and script blocking for 1 website (EX02);
- signed evidence, exports and email notifications (M08, M10);
- tracking of SDF duties (section B);
- the platform: onboarding, updates, support bundle and monitoring (M29–M32).

**T2 CONTROL adds:**
- real-time send admission for the organisation's own systems (M04);
- workflow automation and connectors (M05, M06);
- independent read-back verification (M07);
- the coverage and failure centre (M18);
- rights at scale: response packages, redaction, expiring links (EX03);
- discovery, classification, schema drift and website policy discovery (EX04, F1);
- assessments, DPIA, questionnaires and remediation (EX06);
- the third-party lifecycle with supplier links (EX08);
- the organisation's own SMTP/webhook delivery (EX09 delivery);
- legal holds, restore re-erasure and restore coverage review (EX07 full).

**T3 ENTERPRISE adds:**
- the privacy test engine and CI/CD regression gate (M09);
- continuous control tests and drift alerts (EX11);
- GRC policies, control mapping and the audit workspace (EX10);
- data security posture, AI governance and model versions (EX12);
- the DPDPA audit exchange, mandate and continuous assurance (EX17, EX18);
- SDF tooling (section B);
- SSO/SCIM once delivered (GO_LIVE D1);
- priority support terms.

**Never sold at any tier:** the existing `NEVER_LICENSABLE` list (V2 AI functions, vendor remote access, directory sync, proactive diagnostics, runtime replication). Billing stays on the vendor website (M26).

## D. Limits [delegated defaults; owner may change the numbers]

Three kinds of limit, chosen so that no limit can ever make a customer non-compliant.

| Limit | Kind | T1 | T2 | T3 | When exceeded |
|---|---|---|---|---|---|
| Member seats (MEMBER + AUDITOR logins; owner and admins not counted) | Hard | 3 | 15 | contract | A new or reactivated member is refused. Nobody is logged out automatically |
| Staff identities (all logins) | Hard | 5 | 25 | contract | As above |
| Legal entities | Hard | 1 | 3 | contract | Creating another is refused |
| Production environments | Hard | 1 | 3 | contract | Creating another is refused |
| Websites under the CMP | Hard | 1 | 5 | contract | Registering another is refused; existing banners keep working |
| Connected systems (guided connections) | Hard | 0 (systems are recorded by hand; connections are a Control feature) | 15 | contract | Starting another is refused; resuming an already connected system is not; existing connections keep working |
| Automated downstream actions per month | Automation quota | — (manual) | 10,000 | contract | Further actions become **manual tasks**, never dropped. Erasure and suppression always complete, by hand if needed |
| Discovery reads, control-test runs, response packages per month | Automation quota | — | set per plan | contract | Paused until next month or upgrade; nothing already recorded is lost |
| Data Principals, consent events, rights requests | **Soft, true-up only** | measured | measured | measured | **Never refused.** Shown on "Your plan"; included in the signed usage statement at renewal |

**Implementation status (2026-10-02).** Enforced at creation by the server: member seats (0060), websites (`create_cmp_site`, `enable_cmp_site`) and connected systems (`start_connection`), each only when the licence states the limit. Staff identities, legal entities and environments are not created through the product (installation set-up), so they are reported against the licence and not enforced at runtime. The automation quotas are **not yet implemented**. Correction made during implementation: the first draft gave Foundation 2 connected systems, but guided connections are part of `WORKFLOW_AUTOMATION` (Control); Foundation records systems by hand, so its limit is 0.

**Why Data Principals are never capped.** Refusing a rights request or a withdrawal because of a quota would break the law. Volume is therefore billed by true-up at renewal, from the customer's own signed usage statement. There is no telemetry; customer data stays local.

## E. Subscription and licence lifecycle

The customer installation never contacts the vendor. Every commercial change on the vendor website therefore results in **a new signed licence that the customer imports**. The installation applies these rules.

| Case | What the vendor issues | What the installation does |
|---|---|---|
| New subscription (monthly, quarterly or annual) | Licence: edition, entitlements, limits, `term`, `valid_from`/`valid_to` = paid period, `sequence` = 1 | Activates it |
| Renewal | Same plan, next period, `sequence`+1 | Supersedes the previous licence seamlessly |
| Upgrade (e.g. T1→T2) mid-term | New licence effective now, `sequence`+1. Proration and credit are handled on the vendor website | Unlocks immediately |
| Downgrade (e.g. T3→T2) | New licence effective from the end of the current paid period (the usual industry practice) | Until then nothing changes; after, premium **writes and automation stop**, while premium **data stays readable and exportable** |
| Seat increase | New licence, `sequence`+1, effective now | Higher limit at once |
| Seat decrease | New licence effective at renewal | If active members exceed the new limit, nobody is removed automatically. An administrator chooses whom to deactivate; until then new members are refused and a banner explains why |
| Period change (monthly↔annual) | New licence for the new term from the next period | Supersedes at that date |
| Trial of T2/T3 (once per installation per edition, ≤30 days) | Trial licence, `trial: true`, overlaying the paid licence | Trial features unlock. At expiry it **falls back to the paid licence automatically**; trial data stays readable |
| Cancellation | Nothing new | The current licence runs to its end, then grace, then expiry |
| Expiry | — | **Grace:** 7 days (monthly), 15 (quarterly), 30 (annual) with everything working and a countdown banner. **After grace:** new premium work stops; T1 legal-floor functions, protective controls, reading and export **always continue** |
| Wrong or stale licence | — | Refused: signature, audience, installation and edition-ceiling checks (an edition can only carry its own entitlements), and **anti-rollback** (a lower `sequence` than the active one is refused, so an old Enterprise licence cannot be re-imported after a downgrade) |
| CUSTOM | Contract-defined licence | Same mechanics, with explicit entitlements and limits |

**Protective controls, on every tier and in every state:** withdrawal enforcement, the canary hold, suppression, rights and breach deadlines and their reminders, the audit trail, completion of in-flight erasures and their verification, and read and export of everything recorded. A licence state never reactivates marketing (AGENTS rule).

**Monthly friction.** Offline licence import every month is a burden. Mitigations, in order:
1. The vendor pre-issues the next period's licence when payment succeeds, so the customer can import ahead of time.
2. A long grace period.
3. [open owner question] An optional, owner-approved outbound licence check, following the pattern of the audit channel. This is not built and needs a decision, because it adds an outbound connection.

## F. Guardrails (how "a Tier 1 customer never gets Tier 2" is enforced)

1. **One entitlement vocabulary.** One code per gated area in section C (about 20). The edition and term vocabularies gain `CUSTOM` and `MONTHLY|QUARTERLY|ANNUAL|TRIAL|CONTRACT`.
2. **Edition ceiling at import.** A licence whose entitlements exceed its edition is refused (`ENTITLEMENT_EXCEEDS_EDITION`). A vendor issuing mistake cannot open a higher tier.
3. **Every route and runner job declares its entitlement or `PROTECTIVE`.** A unit invariant fails the build if any route is undeclared, if a protective route is gated, or if a legal-floor route is placed above T1.
4. **The server decides.** The dispatcher checks the entitlement before the capability and refuses with `403 entitlement_required` naming the plan. Runner jobs check before acting. Reads and exports of existing data stay open after downgrade or expiry.
5. **Limits are enforced at creation.** Never on rights, withdrawal or breach intake.
6. **The interface follows the server.** Locked items show a plan badge and a one-line value statement, with no dead buttons. "Your plan" shows the edition, term, renewal date, grace, usage against limits, the trial state and what each higher tier adds.
7. **Vendor side.** Each approved plan version maps to an edition, entitlements, limits, term and grace. Issuance takes these from the plan, still with manual review, and stamps the next `sequence`.
8. **Tests.** Every route is walked as T1, T2 and T3. The lifecycle cases (upgrade, downgrade, trial fallback, seat decrease, grace, expiry, anti-rollback, edition ceiling) each have a test. Protective controls are proven to work in every licence state.

## G. Delivery plan

Migrations for this work use the **0100–0119** range, so they cannot collide with Codex round 9, which starts at 0092. The contract moves to 0.56/0.57 in coordination with Codex.

| Phase | Work |
|---|---|
| L1 | Contract: entitlement codes, CUSTOM edition, term, sequence, trial flag, extended limits, rejection codes |
| L2 | Installation licensing: multiple licences (paid + trial overlay), supersession, anti-rollback, grace, fallback, edition ceiling (migration 0100) |
| L3 | Route and runner entitlement declarations, dispatcher and runner enforcement, invariant tests |
| L4 | Limit enforcement (entities, environments, websites, connected systems, automation quota to manual tasks) |
| L5 | Interface: "Your plan" page, locked badges, banners (grace, trial, seat over-limit, SDF notice) |
| L6 | Vendor: plan version → edition, entitlements, limits, term; issuance of renewals, upgrades, downgrades, seat changes and trials with sequence |
| L7 | Tier walk and lifecycle test suites; matrix; handoff |

## H. Open owner questions

1. The numbers in section D.
2. An optional outbound licence check (section E, monthly friction).
3. The CUSTOM tier definition (owner will explain).
4. Marketing names and prices.
