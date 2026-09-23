'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useRequestGuard } from './api.ts';
import type { Query } from './api.ts';
import { failureTone, type UiFailure } from './errors.ts';
import { describeState, formatTime, TONE_GLYPH, type Label, type Tone } from './state-labels.ts';

/* ------------------------------------------------------------------ *
 * Status primitives
 * ------------------------------------------------------------------ */

const toneClass: Record<Tone, string> = {
  ok: 'badge-ok', warn: 'badge-warn', stop: 'badge-stop',
  unknown: 'badge-unknown', neutral: 'badge-neutral', info: 'badge-info',
};

/**
 * Status is never colour alone: each pill carries a glyph and its own words, so
 * it survives greyscale, a projector and colour vision deficiency.
 */
export function Badge({ label, tone, meaning, large }: { label: string; tone: Tone; meaning?: string; large?: boolean }) {
  return (
    <span className={`badge ${toneClass[tone]}${large ? ' badge-lg' : ''}`} title={meaning}>
      <span className="glyph" aria-hidden="true">{TONE_GLYPH[tone]}</span>
      <span>{label}</span>
    </span>
  );
}

/** Badge bound to a canonical enum dictionary, with its meaning as the title. */
export function StateBadge({ dictionary, value, large }: { dictionary: Record<string, Label>; value: string | null | undefined; large?: boolean }) {
  const state = describeState(dictionary, value);
  return <Badge label={state.label} tone={state.tone} meaning={state.meaning} large={large} />;
}

