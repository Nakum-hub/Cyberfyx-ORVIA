// Revision 1.11 tier walk and licence lifecycle, through the real HTTP boundary and the real database resolver.
// Under test: a FOUNDATION installation is refused every Control and Enterprise write and keeps every legal-floor write; a
// trial overlays the paid licence and a second trial of the same tier is refused; an old or unsequenced licence cannot be
// re-imported after a sequenced one (anti-rollback); an edition cannot carry a higher tier's features; a downgrade imported
// ahead of renewal waits for its start date; grace days follow the term, and after expiry the legal floor still works while
// premium work stops.
//
// Runs in the `sibling` fixture scope so the sequenced licences it leaves behind never affect the suites that import
// unsequenced licences into the main scope. The vendor is played with the local development licence key.
import { randomUUID, sign, createPrivateKey } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import { example } from '../../../shared/contracts/src/examples.ts';
import { operationsSuite, key } from '../../../shared/testing/src/operations-fixture.ts';
import { vendorSigningKey } from '../../../scripts/credentials.ts';
import { requireEntitlement } from '../../../backend/domain/src/licensing/licensing.ts';
import { automationAllowance } from '../../../backend/domain/src/workflow/workflow.ts';

const t = operationsSuite('licence-tiers');
const { h, check, ok, codes, db } = t;
const vendor = vendorSigningKey('licence');
const privateKey = createPrivateKey({ key: Buffer.from(vendor.private, 'base64'), format: 'der', type: 'pkcs8' });
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const signed = (claims: Record<string, unknown>) => ({ licence: { algorithm: 'Ed25519', claims, signing_key_id: vendor.key_id, signature: sign(null, Buffer.from(canonicalJson(claims)), privateKey).toString('base64url') } });
const tierOf = (cls: S.RouteClass) => (cls === 'READ' || cls === 'PLATFORM' || cls === 'PROTECTIVE') ? cls : S.ENTITLEMENTS[cls].tier;

