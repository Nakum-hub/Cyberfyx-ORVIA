# ORVIA — Security and privacy implementation contract

**Product:** ORVIA Version 1 · **Build-pack edition:** 1.0 · **Prepared:** 19 September 2026  
**Authority:** [Approved master, document revision 1.4](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md) · **Repository baseline:** `5a07649e5115995406e62de00b73e2c9fc560060`  
**Purpose:** Required trust boundaries, threat controls and production release evidence; not legal or security certification.

This is an implementation specification, not evidence of completed software. `REQ` denotes a source-derived requirement, `OBS` a repository observation, `DESIGN` a proposed implementation detail, and `OPEN` a decision requiring its named owner. Exact technical shapes not supplied by the master are labelled design proposals; they do not silently become product or legal facts. Follow [Agent build rules](AGENT_BUILD_RULES.md).

## 1. Security objective and limits

Protect the customer-local runtime, identities, control/evidence integrity, privileged connectors, software supply chain and the vendor's limited business/support services. No absolute 'unbreachable' or 'zero vulnerability' promise. The source requires no unresolved confirmed applicable Critical/High issues and prohibits particular boundary failures regardless of numeric severity. Independent assessment and retesting remain prerequisites to the declared production scope. Sources: [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§109](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-109), [§126](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-126), [§163](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-163), [§164](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-164), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§168](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-168), [§206](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-206).

Do not interpret customer hosting as protection against every authorised host administrator or compromised local process. Encryption, signatures and local deployment are controls with specific threat assumptions, not complete proof. Security requirements are common across editions.

## 2. Data-location contract

| Information | Customer runtime | Vendor services |
|---|---|---|
| Principal identifiers, consents, requests, workflow/action/evidence records | Required where justified and protected | Prohibited, including masked/hashed/encrypted derived copies |
| Local member/role directory and employee operational activity | Scoped local administration | No sync, directory or activity feed |
| Operational files, raw logs, traces, screenshots, backups, imports | Locally protected/minimised/retained | Prohibited normal support contents |
| Customer credentials/MFA/recovery/signing/decryption keys | Customer-held secret/identity infrastructure | No custody, escrow, universal reset or support backdoor |
| Business account and nominated contacts | Separate optional local mapping | Necessary disclosed business/contact/licence fields only |
| Licence/download transactions | Local verification records | Commercial assignment, artifact request and necessary service/security metadata |
| Diagnostics | Draft/preview/approval and local detailed context | One explicitly approved strict-schema report with allowed fields only |

Vendor no-data rules do not mean an authorised employee browser or direct principal response never receives information; those are scoped customer workflows. External customer SaaS/messaging connections need their own approved boundary and cannot be advertised as strict no-external-processing. No vendor relay for that data. Sources: [§5](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-5), [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§33](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-33), [§34](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-34), [§75](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-75), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132).

## 3. Threat/control/acceptance register

| ID | Threat | Required implementation | Proof |
|---|---|---|---|
| SEC-01 | Cross-organisation, sibling environment/subtenant or principal disclosure | Server-derived scope, explicit query predicates, constraints/RLS, object/search/job scope | API/DB/worker/search/export denial and pooled-context reuse tests |
| SEC-02 | Vendor privilege becomes customer root | Independent issuers/audiences/stores/keys; no token exchange or impersonation | Vendor token/password-reset/licence cannot authenticate/control local runtime |
| SEC-03 | Owner duplication, invitation replay or admin self-elevation | One-owner transaction, current delegable grants, single-use invites, MFA/recovery | Concurrency/revocation/expired-token and last-owner tests |
| SEC-04 | Stale consent/policy authorises an effect | Monotonic epoch, exact purpose/notice, current-at-use checks and bounded revocation freshness | Reordered/duplicate grant, new consent versus old deletion, lock-wait expiry |
| SEC-05 | Scope expands after approval | Immutable plan digest, target generation, policy/actor/budget/expiry binding | Edited plan or expired authority rejects before effect |
| SEC-06 | Forged/replayed agent command or malicious plugin | Independent signature/scope/nonce verification, per-connector secret/network sandbox, no arbitrary execution | Wrong tenant/installation/key/version/replay/budget and secret-crossing tests |
| SEC-07 | Unknown external effect blindly repeated | Recorded attempt, explicit unknown, supported receipt/read reconciliation and idempotency | Worker death/lost response after effect does not trigger unsafe duplicate |
| SEC-08 | Unsafe database onboarding | Dedicated service identity, TLS validation, selected resources, read-only first, permissions test | Discovery account cannot mutate; no root credential or vendor database exposure |
| SEC-09 | SSRF or unrestricted REST connector | Reviewed endpoint/network policy, validation through redirects/resolution, bounded approved ports/routes | Reject unsupported metadata/internal endpoints outside explicitly granted customer scope |
| SEC-10 | File/parser/archive injection | Local quarantine, type/size/expanded-size limits, random paths, isolated parser, no public scanner upload | Traversal, archive bomb, malformed input, active content and forbidden external fetch |
| SEC-11 | Diagnostic schema becomes a data-exfiltration channel | Public enum/value allowlists, bounded exact fields, immutable approved payload/destination, no rejected-body logs | Canary/unknown/free-text/oversized fields and changed report approval denied |
| SEC-12 | Support adds hidden remote control | No remote desktop/shell/SQL/tunnel/session credentials/endpoints or proactive job | API/config/build/upgrade/entitlement checks prove excluded paths absent |
| SEC-13 | Update/licence compromise | Separate signing authority; trusted manifest verification; safe unpack; customer approval; no executable licence fields | Tamper/wrong signer/downgrade/command-in-licence/replayed trust tests |
| SEC-14 | Evidence manipulation or false verification | Append corrections, independent observations, hashes/signatures, explicit freshness/scope/limits | Tampered bytes detected; manual/provider assertion never silently upgraded |
| SEC-15 | Logs/cache/exports bypass locality or retention | Local observability, minimised fields, scoped cache keys, retention and purge | Sensitive canaries absent from vendor endpoints, browser third parties and export errors |
| SEC-16 | Restore resurrects revoked identity or consent | Quarantine, customer-held current safety recovery, authority/epoch/egress reconciliation | Restore old snapshot cannot enable withdrawn use or excluded support setting |
| SEC-17 | Compromised/dead provider changes billing/entitlement truth | Verified callbacks, event dedupe, order binding, transition audit | Forged/duplicate/out-of-order payment events do not issue contradictory rights |
| SEC-18 | Resource exhaustion and unsafe customer load | Bounded queues/pools/requests/uploads/concurrency/retries/spool, circuit breakers | Load and failure tests preserve control availability and safe rejection |
| SEC-19 | Browser code leaks privileged server modules | Server-only exports and validated public response models; local assets/CSP | Build/import checks and network inspection reveal no secrets or remote telemetry |
| SEC-20 | Model work reintroduced under 'intelligence' | V1 manifests/build/dependencies contain no learned model/inference/training; rules helper read-only | Model endpoints/keys/GPU absent while core and direct support work |

