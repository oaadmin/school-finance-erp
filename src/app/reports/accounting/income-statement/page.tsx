'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel, exportToPDF } from '@/lib/export';
import ReportFilters from '@/components/reports/ReportFilters';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LineItem { account_code: string; account_name: string; current_amount: number; previous_amount: number; }
interface Totals { totalRevenue: number; totalCOS: number; grossProfit: number; totalExpenses: number; netIncome: number; }

export default function IncomeStatement() {
  const [revenue, setRevenue] = useState<LineItem[]>([]);
  const [costOfServices, setCostOfServices] = useState<LineItem[]>([]);
  const [expenses, setExpenses] = useState<LineItem[]>([]);
  const [totals, setTotals] = useState<Totals>({ totalRevenue: 0, totalCOS: 0, grossProfit: 0, totalExpenses: 0, netIncome: 0 });
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');

  useEffect(() => {
    fetch(`/api/reports/accounting?type=income-statement&date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.json()).then(d => {
        setRevenue(d.revenue); setCostOfServices(d.costOfServices);
        setExpenses(d.expenses); setTotals(d.totals);
      });
  }, [dateFrom, dateTo]);

  const chartData = [
    { name: 'Revenue', amount: totals.totalRevenue },
    { name: 'Cost of Services', amount: totals.totalCOS },
    { name: 'Operating Exp.', amount: totals.totalExpenses },
    { name: 'Net Income', amount: totals.netIncome },
  ];

  const Section = ({ title, items, total, color }: { title: string; items: LineItem[]; total: number; color: string }) => (
    <div className="mb-4">
      <h3 className={`font-semibold text-sm px-4 py-2 ${color} rounded-t-lg`}>{title}</h3>
      <table className="data-table">
        <tbody>
          {items.map(i => {
            const pct = totals.totalRevenue > 0 ? ((i.current_amount / totals.totalRevenue) * 100).toFixed(1) : '0';
            return (
              <tr key={i.account_code}>
                <td className="text-sm pl-8">{i.account_name}</td>
                <td className="text-right font-medium">{formatCurrency(i.current_amount)}</td>
                <td className="text-right text-gray-400 text-xs hidden sm:table-cell">{pct}%</td>
              </tr>
            );
          })}
          <tr className="font-bold bg-gray-50">
            <td className="px-4 py-2">Total {title}</td>
            <td className="text-right px-4 py-2">{formatCurrency(total)}</td>
            <td className="text-right px-4 py-2 text-xs hidden sm:table-cell">
              {totals.totalRevenue > 0 ? ((total / totals.totalRevenue) * 100).toFixed(1) : '0'}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Income Statement</h1>
        <p className="text-sm text-gray-500">Profit & Loss for the period</p>
      </div>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        onExport={(fmt) => {
          const allItems = [...revenue.map(i => ({ ...i, section: 'Revenue' })), ...costOfServices.map(i => ({ ...i, section: 'Cost of Services' })), ...expenses.map(i => ({ ...i, section: 'Operating Expenses' }))];
          if (fmt === 'excel') exportToExcel(allItems, 'income-statement');
          else exportToPDF('Income Statement', ['Section', 'Account Code', 'Account Name', 'Current Amount', 'Previous Amount'], allItems.map(i => [i.section, i.account_code, i.account_name, formatCurrency(i.current_amount), formatCurrency(i.previous_amount)]), 'income-statement');
        }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card !p-4">
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totals.totalRevenue)}</p>
        </div>
        <div className="stat-card !p-4">
          <p className="text-xs text-gray-500">Total Expenses</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totals.totalCOS + totals.totalExpenses)}</p>
        </div>
        <div className="stat-card !p-4">
          <p className="text-xs text-gray-500">Gross Profit</p>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.grossProfit)}</p>
        </div>
        <div className="stat-card !p-4">
          <div className="flex items-center gap-2">
            {totals.netIncome >= 0 ? <TrendingUp size={16} className="text-green-600" /> : <TrendingDown size={16} className="text-red-600" />}
            <p className="text-xs text-gray-500">Net Income</p>
          </div>
          <p className={`text-lg font-bold ${totals.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(totals.netIncome))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold">Statement Details</h3></div>
          <div className="card-body">
            <Section title="Revenue" items={revenue} total={totals.totalRevenue} color="bg-green-50 text-green-800" />
            {costOfServices.length > 0 && (
              <Section title="Cost of Services" items={costOfServices} total={totals.totalCOS} color="bg-orange-50 text-orange-800" />
            )}
            <div className="border-t-2 border-blue-200 my-2 pt-2">
              <div className="flex justify-between font-bold text-blue-700 px-4 py-2 bg-blue-50 rounded">
                <span>Gross Profit</span><span>{formatCurrency(totals.grossProfit)}</span>
              </div>
            </div>
            <Section title="Operating Expenses" items={expenses} total={totals.totalExpenses} color="bg-red-50 text-red-800" />
            <div className="border-t-2 border-gray-300 mt-4 pt-3">
              <div className={`flex justify-between font-bold text-lg px-4 py-3 rounded ${totals.netIncome >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <span>Net Income / (Loss)</span><span>{formatCurrency(totals.netIncome)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Summary</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Profit Margin</span>
                <span className="font-medium">{totals.totalRevenue > 0 ? ((totals.netIncome / totals.totalRevenue) * 100).toFixed(1) : '0'}%</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Expense Ratio</span>
                <span className="font-medium">{totals.totalRevenue > 0 ? (((totals.totalCOS + totals.totalExpenses) / totals.totalRevenue) * 100).toFixed(1) : '0'}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
