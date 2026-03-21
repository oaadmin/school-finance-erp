'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Download, Save } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Allocation {
  budget_id: number; budget_name: string; department: string; category: string; annual_budget: number;
  months: Record<number, { amount: number; committed: number; actual: number }>;
}

export default function BudgetAllocation() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/budgets/allocations?school_year=2025-2026').then(r => r.json()).then(setAllocations);
  }, []);

  const handleEdit = (budgetId: number, month: number, value: string) => {
    setEdits(prev => ({ ...prev, [`${budgetId}-${month}`]: parseFloat(value) || 0 }));
  };

  const getValue = (alloc: Allocation, month: number): number => {
    const key = `${alloc.budget_id}-${month}`;
    if (edits[key] !== undefined) return edits[key];
    return alloc.months[month]?.amount || 0;
  };

  const getRowTotal = (alloc: Allocation): number => {
    return MONTHS.reduce((sum, _, i) => sum + getValue(alloc, i + 1), 0);
  };

  const getColTotal = (month: number): number => {
    return allocations.reduce((sum, alloc) => sum + getValue(alloc, month), 0);
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = Object.entries(edits).map(([key, amount]) => {
      const [budget_id, month] = key.split('-').map(Number);
      return { budget_id, month, amount };
    });

    await fetch('/api/budgets/allocations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });

    setEdits({});
    // Reload data
    const data = await fetch('/api/budgets/allocations?school_year=2025-2026').then(r => r.json());
    setAllocations(data);
    setSaving(false);
  };

  const hasEdits = Object.keys(edits).length > 0;
  const grandTotal = allocations.reduce((s, a) => s + getRowTotal(a), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Allocation Table</h1>
          <p className="text-sm text-gray-500 mt-1">Monthly budget distribution for SY 2025-2026</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Download size={16} /> Export to Excel</button>
          {hasEdits && (
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[180px]">Department</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">Category</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[110px]">Annual Budget</th>
                {MONTHS.map(m => (
                  <th key={m} className="px-2 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px]">{m}</th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[110px] bg-blue-50">Row Total</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc) => {
                const rowTotal = getRowTotal(alloc);
                const diff = rowTotal - alloc.annual_budget;
                return (
                  <tr key={alloc.budget_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700 sticky left-0 bg-white z-10">{alloc.department}</td>
                    <td className="px-3 py-2 text-gray-600">{alloc.category}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(alloc.annual_budget)}</td>
                    {MONTHS.map((_, i) => (
                      <td key={i} className="px-1 py-1">
                        <input
                          type="number"
                          className="w-full px-2 py-1.5 text-right text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          value={getValue(alloc, i + 1)}
                          onChange={e => handleEdit(alloc.budget_id, i + 1, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className={`px-3 py-2 text-right font-medium bg-blue-50 ${diff !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(rowTotal)}
                      {diff !== 0 && <div className="text-[10px]">{diff > 0 ? '+' : ''}{formatCurrency(diff)}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="px-3 py-3 sticky left-0 bg-gray-100 z-10">TOTALS</td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-right">{formatCurrency(allocations.reduce((s, a) => s + a.annual_budget, 0))}</td>
                {MONTHS.map((_, i) => (
                  <td key={i} className="px-3 py-3 text-right">{formatCurrency(getColTotal(i + 1))}</td>
                ))}
                <td className="px-3 py-3 text-right bg-blue-100">{formatCurrency(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <span>Tip: Click on any monthly cell to edit the allocation amount.</span>
          <span>Row totals will automatically recalculate.</span>
          <span className="text-red-600">Red totals indicate mismatch with annual budget.</span>
        </div>
      </div>
    </div>
  );
}
