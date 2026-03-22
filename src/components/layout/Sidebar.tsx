'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, PieChart, Calculator, Table2, FileText, FilePlus,
  CheckSquare, CreditCard, Users, BarChart3, TrendingUp,
  Shield, Settings, GraduationCap, ChevronDown, BookOpen,
  Receipt, Landmark, FileSpreadsheet, Building2, DollarSign,
  UserCheck, Clock, Layers
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string; href?: string; icon?: typeof LayoutDashboard;
  type?: string; children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: 'Finance Dashboard', href: '/finance-dashboard', icon: LayoutDashboard },
  { label: 'Budget Dashboard', href: '/budget-dashboard', icon: PieChart },
  { type: 'divider', label: 'BUDGET MANAGEMENT' },
  { label: 'Budget Planning', href: '/budget-planning', icon: Calculator },
  { label: 'Budget Allocation', href: '/budget-allocation', icon: Table2 },
  { type: 'divider', label: 'DISBURSEMENTS' },
  { label: 'All Requests', href: '/disbursements', icon: FileText },
  { label: 'New Request', href: '/disbursements/create', icon: FilePlus },
  { label: 'Approval Queue', href: '/approval-queue', icon: CheckSquare },
  { label: 'Payments', href: '/payment-processing', icon: CreditCard },
  { type: 'divider', label: 'ACCOUNTING' },
  { label: 'Accounting Home', href: '/accounting/dashboard', icon: BookOpen },
  {
    label: 'General Ledger', icon: Layers,
    children: [
      { label: 'Chart of Accounts', href: '/accounting/chart-of-accounts' },
      { label: 'Journal Entries', href: '/accounting/journal-entries' },
      { label: 'Recurring Journals', href: '/accounting/recurring-journals' },
      { label: 'Ledger Inquiry', href: '/accounting/ledger-inquiry' },
    ],
  },
  {
    label: 'Accounts Payable', icon: Building2,
    children: [
      { label: 'Bills', href: '/accounting/ap/bills' },
      { label: 'Supplier Payments', href: '/accounting/ap/payments' },
      { label: 'AP Aging', href: '/accounting/ap/aging' },
    ],
  },
  {
    label: 'Accounts Receivable', icon: UserCheck,
    children: [
      { label: 'Customers', href: '/accounting/ar/customers' },
      { label: 'Invoices', href: '/accounting/ar/invoices' },
      { label: 'Collections', href: '/accounting/ar/collections' },
      { label: 'AR Aging', href: '/accounting/ar/aging' },
      { label: 'Statement of Account', href: '/accounting/ar/soa' },
    ],
  },
  { label: 'Period Closing', href: '/accounting/period-closing', icon: Clock },
  { type: 'divider', label: 'MANAGEMENT' },
  { label: 'Vendors / Payees', href: '/vendors', icon: Users },
  { type: 'divider', label: 'REPORTS' },
  {
    label: 'Disbursement Reports', icon: FileSpreadsheet,
    children: [
      { label: 'Budget vs Actual', href: '/reports/budget-vs-actual' },
      { label: 'Monthly Variance', href: '/reports/monthly-variance' },
    ],
  },
  {
    label: 'Accounting Reports', icon: BarChart3,
    children: [
      { label: 'Trial Balance', href: '/reports/accounting/trial-balance' },
      { label: 'Balance Sheet', href: '/reports/accounting/balance-sheet' },
      { label: 'Income Statement', href: '/reports/accounting/income-statement' },
      { label: 'Cash Flow Statement', href: '/reports/accounting/cash-flow' },
      { label: 'General Ledger', href: '/reports/accounting/general-ledger' },
      { label: 'Subsidiary Ledger', href: '/reports/accounting/subsidiary-ledger' },
      { label: 'Journal Entries', href: '/reports/accounting/journal-entries' },
      { label: 'Schedule of Expenses', href: '/reports/accounting/expense-schedule' },
      { label: 'AP Aging', href: '/reports/accounting/ap-aging' },
      { label: 'AR Aging', href: '/reports/accounting/ar-aging' },
    ],
  },
  {
    label: 'BIR & Tax Reports', icon: Landmark,
    children: [
      { label: 'BIR Financial Reports', href: '/reports/tax/bir-reports' },
      { label: 'Tax Reports', href: '/reports/tax/tax-summary' },
    ],
  },
  { type: 'divider', label: 'SYSTEM' },
  { label: 'Audit Trail', href: '/audit-trail', icon: Shield },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navItems.forEach(item => {
      if (item.children?.some(c => pathname.startsWith(c.href))) init[item.label] = true;
    });
    return init;
  });

  return (
    <aside className="w-64 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
      <div className="p-4 flex items-center gap-3 border-b border-white/10">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold truncate">ORANGEAPPS</h1>
          <p className="text-[10px] text-gray-400">ERP</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if (item.type === 'divider') return (
            <div key={i} className="pt-4 pb-1 px-3">
              <span className="text-[10px] font-semibold text-gray-500 tracking-wider">{item.label}</span>
            </div>
          );
          if (item.children) {
            const Icon = item.icon!;
            const isExpanded = expanded[item.label];
            const hasActive = item.children.some(c => pathname.startsWith(c.href));
            return (
              <div key={item.label}>
                <button onClick={() => setExpanded(p => ({...p, [item.label]: !p[item.label]}))}
                  className={`sidebar-link w-full justify-between ${hasActive ? 'text-white' : 'text-gray-300'}`}>
                  <div className="flex items-center gap-3"><Icon size={18} className="flex-shrink-0" /><span className="truncate text-sm">{item.label}</span></div>
                  <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && (
                  <div className="ml-7 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                    {item.children.map(child => (
                      <Link key={child.href} href={child.href} onClick={onNavigate}
                        className={`block px-2 py-1.5 rounded text-xs transition-colors ${pathname === child.href ? 'text-white bg-white/10 font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          const Icon = item.icon!;
          return (
            <Link key={item.href} href={item.href!} onClick={onNavigate}
              className={`sidebar-link ${pathname === item.href ? 'active' : 'text-gray-300'}`}>
              <Icon size={18} className="flex-shrink-0" /><span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
