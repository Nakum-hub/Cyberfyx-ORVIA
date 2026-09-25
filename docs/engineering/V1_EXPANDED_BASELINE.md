# ORVIA expanded Version 1 baseline

Revision E1 — 25 September 2026. Status: authorised scope expansion; implementation and release acceptance incomplete.

## Authority

The user explicitly instructed: “Expand V1 to the listed competitor capabilities; define a revised baseline”, confirmed UPI and card payments, and authorised appropriate implementation while Claude Code is inactive. This additive baseline extends the immutable revision 1.4 master. It does not rewrite that master or erase its requirements, historical evidence or release gates. `tracking/v1-expansion.json` tracks these additional delivery families separately from the historical prototype board.

The objective is competitive functional coverage across privacy, data discovery, consent, compliance automation and enterprise governance. A vendor's marketing claim is research input, not an ORVIA acceptance result. Equality or superiority must be demonstrated for named functions and supported integrations on a qualified release; neither a feature count nor a synthetic test establishes it.

The expansion does not require an ORVIA model runtime. Discovery/classification and assistance can use deterministic rules and reviewed content. Customer AI governance is included; M19–M25 model training/inference remain deferred under the existing explicit restriction. Any later removal of that restriction needs a specific architectural decision. Customer-local operational data, independent effect verification, least privilege, durable history and no vendor remote access remain requirements.

## Delivery families and acceptance

| ID | Required delivery | Evidence required before completion |
|---|---|---|
| EX01 | Universal consent/preferences, purpose/channel subscriptions, versioned notices, withdrawal propagation and preference centre | Authenticated web/SDK journeys; current-at-effect decisions; stale replay, expiry, conflicts and offline/restart cases; actual supported downstream readback |
| EX02 | Website CMP, authorised cookie/tracker scanning, script/category control, multilingual configuration, consent records and applicable preference signals | Allowlisted test-site crawl, discovered versus declared inventory, network-before/after-consent assertions, withdrawal, keyboard/accessibility, regional rule provenance; interoperability certification separately verified |
| EX03 | Full rights lifecycle: intake, identity/representation, search, correction, deletion, holds, redaction, reviewed response package and secure delivery | Ambiguous identity refused, per-copy scope, cross-principal denial, partial target failures, redaction leakage tests, expiry/revocation of delivery, current independent observation |
| EX04 | Discovery/classification across supported databases, object/files and APIs; scheduled scans, provenance, freshness, conflict review and source/code flow analysis | Named source conformance, least-privilege reads, bounded workload, rule version and measured false positives/negatives, drift/restart, unsupported sources visible; no claim of autonomous universal coverage |
| EX05 | Data mapping/RoPA: assets, activities, purposes, recipients, locations, transfers, owners and change impact | Source-linked graph traversal, reviewed declarations distinguished from reads, versioned processing records, bounded complete exports, stale/missing links and tenant isolation |
| EX06 | General PIA/DPIA/SDF and AI assessments, reusable versioned questionnaires, risk treatment, independent approval and remediation | Required questions/evidence enforced, distinct reviewer, unresolved findings block approval, immutable revisions, overdue/retest and escalation histories; reviewed legal applicability |
| EX07 | Retention/legal hold/deletion orchestration, backup-copy obligations and supported crypto-erasure | Hold conflicts fail closed, per-copy outcome and independent readback, uncertain effects reconciled, current restrictions survive restore, key custody and crypto limits assessed |
| EX08 | Third-party lifecycle: inventory, due diligence, questionnaires, agreements, processing restrictions, periodic reassessment and remediation | Scoped supplier portal/assignment, expiring evidence, purpose/region restrictions, subcontractor links, onward obligations and actual versus attested outcomes |
| EX09 | Incidents, breach investigation, evidence preservation, reviewed notification, delivery and follow-up | Awareness/clock uncertainty retained, immutable corrections, reviewed audience/content, transport failures and receipts, linked control remediation; no invented regulator endpoint |
| EX10 | Enterprise GRC: versioned frameworks/requirements/control mappings, policy lifecycle, risk register, audit plans/requests, auditor access and issue management | Reused evidence retains scope/time, independent audit access, control tests derive status, approved risk acceptance expires, historical mappings remain reproducible; no certification by score |
| EX11 | Continuous compliance: scheduled control tests, connector evidence, drift, alerts, remediation and auditor reporting | Durable scheduling/retries, actual deliberately broken controls detected, stale/error/manual evidence explicit, deduplicated customer-controlled delivery and test history |
| EX12 | Data security posture and AI governance: data/access exposure, sensitivity and purpose rules, AI-use inventory, assessment, monitoring and incidents | Measured supported-source access posture; current source receipts; policy violations yield findings; no model/data uploads or claims that declarations establish observed behaviour |
| EX13 | Vendor Account, commercial orders, UPI/card checkout, invoices, subscriptions, renewals/refunds, entitlements, downloads and scoped human support | Separate vendor storage/identity; approved prices/terms; verified provider events; duplicate/concurrent/out-of-order/refund tests; no card secrets; no operational records; actual provider sandbox before activation |
| EX14 | Enterprise delivery: identity/SSO/recovery, local installer/upgrades, signed supply chain, export, backup/DR, accessibility, capacity, operations and support | Named deployment/provider matrix; clean install/upgrade/restore; 1M-record representative workflow on declared hardware; independent security/legal review; frozen candidate, complete acceptance and human release approval |

