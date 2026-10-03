# ORVIA V1 baseline addendum, revision 1.8: customer-held owner recovery

**Status:** owner decision recorded 2026-09-30. Settles OPEN-07 (customer-held recovery protocol) for Version 1. Additive to the approved master (Rev 1.4) and to the 1.5–1.7 addenda.

## What the master already fixed

Master §§7 and 84 ("Version 1 invitation, delegation and ownership recovery"; "Independent login and recovery systems"):
- one accountable owner must not become an unrecoverable single point of access failure;
- recovery is customer-held: never a vendor recovery key, a shared owner password or a permanently active second owner;
- it is a protected, audited local transaction that keeps exactly one primary owner;
- it is defined and tested before go-live.

The master left the method open.

## Decision (owner, 2026-09-30)

The owner chose **a protected command on the installation's server**. The alternatives offered were printed recovery codes, or both.

1. Someone with administrator access to the server ORVIA runs on runs `pnpm run owner:recovery-code confirm:<profile> <owner email>`.
2. It issues a one-time code, **for the active owner only**. The code is valid for 30 minutes, locks after five wrong tries, and is replaced by a new issue. Only its SHA-256 digest is stored.
3. The owner opens `/workspace/recover` and enters their email, the code and a new password. In one transaction:
   - the password is replaced;
   - the old authenticator is removed, and a new one must be enrolled at the next sign-in;
   - every earlier session ends;
   - the code is spent.
4. Issue and completion are both in the audit trail. The owner stays the only owner.
5. A wrong email, a login that is not the owner, and an expired, spent or locked code all get the same answer, so nobody can probe which email address is the owner's.

Cyberfyx cannot recover a client's owner login, and holds no key that could.

## Implementation (contract 0.49.0)

- Customer migrations `0074_owner_recovery.sql` and `0075_owner_recovery_issue_time.sql`.
- `scripts/owner-recovery-code.ts`.
- API `POST /api/v1/setup/owner-recovery` in `backend/api/src/setup.ts`.
- Page `frontend/src/app/workspace/recover/page.tsx`, linked from the sign-in page.
- Runbook `docs/runbooks/OPERATOR.md`, "Owner recovery".
- Test `tests/integration/onboarding/owner-recovery.test.ts`: 26 assertions against a scratch database and the real HTTP boundary.
