'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import Link from 'next/link';
import {
  DollarSign, TrendingUp, TrendingDown, Landmark, AlertTriangle, Clock,
  FileText, Receipt, CreditCard, BarChart3, ArrowRight, Plus, Banknote,
} from 'lucide-react';

interface DashboardData {
  totalReceivables: number;
  totalPayables: number;
  cashBalance: number;
  currentMonth: { revenue: number; expenses: number; netIncome: number };
  recentJournalEntries: Array<{ id: number; entry_number: string; entry_date: string; description: string; total_debit: number; total_credit: number; status: string }>;
  unpostedCount: number;
  arAging: { current: number; days_30: number; days_60: number; days_90: number; over_90: number };
  apAging: { current: number; days_30: number; days_60: number; days_90: number; over_90: number };
  topExpenseCategories: Array<{ category: string; amount: number }>;
  topVendors: Array<{ vendor_name: string; total_paid: number }>;
}

export default function AccountingDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/accounting/dashboard').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const statCards = [
    { label: 'Total Receivables', value: data.totalReceivables, color: 'blue', icon: TrendingUp },
    { label: 'Total Payables', value: data.totalPayables, color: 'red', icon: TrendingDown },
    { label: 'Cash & Bank', value: data.cashBalance, color: 'green', icon: Landmark },
    { label: 'Net Income', value: data.currentMonth?.netIncome || 0, color: 'purple', icon: DollarSign },
    { label: 'Month Revenue', value: data.currentMonth?.revenue || 0, color: 'teal', icon: Banknote },
    { label: 'Month Expenses', value: data.currentMonth?.expenses || 0, color: 'orange', icon: Clock },
    { label: 'Unposted Entries', value: data.unpostedCount, color: 'gray', icon: FileText, isCurrency: false },
    { label: 'Overdue AR', value: (data.arAging?.over_90 || 0), color: 'amber', icon: AlertTriangle },
  ];

  const quickActions = [
    { label: 'New Journal Entry', href: '/accounting/journal-entries', icon: Plus },
    { label: 'New Invoice', href: '/accounting/ar/invoices', icon: Receipt },
    { label: 'Receive Payment', href: '/accounting/ar/collections', icon: DollarSign },
    { label: 'Create Bill', href: '/accounting/ap/bills', icon: FileText },
    { label: 'Supplier Payment', href: '/accounting/ap/payments', icon: CreditCard },
    { label: 'Trial Balance', href: '/reports/accounting/trial-balance', icon: BarChart3 },
  ];

  const agingCols = ['Current', '1-30', '31-60', '61-90', '90+'];
  const arVals = [data.arAging?.current || 0, data.arAging?.days_30 || 0, data.arAging?.days_60 || 0, data.arAging?.days_90 || 0, data.arAging?.over_90 || 0];
  const apVals = [data.apAging?.current || 0, data.apAging?.days_30 || 0, data.apAging?.days_60 || 0, data.apAging?.days_90 || 0, data.apAging?.over_90 || 0];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Accounting Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of accounting operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card !p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className={`text-lg sm:text-xl font-bold text-${card.color}-600 mt-1 truncate`}>
                    {card.isCurrency === false ? (card.value || 0) : formatCurrency(card.value || 0)}
                  </p>
                </div>
                <div className={`w-8 h-8 bg-${card.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={`text-${card.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {quickActions.map(a => {
          const Icon = a.icon;
          return <Link key={a.label} href={a.href} className="btn-secondary text-xs"><Icon size={14} /> {a.label}</Link>;
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[{ title: 'AR Aging Summary', vals: arVals, link: '/accounting/ar/aging' }, { title: 'AP Aging Summary', vals: apVals, link: '/accounting/ap/aging' }].map(section => (
          <div key={section.title} className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-sm">{section.title}</h3>
              <Link href={section.link} className="text-xs text-primary-600 hover:underline flex items-center gap-1">View <ArrowRight size={12} /></Link>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr>{agingCols.map(c => <th key={c} className="text-right text-xs">{c}</th>)}<th className="text-right text-xs">Total</th></tr></thead>
                <tbody><tr>
                  {section.vals.map((v, i) => <td key={i} className="text-right font-medium text-sm">{formatCurrency(v)}</td>)}
                  <td className="text-right font-bold text-sm">{formatCurrency(section.vals.reduce((s, v) => s + v, 0))}</td>
                </tr></tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-sm">Top Expense Categories</h3></div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Category</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {(data.topExpenseCategories || []).map((c, i) => (
                  <tr key={i}><td className="text-sm">{c.category}</td><td className="text-right font-medium text-sm">{formatCurrency(c.amount)}</td></tr>
                ))}
                {(!data.topExpenseCategories || data.topExpenseCategories.length === 0) && <tr><td colSpan={2} className="text-center py-4 text-gray-400 text-sm">No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-sm">Top Vendors</h3></div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Vendor</th><th className="text-right">Total Paid</th></tr></thead>
              <tbody>
                {(data.topVendors || []).map((v, i) => (
                  <tr key={i}><td className="text-sm">{v.vendor_name}</td><td className="text-right font-medium text-sm">{formatCurrency(v.total_paid)}</td></tr>
                ))}
                {(!data.topVendors || data.topVendors.length === 0) && <tr><td colSpan={2} className="text-center py-4 text-gray-400 text-sm">No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-sm">Recent Journal Entries</h3>
          <Link href="/accounting/journal-entries" className="text-xs text-primary-600 hover:underline flex items-center gap-1">View All <ArrowRight size={12} /></Link>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Entry #</th><th className="hidden sm:table-cell">Date</th><th className="hidden md:table-cell">Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th>Status</th></tr></thead>
            <tbody>
              {(data.recentJournalEntries || []).map(e => (
                <tr key={e.id}>
                  <td className="font-mono text-xs font-medium">{e.entry_number}</td>
                  <td className="text-gray-500 hidden sm:table-cell text-sm">{formatDate(e.entry_date)}</td>
                  <td className="max-w-[200px] truncate hidden md:table-cell text-sm">{e.description}</td>
                  <td className="text-right font-medium text-sm">{formatCurrency(e.total_debit)}</td>
                  <td className="text-right font-medium text-sm">{formatCurrency(e.total_credit)}</td>
                  <td><span className={`badge text-[10px] ${getStatusColor(e.status)}`}>{getStatusLabel(e.status)}</span></td>
                </tr>
              ))}
              {(!data.recentJournalEntries || data.recentJournalEntries.length === 0) && <tr><td colSpan={6} className="text-center py-4 text-gray-400 text-sm">No entries</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
