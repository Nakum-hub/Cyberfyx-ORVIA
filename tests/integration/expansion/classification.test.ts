// EX04 value classification and EX12 access exposure, through the HTTP boundary and the worker.
// Under test: a value-sampling run needs connection authority and an approved
// target; the worker samples through the read-only observer role and stores
// counts, never values; checksum classifiers reject decoys; grants are read from
// the catalog ACLs and turned into exposure findings; quality is measured
// against reviewed labels and responds when the labels change; a missing
// relation and a disabled target are explicit outcomes; tenants are isolated
// and the database refuses rewrites.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key } from '../../../shared/testing/src/operations-fixture.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';
import { workflowActivities } from '../../../services/worker/src/withdrawal-worker.ts';
import { sweepClassification } from '../../../services/worker/src/classification.ts';
import { observerEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { luhnValid, verhoeffValid } from '../../../connectors/src/discovery/classifiers.ts';

const t = operationsSuite('classification');
const { h, check, ok, codes, db } = t;
const Run = S.schemas.ClassificationRun;
const target = recordsTarget();

// A deterministic synthetic corpus: every value below is generated, fictional and shaped for its column.
let seed = 7;
const rand = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
const digits = (n: number, first = '') => first + Array.from({ length: n - first.length }, () => String(rand(10))).join('');
function aadhaar() { for (;;) { const d = digits(12, String(2 + rand(8))); if (verhoeffValid(d)) return d; } }
function notAadhaar() { for (;;) { const d = digits(12, String(2 + rand(8))); if (!verhoeffValid(d)) return d; } }
function card() { for (;;) { const d = digits(16, '4'); if (luhnValid(d)) return d; } }
function notCard() { for (;;) { const d = digits(16, '4'); if (!luhnValid(d)) return d; } }
const letters = (n: number) => Array.from({ length: n }, () => String.fromCharCode(65 + rand(26))).join('');

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const s = t.scope();
  const runtime = workflowActivities();
  const sweep = () => sweepClassification(runtime.scoped, runtime.enrollment.identities.map(x => x.id), observerEnrollment(runtime.config).identities, runtime.observer);
  try {
    t.setPhase('corpus');
    const marker = randomUUID().slice(0, 8);
    const rows = Array.from({ length: 200 }, (_, i) => [
      `Synthetic Person ${marker} ${i}`, `person${i}.${marker}@records.example`, `+91 ${6 + rand(4)}${digits(9)}`, `${letters(3)}P${letters(1)}${digits(4)}${letters(1)}`, aadhaar(), card(),
      `${letters(4)}0${digits(6)}`, `10.${rand(255)}.${rand(255)}.${rand(255)}`, 'Pune', i % 10 === 0 ? `Wrote to support${i}@help.example about delivery.` : 'Called about delivery.', notAadhaar(), notCard(),
    ]);
    const firstEmail = rows[0]![1]!;
    // Existing rows from earlier runs share the scope; this run's corpus is what the sample reads first only if the table is fresh, so the table is cleared for this scope.
    await target.pool.query('DELETE FROM customer_profiles WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3', [s.tenant_id, s.legal_entity_id, s.environment_id]);
    for (const r of rows) await target.pool.query(`INSERT INTO customer_profiles(tenant_id,legal_entity_id,environment_id,full_name,contact_email,mobile,pan,aadhaar,card_number,ifsc,ip_address,city,notes,order_reference,legacy_card)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [s.tenant_id, s.legal_entity_id, s.environment_id, ...r]);
    await target.pool.query('DELETE FROM legacy_contact_exports WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3', [s.tenant_id, s.legal_entity_id, s.environment_id]);
    for (let i = 0; i < 50; i++) await target.pool.query('INSERT INTO legacy_contact_exports(tenant_id,legal_entity_id,environment_id,contact_email,mobile) VALUES($1,$2,$3,$4,$5)',
      [s.tenant_id, s.legal_entity_id, s.environment_id, `export${i}.${marker}@records.example`, `9${digits(9)}`]);

    t.setPhase('request');
    const system = await t.boundSystem('Classification source');
    const register = async (relation: string) => {
      const created = await ok(admin.call('/api/v1/admin/catalog-discovery-targets', { system_id: system.id, schema_name: 'public', relation_name: relation }, key()), S.schemas.CatalogDiscoveryTarget);
      await ok(owner.call(`/api/v1/admin/catalog-discovery-targets/${created.id}/approve`, {}, key()), S.schemas.CatalogDiscoveryTarget, [200]);
      return created;
    };
    const pending = await ok(admin.call('/api/v1/admin/catalog-discovery-targets', { system_id: system.id, schema_name: 'public', relation_name: 'customer_profiles' }, key()), S.schemas.CatalogDiscoveryTarget);
    const request = (who: typeof admin, id: string, limit = 500) => who.call(`/api/v1/admin/catalog-discovery-targets/${id}/classification-runs`, { sample_limit: limit }, key());
    check('an unapproved target cannot be sampled', await codes(request(owner, pending.id)), { status: 409, codes: ['target_not_approved'] });
    await ok(owner.call(`/api/v1/admin/catalog-discovery-targets/${pending.id}/approve`, {}, key()), S.schemas.CatalogDiscoveryTarget, [200]);
    const profiles = pending; const exports = await register('legacy_contact_exports'); const missing = await register('does_not_exist');
    check('an admin without connection authority cannot request value sampling', (await request(admin, profiles.id)).status, 403);
    const queued = await ok(request(owner, profiles.id), Run);
    check('a run is queued, not carried out in the request', [queued.state, queued.columns, queued.findings], ['QUEUED', [], []]);
    check('only one run per target can be queued', await codes(request(owner, profiles.id)), { status: 409, codes: ['a_run_is_already_queued'] });
    const exportRun = await ok(request(owner, exports.id, 100), Run); const missingRun = await ok(request(owner, missing.id, 10), Run);

    t.setPhase('worker sampling');
    check('the worker carries out queued runs', await sweep() >= 3, true);
    const run = await ok(admin.call(`/api/v1/admin/classification-runs/${queued.id}`), Run);
    check('the run completed through the observer with a bounded sample', [run.state, run.relation_state, run.rows_sampled, run.ruleset], ['COMPLETED', 'CLASSIFIED', 200, 'value-classifiers v1']);
    const cat = (column: string) => { const c = run.columns.find(x => x.column === column)!; return [c.category, c.confidence]; };
    check('each shaped column is classified with confidence', ['contact_email', 'mobile', 'pan', 'aadhaar', 'card_number', 'ifsc', 'ip_address'].map(cat),
      [['EMAIL', 'CONFIRMED'], ['PHONE_IN', 'CONFIRMED'], ['PAN', 'CONFIRMED'], ['AADHAAR', 'CONFIRMED'], ['PAYMENT_CARD', 'CONFIRMED'], ['IFSC', 'CONFIRMED'], ['IPV4', 'CONFIRMED']]);
    check('numbers that fail the Aadhaar or card checksum are not classified', [cat('order_reference'), cat('legacy_card')], [[null, 'NONE'], [null, 'NONE']]);
    check('free text with a few addresses is not an email column, and names are not guessed', [cat('notes'), cat('full_name'), cat('city')], [[null, 'NONE'], [null, 'NONE'], [null, 'NONE']]);
    check('the counts are shown for each column, and a value that merely contains an address is not an address', [run.columns.find(x => x.column === 'contact_email')!.matches.EMAIL, run.columns.find(x => x.column === 'notes')!.matches.EMAIL], [200, 0]);
    const stored = JSON.stringify((await db.query('SELECT columns, grants, limits FROM app.classification_runs WHERE id=$1', [queued.id])).rows[0]);
    check('no sampled value is stored', [stored.includes(firstEmail), stored.includes(rows[0]![4]!), stored.includes(marker)], [false, false, false]);
    check('the run states its limits', run.limits.length, 3);

    t.setPhase('access exposure');
    const findings = run.findings.map(f => [f.kind, f.severity, f.grantee]);
    check('the write agent reading high-sensitivity columns is a finding', findings.some(f => f[0] === 'READ_WRITE_ROLE_CAN_READ' && f[1] === 'MEDIUM' && f[2] === 'orvia_target_agent'), true);
    check('this product\'s own observer and the owner are reported as information', [findings.some(f => f[0] === 'ORVIA_OBSERVER' && f[1] === 'INFO'), findings.some(f => f[0] === 'OWNER' && f[1] === 'INFO')], [true, true]);
    check('grants come from the catalog, including roles other than the observer', run.grants.map(g => g.grantee).includes('orvia_target_agent'), true);
    const exportDetail = await ok(admin.call(`/api/v1/admin/classification-runs/${exportRun.id}`), Run);
    check('a table readable by PUBLIC is a finding, graded by what it holds', exportDetail.findings.filter(f => f.kind === 'PUBLIC_CAN_READ').map(f => [f.severity, f.categories.sort()]), [['MEDIUM', ['EMAIL', 'PHONE_IN']]]);
    const exposure = (await ok(admin.call('/api/v1/admin/exposure-findings?limit=100'), S.schemas.ExposureSummaryList)).items;
    check('the exposure list shows each target\'s latest classification', [exposure.some(e => e.target_id === profiles.id && e.sensitive_columns.includes('aadhaar')), exposure.some(e => e.target_id === exports.id)], [true, true]);
    const missingDetail = await ok(admin.call(`/api/v1/admin/classification-runs/${missingRun.id}`), Run);
    check('a relation that does not exist is reported as missing, not as clean', [missingDetail.state, missingDetail.relation_state, missingDetail.columns.length], ['COMPLETED', 'MISSING', 0]);

    t.setPhase('measured quality');
    const truth: Record<string, string> = { full_name: 'NONE', contact_email: 'EMAIL', mobile: 'PHONE_IN', pan: 'PAN', aadhaar: 'AADHAAR', card_number: 'PAYMENT_CARD', ifsc: 'IFSC', ip_address: 'IPV4', city: 'NONE', notes: 'NONE', order_reference: 'NONE', legacy_card: 'NONE' };
    check('quality cannot be measured without labels', await codes(admin.call(`/api/v1/admin/classification-runs/${queued.id}/quality`, {}, key())), { status: 409, codes: ['no_reviewed_labels'] });
    await ok(admin.call(`/api/v1/admin/catalog-discovery-targets/${profiles.id}/classification-labels`, { labels: Object.entries(truth).map(([column, expected]) => ({ column, expected, basis: 'Reviewed against the synthetic corpus definition.' })) }, key()), S.schemas.ClassificationLabelSet);
    let quality = await ok(admin.call(`/api/v1/admin/classification-runs/${queued.id}/quality`, {}, key()), S.schemas.ClassificationQuality);
    check('against the reviewed labels every column is right', [quality.measurement.columns_labelled, quality.measurement.correct, quality.measurement.accuracy, quality.measurement.per_category.every(x => x.precision === 1 && x.recall === 1)], [12, 12, 1, true]);
    // A reviewer decides the notes column should count as an email column: the measurement must reflect that disagreement.
    await ok(admin.call(`/api/v1/admin/catalog-discovery-targets/${profiles.id}/classification-labels`, { labels: [{ column: 'notes', expected: 'EMAIL', basis: 'Reviewer considers notes a contact channel.' }] }, key()), S.schemas.ClassificationLabelSet);
    quality = await ok(admin.call(`/api/v1/admin/classification-runs/${queued.id}/quality`, {}, key()), S.schemas.ClassificationQuality);
    const email = quality.measurement.per_category.find(x => x.category === 'EMAIL')!;
    check('a changed label changes the measurement', [quality.measurement.correct, email.true_positives, email.false_negatives, email.recall], [11, 1, 1, 0.5]);
    check('every measurement is kept', (await ok(admin.call(`/api/v1/admin/classification-runs/${queued.id}/quality?limit=10`), S.schemas.ClassificationQualityList)).items.length, 2);
    check('a missing relation cannot be measured', await codes(admin.call(`/api/v1/admin/classification-runs/${missingRun.id}/quality`, {}, key())), { status: 409, codes: ['only_a_completed_classification_is_measured'] });

    t.setPhase('disabled target and isolation');
    const again = await ok(request(owner, exports.id, 50), Run);
    await ok(owner.call(`/api/v1/admin/catalog-discovery-targets/${exports.id}/disable`, {}, key()), S.schemas.CatalogDiscoveryTarget, [200]);
    await sweep();
    const disabled = await ok(admin.call(`/api/v1/admin/classification-runs/${again.id}`), Run);
    check('a run whose target was disabled fails explicitly', [disabled.state, disabled.failure_code], ['FAILED', 'TARGET_NOT_APPROVED']);
    check('an auditor reads runs but cannot request or label', [(await auditor.call(`/api/v1/admin/classification-runs/${queued.id}`)).status, (await request(auditor, profiles.id)).status,
      (await auditor.call(`/api/v1/admin/catalog-discovery-targets/${profiles.id}/classification-labels`, { labels: [{ column: 'city', expected: 'NONE', basis: 'Auditor attempt at labelling.' }] }, key())).status], [200, 403, 403]);
    check('another tenant sees nothing', [(await birch.call(`/api/v1/admin/classification-runs/${queued.id}`)).status, (await ok(birch.call('/api/v1/admin/exposure-findings?limit=100'), S.schemas.ExposureSummaryList)).items.some(e => e.target_id === profiles.id)], [404, false]);
    const direct = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'accepted').catch((x: { code?: string }) => x.code ?? 'rejected');
    check('a completed run cannot be rewritten', await direct(`UPDATE app.classification_runs SET columns='[]' WHERE id=$1`, [queued.id]), '23514');
    check('a label cannot be deleted', await direct(`DELETE FROM app.classification_labels WHERE target_id=$1`, [profiles.id]), '23514');
    check('a quality measurement cannot be altered', await direct(`UPDATE app.classification_quality SET measurement='{}' WHERE run_id=$1`, [queued.id]), '23514');
  } finally { await runtime.close(); await target.end(); }
});
