# ORVIA V1: demonstration guide

This runs on your own machine, with synthetic data only. Every number on screen comes from records ORVIA itself created
through its own API, and an automated browser test checks it against the dataset.

## The day before

Run these in the repository folder, in this order. Each prints what it did.

| Step | Command | What you should see |
|---|---|---|
| 1. Get the latest version | `git pull` on branch `claude/upbeat-newton-w4h53x` | Up to date |
| 2. Start ORVIA | `npm start` (leave this window open) | `ORVIA is ready` and the Workspace address |
| 3. Load the demo data (once, in a second window) | `npm run demo:data` | Ends with `Applied by ORVIA: 27 of 27` and `Personal-data breach registered` |
| 4. Fill every other module | `npm run demo:modules` | Every line `ok`, ending `Every module now has demonstration records` |
| 5. Put the two organisations on tiers | `npm run demo:tier -- birch 1` then `npm run demo:tier -- aster 3` | `now enforces FOUNDATION for Birch` / `ENTERPRISE for Aster` |
| 6. Check every screen | `npm run test:e2e:demo-data` | `38 assertions, 0 failures` |
| 7. Check tiers, layout and PDF reports | `npm run test:e2e:demo-tiers` and `npm run test:e2e:demo-report-pdf` | `15 assertions, 0 failures` and `13 assertions, 0 failures` |
| 8. Get the sign-in accounts | `npm run demo:accounts` | Writes `.local/demo-accounts.txt`; open it on your machine |
| 9. Vendor side (optional) | `npm run start:vendor` (third window) | `Vendor sign-in http://127.0.0.1:4340/vendor/sign-in` |

Do **not** run `npm run test:e2e:demo-import` on the demo machine after step 3. It uploads its own test files and adds
people. Use it on a test machine. For the live upload, keep the files in `fixtures/demo/` untouched until the demo
(see `fixtures/demo/README.md`).

Step 3 first takes a snapshot of the databases, for removal afterwards. The first time, it also downloads the official DPDP Act, Rules and notifications from meity.gov.in the first time, unless they are already
on your machine. It refuses to run twice, so the data stays exactly as the test expects. If step 4 reports a failure, do
not demo from that machine. Send me the output.

**Signing in:** use the emails and passwords in `.local/demo-accounts.txt`. When asked for the authenticator code, run
`npm run demo:code owner` (or `admin`, `member`, `reviewer`, `vendor-admin`, `vendor-lead`, …) and type the six digits
within about 30 seconds. The auditor account has no authenticator.

**Leave it running:** ORVIA no longer stops after five quiet minutes (this was fixed and verified). After 30 minutes
without activity, the session ends by design and the sign-in page says why.

## The story (about 15 minutes)

The organisation is **Aster**, an online store. Its customers never sign in to ORVIA. The store's own website sends
their consent choices and privacy requests to ORVIA, and Aster's staff manage everything in the Workspace.

1. **Sign-in** (`https://127.0.0.1:4330/workspace/sign-in`). The shield spins, CYBERFYX and ORVIA slide in, and the form
   rises. Sign in as **owner** and enter the code. You land in the Workspace.
2. **Overview.** Live counts from the database. Nothing on this page is a target or a made-up score.
3. **Privacy Centre** (left menu: Privacy controls → Privacy Centre).
   - *Sources*: the "Aster online store" intake key, with 27 received. Each line names what happened, for example
     "Consent withdrawn: Promotional email and SMS", and shows that it was applied.
   - *Consents*: 19 consent records from the store. 3 people withdrew marketing.
   - *Requests*: access, correction, erasure, grievance and nomination requests, all received through the store, with
     identity established because the store signs its customers in.
4. **Withdrawal actually enforced** (DPDP operations → Operational runs). Each of the 3 withdrawals became a propagation
   run that is **Completed and verified**. ORVIA told the store's system to stop marketing to that person, then read the
   system back on its own to confirm it. Say this sentence: *acknowledgement is not verification*.
5. **Personal-data breach** (DPDP operations → Personal-data breaches). 320 people (estimated), pinned to the DPDP
   regulatory package built from the official gazette. Its Rule 7 tasks show **Not yet in force**: the Rules' breach
   duties commence on 13 May 2027, and ORVIA knows that. This shows the engine follows the law, not a template.
6. **The register behind it**: Notices (published, with withdrawal, rights, grievance and Board-complaint channels),
   Processing activities (one on legitimate use, two on consent), Retention rules (erase on withdrawal; erase 2 years
   after the account closes), Processor engagements (the delivery partner).
7. **Roles.** Sign out, then sign in as **auditor** (no code needed). The auditor can read everything but is refused any
   change. A **member** cannot open the registry at all. The server enforces this; it is not just hidden buttons.
