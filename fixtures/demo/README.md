# Synthetic demonstration data (delete after the V1 CEO demo)

**Every person, address and reference here is invented.** All addresses are on the reserved `aster.example` domain,
except one deliberately "real-looking" `example.com` row that ORVIA must refuse. The owner will delete this folder
after the V1 demonstration (owner instruction 2026-10-03).

These files are for the **Import data** button (Privacy Centre → Import data, or Files → "Import data from your own
systems"). They refer to the store's system and activities **by name**, so they work on any installation where
`npm run demo:data` has run (it registers "Aster online store", "Promotional email and SMS" and "Personalised
recommendations").

| File | What it is | What ORVIA should show on upload (before approval) | After approval |
|---|---|---|---|
| `aster-crm-consent-export.csv` | Small CRM consent export, 8 rows | Consent export (CSV): 6 events for 4 people go to Data Principals and Consent records; 2 rows cannot be applied (activity "Loyalty points newsletter" is not registered; decision "maybe") | 4 people in Data Principals; their consent events on Consent records, source "imported history" |
| `aster-helpdesk-privacy-requests.csv` | Helpdesk log, 5 requests | Privacy requests (CSV): 4 requests can go; 1 row cannot ("refund" is not a DPDP right) | 3 requests in Privacy requests; the `example.com` requester is refused (synthetic people only) |
| `aster-loyalty-app-consent-export.csv` | Loyalty app export, 69 rows: 30 new customers, 3 cross-check rows for customers the website already reported, 2 bad rows | Consent export (CSV): 67 events for 33 people; 2 rows cannot be applied (unregistered activity "Birthday offers"; reference with a space) | 30 new Data Principals; withdrawals for 4 of them are recorded (marketing stays blocked for them); cross-check rows sit beside the website's own records for cust_1002, cust_1003, cust_1005 |
| `aster-email-privacy-requests-october.csv` | Privacy mailbox, 9 requests | Privacy requests (CSV): 8 requests can go; 1 row cannot ("unsubscribe" is not a DPDP right) | 8 requests in Privacy requests (access, erasure, correction, grievance, nomination), each with its received date and DPDP deadline |

Suggested order in front of the CEO: the loyalty export first (largest visible effect: Data Principals and Consent
records grow by 30), then the October requests (Privacy requests list and deadlines). The two small files show the
"rows that cannot be applied" review clearly. Each file can be uploaded once per installation. A second upload of the
same file is staged again and the consent events add to the history, so do not repeat uploads during the demo.

Other demonstration data is created through the API rather than from files:
- `npm run demo:data`: the store, purposes, notice, 14 customers, consent from the store, 5 requests, a breach, a processor and the data inventory.
- `npm run demo:inventory`: only the data inventory and privacy graph, for an installation where demo:data already ran.
- `npm run demo:tier -- <aster|birch> <1|2|3>`: puts an organisation on a tier with a signed licence.
- `npm run demo:remove`: removes the demonstration data from the rehearsal installation.
