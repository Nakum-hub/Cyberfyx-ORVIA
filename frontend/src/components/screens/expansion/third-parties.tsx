'use client';
import { useState } from 'react';
import { useCollection, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Choice, Input, Many, WriteForm, all, localNow, nullable, text, time } from '../privacy-operations/registry-forms.tsx';

const VIOLATION_TEXT: Record<string, string> = {
  NO_AGREEMENT_IN_FORCE: 'No agreement in force', AGREEMENT_EXPIRING: 'Agreement expiring', REGION_NOT_PERMITTED: 'Region not permitted', PURPOSE_NOT_PERMITTED: 'Purpose not permitted',
  SUBPROCESSOR_NOT_PERMITTED: 'Sub-processor not permitted', NO_TIER: 'No risk tier', DUE_DILIGENCE_MISSING: 'No approved due diligence', REASSESSMENT_DUE: 'Reassessment due', DISPOSITION_NOT_VERIFIED: 'Deletion not verified',
};

/**
 * Third-party lifecycle (EX08). Gaps are derived from recorded engagements and
 * agreements and stated as facts; a processor's own statement is never shown as
 * verified. Supplier links give a processor one questionnaire, nothing else.
 */
export function ThirdParties() {
  const list = usePagedQuery('list_third_party_standing', { limit: 25 });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead eyebrow="Governance" title="Third parties"
        lede="Each processor's agreements, risk tier and due diligence, compared with what is recorded as happening. Restrictions that engagements break are shown as facts, not scores." />
      <Freshness query={list} />
      <QueryBoundary query={list} label="third parties" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Processors" rows={d.items} rowKey={p => p.processor_id}
              columns={[
                { key: 'name', header: 'Processor', cell: p => <span className="cell-primary">{p.processor_name}<span className="cell-sub">{p.active_engagements} active engagement(s)</span></span> },
                { key: 'tier', header: 'Tier', cell: p => p.tier ? p.tier.toLowerCase() : <Badge label="Not set" tone="warn" /> },
                { key: 'agreement', header: 'Agreement', cell: p => p.agreement_in_force ? <Badge label="In force" tone="ok" /> : <Badge label="None in force" tone="warn" /> },
                { key: 'gaps', header: 'Gaps', cell: p => p.violations.length ? <ul>{p.violations.map(v => <li key={v}>{VIOLATION_TEXT[v] ?? v}</li>)}</ul> : 'None recorded' },
                { key: 'due', header: 'Reassessment due', cell: p => p.reassessment_due_at ? formatTime(p.reassessment_due_at) : '—' },
                { key: 'open', header: '', cell: p => <button type="button" onClick={() => setSelected(p.processor_id)}>Open</button> },
              ]} />
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
      {selected && <ProcessorDetail key={selected} id={selected} onChanged={() => list.refresh()} />}
    </>
  );
}

function ProcessorDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const standing = useQuery('third_party_standing', { params: { id } });
  const purposes = useCollection('list_registry_purposes');
  const assessments = useCollection('list_impact_assessments', { query: { subject_kind: 'PROCESSOR', subject_id: id } });
  const refresh = () => { standing.refresh(); onChanged(); };
  const [ending, setEnding] = useState('');
  return (
    <QueryBoundary query={standing} label="third-party standing" isEmpty={() => false}>
      {st => (
        <Section title={st.processor_name}>
          <Facts items={[
            { term: 'Recorded region', value: st.region }, { term: 'Risk tier', value: st.tier ? `${st.tier.tier.toLowerCase()} — reassess every ${st.tier.reassessment_interval_days} days` : 'Not set' },
            { term: 'Agreement in force', value: st.agreement_in_force ? `${st.agreement_in_force.kind} ${st.agreement_in_force.reference}${st.agreement_in_force.expires_at ? `, expires ${formatTime(st.agreement_in_force.expires_at)}` : ''}` : 'None' },
            { term: 'Last approved due diligence', value: st.last_due_diligence ? formatTime(st.last_due_diligence.approved_at) : 'None' },
            { term: 'Reassessment due', value: st.reassessment_due_at ? formatTime(st.reassessment_due_at) : '—' },
          ]} />
          {st.violations.length ? (
            <DataTable caption="Gaps derived from recorded processing" rows={st.violations} rowKey={v => `${v.kind}:${v.engagement_id ?? ''}:${v.detail}`}
              columns={[
                { key: 'kind', header: 'Gap', cell: v => <Badge label={VIOLATION_TEXT[v.kind] ?? v.kind} tone={v.kind === 'NO_TIER' || v.kind === 'AGREEMENT_EXPIRING' ? 'warn' : 'stop'} /> },
                { key: 'detail', header: 'Detail', cell: v => v.detail },
                { key: 'eng', header: 'Engagement', cell: v => v.engagement_id ? shortId(v.engagement_id) : '—' },
              ]} />
          ) : <NoticeBox tone="ok" title="No gaps recorded"><p>Nothing recorded conflicts with the agreement in force. This is not a certification of the processor.</p></NoticeBox>}
          <DataTable caption="Agreements" rows={st.agreements} rowKey={a => a.id}
            columns={[
              { key: 'ref', header: 'Agreement', cell: a => <span className="cell-primary">{a.kind} {a.reference}<span className="cell-sub">signed {formatTime(a.signed_at)}</span></span> },
              { key: 'period', header: 'Period', cell: a => `${formatTime(a.effective_from)} – ${a.expires_at ? formatTime(a.expires_at) : 'open'}` },
              { key: 'limits', header: 'Restrictions', cell: a => [a.allowed_regions.length ? `regions ${a.allowed_regions.join(', ')}` : 'any region', a.allowed_purpose_ids.length ? `${a.allowed_purpose_ids.length} purpose(s)` : 'any purpose', a.subprocessors_allowed ? 'sub-processors allowed' : 'no sub-processors'].join('; ') },
              { key: 'state', header: 'State', cell: a => a.in_force ? <Badge label="In force" tone="ok" /> : a.superseded ? 'Superseded' : a.status === 'TERMINATED' ? 'Terminated' : 'Not in force' },
            ]} />
          <div className="grid-2">
            <WriteForm operation="create_processor_agreement" label="Record an agreement" onSaved={refresh} describe={a => `${a.kind} ${a.reference}${a.in_force ? ' is in force' : ''}`}
              build={f => ({ processor_id: id, kind: text(f, 'kind') as 'DPA', reference: text(f, 'reference'), signed_at: time(f, 'signed'), effective_from: time(f, 'from'), expires_at: time(f, 'expires') || null,
                allowed_purpose_ids: all(f, 'purposes'), allowed_regions: text(f, 'regions').split(',').map(r => r.trim().toUpperCase()).filter(Boolean),
                subprocessors_allowed: f.get('subs') === 'on', onward_transfer_allowed: f.get('onward') === 'on', evidence_reference: text(f, 'evidence'), supersedes_id: nullable(f, 'supersedes') })}>
              <Choice label="Kind" name="kind" options={['DPA', 'MSA', 'SCC', 'NDA', 'OTHER'].map(k => ({ value: k, label: k }))} />
              <Input label="Reference" name="reference" minLength={3} maxLength={500} />
              <Input label="Signed" name="signed" type="datetime-local" defaultValue={localNow()} />
              <Input label="Effective from" name="from" type="datetime-local" defaultValue={localNow()} />
              <Input label="Expires" name="expires" type="datetime-local" required={false} hint="Blank if open-ended." />
              <Many legend="Permitted purposes" name="purposes" hint="None selected means the agreement does not restrict purpose." options={(purposes.data?.items ?? []).map(p => ({ value: p.id, label: p.name }))} />
              <Input label="Permitted regions" name="regions" required={false} maxLength={400} hint="Comma-separated codes such as IN, IN-KA. Blank means not restricted." />
              <label className="checkbox"><input type="checkbox" name="subs" /> <span>Sub-processors allowed</span></label>
              <label className="checkbox"><input type="checkbox" name="onward" /> <span>Onward transfer allowed</span></label>
              <Input label="Evidence reference" name="evidence" minLength={3} maxLength={500} />
              <Choice label="Supersedes" name="supersedes" required={false} placeholder="Nothing" options={st.agreements.filter(a => !a.superseded).map(a => ({ value: a.id, label: `${a.kind} ${a.reference}` }))} />
            </WriteForm>
            <div>
              <WriteForm operation="set_processor_tier" label="Set the risk tier" params={{ id }} onSaved={refresh} describe={t => `${t.tier.toLowerCase()}, reassess every ${t.reassessment_interval_days} days`}
                build={f => ({ tier: text(f, 'tier') as 'LOW', reassessment_interval_days: Number(text(f, 'interval')), reason: text(f, 'reason') })}>
                <Choice label="Tier" name="tier" options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(t => ({ value: t, label: t.toLowerCase() }))} />
                <Input label="Reassess every (days)" name="interval" type="number" defaultValue="365" />
                <Input label="Reason" name="reason" minLength={10} maxLength={500} />
              </WriteForm>
              <WriteForm operation="terminate_processor_agreement" label="Terminate an agreement" params={ending ? { id: ending } : undefined} onSaved={() => { setEnding(''); refresh(); }}
                build={f => { if (!ending) throw new Error('Choose the agreement.'); return { reason: text(f, 'reason') }; }}>
                <Choice label="Agreement" name="agreement" value={ending} onChange={setEnding} options={st.agreements.filter(a => a.status === 'ACTIVE').map(a => ({ value: a.id, label: `${a.kind} ${a.reference}` }))} />
                <Input label="Reason" name="reason" minLength={10} maxLength={500} />
              </WriteForm>
            </div>
          </div>
          <SupplierLinks assessments={(assessments.data?.items ?? []).filter(a => a.kind === 'VENDOR_DUE_DILIGENCE' && a.status === 'DRAFT')} />
        </Section>
      )}
    </QueryBoundary>
  );
}

