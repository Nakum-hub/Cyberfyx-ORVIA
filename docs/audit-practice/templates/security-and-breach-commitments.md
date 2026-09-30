# Security and breach commitments

**Template v1.0.** Annex to the subscription terms and the data processing agreement. Each measure below exists in the ORVIA vendor service as built. Where a measure depends on hosting that is not yet chosen, the text says so.

## 1. Measures

| Measure | What Cyberfyx does |
|---|---|
| Access control | Staff sign in to the vendor portal with mandatory multi-factor authentication. Access is by role; row-level security in the database limits each person to their engagements. |
| Separation of duties | Criteria, methodology, acceptance and reports need a second person. A commercial or implementation owner can never review an engagement. |
| Encryption | Released evidence items are encrypted at rest with per-package keys wrapped by a vault key. All channel traffic is HTTPS. |
| Integrity | Client evidence is signed by the client installation and chained. Cyberfyx outputs are signed with the Cyberfyx audit key, which is held by [[named custodian]]. |
| Logging | Every view and download of evidence, and every administrative action, is logged in the vendor audit trail. Firm policy: logs are kept at least one year. |
| No inbound access | Cyberfyx never connects to a client installation. Clients send only to one address named in their trust file. |
| Hosting | [[Provider, region, certifications]]. Backups are encrypted and kept for [[35]] days. |
| People (firm policy) | Staff are bound by confidentiality. Access is removed on the day a person leaves. |

## 2. If something goes wrong

1. **Contain and assess** at once. The on-call lead is [[role]].
2. **Tell the client without delay, and within 24 hours** of becoming aware of a breach affecting its data. The notice says what happened, what data is affected, when, the likely impact and what Cyberfyx has done.
3. **Help the client** meet its own duties to tell affected people and the Data Protection Board (Rule 7), including the detailed report within 72 hours.
4. Where Cyberfyx is itself the Data Fiduciary (clause 1 data in the processing agreement), Cyberfyx tells the affected people and the Board as Rule 7 requires.
5. **Review** within 14 days and share the corrective actions with the affected clients.

## 3. Client-side measures

These belong to the client: the security of the client's environment, its ORVIA accounts, its backups and its trust file. ORVIA's own controls (multi-factor sign-in, row-level security, audit trail) help, but the client operates them.
