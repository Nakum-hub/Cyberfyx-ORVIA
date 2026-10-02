'use client';
import { useCollection, usePagedQuery } from '../../shared/api.ts';
import { hasCapability, type StaffSession } from '../../shared/session-context.tsx';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, NoticeBox, Pagination, QueryBoundary } from '../../shared/ui.tsx';
import { ActionButton, Area, Choice, Input, Many, WriteForm, all, text } from '../privacy-operations/registry-forms.tsx';

const KINDS = [{ value: 'CUSTOM_TRAINED', label: 'Trained by the organisation' }, { value: 'FINE_TUNED', label: 'Fine-tuned from a base model' },
  { value: 'THIRD_PARTY_HOSTED', label: 'Hosted by a third party' }, { value: 'RULE_BASED', label: 'Rules, no training data' }] as const;

/**
 * Custom-model versions of one AI system (migration 0080). The organisation's own model: what it learned from, for which
 * purpose, its evaluation evidence and limits. A different person approves; only an approved version is deployed. Consent
 * withdrawn for the training purpose after the data cut-off is shown for a retraining decision. ORVIA runs no model.
 */
export function AiModelVersions({ aiSystemId, session }: { aiSystemId: string; session: StaffSession }) {
  const versions = usePagedQuery('list_ai_model_versions', { limit: 25, params: { id: aiSystemId } });
  const assets = useCollection('list_data_assets');
  const purposes = useCollection('list_purposes');
  const refresh = () => versions.refresh();
  return (
    <>
      <h3>Model versions</h3>
      <p className="muted">Record each version of the organisation&apos;s own model with the datasets it learned from and the purpose those datasets are mapped to. ORVIA does not train, run or test the model; it keeps the record, requires a second person&apos;s approval, and deploys only approved versions.</p>
      <QueryBoundary query={versions} label="model versions" isEmpty={d => !d.items.length}>
        {d => (
          <>
            {d.items.some(v => v.retraining_review_due) ? <NoticeBox tone="warn" title="Retraining decision needed"><p>People withdrew consent for a deployed model&apos;s training purpose after its training data was taken. Decide whether to retrain; no model is claimed to have forgotten them.</p></NoticeBox> : null}
            <DataTable caption="Model versions" rows={d.items} rowKey={v => v.id}
              columns={[
                { key: 'v', header: 'Version', cell: v => <span className="cell-primary">{v.version_label}<span className="cell-sub">{v.model_kind.toLowerCase().replaceAll('_', ' ')} · data as of {formatTime(v.training_data_as_of)}</span></span> },
                { key: 'e', header: 'Evaluation and limits', cell: v => <>{v.evaluation_summary}<span className="cell-sub">{v.evaluation_reference} · {v.known_limitations}</span></> },
                { key: 's', header: 'State', cell: v => <><Badge label={v.state.toLowerCase()} tone={v.state === 'DEPLOYED' ? 'ok' : v.state === 'APPROVED' ? 'info' : v.state === 'DRAFT' ? 'warn' : 'neutral'} />{v.withdrawals_since_training_data ? <span className="cell-sub">{v.withdrawals_since_training_data} withdrawal(s) since the data cut-off</span> : null}</> },
                { key: 'a', header: '', cell: v => v.state === 'DRAFT' ? (v.recorded_by === session.actor_id ? <span className="cell-sub">Another person must approve</span> : <ActionButton operation="approve_ai_model_version" label="Approve" input={undefined as never} params={{ id: v.id }} onDone={refresh} />)
                  : v.state === 'APPROVED' ? <ActionButton operation="deploy_ai_model_version" label="Deploy" input={undefined as never} params={{ id: v.id }} onDone={refresh} />
                  : v.state === 'DEPLOYED' ? <ActionButton operation="retire_ai_model_version" label="Retire" input={undefined as never} params={{ id: v.id }} onDone={refresh} /> : <span className="cell-sub">{v.retired_at ? `Retired ${formatTime(v.retired_at)}` : ''}</span> },
                { key: 'w', header: 'Approved by', cell: v => v.approved_by ? shortId(v.approved_by) : '—' },
              ]} />
            <Pagination query={versions} />
          </>
        )}
      </QueryBoundary>
      {hasCapability(session, 'ai_governance.write') && (
        <WriteForm operation="record_ai_model_version" label="Record a model version" params={{ id: aiSystemId }} onSaved={refresh} describe={v => `${v.version_label} recorded; another person must approve it`}
          build={f => ({ version_label: text(f, 'label'), model_kind: text(f, 'kind') as typeof KINDS[number]['value'], training_asset_ids: all(f, 'assets'), training_purpose_id: text(f, 'purpose'),
            training_basis: text(f, 'basis'), training_data_as_of: new Date(text(f, 'asof')).toISOString(), evaluation_reference: text(f, 'evalref'), evaluation_summary: text(f, 'evalsum'), known_limitations: text(f, 'limits') })}>
          <Input label="Version" name="label" maxLength={80} />
          <Choice label="Kind of model" name="kind" options={KINDS.map(k => ({ value: k.value, label: k.label }))} />
          <Many legend="Training datasets" name="assets" options={(assets.data?.items ?? []).map(a => ({ value: a.id, label: a.name }))} />
          <Choice label="Training purpose" name="purpose" options={(purposes.data?.items ?? []).map(p => ({ value: p.id, label: p.name }))} hint="Each training dataset must be mapped to an activity serving this purpose before approval." />
          <Area label="Basis for using this data for training" name="basis" minLength={10} maxLength={1000} />
          <Input label="Training data taken as of" name="asof" type="datetime-local" />
          <Input label="Evaluation evidence" name="evalref" maxLength={500} hint="Where the evaluation report is kept." />
          <Area label="Evaluation summary" name="evalsum" minLength={10} maxLength={2000} />
          <Area label="Known limitations" name="limits" minLength={10} maxLength={2000} />
        </WriteForm>
      )}
    </>
  );
}
