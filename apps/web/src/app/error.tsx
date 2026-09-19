'use client';
import { useEffect } from 'react';
import { RouteFallback } from '../components/shared/fallback.tsx';

/**
 * Uncaught render error inside the application shell. The error's own message,
 * stack and cause are never displayed: only the framework digest, which is an
 * opaque correlation value and carries no product data. No outcome is implied —
 * an interrupted render says nothing about whether a submitted request was
 * applied, so the copy directs the operator to read authoritative state rather
 * than to resubmit.
 */
export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { globalThis.console.error('orvia-render-error', error.digest ?? 'no-digest'); }, [error]);
  return (
    <RouteFallback
      title="This screen could not be displayed"
      kind={`interface render error${error.digest ? ` · digest ${error.digest}` : ''}`}
      actions={<p><button type="button" className="primary" onClick={reset}>Try rendering this screen again</button></p>}
    >
      <p>
        The interface failed while building this screen. Nothing here reports a server outcome: if you had just
        submitted something, this screen does not tell you whether it was applied.
      </p>
      <p>
        Read the authoritative state for that record before deciding again, and do not assume the request failed.
      </p>
    </RouteFallback>
  );
}
