'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Save, Send, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LineItem { description: string; quantity: number; unit_cost: number; amount: number; account_code: string; tax_code: string; remarks: string; }

export default function CreateDisbursement() {
  const { success, error } = useToast();
  const router = useRouter();
  const [lookups, setLookups] = useState<{ departments: Array<{ id: number; name: string }>; categories: Array<{ id: number; name: string }>; fundSources: Array<{ id: number; name: string }>; costCenters: Array<{ id: number; name: string }> }>({ departments: [], categories: [], fundSources: [], costCenters: [] });
  const [payees, setPayees] = useState<Array<{ id: number; name: string; type: string }>>([]);
  const [budgets, setBudgets] = useState<Array<{ id: number; budget_name: string; annual_budget: number; committed: number; actual: number }>>([]);
  const [budgetCheck, setBudgetCheck] = useState<{ budget: number; committed: number; actual: number; remaining: number } | null>(null);

  const [form, setForm] = useState({
    request_date: new Date().toISOString().split('T')[0],
    due_date: '', payee_id: '', payee_type: 'vendor', department_id: '', category_id: '',
    cost_center_id: '', fund_source_id: '', budget_id: '', project: '',
    currency: 'PHP', payment_method: 'bank_transfer', description: '',
  });

  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_cost: 0, amount: 0, account_code: '', tax_code: '', remarks: '' },
  ]);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setLookups);
    fetch('/api/payees').then(r => r.json()).then(setPayees);
    fetch('/api/budgets?school_year=2025-2026').then(r => r.json()).then(setBudgets);
  }, []);

  useEffect(() => {
    if (form.budget_id) {
      const b = budgets.find(b => b.id === Number(form.budget_id));
      if (b) {
        const remaining = b.annual_budget - b.committed - b.actual;
        setBudgetCheck({ budget: b.annual_budget, committed: b.committed, actual: b.actual, remaining });
      }
    } else {
      setBudgetCheck(null);
    }
  }, [form.budget_id, budgets]);

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const exceedsBudget = budgetCheck && totalAmount > budgetCheck.remaining;

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...items];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newItems[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unit_cost') {
      newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].unit_cost);
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_cost: 0, amount: 0, account_code: '', tax_code: '', remarks: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (submitForApproval: boolean) => {
    try {
      const payload = {
        ...form,
        payee_id: form.payee_id ? Number(form.payee_id) : null,
        department_id: Number(form.department_id),
        category_id: Number(form.category_id),
        cost_center_id: form.cost_center_id ? Number(form.cost_center_id) : null,
        fund_source_id: form.fund_source_id ? Number(form.fund_source_id) : null,
        budget_id: form.budget_id ? Number(form.budget_id) : null,
        amount: totalAmount,
        items,
        status: 'draft',
      };

      const res = await fetch('/api/disbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (submitForApproval) {
          await fetch(`/api/disbursements/${data.id}/submit`, { method: 'POST' });
          success('Disbursement Submitted', `Request ${data.request_number || data.id} has been submitted for approval.`);
        } else {
          success('Draft Saved', `Disbursement request ${data.request_number || data.id} saved as draft.`);
        }
        router.push(`/disbursements/${data.id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        error('Save Failed', err.message || err.error || 'Could not create disbursement. Please try again.');
      }
    } catch (e) {
      error('Save Failed', 'Network error. Please try again.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Disbursement Request</h1>
        <p className="text-sm text-gray-500 mt-1">Submit a new payment or reimbursement request</p>
      </div>

      {/* Header Fields */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Request Details</h3></div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Request Date *</label>
              <input className="input-field" type="date" value={form.request_date} onChange={e => setForm({...form, request_date: e.target.value})} />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input-field" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
            <div>
              <label className="label">Payee Type</label>
              <select className="select-field" value={form.payee_type} onChange={e => setForm({...form, payee_type: e.target.value})}>
                <option value="vendor">Vendor</option>
                <option value="employee">Employee</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Payee</label>
              <select className="select-field" value={form.payee_id} onChange={e => setForm({...form, payee_id: e.target.value})}>
                <option value="">Select Payee...</option>
                {payees.filter(p => p.type === form.payee_type || !form.payee_type).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Department *</label>
              <select className="select-field" value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})}>
                <option value="">Select...</option>
                {lookups.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expense Category *</label>
              <select className="select-field" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                <option value="">Select...</option>
                {lookups.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cost Center</label>
              <select className="select-field" value={form.cost_center_id} onChange={e => setForm({...form, cost_center_id: e.target.value})}>
                <option value="">Select...</option>
                {lookups.costCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fund Source</label>
              <select className="select-field" value={form.fund_source_id} onChange={e => setForm({...form, fund_source_id: e.target.value})}>
                <option value="">Select...</option>
                {lookups.fundSources.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Budget Line</label>
              <select className="select-field" value={form.budget_id} onChange={e => setForm({...form, budget_id: e.target.value})}>
                <option value="">Select Budget...</option>
                {budgets.map(b => <option key={b.id} value={b.id}>{b.budget_name} ({formatCurrency(b.annual_budget)})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="select-field" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="label">Project / Activity</label>
              <input className="input-field" value={form.project} onChange={e => setForm({...form, project: e.target.value})} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="select-field" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                <option value="PHP">PHP (₱)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Describe the purpose of this disbursement request..." />
          </div>
        </div>
      </div>

      {/* Budget Check */}
      {budgetCheck && (
        <div className={`card ${exceedsBudget ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {exceedsBudget ? <AlertTriangle className="text-red-600" size={20} /> : <CheckCircle className="text-green-600" size={20} />}
              <div>
                <p className="font-semibold text-sm">{exceedsBudget ? 'Budget Warning' : 'Budget Available'}</p>
                <p className="text-xs text-gray-600">
                  Budget: {formatCurrency(budgetCheck.budget)} | Committed: {formatCurrency(budgetCheck.committed)} |
                  Actual: {formatCurrency(budgetCheck.actual)} | Remaining: {formatCurrency(budgetCheck.remaining)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">Requested: {formatCurrency(totalAmount)}</p>
              {exceedsBudget && <p className="text-xs text-red-600">Exceeds available budget by {formatCurrency(totalAmount - budgetCheck.remaining)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Line Items */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Line Items</h3>
          <button className="btn-secondary text-sm" onClick={addItem}><Plus size={14} /> Add Item</button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-8">#</th><th>Description</th><th className="w-20">Qty</th>
                <th className="w-28">Unit Cost</th><th className="w-28">Amount</th>
                <th className="w-24">Account</th><th className="w-24">Tax</th>
                <th className="w-32">Remarks</th><th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="text-gray-400">{i + 1}</td>
                  <td><input className="input-field" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Item description" /></td>
                  <td><input className="input-field text-right" type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                  <td><input className="input-field text-right" type="number" value={item.unit_cost} onChange={e => updateItem(i, 'unit_cost', parseFloat(e.target.value) || 0)} /></td>
                  <td className="text-right font-medium">{formatCurrency(item.amount)}</td>
                  <td><input className="input-field" value={item.account_code} onChange={e => updateItem(i, 'account_code', e.target.value)} placeholder="5000" /></td>
                  <td>
                    <select className="select-field" value={item.tax_code} onChange={e => updateItem(i, 'tax_code', e.target.value)}>
                      <option value="">None</option>
                      <option value="VAT-12">VAT 12%</option>
                      <option value="VAT-E">VAT Exempt</option>
                    </select>
                  </td>
                  <td><input className="input-field" value={item.remarks} onChange={e => updateItem(i, 'remarks', e.target.value)} /></td>
                  <td>
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={4} className="px-4 py-3 text-right font-semibold">Total Amount:</td>
                <td className="px-4 py-3 text-right font-bold text-lg">{formatCurrency(totalAmount)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Attachments */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Supporting Documents</h3></div>
        <div className="card-body">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">Drag and drop files here, or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB each</p>
            <button className="btn-secondary mt-3 text-sm">Choose Files</button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button className="btn-secondary" onClick={() => router.push('/disbursements')}>Cancel</button>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => handleSubmit(false)}>
            <Save size={16} /> Save as Draft
          </button>
          <button className="btn-primary" onClick={() => handleSubmit(true)}
            disabled={!form.department_id || !form.category_id || totalAmount <= 0}>
            <Send size={16} /> Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}
