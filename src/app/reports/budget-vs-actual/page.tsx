'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, getVarianceStatus } from '@/lib/utils';
import { Download, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface ReportRow {
  id: number; budget_name: string; department: string; category: string;
  budget: number; actual: number; committed: number; variance: number; utilization_pct: number;
}

interface Totals { total_budget: number; total_actual: number; total_committed: number; total_variance: number; }

export default function BudgetVsActualReport() {
  const [data, setData] = useState<ReportRow[]>([]);
  const [totals, setTotals] = useState<Totals>({ total_budget: 0, total_actual: 0, total_committed: 0, total_variance: 0 });
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setDepartments(d.departments));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ type: 'budget-vs-actual' });
    if (deptFilter) params.set('department_id', deptFilter);
    fetch(`/api/reports?${params}`).then(r => r.json()).then(d => {
      setData(d.data);
      setTotals(d.totals);
    });
  }, [deptFilter]);

  // Aggregate by department for chart
  const deptData: Record<string, { Budget: number; Actual: number }> = {};
  data.forEach(r => {
    if (!deptData[r.department]) deptData[r.department] = { Budget: 0, Actual: 0 };
    deptData[r.department].Budget += r.budget;
    deptData[r.department].Actual += r.actual;
  });
  const chartData = Object.entries(deptData).map(([name, vals]) => ({
    name: name.length > 15 ? name.slice(0, 15) + '...' : name,
    ...vals,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget vs Actual Report</h1>
          <p className="text-sm text-gray-500 mt-1">Compare allocated budgets against actual spending</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Download size={16} /> Export PDF</button>
          <button className="btn-secondary"><Download size={16} /> Export Excel</button>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <Filter size={14} className="text-gray-400" />
        <select className="select-field w-48" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="select-field w-40"><option>SY 2025-2026</option></select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card"><p className="text-xs text-gray-500">Total Budget</p><p className="text-xl font-bold">{formatCurrency(totals.total_budget)}</p></div>
        <div className="stat-card"><p className="text-xs text-gray-500">Total Actual</p><p className="text-xl font-bold text-blue-600">{formatCurrency(totals.total_actual)}</p></div>
        <div className="stat-card"><p className="text-xs text-gray-500">Total Committed</p><p className="text-xl font-bold text-amber-600">{formatCurrency(totals.total_committed)}</p></div>
        <div className="stat-card"><p className="text-xs text-gray-500">Total Variance</p>
          <p className={`text-xl font-bold ${totals.total_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(totals.total_variance))}
            <span className="text-xs ml-1">{totals.total_variance >= 0 ? 'Under' : 'Over'}</span>
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Budget vs Actual by Department</h3></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Bar dataKey="Budget" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Detailed Breakdown</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Budget</th><th>Department</th><th>Category</th>
                <th className="text-right">Budget</th><th className="text-right">Committed</th>
                <th className="text-right">Actual</th><th className="text-right">Variance</th>
                <th>Status</th><th>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => {
                const vs = getVarianceStatus(r.variance);
                return (
                  <tr key={r.id}>
                    <td className="font-medium">{r.budget_name}</td>
                    <td>{r.department}</td>
                    <td>{r.category}</td>
                    <td className="text-right">{formatCurrency(r.budget)}</td>
                    <td className="text-right text-amber-600">{formatCurrency(r.committed)}</td>
                    <td className="text-right">{formatCurrency(r.actual)}</td>
                    <td className={`text-right font-medium ${vs.color}`}>
                      {r.variance >= 0 ? '' : '-'}{formatCurrency(Math.abs(r.variance))}
                    </td>
                    <td><span className={`badge ${r.variance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{vs.label}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar flex-1 h-2">
                          <div className={`progress-bar-fill ${r.utilization_pct > 100 ? 'bg-red-500' : r.utilization_pct > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(r.utilization_pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{r.utilization_pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={3} className="px-4 py-3">Totals</td>
                <td className="text-right px-4 py-3">{formatCurrency(totals.total_budget)}</td>
                <td className="text-right px-4 py-3 text-amber-600">{formatCurrency(totals.total_committed)}</td>
                <td className="text-right px-4 py-3">{formatCurrency(totals.total_actual)}</td>
                <td className={`text-right px-4 py-3 ${totals.total_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(totals.total_variance))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
