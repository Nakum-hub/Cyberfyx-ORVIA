'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { EndpointMap } from '@orvia/contracts/generated/endpoint-types';
import { useMutation } from '../../shared/api.ts';
import { MutationFeedback } from '../../shared/mutation-feedback.tsx';
import { hasCapability, useSession } from '../../shared/session-context.tsx';
import { NoticeBox } from '../../shared/ui.tsx';

/**
 * Creation forms for the Data & Processing Registry.
 *
 * Every form posts one canonical contract operation. The request is validated
 * against the contract schema before dispatch (useMutation), and the server
 * re-validates and authorises it independently. Hiding a form from a session
 * without the capability is presentation only. Blank optional fields are sent
 * as null — never as an invented default — because the registry records an
 * absent fact as absent.
 */
export type RegistryWriteOperation =
  | 'create_principal_category' | 'create_data_category' | 'create_registry_purpose' | 'revise_registry_purpose' | 'create_processing_condition'
  | 'create_registry_activity' | 'link_registry_activity' | 'create_registry_notice' | 'create_notice_version' | 'publish_notice_version'
  | 'create_retention_rule' | 'create_retention_hold' | 'create_processor_engagement';

export const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
export const nullable = (form: FormData, key: string) => text(form, key) || null;
export const all = (form: FormData, key: string) => form.getAll(key).map(String).filter(Boolean);
/** A datetime-local value is the operator's local time; the contract carries UTC. An empty value stays empty so validation names it. */
export const time = (form: FormData, key: string) => { const v = text(form, key); return v ? new Date(v).toISOString() : ''; };
export const nullableTime = (form: FormData, key: string) => { const v = text(form, key); return v ? new Date(v).toISOString() : null; };
export const nullableInt = (form: FormData, key: string) => { const v = text(form, key); return v === '' ? null : Number(v); };

/** The current local time in the shape a datetime-local input accepts. */
export function localNow(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Input({ label, name, hint, required = true, maxLength = 120, minLength, defaultValue, type = 'text' }: {
  label: string; name: string; hint?: string; required?: boolean; maxLength?: number; minLength?: number; defaultValue?: string; type?: 'text' | 'number' | 'datetime-local';
}) {
  return (
    <label className="field">
      <span className="label">{label}{required ? <span aria-hidden="true"> *</span> : null}</span>
      {hint ? <span className="hint">{hint}</span> : null}
      <input name={name} type={type} required={required} maxLength={type === 'text' ? maxLength : undefined} minLength={minLength} defaultValue={defaultValue}
        {...type === 'number' ? { min: 0, max: 36500, step: 1 } : {}} />
    </label>
  );
}

export function Area({ label, name, hint, required = true, maxLength = 2000, minLength }: { label: string; name: string; hint?: string; required?: boolean; maxLength?: number; minLength?: number }) {
  return (
    <label className="field">
      <span className="label">{label}{required ? <span aria-hidden="true"> *</span> : null}</span>
      {hint ? <span className="hint">{hint}</span> : null}
      <textarea name={name} required={required} maxLength={maxLength} minLength={minLength} />
    </label>
  );
}

export function Choice({ label, name, options, hint, required = true, placeholder = 'Select…', value, onChange }: {
  label: string; name: string; options: { value: string; label: string }[]; hint?: string; required?: boolean; placeholder?: string;
  value?: string; onChange?: (value: string) => void;
}) {
  const controlled = value !== undefined ? { value, onChange: (e: { target: { value: string } }) => onChange?.(e.target.value) } : { defaultValue: '' };
  return (
    <label className="field">
      <span className="label">{label}{required ? <span aria-hidden="true"> *</span> : null}</span>
      {hint ? <span className="hint">{hint}</span> : null}
      <select name={name} required={required} {...controlled}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** A named group of checkboxes; FormData.getAll(name) returns the chosen values. */
export function Many({ legend, name, options, hint }: { legend: string; name: string; options: { value: string; label: string }[]; hint?: string }) {
  return (
    <fieldset className="field">
      <legend className="label">{legend}</legend>
      {hint ? <span className="hint">{hint}</span> : null}
      {options.length === 0 ? <p className="cell-sub">Nothing is recorded yet to choose from.</p> : options.map(o => (
        <label key={o.value} className="checkbox"><input type="checkbox" name={name} value={o.value} /> <span>{o.label}</span></label>
      ))}
    </fieldset>
  );
}

export function WriteForm<K extends RegistryWriteOperation>({ operation, label, capability = 'registry.write', build, params, onSaved, children, describe }: {
  operation: K; label: string; capability?: string;
  /** Builds the request from the form. Throwing an Error shows its message and sends nothing. */
  build: (form: FormData) => EndpointMap[K]['request'];
  params?: Record<string, string>;
  onSaved: (result: EndpointMap[K]['response']) => void;
  children: ReactNode;
  describe?: (result: EndpointMap[K]['response']) => ReactNode;
}) {
  const { session } = useSession();
  const mutation = useMutation(operation, true);
  const [localError, setLocalError] = useState<string | null>(null);
  if (!hasCapability(session, capability)) return <NoticeBox tone="info" title={`${label}: not available to this session`}><p>Your server-derived capabilities do not include {capability}.</p></NoticeBox>;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setLocalError(null);
    let input: EndpointMap[K]['request'];
    try { input = build(new FormData(form)); } catch (error) { setLocalError(error instanceof Error ? error.message : 'The form could not be read.'); return; }
    const result = await mutation.run(input, params ? { params } : {});
    if (result) { form.reset(); onSaved(result); }
  };
  return (
    <form className="panel" onSubmit={submit} aria-label={label}>
      <h3>{label}</h3>
      <fieldset disabled={mutation.status === 'pending' || mutation.unsettled}>
        {children}
        <button className="primary" type="submit">{mutation.status === 'pending' ? 'Recording…' : label}</button>
      </fieldset>
      {localError ? <NoticeBox tone="stop" title="Not sent"><p>{localError}</p></NoticeBox> : null}
      <MutationFeedback mutation={mutation} onReplayed={result => onSaved(result as EndpointMap[K]['response'])} />
      {mutation.status === 'done' && mutation.result ? (
        <p role="status">Recorded{describe ? <> — {describe(mutation.result)}</> : null}. <button type="button" onClick={mutation.newInteraction}>Record another</button></p>
      ) : null}
    </form>
  );
}
