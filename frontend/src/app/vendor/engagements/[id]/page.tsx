'use client';
import { use, useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { EngagementFile } from '../../../../../../shared/contracts/src/vendor-practice.ts';
import { DataTable, EmptyState, Facts, NoticeBox, SelectField, TextAreaField, TextField } from '../../../../components/shared/ui.tsx';
import { VendorArea, vendorCall, explain, can, saveFile, fromBase64, VENDOR_ROLE_LABELS, type VendorSession } from '../../../../components/vendor/vendor.tsx';

/**
 * The engagement workspace of the audit practice (task AUDIT-PRACTICE-01). One
 * engagement, nine tabs in the order the work happens: acceptance, scope and
 * applicability, the risk-based plan, requests, evidence, tests and working
 * papers, findings, the report, and follow-up. What a person may do is decided
 * by the server; controls shown here only save a round trip, and every refusal
 * the server gives is shown with its reason.
 */
type Engagement = { id: string; organisation_name: string; reference: string; state: string; period_from: string; period_to: string; scope_requirement_ids: string[]; on_team: boolean;
  team: { user_id: string; name: string; role: string; engagement_role: string }[]; processing_agreement: { recorded: boolean; reference: string | null; recorded_at: string | null };
  independence: { declared: boolean; statement: string | null; conflict_check: string | null; conflict_note: string | null; declared_at: string | null }; empanelment_reference: string | null; retention_days: number; closed_at: string | null; purged_at: string | null };
type Pkg = { id: string; client_package_id: string; uploaded_at: string; manifest_fingerprint: string; contains_personal_data: boolean; state: string; quarantine_reason: string | null; item_count?: number };
type Item = { item_id: string; requirement_id: string; kind: string; title: string; file_name: string | null; media_type: string; contains_personal_data: boolean; content_available: boolean; reviews: { id: string; decision: string }[] };
type Report = { id: string; version: number; state: string; opinion_as_of: string; drafted_by: string; approved_by: string | null; pdf_sha256: string | null };
type Practice = { criteria: { id: string; version: string; distribution: string; approved_by: string | null }[]; methodologies: { id: string; version: string; approved_by: string | null }[]; real_use_allowed: boolean; gates_missing: string[] };
type Member = { user_id: string; name: string; role: string; active: boolean };
type File = EngagementFile;

const words = (v: string | null | undefined) => v ? v.replaceAll('_', ' ').toLowerCase() : '—';
const short = (id: string | null | undefined) => id ? id.slice(0, 8) : '—';
const lines = (v: string) => v.split('\n').map(s => s.trim()).filter(Boolean);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

function useAction(reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [done, setDone] = useState<string | null>(null);
  const run = useCallback(async (work: () => Promise<unknown>, success?: string) => {
    setBusy(true); setError(null); setDone(null);
    try { await work(); await reload(); if (success) setDone(success); } catch (e) { setError(explain(e)); } finally { setBusy(false); }
  }, [reload]);
  return { busy, error, done, run };
}
const Block = ({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) =>
  <section className="section" aria-label={title}><div className="section-head"><h3>{title}</h3></div>{note && <p className="muted">{note}</p>}{children}</section>;
/** A labelled form that runs one server action; the submit label doubles as its accessible purpose. */
function Act({ label, submit, busy, onRun, children, disabled }: { label: string; submit: string; busy: boolean; onRun: () => void; children?: ReactNode; disabled?: boolean }) {
  return <form className="panel" aria-label={label} onSubmit={(ev: FormEvent) => { ev.preventDefault(); onRun(); }}>{children}<button type="submit" disabled={busy || disabled}>{submit}</button></form>;
}

const TABS = ['Overview', 'Scope and applicability', 'Plan', 'Requests', 'Evidence', 'Tests and working papers', 'Findings and actions', 'Report', 'Follow-up'] as const;
type Tab = typeof TABS[number];
function Tabs({ current, onChange, counts }: { current: Tab; onChange: (t: Tab) => void; counts: Partial<Record<Tab, number>> }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const key = (ev: KeyboardEvent, i: number) => {
    const next = ev.key === 'ArrowRight' ? (i + 1) % TABS.length : ev.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : ev.key === 'Home' ? 0 : ev.key === 'End' ? TABS.length - 1 : -1;
    if (next < 0) return; ev.preventDefault(); onChange(TABS[next]!); refs.current[next]?.focus();
  };
  return <div className="tabs" role="tablist" aria-label="Engagement workspace">{TABS.map((t, i) =>
    <button key={t} ref={el => { refs.current[i] = el; }} type="button" role="tab" id={`tab-${i}`} aria-selected={current === t} aria-controls={`panel-${i}`} tabIndex={current === t ? 0 : -1}
      onClick={() => onChange(t)} onKeyDown={ev => key(ev, i)}>{t}{counts[t] !== undefined && <span className="tab-count">{counts[t]}</span>}</button>)}</div>;
}

function Workspace({ id, session }: { id: string; session: VendorSession }) {
  const [e, setE] = useState<Engagement | null>(null); const [file, setFile] = useState<File | null>(null); const [practice, setPractice] = useState<Practice | null>(null);
  const [inbox, setInbox] = useState<{ packages: Pkg[]; refusals: { id: string; reasons: string[]; refused_at: string }[] } | null>(null);
  const [reports, setReports] = useState<Report[]>([]); const [members, setMembers] = useState<Member[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(() => { try { const t = sessionStorage.getItem(`orvia-engagement-tab-${id}`); return (TABS as readonly string[]).includes(t ?? '') ? t as Tab : 'Overview'; } catch { return 'Overview'; } });
  const choose = (t: Tab) => { setTab(t); try { sessionStorage.setItem(`orvia-engagement-tab-${id}`, t); } catch { /* per-viewer convenience only */ } };
  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [eng, f, p] = await Promise.all([vendorCall<Engagement>(`/engagements/${id}`), vendorCall<File>(`/engagements/${id}/file`), vendorCall<Practice>('/practice')]);
      setE(eng); setFile(f); setPractice(p);
      if (eng.on_team) { const [i, r] = await Promise.all([vendorCall<typeof inbox>(`/engagements/${id}/inbox`), vendorCall<{ items: Report[] }>(`/engagements/${id}/reports`)]); setInbox(i); setReports(r.items); }
    } catch (err) { setLoadError(explain(err)); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (can(session, 'vendor.team.read')) vendorCall<{ members: Member[] }>('/team').then(r => setMembers(r.members.filter(m => m.active))).catch(() => {}); }, [session]);
  const action = useAction(load);
  if (!e || !file) return loadError ? <NoticeBox tone="stop" title="Engagement unavailable"><p>{loadError}</p><button type="button" onClick={() => void load()}>Try again</button></NoticeBox> : <p role="status">Loading the engagement…</p>;
  const role = (r: string) => e.team.some(t => t.user_id === session.actor_id && t.engagement_role === r);
  const ctx: Ctx = { id, e, file, practice, inbox, reports, members, session, action, isLead: role('LEAD'), isReviewer: role('REVIEWER'), closed: e.state === 'CLOSED',
    accepted: file.acceptance?.decision === 'ACCEPTED', scope: (file.scope.filter(s => s.approved_by).at(-1)?.requirement_ids ?? e.scope_requirement_ids) };
  const openFindings = file.findings.filter(f => f.status !== 'CLOSED').length;
  const counts: Partial<Record<Tab, number>> = { Requests: file.requests.filter(r => r.overdue).length || undefined, Evidence: file.evidence.length, 'Tests and working papers': file.working_papers.filter(w => w.current && !w.reviewed_by).length || undefined,
    'Findings and actions': openFindings || undefined, Report: reports.length || undefined };
  const marks = [file.use_kind !== 'REAL' && 'SYNTHETIC ENGAGEMENT — not an audit of a real organisation; not for reliance.', file.criteria && file.criteria.distribution !== 'PRODUCTION' && 'TEST-FIXTURE CRITERIA — not the official regulatory package.'].filter(Boolean) as string[];
  const i = TABS.indexOf(tab);
  return <>
    <div className="page-head"><p className="eyebrow"><a href="/vendor/engagements">Engagements</a></p><h2>{e.reference} — {e.organisation_name}</h2>
      <p>DPDPA audit, period {e.period_from} to {e.period_to}. State: {words(e.state)}. {ctx.accepted ? 'Accepted.' : file.acceptance ? 'Acceptance awaiting decision.' : 'Not yet accepted.'}</p></div>
    {marks.map(m => <p key={m} className="watermark" role="note">{m}</p>)}
    {action.error && <div className="notice notice-stop" role="alert">{action.error}</div>}
    {action.done && <div className="notice notice-ok" role="status">{action.done}</div>}
    <Tabs current={tab} onChange={choose} counts={counts} />
    <div role="tabpanel" id={`panel-${i}`} aria-labelledby={`tab-${i}`}>
      {tab === 'Overview' && <Overview c={ctx} />}
      {tab !== 'Overview' && !e.on_team && <NoticeBox tone="info" title="The engagement file is for its team only"><p>You are not on this engagement&apos;s team, so its planning, evidence, working papers, findings and reports are not shown. The acceptance record is on the Overview tab.</p></NoticeBox>}
      {tab !== 'Overview' && e.on_team && !ctx.accepted && tab !== 'Report' && <NoticeBox tone="warn" title="Engagement not accepted yet"><p>Fieldwork, requests to the client and findings are refused until an audit reviewer who holds no commercial or implementation role accepts the engagement. See Overview.</p></NoticeBox>}
      {e.on_team && tab === 'Scope and applicability' && <ScopeTab c={ctx} />}
      {e.on_team && tab === 'Plan' && <PlanTab c={ctx} />}
      {e.on_team && tab === 'Requests' && <RequestsTab c={ctx} />}
      {e.on_team && tab === 'Evidence' && <EvidenceTab c={ctx} />}
      {e.on_team && tab === 'Tests and working papers' && <TestsTab c={ctx} />}
      {e.on_team && tab === 'Findings and actions' && <FindingsTab c={ctx} />}
      {e.on_team && tab === 'Report' && <ReportTab c={ctx} />}
      {e.on_team && tab === 'Follow-up' && <FollowUpTab c={ctx} />}
    </div>
  </>;
}
type Ctx = { id: string; e: Engagement; file: File; practice: Practice | null; inbox: { packages: Pkg[]; refusals: { id: string; reasons: string[]; refused_at: string }[] } | null; reports: Report[]; members: Member[];
  session: VendorSession; action: ReturnType<typeof useAction>; isLead: boolean; isReviewer: boolean; closed: boolean; accepted: boolean; scope: string[] };
const nameOf = (c: Ctx, id: string | null | undefined) => id ? (c.e.team.find(t => t.user_id === id)?.name ?? c.members.find(m => m.user_id === id)?.name ?? short(id)) : '—';

// ---------------------------------------------------------------- Overview: engagement, team, acceptance, conflicts, independence
const SERVICE: Record<string, string> = { READINESS_ADVISORY: 'Readiness / advisory (no audit opinion)', EVIDENCE_AUDIT: 'Evidence-based audit', STATUTORY_SDF_AUDIT_CLAIM: 'Statutory SDF audit (not offered: decision D1)' };
// Decision D1: the statutory SDF audit is shown for acceptances recorded earlier but can no longer be chosen.
const OFFERED = ['READINESS_ADVISORY', 'EVIDENCE_AUDIT'];
function Overview({ c }: { c: Ctx }) {
  const { id, e, file, action: { busy, run } } = c;
  const [team, setTeam] = useState({ user_id: '', engagement_role: '' }); const [pa, setPa] = useState('');
  const [conf, setConf] = useState({ use_kind: 'SYNTHETIC', criteria_version_id: '', methodology_id: '', commercial_owner_id: '', implementation_owner_id: '' });
  const [acc, setAcc] = useState({ service_type: 'EVIDENCE_AUDIT', objectives: '', intended_users: '', client_responsibilities: '', auditor_responsibilities: '', confidentiality: '', evidence_handling: '', scope_restrictions: '', competence: '', sdf_applicability_basis: '', eligibility_evidence: '', licence_independence: false });
  const [dec, setDec] = useState({ decision: 'ACCEPTED', rationale: '' }); const [cf, setCf] = useState({ kind: 'PRIOR_CONSULTING', person_id: '', description: '' }); const [cr, setCr] = useState({ id: '', status: 'SAFEGUARDED', safeguard: '' });
  const [ind, setInd] = useState({ statement: '', conflict: 'NO_CONFLICT', note: '', empanelment: '' });
  const staff = c.members.map(m => ({ value: m.user_id, label: `${m.name} (${VENDOR_ROLE_LABELS[m.role] ?? m.role})` }));
  const a = file.acceptance;
  const status = [
    { term: 'Acceptance', value: a?.decision ? `${words(a.decision)} by ${nameOf(c, a.decided_by)} on ${a.decided_at?.slice(0, 10)} — ${a.decision_rationale}` : a ? 'Prepared; awaiting an independent decision' : 'Not prepared' },
    { term: 'Service', value: a ? SERVICE[a.service_type] : '—' },
    { term: 'Criteria', value: file.criteria ? `${file.criteria.version} (${words(file.criteria.distribution)})` : 'Not configured' },
    { term: 'Risk methodology', value: file.methodology ? `${file.methodology.version}${file.methodology.approved ? '' : ' (not approved)'}` : 'Not configured' },
    { term: 'Scope', value: file.scope.filter(s => s.approved_by).length ? `Version ${file.scope.filter(s => s.approved_by).at(-1)!.version} approved: ${c.scope.join(', ')}` : `Commissioned: ${e.scope_requirement_ids.join(', ')} (no approved scope version)` },
    { term: 'Work programme', value: file.plan.approved ? `Approved by ${nameOf(c, file.plan.approval?.approved_by)}` : file.plan.approval ? 'Changed since approval — needs re-approval' : 'Not approved' },
    { term: 'Conclusions', value: `${file.conclusions.filter(x => x.recorded).length} of ${file.conclusions.length} scoped requirements` },
    { term: 'Findings', value: `${file.findings.filter(f => f.status !== 'CLOSED').length} open, ${file.findings.filter(f => f.status === 'CLOSED').length} closed` },
    { term: 'Processing agreement', value: e.processing_agreement.recorded ? `Recorded: ${e.processing_agreement.reference}` : 'Not recorded — packages containing personal data stay quarantined' },
    { term: 'Independence declaration', value: e.independence.declared ? e.independence.statement : 'Not yet declared by the lead' },
    { term: 'Eligibility reference', value: e.empanelment_reference ? `${e.empanelment_reference} (stated by the auditor; not verified by ORVIA)` : 'None entered — no statutory eligibility is claimed' },
    { term: 'Evidence retention', value: `${e.retention_days} days after closure${e.purged_at ? `; purged ${e.purged_at.slice(0, 10)}` : ''}${file.holds.some(h => h.active) ? '; under a legal hold' : ''}` },
  ];
  return <>
    <Block title="Engagement status"><Facts items={status} /></Block>
    <Block title="Team" note="Review authority is never held by the engagement's commercial or implementation owner, or by anyone with a prior-implementation, consulting or commercial conflict.">
      <DataTable caption="Engagement team" rowKey={t => t.user_id} rows={e.team} columns={[{ key: 'n', header: 'Name', cell: t => t.name }, { key: 'r', header: 'Vendor role', cell: t => VENDOR_ROLE_LABELS[t.role] ?? t.role }, { key: 'e', header: 'On this engagement', cell: t => t.engagement_role }]} />
      {can(c.session, 'engagements.manage') && !c.closed && <>
        <Act label="Add team member" submit="Add to team" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/team`, team), 'Team member added.')}>
          <SelectField label="Member" value={team.user_id} onChange={v => setTeam(t => ({ ...t, user_id: v }))} options={c.members.filter(m => ['LEAD_AUDITOR', 'AUDITOR', 'AUDIT_REVIEWER'].includes(m.role)).map(m => ({ value: m.user_id, label: `${m.name} (${VENDOR_ROLE_LABELS[m.role]})` }))} required />
          <SelectField label="Engagement role" value={team.engagement_role} onChange={v => setTeam(t => ({ ...t, engagement_role: v }))} options={[{ value: 'LEAD', label: 'Lead' }, { value: 'AUDITOR', label: 'Auditor' }, { value: 'REVIEWER', label: 'Reviewer' }]} required /></Act>
        {!e.processing_agreement.recorded && <Act label="Record processing agreement" submit="Record processing agreement" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/processing-agreement`, { reference: pa }), 'Processing agreement recorded.')}>
          <TextField label="Processing agreement reference" value={pa} onChange={setPa} required hint="Only when a signed processing agreement with the client exists (the vendor acts as the client's Data Processor)." /></Act>}
      </>}
    </Block>
    <Block title="Acceptance and independence" note="Buying, renewing or expanding an ORVIA licence never conditions a finding or conclusion. A real engagement is refused until the practice's activation gates are recorded and production criteria exist.">
      {!a && can(c.session, 'engagements.manage') && !c.closed && <>
        <Act label="Configure engagement" submit="Save configuration" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/configure`, { use_kind: conf.use_kind, criteria_version_id: conf.criteria_version_id, methodology_id: conf.methodology_id,
          commercial_owner_id: conf.commercial_owner_id || null, implementation_owner_id: conf.implementation_owner_id || null }), 'Configuration saved.')}>
          <SelectField label="Use" value={conf.use_kind} onChange={v => setConf(x => ({ ...x, use_kind: v }))} options={[{ value: 'SYNTHETIC', label: 'Synthetic (training / test; marked on every output)' }, { value: 'REAL', label: `Real client${c.practice?.real_use_allowed ? '' : ' — refused: activation gates missing'}` }]} required />
          <SelectField label="Criteria version" value={conf.criteria_version_id} onChange={v => setConf(x => ({ ...x, criteria_version_id: v }))} options={(c.practice?.criteria ?? []).filter(x => x.approved_by || x.distribution === 'TEST_FIXTURE').map(x => ({ value: x.id, label: `${x.version} (${words(x.distribution)})` }))} required />
          <SelectField label="Risk methodology" value={conf.methodology_id} onChange={v => setConf(x => ({ ...x, methodology_id: v }))} options={(c.practice?.methodologies ?? []).filter(m => m.approved_by).map(m => ({ value: m.id, label: m.version }))} required hint="Only approved methodologies are listed. Record and approve them under Audit practice." />
          <SelectField label="Commercial owner (optional)" value={conf.commercial_owner_id} onChange={v => setConf(x => ({ ...x, commercial_owner_id: v }))} options={[{ value: '', label: 'None' }, ...staff]} />
          <SelectField label="Implementation owner (optional)" value={conf.implementation_owner_id} onChange={v => setConf(x => ({ ...x, implementation_owner_id: v }))} options={[{ value: '', label: 'None' }, ...staff]} /></Act>
        <Act label="Prepare acceptance" submit="Prepare acceptance" busy={busy} disabled={!acc.licence_independence} onRun={() => void run(() => vendorCall(`/engagements/${id}/acceptance`, { ...acc, scope_restrictions: acc.scope_restrictions.trim() || null,
          sdf_applicability_basis: acc.sdf_applicability_basis.trim() || null, eligibility_evidence: acc.eligibility_evidence.trim() || null, licence_independence: true }), 'Acceptance prepared; an audit reviewer decides it.')}>
          <SelectField label="Service type" value={acc.service_type} onChange={v => setAcc(x => ({ ...x, service_type: v }))} options={OFFERED.map(value => ({ value, label: SERVICE[value]! }))} required />
          {(['objectives', 'intended_users', 'client_responsibilities', 'auditor_responsibilities', 'confidentiality', 'evidence_handling', 'competence'] as const).map(k => <TextAreaField key={k} label={words(k).replace(/^./, s => s.toUpperCase())} value={acc[k]} onChange={v => setAcc(x => ({ ...x, [k]: v }))} required />)}
          <TextAreaField label="Scope restrictions (optional)" value={acc.scope_restrictions} onChange={v => setAcc(x => ({ ...x, scope_restrictions: v }))} />
          {acc.service_type === 'STATUTORY_SDF_AUDIT_CLAIM' && <><TextAreaField label="Significant Data Fiduciary applicability basis" value={acc.sdf_applicability_basis} onChange={v => setAcc(x => ({ ...x, sdf_applicability_basis: v }))} required hint="The notification or determination relied on, with its source. ORVIA does not infer SDF status." />
            <TextAreaField label="Auditor eligibility evidence" value={acc.eligibility_evidence} onChange={v => setAcc(x => ({ ...x, eligibility_evidence: v }))} required hint="What the practice relies on for eligibility. ORVIA records it and never decides statutory eligibility; legal review of the requirement is pending." /></>}
          <label className="row"><input type="checkbox" checked={acc.licence_independence} onChange={ev => setAcc(x => ({ ...x, licence_independence: ev.target.checked }))} /> No finding or conclusion depends on buying, renewing or expanding an ORVIA licence.</label></Act>
      </>}
      {a && <Facts items={[{ term: 'Objectives', value: a.objectives }, { term: 'Intended users', value: a.intended_users }, { term: 'Client responsibilities', value: a.client_responsibilities }, { term: 'Auditor responsibilities', value: a.auditor_responsibilities },
        { term: 'Confidentiality', value: a.confidentiality }, { term: 'Evidence handling', value: a.evidence_handling }, { term: 'Competence', value: a.competence }, { term: 'Scope restrictions', value: a.scope_restrictions ?? 'None' },
        ...(a.sdf_applicability_basis ? [{ term: 'SDF applicability basis', value: a.sdf_applicability_basis }, { term: 'Eligibility evidence (not verified by ORVIA)', value: a.eligibility_evidence }] : []),
        { term: 'Prepared by', value: `${nameOf(c, a.prepared_by)} on ${a.prepared_at.slice(0, 10)}` }]} />}
      {a && !a.decision && can(c.session, 'engagement.accept') && <Act label="Decide acceptance" submit="Record decision" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/acceptance/decide`, dec), 'Decision recorded.')}>
        <SelectField label="Decision" value={dec.decision} onChange={v => setDec(x => ({ ...x, decision: v }))} options={[{ value: 'ACCEPTED', label: 'Accept' }, { value: 'DECLINED', label: 'Decline' }]} required />
        <TextAreaField label="Decision rationale" value={dec.rationale} onChange={v => setDec(x => ({ ...x, rationale: v }))} required hint="Refused while any conflict is open or disqualifying, or if you prepared the terms, lead the engagement or hold a barred role." /></Act>}
      <h4>Conflicts and prior work</h4>
      {file.conflicts.length ? <DataTable caption="Conflicts recorded" rowKey={x => x.id} rows={file.conflicts} columns={[{ key: 'k', header: 'Kind', cell: x => words(x.kind) }, { key: 'p', header: 'Person', cell: x => nameOf(c, x.person_id) },
        { key: 'd', header: 'Description', cell: x => x.description }, { key: 's', header: 'Status', cell: x => <>{words(x.status)}{x.safeguard && <span className="cell-sub">Safeguard: {x.safeguard}</span>}</> }]} />
        : <EmptyState title="No conflicts recorded"><p>Record prior implementation, consulting, commercial, personal or financial relationships before acceptance.</p></EmptyState>}
      {!c.closed && <Act label="Record conflict" submit="Record conflict" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/conflicts`, { kind: cf.kind, person_id: cf.person_id || null, description: cf.description }), 'Conflict recorded; acceptance waits until it is reviewed.')}>
        <SelectField label="Conflict kind" value={cf.kind} onChange={v => setCf(x => ({ ...x, kind: v }))} options={['PRIOR_IMPLEMENTATION', 'PRIOR_CONSULTING', 'COMMERCIAL_RELATIONSHIP', 'PERSONAL_RELATIONSHIP', 'FINANCIAL_INTEREST', 'OTHER'].map(v => ({ value: v, label: words(v) }))} required />
        <SelectField label="Person concerned" value={cf.person_id} onChange={v => setCf(x => ({ ...x, person_id: v }))} options={[{ value: '', label: 'The practice as a whole' }, ...e.team.map(t => ({ value: t.user_id, label: t.name }))]} />
        <TextAreaField label="Conflict description" value={cf.description} onChange={v => setCf(x => ({ ...x, description: v }))} required /></Act>}
      {file.conflicts.some(x => x.status === 'OPEN') && can(c.session, 'engagement.accept') && <Act label="Review conflict" submit="Record review" busy={busy} onRun={() => void run(() => vendorCall(`/conflicts/${cr.id}/review`, { status: cr.status, safeguard: cr.safeguard.trim() || null }), 'Conflict reviewed.')}>
        <SelectField label="Open conflict" value={cr.id} onChange={v => setCr(x => ({ ...x, id: v }))} options={file.conflicts.filter(x => x.status === 'OPEN').map(x => ({ value: x.id, label: `${words(x.kind)} — ${x.description.slice(0, 60)}` }))} required />
        <SelectField label="Outcome" value={cr.status} onChange={v => setCr(x => ({ ...x, status: v }))} options={[{ value: 'SAFEGUARDED', label: 'Safeguarded' }, { value: 'DISQUALIFYING', label: 'Disqualifying' }]} required />
        <TextAreaField label="Safeguard" value={cr.safeguard} onChange={v => setCr(x => ({ ...x, safeguard: v }))} hint="Required when safeguarded. A person with prior implementation, consulting or commercial work stays barred from review authority." /></Act>}
      {c.isLead && !e.independence.declared && <Act label="Declare independence" submit="Declare independence" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/independence`, { statement: ind.statement, conflict_check: ind.conflict, conflict_note: ind.note.trim() || null, empanelment_reference: ind.empanelment.trim() || null }), 'Independence declared.')}>
        <TextAreaField label="Independence statement" value={ind.statement} onChange={v => setInd(x => ({ ...x, statement: v }))} required />
        <SelectField label="Conflict check" value={ind.conflict} onChange={v => setInd(x => ({ ...x, conflict: v }))} options={[{ value: 'NO_CONFLICT', label: 'No conflict' }, { value: 'CONFLICT_MITIGATED', label: 'Conflict identified and mitigated' }]} required />
        <TextField label="Conflict note" value={ind.note} onChange={v => setInd(x => ({ ...x, note: v }))} />
        <TextField label="Eligibility reference (optional)" value={ind.empanelment} onChange={v => setInd(x => ({ ...x, empanelment: v }))} hint="A reference the auditor can substantiate. ORVIA shows it as stated and never asserts statutory eligibility." /></Act>}
      {can(c.session, 'engagements.manage') && !c.closed && <button type="button" className="danger" disabled={busy} onClick={() => void run(() => vendorCall(`/engagements/${id}/close`, {}), 'Engagement closed.')}>Close engagement</button>}
    </Block>
  </>;
}

