'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import { Receipt, Printer, Download, DollarSign, TrendingUp, TrendingDown, Calculator } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SalesBreakdownItem {
  account_code?: string;
  account_name: string;
  amount: number;
}

interface BIR2550MData {
  taxable_sales: number;
  exempt_sales: number;
  zero_rated_sales: number;
  output_vat: number;
  input_vat: number;
  vat_payable: number;
  sales_breakdown: SalesBreakdownItem[];
  form?: string;
  period?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VAT2550MPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<BIR2550MData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/reports/tax?type=bir-2550m&month=${month}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((res: BIR2550MData) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load VAT data for this period.');
        setData(null);
        setLoading(false);
      });
  }, [month]);

  function handlePrint() {
    window.print();
  }

  function handleExport() {
    if (!data) return;
    const rows = [
      { Line: '1', Description: 'Total Taxable Sales', Amount: (data.taxable_sales ?? 0) },
      { Line: '2', Description: 'Total Exempt Sales', Amount: (data.exempt_sales ?? 0) },
      { Line: '3', Description: 'Total Zero-Rated Sales', Amount: (data.zero_rated_sales ?? 0) },
      { Line: '4', Description: 'Output Tax (Line 1 x 12%)', Amount: (data.output_vat ?? 0) },
      { Line: '5', Description: 'Less: Input Tax', Amount: (data.input_vat ?? 0) },
      { Line: '6', Description: 'VAT Payable (Line 4 - Line 5)', Amount: (data.vat_payable ?? 0) },
    ];
    exportToExcel(rows, `BIR-2550M_${month}`, `BIR 2550M - ${month}`);
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
            <Receipt size={24} className="text-primary-600" />
            BIR 2550M - Monthly VAT Declaration
          </h1>
          <p className="text-sm text-gray-500">Monthly Value-Added Tax Declaration tracker</p>
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
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="stat-card !p-4">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-blue-500" />
                <p className="text-xs text-gray-500">Taxable Sales</p>
              </div>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency((data.taxable_sales ?? 0))}</p>
            </div>
            <div className="stat-card !p-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-red-500" />
                <p className="text-xs text-gray-500">Output VAT (12%)</p>
              </div>
              <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency((data.output_vat ?? 0))}</p>
            </div>
            <div className="stat-card !p-4">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-green-500" />
                <p className="text-xs text-gray-500">Input VAT</p>
              </div>
              <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency((data.input_vat ?? 0))}</p>
            </div>
            <div className="stat-card !p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-blue-500" />
                <p className="text-xs text-gray-500">VAT Payable</p>
              </div>
              <p className={`text-lg font-bold mt-1 ${(data.vat_payable ?? 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs((data.vat_payable ?? 0)))}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {(data.vat_payable ?? 0) >= 0 ? 'Payable to BIR' : 'Excess Input VAT'}
              </p>
            </div>
          </div>

          {/* Revenue Breakdown Table */}
          {(data.sales_breakdown || []).length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Revenue Breakdown</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account Name</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.sales_breakdown || []).map((item, i) => (
                      <tr key={i}>
                        <td className="font-medium">{item.account_name}</td>
                        <td className="text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td className="px-4 py-3">Total Revenue</td>
                      <td className="text-right px-4 py-3">
                        {formatCurrency((data.sales_breakdown || []).reduce((s, r) => s + r.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* BIR 2550M Form Summary */}
          <div className="card" id="bir-2550m-print-root">
            <div className="card-header bg-blue-50">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                <Receipt size={18} />
                BIR Form 2550M Summary - {month}
              </h3>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-700 w-20">Line</th>
                      <th className="border border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                      <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700 w-48">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 px-4 py-3 font-mono text-xs text-gray-500">1</td>
                      <td className="border border-gray-200 px-4 py-3 font-medium">Total Taxable Sales</td>
                      <td className="border border-gray-200 px-4 py-3 text-right font-medium">{formatCurrency((data.taxable_sales ?? 0))}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-3 font-mono text-xs text-gray-500">2</td>
                      <td className="border border-gray-200 px-4 py-3 font-medium">Total Exempt Sales</td>
                      <td className="border border-gray-200 px-4 py-3 text-right font-medium">{formatCurrency((data.exempt_sales ?? 0))}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-3 font-mono text-xs text-gray-500">3</td>
                      <td className="border border-gray-200 px-4 py-3 font-medium">Total Zero-Rated Sales</td>
                      <td className="border border-gray-200 px-4 py-3 text-right font-medium">{formatCurrency((data.zero_rated_sales ?? 0))}</td>
                    </tr>
                    <tr className="bg-red-50">
                      <td className="border border-gray-200 px-4 py-3 font-mono text-xs text-gray-500">4</td>
                      <td className="border border-gray-200 px-4 py-3 font-medium text-red-800">Output Tax (Line 1 x 12%)</td>
                      <td className="border border-gray-200 px-4 py-3 text-right font-bold text-red-600">{formatCurrency((data.output_vat ?? 0))}</td>
                    </tr>
                    <tr className="bg-green-50">
                      <td className="border border-gray-200 px-4 py-3 font-mono text-xs text-gray-500">5</td>
                      <td className="border border-gray-200 px-4 py-3 font-medium text-green-800">Less: Input Tax</td>
                      <td className="border border-gray-200 px-4 py-3 text-right font-bold text-green-600">({formatCurrency((data.input_vat ?? 0))})</td>
                    </tr>
                    <tr className="bg-blue-50 border-t-2 border-blue-300">
                      <td className="border border-gray-200 px-4 py-4 font-mono text-xs text-blue-600 font-bold">6</td>
                      <td className="border border-gray-200 px-4 py-4 font-bold text-blue-800">VAT Payable (Line 4 - Line 5)</td>
                      <td className="border border-gray-200 px-4 py-4 text-right font-bold text-lg text-blue-700">
                        {formatCurrency((data.vat_payable ?? 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
