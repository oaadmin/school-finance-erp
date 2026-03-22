'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Landmark,
  AlertTriangle,
  Clock,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  ArrowRight,
  Plus,
  Banknote,
} from 'lucide-react';

interface AgingBucket {
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  over_90: number;
  total: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
}

interface TopVendor {
  vendor_name: string;
  total_paid: number;
}

interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: string;
}

interface DashboardData {
  summary: {
    total_receivables: number;
    total_payables: number;
    cash_bank_balance: number;
    net_income: number;
    overdue_receivables: number;
    overdue_payables: number;
    unposted_entries: number;
    current_month_revenue: number;
  };
  ar_aging: AgingBucket;
  ap_aging: AgingBucket;
  top_expense_categories: ExpenseCategory[];
  top_vendors: TopVendor[];
  recent_journal_entries: JournalEntry[];
}

export default function AccountingDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/accounting/dashboard')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );

  const { summary } = data;

  const statCards = [
    {
      label: 'Total Receivables',
      value: summary.total_receivables,
      color: 'blue',
      icon: TrendingUp,
    },
    {
      label: 'Total Payables',
      value: summary.total_payables,
      color: 'red',
      icon: TrendingDown,
    },
    {
      label: 'Cash & Bank Balance',
      value: summary.cash_bank_balance,
      color: 'green',
      icon: Landmark,
    },
    {
      label: 'Net Income',
      value: summary.net_income,
      color: 'purple',
      icon: DollarSign,
    },
    {
      label: 'Overdue Receivables',
      value: summary.overdue_receivables,
      color: 'amber',
      icon: AlertTriangle,
    },
    {
      label: 'Overdue Payables',
      value: summary.overdue_payables,
      color: 'orange',
      icon: Clock,
    },
    {
      label: 'Unposted Entries',
      value: summary.unposted_entries,
      color: 'gray',
      icon: FileText,
      isCurrency: false,
    },
    {
      label: 'Current Month Revenue',
      value: summary.current_month_revenue,
      color: 'teal',
      icon: Banknote,
    },
  ];

  const quickActions = [
    { label: 'New Journal Entry', href: '/accounting/journal-entries', icon: Plus },
    { label: 'New Invoice', href: '/accounting/ar/invoices', icon: Receipt },
    { label: 'Receive Payment', href: '/accounting/ar/collections', icon: DollarSign },
    { label: 'Create Bill', href: '/accounting/ap/bills', icon: FileText },
    { label: 'Supplier Payment', href: '/accounting/ap/payments', icon: CreditCard },
    { label: 'Trial Balance', href: '/reports/accounting/trial-balance', icon: BarChart3 },
  ];

  const agingColumns = ['Current', '1-30', '31-60', '61-90', '90+', 'Total'];

  function agingRow(aging: AgingBucket) {
    return [
      aging.current,
      aging.days_30,
      aging.days_60,
      aging.days_90,
      aging.over_90,
      aging.total,
    ];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Accounting Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of accounting operations</p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const bgClass = `bg-${card.color}-100`;
          const textClass = `text-${card.color}-600`;
          return (
            <div key={card.label} className="stat-card !p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500">{card.label}</p>
                  <p className={`text-lg sm:text-2xl font-bold ${textClass} mt-1 truncate`}>
                    {card.isCurrency === false
                      ? card.value.toLocaleString()
                      : formatCurrency(card.value)}
                  </p>
                </div>
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 ${bgClass} rounded-lg flex items-center justify-center flex-shrink-0`}
                >
                  <Icon size={16} className={`${textClass} sm:hidden`} />
                  <Icon size={20} className={`${textClass} hidden sm:block`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5"
            >
              <Icon size={14} />
              {action.label}
            </Link>
          );
        })}
      </div>

      {/* AR and AP Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">AR Aging Summary</h3>
            <Link
              href="/reports/accounting/ar-aging"
              className="text-xs text-primary-600 hover:underline flex items-center gap-1"
            >
              View Report <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {agingColumns.map((col) => (
                      <th key={col} className="text-right">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {agingRow(data.ar_aging).map((val, i) => (
                      <td key={i} className="text-right font-medium text-xs sm:text-sm">
                        {formatCurrency(val)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">AP Aging Summary</h3>
            <Link
              href="/reports/accounting/ap-aging"
              className="text-xs text-primary-600 hover:underline flex items-center gap-1"
            >
              View Report <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {agingColumns.map((col) => (
                      <th key={col} className="text-right">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {agingRow(data.ap_aging).map((val, i) => (
                      <td key={i} className="text-right font-medium text-xs sm:text-sm">
                        {formatCurrency(val)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Top Expense Categories and Top Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Top Expense Categories</h3>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_expense_categories.map((cat, i) => (
                    <tr key={i}>
                      <td className="text-sm">{cat.category}</td>
                      <td className="text-right font-medium text-sm">
                        {formatCurrency(cat.amount)}
                      </td>
                    </tr>
                  ))}
                  {data.top_expense_categories.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center text-gray-400 text-sm py-4">
                        No expense data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Top Vendors</h3>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th className="text-right">Total Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_vendors.map((vendor, i) => (
                    <tr key={i}>
                      <td className="text-sm">{vendor.vendor_name}</td>
                      <td className="text-right font-medium text-sm">
                        {formatCurrency(vendor.total_paid)}
                      </td>
                    </tr>
                  ))}
                  {data.top_vendors.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center text-gray-400 text-sm py-4">
                        No vendor data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Journal Entries */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Journal Entries</h3>
          <Link
            href="/accounting/journal-entries"
            className="text-xs text-primary-600 hover:underline flex items-center gap-1"
          >
            View All <ArrowRight size={12} />
          </Link>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Entry #</th>
                <th className="hidden sm:table-cell">Date</th>
                <th className="hidden md:table-cell">Description</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_journal_entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <Link
                      href={`/accounting/journal-entries/${entry.id}`}
                      className="text-primary-600 hover:underline font-medium text-xs sm:text-sm"
                    >
                      {entry.entry_number}
                    </Link>
                  </td>
                  <td className="text-gray-500 hidden sm:table-cell">
                    {formatDate(entry.entry_date)}
                  </td>
                  <td className="max-w-[200px] truncate hidden md:table-cell">
                    {entry.description}
                  </td>
                  <td className="text-right font-medium text-xs sm:text-sm">
                    {formatCurrency(entry.total_debit)}
                  </td>
                  <td className="text-right font-medium text-xs sm:text-sm">
                    {formatCurrency(entry.total_credit)}
                  </td>
                  <td>
                    <span
                      className={`badge ${getStatusColor(entry.status)} text-[10px] sm:text-xs`}
                    >
                      {getStatusLabel(entry.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {data.recent_journal_entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 text-sm py-4">
                    No journal entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