export function NoticeBox({ tone, title, children }: { tone: 'info' | 'ok' | 'warn' | 'stop' | 'unknown' | 'neutral'; title: string; children?: ReactNode }) {
  const glyph = tone === 'neutral' ? TONE_GLYPH.neutral : TONE_GLYPH[tone];
  return (
    <div className={`notice notice-${tone}`}>
      <h3><span aria-hidden="true">{glyph}</span>{title}</h3>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Page and section structure
 * ------------------------------------------------------------------ */

export function PageHead({ eyebrow, title, lede, actions }: { eyebrow?: string; title: string; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="head-row">
        <div style={{ minWidth: 0 }}>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {lede ? <p>{lede}</p> : null}
        </div>
        {actions ? <div className="row">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section" aria-label={title}>
      <div className="section-head">
        <h3>{title}</h3>
        {aside ? <div className="aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * One real measurement. There is no trend, no target and no percentage: the
 * backend does not produce them, so this component cannot display them.
 */
export function Metric({ label, value, note, tone = 'neutral', text, link }: {
  label: string; value: ReactNode; note?: ReactNode; tone?: Tone; text?: boolean; link?: { href: string; label: string };
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span className="metric-label">{label}</span>
      <span className={text ? 'metric-value text' : 'metric-value'}>{value}</span>
      {note ? <span className="metric-note">{note}</span> : null}
      {link ? <a href={link.href}>{link.label}</a> : null}
    </div>
  );
}

/**
 * Identifiers, digests and versions belong on the screen but not in front of the
 * business meaning. They always stay one disclosure away, never removed.
 */
export function TechnicalDetails({ summary = 'Technical details', items, children }: {
  summary?: string; items?: { term: string; value: ReactNode }[]; children?: ReactNode;
}) {
  return (
    <details className="technical">
      <summary>{summary}</summary>
      <div className="technical-body">
        {items?.length ? <Facts items={items} /> : null}
        {children}
      </div>
    </details>
  );
}

/* ------------------------------------------------------------------ *
 * Loading / empty / error / denied states
 * ------------------------------------------------------------------ */

export function Loading({ label }: { label: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <h3><span className="spinner-dot" aria-hidden="true" />Loading</h3>
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state-block">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

/**
 * The single failure surface. A failure is never softened into an empty list or
 * a success tone, and the request id is always available for correlation.
 */
export function FailureState({ failure, onRetry, dependency }: { failure: UiFailure; onRetry?: () => void; dependency?: string }) {
  const tone = failureTone(failure);
  return (
    <div className={`notice notice-${tone === 'unknown' ? 'warn' : tone}`} role="alert">
      <h3><span aria-hidden="true">{TONE_GLYPH[tone === 'unknown' ? 'unknown' : tone]}</span>{failure.title}</h3>
      <p>{failure.guidance}</p>
      {failure.serverMessage ? <p><strong>Server message:</strong> {failure.serverMessage}</p> : null}
      {failure.fieldErrors.length ? (
        <ul>{failure.fieldErrors.map(item => <li key={`${item.field}:${item.code}`}><code>{item.field}</code> — {item.code}</li>)}</ul>
      ) : null}
      {dependency ? <p><strong>Producing dependency:</strong> {dependency}</p> : null}
      <p className="mono">
        {failure.code ? `code=${failure.code} ` : ''}
        {failure.status ? `status=${failure.status} ` : ''}
        {failure.retry ? `retry=${failure.retry} ` : ''}
        {failure.requestId ? `request_id=${failure.requestId}` : ''}
      </p>
      {onRetry ? <button type="button" onClick={onRetry}>Retry this read</button> : null}
    </div>
  );
}

/**
 * Shown when an operation exists in the canonical contract but its producing
 * backend ticket is not implemented in this build. It reports the real server
 * answer; it never substitutes sample data.
 */
export function PendingIntegration({ operation, dependency, failure, onRetry }: { operation: string; dependency: string; failure: UiFailure | null; onRetry?: () => void }) {
  return (
    <div className="notice notice-info" role="status">
      <h3>Not available in this build</h3>
      <p>
        The interface for <code>{operation}</code> is bound to the canonical contract client, but this server build did not serve it.
        Runtime availability and integration verification stay pending on <strong>{dependency}</strong>. No placeholder result is displayed.
      </p>
      {failure ? (
        <p className="mono">
          {failure.code ? `code=${failure.code} ` : ''}{failure.status ? `status=${failure.status} ` : ''}
          {failure.requestId ? `request_id=${failure.requestId}` : ''}
        </p>
      ) : null}
      {onRetry ? <button type="button" onClick={onRetry}>Check again</button> : null}
    </div>
  );
}

export type BoundaryProps<T> = {
  query: Query<T>;
  label: string;
  /** Named producer ticket when this route may legitimately be unimplemented. */
  dependency?: string;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
};

/** Loading, error, denied, unavailable and empty in one accessible place. */
export function QueryBoundary<T>({ query, label, dependency, isEmpty, empty, children }: BoundaryProps<T>) {
  if (query.failure && !query.data) {
    if (dependency && query.failure.code === 'NOT_FOUND') {
      return <PendingIntegration operation={label} dependency={dependency} failure={query.failure} onRetry={query.refresh} />;
    }
    return <FailureState failure={query.failure} onRetry={query.refresh} dependency={dependency} />;
  }
  if (query.status === 'loading' || (query.status === 'idle' && !query.data)) return <Loading label={label} />;
  if (!query.data) return <Loading label={label} />;
  if (isEmpty?.(query.data)) return <>{query.failure ? <FailureState failure={query.failure} onRetry={query.refresh} /> : null}{empty ?? <EmptyState title="Nothing recorded yet"><p>No records exist for this scope in the synthetic profile.</p></EmptyState>}</>;
  return (
    <>
      {query.failure ? <FailureState failure={query.failure} onRetry={query.refresh} /> : null}
      {children(query.data)}
    </>
  );
}

export function Freshness({ query, asOf }: { query: Query<unknown>; asOf?: string | null }) {
  return (
    <p className="muted" aria-live="polite" style={{ fontSize: 12.5 }}>
      {asOf ? <>Server as of <strong>{formatTime(asOf)}</strong>. </> : null}
      {query.loadedAt ? <>Read into this screen at <strong>{formatTime(new Date(query.loadedAt).toISOString())}</strong>. </> : <>Not yet read. </>}
      {query.failure && query.data ? 'Displayed snapshot is stale; the latest read failed. ' : null}
      {query.status === 'refreshing' ? 'Refreshing…' : null}
      {' '}
      <button type="button" className="link" onClick={query.refresh}>Refresh now</button>
    </p>
  );
}

/* ------------------------------------------------------------------ *
 * Forms
 * ------------------------------------------------------------------ */

type FieldProps = {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
};

export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>
        <span className="label"><span id={`${id}-label`}>{label}</span>{required ? <span aria-hidden="true"> *</span> : null}</span>
      </label>
      {hint ? <span className="hint" id={hintId}>{hint}</span> : null}
      {children(id, describedBy)}
      {error ? <span className="field-error" id={errorId} role="alert">{error}</span> : null}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, error, required, type = 'text', autoComplete, placeholder, inputMode, maxLength }: {
  label: string; value: string; onChange: (value: string) => void; hint?: string; error?: string | null;
  required?: boolean; type?: 'text' | 'email' | 'password'; autoComplete?: string; placeholder?: string;
  inputMode?: 'text' | 'numeric'; maxLength?: number;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(id, describedBy) => (
        <input id={id} type={type} value={value} required={required} autoComplete={autoComplete}
          placeholder={placeholder} inputMode={inputMode} maxLength={maxLength}
          aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-invalid={error ? true : undefined}
          onChange={event => onChange(event.target.value)} />
      )}
    </Field>
  );
}

export function TextAreaField({ label, value, onChange, hint, error, required, maxLength }: {
  label: string; value: string; onChange: (value: string) => void; hint?: string; error?: string | null; required?: boolean; maxLength?: number;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(id, describedBy) => (
        <textarea id={id} value={value} required={required} maxLength={maxLength}
          aria-labelledby={`${id}-label`} aria-describedby={describedBy} aria-invalid={error ? true : undefined}
          onChange={event => onChange(event.target.value)} />
      )}
    </Field>
  );
}

export function SelectField({ label, value, onChange, options, hint, error, required }: {
  label: string; value: string; onChange: (value: string) => void;
  options: { value: string; label: string }[]; hint?: string; error?: string | null; required?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(id, describedBy) => (
        <select id={id} value={value} required={required} aria-labelledby={`${id}-label`} aria-describedby={describedBy}
          aria-invalid={error ? true : undefined} onChange={event => onChange(event.target.value)}>
          <option value="">— select —</option>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({ label, checked, onChange, name }: { label: ReactNode; checked: boolean; onChange: (checked: boolean) => void; name?: string }) {
  const id = useId();
  return (
    <div className="checkbox">
      <input id={id} name={name} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      <label htmlFor={id}><span>{label}</span></label>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Tables and fact lists
 * ------------------------------------------------------------------ */

export function DataTable<T>({ caption, columns, rows, rowKey }: {
  caption: string;
  columns: { key: string; header: string; cell: (row: T) => ReactNode }[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  return (
    <div className="table-wrap">
      <table className="data">
        <caption>{caption}</caption>
        <thead>
          <tr>{columns.map(column => <th key={column.key} scope="col">{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={rowKey(row)}>
              {columns.map(column => <td key={column.key}>{column.cell(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Facts({ items, tight }: { items: { term: string; value: ReactNode }[]; tight?: boolean }) {
  return (
    <dl className={tight ? 'facts tight' : 'facts'}>
      {items.map(item => (
        <div key={item.term} style={{ display: 'contents' }}>
          <dt>{item.term}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ *
 * Story, lifecycle and relationship presentation
 * ------------------------------------------------------------------ */

export type Stage = { step: string; name: string; note: string; href?: string };

/**
 * Explanatory navigation, not runtime state. Each stage links to the screen that
 * actually holds that part of the record; nothing here asserts progress.
 */
export function Lifecycle({ stages }: { stages: Stage[] }) {
  return (
    <ol className="lifecycle">
      {stages.map((stage, index) => (
        <li key={stage.name}>
          {stage.href ? (
            <a href={stage.href}>
              <span className="step">{index + 1}. {stage.step}</span>
              <span className="stage-name">{stage.name}</span>
              <span className="stage-note">{stage.note}</span>
            </a>
          ) : (
            <span className="stage-static">
              <span className="step">{index + 1}. {stage.step}</span>
              <span className="stage-name">{stage.name}</span>
              <span className="stage-note">{stage.note}</span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export type FlowStep = { kind: string; name: ReactNode; note?: ReactNode; tone?: Tone; extra?: ReactNode };

/** A declared relationship read downwards. Connectors are drawn, not asserted. */
export function Flow({ steps }: { steps: FlowStep[] }) {
  return (
    <ol className="flow">
      {steps.map((step, index) => (
        <li key={index} className={`tone-${step.tone ?? 'neutral'}`}>
          <span className="node-dot" aria-hidden="true" />
          <div className="flow-node">
            <span className="node-kind">{step.kind}</span>
            <div className="node-name">{step.name}</div>
            {step.note ? <div className="node-note">{step.note}</div> : null}
            {step.extra}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function StoryCell({ term, value, small }: { term: string; value: ReactNode; small?: boolean }) {
  return (
    <div className="story-cell">
      <span className="k">{term}</span>
      <span className={small ? 'v small' : 'v'}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Confirmation
 * ------------------------------------------------------------------ */

export function ConfirmDialog({ title, confirmLabel, tone = 'primary', onConfirm, onCancel, busy, children }: {
  title: string; confirmLabel: string; tone?: 'primary' | 'danger';
  onConfirm: () => void; onCancel: () => void; busy?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef=useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous=document.activeElement;const dialog=ref.current;
    dialog?.showModal();cancelRef.current?.focus();
    return ()=>{dialog?.close();if(previous instanceof HTMLElement)previous.focus();};
  }, []);
  return <dialog className="dialog" ref={ref} aria-label={title} onCancel={event=>{event.preventDefault();if(!busy)onCancel();}}>
    <h2>{title}</h2>{children}<div className="row row-end">
      <button type="button" ref={cancelRef} onClick={onCancel} disabled={busy}>Cancel</button>
      <button type="button" className={tone} onClick={onConfirm} disabled={busy}>{busy?'Working...':confirmLabel}</button>
    </div>
  </dialog>;
}

export function PendingHint({ children }: { children: ReactNode }) {
  return <p className="muted" role="status" aria-live="polite">{children}</p>;
}

export function Pagination({ query }: { query: { data: { next_cursor: string | null } | null; status: string; page: number; hasPrevious: boolean; next: (cursor:string) => void; previous: () => void } }) {
  const blocked=useRequestGuard();
  return <nav aria-label="Result pages" className="row" style={{marginTop:'var(--s4)'}}><button type="button" disabled={blocked || !query.hasPrevious || query.status === 'loading'} onClick={query.previous}>Previous page</button><span className="muted">Page {query.page}</span><button type="button" disabled={blocked || !query.data?.next_cursor || query.status === 'loading'} onClick={() => { if(query.data?.next_cursor) query.next(query.data.next_cursor); }}>Next page</button></nav>;
}
