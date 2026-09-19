import type { ReactNode } from 'react';
import './globals.css';
import { SessionProvider } from '../components/shared/session-context.tsx';

export const metadata = { title: 'ORVIA — synthetic prototype' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
