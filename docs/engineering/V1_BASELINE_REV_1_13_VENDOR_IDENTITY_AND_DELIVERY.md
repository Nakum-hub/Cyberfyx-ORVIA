# ORVIA V1 baseline addendum — revision 1.13: vendor identity, website provisioning, vendor licence, code delivery

**Status:** owner decisions, 2026-10-02. Does not modify the 1.4 master; read with revisions 1.5–1.12.

## A. Owner decisions

| Question | Decision |
|---|---|
| Where vendor accounts and the vendor database live | **One central vendor service** holds all vendor accounts and records (organisations, engagements, licences issued, audit work). Members run the tool on their own devices now (start-up, work from home) and on company devices later; both must work. |
| How the company website manages vendor accounts | The website **calls the vendor service**; the vendor service is the only store of accounts. A later company product needs **separate credentials that never collide** with ORVIA's. |
| What proves a member is who they say when first setting a password | A **one-time setup code** (or the administrator sets the password). Reinstalling the tool later only asks for email and password. |
| Hosting of the central vendor service | **Decide later.** Build and test locally first. |
| Company website (Hostinger) | Still being built; once V1 is complete it will offer the installer, as happens locally today. |
| Vendor licence | A **separate licence** for the vendor service so it can never collide with customer (subscription) licences. |

## B. Architecture

**Central vendor service** (the existing `VENDOR_SERVICE` installation). One server and one PostgreSQL database hold vendor accounts, client organisations, engagements, licences issued, audit evidence and the audit trail. Members reach it over HTTPS.

**Member devices (bring-your-own now, company devices later).** Nothing about a client is stored on a member's device by ORVIA: the device holds only a session. A member who reinstalls, or moves to another device, signs in again with the same work email and password; nothing is lost and no password is set twice. Authenticator (MFA) is mandatory for every vendor login; deactivating a member ends all their sessions at once. For company devices later, the same model applies, with device management added by the company's IT; no product change is required.

**Recommended member "tool" (open question, see E):** the member opens the vendor service address in their browser (installable as a desktop app from the browser), so there is nothing to keep updated on each laptop. A thin desktop launcher that only opens that address can be added later if wanted. Running a full local vendor installation per member is not recommended: it would copy client evidence onto personal laptops and need data synchronisation.

**First password.** An administrator adding a work email either sets the password, or issues a one-time setup code (single use, 72 hours by default, locks after five wrong attempts, only its digest stored). The member enters email, code and new password at `/vendor/account-setup`. A forgotten password is reset the same way with a new code. Administrators cannot touch the super administrator; only the super administrator manages administrators. Vendor migration 0101.

**Website provisioning.** The website calls `/api/v1/vendor/provisioning/accounts` (list, create, re-issue setup code, deactivate) with a provisioning client created on the vendor server (`pnpm run vendor:provisioning-client`). Every request is signed (HMAC-SHA256) over the product name `ORVIA`, method, path, timestamp (300 s window), a single-use nonce and the body digest; scopes limit what each client may do; a super administrator can be created only while none exists. The website never handles passwords: it receives a setup code to send to the person, who sets the password at the vendor service. Request format and a signing helper for the website: `shared/contracts/src/vendor-provisioning.ts`. Vendor migration 0102.

**Separate credentials for a future product.** Provisioning clients are bound to the product `ORVIA` (database check and the signed string), vendor accounts live only in the ORVIA vendor database, and the future product gets its own service, database and keys. A key issued for the other product is refused here even if it were presented with the correct secret (tested). If the company later wants one sign-in for both products, that is a deliberate single-sign-on decision, not a side effect.

**Vendor service licence.** Audience `ORVIA_VENDOR_SERVICE`, its own key (`.local/vendor/signing/service-licence.json`), its own table; limits active vendor member logins (administrators not counted) on every path; only the super administrator imports it; it can never be read as a customer licence and a customer licence can never be imported as it (tested). Commands: `pnpm run vendor:service-licence keys confirm:local` and `issue confirm:vendor-a00 <seats> <days>`. Vendor migration 0103.

## C. Source code and installer delivery

- **Source code** stays in the company's **private GitHub organisation repository**, never on Hostinger and never on any customer machine. Protect the main branch (reviews required, no force-push), enable secret scanning and two-factor for every GitHub member.
- **Installers never pull from GitHub.** Giving installers a GitHub token would leak the whole repository. Instead: a build job (GitHub Actions, or a company build machine) produces a release package; the package is **signed with the release key**, which ORVIA installations already verify (`import_release`); the signed package is uploaded to the download location the website links to. The release signing key should not live in GitHub: keep it on a company-controlled signing machine (or an HSM/cloud KMS in India) and sign there.
- **Credentials.** Nothing secret is ever committed: `.local/` and `.env*` are git-ignored, and this branch's commits contain no key files (checked). Each installation generates its own database and session secrets at install time. Developer laptops keep development keys only; production keys (release, licence, service-licence, audit) are created once in company custody and never copied to laptops or the repository. The vendor server's own secrets belong in that server's protected profile or a secret manager.

## D. Hosting the central vendor service (decision deferred)

- **DPDP position [Likely, not legal advice]:** the DPDP Act does not require all personal data to stay in India; section 16 lets the government restrict transfers to notified countries, and sector rules (for example RBI payment data) can be stricter. Source code is not personal data, so GitHub is fine. The vendor database holds vendor staff work emails and client-organisation contacts and audit evidence, which are personal data or confidential; hosting it in an **Indian region** is the prudent choice for client trust and future restrictions.
- **Options:** a managed cloud region in India (AWS Mumbai/Hyderabad, Azure Central India, Google Cloud Mumbai/Delhi) or an Indian provider (e.g. E2E Networks), with managed PostgreSQL, encrypted backups and monitoring; or a VPS (including a Hostinger VPS in an Indian data centre if offered) where the company manages database, backups and patching itself. The website itself can stay on Hostinger shared hosting.
- Whatever is chosen: HTTPS only, database not reachable from the internet, daily encrypted backups tested by restore, and the vendor installer (`vendor:init`) run on that host.

## E. Open questions for the owner

1. **Member tool on devices:** browser (installable web app) now, with an optional thin launcher later — or a full desktop installer from the start? (Recommendation: browser now.)
2. **Who sends setup codes by email:** the website (it receives the code from the provisioning API) or the vendor service (needs an outgoing mail account)? Until decided, the administrator hands the code over.
3. **Vendor super administrator recovery:** if the only super administrator loses access, recovery should be a protected command on the vendor server (as revision 1.8 does for customers). Not built yet.
4. **Hosting choice** for the central vendor service (section D).
