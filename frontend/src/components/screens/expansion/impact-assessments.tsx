'use client';
import { useState } from 'react';
import { useCollection, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Area, Choice, Input, WriteForm, localNow, nullable, text, time } from '../privacy-operations/registry-forms.tsx';

const KINDS = [
  { value: 'PIA', label: 'Privacy impact assessment' }, { value: 'DPIA', label: 'Data protection impact assessment' },
  { value: 'SDF_DPIA', label: 'SDF periodic DPIA' }, { value: 'AI', label: 'AI system assessment' },
  { value: 'VENDOR_DUE_DILIGENCE', label: 'Vendor due diligence' }, { value: 'OTHER', label: 'Other' },
];
const SUBJECTS = [
  { value: 'ORGANISATION', label: 'The whole organisation' }, { value: 'ACTIVITY', label: 'A processing activity' }, { value: 'SYSTEM', label: 'A system' },
  { value: 'PROCESSOR', label: 'A processor' }, { value: 'PROCESSOR_ENGAGEMENT', label: 'A processor engagement' }, { value: 'AI_SYSTEM', label: 'An AI system' },
];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => ({ value: s, label: s.toLowerCase() }));
const STATUS_TONE: Record<string, 'ok' | 'warn' | 'stop' | 'neutral' | 'info'> = { DRAFT: 'info', SUBMITTED: 'warn', APPROVED: 'ok', REJECTED: 'stop', SUPERSEDED: 'neutral' };
const FINDING_TONE: Record<string, 'ok' | 'warn' | 'stop' | 'neutral' | 'unknown'> = { OPEN: 'stop', REMEDIATION_PLANNED: 'warn', RESOLVED: 'ok', RISK_ACCEPTED: 'neutral', ACCEPTANCE_EXPIRED: 'stop' };

/**
 * General impact assessments (EX06). A template version is immutable and is
 * published by someone other than its author. An assessment is approved only by
 * someone who neither created nor submitted it, and only when no finding is
 * unresolved; an approval is a recorded review decision, not a legal conclusion.
 */
