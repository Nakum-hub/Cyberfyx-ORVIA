export const metadata = { title: 'ORVIA — synthetic prototype' };

const STAGES = [
  ['Purpose', 'What processing is being controlled, and under what authority.'],
  ['Consent', 'A purpose-specific decision the person can change at any time.'],
  ['Workflow', 'The durable operational work that decision creates.'],
  ['System action', 'The restriction ORVIA requests in the connected system.'],
  ['Independent verification', 'ORVIA reads the target itself. An acknowledgement is not a verification.'],
  ['Evidence', 'What happened, what was observed, and what is still unresolved.'],
  ['Regression test', 'Whether the control still works — including when it is deliberately broken.'],
] as const;

export default function EntryPage() {
  return (
    <main className="landing">
      <div className="demo-banner" style={{ marginBottom: 32, borderRadius: 8 }}>
        <strong>Synthetic demonstration</strong>
        <span className="meta">Fictional Aster and Birch data only · customer-local · no hosted model, analytics or third-party script</span>
      </div>

      <div className="entry-hero">
        <p className="wordmark">ORVIA</p>
        <h1>Privacy decisions that are carried out, verified and proven.</h1>
        <p className="lede">
          ORVIA turns a person&apos;s purpose-specific privacy decision into operational work, changes the
          connected system, independently checks whether the change actually took effect, and keeps the evidence —
          including the parts that did not resolve.
        </p>
      </div>

      <section className="section" aria-label="What ORVIA does" style={{ marginTop: 'var(--s7)' }}>
        <div className="section-head"><h3>What this prototype does end to end</h3></div>
        <ol className="lifecycle">
          {STAGES.map(([name, note], index) => (
            <li key={name}>
              <span className="stage-static">
                <span className="step">{index + 1}</span>
                <span className="stage-name">{name}</span>
                <span className="stage-note">{note}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" aria-label="Journeys">
        <div className="section-head"><h3>Two separate journeys, two separate authentication domains</h3></div>
        <div className="grid-2">
          <a className="entry-card" href="/workspace">
            <h2>Staff workspace</h2>
            <p>
              Purposes and reviewed policies, people and target mappings, the control map, workflows with their
              independent verification, evidence, and the Test Lab.
            </p>
            <p style={{ marginBottom: 0, color: 'var(--accent)', fontWeight: 600, fontSize: 13.5 }}>Open the staff workspace →</p>
          </a>
          <a className="entry-card" href="/privacy">
            <h2>Privacy Centre</h2>
            <p>
              What a data principal sees: their own notice, their current choice, their receipts and their full
              decision history — and the ability to grant or withdraw at any time.
            </p>
            <p style={{ marginBottom: 0, color: 'var(--accent)', fontWeight: 600, fontSize: 13.5 }}>Open the Privacy Centre →</p>
          </a>
        </div>
        <p className="muted" style={{ marginTop: 'var(--s4)' }}>
          Use a separate browser context for each: two active sessions in one browser are refused by the server.
          {' '}<a href="/workspace/sign-in">Staff sign in</a> · <a href="/privacy/sign-in">Data principal sign in</a>
        </p>
      </section>

      <p className="muted">
        Customer-local prototype. No hosted model, analytics, remote font or third-party script is used, and
        operational data stays inside this profile. Component suites pass at this candidate; that is engineering
        evidence, not canonical acceptance.
      </p>
    </main>
  );
}
