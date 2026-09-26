'use client';
import { useState, type FormEvent } from 'react';
import type { schemas } from '@orvia/contracts';
import { useMutation, usePagedQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, FailureState, NoticeBox, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Input, WriteForm, localNow, text, time } from '../privacy-operations/registry-forms.tsx';

type Package = ReturnType<typeof schemas.ResponsePackage.parse>;
const READ_TEXT: Record<string, string> = { READ: 'Read from the system', NOT_FOUND: 'No record found', UNAVAILABLE: 'Could not be read', NOT_SUPPORTED: 'No connector — handle outside ORVIA', HELD_BY_ORVIA: 'Held in ORVIA' };
const REASONS = [{ value: 'THIRD_PARTY', label: 'Another person\'s data' }, { value: 'LEGAL_PRIVILEGE', label: 'Legal privilege' }, { value: 'SECURITY', label: 'Security' }, { value: 'OTHER', label: 'Other' }];
const DELIVERY_TONE: Record<string, 'ok' | 'warn' | 'stop' | 'neutral'> = { ACTIVE: 'ok', EXPIRED: 'neutral', REVOKED: 'stop', EXHAUSTED: 'neutral', NOT_RELEASED: 'warn' };

/**
 * EX03 response packages for one request. Preparing reads the records; a second
 * person decides every suggested redaction and acknowledges unreadable sources;
 * release puts the reviewed copy in the principal's portal until it expires, is
 * revoked or its allowance is spent.
 */
export function ResponsePackages({ requestId }: { requestId: string }) {
  const packages = usePagedQuery('list_response_packages', { limit: 25, params: { id: requestId } });
  return (
    <Section title="Response package">
      <p className="cell-sub">A copy of what the planned systems hold about this person, read at preparation. Someone other than the preparer reviews it, deciding each suggested redaction. The person collects it from their privacy portal.</p>
      <ActionButton operation="prepare_response_package" label="Prepare a response package" input={undefined as never} params={{ id: requestId }} onDone={() => packages.refresh()} />
      <QueryBoundary query={packages} label="response packages" isEmpty={d => !d.items.length}>
        {d => {
          const sorted = [...d.items].sort((a, b) => b.version - a.version);
          return (
            <>
              <DataTable caption="Package versions" rows={sorted} rowKey={p => p.id}
                columns={[
                  { key: 'v', header: 'Version', cell: p => `Version ${p.version}` },
                  { key: 'state', header: 'State', cell: p => p.state.toLowerCase() },
                  { key: 'delivery', header: 'Delivery', cell: p => <Badge label={p.delivery_state.toLowerCase().replace('_', ' ')} tone={DELIVERY_TONE[p.delivery_state] ?? 'neutral'} /> },
                  { key: 'dl', header: 'Collected', cell: p => p.max_downloads ? `${p.downloads} of ${p.max_downloads}` : '—' },
                  { key: 'prepared', header: 'Prepared', cell: p => `${formatTime(p.prepared_at)} by ${shortId(p.prepared_by)}` },
                ]} />
              {sorted[0] && <PackageDetail key={sorted[0].id} pkg={sorted[0]} onChanged={() => packages.refresh()} />}
            </>
          );
        }}
      </QueryBoundary>
    </Section>
  );
}

function PackageDetail({ pkg, onChanged }: { pkg: Package; onChanged: () => void }) {
  return (
    <div className="panel">
      <h3>Version {pkg.version}</h3>
      {pkg.purged_at && <NoticeBox tone="info" title="Content purged"><p>The content was removed {formatTime(pkg.purged_at)}, after delivery ended. The digest and collection receipts remain.</p></NoticeBox>}
      {pkg.state === 'DRAFT' && <Review pkg={pkg} onChanged={onChanged} />}
      {pkg.released_content && (
        <>
          <p className="cell-sub">Reviewed {pkg.reviewed_at ? formatTime(pkg.reviewed_at) : ''} by {pkg.reviewed_by ? shortId(pkg.reviewed_by) : ''}. Digest <code>{pkg.content_digest?.slice(0, 16)}</code>.</p>
          <Content content={pkg.released_content} caption="What the person receives" />
        </>
      )}
      {pkg.state === 'REVIEWED' && (
        <WriteForm operation="release_response_package" label="Release to the person's portal" params={{ id: pkg.id }} onSaved={onChanged} describe={p => `Released until ${formatTime(p.delivery_expires_at!)}`}
          build={f => ({ expires_at: time(f, 'expires'), max_downloads: Number(text(f, 'max')) })}>
          <Input label="Available until" name="expires" type="datetime-local" defaultValue={localNow(7)} hint="At most thirty days." />
          <Input label="Collections allowed" name="max" type="number" defaultValue="3" hint="Between 1 and 10." />
        </WriteForm>
      )}
      {pkg.delivery_state === 'ACTIVE' && (
        <WriteForm operation="revoke_response_package" label="Revoke delivery" params={{ id: pkg.id }} onSaved={onChanged} describe={() => 'Delivery revoked'} build={f => ({ reason: text(f, 'reason') })}>
          <Input label="Reason" name="reason" minLength={10} maxLength={500} />
        </WriteForm>
      )}
      {['DRAFT', 'REVIEWED'].includes(pkg.state) && <ActionButton operation="withdraw_response_package" label="Withdraw this version" input={undefined as never} params={{ id: pkg.id }} onDone={onChanged} />}
    </div>
  );
}