// ---------------------------------------------------------------- Scope and applicability
function ScopeTab({ c }: { c: Ctx }) {
  const { id, file, action: { busy, run } } = c;
  const [u, setU] = useState({ business_overview: '', processing_activities: '', systems: '', data_categories: '', third_parties: '', sdf_status: 'UNKNOWN', sdf_source: '', prior_audits: '', existing_records: '' });
  const [ap, setAp] = useState({ requirement_id: '', criterion_type: 'STATUTORY', applicability: 'APPLICABLE', effective_from: '', rationale: '', evidence_refs: '', unresolved_question: '' });
  const last = file.scope.at(-1);
  const [s, setS] = useState({ entities: '', processes: '', systems: '', locations: '', period_from: c.e.period_from, period_to: c.e.period_to, requirement_ids: c.scope.join('\n'), exclusions: '', limitations: '', change_reason: '', impact_assessment: '' });
  const current = file.applicability.filter(a => a.current);
  const reqOptions = [...new Set([...c.e.scope_requirement_ids, ...current.map(a => a.requirement_id)])].map(r => ({ value: r, label: r }));
  const latestU = file.understanding.at(-1);
  return <>
    <Block title="Understanding of the organisation" note="Versioned. Contact details and identifiers are removed before storage; reference existing client records (RoPA exports, GRC registers) rather than copying them.">
      {latestU ? <Facts items={[{ term: 'Version', value: `${latestU.version} by ${nameOf(c, latestU.prepared_by)}${latestU.reviewed_by ? `, reviewed by ${nameOf(c, latestU.reviewed_by)}` : ' — awaiting review'}${latestU.redactions ? ` · ${latestU.redactions} redaction(s)` : ''}` },
        ...Object.entries(latestU.content as Record<string, unknown>).map(([k, v]) => ({ term: words(k).replace(/^./, x => x.toUpperCase()), value: Array.isArray(v) ? v.join(', ') || '—' : typeof v === 'object' && v ? Object.values(v).join(' — ') : String(v ?? '—') }))]} />
        : <EmptyState title="No understanding recorded" />}
      {latestU && !latestU.reviewed_by && c.isReviewer && latestU.prepared_by !== c.session.actor_id && <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/understanding/${latestU.id}/review`, {}), 'Understanding reviewed.')}>Review understanding</button>}
      {c.accepted && !c.closed && <Act label="Record understanding" submit={latestU ? 'Record new version' : 'Record understanding'} busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/understanding`, { business_overview: u.business_overview, processing_activities: lines(u.processing_activities), systems: lines(u.systems),
        data_categories: lines(u.data_categories), third_parties: lines(u.third_parties), sdf_status: { status: u.sdf_status, source: u.sdf_source }, prior_audits: u.prior_audits.trim() || null, existing_records: lines(u.existing_records) }), 'Understanding recorded.')}>
        <TextAreaField label="Business overview" value={u.business_overview} onChange={v => setU(x => ({ ...x, business_overview: v }))} required />
        <TextAreaField label="Processing activities (one per line)" value={u.processing_activities} onChange={v => setU(x => ({ ...x, processing_activities: v }))} required />
        <TextAreaField label="Systems (one per line)" value={u.systems} onChange={v => setU(x => ({ ...x, systems: v }))} />
        <TextAreaField label="Data categories (one per line)" value={u.data_categories} onChange={v => setU(x => ({ ...x, data_categories: v }))} />
        <TextAreaField label="Third parties (one per line)" value={u.third_parties} onChange={v => setU(x => ({ ...x, third_parties: v }))} />
        <SelectField label="SDF status" value={u.sdf_status} onChange={v => setU(x => ({ ...x, sdf_status: v }))} options={[{ value: 'UNKNOWN', label: 'Unknown' }, { value: 'NOT_NOTIFIED', label: 'Not notified as an SDF' }, { value: 'NOTIFIED_SDF', label: 'Notified as an SDF' }]} required />
        <TextField label="Source for SDF status" value={u.sdf_source} onChange={v => setU(x => ({ ...x, sdf_source: v }))} required />
        <TextField label="Prior audits (optional)" value={u.prior_audits} onChange={v => setU(x => ({ ...x, prior_audits: v }))} />
        <TextAreaField label="Existing client records relied on (one per line)" value={u.existing_records} onChange={v => setU(x => ({ ...x, existing_records: v }))} /></Act>}
    </Block>
    <Block title="Applicability by requirement" note="Statutory, contractual and advisory criteria are kept apart. An unresolved decision states its open question and is carried into the scope as a limitation.">
      {file.applicability.length ? <DataTable caption="Applicability decisions (current and superseded)" rowKey={a => a.id} rows={file.applicability} columns={[{ key: 'r', header: 'Requirement', cell: a => <>{a.requirement_id}{!a.current && <span className="cell-sub">superseded</span>}</> },
        { key: 't', header: 'Criterion', cell: a => words(a.criterion_type) }, { key: 'a', header: 'Applicability', cell: a => <>{words(a.applicability)}{a.unresolved_question && <span className="cell-sub">Open: {a.unresolved_question}</span>}</> },
        { key: 'p', header: 'Provisions', cell: a => a.provision_ids.join(', ') }, { key: 'e', header: 'Effective', cell: a => a.effective_from ?? '—' }, { key: 'x', header: 'Rationale', cell: a => a.rationale },
        { key: 'v', header: 'Review', cell: a => a.reviewed_by ? `Reviewed by ${nameOf(c, a.reviewed_by)}` : c.isReviewer && a.decided_by !== c.session.actor_id ? <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/applicability/${a.id}/review`, {}), 'Decision reviewed.')}>Review</button> : 'Awaiting review' }]} />
        : <EmptyState title="No applicability decisions" />}
      {c.accepted && !c.closed && <Act label="Record applicability" submit="Record decision" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/applicability`, { requirement_id: ap.requirement_id, provision_ids: [], criterion_type: ap.criterion_type, applicability: ap.applicability, effective_from: ap.effective_from || null,
        rationale: ap.rationale, evidence_refs: lines(ap.evidence_refs), unresolved_question: ap.applicability === 'UNRESOLVED' ? ap.unresolved_question : null }), 'Decision recorded.')}>
        <SelectField label="Requirement" value={ap.requirement_id} onChange={v => setAp(x => ({ ...x, requirement_id: v }))} options={reqOptions} required />
        <SelectField label="Criterion type" value={ap.criterion_type} onChange={v => setAp(x => ({ ...x, criterion_type: v }))} options={['STATUTORY', 'CONTRACTUAL', 'ADVISORY'].map(v => ({ value: v, label: words(v) }))} required />
        <SelectField label="Applicability" value={ap.applicability} onChange={v => setAp(x => ({ ...x, applicability: v }))} options={['APPLICABLE', 'NOT_APPLICABLE', 'UNRESOLVED'].map(v => ({ value: v, label: words(v) }))} required />
        <TextField label="Effective from (YYYY-MM-DD, optional)" value={ap.effective_from} onChange={v => setAp(x => ({ ...x, effective_from: v }))} />
        <TextAreaField label="Rationale" value={ap.rationale} onChange={v => setAp(x => ({ ...x, rationale: v }))} required />
        <TextAreaField label="Evidence relied on (one per line)" value={ap.evidence_refs} onChange={v => setAp(x => ({ ...x, evidence_refs: v }))} />
        {ap.applicability === 'UNRESOLVED' && <TextAreaField label="Open question" value={ap.unresolved_question} onChange={v => setAp(x => ({ ...x, unresolved_question: v }))} required />}</Act>}
    </Block>
    <Block title="Scope versions" note="The approved version becomes the engagement's scope for the channel, packages and report. A revision states why and what it changes.">
      {file.scope.length ? <DataTable caption="Scope versions" rowKey={v => v.id} rows={file.scope} columns={[{ key: 'v', header: 'Version', cell: v => v.version }, { key: 'r', header: 'Requirements', cell: v => v.requirement_ids.join(', ') },
        { key: 'p', header: 'Period', cell: v => `${v.period_from} → ${v.period_to}` }, { key: 'c', header: 'Change', cell: v => v.change ? <>+{v.change.added.join(', ') || 'none'} / −{v.change.removed.join(', ') || 'none'}<span className="cell-sub">{v.impact_assessment}</span></> : 'Initial' },
        { key: 'l', header: 'Limitations', cell: v => v.limitations.join('; ') || '—' },
        { key: 'a', header: 'Approval', cell: v => v.approved_by ? `Approved by ${nameOf(c, v.approved_by)}` : c.isReviewer && v.prepared_by !== c.session.actor_id && v.id === last?.id ? <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/scope/${v.id}/approve`, {}), 'Scope approved.')}>Approve scope</button> : 'Awaiting the engagement reviewer' }]} />
        : <EmptyState title="No scope version yet"><p>Decide applicability for each requirement first.</p></EmptyState>}
      {c.accepted && !c.closed && <Act label="Propose scope" submit={last ? 'Propose revision' : 'Propose scope'} busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/scope`, { entities: lines(s.entities), processes: lines(s.processes), systems: lines(s.systems), locations: lines(s.locations), period_from: s.period_from, period_to: s.period_to,
        requirement_ids: lines(s.requirement_ids), exclusions: lines(s.exclusions), limitations: lines(s.limitations), change_reason: s.change_reason.trim() || null, impact_assessment: s.impact_assessment.trim() || null }), 'Scope proposed.')}>
        <TextAreaField label="Entities (one per line)" value={s.entities} onChange={v => setS(x => ({ ...x, entities: v }))} required />
        <TextAreaField label="Processes (one per line)" value={s.processes} onChange={v => setS(x => ({ ...x, processes: v }))} required />
        <TextAreaField label="Systems in scope (one per line)" value={s.systems} onChange={v => setS(x => ({ ...x, systems: v }))} />
        <TextAreaField label="Locations (one per line)" value={s.locations} onChange={v => setS(x => ({ ...x, locations: v }))} />
        <TextField label="Scope period from" value={s.period_from} onChange={v => setS(x => ({ ...x, period_from: v }))} required />
        <TextField label="Scope period to" value={s.period_to} onChange={v => setS(x => ({ ...x, period_to: v }))} required />
        <TextAreaField label="Requirement IDs (one per line)" value={s.requirement_ids} onChange={v => setS(x => ({ ...x, requirement_ids: v }))} required />
        <TextAreaField label="Exclusions (one per line)" value={s.exclusions} onChange={v => setS(x => ({ ...x, exclusions: v }))} />
        <TextAreaField label="Scope limitations (one per line)" value={s.limitations} onChange={v => setS(x => ({ ...x, limitations: v }))} />
        {last && <><TextAreaField label="Reason for the change" value={s.change_reason} onChange={v => setS(x => ({ ...x, change_reason: v }))} required />
          <TextAreaField label="Impact assessment" value={s.impact_assessment} onChange={v => setS(x => ({ ...x, impact_assessment: v }))} required hint="Effect on planned procedures, evidence already obtained and the report." /></>}</Act>}
    </Block>
  </>;
}

