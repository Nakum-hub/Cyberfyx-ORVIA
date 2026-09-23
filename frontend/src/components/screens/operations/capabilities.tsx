'use client';
import programme from '../../../../../tracking/capabilities.json';
import { usePagedQuery } from '../../shared/api.ts';
import { CAPABILITY_LABELS, CAPABILITY_TEST_LABELS } from '../../shared/state-labels.ts';
import { Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge, TechnicalDetails } from '../../shared/ui.tsx';

/* ================================================================== *
 * Capability register
 * ================================================================== */

export function Capabilities() {
  const query = usePagedQuery('capabilities', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="About this build"
        title="Capabilities & roadmap"
        lede="The programme register retains all 33 master modules. Target depth is a plan, not evidence of implementation, entitlement or successful testing."
      />
      <NoticeBox tone="info" title="How to read this register"><p>{programme.note}</p></NoticeBox>
      <Section title="Programme modules">
        {programme.capabilities.map(capability => (
          <article className="panel" key={capability.module_id}>
            <div className="row row-between" style={{ marginBottom: 'var(--s3)' }}>
              <h4 style={{ margin: 0, fontSize: 15 }}>{capability.module_id} — {capability.name}</h4>
              <div className="row">
                <StateBadge dictionary={CAPABILITY_LABELS} value={capability.implementation_status} />
                <StateBadge dictionary={CAPABILITY_TEST_LABELS} value={capability.test_status} />
              </div>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>{capability.target_product} · target depth {capability.target_depth} · {capability.sprint_priority}</p>
            <p>{capability.limitation}</p>
            {capability.evidence.length
              ? <><p style={{ marginBottom: 4 }}>Covering suites and specs:</p><ul style={{ margin: 0 }}>{capability.evidence.map(item => <li key={item}><code>{item}</code></li>)}</ul></>
              : <p>Evidence: none recorded in the programme register.</p>}
            <TechnicalDetails items={[
              { term: 'Implementation', value: capability.implementation_status },
              { term: 'Tests', value: capability.test_status },
              { term: 'Enabled', value: capability.enabled_state },
              { term: 'Profile', value: capability.supported_profile },
              { term: 'Entitlement', value: capability.edition_entitlement },
            ]} />
          </article>
        ))}
      </Section>
      <Section title="Runtime connector records" aside="This covers the synthetic connector subset, not the module register above.">
        <Freshness query={query} />
        <QueryBoundary query={query} label="runtime capabilities" isEmpty={data => !data.items.length}>
          {data => data.items.map(record => (
            <article className="panel" key={record.code}>
              <h4 style={{ marginTop: 0 }}>{record.code}</h4>
              <p className="muted" style={{ fontSize: 13 }}>{record.target_release} · {record.implementation_status} · test {record.test_status} · {record.supported_profile}</p>
              <ul style={{ margin: 0 }}>{record.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </article>
          ))}
        </QueryBoundary>
        <Pagination query={query} />
      </Section>
    </>
  );
}
