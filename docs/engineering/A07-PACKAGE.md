# A07 engineering package and local operation

This is a customer-local synthetic engineering candidate pending Work review and human acceptance. A04-A06 backend implementation is supplied; the preserved Claude UI is partial, including no implemented staff workspace page/sign-in. Its source is retained with provenance in `handoffs/codex/A07-ui-preservation.json`. No B-task/browser completion, two human rehearsals, legal/production readiness or release approval follows from these commands. A08 is excluded.

## Prerequisites and installation

The tested host is Windows x64 with Docker Desktop Linux containers, Git, Node **24.21.0** and pnpm **12.4.2**. Repository bootstrap downloads those exact public tools using HTTPS and checks the Node archive hash. Docker images are pinned by digest in `infrastructure/compose.yaml`; services remain on an internal network behind fixed loopback relays. Authorized provisioning downloads are distinct from runtime network qualification. No public deployment, account change or paid service is needed.

Clone the supplied offline Git bundle so recorder/build tools retain exact repository provenance; the ZIP is an additional source snapshot. Keep the supplied manifest and evidence archive beside the checkout.

```powershell
git clone --config core.autocrlf=false --branch prototype/codex/A07-package <local-path-to-orvia-source.bundle> orvia-local
cd orvia-local
```

`orvia-evidence.zip` contains the actual A07 report/log files indexed by the manifest. The bundle contains project history, never ignored local credentials or stores. `orvia-local-images.tar` contains the pinned service images and the backend qualification image; `docker load --input <the-local-image-archive>` imports them without runtime data. The qualification image defaults to the network test harness, not an approved production server. Host application startup uses the source package below. Initial dependency/tool provisioning can require authorized network access; an air-gapped fresh host is not claimed.

From the cloned repository root, with Docker running and rehearsal ports **4330 / 55433 / 58183 / 57235** unused:

```powershell
./scripts/setup-rehearsal.ps1
```

The setup wrapper refuses an existing rehearsal directory. It installs the frozen lockfile, creates the exact `rehearsal` profile, generates TLS, starts services, creates allowlisted roles, applies migrations, bootstraps the synthetic owner and fixtures, enrolls machine identities, enrolls test execution and invokes the conditional synthetic order seed (zero orders until an eligible approved policy exists), builds and runs TLS checks. It never resets an existing installation. If a step fails, inspect its actual recorder artifact and resume the corresponding commands below after correcting the cause; do not delete the profile, signing keys or retained ledger.

```powershell
$env:ORVIA_PROFILE='rehearsal'
$env:ORVIA_TASK_ID='A07'
./scripts/dev.ps1 services up
./scripts/dev.ps1 roles:init confirm:rehearsal
./scripts/dev.ps1 db:migrate
./scripts/dev.ps1 preflight
./scripts/dev.ps1 auth:init confirm:rehearsal
./scripts/dev.ps1 auth:bootstrap confirm:rehearsal
./scripts/dev.ps1 seed:auth confirm:rehearsal
./scripts/dev.ps1 machine:init confirm:rehearsal
./scripts/dev.ps1 seed:orders confirm:rehearsal
./scripts/dev.ps1 regression:init confirm:rehearsal
./scripts/dev.ps1 build
./scripts/dev.ps1 test:tls
```

Protected credentials are generated locally under `.local/profiles/rehearsal`; only the operator should open its `auth/bootstrap.json` locally. Do not paste its passwords, authenticator enrollment or machine tokens into chat/logs/Git. Machine identities expire after one hour; renew through the existing protected `machine:init confirm:rehearsal` command before another session. Renewal does not authorize inactive identities or restore withdrawn permission.

## TLS and application lifecycle

Rehearsal binds **https://127.0.0.1:4330**, with no plaintext application listener. A one-use local CA signs a short-lived leaf restricted to localhost/127.0.0.1; the CA private key is not persisted. `@peculiar/x509` **2.1.0** uses native Node WebCrypto; `reflect-metadata` **0.2.2** supports its decorators. Versions were resolved from the public registry and pinned in the shared lockfile. [Library usage](https://peculiarventures.github.io/x509/docs/usage/) and [Next custom server guidance](https://nextjs.org/docs/app/guides/custom-server/) informed the small Node HTTPS entry point. This uses the existing Next build and gives up custom-server-incompatible optimizations; no stack replacement or standalone output is claimed.

