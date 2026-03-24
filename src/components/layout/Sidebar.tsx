'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, PieChart, Calculator, Table2, TrendingUp, BarChart2,
  FileText, FilePlus, CheckSquare, CreditCard, Users, BarChart3,
  Shield, Settings, GraduationCap, ChevronDown, ChevronRight, BookOpen,
  Landmark, FileSpreadsheet, Building2, UserCheck, Layers, Receipt,
  Wallet, ClipboardCheck, Clock, CircleDollarSign, BookMarked,
  ListChecks, FileCheck, BadgeDollarSign, Scale, Banknote,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────
type NavChild = {
  label: string;
  href: string;
  badge?: number;
};

type NavCollapsible = {
  kind: 'collapsible';
  label: string;
  icon: typeof LayoutDashboard;
  children: NavChild[];
};

type NavLink = {
  kind: 'link';
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
};

type NavSection = {
  kind: 'section';
  label: string;
};

type NavItem = NavSection | NavLink | NavCollapsible;

// ─── Navigation Structure ───────────────────────────────────
const navItems: NavItem[] = [
  // ───── OVERVIEW ─────
  { kind: 'section', label: 'OVERVIEW' },
  { kind: 'link', label: 'Finance Dashboard', href: '/finance-dashboard', icon: LayoutDashboard },
  { kind: 'link', label: 'Accounting Home', href: '/accounting/dashboard', icon: BookOpen },

  // ───── BUDGET MANAGEMENT ─────
  { kind: 'section', label: 'BUDGET MANAGEMENT' },
  { kind: 'link', label: 'Budget Dashboard', href: '/budget-dashboard', icon: PieChart },
  { kind: 'link', label: 'Budget Planning', href: '/budget-planning', icon: Calculator },
  { kind: 'link', label: 'Budget Allocation', href: '/budget-allocation', icon: Table2 },
  {
    kind: 'collapsible', label: 'Budget Analysis', icon: BarChart2,
    children: [
      { label: 'Budget vs Actual', href: '/reports/budget-vs-actual' },
      { label: 'Monthly Variance', href: '/reports/monthly-variance' },
    ],
  },

  // ───── ACCOUNTS PAYABLE ─────
  { kind: 'section', label: 'ACCOUNTS PAYABLE' },
  {
    kind: 'collapsible', label: 'Bills & Disbursements', icon: FileText,
    children: [
      { label: 'Supplier Bills', href: '/accounting/ap/bills' },
      { label: 'Disbursement Requests', href: '/disbursements' },
      { label: 'Create Request', href: '/disbursements/create' },
      { label: 'Approval Queue', href: '/approval-queue' },
      { label: 'Payment Processing', href: '/payment-processing' },
    ],
  },
  { kind: 'link', label: 'Vendors / Payees', href: '/vendors', icon: Building2 },
  {
    kind: 'collapsible', label: 'AP Payments', icon: Wallet,
    children: [
      { label: 'Supplier Payments', href: '/accounting/ap/payments' },
      { label: 'AP Aging', href: '/accounting/ap/aging' },
    ],
  },

  // ───── ACCOUNTS RECEIVABLE ─────
  { kind: 'section', label: 'ACCOUNTS RECEIVABLE' },
  {
    kind: 'collapsible', label: 'Billing & Collections', icon: Receipt,
    children: [
      { label: 'Invoices / Charges', href: '/accounting/ar/invoices' },
      { label: 'Collections / Receipts', href: '/accounting/ar/collections' },
    ],
  },
  { kind: 'link', label: 'Customers / Students', href: '/accounting/ar/customers', icon: UserCheck },
  { kind: 'link', label: 'AR Aging', href: '/accounting/ar/aging', icon: Clock },
  { kind: 'link', label: 'Statement of Account', href: '/accounting/ar/soa', icon: FileCheck },

  // ───── GENERAL LEDGER ─────
  { kind: 'section', label: 'GENERAL LEDGER' },
  { kind: 'link', label: 'Chart of Accounts', href: '/accounting/chart-of-accounts', icon: BookMarked },
  { kind: 'link', label: 'Journal Entries', href: '/accounting/journal-entries', icon: ListChecks },
  { kind: 'link', label: 'Recurring Journals', href: '/accounting/recurring-journals', icon: ClipboardCheck },
  { kind: 'link', label: 'Ledger Inquiry', href: '/accounting/ledger-inquiry', icon: Layers },
  { kind: 'link', label: 'Trial Balance', href: '/reports/accounting/trial-balance', icon: Scale },
  { kind: 'link', label: 'Period Closing', href: '/accounting/period-closing', icon: CheckSquare },
  {
    kind: 'collapsible', label: 'Bank Reconciliation', icon: Banknote,
    children: [
      { label: 'Bank Accounts', href: '/accounting/bank/accounts' },
      { label: 'Statements', href: '/accounting/bank/statements' },
    ],
  },

  // ───── REPORTS ─────
  { kind: 'section', label: 'REPORTS' },
  {
    kind: 'collapsible', label: 'Financial Statements', icon: BarChart3,
    children: [
      { label: 'Balance Sheet', href: '/reports/accounting/balance-sheet' },
      { label: 'Income Statement', href: '/reports/accounting/income-statement' },
      { label: 'Cash Flow Statement', href: '/reports/accounting/cash-flow' },
      { label: 'General Ledger Report', href: '/reports/accounting/general-ledger' },
      { label: 'Journal Entries Report', href: '/reports/accounting/journal-entries' },
      { label: 'Schedule of Expenses', href: '/reports/accounting/expense-schedule' },
    ],
  },
  {
    kind: 'collapsible', label: 'Aging Reports', icon: FileSpreadsheet,
    children: [
      { label: 'AP Aging Report', href: '/reports/accounting/ap-aging' },
      { label: 'AR Aging Report', href: '/reports/accounting/ar-aging' },
      { label: 'Subsidiary Ledger', href: '/reports/accounting/subsidiary-ledger' },
    ],
  },
  {
    kind: 'collapsible', label: 'Tax & BIR', icon: Landmark,
    children: [
      { label: 'Tax Summary', href: '/reports/tax/tax-summary' },
      { label: 'BIR 2307 Forms', href: '/reports/tax/bir-2307' },
      { label: 'VAT Returns (2550M)', href: '/reports/tax/vat-tracking' },
      { label: 'WHT Remittance (1601-E)', href: '/reports/tax/bir-1601e' },
      { label: 'QAP / SAWT / Alphalist', href: '/reports/tax/alphalist' },
      { label: 'BIR Financial Reports', href: '/reports/tax/bir-reports' },
    ],
  },
  {
    kind: 'collapsible', label: 'Books of Accounts', icon: BookOpen,
    children: [
      { label: 'Special Journals', href: '/reports/tax/special-journals' },
      { label: 'Check Writer', href: '/reports/tax/check-writer' },
    ],
  },

  // ───── SYSTEM ─────
  { kind: 'section', label: 'SYSTEM' },
  { kind: 'link', label: 'Audit Trail', href: '/audit-trail', icon: Shield },
  { kind: 'link', label: 'Settings', href: '/settings', icon: Settings },
];

