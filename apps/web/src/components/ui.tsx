'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useRequestGuard } from './api.ts';
import type { Query } from './api.ts';
import { failureTone, type UiFailure } from './errors.ts';
import { describeState, formatTime, type Label, type Tone } from './state-labels.ts';

/* ------------------------------------------------------------------ *
 * Status primitives
 * ------------------------------------------------------------------ */

const toneClass: Record<Tone, string> = {
  ok: 'badge-ok', warn: 'badge-warn', stop: 'badge-stop',
  unknown: 'badge-unknown', neutral: 'badge-neutral', info: 'badge-info',
};

export function Badge({ label, tone, meaning }: { label: string; tone: Tone; meaning?: string }) {
  return <span className={`badge ${toneClass[tone]}`} title={meaning}>{label}</span>;
}

/** Badge bound to a canonical enum dictionary, with its meaning as the title. */
export function StateBadge({ dictionary, value }: { dictionary: Record<string, Label>; value: string | null | undefined }) {
  const state = describeState(dictionary, value);
  return <Badge label={state.label} tone={state.tone} meaning={state.meaning} />;
}

export function NoticeBox({ tone, title, children }: { tone: 'info' | 'ok' | 'warn' | 'stop' | 'neutral'; title: string; children?: ReactNode }) {
  return (
    <div className={`notice notice-${tone}`}>
      <h3>{title}</h3>
      {children}
    </div>
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
      <h3>{failure.title}</h3>
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
    <p className="muted" aria-live="polite">
      {asOf ? <>Server as of <strong>{formatTime(asOf)}</strong>. </> : null}
      {query.loadedAt ? <>Read into this screen at <strong>{formatTime(new Date(query.loadedAt).toISOString())}</strong>. </> : <>Not yet read. </>}
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
        <span className="label">{label}{required ? ' *' : ''}</span>
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
          aria-describedby={describedBy} aria-invalid={error ? true : undefined}
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
          aria-describedby={describedBy} aria-invalid={error ? true : undefined}
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
        <select id={id} value={value} required={required} aria-describedby={describedBy}
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

export function Facts({ items }: { items: { term: string; value: ReactNode }[] }) {
  return (
    <dl className="facts">
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
  return <nav aria-label="Result pages" className="row"><button type="button" disabled={blocked || !query.hasPrevious || query.status === 'loading'} onClick={query.previous}>Previous page</button><span>Page {query.page}</span><button type="button" disabled={blocked || !query.data?.next_cursor || query.status === 'loading'} onClick={() => { if(query.data?.next_cursor) query.next(query.data.next_cursor); }}>Next page</button></nav>;
}
