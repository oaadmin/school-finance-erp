'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, getVarianceStatus } from '@/lib/utils';
import { Download, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart, Area } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthData { month: number; budget: number; actual: number; variance: number; }

export default function MonthlyVarianceReport() {
  const [data, setData] = useState<MonthData[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setDepartments(d.departments));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ type: 'monthly-variance' });
    if (deptFilter) params.set('department_id', deptFilter);
    fetch(`/api/reports?${params}`).then(r => r.json()).then(d => setData(d.data));
  }, [deptFilter]);

  const chartData = data.map(d => ({
    name: MONTHS[d.month - 1],
    Budget: d.budget,
    Actual: d.actual,
    Variance: d.variance,
  }));

  const totalBudget = data.reduce((s, d) => s + d.budget, 0);
  const totalActual = data.reduce((s, d) => s + d.actual, 0);
  const totalVariance = totalBudget - totalActual;

  // Cumulative data
  let cumBudget = 0, cumActual = 0;
  const cumulativeData = data.map(d => {
    cumBudget += d.budget;
    cumActual += d.actual;
    return { name: MONTHS[d.month - 1], 'Cumulative Budget': cumBudget, 'Cumulative Actual': cumActual };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Variance Report</h1>
          <p className="text-sm text-gray-500 mt-1">Month-by-month budget and spending analysis</p>
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
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-xs text-gray-500">YTD Budget</p><p className="text-xl font-bold">{formatCurrency(totalBudget)}</p></div>
        <div className="stat-card"><p className="text-xs text-gray-500">YTD Actual</p><p className="text-xl font-bold text-blue-600">{formatCurrency(totalActual)}</p></div>
        <div className="stat-card"><p className="text-xs text-gray-500">YTD Variance</p>
          <p className={`text-xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalVariance >= 0 ? '' : '-'}{formatCurrency(Math.abs(totalVariance))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Monthly Budget vs Actual</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="Budget" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Actual" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="Variance" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Cumulative Spending Trend</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="Cumulative Budget" stroke="#93c5fd" strokeWidth={2} />
                <Line type="monotone" dataKey="Cumulative Actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Monthly Breakdown</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th><th className="text-right">Budget</th><th className="text-right">Actual</th>
                <th className="text-right">Variance</th><th>Status</th><th>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => {
                const vs = getVarianceStatus(d.variance);
                const util = d.budget > 0 ? (d.actual / d.budget * 100) : 0;
                return (
                  <tr key={d.month}>
                    <td className="font-medium">{MONTHS[d.month - 1]}</td>
                    <td className="text-right">{formatCurrency(d.budget)}</td>
                    <td className="text-right">{formatCurrency(d.actual)}</td>
                    <td className={`text-right font-medium ${vs.color}`}>
                      {d.variance >= 0 ? '' : '-'}{formatCurrency(Math.abs(d.variance))}
                    </td>
                    <td><span className={`badge ${d.variance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{vs.label}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar flex-1 h-2">
                          <div className={`progress-bar-fill ${util > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(util, 100)}%` }} />
                        </div>
                        <span className="text-xs w-10 text-right">{util.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="text-right px-4 py-3">{formatCurrency(totalBudget)}</td>
                <td className="text-right px-4 py-3">{formatCurrency(totalActual)}</td>
                <td className={`text-right px-4 py-3 ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalVariance >= 0 ? '' : '-'}{formatCurrency(Math.abs(totalVariance))}
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
