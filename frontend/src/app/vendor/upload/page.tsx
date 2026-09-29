'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DataTable, NoticeBox, TextField } from '../../../components/shared/ui.tsx';
import { VendorArea, vendorCall, explain } from '../../../components/vendor/vendor.tsx';

type Result = { outcome: 'ACCEPTED' | 'QUARANTINED' | 'REFUSED'; package_id: string | null; reasons: string[]; manifest_fingerprint: string | null };
type Upload = { id: string; engagement_reference: string | null; client_package_id: string | null; state: string; uploaded_at: string; outcome: string };
const MESSAGES: Record<string, string> = {
  ENGAGEMENT_CODE_NOT_RECOGNISED: 'The engagement code was not recognised for your organisation.', ENGAGEMENT_CLOSED: 'This engagement is closed.', WRONG_ENGAGEMENT: 'This package was prepared for a different engagement.',
  FINGERPRINT_MISMATCH: 'The package manifest was changed after it was sealed.', ITEM_HASH_MISMATCH: 'A file in the package does not match its recorded hash.', EXPIRED: 'The package has expired; prepare and approve a new one.',
  PACKAGE_ALREADY_RECEIVED: 'This package was already received.', NOT_A_PACKAGE: 'This is not an ORVIA audit package file.',
  PERSONAL_DATA_WITHOUT_PROCESSING_AGREEMENT: 'Received, but held in quarantine: it contains approved personal data and no processing agreement is recorded yet.',
};
/** Client organisations upload a sealed audit evidence package file with the engagement code. Nothing is pulled from their installation. */
function UploadPage() {
  const [code, setCode] = useState(''); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null); const [error, setError] = useState<string | null>(null); const [history, setHistory] = useState<Upload[]>([]);
  const load = useCallback(() => vendorCall<{ items: Upload[] }>('/uploads').then(r => setHistory(r.items)).catch(() => {}), []);
  useEffect(() => { void load(); }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!file) return; setBusy(true); setError(null); setResult(null);
    try { setResult(await vendorCall<Result>('/uploads', undefined, { raw: await file.arrayBuffer(), headers: { 'content-type': 'application/vnd.orvia.audit-package+json', 'x-orvia-engagement-code': code.trim().toUpperCase() } })); await load(); }
    catch (e) { setError(explain(e)); } finally { setBusy(false); }
  }
  return <>
    <div className="page-head"><h2>Upload an audit evidence package</h2><p>Upload the sealed package file exported and approved in your own ORVIA installation, with the engagement code your auditor gave you. Every file is verified before anyone can open it.</p></div>
    <form className="panel" onSubmit={submit} style={{ maxWidth: 560 }} aria-label="Upload audit package">
      <TextField label="Engagement code" value={code} onChange={setCode} required autoComplete="off" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" />
      <label>Package file<input type="file" accept=".json,application/json" onChange={e => setFile(e.target.files?.[0] ?? null)} required style={{ display: 'block', marginTop: 'var(--s2)' }} /></label>
      {error && <div className="notice notice-stop" role="alert">{error}</div>}
      <button className="primary" type="submit" disabled={busy || !file}>{busy ? 'Verifying…' : 'Upload package'}</button>
    </form>
    {result && <NoticeBox tone={result.outcome === 'ACCEPTED' ? 'ok' : result.outcome === 'QUARANTINED' ? 'warn' : 'stop'} title={result.outcome === 'ACCEPTED' ? 'Package received and verified' : result.outcome === 'QUARANTINED' ? 'Package received, held in quarantine' : 'Package refused'}>
      {result.reasons.map(r => <p key={r}>{MESSAGES[r] ?? r.replaceAll('_', ' ').toLowerCase()}</p>)}
      {result.manifest_fingerprint && <p>Manifest fingerprint: <code>{result.manifest_fingerprint}</code> — compare it with the one shown in your installation.</p>}</NoticeBox>}
    <DataTable caption="Your uploads" rowKey={u => u.id} rows={history} columns={[{ key: 't', header: 'When', cell: u => u.uploaded_at.slice(0, 16).replace('T', ' ') }, { key: 'e', header: 'Engagement', cell: u => u.engagement_reference ?? '—' },
      { key: 's', header: 'Outcome', cell: u => u.outcome === 'RECEIVED' ? u.state : `Refused: ${u.outcome.replaceAll('_', ' ').toLowerCase()}` }]} />
  </>;
}
export default function Page() { return <VendorArea capability="packages.upload">{() => <UploadPage />}</VendorArea>; }
