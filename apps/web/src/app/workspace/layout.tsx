'use client';
import type { ReactNode } from 'react';
import { WorkspaceShell } from '../../components/shared/shell.tsx';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
