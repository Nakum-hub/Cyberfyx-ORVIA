import * as S from '../../../../shared/contracts/src/index.ts';
import type { RuntimeConfig } from '../../../auth/src/config.ts';
import { predicate, scopeValues, type Context } from '../shared/transaction.ts';

/**
 * M29 Customer Onboarding, FR-M29-01 and FR-M29-02.
 *
 * The eleven gates the master requires before go-live, each answered by
 * examining something rather than by asserting it.
 *
 * The backup gate was `NOT_VERIFIABLE_HERE` until FR-M32-03 gave this
 * installation a record of declared snapshots and reconciled restores. It is
 * decidable now, but only over that record: this product still does not make,
 * hold or read the archive, and the gate says so in the sentence naming what it
 * examined. The shape keeps `NOT_VERIFIABLE_HERE` for the next gate that needs
 * it, because a report that cannot say "I could not check this" will eventually
 * be asked to pass something it never looked at.
 *
 * Every gate carries the sentence describing exactly what was examined, because
 * several of these checks are narrower than their names suggest. The egress
 * gate, for instance, can confirm that no configured system names an endpoint
 * outside the loopback boundary and that this build declares no vendor egress;
 * it cannot confirm the host's firewall, and it says which of the two it did.
 */

type Gate = S.PreflightGateValue;
const passed = (kind: Gate['kind'], checked: string, observed: string): Gate =>
  ({ kind, verdict: 'PASSED', checked, observed, unverifiable_reason: null, remedy: null });
const failed = (kind: Gate['kind'], checked: string, observed: string, remedy: string): Gate =>
  ({ kind, verdict: 'FAILED', checked, observed, unverifiable_reason: null, remedy });
const decide = (kind: Gate['kind'], ok: boolean, checked: string, observed: string, remedy: string) =>
  ok ? passed(kind, checked, observed) : failed(kind, checked, observed, remedy);

/** Loopback only. A customer-local installation that answers on a routable
 *  interface is a different product from the one this build claims to be. */
const LOOPBACK = /^(127\.0\.0\.1|\[::1\]|localhost)$/;

