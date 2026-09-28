import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { configuredKind, type InstallationKind } from '@orvia/backend';

/**
 * Server-side page gate (revision 1.5 addendum). A page tree exists only on its
 * own installation kind; on the other kind it is a plain 404. Evaluated per
 * request, never at build time, because the same build serves both kinds.
 */
export async function requireKind(kind: InstallationKind) {
  await connection();
  if (configuredKind() !== kind) notFound();
}
