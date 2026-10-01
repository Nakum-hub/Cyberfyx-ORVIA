'use client';
import { useState } from 'react';
import { useCollection, useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { hasCapability, useSession } from '../../shared/session-context.tsx';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, FailureState, Freshness, NoticeBox, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Choice, Input, WriteForm, text } from './registry-forms.tsx';

const LEDGER: Record<string, { label: string; tone: 'ok' | 'warn' | 'stop' | 'neutral' | 'info' }> = {
  IN_BACKUPS: { label: 'Still in backups', tone: 'warn' }, BACKUPS_AGED_OUT: { label: 'Backups aged out (by schedule)', tone: 'neutral' },
  REAPPLY_REQUIRED: { label: 'Erase again (restored)', tone: 'stop' }, REAPPLIED: { label: 'Erased again (confirmed by staff)', tone: 'info' },
};
const localToIso = (form: FormData, key: string) => { const v = text(form, key); if (!v) throw new Error('Enter both times.'); return new Date(v).toISOString(); };

/**
 * EX07 backup-copy obligations (master §§50, 91). Backups usually cannot be edited to remove one person, so ORVIA records how each
 * system's backups are treated, keeps a minimal ledger of erasures a restore would undo, and marks re-erasure when a system is
 * restored from an older backup. A backup is never reported as erased.
 */
export function BackupObligations() {
  const { session } = useSession();
  const coverage = useQuery('backup_coverage');
  const treatments = usePagedQuery('list_backup_treatments', { limit: 50 });
  const systems = useCollection('list_systems');
  const systemOptions = (systems.data?.items ?? []).map(s => ({ value: s.id, label: s.name }));
  const refresh = () => { coverage.refresh(); treatments.refresh(); };
  return (
    <Section title="Backups">
      <NoticeBox tone="info" title="A backup is never reported as erased">
        <p>When someone is erased, their data usually stays in each system&apos;s backups until those backups age out. For every system, record how its backups are handled; ORVIA then keeps a minimal list of erasures a restore would undo, and marks who must be erased again if the system is restored from an older backup. The date backups age out is a schedule, not proof of erasure.</p>
      </NoticeBox>
      <Freshness query={coverage} />
      <QueryBoundary query={coverage} label="backup coverage" isEmpty={d => !d.systems.length}>
        {d => (
          <>
            {d.unknown_backup_handling > 0 ? <NoticeBox tone="warn" title={`${d.unknown_backup_handling} system(s) with unknown backup handling`}><p>These systems have verified erasures but no approved backup treatment, so what their backups still hold is unknown.</p></NoticeBox> : null}
            <DataTable caption="Backup coverage by system" rows={d.systems} rowKey={s => s.system_id}
              columns={[
                { key: 'system', header: 'System', cell: s => s.system_name },
                { key: 'treatment', header: 'Backup treatment', cell: s => <Badge label={s.treatment === 'CURRENT' ? 'approved' : s.treatment === 'PROPOSED' ? 'awaiting approval' : 'none recorded'} tone={s.treatment === 'CURRENT' ? 'ok' : s.treatment === 'PROPOSED' ? 'warn' : 'stop'} /> },
                { key: 'erasures', header: 'Verified erasures', cell: s => s.verified_erasures },
                { key: 'backups', header: 'Still in backups', cell: s => <>{s.in_backups}{s.earliest_clear_after ? <span className="cell-sub">first ages out {formatTime(s.earliest_clear_after)}</span> : null}</> },
                { key: 'reapply', header: 'Erase again', cell: s => s.reapply_required ? <Badge label={String(s.reapply_required)} tone="stop" /> : 0 },
              ]} />
          </>
        )}
      </QueryBoundary>

      <h3>Backup treatments</h3>
      <QueryBoundary query={treatments} label="backup treatments" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Backup treatments" rows={d.items} rowKey={t => t.id}
              columns={[
                { key: 'system', header: 'System', cell: t => <span className="cell-primary">{t.system_name}<span className="cell-sub">kept {t.retention_days} day(s)</span></span> },
                { key: 'restriction', header: 'Technical restriction and isolation', cell: t => <>{t.technical_restriction}<span className="cell-sub">{t.isolation_controls}</span></> },
                { key: 'legal', header: 'Approved legal treatment', cell: t => <>{t.legal_treatment}<span className="cell-sub">Restore procedure: {t.restore_procedure_reference}</span></> },
                { key: 'status', header: 'Status', cell: t => t.status === 'PROPOSED'
                  ? (t.recorded_by === session?.actor_id ? <Badge label="awaiting a second person" tone="warn" /> : <ActionButton operation="approve_backup_treatment" label="Approve" input={undefined as never} params={{ id: t.id }} onDone={refresh} />)
                  : <Badge label={t.status.toLowerCase()} tone={t.status === 'CURRENT' ? 'ok' : 'neutral'} /> },
              ]} />
            <Pagination query={treatments} />
          </>
        )}
      </QueryBoundary>
      <WriteForm operation="create_backup_treatment" label="Record a backup treatment" onSaved={refresh} describe={t => `recorded for ${t.system_name}; a second person must approve it`}
        build={f => ({ system_id: text(f, 'system'), technical_restriction: text(f, 'restriction'), isolation_controls: text(f, 'isolation'), retention_days: Number(text(f, 'days')),
          restore_procedure_reference: text(f, 'procedure'), legal_treatment: text(f, 'legal') })}>
        <Choice label="System" name="system" options={systemOptions} />
        <Input label="Technical restriction" name="restriction" maxLength={1000} hint="Why one person cannot be removed from these backups, for example: nightly full database images, encrypted, not editable per record." />
        <Input label="Isolation controls" name="isolation" maxLength={1000} hint="Who can read or restore the backups, and how they are kept apart from live processing." />
        <Input label="Backups kept for (days)" name="days" type="number" />
        <Input label="Restore procedure reference" name="procedure" maxLength={500} hint="Where the restore procedure is written down." />
        <Input label="Customer-approved legal treatment" name="legal" maxLength={1000} hint="What your organisation decided about erased people remaining in backups until they age out, and who approved it." />
      </WriteForm>

      <h3>A system was restored from a backup</h3>
      <p className="muted">Everyone erased on that system after the backup was taken is marked to be erased again, and appears in Operations attention until someone confirms it.</p>
      <WriteForm operation="record_system_restore" label="Record a system restore" onSaved={refresh} describe={r => `${r.marked_for_reerasure} person(s) marked to be erased again`}
        build={f => ({ system_id: text(f, 'system'), backup_taken_at: localToIso(f, 'taken'), restored_at: localToIso(f, 'restored'), evidence_reference: text(f, 'evidence') })}>
        <Choice label="System" name="system" options={systemOptions} />
        <Input label="The restored backup was taken at" name="taken" type="datetime-local" />
        <Input label="Restored at" name="restored" type="datetime-local" />
        <Input label="Evidence" name="evidence" maxLength={500} hint="The change or incident record for the restore." />
      </WriteForm>

      {hasCapability(session, 'registry.sensitive.read') ? <ReerasureList onChanged={refresh} /> : <p className="muted">Who must be erased again is visible only to people with sensitive registry access.</p>}
    </Section>
  );
}

