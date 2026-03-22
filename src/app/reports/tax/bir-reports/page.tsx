'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel, exportToPDF } from '@/lib/export';
import ReportFilters from '@/components/reports/ReportFilters';
import { Landmark, Download, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

interface TBRow { account_code: string; account_name: string; account_type: string; total_debit: number; total_credit: number; }

export default function BIRReports() {
  const [trialBalance, setTrialBalance] = useState<TBRow[]>([]);
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');

  useEffect(() => {
    fetch(`/api/reports/tax?type=bir-financials&date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.json()).then(d => setTrialBalance(d.trialBalance));
  }, [dateFrom, dateTo]);

  const reports = [
    { title: 'Statement of Financial Position', desc: 'BIR-formatted Balance Sheet', href: '/reports/accounting/balance-sheet', icon: '📊' },
    { title: 'Income Statement', desc: 'BIR-formatted Profit & Loss', href: '/reports/accounting/income-statement', icon: '📈' },
    { title: 'Schedule of Expenses', desc: 'Detailed expense breakdown for BIR', href: '/reports/accounting/expense-schedule', icon: '📋' },
    { title: 'Trial Balance', desc: 'Complete trial balance for filing', href: '/reports/accounting/trial-balance', icon: '⚖️' },
    { title: 'General Ledger', desc: 'Full GL export for BIR audit', href: '/reports/accounting/general-ledger', icon: '📒' },
  ];

  const totalDebit = trialBalance.reduce((s, r) => s + r.total_debit, 0);
  const totalCredit = trialBalance.reduce((s, r) => s + r.total_credit, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2"><Landmark size={24} /> BIR Financial Reports</h1>
          <p className="text-sm text-gray-500">Philippine BIR-compliant financial statements</p>
        </div>
      </div>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        onExport={(fmt) => {
          if (fmt === 'excel') exportToExcel(trialBalance, 'bir-trial-balance');
          else exportToPDF('BIR Trial Balance', ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit'], trialBalance.map(r => [r.account_code, r.account_name, r.account_type, r.total_debit > 0 ? formatCurrency(r.total_debit) : '', r.total_credit > 0 ? formatCurrency(r.total_credit) : '']), 'bir-trial-balance');
        }} />

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <Link key={r.href} href={r.href} className="card p-4 hover:shadow-md transition-shadow hover:border-primary-300">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{r.icon}</span>
              <div>
                <h3 className="font-semibold text-sm text-gray-900">{r.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="btn-secondary text-[10px] py-1 px-2"><Download size={10} /> Excel</button>
              <button className="btn-secondary text-[10px] py-1 px-2"><Download size={10} /> PDF</button>
            </div>
          </Link>
        ))}
      </div>

      {/* BIR-Ready Trial Balance */}
      <div className="card">
        <div className="card-header bg-amber-50 flex items-center justify-between">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2"><FileSpreadsheet size={16} /> BIR Trial Balance Export</h3>
          <button className="btn-secondary text-xs" onClick={() => exportToExcel(trialBalance, 'bir-trial-balance')}><Download size={14} /> Export BIR Format</button>
        </div>
        <div className="table-container">
          <table className="data-table text-xs sm:text-sm">
            <thead>
              <tr><th>Account Code</th><th>Account Name</th><th>Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr>
            </thead>
            <tbody>
              {trialBalance.slice(0, 30).map(r => (
                <tr key={r.account_code}>
                  <td className="font-mono">{r.account_code}</td>
                  <td className="font-medium">{r.account_name}</td>
                  <td className="capitalize text-xs">{r.account_type}</td>
                  <td className="text-right">{r.total_debit > 0 ? formatCurrency(r.total_debit) : ''}</td>
                  <td className="text-right">{r.total_credit > 0 ? formatCurrency(r.total_credit) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-amber-50 font-bold">
                <td colSpan={3} className="px-4 py-3">TOTALS</td>
                <td className="text-right px-4 py-3">{formatCurrency(totalDebit)}</td>
                <td className="text-right px-4 py-3">{formatCurrency(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
