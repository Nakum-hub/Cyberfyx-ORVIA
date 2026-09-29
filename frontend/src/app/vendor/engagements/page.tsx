'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DataTable, NoticeBox, SelectField, TextField } from '../../../components/shared/ui.tsx';
import { VendorArea, vendorCall, explain, can, type VendorSession } from '../../../components/vendor/vendor.tsx';

type Engagement = { id: string; organisation_name: string; reference: string; state: string; period_from: string; period_to: string; scope_requirement_ids: string[]; on_team: boolean };
function Engagements({ session }: { session: VendorSession }) {
  const [items, setItems] = useState<Engagement[] | null>(null); const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [code, setCode] = useState<{ id: string; code: string } | null>(null);
  const [f, setF] = useState({ organisation_id: '', reference: '', scope: 'DPDP-NOTICE-CONSENT-REQUEST', from: '', to: '', retention: '90' });
  const load = useCallback(() => vendorCall<{ items: Engagement[] }>('/engagements').then(r => setItems(r.items)).catch(e => setError(explain(e))), []);
  useEffect(() => { void load(); if (can(session, 'organisations.read')) vendorCall<{ items: { id: string; name: string }[] }>('/organisations').then(r => setOrgs(r.items)).catch(() => {}); }, [load, session]);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const r = await vendorCall<{ engagement_id: string; engagement_code: string }>('/engagements', { organisation_id: f.organisation_id, reference: f.reference.trim(),
        scope_requirement_ids: f.scope.split(/[\s,]+/).filter(Boolean), period_from: f.from, period_to: f.to, retention_days: Number(f.retention) });
      setCode({ id: r.engagement_id, code: r.engagement_code }); await load();
    } catch (e) { setError(explain(e)); } finally { setBusy(false); }
  }
  return <>
    <div className="page-head"><h2>DPDPA audit engagements</h2><p>DPDPA only. Criteria are the DPDP requirements; evidence arrives from the client&apos;s own installation under a mandate its approvers signed, or as sealed packages the client approved. The output is an audit opinion as of a date for a stated scope, never a compliance certificate.</p></div>
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    {code && <NoticeBox tone="warn" title="Engagement code — shown once"><p>Give this code privately to the client organisation. They enter it in their own ORVIA installation; it also keys the audit channel between their installation and this one. Only its digest (and the channel key, sealed) is kept.</p><code>{code.code}</code>
      <p><a href={`/vendor/engagements/${code.id}`}>Open the engagement</a> · <button type="button" onClick={() => setCode(null)}>I have recorded it</button></p></NoticeBox>}
    {items ? <DataTable caption="Engagements" rowKey={e => e.id} rows={items} columns={[{ key: 'r', header: 'Reference', cell: e => <a href={`/vendor/engagements/${e.id}`}>{e.reference}</a> },
      { key: 'o', header: 'Organisation', cell: e => e.organisation_name }, { key: 's', header: 'State', cell: e => e.state }, { key: 'p', header: 'Period', cell: e => `${e.period_from} → ${e.period_to}` },
      { key: 'q', header: 'Requirements', cell: e => e.scope_requirement_ids.length }, { key: 't', header: 'Your team', cell: e => e.on_team ? 'Yes' : 'No' }]} /> : <p role="status">Loading…</p>}
    {can(session, 'engagements.manage') && <form className="panel" onSubmit={create} style={{ maxWidth: 640 }} aria-label="Create engagement"><h3>New engagement</h3>
      <SelectField label="Client organisation" value={f.organisation_id} onChange={v => setF(x => ({ ...x, organisation_id: v }))} options={orgs.map(o => ({ value: o.id, label: o.name }))} required />
      <TextField label="Engagement reference" value={f.reference} onChange={v => setF(x => ({ ...x, reference: v }))} required hint="Letters, digits and / _ . -" />
      <TextField label="Requirements in scope" value={f.scope} onChange={v => setF(x => ({ ...x, scope: v }))} required hint="DPDP requirement IDs separated by spaces or commas" />
      <TextField label="Audit period from (YYYY-MM-DD)" value={f.from} onChange={v => setF(x => ({ ...x, from: v }))} required />
      <TextField label="Audit period to (YYYY-MM-DD)" value={f.to} onChange={v => setF(x => ({ ...x, to: v }))} required />
      <TextField label="Evidence retention after closure (days)" value={f.retention} onChange={v => setF(x => ({ ...x, retention: v }))} required inputMode="numeric" />
      <button className="primary" type="submit" disabled={busy}>Create engagement</button></form>}
  </>;
}
export default function Page() { return <VendorArea capability="engagements.read">{s => <Engagements session={s} />}</VendorArea>; }
