'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import ReportFilters from '@/components/reports/ReportFilters';

interface GLEntry { entry_date: string; entry_number: string; je_description: string; account_code: string; account_name: string; description: string; debit: number; credit: number; }
interface Account { account_code: string; account_name: string; }

export default function GeneralLedger() {
  const [data, setData] = useState<GLEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');
  const [selectedAccount, setSelectedAccount] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ type: 'general-ledger', date_from: dateFrom, date_to: dateTo });
    if (selectedAccount) params.set('account', selectedAccount);
    fetch(`/api/reports/accounting?${params}`).then(r => r.json()).then(d => {
      setData(d.data); setAccounts(d.accounts);
    });
  }, [dateFrom, dateTo, selectedAccount]);

  // Group by account
  const grouped: Record<string, { account_code: string; account_name: string; entries: (GLEntry & { running: number })[] }> = {};
  data.forEach(entry => {
    const key = entry.account_code;
    if (!grouped[key]) grouped[key] = { account_code: entry.account_code, account_name: entry.account_name, entries: [] };
    const prev = grouped[key].entries.length > 0 ? grouped[key].entries[grouped[key].entries.length - 1].running : 0;
    grouped[key].entries.push({ ...entry, running: prev + entry.debit - entry.credit });
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">General Ledger</h1>
        <p className="text-sm text-gray-500">Detailed transaction history per account</p>
      </div>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Account</label>
          <select className="select-field text-sm" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
            <option value="">All Accounts</option>
            {accounts.map(a => <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.account_name}</option>)}
          </select>
        </div>
      </ReportFilters>

      {Object.values(grouped).map(group => (
        <div key={group.account_code} className="card">
          <div className="card-header bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm"><span className="font-mono text-gray-500">{group.account_code}</span> {group.account_name}</h3>
              <span className="text-sm font-medium">
                Balance: {formatCurrency(group.entries.length > 0 ? group.entries[group.entries.length - 1].running : 0)}
              </span>
            </div>
          </div>
          <div className="table-container">
            <table className="data-table text-xs sm:text-sm">
              <thead>
                <tr><th>Date</th><th className="hidden sm:table-cell">Ref #</th><th>Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="text-right">Balance</th></tr>
              </thead>
              <tbody>
                {group.entries.map((e, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap">{formatDate(e.entry_date)}</td>
                    <td className="font-mono text-xs hidden sm:table-cell">{e.entry_number}</td>
                    <td className="max-w-[200px] truncate">{e.description || e.je_description}</td>
                    <td className="text-right">{e.debit > 0 ? formatCurrency(e.debit) : ''}</td>
                    <td className="text-right">{e.credit > 0 ? formatCurrency(e.credit) : ''}</td>
                    <td className="text-right font-medium">{formatCurrency(e.running)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div className="card p-8 text-center text-gray-500">No transactions found for the selected filters.</div>
      )}
    </div>
  );
}
