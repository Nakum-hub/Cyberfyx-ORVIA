// EX05 records of processing and bounded resumable exports, through the real HTTP boundary.
// Under test: entries derived from registry declarations, bindings, declared
// locations, recipients, retention and the privacy graph, with a real catalog
// read as the only source of "observed"; missing, stale and conflicting links;
// cross-border transfers; change impact across registry links, graph edges and
// sub-processors; immutable versions approved by a second person, with diffs;
// exports written in bounded chunks under the requester's authority, resumable,
// complete only when a recount matches, refused for download otherwise; export
// privacy between staff and tenants; database immutability and row security.
import { createHash, randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow, unique } from '../../../shared/testing/src/operations-fixture.ts';
import { workflowActivities } from '../../../services/worker/src/withdrawal-worker.ts';
import { sweepCatalogDiscovery } from '../../../services/worker/src/catalog-discovery.ts';
import { observerEnrollment } from '../../../backend/auth/src/machine-profile.ts';

const t = operationsSuite('ropa-exports');
const { h, check, ok, codes, db } = t;
const Entry = S.schemas.RopaEntry; const Job = S.schemas.DataExport;
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const kinds = (e: { gaps: { kind: string; target_id: string | null }[] }, target?: string) => [...new Set(e.gaps.filter(g => !target || g.target_id === target).map(g => g.kind))].sort();

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const s = t.scope();
  const runtime = workflowActivities();
  try {
    t.setPhase('setup');
    const sysA = await t.boundSystem('RoPA CRM');
    const sysB = await ok(admin.call('/api/v1/admin/systems', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, name: unique('RoPA unbound store'), connector: 'SYNTHETIC_CRM' }, key()), S.schemas.System);
    const sysC = await ok(admin.call('/api/v1/admin/systems', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, name: unique('RoPA graph-only warehouse'), connector: 'SYNTHETIC_CRM' }, key()), S.schemas.System);
    const v1Purpose = await ok(admin.call('/api/v1/admin/purposes', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, code: 'order_service_demo', name: unique('RoPA V1 purpose'), description: 'Synthetic V1 purpose for the graph activity.' }, key()), S.schemas.Purpose);
    const graphActivity = await ok(admin.call('/api/v1/admin/processing-activities', { purpose_id: v1Purpose.id, name: unique('RoPA graph activity'), description: 'Graph activity mirrored by the registry activity.',
      lawful_condition: 'APPROVED_SYNTHETIC_ORDER_SERVICE', owner_reference: 'Synthetic operations' }, key()), S.schemas.ProcessingActivity);
    const asset = await ok(admin.call('/api/v1/admin/data-assets', { system_id: sysC.id, kind: 'DATASET', parent_id: null, name: 'warehouse_orders', description: 'Asserted warehouse dataset.', provenance: 'ASSERTED', valid_from: hoursFromNow(-1), categories: [] }, key()), S.schemas.DataAsset);
    await ok(admin.call('/api/v1/admin/graph/relationships', { relationship_type: 'ASSET_PROCESSED_BY_ACTIVITY', from: { kind: 'DATA_ASSET', id: asset.id }, to: { kind: 'PROCESSING_ACTIVITY', id: graphActivity.id },
      provenance: 'ASSERTED', valid_from: hoursFromNow(-1), confidence_basis: 'Declared during graph review.' }, key()), S.schemas.GraphRelationship);
    const injected = "=HYPERLINK(\"http://example.invalid\")";
    const { activity, dataCategory, purpose } = await t.activity({ condition: 'CONSENT', systems: [sysA.id], graphActivityId: graphActivity.id, description: injected });

    t.setPhase('derived entry and gaps');
    let e = await ok(admin.call(`/api/v1/admin/ropa/entries/${activity.id}`), Entry);
    check('the entry carries the declared purpose, condition, categories and system with their basis', [e.purpose?.name, e.condition?.code, e.data_categories.map(d => d.id), e.systems.map(x => [x.id, x.binding_adapter, x.basis])],
      [purpose.name, 'CONSENT', [dataCategory.id], [[sysA.id, 'SYNTHETIC_RECORDS_TEST_ADAPTER', 'Synthetic declaration.']]]);
    check('a bound system without a location or any reading is named as such', kinds(e, sysA.id), ['DECLARED_SYSTEM_NOT_IN_GRAPH', 'LOCATION_UNDECLARED', 'NOT_OBSERVED']);
    check('the graph placing the activity on an undeclared system is a conflict', kinds(e, sysC.id), ['GRAPH_SYSTEM_NOT_DECLARED']);
    check('missing retention is named', kinds(e).includes('NO_RETENTION_RULE'), true);
    check('a declaration is not shown as observed', e.systems[0]!.observed, null);
    check('the graph edge keeps its provenance and review state', e.graph.systems.map(g => [g.system_id, g.provenance, g.review_state]), [[sysC.id, 'ASSERTED', 'UNREVIEWED']]);
    await ok(admin.call(`/api/v1/admin/registry-activities/${activity.id}/links`, { link_kind: 'SYSTEM', target_id: sysB.id, channel: null, basis: 'Declared by the activity owner.', valid_from: hoursFromNow(-1) }, key()), S.schemas.Activity);
    e = await ok(admin.call(`/api/v1/admin/ropa/entries/${activity.id}`), Entry);
    check('a declared system without a binding is missing its binding', kinds(e, sysB.id).includes('UNBOUND_SYSTEM'), true);

    t.setPhase('locations and transfers');
    const loc = (id: string, region: string, validFrom: string) => admin.call(`/api/v1/admin/systems/${id}/locations`, { region, hosting_description: 'Customer-operated hosting', basis: 'Declared from the hosting contract schedule.', valid_from: validFrom }, key());
    check('a location that is not a region code is refused', (await loc(sysA.id, 'India', hoursFromNow(-3))).status, 400);
    await ok(loc(sysA.id, 'IN-KA', hoursFromNow(-3)), S.schemas.SystemLocation);
    e = await ok(admin.call(`/api/v1/admin/ropa/entries/${activity.id}`), Entry);
    check('a declared domestic location is a transfer that is not cross-border', [e.systems.find(x => x.id === sysA.id)?.location?.region, e.transfers.filter(x => x.target_id === sysA.id).map(x => x.cross_border), kinds(e, sysA.id).includes('LOCATION_UNDECLARED')], ['IN-KA', [false], false]);
    check('a declaration dated before the current one is refused', await codes(loc(sysA.id, 'US', hoursFromNow(-4))), { status: 409, codes: ['after_the_current_declaration'] });
    await ok(loc(sysA.id, 'US', hoursFromNow(-2)), S.schemas.SystemLocation);
    const history = await ok(admin.call(`/api/v1/admin/systems/${sysA.id}/locations?limit=10`), S.schemas.SystemLocationList);
    check('a new location closes the previous declaration, which is kept', history.items.map(x => [x.region, x.valid_to === null]).sort(), [['IN-KA', false], ['US', true]]);
    e = await ok(admin.call(`/api/v1/admin/ropa/entries/${activity.id}`), Entry);
    check('a location outside India is a cross-border transfer', e.transfers.filter(x => x.target_id === sysA.id).map(x => [x.region, x.cross_border]), [['US', true]]);
    const processor = (name: string, region: string) => ok(admin.call('/api/v1/admin/processors', { name: unique(name), role: 'PROCESSOR', authorised_purpose_ids: [v1Purpose.id], authorised_categories: ['CONTACT_DETAILS'], region,
      contract_reference: 'DPA R-1', owner_reference: 'Vendor management', incident_contact: 'incidents@vendor.example', subprocessors_permitted: true }, key()), S.schemas.Processor);
    const engage = (processorId: string, parent: string | null) => ok(admin.call('/api/v1/admin/processor-engagements', { processor_id: processorId, service_description: unique('Service'), subprocessor_of: parent, effective_from: hoursFromNow(-24),
      contract_evidence_reference: null, safeguard_evidence_reference: null, links: [] }, key()), S.schemas.Engagement);
    const mailer = await processor('RoPA mailer', 'SG'); const vague = await processor('RoPA vague vendor', 'Synthetic region');
    const mailEngagement = await engage(mailer.id, null); const vagueEngagement = await engage(vague.id, null);
    for (const id of [mailEngagement.id, vagueEngagement.id])
      await ok(admin.call(`/api/v1/admin/registry-activities/${activity.id}/links`, { link_kind: 'PROCESSOR_ENGAGEMENT', target_id: id, channel: null, basis: 'Declared by the activity owner.', valid_from: hoursFromNow(-1) }, key()), S.schemas.Activity);
    e = await ok(admin.call(`/api/v1/admin/ropa/entries/${activity.id}`), Entry);
    check('a recipient in another country is a cross-border transfer', e.transfers.filter(x => x.via === 'RECIPIENT').map(x => [x.name, x.region, x.cross_border]), [[mailer.name, 'SG', true]]);
    check('a recipient region that is not a code is named, not guessed', kinds(e, vague.id), ['RECIPIENT_REGION_NOT_A_CODE']);
    await ok(owner.call(`/api/v1/admin/processor-engagements/${vagueEngagement.id}/termination`, { terminated_at: hoursFromNow(-0.5), reason: 'Service withdrawn for the RoPA suite.', disposition_required: false }, key()), S.schemas.Engagement);
    e = await ok(admin.call(`/api/v1/admin/ropa/entries/${activity.id}`), Entry);
    check('terminating an engagement closes its activity link, so the recipient leaves the entry', e.recipients.some(r => r.engagement_id === vagueEngagement.id), false);
    // The registry still accepts a link to an ended engagement; the record must then call it stale.
    await ok(admin.call(`/api/v1/admin/registry-activities/${activity.id}/links`, { link_kind: 'PROCESSOR_ENGAGEMENT', target_id: vagueEngagement.id, channel: null, basis: 'Re-linked from an old declaration.', valid_from: hoursFromNow(-0.1) }, key()), S.schemas.Activity);
    e = await ok(admin.call(`/api/v1/admin/ropa/entries/${activity.id}`), Entry);
    check('an ended engagement linked again is stale', [kinds(e, vagueEngagement.id), e.recipients.find(r => r.engagement_id === vagueEngagement.id)?.status], [['RECIPIENT_ENDED'], 'ENDED']);

    t.setPhase('observed reading');
    const target = await ok(admin.call('/api/v1/admin/catalog-discovery-targets', { system_id: sysA.id, schema_name: 'public', relation_name: 'marketing_memberships' }, key()), S.schemas.CatalogDiscoveryTarget);
    await ok(owner.call(`/api/v1/admin/catalog-discovery-targets/${target.id}/approve`, {}, key()), S.schemas.CatalogDiscoveryTarget, [200]);
    await sweepCatalogDiscovery(runtime.scoped, runtime.enrollment.identities.map(x => x.id), observerEnrollment(runtime.config).identities, runtime.observer);
    const detail = await ok(admin.call(`/api/v1/admin/catalog-discovery-targets/${target.id}`), S.schemas.CatalogDiscoveryDetail);
    await ok(admin.call('/api/v1/admin/data-assets/from-catalog', { observation_id: detail.observations[0]!.id }, key()), S.schemas.DataAsset);
    e = await ok(admin.call(`/api/v1/admin/ropa/entries/${activity.id}`), Entry);
    const observedA = e.systems.find(x => x.id === sysA.id)!;
    check('an independent catalog read makes the system observed, with its freshness bound', [observedA.observed?.fresh, kinds(e, sysA.id).includes('NOT_OBSERVED')], [true, false]);
    check('the declaration and the reading are shown side by side', [observedA.basis, observedA.observed !== null], ['Synthetic declaration.', true]);

    t.setPhase('summary and impact');
    const summary = await ok(admin.call('/api/v1/admin/ropa/summary'), S.schemas.RopaSummary);
    check('the summary counts activities, gaps and cross-border transfers and states its limits', [summary.activities >= 1, summary.cross_border_transfers >= 2, summary.gaps.some(g => g.kind === 'GRAPH_SYSTEM_NOT_DECLARED'), summary.limits.length, summary.home_region], [true, true, true, 3, 'IN']);
    const impact = (kind: string, id: string) => ok(admin.call(`/api/v1/admin/ropa/impact?kind=${kind}&target_id=${id}`), S.schemas.RopaImpact);
    check('a system change reaches activities through registry links', (await impact('SYSTEM', sysB.id)).activities.map(a => [a.activity_id, a.via]), [[activity.id, 'REGISTRY_LINK']]);
    const viaGraph = await impact('SYSTEM', sysC.id);
    check('and through the graph where only the graph places it', [viaGraph.activities.map(a => [a.activity_id, a.via]), viaGraph.graph_asset_count], [[[activity.id, 'GRAPH']], 1]);
    const subProcessor = await processor('RoPA sub-processor', 'IN');
    const subEngagement = await engage(subProcessor.id, mailEngagement.id);
    const second = await t.activity({ condition: 'CONSENT', systems: [sysA.id] });
    await ok(admin.call(`/api/v1/admin/registry-activities/${second.activity.id}/links`, { link_kind: 'PROCESSOR_ENGAGEMENT', target_id: subEngagement.id, channel: null, basis: 'Declared by the activity owner.', valid_from: hoursFromNow(-1) }, key()), S.schemas.Activity);
    const viaProcessor = await impact('PROCESSOR', mailer.id);
    check('a processor change reaches activities that use its sub-processor', viaProcessor.activities.map(a => [a.activity_id, a.via]).sort(), [[activity.id, 'REGISTRY_LINK'], [second.activity.id, 'SUBPROCESSOR']].sort());
    check('a data category change reaches its activities', (await impact('DATA_CATEGORY', dataCategory.id)).activities.map(a => a.activity_id), [activity.id]);
    const viaPurpose = await impact('PURPOSE', purpose.id);
    check('a purpose change reaches its activities and reports consent records', [viaPurpose.activities.map(a => [a.activity_id, a.via]), viaPurpose.consent_record_count], [[[activity.id, 'PURPOSE_VERSION']], 0]);
    check('an unknown target is refused', (await admin.call(`/api/v1/admin/ropa/impact?kind=SYSTEM&target_id=${randomUUID()}`)).status, 404);

    t.setPhase('versions and diff');
    const v1 = await ok(admin.call('/api/v1/admin/ropa/versions', { note: 'Quarterly record of processing.' }, key()), S.schemas.RopaVersion);
    check('a version snapshots every active activity with a digest', [v1.activity_count >= 2, /^[a-f0-9]{64}$/.test(v1.content_digest), v1.approved_by], [true, true, null]);
    check('an admin without approval authority cannot approve', (await admin.call(`/api/v1/admin/ropa/versions/${v1.id}/approval`, { note: 'Approving my own record.' }, key())).status, 403);
    await ok(loc(sysB.id, 'IN-MH', hoursFromNow(-1)), S.schemas.SystemLocation);
    const v2 = await ok(owner.call('/api/v1/admin/ropa/versions', { note: 'After declaring the store location.' }, key()), S.schemas.RopaVersion);
    check('the recorder cannot approve their own version', await codes(owner.call(`/api/v1/admin/ropa/versions/${v2.id}/approval`, { note: 'Approving my own record.' }, key())), { status: 409, codes: ['recorder_cannot_approve'] });
    const approved = await ok(reviewer.call(`/api/v1/admin/ropa/versions/${v2.id}/approval`, { note: 'Reviewed against the registry.' }, key()), S.schemas.RopaVersion);
    check('a second person approves it once', [approved.approved_by === h.users.reviewer!.id, (await reviewer.call(`/api/v1/admin/ropa/versions/${v2.id}/approval`, { note: 'Approving again.' }, key())).status], [true, 409]);
    const diff = await ok(admin.call(`/api/v1/admin/ropa/versions/${v2.id}/diff?against=${v1.id}`), S.schemas.RopaDiff);
    const changed = diff.changed.find(x => x.activity_id === activity.id);
    check('the diff names what changed for the activity', [diff.from_version, diff.to_version, changed?.fields.includes('systems'), changed?.fields.includes('transfers'), diff.complete], [v1.version, v2.version, true, true, true]);

    t.setPhase('record-of-processing export');
    const drive = async (who: typeof admin, id: string) => { let j = await ok(who.call(`/api/v1/admin/data-exports/${id}`), Job); let steps = 0; while (j.state === 'RUNNING' && steps++ < 50) j = await ok(who.call(`/api/v1/admin/data-exports/${id}/step`, {}, key()), Job); return j; };
    const download = async (who: typeof admin, j: ReturnType<typeof Job.parse>) => { const parts: string[] = []; for (let n = 1; n <= j.chunks; n++) { const ch = await ok(who.call(`/api/v1/admin/data-exports/${j.id}/chunk?sequence=${n}`), S.schemas.DataExportChunk); if (sha(ch.content) !== ch.sha256) throw new Error('chunk digest mismatch'); parts.push(ch.content); } return parts; };
    let job = await ok(admin.call('/api/v1/admin/data-exports', { kind: 'ROPA_VERSION_CSV', ropa_version_id: v2.id, audit_filter: null }, key()), Job);
    check('a new export is running and states what it will contain', [job.state, job.expected_rows > 0, job.rows_written], ['RUNNING', true, 0]);
    check('a running export cannot be downloaded', (await admin.call(`/api/v1/admin/data-exports/${job.id}/chunk?sequence=1`)).status, 409);
    job = await drive(admin, job.id);
    check('driven to the end it completes with a manifest', [job.state, job.rows_written, job.manifest?.rows, job.manifest?.complete], ['COMPLETED', job.expected_rows, job.expected_rows, true]);
    const parts = await download(admin, job);
    check('the manifest digest covers the chunk digests in order', sha(job.manifest!.chunks.map(ch => ch.sha256).join('\n')), job.manifest!.digest);
    const lines = parts.join('').trimEnd().split('\n');
    check('the CSV has its header and every counted row', [lines[0], lines.length - 1], [job.manifest!.columns.join(','), job.expected_rows]);
    check('a cell that a spreadsheet would evaluate is neutralised', lines.some(l => l.includes(`"'${injected.replaceAll('"', '""')}"`)), true);
    check('the export describes the version, not the live registry', lines.filter(l => l.startsWith(activity.id) && l.includes(',TRANSFER,')).length > 0, true);

    t.setPhase('audit export in bounded chunks');
    const probe = `synthetic.export_probe.${randomUUID().slice(0, 8)}`;
    // Synthetic audit rows, labelled by operation name, so a multi-chunk export is exercised without thousands of requests.
    await db.query(`INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id,created_at)
      SELECT gen_random_uuid(),$1,$2,$3,$4,'STAFF',$5,NULL,gen_random_uuid(),now()-interval '1 hour'+(g*interval '1 millisecond') FROM generate_series(1,4500) g`, [s.tenant_id, s.legal_entity_id, s.environment_id, h.users.admin!.id, probe]);
    check('an admin without audit export authority cannot export the trail', await codes(admin.call('/api/v1/admin/data-exports', { kind: 'AUDIT_EVENTS_JSONL', ropa_version_id: null, audit_filter: { operation: probe } }, key())), { status: 409, codes: ['audit_export_needs_audit_export_authority'] });
    let audit = await ok(auditor.call('/api/v1/admin/data-exports', { kind: 'AUDIT_EVENTS_JSONL', ropa_version_id: null, audit_filter: { operation: probe } }, key()), Job);
    check('the matched set is counted when the export is created', audit.expected_rows, 4500);
    audit = await ok(auditor.call(`/api/v1/admin/data-exports/${audit.id}/step`, {}, key()), Job);
    check('one step writes one bounded chunk', [audit.state, audit.chunks, audit.rows_written], ['RUNNING', 1, 2000]);
    const resumed = await h.login('auditor');
    audit = await drive(resumed, audit.id);
    check('a later session resumes from the checkpoint and completes', [audit.state, audit.chunks, audit.rows_written], ['COMPLETED', 3, 4500]);
    const events = (await download(resumed, audit)).join('').trimEnd().split('\n').map(l => JSON.parse(l) as { id: string; operation: string });
    check('every matched event is present exactly once', [events.length, new Set(events.map(x => x.id)).size, events.every(x => x.operation === probe)], [4500, 4500, true]);

    t.setPhase('an export whose source changed fails');
    const race = `synthetic.export_race.${randomUUID().slice(0, 8)}`;
    await db.query(`INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id,created_at)
      SELECT gen_random_uuid(),$1,$2,$3,$4,'STAFF',$5,NULL,gen_random_uuid(),now()-interval '1 hour'+(g*interval '1 millisecond') FROM generate_series(1,2500) g`, [s.tenant_id, s.legal_entity_id, s.environment_id, h.users.admin!.id, race]);
    let raced = await ok(auditor.call('/api/v1/admin/data-exports', { kind: 'AUDIT_EVENTS_JSONL', ropa_version_id: null, audit_filter: { operation: race } }, key()), Job);
    raced = await ok(auditor.call(`/api/v1/admin/data-exports/${raced.id}/step`, {}, key()), Job);
    // A row that commits late with an earlier timestamp lands behind the cursor.
    await db.query(`INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id,created_at) VALUES(gen_random_uuid(),$1,$2,$3,$4,'STAFF',$5,NULL,gen_random_uuid(),now()-interval '2 hours')`,
      [s.tenant_id, s.legal_entity_id, s.environment_id, h.users.admin!.id, race]);
    raced = await drive(auditor, raced.id);
    check('a recount that disagrees fails the export instead of completing it', [raced.state, raced.failure_code, raced.manifest], ['FAILED', 'source_changed_during_export', null]);
    check('a failed export cannot be downloaded', (await auditor.call(`/api/v1/admin/data-exports/${raced.id}/chunk?sequence=1`)).status, 409);

    t.setPhase('stopping and privacy');
    let stopped = await ok(admin.call('/api/v1/admin/data-exports', { kind: 'ROPA_VERSION_CSV', ropa_version_id: v1.id, audit_filter: null }, key()), Job);
    stopped = await ok(admin.call(`/api/v1/admin/data-exports/${stopped.id}/stop`, {}, key()), Job);
    check('a stopped export stays stopped', [stopped.state, (await ok(admin.call(`/api/v1/admin/data-exports/${stopped.id}/step`, {}, key()), Job)).state, (await admin.call(`/api/v1/admin/data-exports/${stopped.id}/stop`, {}, key())).status], ['CANCELLED', 'CANCELLED', 409]);
    check('another staff member cannot see, advance or download someone else\'s export', [(await owner.call(`/api/v1/admin/data-exports/${job.id}`)).status, (await owner.call(`/api/v1/admin/data-exports/${job.id}/step`, {}, key())).status,
      (await owner.call(`/api/v1/admin/data-exports/${job.id}/chunk?sequence=1`)).status, (await ok(owner.call('/api/v1/admin/data-exports?limit=100'), S.schemas.DataExportList)).items.some(x => x.id === job.id)], [404, 404, 404, false]);
    check('another tenant cannot read the entry, version or export', [(await birch.call(`/api/v1/admin/ropa/entries/${activity.id}`)).status, (await birch.call(`/api/v1/admin/ropa/versions/${v2.id}/diff?against=${v1.id}`)).status, (await birch.call(`/api/v1/admin/data-exports/${job.id}`)).status], [404, 404, 404]);
    check('an auditor reads entries but cannot declare or record', [(await auditor.call(`/api/v1/admin/ropa/entries/${activity.id}`)).status, (await auditor.call(`/api/v1/admin/systems/${sysA.id}/locations`, { region: 'IN', hosting_description: 'Auditor attempt', basis: 'Auditors do not declare locations.', valid_from: hoursFromNow(0) }, key())).status,
      (await auditor.call('/api/v1/admin/ropa/versions', { note: 'Auditor attempt at a version.' }, key())).status], [200, 403, 403]);

    t.setPhase('database immutability and row security');
    const direct = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'accepted').catch((x: { code?: string }) => x.code ?? 'rejected');
    check('a version\'s content cannot be rewritten', await direct(`UPDATE app.ropa_versions SET content='[]' WHERE id=$1`, [v1.id]), '23514');
    check('an approved version cannot be re-approved', await direct(`UPDATE app.ropa_versions SET approval_note='Changed' WHERE id=$1`, [v2.id]), '23514');
    check('a version cannot be deleted', await direct(`DELETE FROM app.ropa_versions WHERE id=$1`, [v1.id]), '23514');
    check('a location declaration cannot be deleted', await direct(`DELETE FROM app.system_locations WHERE system_id=$1`, [sysA.id]), '23514');
    check('a finished export cannot be reopened or rewound', await direct(`UPDATE app.export_jobs SET state='RUNNING' WHERE id=$1`, [job.id]), '23514');
    check('an export chunk cannot be altered', await direct(`UPDATE app.export_chunks SET content='x' WHERE job_id=$1`, [job.id]), '23514');
    check('an unexpired export chunk cannot be deleted', await direct(`DELETE FROM app.export_chunks WHERE job_id=$1`, [job.id]), '23514');
    const asStaff = async (actor: string, capabilities: string, sql: string, values: unknown[]) => {
      const client = await db.connect();
      try {
        await client.query('BEGIN'); await client.query('SET LOCAL ROLE orvia_app');
        await client.query(`SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true),set_config('orvia.actor_domain','STAFF',true),set_config('orvia.capabilities',$5,true)`,
          [s.tenant_id, s.legal_entity_id, s.environment_id, actor, capabilities]);
        return (await client.query(sql, values)).rows;
      } finally { await client.query('ROLLBACK'); client.release(); }
    };
    check('row security hides an export from another staff member even at the database', (await asStaff(h.users.owner!.id, 'evidence.export,audit.export,registry.read', 'SELECT id FROM app.export_jobs WHERE id=$1', [job.id])).length, 0);
    check('row security hides its chunks too', (await asStaff(h.users.owner!.id, 'evidence.export,audit.export,registry.read', 'SELECT sequence FROM app.export_chunks WHERE job_id=$1', [job.id])).length, 0);
    check('an export cannot be created for someone else at the database', await asStaff(h.users.admin!.id, 'evidence.export,registry.read', `INSERT INTO app.export_jobs(tenant_id,legal_entity_id,environment_id,id,kind,source_id,as_of,expected_rows,requested_by,expires_at) VALUES($1,$2,$3,$4,'ROPA_VERSION_CSV',$5,now(),1,$6,now()+interval '1 day') RETURNING id`,
      [s.tenant_id, s.legal_entity_id, s.environment_id, randomUUID(), v1.id, h.users.owner!.id]).then(() => 'accepted').catch((x: { code?: string }) => x.code), '42501');
  } finally { await runtime.close(); }
});