export function ImpactAssessments() {
  const templates = usePagedQuery('list_impact_templates', { limit: 25 });
  const [status, setStatus] = useState('');
  const assessments = usePagedQuery('list_impact_assessments', { limit: 25, query: status ? { status } : {} });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead eyebrow="Governance" title="Impact assessments"
        lede="PIA, DPIA, SDF, AI and vendor assessments from versioned questionnaires. Required answers and evidence are enforced, findings block approval until resolved, and a second person approves." />
      <Section title="Assessments">
        <div className="actions">
          <Choice label="Status" name="status_filter" required={false} placeholder="Any status" value={status} onChange={setStatus}
            options={['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SUPERSEDED'].map(s => ({ value: s, label: s.toLowerCase() }))} />
          <ActionButton operation="impact_escalation_sweep" label="Escalate overdue findings" input={undefined as never} onDone={() => assessments.refresh()} />
        </div>
        <Freshness query={assessments} />
        <QueryBoundary query={assessments} label="assessments" isEmpty={d => !d.items.length}>
          {d => (
            <>
              <DataTable caption="Impact assessments" rows={d.items} rowKey={a => a.id}
                columns={[
                  { key: 'title', header: 'Assessment', cell: a => <span className="cell-primary">{a.title}<span className="cell-sub">{a.template_name} · revision {a.revision}</span></span> },
                  { key: 'subject', header: 'Subject', cell: a => a.subject_id ? `${a.subject_kind.replaceAll('_', ' ').toLowerCase()} ${shortId(a.subject_id)}` : 'Organisation' },
                  { key: 'status', header: 'Status', cell: a => <Badge label={a.status.toLowerCase()} tone={STATUS_TONE[a.status] ?? 'neutral'} /> },
                  { key: 'due', header: 'Due', cell: a => <>{formatTime(a.due_at)}{a.overdue && <> <Badge label="Overdue" tone="stop" /></>}{a.review_due && <> <Badge label="Review due" tone="warn" /></>}</> },
                  { key: 'findings', header: 'Unresolved findings', cell: a => String(a.open_findings) },
                  { key: 'open', header: '', cell: a => <button type="button" onClick={() => setSelected(a.id)}>Open</button> },
                ]} />
              <Pagination query={assessments} />
            </>
          )}
        </QueryBoundary>
        <CreateAssessment templates={(templates.data?.items ?? []).filter(t => t.status === 'PUBLISHED')} onSaved={a => { assessments.refresh(); setSelected(a.id); }} />
      </Section>
      {selected && <AssessmentDetail key={selected} id={selected} onChanged={() => assessments.refresh()} onOpen={setSelected} />}
      <Section title="Questionnaire templates">
        <Freshness query={templates} />
        <QueryBoundary query={templates} label="templates" isEmpty={d => !d.items.length}>
          {d => (
            <>
              <DataTable caption="Template versions" rows={d.items} rowKey={t => t.id}
                columns={[
                  { key: 'name', header: 'Template', cell: t => <span className="cell-primary">{t.name}<span className="cell-sub">{t.kind.replaceAll('_', ' ').toLowerCase()} · version {t.version} · {t.questions.length} questions</span></span> },
                  { key: 'status', header: 'Status', cell: t => t.status.toLowerCase() },
                  { key: 'review', header: 'Review every', cell: t => `${t.review_interval_days} days` },
                  { key: 'act', header: '', cell: t => t.status === 'DRAFT' ? <ActionButton operation="publish_impact_template" label="Publish" input={{ action: 'PUBLISH' }} params={{ id: t.id }} onDone={() => templates.refresh()} />
                    : t.status === 'PUBLISHED' ? <ActionButton operation="publish_impact_template" label="Retire" input={{ action: 'RETIRE' }} params={{ id: t.id }} onDone={() => templates.refresh()} /> : null },
                ]} />
              <Pagination query={templates} />
            </>
          )}
        </QueryBoundary>
        <CreateTemplate templates={templates.data?.items ?? []} onSaved={() => templates.refresh()} />
      </Section>
    </>
  );
}

type QuestionDraft = { key: string; text: string; answer_type: 'YES_NO' | 'TEXT' | 'CHOICE' | 'NUMBER'; choices: string; required: boolean; evidence_required: boolean; finding_when: string; finding_severity: string };
const blank = (): QuestionDraft => ({ key: '', text: '', answer_type: 'YES_NO', choices: '', required: true, evidence_required: false, finding_when: '', finding_severity: '' });

