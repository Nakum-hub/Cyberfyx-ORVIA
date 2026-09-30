# Handoff — R3-INSTALLER — Codex

**Base commit:** 3fa7081aa9ce49d92dd6c724b35b3f5ffa3a79d8 (Claude branch).
**New commit:** this handoff's commit on `codex/installer-20260930`.
**Source master:** revision 1.4 and approved addenda, unchanged. **Contract:** 0.46.0.
**Scope/profile:** clean cached Debian/Node container, no shared profile mount, host Docker socket or production data.

## Delivered

Re-executed the current installer prerequisite check in a clean local container. It stops before installation: five prerequisites remain missing. Syntax validation also executed. Fresh install, first-run setup and upgrade from a prior release candidate are **not completed** by this handoff.

## Commands actually executed

Both commands used cached image `node@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553`, `docker run --rm --pull never --network none --read-only --cap-drop ALL --security-opt no-new-privileges`, readonly mounts of this branch's installer (and package.json for preflight), working directory `/qualification`.

| Container command | Exit | Result / artifact |
|---|---|---|
| `bash installer/linux/orvia-install.sh --check` | 1 | R3-installer-preflight.log: five missing prerequisites |
| `bash -n installer/linux/orvia-install.sh installer/linux/orvia-upgrade.sh installer/linux/orvia-rollback.sh` | 0 | R3-installer-syntax.log |
| `bash -n installer/linux/<script>` separately for install, upgrade and rollback | 0 each | R3-installer-syntax-individual.log |

The original multi-filename `bash -n` command only parsed the first script; the three individual invocations above supply the full syntax evidence. An intervening shell-loop attempt failed with exit 2 because Windows argument quoting broke the loop (`R3-installer-syntax-all.log`); this is a command construction failure, not an installer result.

Exact prerequisites, both previous and current local attempt:

| Prerequisite | Current outcome | Resolution status |
|---|---|---|
| Docker CLI | missing | unresolved |
| Docker Compose v2 | missing | unresolved |
| openssl executable | missing | unresolved (Node's embedded TLS library is not this executable) |
| pnpm executable | missing | unresolved inside this clean container; Windows host pnpm does not satisfy it |
| reachable Docker daemon | missing | unresolved; no separate Linux daemon/VM provisioned |
| systemd | not running, warning | unresolved; ordinary container cannot prove service enablement/reboot survival |
| pinned Node / disk | pass | available in cached image |

`wsl --list --quiet` showed only docker-desktop, not a separate qualification Linux VM. The approved isolated customer/vendor database environment does not constitute a Linux installer host.

## Acceptance

Prerequisite check FAIL (correctly refuses unsupported environment), syntax PASS. Fresh installation, first-run setup, upgrade/rollback and reboot survival NOT_RUN locally. Claude's separate installer evidence remains attributed to Claude; it is not reused as a Codex pass.

## Contract / dependency / ownership changes

None. Only this handoff and two logs change. No shared container/volume reset, host service installation, host socket exposure or privileged nested Docker setup was performed.

## Remaining limitations and blockers

Needs a clean Linux qualification host with the documented prerequisites and an isolated Docker daemon. Supplying only Docker CLI/Compose in this container would not satisfy daemon availability; sharing the host daemon also risks collisions with fixed rehearsal profile names and retained host resources. Needs an agreed previous release-candidate commit/tag for the upgrade run. Do not report this task as done.

## Next integration action

Provision the suitable disposable Linux VM/host, then run fresh customer install, real first-run setup and upgrade from the nominated candidate. Keep this failure evidence and record how each prerequisite is actually resolved. Human owner acceptance remains separate.
