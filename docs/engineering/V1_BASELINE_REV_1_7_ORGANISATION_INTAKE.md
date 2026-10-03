# ORVIA V1 baseline addendum, revision 1.7: organisation website/app intake and an optional Privacy Centre

**Status:** owner decision recorded 2026-09-30. Additive to the approved master (Rev 1.4) and to the Rev 1.5 and 1.6 addenda. It changes master §20 ("Data Principal Portal") only in the ways listed under "What changes from the master". Everything else in the master still applies.

## The problem the owner raised

The master (§20) requires a customer-branded Privacy Centre: a separate site, served from the client installation, where the organisation's customers sign in to manage consent and make rights requests. The owner pointed out that for most organisations (SaaS, e-commerce and others) customers will not go to a separate site with a separate password. The Privacy Centre would then go unused, and the effort spent on it would be wasted.

That was right, and it was a gap in the original plan. Nobody checked the master's portal against how these organisations' customers actually reach privacy settings. Two facts confirmed it:

- **The law.** Rule 14(1) of the DPDP Rules, 2025 (official G.S.R. 846(E), checked in `regulatory-sources/DPDP-RULES-2025.pdf`): the Data Fiduciary "shall prominently publish on its website or app, or both, as the case may be, (a) the details of the means using which a Data Principal may make a request for the exercise of such rights; and (b) the particulars, if any, such as the username or other identifier of such a Data Principal, which may be required to identify her under its terms of service." The request channel is the organisation's own website or app. The law does not require a separate portal.
- **The code.** Privacy Centre accounts could only be created by staff, one by one (public sign-up is off). That does not scale to an organisation with thousands of customers.

## Decisions (owner, 2026-09-30)

The owner chose "intake plus optional Privacy Centre" over two alternatives: removing the Privacy Centre entirely, or keeping it as it was.

1. **Everything is handled in the Workspace.** Every consent change and rights request lands there, whichever way it arrived. This does not change; requests that arrive by email or phone are still recorded by staff.
2. **Organisation website/app intake (new).**
   - The organisation's own application (for example its customer account site or its app's server) sends consent changes and rights requests for its signed-in customers straight to the client installation.
   - It uses an **intake key** that an organisation super administrator creates in the Workspace (Website & app intake). The key is shown once, only its SHA-256 digest is stored, and it can be revoked at once.
   - The key works only server to server. A request carrying a browser `Origin` or cookies is refused, so the key cannot be placed in a web page.
   - The key can only add and read its own submissions. The local operations runner applies each submission to the registry:
     - a consent change becomes a consent record event with source `SOURCE_SYSTEM`, and a withdrawal then propagates like any other;
     - a rights request becomes a rights request with channel `ORGANISATION_APP`.
   - Identity on a rights request starts established only when the super administrator recorded that the application signs its customers in, **and** the customer identifier matched one Data Principal. Otherwise staff review identity.
   - A submission that cannot be applied is never dropped. It waits for staff with the reason, and staff record what they did.
   - A receipt says the submission was received. It never says that anything downstream has changed.
3. **The Privacy Centre becomes optional, off by default.**
   - A super administrator can turn it on or off in the Workspace, with a reason; every change is kept.
   - While it is off, every Data Principal request is refused with `privacy_centre_not_offered`, and the Privacy Centre pages say the organisation does not offer it.
   - On upgrade, an organisation that already had Privacy Centre accounts keeps it on, so an upgrade never silently takes a working channel away.
   - An organisation without its own website or app can still turn it on.

## What changes from the master

- §20 "Data Principal Portal" and the "Customer-branded Privacy Centre experience" become optional, not required, for each organisation. Their security requirements still apply whenever the Privacy Centre is on: customer-hosted, separate from the Workspace, only the Privacy Centre address exposed.
- The master's example journey ("Acme's client opens Acme's privacy portal ...") is joined by the main journey: "Acme's customer uses Acme's own account page; Acme's server sends the change to Acme's ORVIA installation; an Acme operator sees the result."
- Nothing changes about data location. Intake submissions go from the organisation's own application to its own installation. Nothing passes through Cyberfyx (AGENTS.md; master §§31–36).

## Rule added to prevent a repeat (AGENTS.md)

Every feature meant for the organisation's customers (Data Principals) must state which channel those customers actually use to reach it, checked against Rule 14(1) and the organisation types it is sold to. A question about user behaviour that the master, the law or the owner has not settled goes to the owner as an open question. It is never built on an assumption.

## Known limit, recorded honestly

This installation still accepts **synthetic people only** as Privacy Centre and rights-request principals (`app.principal_references` accepts only `@aster.example` and `@birch.example` addresses; migration 0001). This is the prototype safety rule and belongs to production installation qualification. Until that lands, an intake rights request naming a real address is kept as "needs staff" with that reason, and the real address is not stored. Consent intake is unaffected, because it matches the organisation's own customer identifiers. See `docs/engineering/PRODUCTION_READINESS.md`.

## Implementation (contract 0.48.0)

- Customer migration `0073_organisation_intake.sql`:
  - tables `app.intake_clients`, `app.intake_submissions` and `app.privacy_centre_settings`;
  - resolver `app.resolve_intake_client`, result function `app.intake_result`, and `principal_auth.privacy_centre_enabled`;
  - narrow row-level policies for the intake actor and the runner.
- API:
  - `backend/api/src/intake.ts`: the three routes under `/api/v1/intake/`;
  - staff routes under `/api/v1/admin/intake-clients`, `/intake-submissions` and `/privacy-centre`.
- Domain: `backend/domain/src/registry/intake.ts`. The runner step is in `services/worker/src/operations-runner.ts`.
- Switch: `backend/authorization/src/index.ts`, `authorityFor`.
- Workspace screen: `frontend/src/components/screens/privacy-operations/organisation-intake.tsx` (Website & app intake).
- Developer guide: `docs/integration/ORGANISATION_INTAKE.md`.
- Test: `tests/integration/operations/organisation-intake.test.ts`.

## Owner decision 2026-10-03: the Privacy Centre is a Workspace module

The owner decided that the Privacy Centre is reached and managed inside the existing interface, like every other ORVIA
module, not from a separate entry path:

- **Workspace module.** `Privacy controls → Privacy Centre` (`/workspace/privacy-centre`) holds the on/off switch (super
  administrator only), the address customers use, the pages customers see and where their work arrives (Consent records,
  Privacy requests, Data Principals). The switch moved here from Website & app intake, which now points to it.
- **Plans.** It belongs to `INTAKE_AND_PORTAL` (Foundation), so every plan includes it.
- **Entry page.** The installation's entry page is staff-only; it no longer offers a Privacy Centre card or a Data Principal
  sign-in link, and the not-found page no longer links staff and customer areas side by side.
- **What does not change (security).** Customers never sign in to the staff Workspace. The customer pages (`/privacy/...`)
  remain the Privacy Centre's public face, in their own authentication domain, served only while the switch is on, and
  reached from the link the organisation publishes on its own website or app (Rule 14(1)).
