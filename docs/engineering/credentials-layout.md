# Credentials: vendor versus customer installation

ORVIA has two separate owners of secrets. They must never share a file, a directory or a process environment.

## Vendor (ORVIA the company): `.local/vendor/`

| File | What it is | Used by |
|---|---|---|
| `signing/release.json` | Release and regulatory-package signing key pair (key id, public, **private**) | `scripts/regulatory-package.ts`; tests that sign fixtures as the vendor |
| `signing/licence.json` | Licence signing key pair (key id, public, **private**) | Licence issuing; licensing tests |
| `commerce/` (not yet created) | Payment-provider secrets for the vendor Account (EX13) | Vendor commerce service only |

- In development these files are local, mode 0600, in a 0700 directory, and git-ignored.
- In production, vendor signing keys are held in the vendor's own custody, offline or in an HSM. They are never on a customer host.
- The current keys are **development fixtures**. They must be replaced before any real release or licence is signed.

## Customer installation (each organisation using ORVIA): `.local/profiles/<installation>/`

| Path | What it is |
|---|---|
| `postgres-password`, `auth/*-password`, `worker/`, `agent/`, `observer/`, `sender/`, `machine-auth/` | Database role passwords for this installation |
| `auth/principal-secret`, `auth/staff-secret`, `auth/bootstrap.json` | Session and derivation secrets, and the protected bootstrap record |
| `worker/enrollment.json`, `agent/enrollment.json`, `observer/enrollment.json`, `sender/enrollment.json` | Short-lived machine identities, renewed by `machine:init` |
| `worker/signing-key.pem` | The installation's **own** workflow-command signing key. It belongs to the customer, not the vendor. |
| `trust/vendor-public-keys.json` | The vendor's **public** release and licence keys this installation trusts. Public keys only; a file carrying anything else is refused. |

## Enforcement

- `scripts/credentials.ts` defines both locations.
  - `customerEnvironment()` builds the customer application's environment. It removes every `*PRIVATE_KEY*` variable and takes the public keys from the installation's trust file.
  - A different public key supplied in the environment is refused.
- Every application launcher goes through it: `scripts/web-process.ts` (used by `app-run`, `web start`, the HTTP and browser test fixtures and the auth security test), `scripts/web.ts`, and `tests/integration/web.test.ts`.
- The onboarding preflight `SIGNING_KEYS` gate fails if any private key is present in the running installation.
- `pnpm run credentials:separate confirm:local` moves the prototype's `.local/{release,licence}-fixture.json` into `.local/vendor/signing/` and writes each installation's trust file. It is idempotent and refuses to overwrite a different key. It fails if private key material is found under `.local/profiles/`; the installation's own `worker/signing-key.pem` is exempt.

## Running suites that sign as the vendor

Export the pair from the vendor file into that test process only:

```sh
export ORVIA_RELEASE_KEY_ID=$(node -p "require('./.local/vendor/signing/release.json').key_id")
export ORVIA_RELEASE_PUBLIC_KEY="$(node -p "require('./.local/vendor/signing/release.json').public")"
export ORVIA_RELEASE_PRIVATE_KEY="$(node -p "require('./.local/vendor/signing/release.json').private")"
```

The application those tests start still receives no private key: the launcher strips it.
