'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import ReportFilters from '@/components/reports/ReportFilters';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface Row { account_code: string; account_name: string; account_type: string; total_debit: number; total_credit: number; balance: number; }
interface Totals { totalDebit: number; totalCredit: number; difference: number; }

export default function TrialBalance() {
  const [data, setData] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals>({ totalDebit: 0, totalCredit: 0, difference: 0 });
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');

  useEffect(() => {
    fetch(`/api/reports/accounting?type=trial-balance&date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.json()).then(d => { setData(d.data); setTotals(d.totals); });
  }, [dateFrom, dateTo]);

  const balanced = Math.abs(totals.difference) < 0.01;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Trial Balance</h1>
          <p className="text-sm text-gray-500">All accounts with debit and credit balances</p>
        </div>
        <div className={`badge text-sm ${balanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {balanced ? <><CheckCircle size={14} /> Balanced</> : <><AlertTriangle size={14} /> Imbalanced: {formatCurrency(totals.difference)}</>}
        </div>
      </div>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="stat-card !p-4"><p className="text-xs text-gray-500">Total Debit</p><p className="text-lg font-bold text-blue-600">{formatCurrency(totals.totalDebit)}</p></div>
        <div className="stat-card !p-4"><p className="text-xs text-gray-500">Total Credit</p><p className="text-lg font-bold text-green-600">{formatCurrency(totals.totalCredit)}</p></div>
        <div className="stat-card !p-4 col-span-2 sm:col-span-1"><p className="text-xs text-gray-500">Difference</p>
          <p className={`text-lg font-bold ${balanced ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(totals.difference))}</p>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Account Code</th><th>Account Name</th><th className="hidden sm:table-cell">Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.account_code}>
                  <td className="font-mono text-xs">{r.account_code}</td>
                  <td className="font-medium">{r.account_name}</td>
                  <td className="capitalize text-xs hidden sm:table-cell">{r.account_type}</td>
                  <td className="text-right">{r.total_debit > 0 ? formatCurrency(r.total_debit) : ''}</td>
                  <td className="text-right">{r.total_credit > 0 ? formatCurrency(r.total_credit) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td colSpan={2} className="px-4 py-3 hidden sm:table-cell">TOTALS</td>
                <td className="px-4 py-3 sm:hidden">TOTALS</td>
                <td className="hidden sm:table-cell" />
                <td className="text-right px-4 py-3">{formatCurrency(totals.totalDebit)}</td>
                <td className="text-right px-4 py-3">{formatCurrency(totals.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