// ─── Sidebar Component ──────────────────────────────────────
export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  // Auto-expand groups containing the active route
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navItems.forEach(item => {
      if (item.kind === 'collapsible' && item.children.some(c => pathname.startsWith(c.href))) {
        init[item.label] = true;
      }
    });
    return init;
  });

  // Update expanded state when pathname changes (navigating via links)
  useEffect(() => {
    setExpanded(prev => {
      const next = { ...prev };
      navItems.forEach(item => {
        if (item.kind === 'collapsible' && item.children.some(c => pathname.startsWith(c.href))) {
          next[item.label] = true;
        }
      });
      return next;
    });
  }, [pathname]);

  const toggle = useCallback((label: string) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 text-gray-700 flex flex-col select-none">
      {/* ── Brand ── */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-gray-200 flex-shrink-0">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-500/20 text-white">
          <GraduationCap size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold tracking-wide truncate text-gray-900">ORANGEAPPS</h1>
          <p className="text-[9px] text-gray-400 uppercase tracking-widest">Finance ERP</p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5 scrollbar-thin">
        {navItems.map((item, idx) => {
          // ── Section Header ──
          if (item.kind === 'section') {
            return (
              <div key={idx} className={`px-3 pb-1 ${idx > 0 ? 'pt-5' : 'pt-3'}`}>
                <span className="text-[10px] font-semibold text-gray-400 tracking-[0.12em] uppercase">
                  {item.label}
                </span>
              </div>
            );
          }

          // ── Collapsible Group ──
          if (item.kind === 'collapsible') {
            const Icon = item.icon;
            const isExp = expanded[item.label] || false;
            const hasActive = item.children.some(c => isActive(c.href));
            const totalBadge = item.children.reduce((sum, c) => sum + (c.badge || 0), 0);

            return (
              <div key={item.label}>
                <button
                  onClick={() => toggle(item.label)}
                  className={`
                    group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                    transition-all duration-150
                    ${hasActive
                      ? 'text-gray-900 bg-primary-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                  `}
                >
                  <Icon size={17} className={`flex-shrink-0 ${hasActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  <span className="flex-1 text-left truncate font-medium">{item.label}</span>
                  {totalBadge > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/90 text-white rounded-full min-w-[18px] text-center">
                      {totalBadge}
                    </span>
                  )}
                  <ChevronRight
                    size={14}
                    className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${isExp ? 'rotate-90' : ''}`}
                  />
                </button>

                {/* Submenu with smooth animation */}
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${isExp ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="ml-[22px] mt-0.5 mb-1 space-y-px border-l border-gray-200 pl-0">
                    {item.children.map(child => {
                      const active = isActive(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          className={`
                            relative flex items-center gap-2 pl-4 pr-3 py-[6px] ml-0 rounded-r-md text-[13px]
                            transition-all duration-150
                            ${active
                              ? 'text-primary-700 bg-primary-50 font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-primary-500 before:rounded-full'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                          `}
                        >
                          <span className="truncate">{child.label}</span>
                          {child.badge && child.badge > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/90 text-white rounded-full min-w-[16px] text-center ml-auto flex-shrink-0">
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          // ── Direct Link ──
          if (item.kind === 'link') {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`
                  group flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                  transition-all duration-150
                  ${active
                    ? 'text-primary-700 bg-primary-50 font-medium shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                `}
              >
                <Icon
                  size={17}
                  className={`flex-shrink-0 ${active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`}
                />
                <span className="truncate">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/90 text-white rounded-full min-w-[18px] text-center ml-auto flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          }

          return null;
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-gray-200 p-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white">
            RT
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-700 truncate">Roberto Tan</p>
            <p className="text-[10px] text-gray-400 truncate">Finance Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
