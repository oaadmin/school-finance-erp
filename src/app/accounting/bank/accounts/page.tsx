'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Plus, Search, X, Save, Edit2, Building2, Landmark } from 'lucide-react';
import ComboBox from '@/components/ui/ComboBox';
import Link from 'next/link';

interface BankAccount {
  id: number;
  account_name: string;
  bank_name: string;
  account_number: string;
  gl_account_id: number | null;
  currency: string;
  is_active: number;
  account_code: string;
  gl_account_name: string;
  book_balance: number;
  statement_count: number;
  last_reconciled: string | null;
}

interface COAAccount {
  id: number;
  account_code: string;
  account_name: string;
  account_type: string;
}

const emptyForm = {
  account_name: '',
  bank_name: '',
  account_number: '',
  gl_account_id: '' as string,
  currency: 'PHP',
  is_active: true,
};

export default function BankAccounts() {
  const { success, error } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [coaAccounts, setCoaAccounts] = useState<COAAccount[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    fetch('/api/accounting/bank/accounts')
      .then(r => r.json())
      .then(data => { setAccounts(data); setLoading(false); })
      .catch(() => { error('Failed to load bank accounts'); setLoading(false); });
  };

  useEffect(loadData, []);

  useEffect(() => {
    if (showModal) {
      fetch('/api/accounting/coa')
        .then(r => r.json())
        .then((data: COAAccount[]) => {
          // Filter to Asset accounts (cash-type accounts)
          setCoaAccounts(data.filter(a => a.account_type === 'Asset'));
        });
    }
  }, [showModal]);

  const filtered = accounts.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.bank_name.toLowerCase().includes(q) ||
      a.account_name.toLowerCase().includes(q) ||
      (a.account_number || '').toLowerCase().includes(q) ||
      (a.account_code || '').toLowerCase().includes(q)
    );
  });

  const totalBalance = accounts.reduce((sum, a) => sum + (a.book_balance || 0), 0);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (acct: BankAccount) => {
    setEditingId(acct.id);
    setForm({
      account_name: acct.account_name,
      bank_name: acct.bank_name,
      account_number: acct.account_number || '',
      gl_account_id: acct.gl_account_id ? String(acct.gl_account_id) : '',
      currency: acct.currency || 'PHP',
      is_active: !!acct.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.account_name || !form.bank_name) {
      error('Validation Error', 'Account name and bank name are required');
      return;
    }
    setSubmitting(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const payload = {
        ...form,
        gl_account_id: form.gl_account_id ? Number(form.gl_account_id) : null,
        is_active: form.is_active ? 1 : 0,
        ...(editingId ? { id: editingId } : {}),
      };
      const res = await fetch('/api/accounting/bank/accounts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        success(editingId ? 'Account Updated' : 'Account Created');
        closeModal();
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        error('Save Failed', err.error || 'Could not save bank account');
      }
    } catch {
      error('Save Failed', 'Network error');
    }
    setSubmitting(false);
  };

  const glOptions = coaAccounts.map(a => ({
    value: a.id,
    label: `${a.account_code} - ${a.account_name}`,
    sublabel: a.account_type,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark size={24} className="text-primary-600" />
            Bank Accounts
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage bank accounts and view balances</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
          <Plus size={16} /> Add Bank Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="stat-card bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Total Accounts</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{accounts.length}</div>
        </div>
        <div className="stat-card bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500">Total Book Balance</div>
          <div className="text-2xl font-bold text-primary-700 mt-1">{formatCurrency(totalBalance)}</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by bank, account name, or number..."
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
          <div className="p-12 text-center text-gray-400">Loading bank accounts...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No bank accounts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Bank Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Account Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Account Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">GL Account</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Book Balance</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Statements</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Reconciled</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(acct => (
                  <tr key={acct.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400" />
                        {acct.bank_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{acct.account_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{acct.account_number || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {acct.account_code ? (
                        <span className="text-xs">
                          <span className="font-mono font-medium">{acct.account_code}</span> - {acct.gl_account_name}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                      {formatCurrency(acct.book_balance)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {acct.statement_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {acct.last_reconciled ? formatDate(acct.last_reconciled) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEdit(acct)}
                        className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Bank Account' : 'Add Bank Account'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={e => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="e.g., BDO, BPI, Metrobank"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.account_name}
                  onChange={e => setForm({ ...form, account_name: e.target.value })}
                  placeholder="e.g., BDO Savings - Operating"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={form.account_number}
                  onChange={e => setForm({ ...form, account_number: e.target.value })}
                  placeholder="e.g., 001-2345678-01"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
                />
              </div>
              <ComboBox
                label="GL Account"
                options={glOptions}
                value={form.gl_account_id ? Number(form.gl_account_id) : null}
                onChange={v => setForm({ ...form, gl_account_id: String(v) })}
                placeholder="Select GL Account..."
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
                >
                  <option value="PHP">PHP - Philippine Peso</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closeModal} className="btn-secondary px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Save size={14} /> {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
