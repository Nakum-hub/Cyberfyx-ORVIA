'use client';
import { useState } from 'react';
import { useCollection, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, NoticeBox, QueryBoundary, Section } from '../../shared/ui.tsx';
import { Choice, Input, WriteForm, localNow, nullable, nullableTime, text, time } from './registry-forms.tsx';

const KNOWLEDGE = ['UNKNOWN', 'KNOWN', 'EVIDENCE_AVAILABLE', 'EVIDENCE_MISSING', 'NEEDS_VERIFICATION', 'NEEDS_REMEDIATION', 'NOT_APPLICABLE', 'EXCEPTION_RECORDED'];
const REPRESENTATIVE_KINDS = [{ value: 'GUARDIAN', label: 'Guardian' }, { value: 'NOMINEE', label: 'Nominee' }, { value: 'AUTHORISED_REPRESENTATIVE', label: 'Authorised representative' }];
const CHILD_STATUS = [{ value: 'UNKNOWN', label: 'Unknown' }, { value: 'CHILD', label: 'Child' }, { value: 'NOT_CHILD', label: 'Not a child' }, { value: 'PERSON_WITH_DISABILITY_WITH_GUARDIAN', label: 'Person with disability with a lawful guardian' }];
const VERIFIABLE = [{ value: 'UNKNOWN', label: 'Unknown' }, { value: 'NOT_ESTABLISHED', label: 'Not established' }, { value: 'ESTABLISHED', label: 'Established' }, { value: 'NOT_REQUIRED_RECORDED', label: 'Not required (recorded basis)' }];

/** Reads up to three reference rows; a row is used only when its system and key are both given. */
function references(f: FormData) {
  const rows = [0, 1, 2].map(i => ({ system_id: text(f, `system${i}`), target_reference: text(f, `ref${i}`), source_key: nullable(f, `key${i}`) }));
  for (const r of rows) if (Boolean(r.system_id) !== Boolean(r.target_reference)) throw new Error('Each reference names both the system and the record key in it.');
  return rows.filter(r => r.system_id);
}

function ReferenceRows({ count }: { count: number }) {
  const systems = useCollection('list_systems');
  const options = (systems.data?.items ?? []).map(s => ({ value: s.id, label: s.name }));
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <fieldset key={i} className="field">
          <legend className="label">Reference {i + 1}</legend>
          <Choice label={`System ${i + 1}`} name={`system${i}`} required={false} placeholder="None" options={options} />
          <Input label={`Record key ${i + 1}`} name={`ref${i}`} required={false} maxLength={120} hint="Letters, digits and . _ : - only." />
          <Input label={`Source identifier ${i + 1}`} name={`key${i}`} required={false} maxLength={320} hint="e.g. an e-mail address. Only a keyed digest is stored." />
        </fieldset>
      ))}
    </>
  );
}

export function CreatePrincipal({ onSaved }: { onSaved: (id: string) => void }) {
  const principals = useCollection('list_principals');
  return (
    <Section title="Register a Data Principal">
      <WriteForm operation="create_data_principal" label="Register Data Principal" onSaved={s => onSaved(s.id)} describe={s => `person ${shortId(s.id)} with ${s.references.length} reference(s)`}
        build={f => ({ principal_id: nullable(f, 'principal'), references: references(f) })}>
        <Choice label="Privacy Centre identity" name="principal" required={false} placeholder="None" options={(principals.data?.items ?? []).map(p => ({ value: p.id, label: p.display_name }))} />
        <ReferenceRows count={3} />
      </WriteForm>
    </Section>
  );
}