function ReerasureList({ onChanged }: { onChanged: () => void }) {
  const list = usePagedQuery('list_erasure_ledger', { limit: 50, query: { state: 'REAPPLY_REQUIRED' } });
  const confirm = useMutation('confirm_reerasure', true);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  return (
    <>
      <h3>To erase again after a restore</h3>
      <Freshness query={list} />
      <QueryBoundary query={list} label="re-erasure list" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="People to erase again" rows={d.items} rowKey={e => e.id}
              columns={[
                { key: 'who', header: 'Data Principal', cell: e => <a href={`/workspace/data-principals?id=${e.subject_id}`}>{shortId(e.subject_id)}</a> },
                { key: 'system', header: 'System', cell: e => shortId(e.system_id) },
                { key: 'erased', header: 'First erased', cell: e => formatTime(e.erased_at) },
                { key: 'state', header: 'State', cell: e => <Badge label={LEDGER[e.state]!.label} tone={LEDGER[e.state]!.tone} /> },
                { key: 'confirm', header: '', cell: e => (
                  <span className="row">
                    <input aria-label="Re-erasure evidence" placeholder="Evidence of re-erasure" value={evidence[e.id] ?? ''} maxLength={500} onChange={ev => setEvidence({ ...evidence, [e.id]: ev.target.value })} />
                    <button type="button" disabled={(evidence[e.id] ?? '').trim().length < 3} onClick={async () => { confirm.newInteraction(); if (await confirm.run({ evidence_reference: evidence[e.id]!.trim() }, { params: { id: e.id } })) { list.refresh(); onChanged(); } }}>Confirm erased again</button>
                  </span>) },
              ]} />
            {confirm.failure && <FailureState failure={confirm.failure} />}
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}
