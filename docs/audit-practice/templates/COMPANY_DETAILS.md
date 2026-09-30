# Details Cyberfyx must supply before approving the templates

Cyberfyx fills in part A **once**. These values then replace the placeholders in every template. Part B stays as placeholders and is filled in for each client or engagement.

**Engineering note:** no value below may be invented. Each must come from Cyberfyx's own records or from a management decision.

## A. Filled once by Cyberfyx (company-wide)

| Placeholder | Meaning | Used in | Value |
|---|---|---|---|
| `[[Cyberfyx legal name]]` | Registered company name | all eight | |
| `[[CIN]]` | Corporate Identity Number | engagement letter, subscription terms | |
| `[[registered address]]`, `[[address]]` | Registered office | engagement letter, subscription terms, privacy notice | |
| `[[city]]` | City whose courts have jurisdiction | engagement letter, subscription terms | |
| `[[privacy@domain]]` | Privacy and grievance mailbox | privacy notice | |
| `[[role title]]` | Role that answers privacy questions (e.g. Data Protection Lead) | privacy notice | |
| `[[30]]` (privacy notice) | Grievance response days, at most 90 | privacy notice | |
| `[[8]]` | Years invoices and orders are kept (tax law) | privacy notice, retention schedule | |
| `[[support hours]]` | Support hours and time zone | subscription terms | |
| `[[90]]` (subscription terms) | Days of read-only export after expiry | subscription terms | |
| `[[30]]` (engagement letter) | Invoice payment days | engagement letter | |
| `[[the fees paid for this engagement]]` | Liability cap wording, if different | engagement letter | |
| `[[1.0]]` | Methodology version cited in letters | engagement letter | |
| `[[name, location]]` | Hosting provider for the vendor service, and its location | processing agreement | |
| `[[India / named region]]` | Where Cyberfyx stores client personal data | processing agreement | |
| `[[Provider, region, certifications]]` | Hosting provider details | security commitments | |
| `[[35]]` | Backup retention days | security commitments | |
| `[[named custodian]]` | Person (role) holding the production audit signing key | security commitments | |
| `[[role]]` (security commitments) | On-call lead for incidents | security commitments | |
| Cyberfyx signatory (`[[name, designation]]` on the Cyberfyx side) | Who signs for Cyberfyx | engagement letter, processing agreement | |

## B. Filled per client or engagement (left as placeholders in the approved template)

These placeholders stay in the approved template:
- `[[Client legal name]]`, `[[legal name]]`;
- `[[ENG-reference]]`;
- `[[date]]`, `[[from]]`, `[[to]]`;
- `[[Readiness assessment / Evidence audit]]`, `[[evidence audit / readiness assessment]]`;
- `[[criteria version]]`, `[[criteria digest]]`;
- `[[Fee]]`, `[[schedule]]`;
- `[[board / management]]`;
- client-side `[[name]]`, `[[designation]]`, `[[name, designation]]`, `[[role]]`;
- `[[none / list]]`, `[[none / which]]`;
- `[[not designated / designated, notification reference]]`.

## Check before approval

After filling in part A, this must print nothing except part-B placeholders:

```
grep -oh "\[\[[^]]*\]\]" docs/audit-practice/templates/*.md | sort -u
```

Then follow `README.md` → "Approving a version".