// ---------------------------------------------------------------- Plan: risks and the work programme
function PlanTab({ c }: { c: Ctx }) {
  const { id, file, action: { busy, run } } = c;
  const [r, setR] = useState({ requirement_id: '', risk: '', likelihood: '3', impact: '3', affected_people: '', affected_scope: '', duration: '', uncertainty: '', control_reference: '', control_effectiveness: 'NOT_ASSESSED', rationale: '' });
  const [p, setP] = useState({ requirement_id: '', risk_assessment_id: '', objective: '', procedure_type: 'INSPECTION', test_nature: 'DESIGN', requires_record_level: false, owner_id: c.session.actor_id, planned_start: inDays(0), planned_end: inDays(30), evidence_expectation: '', completion_criteria: '', retest_of_finding_id: '' });
  const [np, setNp] = useState({ id: '', reason: '' });
  const reqs = c.scope.map(x => ({ value: x, label: x }));
  return <>
    <Block title="Risk assessment" note={`Ratings are computed from the approved methodology (${file.methodology?.version ?? 'not configured'}); the inherent rating comes from likelihood and impact, the residual from control effectiveness. Nobody types a rating.`}>
      {file.risks.length ? <DataTable caption="Risk assessments" rowKey={x => x.id} rows={file.risks} columns={[{ key: 'r', header: 'Requirement', cell: x => x.requirement_id }, { key: 'k', header: 'Risk', cell: x => <>{x.risk}<span className="cell-sub">{x.affected_people} · {x.duration} · uncertainty: {x.uncertainty}</span></> },
        { key: 'l', header: 'L × I', cell: x => `${x.likelihood} × ${x.impact}` }, { key: 'i', header: 'Inherent', cell: x => x.inherent_rating }, { key: 'c', header: 'Control', cell: x => words(x.control_effectiveness) }, { key: 's', header: 'Residual', cell: x => x.residual_rating },
        { key: 'v', header: 'Review', cell: x => x.reviewed_by ? `Reviewed by ${nameOf(c, x.reviewed_by)}` : c.isReviewer && x.assessed_by !== c.session.actor_id ? <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/risks/${x.id}/review`, {}), 'Risk reviewed.')}>Review</button> : 'Awaiting review' }]} />
        : <EmptyState title="No risks assessed"><p>Each scoped requirement needs a reviewed risk assessment before the programme can be approved.</p></EmptyState>}
      {c.accepted && !c.closed && <Act label="Assess risk" submit="Assess risk" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/risks`, { ...r, likelihood: Number(r.likelihood), impact: Number(r.impact), control_reference: r.control_reference.trim() || null }), 'Risk assessed.')}>
        <SelectField label="Requirement" value={r.requirement_id} onChange={v => setR(x => ({ ...x, requirement_id: v }))} options={reqs} required />
        <TextAreaField label="Risk" value={r.risk} onChange={v => setR(x => ({ ...x, risk: v }))} required />
        <SelectField label="Likelihood (1-5)" value={r.likelihood} onChange={v => setR(x => ({ ...x, likelihood: v }))} options={['1', '2', '3', '4', '5'].map(v => ({ value: v, label: v }))} required />
        <SelectField label="Impact (1-5)" value={r.impact} onChange={v => setR(x => ({ ...x, impact: v }))} options={['1', '2', '3', '4', '5'].map(v => ({ value: v, label: v }))} required />
        <TextField label="Affected people" value={r.affected_people} onChange={v => setR(x => ({ ...x, affected_people: v }))} required />
        <TextField label="Affected scope" value={r.affected_scope} onChange={v => setR(x => ({ ...x, affected_scope: v }))} required />
        <TextField label="Duration" value={r.duration} onChange={v => setR(x => ({ ...x, duration: v }))} required />
        <TextField label="Uncertainty" value={r.uncertainty} onChange={v => setR(x => ({ ...x, uncertainty: v }))} required />
        <TextField label="Control reference (optional)" value={r.control_reference} onChange={v => setR(x => ({ ...x, control_reference: v }))} />
        <SelectField label="Control effectiveness" value={r.control_effectiveness} onChange={v => setR(x => ({ ...x, control_effectiveness: v }))} options={['NOT_ASSESSED', 'EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE'].map(v => ({ value: v, label: words(v) }))} required />
        <TextAreaField label="Risk rationale" value={r.rationale} onChange={v => setR(x => ({ ...x, rationale: v }))} required /></Act>}
    </Block>
    <Block title="Work programme" note="Provision → requirement → risk → control → objective → procedure. The reviewer approves the programme's digest; any later change needs re-approval before a working paper is accepted.">
      <Facts items={[{ term: 'Programme state', value: file.plan.approved ? `Approved by ${nameOf(c, file.plan.approval?.approved_by)} on ${file.plan.approval?.approved_at.slice(0, 10)}` : file.plan.approval ? 'Changed since approval' : 'Not approved' },
        { term: 'Digest', value: <code>{file.plan.procedures_digest.slice(0, 16)}…</code> }]} />
      {file.plan.problems.length > 0 && <NoticeBox tone="warn" title="Approval blocked"><ul>{file.plan.problems.map(x => <li key={x}>{x}</li>)}</ul></NoticeBox>}
      {file.procedures.length ? <DataTable caption="Procedures" rowKey={x => x.id} rows={file.procedures} columns={[{ key: 'r', header: 'Requirement', cell: x => <>{x.requirement_id}{x.retest_of_finding_id && <span className="cell-sub">retest of finding {short(x.retest_of_finding_id)}</span>}</> },
        { key: 'o', header: 'Objective', cell: x => <>{x.objective}<span className="cell-sub">{words(x.procedure_type)} · {words(x.test_nature)}{x.requires_record_level ? ' · record-level' : ''}</span></> },
        { key: 'w', header: 'Owner', cell: x => nameOf(c, x.owner_id) }, { key: 'd', header: 'Planned', cell: x => `${x.planned_start} → ${x.planned_end}` },
        { key: 's', header: 'State', cell: x => <>{words(x.state)}{x.not_performed_reason && <span className="cell-sub">{x.not_performed_reason}</span>}</> }]} />
        : <EmptyState title="No procedures planned" />}
      {c.accepted && !c.closed && c.isReviewer && !file.plan.approved && <button type="button" disabled={busy || file.plan.problems.length > 0} onClick={() => void run(() => vendorCall(`/engagements/${id}/plan/approve`, {}), 'Work programme approved.')}>Approve work programme</button>}
      {c.accepted && !c.closed && <Act label="Add procedure" submit="Add procedure" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/procedures`, { requirement_id: p.requirement_id, provision_ids: [], risk_assessment_id: p.risk_assessment_id || null, control_reference: null, objective: p.objective,
        procedure_type: p.procedure_type, test_nature: p.test_nature, requires_record_level: p.requires_record_level, owner_id: p.owner_id, planned_start: p.planned_start, planned_end: p.planned_end, depends_on: [], evidence_expectation: p.evidence_expectation,
        completion_criteria: p.completion_criteria, retest_of_finding_id: p.retest_of_finding_id || null }), 'Procedure added.')}>
        <SelectField label="Procedure requirement" value={p.requirement_id} onChange={v => setP(x => ({ ...x, requirement_id: v }))} options={reqs} required />
        <SelectField label="Risk addressed (optional)" value={p.risk_assessment_id} onChange={v => setP(x => ({ ...x, risk_assessment_id: v }))} options={[{ value: '', label: 'None' }, ...file.risks.filter(x => x.requirement_id === p.requirement_id).map(x => ({ value: x.id, label: `${x.residual_rating} — ${x.risk.slice(0, 50)}` }))]} />
        <TextAreaField label="Objective" value={p.objective} onChange={v => setP(x => ({ ...x, objective: v }))} required />
        <SelectField label="Procedure type" value={p.procedure_type} onChange={v => setP(x => ({ ...x, procedure_type: v }))} options={['INSPECTION', 'OBSERVATION', 'WALKTHROUGH', 'INQUIRY', 'RECONCILIATION', 'REPERFORMANCE', 'ANALYTICAL'].map(v => ({ value: v, label: words(v) }))} required />
        <SelectField label="What it tests" value={p.test_nature} onChange={v => setP(x => ({ ...x, test_nature: v }))} options={[{ value: 'DESIGN', label: 'Design' }, { value: 'IMPLEMENTATION', label: 'Implementation' }, { value: 'OPERATING_EFFECTIVENESS', label: 'Operating effectiveness' }]} required />
        <label className="row"><input type="checkbox" checked={p.requires_record_level} onChange={ev => setP(x => ({ ...x, requires_record_level: ev.target.checked }))} /> Requires record-level testing (aggregates are not enough)</label>
        <SelectField label="Owner" value={p.owner_id} onChange={v => setP(x => ({ ...x, owner_id: v }))} options={c.e.team.map(t => ({ value: t.user_id, label: t.name }))} required />
        <TextField label="Planned start" value={p.planned_start} onChange={v => setP(x => ({ ...x, planned_start: v }))} required />
        <TextField label="Planned end" value={p.planned_end} onChange={v => setP(x => ({ ...x, planned_end: v }))} required />
        <TextAreaField label="Evidence expected" value={p.evidence_expectation} onChange={v => setP(x => ({ ...x, evidence_expectation: v }))} required />
        <TextAreaField label="Completion criteria" value={p.completion_criteria} onChange={v => setP(x => ({ ...x, completion_criteria: v }))} required />
        <SelectField label="Retest of finding (optional)" value={p.retest_of_finding_id} onChange={v => setP(x => ({ ...x, retest_of_finding_id: v }))} options={[{ value: '', label: 'Not a retest' }, ...file.findings.filter(f => f.status !== 'CLOSED').map(f => ({ value: f.id, label: `${f.requirement_id} — ${f.title}` }))]} /></Act>}
      {c.accepted && !c.closed && file.procedures.some(x => x.state === 'PLANNED' || x.state === 'IN_PROGRESS') && <Act label="Record procedure not performed" submit="Record not performed" busy={busy} onRun={() => void run(() => vendorCall(`/procedures/${np.id}/not-performed`, { reason: np.reason }), 'Recorded; the procedure stays on file.')}>
        <SelectField label="Procedure" value={np.id} onChange={v => setNp(x => ({ ...x, id: v }))} options={file.procedures.filter(x => x.state === 'PLANNED' || x.state === 'IN_PROGRESS').map(x => ({ value: x.id, label: `${x.requirement_id} — ${x.objective.slice(0, 60)}` }))} required />
        <TextAreaField label="Why it was not performed" value={np.reason} onChange={v => setNp(x => ({ ...x, reason: v }))} required /></Act>}
    </Block>
  </>;
}

// ---------------------------------------------------------------- Requests: channel requests and the practice request log
const REQUEST_EVENTS: Record<string, string[]> = { OPEN: ['CLARIFICATION_REQUESTED', 'RESPONSE_RECEIVED', 'UNABLE_TO_OBTAIN', 'ESCALATED', 'WITHDRAWN'], CLARIFICATION_REQUESTED: ['CLARIFICATION_GIVEN', 'RESPONSE_RECEIVED', 'UNABLE_TO_OBTAIN', 'ESCALATED', 'WITHDRAWN'],
  RESPONDED: ['ACCEPTED', 'RESUBMISSION_REQUESTED', 'UNABLE_TO_OBTAIN'], RESUBMISSION_REQUESTED: ['CLARIFICATION_REQUESTED', 'RESPONSE_RECEIVED', 'UNABLE_TO_OBTAIN', 'ESCALATED', 'WITHDRAWN'] };
function RequestsTab({ c }: { c: Ctx }) {
  const { id, file, action: { busy, run } } = c;
  const [q, setQ] = useState({ requirement_id: '', procedure_id: '', owner_role: '', description: '', due_date: inDays(14) }); const [ev, setEv] = useState({ request_id: '', event: '', note: '', evidence_id: '' });
  const target = file.requests.find(r => r.id === ev.request_id);
  return <>
    {c.accepted && <ChannelBlock id={id} scope={c.scope} closed={c.closed} />}
    <Block title="Request log" note="Every request has an owner, a due date and a lifecycle. Evidence the client could not provide becomes a stated limitation in the report.">
      {file.requests.length ? <DataTable caption="Requests to the client" rowKey={r => r.id} rows={file.requests} columns={[{ key: 'r', header: 'Requirement', cell: r => <>{r.requirement_id}{r.procedure_id && <span className="cell-sub">procedure {short(r.procedure_id)}</span>}</> },
        { key: 'd', header: 'Request', cell: r => <>{r.description}<span className="cell-sub">Owner: {r.owner_role ?? '—'}</span></> }, { key: 'u', header: 'Due', cell: r => <>{r.due_date}{r.overdue && <span className="cell-sub">overdue</span>}{r.escalated_at && <span className="cell-sub">escalated {r.escalated_at.slice(0, 10)}</span>}</> },
        { key: 's', header: 'Status', cell: r => <>{words(r.status)}{r.events.slice(-2).map(x => <span key={x.id} className="cell-sub">{words(x.event)}: {x.note}</span>)}</> }]} />
        : <EmptyState title="No requests yet" />}
      {c.accepted && !c.closed && <Act label="Add request" submit="Add request" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/requests`, { ...q, procedure_id: q.procedure_id || null }), 'Request recorded.')}>
        <SelectField label="Request for requirement" value={q.requirement_id} onChange={v => setQ(x => ({ ...x, requirement_id: v }))} options={c.scope.map(x => ({ value: x, label: x }))} required />
        <SelectField label="For procedure (optional)" value={q.procedure_id} onChange={v => setQ(x => ({ ...x, procedure_id: v }))} options={[{ value: '', label: 'None' }, ...file.procedures.filter(x => x.requirement_id === q.requirement_id).map(x => ({ value: x.id, label: x.objective.slice(0, 60) }))]} />
        <TextField label="Client owner (role)" value={q.owner_role} onChange={v => setQ(x => ({ ...x, owner_role: v }))} required />
        <TextAreaField label="What is requested" value={q.description} onChange={v => setQ(x => ({ ...x, description: v }))} required />
        <TextField label="Request due (YYYY-MM-DD)" value={q.due_date} onChange={v => setQ(x => ({ ...x, due_date: v }))} required /></Act>}
      {c.accepted && !c.closed && file.requests.some(r => REQUEST_EVENTS[r.status]) && <Act label="Record request event" submit="Record event" busy={busy} onRun={() => void run(() => vendorCall(`/requests/${ev.request_id}/events`, { event: ev.event, note: ev.note, evidence_id: ev.evidence_id || null }), 'Event recorded.')}>
        <SelectField label="Request" value={ev.request_id} onChange={v => setEv(x => ({ ...x, request_id: v, event: '' }))} options={file.requests.filter(r => REQUEST_EVENTS[r.status]).map(r => ({ value: r.id, label: `${r.requirement_id} — ${r.description.slice(0, 60)} (${words(r.status)})` }))} required />
        <SelectField label="Event" value={ev.event} onChange={v => setEv(x => ({ ...x, event: v }))} options={(REQUEST_EVENTS[target?.status ?? ''] ?? []).map(v => ({ value: v, label: words(v) }))} required />
        <TextAreaField label="Event note" value={ev.note} onChange={v => setEv(x => ({ ...x, note: v }))} required />
        {ev.event === 'RESPONSE_RECEIVED' && <SelectField label="Registered evidence received" value={ev.evidence_id} onChange={v => setEv(x => ({ ...x, evidence_id: v }))} options={file.evidence.map(x => ({ value: x.id, label: x.title }))} required hint="Register the response on the Evidence tab first." />}</Act>}
      {file.requests.length > 0 && <button type="button" disabled={busy} onClick={() => void run(async () => { const r = await vendorCall<{ file_name: string; signed: unknown }>(`/engagements/${id}/requests/export`, {}); saveFile(r.file_name, JSON.stringify(r.signed, null, 2), 'application/json'); }, 'Signed request list saved.')}>Export signed request list</button>}
    </Block>
  </>;
}

