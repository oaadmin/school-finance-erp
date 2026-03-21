'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, getStatusColor, getStatusLabel, formatDate } from '@/lib/utils';
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Clock, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import Link from 'next/link';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DashboardData {
  summary: { total_budget: number; total_committed: number; total_actual: number; remaining: number };
  deptSpending: Array<{ department: string; budget: number; actual: number; committed: number }>;
  monthlyTrend: Array<{ month: number; budget: number; actual: number }>;
  recentDisbursements: Array<{ id: number; request_number: string; description: string; amount: number; status: string; request_date: string; department: string; payee_name: string }>;
  statusCounts: Array<{ status: string; count: number }>;
  pendingApprovals: number;
  categorySpending: Array<{ category: string; budget: number; actual: number }>;
}

export default function FinanceDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const { summary } = data;
  const utilizationPct = summary.total_budget > 0 ? ((summary.total_actual / summary.total_budget) * 100).toFixed(1) : '0';

  const monthlyData = data.monthlyTrend.map(m => ({
    name: MONTHS[m.month - 1],
    Budget: m.budget,
    Actual: m.actual,
  }));

  const deptData = data.deptSpending.map(d => ({
    name: d.department.length > 12 ? d.department.slice(0, 12) + '...' : d.department,
    Budget: d.budget,
    Actual: d.actual,
  }));

  const pieData = data.categorySpending.filter(c => c.actual > 0).map(c => ({
    name: c.category,
    value: c.actual,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">School Year 2025-2026 Overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/disbursements/create" className="btn-primary">
            <FileText size={16} /> New Request
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Annual Budget</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.total_budget)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <PiggyBank size={24} className="text-blue-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <span>SY 2025-2026</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Committed Budget</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(summary.total_committed)}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-amber-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="progress-bar">
              <div className="progress-bar-fill bg-amber-500" style={{ width: `${(summary.total_committed / summary.total_budget * 100).toFixed(0)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{(summary.total_committed / summary.total_budget * 100).toFixed(1)}% of budget</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Actual Spending</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.total_actual)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} className="text-green-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="progress-bar">
              <div className="progress-bar-fill bg-green-500" style={{ width: `${utilizationPct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{utilizationPct}% utilized</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Remaining Budget</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.remaining)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <DollarSign size={24} className="text-purple-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {data.pendingApprovals > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle size={12} /> {data.pendingApprovals} pending approvals
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Budget vs Actual by Department</h3>
            <Link href="/reports/budget-vs-actual" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View Report <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Monthly Expense Trend</h3>
            <Link href="/reports/monthly-variance" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View Report <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="Budget" stroke="#93c5fd" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Spending by Category</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {pieData.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600 truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Disbursement Requests</h3>
            <Link href="/disbursements" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request #</th>
                  <th>Description</th>
                  <th>Department</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentDisbursements.map((dr) => (
                  <tr key={dr.id}>
                    <td>
                      <Link href={`/disbursements/${dr.id}`} className="text-primary-600 hover:underline font-medium">
                        {dr.request_number}
                      </Link>
                    </td>
                    <td className="max-w-[200px] truncate">{dr.description}</td>
                    <td>{dr.department}</td>
                    <td className="font-medium">{formatCurrency(dr.amount)}</td>
                    <td><span className={`badge ${getStatusColor(dr.status)}`}>{getStatusLabel(dr.status)}</span></td>
                    <td className="text-gray-500">{formatDate(dr.request_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Budget Utilization */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Budget Utilization by Department</h3>
        </div>
        <div className="card-body space-y-4">
          {data.deptSpending.map((dept, i) => {
            const utilPct = dept.budget > 0 ? (dept.actual / dept.budget * 100) : 0;
            const commitPct = dept.budget > 0 ? (dept.committed / dept.budget * 100) : 0;
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{dept.department}</span>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Actual: {formatCurrency(dept.actual)}</span>
                    <span>Budget: {formatCurrency(dept.budget)}</span>
                    <span className={utilPct > 100 ? 'text-red-600 font-medium' : ''}>{utilPct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="progress-bar h-3">
                  <div className="h-full flex">
                    <div className="progress-bar-fill bg-blue-500" style={{ width: `${Math.min(utilPct, 100)}%` }} />
                    <div className="progress-bar-fill bg-amber-400" style={{ width: `${Math.min(commitPct, 100 - utilPct)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-6 pt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" /> Actual</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-400 rounded" /> Committed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-200 rounded" /> Available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
