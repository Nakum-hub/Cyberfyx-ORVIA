'use client';
import { useQuery } from '../shared/api.ts';
import { type Label } from '../shared/state-labels.ts';
import { DataTable, Freshness, NoticeBox, PageHead, QueryBoundary, StateBadge } from '../shared/ui.tsx';

/**
 * M29 Customer Onboarding — the gates before go-live.
 *
 * There is no overall tick on this page and no percentage, because a preflight
 * that passes everything is indistinguishable from one that checked nothing.
 * Eleven gates, eleven verdicts, and one of them says outright that this build
 * cannot answer it: there is no backup subsystem here, so reporting a backup
 * target as verified would be a claim about infrastructure this product has
 * never seen.
 *
 * Every row carries the sentence describing exactly what was examined, because
 * several of these checks are narrower than their names suggest. The egress
 * gate reads the configuration, not the firewall, and says so on the row.
 */

const GATE_LABELS: Record<string, string> = {
  RUNTIME_LOCATION: 'Runtime location',
  RUNTIME_AND_ARCHITECTURE: 'Runtime and architecture',
  TRANSPORT_SECURITY: 'Transport security',
  DURABLE_STORAGE: 'Durable storage',
  CUSTOMER_CONTROLLED_IDENTITY: 'Customer-controlled identity',
  SIGNING_KEYS: 'Signing keys',
  BACKUP_TARGET: 'Backup target',
  PERMITTED_EGRESS: 'Permitted egress',
  VENDOR_TELEMETRY_DISABLED: 'Vendor telemetry disabled',
  LICENCE_VALIDITY: 'Licence validity',
  PACKAGE_SIGNATURE: 'Package signature',
};
const VERDICT_LABELS: Record<string, Label> = {
  PASSED: { label: 'Checked', tone: 'ok', meaning: 'This gate was examined and what it found is shown beside it. It says nothing about any other gate.' },
  FAILED: { label: 'Not met', tone: 'stop', meaning: 'This gate was examined and did not hold. What to do about it is on the row.' },
  NOT_VERIFIABLE_HERE: { label: 'Cannot be checked here', tone: 'unknown', meaning: 'This build has no way to examine this. It is not a pass, and it has to be verified outside this product.' },
};

export function PreflightScreen() {
  const query = useQuery('preflight');
  return (
    <>
      <PageHead
        eyebrow="Installation"
        title="Before go-live"
        lede="Eleven checks against this installation, each stating exactly what it examined. There is no overall verdict here on purpose: a gate this build cannot check is not a gate that passed, and the two are never added together."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="the preflight gates" isEmpty={() => false}>
        {data => (
          <>
            {data.not_verifiable.length ? (
              <NoticeBox tone="warn" title={`${data.not_verifiable.length} gate${data.not_verifiable.length === 1 ? '' : 's'} cannot be checked by this product`}>
                <p>
                  {data.not_verifiable.map(kind => GATE_LABELS[kind] ?? kind).join(', ')} must be verified outside this
                  installation before real personal data is processed. Nothing here has examined them, and they are not
                  counted among the gates that passed.
                </p>
              </NoticeBox>
            ) : null}
            {data.failing.length ? (
              <NoticeBox tone="stop" title={`${data.failing.length} gate${data.failing.length === 1 ? '' : 's'} did not hold`}>
                <p>{data.failing.map(kind => GATE_LABELS[kind] ?? kind).join(', ')}. What to do about each is on its row.</p>
              </NoticeBox>
            ) : null}
            <DataTable
              caption="The eleven gates, each with what it examined and what it found"
              rows={data.gates}
              rowKey={gate => gate.kind}
              columns={[
                { key: 'gate', header: 'Gate', cell: gate => GATE_LABELS[gate.kind] ?? gate.kind },
                { key: 'verdict', header: 'Verdict', cell: gate => <StateBadge dictionary={VERDICT_LABELS} value={gate.verdict} /> },
                { key: 'checked', header: 'What was examined', cell: gate => gate.checked },
                { key: 'result', header: 'What it found', cell: gate => gate.observed
                  ?? <span className="cell-sub">{gate.unverifiable_reason}</span> },
                { key: 'remedy', header: 'What to do', cell: gate => gate.remedy ?? <span className="cell-sub">Nothing</span> },
              ]}
            />
            <NoticeBox tone="info" title="What this page can and cannot tell you">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
