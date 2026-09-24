'use client';
import { useState } from 'react';
import { usePagedQuery } from '../../shared/api.ts';
import { formatTime, LANGUAGE_NAMES } from '../../shared/state-labels.ts';
import { Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';

/**
 * Privacy Centre additions for the Data Principal: the notices the organisation
 * has published, with how to withdraw consent, exercise rights and complain to
 * the Board, and the status history of the person's own requests. Internal notes
 * never reach this page.
 */
const CHANNEL_TEXT: Record<string, string> = {
  withdrawal: 'How to withdraw consent', rights: 'How to exercise your rights', grievance: 'How to raise a grievance', board_complaint: 'How to complain to the Data Protection Board',
};

export function PrivacyNotices() {
  const [locale, setLocale] = useState('');
  const notices = usePagedQuery('portal_notices', { limit: 20, ...(locale ? { query: { locale } } : {}) });
  return (
    <>
      <PageHead eyebrow="Your privacy" title="Privacy notices"
        lede="What this organisation has told you about how it processes your personal data, in the version in force now." />
      <label className="inline-filter">
        <span>Language</span>
        <select value={locale} onChange={event => setLocale(event.target.value)}>
          <option value="">All published languages</option>
          {Object.entries(LANGUAGE_NAMES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
      </label>
      <Freshness query={notices} />
      <QueryBoundary query={notices} label="published notices" isEmpty={data => !data.items.length}>
        {data => (
          <>
            {data.items.map(notice => (
              <article key={notice.version_id} className="panel" lang={notice.locale}>
                <h3>{notice.title}</h3>
                <p className="cell-sub">{notice.name} · version {notice.version} · in force from {formatTime(notice.effective_from)}</p>
                {notice.superseded && <NoticeBox tone="neutral" title="A newer version exists"><p>This version has been replaced. The newer version applies from its own date.</p></NoticeBox>}
                <div className="notice-content">{notice.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div>
                <dl>
                  {Object.entries(notice.channels).map(([key, value]) => value ? <div key={key}><dt>{CHANNEL_TEXT[key] ?? key}</dt><dd>{String(value)}</dd></div> : null)}
                </dl>
              </article>
            ))}
            <Pagination query={notices} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}

export function OwnRequestHistory({ id, labels }: { id: string; labels: Record<string, { label: string }> }) {
  const history = usePagedQuery('own_rights_request_history', { params: { id }, limit: 50 });
  return (
    <Section title="What has happened so far">
      <QueryBoundary query={history} label="request history" isEmpty={data => !data.items.length}>
        {data => (
          <ol>
            {data.items.map(event => <li key={`${event.to_state}:${event.recorded_at}`}>{formatTime(event.recorded_at)} — {labels[event.to_state]?.label ?? event.to_state}</li>)}
          </ol>
        )}
      </QueryBoundary>
    </Section>
  );
}
