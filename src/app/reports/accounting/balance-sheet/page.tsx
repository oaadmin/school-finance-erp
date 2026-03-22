'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel, exportToPDF } from '@/lib/export';
import ReportFilters from '@/components/reports/ReportFilters';

interface Account { account_code: string; account_name: string; current_balance: number; previous_balance: number; }
interface Totals { totalAssets: number; totalLiabilities: number; totalEquity: number; }

export default function BalanceSheet() {
  const [assets, setAssets] = useState<Account[]>([]);
  const [liabilities, setLiabilities] = useState<Account[]>([]);
  const [equity, setEquity] = useState<Account[]>([]);
  const [totals, setTotals] = useState<Totals>({ totalAssets: 0, totalLiabilities: 0, totalEquity: 0 });
  const [dateTo, setDateTo] = useState('2026-02-28');

  useEffect(() => {
    fetch(`/api/reports/accounting?type=balance-sheet&date_to=${dateTo}`)
      .then(r => r.json()).then(d => { setAssets(d.assets); setLiabilities(d.liabilities); setEquity(d.equity); setTotals(d.totals); });
  }, [dateTo]);

  const Section = ({ title, items, color }: { title: string; items: Account[]; color: string }) => (
    <div className="card">
      <div className={`card-header ${color}`}><h3 className="font-semibold text-gray-900">{title}</h3></div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Account</th><th className="hidden sm:table-cell">Code</th><th className="text-right">Current</th><th className="text-right hidden sm:table-cell">Previous</th><th className="text-right hidden md:table-cell">Variance</th></tr></thead>
          <tbody>
            {items.map(a => (
              <tr key={a.account_code}>
                <td className="font-medium text-sm">{a.account_name}</td>
                <td className="font-mono text-xs hidden sm:table-cell">{a.account_code}</td>
                <td className="text-right font-medium">{formatCurrency(a.current_balance)}</td>
                <td className="text-right text-gray-500 hidden sm:table-cell">{formatCurrency(a.previous_balance)}</td>
                <td className={`text-right hidden md:table-cell ${a.current_balance - a.previous_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(a.current_balance - a.previous_balance))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td className="px-4 py-3">Total {title}</td>
              <td className="hidden sm:table-cell" />
              <td className="text-right px-4 py-3">{formatCurrency(items.reduce((s, a) => s + a.current_balance, 0))}</td>
              <td className="text-right px-4 py-3 hidden sm:table-cell">{formatCurrency(items.reduce((s, a) => s + a.previous_balance, 0))}</td>
              <td className="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Balance Sheet</h1>
        <p className="text-sm text-gray-500">Statement of Financial Position as of {dateTo}</p>
      </div>

      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">As of Date</label>
            <input type="date" className="input-field text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="ml-auto flex gap-2">
            <button className="btn-secondary text-xs" onClick={() => exportToExcel([...assets, ...liabilities, ...equity].map(a => ({ account_code: a.account_code, account_name: a.account_name, current_balance: a.current_balance, previous_balance: a.previous_balance, variance: a.current_balance - a.previous_balance })), 'balance-sheet')}>Excel</button>
            <button className="btn-secondary text-xs" onClick={() => exportToPDF('Balance Sheet', ['Account Code', 'Account Name', 'Current', 'Previous', 'Variance'], [...assets, ...liabilities, ...equity].map(a => [a.account_code, a.account_name, formatCurrency(a.current_balance), formatCurrency(a.previous_balance), formatCurrency(a.current_balance - a.previous_balance)]), 'balance-sheet')}>PDF</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-card !p-4"><p className="text-xs text-gray-500">Total Assets</p><p className="text-lg font-bold text-blue-600">{formatCurrency(totals.totalAssets)}</p></div>
        <div className="stat-card !p-4"><p className="text-xs text-gray-500">Total Liabilities</p><p className="text-lg font-bold text-red-600">{formatCurrency(totals.totalLiabilities)}</p></div>
        <div className="stat-card !p-4"><p className="text-xs text-gray-500">Total Equity</p><p className="text-lg font-bold text-green-600">{formatCurrency(totals.totalEquity)}</p></div>
      </div>

      <Section title="Assets" items={assets} color="bg-blue-50" />
      <Section title="Liabilities" items={liabilities} color="bg-red-50" />
      <Section title="Equity" items={equity} color="bg-green-50" />

      <div className="card p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-700">Assets = Liabilities + Equity</span>
          <span className={`font-bold ${Math.abs(totals.totalAssets - totals.totalLiabilities - totals.totalEquity) < 1 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totals.totalAssets)} = {formatCurrency(totals.totalLiabilities + totals.totalEquity)}
          </span>
        </div>
      </div>
    </div>
  );
}