/** Registry maintenance for one person: references, relationship contexts, merge, representatives and child status. */
export function PrincipalActions({ id, onChanged }: { id: string; onChanged: () => void }) {
  const subject = useQuery('data_principal', { params: { id } });
  const categories = useCollection('list_principal_categories');
  const systems = useCollection('list_systems');
  const [relationship, setRelationship] = useState('');
  const refresh = () => { subject.refresh(); onChanged(); };
  const relationships = subject.data?.relationships ?? [];
  return (
    <>
      <Section title="Maintain this person">
        <div className="grid-2">
          <WriteForm operation="add_data_principal_reference" label="Add a reference" params={{ id }} onSaved={refresh} describe={s => `${s.references.length} reference(s)`}
            build={f => { const [r] = references(f); if (!r) throw new Error('Name the system and the record key.'); return r; }}>
            <ReferenceRows count={1} />
          </WriteForm>
          <WriteForm operation="create_relationship_context" label="Start a relationship context" onSaved={refresh} describe={r => `${r.category_name}, ${r.status.toLowerCase()}`}
            build={f => {
              const status = text(f, 'status') as 'ACTIVE' | 'ENDED' | 'UNKNOWN'; const evidence = text(f, 'evidence') as 'UNKNOWN' | 'EVIDENCE_AVAILABLE'; const reference = nullable(f, 'reference');
              if (evidence === 'EVIDENCE_AVAILABLE' && !reference) throw new Error('Available evidence is referenced.');
              if (status === 'ACTIVE' && nullableTime(f, 'to')) throw new Error('An active relationship has no end.');
              const from = nullableTime(f, 'from'); const to = nullableTime(f, 'to');
              if (from && to && to < from) throw new Error('A relationship cannot end before it starts.');
              return { subject_id: id, category_id: text(f, 'category'), effective_from: nullableTime(f, 'from'), effective_to: nullableTime(f, 'to'), status,
                source_system_id: nullable(f, 'source'), source_reference: nullable(f, 'source_ref'), evidence_state: evidence, evidence_reference: reference };
            }}>
            <Choice label="Context" name="category" options={(categories.data?.items ?? []).map(c => ({ value: c.id, label: c.name }))} />
            <Choice label="Status" name="status" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'ENDED', label: 'Ended' }, { value: 'UNKNOWN', label: 'Unknown' }]} />
            <Input label="From" name="from" type="datetime-local" required={false} hint="Blank if not known." />
            <Input label="To" name="to" type="datetime-local" required={false} />
            <Choice label="Source system" name="source" required={false} placeholder="None" options={(systems.data?.items ?? []).map(s => ({ value: s.id, label: s.name }))} />
            <Input label="Source reference" name="source_ref" required={false} maxLength={500} />
            <Choice label="Evidence" name="evidence" options={KNOWLEDGE.map(k => ({ value: k, label: k.replaceAll('_', ' ').toLowerCase() }))} />
            <Input label="Evidence reference" name="reference" required={false} maxLength={500} />
          </WriteForm>
          <WriteForm operation="end_relationship_context" label="End a relationship context" params={relationship ? { id: relationship } : undefined} onSaved={refresh}
            describe={r => `${r.category_name} ended${r.effective_to ? ` ${formatTime(r.effective_to)}` : ' on an unrecorded date'}`}
            build={f => { if (!relationship) throw new Error('Choose the context to end.'); return { effective_to: nullableTime(f, 'to'), evidence_reference: nullable(f, 'reference'), reason: text(f, 'reason') }; }}>
            <Choice label="Context" name="relationship" value={relationship} onChange={setRelationship}
              options={relationships.filter(r => r.status !== 'ENDED').map(r => ({ value: r.id, label: `${r.category_name} (${r.status.toLowerCase()})` }))} />
            <Input label="Ended on" name="to" type="datetime-local" required={false} hint="Blank if the date is not known; it stays unknown." />
            <Input label="Evidence reference" name="reference" required={false} maxLength={500} />
            <Input label="Reason" name="reason" minLength={10} maxLength={500} />
          </WriteForm>
          {subject.data?.status === 'MERGED' ? (
            <WriteForm operation="unmerge_data_principal" label="Undo the merge" params={{ id }} onSaved={refresh} build={f => ({ reason: text(f, 'reason') })}>
              <p className="cell-sub">Merged into {shortId(subject.data.merged_into ?? '')}. Undoing restores this record with its history.</p>
              <Input label="Reason" name="reason" minLength={10} maxLength={500} />
            </WriteForm>
          ) : (
            <WriteForm operation="merge_data_principal" label="Merge into another record" params={{ id }} onSaved={refresh} describe={() => 'merged; history kept'}
              build={f => { if (text(f, 'into') === id) throw new Error('A record cannot be merged into itself.'); return { into_subject_id: text(f, 'into'), basis: text(f, 'basis') }; }}>
              <Input label="Surviving record identifier" name="into" maxLength={36} />
              <Input label="Basis" name="basis" minLength={10} maxLength={500} hint="Why both records are the same person." />
            </WriteForm>
          )}
        </div>
      </Section>
      <Representatives subjectId={id} />
      <ChildStatus subjectId={id} />
    </>
  );
}

