# ORVIA Linux installer

ORVIA is a server-installed web application. People use it from a browser on Windows, macOS, Linux or a tablet; nothing is installed on their computers. One build installs either kind of installation (revision 1.5 addendum):

| Kind | Who runs it | Profile | Listens on |
|---|---|---|---|
| `customer` → `CUSTOMER_INSTALLATION` | Each client organisation, on its own server or data centre | `rehearsal` | `https://127.0.0.1:4330` (TLS in-process) |
| `vendor` → `VENDOR_SERVICE` | The vendor, on its own server, data centre or Indian cloud | `vendor-a00` | `http://127.0.0.1:4340`, behind the vendor's TLS reverse proxy |

The kind is chosen once. It is written to the protected `installation.json` and to an immutable database record. A different kind needs a fresh installation.

## Supported hosts

- **Primary:** Linux servers (Ubuntu LTS, or RHEL-compatible) with Docker Engine, the Docker Compose v2 plugin, systemd, Node.js at the version in `package.json` `engines`, pnpm, and openssl.
- **Windows Server:** uses the existing PowerShell path (`scripts/setup-rehearsal.ps1`, `docs/engineering/local-packaging-and-operation.md`).
- **macOS:** evaluation only.

## Commands

```sh
# Check prerequisites only (changes nothing)
installer/linux/orvia-install.sh --check

# A client organisation
sudo installer/linux/orvia-install.sh --kind customer --trust-file vendor-public-keys.json \
     [--tls-cert server.pem --tls-key server-key.pem --tls-ca issuing-ca.pem] [--service-user orvia]

# The vendor
sudo installer/linux/orvia-install.sh --kind vendor [--service-user orvia]
```

### What the installer does

1. **Checks prerequisites:** OS, docker and the daemon, compose v2, node, pnpm, openssl, systemd, and free disk space. It stops if anything is missing.
2. **Installs the pinned dependencies** (`pnpm install --frozen-lockfile`).
3. **Customer installations only:**
   1. Creates the protected profile.
   2. Installs the vendor's **public** keys from `--trust-file`. The file is refused if it holds anything else.
   3. Imports your TLS certificate, or generates a local CA.
   4. Starts PostgreSQL, OPA and Temporal.
   5. Creates the unprivileged roles.
   6. Applies migrations.
   7. Creates the authentication stores and machine logins.
   8. Builds the application.
   9. Prints the **one-time first-run setup code**. The owner and administrator then create their own logins at `/setup`.
4. **Vendor installations only:** provisions the vendor database, roles and migrations (`vendor:init`), starts the services, builds, and prints the vendor setup code. The super administrator and administrator are created at `/vendor/setup`.
5. **systemd units** (templates in `installer/linux/systemd/`):
   - `orvia-services.service`: starts the containers on boot.
   - `orvia-app.service`: the application. It renews machine logins before starting and restarts on failure.
   - `orvia-machine-renew.timer`: renews machine logins every 30 minutes. Enrollments expire after one hour; running services pick up renewals.
   - `orvia-backup.timer`: runs the daily local backup with restore verification (`backup:drill`). The backup stays on the host.

   On a systemd host with the default unit directory, the units are enabled. Otherwise they are rendered only.
6. Records the kind, profile and release in `.local/installer/installation.json`.

## Upgrade and rollback

```sh
installer/linux/orvia-upgrade.sh --to <release tag or commit>
installer/linux/orvia-rollback.sh
```

**Upgrade** runs in this order:
1. A verified backup (for customer installations).
2. Records the previous release.
3. Stops the app.
4. Checks out the target.
5. Installs dependencies.
6. Applies forward-only migrations.
7. Builds.
8. Starts the app.

**Rollback** returns to the recorded previous release.

### Rollback across a schema change

Migrations are forward-only. If the upgrade added migrations, a code-only rollback is refused, because old code would run against a newer schema. In that case:
1. Restore the database from the backup taken before the upgrade.
2. Run the rollback again.

## Verification status (2026-09-29)

| Check | Status |
|---|---|
| Prerequisite check on Ubuntu 24.04 (container) | Executed. Reported Node 22 instead of the qualified 24.21.0, and no systemd. |
| Script syntax (`bash -n`) | Executed |
| Fresh install as each kind, Linux container (Docker, no systemd) | See the handoff for the result of the executed run |
| systemd enable / start on boot / **reboot survival** | **NOT_RUN**: the build container has no systemd and cannot reboot |
| RHEL-compatible host | **NOT_RUN** |
| Windows Server hardening, macOS evaluation | **NOT_RUN** in this change |
| Upgrade and rollback on a live installation | **NOT_RUN** |

## Limits

- **Vendor TLS.** The vendor installation serves plain HTTP on loopback. It must sit behind the vendor's TLS reverse proxy, hosted in India, with request-size and rate limits at the edge. The application enforces its own upload limits and lockout as well.
- **Fixed profile names.** Installation profiles use the repository's fixed profile names (`rehearsal`, `vendor-a00`). Running several installations on one host is not supported.
