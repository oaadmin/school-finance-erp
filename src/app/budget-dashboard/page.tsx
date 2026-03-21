'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { PiggyBank, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface Budget {
  id: number; budget_name: string; department_name: string; category_name: string;
  annual_budget: number; committed: number; actual: number; remaining: number;
  cost_center_name: string; fund_source_name: string; status: string;
}

export default function BudgetDashboard() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/budgets?school_year=2025-2026').then(r => r.json()).then(setBudgets);
  }, []);

  const filtered = filter ? budgets.filter(b => b.department_name === filter) : budgets;
  const departments = [...new Set(budgets.map(b => b.department_name))];

  const totalBudget = filtered.reduce((s, b) => s + b.annual_budget, 0);
  const totalCommitted = filtered.reduce((s, b) => s + b.committed, 0);
  const totalActual = filtered.reduce((s, b) => s + b.actual, 0);
  const totalRemaining = totalBudget - totalCommitted - totalActual;
  const overBudget = filtered.filter(b => b.remaining < 0);

  const deptSummary = departments.map(d => {
    const dBudgets = budgets.filter(b => b.department_name === d);
    return {
      name: d.length > 15 ? d.slice(0, 15) + '...' : d,
      Budget: dBudgets.reduce((s, b) => s + b.annual_budget, 0),
      Actual: dBudgets.reduce((s, b) => s + b.actual, 0),
      Committed: dBudgets.reduce((s, b) => s + b.committed, 0),
    };
  });

  const utilizationData = [
    { name: 'Actual', value: totalActual },
    { name: 'Committed', value: totalCommitted },
    { name: 'Available', value: Math.max(0, totalRemaining) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Budget overview for SY 2025-2026</p>
        </div>
        <select className="select-field w-48" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <PiggyBank size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Budget</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Committed</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(totalCommitted)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Actual Spent</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalActual)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Remaining</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalRemaining)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Budget by Department</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={deptSummary} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="Budget" fill="#bfdbfe" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Actual" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Committed" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Budget Utilization</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={utilizationData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center -mt-4">
              <p className="text-2xl font-bold text-gray-900">{totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%</p>
              <p className="text-xs text-gray-500">Utilized</p>
            </div>
            <div className="flex justify-center gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full" /> Actual</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" /> Committed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-300 rounded-full" /> Available</span>
            </div>
          </div>
        </div>
      </div>

      {overBudget.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <div className="card-header border-red-100">
            <h3 className="font-semibold text-red-700 flex items-center gap-2"><AlertTriangle size={16} /> Over Budget Items</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Budget</th><th>Department</th><th>Budget</th><th>Spent + Committed</th><th>Over By</th></tr></thead>
              <tbody>
                {overBudget.map(b => (
                  <tr key={b.id}>
                    <td className="font-medium">{b.budget_name}</td>
                    <td>{b.department_name}</td>
                    <td>{formatCurrency(b.annual_budget)}</td>
                    <td>{formatCurrency(b.actual + b.committed)}</td>
                    <td className="text-red-600 font-medium">{formatCurrency(Math.abs(b.remaining))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">All Budgets</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Budget Name</th><th>Department</th><th>Category</th>
                <th className="text-right">Annual Budget</th><th className="text-right">Committed</th>
                <th className="text-right">Actual</th><th className="text-right">Remaining</th><th>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const util = b.annual_budget > 0 ? ((b.actual + b.committed) / b.annual_budget * 100) : 0;
                return (
                  <tr key={b.id}>
                    <td className="font-medium">{b.budget_name}</td>
                    <td>{b.department_name}</td>
                    <td>{b.category_name}</td>
                    <td className="text-right">{formatCurrency(b.annual_budget)}</td>
                    <td className="text-right text-amber-600">{formatCurrency(b.committed)}</td>
                    <td className="text-right">{formatCurrency(b.actual)}</td>
                    <td className={`text-right font-medium ${b.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(b.remaining)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar flex-1 h-2">
                          <div className={`progress-bar-fill ${util > 100 ? 'bg-red-500' : util > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(util, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{util.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