The PowerShell/record wrappers set `NODE_EXTRA_CA_CERTS` to the protected rehearsal CA for their child processes. Certificate verification remains enabled; wrong CA and wrong hostname are negative tests. No system/browser trust store is changed. A human must review/install appropriate local browser trust before a browser rehearsal; do not click through warnings or use certificate-ignore flags. Other named development profiles remain explicitly unqualified HTTP. Certificates expire after 30 days; replacement needs an explicit operator maintenance step, not automatic overwrite.

```powershell
./scripts/dev.ps1 machine:init confirm:rehearsal
./scripts/dev.ps1 app:run confirm:rehearsal
# In another local terminal with ORVIA_PROFILE=rehearsal:
./scripts/dev.ps1 app:stop confirm:rehearsal
./scripts/dev.ps1 services stop
```

The foreground supervisor owns the web/worker/agent children, holds a profile lock and records a protected run identity. The stop script writes a matching local request; it does not accept an arbitrary PID, shell command, URL or target. Graceful shutdown stops only those owned children and retains stores. After an abrupt host/supervisor failure, inspect the protected journal and actual processes; stale journals are refused, not silently taken over. Service stop/up preserves named volumes. No command removes volumes.

## Real demonstration and evidence

Stop the application supervisor before isolated automated scenarios: each scenario command owns its web/worker/agent lifetime and refuses a competing active worker/agent. All targets/records are labelled synthetic.

```powershell
./scripts/dev.ps1 demo:run confirm:rehearsal MARKETING_WITHDRAWAL_HEALTHY
./scripts/dev.ps1 demo:run confirm:rehearsal MARKETING_WITHDRAWAL_BROKEN_CONTROL
./scripts/dev.ps1 demo:run confirm:rehearsal TARGET_RESTORE_QUARANTINE
./scripts/dev.ps1 evidence:export confirm:rehearsal <workflow-uuid-from-the-real-demo-artifact>
./scripts/dev.ps1 test:regression
./scripts/dev.ps1 test:lifecycle
```

The broken control must retain FAIL and an actual isolated send violation; detecting it is an expected negative test, not a passing business run. The healthy scenario performs real authorization, consent withdrawal, durable Temporal work, a signed restricted agent effect, independent readback, current send denial and evidence export. Restoration is target-only quarantine/reconciliation, not full control-plane disaster recovery. Export goes to the fixed local Codex artifact directory through the real scoped, audited HTTP export endpoint. MFA test orchestration observes the real rate-limit idle window; limits are not disabled.

Bootstrap qualification uses `db:migrate bootstrap-only`, `services:smoke`, then the exact `reset:bootstrap rehearsal rehearsal-bootstrap-only` before full migrations. It exports reset intent first, validates identity/authority, checks active workflows and removes only bootstrap probe rows. After business migrations the same reset is **refused**. There is no destructive business reset. Fresh scenarios use new scoped fixtures while retaining consent history and accepted withdrawal restrictions.

## Package and review identity

```powershell
./scripts/dev.ps1 runtime:build
./scripts/dev.ps1 test:network confirm:rehearsal
./scripts/dev.ps1 candidate:package confirm:rehearsal
```

Package only committed source after required checks. The script rejects dirty source/documents, verifies the offline Git bundle, compares every source/evidence archive entry to its inventory, verifies the qualification image source label, inspects owned pinned service images, and excludes ignored credentials/keys/populated stores. Large archives stay in `.local/releases/<candidate-commit>/`; publishable provenance is `artifacts/release-manifest.json`. The manifest records exact source/master/contract/lock/build/profile/image identities, package hashes, executed command evidence and open gates. SHA-256 checksums are development integrity references, not production release signatures. Any candidate-changing fix needs a new commit and relevant reruns.

The final handoff names actual executed commands, original failures, corrected results and package locations. Work alone consolidates accepted state and C/W review documents. W02/W03, remaining B/UI/browser work and two real human T30 rehearsals remain open until their actual evidence and human decisions exist.
