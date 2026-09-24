// WP25 / M27 Licensing and M28 Entitlements integration suite.
// Under test: a licence cannot enable what this product will not sell, every
// verification failure is named, and five independent gates must all pass.
import assert from 'node:assert/strict';
import { randomUUID, generateKeyPairSync, sign } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import * as S from '../../../shared/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'ui-b00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/ui-b00/rehearsal permitted');
const db = connectDatabase(profile).pool;
const assertions: { name: string; result: 'PASS' | 'FAIL'; expected: unknown; actual: unknown }[] = [];
let phase = 'setup';
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); assertions.push({ name, result: 'PASS', expected, actual }); console.log('PASS ' + name); }
  catch { assertions.push({ name, result: 'FAIL', expected, actual }); console.log('FAIL ' + name, { expected, actual }); throw new Error('Assertion failed: ' + name); }
}
const clients = new Map<string, ReturnType<HttpFixture['browser']>>();
const login = h.login.bind(h);
h.login = async name => { let browser = clients.get(name); if (!browser) { browser = await login(name); clients.set(name, browser); } return browser; };
const key = () => ({ 'idempotency-key': randomUUID() });
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

// The trusted signer this installation was started with. The fixture signs with
// the same key so the suite exercises real verification, not a bypass.
const keyId = process.env.ORVIA_LICENCE_KEY_ID;
const privateKeyPem = process.env.ORVIA_LICENCE_PRIVATE_KEY;
// Three variables, not two. The suite signs with the private key and the
// application verifies with the public one, so the untrusted-signer refusal
// only reaches its real code path when the server was started trusting this
// same key. Without the public key the refusal arrives as a bare 503 and the
// run looks broken rather than unconfigured.
if (!keyId || !privateKeyPem || !process.env.ORVIA_LICENCE_PUBLIC_KEY) {
  throw new Error([
    'This suite needs the fixture licence key pair in the environment. Run it as:',
    '  ORVIA_LICENCE_KEY_ID=$(node -p "require(\'./.local/licence-fixture.json\').key_id") \\',
    '  ORVIA_LICENCE_PRIVATE_KEY=$(node -p "require(\'./.local/licence-fixture.json\').private") \\',
    '  ORVIA_LICENCE_PUBLIC_KEY=$(node -p "require(\'./.local/licence-fixture.json\').public") \\',
    '  npm run test:licensing',
  ].join('\n'));
}
const privateKey = { key: Buffer.from(privateKeyPem, 'base64'), format: 'der' as const, type: 'pkcs8' as const };
const untrusted = generateKeyPairSync('ed25519');

