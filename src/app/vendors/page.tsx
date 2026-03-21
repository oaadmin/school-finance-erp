'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Users, Plus, Search, X, Save, Building2, User } from 'lucide-react';

interface Payee {
  id: number; payee_code: string; name: string; type: string; contact_person: string;
  email: string; phone: string; address: string; tin: string; bank_name: string;
  bank_account_number: string; is_active: number;
  payment_count: number; total_paid: number; outstanding_count: number; outstanding_amount: number;
}

export default function VendorManagement() {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    payee_code: '', name: '', type: 'vendor', contact_person: '',
    email: '', phone: '', address: '', tin: '',
    bank_name: '', bank_account_number: '', bank_branch: '',
  });

  const loadData = () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (search) params.set('search', search);
    fetch(`/api/payees?${params}`).then(r => r.json()).then(setPayees);
  };

  useEffect(loadData, [typeFilter, search]);

  const handleCreate = async () => {
    const res = await fetch('/api/payees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ payee_code: '', name: '', type: 'vendor', contact_person: '', email: '', phone: '', address: '', tin: '', bank_name: '', bank_account_number: '', bank_branch: '' });
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Vendor / Payee Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage vendors, suppliers, and employee payees</p>
        </div>
        <button className="btn-primary text-xs sm:text-sm" onClick={() => setShowModal(true)}><Plus size={16} /> Add Payee</button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search by name or code..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-field w-40" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="vendor">Vendor</option>
            <option value="employee">Employee</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Type</th><th>Contact</th><th>TIN</th>
                <th>Bank</th><th className="text-right">Total Paid</th>
                <th className="text-right">Outstanding</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payees.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.payee_code}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {p.type === 'vendor' ? <Building2 size={14} className="text-blue-500" /> : <User size={14} className="text-green-500" />}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="capitalize">{p.type}</td>
                  <td>
                    <div className="text-xs">
                      {p.contact_person && <p>{p.contact_person}</p>}
                      {p.email && <p className="text-gray-400">{p.email}</p>}
                      {p.phone && <p className="text-gray-400">{p.phone}</p>}
                    </div>
                  </td>
                  <td className="text-xs">{p.tin || '—'}</td>
                  <td className="text-xs">{p.bank_name ? `${p.bank_name} - ${p.bank_account_number}` : '—'}</td>
                  <td className="text-right font-medium">{formatCurrency(p.total_paid)}</td>
                  <td className="text-right">
                    {p.outstanding_count > 0 ? (
                      <span className="text-amber-600 font-medium">{formatCurrency(p.outstanding_amount)} ({p.outstanding_count})</span>
                    ) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Add New Payee</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Payee Code *</label><input className="input-field" value={form.payee_code} onChange={e => setForm({...form, payee_code: e.target.value})} placeholder="V-006" /></div>
                <div><label className="label">Type</label>
                  <select className="select-field" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="vendor">Vendor</option><option value="employee">Employee</option><option value="other">Other</option>
                  </select>
                </div>
                <div className="col-span-2"><label className="label">Name *</label><input className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><label className="label">Contact Person</label><input className="input-field" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
                <div><label className="label">Email</label><input className="input-field" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div><label className="label">Phone</label><input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div><label className="label">TIN</label><input className="input-field" value={form.tin} onChange={e => setForm({...form, tin: e.target.value})} placeholder="123-456-789-000" /></div>
                <div className="col-span-2"><label className="label">Address</label><input className="input-field" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                <div><label className="label">Bank Name</label><input className="input-field" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} /></div>
                <div><label className="label">Bank Account #</label><input className="input-field" value={form.bank_account_number} onChange={e => setForm({...form, bank_account_number: e.target.value})} /></div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate}><Save size={16} /> Save Payee</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
