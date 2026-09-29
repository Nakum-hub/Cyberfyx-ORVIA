'use client';
import { useState } from 'react';
import { DataTable, NoticeBox } from '../../../components/shared/ui.tsx';
import { VendorArea, vendorCall, explain } from '../../../components/vendor/vendor.tsx';

type Purged = { engagement_id: string; packages: number; items: number; bytes: number };
/** Evidence of closed engagements is destroyed after each engagement's retention period; reports and findings are kept. Every purge is recorded. */
function Retention() {
  const [purged, setPurged] = useState<Purged[] | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const sweep = async () => { setBusy(true); setError(null); try { setPurged((await vendorCall<{ purged: Purged[] }>('/retention/sweep', {})).purged); } catch (e) { setError(explain(e)); } finally { setBusy(false); } };
  return <>
    <div className="page-head"><h2>Evidence retention</h2><p>Client evidence is kept only while it is needed: it is destroyed a set number of days after its engagement closes (90 by default). Reports and findings are kept.</p></div>
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    <button className="primary" type="button" disabled={busy} onClick={() => void sweep()}>Run retention sweep now</button>
    {purged && (purged.length ? <DataTable caption="Purged in this sweep" rowKey={p => p.engagement_id} rows={purged} columns={[{ key: 'e', header: 'Engagement', cell: p => <a href={`/vendor/engagements/${p.engagement_id}`}>{p.engagement_id.slice(0, 8)}</a> },
      { key: 'p', header: 'Packages', cell: p => p.packages }, { key: 'i', header: 'Items', cell: p => p.items }, { key: 'b', header: 'Bytes destroyed', cell: p => p.bytes }]} />
      : <NoticeBox tone="info" title="Nothing due"><p>No closed engagement has passed its retention period.</p></NoticeBox>)}
  </>;
}
export default function Page() { return <VendorArea capability="engagements.manage">{() => <Retention />}</VendorArea>; }
