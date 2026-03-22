'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { FileText, Plus, Search, Filter, DollarSign, AlertCircle, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_id: number;
  customer_name: string;
  school_year: string;
  semester: string;
  description: string;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
}

interface Customer {
  id: number;
  customer_code: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

const invoiceStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    posted: 'bg-blue-100 text-blue-700',
    partially_paid: 'bg-amber-100 text-amber-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const invoiceStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: 'Draft',
    posted: 'Posted',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    overdue: 'Overdue',
  };
  return labels[status] || status;
};

export default function InvoicesPage() {
  const { success, error } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    school_year: '',
    semester: '',
    description: '',
    gross_amount: 0,
    discount_amount: 0,
  });

  const loadInvoices = () => {
    const params = new URLSearchParams({ type: 'invoices' });
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/accounting/ar?${params}`).then(r => r.json()).then(setInvoices);
  };

  useEffect(loadInvoices, [statusFilter]);

  useEffect(() => {
    if (showModal) {
      fetch('/api/accounting/ar?type=customers').then(r => r.json()).then(setCustomers);
    }
  }, [showModal]);

  const netAmount = form.gross_amount - form.discount_amount;

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/ar?type=invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, net_amount: netAmount }),
      });
      if (res.ok) {
        const data = await res.json();
        success('Invoice Created', `Invoice ${data.invoice_number || ''} has been created successfully.`);
        setShowModal(false);
        setForm({ customer_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', school_year: '', semester: '', description: '', gross_amount: 0, discount_amount: 0 });
        loadInvoices();
      } else {
        const err = await res.json().catch(() => ({}));
        error('Creation Failed', err.message || err.error || 'Could not create invoice. Please try again.');
      }
    } catch (e) {
      error('Creation Failed', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = search
    ? invoices.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.description?.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  const totalInvoiced = filtered.reduce((s, i) => s + (i.net_amount || 0), 0);
  const totalCollected = filtered.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const totalOutstanding = filtered.reduce((s, i) => s + (i.balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AR Invoices / Charges</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} invoices</p>
        </div>
        <button className="btn-primary text-xs sm:text-sm" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Invoiced</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(totalInvoiced)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Collected</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(totalCollected)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Outstanding</p>
              <p className="text-lg sm:text-xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="card">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search invoices..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select className="select-field flex-1 sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th className="hidden sm:table-cell">Date</th>
                <th>Customer</th>
                <th className="hidden lg:table-cell">School Year</th>
                <th className="hidden lg:table-cell">Semester</th>
                <th className="hidden xl:table-cell">Description</th>
                <th className="text-right hidden sm:table-cell">Gross</th>
                <th className="text-right hidden md:table-cell">Discount</th>
                <th className="text-right hidden sm:table-cell">Net</th>
                <th className="text-right hidden md:table-cell">Paid</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td>
                    <span className="text-primary-600 font-medium flex items-center gap-1 text-xs sm:text-sm">
                      <FileText size={14} className="hidden sm:block" /> {inv.invoice_number}
                    </span>
                  </td>
                  <td className="text-gray-500 hidden sm:table-cell">{formatDate(inv.invoice_date)}</td>
                  <td className="font-medium text-xs sm:text-sm">{inv.customer_name || '\u2014'}</td>
                  <td className="hidden lg:table-cell text-gray-500 text-xs">{inv.school_year || '\u2014'}</td>
                  <td className="hidden lg:table-cell text-gray-500 text-xs">{inv.semester || '\u2014'}</td>
                  <td className="max-w-[180px] truncate hidden xl:table-cell text-gray-500 text-xs">{inv.description}</td>
                  <td className="text-right hidden sm:table-cell">{formatCurrency(inv.gross_amount)}</td>
                  <td className="text-right hidden md:table-cell">{formatCurrency(inv.discount_amount)}</td>
                  <td className="text-right hidden sm:table-cell font-medium">{formatCurrency(inv.net_amount)}</td>
                  <td className="text-right hidden md:table-cell">{formatCurrency(inv.amount_paid)}</td>
                  <td className={`text-right font-medium text-xs sm:text-sm ${inv.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(inv.balance)}
                  </td>
                  <td>
                    <span className={`badge ${invoiceStatusColor(inv.status)} text-[10px] sm:text-xs`}>
                      {invoiceStatusLabel(inv.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="text-center py-8 text-gray-500">No invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">New Invoice</h2>
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
                  <label className="label">Invoice Date</label>
                  <input className="input-field" type="date" value={form.invoice_date}
                    onChange={e => setForm({ ...form, invoice_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input className="input-field" type="date" value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">School Year</label>
                  <input className="input-field" placeholder="2025-2026" value={form.school_year}
                    onChange={e => setForm({ ...form, school_year: e.target.value })} />
                </div>
                <div>
                  <label className="label">Semester</label>
                  <select className="select-field" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="1st">1st Semester</option>
                    <option value="2nd">2nd Semester</option>
                    <option value="summer">Summer</option>
                    <option value="full_year">Full Year</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input-field" rows={2} placeholder="Tuition fee, miscellaneous, etc."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <hr />
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>Gross Amount</span>
                  <input className="input-field w-40 text-right" type="number" min={0} step="0.01"
                    value={form.gross_amount || ''}
                    onChange={e => setForm({ ...form, gross_amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Discount</span>
                  <input className="input-field w-40 text-right" type="number" min={0} step="0.01"
                    value={form.discount_amount || ''}
                    onChange={e => setForm({ ...form, discount_amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Amount</span>
                  <span className="text-green-600">{formatCurrency(netAmount)}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={submitting || !form.customer_id || !form.gross_amount}>
                <Plus size={16} /> {submitting ? 'Saving...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
