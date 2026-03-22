'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { printDocument } from '@/lib/print-document';
import {
  ArrowLeft, Printer, Wand2, CheckCircle2, Circle, MinusCircle,
  Link2, Unlink, Ban, Loader2, CheckCheck,
} from 'lucide-react';
import Link from 'next/link';

interface StatementLine {
  id: number;
  statement_id: number;
  transaction_date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  running_balance: number;
  matched_je_line_id: number | null;
  match_status: string;
  matched_at: string | null;
  matched_je_description: string | null;
  matched_je_number: string | null;
  matched_je_date: string | null;
}

interface BookEntry {
  id: number;
  journal_entry_id: number;
  account_id: number;
  description: string;
  debit: number;
  credit: number;
  entry_number: string;
  entry_date: string;
  je_description: string;
  status: string;
  matched_statement_line_id: number | null;
}

interface StatementData {
  id: number;
  bank_account_id: number;
  bank_name: string;
  bank_account_name: string;
  account_number: string;
  gl_account_id: number;
  gl_account_code: string;
  gl_account_name: string;
  period_from: string;
  period_to: string;
  opening_balance: number;
  closing_balance: number;
  status: string;
}

export default function ReconciliationWorkspace() {
  const params = useParams();
  const id = params.id as string;
  const { success, error } = useToast();

  const [statement, setStatement] = useState<StatementData | null>(null);
  const [bankLines, setBankLines] = useState<StatementLine[]>([]);
  const [bookEntries, setBookEntries] = useState<BookEntry[]>([]);
  const [selectedBankLine, setSelectedBankLine] = useState<number | null>(null);
  const [selectedBookEntry, setSelectedBookEntry] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    fetch(`/api/accounting/bank/statements/${id}`)
      .then(r => r.json())
      .then(data => {
        setStatement(data.statement);
        setBankLines(data.lines || []);
        setBookEntries(data.bookEntries || []);
        setLoading(false);
      })
      .catch(() => { error('Failed to load reconciliation data'); setLoading(false); });
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculated values
  const bankBalance = statement?.closing_balance || 0;
  const bookBalance = bookEntries.reduce((sum, be) => sum + (be.debit - be.credit), 0);
  const difference = bankBalance - bookBalance;
  const totalLines = bankLines.length;
  const matchedLines = bankLines.filter(l => l.match_status === 'matched').length;
  const excludedLines = bankLines.filter(l => l.match_status === 'excluded').length;
  const isReconciled = statement?.status === 'reconciled';

  const handleMatch = async () => {
    if (!selectedBankLine || !selectedBookEntry) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/accounting/bank/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match',
          statement_line_id: selectedBankLine,
          je_line_id: selectedBookEntry,
        }),
      });
      if (res.ok) {
        success('Matched', 'Lines matched successfully');
        setSelectedBankLine(null);
        setSelectedBookEntry(null);
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        error('Match Failed', err.error || 'Could not match lines');
      }
    } catch {
      error('Match Failed', 'Network error');
    }
    setActionLoading(false);
  };

  const handleUnmatch = async (lineId: number) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/accounting/bank/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unmatch', statement_line_id: lineId }),
      });
      if (res.ok) {
        success('Unmatched', 'Match removed');
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        error('Unmatch Failed', err.error || 'Could not unmatch');
      }
    } catch {
      error('Unmatch Failed', 'Network error');
    }
    setActionLoading(false);
  };

  const handleExclude = async () => {
    if (!selectedBankLine) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/accounting/bank/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exclude', statement_line_id: selectedBankLine }),
      });
      if (res.ok) {
        success('Excluded', 'Line marked as excluded');
        setSelectedBankLine(null);
        loadData();
      } else {
        error('Exclude Failed', 'Could not exclude line');
      }
    } catch {
      error('Exclude Failed', 'Network error');
    }
    setActionLoading(false);
  };

  const handleAutoMatch = async () => {
    setAutoMatchLoading(true);
    try {
      const res = await fetch('/api/accounting/bank/reconcile/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement_id: Number(id) }),
      });
      if (res.ok) {
        const data = await res.json();
        success('Auto-Match Complete', data.message);
        loadData();
      } else {
        error('Auto-Match Failed', 'Could not run auto-match');
      }
    } catch {
      error('Auto-Match Failed', 'Network error');
    }
    setAutoMatchLoading(false);
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/accounting/bank/statements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'reconciled', reconciled_by: 'Finance Staff' }),
      });
      if (res.ok) {
        success('Reconciliation Complete', 'Statement has been marked as reconciled');
        loadData();
      } else {
        error('Failed', 'Could not complete reconciliation');
      }
    } catch {
      error('Failed', 'Network error');
    }
    setActionLoading(false);
  };

  const handleReopen = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/accounting/bank/statements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      if (res.ok) {
        success('Reopened', 'Reconciliation reopened for editing');
        loadData();
      } else {
        error('Failed', 'Could not reopen reconciliation');
      }
    } catch {
      error('Failed', 'Network error');
    }
    setActionLoading(false);
  };

  const handlePrint = () => {
    if (!statement) return;
    const matchedBankLines = bankLines.filter(l => l.match_status === 'matched');
    const unmatchedBankLines = bankLines.filter(l => l.match_status === 'unmatched');
    const excludedBankLines = bankLines.filter(l => l.match_status === 'excluded');

    const content = `
      <table>
        <tr><td><strong>Bank:</strong></td><td>${statement.bank_name} - ${statement.bank_account_name}</td></tr>
        <tr><td><strong>Account No:</strong></td><td>${statement.account_number || '-'}</td></tr>
        <tr><td><strong>Period:</strong></td><td>${formatDate(statement.period_from)} to ${formatDate(statement.period_to)}</td></tr>
        <tr><td><strong>Status:</strong></td><td>${statement.status}</td></tr>
      </table>

      <table style="margin-top:16px">
        <tr>
          <td style="width:33%;text-align:center;padding:8px;background:#f0f4f8;border:1px solid #d0d7de">
            <div style="font-size:9px;color:#666;text-transform:uppercase">Bank Balance</div>
            <div style="font-size:14px;font-weight:700">${formatCurrency(bankBalance)}</div>
          </td>
          <td style="width:33%;text-align:center;padding:8px;background:#f0f4f8;border:1px solid #d0d7de">
            <div style="font-size:9px;color:#666;text-transform:uppercase">Book Balance</div>
            <div style="font-size:14px;font-weight:700">${formatCurrency(bookBalance)}</div>
          </td>
          <td style="width:33%;text-align:center;padding:8px;background:#f0f4f8;border:1px solid #d0d7de">
            <div style="font-size:9px;color:#666;text-transform:uppercase">Difference</div>
            <div style="font-size:14px;font-weight:700;color:${Math.abs(difference) < 0.01 ? '#16a34a' : '#dc2626'}">${formatCurrency(difference)}</div>
          </td>
        </tr>
      </table>

      <h3 style="margin-top:20px;font-size:12px;color:#1e3a5f">Matched Items (${matchedBankLines.length})</h3>
      <table>
        <thead><tr>
          <th>Date</th><th>Description</th><th>Reference</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th>Matched JE</th>
        </tr></thead>
        <tbody>
          ${matchedBankLines.map(l => `<tr>
            <td>${formatDate(l.transaction_date)}</td>
            <td>${l.description}</td>
            <td>${l.reference || '-'}</td>
            <td class="amount">${l.debit > 0 ? formatCurrency(l.debit) : ''}</td>
            <td class="amount">${l.credit > 0 ? formatCurrency(l.credit) : ''}</td>
            <td>${l.matched_je_number || '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      ${unmatchedBankLines.length > 0 ? `
        <h3 style="margin-top:20px;font-size:12px;color:#1e3a5f">Unmatched Items (${unmatchedBankLines.length})</h3>
        <table>
          <thead><tr>
            <th>Date</th><th>Description</th><th>Reference</th><th class="text-right">Debit</th><th class="text-right">Credit</th>
          </tr></thead>
          <tbody>
            ${unmatchedBankLines.map(l => `<tr>
              <td>${formatDate(l.transaction_date)}</td>
              <td>${l.description}</td>
              <td>${l.reference || '-'}</td>
              <td class="amount">${l.debit > 0 ? formatCurrency(l.debit) : ''}</td>
              <td class="amount">${l.credit > 0 ? formatCurrency(l.credit) : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      ` : ''}

      ${excludedBankLines.length > 0 ? `
        <h3 style="margin-top:20px;font-size:12px;color:#1e3a5f">Excluded Items (${excludedBankLines.length})</h3>
        <table>
          <thead><tr>
            <th>Date</th><th>Description</th><th>Reference</th><th class="text-right">Debit</th><th class="text-right">Credit</th>
          </tr></thead>
          <tbody>
            ${excludedBankLines.map(l => `<tr>
              <td>${formatDate(l.transaction_date)}</td>
              <td>${l.description}</td>
              <td>${l.reference || '-'}</td>
              <td class="amount">${l.debit > 0 ? formatCurrency(l.debit) : ''}</td>
              <td class="amount">${l.credit > 0 ? formatCurrency(l.credit) : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      ` : ''}
    `;

    printDocument({
      title: 'Bank Reconciliation Report',
      subtitle: `${statement.bank_name} - ${statement.bank_account_name}`,
      date: new Date().toLocaleDateString('en-PH'),
      content,
    });
  };

  const getLineStatusIcon = (status: string) => {
    switch (status) {
      case 'matched': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'excluded': return <MinusCircle size={14} className="text-gray-400" />;
      default: return <Circle size={14} className="text-gray-300" />;
    }
  };

  const getLineBg = (lineId: number, status: string, isSelected: boolean) => {
    if (isSelected) return 'bg-blue-50 border-blue-300';
    switch (status) {
      case 'matched': return 'bg-green-50 border-green-200';
      case 'excluded': return 'bg-gray-50 border-gray-200 opacity-60';
      default: return 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30';
    }
  };

  const getBookBg = (entryId: number, matchedId: number | null, isSelected: boolean) => {
    if (isSelected) return 'bg-blue-50 border-blue-300';
    if (matchedId) return 'bg-green-50 border-green-200';
    return 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30';
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary-600 mr-3" />
          <span className="text-gray-500">Loading reconciliation data...</span>
        </div>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-20 text-gray-400">Statement not found</div>
      </div>
    );
  }

  const selectedBank = selectedBankLine ? bankLines.find(l => l.id === selectedBankLine) : null;
  const selectedBook = selectedBookEntry ? bookEntries.find(e => e.id === selectedBookEntry) : null;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/accounting/bank/statements" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Bank Reconciliation: {statement.bank_name} - {statement.bank_account_name}
            </h1>
            <p className="text-sm text-gray-500">
              {formatDate(statement.period_from)} to {formatDate(statement.period_to)}
              {statement.account_number && <span className="ml-2 font-mono">({statement.account_number})</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isReconciled && (
            <button
              onClick={handleAutoMatch}
              disabled={autoMatchLoading || actionLoading}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium disabled:opacity-50"
            >
              {autoMatchLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Auto-Match
            </button>
          )}
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
          >
            <Printer size={14} /> Print
          </button>
          {isReconciled ? (
            <button
              onClick={handleReopen}
              disabled={actionLoading}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm border border-amber-300 rounded-lg hover:bg-amber-50 text-amber-700 font-medium disabled:opacity-50"
            >
              Reopen
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={actionLoading || Math.abs(difference) >= 0.01}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              title={Math.abs(difference) >= 0.01 ? 'Difference must be zero to complete' : ''}
            >
              <CheckCheck size={14} /> Complete Reconciliation
            </button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Bank Balance</div>
          <div className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(bankBalance)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Book Balance</div>
          <div className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(bookBalance)}</div>
        </div>
        <div className={`rounded-lg border p-4 text-center ${Math.abs(difference) < 0.01 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Difference</div>
          <div className={`text-lg font-bold mt-1 ${Math.abs(difference) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(difference)}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Matched</div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {matchedLines + excludedLines}/{totalLines}
          </div>
          {isReconciled && (
            <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Reconciled</span>
          )}
        </div>
      </div>

      {/* Action Bar */}
      {!isReconciled && (
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap items-center gap-3">
          <div className="text-sm text-gray-600 flex-1 min-w-0">
            {selectedBank ? (
              <span>
                <span className="font-medium text-blue-700">Bank:</span>{' '}
                {formatDate(selectedBank.transaction_date)} &mdash; {selectedBank.description}{' '}
                <span className="font-mono font-medium">
                  {selectedBank.debit > 0 ? `-${formatCurrency(selectedBank.debit)}` : `+${formatCurrency(selectedBank.credit)}`}
                </span>
              </span>
            ) : (
              <span className="text-gray-400">Select a bank line to begin matching</span>
            )}
            {selectedBank && selectedBook && (
              <span className="mx-2 text-gray-300">|</span>
            )}
            {selectedBook && (
              <span>
                <span className="font-medium text-blue-700">Book:</span>{' '}
                {selectedBook.entry_number} {formatDate(selectedBook.entry_date)} &mdash;{' '}
                <span className="font-mono font-medium">
                  {selectedBook.debit > 0 ? `DR ${formatCurrency(selectedBook.debit)}` : `CR ${formatCurrency(selectedBook.credit)}`}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMatch}
              disabled={!selectedBankLine || !selectedBookEntry || actionLoading}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              <Link2 size={14} /> Match
            </button>
            <button
              onClick={handleExclude}
              disabled={!selectedBankLine || actionLoading}
              className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            >
              <Ban size={14} /> Exclude
            </button>
            <button
              onClick={() => { setSelectedBankLine(null); setSelectedBookEntry(null); }}
              className="btn-secondary px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bank Statement Lines */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Bank Statement Lines</h3>
            <div className="text-xs text-gray-500 mt-0.5">
              {bankLines.length} total &middot; {matchedLines} matched &middot; {excludedLines} excluded
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
            {bankLines.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No statement lines</div>
            ) : (
              <div className="p-2 space-y-1">
                {bankLines.map(line => {
                  const isSelected = selectedBankLine === line.id;
                  const amount = line.debit > 0 ? line.debit : line.credit;
                  const isDebit = line.debit > 0;
                  return (
                    <div
                      key={line.id}
                      onClick={() => {
                        if (isReconciled || line.match_status === 'matched') return;
                        setSelectedBankLine(isSelected ? null : line.id);
                      }}
                      className={`border rounded-lg p-3 transition-all ${
                        isReconciled || line.match_status === 'matched'
                          ? 'cursor-default'
                          : 'cursor-pointer'
                      } ${getLineBg(line.id, line.match_status, isSelected)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {getLineStatusIcon(line.match_status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-mono">{formatDate(line.transaction_date)}</span>
                              {line.reference && <span className="text-xs text-gray-400">{line.reference}</span>}
                            </div>
                            <div className={`text-sm mt-0.5 ${line.match_status === 'excluded' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {line.description || 'No description'}
                            </div>
                            {line.match_status === 'matched' && line.matched_je_number && (
                              <div className="text-xs text-green-600 mt-0.5">
                                Matched: {line.matched_je_number}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`font-mono text-sm font-medium ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                            {isDebit ? '-' : '+'}{formatCurrency(amount)}
                          </span>
                          {line.match_status === 'matched' && !isReconciled && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUnmatch(line.id); }}
                              className="text-gray-400 hover:text-red-500 p-1"
                              title="Unmatch"
                            >
                              <Unlink size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Book Entries (GL) */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Book Entries (GL)</h3>
            <div className="text-xs text-gray-500 mt-0.5">
              {statement.gl_account_code} - {statement.gl_account_name} &middot; {bookEntries.length} entries
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
            {bookEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No book entries for this period</div>
            ) : (
              <div className="p-2 space-y-1">
                {bookEntries.map(entry => {
                  const isSelected = selectedBookEntry === entry.id;
                  const isMatched = !!entry.matched_statement_line_id;
                  const amount = entry.debit > 0 ? entry.debit : entry.credit;
                  const isDebit = entry.debit > 0;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => {
                        if (isReconciled || isMatched) return;
                        setSelectedBookEntry(isSelected ? null : entry.id);
                      }}
                      className={`border rounded-lg p-3 transition-all ${
                        isReconciled || isMatched
                          ? 'cursor-default'
                          : 'cursor-pointer'
                      } ${getBookBg(entry.id, entry.matched_statement_line_id, isSelected)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {isMatched ? (
                            <CheckCircle2 size={14} className="text-green-500" />
                          ) : (
                            <Circle size={14} className="text-gray-300" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-primary-700 font-mono">{entry.entry_number}</span>
                              <span className="text-xs text-gray-500 font-mono">{formatDate(entry.entry_date)}</span>
                            </div>
                            <div className="text-sm text-gray-800 mt-0.5">
                              {entry.description || entry.je_description || 'No description'}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`font-mono text-sm font-medium ${isDebit ? 'text-blue-600' : 'text-orange-600'}`}>
                            {isDebit ? 'DR' : 'CR'} {formatCurrency(amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