// ---------------------------------------------------------------- Evidence register
function EvidenceTab({ c }: { c: Ctx }) {
  const { id, file, inbox, action: { busy, run } } = c;
  const [open, setOpen] = useState<{ pkg: Pkg; items: Item[] } | null>(null);
  const [src, setSrc] = useState('AUDITOR_RECORD'); const [reg, setReg] = useState({ package_id: '', item_id: '', delivery_id: '', entry_key: '', evidence_type: 'OBSERVATION', title: '', description: '', collection_method: '', collected_at: new Date().toISOString().slice(0, 16), valid_until: '' });
  const [evl, setEvl] = useState({ evidence_id: '', procedure_id: '', relevance: 'RELEVANT', reliability: 'MEDIUM', sufficiency: 'SUFFICIENT', contradicts: false, rationale: '' });
  const [deliveries, setDeliveries] = useState<{ delivery_id: string; sequence: number; outcome: string; purged: boolean }[]>([]); const [entryKeys, setEntryKeys] = useState<{ key: string; label: string }[]>([]);
  useEffect(() => { vendorCall<{ deliveries: typeof deliveries }>(`/engagements/${id}/channel`).then(r => setDeliveries(r.deliveries.filter(d => d.outcome === 'ACCEPTED' && !d.purged))).catch(() => setDeliveries([])); }, [id]);
  useEffect(() => { if (!reg.delivery_id) { setEntryKeys([]); return; } vendorCall<{ document: { entries: { key: string; label: string }[] } | null }>(`/channel-deliveries/${reg.delivery_id}`).then(d => setEntryKeys(d.document?.entries ?? [])).catch(() => setEntryKeys([])); }, [reg.delivery_id]);
  const openPackage = (p: Pkg) => run(async () => { const d = await vendorCall<{ items: Item[] }>(`/packages/${p.id}`); setOpen({ pkg: p, items: d.items }); });
  const download = (p: Pkg, i: Item) => run(async () => { const x = await vendorCall<{ content_base64: string; media_type: string; file_name: string | null }>(`/packages/${p.id}/content?item=${i.item_id}`); saveFile(x.file_name ?? `${i.item_id}.${i.kind === 'INDICATOR' ? 'json' : 'txt'}`, fromBase64(x.content_base64), x.media_type); });
  const body = () => src === 'PACKAGE_ITEM' ? { source: src, package_id: reg.package_id, item_id: reg.item_id, evidence_type: null, valid_until: reg.valid_until ? new Date(`${reg.valid_until}Z`).toISOString() : null, description: reg.description.trim() || null }
    : src === 'CHANNEL_ENTRY' ? { source: src, delivery_id: reg.delivery_id, entry_key: reg.entry_key, valid_until: reg.valid_until ? new Date(`${reg.valid_until}Z`).toISOString() : null, description: reg.description.trim() || null }
    : { source: src, evidence_type: reg.evidence_type, title: reg.title, description: reg.description, collection_method: reg.collection_method, collected_at: new Date(`${reg.collected_at}Z`).toISOString(), period_from: null, period_to: null, valid_until: reg.valid_until ? new Date(`${reg.valid_until}Z`).toISOString() : null };
  return <>
    <Block title="Evidence register" note="Each piece of evidence keeps its source, provenance, collection method, hash, period, freshness and access count, and is evaluated for relevance, reliability and sufficiency against each procedure that uses it.">
      {file.evidence.length ? <DataTable caption="Registered evidence" rowKey={x => x.id} rows={file.evidence} columns={[{ key: 't', header: 'Evidence', cell: x => <>{x.title}<span className="cell-sub">{words(x.evidence_type)} · {x.provenance}</span></> },
        { key: 's', header: 'Source', cell: x => <>{words(x.source)}{x.sha256 && <span className="cell-sub"><code>{x.sha256.slice(0, 12)}…</code></span>}</> }, { key: 'c', header: 'Collected', cell: x => <>{x.collected_at.slice(0, 10)}{x.stale && <span className="cell-sub">stale</span>}</> },
        { key: 'e', header: 'Evaluations', cell: x => x.evaluations.length ? x.evaluations.map(v => <span key={v.id} className="cell-sub">{words(v.relevance)}, {words(v.reliability)} reliability, {words(v.sufficiency)}{v.contradicts ? ', CONTRADICTS' : ''}</span>) : 'Not evaluated' },
        { key: 'a', header: 'Accessed', cell: x => x.accessed }]} />
        : <EmptyState title="No evidence registered"><p>Register package items, signed channel entries or your own observations and re-performance.</p></EmptyState>}
      {c.accepted && !c.closed && <Act label="Register evidence" submit="Register evidence" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/evidence`, body()), 'Evidence registered.')}>
        <SelectField label="Evidence source" value={src} onChange={setSrc} options={[{ value: 'AUDITOR_RECORD', label: 'Auditor record (observation, re-performance, corroboration, interview)' }, { value: 'PACKAGE_ITEM', label: 'Item in a received package' }, { value: 'CHANNEL_ENTRY', label: 'Signed entry from the client installation' }]} required />
        {src === 'PACKAGE_ITEM' && <><SelectField label="Package" value={reg.package_id} onChange={v => { setReg(x => ({ ...x, package_id: v, item_id: '' })); const pk = inbox?.packages.find(p => p.id === v); if (pk) void openPackage(pk); }} options={(inbox?.packages ?? []).filter(p => p.state === 'ACCEPTED').map(p => ({ value: p.id, label: `${p.uploaded_at.slice(0, 10)} — ${p.client_package_id.slice(0, 8)}` }))} required />
          <SelectField label="Item" value={reg.item_id} onChange={v => setReg(x => ({ ...x, item_id: v }))} options={(open?.pkg.id === reg.package_id ? open.items : []).map(i => ({ value: i.item_id, label: `${i.requirement_id} — ${i.title} (${words(i.kind)})` }))} required /></>}
        {src === 'CHANNEL_ENTRY' && <><SelectField label="Delivery" value={reg.delivery_id} onChange={v => setReg(x => ({ ...x, delivery_id: v, entry_key: '' }))} options={deliveries.map(d => ({ value: d.delivery_id, label: `Delivery ${d.sequence}` }))} required />
          <SelectField label="Entry" value={reg.entry_key} onChange={v => setReg(x => ({ ...x, entry_key: v }))} options={entryKeys.map(k => ({ value: k.key, label: k.label }))} required /></>}
        {src === 'AUDITOR_RECORD' && <><SelectField label="Evidence type" value={reg.evidence_type} onChange={v => setReg(x => ({ ...x, evidence_type: v }))} options={['OBSERVATION', 'REPERFORMANCE', 'INDEPENDENT_CORROBORATION', 'MANAGEMENT_ASSERTION'].map(v => ({ value: v, label: v === 'MANAGEMENT_ASSERTION' ? 'management assertion / interview' : words(v) }))} required />
          <TextField label="Evidence title" value={reg.title} onChange={v => setReg(x => ({ ...x, title: v }))} required />
          <TextField label="Collection method" value={reg.collection_method} onChange={v => setReg(x => ({ ...x, collection_method: v }))} required />
          <TextField label="Collected at (YYYY-MM-DDTHH:MM, UTC)" value={reg.collected_at} onChange={v => setReg(x => ({ ...x, collected_at: v }))} required /></>}
        <TextAreaField label={src === 'AUDITOR_RECORD' ? 'What was observed or done' : 'Note (optional)'} value={reg.description} onChange={v => setReg(x => ({ ...x, description: v }))} required={src === 'AUDITOR_RECORD'} hint="Contact details and identifiers are removed before storage." />
        <TextField label="Valid until (optional, YYYY-MM-DDTHH:MM, UTC)" value={reg.valid_until} onChange={v => setReg(x => ({ ...x, valid_until: v }))} hint="After this, the evidence is stale and cannot support an effective conclusion." /></Act>}
      {c.accepted && !c.closed && file.evidence.length > 0 && <Act label="Evaluate evidence" submit="Record evaluation" busy={busy} onRun={() => void run(() => vendorCall(`/evidence/${evl.evidence_id}/evaluations`, { procedure_id: evl.procedure_id, relevance: evl.relevance, reliability: evl.reliability, sufficiency: evl.sufficiency, contradicts: evl.contradicts, rationale: evl.rationale }), 'Evaluation recorded.')}>
        <SelectField label="Evidence to evaluate" value={evl.evidence_id} onChange={v => setEvl(x => ({ ...x, evidence_id: v }))} options={file.evidence.map(x => ({ value: x.id, label: `${x.title} (${words(x.evidence_type)})` }))} required />
        <SelectField label="Against procedure" value={evl.procedure_id} onChange={v => setEvl(x => ({ ...x, procedure_id: v }))} options={file.procedures.map(x => ({ value: x.id, label: `${x.requirement_id} — ${x.objective.slice(0, 50)}` }))} required />
        <SelectField label="Relevance" value={evl.relevance} onChange={v => setEvl(x => ({ ...x, relevance: v }))} options={['RELEVANT', 'PARTIALLY_RELEVANT', 'NOT_RELEVANT'].map(v => ({ value: v, label: words(v) }))} required />
        <SelectField label="Reliability" value={evl.reliability} onChange={v => setEvl(x => ({ ...x, reliability: v }))} options={['HIGH', 'MEDIUM', 'LOW'].map(v => ({ value: v, label: words(v) }))} required hint="A management assertion is never high reliability." />
        <SelectField label="Sufficiency" value={evl.sufficiency} onChange={v => setEvl(x => ({ ...x, sufficiency: v }))} options={['SUFFICIENT', 'INSUFFICIENT'].map(v => ({ value: v, label: words(v) }))} required />
        <label className="row"><input type="checkbox" checked={evl.contradicts} onChange={ev => setEvl(x => ({ ...x, contradicts: ev.target.checked }))} /> Contradicts other evidence</label>
        <TextAreaField label="Evaluation rationale" value={evl.rationale} onChange={v => setEvl(x => ({ ...x, rationale: v }))} required /></Act>}
    </Block>
    <Block title="Evidence inbox" note="Each upload was verified before storage: manifest fingerprint, per-item SHA-256 and size, file type by content, expiry, engagement and scope, and a malware screen. Files are encrypted at rest; every view and download is logged.">
      {inbox?.packages.length ? <DataTable caption="Received packages" rowKey={p => p.id} rows={inbox.packages} columns={[{ key: 'u', header: 'Received', cell: p => p.uploaded_at.slice(0, 16).replace('T', ' ') },
        { key: 's', header: 'State', cell: p => p.state + (p.quarantine_reason ? ` (${words(p.quarantine_reason)})` : '') }, { key: 'n', header: 'Items', cell: p => p.item_count ?? '—' },
        { key: 'f', header: 'Manifest fingerprint', cell: p => <code>{p.manifest_fingerprint.slice(0, 16)}…</code> }, { key: 'o', header: '', cell: p => <button type="button" disabled={busy} onClick={() => void openPackage(p)}>Open</button> }]} />
        : <EmptyState title="No packages received" />}
      {(inbox?.refusals.length ?? 0) > 0 && <DataTable caption="Refused uploads (no content kept)" rowKey={r => r.id} rows={inbox!.refusals} columns={[{ key: 't', header: 'When', cell: r => r.refused_at.slice(0, 16).replace('T', ' ') }, { key: 'r', header: 'Reasons', cell: r => r.reasons.join(', ') }]} />}
      {open && <div className="panel"><h4>Package {open.pkg.client_package_id.slice(0, 8)} — {open.pkg.state}</h4>
        <DataTable caption="Items" rowKey={i => i.item_id} rows={open.items} columns={[{ key: 'r', header: 'Requirement', cell: i => i.requirement_id }, { key: 't', header: 'Item', cell: i => `${i.title} (${words(i.kind)})` },
          { key: 'p', header: 'Personal data', cell: i => i.contains_personal_data ? 'Yes (approved exception)' : 'No' },
          { key: 'd', header: '', cell: i => i.content_available ? <button type="button" disabled={busy} onClick={() => void download(open.pkg, i)}>Download</button> : 'Not available' }]} /></div>}
    </Block>
  </>;
}

// ---------------------------------------------------------------- Tests: populations, working papers, review notes
function TestsTab({ c }: { c: Ctx }) {
  const { file, action: { busy, run } } = c;
  const [pop, setPop] = useState({ procedure_id: '', source_kind: 'CLIENT_LISTING', delivery_id: '', entry_key: '', definition: '', source: '', population_size: '', completeness: 'UNVERIFIED', completeness_basis: '', completeness_evidence_id: '', sample_method: 'JUDGEMENTAL', sample_size: '', size_rationale: '', tested: '', passed: '', exceptions: '0', evidence_id: '' });
  const [wp, setWp] = useState({ procedure_id: '', performed: '', criteria: '', population_id: '', results: '', exceptions: '0', exception_details: '', conclusion: 'NOT_TESTED', evidence_ids: [] as string[] });
  const [note, setNote] = useState({ paper_id: '', note: '' }); const [resp, setResp] = useState({ note_id: '', response: '' });
  const [sampleEntries, setSampleEntries] = useState<{ delivery_id: string; key: string; label: string }[]>([]);
  useEffect(() => { void (async () => { try { const ch = await vendorCall<{ deliveries: { delivery_id: string; kind: string; outcome: string; purged: boolean }[] }>(`/engagements/${c.id}/channel`); const found: typeof sampleEntries = [];
    for (const d of ch.deliveries.filter(x => x.kind === 'RESPONSE' && x.outcome === 'ACCEPTED' && !x.purged)) { const doc = await vendorCall<{ document: { entries: { key: string; label: string; category: string }[] } | null }>(`/channel-deliveries/${d.delivery_id}`);
      for (const en of doc.document?.entries ?? []) if (en.category === 'SAMPLE_COUNTS') found.push({ delivery_id: d.delivery_id, key: en.key, label: en.label }); } setSampleEntries(found); } catch { setSampleEntries([]); } })(); }, [c.id]);
  const current = file.working_papers.filter(w => w.current);
  const openNotes = file.working_papers.flatMap(w => w.notes.filter(n => !n.resolved_at).map(n => ({ ...n, paper: w })));
  const procedureLabel = (pid: string) => { const p = file.procedures.find(x => x.id === pid); return p ? `${p.requirement_id} — ${p.objective.slice(0, 50)}` : short(pid); };
  const [sampleChoice, setSampleChoice] = useState('');
  const popBody = () => pop.source_kind === 'CHANNEL_SAMPLE' ? { source_kind: 'CHANNEL_SAMPLE', delivery_id: pop.delivery_id, entry_key: pop.entry_key, definition: pop.definition, completeness: pop.completeness, completeness_basis: pop.completeness_basis,
    completeness_evidence_id: pop.completeness_evidence_id || null, size_rationale: pop.size_rationale, exclusions: null }
    : { source_kind: pop.source_kind, definition: pop.definition, source: pop.source, period_from: null, period_to: null, population_size: pop.population_size ? Number(pop.population_size) : null, completeness: pop.completeness, completeness_basis: pop.completeness_basis,
      completeness_evidence_id: pop.completeness_evidence_id || null, sample_method: pop.sample_method, sample_size: Number(pop.sample_size), size_rationale: pop.size_rationale, seed: null, exclusions: null,
      tested: Number(pop.tested), passed: Number(pop.passed), exceptions: Number(pop.exceptions), evidence_id: pop.evidence_id || null };
  return <>
    <Block title="Populations and samples" note="A population states its definition, source and completeness. An auditor's seed proves which records were selected, never that the population was complete; COMPLETE needs named, evaluated completeness evidence.">
      {file.populations.length ? <DataTable caption="Populations" rowKey={x => x.id} rows={file.populations} columns={[{ key: 'p', header: 'Procedure', cell: x => procedureLabel(x.procedure_id) }, { key: 'd', header: 'Population', cell: x => <>{x.definition}<span className="cell-sub">{x.source} · size {x.population_size ?? 'unknown'}</span></> },
        { key: 'c', header: 'Completeness', cell: x => <>{words(x.completeness)}<span className="cell-sub">{x.completeness_basis}</span></> }, { key: 's', header: 'Sample', cell: x => <>{words(x.sample_method)} · {x.sample_size}<span className="cell-sub">{x.size_rationale}</span></> },
        { key: 'r', header: 'Tested / passed / exceptions', cell: x => `${x.tested} / ${x.passed} / ${x.exceptions}` }]} />
        : <EmptyState title="No populations recorded" />}
      {c.accepted && !c.closed && <Act label="Record population" submit="Record population" busy={busy} onRun={() => void run(() => vendorCall(`/procedures/${pop.procedure_id}/populations`, popBody()), 'Population recorded.')}>
        <SelectField label="Population procedure" value={pop.procedure_id} onChange={v => setPop(x => ({ ...x, procedure_id: v }))} options={file.procedures.map(x => ({ value: x.id, label: procedureLabel(x.id) }))} required />
        <SelectField label="Population source" value={pop.source_kind} onChange={v => setPop(x => ({ ...x, source_kind: v }))} options={[{ value: 'CLIENT_LISTING', label: 'Client listing' }, { value: 'CHANNEL_SAMPLE', label: 'Seeded sample answered by the client installation' }, { value: 'PACKAGE_ITEM', label: 'Package item' }, { value: 'AUDITOR_OBSERVED', label: 'Observed by the auditor' }]} required />
        {pop.source_kind === 'CHANNEL_SAMPLE' && <SelectField label="Sample answer" value={sampleChoice} onChange={v => { setSampleChoice(v); const s = sampleEntries.find(x => `${x.delivery_id}|${x.key}` === v); if (s) setPop(x => ({ ...x, delivery_id: s.delivery_id, entry_key: s.key })); }} options={sampleEntries.map(s => ({ value: `${s.delivery_id}|${s.key}`, label: s.label }))} required hint="Register the sample entry as evidence first; counts come from the signed entry, never typed." />}
        <TextAreaField label="Population definition" value={pop.definition} onChange={v => setPop(x => ({ ...x, definition: v }))} required />
        {pop.source_kind !== 'CHANNEL_SAMPLE' && <><TextField label="Population listing source" value={pop.source} onChange={v => setPop(x => ({ ...x, source: v }))} required />
          <TextField label="Population size (optional)" value={pop.population_size} onChange={v => setPop(x => ({ ...x, population_size: v }))} inputMode="numeric" />
          <SelectField label="Sample method" value={pop.sample_method} onChange={v => setPop(x => ({ ...x, sample_method: v }))} options={[{ value: 'JUDGEMENTAL', label: 'Judgemental' }, { value: 'ALL_ITEMS', label: 'All items' }]} required />
          <TextField label="Sample size" value={pop.sample_size} onChange={v => setPop(x => ({ ...x, sample_size: v }))} inputMode="numeric" required />
          <TextField label="Tested" value={pop.tested} onChange={v => setPop(x => ({ ...x, tested: v }))} inputMode="numeric" required />
          <TextField label="Passed" value={pop.passed} onChange={v => setPop(x => ({ ...x, passed: v }))} inputMode="numeric" required />
          <TextField label="Exceptions" value={pop.exceptions} onChange={v => setPop(x => ({ ...x, exceptions: v }))} inputMode="numeric" required />
          <SelectField label="Test evidence (optional)" value={pop.evidence_id} onChange={v => setPop(x => ({ ...x, evidence_id: v }))} options={[{ value: '', label: 'None' }, ...file.evidence.map(x => ({ value: x.id, label: x.title }))]} /></>}
        <SelectField label="Completeness" value={pop.completeness} onChange={v => setPop(x => ({ ...x, completeness: v }))} options={['UNVERIFIED', 'INCOMPLETE', 'COMPLETE'].map(v => ({ value: v, label: words(v) }))} required />
        <TextAreaField label="Completeness basis" value={pop.completeness_basis} onChange={v => setPop(x => ({ ...x, completeness_basis: v }))} required />
        {pop.completeness === 'COMPLETE' && <SelectField label="Completeness evidence" value={pop.completeness_evidence_id} onChange={v => setPop(x => ({ ...x, completeness_evidence_id: v }))} options={file.evidence.filter(x => x.evidence_type !== 'MANAGEMENT_ASSERTION').map(x => ({ value: x.id, label: x.title }))} required hint="Evaluated sufficient for this procedure; an assertion never proves completeness." />}
        <TextAreaField label="Sample size rationale" value={pop.size_rationale} onChange={v => setPop(x => ({ ...x, size_rationale: v }))} required /></Act>}
    </Block>
    <Block title="Working papers" note="Versioned and digested. EFFECTIVE is refused on assertions or interviews alone, on contradictory or stale evidence, on an unverified population, and on aggregates where record-level testing is required. Review is by another person with no open review notes.">
      {current.length ? <DataTable caption="Current working papers" rowKey={w => w.id} rows={current} columns={[{ key: 'p', header: 'Procedure', cell: w => procedureLabel(w.procedure_id) }, { key: 'v', header: 'Version', cell: w => w.version },
        { key: 'c', header: 'Conclusion', cell: w => <>{words(w.conclusion)}{w.exceptions > 0 && <span className="cell-sub">{w.exceptions} exception(s): {w.exception_details}</span>}</> },
        { key: 'r', header: 'Results', cell: w => <>{w.results}<span className="cell-sub">{w.evidence_ids.length} evidence item(s){w.redactions ? ` · ${w.redactions} redaction(s)` : ''}</span></> },
        { key: 'n', header: 'Notes', cell: w => w.notes.length ? `${w.notes.filter(n => !n.resolved_at).length} open of ${w.notes.length}` : '—' },
        { key: 'x', header: 'Review', cell: w => w.reviewed_by ? `Reviewed by ${nameOf(c, w.reviewed_by)}` : c.isReviewer && w.prepared_by !== c.session.actor_id ? <button type="button" disabled={busy || w.notes.some(n => !n.resolved_at)} onClick={() => void run(() => vendorCall(`/working-papers/${w.id}/review`, {}), 'Working paper reviewed.')}>Review</button> : `Prepared by ${nameOf(c, w.prepared_by)}; awaiting review` }]} />
        : <EmptyState title="No working papers"><p>The work programme must be approved before a working paper is accepted.</p></EmptyState>}
      {c.accepted && !c.closed && <Act label="Record working paper" submit="Record working paper" busy={busy} onRun={() => void run(() => vendorCall(`/procedures/${wp.procedure_id}/working-papers`, { performed: wp.performed, criteria: wp.criteria, population_id: wp.population_id || null, results: wp.results, exceptions: Number(wp.exceptions),
        exception_details: wp.exception_details.trim() || null, conclusion: wp.conclusion, evidence_ids: wp.evidence_ids }), 'Working paper recorded.')}>
        <SelectField label="Working paper procedure" value={wp.procedure_id} onChange={v => setWp(x => ({ ...x, procedure_id: v }))} options={file.procedures.filter(x => x.state !== 'NOT_PERFORMED').map(x => ({ value: x.id, label: procedureLabel(x.id) }))} required />
        <TextAreaField label="What was performed" value={wp.performed} onChange={v => setWp(x => ({ ...x, performed: v }))} required />
        <TextField label="Criteria applied" value={wp.criteria} onChange={v => setWp(x => ({ ...x, criteria: v }))} required />
        <SelectField label="Population tested (optional)" value={wp.population_id} onChange={v => setWp(x => ({ ...x, population_id: v }))} options={[{ value: '', label: 'None' }, ...file.populations.filter(x => x.procedure_id === wp.procedure_id).map(x => ({ value: x.id, label: `${x.definition.slice(0, 50)} (${words(x.completeness)})` }))]} />
        <TextAreaField label="Results" value={wp.results} onChange={v => setWp(x => ({ ...x, results: v }))} required />
        <TextField label="Exceptions found" value={wp.exceptions} onChange={v => setWp(x => ({ ...x, exceptions: v }))} inputMode="numeric" required />
        <TextAreaField label="Exception details" value={wp.exception_details} onChange={v => setWp(x => ({ ...x, exception_details: v }))} />
        <SelectField label="Conclusion" value={wp.conclusion} onChange={v => setWp(x => ({ ...x, conclusion: v }))} options={['EFFECTIVE', 'EXCEPTIONS_NOTED', 'INEFFECTIVE', 'NOT_TESTED', 'UNABLE_TO_TEST'].map(v => ({ value: v, label: words(v) }))} required />
        <fieldset><legend>Evidence cited</legend>{file.evidence.length ? file.evidence.map(x => <label key={x.id} className="row"><input type="checkbox" checked={wp.evidence_ids.includes(x.id)} onChange={() => setWp(w => ({ ...w, evidence_ids: w.evidence_ids.includes(x.id) ? w.evidence_ids.filter(y => y !== x.id) : [...w.evidence_ids, x.id] }))} /> {x.title} ({words(x.evidence_type)}{x.stale ? ', stale' : ''})</label>) : <p className="muted">No evidence registered.</p>}</fieldset></Act>}
      {c.isReviewer && current.some(w => !w.reviewed_by && w.prepared_by !== c.session.actor_id) && <Act label="Raise review note" submit="Raise note" busy={busy} onRun={() => void run(() => vendorCall(`/working-papers/${note.paper_id}/notes`, { note: note.note }), 'Review note raised.')}>
        <SelectField label="Working paper" value={note.paper_id} onChange={v => setNote(x => ({ ...x, paper_id: v }))} options={current.filter(w => !w.reviewed_by && w.prepared_by !== c.session.actor_id).map(w => ({ value: w.id, label: `${procedureLabel(w.procedure_id)} v${w.version}` }))} required />
        <TextAreaField label="Review note" value={note.note} onChange={v => setNote(x => ({ ...x, note: v }))} required /></Act>}
      {openNotes.length > 0 && <DataTable caption="Open review notes" rowKey={n => n.id} rows={openNotes} columns={[{ key: 'p', header: 'Working paper', cell: n => `${procedureLabel(n.paper.procedure_id)} v${n.paper.version}` }, { key: 'n', header: 'Note', cell: n => <>{n.note}<span className="cell-sub">by {nameOf(c, n.raised_by)}</span></> },
        { key: 'r', header: 'Response', cell: n => n.response ?? 'Awaiting the preparer' },
        { key: 'x', header: '', cell: n => n.raised_by === c.session.actor_id && n.response ? <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/review-notes/${n.id}/resolve`, {}), 'Note resolved.')}>Resolve</button> : null }]} />}
      {openNotes.some(n => n.paper.prepared_by === c.session.actor_id && !n.response) && <Act label="Answer review note" submit="Answer note" busy={busy} onRun={() => void run(() => vendorCall(`/review-notes/${resp.note_id}/respond`, { response: resp.response }), 'Answer recorded.')}>
        <SelectField label="Note to answer" value={resp.note_id} onChange={v => setResp(x => ({ ...x, note_id: v }))} options={openNotes.filter(n => n.paper.prepared_by === c.session.actor_id && !n.response).map(n => ({ value: n.id, label: n.note.slice(0, 70) }))} required />
        <TextAreaField label="Answer" value={resp.response} onChange={v => setResp(x => ({ ...x, response: v }))} required /></Act>}
    </Block>
  </>;
}

