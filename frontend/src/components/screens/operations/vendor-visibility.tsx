'use client';
import { useQuery } from '../../shared/api.ts';
import { formatTime, shortId, type Label } from '../../shared/state-labels.ts';
import { Badge, DataTable, Freshness, NoticeBox, PageHead, QueryBoundary, Section, StateBadge } from '../../shared/ui.tsx';

/**
 * M32 Monitoring — what the vendor side can see (FR-M32-04).
 *
 * The requirement is mostly a list of things that must not happen: no automatic
 * customer telemetry, no employee tracking, no incident raised because a model
 * is absent. A page that simply asserted those would be worthless — it is the
 * same sentence a product that collected everything would print.
 *
 * So the page is built the other way round. It accounts for everything that
 * ever left this installation towards the vendor, and the reader can see for
 * themselves that the list is short, that a named person approved each entry
 * against one exact payload digest, and that nothing arrived there by itself.
 *
 * Vendor service health is shown as an absence, not as a green tick. There is no
 * vendor service in this deployment to observe, and an unobserved service is not
 * a healthy one.
 */

const OUTCOME_LABELS: Record<string, Label> = {
  ACCEPTED: { label: 'Carried and accepted', tone: 'ok', meaning: 'An operator recorded carrying this payload and recorded that it was accepted. ORVIA neither sent it nor observed it arrive.' },
  REJECTED: { label: 'Carried and rejected', tone: 'stop', meaning: 'An operator recorded carrying this payload and recorded that it was rejected, with the reason.' },
  NOT_ATTEMPTED: { label: 'Not attempted', tone: 'neutral', meaning: 'An operator recorded that the transfer was not attempted.' },
};

