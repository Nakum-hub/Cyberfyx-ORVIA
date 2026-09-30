# Vendor installation hosting readiness

Source inspected: `e42f573`, contract 0.46.0, baseline revisions 1.4–1.6. This is a preparation runbook, not deployment approval or evidence of a qualified public installation. No hosting, DNS, firewall or account changes were executed. Synthetic local HTTPS qualification does not qualify a public domain.

Approval labels below name the person needed: **OWNER**, **LEGAL**, **KEY CUSTODIAN**. An operator may prepare evidence; an unchecked gate is not implicitly approved.

## Decisions before provisioning

| Gate | Required person | Record before proceeding |
|---|---|---|
| Indian hosting location, provider, availability target, budget and support responsibility | OWNER | Approved location, capacity, recovery point/time objectives, escalation contacts |
| Domain and DNS ownership | OWNER | Exact HTTPS hostname, registrar/DNS custodian, change approval and renewal contact |
| Engagement letter, DPA and audit evidence retention/deletion terms | LEGAL + OWNER | Approved documents and version; revision 1.6 legal review is still pending |
| Signing keys, TLS keys, backup encryption keys and recovery custody | KEY CUSTODIAN | Separate responsibilities, access register, offline recovery and rotation procedure |
| Release and commissioning | OWNER | Exact reviewed commit, qualification evidence, outstanding defects, signed go/no-go |

Use a dedicated vendor host, database and volumes. Customer operational databases and credentials never belong here. The installation kind is `VENDOR_SERVICE`; do not convert a customer installation in place. Do not ship synthetic accounts, development licences or test signing keys.

## Known engineering gates at this source

These must be resolved and tested before the network procedure below is executable:

- `backend/auth/src/config.ts` derives the vendor origin as `http://127.0.0.1:4340`; `backend/auth/src/server.ts` uses that exact origin for authentication. An arbitrary public domain is not a supported configuration switch in this source. **Engineering + OWNER:** coordinate a canonical HTTPS-origin design, allowed proxy boundary and any required contract reservation before changing it. Do not weaken origin/CSRF checks to make a proxy work.
- The vendor install path calls `scripts/vendor-init.ts` before starting services; that script provisions the database immediately. A fresh host must demonstrate this ordering works or receive a reviewed installer correction. The development profile shares the codex-a00 Compose namespace; never use it on a host with an unrelated installation.
- The vendor systemd app command currently uses `pnpm run -s start`, while `scripts/start-orvia.ts` is the rehearsal customer orchestrator. A vendor service entry point must be corrected/qualified before enabling it.
- The vendor branch of the upgrade script prints a backup reminder instead of enforcing a verified backup. **Operator + OWNER:** require separate durable backup/restore evidence before approval; the reminder is not proof.
- Firefox/WebKit, fresh-host install and upgrade results belong to their dated handoffs. Do not infer a pass from this document.

## Reverse proxy and TLS preparation

**OWNER:** approve the single domain and restricted public entry points. **KEY CUSTODIAN:** obtain a certificate whose SAN matches that domain; hold its private key only on the TLS endpoint with restricted access. Record certificate chain, expiry, renewal owner and failure alert. Use a trusted issuer or explicitly distribute a private root through the customer's approved trust mechanism. Never disable certificate or hostname verification.

Once canonical public-origin support is implemented and qualified, configure the local reverse proxy to forward the approved hostname to the loopback-only vendor application on port 4340. Preserve the original host and HTTPS scheme through a specifically trusted local proxy; strip client-supplied forwarding headers before setting them. Reject unknown hosts. Validate request size and timeout limits against the actual sealed package/channel limits; do not invent smaller proxy limits that truncate evidence delivery. Serve the application and its assets locally, with no CDN, analytics or remote fonts. Preserve the application CSP and verify authenticated responses are not shared-cacheable.

Publicly expose HTTPS only. PostgreSQL, OPA, Temporal and internal relay ports remain private/loopback; a vendor operator never opens an inbound path to a customer installation. **OWNER/network operator:** approve firewall and DNS changes as a separate operation. Link the website's vendor login to `https://<approved-domain>/vendor/sign-in` only after qualification.

