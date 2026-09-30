// Close only this round's interrupted synthetic mandate engagement through the
// normal authenticated, audited endpoint. Preserve all records and history.
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { HttpFixture } from '../../shared/testing/src/http-fixture.ts';
import { dpdpaAuditRoutes, AuditEngagementList, AuditEngagement } from '../../shared/contracts/src/dpdpa-audit.ts';
const h = new HttpFixture();
if (h.config.profile !== 'codex-a00') throw new Error('Only the round 6 synthetic profile is allowed');
const list = dpdpaAuditRoutes.find(r => r.id === 'list_audit_engagements')!;
const close = dpdpaAuditRoutes.find(r => r.id === 'close_audit_engagement')!;
const changed: unknown[] = [];
try {
  await h.start(); const owner = await h.login('owner');
  const response = await owner.call(list.path);
  if (response.status !== 200) throw new Error(`List failed: ${response.status}`);
  const page = AuditEngagementList.parse(await response.json());
  if (page.next_cursor) throw new Error('Review pagination before bounded cleanup');
  const interrupted = page.items.filter(e => /^ENG-MB-[0-9a-f]{8}$/.test(e.engagement_reference)
    && e.state === 'ACTIVE' && e.created_at >= '2026-09-30T10:44:08Z' && e.created_at <= '2026-09-30T10:45:03Z');
  if (interrupted.length > 1) throw new Error('More than one matching interrupted engagement; review required');
  for (const e of interrupted) {
    const response = await owner.call(close.path.replace('{id}', e.id), { reason: 'Round 6 synthetic journey interrupted by expired local worker enrollment; closing this attempt before rerun. Evidence and history retained.' }, { 'idempotency-key': randomUUID() });
    if (response.status !== 200) throw new Error(`Closure failed: ${response.status}`);
    const closed = AuditEngagement.parse(await response.json());
    if (closed.state !== 'CLOSED') throw new Error('Closure not established');
    changed.push({ id: closed.id, reference: closed.engagement_reference, state: closed.state });
  }
  writeFileSync('handoffs/codex/artifacts/R6-interrupted-engagement.json', JSON.stringify({ changed, method: 'authenticated audited closure; no deletion or database reset' }, null, 2));
  console.log(JSON.stringify({ closed: changed.length }));
} finally { await h.stop(); }
