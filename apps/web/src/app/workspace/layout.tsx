'use client';
import type { ReactNode } from 'react';
import { WorkspaceShell } from '../../components/shell.tsx';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
