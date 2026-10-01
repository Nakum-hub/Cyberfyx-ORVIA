# ORVIA V1 baseline addendum, revision 1.9: admitting real people, and email-only identifiers

**Status:** owner decisions recorded 2026-10-01. This addendum adds to the approved master (Rev 1.4) and to the 1.5–1.8 addenda. It settles the mechanism behind go-live step C1 (`docs/GO_LIVE.md`) and the identifier question raised under the "no assumptions" rule.

## What was fixed before

- Migration 0001 accepted only the synthetic addresses `@aster.example` and `@birch.example` in `app.principal_references`. It enforced this with fixed CHECK constraints (`email ~ '@(aster|birch)\.example$'`, `synthetic = true`).
- The contract repeated that rule:
  - `PrincipalCreate.email` regex;
  - `Principal.synthetic` was the literal `true`.
- Because of this, no installation could record a real person, by any route. Revision 1.7 (organisation intake) returns `NEEDS_STAFF` with an explanation when a website or app request names a real person.
- `docs/engineering/PRODUCTION_READINESS.md` listed lifting the rule as part of production installation qualification. The method was left open.

## Decision 1: real people are admitted by a protected command on the installation's server

The owner approved the following.

1. Synthetic-only stays the default on every installation.
2. Someone with administrator access to the installation's server runs the command, once the installation is qualified (`PRODUCTION_READINESS.md`, `GO_LIVE.md` C1):
   `pnpm run principals:admit-real confirm:<profile> admit "<qualification reference>" "<name and role>"`
   - No application screen, API, role or vendor action can do it.
   - The function `app.admit_real_principals` is not granted to any application role.
3. Running it:
   - records the qualification reference, the time, and who ran it;
   - writes an audit event in every environment, attributed to the installation.
4. It is **one-way**. Going back to synthetic-only would strand the real records already held. The admission row cannot be updated or deleted, and a second run is refused.
5. After admission:
   - synthetic addresses are still accepted and are always labelled synthetic;
   - every other well-formed address is labelled real;
   - the database sets the label, not the caller, so neither label can be forged in either direction.
6. The development and test profiles (`codex-a00`, `ui-b00`) refuse the command outright, because they hold synthetic fixtures by design. Customer installations use the installer's `rehearsal` profile (`docs/engineering/linux-installer.md`), which can admit.
7. `pnpm run principals:admit-real confirm:<profile> status` reports the current state.

**Channel (per the "no assumptions" rule):** the people who reach this are the client's server administrator and the client's accountable owner, who approves qualification. Data Principals and ordinary staff never reach it. Cyberfyx never connects to a client installation (revisions 1.5 and 1.6), so it cannot run the command for a client.

## Decision 2: Data Principal identifiers are email only

The owner's position was that email alone is enough. Engineering agreed, for these reasons:

- **Recycled numbers.** Indian operators reassign mobile numbers after a period of inactivity. A rights request or consent change keyed on a phone number can therefore reach, or be made by, a different person. That is a direct DPDP Act s.8(5) and s.11 failure: wrong-person access or correction.
- **Normalisation.** The same subscriber appears as `+91…`, `0…` or a bare 10-digit number, with or without spaces. Matching needs a normalisation rule set. A wrong merge joins two people's records, and a missed merge splits one person's withdrawal from their marketing record.
- **Verification channel.** Proving control of a phone number needs an SMS OTP. In India that means TRAI DLT registration (sender ID and templates) and a paid gateway. That is a vendor dependency and a recurring cost that ORVIA V1 does not otherwise need. It would also carry identifiers to a third party, outside the customer-local rule.
- **Coverage.** Rule 14(1) asks the organisation to publish how Data Principals exercise their rights. The organisation's website and app (revision 1.7) already hold an email for the people they serve, so email covers the intake channel ORVIA supports.

**Recorded rule:** `app.principal_references` identifies a Data Principal by email only, and V1 has no phone-number principals.

- An organisation may still hold phone numbers in its own systems. Those are mapped as data fields: discovery and classification can flag them, and erasure can act on them through a connector. They are never an identifier ORVIA matches people on.
- Reopening this is an owner decision for a later revision. It would need normalisation, recycled-number handling and an SMS verification channel designed together.

## Implementation

- Customer migration `0082_real_principal_admission.sql`:
  - the singleton `app.principal_admission`, with a permanence guard and forced row security;
  - `app.real_principals_permitted()` and `app.principal_admission_state()`, readable by the application;
  - the trigger `principal_reference_admission`, which replaces the fixed CHECKs. Its refusal keeps SQLSTATE 23514 and an email-named constraint, so the intake `NEEDS_STAFF` explanation still applies;
  - an email-shape CHECK;
  - `app.admit_real_principals`.
- `scripts/real-principals.ts` (package script `principals:admit-real`).
- Contract 0.54.0:
  - `PrincipalCreate.email` is any email, and the database decides admission;
  - `Principal.synthetic` is a boolean set by the database;
  - the admin principal route returns 422 `synthetic_principals_only` before admission.
- Test `tests/integration/onboarding/real-principals.test.ts`. It runs against a scratch database seeded as a customer installation, plus a refusal check on the development profile.

## What this does not do

- It does not qualify an installation. Qualification is the checklist in `PRODUCTION_READINESS.md`, and the command only records that it happened.
- It does not import real people. Onboarding stays under the master's data-onboarding sections (Rev 1.4).
- It does not let development AI see real records. The AGENTS rule stands.
