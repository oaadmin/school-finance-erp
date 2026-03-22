'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import { BookOpen, Receipt, CreditCard, ShoppingCart, Download, Printer } from 'lucide-react';

type JournalType = 'cash-receipts' | 'cash-disbursements' | 'sales' | 'purchases';

interface JournalEntry {
  date: string;
  or_number?: string;
  reference?: string;
  description: string;
  payee?: string;
  payor?: string;
  account_code?: string;
  account_name?: string;
  debit?: number;
  credit?: number;
  amount: number;
  check_no?: string;
}

interface JournalResponse {
  entries: JournalEntry[];
  total: number;
  journal?: string;
  period?: Record<string, unknown>;
}

const TABS: { key: JournalType; label: string; icon: React.ReactNode }[] = [
  { key: 'cash-receipts', label: 'Cash Receipts Journal', icon: <Receipt size={16} /> },
  { key: 'cash-disbursements', label: 'Cash Disbursements Journal', icon: <CreditCard size={16} /> },
  { key: 'sales', label: 'Sales Journal', icon: <ShoppingCart size={16} /> },
  { key: 'purchases', label: 'Purchases Journal', icon: <BookOpen size={16} /> },
];

export default function SpecialJournals() {
  const [activeTab, setActiveTab] = useState<JournalType>('cash-receipts');
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');
  const [data, setData] = useState<JournalEntry[]>([]);
  const [totals, setTotals] = useState<{ total: number }>({ total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/reports/tax?type=special-journals&journal_type=${activeTab}&date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.json())
      .then((res: JournalResponse) => {
        setData(res.entries || []);
        setTotals({ total: res.total || 0 });
      })
      .catch(() => {
        setData([]);
        setTotals({ total: 0 });
      })
      .finally(() => setLoading(false));
  }, [activeTab, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const computeRunningTotal = (entries: JournalEntry[]): number[] => {
    const running: number[] = [];
    let sum = 0;
    for (const entry of entries) {
      const amt = activeTab === 'cash-receipts' ? (entry.debit ?? entry.amount ?? 0)
        : activeTab === 'cash-disbursements' ? (entry.credit ?? entry.amount ?? 0)
        : (entry.amount ?? 0);
      sum += amt;
      running.push(sum);
    }
    return running;
  };

  const runningTotals = computeRunningTotal(data);

  const handleExport = () => {
    const tabLabel = TABS.find(t => t.key === activeTab)?.label || activeTab;
    const rows = data.map((entry, i) => {
      if (activeTab === 'cash-receipts') {
        return {
          Date: entry.date,
          'OR/Reference #': entry.or_number || entry.reference || '',
          'Received From': entry.payor || entry.payee || entry.description || '',
          Description: entry.description,
          Account: entry.account_name,
          'Amount (Debit to Cash)': entry.debit ?? entry.amount ?? 0,
          'Running Total': runningTotals[i],
        };
      }
      if (activeTab === 'cash-disbursements') {
        return {
          Date: entry.date,
          'CV/Check #': entry.or_number || entry.reference || '',
          'Paid To': entry.payee || entry.payor || entry.description || '',
          Description: entry.description,
          Account: entry.account_name || '',
          'Check No': entry.check_no || '',
          'Amount (Credit from Cash)': entry.credit ?? entry.amount ?? 0,
          'Running Total': runningTotals[i],
        };
      }
      if (activeTab === 'sales') {
        return {
          Date: entry.date,
          'Invoice #': entry.or_number || entry.reference || '',
          Customer: entry.payee || entry.payor || entry.description || '',
          Description: entry.description,
          Account: entry.account_name,
          Amount: entry.amount ?? 0,
          'Running Total': runningTotals[i],
        };
      }
      return {
        Date: entry.date,
        Reference: entry.or_number || entry.reference || '',
        'Vendor/Supplier': entry.payee || entry.payor || entry.description || '',
        Description: entry.description,
        Account: entry.account_name,
        Amount: entry.amount ?? 0,
        'Running Total': runningTotals[i],
      };
    });
    exportToExcel(rows, `special-journal-${activeTab}`, tabLabel);
  };

  const handlePrint = () => {
    window.print();
  };

  const getAmountValue = (entry: JournalEntry): number => {
    if (activeTab === 'cash-receipts') return entry.debit ?? entry.amount ?? 0;
    if (activeTab === 'cash-disbursements') return entry.credit ?? entry.amount ?? 0;
    return entry.amount ?? 0;
  };

  const getPartyName = (entry: JournalEntry): string => {
    if (activeTab === 'cash-receipts') return entry.payor || entry.payee || entry.description || '';
    return entry.payee || entry.payor || entry.description || '';
  };

  const getReference = (entry: JournalEntry): string => {
    return entry.or_number || entry.reference || '';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={24} /> Special Journals
          </h1>
          <p className="text-sm text-gray-500">BIR Books of Accounts - Special Journals</p>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="card">
        <div className="card-body flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
            <input
              type="date"
              className="select-field"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
            <input
              type="date"
              className="select-field"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="stat-card !p-4">
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totals.total)}</p>
        </div>
        <div className="stat-card !p-4">
          <p className="text-xs text-gray-500">Entry Count</p>
          <p className="text-lg font-bold text-gray-900">{data.length}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button className="btn-primary text-sm flex items-center gap-1.5" onClick={handleExport}>
          <Download size={14} /> Export to Excel
        </button>
        <button className="btn-secondary text-sm flex items-center gap-1.5" onClick={handlePrint}>
          <Printer size={14} /> Print
        </button>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-header bg-blue-50 flex items-center justify-between">
          <h3 className="font-semibold text-blue-800 flex items-center gap-2">
            {TABS.find(t => t.key === activeTab)?.icon}
            {TABS.find(t => t.key === activeTab)?.label}
          </h3>
          <span className="badge bg-blue-100 text-blue-700 text-xs">{data.length} entries</span>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <table className="data-table text-xs sm:text-sm">
              <thead>
                {activeTab === 'cash-receipts' && (
                  <tr>
                    <th>Date</th>
                    <th>OR/Reference #</th>
                    <th>Received From</th>
                    <th>Description</th>
                    <th>Account</th>
                    <th className="text-right">Amount (Debit to Cash)</th>
                    <th className="text-right">Running Total</th>
                  </tr>
                )}
                {activeTab === 'cash-disbursements' && (
                  <tr>
                    <th>Date</th>
                    <th>CV/Check #</th>
                    <th>Paid To</th>
                    <th>Description</th>
                    <th>Account</th>
                    <th>Check No</th>
                    <th className="text-right">Amount (Credit from Cash)</th>
                    <th className="text-right">Running Total</th>
                  </tr>
                )}
                {activeTab === 'sales' && (
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Description</th>
                    <th>Account</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Running Total</th>
                  </tr>
                )}
                {activeTab === 'purchases' && (
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Vendor/Supplier</th>
                    <th>Description</th>
                    <th>Account</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Running Total</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'cash-disbursements' ? 8 : 7} className="text-center py-8 text-gray-400">
                      No entries found for the selected date range.
                    </td>
                  </tr>
                ) : (
                  data.map((entry, i) => (
                    <tr key={`${getReference(entry)}-${i}`}>
                      <td className="whitespace-nowrap">{entry.date}</td>
                      <td className="font-mono text-xs">{getReference(entry)}</td>
                      <td className="font-medium">{getPartyName(entry)}</td>
                      <td className="max-w-[200px] truncate">{entry.description}</td>
                      <td>{entry.account_name || ''}</td>
                      {activeTab === 'cash-disbursements' && (
                        <td className="font-mono text-xs">{entry.check_no || '-'}</td>
                      )}
                      <td className="text-right font-mono">{formatCurrency(getAmountValue(entry))}</td>
                      <td className="text-right font-mono font-medium">{formatCurrency(runningTotals[i])}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={activeTab === 'cash-disbursements' ? 6 : 5} className="px-4 py-3">
                      TOTALS
                    </td>
                    <td className="text-right px-4 py-3">{formatCurrency(totals.total)}</td>
                    <td className="text-right px-4 py-3">{formatCurrency(totals.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
