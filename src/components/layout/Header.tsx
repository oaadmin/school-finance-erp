'use client';

import { Bell, Search, User, ChevronDown, Menu, X, FileText, AlertTriangle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface HeaderProps {
  onMenuToggle?: () => void;
}

// ─── Search Result Types ────────────────────────────────────
interface SearchResult {
  type: 'page' | 'vendor' | 'budget' | 'disbursement' | 'invoice' | 'bill' | 'customer';
  label: string;
  sublabel?: string;
  href: string;
  icon?: string;
}

const PAGES: SearchResult[] = [
  { type: 'page', label: 'Finance Dashboard', href: '/finance-dashboard' },
  { type: 'page', label: 'Accounting Home', href: '/accounting/dashboard' },
  { type: 'page', label: 'Budget Dashboard', href: '/budget-dashboard' },
  { type: 'page', label: 'Budget Planning', href: '/budget-planning' },
  { type: 'page', label: 'Budget Allocation', href: '/budget-allocation' },
  { type: 'page', label: 'Budget vs Actual', href: '/reports/budget-vs-actual' },
  { type: 'page', label: 'Monthly Variance', href: '/reports/monthly-variance' },
  { type: 'page', label: 'Disbursement Requests', href: '/disbursements' },
  { type: 'page', label: 'Create Disbursement', href: '/disbursements/create' },
  { type: 'page', label: 'Approval Queue', href: '/approval-queue' },
  { type: 'page', label: 'Payment Processing', href: '/payment-processing' },
  { type: 'page', label: 'Vendors / Payees', href: '/vendors' },
  { type: 'page', label: 'Chart of Accounts', href: '/accounting/chart-of-accounts' },
  { type: 'page', label: 'Journal Entries', href: '/accounting/journal-entries' },
  { type: 'page', label: 'Ledger Inquiry', href: '/accounting/ledger-inquiry' },
  { type: 'page', label: 'Trial Balance', href: '/reports/accounting/trial-balance' },
  { type: 'page', label: 'Balance Sheet', href: '/reports/accounting/balance-sheet' },
  { type: 'page', label: 'Income Statement', href: '/reports/accounting/income-statement' },
  { type: 'page', label: 'Cash Flow Statement', href: '/reports/accounting/cash-flow' },
  { type: 'page', label: 'Supplier Bills', href: '/accounting/ap/bills' },
  { type: 'page', label: 'AP Aging', href: '/accounting/ap/aging' },
  { type: 'page', label: 'AR Invoices', href: '/accounting/ar/invoices' },
  { type: 'page', label: 'AR Collections', href: '/accounting/ar/collections' },
  { type: 'page', label: 'Customers / Students', href: '/accounting/ar/customers' },
  { type: 'page', label: 'AR Aging', href: '/accounting/ar/aging' },
  { type: 'page', label: 'Statement of Account', href: '/accounting/ar/soa' },
  { type: 'page', label: 'Period Closing', href: '/accounting/period-closing' },
  { type: 'page', label: 'Bank Accounts', href: '/accounting/bank/accounts' },
  { type: 'page', label: 'Bank Statements', href: '/accounting/bank/statements' },
  { type: 'page', label: 'BIR 2307 Forms', href: '/reports/tax/bir-2307' },
  { type: 'page', label: 'VAT Tracking', href: '/reports/tax/vat-tracking' },
  { type: 'page', label: 'Tax Summary', href: '/reports/tax/tax-summary' },
  { type: 'page', label: 'Audit Trail', href: '/audit-trail' },
  { type: 'page', label: 'Settings', href: '/settings' },
  { type: 'page', label: 'API Documentation', href: '/api-docs' },
];

// ─── Notification Types ─────────────────────────────────────
interface Notification {
  id: string;
  type: 'approval' | 'overdue' | 'info' | 'success';
  title: string;
  message: string;
  href?: string;
  time: string;
  read: boolean;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load notifications from API
  useEffect(() => {
    async function loadNotifications() {
      try {
        // Fetch pending approvals
        const appRes = await fetch('/api/approvals');
        const approvals = await appRes.json();

        // Fetch AR aging for overdue
        const arRes = await fetch('/api/accounting/ar?type=aging');
        const aging = await arRes.json();

        const notifs: Notification[] = [];

        // Pending approval notifications
        if (Array.isArray(approvals)) {
          approvals.slice(0, 5).forEach((a: Record<string, unknown>, i: number) => {
            notifs.push({
              id: `appr-${i}`,
              type: 'approval',
              title: 'Pending Approval',
              message: `${a.request_number} — ${formatCurrency(a.amount as number)} from ${a.department_name}`,
              href: `/disbursements/${a.id}`,
              time: 'Awaiting action',
              read: false,
            });
          });
        }

        // Overdue AR notifications
        if (Array.isArray(aging)) {
          aging.filter((a: Record<string, number>) => a.over_90 > 0).slice(0, 3).forEach((a: Record<string, unknown>, i: number) => {
            notifs.push({
              id: `ar-${i}`,
              type: 'overdue',
              title: 'Overdue Receivable',
              message: `${a.customer_name} owes ${formatCurrency(a.total as number)} (90+ days)`,
              href: '/accounting/ar/aging',
              time: 'Over 90 days',
              read: false,
            });
          });
        }

        // System info
        notifs.push({
          id: 'sys-1',
          type: 'info',
          title: 'Period Closing Reminder',
          message: 'March 2026 period is open. Remember to close after month-end procedures.',
          href: '/accounting/period-closing',
          time: 'System',
          read: true,
        });

        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      } catch {
        // Silently fail — notifications are non-critical
      }
    }
    loadNotifications();
  }, []);

  // Search handler
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const pageResults = PAGES.filter(p =>
      p.label.toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(pageResults);
    setShowSearch(true);
  }, []);

  // Keyboard shortcut: Ctrl+K or / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const notifIcon = (type: string) => {
    switch (type) {
      case 'approval': return <Clock size={16} className="text-amber-500" />;
      case 'overdue': return <AlertTriangle size={16} className="text-red-500" />;
      case 'success': return <CheckCircle size={16} className="text-green-500" />;
      default: return <FileText size={16} className="text-blue-500" />;
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-4 flex-1">
        <button onClick={onMenuToggle} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg lg:hidden">
          <Menu size={20} />
        </button>

        {/* ── Search Bar ── */}
        <div ref={searchRef} className="relative flex-1 max-w-md hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => { if (searchQuery) setShowSearch(true); }}
            placeholder="Search pages, reports... (Ctrl+K)"
            className="w-full pl-9 pr-10 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}

          {/* Search Results Dropdown */}
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <Link
                    key={i}
                    href={r.href}
                    onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.label}</p>
                      <p className="text-[11px] text-gray-400 truncate">{r.href}</p>
                    </div>
                    <ExternalLink size={12} className="text-gray-300 flex-shrink-0" />
                  </Link>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                <span className="text-[10px] text-gray-400">Press Enter to navigate • Esc to close</span>
              </div>
            </div>
          )}

          {showSearch && searchQuery && searchResults.length === 0 && (
            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-6 text-center">
              <Search size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No results for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs text-gray-400 mt-1">Try searching for pages like &ldquo;trial balance&rdquo; or &ldquo;vendors&rdquo;</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded hidden sm:inline">SY 2025-2026</span>

        {/* ── Notification Bell ── */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No notifications</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <Link
                      key={n.id}
                      href={n.href || '#'}
                      onClick={() => setShowNotifications(false)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="mt-0.5 flex-shrink-0">{notifIcon(n.type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />}
                    </Link>
                  ))
                )}
              </div>
              <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50">
                <Link href="/audit-trail" onClick={() => setShowNotifications(false)} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1">
                  View All Activity <ExternalLink size={10} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── User Menu ── */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100"
          >
            <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-gray-700">Roberto Tan</p>
              <p className="text-[10px] text-gray-500">Finance Manager</p>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden md:block" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Profile</a>
              <a href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Settings</a>
              <a href="/api-docs" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">API Docs</a>
              <hr className="my-1" />
              <a href="#" className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-50">Sign Out</a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