function Representatives({ subjectId }: { subjectId: string }) {
  const list = useCollection('list_representatives');
  const mandates = useCollection('list_mandates');
  const mine = (list.data?.items ?? []).filter(r => r.subject_id === subjectId);
  const [target, setTarget] = useState('');
  const refresh = () => list.refresh();
  return (
    <Section title="Guardians, nominees and representatives">
      <QueryBoundary query={list} label="representatives" isEmpty={() => !mine.length}>
        {() => <DataTable caption="Representatives of this person" rows={mine} rowKey={r => r.id}
          columns={[
            { key: 'kind', header: 'Kind', cell: r => <span className="cell-primary">{r.kind.replaceAll('_', ' ').toLowerCase()}<span className="cell-sub">{r.representative_reference}</span></span> },
            { key: 'authority', header: 'Authority evidence', cell: r => r.authority_evidence_reference },
            { key: 'verified', header: 'Verification', cell: r => r.verification === 'VERIFIED' ? <Badge label="Verified" tone="ok" /> : r.verification === 'REJECTED' ? <Badge label="Rejected" tone="stop" /> : <Badge label="Unverified" tone="warn" meaning="Cannot act for this person until verified." /> },
            { key: 'period', header: 'Period', cell: r => `${formatTime(r.effective_from)} – ${r.effective_to ? formatTime(r.effective_to) : 'open'}` },
            { key: 'active', header: 'Nomination', cell: r => r.kind !== 'NOMINEE' ? '—' : r.activated_at ? `Activated (${r.activation_basis?.toLowerCase()})` : 'Not activated' },
          ]} />}
      </QueryBoundary>
      <div className="grid-2">
        <WriteForm operation="create_representative" label="Record a representative" onSaved={refresh} describe={r => `${r.kind.toLowerCase()} recorded, unverified`}
          build={f => ({ subject_id: subjectId, kind: text(f, 'kind') as 'GUARDIAN', representative_reference: text(f, 'who'), authority_evidence_reference: text(f, 'authority'),
            mandate_id: nullable(f, 'mandate'), effective_from: time(f, 'from'), effective_to: nullableTime(f, 'to'), restrictions: text(f, 'restrictions').split('\n').map(x => x.trim()).filter(Boolean) })}>
          <Choice label="Kind" name="kind" options={REPRESENTATIVE_KINDS} />
          <Input label="Who" name="who" minLength={3} maxLength={500} hint="A reference to the representative, not their documents." />
          <Input label="Authority evidence" name="authority" minLength={3} maxLength={500} />
          <Choice label="Rights mandate" name="mandate" required={false} placeholder="None" options={(mandates.data?.items ?? []).map(m => ({ value: m.id, label: shortId(m.id) }))} />
          <Input label="From" name="from" type="datetime-local" defaultValue={localNow()} />
          <Input label="To" name="to" type="datetime-local" required={false} />
          <Input label="Restrictions" name="restrictions" required={false} maxLength={500} hint="Optional; one per line." />
        </WriteForm>
        <div>
          <WriteForm operation="verify_representative" label="Verify a representative" params={target ? { id: target } : undefined} onSaved={refresh} describe={r => r.verification.toLowerCase()}
            build={f => { if (!target) throw new Error('Choose the representative.'); return { verification: text(f, 'verification') as 'VERIFIED' | 'REJECTED', evidence_reference: text(f, 'evidence') }; }}>
            <Choice label="Representative" name="target" value={target} onChange={setTarget} hint="A different staff member from the one who recorded it must verify it." options={mine.filter(r => r.verification === 'UNVERIFIED').map(r => ({ value: r.id, label: `${r.kind.toLowerCase()}: ${r.representative_reference}` }))} />
            <Choice label="Outcome" name="verification" options={[{ value: 'VERIFIED', label: 'Verified' }, { value: 'REJECTED', label: 'Rejected' }]} />
            <Input label="Verification evidence" name="evidence" minLength={3} maxLength={500} />
          </WriteForm>
          <ActivateNomination nominees={mine.filter(r => r.kind === 'NOMINEE' && r.verification === 'VERIFIED' && !r.activated_at)} onSaved={refresh} />
        </div>
      </div>
    </Section>
  );
}

