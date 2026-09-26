// EX09 customer-controlled delivery through the HTTP boundary and the operations runner.
// A loopback SMTP sink and webhook receiver stand in for the customer's relay and
// endpoint (synthetic, local only; nothing leaves the host). Under test:
// destinations fixed and enabled by a second person; plaintext and non-HTTPS
// refused off loopback; messages reviewed by someone other than their author;
// leased attempts with receipts; temporary failure retried with backoff,
// permanent rejection final, a timeout after hand-over recorded as unknown and
// the retry marked as a possible duplicate; missing credentials explicit;
// signed webhooks verifiable with the once-revealed key; notification tasks
// gaining SENT facts with the receipt as evidence; compliance alerts routed
// once; withdrawal; tenancy and database immutability.
import net from 'node:net';
import http from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique } from '../../../shared/testing/src/operations-fixture.ts';
import { operationsRunner } from '../../../services/worker/src/operations-runner.ts';

const t = operationsSuite('delivery');
const { h, check, ok, codes, db } = t;
const Msg = S.schemas.OutboundMessage; const Transport = S.schemas.DeliveryTransport;

type Received = { from: string; to: string; auth: string | null; data: string };
function smtpSink(behaviour: (to: string, calls: number) => 'OK' | 'TEMPFAIL' | 'REJECT' | 'HANG') {
  const received: Received[] = []; const calls = new Map<string, number>();
  const server = net.createServer(socket => {
    let buffer = ''; let inData = false; const current: Partial<Received> = { auth: null };
    const say = (line: string) => socket.write(`${line}\r\n`);
    say('220 sink.local ESMTP synthetic');
    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      for (;;) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n'); if (end < 0) return;
          const data = buffer.slice(0, end); buffer = buffer.slice(end + 5); inData = false;
          const to = current.to!; const n = calls.get(to) ?? 0;
          received.push({ ...current, data } as Received);
          if (behaviour(to, n) === 'HANG' && n === 1) continue; // the message was handed over; no answer comes back
          say(`250 2.0.0 Ok: queued as SYN${received.length}`); continue;
        }
        const i = buffer.indexOf('\r\n'); if (i < 0) return;
        const line = buffer.slice(0, i); buffer = buffer.slice(i + 2);
        if (/^EHLO/i.test(line)) { say('250-sink.local'); say('250 AUTH PLAIN'); }
        else if (/^AUTH PLAIN /i.test(line)) { const [, user, pass] = Buffer.from(line.slice(11), 'base64').toString('utf8').split('\u0000'); current.auth = `${user}:${pass}`; say(user === 'relay-user' && pass === 'relay-pass' ? '235 2.7.0 Authentication successful' : '535 5.7.8 Authentication failed'); }
        else if (/^MAIL FROM:/i.test(line)) { current.from = line.slice(10).replace(/[<>]/g, ''); say('250 2.1.0 Ok'); }
        else if (/^RCPT TO:/i.test(line)) {
          const to = line.slice(8).replace(/[<>]/g, ''); current.to = to; const n = (calls.get(to) ?? 0) + 1; calls.set(to, n);
          const b = behaviour(to, n);
          if (b === 'REJECT') say('550 5.1.1 Recipient rejected'); else if (b === 'TEMPFAIL' && n === 1) say('451 4.3.0 Try again later'); else say('250 2.1.5 Ok');
        }
        else if (/^DATA/i.test(line)) { inData = true; say('354 End data with <CR><LF>.<CR><LF>'); }
        else if (/^QUIT/i.test(line)) { say('221 Bye'); socket.end(); }
        else say('502 5.5.2 Unknown');
      }
    });
    socket.on('error', () => {});
  });
  return { server, received, listen: () => new Promise<number>(r => server.listen(0, '127.0.0.1', () => r((server.address() as net.AddressInfo).port))) };
}
function webhookReceiver() {
  const requests: { headers: http.IncomingHttpHeaders; body: string }[] = []; let failNext = 0;
  const server = http.createServer((req, res) => { let body = ''; req.on('data', c => { body += c; }); req.on('end', () => { requests.push({ headers: req.headers, body }); if (failNext > 0) { failNext--; res.writeHead(503).end('busy'); } else res.writeHead(200).end('accepted'); }); });
  return { server, requests, failOnce: () => { failNext = 1; }, listen: () => new Promise<number>(r => server.listen(0, '127.0.0.1', () => r((server.address() as net.AddressInfo).port))) };
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const sink = smtpSink(to => to.startsWith('tempfail') ? 'TEMPFAIL' : to.startsWith('reject') ? 'REJECT' : to.startsWith('slow') ? 'HANG' : 'OK');
  const hook = webhookReceiver();
  const smtpPort = await sink.listen(); const hookPort = await hook.listen();
  process.env.ORVIA_TRANSPORT_TEST_SINK = 'relay-user:relay-pass';
  delete process.env.ORVIA_TRANSPORT_TEST_MISSING;
  const runner = operationsRunner();
  const cleanup: string[] = [];
  const once = async () => { const reports = await runner.once(); return reports.find(r => r.scope === t.scope().environment_id)!; };
  try {
    t.setPhase('transports');
    const create = (who: typeof admin, body: Record<string, unknown>) => who.call('/api/v1/admin/delivery-transports', body, key());
    const smtpBody = { kind: 'SMTP', name: unique('Customer relay'), host: '127.0.0.1', port: smtpPort, security: 'NONE', from_address: 'privacy@customer.example', credential_env: 'ORVIA_TRANSPORT_TEST_SINK' };
    check('plaintext SMTP is refused off loopback', await codes(create(admin, { ...smtpBody, host: 'smtp.customer.example' })), { status: 400, codes: ['plaintext_only_to_loopback'] });
    check('a webhook off loopback must be HTTPS', await codes(create(admin, { kind: 'WEBHOOK', name: unique('Hook'), url: 'http://hooks.customer.example/orvia' })), { status: 400, codes: ['https_required'] });
    check('a webhook URL cannot carry credentials', await codes(create(admin, { kind: 'WEBHOOK', name: unique('Hook'), url: 'https://user:pass@hooks.customer.example/orvia' })), { status: 400, codes: ['credentials_in_url'] });
    const smtp = await ok(create(admin, smtpBody), Transport); cleanup.push(smtp.id);
    check('a new transport is pending and names only the credential variable', [smtp.state, smtp.credential_env, JSON.stringify(smtp).includes('relay-pass')], ['PENDING', 'ORVIA_TRANSPORT_TEST_SINK', false]);
    check('an admin without connection authority cannot enable it', (await admin.call(`/api/v1/admin/delivery-transports/${smtp.id}/enable`, {}, key())).status, 403);
    const own = await ok(create(owner, { ...smtpBody, name: unique('Owner relay') }), Transport); cleanup.push(own.id);
    check('the author cannot enable their own transport', await codes(owner.call(`/api/v1/admin/delivery-transports/${own.id}/enable`, {}, key())), { status: 409, codes: ['author_cannot_enable'] });
    const enabled = await ok(owner.call(`/api/v1/admin/delivery-transports/${smtp.id}/enable`, {}, key()), Transport);
    check('someone else enables it', [enabled.state, enabled.approved_by === h.users.owner!.id], ['ENABLED', true]);

    t.setPhase('review and send');
    const compose = (recipient: string, extra: Record<string, unknown> = {}) => ok(admin.call('/api/v1/admin/outbound-messages', { transport_id: smtp.id, source_kind: 'MANUAL', source_id: null, recipient, subject: 'Synthetic delivery check', body: 'This is a synthetic message sent to a loopback sink.', ...extra }, key()), Msg);
    const approve = (id: string, who = owner) => ok(who.call(`/api/v1/admin/outbound-messages/${id}/review`, { decision: 'APPROVE', note: 'Content reviewed.' }, key()), Msg);
    const detail = (id: string) => ok(admin.call(`/api/v1/admin/outbound-messages/${id}`), Msg);
    let m = await compose('dpo@customer.example');
    check('a composed message awaits review', m.delivery_state, 'AWAITING_REVIEW');
    check('its author cannot approve it', await codes(admin.call(`/api/v1/admin/outbound-messages/${m.id}/review`, { decision: 'APPROVE', note: 'Self approval.' }, key())), { status: 409, codes: ['author_cannot_review'] });
    await once();
    check('an unreviewed message is not sent', [sink.received.length, (await detail(m.id)).attempts.length], [0, 0]);
    m = await approve(m.id);
    check('an approved message is queued', m.delivery_state, 'QUEUED');
    const report = await once();
    m = await detail(m.id);
    check('the runner sends it through the relay and records the receipt', [m.delivery_state, m.attempts.length, m.attempts[0]?.outcome, m.attempts[0]?.response_code, m.attempts[0]?.receipt?.includes(m.id), report.messages_sent >= 1], ['SENT', 1, 'SENT', '250', true, true]);
    const mail = sink.received.find(r => r.to === 'dpo@customer.example')!;
    check('the relay received one message from the configured sender, authenticated with the named credential', [sink.received.filter(r => r.to === 'dpo@customer.example').length, mail.from, mail.auth], [1, 'privacy@customer.example', 'relay-user:relay-pass']);
    check('the message carries its identity headers', [mail.data.includes(`X-Orvia-Message: ${m.id}`), mail.data.includes('Subject: Synthetic delivery check')], [true, true]);
    await once();
    check('a sent message is not sent again', sink.received.filter(r => r.to === 'dpo@customer.example').length, 1);

    t.setPhase('failures, retries and unknown effects');
    const temp = await approve((await compose('tempfail@customer.example')).id);
    const reject = await approve((await compose('reject@customer.example')).id);
    await once();
    let tempD = await detail(temp.id); const rejectD = await detail(reject.id);
    check('a temporary rejection is retried later', [tempD.delivery_state, tempD.attempts[0]?.outcome, tempD.attempts[0]?.response_code, tempD.next_attempt_at !== null], ['RETRYING', 'FAILED', '451', true]);
    check('a permanent rejection ends the message', [rejectD.delivery_state, rejectD.attempts.length, rejectD.attempts[0]?.response_code, rejectD.attempts[0]?.error_code], ['EXHAUSTED', 1, '550', 'REJECTED_PERMANENTLY']);
    await once();
    // One runner pass covers every scope in the shared test database and can itself outlast the
    // five-second backoff, so check the rule rather than wall-clock luck: no second attempt may
    // start before the first finished plus its backoff.
    const early = (await detail(temp.id)).attempts;
    check('a retry waits for its backoff', early.length === 1 || Date.parse(early[1]!.started_at) - Date.parse(early[0]!.finished_at) >= 5000, true);
    await wait(5500); await once();
    tempD = await detail(temp.id);
    check('after the backoff the retry is delivered', [tempD.delivery_state, tempD.attempts.map(a => a.outcome)], ['SENT', ['FAILED', 'SENT']]);
    const slow = await approve((await compose('slow@customer.example')).id);
    await once();
    let slowD = await detail(slow.id);
    check('a timeout after the message was handed over is an unknown effect, not a failure', [slowD.delivery_state, slowD.attempts[0]?.outcome, slowD.attempts[0]?.error_code], ['RETRYING', 'UNKNOWN', 'TIMEOUT_AFTER_DATA']);
    await wait(5500); await once();
    slowD = await detail(slow.id);
    check('the retry is delivered and marked as a possible duplicate', [slowD.delivery_state, slowD.attempts[1]?.outcome, slowD.attempts[1]?.possible_duplicate], ['SENT', 'SENT', true]);
    const copies = sink.received.filter(r => r.to === 'slow@customer.example');
    check('the recipient can recognise the duplicate by its message identity', [copies.length, copies.every(c => c.data.includes(`X-Orvia-Message: ${slow.id}`))], [2, true]);
    const missingT = await ok(create(admin, { ...smtpBody, name: unique('Unconfigured relay'), credential_env: 'ORVIA_TRANSPORT_TEST_MISSING' }), Transport); cleanup.push(missingT.id);
    await ok(owner.call(`/api/v1/admin/delivery-transports/${missingT.id}/enable`, {}, key()), Transport);
    const unconfigured = await approve((await compose('dpo@customer.example', { transport_id: missingT.id })).id);
    await once();
    const unconfiguredD = await detail(unconfigured.id);
    check('a credential missing from the host is explicit and final', [unconfiguredD.delivery_state, unconfiguredD.attempts[0]?.error_code], ['EXHAUSTED', 'CREDENTIAL_NOT_CONFIGURED']);
    const withdrawn = await approve((await compose('dpo2@customer.example')).id);
    const w = await ok(admin.call(`/api/v1/admin/outbound-messages/${withdrawn.id}/withdrawal`, {}, key()), Msg);
    await once();
    check('a withdrawn message is never sent', [w.delivery_state, sink.received.some(r => r.to === 'dpo2@customer.example')], ['CANCELLED', false]);

    t.setPhase('signed webhook');
    const webhook = await ok(create(admin, { kind: 'WEBHOOK', name: unique('Ticketing hook'), url: `http://127.0.0.1:${hookPort}/orvia` }), Transport); cleanup.push(webhook.id);
    await ok(owner.call(`/api/v1/admin/delivery-transports/${webhook.id}/enable`, {}, key()), Transport);
    check('an admin cannot reveal the signing key', (await admin.call(`/api/v1/admin/delivery-transports/${webhook.id}/signing-secret`, {}, key())).status, 403);
    const secret = await ok(owner.call(`/api/v1/admin/delivery-transports/${webhook.id}/signing-secret`, {}, key()), S.schemas.SigningSecret);
    check('the signing key is shown once', [/^[a-f0-9]{64}$/.test(secret.secret), await codes(owner.call(`/api/v1/admin/delivery-transports/${webhook.id}/signing-secret`, {}, key()))], [true, { status: 409, codes: ['already_shown_once'] }]);
    hook.failOnce();
    const hm = await approve((await compose('ticketing', { transport_id: webhook.id })).id);
    await once();
    check('a 503 from the endpoint is retried', (await detail(hm.id)).attempts.map(a => [a.outcome, a.response_code]), [['FAILED', '503']]);
    await wait(5500); await once();
    const hmD = await detail(hm.id);
    const last = hook.requests.at(-1)!;
    const expected = createHmac('sha256', secret.secret).update(`${last.headers['x-orvia-timestamp']}.${last.body}`).digest('hex');
    check('the endpoint receives a request it can verify with the revealed key', [hmD.delivery_state, last.headers['x-orvia-signature'], last.headers['idempotency-key'], JSON.parse(last.body).id], ['SENT', `sha256=${expected}`, hm.id, hm.id]);

    t.setPhase('notification tasks and compliance alerts');
    const template = await ok(admin.call('/api/v1/admin/notification-templates', { code: `EX09_${randomUUID().slice(0, 6).toUpperCase()}`, channel: 'EMAIL', recipient_scope: 'CUSTOMER_STAFF', subject: 'Coverage gap needs attention', body: 'A coverage gap needs attention from its owner.', purpose_note: 'Operational notice to staff.' }, key()), S.schemas.Template);
    const gap = (await db.query(`SELECT id FROM app.coverage_gaps WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 LIMIT 1`, [t.scope().tenant_id, t.scope().legal_entity_id, t.scope().environment_id])).rows[0];
    if (gap) {
      const task = await ok(admin.call('/api/v1/admin/notification-tasks', { template_id: template.id, source: 'COVERAGE_GAP', source_id: gap.id, recipient_reference: 'Coverage owner', source_due_at: null }, key()), S.schemas.NotificationTask);
      check('an email task is deliverable while an SMTP transport is enabled', task.channel_available, true);
      const tm = await approve((await compose('owner@customer.example', { source_kind: 'NOTIFICATION_TASK', source_id: task.id, subject: 'Coverage gap needs attention', body: 'A coverage gap needs attention from its owner.' })).id);
      await once();
      const after = await ok(admin.call(`/api/v1/admin/notification-tasks/${task.id}`), S.schemas.NotificationTask);
      check('the task gains a SENT fact with the transport receipt as evidence', [(await detail(tm.id)).delivery_state, after.sent, after.deliveries.some(d => d.fact === 'SENT' && (d.evidence_reference ?? '').includes('250'))], ['SENT', true, true]);
    } else check('a coverage gap exists to raise a task against', false, true);
    const routingR = await ok(admin.call('/api/v1/admin/alert-routings', { transport_id: smtp.id, recipient: 'compliance@customer.example', kinds: ['ERROR'], subject_prefix: '[ORVIA]' }, key()), S.schemas.AlertRouting);
    check('the author cannot enable their own routing', await codes(admin.call(`/api/v1/admin/alert-routings/${routingR.id}/decision`, { action: 'ENABLE' }, key())), { status: 409, codes: ['author_cannot_enable'] });
    await ok(reviewer.call(`/api/v1/admin/alert-routings/${routingR.id}/decision`, { action: 'ENABLE' }, key()), S.schemas.AlertRouting);
    const framework = await ok(admin.call('/api/v1/admin/grc/regulatory-framework', { name: unique('Delivery framework') }, key()), S.schemas.GrcFramework);
    const control = await ok(admin.call('/api/v1/admin/grc/controls', { title: unique('Trail control'), description: 'The audit trail is append-only.', owner_reference: 'Platform', review_interval_days: 90, mappings: [{ framework_id: framework.id, requirement_code: framework.requirements[0]!.code }] }, key()), S.schemas.GrcControl);
    const test = await ok(admin.call('/api/v1/admin/grc/control-tests', { control_id: control.id, name: unique('Trail test'), check_kind: 'AUDIT_TRAIL_APPEND_ONLY', maximum_violations: 0, interval_minutes: 60 }, key()), S.schemas.ControlTest);
    await db.query('REVOKE EXECUTE ON FUNCTION app.run_control_check(text) FROM orvia_app');
    try { await ok(admin.call(`/api/v1/admin/grc/control-tests/${test.id}/runs`, {}, key()), S.schemas.ControlTestDetail); } finally { await db.query('GRANT EXECUTE ON FUNCTION app.run_control_check(text) TO orvia_app'); }
    await once(); await once();
    const alerted = sink.received.filter(r => r.to === 'compliance@customer.example' && r.data.includes(test.name));
    check('an alert the routing covers is delivered once', [alerted.length, alerted[0]?.data.includes('Subject: [ORVIA] ERROR')], [1, true]);
    const alerts = (await ok(admin.call('/api/v1/admin/grc/compliance-alerts?limit=100'), S.schemas.ComplianceAlertList)).items.filter(a => a.test_id === test.id);
    check('the alert shows it was delivered', alerts.map(a => [a.kind, a.delivery_state]), [['ERROR', 'SENT']]);

    t.setPhase('disable, isolation and history');
    await ok(admin.call(`/api/v1/admin/delivery-transports/${missingT.id}/disable`, { reason: 'Relay credential not provisioned on this host.' }, key()), Transport);
    const late = await compose('dpo3@customer.example');
    await ok(admin.call(`/api/v1/admin/delivery-transports/${smtp.id}/disable`, { reason: 'Relay retired for the delivery suite.' }, key()), Transport);
    check('a message cannot be approved onto a disabled transport', await codes(owner.call(`/api/v1/admin/outbound-messages/${late.id}/review`, { decision: 'APPROVE', note: 'Too late.' }, key())), { status: 409, codes: ['transport_not_enabled'] });
    check('an auditor reads messages but cannot compose or approve', [(await auditor.call(`/api/v1/admin/outbound-messages/${m.id}`)).status, (await auditor.call('/api/v1/admin/outbound-messages', { transport_id: smtp.id, source_kind: 'MANUAL', source_id: null, recipient: 'x@customer.example', subject: 'Auditor', body: 'Auditor attempt to compose.' }, key())).status], [200, 403]);
    check('another tenant sees nothing', [(await birch.call(`/api/v1/admin/outbound-messages/${m.id}`)).status, (await ok(birch.call('/api/v1/admin/delivery-transports?limit=100'), S.schemas.DeliveryTransportList)).items.some(x => x.id === smtp.id)], [404, false]);
    const direct = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'accepted').catch((x: { code?: string }) => x.code ?? 'rejected');
    check('a transport destination cannot be changed', await direct(`UPDATE app.delivery_transports SET host='evil.example' WHERE id=$1`, [smtp.id]), '23514');
    check('a disabled transport cannot be re-enabled at the database', await direct(`UPDATE app.delivery_transports SET state='ENABLED', disabled_at=NULL WHERE id=$1`, [smtp.id]), '23514');
    check('a reviewed message body cannot be rewritten', await direct(`UPDATE app.outbound_messages SET body='Rewritten body text' WHERE id=$1`, [m.id]), '23514');
    check('an attempt cannot be altered', await direct(`UPDATE app.outbound_attempts SET outcome='SENT' WHERE message_id=$1`, [reject.id]), '23514');
    check('delivery history cannot be deleted', await direct(`DELETE FROM app.outbound_messages WHERE id=$1`, [m.id]), '23514');
  } finally {
    // Leave no enabled transport behind: other suites assert that a channel without one is unavailable.
    for (const id of cleanup) await db.query(`UPDATE app.delivery_transports SET state='DISABLED', disabled_at=now(), disable_reason='Closed at the end of the delivery suite.' WHERE id=$1 AND state<>'DISABLED'`, [id]).catch(() => {});
    await runner.close(); sink.server.close(); hook.server.close();
  }
});
