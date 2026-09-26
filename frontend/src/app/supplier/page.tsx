'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { schemas } from '@orvia/contracts';

type Questionnaire = ReturnType<typeof schemas.SupplierQuestionnaire.parse>;
type State = { kind: 'loading' } | { kind: 'no-link' } | { kind: 'refused'; reason: string } | { kind: 'ready'; data: Questionnaire; saved: boolean; error: string | null };

/**
 * Supplier questionnaire (EX08). The link's token arrives in the URL fragment,
 * which browsers never send to a server; it is removed from the address bar at
 * once and held only in memory. There is no session and no account: the token
 * answers exactly one questionnaire until it expires or is revoked.
 */
export default function SupplierPage() {
  const token = useRef<string | null>(null);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(path, { ...init, credentials: 'omit', cache: 'no-store', headers: { ...(init.headers ?? {}), authorization: `Bearer ${token.current}` } });
    if (response.status === 401) return { refused: 'This link has expired or been revoked. Ask the organisation that sent it for a new one.' } as const;
    if (response.status === 409) return { refused: 'This questionnaire no longer accepts answers; it is under review.' } as const;
    if (!response.ok) return { error: `The request could not be completed (${response.status}). Check your answers and try again.` } as const;
    return { data: schemas.SupplierQuestionnaire.parse(await response.json()) } as const;
  };
  useEffect(() => {
    const match = globalThis.location.hash.match(/token=([a-f0-9]{64})/);
    globalThis.history.replaceState(null, '', globalThis.location.pathname);
    if (!match) { setState({ kind: 'no-link' }); return; }
    token.current = match[1]!;
    void request('/api/v1/supplier/questionnaire').then(r => setState('data' in r && r.data ? { kind: 'ready', data: r.data, saved: false, error: null } : { kind: 'refused', reason: 'refused' in r ? r.refused! : r.error! }));
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.kind !== 'ready') return;
    const form = new FormData(event.currentTarget);
    const answers = state.data.questions.filter(q => String(form.get(`a_${q.key}`) ?? '').trim()).map(q => ({
      question_key: q.key, value: String(form.get(`a_${q.key}`)).trim(), evidence_reference: String(form.get(`e_${q.key}`) ?? '').trim() || null,
    }));
    if (!answers.length) { setState({ ...state, error: 'Answer at least one question before saving.' }); return; }
    const r = await request('/api/v1/supplier/questionnaire/answers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers }) });
    if ('refused' in r && r.refused) setState({ kind: 'refused', reason: r.refused });
    else if ('error' in r && r.error) setState({ ...state, error: r.error });
    else if ('data' in r && r.data) setState({ kind: 'ready', data: r.data, saved: true, error: null });
  };
  return (
    <main className="page" style={{ maxWidth: 820, margin: '0 auto', padding: '32px 16px' }}>
      <h1>Supplier questionnaire</h1>
      {state.kind === 'loading' && <p role="status">Loading…</p>}
      {state.kind === 'no-link' && <p role="alert">Open this page from the link you were sent. The link contains the key to your questionnaire.</p>}
      {state.kind === 'refused' && <p role="alert">{state.reason}</p>}
      {state.kind === 'ready' && (
        <>
          <p><strong>{state.data.title}</strong> — {state.data.template_name}. This link expires {new Date(state.data.expires_at).toLocaleString()}.</p>
          <p className="cell-sub">Your answers are recorded as your organisation's attestation. The organisation that sent this link reviews them before relying on them.</p>
          <form onSubmit={submit} aria-label="Supplier answers">
            {state.data.questions.map(q => {
              const current = state.data.answers.find(a => a.question_key === q.key);
              return (
                <fieldset key={q.key} className="field" disabled={!state.data.editable}>
                  <legend className="label">{q.text}{q.required ? ' *' : ' (optional)'}</legend>
                  {q.guidance && <p className="hint">{q.guidance}</p>}
                  <label className="field"><span className="label">Answer</span>
                    {q.answer_type === 'YES_NO' || q.answer_type === 'CHOICE'
                      ? <select name={`a_${q.key}`} defaultValue={current?.value ?? ''}><option value="">Select…</option>{(q.answer_type === 'YES_NO' ? ['YES', 'NO'] : q.choices).map(c => <option key={c} value={c}>{c}</option>)}</select>
                      : q.answer_type === 'NUMBER' ? <input name={`a_${q.key}`} type="number" defaultValue={current?.value} />
                        : <textarea name={`a_${q.key}`} maxLength={4000} defaultValue={current?.value} />}
                  </label>
                  <label className="field"><span className="label">{q.evidence_required ? 'Evidence reference (required)' : 'Evidence reference'}</span>
                    <input name={`e_${q.key}`} maxLength={500} defaultValue={current?.evidence_reference ?? ''} /></label>
                </fieldset>
              );
            })}
            {state.data.editable && <button type="submit" className="primary">Save answers</button>}
          </form>
          {state.saved && <p role="status">Your answers were saved.</p>}
          {state.error && <p role="alert">{state.error}</p>}
        </>
      )}
    </main>
  );
}
