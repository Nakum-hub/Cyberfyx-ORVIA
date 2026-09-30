# ORVIA leadership demo script

**For:** Cyberfyx CEO, co-founder and team. **Length:** about 40 minutes. **Data:** synthetic only. Every number on screen is read live from the demo database; nothing is canned.

## Before you start (5 minutes)

1. Codex has both installations running on the demo laptop (see "Demo set-up" at the end):
   - client installation: `http://127.0.0.1:4310`;
   - vendor installation: its own port, the one on the Codex handoff.
2. Open two browser windows side by side: **left = client**, **right = vendor**.
3. Have the synthetic sign-in details from Codex's handoff ready: the client owner, the client reviewer, the vendor administrator and the lead auditor. Each has an authenticator code.
4. Say this once, at the start, because the screens show it:
   - "Everything is synthetic. The black bar says so."
   - "TEST FIXTURE means the law rule set is our test copy until the official signed one is installed."
   - "DEVELOPMENT key means the audit signature is a test key."
   - These labels are the product being honest. Don't hide them.

## Part 1: the client organisation's ORVIA (25 minutes)

Sign in as the **client owner**. The sign-in needs the password and then an authenticator code, because staff sign-in always requires MFA.

| # | Sidebar item | Show | Say |
|---|---|---|---|
| 1 | Overview | Live counts: controls verified, needing attention, outcome unknown, failed actions | "Counts come straight from the database; ORVIA never invents a score. Unknown stays unknown." |
| 2 | Operations attention | The prioritised list of what needs a person | "Every item says why and what to do next." |
| 3 | Purposes & policies, then Processing activities | A purpose, its legal ground, its activities | "Consent or a named legitimate use under s.7, for every activity." |
| 4 | Notices | Versioned notices in Indian languages, each with a content digest | "The consent record points at the exact notice version the person saw." |
| 5 | Website consent | Banner configuration and visitor consent records | "Script blocking until consent, proven per visitor." |
| 6 | Consent records | A record: grant, withdrawal, evidence | "Withdrawal is as easy as giving." |
| 6a | Consent records → Consent Managers | The register of Board-registered Consent Managers; a record linked to one; a withdrawal it relayed | "Consent Manager withdrawals are always honoured, even if the Consent Manager is later suspended (s.6(7)–(9), applies from 13 May 2027)." |
| 6b | Website & app intake | The intake keys, submissions received from the organisation's app, one applied withdrawal, one waiting for staff; the Privacy Centre switch | "Customers never visit ORVIA. The organisation's own account page sends the change here, and a withdrawal propagates like any other. The Privacy Centre is optional and off unless they want it." |
| 7 | Operational runs | A consent-withdrawal run and its verification | "We don't trust an acknowledgement; ORVIA reads the target system back." |
| 8 | Privacy requests | Access, correction, erasure, grievance and nomination requests and their states | "Grievance clock: 90 days, from the official Rule 14." |
| 9 | Personal-data breaches | A breach with its timers | "Board intimation without delay, and the detailed report in 72 hours (Rule 7(2)(b), checked against the official text)." |
| 10 | Processors, then Processor engagements | Agreements, restrictions, terminations and data return | "No processor without a valid contract: s.8(2)." |
| 11 | Retention rules & holds, then Retention outcomes | Rules, holds, the Rule 8(2) intimations panel, erasure outcomes including "effect unknown" | "Third Schedule erasure waits until the person was told 48 hours earlier, and stops if they come back (Rule 8(2)). A backup is never reported as erased." |
| 12 | Data inventory and Catalog observations | Systems, data assets, classification results with measured quality | |
| 13 | Frameworks & controls, then Continuous compliance | DPDP framework controls, scheduled control tests, drift alerts | |
| 14 | Impact assessments and Processor assessments | A DPIA with independent approval | |
| 15 | AI governance | AI systems register | |
| 16 | **DPDPA external audit** | **Gap register:** 33 requirements, applicability, controls, **ORVIA indicators** (32 of 33 have automatic evidence; the Board complaint channel is procedure only). Evidence files, engagements. | "This is what Cyberfyx audits against." |
| 17 | Open an engagement in DPDPA external audit | **The audit mandate:** what the client authorised, both approvers, channel health, auditor requests, deliveries | "The client approves once, with two people. From then on ORVIA sends signed, personal-data-free evidence to Cyberfyx on its own, outbound only. Cyberfyx can never log in." |
| 18 | What the vendor can see | Every check-in, delivery and refused request, with digests | "Nothing leaves without appearing here." |
| 19 | Audit trail | Every action by every person | |

## Part 2: Cyberfyx's vendor area (12 minutes)

Sign in as the **vendor administrator**.

| # | Page | Show | Say |
|---|---|---|---|
| 1 | Overview | "Needs attention" and the practice cards: clients, engagements by stage, clients under mandate, deliveries, findings, reports | "Leadership sees counts only. Evidence stays with each engagement team." |
| 2 | Organisations, then Licences | Client organisations and their licences | |
| 3 | Engagements, then open one | The engagement workspace tabs: overview, scope, plan, evidence, working papers, findings, report | "Acceptance, independence and conflicts come first. A commercial owner can never be the reviewer." |
| 4 | Evidence tab | Signed deliveries from the client, the chain intact, and auditor requests | "Each delivery is signed by the client's installation and chained to the last one, so nothing can be removed or backdated." |
| 5 | Findings, then Report | Findings with severity; the signed report | "Opinion as of a date, for a stated scope. Never a certificate. The report goes only to the client." |
| 6 | Audit practice | The four activation gates, all "Missing" | "This is why no real engagement can start yet: management template approval, the official law rule set, and the production audit key. That's our to-do list, not a bug." |
| 7 | Support cases, Payments | Payments show test mode | "Live payments switch on with the Razorpay merchant account." |

## Part 3: honest status (3 minutes)

**Working now (on synthetic data):**
- every screen above;
- 450 page visits crawled with no errors, as every role, on desktop and phone;
- sign-in verified in Chromium, Firefox and WebKit.

**Before the first real client:**
- the four gates on the Audit practice page;
- hosting;
- live payments.

**Built this week:** Consent Manager support and the 48-hour notice before Third Schedule erasure. No Consent Manager is registered with the Board yet, so there is no live one to connect.

**Connectors:** they are simulated today. A client's first installation is connected to its real systems.

## Demo set-up (Codex, on the demo laptop)

See the Codex prompt in the chat. The result must be:
- both installations running;
- one client environment with the audit engagement and mandate data from the journeys;
- the sign-in details in Codex's local handoff, never in the repository.
