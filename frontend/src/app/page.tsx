import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { configuredKind } from '@orvia/backend';

export const metadata = { title: 'ORVIA — synthetic test environment' };

const STAGES = [
  ['Purpose', 'What processing is being controlled, and under what authority.'],
  ['Consent', 'A purpose-specific decision the person can change at any time.'],
  ['Workflow', 'The durable operational work that decision creates.'],
  ['System action', 'The restriction ORVIA requests in the connected system.'],
  ['Independent verification', 'ORVIA reads the target itself. An acknowledgement is not a verification.'],
  ['Evidence', 'What happened, what was observed, and what is still unresolved.'],
  ['Regression test', 'Whether the control still works — including when it is deliberately broken.'],
] as const;

export default async function EntryPage() {
  // The vendor installation's entry is its vendor area; a customer installation keeps this page.
  await connection();
  if (configuredKind() === 'VENDOR_SERVICE') redirect('/vendor');
  return (
    <main className="landing">
      <div className="environment-banner" style={{ marginBottom: 32, borderRadius: 8 }}>
        <strong>Synthetic test environment</strong>
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
        <div className="section-head"><h3>How this test environment handles a decision</h3></div>
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

      <section className="section" aria-label="Staff workspace">
        <div className="section-head"><h3>Staff workspace</h3></div>
        <a className="entry-card" href="/workspace">
          <h2>Open the staff workspace</h2>
          <p>
            Every ORVIA module your plan includes: purposes and reviewed policies, people and target mappings, consent records,
            privacy requests, the Privacy Centre, workflows with their independent verification, evidence and the Test Lab.
          </p>
          <p style={{ marginBottom: 0, color: 'var(--accent)', fontWeight: 600, fontSize: 13.5 }}>Open the staff workspace →</p>
        </a>
        <p className="muted" style={{ marginTop: 'var(--s4)' }}>
          <a href="/workspace/sign-in">Staff sign in</a>. Your customers do not start here: they use your own website or app, or, if you
          turn it on in the Privacy Centre module, the Privacy Centre link you publish there.
        </p>
      </section>

      <p className="muted">
        Customer-local evaluation build using synthetic records. No hosted model, analytics, remote font or third-party script is used.
        Application acceptance remains unverified.
      </p>
    </main>
  );
}