Every family requires canonical contracts, server authority, tenant/principal isolation, durable persistence, complete loading/error/empty/permission UI states, audit, positive/adverse tests, operator instructions and exact-build evidence. A static page, generic CRUD form, connector stub or passing unit suite alone does not complete a family. All existing 36 work packages remain in scope except explicitly deferred model work.

The complete numbered-master review index is `tracking/v1-source-inventory.json`, reproducibly checked with `tsx scripts/v1-source-inventory.ts --check`. It preserves all 218 numbered sections and their exact source locations/content hashes. It is an omission check, not a claim that 218 sections are implemented; each applicable requirement still needs reviewed mappings and exact-build acceptance. Historical appendix diffs are excluded from the numbered-section index and cannot override the active master.

## Engineering decisions and external activation

UPI and cards are approved payment methods. Engineering will use provider-hosted payment collection: ORVIA stores opaque payment/order references and minimum commercial facts, never PAN, CVV, UPI PIN or bank credentials. Monetary amounts use integer minor units and immutable server-side catalogue versions. Browser callbacks cannot mint entitlements. Verified capture and a durable unique issuance request are distinct from licence issuance. Refunds/disputes retain history and never remotely relax customer privacy controls.

The provider-neutral event/store boundary can be completed before payment-provider selection. Live provider onboarding, real prices/tax/renewal/refund policy, production signing custody, legal content, independent assessment and support promises are external decisions. Unresolved activation is explicit, not a fake success. No external purchase, account change, live payment or public deployment is authorised by this baseline.

Implementation order: shared contract/evidence/identity foundations; commercial verified-event boundary and general governance; complete consent/CMP and rights/action pipelines; real-source conformance and discovery; retention/vendor/incident/compliance automation; full deployment and exact-build release qualification. Work may proceed across independent files, but only one writer may own each shared path and runtime resource.

## Research basis

Checked 25 September 2026. These sources describe vendor scope, not independently verified performance or ORVIA parity:

- [OneTrust DSR](https://www.onetrust.com/products/data-subject-request-dsr-automation/): intake, identity, discovery/deletion, redaction and response inform EX03.
- [OneTrust consent/preferences](https://www.onetrust.com/solutions/consent-and-preferences/): CMP and cross-system consent inform EX01–02.
- [OneTrust privacy automation](https://www.onetrust.com/solutions/privacy-automation/): mapping, notices and privacy operations inform EX05–09.
- [Securiti DSR](https://securiti.ai/products/data-subject-request-automation/): portal, identity and secure fulfilment inform EX03.
- [Vanta GRC](https://www.vanta.com/products/grc) and [risk overview](https://help.vanta.com/en/articles/11345378-risk-management-product-overview): broader control/risk/audit workflows inform EX10–11.
- [Drata evidence](https://help.drata.com/en/articles/13404035-evidence-overview) and [risk](https://drata.com/products/risk): evidence lifecycle and enterprise risk inform EX08/10/11.

BigID, ServiceNow, MetricStream, Sprinto, Scrut, the India-oriented peers and specialist scanners in the user's supplied comparison remain comparison targets. Their exact editions, source support and commercial boundaries need function-level verification before making comparative claims. This baseline already includes the requested capability families; absence of a verified vendor claim does not delete the engineering requirement.
