# Backup-copy obligations and cryptographic deletion (EX07)

Status: built on synthetic data, pending Codex review. Acceptance NOT_RUN. Master §§50, 52, 91; expanded baseline EX07.

## What ORVIA does

Backups of a customer system usually cannot be edited to remove one person. ORVIA therefore:

1. **Records how each system's backups are treated** (`app.backup_treatments`, migration 0076). There are five facts:
   - the technical restriction (why one record cannot be removed);
   - the isolation controls;
   - how long backups are kept (days);
   - the restore procedure reference;
   - the customer-approved legal treatment.

   One person records the treatment (`retention.write`) and a different person approves it (`retention.approve`). A new approved treatment supersedes the old one. The recorded facts of a treatment cannot be rewritten.
2. **Keeps a minimal erasure ledger** (`app.erasure_ledger`). When an ERASE or ANONYMISE action is VERIFIED on a system with a CURRENT treatment, one row records the Data Principal, the system, the action, the erasure time and the date the backups age out (erasure time plus the treatment's retention days). Only people with `registry.sensitive.read` can read the ledger. Readers of retention records see counts only (`app.erasure_ledger_counts`).
3. **Marks re-erasure after a restore.** Recording a system restore with the time the restored backup was taken moves every ledger row erased after that time to REAPPLY_REQUIRED (`app.mark_reerasure_after_restore`). Those rows appear in Operations attention (REERASURE_AFTER_RESTORE) until a person with `registry.sensitive.write` confirms the re-erasure with evidence.
4. **Flags unknown backup handling.** A system that has verified erasures but no CURRENT treatment is reported as unknown backup handling in the coverage view and in Operations attention (BACKUP_HANDLING_UNKNOWN).
5. **Ages out and purges the ledger itself.** The operations runner moves IN_BACKUPS rows past their clear date to BACKUPS_AGED_OUT. It deletes a row only when that row is aged out and more than 30 days past its clear date. A database guard refuses any other deletion.

## What ORVIA never says

- **A backup is never reported as erased.** BACKUPS_AGED_OUT means the recorded schedule says those backups should have expired. It is not proof that they did; the API returns `a_backup_expiry_date_is_not_proof_of_erasure: true`.
- **REAPPLIED means a person confirmed it with evidence.** ORVIA does not re-run the erasure itself after a restore, and REAPPLIED is not an independent readback.

## Cryptographic deletion: assessment

The master (§52) treats cryptographic deletion as an **optional advanced capability**, to be used "where supported". In it, data encrypted with a data-specific key becomes unreadable once that key is destroyed.

**ORVIA Version 1 does not perform cryptographic deletion.** It holds no per-person or per-record encryption keys for customer systems, and no connector destroys keys. The master's roadmap keeps "advanced cryptographic deletion" as a future capability, and nothing here implies it exists.

What a customer can do today is record their own system's crypto-shredding as that system's backup treatment. They describe it in the technical restriction and the legal treatment, and a second person approves it. Before approving such a treatment, the approver should have written answers to each of these questions. §52 requires ORVIA to identify them, and they belong in the restore procedure reference:

| Question | Why it matters |
| --- | --- |
| Key boundary: which data does one key protect (one person, one tenant, one table, one volume)? | A key shared by many people cannot be destroyed for one person. Destroying a volume key is not per-person erasure. |
| Key copies: where else does the key exist (KMS replicas, HSM backups, escrow, exported key files, other regions)? | A destroyed key that survives in a key backup is not destroyed. |
| Caches and plaintext copies: does the data exist decrypted anywhere (application caches, search indexes, logs, analytics exports, replicas, data warehouse)? | Key destruction does nothing to plaintext copies. |
| Shared keys: is other data (other people, other purposes) encrypted with the same key? | Destroying it would destroy data that must be kept, so it will not be destroyed. |
| Evidence: what record shows the key was destroyed, by whom, when? | Without it, the erasure cannot be evidenced. |

Report exactly what became inaccessible (which key, which data, which copies). **Never call key destruction a universal legal-erasure guarantee** (§52). ORVIA's ledger and wording apply unchanged to a crypto-shredded system: the backup is still not reported as erased, and a restore still marks re-erasure.

## Limits

- This work was exercised on synthetic data only (`tests/integration/operations/backup-obligations.test.ts`, 22/22 on codex-a00). There is no real customer backup system, no real restore and no real key destruction.
- The ledger starts when a treatment is CURRENT. It contains no rows for erasures verified before a treatment was approved. For those systems, the coverage view reports the count of verified erasures but not who remains in backups.
- Restores are recorded by a person. ORVIA does not detect a restore of a customer system by itself.
- If **ORVIA's own database** is restored from an older backup, ORVIA's registry and this ledger go back to that point too, and later erasures are no longer recorded in ORVIA. The operator must reconcile the restored installation before processing resumes: re-run the erasures recorded in the downstream systems' own logs and connector evidence after the backup time. `scripts/backup-drill.ts` exercises a same-host logical restore; it does not perform this reconciliation.
- Legal treatment text is the customer's decision. ORVIA records it, but does not assess whether it satisfies the DPDP Act or Rules.