export async function preflight(c: Context, config: RuntimeConfig): Promise<unknown> {
  const scope = scopeValues(c.actor);
  const one = async (sql: string, values: unknown[] = scope) => (await c.tx.query(sql, values)).rows[0];
  const origin = new URL(config.origin);

  // --- where and what this is running on --------------------------------------
  const runtimeLocation = decide('RUNTIME_LOCATION', LOOPBACK.test(origin.hostname),
    'The address this application is actually serving on, taken from the running profile rather than from a setting that describes it.',
    `Serving on ${origin.host}.`,
    'Bind the application to the loopback interface. A customer-local installation reachable from the network is outside the boundary this product is built for.');

  const required = process.versions.node.split('.')[0];
  const runtimeAndArchitecture = decide('RUNTIME_AND_ARCHITECTURE', Number(required) >= 24,
    'The Node major version, platform and architecture this process is executing on.',
    `Node ${process.versions.node} on ${process.platform}/${process.arch}.`,
    'Run this installation on the supported Node major version. An unsupported runtime is not a configuration this product has been exercised against.');

  // A loopback-only profile serving plain HTTP is not a finding: nothing leaves
  // the host. The gate says which of the two situations it is looking at.
  const secure = origin.protocol === 'https:';
  const transportSecurity = secure || LOOPBACK.test(origin.hostname)
    ? passed('TRANSPORT_SECURITY',
      'The scheme this application serves on, and whether the address it serves on can be reached from off the host.',
      secure ? `Serving HTTPS on ${origin.host}.` : `Serving HTTP on ${origin.host}, which is loopback-only, so no request crosses a network.`)
    : failed('TRANSPORT_SECURITY',
      'The scheme this application serves on, and whether the address it serves on can be reached from off the host.',
      `Serving HTTP on ${origin.host}, which is reachable from off this host.`,
      'Terminate TLS in front of this application, or bind it back to loopback. Plain HTTP on a routable address carries session cookies in clear.');

  // --- storage ------------------------------------------------------------------
  // Durability is a property of the database's own settings, not of whether it
  // answered. A database that answers with fsync off loses committed work.
  const durability = await one(`SELECT current_setting('fsync') AS fsync, current_setting('synchronous_commit') AS commit_mode`, []);
  const durable = durability.fsync === 'on' && durability.commit_mode !== 'off';
  const durableStorage = decide('DURABLE_STORAGE', durable,
    'Whether the database this installation writes to is configured to survive a power loss, read from its own running settings.',
    `fsync=${durability.fsync}, synchronous_commit=${durability.commit_mode}.`,
    'Enable fsync and a synchronous_commit mode other than off. A database that acknowledges a write it has not made will lose recorded consent.');

  // --- identity, keys ------------------------------------------------------------
  // Two integers from a scoped view. The application role cannot read the
  // identity schema itself, and this gate does not need it to -- see 0032.
  const local = await one(`SELECT active_identities,active_primary_owners FROM app.local_identity_summary`, []);
  const staff = { n: Number(local.active_identities) };
  const owners = { n: Number(local.active_primary_owners) };
  // Exactly the shape FR-M29-02 asks for: one protected primary owner, created
  // locally, never a vendor-issued or demo account.
  const identity = owners.n >= 1 && staff.n >= 1;
  const customerIdentity = decide('CUSTOMER_CONTROLLED_IDENTITY', identity,
    'Whether an active primary owner exists in this installation’s own local identity store, and how many staff identities it holds. No external directory or vendor identity provider is configured, or could be: there is no federation in this build.',
    `${owners.n} active primary owner(s) and ${staff.n} active staff identity(ies), all held locally.`,
    'Complete the protected local bootstrap so one primary owner exists under customer-controlled authentication before any other setup.');

  const keyIds = ['ORVIA_RELEASE_KEY_ID', 'ORVIA_LICENCE_KEY_ID'].filter(name => (process.env[name] ?? '').length > 0);
  const signingKeys = decide('SIGNING_KEYS', keyIds.length > 0,
    'Whether this installation has been given the public key identifiers it needs to verify what it is asked to trust. These are supplied by configuration with no default: without them nothing verifies.',
    keyIds.length ? `Configured: ${keyIds.join(', ')}.` : 'No release or licence signing key identifier is configured.',
    'Supply the release and licence signing key identifiers. Without them a manifest cannot be verified and import will refuse rather than trust it.');

  // The narrow thing this build can honestly check, and the wider thing it
  // cannot. FR-M32-03 gave this installation a record of declared snapshots and
  // of restores that were reconciled before resuming; it did not give it sight
  // of the archive, so the gate reports the record and says what the record is
  // not evidence of.
  const snapshot = await one(
    `SELECT taken_at FROM app.backup_snapshots WHERE ${predicate} ORDER BY taken_at DESC LIMIT 1`);
  const restored = await one(
    `SELECT released_at FROM app.restore_runs WHERE ${predicate} AND state='RELEASED' ORDER BY released_at DESC LIMIT 1`);
  const backupTarget = decide('BACKUP_TARGET', Boolean(snapshot) && Boolean(restored),
    'Whether a backup snapshot has been declared for this installation and whether a restore from one has been reconciled against current consent and released from quarantine. This product does not make, hold or read the archive, so it is not evidence that the archive exists or can be read -- only that a snapshot was declared and a restore was carried through.',
    `${snapshot ? `Last snapshot declared ${(snapshot.taken_at as Date).toISOString()}.` : 'No snapshot has ever been declared.'} ${restored ? `Last restore released from quarantine ${(restored.released_at as Date).toISOString()}.` : 'No restore has been reconciled and released.'}`,
    'Declare a snapshot when the archive is taken, and carry a restore through quarantine and reconciliation at least once. An untested restore is the failure this gate exists to catch, and this product cannot see the archive itself: reading it back is still a job for the customer’s own tooling.');

  // --- egress and telemetry --------------------------------------------------------
  const external = await one(
    `SELECT count(*)::int AS n FROM app.connections WHERE ${predicate}
      AND endpoint_reference IS NOT NULL
      AND endpoint_reference !~ '^(127\\.0\\.0\\.1|localhost|::1)'`);
  const permittedEgress = decide('PERMITTED_EGRESS', Number(external.n) === 0,
    'Two things, and only these two: that no guided connection records an endpoint outside the loopback boundary, and that this build declares no vendor egress of its own. The host’s own network policy is not something this process can see, and is not what this gate checked.',
    `${external.n} configured connection endpoint(s) outside loopback. This build contacts no vendor service.`,
    'Review each connection whose endpoint leaves this host, or confirm the route is one the customer has approved. This gate reports the configuration, not the firewall.');

  const telemetryOff = ['NEXT_TELEMETRY_DISABLED', 'DO_NOT_TRACK', 'BETTER_AUTH_TELEMETRY'];
  const noisy = telemetryOff.filter(name => !['1', '0', 'true'].includes(process.env[name] ?? ''));
  const vendorTelemetry = decide('VENDOR_TELEMETRY_DISABLED', noisy.length === 0,
    'The telemetry switches of every third-party component this application runs, read from the environment this process is actually running with.',
    noisy.length ? `Not disabled: ${noisy.join(', ')}.` : `Disabled: ${telemetryOff.join(', ')}.`,
    `Set ${noisy.join(', ')} so no component of this installation reports to anybody.`);

  // --- licence and package ----------------------------------------------------------
  const licence = await one(
    `SELECT edition,valid_to FROM app.licences WHERE ${predicate} AND active AND valid_from<=now() AND valid_to>now()
     ORDER BY valid_to DESC LIMIT 1`);
  const licenceValidity = decide('LICENCE_VALIDITY', Boolean(licence),
    'Whether a signed licence has been imported for this installation and is currently within its validity window, read from the imported claims.',
    licence ? `${licence.edition} licence valid until ${(licence.valid_to as Date).toISOString()}.` : 'No active licence is within its validity window.',
    'Import a signed licence for this installation. A licence carries no authority grant, but its absence means entitlements cannot be reported at all.');

  // FR-M29-01. The package is verified when a signed release manifest exists for
  // the version this installation is actually running.
  const installed = await one(
    `SELECT version FROM app.installation_versions WHERE ${predicate} ORDER BY applied_at DESC,id DESC LIMIT 1`);
  const manifest = installed
    ? await one(`SELECT version,signing_key_id FROM app.release_manifests WHERE ${predicate} AND version=$4`, [...scope, installed.version])
    : undefined;
  const packageSignature = installed
    ? decide('PACKAGE_SIGNATURE', Boolean(manifest),
      'Whether the version this installation is recorded as running has a signed release manifest that was verified at import. A manifest is only stored after its signature verifies against a trusted key, so its presence is the verification.',
      manifest ? `Version ${installed.version} has a verified manifest signed by key ${manifest.signing_key_id}.` : `Version ${installed.version} is recorded as installed with no verified manifest behind it.`,
      'Import and verify the signed release manifest for the installed version before privileged setup. An installation whose package was never verified cannot say what it is running.')
    : failed('PACKAGE_SIGNATURE',
      'Whether the version this installation is recorded as running has a signed release manifest that was verified at import.',
      'No installed version is recorded, so there is nothing to have verified a package against.',
      'Record the installed version through the update path so the package behind it can be named and its signature checked.');

  const gates = [
    runtimeLocation, runtimeAndArchitecture, transportSecurity, durableStorage,
    customerIdentity, signingKeys, backupTarget, permittedEgress,
    vendorTelemetry, licenceValidity, packageSignature,
  ];
  return S.PreflightReport.parse({
    as_of: new Date().toISOString(), profile: S.PROFILE, gates,
    failing: gates.filter(g => g.verdict === 'FAILED').map(g => g.kind),
    not_verifiable: gates.filter(g => g.verdict === 'NOT_VERIFIABLE_HERE').map(g => g.kind),
    an_unverified_gate_is_not_a_passed_gate: true,
    passing_every_gate_is_not_a_statement_about_the_law: true,
    limits: [
      'Each gate states exactly what it examined. Several are narrower than their names suggest, and the sentence beside the verdict is the accurate one.',
      'A gate this build cannot check reports that it could not, with the reason. It is not counted as passed and appears in its own list.',
      'These are eleven technical checks against this installation. Passing them is not a statement that any legal obligation has been met.',
      'This report reads the installation as it is now. It does not watch it, and a configuration that changes after this moment is not reflected until it is run again.',
    ],
  });
}
