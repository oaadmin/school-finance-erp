'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToExcel, exportToPDF } from '@/lib/export';
import ReportFilters from '@/components/reports/ReportFilters';

interface Entry { date: string; reference: string; payee?: string; description: string; debit: number; credit: number; amount?: number; }

export default function SubsidiaryLedger() {
  const [data, setData] = useState<Entry[]>([]);
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');
  const [ledgerType, setLedgerType] = useState('payables');

  useEffect(() => {
    fetch(`/api/reports/accounting?type=subsidiary-ledger&ledger_type=${ledgerType}&date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.json()).then(d => setData(d.data));
  }, [dateFrom, dateTo, ledgerType]);

  const totalDebit = data.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = data.reduce((s, e) => s + (e.credit || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Subsidiary Ledger</h1>
        <p className="text-sm text-gray-500">Detailed breakdown per vendor/customer</p>
      </div>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        onExport={(fmt) => {
          if (fmt === 'excel') exportToExcel(data.map(e => ({ date: e.date, reference: e.reference, payee: e.payee || e.description, debit: e.debit, credit: e.credit })), `subsidiary-ledger-${ledgerType}`);
          else exportToPDF(`Subsidiary Ledger - ${ledgerType}`, ['Date', 'Reference', 'Payee/Description', 'Debit', 'Credit'], data.map(e => [formatDate(e.date), e.reference, e.payee || e.description, e.debit > 0 ? formatCurrency(e.debit) : '', e.credit > 0 ? formatCurrency(e.credit) : '']), `subsidiary-ledger-${ledgerType}`);
        }}>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Type</label>
          <select className="select-field text-sm" value={ledgerType} onChange={e => setLedgerType(e.target.value)}>
            <option value="payables">Payables Ledger</option>
            <option value="receivables">Receivables Ledger</option>
          </select>
        </div>
      </ReportFilters>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card !p-4"><p className="text-xs text-gray-500">Total Debit</p><p className="text-lg font-bold">{formatCurrency(totalDebit)}</p></div>
        <div className="stat-card !p-4"><p className="text-xs text-gray-500">Total Credit</p><p className="text-lg font-bold">{formatCurrency(totalCredit)}</p></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold capitalize">{ledgerType} Ledger</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th className="hidden sm:table-cell">Reference</th><th>{ledgerType === 'payables' ? 'Payee' : 'Description'}</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr>
            </thead>
            <tbody>
              {data.map((e, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap text-sm">{formatDate(e.date)}</td>
                  <td className="font-mono text-xs hidden sm:table-cell">{e.reference}</td>
                  <td className="text-sm">{e.payee || e.description}</td>
                  <td className="text-right">{e.debit > 0 ? formatCurrency(e.debit) : ''}</td>
                  <td className="text-right">{e.credit > 0 ? formatCurrency(e.credit) : ''}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-500">No entries found</td></tr>}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={2} className="px-4 py-3 hidden sm:table-cell">Totals</td>
                <td className="px-4 py-3 sm:hidden">Totals</td>
                <td className="hidden sm:table-cell" />
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