export function VendorVisibilityScreen() {
  const query = useQuery('vendor_visibility');
  return (
    <>
      <PageHead
        eyebrow="Installation"
        title="What the vendor can see"
        lede="Everything that has ever left this installation towards the vendor, and nothing else. Support payloads were approved by name against one exact digest and carried by a person. DPDPA audit evidence leaves only under a mandate or a sealed package that a second owner or administrator approved; every delivery is listed below."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="vendor visibility" isEmpty={() => false}>
        {data => (
          <>
            <NoticeBox tone="info" title="Vendor service health is not reported here">
              <p>{data.vendor_service_health.reason}</p>
            </NoticeBox>

            <Section title="What was disclosed">
              {data.disclosures.length === 0 ? (
                <p className="cell-sub">Nothing has ever been approved for disclosure to the vendor from this installation.</p>
              ) : (
                <DataTable
                  caption="Every approved payload, and whether anybody recorded carrying it"
                  rows={data.disclosures}
                  rowKey={item => `${item.case_id}:${item.approved_digest}`}
                  columns={[
                    { key: 'case', header: 'Case', cell: item => (
                      <span className="cell-primary">{item.subject.replaceAll('_', ' ').toLowerCase()}
                        <span className="cell-sub">{item.vendor_case_reference ?? 'no vendor case reference recorded'}</span>
                      </span>
                    ) },
                    { key: 'facts', header: 'What the vendor was told', cell: item => (
                      <ul>{item.facts.map(fact => (
                        <li key={fact.code}>
                          {fact.code.replaceAll('_', ' ').toLowerCase()} — {fact.occurrences} occurrence(s),
                          {' '}{formatTime(fact.first_seen_at)} to {formatTime(fact.last_seen_at)}
                        </li>
                      ))}</ul>
                    ) },
                    { key: 'approved', header: 'Approved', cell: item => (
                      <span className="cell-primary">{formatTime(item.approved_at)}
                        <span className="cell-sub">by {shortId(item.approved_by)} · digest {item.approved_digest.slice(0, 12)}…</span>
                      </span>
                    ) },
                    { key: 'carried', header: 'Carried', cell: item => item.outcome
                      ? <span className="cell-primary"><StateBadge dictionary={OUTCOME_LABELS} value={item.outcome} />
                        <span className="cell-sub">{formatTime(item.carried_at!)}</span>
                      </span>
                      : <Badge label="Never carried" tone="neutral" meaning="This payload was approved and nobody has recorded carrying it. An approval is not a disclosure." /> },
                    { key: 'retention', header: 'Retention asked for', cell: item => `${item.retention_days} days` },
                  ]}
                />
              )}
              <p className="cell-sub">
                {data.approved_but_not_carried} approved payload(s) were never carried.
                {' '}{data.cases_with_nothing_disclosed} support case(s) have disclosed nothing at all.
              </p>
            </Section>

            <Section title="DPDPA audit evidence">
              <p className="cell-sub">Audit service address: {data.audit_channel.address ?? 'none configured — nothing is sent automatically'}.</p>
              {data.audit_channel.mandates.length === 0 && data.audit_packages.length === 0 ? (
                <p className="cell-sub">No audit mandate has been signed and no audit package approved in this installation.</p>
              ) : (<>
                <DataTable caption="Audit mandates: what ORVIA was authorised to send"
                  rows={data.audit_channel.mandates} rowKey={m => m.mandate_id}
                  columns={[
                    { key: 'e', header: 'Engagement', cell: m => <span className="cell-primary">{m.engagement_reference}<span className="cell-sub">{m.firm_name}</span></span> },
                    { key: 's', header: 'State', cell: m => `${m.state.toLowerCase()} · ${m.kind === 'CONTINUOUS_ASSURANCE' ? 'continuous assurance' : 'engagement'}` },
                    { key: 'c', header: 'Evidence', cell: m => m.categories.map(c => c.replaceAll('_', ' ').toLowerCase()).join(', ') },
                    { key: 'd', header: 'Dates', cell: m => `${formatTime(m.valid_from)} to ${formatTime(m.valid_to)}` },
                    { key: 'a', header: 'Approved', cell: m => m.approved_at ? `${formatTime(m.approved_at)} by ${shortId(m.approved_by!)}` : 'not approved' },
                  ]} />
                <DataTable caption="Evidence deliveries sent by ORVIA (aggregates only, no personal data)"
                  rows={data.audit_channel.deliveries} rowKey={d => d.delivery_id}
                  columns={[
                    { key: 'e', header: 'Engagement', cell: d => `${d.engagement_reference} #${d.sequence}` },
                    { key: 'k', header: 'Kind', cell: d => d.kind === 'SNAPSHOT' ? 'scheduled snapshot' : 'answer to an auditor request' },
                    { key: 'c', header: 'Categories', cell: d => `${d.categories.map(c => c.replaceAll('_', ' ').toLowerCase()).join(', ')} (${d.entries} entries)` },
                    { key: 's', header: 'Outcome', cell: d => `${d.state.toLowerCase()} · ${formatTime(d.generated_at)}` },
                    { key: 'h', header: 'Digest', cell: d => `${d.digest.slice(0, 12)}…` },
                  ]} />
                <DataTable caption="Sealed audit packages approved to leave"
                  rows={data.audit_packages} rowKey={p => p.package_id}
                  columns={[
                    { key: 'e', header: 'Engagement', cell: p => <span className="cell-primary">{p.engagement_reference}<span className="cell-sub">{p.firm_name}</span></span> },
                    { key: 's', header: 'State', cell: p => `${p.state.toLowerCase()} · ${p.items} item(s), ${p.personal_data_items} with personal data` },
                    { key: 'a', header: 'Approved', cell: p => `${formatTime(p.approved_at)} by ${shortId(p.approved_by)}` },
                    { key: 'x', header: 'How it left', cell: p => [p.exports.length ? `exported as a file ${p.exports.length} time(s)` : null,
                      ...p.channel_submissions.map(x => `sent over the audit channel: ${x.state.toLowerCase()}`)].filter(Boolean).join('; ') || 'not yet taken out' },
                  ]} />
              </>)}
            </Section>

            <Section title="What does not happen">
              {/* Stated as four flat facts rather than reassurance. Each is a
                  structural literal in the contract and cannot be set false. */}
              <ul>
                <li>No telemetry is collected automatically. Everything above required a person to approve it; audit evidence is sent only under a mandate an approver signed.</li>
                <li>No employee activity is tracked. Nothing disclosed names, counts or measures a person.</li>
                <li>The absence of a model is never raised as an incident. This build has no model, and that is a property of the product rather than something that happened here.</li>
                <li>This page states what was disclosed, not what the vendor holds. That is not something this product can see, and no field here claims otherwise.</li>
              </ul>
            </Section>

            <NoticeBox tone="info" title="What this page can and cannot tell you">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
            <p className="cell-sub">Evaluated {formatTime(data.as_of)} on profile {data.profile}.</p>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
