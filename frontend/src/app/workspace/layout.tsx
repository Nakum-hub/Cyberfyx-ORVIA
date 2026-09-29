import type { ReactNode } from 'react';
import { WorkspaceShell } from '../../components/shared/shell.tsx';
import { requireKind } from '../../lib/installation.ts';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  await requireKind('CUSTOMER_INSTALLATION');
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
