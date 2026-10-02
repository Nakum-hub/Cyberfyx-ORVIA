# ORVIA go-live: the steps only people can do

These are the actions left before Cyberfyx runs a **real** audit engagement or a client uses ORVIA on real data. The code refuses real use until they are done. Several can run in parallel with Codex's acceptance testing. Each step names who acts, what they need and where the detailed procedure is.

**Never** paste keys, key files, passwords or client records into chat, tickets or the repository.

## A. Vendor (Cyberfyx) audit practice: the four activation gates

The vendor area → **Audit practice** shows each gate as Missing or Recorded. Real engagements are refused until all four are recorded.

| # | Step | Who | How | Gate it clears |
|---|---|---|---|---|
| A1 | Fill in part A of the company details (legal name, address, signatory, contacts) and put them into the templates | Cyberfyx management | `docs/audit-practice/templates/COMPANY_DETAILS.md`, then `docs/audit-practice/templates/README.md` "Approving a version" step 1 | (needed for A2) |
| A2 | A director approves the engagement letter and the processing agreement (version and SHA-256 digest of each) | A Cyberfyx director | Same README, steps 2–3 | (needed for A3) |
| A3 | Record the two template gates with the reference `<file> v1.0 sha256:<digest>, approved by <role> on <date>` | Vendor super administrator | Vendor area → Audit practice → Record activation gate | **Engagement letter template approved**, **Processing agreement template approved** |
| A4 | Create the production audit signing key on the vendor host: `pnpm exec tsx scripts/vendor-audit-key.ts generate confirm:production-audit-key`. Record the printed fingerprint in the key custody register. | The named key custodian | Tool prints only the key id, public key and fingerprint; the private key stays in the file (mode 0600). `docs/runbooks/VENDOR_HOSTING_READINESS.md` "Trust distribution and key custody" | (needed for A5) |
| A5 | Record the key gate with the key ceremony reference | Vendor super administrator | Audit practice → Record activation gate. It is refused while a development key is in use. | **Production audit signing key** |
| A6 | Build the official law rule set from the official PDFs in `regulatory-sources/`, resolve the open verification items, and sign it with the release key | Release key custodian | `docs/regulatory/DPDP_CONFORMANCE.md` "How to supply the official PDFs", then "Then, for either option" steps 1–2 | (needed for A7) |
| A7 | Upload the signed package as production criteria | Lead auditor or administrator | Audit practice → **Record production criteria** (upload the signed `.json`). Only a PRODUCTION package signed with this service's release key is accepted. | (needed for A8) |
| A8 | Approve the production criteria, then record the gate with the package version and signature reference | A reviewer who did not upload it, then the super administrator | Audit practice → Criteria versions → Approve; then Record activation gate | **Production criteria** |

After A1–A8, each real engagement still needs its own signed engagement letter and processing agreement with that client, and its own acceptance decision (AGENTS.md; revision 1.6 addendum).

## B. Each client installation

| # | Step | Who | Where |
|---|---|---|---|
| B1 | Approve the same signed law rule set in the client installation (import, then a second person approves) | Client super administrators | Workspace → Regulatory packages; `docs/regulatory/DPDP_CONFORMANCE.md` step 3 |
| B2 | Give the installation the vendor's public keys, including the new audit public key from A4, and the vendor audit service address | Cyberfyx, with the installation | The installation's trust file; `docs/runbooks/VENDOR_HOSTING_READINESS.md` |
| B3 | Connect the client's real systems | Cyberfyx with the client | Needs the client's own test system first; every connector today is synthetic |
| B4 | Connect the client's website or app to intake (if the client will use it) and decide whether to turn the Privacy Centre on | Client super administrator and the client's developers | Workspace → Website & app intake; `docs/integration/ORGANISATION_INTAKE.md` |

## C. Before any real data

| # | Step | Who | Status |
|---|---|---|---|
| C1 | Qualify the production installation, then the client's server administrator runs `pnpm run principals:admit-real confirm:rehearsal admit "<qualification reference>" "<name and role>"` (one-way; revision 1.9). Until then a request naming a real person cannot be recorded. | Cyberfyx engineering and the client, owner approval | Open: mechanism built (`docs/engineering/V1_BASELINE_REV_1_9_REAL_PRINCIPALS.md`); qualification itself open (`docs/engineering/PRODUCTION_READINESS.md`) |
| C2 | Host the vendor service | Cyberfyx | Open (`docs/runbooks/VENDOR_HOSTING_READINESS.md`) |
| C3 | Switch payments to live (Razorpay merchant account): merchant KYC, approved prices and GST treatment, keys placed in `.local/vendor/commerce/razorpay.json` by the operator (never in chat), network allowance, sandbox conformance | Cyberfyx | Open; blocks EX13 vendor commerce live payments (billing is the vendor website's concern; M26 is deliberately not built in the customer runtime) |
| C4 | Independent penetration test and dependency/secret review | Outside testers | Open |
| C5 | The 34 acceptance scenarios on the frozen candidate | Codex runs them; Claude Code reviews with `scripts/acceptance-review.ts` | In progress (Codex Phase B) |
| C6 | Release approval | Owner | After C1–C5 |

## D. Decisions and inputs still open (recorded 2026-10-01)

Only the owner or Cyberfyx can settle these. Each is needed before the item it names can be called qualified. None of them can be supplied in chat.

| Step | What | Who | Blocks |
|---|---|---|---|
| D1 | Choose the identity provider for staff single sign-on and SCIM provisioning (or confirm V1 ships without them) | Owner | EX14 enterprise identity |
| D2 | Decide custody of the production release and licence signing keys (who holds them, where, and the ceremony) | Owner, Cyberfyx directors | Signed updates and licences in production (M27, M31) |
| D3 | Provide or approve hardware for the 1-million-record qualification run | Owner | EX14 capacity claim |
| D4 | Obtain the text of corrigendum G.S.R. 892(E) and any later amendments to the DPDP Rules: this environment cannot reach the Government hosts | Owner or legal | A6 official law rule set |
| D5 | Arrange the TLS acceptance run on a rehearsal installation that has fixture users (the clean rehearsal install has one first-run owner and must not be seeded) | Codex, on the Windows rehearsal path | `tests/security/tls.test.ts` (NOT_RUN here) |
| D6 | Build the packaged runtime image `orvia-local:prototype`, so the egress-denial network test can run against it | Codex, Windows packaging path | `tests/security/network-core.ts` (NOT_RUN here) |
| D7 | Approve merging the delivery branch into main, once the final regression battery and Codex's review are green | Owner | PR #37 |

The current verification evidence for every module, family, important function and presentation claim is in `docs/engineering/V1_VERIFICATION_MATRIX.md`. It is generated from executed results only.

## What can start today, in parallel

A1 and A2 (paperwork), A4 (key ceremony, once the vendor host exists) and A6 (signing the law rule set) do not depend on Codex's testing. Starting them now removes them from the critical path.
