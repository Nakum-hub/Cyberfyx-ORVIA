import { RouteFallback } from '../components/shared/fallback.tsx';

export const metadata = { title: 'ORVIA — page not found' };

/**
 * Unmatched application route. Next.js still answers HTTP 404, so normal
 * not-found semantics are retained; only the presentation is brought inside the
 * product shell. This is not a missing record: a record that does not exist in
 * the caller's scope is answered by the server as NOT_FOUND and rendered with
 * its request id inside the authenticated area.
 */
export default function NotFound() {
  return (
    <RouteFallback title="This page does not exist" kind="application route not found (HTTP 404)">
      <p>
        No screen is published at this address in this build. The link may be mistyped, or it may belong to a
        capability that is not part of the customer-local prototype.
      </p>
      <p>
        If you were opening a specific record, use the screen for that record type and enter its exact
        authorised identifier — a record that is missing, or outside your organisation, is reported there with a
        request id rather than as a missing page.
      </p>
    </RouteFallback>
  );
}
