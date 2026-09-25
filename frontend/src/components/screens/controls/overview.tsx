'use client';
import { useQuery } from '../../shared/api.ts';
import type { StaffSession } from '../../shared/session-context.tsx';
import { shortId } from '../../shared/state-labels.ts';
import {
  Facts, Freshness, Lifecycle, Metric, PageHead,
  QueryBoundary, Section, TechnicalDetails, type Stage,
} from '../../shared/ui.tsx';

/**
 * The lifecycle strip is explanatory navigation, not runtime state. It names the
 * sequence ORVIA actually implements and sends the viewer to the screen that
 * holds each part of the record. It never claims a stage has happened.
 */
export const LIFECYCLE: Stage[] = [
  { step: 'Purpose', name: 'Purpose & policy', note: 'What processing is being controlled, and under which authority.', href: '/workspace/configuration' },
  { step: 'Consent', name: 'Person’s decision', note: 'A purpose-specific decision the person can change at any time.', href: '/workspace/principals' },
  { step: 'Policy', name: 'Decision preview', note: 'How current authority evaluates a proposed processing action.', href: '/workspace/policy-preview' },
  { step: 'Workflow', name: 'Durable workflow', note: 'The operational work a decision creates, recorded in the database.', href: '/workspace/workflows' },
  { step: 'System', name: 'System action', note: 'The restriction ORVIA requests in the connected system.', href: '/workspace/control-map' },
  { step: 'Verification', name: 'Independent verification', note: 'ORVIA reads the target itself. An acknowledgement is not a verification.', href: '/workspace/workflows' },
  { step: 'Evidence', name: 'Evidence', note: 'What happened, what was observed, and what is still unresolved.', href: '/workspace/evidence' },
  { step: 'Test', name: 'Regression test', note: 'Whether the control still works — including when it is deliberately broken.', href: '/workspace/test-lab' },
];

export function Overview({ session }: { session: StaffSession }) {
  const overview = useQuery('overview');
  return (
    <>
      <PageHead
        eyebrow="Privacy control workspace"
        title="Privacy control status"
        lede="ORVIA turns a person's purpose-specific privacy decision into operational work, changes the connected system, verifies the result independently and keeps the evidence — including the parts that did not resolve."
      />
      <Freshness query={overview} asOf={overview.data?.as_of} />
      <QueryBoundary query={overview} label="current privacy control status">
        {data => (
          <>
            <Section title="Live counts in this scope" aside="Live server values for your authenticated organisation and environment. No trend, target or score is derived from them.">
              <div className="grid-4">
                <Metric label="Controls verified" value={data.counts.completed} tone="ok"
                  note="Workflows where every required obligation closed by its own criterion." />
                <Metric label="Controls needing attention" value={data.counts.needs_attention} tone="warn"
                  note="At least one required obligation is unresolved, uncertain or superseded."
                  link={{ href: '/workspace/failures', label: 'Open attention list' }} />
                <Metric label="Outcome unknown" value={data.counts.effect_unknown} tone="unknown"
                  note="Attempts with no reliable result. ORVIA reconciles by reading, never by blind retry." />
                <Metric label="Manual action required" value={data.counts.manual_required} tone="warn"
                  note="Systems with no supported automated control; a named person must act and attest." />
              </div>
              <div className="grid-4" style={{ marginTop: 'var(--s4)' }}>
                <Metric label="Accepted, not yet started" value={data.counts.accepted} />
                <Metric label="Running" value={data.counts.running} />
                <Metric label="Failed actions" value={data.counts.failed} tone="stop" />
                <Metric label="Obligations without current verification" value={data.counts.unverified} tone="warn" />
              </div>
              <p className="muted" style={{ marginTop: 'var(--s3)', fontSize: 13 }}>
                These counts overlap and must not be added together. Execution states retain historical unknown,
                failed or manual facts even after a separate completion criterion is satisfied.
              </p>
            </Section>

            <Section title="How ORVIA controls privacy" aside="Each stage opens the screen that holds that part of the record.">
              <Lifecycle stages={LIFECYCLE} />
            </Section>

            <Section title="Assurance" aside="Regression results are read by exact run ID; this build exposes no run-history list.">
              <div className="grid-2">
                <div className="metric">
                  <span className="metric-label">Test Lab</span>
                  <span className="metric-value text">No run selected</span>
                  <span className="metric-note">
                    Open a scenario in the Test Lab and record its run ID. A queued request is not an execution,
                    and an execution is not a pass.
                  </span>
                  <a href="/workspace/test-lab">Open Test Lab</a>
                </div>
                <div className="metric">
                  <span className="metric-label">Canonical acceptance</span>
                  <span className="metric-value text">Not run</span>
                  <span className="metric-note">
                    Component suites pass at this candidate. Canonical acceptance additionally requires the two
                    human rehearsals and is deliberately not claimed here.
                  </span>
                  <a href="/workspace/capabilities">Open capabilities &amp; roadmap</a>
                </div>
              </div>
            </Section>

            <Section title="Proof">
              <div className="grid-3">
                <ProofLink href="/workspace/evidence" title="Evidence" note="Consent, policy, execution and independent observation for one workflow, with its unresolved gaps." />
                <ProofLink href="/workspace/workflows" title="Workflows" note="What ORVIA actually did, attempt by attempt, with the separate readback." />
                <ProofLink href="/workspace/control-map" title="Control map" note="Declared purpose-to-target relationships and the last observation of each." />
              </div>
            </Section>

            {/* Kept as a named heading because build and authority are facts a
                reviewer checks first, not decoration. */}
            <Section title="This build">
              <div className="panel">
                <Facts tight items={[
                  { term: 'Build', value: <code className="mono">{data.build_id}</code> },
                  { term: 'Contract', value: data.contract_version },
                  { term: 'Data profile', value: data.profile },
                  { term: 'Organisation', value: <code className="mono">{shortId(data.scope.legal_entity_id)}</code> },
                  { term: 'Environment', value: <code className="mono">{shortId(data.scope.environment_id)}</code> },
                ]} />
                <TechnicalDetails summary="Scope identifiers and server-derived capabilities" items={[
                  { term: 'Tenant', value: data.scope.tenant_id },
                  { term: 'Organisation', value: data.scope.legal_entity_id },
                  { term: 'Environment', value: data.scope.environment_id },
                ]}>
                  <p className="muted" style={{ fontSize: 12.5, marginTop: 'var(--s3)' }}>
                    Capabilities are derived by the server for this session. Hiding a control in this interface
                    is presentation; the server authorises every request independently.
                  </p>
                  <ul>{session.capabilities.map(capability => <li key={capability}><code>{capability}</code></li>)}</ul>
                </TechnicalDetails>
              </div>
            </Section>
          </>
        )}
      </QueryBoundary>
    </>
  );
}

function ProofLink({ href, title, note }: { href: string; title: string; note: string }) {
  return (
    <a className="entry-card" href={href}>
      <h2>{title}</h2>
      <p>{note}</p>
      <p style={{ marginBottom: 0, color: 'var(--accent)', fontWeight: 600, fontSize: 13.5 }}>View proof →</p>
    </a>
  );
}
