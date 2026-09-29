import type { ReactNode } from 'react';
import { PrivacyShell } from '../../components/shared/shell.tsx';
import { requireKind } from '../../lib/installation.ts';

export default async function PrivacyLayout({ children }: { children: ReactNode }) {
  await requireKind('CUSTOMER_INSTALLATION');
  return <PrivacyShell>{children}</PrivacyShell>;
}