This is a source-derived control allocation with proposed proof methods, not a completed threat assessment. Expand a task's threat analysis when it introduces a real new boundary; do not add generic checklists without applicable tests.

## 4. Identity and key custody

Separate vendor release signing, vendor licence signing, customer connector-command signing, customer session trust and customer encryption. A public verification key is not authority to decrypt or execute. Secrets are not committed, displayed in chat, included in export samples or copied to diagnostic archives. Use the selected reviewed library/store rather than custom crypto.

Privileged MFA, session expiry/revocation, scoped service credentials and recovery are implemented in their actual trust domain. Customer recovery must be possible without vendor-held secrets, and must not bypass the single-owner invariant. Production access, independent publication/review and emergency custody decisions need named human responsibility; an AI lane is not an approved signatory.

## 5. Network and runtime defaults

Customer databases and orchestration/admin consoles are not publicly exposed. Serve portal ingress separately with minimal permissions. Workload components deny vendor/outside egress by default; narrowly admitted licensing/update and exact approved support transfer cannot be repurposed for activity data. Local browser assets/fonts/scripts and telemetry collectors stay local. A direct customer-approved external processor is a distinct explicitly disclosed configuration.

Test both backend and browser traffic, DNS/redirect paths, error reporting, package update logic and dependency telemetry. An allowlisted JSON shape alone does not prove a compromised process cannot exfiltrate; combine application validation with credentials, runtime isolation and customer network controls. Sources: [§20](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-20), [§30](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-30), [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§34](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-34), [§37](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-37), [§87](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-87), [§88](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-88), [§110](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-110), [§111](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-111), [§116](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-116).

## 6. Vendor's own privacy responsibilities

Designated-contact names/work emails and service records still require the vendor's documented minimisation, security, retention/correction/grievance/rights and accidental-submission process. Publish the exact field/source/purpose/destination/access/retention inventory and obtain qualified review before public collection or claims. This pack preserves the master's legal-source baseline and does not newly validate commencement dates, sector applicability or lawful processing grounds. Legal content is a versioned reviewed configuration, not invented conditional code. Sources: [§31](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-31), [§95](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-95), [§132](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-132), [§135](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-135), [§165](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-165), [§166](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-166), [§167](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-167), [§168](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-168).

If prohibited material arrives accidentally, stop propagation, restrict access, follow the documented boundary-incident/minimisation/deletion process and do not use it to debug or train. Do not promise such an event is impossible. Support must be useful through reviewed public runbooks, synthetic reproduction and customer-run diagnostics.

## 7. Release gate and finding lifecycle

A release record identifies exact commit/build/digests, scope/profile/dependencies, threat review, tests, SBOM/scans, independent assessor/retest, egress and backup/restore results, limitations and sign-off. No unresolved applicable Critical/High finding; suspected blocking findings must be fixed or independently evidenced as not applicable/false-positive. No score-based waiver for cross-tenant disclosure, auth bypass, arbitrary privileged execution, unsafe destruction, vendor operational-data egress, exposed key or missing verification.

Other accepted risks need owner, impact, compensating controls, expiry and remediation obligation. Keep findings received → scoped → fixed/mitigated → independently retested → advisory/root-cause regression. Publish a monitored vulnerability route, supported versions and staffed response process. Do not invent 24/7 coverage or remediation deadlines; operations commitments are OPEN until approved. Two AI reviews are not an independent penetration test. Sources: [§163](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-163), [§164](sources/ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md#orvia-section-164).