function ActivateNomination({ nominees, onSaved }: { nominees: { id: string; representative_reference: string }[]; onSaved: () => void }) {
  const [target, setTarget] = useState('');
  return (
    <WriteForm operation="activate_nomination" label="Activate a nomination" params={target ? { id: target } : undefined} onSaved={onSaved} describe={r => `activated on ${r.activation_basis?.toLowerCase()}`}
      build={f => { if (!target) throw new Error('Choose the verified nominee.'); return { basis: text(f, 'basis') as 'DEATH' | 'INCAPACITY', evidence_reference: text(f, 'evidence') }; }}>
      <Choice label="Nominee" name="nominee" value={target} onChange={setTarget} options={nominees.map(n => ({ value: n.id, label: n.representative_reference }))} hint="Only a verified nominee can be activated." />
      <Choice label="Basis" name="basis" options={[{ value: 'DEATH', label: 'Death' }, { value: 'INCAPACITY', label: 'Incapacity' }]} />
      <Input label="Evidence" name="evidence" minLength={3} maxLength={500} />
    </WriteForm>
  );
}

function ChildStatus({ subjectId }: { subjectId: string }) {
  const current = useQuery('child_status', { params: { id: subjectId } });
  const reps = useCollection('list_representatives');
  const guardians = (reps.data?.items ?? []).filter(r => r.subject_id === subjectId && r.kind === 'GUARDIAN');
  const none = current.failure?.status === 404;
  return (
    <Section title="Child status">
      {none ? <p className="cell-sub">No child status is recorded. It is unknown, and nothing is assumed.</p> : (
        <QueryBoundary query={current} label="child status" isEmpty={() => false}>
          {c => (
            <>
              <p><strong>{CHILD_STATUS.find(x => x.value === c.child_status)?.label}</strong> — {c.basis}. Verifiable consent: {c.verifiable_consent.replaceAll('_', ' ').toLowerCase()}.</p>
              {c.active_restrictions.length > 0 && <NoticeBox tone="warn" title="Restrictions from the package in force"><ul>{c.active_restrictions.map(r => <li key={r.requirement_id}>{r.statement} ({r.requirement_id}{r.legal_status === 'NOT_YET_IN_FORCE' ? ', not yet in force' : ''})</li>)}</ul></NoticeBox>}
            </>
          )}
        </QueryBoundary>
      )}
      <WriteForm operation="record_child_status" label="Record child status" onSaved={() => current.refresh()} describe={c => `${c.child_status.toLowerCase()}; ${c.active_restrictions.length} restriction(s) apply`}
        build={f => {
          const status = text(f, 'status') as 'UNKNOWN'; const consent = text(f, 'consent') as 'UNKNOWN' | 'ESTABLISHED';
          if (status !== 'UNKNOWN' && !nullable(f, 'evidence')) throw new Error('A known status is recorded with the evidence it rests on.');
          if (consent === 'ESTABLISHED' && (!nullable(f, 'guardian') || !nullable(f, 'consent_evidence'))) throw new Error('Established verifiable consent names the guardian and its evidence.');
          return { subject_id: subjectId, child_status: status, basis: text(f, 'basis'), evidence_reference: nullable(f, 'evidence'), guardian_id: nullable(f, 'guardian'),
            verifiable_consent: consent, verifiable_consent_evidence_reference: nullable(f, 'consent_evidence') };
        }}>
        <Choice label="Status" name="status" options={CHILD_STATUS} />
        <Input label="Basis" name="basis" maxLength={500} hint="How this was established." />
        <Input label="Evidence reference" name="evidence" required={false} maxLength={500} />
        <Choice label="Guardian" name="guardian" required={false} placeholder="None" options={guardians.map(g => ({ value: g.id, label: g.representative_reference }))} />
        <Choice label="Verifiable consent" name="consent" options={VERIFIABLE} />
        <Input label="Verifiable consent evidence" name="consent_evidence" required={false} maxLength={500} />
      </WriteForm>
    </Section>
  );
}
