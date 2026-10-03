import type { ReactNode } from 'react';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import './globals.css';
import { SessionProvider } from '../components/shared/session-context.tsx';

export const metadata = { title: 'Cyberfyx ORVIA — synthetic test environment', icons: { icon: '/brand/shield.png' } };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
