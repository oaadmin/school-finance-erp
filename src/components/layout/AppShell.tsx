'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Standalone pages that render without the AppShell chrome
  if (pathname.startsWith('/api-docs')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed on desktop (always visible), slide-in on mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-50
        transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main content - offset by sidebar width on desktop */}
      <div className="flex flex-col min-h-screen lg:ml-64">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
