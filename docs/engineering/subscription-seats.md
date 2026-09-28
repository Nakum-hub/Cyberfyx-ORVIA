# Subscription tiers and member seats

## What a client gets

- Every installation includes one **owner** (ORG_SUPER_ADMIN) and one **administrator** (ORG_ADMIN). They are created by the protected first-run setup, and they are **not counted** against the subscription.
- The subscription tier and option decide how many **member logins** (MEMBER and AUDITOR) may be active at once. For example, Tier 1 offers 5 or 10 members.
- The owner or administrator creates member logins from **Installation → Team** in the workspace, up to that number.

## How the limit reaches the installation

ORVIA runs inside the client's own infrastructure and never calls the vendor, so the limit travels inside the licence:

1. The vendor issues a licence for the client's installation and chosen option: `pnpm run vendor:issue-licence confirm:vendor --installation <id> --option tier_1_members_10 ...`. This is vendor-side only; it needs the vendor licence key.
2. The licence's signed claims include `licensed_limits.member_seats`. Changing the number breaks the signature, and the installation refuses the file.
3. The client imports the licence in their installation.
4. The installation verifies it with the vendor **public** key in `trust/vendor-public-keys.json`, then enforces the seats.

## Guardrails (all server-side, inside the database)

- Only an owner or administrator (`staff.manage`, with MFA) can see or manage the team, and only for their own organisation.
- Only MEMBER and AUDITOR logins can be created, deactivated or reactivated from the workspace. Owner and administrator roles are managed only by protected setup.
- Seats are checked when a login is created or reactivated:
  - the check runs under a lock, so two simultaneous requests cannot both take the last seat;
  - it counts against the **active, unexpired** licence;
  - no licence, an expired licence, or a licence without `member_seats` means no member can be added.
- Deactivating a member frees the seat at once and ends their sessions.
- A new login gets a one-time password, shown once to the administrator. It carries no authority until its holder replaces the password and sets up an authenticator.
- The application's database role cannot write the identity tables directly. It can only call the checked functions (migration `0060_staff_members.sql`).
- Every creation, deactivation and reactivation is audited under ROLE_GRANTS.

## Not decided or not built yet

- **Tiers 2 and 3:** no options are defined yet. The issuing tool refuses them.
- **Tier-to-edition mapping** (Tier 1 = FOUNDATION, Tier 2 = CONTROL, Tier 3 = ENTERPRISE) is an assumption awaiting confirmation.
- **Which features each tier includes** is chosen explicitly when a licence is issued (`--entitlements`); the catalogue does not yet define it.
- **Prices, taxes, billing periods, payment and the website signup and download flow** are on hold with payments (EX13).
- **Lowering seats below current use:** if a licence allows fewer seats than are already active, existing logins keep working and no new member can be added until enough are deactivated. Nothing is removed automatically.