// ---------------------------------------------------------------- Findings and management responses
function FindingsTab({ c }: { c: Ctx }) {
  const { id, file, action: { busy, run } } = c;
  const [f, setF] = useState({ requirement_id: '', provision_ids: '', criterion_type: 'STATUTORY', severity: 'MEDIUM', title: '', observation: '', affected_scope: '', cause: '', consequence: '', severity_rationale: '', recommendation: '', orvia_guidance: '', due_date: inDays(60), working_paper_ids: [] as string[], evidence_ids: [] as string[] });
  const [m, setM] = useState({ finding_id: '', factual_accuracy: 'AGREED', agreement: 'AGREE', response: '', action_plan: '', owner_role: '', due_date: '', dependencies: '', remediation_status: 'IN_PROGRESS', reference: '' });
  const adverse = file.working_papers.filter(w => w.current && ['EXCEPTIONS_NOTED', 'INEFFECTIVE', 'UNABLE_TO_TEST'].includes(w.conclusion));
  return <>
    <Block title="Findings" note="Each finding states the criteria, scope, condition, evidence, cause, consequence and severity rationale, and rests on an adverse working paper. Recommendations are advice for people; commands and code are refused.">
      {file.findings.length ? <DataTable caption="Findings" rowKey={x => x.id} rows={file.findings} columns={[{ key: 's', header: 'Severity', cell: x => <>{x.severity}<span className="cell-sub">{words(x.criterion_type)}</span></> },
        { key: 't', header: 'Finding', cell: x => <><strong>{x.title}</strong><span className="cell-sub">{x.requirement_id} ({x.provision_ids.join(', ') || 'no provision'}) · {x.affected_scope}</span><span className="cell-sub">Condition: {x.observation}</span>
          {x.cause && <span className="cell-sub">Cause: {x.cause}</span>}{x.consequence && <span className="cell-sub">Consequence: {x.consequence}</span>}{x.severity_rationale && <span className="cell-sub">Severity: {x.severity_rationale}</span>}<span className="cell-sub">Recommendation: {x.recommendation}</span></> },
        { key: 'r', header: 'Management response', cell: x => x.responses.length ? <>{words(x.responses.at(-1)!.agreement)} (facts {words(x.responses.at(-1)!.factual_accuracy)})<span className="cell-sub">{x.responses.at(-1)!.response}</span><span className="cell-sub">{words(x.responses.at(-1)!.remediation_status)} · {words(x.responses.at(-1)!.source)}</span></> : 'None yet' },
        { key: 'u', header: 'Status', cell: x => <>{words(x.status)}{x.closure_type && <span className="cell-sub">{words(x.closure_type)}</span>}<span className="cell-sub">due {x.due_date}</span></> }]} />
        : <EmptyState title="No findings raised" />}
      {c.accepted && !c.closed && <Act label="Raise finding" submit="Raise finding" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/findings`, { ...f, provision_ids: f.provision_ids.split(/[\s,]+/).filter(Boolean), orvia_guidance: f.orvia_guidance.trim() || null }), 'Finding raised.')}>
        <SelectField label="Finding requirement" value={f.requirement_id} onChange={v => setF(x => ({ ...x, requirement_id: v }))} options={c.scope.map(x => ({ value: x, label: x }))} required />
        <TextField label="Provisions cited" value={f.provision_ids} onChange={v => setF(x => ({ ...x, provision_ids: v }))} hint="Provision IDs of this requirement, e.g. ACT-S5(1). Required for a statutory finding." />
        <SelectField label="Criterion type" value={f.criterion_type} onChange={v => setF(x => ({ ...x, criterion_type: v }))} options={['STATUTORY', 'CONTRACTUAL', 'ADVISORY'].map(v => ({ value: v, label: words(v) }))} required />
        <SelectField label="Severity" value={f.severity} onChange={v => setF(x => ({ ...x, severity: v }))} options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(v => ({ value: v, label: v }))} required />
        <TextField label="Finding title" value={f.title} onChange={v => setF(x => ({ ...x, title: v }))} required />
        <TextAreaField label="Condition (what was found)" value={f.observation} onChange={v => setF(x => ({ ...x, observation: v }))} required />
        <TextField label="Affected scope" value={f.affected_scope} onChange={v => setF(x => ({ ...x, affected_scope: v }))} required />
        <TextAreaField label="Cause" value={f.cause} onChange={v => setF(x => ({ ...x, cause: v }))} required />
        <TextAreaField label="Consequence" value={f.consequence} onChange={v => setF(x => ({ ...x, consequence: v }))} required />
        <TextAreaField label="Severity rationale" value={f.severity_rationale} onChange={v => setF(x => ({ ...x, severity_rationale: v }))} required hint="Under the engagement's approved methodology." />
        <TextAreaField label="Recommendation" value={f.recommendation} onChange={v => setF(x => ({ ...x, recommendation: v }))} required />
        <TextAreaField label="How ORVIA features could help (optional)" value={f.orvia_guidance} onChange={v => setF(x => ({ ...x, orvia_guidance: v }))} hint="Kept separate from the recommendation; the finding never depends on buying ORVIA." />
        <TextField label="Finding due (YYYY-MM-DD)" value={f.due_date} onChange={v => setF(x => ({ ...x, due_date: v }))} required />
        <fieldset><legend>Adverse working papers</legend>{adverse.length ? adverse.map(w => <label key={w.id} className="row"><input type="checkbox" checked={f.working_paper_ids.includes(w.id)} onChange={() => setF(x => ({ ...x, working_paper_ids: x.working_paper_ids.includes(w.id) ? x.working_paper_ids.filter(y => y !== w.id) : [...x.working_paper_ids, w.id] }))} /> {file.procedures.find(p => p.id === w.procedure_id)?.requirement_id} — {words(w.conclusion)} (v{w.version})</label>) : <p className="muted">No adverse working paper yet; a finding needs one.</p>}</fieldset>
        <fieldset><legend>Evidence cited</legend>{file.evidence.map(x => <label key={x.id} className="row"><input type="checkbox" checked={f.evidence_ids.includes(x.id)} onChange={() => setF(y => ({ ...y, evidence_ids: y.evidence_ids.includes(x.id) ? y.evidence_ids.filter(z => z !== x.id) : [...y.evidence_ids, x.id] }))} /> {x.title}</label>)}</fieldset></Act>}
      {file.findings.length > 0 && <button type="button" disabled={busy} onClick={() => void run(async () => { const r = await vendorCall<{ file_name: string; signed: unknown }>(`/engagements/${id}/findings/export`, {}); saveFile(r.file_name, JSON.stringify(r.signed, null, 2), 'application/json'); }, 'Signed findings file saved.')}>Export signed findings file</button>}
    </Block>
    <Block title="Management responses" note="Responses sent by the client's installation arrive signed and appear here. A response received another way is recorded with its reference. Disagreement is kept, never overwritten.">
      {c.accepted && !c.closed && file.findings.some(x => x.status !== 'CLOSED') ? <Act label="Record management response" submit="Record response" busy={busy} onRun={() => void run(() => vendorCall(`/findings/${m.finding_id}/responses`, { factual_accuracy: m.factual_accuracy, agreement: m.agreement, response: m.response, action_plan: m.action_plan.trim() || null,
        owner_role: m.owner_role.trim() || null, due_date: m.due_date || null, dependencies: m.dependencies.trim() || null, remediation_status: m.remediation_status, reference: m.reference }), 'Response recorded.')}>
        <SelectField label="Finding responded to" value={m.finding_id} onChange={v => setM(x => ({ ...x, finding_id: v }))} options={file.findings.filter(x => x.status !== 'CLOSED').map(x => ({ value: x.id, label: `${x.requirement_id} — ${x.title}` }))} required />
        <SelectField label="Factual accuracy" value={m.factual_accuracy} onChange={v => setM(x => ({ ...x, factual_accuracy: v }))} options={[{ value: 'AGREED', label: 'Facts agreed' }, { value: 'DISPUTED', label: 'Facts disputed' }]} required />
        <SelectField label="Agreement" value={m.agreement} onChange={v => setM(x => ({ ...x, agreement: v }))} options={['AGREE', 'PARTIALLY_AGREE', 'DISAGREE'].map(v => ({ value: v, label: words(v) }))} required />
        <TextAreaField label="Response" value={m.response} onChange={v => setM(x => ({ ...x, response: v }))} required />
        <TextAreaField label="Action plan" value={m.action_plan} onChange={v => setM(x => ({ ...x, action_plan: v }))} />
        <TextField label="Owner (role)" value={m.owner_role} onChange={v => setM(x => ({ ...x, owner_role: v }))} />
        <TextField label="Target date (YYYY-MM-DD)" value={m.due_date} onChange={v => setM(x => ({ ...x, due_date: v }))} />
        <SelectField label="Remediation status" value={m.remediation_status} onChange={v => setM(x => ({ ...x, remediation_status: v }))} options={['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED_CLAIMED', 'RISK_ACCEPTANCE_PROPOSED'].map(v => ({ value: v, label: words(v) }))} required />
        <TextField label="Source reference" value={m.reference} onChange={v => setM(x => ({ ...x, reference: v }))} required hint="Letter, e-mail or minute the response came from." /></Act>
        : <EmptyState title="No open finding to respond to" />}
    </Block>
  </>;
}

// ---------------------------------------------------------------- Report: conclusions, drafting, approval bound to a snapshot
function ReportTab({ c }: { c: Ctx }) {
  const { id, file, reports, action: { busy, run } } = c;
  const [res, setRes] = useState({ requirement_id: '', result: 'NOT_TESTED', rationale: '' });
  const signed = reports.filter(r => r.state === 'SIGNED');
  const [d, setD] = useState({ opinion_as_of: new Date().toISOString().slice(0, 10), executive_summary: '', method: '', opinion: '', limitations: '', supersedes_report_id: '', correction_reason: '' });
  return <>
    <Block title="Conclusions" note="A conclusion for every scoped requirement. Adverse conclusions are always allowed; MEETS needs a reviewed effective working paper and no open statutory finding.">
      <DataTable caption="Conclusions and traceability" rowKey={x => x.requirement_id} rows={file.traceability} columns={[{ key: 'r', header: 'Requirement', cell: x => <>{x.requirement_id}<span className="cell-sub">{x.provision_ids.join(', ')}</span></> },
        { key: 't', header: 'Trace', cell: x => `${x.risks.length} risk · ${x.procedures.length} procedure · ${x.evidence.length} evidence · ${x.working_papers.length} paper · ${x.findings.length} finding · ${x.retests.length} retest` },
        { key: 's', header: 'Supportable', cell: x => file.conclusions.find(y => y.requirement_id === x.requirement_id)?.supported_favourable ? 'Favourable conclusion supported' : 'Only adverse or not tested' },
        { key: 'c', header: 'Conclusion', cell: x => x.conclusion }]} />
      {c.accepted && !c.closed && <Act label="Record requirement result" submit="Record result" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/results`, res), 'Conclusion recorded.')}>
        <SelectField label="Requirement" value={res.requirement_id} onChange={v => setRes(x => ({ ...x, requirement_id: v }))} options={c.scope.map(x => ({ value: x, label: x }))} required />
        <SelectField label="Result" value={res.result} onChange={v => setRes(x => ({ ...x, result: v }))} options={['MEETS', 'PARTIALLY_MEETS', 'DOES_NOT_MEET', 'NOT_APPLICABLE', 'NOT_TESTED'].map(v => ({ value: v, label: words(v) }))} required />
        <TextAreaField label="Rationale" value={res.rationale} onChange={v => setRes(x => ({ ...x, rationale: v }))} required /></Act>}
    </Block>
    <Block title="Report" note="The lead drafts; the engagement reviewer, a different person, approves, which binds the report to a snapshot of everything it rests on. Signing refuses if anything changed since. Corrections supersede a signed report and say why.">
      {reports.length ? <DataTable caption="Report versions" rowKey={r => r.id} rows={reports} columns={[{ key: 'v', header: 'Version', cell: r => r.version }, { key: 's', header: 'State', cell: r => words(r.state) }, { key: 'a', header: 'Opinion as of', cell: r => r.opinion_as_of },
        { key: 'x', header: 'Actions', cell: r => <span className="row">
          {r.state === 'DRAFT' && c.isReviewer && r.drafted_by !== c.session.actor_id && <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/reports/${r.id}/approve`, {}), 'Report approved and bound to its snapshot.')}>Approve as reviewer</button>}
          {r.state === 'APPROVED' && <button type="button" disabled={busy} onClick={() => void run(async () => { const s = await vendorCall<{ file_name: string; signed: unknown }>(`/reports/${r.id}/sign`, {}); saveFile(s.file_name, JSON.stringify(s.signed, null, 2), 'application/json'); }, 'Report signed.')}>Sign and download JSON</button>}
          {(r.state === 'SIGNED' || (r.state === 'SUPERSEDED' && r.pdf_sha256)) && <button type="button" disabled={busy} onClick={() => void run(async () => { const p = await vendorCall<{ file_name: string; pdf_base64: string }>(`/reports/${r.id}/pdf`); saveFile(p.file_name, fromBase64(p.pdf_base64), 'application/pdf'); })}>Download PDF</button>}</span> }]} />
        : <EmptyState title="No report drafted" />}
      {c.isLead && c.accepted && !c.closed && <Act label="Draft report" submit="Save draft report" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/reports`, { opinion_as_of: d.opinion_as_of, executive_summary: d.executive_summary, method: d.method, opinion: d.opinion, limitations: lines(d.limitations),
        supersedes_report_id: d.supersedes_report_id || null, correction_reason: d.supersedes_report_id ? d.correction_reason : null }), 'Draft saved.')}>
        <TextField label="Opinion as of (YYYY-MM-DD)" value={d.opinion_as_of} onChange={v => setD(x => ({ ...x, opinion_as_of: v }))} required />
        <TextAreaField label="Executive summary" value={d.executive_summary} onChange={v => setD(x => ({ ...x, executive_summary: v }))} required />
        <TextAreaField label="Method" value={d.method} onChange={v => setD(x => ({ ...x, method: v }))} required />
        <TextAreaField label="Opinion" value={d.opinion} onChange={v => setD(x => ({ ...x, opinion: v }))} required />
        <TextAreaField label="Limitations (one per line)" value={d.limitations} onChange={v => setD(x => ({ ...x, limitations: v }))} required hint="Unobtainable evidence, unverified populations, unresolved applicability and unanswered channel requests are added automatically." />
        {signed.length > 0 && <><SelectField label="Corrects signed report (optional)" value={d.supersedes_report_id} onChange={v => setD(x => ({ ...x, supersedes_report_id: v }))} options={[{ value: '', label: 'Not a correction' }, ...signed.map(r => ({ value: r.id, label: `Version ${r.version} (${r.opinion_as_of})` }))]} />
          {d.supersedes_report_id && <TextAreaField label="Correction reason" value={d.correction_reason} onChange={v => setD(x => ({ ...x, correction_reason: v }))} required />}</>}</Act>}
    </Block>
  </>;
}

