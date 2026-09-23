'use client';
import { useState } from 'react';
import { ReportSectionKind } from '@orvia/contracts';
import { useQuery } from '../shared/api.ts';
import { formatTime } from '../shared/state-labels.ts';
import { Badge, FailureState, NoticeBox, PageHead, Section } from '../shared/ui.tsx';

/**
 * Reporting (§133), the print-ready surface.
 *
 * The organisation's side of this is simple: pick a period, pick what goes in,
 * print it, hand it to somebody. The product's side is making sure that what
 * gets handed over cannot mislead the person who receives it, who did not
 * assemble it and cannot see what was left out.
 *
 * So the cover always names every section that exists and is not in the report,
 * and says whether it was not selected or withheld because the person
 * generating it may not read that data. A report that silently shrank to fit
 * somebody's permissions would be the most dangerous thing this page could
 * produce: it would look complete.
 *
 * No PDF is generated server-side. The layout below is the PDF: `@media print`
 * drops the app chrome and the builder, keeps headings with their tables, and
 * repeats the table head across page breaks. The operator uses Print and saves
 * as PDF, which needs no library in the delivered lockfile and no network.
 */

const SECTION_LABELS: Record<string, string> = {
  PURPOSES_AND_NOTICES: 'Purposes and published notices',
  CONSENT_DECISIONS: 'Consent decisions',
  RIGHTS_REQUESTS: 'Rights requests',
  DATA_INVENTORY: 'Personal data inventory',
  COVERAGE_GAPS: 'Coverage gaps',
  PROCESSORS: 'Processors and other fiduciaries',
  INCIDENTS_AND_INTIMATIONS: 'Incidents and intimations',
  AUDIT_TRAIL: 'Audit trail',
  AUDIT_RETENTION: 'Audit retention',
  OPERATIONAL_READINESS: 'Operational readiness',
};

/** Report shapes an organisation actually asks for, rather than a blank list of
 *  ten checkboxes. Each one is still just an ordered selection of the same
 *  verified sections, so a preset cannot show anything a manual pick could not. */
const PRESETS: { id: string; label: string; purpose: string; sections: string[] }[] = [
  { id: 'full', label: 'Full privacy record', purpose: 'Everything this installation can evidence, in the order it reads as an argument.',
    sections: [...ReportSectionKind.options] },
  { id: 'board', label: 'Board or management pack', purpose: 'What is being processed, what people decided, what is not covered, and whether the installation can act.',
    sections: ['PURPOSES_AND_NOTICES', 'CONSENT_DECISIONS', 'RIGHTS_REQUESTS', 'COVERAGE_GAPS', 'OPERATIONAL_READINESS'] },
  { id: 'regulator', label: 'Response to a regulator or auditor', purpose: 'The record of notices, decisions, rights handling, incidents and the audit trail behind them.',
    sections: ['PURPOSES_AND_NOTICES', 'CONSENT_DECISIONS', 'RIGHTS_REQUESTS', 'INCIDENTS_AND_INTIMATIONS', 'AUDIT_TRAIL', 'AUDIT_RETENTION'] },
  { id: 'internal', label: 'Internal control review', purpose: 'Where the data is, who else touches it, and what is recorded as not covered or unverified.',
    sections: ['DATA_INVENTORY', 'PROCESSORS', 'COVERAGE_GAPS', 'AUDIT_RETENTION', 'OPERATIONAL_READINESS'] },
];

