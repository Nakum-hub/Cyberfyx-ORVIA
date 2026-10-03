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
| 4. Check every screen | `npm run test:e2e:demo-data` | `38 assertions, 0 failures` |
| 5. Get the sign-in accounts | `npm run demo:accounts` | Writes `.local/demo-accounts.txt`; open it on your machine |
| 6. Vendor side (optional) | `npm run start:vendor` (third window) | `Vendor sign-in http://127.0.0.1:4340/vendor/sign-in` |

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
8. **Vendor and auditor side** (if step 6 ran): `http://127.0.0.1:4340/vendor/sign-in`, same branded sign-in. Sign in as
   **vendor-lead** (audit lead) to show engagements, and as **vendor-uploader** through "Client account sign in" to show
   how a client organisation hands over an audit package.

## Honest answers to likely questions

- *Is this real data?* No. Every person is synthetic, on a reserved `.example` address. ORVIA refuses real addresses on
  this installation.
- *Does it connect to real systems?* Here, the store is a synthetic records system. Connectors to live systems come in
  the production rollout.
- *Where does customer data go?* It stays on the organisation's own server. Nothing in this demo leaves the machine.
- *Why do some screens say "Nothing recorded yet"?* The demo data covers the DPDP core. Other modules (AI governance,
  assessments, third parties, and so on) work and are tested, but have no demo records yet.

## Removing the demo data afterwards

Consent history, audit trail and receipts are append-only by design, so demo records cannot be deleted one by one.
`npm run demo:data` takes a snapshot of the rehearsal databases before it loads anything. To remove the demo data, stop
ORVIA (`npm stop`) and run `npm run demo:remove -- confirm:rehearsal`. Both databases and the sign-in journal go back to
how they were before loading, and anything recorded after loading is removed too.