// ---------------------------------------------------------------- Follow-up: retests, risk acceptance, closure, holds
function FollowUpTab({ c }: { c: Ctx }) {
  const { id, file, action: { busy, run } } = c;
  const [rt, setRt] = useState({ finding_id: '', working_paper_id: '' }); const [ra, setRa] = useState({ finding_id: '', management_response_id: '', accepting_authority: '', justification: '', expires_on: inDays(180), review_on: inDays(90) });
  const [cl, setCl] = useState({ finding_id: '', closure_type: 'VERIFIED_REMEDIATION', reason: '' }); const [hold, setHold] = useState({ reason: '', expires_on: '' }); const [rel, setRel] = useState({ id: '', reason: '' });
  const retestPapers = file.working_papers.filter(w => w.current && w.reviewed_by && file.procedures.find(p => p.id === w.procedure_id)?.retest_of_finding_id === rt.finding_id);
  const open = file.findings.filter(f => f.status !== 'CLOSED');
  const proposals = file.findings.find(f => f.id === ra.finding_id)?.responses.filter(r => r.remediation_status === 'RISK_ACCEPTANCE_PROPOSED') ?? [];
  return <>
    <Block title="Remediation follow-up" note="RETEST_PASSED only through a reviewed retest working paper on evidence collected after the finding, recorded by its reviewer. Verified remediation, accepted risk, engagement withdrawal and administrative closure are kept distinct.">
      {file.findings.length ? <DataTable caption="Follow-up by finding" rowKey={f => f.id} rows={file.findings} columns={[{ key: 't', header: 'Finding', cell: f => <>{f.title}<span className="cell-sub">{f.requirement_id} · {f.severity}</span></> },
        { key: 'r', header: 'Retests', cell: f => f.retests.length ? f.retests.map(r => <span key={r.id} className="cell-sub">{words(r.result)} on {r.recorded_at.slice(0, 10)}; performed by {nameOf(c, r.performed_by)}, reviewed by {nameOf(c, r.reviewed_by)}</span>) : 'None' },
        { key: 'a', header: 'Risk acceptance', cell: f => f.risk_acceptances.length ? f.risk_acceptances.map(a => <span key={a.id} className="cell-sub">{a.accepting_authority} until {a.expires_on}{a.expired ? ' (expired)' : ''}</span>) : '—' },
        { key: 's', header: 'Status', cell: f => <>{words(f.status)}{f.closure_type && <span className="cell-sub">{words(f.closure_type)}: {f.closure_reason}</span>}</> }]} />
        : <EmptyState title="No findings to follow up" />}
      {c.isReviewer && c.accepted && !c.closed && open.length > 0 && <>
        <Act label="Record retest" submit="Record retest" busy={busy} onRun={() => void run(() => vendorCall(`/findings/${rt.finding_id}/retests`, { working_paper_id: rt.working_paper_id }), 'Retest recorded.')}>
          <SelectField label="Finding retested" value={rt.finding_id} onChange={v => setRt({ finding_id: v, working_paper_id: '' })} options={open.map(f => ({ value: f.id, label: `${f.requirement_id} — ${f.title} (${words(f.status)})` }))} required />
          <SelectField label="Reviewed retest working paper" value={rt.working_paper_id} onChange={v => setRt(x => ({ ...x, working_paper_id: v }))} options={retestPapers.map(w => ({ value: w.id, label: `v${w.version} — ${words(w.conclusion)}` }))} required hint="Plan a retest procedure for the finding, then record and review its working paper." /></Act>
        <Act label="Record risk acceptance" submit="Record risk acceptance" busy={busy} onRun={() => void run(() => vendorCall(`/findings/${ra.finding_id}/risk-acceptances`, { management_response_id: ra.management_response_id, accepting_authority: ra.accepting_authority, justification: ra.justification, expires_on: ra.expires_on, review_on: ra.review_on }), 'Risk acceptance recorded; the finding stays reported.')}>
          <SelectField label="Finding with accepted risk" value={ra.finding_id} onChange={v => setRa(x => ({ ...x, finding_id: v, management_response_id: '' }))} options={open.map(f => ({ value: f.id, label: `${f.requirement_id} — ${f.title}` }))} required />
          <SelectField label="Client proposal" value={ra.management_response_id} onChange={v => setRa(x => ({ ...x, management_response_id: v }))} options={proposals.map(r => ({ value: r.id, label: `${r.received_at.slice(0, 10)} — ${r.response.slice(0, 50)}` }))} required hint="Only a management response proposing risk acceptance qualifies." />
          <TextField label="Accepting authority (client)" value={ra.accepting_authority} onChange={v => setRa(x => ({ ...x, accepting_authority: v }))} required />
          <TextAreaField label="Justification" value={ra.justification} onChange={v => setRa(x => ({ ...x, justification: v }))} required />
          <TextField label="Expires on (at most one year)" value={ra.expires_on} onChange={v => setRa(x => ({ ...x, expires_on: v }))} required />
          <TextField label="Review on" value={ra.review_on} onChange={v => setRa(x => ({ ...x, review_on: v }))} required /></Act>
      </>}
      {open.length > 0 && (c.isReviewer || c.closed) && <Act label="Close finding" submit="Close finding" busy={busy} onRun={() => void run(() => vendorCall(`/findings/${cl.finding_id}/close`, { closure_type: cl.closure_type, reason: cl.reason }), 'Finding closed.')}>
        <SelectField label="Finding to close" value={cl.finding_id} onChange={v => setCl(x => ({ ...x, finding_id: v }))} options={open.map(f => ({ value: f.id, label: `${f.requirement_id} — ${f.title} (${words(f.status)})` }))} required />
        <SelectField label="Closure type" value={cl.closure_type} onChange={v => setCl(x => ({ ...x, closure_type: v }))} options={[{ value: 'VERIFIED_REMEDIATION', label: 'Verified remediation (needs a passed retest)' }, { value: 'RISK_ACCEPTED', label: 'Risk accepted (needs an unexpired acceptance)' },
          { value: 'ENGAGEMENT_WITHDRAWN', label: 'Engagement withdrawn (engagement closed)' }, { value: 'ADMINISTRATIVE', label: 'Administrative (e.g. duplicate)' }]} required />
        <TextAreaField label="Closure reason" value={cl.reason} onChange={v => setCl(x => ({ ...x, reason: v }))} required /></Act>}
    </Block>
    <Block title="Retention and legal holds" note={`Evidence is purged ${c.e.retention_days} days after closure unless a legal hold authorised by the super administrator is active. Reports, findings and the purge record are kept.`}>
      {file.holds.length ? <DataTable caption="Legal holds" rowKey={h => h.id} rows={file.holds} columns={[{ key: 'r', header: 'Reason', cell: h => h.reason }, { key: 'a', header: 'Authorised', cell: h => `${h.authorised_at.slice(0, 10)}${h.expires_on ? `, until ${h.expires_on}` : ''}` },
        { key: 's', header: 'State', cell: h => h.active ? 'Active' : `Released${h.release_reason ? `: ${h.release_reason}` : ''}` }]} /> : <EmptyState title="No legal hold" />}
      {can(c.session, 'practice.activate') && <Act label="Authorise legal hold" submit="Authorise hold" busy={busy} onRun={() => void run(() => vendorCall(`/engagements/${id}/holds`, { reason: hold.reason, expires_on: hold.expires_on || null }), 'Hold authorised.')}>
        <TextAreaField label="Hold reason" value={hold.reason} onChange={v => setHold(x => ({ ...x, reason: v }))} required />
        <TextField label="Hold until (optional)" value={hold.expires_on} onChange={v => setHold(x => ({ ...x, expires_on: v }))} /></Act>}
      {can(c.session, 'practice.activate') && file.holds.some(h => h.active) && <Act label="Release legal hold" submit="Release hold" busy={busy} onRun={() => void run(() => vendorCall(`/holds/${rel.id}/release`, { reason: rel.reason }), 'Hold released.')}>
        <SelectField label="Active hold" value={rel.id} onChange={v => setRel(x => ({ ...x, id: v }))} options={file.holds.filter(h => h.active).map(h => ({ value: h.id, label: h.reason.slice(0, 60) }))} required />
        <TextAreaField label="Release reason" value={rel.reason} onChange={v => setRel(x => ({ ...x, reason: v }))} required /></Act>}
    </Block>
  </>;
}

