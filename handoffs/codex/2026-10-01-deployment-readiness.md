# Handoff — R4-READINESS-01 — deployment readiness documents

**Base commit:** e42f573c91340eadbcd42ad010c79c56fd50010a
**New commit:** this handoff's commit on codex/deployment-readiness-20261001.
**Source master:** approved revision 1.4 and 1.5/1.6 addenda, unchanged.
**Contract:** 0.46.0 unchanged. **Scope:** documents only, no deployment.

## Delivered

- docs/runbooks/VENDOR_HOSTING_READINESS.md: hosting/domain decisions, reverse-proxy/TLS commissioning, trust distribution, separate key custody, backup/restore schedule, local monitoring and release gates.
- docs/runbooks/CUSTOMER_INSTALLATION_CHECKLIST.md: prerequisites, first-run setup/MFA, isolation, optional audit exchange, backups, upgrade and owner handover.
- This handoff.

Every approval-dependent step names OWNER, LEGAL or KEY CUSTODIAN. Proposed schedules remain proposals. Documents identify source limitations instead of claiming production readiness: fixed loopback auth origin, fresh vendor provisioning order, customer-oriented vendor service command and unenforced vendor backup reminder.

## Commands actually executed

| Check | Exit | Result |
|---|---|---|
| git diff --check | 0 | PASS |
| first git diff --cached --check | 2 | CRLF trailing whitespace in new handoff; normalised to LF |
| PowerShell required-marker check on both documents | 0 | PASS: owner/legal/key-custodian/contract markers present |

Source inspection: installer/linux/orvia-install.sh, orvia-upgrade.sh, systemd/orvia-backup.timer; scripts/vendor-init.ts, start-orvia.ts, credentials.ts; backend/auth/src/config.ts and server.ts; shared/contracts/src/index.ts; existing round-3 qualification handoffs. Command snippets in documents are procedures, not claimed executions.

## Acceptance

Runtime/deployment tests NOT_RUN on this documentation branch. No tracking promotion. Public hosting, domain/TLS proxy behaviour, legal approval and key-custody operations remain unqualified.

## Contract / dependency / ownership changes

None. Claude-owned source findings are documented, not patched. No 0.47.0 change or migration reservation needed.

## Next integration action

Human review/merge of the documentation branch. Engineering must qualify the noted deployment gates; OWNER supplies hosting/domain/RPO/RTO and release decisions; LEGAL approves engagement/DPA; KEY CUSTODIAN approves real key custody/distribution. Installer and cross-browser execution are separate round-4 handoffs.
