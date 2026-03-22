'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, getStatusColor, getStatusLabel, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { FileText, Filter, Plus, Search, X, Edit2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import ComboBox from '@/components/ui/ComboBox';
import Pagination from '@/components/ui/Pagination';

interface Bill {
  id: number;
  bill_number: string;
  bill_date: string;
  due_date: string;
  vendor_name: string;
  description: string;
  gross_amount: number;
  vat_amount: number;
  withholding_tax: number;
  net_payable: number;
  balance: number;
  status: string;
}

interface Vendor {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'posted', label: 'Posted' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'voided', label: 'Voided' },
];

const billStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    approved: 'bg-blue-100 text-blue-700',
    posted: 'bg-green-100 text-green-700',
    paid: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    voided: 'bg-gray-200 text-gray-500',
  };
  return colors[status] || getStatusColor(status);
};

export default function SupplierBills() {
  const { success, error } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [form, setForm] = useState({
    vendor_id: '',
    department_id: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    description: '',
    gross_amount: 0,
    vat_amount: 0,
    withholding_tax: 0,
    net_payable: 0,
  });

  const [voidTarget, setVoidTarget] = useState<Bill | null>(null);

  const handleVoid = async () => {
    if (!voidTarget) return;
    try {
      const res = await fetch('/api/accounting/ap/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voidTarget.id, type: 'bill' }),
      });
      if (res.ok) {
        const data = await res.json();
        success('Bill Voided', data.message || `Bill ${voidTarget.bill_number} has been voided.`);
        loadBills();
      } else {
        const err = await res.json().catch(() => ({}));
        error('Void Failed', err.error || 'Could not void bill. Please try again.');
      }
    } catch (e) {
      error('Void Failed', 'Network error. Please try again.');
    }
    setVoidTarget(null);
  };

  const loadBills = () => {
    const params = new URLSearchParams({ type: 'bills' });
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/accounting/ap?${params}`).then(r => r.json()).then(setBills);
  };

  useEffect(loadBills, [statusFilter]);

  useEffect(() => {
    if (showModal) {
      fetch('/api/payees').then(r => r.json()).then(setVendors);
      fetch('/api/settings').then(r => r.json()).then((data: Department[] | { departments: Department[] }) => {
        setDepartments(Array.isArray(data) ? data : (data as { departments: Department[] }).departments || []);
      });
    }
  }, [showModal]);

  const updateGross = (gross: number) => {
    const vat = Math.round(gross * 0.12 * 100) / 100;
    const wht = Math.round(gross * 0.02 * 100) / 100;
    const net = gross + vat - wht;
    setForm({ ...form, gross_amount: gross, vat_amount: vat, withholding_tax: wht, net_payable: Math.round(net * 100) / 100 });
  };

  const emptyForm = { vendor_id: '', department_id: '', bill_date: new Date().toISOString().split('T')[0], due_date: '', description: '', gross_amount: 0, vat_amount: 0, withholding_tax: 0, net_payable: 0 };

  const openEdit = (b: Bill) => {
    setEditingId(b.id);
    setForm({
      vendor_id: '', department_id: '',
      bill_date: b.bill_date || '', due_date: b.due_date || '',
      description: b.description || '',
      gross_amount: b.gross_amount || 0, vat_amount: b.vat_amount || 0,
      withholding_tax: b.withholding_tax || 0, net_payable: b.net_payable || 0,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const payload = editingId ? { ...form, id: editingId } : form;
      const res = await fetch('/api/accounting/ap', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        success(editingId ? 'Bill Updated' : 'Bill Created', `Bill ${data.bill_number || ''} has been ${editingId ? 'updated' : 'created'} successfully.`);
        closeModal();
        loadBills();
      } else {
        const err = await res.json().catch(() => ({}));
        error(editingId ? 'Update Failed' : 'Creation Failed', err.message || err.error || 'Could not save bill. Please try again.');
      }
    } catch (e) {
      error('Save Failed', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = search
    ? bills.filter(b =>
        b.bill_number?.toLowerCase().includes(search.toLowerCase()) ||
        b.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.description?.toLowerCase().includes(search.toLowerCase())
      )
    : bills;

  useEffect(() => setCurrentPage(1), [search, statusFilter]);

  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalNet = filtered.reduce((s, b) => s + (b.net_payable || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Supplier Bills</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} bills &middot; Total Net Payable: {formatCurrency(totalNet)}</p>
        </div>
        <button className="btn-primary text-xs sm:text-sm" data-shortcut="new" onClick={() => { setEditingId(null); setShowModal(true); }}>
          <Plus size={16} /> New Bill
        </button>
      </div>

      <div className="card">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search bills..."
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
                <th>Bill #</th>
                <th className="hidden sm:table-cell">Date</th>
                <th>Vendor</th>
                <th className="hidden lg:table-cell">Description</th>
                <th className="text-right hidden sm:table-cell">Gross</th>
                <th className="text-right hidden md:table-cell">VAT</th>
                <th className="text-right hidden md:table-cell">WHT</th>
                <th className="text-right">Net Payable</th>
                <th className="text-right hidden lg:table-cell">Balance</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(b => (
                <tr key={b.id}>
                  <td>
                    <span className="text-primary-600 font-medium flex items-center gap-1 text-xs sm:text-sm">
                      <FileText size={14} className="hidden sm:block" /> {b.bill_number}
                    </span>
                  </td>
                  <td className="text-gray-500 hidden sm:table-cell">{formatDate(b.bill_date)}</td>
                  <td className="font-medium text-xs sm:text-sm">{b.vendor_name || '\u2014'}</td>
                  <td className="max-w-[200px] truncate hidden lg:table-cell">{b.description}</td>
                  <td className="text-right hidden sm:table-cell">{formatCurrency(b.gross_amount)}</td>
                  <td className="text-right hidden md:table-cell">{formatCurrency(b.vat_amount)}</td>
                  <td className="text-right hidden md:table-cell">{formatCurrency(b.withholding_tax)}</td>
                  <td className="text-right font-medium text-xs sm:text-sm">{formatCurrency(b.net_payable)}</td>
                  <td className="text-right hidden lg:table-cell">{formatCurrency(b.balance)}</td>
                  <td>
                    <span className={`badge ${billStatusColor(b.status)} text-[10px] sm:text-xs`}>
                      {getStatusLabel(b.status)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {b.status === 'draft' && (
                        <button onClick={() => openEdit(b)} className="p-1 text-gray-400 hover:text-primary-600" title="Edit">
                          <Edit2 size={14} />
                        </button>
                      )}
                      {(b.status === 'posted' || b.status === 'approved') && (
                        <button onClick={() => setVoidTarget(b)} className="p-1 text-gray-400 hover:text-red-600" title="Void">
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">No bills found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />
      </div>

      {/* Void Confirmation Modal */}
      {voidTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-red-600">Void Bill</h2>
              <button onClick={() => setVoidTarget(null)} className="text-gray-400 hover:text-gray-600" data-shortcut="close-modal"><X size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to void bill <strong>{voidTarget.bill_number}</strong>? This will create a reversing entry.
              </p>
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                <AlertCircle size={14} className="inline mr-1" />
                This action cannot be undone. The bill will be marked as voided.
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setVoidTarget(null)}>Cancel</button>
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" onClick={handleVoid}>
                <XCircle size={14} /> Void Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Bill Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Supplier Bill' : 'New Supplier Bill'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600" data-shortcut="close-modal"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <ComboBox
                  options={vendors.map(v => ({ value: v.id, label: v.name }))}
                  value={form.vendor_id ? Number(form.vendor_id) : null}
                  onChange={(val) => setForm({ ...form, vendor_id: String(val) })}
                  placeholder="Select vendor..."
                  label="Vendor"
                />
              </div>
              <div>
                <ComboBox
                  options={departments.map(d => ({ value: d.id, label: d.name }))}
                  value={form.department_id ? Number(form.department_id) : null}
                  onChange={(val) => setForm({ ...form, department_id: String(val) })}
                  placeholder="Select department..."
                  label="Department"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Bill Date</label>
                  <input className="input-field" type="date" value={form.bill_date}
                    onChange={e => setForm({ ...form, bill_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input className="input-field" type="date" value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input-field" rows={2} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <hr />
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>Gross Amount</span>
                  <input className="input-field w-40 text-right" type="number" min={0} step="0.01"
                    value={form.gross_amount || ''}
                    onChange={e => updateGross(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>VAT (12%)</span>
                  <input className="input-field w-40 text-right" type="number" step="0.01"
                    value={form.vat_amount}
                    onChange={e => {
                      const vat = parseFloat(e.target.value) || 0;
                      setForm({ ...form, vat_amount: vat, net_payable: Math.round((form.gross_amount + vat - form.withholding_tax) * 100) / 100 });
                    }} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Withholding Tax (2%)</span>
                  <input className="input-field w-40 text-right" type="number" step="0.01"
                    value={form.withholding_tax}
                    onChange={e => {
                      const wht = parseFloat(e.target.value) || 0;
                      setForm({ ...form, withholding_tax: wht, net_payable: Math.round((form.gross_amount + form.vat_amount - wht) * 100) / 100 });
                    }} />
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Payable</span>
                  <span className="text-green-600">{formatCurrency(form.net_payable)}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={submitting || !form.vendor_id || !form.gross_amount}>
                <Plus size={16} /> {submitting ? 'Saving...' : (editingId ? 'Update Bill' : 'Create Bill')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
