// EX03 rights response packages through the real HTTP boundary.
// Under test: a package reads the principal's records through the connector's
// observer role, next to what ORVIA holds; unreadable and unsupported sources are
// recorded as such; deterministic suggestions flag other people's data without
// repeating it; a reviewer other than the preparer must decide every suggestion
// and acknowledge unreadable sources; redaction removes a value wherever it
// appears (leakage checked in the staff view and the delivered copy); release is
// bounded to thirty days and settles the V1 response; the authenticated principal
// alone collects the copy, within its allowance, until it is revoked or expires;
// receipts are kept; another principal and another tenant see nothing; the
// database refuses rewrites and row security separates principals.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow, unique } from '../../../shared/testing/src/operations-fixture.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';

const t = operationsSuite('response-packages');
const { h, check, ok, codes, db } = t;
const Pkg = S.schemas.ResponsePackage; const Own = S.schemas.OwnResponsePackage;
const target = recordsTarget();

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const alice = await h.login('alice'); const bob = await h.login('bob');
  const s = t.scope();
  const direct = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'accepted').catch((x: { code?: string }) => x.code ?? 'rejected');
  const purge = (id: string) => direct(`UPDATE app.rights_response_packages SET sections='[]', released_content=NULL, purged_at=now() WHERE id=$1`, [id]);
  try {
    t.setPhase('setup');
    const principal = h.users.alice!.principal_id!;
    const crm = await t.boundSystem('Response CRM'); const archive = await t.boundSystem('Response archive');
    const notes = await ok(admin.call('/api/v1/admin/systems', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, name: unique('Paper notes'), connector: 'LEGACY_MANUAL' }, key()), S.schemas.System);
    const ref = `rp_${randomUUID().slice(0, 12)}`; const bobRef = `rp_${randomUUID().slice(0, 12)}`;
    await t.principalSubject('alice', [crm, archive, notes].map(x => ({ system_id: x.id, target_reference: ref })));
    await t.principalSubject('bob', [{ system_id: crm.id, target_reference: bobRef }]);
    const dave = `dave.${randomUUID().slice(0, 6)}@referrer.example`;
    await target.seed(s, crm.id, [
      { reference: ref, fields: { name: 'Alice Synthetic', email: 'alice.own@records.example', notes: `Asked about an order. Her partner can be reached at bob.partner@family.example; she was referred by ${dave}.`, emergency_contact: 'Carol Synthetic', referred_by: dave } },
      { reference: bobRef, fields: { name: 'Bob Synthetic', email: 'bob.own@records.example' } },
    ]);
    await target.seed(s, archive.id, [{ reference: ref, fields: { name: 'Alice Synthetic' } }]);
    await target.mode(s, archive.id, 'HEALTHY', 'UNAVAILABLE');
    const request = await t.executingRequest('ACCESS', principal, [crm, archive, notes].map(x => ({ system_id: x.id, action: 'DISCLOSE_COPY' })));

    t.setPhase('refusals before preparation');
    const submitted = await ok(admin.call('/api/v1/admin/rights-requests', { right_type: 'ACCESS', principal_id: principal, submitted_channel: 'RECORDED_MANUAL_INTAKE', mandate_id: null, description: 'Synthetic unverified access request.' }, key()), S.schemas.RightsRequest);
    check('a request without established identity gets no package', await codes(admin.call(`/api/v1/admin/rights-requests/${submitted.id}/response-packages`, {}, key())), { status: 409, codes: ['identity_not_established'] });
    const erasure = await ok(admin.call('/api/v1/admin/rights-requests', { right_type: 'ERASURE', principal_id: principal, submitted_channel: 'RECORDED_MANUAL_INTAKE', mandate_id: null, description: 'Synthetic erasure request.' }, key()), S.schemas.RightsRequest);
    check('an erasure produces no response package', await codes(admin.call(`/api/v1/admin/rights-requests/${erasure.id}/response-packages`, {}, key())), { status: 409, codes: ['right_produces_no_response_package'] });
    check('an auditor cannot prepare one', (await auditor.call(`/api/v1/admin/rights-requests/${request.id}/response-packages`, {}, key())).status, 403);

    t.setPhase('preparation reads the records');
    let pkg = await ok(owner.call(`/api/v1/admin/rights-requests/${request.id}/response-packages`, {}, key()), Pkg);
    const crmSection = pkg.sections.find(x => x.system_id === crm.id)!;
    check('the package is a draft with the principal\'s record read through the observer', [pkg.state, crmSection.read_state, crmSection.read_by, crmSection.fields.email], ['DRAFT', 'READ', 'orvia_target_observer independent read', 'alice.own@records.example']);
    check('another principal\'s record in the same system is not included', JSON.stringify(pkg.sections).includes('Bob Synthetic'), false);
    check('an unreadable source is recorded as unavailable, not as empty', pkg.sections.find(x => x.system_id === archive.id)?.read_state, 'UNAVAILABLE');
    check('a system without a connector is recorded as not supported', pkg.sections.find(x => x.system_id === notes.id)?.read_state, 'NOT_SUPPORTED');
    check('what ORVIA holds about the request is included', pkg.sections.some(x => x.source === 'ORVIA_REQUEST' && x.fields.request_id === request.id), true);
    check('suggestions flag other people\'s data and field names that suggest another person', pkg.suggestions.filter(x => x.section_id === crmSection.section_id).map(x => x.field).sort(), ['emergency_contact', 'notes', 'referred_by']);
    check('a suggestion never repeats the value it flags', JSON.stringify(pkg.suggestions).includes(dave) || JSON.stringify(pkg.suggestions).includes('Carol'), false);
    check('the principal\'s own identifiers are not flagged', pkg.suggestions.some(x => x.field === 'email' || x.field === 'name'), false);
    check('a second package is refused while one is in play', await codes(admin.call(`/api/v1/admin/rights-requests/${request.id}/response-packages`, {}, key())), { status: 409, codes: ['a_package_is_already_in_play'] });
    check('the principal cannot collect anything before release', (await alice.call(`/api/v1/portal/me/rights-requests/${request.id}/response-package`, {}, key())).status, 404);

    t.setPhase('review by a second person');
    const sid = crmSection.section_id;
    const decisions = { redactions: [{ section_id: sid, field: 'emergency_contact', reason: 'THIRD_PARTY', note: 'Names another person.' }, { section_id: sid, field: 'referred_by', reason: 'THIRD_PARTY', note: 'Another person\'s address.' }],
      kept: [{ section_id: sid, field: 'notes', justification: 'The note records the principal\'s own conversation.' }], unreadable_acknowledged: true };
    const review = (who: typeof admin, body: unknown, id = pkg.id) => who.call(`/api/v1/admin/response-packages/${id}/review`, body, key());
    check('an admin without release authority cannot review', (await review(admin, decisions)).status, 403);
    check('the preparer cannot review their own package', await codes(review(owner, decisions)), { status: 409, codes: ['preparer_cannot_review'] });
    check('every suggestion must be decided', await codes(review(reviewer, { ...decisions, kept: [] })), { status: 409, codes: ['suggestion_not_decided'] });
    check('an unreadable source must be acknowledged', await codes(review(reviewer, { ...decisions, unreadable_acknowledged: false })), { status: 409, codes: ['unreadable_sources_not_acknowledged'] });
    check('a field not in the package cannot be redacted', await codes(review(reviewer, { ...decisions, redactions: [...decisions.redactions, { section_id: sid, field: 'invented', reason: 'OTHER', note: 'Not present.' }] })), { status: 400, codes: ['field_not_in_package'] });
    pkg = await ok(review(reviewer, decisions), Pkg);
    const released = JSON.stringify(pkg.released_content);
    const crmContent = pkg.released_content!.find(x => x.title === crmSection.title)!;
    check('redacted fields are replaced with the reason', [crmContent.fields.emergency_contact, crmContent.fields.referred_by], ['[Redacted: another person\'s data]', '[Redacted: another person\'s data]']);
    check('a redacted value is removed wherever it appears, including kept fields', [released.includes(dave), released.includes('Carol Synthetic'), crmContent.fields.notes!.includes('[Redacted]')], [false, false, true]);
    check('a kept field keeps the rest of its content', crmContent.fields.notes!.includes('bob.partner@family.example'), true);
    check('the reviewed copy has a digest and cannot be reviewed again', [/^[a-f0-9]{64}$/.test(pkg.content_digest!), (await review(reviewer, decisions)).status], [true, 409]);

    t.setPhase('release and collection');
    const release = (body: unknown, id = pkg.id) => reviewer.call(`/api/v1/admin/response-packages/${id}/release`, body, key());
    check('delivery cannot outlast thirty days', await codes(release({ expires_at: hoursFromNow(24 * 31), max_downloads: 2 })), { status: 400, codes: ['at_most_thirty_days'] });
    check('delivery cannot already have expired', await codes(release({ expires_at: hoursFromNow(-1), max_downloads: 2 })), { status: 400, codes: ['already_expired'] });
    pkg = await ok(release({ expires_at: hoursFromNow(24 * 7), max_downloads: 2 }), Pkg);
    check('the package is released for delivery', [pkg.state, pkg.delivery_state, pkg.downloads], ['RELEASED', 'ACTIVE', 0]);
    const v1 = await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}`), S.schemas.RightsRequest);
    check('the V1 response is settled as released', v1.response, 'RELEASED');
    check('content cannot be purged while its delivery is active', await purge(pkg.id), '23514');
    check('another principal cannot collect it', (await bob.call(`/api/v1/portal/me/rights-requests/${request.id}/response-package`, {}, key())).status, 404);
    check('staff cannot collect through the portal route', (await admin.call(`/api/v1/portal/me/rights-requests/${request.id}/response-package`, {}, key())).status, 403);
    const copy = await ok(alice.call(`/api/v1/portal/me/rights-requests/${request.id}/response-package`, {}, key()), Own);
    check('the principal collects the reviewed copy with its digest', [copy.content_digest, copy.downloads_remaining, copy.limits.length], [pkg.content_digest, 1, 3]);
    check('the delivered copy carries no redacted value', [JSON.stringify(copy).includes(dave), JSON.stringify(copy).includes('Carol Synthetic')], [false, false]);
    pkg = await ok(reviewer.call(`/api/v1/admin/response-packages/${pkg.id}/revocation`, { reason: 'Sent to the wrong address on file.' }, key()), Pkg);
    check('a revoked delivery is refused', [pkg.delivery_state, await codes(alice.call(`/api/v1/portal/me/rights-requests/${request.id}/response-package`, {}, key()))], ['REVOKED', { status: 409, codes: ['delivery_revoked'] }]);
    const receipts = Number((await db.query('SELECT count(*)::int n FROM app.rights_response_downloads WHERE package_id=$1', [pkg.id])).rows[0].n);
    check('each collection left a receipt', receipts, 1);

    t.setPhase('replacement, allowance and expiry');
    let v2 = await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/response-packages`, {}, key()), Pkg);
    check('after revocation a new version can be prepared', [v2.version, v2.state], [2, 'DRAFT']);
    v2 = await ok(review(reviewer, { ...decisions, redactions: decisions.redactions.map(r => ({ ...r, section_id: v2.sections.find(x => x.system_id === crm.id)!.section_id })), kept: decisions.kept.map(k => ({ ...k, section_id: v2.sections.find(x => x.system_id === crm.id)!.section_id })) }, v2.id), Pkg);
    v2 = await ok(release({ expires_at: hoursFromNow(24), max_downloads: 1 }, v2.id), Pkg);
    const second = await ok(alice.call(`/api/v1/portal/me/rights-requests/${request.id}/response-package`, {}, key()), Own);
    check('the principal collects the newest version', [second.version, second.downloads_remaining], [2, 0]);
    check('a spent allowance is refused', await codes(alice.call(`/api/v1/portal/me/rights-requests/${request.id}/response-package`, {}, key())), { status: 409, codes: ['download_allowance_spent'] });
    const v3 = await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/response-packages`, {}, key()), Pkg);
    const withdrawn = await ok(admin.call(`/api/v1/admin/response-packages/${v3.id}/withdrawal`, {}, key()), Pkg);
    check('a spent delivery does not block a new version, and an unreleased one can be withdrawn', [v3.version, withdrawn.state], [3, 'WITHDRAWN']);
    let v4 = await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/response-packages`, {}, key()), Pkg);
    const v4sid = v4.sections.find(x => x.system_id === crm.id)!.section_id;
    v4 = await ok(review(reviewer, { ...decisions, redactions: decisions.redactions.map(r => ({ ...r, section_id: v4sid })), kept: decisions.kept.map(k => ({ ...k, section_id: v4sid })) }, v4.id), Pkg);
    v4 = await ok(release({ expires_at: new Date(Date.now() + 3000).toISOString(), max_downloads: 3 }, v4.id), Pkg);
    await new Promise(resolve => setTimeout(resolve, 3500));
    check('an expired delivery is refused', await codes(alice.call(`/api/v1/portal/me/rights-requests/${request.id}/response-package`, {}, key())), { status: 409, codes: ['delivery_expired'] });
    check('staff see it as expired', (await ok(admin.call(`/api/v1/admin/response-packages/${v4.id}`), Pkg)).delivery_state, 'EXPIRED');

    t.setPhase('isolation and history');
    check('an auditor reads packages but cannot review, release or revoke', [(await auditor.call(`/api/v1/admin/response-packages/${pkg.id}`)).status, (await review(auditor, decisions, v4.id)).status,
      (await auditor.call(`/api/v1/admin/response-packages/${v4.id}/revocation`, { reason: 'Auditor attempt to revoke.' }, key())).status], [200, 403, 403]);
    check('another tenant sees nothing', [(await birch.call(`/api/v1/admin/response-packages/${pkg.id}`)).status, (await birch.call(`/api/v1/admin/rights-requests/${request.id}/response-packages`)).status], [404, 404]);
    const listed = await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/response-packages?limit=10`), S.schemas.ResponsePackageList);
    check('every version is kept', listed.items.map(x => [x.version, x.state]).sort((a, b) => Number(a[0]) - Number(b[0])), [[1, 'RELEASED'], [2, 'RELEASED'], [3, 'WITHDRAWN'], [4, 'RELEASED']]);
    check('what was read cannot be rewritten', await direct(`UPDATE app.rights_response_packages SET sections='[]' WHERE id=$1`, [v2.id]), '23514');
    check('the released content cannot be rewritten', await direct(`UPDATE app.rights_response_packages SET released_content='[]' WHERE id=$1`, [v2.id]), '23514');
    check('a download count cannot be reset', await direct(`UPDATE app.rights_response_packages SET downloads=0 WHERE id=$1`, [v2.id]), '23514');
    check('a revocation cannot be undone', await direct(`UPDATE app.rights_response_packages SET revoked_at=NULL, revoked_by=NULL, revocation_reason=NULL WHERE id=$1`, [pkg.id]), '23514');
    check('once delivery has ended the content can be purged, keeping digest and receipts', [await purge(pkg.id), (await db.query('SELECT content_digest, released_content FROM app.rights_response_packages WHERE id=$1', [pkg.id])).rows.map(r => [r.content_digest !== null, r.released_content])[0]], ['accepted', [true, null]]);
    check('a purged package is final', await direct(`UPDATE app.rights_response_packages SET revocation_reason='Changed after purge.' WHERE id=$1`, [pkg.id]), '23514');
    check('a package cannot be deleted', await direct(`DELETE FROM app.rights_response_packages WHERE id=$1`, [v3.id]), '23514');
    check('a receipt cannot be altered', await direct(`UPDATE app.rights_response_downloads SET content_digest='x' WHERE package_id=$1`, [pkg.id]), '23514');
    const asPrincipal = async (principalId: string, sql: string, values: unknown[]) => {
      const client = await db.connect();
      try {
        await client.query('BEGIN'); await client.query('SET LOCAL ROLE orvia_app');
        await client.query(`SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true),set_config('orvia.actor_domain','PRINCIPAL',true),set_config('orvia.principal_id',$4,true),set_config('orvia.capabilities','rights.own.read',true)`,
          [s.tenant_id, s.legal_entity_id, s.environment_id, principalId]);
        return (await client.query(sql, values)).rows;
      } finally { await client.query('ROLLBACK'); client.release(); }
    };
    check('row security hides another principal\'s package', (await asPrincipal(h.users.bob!.principal_id!, 'SELECT id FROM app.rights_response_packages WHERE request_id=$1', [request.id])).length, 0);
    check('row security hides unreleased versions from the principal', (await asPrincipal(principal, 'SELECT version FROM app.rights_response_packages WHERE request_id=$1 ORDER BY version', [request.id])).map(r => r.version), [1, 2, 4]);
  } finally { await target.end(); }
});
