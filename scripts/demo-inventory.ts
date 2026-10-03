/**
 * Data inventory for the demonstration store (owner request 2026-10-03: every module shows the demo data). `demo:data`
 * calls this; `npm run demo:inventory` adds it to an installation where demo:data already ran. It records, through the
 * real API and as declarations (provenance ASSERTED, never "observed"), what the Aster online store holds: four datasets,
 * two fields, a backup copy, and the processing activities that use them, so Data inventory, the graph neighbourhood,
 * change impact and search have something true to show. Re-running adds nothing that already exists (matched by name).
 */
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as S from '../shared/contracts/src/index.ts';

type Caller = { call(path: string, body?: unknown, headers?: Record<string, string>): Promise<Response> };
type Scope = { legal_entity_id: string; environment_id: string };
const key = () => ({ 'idempotency-key': randomUUID() });
async function ok<T>(response: Promise<Response>, schema: { parse(v: unknown): T }): Promise<T> {
  const r = await response; const body = await r.json();
  if (![200, 201].includes(r.status)) throw new Error(`ORVIA answered ${r.status}: ${JSON.stringify(body).slice(0, 400)}`);
  return schema.parse(body);
}

export async function loadInventory(admin: Caller, systemId: string, scope: Scope, say: (t: string) => void) {
  const validFrom = new Date(Date.now() - 100 * 86_400_000).toISOString();
  const assets = S.schemas.DataAssetList.parse(await (await admin.call('/api/v1/admin/data-assets?limit=100')).json()).items;
  const basis = 'Declared by the store team from the store database schema.';
  const asset = async (name: string, kind: (typeof S.DataAssetKind)['_output'], description: string, codes: (typeof S.DataCategoryCode)['_output'][], parent: string | null = null) => {
    const found = assets.find(a => a.name === name && a.system_id === systemId);
    if (found) return found;
    const made = await ok(admin.call('/api/v1/admin/data-assets', { system_id: systemId, kind, parent_id: parent, name, description, provenance: 'ASSERTED', valid_from: validFrom,
      categories: codes.map(code => ({ code, basis, review_state: 'ACCEPTED' })) }, key()), S.schemas.DataAsset);
    say(`data asset "${name}" (${kind.toLowerCase().replace('_', ' ')})`); return made;
  };
  const accounts = await asset('Customer accounts', 'DATASET', 'One row per registered shopper: name, email, phone, customer number.', ['CONTACT_DETAILS', 'IDENTIFIERS']);
  await asset('Email address', 'FIELD', 'The shopper\'s sign-in and contact email.', ['CONTACT_DETAILS'], accounts.id);
  await asset('Customer number', 'FIELD', 'The store\'s reference for the shopper (cust_…).', ['IDENTIFIERS'], accounts.id);
  const orders = await asset('Order history', 'DATASET', 'Orders, delivery addresses and payment status (no card numbers).', ['ORDER_RECORDS', 'IDENTIFIERS']);
  const prefs = await asset('Marketing preferences', 'DATASET', 'Email and SMS opt-in state per shopper, synchronised from consent records.', ['MARKETING_PREFERENCES', 'IDENTIFIERS']);
  await asset('Support tickets', 'DATASET', 'Customer service conversations, including privacy requests received by phone.', ['SUPPORT_NOTES', 'CONTACT_DETAILS']);
  const backup = await asset('Nightly backup of customer accounts', 'BACKUP_COPY', 'Encrypted nightly copy kept for 30 days.', ['CONTACT_DETAILS', 'IDENTIFIERS']);

  const edges = S.schemas.GraphRelationshipList.parse(await (await admin.call('/api/v1/admin/graph/relationships?limit=100')).json()).items;
  const edge = async (relationship_type: (typeof S.RelationshipType)['_output'], from: { kind: S.GraphNodeKindValue; id: string }, to: { kind: S.GraphNodeKindValue; id: string }) => {
    if (edges.some(e => e.relationship_type === relationship_type && e.from.id === from.id && e.to.id === to.id)) return;
    await ok(admin.call('/api/v1/admin/graph/relationships', { relationship_type, from, to, provenance: 'ASSERTED', valid_from: validFrom, confidence_basis: basis }, key()), S.schemas.GraphRelationship);
  };
  for (const a of [accounts, orders, prefs, backup]) await edge('ASSET_STORED_IN_SYSTEM', { kind: 'DATA_ASSET', id: a.id }, { kind: 'SYSTEM', id: systemId });
  await edge('ASSET_COPIED_TO', { kind: 'DATA_ASSET', id: accounts.id }, { kind: 'DATA_ASSET', id: backup.id });

  // Graph processing activities serve the installation's purposes (marketing; order service).
  const purposes = S.schemas.PurposeList.parse(await (await admin.call('/api/v1/admin/purposes?limit=100')).json()).items;
  const purpose = async (code: 'promotional_marketing' | 'order_service_demo', name: string, description: string) =>
    purposes.find(p => p.code === code) ?? await ok(admin.call('/api/v1/admin/purposes', { legal_entity_id: scope.legal_entity_id, environment_id: scope.environment_id, code, name, description }, key()), S.schemas.Purpose);
  const marketing = await purpose('promotional_marketing', 'Promotional email and SMS', 'Offers by email and SMS to shoppers who agreed.');
  const service = await purpose('order_service_demo', 'Order fulfilment and delivery', 'Processing orders and delivering them.');
  const activities = S.schemas.ProcessingActivityList.parse(await (await admin.call('/api/v1/admin/processing-activities?limit=100')).json()).items;
  const activity = async (name: string, purposeId: string, lawful_condition: (typeof S.LawfulCondition)['_output'], description: string) =>
    activities.find(a => a.name === name) ?? await ok(admin.call('/api/v1/admin/processing-activities', { purpose_id: purposeId, name, description, lawful_condition, owner_reference: 'Head of Customer Experience' }, key()), S.schemas.ProcessingActivity);
  const aMarketing = await activity('Send promotional email and SMS', marketing.id, 'AFFIRMATIVE_MARKETING_CONSENT', 'Selects shoppers with marketing consent in force and sends offers.');
  const aService = await activity('Fulfil and deliver orders', service.id, 'APPROVED_SYNTHETIC_ORDER_SERVICE', 'Picks, packs and delivers orders.');
  await edge('ACTIVITY_SERVES_PURPOSE', { kind: 'PROCESSING_ACTIVITY', id: aMarketing.id }, { kind: 'PURPOSE', id: marketing.id });
  await edge('ACTIVITY_SERVES_PURPOSE', { kind: 'PROCESSING_ACTIVITY', id: aService.id }, { kind: 'PURPOSE', id: service.id });
  for (const a of [accounts, prefs]) await edge('ASSET_PROCESSED_BY_ACTIVITY', { kind: 'DATA_ASSET', id: a.id }, { kind: 'PROCESSING_ACTIVITY', id: aMarketing.id });
  for (const a of [accounts, orders]) await edge('ASSET_PROCESSED_BY_ACTIVITY', { kind: 'DATA_ASSET', id: a.id }, { kind: 'PROCESSING_ACTIVITY', id: aService.id });
  say('privacy graph: datasets stored in the store system, used by marketing and order fulfilment');
}

// Standalone: npm run demo:inventory (rehearsal, after demo:data).
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.env.ORVIA_DEMO_REEXEC !== '1') {
    const { childEnvironment, toolchainExecutable } = await import('./orvia-cli.ts');
    const child = spawnSync(toolchainExecutable(), ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true, env: { ...childEnvironment(), ORVIA_DEMO_REEXEC: '1' } });
    process.exit(child.status ?? 1);
  }
  const { HttpFixture } = await import('../shared/testing/src/http-fixture.ts');
  const h = new HttpFixture();
  if (h.config.profile !== 'rehearsal') throw new Error('The demonstration inventory is added on the rehearsal installation only.');
  const file = resolve('.local/profiles/rehearsal/demo/dataset.json');
  if (!existsSync(file)) { process.stdout.write('\n  Run npm run demo:data first.\n\n'); process.exit(1); }
  const dataset = JSON.parse(readFileSync(file, 'utf8')) as { system_id: string };
  const admin = await h.login('admin');
  await loadInventory(admin, dataset.system_id, h.users.owner!.scope, t => process.stdout.write(`  ok   ${t}\n`));
  process.stdout.write('\n  Data inventory ready: open Data inventory and Records of processing as the owner or admin.\n\n');
}