8. **Vendor and auditor side** (if step 9 ran): `http://127.0.0.1:4340/vendor/sign-in`, same branded sign-in. Sign in as
   **vendor-lead** (audit lead) to show engagements, and as **vendor-uploader** through "Client account sign in" to show
   how a client organisation hands over an audit package.

### Part two: what the CEO may ask for (pick what is asked)

9. **Live import from the organisation's own systems** (Privacy controls → Privacy Centre → **Import data**). Upload
   `fixtures/demo/aster-loyalty-app-consent-export.csv`. Before anything is applied, ORVIA shows its review: *67
   event(s) for 33 person(s) will go to Data Principals and Consent records; 2 row(s) cannot be applied* with the reason
   for each (an unregistered activity, a reference with a space). Type a reason and **Approve**. Within seconds the 30
   new customers are in Data Principals and their consent on Consent records. Then upload
   `aster-email-privacy-requests-october.csv`: 8 requests go to Privacy requests with their DPDP deadlines, and the
   "unsubscribe" row is refused as not a DPDP right. Say: *the website sends automatically; staff can import by hand or
   cross-check, and both land in the same records*.
10. **Tiers** (two organisations on the same installation). Sign in as **birch** (Tier 1, Foundation). The left menu marks
    Control and Enterprise modules, Your plan says Foundation, and any write in a locked module is refused by the
    server (`entitlement_required`), while what is already recorded stays readable. Protective DPDP duties (privacy
    requests, withdrawal) are never locked. Sign in as **owner** (Aster, Tier 3, Enterprise): everything is usable.
11. **Organisation roles and new members** (Installation → Team, as **owner**). Fill in the **Add member** form (name,
    work email, role) and submit. ORVIA shows a one-time password once. Click **I have handed it over**. In a private
    window, the new member signs in, must replace the password, then enrols an authenticator. Then show the roles from
    step 7: a member cannot open the registry; the auditor reads everything and changes nothing; the server refuses,
    not just the buttons.
12. **Vendor super admin and admin** (vendor side, `http://127.0.0.1:4340/vendor/sign-in`, as **vendor-admin**).
    *Organisations*: the client organisations, **Add organisation**, **Create vendor account** for a client.
    *Team*: **Add vendor member** (name, work email, role), and ORVIA gives a one-time setup code. The new member opens
    *Set your vendor password* (`/vendor/account-setup`), enters the code and a new password of at least 12
    characters. *Engagements*: the audit work for each client. The vendor never signs in to a client installation.
13. **Reports as PDF** (Operations → Reports). Pick *Board or management pack* or *Response to a regulator or auditor*,
    **Build this report**, then **Save as PDF**. The PDF has a cover (organisation, period, a content digest), what the
    report is and is not, the sections left out, and the tables. **Download every section as CSV** gives the same
    tables as spreadsheets.
14. **The rest of the product, each with Aster records**: Data inventory (the store's datasets, fields and backup),
    Records of processing (gaps named per activity), Frameworks & controls (DPDP working set, 5 controls, 3 risks),
    Continuous compliance (3 automated checks: 2 pass, 1 fails, with the issue it opened), Impact assessments (the
    DPIA for personalised recommendations and its finding), Processor assessments (the courier's due diligence and a
    finding), AI governance (the store's recommendation ranking), Website consent (the store website), Contact
    preferences, Retention (8-year GST retention of orders; a legal hold on support tickets), Representation (a
    nomination), Organisation profile (e-commerce entity, DPO and grievance contacts), Gaps.
    Long screens have an **On this page** bar under the title: click a tab to jump to that part.

## Honest answers to likely questions

- *Is this real data?* No. Every person is synthetic, on a reserved `.example` address. ORVIA refuses real addresses on
  this installation.
- *Does it connect to real systems?* Here, the store is a synthetic records system. Connectors to live systems come in
  the production rollout.
- *Where does customer data go?* It stays on the organisation's own server. Nothing in this demo leaves the machine.
- *Why do some boxes still say "Nothing recorded yet"?* They are records that only exist after an event: releases and
  updates from the vendor, support cases, backups restored, catalog readings of a live database, guided connections to
  real systems. Showing them would mean faking them, which ORVIA does not do.
- *Why are there "Synthetic workflow …" rows on the control map and old test purposes in reports?* This rehearsal
  installation was also used by the automated test suites. A clean installation for the demo removes them (see the
  task list, T2).

## Removing the demo data afterwards

Consent history, audit trail and receipts are append-only by design, so demo records cannot be deleted one by one.
`npm run demo:data` takes a snapshot of the rehearsal databases before it loads anything. To remove the demo data, stop
ORVIA (`npm stop`) and run `npm run demo:remove -- confirm:rehearsal`. Both databases and the sign-in journal go back to
how they were before loading, and anything recorded after loading is removed too.
