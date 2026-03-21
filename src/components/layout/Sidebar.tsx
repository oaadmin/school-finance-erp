'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, PieChart, Calculator, Table2, FileText, FilePlus,
  CheckSquare, CreditCard, Users, BarChart3, TrendingUp,
  Shield, Settings, GraduationCap
} from 'lucide-react';

const navItems = [
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
  { type: 'divider', label: 'MANAGEMENT' },
  { label: 'Vendors / Payees', href: '/vendors', icon: Users },
  { type: 'divider', label: 'REPORTS' },
  { label: 'Budget vs Actual', href: '/reports/budget-vs-actual', icon: BarChart3 },
  { label: 'Monthly Variance', href: '/reports/monthly-variance', icon: TrendingUp },
  { type: 'divider', label: 'SYSTEM' },
  { label: 'Audit Trail', href: '/audit-trail', icon: Shield },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
      <div className="p-4 flex items-center gap-3 border-b border-white/10">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold truncate">School Finance</h1>
          <p className="text-[10px] text-gray-400">ERP System</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if (item.type === 'divider') {
            return (
              <div key={i} className="pt-4 pb-1 px-3">
                <span className="text-[10px] font-semibold text-gray-500 tracking-wider">{item.label}</span>
              </div>
            );
          }
          const Icon = item.icon!;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={onNavigate}
              className={`sidebar-link ${isActive ? 'active' : 'text-gray-300'}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