Commission with a synthetic account: inspect certificate chain and hostname; perform password + MFA sign-in, sign-out, session expiry, denied-role access and CSRF rejection; inspect Secure/HttpOnly/SameSite cookies on HTTPS; verify no mixed content or browser CSP errors. Test proxy restart, certificate renewal and upstream failure. Record actual results, including failures, on the exact candidate.

## Trust distribution and key custody

**KEY CUSTODIAN:** maintain separate release, licence and audit signing key material. Private signing keys stay with vendor-side signing tooling; customer runtime receives public keys only. The vendor evidence-vault key, session secrets and TLS key have separate purposes and require protected recovery copies. Do not copy keys into source, support tickets, browser traces or chat.

The current customer trust file is `.local/profiles/<profile>/trust/vendor-public-keys.json`. Its top-level fields are `release`, `licence`, optional `audit`, and optional `audit_service`. Key entries contain `key_id` and `public`; `audit_service` contains only `url`. Confirm the exact HTTPS service URL and public-key fingerprints through a second authenticated channel before delivery. Record file checksum, recipient installation and acknowledgement without copying customer operational records.

**OWNER + KEY CUSTODIAN:** approve distribution and rotation. Maintain compatibility with in-flight signed packages and retained evidence; verify rotation on an isolated installation first. Contract 0.46.0 accepts no CA field in this trust file. The previous process-local `NODE_EXTRA_CA_CERTS` mechanism is synthetic qualification evidence, not an approved deployment-wide trust change. Any schema change requires the reserved next version and coordination.

Audit transport is outbound from the customer to that one address, only under an active dual-approved mandate or approved sealed transfer. Personal-data-free automatic categories, suspension/revocation/expiry, receipt replay and signature rejection must be tested. Evidence files and personal-data exceptions require their recorded approvals; **LEGAL** must approve the engagement/DPA before real use. File fallback remains available.

## Backups, monitoring and recovery

**OWNER:** approve concrete RPO/RTO, backup frequency, retention and restore frequency before commissioning. Proposed starting schedule for review: encrypted nightly database and evidence-vault backup, daily completion check, weekly isolated restore check and quarterly recovery exercise. This proposal is not an implemented vendor timer. The existing customer timer at 02:15 with up to 15 minutes jitter does not schedule vendor backups.

Back up PostgreSQL consistently, the installation identity and migration ledger, evidence vault and its decryption key, trust configuration and protected auth configuration. Store encrypted copies on an approved separate failure domain in the approved jurisdiction. **KEY CUSTODIAN:** escrow encryption/decryption material separately with dual-controlled recovery. Confirm a clean restore can decrypt retained evidence, preserve tenant isolation, validate signatures and match the recorded ledger. A copied file or successful backup command is not restore verification.

Monitor locally: app readiness, auth failures/rate limiting, certificate expiry, disk/inode use, PostgreSQL health, relay memory/OOM/restart counts, queue age, audit-delivery failures and unacknowledged receipts, backup age and restore outcome. Keep operational logs at the installation; do not enable vendor analytics or automatic crash uploads. **OWNER:** approve alert recipients and channels before any real messages are sent. The relay limit is 256 MiB in this source; alert on sustained pressure rather than relying only on automatic restart.

On a failed upgrade, preserve logs and the migration ledger, stop further writes as directed by the incident owner, and assess schema compatibility before rollback. Never rewrite checksums or reset a database. Record the previous release, verified backup, target release, migrations and build/restart result. Forward-only migrations may make a code-only rollback unsafe. **OWNER + KEY CUSTODIAN:** authorise any real restore and its recovery keys.

## Release record

The commissioning record must link actual fresh install/setup/upgrade evidence, browser matrix, TLS/proxy checks, backup/restore drill and resolved engineering gates. Record all NOT_RUN items and their owners. Only **OWNER** can promote acceptance and authorise deployment; **LEGAL** and **KEY CUSTODIAN** must close their respective gates first.
