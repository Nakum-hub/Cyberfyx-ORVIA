# Customer installation checklist

Prepared against `e42f573`, contract 0.46.0 and approved baseline revisions 1.4–1.6. Each checkbox requires evidence; none is checked by publishing this checklist. This does not authorise installation, DNS/firewall changes or a real audit engagement.

## Before installation

- [ ] **OWNER:** approve a dedicated customer-local host, storage location, installation administrator, scope, licence and exact release candidate. Keep operational records, identifiers, evidence, logs and assets local.
- [ ] **OWNER/operator:** confirm the Linux target and pinned Node 24.21.0/pnpm 12.4.2, Docker Engine, Compose v2, openssl, reachable daemon and sufficient disk/memory. Run `bash installer/linux/orvia-install.sh --check --kind customer`; retain the exit code and exact missing prerequisites. Warnings require review, including systemd absence.
- [ ] **OWNER/operator:** confirm no existing installation occupies the profile's ports, Compose project, database or volume. Preserve existing installations. An interrupted install may use documented resume after inspection; never delete or reset it to obtain a pass.
- [ ] **KEY CUSTODIAN:** obtain vendor public trust material through an authenticated channel; verify fingerprints and checksum independently. No vendor private signing key belongs on the customer host.
- [ ] **OWNER + KEY CUSTODIAN:** select hostname/certificate/CA trust and backup encryption/recovery custody. The rehearsal profile is fixed to loopback HTTPS at port 4330 in this source; a real domain needs coordinated canonical-origin support and qualification. A generated local CA is not public TLS qualification.
- [ ] **LEGAL + OWNER:** approve retention and data-processing arrangements. Before any real DPDPA external engagement, approve the revision 1.6 engagement letter and DPA. Engineering evidence is not legal sign-off.

## Install and first-run setup

- [ ] **Operator:** on the approved isolated host, run the supplied customer installer with the verified public trust file and approved TLS material. Record the exact command with private paths/values withheld from shared logs, exit code, release identity and installation kind `CUSTOMER_INSTALLATION`.
- [ ] **Operator:** verify database roles are least-privilege, migrations complete with their original checksums, and the installation identity is durable. A schema conflict stops the installation; do not relabel a historical migration.
- [ ] **KEY CUSTODIAN:** protect `.local` credentials, machine enrollment, TLS private key and recovery copies. Keep the one-time setup code local; do not attach it to evidence. No development keys/accounts/licence may be described as production-qualified.
- [ ] **OWNER/admin:** complete first-run setup through the browser, enrol MFA, establish separate preparer/reviewer identities and verify role/scoped denial. Verify the one-time setup path cannot be reused.
- [ ] **Operator:** inspect actual app/worker/agent/service readiness, loopback bindings and database connectivity. Inspect relay memory limit (256 MiB at this source), OOM/restart history and durable job recovery.
- [ ] **Operator:** verify start/stop, restart and service/timer enablement. `--no-systemd` proves only installation/unit rendering; it does not prove boot survival. Record reboot evidence separately.
- [ ] **OWNER:** review browser journeys on the actual supported browser matrix, including repeat saves, downloads, denied access and failure recovery. Keep failed or unexecuted journeys visible.

## Audit exchange, only when selected

- [ ] **OWNER + KEY CUSTODIAN:** verify the one approved HTTPS audit address in the public trust file; no arbitrary destination, credentials, query or fragment. Contract 0.46.0 does not accept a CA field there.
- [ ] **LEGAL + OWNER:** confirm the real engagement/DPA and any personal-data exception before release. Automatic evidence is restricted to personal-data-free categories in the dual-approved mandate.
- [ ] **Two authorised approvers:** record scope, categories, schedule, start/end and the distinct approver. Test suspension, revocation, expiry and signed receipt replay with synthetic evidence before real use.
- [ ] **Network operator + OWNER:** approve only the required outbound HTTPS path. The vendor never connects inbound, signs in to, or reads the customer installation. Retain sealed-file fallback where outbound transport is unavailable.
- [ ] **Operator:** inspect vendor-visibility records against actual transmissions. Continuous assurance needs its own separate mandate and approval; it does not silently continue an engagement.

## Backup, upgrade and handover

- [ ] **OWNER:** approve concrete RPO/RTO, schedule, retention and alert recipients. Check the installed customer backup timer (02:15, up to 15 minutes jitter) actually runs; a rendered unit alone is not evidence.
- [ ] **KEY CUSTODIAN/operator:** keep encrypted database, evidence, installation/auth/trust/TLS configuration and recovery keys in the approved local/backup locations. Verify a separate restore, forced row-level security and retained withdrawal state. No recovery action may reactivate withdrawn marketing.
- [ ] **Operator:** before upgrade, record current and target commits, successful verified backup, original migration ledger, maintenance window and rollback constraints. Use `installer/linux/orvia-upgrade.sh --to <reviewed-commit>` only with approved target and a clean tracked checkout.
- [ ] **Operator:** record migration/build/restart exits and repeat setup-independent health, authentication, authorisation, consent/withdrawal and evidence checks. Never overwrite local changes or reset the database to conceal upgrade failure.
- [ ] **OWNER + KEY CUSTODIAN:** approve any real restore; assess forward-only schema compatibility before code rollback. Preserve all failure evidence.
- [ ] **OWNER:** sign handover only after unresolved FAIL/NOT_RUN items have explicit dispositions, legal/key-custody gates are closed, monitoring is assigned and actual release acceptance is recorded. This checklist itself promotes nothing in tracking.
