'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface AgingRow {
  customer_id: number;
  customer_name: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  total: number;
}

export default function ARAgingReport() {
  const [rows, setRows] = useState<AgingRow[]>([]);

  useEffect(() => {
    fetch('/api/accounting/ar?type=aging').then(r => r.json()).then(setRows);
  }, []);

  const totals = rows.reduce(
    (acc, r) => ({
      current: acc.current + (r.current || 0),
      days_1_30: acc.days_1_30 + (r.days_1_30 || 0),
      days_31_60: acc.days_31_60 + (r.days_31_60 || 0),
      days_61_90: acc.days_61_90 + (r.days_61_90 || 0),
      over_90: acc.over_90 + (r.over_90 || 0),
      total: acc.total + (r.total || 0),
    }),
    { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0 }
  );

  const buckets = [
    { label: 'Current', value: totals.current, color: 'bg-green-500', cardBg: 'bg-green-50', textColor: 'text-green-700', iconColor: 'text-green-600' },
    { label: '1-30 Days', value: totals.days_1_30, color: 'bg-blue-500', cardBg: 'bg-blue-50', textColor: 'text-blue-700', iconColor: 'text-blue-600' },
    { label: '31-60 Days', value: totals.days_31_60, color: 'bg-amber-500', cardBg: 'bg-amber-50', textColor: 'text-amber-700', iconColor: 'text-amber-600' },
    { label: '61-90 Days', value: totals.days_61_90, color: 'bg-orange-500', cardBg: 'bg-orange-50', textColor: 'text-orange-700', iconColor: 'text-orange-600' },
    { label: 'Over 90 Days', value: totals.over_90, color: 'bg-red-500', cardBg: 'bg-red-50', textColor: 'text-red-700', iconColor: 'text-red-600' },
  ];

  const pct = (value: number) => (totals.total > 0 ? (value / totals.total) * 100 : 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AR Aging Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Accounts receivable aging summary &middot; Total Outstanding: {formatCurrency(totals.total)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {buckets.map(b => (
          <div key={b.label} className={`card p-3 sm:p-4 ${b.cardBg} border-0`}>
            <p className={`text-xs font-medium ${b.textColor} mb-1`}>{b.label}</p>
            <p className={`text-sm sm:text-lg font-bold ${b.textColor}`}>{formatCurrency(b.value)}</p>
            <p className="text-xs text-gray-500 mt-1">{pct(b.value).toFixed(1)}%</p>
          </div>
        ))}
      </div>

      {/* Distribution Progress Bar */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Aging Distribution</h3>
        </div>
        <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden flex">
          {buckets.map(b => {
            const width = pct(b.value);
            if (width === 0) return null;
            return (
              <div
                key={b.label}
                className={`${b.color} h-full relative group transition-all`}
                style={{ width: `${width}%` }}
                title={`${b.label}: ${formatCurrency(b.value)} (${width.toFixed(1)}%)`}
              >
                {width > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-medium">
                    {width.toFixed(0)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {buckets.map(b => (
            <div key={b.label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
              {b.label}
            </div>
          ))}
        </div>
      </div>

      {/* Aging Table */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Clock size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900">Aging Detail by Customer</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th className="text-right">Current</th>
                <th className="text-right hidden sm:table-cell">1-30</th>
                <th className="text-right hidden sm:table-cell">31-60</th>
                <th className="text-right hidden md:table-cell">61-90</th>
                <th className="text-right hidden md:table-cell">Over 90</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.customer_id}>
                  <td className="font-medium text-xs sm:text-sm">{r.customer_name}</td>
                  <td className="text-right">{formatCurrency(r.current)}</td>
                  <td className="text-right hidden sm:table-cell">{formatCurrency(r.days_1_30)}</td>
                  <td className="text-right hidden sm:table-cell">{formatCurrency(r.days_31_60)}</td>
                  <td className={`text-right hidden md:table-cell ${r.days_61_90 > 0 ? 'text-orange-600 font-medium' : ''}`}>
                    {formatCurrency(r.days_61_90)}
                  </td>
                  <td className={`text-right hidden md:table-cell ${r.over_90 > 0 ? 'text-red-600 font-bold' : ''}`}>
                    {r.over_90 > 0 && <AlertTriangle size={12} className="inline mr-1 text-red-500" />}
                    {formatCurrency(r.over_90)}
                  </td>
                  <td className="text-right font-medium text-xs sm:text-sm">{formatCurrency(r.total)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No aging data available</td></tr>
              )}
              {rows.length > 0 && (
                <tr className="bg-gray-50 font-bold">
                  <td>Total</td>
                  <td className="text-right">{formatCurrency(totals.current)}</td>
                  <td className="text-right hidden sm:table-cell">{formatCurrency(totals.days_1_30)}</td>
                  <td className="text-right hidden sm:table-cell">{formatCurrency(totals.days_31_60)}</td>
                  <td className="text-right hidden md:table-cell">{formatCurrency(totals.days_61_90)}</td>
                  <td className="text-right hidden md:table-cell">{formatCurrency(totals.over_90)}</td>
                  <td className="text-right">{formatCurrency(totals.total)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
