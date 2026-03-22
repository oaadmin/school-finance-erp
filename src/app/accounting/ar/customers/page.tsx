'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Plus, Search, Filter, Users, X } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  id: number;
  customer_code: string;
  customer_type: string;
  name: string;
  campus: string;
  grade_level: string;
  email: string;
  phone: string;
  total_invoiced: number;
  total_paid: number;
  balance: number;
  status: string;
}

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'student', label: 'Student' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'parent', label: 'Parent' },
];

const typeBadgeColor = (type: string): string => {
  const colors: Record<string, string> = {
    student: 'bg-blue-100 text-blue-700',
    corporate: 'bg-purple-100 text-purple-700',
    parent: 'bg-green-100 text-green-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
};

const statusBadgeColor = (status: string): string => {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    suspended: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export default function CustomersPage() {
  const { success, error } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_code: '',
    customer_type: 'student',
    name: '',
    campus: '',
    grade_level: '',
    email: '',
    phone: '',
    billing_address: '',
  });

  const loadCustomers = () => {
    const params = new URLSearchParams({ type: 'customers' });
    if (typeFilter) params.set('customer_type', typeFilter);
    fetch(`/api/accounting/ar?${params}`).then(r => r.json()).then(setCustomers);
  };

  useEffect(loadCustomers, [typeFilter]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/ar?type=customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        success('Customer Created', `Customer "${form.name}" has been added successfully.`);
        setShowModal(false);
        setForm({ customer_code: '', customer_type: 'student', name: '', campus: '', grade_level: '', email: '', phone: '', billing_address: '' });
        loadCustomers();
      } else {
        const err = await res.json().catch(() => ({}));
        error('Creation Failed', err.message || err.error || 'Could not create customer. Please try again.');
      }
    } catch (e) {
      error('Creation Failed', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = search
    ? customers.filter(c =>
        c.customer_code?.toLowerCase().includes(search.toLowerCase()) ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Customers / Student Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} customers</p>
        </div>
        <button className="btn-primary text-xs sm:text-sm" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="card">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search customers..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select className="select-field flex-1 sm:w-40" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th className="hidden sm:table-cell">Type</th>
                <th className="hidden lg:table-cell">Campus</th>
                <th className="hidden lg:table-cell">Grade/Level</th>
                <th className="hidden md:table-cell">Email</th>
                <th className="text-right hidden sm:table-cell">Total Invoiced</th>
                <th className="text-right hidden md:table-cell">Total Paid</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <span className="text-primary-600 font-medium flex items-center gap-1 text-xs sm:text-sm">
                      <Users size={14} className="hidden sm:block" /> {c.customer_code}
                    </span>
                  </td>
                  <td className="font-medium text-xs sm:text-sm">{c.name}</td>
                  <td className="hidden sm:table-cell">
                    <span className={`badge ${typeBadgeColor(c.customer_type)} text-[10px] sm:text-xs`}>
                      {c.customer_type}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell text-gray-500 text-xs sm:text-sm">{c.campus || '\u2014'}</td>
                  <td className="hidden lg:table-cell text-gray-500 text-xs sm:text-sm">{c.grade_level || '\u2014'}</td>
                  <td className="hidden md:table-cell text-gray-500 text-xs sm:text-sm">{c.email || '\u2014'}</td>
                  <td className="text-right hidden sm:table-cell">{formatCurrency(c.total_invoiced)}</td>
                  <td className="text-right hidden md:table-cell">{formatCurrency(c.total_paid)}</td>
                  <td className={`text-right font-medium text-xs sm:text-sm ${c.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(c.balance)}
                  </td>
                  <td>
                    <span className={`badge ${statusBadgeColor(c.status)} text-[10px] sm:text-xs`}>
                      {c.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Add Customer</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Customer Code</label>
                  <input className="input-field" placeholder="e.g. STU-2026-001"
                    value={form.customer_code} onChange={e => setForm({ ...form, customer_code: e.target.value })} />
                </div>
                <div>
                  <label className="label">Customer Type</label>
                  <select className="select-field" value={form.customer_type} onChange={e => setForm({ ...form, customer_type: e.target.value })}>
                    <option value="student">Student</option>
                    <option value="corporate">Corporate</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Name</label>
                <input className="input-field" placeholder="Full name"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Campus</label>
                  <input className="input-field" placeholder="Main Campus"
                    value={form.campus} onChange={e => setForm({ ...form, campus: e.target.value })} />
                </div>
                <div>
                  <label className="label">Grade / Level</label>
                  <input className="input-field" placeholder="Grade 10"
                    value={form.grade_level} onChange={e => setForm({ ...form, grade_level: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input className="input-field" type="email" placeholder="email@example.com"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input-field" type="tel" placeholder="+63 917 000 0000"
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Billing Address</label>
                <textarea className="input-field" rows={2} placeholder="Street, City, Province"
                  value={form.billing_address} onChange={e => setForm({ ...form, billing_address: e.target.value })} />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={submitting || !form.name || !form.customer_code}>
                <Plus size={16} /> {submitting ? 'Saving...' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