function SupplierLinks({ assessments }: { assessments: { id: string; title: string }[] }) {
  const [assessment, setAssessment] = useState('');
  const links = usePagedQuery('list_supplier_links', { limit: 25, query: assessment ? { assessment_id: assessment } : {}, enabled: Boolean(assessment) });
  const [issued, setIssued] = useState<{ url: string; expires: string } | null>(null);
  return (
    <>
      <h3>Supplier questionnaire links</h3>
      <p className="cell-sub">A link lets the supplier answer one draft vendor due-diligence assessment, without an account, until it expires or is revoked. Its answers are attestations until a staff member records them.</p>
      <WriteForm operation="create_supplier_link" label="Issue a supplier link" onSaved={r => { setIssued({ url: `${globalThis.location.origin}${r.path}`, expires: r.link.expires_at }); links.refresh(); }}
        build={f => ({ assessment_id: assessment, expires_at: time(f, 'expires') })}>
        <Choice label="Assessment" name="assessment" value={assessment} onChange={setAssessment} options={assessments.map(a => ({ value: a.id, label: a.title }))} hint="Draft vendor due-diligence assessments of this processor." />
        <Input label="Expires" name="expires" type="datetime-local" defaultValue={localNow(7)} hint="At most thirty days." />
      </WriteForm>
      {issued && (
        <NoticeBox tone="warn" title="Copy this link now — it is shown once">
          <p><code>{issued.url}</code></p>
          <p>It expires {formatTime(issued.expires)}. Only a digest is stored; the link cannot be shown again. Send it to the supplier through your own channel.</p>
          <button type="button" onClick={() => setIssued(null)}>I have copied it</button>
        </NoticeBox>
      )}
      {assessment && (
        <QueryBoundary query={links} label="supplier links" isEmpty={d => !d.items.length}>
          {d => <DataTable caption="Links for this assessment" rows={d.items} rowKey={l => l.id}
            columns={[
              { key: 'state', header: 'State', cell: l => <Badge label={l.state.toLowerCase()} tone={l.state === 'ACTIVE' ? 'ok' : 'neutral'} /> },
              { key: 'expires', header: 'Expires', cell: l => formatTime(l.expires_at) },
              { key: 'used', header: 'Last used', cell: l => l.last_used_at ? formatTime(l.last_used_at) : 'Never' },
              { key: 'revoke', header: '', cell: l => l.state === 'ACTIVE' ? <ActionButton operation="revoke_supplier_link" label="Revoke" input={{ reason: 'Revoked from the third-party screen.' }} params={{ id: l.id }} onDone={() => links.refresh()} /> : null },
            ]} />}
        </QueryBoundary>
      )}
    </>
  );
}