// ---------------------------------------------------------------- Client mandate and channel (revision 1.6)
type Channel = { available: boolean; health: { installation_key_id: string | null; pinned_at: string | null; last_check_in_at: string | null; check_ins: number; chain_state: string; chain_problem: string | null; next_sequence: number } | null;
  mandate: { mandate_id: string; kind: string; state: string; valid_from: string; valid_to: string; open: boolean; received_at: string; document: { categories: string[]; scope_requirement_ids: string[]; schedule: string; organisation_name: string; approval: { preparer_role: string; approver_role: string; approved_at: string } } } | null;
  requests: { id: string; kind: string; requirement_id: string | null; categories: string[]; population: string | null; sample_size: number | null; description: string; due_date: string; status: string; status_reason: string | null; delivery_id: string | null; package_id: string | null; overdue: boolean }[];
  deliveries: { delivery_id: string; sequence: number; kind: string; request_id: string | null; generated_at: string | null; period_from: string | null; period_to: string | null; entries: number; outcome: string; reasons: string[]; received_at: string; purged: boolean }[];
  documents: { document_id: string; kind: string; offered_at: string; acknowledged_at: string | null; channel_state: 'OFFERED' | 'TOO_LARGE_FOR_CHANNEL'; encoded_bytes: number | null }[] };
