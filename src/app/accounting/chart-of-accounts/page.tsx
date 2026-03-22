'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { Plus, Search, X, Save, Edit2, ChevronRight } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';

interface Account {
  id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  parent_id: number | null;
  normal_balance: string;
  is_active: number;
  is_postable: number;
  notes: string | null;
}

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

const emptyForm = {
  account_code: '',
  account_name: '',
  account_type: 'Asset',
  parent_id: '' as string,
  normal_balance: 'debit',
  is_active: true,
  is_postable: true,
  notes: '',
};

export default function ChartOfAccounts() {
  const { success, error } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const loadData = () => {
    fetch('/api/accounting/coa')
      .then((r) => r.json())
      .then(setAccounts);
  };

  useEffect(loadData, []);

  const filtered = accounts.filter((a) => {
    const matchesSearch =
      !search ||
      a.account_code.toLowerCase().includes(search.toLowerCase()) ||
      a.account_name.toLowerCase().includes(search.toLowerCase());
    const matchesType =
      !typeFilter || a.account_type.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  useEffect(() => setCurrentPage(1), [search, typeFilter]);

  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const parentAccounts = accounts.filter((a) => !a.parent_id);

  const getParentName = (parentId: number | null) => {
    if (!parentId) return null;
    const parent = accounts.find((a) => a.id === parentId);
    return parent ? parent.account_name : null;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (account: Account) => {
    setEditingId(account.id);
    setForm({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      parent_id: account.parent_id ? String(account.parent_id) : '',
      normal_balance: account.normal_balance,
      is_active: !!account.is_active,
      is_postable: !!account.is_postable,
      notes: account.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      is_active: form.is_active ? 1 : 0,
      is_postable: form.is_postable ? 1 : 0,
    };

    const url = editingId
      ? `/api/accounting/coa?id=${editingId}`
      : '/api/accounting/coa';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        success(editingId ? 'Account Updated' : 'Account Created', `Account "${form.account_code} - ${form.account_name}" has been ${editingId ? 'updated' : 'created'} successfully.`);
        setShowModal(false);
        setForm(emptyForm);
        setEditingId(null);
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        error('Save Failed', err.message || err.error || 'Could not save account. Please try again.');
      }
    } catch (e) {
      error('Save Failed', 'Network error. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Chart of Accounts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your general ledger account structure
          </p>
        </div>
        <button
          className="btn-primary text-xs sm:text-sm"
          onClick={openCreate}
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="input-field pl-9"
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select-field w-full sm:w-44"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th className="hidden sm:table-cell">Type</th>
                <th className="hidden sm:table-cell">Normal Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((a) => (
                <tr key={a.id}>
                  <td className="font-mono text-xs sm:text-sm font-medium">
                    {a.account_code}
                  </td>
                  <td>
                    <div
                      className="flex items-center gap-1"
                      style={{
                        paddingLeft: a.parent_id ? '1.5rem' : '0',
                      }}
                    >
                      {a.parent_id && (
                        <ChevronRight
                          size={12}
                          className="text-gray-300 flex-shrink-0"
                        />
                      )}
                      <span className="font-medium text-sm">
                        {a.account_name}
                      </span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span
                      className={`badge ${
                        a.account_type === 'Asset'
                          ? 'bg-blue-100 text-blue-700'
                          : a.account_type === 'Liability'
                          ? 'bg-red-100 text-red-700'
                          : a.account_type === 'Equity'
                          ? 'bg-purple-100 text-purple-700'
                          : a.account_type === 'Revenue'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      } text-[10px] sm:text-xs`}
                    >
                      {a.account_type}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell capitalize text-sm">
                    {a.normal_balance || (['asset', 'expense'].includes(a.account_type.toLowerCase()) ? 'debit' : 'credit')}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        a.is_active === 0
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-green-100 text-green-700'
                      } text-[10px] sm:text-xs`}
                    >
                      {a.is_active === 0 ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-gray-400 hover:text-primary-600 p-1"
                      onClick={() => openEdit(a)}
                      title="Edit account"
                    >
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-gray-400 text-sm py-8"
                  >
                    No accounts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? 'Edit Account' : 'Add New Account'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Account Code *</label>
                  <input
                    className="input-field"
                    value={form.account_code}
                    onChange={(e) =>
                      setForm({ ...form, account_code: e.target.value })
                    }
                    placeholder="1000-00"
                  />
                </div>
                <div>
                  <label className="label">Account Type *</label>
                  <select
                    className="select-field"
                    value={form.account_type}
                    onChange={(e) =>
                      setForm({ ...form, account_type: e.target.value })
                    }
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Account Name *</label>
                  <input
                    className="input-field"
                    value={form.account_name}
                    onChange={(e) =>
                      setForm({ ...form, account_name: e.target.value })
                    }
                    placeholder="e.g. Cash on Hand"
                  />
                </div>
                <div>
                  <label className="label">Parent Account</label>
                  <select
                    className="select-field"
                    value={form.parent_id}
                    onChange={(e) =>
                      setForm({ ...form, parent_id: e.target.value })
                    }
                  >
                    <option value="">None (Top-level)</option>
                    {parentAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_code} - {a.account_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Normal Balance *</label>
                  <select
                    className="select-field"
                    value={form.normal_balance}
                    onChange={(e) =>
                      setForm({ ...form, normal_balance: e.target.value })
                    }
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                <div className="flex items-center gap-6 sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm({ ...form, is_active: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_postable}
                      onChange={(e) =>
                        setForm({ ...form, is_postable: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Postable</span>
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Notes</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Optional notes about this account..."
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                className="btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave}>
                <Save size={16} /> {editingId ? 'Update Account' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
