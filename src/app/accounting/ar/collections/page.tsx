'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Receipt, Plus, Search, DollarSign, Hash, X } from 'lucide-react';
import Link from 'next/link';

interface Collection {
  id: number;
  or_number: string;
  collection_date: string;
  customer_id: number;
  customer_name: string;
  payment_method: string;
  amount_received: number;
  amount_applied: number;
  amount_unapplied: number;
  reference_number: string;
  remarks: string;
  status: string;
}

interface Customer {
  id: number;
  customer_code: string;
  name: string;
}

const collectionStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-green-100 text-green-700',
    applied: 'bg-blue-100 text-blue-700',
    partially_applied: 'bg-amber-100 text-amber-700',
    voided: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const collectionStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: 'Draft',
    posted: 'Posted',
    applied: 'Applied',
    partially_applied: 'Partially Applied',
    voided: 'Voided',
  };
  return labels[status] || status;
};

const methodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    cash: 'Cash',
    check: 'Check',
    bank_transfer: 'Bank Transfer',
    online: 'Online',
  };
  return labels[method] || method;
};

export default function CollectionsPage() {
  const { success, error } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    collection_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    amount_received: 0,
    reference_number: '',
    remarks: '',
  });

  const loadCollections = () => {
    fetch('/api/accounting/ar?type=collections').then(r => r.json()).then(setCollections);
  };

  useEffect(loadCollections, []);

  useEffect(() => {
    if (showModal) {
      fetch('/api/accounting/ar?type=customers').then(r => r.json()).then(setCustomers);
    }
  }, [showModal]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/ar?type=collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        success('Collection Created', `Collection ${data.or_number || ''} has been recorded successfully.`);
        setShowModal(false);
        setForm({ customer_id: '', collection_date: new Date().toISOString().split('T')[0], payment_method: 'cash', amount_received: 0, reference_number: '', remarks: '' });
        loadCollections();
      } else {
        const err = await res.json().catch(() => ({}));
        error('Creation Failed', err.message || err.error || 'Could not create collection. Please try again.');
      }
    } catch (e) {
      error('Creation Failed', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = search
    ? collections.filter(c =>
        c.or_number?.toLowerCase().includes(search.toLowerCase()) ||
        c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.reference_number?.toLowerCase().includes(search.toLowerCase())
      )
    : collections;

  const totalCollected = filtered.reduce((s, c) => s + (c.amount_received || 0), 0);
  const receiptsCount = filtered.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Collections / Official Receipts</h1>
          <p className="text-sm text-gray-500 mt-1">Track payments received from customers</p>
        </div>
        <button className="btn-primary text-xs sm:text-sm" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Collection
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Collected</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(totalCollected)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Hash size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Receipts Count</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{receiptsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search collections..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>OR #</th>
                <th className="hidden sm:table-cell">Date</th>
                <th>Customer</th>
                <th className="hidden md:table-cell">Method</th>
                <th className="text-right">Amount Received</th>
                <th className="text-right hidden sm:table-cell">Applied</th>
                <th className="text-right hidden md:table-cell">Unapplied</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <span className="text-primary-600 font-medium flex items-center gap-1 text-xs sm:text-sm">
                      <Receipt size={14} className="hidden sm:block" /> {c.or_number}
                    </span>
                  </td>
                  <td className="text-gray-500 hidden sm:table-cell">{formatDate(c.collection_date)}</td>
                  <td className="font-medium text-xs sm:text-sm">{c.customer_name || '\u2014'}</td>
                  <td className="hidden md:table-cell text-xs">
                    <span className="badge bg-gray-100 text-gray-700 text-[10px] sm:text-xs">{methodLabel(c.payment_method)}</span>
                  </td>
                  <td className="text-right font-medium text-xs sm:text-sm">{formatCurrency(c.amount_received)}</td>
                  <td className="text-right hidden sm:table-cell">{formatCurrency(c.amount_applied)}</td>
                  <td className={`text-right hidden md:table-cell ${c.amount_unapplied > 0 ? 'text-amber-600 font-medium' : ''}`}>
                    {formatCurrency(c.amount_unapplied)}
                  </td>
                  <td>
                    <span className={`badge ${collectionStatusColor(c.status)} text-[10px] sm:text-xs`}>
                      {collectionStatusLabel(c.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No collection records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Collection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">New Collection</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Customer</label>
                <select className="select-field" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.customer_code} - {c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Collection Date</label>
                  <input className="input-field" type="date" value={form.collection_date}
                    onChange={e => setForm({ ...form, collection_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Payment Method</label>
                  <select className="select-field" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Amount Received</label>
                  <input className="input-field text-right" type="number" min={0} step="0.01"
                    value={form.amount_received || ''}
                    onChange={e => setForm({ ...form, amount_received: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="label">Reference Number</label>
                  <input className="input-field" placeholder="Check #, transaction ref"
                    value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Remarks</label>
                <textarea className="input-field" rows={2} placeholder="Additional notes"
                  value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={submitting || !form.customer_id || !form.amount_received}>
                <Plus size={16} /> {submitting ? 'Saving...' : 'Create Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
