'use client';
import type { ReactNode } from 'react';
import { PrivacyShell } from '../../components/shell.tsx';

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return <PrivacyShell>{children}</PrivacyShell>;
}
