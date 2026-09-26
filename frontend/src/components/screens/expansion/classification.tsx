'use client';
import { useState, type FormEvent } from 'react';
import { useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime } from '../../shared/state-labels.ts';
import { Badge, DataTable, FailureState, NoticeBox, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, WriteForm, Input, text } from '../privacy-operations/registry-forms.tsx';

const CATEGORY_TEXT: Record<string, string> = { EMAIL: 'Email address', PHONE_IN: 'Indian mobile number', PAN: 'PAN', AADHAAR: 'Aadhaar number', PAYMENT_CARD: 'Payment card number', IFSC: 'IFSC code', IPV4: 'IPv4 address', NONE: 'Not personal data of these kinds' };
const SEVERITY_TONE: Record<string, 'stop' | 'warn' | 'neutral' | 'ok'> = { HIGH: 'stop', MEDIUM: 'warn', LOW: 'neutral', INFO: 'ok' };

/**
 * EX04 value classification and EX12 exposure for one approved catalog target.
 * Sampling is carried out by the local worker through the read-only observer
 * role; only counts are kept.
 */
export function Classification({ targetId, approved }: { targetId: string; approved: boolean }) {
  const runs = usePagedQuery('list_classification_runs', { limit: 10, params: { id: targetId } });
  const latest = runs.data?.items[0];
  return (
    <>
      <h3>Value classification</h3>
      <p className="cell-sub">Samples values through the read-only observer, tests each against checksum-validated rules, and keeps only counts. Requesting a sample needs connection authority.</p>
      {approved && (
        <WriteForm operation="request_classification_run" label="Request a classification sample" params={{ id: targetId }} onSaved={() => runs.refresh()} describe={() => 'Queued for the local worker'}
          build={f => ({ sample_limit: Number(text(f, 'limit')) })}>
          <Input label="Rows to sample" name="limit" type="number" defaultValue="500" hint="At most 1,000. The first rows the database returns; stated as a limit, not as representative." />
        </WriteForm>
      )}
      <QueryBoundary query={runs} label="classification runs" isEmpty={d => !d.items.length}>
        {d => (
          <DataTable caption="Classification runs" rows={d.items} rowKey={r => r.id}
            columns={[
              { key: 'at', header: 'Requested', cell: r => formatTime(r.requested_at) },
              { key: 'state', header: 'State', cell: r => r.state === 'FAILED' ? <Badge label={`failed: ${r.failure_code?.toLowerCase().replaceAll('_', ' ')}`} tone="stop" /> : r.relation_state === 'MISSING' ? <Badge label="relation missing" tone="stop" /> : r.state.toLowerCase() },
              { key: 'rows', header: 'Rows sampled', cell: r => r.rows_sampled ?? '—' },
              { key: 'findings', header: 'Exposure findings', cell: r => r.findings.filter(f => f.severity !== 'INFO').length || 'None' },
            ]} />
        )}
      </QueryBoundary>
      {latest?.state === 'COMPLETED' && latest.relation_state === 'CLASSIFIED' && <RunDetail key={latest.id} runId={latest.id} targetId={targetId} />}
    </>
  );
}

