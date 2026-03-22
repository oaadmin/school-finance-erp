'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import ReportFilters from '@/components/reports/ReportFilters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'];

interface ExpenseRow { account_code: string; account_name: string; amount: number; percentage: string; }

export default function ExpenseSchedule() {
  const [data, setData] = useState<ExpenseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');

  useEffect(() => {
    fetch(`/api/reports/accounting?type=expense-schedule&date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.json()).then(d => { setData(d.data); setTotal(d.total); });
  }, [dateFrom, dateTo]);

  const chartData = data.slice(0, 10).map(d => ({ name: d.account_name, value: d.amount }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule of Expenses</h1>
        <p className="text-sm text-gray-500">Breakdown of expenses by category</p>
      </div>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />

      <div className="stat-card !p-4">
        <p className="text-xs text-gray-500">Total Expenses</p>
        <p className="text-2xl font-bold text-red-600">{formatCurrency(total)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold">Expense Breakdown</h3></div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th className="hidden sm:table-cell">Code</th><th>Expense Category</th><th className="text-right">Amount</th><th className="text-right">% of Total</th><th className="hidden sm:table-cell">Bar</th></tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.account_code}>
                    <td className="font-mono text-xs hidden sm:table-cell">{r.account_code}</td>
                    <td className="font-medium text-sm">{r.account_name}</td>
                    <td className="text-right font-medium">{formatCurrency(r.amount)}</td>
                    <td className="text-right text-sm">{r.percentage}%</td>
                    <td className="hidden sm:table-cell w-32">
                      <div className="progress-bar h-2">
                        <div className="progress-bar-fill" style={{ width: `${r.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3 hidden sm:table-cell"></td>
                  <td className="px-4 py-3">Total</td>
                  <td className="text-right px-4 py-3">{formatCurrency(total)}</td>
                  <td className="text-right px-4 py-3">100%</td>
                  <td className="hidden sm:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Distribution</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {chartData.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-gray-600 truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
