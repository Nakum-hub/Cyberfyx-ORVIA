import type { ReactNode } from 'react';

/**
 * Branded shell for route-level outcomes that happen outside an authenticated
 * area: an unmatched URL and an uncaught render error. Both keep the synthetic
 * banner and offer a route back, and neither displays a stack trace, an error
 * message from the server or any identifier belonging to a record.
 *
 * Record-level outcomes are deliberately not handled here: a missing record
 * (NOT_FOUND) and a malformed identifier (VALIDATION_ERROR) are answered by the
 * server inside the authenticated area and rendered by FailureState, so they
 * keep their own distinct meanings and their request id.
 */
export function RouteFallback({ title, kind, children, actions }: {
  title: string; kind: string; children: ReactNode; actions?: ReactNode;
}) {
  return (
    <main className="landing" id="main" tabIndex={-1}>
      <div className="demo-banner" style={{ marginBottom: 24 }}>
        <strong>Synthetic demonstration</strong>
        <span className="meta">Fictional Aster and Birch data only</span>
      </div>
      <h1>ORVIA</h1>
      <div className="panel">
        <h2>{title}</h2>
        <p className="muted mono">{kind}</p>
        {children}
        <p>
          <a href="/">Return to the ORVIA entry page</a> · <a href="/workspace">Staff workspace</a> · <a href="/privacy">Privacy Centre</a>
        </p>
        {actions}
      </div>
      <p className="muted">
        Customer-local prototype on fictional Aster/Birch data. No production system, real recipient or vendor
        service is contacted from this interface.
      </p>
    </main>
  );
}
