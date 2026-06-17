import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { SessionBootstrap } from '@/components/auth/SessionBootstrap';
import { CoachWidget } from '@/components/CoachWidget';
import { AuthGate } from '@/components/AuthGate';
import { Navigation } from '@/components/Navigation';
import { QueryProvider } from '@/components/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Readiness Coach',
  description:
    'India-first bilingual job readiness platform for entry-level white-collar job seekers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <SessionBootstrap />
          <Navigation />
          <AuthGate>
            <main className="has-bottom-nav md:pb-0">{children}</main>
          </AuthGate>
          <CoachWidget />
          <Toaster position="bottom-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