await t.run(async () => {
  const sibling = await h.login('sibling');
  const scope = h.users.sibling!.scope;
  const scopeArgs = [scope.tenant_id, scope.legal_entity_id, scope.environment_id];
  const installation = (await db.query('SELECT installation_id FROM bootstrap_profile WHERE singleton=1')).rows[0].installation_id as string;
  let sequence = Number((await db.query('SELECT coalesce(max(sequence),0) AS top FROM app.licences WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3', scopeArgs)).rows[0].top);
  const claims = (edition: string, overrides: Record<string, unknown> = {}) => ({
    licence_id: randomUUID(), edition, entitlements: S.editionEntitlements(edition === 'CUSTOM' ? 'ENTERPRISE' : edition as 'FOUNDATION').filter(c => c !== 'SSO_IDENTITY'),
    installation_id: installation, audience: 'ORVIA_CUSTOMER_INSTALLATION', valid_from: days(-1), valid_to: days(365),
    licensed_limits: { environments: 1, staff_members: 5, member_seats: 3 }, term: 'ANNUAL', sequence: ++sequence, ...overrides,
  });
  const importIt = (c: Record<string, unknown>) => sibling.call('/api/v1/admin/licences', signed(c), key());
  const state = async () => S.EntitlementReport.parse(await (await sibling.call('/api/v1/admin/entitlements')).json()).licence!;

  // Every tier-gated staff write, called with its contract example. A refusal for the tier carries the entitlement fields;
  // anything else (not found, a state conflict) means the tier let it through. Writes the tier allows are walked only where
  // they address a record by id (a random id, so they stop at "not found" and change nothing); creates the tier refuses are
  // walked too, because a refusal never executes. Reads, platform and protective writes never consult the licence (unit
  // invariants in tests/unit/tiers.test.ts).
  const gatedWrites = S.routes.filter(r => r.method === 'post' && r.authority === 'STAFF' && !['READ', 'PLATFORM', 'PROTECTIVE'].includes(S.classifyRoute(r)!));
  async function walk(allowedTiers: string[]) {
    const out: { id: string; tier: string; refused: boolean; capability: boolean; codes: string[] }[] = [];
    for (const route of gatedWrites) {
      if (allowedTiers.includes(tierOf(S.classifyRoute(route)!)) && !route.path.includes('{')) continue;
      const path = route.path.replace(/\{[^}]+\}/g, () => randomUUID());
      const input = route.request ? example(route.request) : {};
      const activation = route.id === 'toggle_control_test' ? { ...input as object, enabled: true }
        : route.id === 'change_audit_mandate_state' ? { ...input as object, state: 'ACTIVE' } : input;
      const r = await codes(sibling.call(path, activation, key()));
      out.push({ id: route.id, tier: tierOf(S.classifyRoute(route)!), refused: r.status === 403 && r.codes.includes('entitlement_required'), capability: r.status === 403 && r.codes.length === 0, codes: r.codes });
    }
    return out;
  }

  t.setPhase('foundation licence');
  await ok(importIt(claims('FOUNDATION')), S.schemas.LicenceState, [200, 201]);
  check('the FOUNDATION licence is in force', [(await state()).edition, (await state()).lifecycle], ['FOUNDATION', 'ACTIVE']);
  for (const [id, windDown] of [['toggle_control_test', {enabled:false}], ['change_audit_mandate_state', {state:'REVOKED'}]] as const) {
    const route=S.routes.find(r=>r.id===id)!;
    const response=await codes(sibling.call(route.path.replace(/\{[^}]+\}/g,()=>randomUUID()),{...example(route.request!) as object,...windDown},key()));
    check('protective wind-down passes the plan gate and reaches scoped resource validation: '+id,{status:response.status,gated:response.codes.includes('entitlement_required'),codes:response.codes},{status:404,gated:false,codes:['not_found']});
  }
  const foundation = await walk(['FOUNDATION']);
  const leaked = foundation.filter(r => (r.tier === 'CONTROL' || r.tier === 'ENTERPRISE') && !r.refused && !r.capability).map(r => r.id);
  check('a FOUNDATION installation is refused every Control and Enterprise write', leaked, []);
  const lost = foundation.filter(r => r.refused && !(r.tier === 'CONTROL' || r.tier === 'ENTERPRISE')).map(r => r.id);
  check('a FOUNDATION installation keeps every legal-floor write', lost, []);
  const gatedCount = foundation.filter(r => r.tier === 'CONTROL' || r.tier === 'ENTERPRISE').length;
  check('the walk covered the higher-tier writes (capability refusals are not counted as tier refusals)', foundation.filter(r => r.refused).length > 0.9 * gatedCount, true);
  const workflow = S.routes.find(r => r.id === 'create_mapping')!;
  check('a refusal names the entitlement and the tier that includes it', (await codes(sibling.call(workflow.path, example(workflow.request!), key()))).codes,
    ['entitlement_required', 'realtime_enforcement', 'control']);

  t.setPhase('limits');
  const before = (await ok(sibling.call('/api/v1/admin/plan'), S.schemas.PlanSummary)).limits;
  const used = (name: string) => before.find(l => l.name === name)!.used;
  await ok(importIt(claims('FOUNDATION', { licensed_limits: { environments: 1, staff_members: 5, member_seats: 3, websites: used('websites'), connected_systems: used('connected_systems') } })), S.schemas.LicenceState, [200, 201]);
  const sized = (await ok(sibling.call('/api/v1/admin/plan'), S.schemas.PlanSummary)).limits;
  check('the plan reports usage against the licensed limits', sized.filter(l => l.name === 'websites' || l.name === 'connected_systems').map(l => l.licensed === l.used), [true, true]);
  const site = S.routes.find(r => r.id === 'create_cmp_site')!;
  check('a website beyond the plan is refused, naming the limit', (await codes(sibling.call(site.path, example(site.request!), key()))),
    { status: 409, codes: ['plan_limit_reached', 'websites', String(used('websites'))] });
  const connection = S.routes.find(r => r.id === 'start_connection')!;
  const startConnection = () => codes(sibling.call(connection.path, { ...(example(connection.request!) as object), system_id: randomUUID() }, key()));
  check('connected systems are a Control feature, not part of Foundation', (await startConnection()).codes.slice(0, 2), ['entitlement_required', 'workflow_automation']);
  // Upgrade to Control sized at the current number of connections, then back down to Foundation (both take effect at once).
  await ok(importIt(claims('CONTROL', { licensed_limits: { environments: 1, staff_members: 5, member_seats: 3, connected_systems: used('connected_systems') } })), S.schemas.LicenceState, [200, 201]);
  check('an upgrade takes effect at once', (await state()).edition, 'CONTROL');
  check('a connected system beyond the plan is refused, naming the limit', (await startConnection()).codes.slice(0, 2), ['plan_limit_reached', 'connected_systems']);
  await ok(importIt(claims('FOUNDATION')), S.schemas.LicenceState, [200, 201]);
  check('an immediate downgrade takes effect at once', (await state()).edition, 'FOUNDATION');
  const rights = S.routes.find(r => r.id === 'create_rights_request')!;
  check('a rights request is never refused for a plan limit', (await codes(sibling.call(rights.path, example(rights.request!), key()))).codes.includes('plan_limit_reached'), false);

  t.setPhase('edition ceiling and anti-rollback');
  check('a FOUNDATION licence naming a Control feature is refused at import',
    (await codes(importIt(claims('FOUNDATION', { entitlements: ['PRIVACY_GRAPH', 'REALTIME_ENFORCEMENT'] })))).codes, ['entitlement_exceeds_edition']);
  check('a licence with an old sequence is refused (no re-importing a bigger plan after a downgrade)',
    (await codes(importIt(claims('ENTERPRISE', { sequence: 1 })))).codes, ['stale_sequence']);
  const unsequenced = claims('ENTERPRISE'); delete (unsequenced as Record<string, unknown>).sequence; sequence--;
  check('an unsequenced licence is refused once a sequenced one exists', (await codes(importIt(unsequenced))).codes, ['stale_sequence']);

  t.setPhase('trial');
  // One trial per edition per scope is the rule under test, so only the first run in this scope can take a Control trial.
  // A re-run proves the refusal instead, and the overlay itself is also proved in a throwaway scope below ('trial overlay').
  const trialUsed = (await db.query(`SELECT 1 FROM app.licences WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND trial AND edition='CONTROL'`, scopeArgs)).rowCount! > 0;
  if (!trialUsed) {
    // Three minutes, so the trial is over before the next suite needs this scope's development licence.
    const trial = claims('CONTROL', { term: 'TRIAL', trial: true, valid_to: new Date(Date.now() + 180_000).toISOString() });
    await ok(importIt(trial), S.schemas.LicenceState, [200, 201]);
    const during = await state();
    check('a Control trial overlays the paid licence and says what it falls back to', [during.edition, during.trial, during.falls_back_to?.edition], ['CONTROL', true, 'FOUNDATION']);
    const trialWalk = await walk(['FOUNDATION', 'CONTROL']);
    check('during the trial Control writes are allowed', trialWalk.filter(r => r.tier === 'CONTROL' && r.refused).map(r => r.id), []);
    check('during the trial Enterprise writes are still refused', trialWalk.filter(r => r.tier === 'ENTERPRISE' && !r.refused && !r.capability).map(r => r.id), []);
  } else console.log('NOT_RUN HTTP trial walk: this scope already used its Control trial (re-run); the refusal and the overlay are checked instead.');
  check('a second Control trial is refused', (await codes(importIt(claims('CONTROL', { term: 'TRIAL', trial: true, valid_to: days(10) })))).codes, ['trial_already_used']);
  check('a trial longer than 30 days cannot even be expressed', (await importIt(claims('ENTERPRISE', { term: 'TRIAL', trial: true, valid_to: days(45) }))).status, 400);
  sequence--;

  t.setPhase('downgrade waiting for renewal');
  await ok(importIt(claims('ENTERPRISE', { valid_from: days(5), valid_to: days(370) })), S.schemas.LicenceState, [200, 201]);
  check('a licence imported ahead of its start does not take force early', (await state()).edition !== 'ENTERPRISE', true);

  // --- the resolver over time, in throwaway scopes (rows are inserted as the vendor-signed import would store them) ----
  t.setPhase('grace and expiry');
  async function scenario(rows: { edition: string; term: string; from: number; to: number; sequence: number; trial?: boolean; limits?: Record<string, number> }[]) {
    const s = { tenant_id: randomUUID(), legal_entity_id: randomUUID(), environment_id: randomUUID() };
    const ids: string[] = [];
    for (const row of rows) {
      const id = randomUUID(); ids.push(id);
      const c = claims(row.edition, { term: row.term, trial: row.trial ?? false, valid_from: days(row.from), valid_to: days(row.to), sequence: row.sequence, ...(row.limits ? { licensed_limits: { environments: 1, staff_members: 5, member_seats: 3, ...row.limits } } : {}) });
      const sig = signed(c).licence.signature;
      await db.query(`INSERT INTO app.licences(tenant_id,legal_entity_id,environment_id,id,licence_id,installation_id,edition,valid_from,valid_to,signing_key_id,signature,imported_by,claims,term,sequence,trial)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$6,$12,$13,$14,$15)`, [s.tenant_id, s.legal_entity_id, s.environment_id, id, c.licence_id, installation, row.edition, c.valid_from, c.valid_to, vendor.key_id, sig, c, row.term, row.sequence, row.trial ?? false]);
      for (const code of c.entitlements) await db.query('INSERT INTO app.licence_entitlements(tenant_id,legal_entity_id,environment_id,licence_row_id,code) VALUES($1,$2,$3,$4,$5)', [s.tenant_id, s.legal_entity_id, s.environment_id, id, code]);
    }
    const tx = await db.connect();
    try {
      await tx.query('BEGIN');
      await tx.query(`SELECT set_config('orvia.tenant_id',$1,true), set_config('orvia.legal_entity_id',$2,true), set_config('orvia.environment_id',$3,true), set_config('orvia.actor_id',$4,true)`, [s.tenant_id, s.legal_entity_id, s.environment_id, randomUUID()]);
      const effective = (await tx.query('SELECT edition, lifecycle, trial, fallback_id FROM app.effective_licence($1,$2,$3)', [s.tenant_id, s.legal_entity_id, s.environment_id])).rows[0];
      const actor = { actor_id: randomUUID(), actor_domain: 'STAFF', scope: s } as unknown as Parameters<typeof requireEntitlement>[0]['actor'];
      const allowed = async (id: string) => requireEntitlement({ tx, actor, requestId: randomUUID() }, S.routes.find(r => r.id === id)!).then(() => 'ALLOWED', (e: { fieldErrors?: { code: string }[] }) => e.fieldErrors?.[0]?.code ?? 'ERROR');
      const result = { effective, floor: await allowed('create_purposes'), control: await allowed('create_mapping'), automation: (await automationAllowance({ tx, actor, requestId: randomUUID() })).reason };
      await tx.query('ROLLBACK');
      return result;
    } finally { tx.release(); }
  }
  const monthlyGrace = await scenario([{ edition: 'CONTROL', term: 'MONTHLY', from: -33, to: -3, sequence: 1 }]);
  check('a monthly licence 3 days past its end is in grace and everything still works', [monthlyGrace.effective.lifecycle, monthlyGrace.floor, monthlyGrace.control], ['GRACE', 'ALLOWED', 'ALLOWED']);
  const monthlyExpired = await scenario([{ edition: 'CONTROL', term: 'MONTHLY', from: -38, to: -8, sequence: 1 }]);
  check('8 days past a monthly licence: premium work stops, the legal floor continues', [monthlyExpired.effective.lifecycle, monthlyExpired.floor, monthlyExpired.control], ['EXPIRED', 'ALLOWED', 'licence_expired']);
  const annualGrace = await scenario([{ edition: 'CONTROL', term: 'ANNUAL', from: -385, to: -20, sequence: 1 }]);
  check('an annual licence keeps 30 grace days', annualGrace.effective.lifecycle, 'GRACE');
  const quarterly = await scenario([{ edition: 'CONTROL', term: 'QUARTERLY', from: -106, to: -16, sequence: 1 }]);
  check('a quarterly licence keeps 15 grace days', quarterly.effective.lifecycle, 'EXPIRED');
  const fellBack = await scenario([{ edition: 'FOUNDATION', term: 'ANNUAL', from: -40, to: 300, sequence: 1 }, { edition: 'CONTROL', term: 'TRIAL', trial: true, from: -31, to: -1, sequence: 2 }]);
  check('an ended trial falls back to the paid licence with no action', [fellBack.effective.edition, fellBack.effective.trial, fellBack.control], ['FOUNDATION', false, 'entitlement_required']);
  const renewed = await scenario([{ edition: 'ENTERPRISE', term: 'ANNUAL', from: -400, to: -2, sequence: 1 }, { edition: 'FOUNDATION', term: 'MONTHLY', from: -2, to: 28, sequence: 2 }]);
  check('a downgrade at renewal takes force from its start date', [renewed.effective.edition, renewed.control], ['FOUNDATION', 'entitlement_required']);
  const overlay = await scenario([{ edition: 'FOUNDATION', term: 'ANNUAL', from: -40, to: 300, sequence: 1 }, { edition: 'CONTROL', term: 'TRIAL', trial: true, from: -1, to: 13, sequence: 2 }]);
  check('trial overlay: an open trial is in force over the paid licence and allows its tier', [overlay.effective.edition, overlay.effective.trial, overlay.effective.fallback_id !== null, overlay.control], ['CONTROL', true, true, 'ALLOWED']);
  t.setPhase('automation quota');
  check('on Foundation, downstream actions become manual tasks (the withdrawal is still carried out, by a person)', (await scenario([{ edition: 'FOUNDATION', term: 'ANNUAL', from: -1, to: 300, sequence: 1 }])).automation, 'not_in_plan');
  check('on Control within its monthly quota, actions are automated', (await scenario([{ edition: 'CONTROL', term: 'ANNUAL', from: -1, to: 300, sequence: 1, limits: { automated_actions_per_month: 10000 } }])).automation, 'within_quota');
  check('past the monthly quota, actions become manual tasks, never dropped', (await scenario([{ edition: 'CONTROL', term: 'ANNUAL', from: -1, to: 300, sequence: 1, limits: { automated_actions_per_month: 0 } }])).automation, 'monthly_quota_reached');
  check('after expiry, automation stops and actions become manual tasks', (await scenario([{ edition: 'CONTROL', term: 'MONTHLY', from: -40, to: -10, sequence: 1 }])).automation, 'not_in_plan');
  const none = await scenario([]);
  check('with no licence at all, a gated write is refused as unlicensed', none.floor, 'no_licence');
});
