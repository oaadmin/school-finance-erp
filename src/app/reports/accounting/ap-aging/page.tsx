'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface AgingRow { payee_code: string; payee: string; tin: string; current_amount: number; days_30: number; days_60: number; days_90: number; over_90: number; total: number; }

export default function APAging() {
  const [data, setData] = useState<AgingRow[]>([]);

  useEffect(() => {
    fetch('/api/reports/accounting?type=ap-aging').then(r => r.json()).then(d => setData(d.data));
  }, []);

  const sum = (key: keyof AgingRow) => data.reduce((s, r) => s + (Number(r[key]) || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Accounts Payable Aging</h1>
        <p className="text-sm text-gray-500">Outstanding payables by aging bucket</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="stat-card !p-3"><p className="text-[10px] text-gray-500">Current</p><p className="text-sm font-bold text-green-600">{formatCurrency(sum('current_amount'))}</p></div>
        <div className="stat-card !p-3"><p className="text-[10px] text-gray-500">1-30 Days</p><p className="text-sm font-bold text-blue-600">{formatCurrency(sum('days_30'))}</p></div>
        <div className="stat-card !p-3"><p className="text-[10px] text-gray-500">31-60 Days</p><p className="text-sm font-bold text-amber-600">{formatCurrency(sum('days_60'))}</p></div>
        <div className="stat-card !p-3"><p className="text-[10px] text-gray-500">61-90 Days</p><p className="text-sm font-bold text-orange-600">{formatCurrency(sum('days_90'))}</p></div>
        <div className="stat-card !p-3"><p className="text-[10px] text-gray-500">Over 90</p><p className="text-sm font-bold text-red-600">{formatCurrency(sum('over_90'))}</p></div>
        <div className="stat-card !p-3 border-2 border-blue-200"><p className="text-[10px] text-gray-500">Total</p><p className="text-sm font-bold">{formatCurrency(sum('total'))}</p></div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payee</th><th className="hidden sm:table-cell">TIN</th><th className="text-right">Current</th>
                <th className="text-right hidden sm:table-cell">1-30</th><th className="text-right hidden md:table-cell">31-60</th>
                <th className="text-right hidden md:table-cell">61-90</th><th className="text-right hidden lg:table-cell">90+</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.payee_code}>
                  <td className="font-medium text-sm">
                    {r.payee}
                    {r.over_90 > 0 && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
                  </td>
                  <td className="text-xs text-gray-400 hidden sm:table-cell">{r.tin}</td>
                  <td className="text-right">{r.current_amount > 0 ? formatCurrency(r.current_amount) : '—'}</td>
                  <td className="text-right hidden sm:table-cell">{r.days_30 > 0 ? formatCurrency(r.days_30) : '—'}</td>
                  <td className="text-right hidden md:table-cell">{r.days_60 > 0 ? formatCurrency(r.days_60) : '—'}</td>
                  <td className="text-right hidden md:table-cell">{r.days_90 > 0 ? formatCurrency(r.days_90) : '—'}</td>
                  <td className="text-right hidden lg:table-cell text-red-600">{r.over_90 > 0 ? formatCurrency(r.over_90) : '—'}</td>
                  <td className="text-right font-bold">{formatCurrency(r.total)}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-500">No outstanding payables</td></tr>}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="px-4 py-3">TOTALS</td>
                <td className="hidden sm:table-cell" />
                <td className="text-right px-4 py-3">{formatCurrency(sum('current_amount'))}</td>
                <td className="text-right px-4 py-3 hidden sm:table-cell">{formatCurrency(sum('days_30'))}</td>
                <td className="text-right px-4 py-3 hidden md:table-cell">{formatCurrency(sum('days_60'))}</td>
                <td className="text-right px-4 py-3 hidden md:table-cell">{formatCurrency(sum('days_90'))}</td>
                <td className="text-right px-4 py-3 hidden lg:table-cell">{formatCurrency(sum('over_90'))}</td>
                <td className="text-right px-4 py-3">{formatCurrency(sum('total'))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
