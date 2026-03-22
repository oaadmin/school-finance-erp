'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Plus, Search, X, Upload, FileSpreadsheet, Eye, ArrowRight } from 'lucide-react';
import ComboBox from '@/components/ui/ComboBox';
import Link from 'next/link';

interface Statement {
  id: number;
  bank_account_id: number;
  bank_name: string;
  bank_account_name: string;
  account_number: string;
  period_from: string;
  period_to: string;
  opening_balance: number;
  closing_balance: number;
  file_name: string | null;
  status: string;
  line_count: number;
  matched_count: number;
  excluded_count: number;
  reconciled_at: string | null;
}

interface BankAccount {
  id: number;
  account_name: string;
  bank_name: string;
}

interface ParsedLine {
  transaction_date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  running_balance: number;
}

function parseCSV(text: string): ParsedLine[] {
  const lines = text.trim().split('\n');
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
    let date = cols[0];
    if (date && date.includes('/')) {
      const parts = date.split('/');
      if (parts[2]?.length === 4) date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return {
      transaction_date: date || '',
      description: cols[1] || '',
      reference: cols[2] || '',
      debit: parseFloat(cols[3]?.replace(/,/g, '') || '0') || 0,
      credit: parseFloat(cols[4]?.replace(/,/g, '') || '0') || 0,
      running_balance: parseFloat(cols[5]?.replace(/,/g, '') || '0') || 0,
    };
  });
}

const statusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    reconciled: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export default function BankStatements() {
  const { success, error } = useToast();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Import form
  const [importForm, setImportForm] = useState({
    bank_account_id: '' as string,
    period_from: '',
    period_to: '',
    opening_balance: 0,
    closing_balance: 0,
    file_name: '',
    csv_text: '',
  });
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetch('/api/accounting/bank/statements')
      .then(r => r.json())
      .then(data => { setStatements(data); setLoading(false); })
      .catch(() => { error('Failed to load statements'); setLoading(false); });
  };

  useEffect(loadData, []);

  useEffect(() => {
    if (showModal) {
      fetch('/api/accounting/bank/accounts')
        .then(r => r.json())
        .then(setBankAccounts);
    }
  }, [showModal]);

  const filtered = statements.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.bank_name.toLowerCase().includes(q) ||
      s.bank_account_name.toLowerCase().includes(q) ||
      (s.file_name || '').toLowerCase().includes(q)
    );
  });

  const handleParse = () => {
    if (!importForm.csv_text.trim()) {
      error('No CSV Data', 'Please paste CSV data or upload a file');
      return;
    }
    try {
      const lines = parseCSV(importForm.csv_text);
      if (lines.length === 0) {
        error('Parse Error', 'No valid lines found in CSV data');
        return;
      }
      setParsedLines(lines);
      setShowPreview(true);
      success('CSV Parsed', `Found ${lines.length} transaction${lines.length !== 1 ? 's' : ''}`);
    } catch {
      error('Parse Error', 'Failed to parse CSV. Check the format.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportForm(f => ({ ...f, file_name: file.name }));
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportForm(f => ({ ...f, csv_text: text }));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importForm.bank_account_id || !importForm.period_from || !importForm.period_to) {
      error('Validation Error', 'Bank account and period are required');
      return;
    }
    if (parsedLines.length === 0) {
      error('No Lines', 'Parse the CSV first before importing');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/bank/statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_account_id: Number(importForm.bank_account_id),
          period_from: importForm.period_from,
          period_to: importForm.period_to,
          opening_balance: importForm.opening_balance,
          closing_balance: importForm.closing_balance,
          file_name: importForm.file_name || 'manual-import.csv',
          lines: parsedLines,
        }),
      });
      if (res.ok) {
        success('Statement Imported', `Imported ${parsedLines.length} lines`);
        closeModal();
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        error('Import Failed', err.error || 'Could not import statement');
      }
    } catch {
      error('Import Failed', 'Network error');
    }
    setSubmitting(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setImportForm({ bank_account_id: '', period_from: '', period_to: '', opening_balance: 0, closing_balance: 0, file_name: '', csv_text: '' });
    setParsedLines([]);
    setShowPreview(false);
  };

  const bankOptions = bankAccounts.map(ba => ({
    value: ba.id,
    label: `${ba.bank_name} - ${ba.account_name}`,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-primary-600" />
            Bank Statements
          </h1>
          <p className="text-sm text-gray-500 mt-1">Import and manage bank statements for reconciliation</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
          <Upload size={16} /> Import Statement
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by bank, account, or file..."
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading statements...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-300" />
            <div>No bank statements found</div>
            <div className="text-xs mt-1">Import a statement to get started</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Bank</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Period</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">File</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Opening Bal</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Closing Bal</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Lines</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Matched</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(stmt => (
                  <tr key={stmt.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{stmt.bank_name}</div>
                      <div className="text-xs text-gray-500">{stmt.bank_account_name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {formatDate(stmt.period_from)} - {formatDate(stmt.period_to)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{stmt.file_name || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(stmt.opening_balance)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrency(stmt.closing_balance)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">{stmt.line_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-medium">
                        {stmt.matched_count + stmt.excluded_count}/{stmt.line_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(stmt.status)}`}>
                        {stmt.status === 'reconciled' ? 'Reconciled' : stmt.status === 'in_progress' ? 'In Progress' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/accounting/bank/reconcile/${stmt.id}`}
                        className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-primary-300 rounded-lg hover:bg-primary-50 text-primary-700 transition-colors font-medium"
                      >
                        Reconcile <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Import Bank Statement</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <ComboBox
                label="Bank Account"
                required
                options={bankOptions}
                value={importForm.bank_account_id ? Number(importForm.bank_account_id) : null}
                onChange={v => setImportForm({ ...importForm, bank_account_id: String(v) })}
                placeholder="Select bank account..."
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={importForm.period_from}
                    onChange={e => setImportForm({ ...importForm, period_from: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={importForm.period_to}
                    onChange={e => setImportForm({ ...importForm, period_to: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={importForm.opening_balance}
                    onChange={e => setImportForm({ ...importForm, opening_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={importForm.closing_balance}
                    onChange={e => setImportForm({ ...importForm, closing_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or Paste CSV Data
                </label>
                <textarea
                  value={importForm.csv_text}
                  onChange={e => setImportForm({ ...importForm, csv_text: e.target.value })}
                  rows={6}
                  placeholder="Date,Description,Reference,Debit,Credit,Balance&#10;01/15/2025,Payment to vendor,CHK-001,50000,0,1450000&#10;01/16/2025,Tuition collection,OR-123,0,85000,1535000"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none font-mono"
                />
              </div>

              <button
                onClick={handleParse}
                className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
              >
                <Eye size={14} /> Parse & Preview
              </button>

              {/* Preview Table */}
              {showPreview && parsedLines.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">
                      Preview: {parsedLines.length} transaction{parsedLines.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-3 py-2">Date</th>
                          <th className="text-left px-3 py-2">Description</th>
                          <th className="text-left px-3 py-2">Reference</th>
                          <th className="text-right px-3 py-2">Debit</th>
                          <th className="text-right px-3 py-2">Credit</th>
                          <th className="text-right px-3 py-2">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedLines.map((line, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-1.5 font-mono">{line.transaction_date}</td>
                            <td className="px-3 py-1.5 max-w-[200px] truncate">{line.description}</td>
                            <td className="px-3 py-1.5">{line.reference}</td>
                            <td className="px-3 py-1.5 text-right font-mono">{line.debit > 0 ? formatCurrency(line.debit) : ''}</td>
                            <td className="px-3 py-1.5 text-right font-mono">{line.credit > 0 ? formatCurrency(line.credit) : ''}</td>
                            <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(line.running_balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closeModal} className="btn-secondary px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={submitting || parsedLines.length === 0}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Upload size={14} /> {submitting ? 'Importing...' : `Import ${parsedLines.length} Lines`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
