'use client';
import { usePagedQuery } from '../../shared/api.ts';
import { formatTime, shortId, type Label } from '../../shared/state-labels.ts';
import { Badge, DataTable, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary } from '../../shared/ui.tsx';

/**
 * M10 Notification Engine.
 *
 * Five independent columns rather than one status, because "queued" is the only
 * one ORVIA did itself and "sent" is not "delivered" is not "read". An escalated
 * row shows the deadline that caused it, unchanged — that is the point.
 */

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: 'In the workspace', EMAIL: 'Email', APPROVED_WEBHOOK: 'Approved webhook',
};
const SCOPE_LABELS: Record<string, string> = {
  CUSTOMER_STAFF: 'Your staff', DATA_PRINCIPAL: 'A data principal', DESIGNATED_BUSINESS_CONTACT: 'A designated business contact',
};
const SOURCE_LABELS: Record<string, string> = {
  COVERAGE_GAP: 'Coverage gap', NOTIFICATION_OBLIGATION: 'Notification duty', ASSESSMENT_FINDING: 'Assessment finding',
};
const FACT_MEANING: Record<string, Label> = {
  queued: { label: 'Queued', tone: 'info', meaning: 'ORVIA recorded it locally. This is the only step ORVIA performs itself.' },
  sent: { label: 'Sent', tone: 'info', meaning: 'Somebody recorded that it went out, with evidence. It does not mean it arrived.' },
  delivered: { label: 'Delivered', tone: 'ok', meaning: 'Recorded as having reached the recipient, with evidence.' },
  acknowledged: { label: 'Acknowledged', tone: 'ok', meaning: 'The recipient confirmed receipt, with evidence.' },
  failed: { label: 'Failed', tone: 'stop', meaning: 'An attempt failed. This stays true even after a later success.' },
};

function Fact({ name, value }: { name: keyof typeof FACT_MEANING; value: boolean }) {
  const label = FACT_MEANING[name]!;
  return value
    ? <Badge label="Yes" tone={label.tone} meaning={label.meaning} />
    : <Badge label="No" tone="unknown" meaning={`Nothing has been recorded for: ${label.meaning}`} />;
}

export function NotificationTasks() {
  const query = usePagedQuery('list_notification_tasks', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Notifications"
        title="Notifications"
        lede="Queued, sent, delivered, failed and acknowledged are five different facts about one message. Only the first is something ORVIA did; every other one is a recorded claim with evidence behind it."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded notifications" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded notification tasks, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'what', header: 'About', cell: item => (
                  <span className="cell-primary">{SOURCE_LABELS[item.source] ?? item.source}
                    <span className="cell-sub">{item.template_code} · {shortId(item.source_id)}</span>
                  </span>
                ) },
                { key: 'who', header: 'To', cell: item => (
                  <span className="cell-primary">{item.recipient_reference}
                    <span className="cell-sub">{SCOPE_LABELS[item.recipient_scope] ?? item.recipient_scope} · {CHANNEL_LABELS[item.channel] ?? item.channel}</span>
                  </span>
                ) },
                { key: 'queued', header: 'Queued', cell: item => <Fact name="queued" value={item.queued} /> },
                { key: 'sent', header: 'Sent', cell: item => item.channel_available || item.sent
                  ? <Fact name="sent" value={item.sent} />
                  : <Badge label="No transport" tone="warn" meaning="This deployment has no configured way to deliver on that channel, so it will not be sent." /> },
                { key: 'delivered', header: 'Delivered', cell: item => <Fact name="delivered" value={item.delivered} /> },
                { key: 'acknowledged', header: 'Acknowledged', cell: item => <Fact name="acknowledged" value={item.acknowledged} /> },
                { key: 'failed', header: 'Failed', cell: item => <Fact name="failed" value={item.failed} /> },
                { key: 'due', header: 'Deadline it came from', cell: item => item.source_due_at
                  ? <span className={item.escalated_at ? 'cell-primary' : undefined}>{formatTime(item.source_due_at)}{item.escalated_at ? ' — escalated' : ''}</span>
                  : <span className="cell-sub">No deadline</span> },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="What escalation does, and what it deliberately does not do">
        <p>When a deadline passes without a message reaching its recipient, ORVIA raises an escalation against the task. It does not move the deadline. A missed deadline stays missed, and the database refuses any change to it — silently resetting a clock is how a breach of it disappears.</p>
      </NoticeBox>
      <NoticeBox tone="warn" title="ORVIA does not transmit anything">
        <p>Queueing is local. Sending, delivery and acknowledgement are recorded by a person with evidence. Where this deployment has no configured transport for a channel, the message is queued and honestly marked as not sendable rather than appearing to have gone out.</p>
      </NoticeBox>
    </>
  );
}

export function NotificationTemplates() {
  const query = usePagedQuery('list_templates', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Notifications"
        title="Message templates"
        lede="Versioned templates with a content digest. Re-issuing a template creates a new version rather than editing an existing one, so an older message stays readable as it was sent."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded templates" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded message templates, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'code', header: 'Template', cell: item => (
                  <span className="cell-primary">{item.code}<span className="cell-sub">version {item.version}</span></span>
                ) },
                { key: 'channel', header: 'Channel', cell: item => CHANNEL_LABELS[item.channel] ?? item.channel },
                { key: 'scope', header: 'Goes to', cell: item => SCOPE_LABELS[item.recipient_scope] ?? item.recipient_scope },
                { key: 'subject', header: 'Subject', cell: item => item.subject },
                { key: 'purpose', header: 'Why it is sent', cell: item => item.purpose_note },
                { key: 'digest', header: 'Content digest', cell: item => <span className="cell-sub">{item.content_digest.slice(0, 12)}…</span> },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}
