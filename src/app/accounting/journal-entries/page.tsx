'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Plus, Search, Filter, ChevronDown, ChevronRight, Send, CheckCircle, BookOpen, X, Trash2 } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';

interface JELine { account_code: string; account_name: string; description: string; debit: number; credit: number; }
interface JournalEntry { id: number; entry_number: string; entry_date: string; description: string; status: string; reference_type: string; total_debit: number; total_credit: number; lines: JELine[]; }

export default function JournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] = useState<Array<{ id: number; account_code: string; account_name: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // New JE form state
  const [jeForm, setJeForm] = useState({ entry_date: new Date().toISOString().split('T')[0], description: '', reference_type: 'manual' });
  const [jeLines, setJeLines] = useState([{ account_id: '', description: '', debit: 0, credit: 0 }, { account_id: '', description: '', debit: 0, credit: 0 }]);

  useEffect(() => {
    const params = new URLSearchParams({ type: 'journal-entries', date_from: '2025-06-01', date_to: '2026-05-31' });
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/reports/accounting?${params}`).then(r => r.json()).then(d => setEntries(d.data || []));
    fetch('/api/accounting/coa').then(r => r.json()).then(setAccounts);
  }, [statusFilter]);

  const filtered = search ? entries.filter(e => e.entry_number.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase())) : entries;

  useEffect(() => setCurrentPage(1), [search, statusFilter]);

  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalDebit = jeLines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = jeLines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const [saving, setSaving] = useState(false);

  const addLine = () => setJeLines([...jeLines, { account_id: '', description: '', debit: 0, credit: 0 }]);
  const removeLine = (i: number) => { if (jeLines.length > 2) setJeLines(jeLines.filter((_, idx) => idx !== i)); };
  const updateLine = (i: number, field: string, value: string | number) => {
    const newLines = [...jeLines];
    (newLines[i] as Record<string, unknown>)[field] = value;
    setJeLines(newLines);
  };

  const handleSaveJE = async (status: string) => {
    if (!jeForm.description.trim()) { alert('Please enter a description'); return; }
    if (!isBalanced) { alert('Debit and Credit must be equal and greater than zero'); return; }
    const validLines = jeLines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) { alert('At least 2 lines with amounts are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: jeForm.entry_date,
          journal_type: jeForm.reference_type === 'manual' ? 'general' : jeForm.reference_type,
          description: jeForm.description,
          status,
          lines: validLines.map(l => ({ account_id: Number(l.account_id), description: l.description, debit: l.debit, credit: l.credit }))
        })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Failed to save'); setSaving(false); return; }
      alert(`Journal Entry ${data.entry_number} ${status === 'posted' ? 'posted' : 'saved as draft'} successfully!`);
      setShowCreate(false);
      setJeForm({ entry_date: new Date().toISOString().split('T')[0], description: '', reference_type: 'manual' });
      setJeLines([{ account_id: '', description: '', debit: 0, credit: 0 }, { account_id: '', description: '', debit: 0, credit: 0 }]);
      // Refresh entries
      const params = new URLSearchParams({ type: 'journal-entries', date_from: '2025-06-01', date_to: '2026-05-31' });
      fetch(`/api/reports/accounting?${params}`).then(r => r.json()).then(d => setEntries(d.data || []));
    } catch (err) { alert('Error saving journal entry'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-sm text-gray-500">{filtered.length} entries</p>
        </div>
        <button className="btn-primary w-fit" onClick={() => setShowCreate(true)}><Plus size={16} /> New Journal Entry</button>
      </div>

      <div className="card">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search entries..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select className="select-field w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="posted">Posted</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th className="w-8" /><th>Journal #</th><th className="hidden sm:table-cell">Date</th><th>Description</th><th className="hidden md:table-cell">Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th>Status</th></tr>
            </thead>
            <tbody>
              {paginatedData.map(je => (
                <>
                  <tr key={je.id} className="cursor-pointer hover:bg-blue-50" onClick={() => setExpanded(p => ({ ...p, [je.id]: !p[je.id] }))}>
                    <td>{expanded[je.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                    <td className="font-mono text-xs font-medium">{je.entry_number}</td>
                    <td className="whitespace-nowrap text-sm hidden sm:table-cell">{formatDate(je.entry_date)}</td>
                    <td className="max-w-[200px] truncate text-sm">{je.description}</td>
                    <td className="capitalize text-xs hidden md:table-cell">{je.reference_type}</td>
                    <td className="text-right font-medium text-sm">{formatCurrency(je.total_debit)}</td>
                    <td className="text-right font-medium text-sm">{formatCurrency(je.total_credit)}</td>
                    <td><span className={`badge text-[10px] ${je.status === 'posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{je.status}</span></td>
                  </tr>
                  {expanded[je.id] && je.lines?.map((line, li) => (
                    <tr key={`${je.id}-${li}`} className="bg-slate-50">
                      <td /><td className="font-mono text-[10px] text-gray-400">{line.account_code}</td>
                      <td colSpan={2} className={`text-sm ${line.credit > 0 ? 'pl-8' : ''}`}>{line.account_name}</td>
                      <td className="hidden md:table-cell" />
                      <td className="text-right text-sm">{line.debit > 0 ? formatCurrency(line.debit) : ''}</td>
                      <td className="text-right text-sm">{line.credit > 0 ? formatCurrency(line.credit) : ''}</td>
                      <td />
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>

      {/* Create JE Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20} /> New Journal Entry</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="label">Entry Date *</label><input type="date" className="input-field" value={jeForm.entry_date} onChange={e => setJeForm({...jeForm, entry_date: e.target.value})} /></div>
                <div><label className="label">Type</label>
                  <select className="select-field" value={jeForm.reference_type} onChange={e => setJeForm({...jeForm, reference_type: e.target.value})}>
                    <option value="manual">Manual</option><option value="adjusting">Adjusting</option><option value="closing">Closing</option><option value="reversing">Reversing</option>
                  </select>
                </div>
                <div><label className="label">Description *</label><input className="input-field" value={jeForm.description} onChange={e => setJeForm({...jeForm, description: e.target.value})} placeholder="Describe this entry" /></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Journal Lines</h3>
                  <button className="btn-secondary text-xs" onClick={addLine}><Plus size={12} /> Add Line</button>
                </div>
                <table className="data-table">
                  <thead><tr><th>Account</th><th>Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="w-8" /></tr></thead>
                  <tbody>
                    {jeLines.map((line, i) => (
                      <tr key={i}>
                        <td>
                          <select className="select-field text-xs" value={line.account_id} onChange={e => updateLine(i, 'account_id', e.target.value)}>
                            <option value="">Select account...</option>
                            {accounts.map((a: { id: number; account_code: string; account_name: string }) => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
                          </select>
                        </td>
                        <td><input className="input-field text-xs" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} /></td>
                        <td><input className="input-field text-xs text-right" type="number" value={line.debit || ''} onChange={e => updateLine(i, 'debit', parseFloat(e.target.value) || 0)} /></td>
                        <td><input className="input-field text-xs text-right" type="number" value={line.credit || ''} onChange={e => updateLine(i, 'credit', parseFloat(e.target.value) || 0)} /></td>
                        <td><button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={2} className="px-4 py-2 text-right">Totals:</td>
                      <td className="text-right px-4 py-2">{formatCurrency(totalDebit)}</td>
                      <td className="text-right px-4 py-2">{formatCurrency(totalCredit)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                {!isBalanced && totalDebit > 0 && (
                  <p className="text-xs text-red-600 mt-1">Entry is not balanced. Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}</p>
                )}
              </div>
            </div>
            <div className="p-6 border-t flex justify-between">
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <div className="flex gap-2">
                <button className="btn-secondary" disabled={!isBalanced || saving} onClick={() => handleSaveJE('draft')}><Send size={14} /> {saving ? 'Saving...' : 'Save as Draft'}</button>
                <button className="btn-primary" disabled={!isBalanced || saving} onClick={() => handleSaveJE('posted')}><CheckCircle size={14} /> {saving ? 'Posting...' : 'Post Entry'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
