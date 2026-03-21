'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Plus, Copy, Download, Upload, Save, X } from 'lucide-react';

interface Department { id: number; name: string; }
interface Category { id: number; name: string; }
interface FundSource { id: number; name: string; }
interface CostCenter { id: number; name: string; }
interface Budget { id: number; budget_name: string; department_name: string; category_name: string; annual_budget: number; status: string; }

export default function BudgetPlanning() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [lookups, setLookups] = useState<{ departments: Department[]; categories: Category[]; fundSources: FundSource[]; costCenters: CostCenter[] }>({ departments: [], categories: [], fundSources: [], costCenters: [] });
  const [form, setForm] = useState({
    budget_name: '', school_year: '2025-2026', department_id: '', category_id: '',
    cost_center_id: '', fund_source_id: '', project: '', campus: 'Main',
    annual_budget: '', budget_owner: '', notes: '', status: 'draft',
  });

  const loadData = () => {
    fetch('/api/budgets?school_year=2025-2026').then(r => r.json()).then(setBudgets);
    fetch('/api/settings').then(r => r.json()).then(d => setLookups(d));
  };

  useEffect(loadData, []);

  const handleCreate = async () => {
    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        department_id: Number(form.department_id),
        category_id: Number(form.category_id),
        cost_center_id: form.cost_center_id ? Number(form.cost_center_id) : null,
        fund_source_id: form.fund_source_id ? Number(form.fund_source_id) : null,
        annual_budget: Number(form.annual_budget),
      }),
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ budget_name: '', school_year: '2025-2026', department_id: '', category_id: '', cost_center_id: '', fund_source_id: '', project: '', campus: 'Main', annual_budget: '', budget_owner: '', notes: '', status: 'draft' });
      loadData();
    }
  };

  const totalBudget = budgets.reduce((s, b) => s + b.annual_budget, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Budget Planning</h1>
          <p className="text-sm text-gray-500 mt-1">Plan and manage annual budgets</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary text-xs sm:text-sm"><Copy size={16} /> Copy from Previous Year</button>
          <button className="btn-secondary text-xs sm:text-sm"><Upload size={16} /> Import</button>
          <button className="btn-secondary text-xs sm:text-sm"><Download size={16} /> Export</button>
          <button className="btn-primary text-xs sm:text-sm" onClick={() => setShowModal(true)}><Plus size={16} /> New Budget</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Budget Items</h3>
          <span className="text-sm text-gray-500">Total: {formatCurrency(totalBudget)}</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Budget Name</th><th>Department</th><th>Category</th>
                <th className="text-right">Annual Budget</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {budgets.map(b => (
                <tr key={b.id}>
                  <td className="font-medium">{b.budget_name}</td>
                  <td>{b.department_name}</td>
                  <td>{b.category_name}</td>
                  <td className="text-right font-medium">{formatCurrency(b.annual_budget)}</td>
                  <td><span className={`badge ${b.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{b.status}</span></td>
                  <td><button className="text-primary-600 text-sm hover:underline">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Create New Budget</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Budget Name *</label>
                  <input className="input-field" value={form.budget_name} onChange={e => setForm({...form, budget_name: e.target.value})} placeholder="e.g., IT Software Budget" />
                </div>
                <div>
                  <label className="label">School Year</label>
                  <select className="select-field" value={form.school_year} onChange={e => setForm({...form, school_year: e.target.value})}>
                    <option>2025-2026</option><option>2024-2025</option><option>2026-2027</option>
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
                  <label className="label">Project / Activity</label>
                  <input className="input-field" value={form.project} onChange={e => setForm({...form, project: e.target.value})} placeholder="e.g., IT Operations" />
                </div>
                <div>
                  <label className="label">Campus</label>
                  <input className="input-field" value={form.campus} onChange={e => setForm({...form, campus: e.target.value})} />
                </div>
                <div>
                  <label className="label">Annual Budget Amount *</label>
                  <input className="input-field" type="number" value={form.annual_budget} onChange={e => setForm({...form, annual_budget: e.target.value})} placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Budget Owner</label>
                  <input className="input-field" value={form.budget_owner} onChange={e => setForm({...form, budget_owner: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input-field" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate}><Save size={16} /> Create Budget</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