type Entry = { category: string; requirement_id: string | null; key: string; label: string; value: string | number | boolean | null; unit: string; basis: string; detail: Record<string, string | number | boolean | null> | null };
const CATEGORIES = ['INDICATORS', 'CONTROL_STANDING', 'CONTROL_TESTS', 'NOTICE_VERSIONS', 'POLICY_VERSIONS', 'ACTIVITY_LOG_DIGEST'];
const POPULATIONS: Record<string, string> = { CONSENT_EVENTS_WITH_EVIDENCE: 'Consent events — evidence available', BREACH_TASKS_WITHIN_TIMER: 'Breach intimation tasks — completed within the timer',
  GRIEVANCES_RESOLVED_WITHIN_90_DAYS: 'Grievances — closed within 90 days', WITHDRAWAL_RUNS_VERIFIED: 'Withdrawal propagation runs — independently verified' };
/**
 * Evidence from the client's mandate: what the client authorised, whether its
 * installation is checking in and the delivery chain is intact, every delivery
 * ORVIA generated there and signed, and the requests the team issues. Samples
 * are drawn by the server's seed, so neither side chooses the records.
 */
function ChannelBlock({ id, scope, closed }: { id: string; scope: string[]; closed: boolean }) {
  const [ch, setCh] = useState<Channel | null>(null); const [entries, setEntries] = useState<{ id: string; list: Entry[]; limits: string[] } | null>(null); const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setCh(await vendorCall<Channel>(`/engagements/${id}/channel`)); } catch (err) { setLoadError(explain(err)); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  const { busy, error, run } = useAction(load);
  const [r, setR] = useState({ kind: 'COLLECT_NOW', requirement_id: '', categories: ['INDICATORS'] as string[], population: 'CONSENT_EVENTS_WITH_EVIDENCE', sample_size: '25', description: '', due_date: inDays(7) });
  if (!ch) return loadError ? <NoticeBox tone="stop" title="Channel unavailable"><p>{loadError}</p><button type="button" onClick={() => void load()}>Try again</button></NoticeBox> : <p role="status">Reading the audit channel…</p>;
  if (!ch.available) return <Block title="Client mandate and evidence"><p className="muted">This engagement was created before the audit channel existed; evidence arrives only as uploaded files.</p></Block>;
  const h = ch.health!; const m = ch.mandate;
  const show = (deliveryId: string) => run(async () => { const d = await vendorCall<{ document: { entries: Entry[]; limits: string[] } | null }>(`/channel-deliveries/${deliveryId}`); setEntries({ id: deliveryId, list: d.document?.entries ?? [], limits: d.document?.limits ?? ['Content purged under the retention period; digest and receipt remain.'] }); });
  return <Block title="Client mandate and evidence">
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    <Facts items={[
      { term: 'Mandate', value: m ? `${words(m.state)}${m.open ? ' (open)' : ''} · ${m.kind === 'CONTINUOUS_ASSURANCE' ? 'continuous assurance' : 'engagement'} · ${m.valid_from.slice(0, 10)} to ${m.valid_to.slice(0, 10)}` : 'Not yet received — the client drafts and approves it in their ORVIA' },
      ...(m ? [{ term: 'Authorised by the client', value: `${words(m.document.approval.preparer_role)} prepared, ${words(m.document.approval.approver_role)} approved on ${m.document.approval.approved_at.slice(0, 10)}` },
        { term: 'Evidence authorised', value: `${m.document.categories.map(words).join(', ')} · ${m.document.schedule.toLowerCase()} · ${m.document.scope_requirement_ids.join(', ')}` }] : []),
      { term: 'Client installation key', value: h.installation_key_id ? `${h.installation_key_id} (pinned ${h.pinned_at?.slice(0, 10)})` : 'Not yet pinned — no check-in so far' },
      { term: 'Last check-in', value: h.last_check_in_at ? `${h.last_check_in_at.slice(0, 16).replace('T', ' ')} UTC (${h.check_ins} in total)` : 'Never' },
      { term: 'Evidence chain', value: h.chain_state === 'BROKEN' ? `BROKEN — ${h.chain_problem}. Deliveries after the break are kept; treat the gap as a limitation.` : h.chain_state === 'INTACT' ? `Intact through delivery ${h.next_sequence - 1}` : 'No delivery yet' }]} />
    <h4>Requests over the channel</h4>
    {ch.requests.length ? <DataTable caption="Requests issued over the channel" rowKey={x => x.id} rows={ch.requests} columns={[
      { key: 'k', header: 'Request', cell: x => <span className="cell-primary">{words(x.kind)}{x.requirement_id ? ` · ${x.requirement_id}` : ''}<span className="cell-sub">{x.description}{x.population ? ` — ${POPULATIONS[x.population] ?? x.population}, ${x.sample_size} records` : ''}</span></span> },
      { key: 'd', header: 'Due', cell: x => <>{x.due_date}{x.overdue && <span className="cell-sub">overdue — a limitation if unanswered at the opinion date</span>}</> },
      { key: 's', header: 'Status', cell: x => <>{words(x.status)}{x.status_reason && <span className="cell-sub">{words(x.status_reason)}</span>}{x.package_id && <span className="cell-sub">answered with a sealed package (see Evidence)</span>}</> },
      { key: 'x', header: '', cell: x => <span className="row">{x.delivery_id && <button type="button" disabled={busy} onClick={() => void show(x.delivery_id!)}>View answer</button>}
        {x.status === 'PENDING' && <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/channel-requests/${x.id}/withdraw`, {}))}>Withdraw</button>}</span> }]} /> : <EmptyState title="No channel requests" />}
    {!closed && <form className="panel" aria-label="Issue request" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall(`/engagements/${id}/channel/requests`, { kind: r.kind, requirement_id: r.requirement_id || null,
      categories: r.kind === 'COLLECT_NOW' ? r.categories : [], population: r.kind === 'SAMPLE_COUNT' ? r.population : null, sample_size: r.kind === 'SAMPLE_COUNT' ? Number(r.sample_size) : null, description: r.description, due_date: r.due_date })); }}>
      <SelectField label="Request" value={r.kind} onChange={v => setR(x => ({ ...x, kind: v }))} options={[{ value: 'COLLECT_NOW', label: 'Collect current evidence now (answered automatically)' }, { value: 'SAMPLE_COUNT', label: 'Test a sample drawn by the server\'s seed (answered automatically)' }, { value: 'EVIDENCE_FILE', label: 'Ask for a document (a client approver answers)' }]} required />
      <SelectField label="Requirement" value={r.requirement_id} onChange={v => setR(x => ({ ...x, requirement_id: v }))} options={[{ value: '', label: 'All in scope' }, ...scope.map(q => ({ value: q, label: q }))]} />
      {r.kind === 'COLLECT_NOW' && <fieldset><legend>Categories</legend>{CATEGORIES.map(cat => <label key={cat} className="row"><input type="checkbox" checked={r.categories.includes(cat)} onChange={() => setR(x => ({ ...x, categories: x.categories.includes(cat) ? x.categories.filter(y => y !== cat) : [...x.categories, cat] }))} /> {words(cat)}</label>)}</fieldset>}
      {r.kind === 'SAMPLE_COUNT' && <><SelectField label="Population" value={r.population} onChange={v => setR(x => ({ ...x, population: v }))} options={Object.entries(POPULATIONS).map(([value, label]) => ({ value, label }))} required />
        <TextField label="Sample size" value={r.sample_size} onChange={v => setR(x => ({ ...x, sample_size: v }))} required inputMode="numeric" /></>}
      <TextAreaField label="What you need and why" value={r.description} onChange={v => setR(x => ({ ...x, description: v }))} required />
      <TextField label="Due date (YYYY-MM-DD)" value={r.due_date} onChange={v => setR(x => ({ ...x, due_date: v }))} required />
      <button type="submit" disabled={busy}>Issue request</button>
      <p className="muted">Requests are signed with the audit key and collected by the client&apos;s installation at its next check-in. Anything outside the mandate, or any document, goes to the client&apos;s approver.</p></form>}
    <h4>Evidence timeline</h4>
    {ch.deliveries.length ? <DataTable caption="Deliveries from the client installation" rowKey={d => d.delivery_id} rows={ch.deliveries} columns={[{ key: 'n', header: '#', cell: d => d.sequence },
      { key: 'k', header: 'Kind', cell: d => d.kind === 'SNAPSHOT' ? 'scheduled snapshot' : 'answer to a request' }, { key: 'p', header: 'Period', cell: d => d.period_from ? `${d.period_from.slice(0, 10)} → ${d.period_to?.slice(0, 10)}` : '—' },
      { key: 'e', header: 'Entries', cell: d => d.entries }, { key: 'o', header: 'Outcome', cell: d => <>{d.outcome.toLowerCase()}{d.reasons.length > 0 && <span className="cell-sub">{d.reasons.join(', ').toLowerCase()}</span>}</> },
      { key: 'r', header: 'Received', cell: d => d.received_at.slice(0, 16).replace('T', ' ') }, { key: 'x', header: '', cell: d => d.outcome === 'ACCEPTED' ? <button type="button" disabled={busy} onClick={() => void show(d.delivery_id)}>{d.purged ? 'Purged' : 'View'}</button> : null }]} />
      : <EmptyState title="No deliveries yet"><p>The client installation sends its first snapshot at its first check-in after the mandate is approved.</p></EmptyState>}
    <h4>Signed documents sent to the client</h4>
    {ch.documents.length ? <DataTable caption="Signed documents offered to the client installation" rowKey={d => d.document_id} rows={ch.documents} columns={[
      { key: 'k', header: 'Document', cell: d => words(d.kind) }, { key: 'o', header: 'Offered', cell: d => d.offered_at.slice(0, 16).replace('T', ' ') },
      { key: 's', header: 'State', cell: d => d.channel_state === 'TOO_LARGE_FOR_CHANNEL'
        ? <>too large for the channel<span className="cell-sub">Send it to the client as a file from the Report tab; it is not offered again.</span></>
        : d.acknowledged_at ? `received by the client ${d.acknowledged_at.slice(0, 16).replace('T', ' ')}` : 'offered at the next check-in' }]} />
      : <EmptyState title="No signed documents sent yet"><p>Signed findings, request lists and reports are offered to the client installation at its next check-in.</p></EmptyState>}
    {entries && <div className="panel"><h4>Delivery content</h4>
      <ul className="cell-sub">{entries.limits.map(l => <li key={l}>{l}</li>)}</ul>
      <DataTable caption="Evidence entries, signed by the client installation" rowKey={x => `${x.category}-${x.key}-${x.requirement_id}-${JSON.stringify(x.detail)}`} rows={entries.list} columns={[
        { key: 'c', header: 'Category', cell: x => words(x.category) }, { key: 'q', header: 'Requirement', cell: x => x.requirement_id ?? '—' },
        { key: 'l', header: 'Evidence', cell: x => <span className="cell-primary">{x.label}<span className="cell-sub">{x.basis}</span></span> },
        { key: 'v', header: 'Value', cell: x => <>{String(x.value ?? '—')} {x.unit}{x.detail && <span className="cell-sub">{Object.entries(x.detail).map(([k, v]) => `${k.replaceAll('_', ' ')}: ${v ?? '—'}`).join(' · ')}</span>}</> }]} /></div>}
  </Block>;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = use(params); return <VendorArea capability="engagements.read">{s => <Workspace id={id} session={s} />}</VendorArea>; }
