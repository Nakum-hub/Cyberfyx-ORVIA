# Retention and deletion schedule

**Template v1.0.** Annex to the data processing agreement and the audit methodology.

| Record held by Cyberfyx | Retention | How it is deleted | Proof |
|---|---|---|---|
| Released evidence items and delivered snapshots and responses (content) | Engagement close + retention period. Default **90 days**; set per engagement from 1 to 3650 days in the engagement letter. | Vendor retention sweep erases the encrypted content, keys and delivered documents | `vendor.retention_purges` row with counts and bytes; the client can request written confirmation |
| Digests, times and receipts of deliveries (no content) | 8 years | Kept as the audit trail | n/a |
| Working papers, findings, signed report, corrections | 8 years from the report date | Deleted by the practice lead after 8 years | Deletion log |
| Anything under an active legal hold | Until the hold is released or expires | As above, when the hold ends | Hold record |
| Client staff account data | See the privacy notice | Deleted on account closure plus the stated period | n/a |
| Vendor portal sign-in and access logs | 1 year minimum | Deleted after 1 year | n/a |
| Orders and invoices | [[8]] years (tax law) | Deleted after the period | n/a |

**Operation:** until the sweep is scheduled automatically, the Cyberfyx practice lead runs the retention sweep in the vendor area on the **first working day of every month**, and records the run.

A client may ask for earlier erasure of its released items once the report is issued. Cyberfyx then sets that engagement's retention to the shortest period consistent with its working papers.
