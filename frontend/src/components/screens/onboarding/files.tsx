'use client';
import { useState } from 'react';
import type { schemas } from '@orvia/contracts';
import { readOnce, useMutation, useQuery } from '../../shared/api.ts';
import { hasCapability, useSession } from '../../shared/session-context.tsx';
import { formatTime, type Label } from '../../shared/state-labels.ts';
import { Badge, DataTable, FailureState, NoticeBox, PageHead, QueryBoundary, Section, StateBadge } from '../../shared/ui.tsx';

type Item = ReturnType<typeof schemas.FileIntakeItem.parse>;
// Templates for the two CSV exports ORVIA reads (header row plus one example line); built here, nothing is fetched.
const CONSENT_TEMPLATE = 'customer_reference,email,system,activity,decision,occurred_at,evidence\ncust_2001,someone@aster.example,Aster online store,Promotional email and SMS,granted,2026-09-01T10:00:00Z,Account page opt-in\n';
const REQUESTS_TEMPLATE = 'email,name,right_type,description,received_at\nsomeone@aster.example,Example Person,access,Please send me a copy of my personal data.,2026-09-15\n';
const template = (csv: string) => `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
const KIND: Record<string, string> = {
  LICENCE: 'Licence', RELEASE: 'Release', REGULATORY_PACKAGE: 'Regulatory package', DATA_ASSET_INVENTORY: 'Data inventory',
  ESTATE_ROWS: 'Existing-data rows', CONSENT_EXPORT: 'Consent export (CSV)', PRIVACY_REQUESTS: 'Privacy requests (CSV)', DOCUMENT: 'Document', UNRECOGNISED: 'Not readable',
};
const STATE: Record<string, Label> = {
  STAGED: { label: 'Waiting for approval', tone: 'warn', meaning: 'Received and checked. Nothing in it has been applied.' },
  ROUTED: { label: 'Approved and imported', tone: 'ok', meaning: 'Sent into its import path; that path\'s own review still applies.' },
  KEPT: { label: 'Kept as a document', tone: 'ok', meaning: 'Approved and kept in this installation.' },
  REJECTED: { label: 'Rejected', tone: 'neutral', meaning: 'Not used. Its content was removed; this record remains.' },
};
const SUBJECTS = ['PROCESSOR', 'SYSTEM', 'INCIDENT', 'BREACH', 'RIGHTS_REQUEST', 'PURPOSE', 'NOTICE'] as const;

/**
 * Files (revision 1.12). Two ways in, one review: drop files into this installation's inbox folder on its server and ORVIA
 * picks them up by itself, or upload them here. Every file waits for a staff member's approval before anything in it is
 * used, and approval runs the same checks as the screen that imports that kind of file.
 */
export function Files() {
  const list = useQuery('list_file_intake');
  const { session } = useSession();
  const canWrite = hasCapability(session, 'registry.write');
  return (
    <>
      <PageHead eyebrow="Operations" title="Files"
        lede="Every file ORVIA uses — consent and privacy-request exports from your own systems, licences, releases, regulatory packages, data inventories, existing-data rows and documents such as contracts and policies. Files arrive automatically from this installation's inbox folder or by upload here, and nothing in them is used until someone approves it." />
      <QueryBoundary query={list} label="files" isEmpty={() => false}>
        {d => {
          const waiting = d.items.filter(i => i.state === 'STAGED');
          const done = d.items.filter(i => i.state !== 'STAGED');
          return (
            <>
              <Section title="Automatic: inbox folder">
                {d.inbox.configured
                  ? <><p>Files placed in this folder on the installation server are picked up within a few seconds:</p>
                    <p><code>{d.inbox.folder}</code></p>
                    <p className="cell-sub">Picked-up files move to <code>accepted/</code> beside it; files that cannot be read at all move to <code>rejected/</code> with a reason. Write large exports under a temporary name ending in <code>.part</code> and rename when complete. Accepted types: {d.inbox.accepted_extensions.join(', ')}; up to {Math.round(d.inbox.max_bytes / 1_048_576)} MiB per file.</p></>
                  : <NoticeBox tone="info" title="No inbox folder on this installation"><p>Set ORVIA_FILE_INBOX_DIR on the server to turn on automatic pickup. Upload below works either way.</p></NoticeBox>}
              </Section>
              <Section title="Import data from your own systems">
                <div id="import" />
                <p>Export from your store, website, CRM or data centre and upload the file here, instead of the automatic intake or to cross-check it. ORVIA reads it, matches each row to your registered systems and processing activities, and shows you exactly what will go where, and which rows it cannot use and why, before anyone approves. On approval it lands in the right modules:</p>
                <ul>
                  <li><strong>Consent export</strong> → Data Principals and Consent records (next to anything your website already sent for the same person). <a href={template(CONSENT_TEMPLATE)} download="orvia-consent-export-template.csv">Download the CSV template</a></li>
                  <li><strong>Privacy requests export</strong> → Privacy requests, with their statutory handling. <a href={template(REQUESTS_TEMPLATE)} download="orvia-privacy-requests-template.csv">Download the CSV template</a></li>
                  <li>Contracts, policies and other documents are kept and can be linked to a processor, system, incident, breach, request, purpose or notice.</li>
                </ul>
                {canWrite ? <Upload onDone={() => list.refresh()} /> : <p className="cell-sub">Uploading needs the registry write permission.</p>}
              </Section>
              <Section title={`Waiting for approval (${waiting.length})`}>
                {waiting.length === 0 ? <p className="cell-sub">Nothing is waiting.</p> : waiting.map(item => <Staged key={item.id} item={item} canWrite={canWrite} onDone={() => list.refresh()} />)}
              </Section>
              <Section title="Decided">
                <DataTable caption="Decided files" rows={done} rowKey={i => i.id}
                  columns={[
                    { key: 'n', header: 'File', cell: i => <span className="cell-primary">{i.original_name}<span className="cell-sub">{KIND[i.detected_kind]} · {i.source === 'INBOX_FOLDER' ? 'inbox folder' : 'uploaded'}</span></span> },
                    { key: 's', header: 'State', cell: i => <StateBadge dictionary={STATE} value={i.state} /> },
                    { key: 'r', header: 'Reason', cell: i => i.decision_reason ?? '' },
                    { key: 'l', header: 'Linked to', cell: i => i.subject_kind ? `${i.subject_kind.toLowerCase().replace('_', ' ')} ${i.subject_id!.slice(0, 8)}` : i.routed_resource_id ? `import ${i.routed_resource_id.slice(0, 8)}` : '' },
                    { key: 'd', header: 'Decided', cell: i => i.decided_at ? formatTime(i.decided_at) : '' },
                    { key: 'v', header: '', cell: i => i.state === 'KEPT' ? <Open item={i} /> : null },
                  ]} />
              </Section>
              <ul className="cell-sub">{d.limits.map(l => <li key={l}>{l}</li>)}</ul>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}

function Upload({ onDone }: { onDone: () => void }) {
  const upload = useMutation('upload_file', true);
  const [problem, setProblem] = useState<string | null>(null);
  const [last, setLast] = useState<Item | null>(null);
  return (
    <div>
      <label className="field"><span className="label">Choose a file</span>
        <input type="file" disabled={upload.status === 'pending'} onChange={async event => {
          const file = event.target.files?.[0]; event.target.value = '';
          if (!file) return;
          setProblem(null); setLast(null); upload.newInteraction();
          if (file.size > 10_485_760) { setProblem('The file is larger than 10 MiB. Split it and upload the parts.'); return; }
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          const item = await upload.run({ file_name: file.name.slice(0, 200), content_base64: btoa(binary) });
          if (item) { setLast(item as Item); onDone(); }
        }} /></label>
      {problem && <NoticeBox tone="stop" title="Not uploaded"><p>{problem}</p></NoticeBox>}
      {upload.failure && <FailureState failure={upload.failure} />}
      {last && <NoticeBox tone={last.detected_kind === 'UNRECOGNISED' ? 'warn' : 'ok'} title={`${last.original_name}: ${KIND[last.detected_kind]}`}><p>{last.detail} {last.state === 'STAGED' ? 'It is waiting for approval below.' : 'This file was received before; nothing new was added.'}</p></NoticeBox>}
    </div>
  );
}

function Staged({ item, canWrite, onDone }: { item: Item; canWrite: boolean; onDone: () => void }) {
  const decide = useMutation('decide_file_intake', true);
  const [reason, setReason] = useState('');
  const [subjectKind, setSubjectKind] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const { session } = useSession();
  const mayApprove = item.approval_capability !== null && hasCapability(session, item.approval_capability);
  const send = async (decision: 'APPROVE' | 'REJECT') => {
    decide.newInteraction();
    const linked = decision === 'APPROVE' && item.detected_kind === 'DOCUMENT' && subjectKind && subjectId.trim();
    if (await decide.run({ decision, reason: reason.trim(), subject_kind: linked ? subjectKind as typeof SUBJECTS[number] : null, subject_id: linked ? subjectId.trim() : null }, { params: { id: item.id } })) onDone();
  };
  return (
    <div className="entry-card">
      <p><span className="cell-primary">{item.original_name}</span> <Badge label={KIND[item.detected_kind]!} tone={item.detected_kind === 'UNRECOGNISED' ? 'warn' : 'info'} /></p>
      <p className="cell-sub">{item.detail} · {item.source === 'INBOX_FOLDER' ? 'from the inbox folder' : 'uploaded'} {formatTime(item.received_at)} · {Math.ceil(item.size_bytes / 1024)} KiB</p>
      <p className="cell-sub">On approval: {item.on_approval}</p>
      {item.detected_kind !== 'UNRECOGNISED' && <Open item={item} />}
      {canWrite && (
        <form onSubmit={e => e.preventDefault()}>
          <label className="field"><span className="label">Reason (recorded with the decision)</span>
            <input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} /></label>
          {item.detected_kind === 'DOCUMENT' && (
            <div>
              <label className="field"><span className="label">Link to (optional)</span>
                <select value={subjectKind} onChange={e => setSubjectKind(e.target.value)}>
                  <option value="">Not linked</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s.toLowerCase().replace('_', ' ')}</option>)}
                </select></label>
              {subjectKind && <label className="field"><span className="label">Record ID</span><input value={subjectId} onChange={e => setSubjectId(e.target.value)} maxLength={36} /></label>}
            </div>
          )}
          {item.detected_kind !== 'UNRECOGNISED' && <><button type="button" className="primary" disabled={reason.trim().length < 3 || !mayApprove || decide.status === 'pending'} onClick={() => void send('APPROVE')}>Approve</button>{' '}</>}
          <button type="button" disabled={reason.trim().length < 3 || decide.status === 'pending'} onClick={() => void send('REJECT')}>Reject</button>
          {!mayApprove && item.approval_capability && <p className="cell-sub">Approving this kind of file needs the {item.approval_capability} permission.</p>}
          {decide.failure && <FailureState failure={decide.failure} />}
        </form>
      )}
    </div>
  );
}

/** Opens the stored file in a new tab from this installation; nothing leaves it. */
function Open({ item }: { item: Item }) {
  const [busy, setBusy] = useState(false);
  return <button type="button" className="link" disabled={busy} onClick={async () => {
    setBusy(true);
    try {
      const content = await readOnce('file_intake_content', { params: { id: item.id } });
      const bytes = Uint8Array.from(atob(content.content_base64), ch => ch.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: content.content_type }));
      window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally { setBusy(false); }
  }}>Open file</button>;
}
