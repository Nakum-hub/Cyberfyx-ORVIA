'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { NoticeBox, SelectField, TextField } from '../../../components/shared/ui.tsx';
import { VendorArea, vendorCall, explain, saveFile } from '../../../components/vendor/vendor.tsx';

type Org = { id: string; name: string };
/** Licences are issued from the tier catalogue with the vendor licence key held by this installation; the client imports the file into its own installation. */
function Licences() {
  const [orgs, setOrgs] = useState<Org[]>([]); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [done, setDone] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10); const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const [f, setF] = useState({ organisation_id: '', installation_id: '', option: '', from: today, to: nextYear });
  useEffect(() => { vendorCall<{ items: Org[] }>('/organisations').then(r => setOrgs(r.items)).catch(e => setError(explain(e))); }, []);
  async function issue(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const r = await vendorCall<{ licence: { claims: { licence_id: string } }; plan: { member_seats: number } }>('/licences', { organisation_id: f.organisation_id, installation_id: f.installation_id.trim(), option: f.option, entitlements: [], environments: 1,
        valid_from: new Date(f.from).toISOString(), valid_to: new Date(f.to).toISOString() });
      saveFile(`orvia-licence-${r.licence.claims.licence_id}.json`, JSON.stringify(r.licence, null, 2), 'application/json');
      setDone(`Licence issued with ${r.plan.member_seats} member seats; the file was saved for the client to import.`);
    } catch (e) { setError(explain(e)); } finally { setBusy(false); }
  }
  return <>
    <div className="page-head"><h2>Licences</h2><p>Issue a signed licence bound to one client installation. Tier 1 options are 5 or 10 members; other tiers have no options until they are decided.</p></div>
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    {done && <NoticeBox tone="ok" title="Licence issued"><p>{done}</p></NoticeBox>}
    <form className="panel" onSubmit={issue} style={{ maxWidth: 560 }} aria-label="Issue licence">
      <SelectField label="Organisation" value={f.organisation_id} onChange={v => setF(x => ({ ...x, organisation_id: v }))} options={orgs.map(o => ({ value: o.id, label: o.name }))} required />
      <TextField label="Installation ID (shown in the client's installation)" value={f.installation_id} onChange={v => setF(x => ({ ...x, installation_id: v }))} required />
      <SelectField label="Plan option" value={f.option} onChange={v => setF(x => ({ ...x, option: v }))} options={[{ value: 'tier_1_members_5', label: 'Tier 1 — up to 5 members' }, { value: 'tier_1_members_10', label: 'Tier 1 — up to 10 members' }]} required />
      <TextField label="Valid from (YYYY-MM-DD)" value={f.from} onChange={v => setF(x => ({ ...x, from: v }))} required />
      <TextField label="Valid to (YYYY-MM-DD)" value={f.to} onChange={v => setF(x => ({ ...x, to: v }))} required />
      <button className="primary" type="submit" disabled={busy}>Issue and download licence</button>
    </form>
  </>;
}
export default function Page() { return <VendorArea capability="licences.issue">{() => <Licences />}</VendorArea>; }
