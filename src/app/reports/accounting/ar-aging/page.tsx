'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel, exportToPDF } from '@/lib/export';
import ReportFilters from '@/components/reports/ReportFilters';

interface ARRow { description: string; total: number; }

export default function ARAging() {
  const [data, setData] = useState<ARRow[]>([]);
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');

  useEffect(() => {
    fetch(`/api/reports/accounting?type=ar-aging&date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.json()).then(d => setData(d.data));
  }, [dateFrom, dateTo]);

  const totalAR = data.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Accounts Receivable Aging</h1>
        <p className="text-sm text-gray-500">Outstanding receivables summary</p>
      </div>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        onExport={(fmt) => {
          if (fmt === 'excel') exportToExcel(data, 'ar-aging');
          else exportToPDF('Accounts Receivable Aging', ['Account', 'Balance'], data.map(r => [r.description, formatCurrency(r.total)]), 'ar-aging');
        }} />

      <div className="stat-card !p-4">
        <p className="text-xs text-gray-500">Total Accounts Receivable</p>
        <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAR)}</p>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold">Receivables by Account</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Account</th><th className="text-right">Balance</th><th className="hidden sm:table-cell">Distribution</th></tr></thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td className="font-medium">{r.description}</td>
                  <td className="text-right font-medium">{formatCurrency(r.total)}</td>
                  <td className="hidden sm:table-cell w-40">
                    <div className="progress-bar h-2">
                      <div className="progress-bar-fill bg-blue-500" style={{ width: `${totalAR > 0 ? (r.total / totalAR * 100) : 0}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-500">No outstanding receivables</td></tr>}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="px-4 py-3">Total</td>
                <td className="text-right px-4 py-3">{formatCurrency(totalAR)}</td>
                <td className="hidden sm:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
