import type { ReactNode } from 'react';
import { requireKind } from '../../lib/installation.ts';

/** Customer installations only (revision 1.5 addendum); a 404 on the vendor installation. */
export default async function CustomerOnlyLayout({ children }: { children: ReactNode }) {
  await requireKind('CUSTOMER_INSTALLATION');
  return children;
}
