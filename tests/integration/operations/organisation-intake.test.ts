// Organisation website/app intake and the optional Privacy Centre (revision 1.7, contract 0.48.0).
// Under test: the Privacy Centre switch refuses every Data Principal request while off and only a super administrator can
// change it; an intake key is created once by a super administrator and never shown again; the intake routes refuse a
// missing, wrong, browser-borne or revoked key; a submission is recorded durably and replayed by its idempotency key; the
// operations runner applies a consent change to the registry (a withdrawal gets its propagation run) and a rights request to
// the Workspace with identity established only when the application signs customers in and the identifier matched; what
// cannot be applied waits for staff with its reason, including a real (non-synthetic) person on this synthetic installation;
// staff can mark it handled; one key cannot read another key's submission; a key limited to consent cannot send a rights
// request; and the database refuses to rewrite, delete or re-point anything received.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { operationsRunner } from '../../../services/worker/src/operations-runner.ts';

const t = operationsSuite('organisation-intake');
const { h, check, ok, codes, db } = t;

await t.run(async () => {
  const runner = operationsRunner();
  try {
    await t.ensurePackage();
    const owner = await h.login('owner'); const admin = await h.login('admin'); const auditor = await h.login('auditor'); const alice = await h.login('alice'); const birch = await h.login('birch');

    t.setPhase('privacy centre switch');
    const portal = () => alice.call('/api/v1/portal/me/consents');
    const setting = await ok(owner.call('/api/v1/admin/privacy-centre'), S.schemas.PrivacyCentreSetting);
    check('the synthetic fixture organisation has the Privacy Centre on', setting.enabled, true);
    check('a Data Principal can use it while it is on', (await portal()).status, 200);
    check('an organisation admin cannot switch it', (await admin.call('/api/v1/admin/privacy-centre', { enabled: false, reason: 'Admin must not change the Privacy Centre.' }, key())).status, 403);
    // Whatever happens below, the Privacy Centre is switched back on: other suites depend on it, and a failed check here must not cascade.
    const restore = async () => { const now = await ok(owner.call('/api/v1/admin/privacy-centre'), S.schemas.PrivacyCentreSetting);
      if (!now.enabled) await ok(owner.call('/api/v1/admin/privacy-centre', { enabled: true, reason: 'Restored for the remaining journeys (synthetic).' }, key()), S.schemas.PrivacyCentreSetting); };
    try {
    const off = await ok(owner.call('/api/v1/admin/privacy-centre', { enabled: false, reason: 'Customers use our own account pages instead (synthetic).' }, key()), S.schemas.PrivacyCentreSetting);
    check('the owner switches it off', off.enabled, false);
    check('every Data Principal request is then refused, saying why', await codes(portal()), { status: 403, codes: ['privacy_centre_not_offered'] });
    check('switching it off twice is refused', (await owner.call('/api/v1/admin/privacy-centre', { enabled: false, reason: 'Already off, must be refused.' }, key())).status, 409);
    await restore();
    check('switched back on, the same session works again', (await portal()).status, 200);
    } finally { await restore(); }

    t.setPhase('intake keys');
    const system = await t.boundSystem('Customer account site');
    const { activity } = await t.activity({ condition: 'CONSENT', systems: [system.id], categoryName: 'Account holder' });
    const run = randomUUID().slice(0, 8);
    const ref = `cust_${run}`;
    const subject = await t.principalSubject('alice', [{ system_id: system.id, target_reference: ref }]);
    const keyBody = { name: `Account site ${run}`, system_id: system.id, authenticates_customers: true, accepts_consent: true, accepts_rights: true };
    check('an organisation admin cannot create an intake key', (await admin.call('/api/v1/admin/intake-clients', keyBody, key())).status, 403);
    const created = await ok(owner.call('/api/v1/admin/intake-clients', keyBody, key()), S.schemas.IntakeClientCreated);
    check('the key is returned once, 64 hex characters', /^[a-f0-9]{64}$/.test(created.key), true);
    const listed = await ok(owner.call('/api/v1/admin/intake-clients?limit=100'), S.schemas.IntakeClientList);
    check('the key list never carries the key', JSON.stringify(listed).includes(created.key), false);
    check('the database keeps only its digest', (await db.query('SELECT count(*)::int n FROM app.intake_clients WHERE token_digest=$1', [created.key])).rows[0].n, 0);
    const consentOnly = await ok(owner.call('/api/v1/admin/intake-clients', { ...keyBody, name: `Consent only ${run}`, accepts_rights: false }, key()), S.schemas.IntakeClientCreated);

    t.setPhase('intake authentication');
    const origin = h.config.origin;
    const send = (path: string, body: unknown, bearer: string | null, extra: Record<string, string> = {}, idem = randomUUID()) => fetch(origin + path, { method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'content-type': 'application/json', 'idempotency-key': idem, ...bearer ? { authorization: `Bearer ${bearer}` } : {}, ...extra }, body: JSON.stringify(body) });
    const status = (id: string, bearer: string) => fetch(`${origin}/api/v1/intake/submissions/${id}`, { headers: { authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(20000) });
    const consent = (decision: 'GRANTED' | 'WITHDRAWN', at: string, reference = ref) => ({ customer_reference: reference, activity_id: activity.id, decision, occurred_at: at, notice_version_id: null, evidence_reference: `Account privacy page event ${run}-${decision}` });
    check('no key: refused', (await send('/api/v1/intake/consents', consent('GRANTED', hoursFromNow(-2)), null)).status, 401);
    check('a wrong key: refused', (await send('/api/v1/intake/consents', consent('GRANTED', hoursFromNow(-2)), 'a'.repeat(64))).status, 401);
    check('a request from a browser page (Origin) is refused, so the key cannot live in a web page', (await send('/api/v1/intake/consents', consent('GRANTED', hoursFromNow(-2)), created.key, { origin })).status, 403);
    check('a request carrying cookies is refused', (await send('/api/v1/intake/consents', consent('GRANTED', hoursFromNow(-2)), created.key, { cookie: 'x=1' })).status, 401);
    check('a key limited to consent cannot send a rights request', (await send('/api/v1/intake/rights-requests', { customer_reference: ref, right_type: 'ACCESS', description: 'Synthetic access request.', display_name: 'Synthetic Alice', email: 'alice@aster.example' }, consentOnly.key)).status, 403);

    t.setPhase('submissions');
    const granted = await ok(send('/api/v1/intake/consents', consent('GRANTED', hoursFromNow(-2)), created.key), S.schemas.IntakeReceipt, [202]);
    check('a submission is recorded as received, and a receipt is not completion', [granted.status, granted.receipt_is_not_completion, granted.consent], ['RECEIVED', true, null]);
    const withdrawKey = randomUUID();
    const withdrawBody = consent('WITHDRAWN', hoursFromNow(-1));
    const withdrawn = await ok(send('/api/v1/intake/consents', withdrawBody, created.key, {}, withdrawKey), S.schemas.IntakeReceipt, [202]);
    const replay = await ok(send('/api/v1/intake/consents', withdrawBody, created.key, {}, withdrawKey), S.schemas.IntakeReceipt, [202]);
    check('the same idempotency key returns the same submission', replay.submission_id, withdrawn.submission_id);
    check('the same idempotency key with a different body is refused', (await send('/api/v1/intake/consents', consent('GRANTED', hoursFromNow(-1)), created.key, {}, withdrawKey)).status, 409);
    const unknownConsent = await ok(send('/api/v1/intake/consents', consent('WITHDRAWN', hoursFromNow(-1), `nobody_${run}`), created.key), S.schemas.IntakeReceipt, [202]);
    const rights = await ok(send('/api/v1/intake/rights-requests', { customer_reference: ref, right_type: 'ACCESS', description: 'Please tell me what you hold about me (synthetic).', display_name: 'Synthetic Alice', email: h.users.alice!.email }, created.key), S.schemas.IntakeReceipt, [202]);
    const stranger = await ok(send('/api/v1/intake/rights-requests', { customer_reference: `new_${run}`, right_type: 'ERASURE', description: 'Please erase my account data (synthetic).', display_name: 'Synthetic Newcomer', email: `newcomer.${run}@aster.example` }, created.key), S.schemas.IntakeReceipt, [202]);
    const realPerson = await ok(send('/api/v1/intake/rights-requests', { customer_reference: `real_${run}`, right_type: 'ACCESS', description: 'A request naming a real address (must not be stored here).', display_name: 'Real Person', email: `person.${run}@example.com` }, created.key), S.schemas.IntakeReceipt, [202]);
    check('another key cannot read this key\'s submission', (await status(granted.submission_id, consentOnly.key)).status, 404);
    check('staff in another organisation see none of these submissions', (await ok(birch.call('/api/v1/admin/intake-submissions?limit=100'), S.schemas.IntakeSubmissionList)).items.filter(i => i.client_id === created.client.id).length, 0);

    t.setPhase('runner applies');
    const reports = await runner.once();
    const mine = reports.find(r => r.scope === t.scope().environment_id)!;
    const ours = [granted, withdrawn, unknownConsent, rights, stranger, realPerson].map(x => x.submission_id);
    const outcomes = Object.fromEntries((await db.query('SELECT id, status FROM app.intake_submissions WHERE id = ANY($1::uuid[])', [ours])).rows.map(x => [x.id, x.status]));
    check('the runner processed every submission of this run: four applied, two sent to staff', ours.map(id => outcomes[id]), ['APPLIED', 'APPLIED', 'NEEDS_STAFF', 'APPLIED', 'APPLIED', 'NEEDS_STAFF']);
    check('the runner reports what it did (earlier queued submissions included)', mine.intake_applied >= 4 && mine.intake_needs_staff >= 2 && mine.errors.every(e => !e.startsWith('intake')), true);
    const receipt = async (id: string) => ok(status(id, created.key), S.schemas.IntakeReceipt);
    const w = await receipt(withdrawn.submission_id);
    check('the withdrawal is applied and the consent now reads withdrawn', [w.status, w.consent?.current_status], ['APPLIED', 'WITHDRAWN']);
    const recordId = w.consent!.record_id;
    const events = (await db.query('SELECT event, source, provenance->>\'intake_submission_id\' AS submission FROM app.consent_record_events WHERE record_id=$1 ORDER BY occurred_at', [recordId])).rows;
    check('both events are on the record, from the organisation\'s system, each naming its submission', events.map(e => [e.event, e.source, e.submission]), [['GRANTED', 'SOURCE_SYSTEM', granted.submission_id], ['WITHDRAWN', 'SOURCE_SYSTEM', withdrawn.submission_id]]);
    check('the withdrawal has a propagation run, like any other withdrawal', (await db.query(`SELECT count(*)::int n FROM app.workflow_runs w JOIN app.consent_record_events e ON e.id=w.consent_event_id WHERE e.record_id=$1 AND e.event='WITHDRAWN'`, [recordId])).rows[0].n, 1);
    check('the consent record is the person\'s own', (await db.query('SELECT subject_id FROM app.consent_records WHERE id=$1', [recordId])).rows[0].subject_id, subject.id);
    const r = await receipt(rights.submission_id);
    const request = await ok(admin.call(`/api/v1/admin/rights-requests/${r.rights_request!.id}`), S.schemas.RightsRequest);
    check('the rights request is in the Workspace, from the organisation\'s app, for this person, identity established', [request.submitted_channel, request.principal_id, request.identity, request.identity_grade, request.state],
      ['ORGANISATION_APP', h.users.alice!.principal_id, 'ESTABLISHED', 'EXACT', 'RECEIVED']);
    const s2 = await ok(admin.call(`/api/v1/admin/rights-requests/${(await receipt(stranger.submission_id)).rights_request!.id}`), S.schemas.RightsRequest);
    check('an identifier that matched nobody still becomes a request, with identity left for staff', [s2.submitted_channel, s2.identity, s2.identity_grade], ['ORGANISATION_APP', 'NOT_ASSESSED', null]);
    const u = await receipt(unknownConsent.submission_id);
    check('a consent change for an unknown identifier waits for staff with the reason', [u.status, /No Data Principal/.test(u.outcome_reason ?? '')], ['NEEDS_STAFF', true]);
    const rp = await receipt(realPerson.submission_id);
    check('a real person on this synthetic installation is not stored; it waits for staff and says why', [rp.status, /synthetic people only/.test(rp.outcome_reason ?? ''), rp.rights_request], ['NEEDS_STAFF', true, null]);
    check('no principal was recorded for the real address', (await db.query('SELECT count(*)::int n FROM app.principal_references WHERE email=$1', [`person.${run}@example.com`])).rows[0].n, 0);

    t.setPhase('staff handling');
    const waiting = await ok(admin.call('/api/v1/admin/intake-submissions?status=NEEDS_STAFF&limit=100'), S.schemas.IntakeSubmissionList);
    check('staff see both submissions waiting for them', waiting.items.filter(i => [unknownConsent.submission_id, realPerson.submission_id].includes(i.id)).length, 2);
    check('an auditor can read but not mark handled', [(await auditor.call('/api/v1/admin/intake-submissions?limit=5')).status, (await auditor.call(`/api/v1/admin/intake-submissions/${unknownConsent.submission_id}/handled`, { note: 'Auditor must not handle this.' }, key())).status], [200, 403]);
    const handled = await ok(admin.call(`/api/v1/admin/intake-submissions/${unknownConsent.submission_id}/handled`, { note: 'Recorded the person and the withdrawal by hand (synthetic).' }, key()), S.schemas.IntakeSubmission);
    check('staff mark it handled with a note', [handled.status, handled.handled_note !== null], ['HANDLED', true]);
    check('an applied submission cannot be marked handled', (await admin.call(`/api/v1/admin/intake-submissions/${withdrawn.submission_id}/handled`, { note: 'Applied submissions are not staff work.' }, key())).status, 409);

    t.setPhase('revocation and immutability');
    const revoked = await ok(owner.call(`/api/v1/admin/intake-clients/${consentOnly.client.id}/revocation`, { reason: 'Rotating the key for the consent-only integration.' }, key()), S.schemas.IntakeClient);
    check('a revoked key is refused at once', [revoked.revoked_at !== null, (await send('/api/v1/intake/consents', consent('GRANTED', hoursFromNow(-1)), consentOnly.key)).status], [true, 401]);
    check('a key is revoked once', (await owner.call(`/api/v1/admin/intake-clients/${consentOnly.client.id}/revocation`, { reason: 'Second revocation must be refused.' }, key())).status, 409);
    const refused = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'changed', (e: Error) => e.message);
    check('what was received cannot be rewritten', await refused('UPDATE app.intake_submissions SET payload=\'{}\'::jsonb WHERE id=$1', [granted.submission_id]), 'intake_submission_transition_refused');
    check('an applied submission cannot be sent back to received', await refused('UPDATE app.intake_submissions SET status=\'RECEIVED\', processed_at=NULL WHERE id=$1', [granted.submission_id]), 'intake_submission_transition_refused');
    check('a submission cannot be deleted', await refused('DELETE FROM app.intake_submissions WHERE id=$1', [granted.submission_id]), 'intake_submission_is_retained');
    check('a key cannot be re-pointed to another digest', await refused('UPDATE app.intake_clients SET token_digest=$2 WHERE id=$1', [created.client.id, 'b'.repeat(64)]), 'intake_client_is_immutable');
    check('a revocation cannot be undone', await refused('UPDATE app.intake_clients SET revoked_at=NULL, revoked_by=NULL, revocation_reason=NULL WHERE id=$1', [consentOnly.client.id]), 'intake_client_is_immutable');
    check('a Privacy Centre change cannot be rewritten', await refused('UPDATE app.privacy_centre_settings SET enabled=NOT enabled WHERE tenant_id=$1', [t.scope().tenant_id]), 'privacy_centre_settings is append-only; record a new row that supersedes it');
  } finally { await runner.close(); }
});
