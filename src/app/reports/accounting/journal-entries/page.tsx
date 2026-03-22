'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import ReportFilters from '@/components/reports/ReportFilters';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface JELine { account_code: string; account_name: string; description: string; debit: number; credit: number; }
interface JournalEntry { id: number; entry_number: string; entry_date: string; description: string; status: string; reference_type: string; total_debit: number; total_credit: number; lines: JELine[]; }

export default function JournalEntriesReport() {
  const [data, setData] = useState<JournalEntry[]>([]);
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ type: 'journal-entries', date_from: dateFrom, date_to: dateTo });
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/reports/accounting?${params}`).then(r => r.json()).then(d => setData(d.data));
  }, [dateFrom, dateTo, statusFilter]);

  const toggle = (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Journal Entries Report</h1>
        <p className="text-sm text-gray-500">{data.length} journal entries found</p>
      </div>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Status</label>
          <select className="select-field text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="posted">Posted</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </ReportFilters>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th className="w-8"></th><th>Journal #</th><th>Date</th><th className="hidden sm:table-cell">Description</th><th className="hidden sm:table-cell">Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.map(je => (
                <>
                  <tr key={je.id} className="cursor-pointer hover:bg-blue-50" onClick={() => toggle(je.id)}>
                    <td>{expanded[je.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                    <td className="font-mono text-xs font-medium">{je.entry_number}</td>
                    <td className="whitespace-nowrap text-sm">{formatDate(je.entry_date)}</td>
                    <td className="max-w-[200px] truncate hidden sm:table-cell">{je.description}</td>
                    <td className="capitalize text-xs hidden sm:table-cell">{je.reference_type}</td>
                    <td className="text-right font-medium">{formatCurrency(je.total_debit)}</td>
                    <td className="text-right font-medium">{formatCurrency(je.total_credit)}</td>
                    <td><span className={`badge ${je.status === 'posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{je.status}</span></td>
                  </tr>
                  {expanded[je.id] && je.lines.map((line, li) => (
                    <tr key={`${je.id}-${li}`} className="bg-slate-50">
                      <td></td>
                      <td className="font-mono text-[10px] text-gray-400">{line.account_code}</td>
                      <td colSpan={2} className={`text-sm ${line.credit > 0 ? 'pl-8' : ''}`}>{line.account_name}</td>
                      <td className="hidden sm:table-cell" />
                      <td className="text-right text-sm">{line.debit > 0 ? formatCurrency(line.debit) : ''}</td>
                      <td className="text-right text-sm">{line.credit > 0 ? formatCurrency(line.credit) : ''}</td>
                      <td></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
