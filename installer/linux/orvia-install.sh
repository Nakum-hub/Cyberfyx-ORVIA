#!/usr/bin/env bash
# ORVIA Linux installer (revision 1.5 addendum). One build, two installation kinds:
#   --kind customer   CUSTOMER_INSTALLATION: a client organisation's own server
#   --kind vendor     VENDOR_SERVICE: the vendor's own server, data centre or Indian cloud
# Users need only a browser. This script never deletes data, never overwrites an
# existing installation, and never prints a password or key (the one-time setup
# code is printed once, as intended, and written to the protected profile).
#
# Usage:
#   installer/linux/orvia-install.sh --check [--kind customer|vendor]
#   sudo installer/linux/orvia-install.sh --kind customer --trust-file vendor-public-keys.json [--tls-cert cert.pem --tls-key key.pem --tls-ca ca.pem] [--service-user orvia] [--unit-dir /etc/systemd/system]
#   sudo installer/linux/orvia-install.sh --kind vendor [--service-user orvia] [--unit-dir /etc/systemd/system]
# Options: --no-install (dependencies already installed), --no-systemd (render units into --unit-dir only, do not enable).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; cd "$ROOT"
KIND=""; CHECK_ONLY=0; TRUST=""; CERT=""; KEY=""; CA=""; USER_NAME="${SUDO_USER:-$(id -un)}"; UNIT_DIR="/etc/systemd/system"; INSTALL=1; SYSTEMD=1
while [ $# -gt 0 ]; do case "$1" in
  --kind) KIND="$2"; shift 2;; --check) CHECK_ONLY=1; shift;; --trust-file) TRUST="$2"; shift 2;;
  --tls-cert) CERT="$2"; shift 2;; --tls-key) KEY="$2"; shift 2;; --tls-ca) CA="$2"; shift 2;;
  --service-user) USER_NAME="$2"; shift 2;; --unit-dir) UNIT_DIR="$2"; shift 2;; --no-install) INSTALL=0; shift;; --no-systemd) SYSTEMD=0; shift;;
  *) echo "Unknown option: $1" >&2; exit 2;; esac; done
say() { printf '  %s\n' "$*"; }
fail() { printf '\n  ORVIA installer stopped: %s\n  Nothing was deleted; any state already created is kept.\n\n' "$*" >&2; exit 1; }
# ---------------------------------------------------------------- prerequisites
problems=0; warn=0
need() { if command -v "$1" >/dev/null 2>&1; then say "ok      $1"; else say "MISSING $1 — $2"; problems=$((problems+1)); fi; }
[ "$(uname -s)" = "Linux" ] || fail "this installer is for Linux servers (Ubuntu LTS or RHEL-compatible)."
if [ -r /etc/os-release ]; then . /etc/os-release; say "os      ${PRETTY_NAME:-unknown}"; case " ${ID:-} ${ID_LIKE:-} " in *" ubuntu "*|*" debian "*|*" rhel "*|*" fedora "*|*" centos "*) ;; *) say "WARN    not Ubuntu/RHEL-compatible: untested"; warn=$((warn+1));; esac; fi
need docker "install Docker Engine (https://docs.docker.com/engine/install/)"
if docker compose version >/dev/null 2>&1; then say "ok      docker compose v2"; else say "MISSING docker compose v2 plugin"; problems=$((problems+1)); fi
need node "install Node.js $(node -p "require('./package.json').engines.node" 2>/dev/null || echo 24)"
need openssl "install openssl (TLS material)"
if command -v pnpm >/dev/null 2>&1 || [ -x node_modules/.bin/pnpm ] || [ $INSTALL -eq 0 ]; then say "ok      pnpm"; else say "MISSING pnpm — corepack enable && corepack prepare pnpm@$(node -p "require('./package.json').engines.pnpm") --activate"; problems=$((problems+1)); fi
if command -v node >/dev/null 2>&1; then want="$(node -p "require('./package.json').engines.node")"; have="$(node -v | tr -d v)"; if [ "$want" != "$have" ]; then say "WARN    Node.js $have; the qualified runtime is $want"; warn=$((warn+1)); fi; fi
if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then say "ok      systemd"; HAVE_SYSTEMD=1; else say "WARN    systemd not running: units are rendered but not enabled (no start on boot)"; HAVE_SYSTEMD=0; warn=$((warn+1)); fi
if docker info >/dev/null 2>&1; then say "ok      docker daemon reachable"; else say "MISSING docker daemon not reachable by this user"; problems=$((problems+1)); fi
free_kb=$(df -Pk "$ROOT" | awk 'NR==2{print $4}'); if [ "${free_kb:-0}" -lt 4194304 ]; then say "WARN    less than 4 GB free disk"; warn=$((warn+1)); else say "ok      disk"; fi
say "result  ${problems} missing, ${warn} warning(s)"
if [ $CHECK_ONLY -eq 1 ]; then [ $problems -eq 0 ]; exit $?; fi
[ $problems -eq 0 ] || fail "prerequisites are missing (see above)."
case "$KIND" in customer) PROFILE=rehearsal;; vendor) PROFILE=vendor-a00;; *) fail "choose --kind customer or --kind vendor. The kind is fixed at installation and cannot be changed later.";; esac
export ORVIA_PROFILE="$PROFILE" ORVIA_WORKSPACE_ROOT="$ROOT" NEXT_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 BETTER_AUTH_TELEMETRY=0
PNPM="pnpm"; command -v pnpm >/dev/null 2>&1 || PNPM="$ROOT/node_modules/.bin/pnpm"
step() { printf '\n== %s\n' "$*"; }
# ---------------------------------------------------------------- install
if [ $INSTALL -eq 1 ]; then step "Installing pinned dependencies"; $PNPM install --frozen-lockfile; fi
if [ "$KIND" = customer ]; then
  [ -e ".local/profiles/rehearsal/config.json" ] && fail "a customer installation already exists here (.local/profiles/rehearsal). Upgrade it with installer/linux/orvia-upgrade.sh instead."
  [ -n "$TRUST" ] || fail "--trust-file is required: the vendor's public keys file (vendor-public-keys.json) delivered with your licence."
  step "Creating the installation profile"; node scripts/profile-init.mjs rehearsal
  step "Installing the vendor's public keys (public keys only)"
  mkdir -p .local/profiles/rehearsal/trust && chmod 700 .local/profiles/rehearsal/trust
  install -m 600 "$TRUST" .local/profiles/rehearsal/trust/vendor-public-keys.json
  node --import tsx -e "import('./scripts/credentials.ts').then(m=>{const t=m.installationTrust('rehearsal');if(!t)throw new Error('trust file missing');console.log('  trust file accepted: release, licence'+(t.audit?', audit':' (no audit key: signed audit files cannot be imported)'));})"
  step "TLS"
  if [ -n "$CERT" ]; then
    [ -n "$KEY" ] && [ -n "$CA" ] || fail "--tls-cert needs --tls-key and --tls-ca (the issuing CA certificate)."
    openssl x509 -in "$CERT" -noout >/dev/null || fail "--tls-cert is not a PEM certificate."
    mkdir -p .local/profiles/rehearsal/tls && chmod 700 .local/profiles/rehearsal/tls
    install -m 600 "$CERT" .local/profiles/rehearsal/tls/server-cert.pem; install -m 600 "$KEY" .local/profiles/rehearsal/tls/server-key.pem; install -m 600 "$CA" .local/profiles/rehearsal/tls/ca-cert.pem
    say "your certificate was imported"
  else $PNPM run -s tls:init confirm:rehearsal; say "a local CA and server certificate were generated (replace with your own for production)"; fi
  step "Starting the local services"; $PNPM run -s services up
  for i in $(seq 1 60); do docker compose -p orvia-rehearsal ps --format json 2>/dev/null | grep -q '"Health":"healthy"' && break; sleep 2; done
  step "Database roles and schema"; $PNPM run -s roles:init confirm:rehearsal; $PNPM run -s db:migrate
  step "Authentication stores and machine logins"; $PNPM run -s auth:init confirm:rehearsal; $PNPM run -s machine:init confirm:rehearsal
  step "Building the application"; $PNPM run -s build
  step "First-run setup code"; $PNPM run -s setup:code confirm:rehearsal
  APP_EXEC="$PNPM run -s app:run confirm:rehearsal"; RENEW_EXEC="$PNPM run -s machine:init confirm:rehearsal"; BACKUP_EXEC="$PNPM run -s backup:drill confirm:rehearsal"