function CreateTemplate({ templates, onSaved }: { templates: { template_key: string; name: string; version: number }[]; onSaved: () => void }) {
  const [questions, setQuestions] = useState<QuestionDraft[]>([blank()]);
  const set = (i: number, patch: Partial<QuestionDraft>) => setQuestions(questions.map((q, j) => j === i ? { ...q, ...patch } : q));
  const keys = new Map<string, string>(); for (const t of templates) if (!keys.has(t.template_key)) keys.set(t.template_key, t.name);
  return (
    <WriteForm operation="create_impact_template" label="Record a template version" onSaved={() => { setQuestions([blank()]); onSaved(); }} describe={t => `${t.name} version ${t.version} recorded as a draft; another person publishes it`}
      build={f => ({ template_key: nullable(f, 'template_key'), kind: text(f, 'kind') as 'DPIA', name: text(f, 'name'), description: text(f, 'description'),
        review_interval_days: Number(text(f, 'interval')), requirement_ids: text(f, 'requirements').split(',').map(x => x.trim()).filter(Boolean),
        questions: questions.map(q => ({ key: q.key.trim(), text: q.text.trim(), answer_type: q.answer_type, choices: q.answer_type === 'CHOICE' ? q.choices.split(',').map(x => x.trim()).filter(Boolean) : [],
          required: q.required, evidence_required: q.evidence_required, finding_when: q.finding_when.trim() || null, finding_severity: (q.finding_when.trim() ? q.finding_severity || null : null) as 'LOW' | null, guidance: null })) })}>
      <Choice label="New version of" name="template_key" required={false} placeholder="A new template" options={[...keys].map(([value, label]) => ({ value, label }))} />
      <Choice label="Kind" name="kind" options={KINDS} />
      <Input label="Name" name="name" />
      <Area label="Description" name="description" minLength={10} />
      <Input label="Review every (days)" name="interval" type="number" defaultValue="365" />
      <Input label="Regulatory requirement identifiers" name="requirements" required={false} maxLength={400} hint="Optional, comma-separated; each must be in the package in force." />
      {questions.map((q, i) => (
        <fieldset key={i} className="field">
          <legend className="label">Question {i + 1}</legend>
          <label className="field"><span className="label">Key</span><input aria-label={`Question ${i + 1} key`} value={q.key} onChange={e => set(i, { key: e.target.value })} pattern="[a-z][a-z0-9_]{0,40}" required /></label>
          <label className="field"><span className="label">Question</span><input aria-label={`Question ${i + 1} text`} value={q.text} onChange={e => set(i, { text: e.target.value })} required maxLength={500} /></label>
          <label className="field"><span className="label">Answer type</span>
            <select aria-label={`Question ${i + 1} answer type`} value={q.answer_type} onChange={e => set(i, { answer_type: e.target.value as QuestionDraft['answer_type'] })}>
              <option value="YES_NO">Yes / no</option><option value="TEXT">Text</option><option value="CHOICE">Choice</option><option value="NUMBER">Number</option>
            </select></label>
          {q.answer_type === 'CHOICE' && <label className="field"><span className="label">Choices (comma-separated)</span><input aria-label={`Question ${i + 1} choices`} value={q.choices} onChange={e => set(i, { choices: e.target.value })} /></label>}
          <label className="checkbox"><input type="checkbox" checked={q.required} onChange={e => set(i, { required: e.target.checked })} /> <span>Required</span></label>
          <label className="checkbox"><input type="checkbox" checked={q.evidence_required} onChange={e => set(i, { evidence_required: e.target.checked })} /> <span>Evidence required</span></label>
          <label className="field"><span className="label">Raise a finding when the answer is</span><input aria-label={`Question ${i + 1} finding when`} value={q.finding_when} onChange={e => set(i, { finding_when: e.target.value })} placeholder="e.g. YES" /></label>
          {q.finding_when.trim() && <label className="field"><span className="label">Finding severity</span>
            <select aria-label={`Question ${i + 1} finding severity`} value={q.finding_severity} onChange={e => set(i, { finding_severity: e.target.value })} required>
              <option value="">Select…</option>{SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select></label>}
          {questions.length > 1 && <button type="button" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>Remove question</button>}
        </fieldset>
      ))}
      <button type="button" onClick={() => setQuestions([...questions, blank()])}>Add a question</button>
    </WriteForm>
  );
}

function CreateAssessment({ templates, onSaved }: { templates: { id: string; name: string; version: number }[]; onSaved: (a: { id: string }) => void }) {
  const [kind, setKind] = useState('ORGANISATION');
  const activities = useCollection('list_registry_activities', { enabled: kind === 'ACTIVITY' });
  const systems = useCollection('list_systems', { enabled: kind === 'SYSTEM' });
  const processors = useCollection('list_processors', { enabled: kind === 'PROCESSOR' });
  const engagements = useCollection('list_processor_engagements', { enabled: kind === 'PROCESSOR_ENGAGEMENT' });
  const ai = useCollection('list_ai_systems', { enabled: kind === 'AI_SYSTEM' });
  const subjects: Record<string, { value: string; label: string }[]> = {
    ACTIVITY: (activities.data?.items ?? []).map(a => ({ value: a.id, label: a.name })), SYSTEM: (systems.data?.items ?? []).map(s => ({ value: s.id, label: s.name })),
    PROCESSOR: (processors.data?.items ?? []).map(p => ({ value: p.id, label: p.name })), PROCESSOR_ENGAGEMENT: (engagements.data?.items ?? []).map(e => ({ value: e.id, label: e.service_description })),
    AI_SYSTEM: (ai.data?.items ?? []).map(s => ({ value: s.id, label: s.name })),
  };
  return (
    <WriteForm operation="create_impact_assessment" label="Start an assessment" onSaved={onSaved} describe={a => `${a.title} started as a draft`}
      build={f => ({ template_id: text(f, 'template'), subject_kind: kind as 'ORGANISATION', subject_id: kind === 'ORGANISATION' ? null : text(f, 'subject'), title: text(f, 'title'), owner_reference: text(f, 'owner'), due_at: time(f, 'due') })}>
      <Choice label="Template" name="template" options={templates.map(t => ({ value: t.id, label: `${t.name} (version ${t.version})` }))} hint="Only published versions can be used." />
      <Choice label="About" name="subject_kind" value={kind} onChange={setKind} options={SUBJECTS} />
      {kind !== 'ORGANISATION' && <Choice label="Subject" name="subject" options={subjects[kind] ?? []} />}
      <Input label="Title" name="title" maxLength={160} />
      <Input label="Owner" name="owner" maxLength={500} />
      <Input label="Due" name="due" type="datetime-local" defaultValue={localNow(14)} />
    </WriteForm>
  );
}

function AssessmentDetail({ id, onChanged, onOpen }: { id: string; onChanged: () => void; onOpen: (id: string) => void }) {
  const detail = useQuery('impact_assessment', { params: { id } });
  const refresh = () => { detail.refresh(); onChanged(); };
  return (
    <QueryBoundary query={detail} label="assessment" isEmpty={() => false}>
      {a => (
        <Section title={`${a.title} — revision ${a.revision}`}>
          <p>
            <Badge label={a.status.toLowerCase()} tone={STATUS_TONE[a.status] ?? 'neutral'} /> {a.template.name} version {a.template.version}; due {formatTime(a.due_at)}
            {a.previous_id && <> · retests <button type="button" onClick={() => onOpen(a.previous_id!)}>revision {a.revision - 1}</button></>}
            {a.next_review_at && <> · next review {formatTime(a.next_review_at)}</>}
          </p>
          {a.decision_note && <p className="cell-sub">Decision: {a.decision_note}</p>}
          {a.missing.length > 0 && <NoticeBox tone="warn" title="Not ready to submit"><ul>{a.missing.map(m => <li key={m.question_key}>{a.template.questions.find(q => q.key === m.question_key)?.text} — {m.reason === 'NOT_ANSWERED' ? 'not answered' : 'evidence missing'}</li>)}</ul></NoticeBox>}
          {a.status === 'SUBMITTED' && a.approval_blockers.length > 0 && <NoticeBox tone="stop" title="Cannot be approved yet"><ul>{a.approval_blockers.map(b => <li key={b}>{b}</li>)}</ul></NoticeBox>}
          {a.status === 'DRAFT' ? (
            <WriteForm operation="answer_impact_assessment" label="Save answers" params={{ id }} onSaved={refresh} keepValues
              build={f => ({ answers: a.template.questions.filter(q => text(f, `a_${q.key}`)).map(q => ({ question_key: q.key, value: text(f, `a_${q.key}`), evidence_reference: nullable(f, `e_${q.key}`) })) })}>
              {a.template.questions.map(q => {
                const current = a.answers.find(x => x.question_key === q.key);
                const label = `${q.text}${q.required ? '' : ' (optional)'}`;
                return (
                  <fieldset key={q.key} className="field">
                    <legend className="label">{label}{current?.carried_forward && <> <Badge label="Carried forward" tone="info" meaning="From the previous revision; confirm or change it." /></>}</legend>
                    {q.answer_type === 'YES_NO' || q.answer_type === 'CHOICE'
                      ? <Choice label="Answer" name={`a_${q.key}`} required={false} defaultValue={current?.value ?? ''} options={(q.answer_type === 'YES_NO' ? ['YES', 'NO'] : q.choices).map(c => ({ value: c, label: c }))} />
                      : q.answer_type === 'NUMBER' ? <Input label="Answer" name={`a_${q.key}`} type="number" required={false} defaultValue={current?.value} />
                        : <Area label="Answer" name={`a_${q.key}`} required={false} maxLength={4000} defaultValue={current?.value} />}
                    <Input label={q.evidence_required ? 'Evidence reference (required)' : 'Evidence reference'} name={`e_${q.key}`} required={false} maxLength={500} defaultValue={current?.evidence_reference ?? undefined} />
                  </fieldset>
                );
              })}
            </WriteForm>
          ) : (
            <DataTable caption="Answers" rows={a.answers} rowKey={x => x.question_key}
              columns={[
                { key: 'q', header: 'Question', cell: x => a.template.questions.find(q => q.key === x.question_key)?.text ?? x.question_key },
                { key: 'v', header: 'Answer', cell: x => x.value },
                { key: 'e', header: 'Evidence', cell: x => x.evidence_reference ?? '—' },
              ]} />
          )}
          <div className="actions">
            {a.status === 'DRAFT' && <ActionButton operation="submit_impact_assessment" label="Submit for review" input={undefined as never} params={{ id }} onDone={refresh} />}
          </div>
          {a.status === 'SUBMITTED' && (
            <WriteForm operation="decide_impact_assessment" label="Record the review decision" params={{ id }} onSaved={refresh} describe={x => x.status.toLowerCase()}
              build={f => ({ decision: text(f, 'decision') as 'APPROVED' | 'REJECTED', note: text(f, 'note') })}>
              <p className="cell-sub">The reviewer must be someone other than the person who created or submitted this assessment.</p>
              <Choice label="Decision" name="decision" options={[{ value: 'APPROVED', label: 'Approve' }, { value: 'REJECTED', label: 'Reject' }]} />
              <Area label="Note" name="note" minLength={10} maxLength={1000} />
            </WriteForm>
          )}
          {['APPROVED', 'REJECTED'].includes(a.status) && (
            <WriteForm operation="revise_impact_assessment" label="Start a retest" params={{ id }} onSaved={x => { onChanged(); onOpen(x.id); }} describe={x => `revision ${x.revision} started`}
              build={f => ({ reason: text(f, 'reason'), due_at: time(f, 'due') })}>
              <Input label="Reason" name="reason" minLength={10} maxLength={500} />
              <Input label="Due" name="due" type="datetime-local" defaultValue={localNow(14)} />
            </WriteForm>
          )}
          <Findings assessment={a} onChanged={refresh} />
        </Section>
      )}
    </QueryBoundary>
  );
}

type AssessmentValue = { id: string; status: string; template: { questions: { key: string; text: string }[] }; findings: { id: string; title: string; severity: string; state: string; overdue: boolean; due_at: string; owner_reference: string; source: string; events: { id: string; kind: string; note: string; recorded_at: string }[] }[] };
function Findings({ assessment, onChanged }: { assessment: AssessmentValue; onChanged: () => void }) {
  const [finding, setFinding] = useState('');
  const [kind, setKind] = useState('');
  const risks = useCollection('list_grc_risks');
  const controls = useCollection('list_grc_controls');
  return (
    <>
      <h3>Findings</h3>
      {assessment.findings.length === 0 ? <p className="cell-sub">No findings.</p> : (
        <DataTable caption="Findings" rows={assessment.findings} rowKey={f => f.id}
          columns={[
            { key: 'title', header: 'Finding', cell: f => <span className="cell-primary">{f.title}<span className="cell-sub">{f.source.replaceAll('_', ' ').toLowerCase()} · {f.owner_reference}</span></span> },
            { key: 'sev', header: 'Severity', cell: f => f.severity.toLowerCase() },
            { key: 'state', header: 'State', cell: f => <Badge label={f.state.replaceAll('_', ' ').toLowerCase()} tone={FINDING_TONE[f.state] ?? 'neutral'} /> },
            { key: 'due', header: 'Due', cell: f => <>{formatTime(f.due_at)}{f.overdue && <> <Badge label="Overdue" tone="stop" /></>}</> },
            { key: 'history', header: 'History', cell: f => f.events.length ? <ul>{f.events.map(e => <li key={e.id}>{e.kind.replaceAll('_', ' ').toLowerCase()} {formatTime(e.recorded_at)}: {e.note}</li>)}</ul> : '—' },
          ]} />
      )}
      {assessment.findings.length > 0 && (
        <WriteForm operation="record_impact_finding_event" label="Record progress on a finding" params={finding ? { id: finding } : undefined} onSaved={() => { setFinding(''); onChanged(); }} describe={f => f.state.replaceAll('_', ' ').toLowerCase()}
          build={f => {
            if (!finding) throw new Error('Choose the finding.');
            if (kind === 'RESOLVED' && !nullable(f, 'evidence')) throw new Error('A resolution cites the evidence of remediation.');
            return { kind: kind as 'RESOLVED', note: text(f, 'note'), evidence_reference: nullable(f, 'evidence'), acceptance_expires_at: kind === 'RISK_ACCEPTED' ? time(f, 'expires') : null };
          }}>
          <Choice label="Finding" name="finding" value={finding} onChange={setFinding} options={assessment.findings.map(f => ({ value: f.id, label: `${f.title.slice(0, 80)} (${f.state.toLowerCase()})` }))} />
          <Choice label="Progress" name="kind" value={kind} onChange={setKind}
            options={[{ value: 'REMEDIATION_PLANNED', label: 'Remediation planned' }, { value: 'RESOLVED', label: 'Resolved (with evidence)' }, { value: 'RISK_ACCEPTED', label: 'Risk accepted (approver, with expiry)' }, { value: 'REOPENED', label: 'Reopened' }]} />
          <Area label="Note" name="note" minLength={10} maxLength={1000} />
          <Input label="Evidence reference" name="evidence" required={false} maxLength={500} />
          {kind === 'RISK_ACCEPTED' && <Input label="Acceptance expires" name="expires" type="datetime-local" defaultValue={localNow(90)} hint="Accepted by someone other than whoever raised the finding." />}
        </WriteForm>
      )}
      {assessment.status !== 'SUPERSEDED' && (
        <WriteForm operation="create_impact_finding" label="Raise a finding" params={{ id: assessment.id }} onSaved={onChanged}
          build={f => ({ question_key: nullable(f, 'question'), title: text(f, 'title'), severity: text(f, 'severity') as 'LOW', owner_reference: text(f, 'owner'), due_at: time(f, 'due'),
            grc_risk_id: nullable(f, 'risk'), grc_control_id: nullable(f, 'control') })}>
          <Choice label="About question" name="question" required={false} placeholder="The assessment as a whole" options={assessment.template.questions.map(q => ({ value: q.key, label: q.text }))} />
          <Input label="Title" name="title" minLength={3} maxLength={300} />
          <Choice label="Severity" name="severity" options={SEVERITIES} />
          <Input label="Owner" name="owner" maxLength={500} />
          <Input label="Due" name="due" type="datetime-local" defaultValue={localNow(30)} />
          <Choice label="Linked risk" name="risk" required={false} placeholder="None" options={(risks.data?.items ?? []).map(r => ({ value: r.id, label: r.title }))} />
          <Choice label="Linked control" name="control" required={false} placeholder="None" options={(controls.data?.items ?? []).map(c => ({ value: c.id, label: c.title }))} />
        </WriteForm>
      )}
    </>
  );
}
