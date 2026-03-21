import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'School Finance ERP - Disbursements & Budget Management',
  description: 'Complete finance management system for educational institutions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
