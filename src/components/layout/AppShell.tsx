'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300' : ''}
        ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <Sidebar onNavigate={() => isMobile && setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isMobile={isMobile} />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