function RunDetail({ runId, targetId }: { runId: string; targetId: string }) {
  const run = useQuery('classification_run', { params: { id: runId } });
  const labels = useQuery('classification_labels', { params: { id: targetId } });
  const quality = usePagedQuery('list_classification_quality', { limit: 10, params: { id: runId } });
  return (
    <QueryBoundary query={run} label="classification" isEmpty={() => false}>
      {r => (
        <div className="panel">
          <p className="cell-sub">Observed {formatTime(r.observed_at!)} by {r.ruleset} on {r.rows_sampled} rows.</p>
          <DataTable caption="Columns" rows={r.columns} rowKey={c => c.column}
            columns={[
              { key: 'column', header: 'Column', cell: c => c.column },
              { key: 'category', header: 'Classified as', cell: c => c.category ? <Badge label={`${CATEGORY_TEXT[c.category]}${c.confidence === 'POSSIBLE' ? ' (possible)' : ''}`} tone={c.confidence === 'CONFIRMED' ? 'warn' : 'neutral'} /> : 'Unclassified' },
              { key: 'share', header: 'Matching values', cell: c => `${Math.round(c.share * 100)}% of ${c.non_empty}` },
            ]} />
          {r.findings.length ? <DataTable caption="Who can read the classified columns" rows={r.findings} rowKey={f => `${f.kind}:${f.grantee}`}
            columns={[
              { key: 'sev', header: 'Severity', cell: f => <Badge label={f.severity.toLowerCase()} tone={SEVERITY_TONE[f.severity] ?? 'neutral'} /> },
              { key: 'grantee', header: 'Role', cell: f => f.grantee },
              { key: 'detail', header: 'Finding', cell: f => <span>{f.detail}<span className="cell-sub">{f.columns.join(', ')}</span></span> },
            ]} /> : <NoticeBox tone="ok" title="No exposure findings"><p>No confirmed sensitive column, or nobody beyond the owner and observer can read it.</p></NoticeBox>}
          <ul className="cell-sub">{r.limits.map(l => <li key={l}>{l}</li>)}</ul>
          <QueryBoundary query={labels} label="labels" isEmpty={() => false}>
            {set => <Labels targetId={targetId} columns={r.columns.map(c => c.column)} current={Object.fromEntries(set.labels.map(l => [l.column, l.expected]))} onSaved={() => labels.refresh()} />}
          </QueryBoundary>
          <ActionButton operation="measure_classification" label="Measure quality against the labels" input={undefined as never} params={{ id: runId }} onDone={() => quality.refresh()} />
          <QueryBoundary query={quality} label="quality measurements" isEmpty={d => !d.items.length}>
            {d => { const m = d.items.at(-1)!.measurement; return (
              <>
                <p>Latest measurement: {m.correct} of {m.columns_labelled} labelled columns correct ({Math.round(m.accuracy * 100)}%).{m.columns_unlabelled.length ? ` Unlabelled: ${m.columns_unlabelled.join(', ')}.` : ''}</p>
                <DataTable caption="Precision and recall by category" rows={m.per_category} rowKey={x => x.category}
                  columns={[
                    { key: 'c', header: 'Category', cell: x => CATEGORY_TEXT[x.category] },
                    { key: 'p', header: 'Precision', cell: x => x.precision === null ? '—' : `${Math.round(x.precision * 100)}%` },
                    { key: 'r', header: 'Recall', cell: x => x.recall === null ? '—' : `${Math.round(x.recall * 100)}%` },
                    { key: 'n', header: 'TP / FP / FN', cell: x => `${x.true_positives} / ${x.false_positives} / ${x.false_negatives}` },
                  ]} />
              </>
            ); }}
          </QueryBoundary>
        </div>
      )}
    </QueryBoundary>
  );
}

function Labels({ targetId, columns, current, onSaved }: { targetId: string; columns: string[]; current: Record<string, string>; onSaved: () => void }) {
  const record = useMutation('label_classification', true);
  const [basis, setBasis] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const labels = columns.filter(c => String(form.get(`l:${c}`) ?? '')).map(c => ({ column: c, expected: String(form.get(`l:${c}`)) as 'NONE', basis }));
    if (!labels.length) return;
    record.newInteraction();
    if (await record.run({ labels }, { params: { id: targetId } })) onSaved();
  };
  return (
    <form className="panel" onSubmit={submit} aria-label="Reviewed labels">
      <h4>Reviewed labels</h4>
      <p className="cell-sub">State each column's true category. Quality is measured against these, so a wrong label makes the measurement wrong.</p>
      {columns.map(c => (
        <label key={c} className="field"><span className="label">{c}</span>
          <select name={`l:${c}`} defaultValue={current[c] ?? ''}>
            <option value="">Not labelled</option>
            {Object.entries(CATEGORY_TEXT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      ))}
      <label className="field"><span className="label">Basis</span><input value={basis} onChange={e => setBasis(e.target.value)} minLength={10} maxLength={300} required /></label>
      <button type="submit" className="primary" disabled={record.status === 'pending'}>Record labels</button>
      {record.failure && <FailureState failure={record.failure} />}
    </form>
  );
}

/** EX12: every target's latest classified exposure. */
export function ExposureOverview() {
  const list = usePagedQuery('list_exposure_findings', { limit: 25 });
  return (
    <Section title="Access exposure">
      <p className="cell-sub">Roles that can read confirmed sensitive columns, read from each relation's grants at its latest classification.</p>
      <QueryBoundary query={list} label="exposure" isEmpty={d => !d.items.length}>
        {d => (
          <DataTable caption="Exposure by relation" rows={d.items} rowKey={e => e.target_id}
            columns={[
              { key: 'rel', header: 'Relation', cell: e => <span className="cell-primary">{e.schema_name}.{e.relation_name}<span className="cell-sub">classified {formatTime(e.observed_at)}</span></span> },
              { key: 'sensitive', header: 'Sensitive columns', cell: e => e.sensitive_columns.join(', ') || 'None' },
              { key: 'findings', header: 'Findings', cell: e => { const f = e.findings.filter(x => x.severity !== 'INFO'); return f.length ? f.map(x => <Badge key={x.grantee} label={`${x.severity.toLowerCase()}: ${x.grantee}`} tone={SEVERITY_TONE[x.severity] ?? 'neutral'} />) : 'None'; } },
            ]} />
        )}
      </QueryBoundary>
    </Section>
  );
}
