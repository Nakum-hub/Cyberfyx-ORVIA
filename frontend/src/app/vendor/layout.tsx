import type { ReactNode } from 'react';
import { VendorShell } from '../../components/vendor/vendor.tsx';
import { requireKind } from '../../lib/installation.ts';

export const metadata = { title: 'ORVIA — vendor & audit' };

/** The vendor area exists only on the vendor's VENDOR_SERVICE installation; on a customer installation every /vendor page is a 404. */
export default async function VendorLayout({ children }: { children: ReactNode }) {
  await requireKind('VENDOR_SERVICE');
  return <VendorShell>{children}</VendorShell>;
}