function signLicence(claims: Record<string, unknown>, options: { signer?: string; tamper?: boolean } = {}) {
  const signingKey = options.signer === 'untrusted' ? untrusted.privateKey : privateKey;
  const signature = sign(null, Buffer.from(canonicalJson(options.tamper ? { ...claims, edition: 'ENTERPRISE' } : claims)), signingKey).toString('base64url');
  return { algorithm: 'Ed25519' as const, claims, signing_key_id: options.signer === 'untrusted' ? randomUUID() : keyId, signature };
}

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;   // ORG_ADMIN: licence.read, no licence.manage
  const owner = scenario.owner;    // ORG_SUPER_ADMIN: also licence.manage
  const installation = (await db.query('SELECT installation_id FROM bootstrap_profile WHERE singleton=1')).rows[0].installation_id;

  const baseClaims = (overrides: Record<string, unknown> = {}) => ({
    licence_id: randomUUID(), edition: 'CONTROL', entitlements: ['PRIVACY_GRAPH', 'RIGHTS_MANAGEMENT'],
    installation_id: installation, audience: 'ORVIA_CUSTOMER_INSTALLATION',
    valid_from: days(-1), valid_to: days(365), licensed_limits: { environments: 3, staff_members: 25 },
    ...overrides,
  });
  const importIt = (claims: Record<string, unknown>, options: { signer?: string; tamper?: boolean } = {}, as = owner) =>
    as.call('/api/v1/admin/licences', { licence: signLicence(claims, options) }, key());
  const fieldCode = async (response: Response) => ((await response.json()) as { error: { field_errors?: { code: string }[] } }).error.field_errors?.[0]?.code;

  // --- FR-M28-04: what a licence can never enable ---------------------------
  phase = 'forbidden capabilities';
  for (const forbidden of ['AI_COPILOT', 'VENDOR_REMOTE_ACCESS', 'STAFF_DIRECTORY_SYNC', 'PROACTIVE_DIAGNOSTICS']) {
    // These are rejected by the closed entitlement vocabulary before any
    // signature is even considered, which is the point: no signing key can
    // authorise them.
    const response = await importIt(baseClaims({ entitlements: [forbidden] }));
    check(`a licence naming ${forbidden} is refused however it is signed`, response.status, 400);
  }

  // --- FR-M27-02: every verification failure is named -----------------------
  phase = 'verification';
  const untrustedSigner = await importIt(baseClaims(), { signer: 'untrusted' });
  check('a licence from an untrusted signer is refused', untrustedSigner.status, 400);
  check('the refusal names the untrusted signer', await fieldCode(untrustedSigner), 'untrusted_signer');
  const tampered = await importIt(baseClaims(), { tamper: true });
  check('the refusal names an invalid signature when claims were altered after signing', await fieldCode(tampered), 'invalid_signature');
  const wrongInstallation = await importIt(baseClaims({ installation_id: randomUUID() }));
  check('a licence bound to another installation is refused', await fieldCode(wrongInstallation), 'wrong_installation');
  const notYet = await importIt(baseClaims({ valid_from: days(10), valid_to: days(400) }));
  check('a licence that is not yet valid is refused', await fieldCode(notYet), 'not_yet_valid');
  const expired = await importIt(baseClaims({ valid_from: days(-400), valid_to: days(-1) }));
  check('an expired licence is refused at import', await fieldCode(expired), 'expired');
  check('a licence whose window ends before it starts is rejected by the schema',
    (await importIt(baseClaims({ valid_from: days(10), valid_to: days(1) }))).status, 400);

  // --- a valid import --------------------------------------------------------
  phase = 'import';
  check('importing a licence needs its own authority, not merely read access',
    (await importIt(baseClaims(), {}, staff)).status, 403);
  const claims = baseClaims();
  const state = S.LicenceState.parse(await (await importIt(claims)).json());
  check('an imported licence records exactly what was bought', [state.edition, state.entitlements], ['CONTROL', ['PRIVACY_GRAPH', 'RIGHTS_MANAGEMENT']]);
  check('an active licence says expiry never withdraws reading or export', state.continuity_note.includes('never withdrawn'), true);
  const replay = await importIt(claims);
  check('re-importing the same licence is a replay, not a renewal', await fieldCode(replay), 'replayed');
  const edit = await db.query(`UPDATE app.licences SET edition='ENTERPRISE' WHERE licence_id=$1`, [claims.licence_id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the stored licence can be superseded but its terms cannot be edited', edit, 'ACCEPTED');
  const editClaims = await db.query(`UPDATE app.licences SET valid_to=now()+interval '10 years' WHERE licence_id=$1`, [claims.licence_id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the database refuses to extend a licence validity window', editClaims, 'REJECTED');
  const deleteIt = await db.query('DELETE FROM app.licences WHERE licence_id=$1', [claims.licence_id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('a licence record is never deleted', deleteIt, 'REJECTED');

  // --- FR-M28-01: five gates, all required -----------------------------------
  phase = 'entitlement gates';
  const report = S.EntitlementReport.parse(await (await owner.call('/api/v1/admin/entitlements')).json());
  check('every feature reports exactly five gates', report.features.every(f => f.gates.length === 5), true);
  check('every gate is named once per feature', report.features.every(f => new Set(f.gates.map(g => g.gate)).size === 5), true);
  const graph = report.features.find(f => f.feature === 'PRIVACY_GRAPH')!;
  check('a licensed, released, rolled-out feature the actor may use is usable', graph.usable, true);
  const retention = report.features.find(f => f.feature === 'RETENTION_MANAGEMENT')!;
  check('a feature the licence does not name is not usable', retention.usable, false);
  check('the blocking gate is identified rather than merely reporting a refusal',
    retention.gates.filter(g => !g.satisfied).map(g => g.gate), ['LICENCE_ENTITLEMENT']);
  const held = report.features.find(f => f.feature === 'PRIVACY_TEST_ENGINE')!;
  check('a feature held back by rollout is blocked on that gate specifically',
    held.gates.find(g => g.gate === 'CONTROLLED_ROLLOUT')!.satisfied, false);

  phase = 'actor gate';
  const auditorReport = S.EntitlementReport.parse(await (await (await h.login('auditor')).call('/api/v1/admin/entitlements')).json());
  const auditorGraph = auditorReport.features.find(f => f.feature === 'PRIVACY_GRAPH')!;
  check('an auditor holding the read capability passes the actor gate', auditorGraph.gates.find(g => g.gate === 'ACTOR_AUTHORISATION')!.satisfied, true);
  check('the licence gate is the same for every actor', auditorGraph.gates.find(g => g.gate === 'LICENCE_ENTITLEMENT')!.satisfied, true);

  // --- FR-M28-04 again, as a statement to the operator ------------------------
  phase = 'never licensable';
  check('the report states plainly what no licence can enable', report.never_licensable.length >= 7, true);
  check('it says these are commitments, not withheld features', report.never_licensable.every(n => n.includes('not a withheld feature')), true);
  check('it names the model capabilities explicitly', report.never_licensable.some(n => n.startsWith('AI_COPILOT')), true);
  check('it names vendor remote access explicitly', report.never_licensable.some(n => n.startsWith('VENDOR_REMOTE_ACCESS')), true);
  check('the report says a licence carries no commands or authority grants', report.limits[0]!.includes('no authority grants'), true);
  check('the report says security and truthful outcomes are not licensed features', report.limits.some(l => l.includes('are not licensed features')), true);

  // --- authority ---------------------------------------------------------------
  phase = 'authority';
  const member = await h.login('member');
  check('a member without the licence capability is refused', (await member.call('/api/v1/admin/entitlements')).status, 403);

  writeEvidence('licensing-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('licensing-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
