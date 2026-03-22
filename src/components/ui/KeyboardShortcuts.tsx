'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S - trigger save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const saveBtn = document.querySelector('button[data-shortcut="save"]') as HTMLButtonElement;
        if (saveBtn && !saveBtn.disabled) saveBtn.click();
      }

      // Ctrl+N or Cmd+N - trigger new/create
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const newBtn = document.querySelector('button[data-shortcut="new"]') as HTMLButtonElement;
        if (newBtn) newBtn.click();
      }

      // Escape - close modals
      if (e.key === 'Escape') {
        const closeBtn = document.querySelector('[data-shortcut="close-modal"]') as HTMLButtonElement;
        if (closeBtn) closeBtn.click();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pathname, router]);

  return null;
}