export function ReportsScreen() {
  const [title, setTitle] = useState('Privacy record');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [chosen, setChosen] = useState<string[]>(PRESETS[1]!.sections);
  const [live, setLive] = useState<{ title: string; from: string; to: string; sections: string } | null>(null);

  const query = useQuery('report', {
    enabled: live !== null,
    query: live
      ? { title: live.title, sections: live.sections, ...(live.from ? { from: live.from } : {}), ...(live.to ? { to: live.to } : {}) }
      : undefined,
  });

  const toggle = (kind: string) =>
    setChosen(current => (current.includes(kind) ? current.filter(k => k !== kind) : [...current, kind]));

  return (
    <>
      <div className="report-builder">
        <PageHead
          eyebrow="Evidence"
          title="Reports"
          lede="Choose a period and what goes in, then print. Whatever you leave out is named on the cover of the report itself, so the person you hand it to can see the shape of what they were given."
        />

        <Section title="What kind of report is this for?">
          <div className="preset-row">
            {PRESETS.map(preset => (
              <button key={preset.id} type="button"
                className={chosen.join(',') === preset.sections.join(',') ? 'preset chosen' : 'preset'}
                onClick={() => setChosen(preset.sections)}>
                <strong>{preset.label}</strong>
                <span className="cell-sub">{preset.purpose}</span>
              </button>
            ))}
          </div>
          <p className="cell-sub">A preset is an ordered selection of the same sections. Adjust it below; nothing a preset shows is unavailable to a manual selection.</p>
        </Section>

        <Section title="Period and title">
          <div className="inline-form">
            <label><span>Report title</span>
              <input value={title} onChange={e => setTitle(e.target.value)} minLength={3} maxLength={120} required /></label>
            <label><span>From</span><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
            <label><span>To</span><input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
          </div>
          <p className="cell-sub">Leave the dates empty for everything on record. A period narrows the sections that are about events; it does not narrow configuration.</p>
        </Section>

        <Section title="Sections">
          {ReportSectionKind.options.map(kind => (
            <label key={kind} style={{ display: 'block' }}>
              <input type="checkbox" checked={chosen.includes(kind)} onChange={() => toggle(kind)} />
              {' '}{SECTION_LABELS[kind] ?? kind}
            </label>
          ))}
          <p className="cell-sub">
            {chosen.length} of {ReportSectionKind.options.length} selected.
            {' '}The {ReportSectionKind.options.length - chosen.length} you have not selected will be named on the cover.
          </p>
          <button type="button" disabled={!chosen.length || title.length < 3}
            onClick={() => setLive({
              title, from: from ? new Date(from).toISOString() : '', to: to ? new Date(`${to}T23:59:59`).toISOString() : '',
              sections: chosen.join(','),
            })}>
            Build this report
          </button>
          {query.failure && <FailureState failure={query.failure} />}
        </Section>

        {query.data && (
          <NoticeBox tone="info" title="Ready to print">
            <p>Use your browser’s Print command and choose “Save as PDF”. The builder above is hidden in print; what follows is the report.</p>
          </NoticeBox>
        )}
      </div>

      {query.data && (
        <article className="report">
          <header className="report-cover">
            <p className="report-mark">ORVIA</p>
            <h1>{query.data.title}</h1>
            <dl className="report-facts">
              <div><dt>Organisation</dt><dd>{query.data.scope_label}</dd></div>
              <div><dt>Period</dt><dd>
                {query.data.period_from ? formatTime(query.data.period_from) : 'From the beginning of the record'}
                {' — '}
                {query.data.period_to ? formatTime(query.data.period_to) : 'up to the moment this was generated'}
              </dd></div>
              <div><dt>Generated</dt><dd>{formatTime(query.data.generated_at)}</dd></div>
              <div><dt>Profile</dt><dd>{query.data.profile}</dd></div>
              <div><dt>Content digest</dt><dd className="mono">{query.data.content_digest}</dd></div>
            </dl>

            <section className="report-statement">
              <h2>What this report is, and is not</h2>
              <p>
                Each section below is a table of what this installation recorded. None of it is an opinion about
                whether any legal obligation has been met, and there is no field in this report in which such a
                conclusion could be written.
              </p>
              <ul>{query.data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </section>

            <section className="report-statement">
              <h2>Sections not included</h2>
              {query.data.omitted.length === 0
                ? <p>Every section this installation can produce is included.</p>
                : (
                  <>
                    <p>These exist and are not in this report:</p>
                    <ul>
                      {query.data.omitted.map(item => (
                        <li key={item.kind}>
                          <strong>{SECTION_LABELS[item.kind] ?? item.kind}</strong>
                          {' — '}
                          {item.reason === 'WITHHELD_FOR_AUTHORITY'
                            ? 'withheld: the person who generated this report is not permitted to read it. It was not read, and this is not evidence that there was nothing to show.'
                            : 'not selected for this report.'}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
            </section>

            <nav className="report-contents">
              <h2>Contents</h2>
              <ol>{query.data.sections.map(s => <li key={s.kind}>{s.heading}</li>)}</ol>
            </nav>
          </header>

          {query.data.sections.map((section, index) => (
            <section key={section.kind} className="report-section">
              <h2>{index + 1}. {section.heading}</h2>
              <p className="report-covers">{section.covers}</p>
              {section.rows.length === 0 ? (
                <p className="report-empty">
                  Nothing was recorded for this section in this period.
                  {' '}This is an absence of records, not a statement that nothing happened.
                </p>
              ) : (
                <table className="report-table">
                  <thead><tr>{section.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
                  <tbody>
                    {section.rows.map((row, r) => (
                      <tr key={r}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="report-counted">{section.counted}</p>
              {section.limits.length > 0 && (
                <div className="report-limits">
                  <h3>What this section does not tell you</h3>
                  <ul>{section.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
                </div>
              )}
            </section>
          ))}

          <footer className="report-foot">
            <Badge label="Not a compliance certificate" tone="neutral"
              meaning="This report records what the installation holds. It makes no statement about whether any legal obligation has been met." />
            <p className="cell-sub">
              {query.data.title} · {query.data.scope_label} · generated {formatTime(query.data.generated_at)} ·
              digest {query.data.content_digest.slice(0, 16)}…
            </p>
          </footer>
        </article>
      )}
    </>
  );
}
