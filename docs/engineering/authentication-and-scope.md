# A01 authentication and persistence

Base: `e1fa052c6c419e90c4783ce220dee2ef247472dc`. Contract `0.2.1` is accepted by W00 at `425f079`, integrated by the human in PR #6. This increment implements A01 only. It awaits Work review and human integration before A02 starts.

## Runtime and operator boundaries

Better Auth 1.7.5 uses its supported Drizzle adapter, database sessions, password hashing, TOTP and recovery-code implementation. Staff and principal instances have different schemas, database credentials, signing secrets and cookie prefixes. Neither public signup nor email/SMS delivery is exposed. The protected CLI uses Better Auth's exported password hash and writes the supported credential-account schema atomically with the initial organisation/scope grant; no password/session cryptography is implemented locally.

Runtime roles `orvia_app`, `orvia_staff_auth` and `orvia_principal_auth` are non-owner, non-superuser, non-BYPASSRLS roles without role/database creation. `orvia_app` cannot access authentication stores or assume the migrator. Auth roles cannot update authority bindings, access business tables, or read the other auth domain. Migration credentials are read only by operator scripts; the web runtime loads only its separate credentials. Runtime business transactions reject a privileged application role.

The setup commands require the named synthetic profile confirmation. Generated credential files stay under ignored `.local/profiles/<profile>/auth/`, restricted to the current Windows account and SYSTEM by the setup command (0700/0600 on POSIX). Never paste these files, MFA URIs, recovery codes or cookies into chat/logs. Bootstrap and fixture seeding preserve existing credentials and IDs, validate installation/database identity and append audit records. A transaction failure leaves no partial authority grants; the local credential journal permits a retry using the same identifiers. No owner deletion, role elevation API or recovery bypass is exposed. A reviewed customer emergency-recovery procedure remains outside this A01 slice.

Authentication tables are installation identity stores, isolated by trust domain and role grants: the library must resolve an identity/session before tenant context exists. Business rows use tenant/legal-entity/environment composite references, explicit predicates, FORCE RLS and transaction-local settings. Principal RLS adds the authenticated principal reference. Both successful and rolled-back transactions clear connection context. The settings are supplied only by trusted server code after authentication; this does not claim resistance to a fully compromised application process or database administrator.

`app.request_audit` is an installation-local, insert-only runtime log of request UUID, compiled operation name, HTTP status and timestamp. It records denied/unauthenticated requests without payloads, cookies, addresses or customer identifiers. Runtime cannot enumerate it. Scoped `app.audit_events` records session/directory reads and successful principal mutations. Auth stores retain library operation outcomes. Audit failure returns a safe 503. A committed idempotent mutation remains replayable after a later response/audit failure.

## Authority and MFA

The server resolves the library session to a protected authority binding with one exact scope. Request IDs, body scope fields and query selectors never grant authority. Simultaneous staff/principal sessions are rejected with 403. Bearer credentials cannot enter human routes; actual machine enrolment and command execution remain A03.

ORG_SUPER_ADMIN has the approved administrative subset; ORG_ADMIN can prepare scoped configuration/principals but cannot acquire `policy.publish` or `tests.run`. AUDITOR reads only. MEMBER has the declared workflow/task capabilities, but the administrative OPA policy denies operations until A03 supplies exact resource assignment checks. DATA_PRINCIPAL has only own-consent/receipt capabilities. Master specialised roles remain preserved in scope; their management UI is not implemented here.

ORG_SUPER_ADMIN, ORG_ADMIN and MEMBER must complete MFA before business-session access. Enabling MFA alone is insufficient. The server records proof for the exact persisted session only after a successful library TOTP/recovery-code verification and a completed library enrollment. Old password-only sessions, pending challenges and recovery codes from unverified enrollment do not establish that proof. Trusted-device bypass and MFA disable endpoints are not exposed. Sessions expire after one hour; library freshness is five minutes for sensitive session operations. Cookie caching is disabled, so logout/revocation is checked against durable storage.

Administrative OPA decisions use `orvia.admin.authorize`, separate from future processing policy. Missing, malformed or unavailable decisions deny with 503; they never fall back to allow. This is administrative permission only and supplies no processing condition or send permission.

## Implemented interfaces

| Interface | Behaviour |
|---|---|
| `/api/auth/staff/*`, `/api/auth/principal/*` | Supported Better Auth login, session, logout, own-session listing/revocation; staff TOTP enable/verify and recovery-code verification |
| GET `/api/v1/session` | Canonical server-derived STAFF/PRINCIPAL session, no tokens; privileged pre-MFA access gets 403 |
| GET `/api/v1/admin/principals` | Scoped durable directory, validated UUID cursor, limit 1–100, default 25 |
| POST `/api/v1/admin/principals` | Scoped synthetic principal reference creation, transactionally audited and idempotent; it does not provision a login account |

The principal-create boundary rechecks session authority inside the transaction, locks the actor/scope/operation/key identity, compares the normalized request digest, persists the reference/audit/response, and responds after commit. Same key/body returns the original resource; changed reuse returns 409. Keys support the canonical 16–128 character range. Duplicate scoped email is 400 with a safe field error. No consent epoch or target generation is created in this identity-only operation; those belong to A02/A03. Environment-scoped purpose identities will preserve the master's four-part consent aggregate `(tenant, legal entity, principal reference, purpose)`; A01 never shares consent across environments.

Auth POSTs require the exact configured origin, JSON and bounded bodies; forwarded host/IP headers confer no trust. Library endpoints retain their native response/error shape. Versioned APIs use the canonical safe error envelope, request IDs, no-store responses and bounded field errors. HTTP-only, SameSite=Strict cookies protect this loopback development mount. Rate limits are persisted in each auth database; staff sign-in is 10 requests/minute across this direct local ingress, with independent account MFA lockout. A01 is **HTTP loopback development only**. Verified TLS, protected packaging and runtime egress qualification remain A06/A07; no public exposure is approved.

## Local commands

Run from the repository root with the pinned local toolchain. Commands below exist; the A01 handoff links actual executions and results. Existing initialized profiles must not be re-created or reset.

```powershell
.\scripts\dev.ps1 services up
.\scripts\dev.ps1 db:migrate
.\scripts\dev.ps1 auth:init confirm:codex-a00
.\scripts\dev.ps1 auth:bootstrap confirm:codex-a00
.\scripts\dev.ps1 seed:auth confirm:codex-a00
.\scripts\dev.ps1 build
.\scripts\dev.ps1 test:auth
.\scripts\dev.ps1 start
```

The application listens at `http://127.0.0.1:4310`. The auth test owns that port, starts/stops/restarts its own production Next process, and briefly stops/starts only `orvia-codex-a00-opa-1`. Do not run another app process on that profile during the suite. It uses real library login/MFA, persisted rows and actual OPA. Test-only authenticator material is stored with generated synthetic fixtures; this is not a production MFA-secret handling pattern. The `reviewer` fixture is reserved for the incomplete-enrollment negative control in this suite.

The UI lane uses its existing separate `ui-b00` profile and ports, not the Codex database or credentials. Its auth/bootstrap commands take `confirm:ui-b00` after setting `ORVIA_PROFILE=ui-b00`. That profile has not been initialized or tested by this A01 run. Existing `reset:bootstrap` intentionally rejects the added business tables; use no reset until A06 supplies the guarded application reset.

Reference checks: [Better Auth integration](https://better-auth.com/docs/installation), [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle), [TOTP integration](https://better-auth.com/docs/plugins/2fa), [PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), plus the installed pinned library's schemas and implementation. No dependency version changed in A01.