function Content({ content, caption }: { content: { title: string; read_state: string; fields: Record<string, string> }[]; caption: string }) {
  return (
    <DataTable caption={caption} rows={content} rowKey={s => s.title}
      columns={[
        { key: 'title', header: 'Source', cell: s => <span className="cell-primary">{s.title}<span className="cell-sub">{READ_TEXT[s.read_state] ?? s.read_state}</span></span> },
        { key: 'fields', header: 'Content', cell: s => Object.keys(s.fields).length ? <dl>{Object.entries(s.fields).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl> : '—' },
      ]} />
  );
}

function Review({ pkg, onChanged }: { pkg: Package; onChanged: () => void }) {
  const review = useMutation('review_response_package', true);
  const [error, setError] = useState<string | null>(null);
  const unreadable = pkg.sections.some(s => ['UNAVAILABLE', 'NOT_SUPPORTED'].includes(s.read_state));
  const fields = pkg.sections.filter(s => s.source === 'SYSTEM').flatMap(s => Object.keys(s.fields).map(field => ({ section_id: s.section_id, field, title: s.title, value: s.fields[field]! })));
  const suggested = new Set(pkg.suggestions.map(x => `${x.section_id}|${x.field}`));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null);
    const form = new FormData(event.currentTarget);
    const redactions: { section_id: string; field: string; reason: 'THIRD_PARTY'; note: string }[] = [];
    const kept: { section_id: string; field: string; justification: string }[] = [];
    for (const f of fields) {
      const key = `${f.section_id}|${f.field}`; const decision = String(form.get(`d:${key}`) ?? '');
      if (decision === 'KEEP') { if (suggested.has(key)) kept.push({ section_id: f.section_id, field: f.field, justification: String(form.get(`j:${key}`) ?? '').trim() }); }
      else if (decision) redactions.push({ section_id: f.section_id, field: f.field, reason: decision as 'THIRD_PARTY', note: String(form.get(`j:${key}`) ?? '').trim() || 'Withheld on review.' });
      else if (suggested.has(key)) { setError(`Decide the suggested field "${f.field}" in ${f.title}.`); return; }
    }
    review.newInteraction();
    if (await review.run({ redactions, kept, unreadable_acknowledged: form.get('ack') === 'on' }, { params: { id: pkg.id } })) onChanged();
  };
  return (
    <form className="panel" onSubmit={submit} aria-label="Review the package">
      <h4>Review</h4>
      <p className="cell-sub">Decide what the person receives. Suggested fields may concern someone else; each needs a decision. Redacting a value removes it wherever it appears in the package.</p>
      {pkg.sections.map(s => (
        <fieldset key={s.section_id}>
          <legend>{s.title} — {READ_TEXT[s.read_state] ?? s.read_state}</legend>
          {s.source === 'SYSTEM' && Object.entries(s.fields).map(([field, value]) => {
            const key = `${s.section_id}|${field}`; const hint = pkg.suggestions.find(x => x.section_id === s.section_id && x.field === field);
            return (
              <div key={key} className="field">
                <label className="field"><span className="label">{field}{hint ? ' (suggested)' : ''}</span>
                  <select name={`d:${key}`} defaultValue={hint ? '' : 'KEEP'} aria-describedby={hint ? `h:${key}` : undefined}>
                    {hint && <option value="">Decide…</option>}
                    <option value="KEEP">Disclose</option>
                    {REASONS.map(r => <option key={r.value} value={r.value}>Redact — {r.label.toLowerCase()}</option>)}
                  </select>
                </label>
                <p className="cell-sub"><code>{value}</code></p>
                {hint && <p className="hint" id={`h:${key}`}>{hint.detail}</p>}
                <label className="field"><span className="label">{hint ? 'Reason for your decision' : 'Note (if redacting)'}</span><input name={`j:${key}`} maxLength={300} /></label>
              </div>
            );
          })}
          {s.source !== 'SYSTEM' && <Content content={[{ title: s.title, read_state: s.read_state, fields: s.fields }]} caption={s.title} />}
        </fieldset>
      ))}
      {unreadable && <label className="checkbox"><input type="checkbox" name="ack" /> <span>I acknowledge that some sources could not be read automatically and will be handled outside ORVIA.</span></label>}
      <button type="submit" className="primary" disabled={review.status === 'pending'}>Complete the review</button>
      {error && <p role="alert">{error}</p>}
      {review.failure && <FailureState failure={review.failure} />}
    </form>
  );
}

/** The principal's side: collect the released copy from the portal. */
export function CollectOwnCopy({ requestId }: { requestId: string }) {
  const collect = useMutation('own_response_package', true);
  const [copy, setCopy] = useState<ReturnType<typeof schemas.OwnResponsePackage.parse> | null>(null);
  return (
    <div>
      <button type="button" disabled={collect.status === 'pending'} onClick={async () => { collect.newInteraction(); const r = await collect.run(undefined as never, { params: { id: requestId } }); if (r) setCopy(r); }}>
        {collect.status === 'pending' ? 'Collecting…' : 'Collect your copy'}
      </button>
      {collect.failure && <FailureState failure={collect.failure} />}
      {copy && (
        <div className="panel" aria-label="Your copy">
          <p className="cell-sub">Released {formatTime(copy.released_at)}. Available until {formatTime(copy.expires_at)}; {copy.downloads_remaining} more collection(s) allowed. Reference <code>{copy.content_digest.slice(0, 16)}</code>.</p>
          <Content content={copy.content} caption="What this organisation holds about you" />
          <ul className="cell-sub">{copy.limits.map(l => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
