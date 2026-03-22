'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import { FileText, Printer, Download, DollarSign, Users, TrendingUp, Calculator } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreakdownItem {
  nature: string;
  atc: string;
  tax_base: number;
  tax_rate: number;
  tax_withheld: number;
}

interface BIR1601EData {
  total_taxes_withheld: number;
  breakdown_by_nature: BreakdownItem[];
  form?: string;
  period?: { month?: string; from?: string; to?: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_LABELS: Record<string, string> = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

function getMonthLabel(ym: string): string {
  const parts = ym.split('-');
  if (parts.length === 2) {
    return `${MONTH_LABELS[parts[1]] || parts[1]} ${parts[0]}`;
  }
  return ym;
}

function getAllMonthsForYear(yearMonth: string): string[] {
  const year = yearMonth.split('-')[0];
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BIR1601EPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<BIR1601EData | null>(null);
  const [yearlyData, setYearlyData] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/reports/tax?type=bir-1601e&month=${month}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((res: BIR1601EData) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load data for this period.');
        setData(null);
        setLoading(false);
      });
  }, [month]);

  // Fetch yearly trend
  useEffect(() => {
    const months = getAllMonthsForYear(month);
    Promise.all(
      months.map(m =>
        fetch(`/api/reports/tax?type=bir-1601e&month=${m}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const trend = results.map((res, i) => ({
        month: months[i],
        amount: res?.total_taxes_withheld ?? 0,
      }));
      setYearlyData(trend);
    });
  }, [month.split('-')[0]]);

  const taxCredits = 0;
  const penalties = 0;
  const netTaxDue = (data?.total_taxes_withheld ?? 0) - taxCredits;
  const totalAmountDue = netTaxDue + penalties;

  function handlePrint() {
    window.print();
  }

  function handleExport() {
    if (!data) return;
    const rows = (data.breakdown_by_nature || []).map(b => ({
      'Nature of Payment': b.nature,
      'ATC': b.atc,
      'Tax Base': b.tax_base,
      'Tax Rate (%)': (b.tax_rate * 100).toFixed(2),
      'Tax Withheld': b.tax_withheld,
    }));
    exportToExcel(rows, `BIR-1601E_${month}`, `BIR 1601-E - ${getMonthLabel(month)}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={24} className="text-primary-600" />
            BIR 1601-E - Expanded Withholding Tax
          </h1>
          <p className="text-sm text-gray-500">Monthly Remittance Return of Creditable Income Taxes Withheld (Expanded)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary text-xs sm:text-sm" disabled={!data}>
            <Download size={16} /> Export Excel
          </button>
          <button onClick={handlePrint} className="btn-primary text-xs sm:text-sm" disabled={!data}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="card no-print">
        <div className="card-body">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">Taxable Month</label>
              <input
                type="month"
                className="select-field"
                value={month}
                onChange={e => setMonth(e.target.value)}
              />
            </div>
            {data && (
              <div className="ml-auto">
                <span className="badge bg-blue-100 text-blue-700">
                  <Users size={12} className="inline mr-1" />
                  {(data.breakdown_by_nature || []).length} ATC code{(data.breakdown_by_nature || []).length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="card">
          <div className="card-body text-center py-12 text-gray-400">{error}</div>
        </div>
      )}

      {data && (
        <>
          {/* Form Summary - Tax Computation */}
          <div className="card" id="bir-1601e-print-root">
            <div className="card-header bg-blue-50">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                <Calculator size={18} />
                BIR 1601-E Tax Computation - {getMonthLabel(month)}
              </h3>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 px-4 py-3 font-medium bg-gray-50 w-2/3">
                        Total Taxes Withheld for the Month
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right font-bold text-lg">
                        {formatCurrency(data.total_taxes_withheld ?? 0)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-3 font-medium text-gray-600 pl-8">
                        Less: Tax Credits/Payments Made
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right text-gray-500">
                        ({formatCurrency(taxCredits)})
                      </td>
                    </tr>
                    <tr className="bg-yellow-50">
                      <td className="border border-gray-200 px-4 py-3 font-semibold">
                        Net Tax Due
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right font-bold">
                        {formatCurrency(netTaxDue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-3 font-medium text-gray-600 pl-8">
                        Add: Penalties (Surcharge, Interest, Compromise)
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right text-gray-500">
                        {formatCurrency(penalties)}
                      </td>
                    </tr>
                    <tr className="bg-blue-50 border-t-2 border-blue-300">
                      <td className="border border-gray-200 px-4 py-4 font-bold text-blue-800">
                        Total Amount Due
                      </td>
                      <td className="border border-gray-200 px-4 py-4 text-right font-bold text-lg text-blue-700">
                        {formatCurrency(totalAmountDue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
            <div className="stat-card !p-4">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-blue-500" />
                <p className="text-xs text-gray-500">Total Tax Withheld</p>
              </div>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(data.total_taxes_withheld ?? 0)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{getMonthLabel(month)}</p>
            </div>
            <div className="stat-card !p-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-purple-500" />
                <p className="text-xs text-gray-500">ATC Entries</p>
              </div>
              <p className="text-lg font-bold text-purple-600 mt-1">{(data.breakdown_by_nature || []).length}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">breakdown items</p>
            </div>
            <div className="stat-card !p-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-orange-500" />
                <p className="text-xs text-gray-500">ATC Codes Used</p>
              </div>
              <p className="text-lg font-bold text-orange-600 mt-1">
                {new Set((data.breakdown_by_nature || []).map(b => b.atc)).size}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">distinct tax types</p>
            </div>
          </div>

          {/* Breakdown by ATC Code */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Breakdown by ATC Code</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ATC</th>
                    <th>Nature of Payment</th>
                    <th className="text-right">Tax Base</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Tax Withheld</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.breakdown_by_nature || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-8">
                        No withholding tax transactions for this period
                      </td>
                    </tr>
                  ) : (
                    (data.breakdown_by_nature || []).map((item, i) => (
                      <tr key={i}>
                        <td className="font-mono text-xs">
                          <span className="badge bg-gray-100 text-gray-700">{item.atc}</span>
                        </td>
                        <td className="font-medium">{item.nature}</td>
                        <td className="text-right">{formatCurrency(item.tax_base)}</td>
                        <td className="text-right text-gray-500">{(item.tax_rate * 100).toFixed(1)}%</td>
                        <td className="text-right font-medium text-red-600">{formatCurrency(item.tax_withheld)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {(data.breakdown_by_nature || []).length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={2} className="px-4 py-3">Total</td>
                      <td className="text-right px-4 py-3">
                        {formatCurrency((data.breakdown_by_nature || []).reduce((s, b) => s + (b.tax_base ?? 0), 0))}
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="text-right px-4 py-3 text-red-600">
                        {formatCurrency(data.total_taxes_withheld ?? 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Yearly Trend */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Monthly Remittance Trend - {month.split('-')[0]}</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="text-right">Amount Remitted</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map(row => (
                    <tr key={row.month} className={row.month === month ? 'bg-blue-50' : ''}>
                      <td className="font-medium">
                        {getMonthLabel(row.month)}
                        {row.month === month && (
                          <span className="badge bg-blue-100 text-blue-700 ml-2 text-[10px]">Current</span>
                        )}
                      </td>
                      <td className="text-right font-medium">
                        {row.amount > 0 ? formatCurrency(row.amount) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-4 py-3">Year Total</td>
                    <td className="text-right px-4 py-3">
                      {formatCurrency(yearlyData.reduce((s, r) => s + r.amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