else
  step "Provisioning the vendor installation (VENDOR_SERVICE)"; node --import tsx scripts/vendor-init.ts confirm:vendor-a00
  step "Starting the local services"; $PNPM run -s services up
  step "Building the application"; $PNPM run -s build
  step "Vendor first-run setup code"; node --import tsx scripts/vendor-setup-code.ts confirm:vendor-a00 || say "(setup already completed)"
  APP_EXEC="$PNPM run -s start"; RENEW_EXEC=""; BACKUP_EXEC=""
  say "The vendor application listens on 127.0.0.1:4340. Put it behind your TLS reverse proxy (HTTPS only, India-hosted); the public website's 'Vendor / Auditor login' links to https://<vendor-domain>/vendor/sign-in."
fi
# ---------------------------------------------------------------- systemd
step "Service units (start on boot, scheduled machine-login renewal, backups)"
mkdir -p "$UNIT_DIR"
render() { sed -e "s#@ROOT@#$ROOT#g" -e "s#@USER@#$USER_NAME#g" -e "s#@PROFILE@#$PROFILE#g" -e "s#@APP_EXEC@#$APP_EXEC#g" -e "s#@RENEW_EXEC@#$RENEW_EXEC#g" -e "s#@BACKUP_EXEC@#$BACKUP_EXEC#g" "installer/linux/systemd/$1" > "$UNIT_DIR/$1"; say "wrote $UNIT_DIR/$1"; }
UNITS="orvia-services.service orvia-app.service"
[ -n "$RENEW_EXEC" ] && UNITS="$UNITS orvia-machine-renew.service orvia-machine-renew.timer"
[ -n "$BACKUP_EXEC" ] && UNITS="$UNITS orvia-backup.service orvia-backup.timer"
for u in $UNITS; do render "$u"; done
mkdir -p .local/installer && chmod 700 .local/installer
printf '{"kind":"%s","profile":"%s","release":"%s","installed_at":"%s"}\n' "$KIND" "$PROFILE" "$(git rev-parse HEAD 2>/dev/null || echo unknown)" "$(date -u +%FT%TZ)" > .local/installer/installation.json
if [ $SYSTEMD -eq 1 ] && [ "${HAVE_SYSTEMD:-0}" -eq 1 ] && [ "$UNIT_DIR" = /etc/systemd/system ]; then
  systemctl daemon-reload
  systemctl enable --now orvia-services.service orvia-app.service
  [ -n "$RENEW_EXEC" ] && systemctl enable --now orvia-machine-renew.timer
  [ -n "$BACKUP_EXEC" ] && systemctl enable --now orvia-backup.timer
  say "enabled: ORVIA starts on boot"
else say "units rendered only; enable them with systemctl on a systemd host"; fi
printf '\n  ORVIA %s installation complete. Open it in a browser (Windows, macOS, Linux or tablet).\n  Credentials and TLS material stay in the protected .local directory.\n\n' "$( [ "$KIND" = customer ] && echo customer || echo vendor)"
