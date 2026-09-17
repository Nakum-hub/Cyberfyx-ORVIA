export const metadata = { title: 'ORVIA — synthetic prototype' };

export default function EntryPage() {
  return (
    <main className="landing">
      <div className="demo-banner" style={{ marginBottom: 24 }}>
        <strong>Synthetic demonstration</strong>
        <span className="meta">Fictional Aster and Birch data only</span>
      </div>
      <h1>ORVIA</h1>
      <p>
        Customer-local consent and processing prototype. Two separate journeys run in this build, each with its
        own authentication domain. Use a separate browser context for each: two active sessions in one browser
        are refused by the server.
      </p>
      <div className="panel">
        <h2>Staff workspace</h2>
        <p>Configuration, published policy versions, workflows, unresolved obligations, evidence and the Test Lab.</p>
        <p><a href="/workspace">Open the staff workspace</a> · <a href="/workspace/sign-in">Staff sign in</a></p>
      </div>
      <div className="panel">
        <h2>Privacy Centre</h2>
        <p>A data principal signs in to see their own notice, current choices, receipts and consent history, and to grant or withdraw consent.</p>
        <p><a href="/privacy">Open the Privacy Centre</a></p>
      </div>
      <p className="muted">
        No hosted model, analytics, remote font or third-party script is used. Operational data stays inside this
        customer-local profile.
      </p>
    </main>
  );
}
