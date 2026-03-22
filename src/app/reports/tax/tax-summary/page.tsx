'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel, exportToPDF } from '@/lib/export';
import ReportFilters from '@/components/reports/ReportFilters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MONTHS_LABEL: Record<string, string> = { '2025-07': 'Jul', '2025-08': 'Aug', '2025-09': 'Sep', '2025-10': 'Oct', '2025-11': 'Nov', '2025-12': 'Dec', '2026-01': 'Jan', '2026-02': 'Feb' };

interface VATData { outputVat: number; inputVat: number; netVat: number; monthly: Array<{ month: string; output_vat: number; input_vat: number }>; }
interface WTaxData { ewt: number; compensation: number; totalWithholding: number; monthly: Array<{ month: string; wtax_compensation: number; ewt: number }>; vendorEwt: Array<{ vendor: string; tin: string; tax_amount: number; tax_base: number; transaction_count: number }>; }

export default function TaxSummary() {
  const [vatData, setVatData] = useState<VATData | null>(null);
  const [wtaxData, setWtaxData] = useState<WTaxData | null>(null);
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');
  const [activeTab, setActiveTab] = useState<'vat' | 'wtax'>('vat');

  useEffect(() => {
    fetch(`/api/reports/tax?type=vat-summary&date_from=${dateFrom}&date_to=${dateTo}`).then(r => r.json()).then(setVatData);
    fetch(`/api/reports/tax?type=withholding-tax&date_from=${dateFrom}&date_to=${dateTo}`).then(r => r.json()).then(setWtaxData);
  }, [dateFrom, dateTo]);

  if (!vatData || !wtaxData) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const vatChartData = vatData.monthly.map(m => ({
    name: MONTHS_LABEL[m.month] || m.month,
    'Output VAT': m.output_vat,
    'Input VAT': m.input_vat,
    'Net VAT': m.output_vat - m.input_vat,
  }));

  const wtaxChartData = wtaxData.monthly.map(m => ({
    name: MONTHS_LABEL[m.month] || m.month,
    'WTax Compensation': m.wtax_compensation,
    'EWT': m.ewt,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tax Reports</h1>
        <p className="text-sm text-gray-500">VAT and Withholding Tax summaries for BIR filing</p>
      </div>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        onExport={(fmt) => {
          const vatRows = vatData.monthly.map(m => ({ month: MONTHS_LABEL[m.month] || m.month, output_vat: m.output_vat, input_vat: m.input_vat, net_vat: m.output_vat - m.input_vat }));
          if (fmt === 'excel') exportToExcel(vatRows, 'tax-summary');
          else exportToPDF('Tax Summary - VAT', ['Month', 'Output VAT', 'Input VAT', 'Net VAT'], vatRows.map(r => [r.month, formatCurrency(r.output_vat), formatCurrency(r.input_vat), formatCurrency(r.net_vat)]), 'tax-summary');
        }} />

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button className={`tab-btn ${activeTab === 'vat' ? 'active' : ''}`} onClick={() => setActiveTab('vat')}>VAT Reports</button>
        <button className={`tab-btn ${activeTab === 'wtax' ? 'active' : ''}`} onClick={() => setActiveTab('wtax')}>Withholding Tax</button>
      </div>

      {activeTab === 'vat' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="stat-card !p-4"><p className="text-xs text-gray-500">Output VAT</p><p className="text-lg font-bold text-red-600">{formatCurrency(vatData.outputVat)}</p></div>
            <div className="stat-card !p-4"><p className="text-xs text-gray-500">Input VAT</p><p className="text-lg font-bold text-green-600">{formatCurrency(vatData.inputVat)}</p></div>
            <div className="stat-card !p-4 border-2 border-blue-200"><p className="text-xs text-gray-500">Net VAT Payable</p><p className="text-lg font-bold">{formatCurrency(vatData.netVat)}</p></div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Monthly VAT Summary</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vatChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="Output VAT" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Input VAT" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Monthly Detail</h3></div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Month</th><th className="text-right">Output VAT</th><th className="text-right">Input VAT</th><th className="text-right">Net VAT</th></tr></thead>
                <tbody>
                  {vatData.monthly.map(m => (
                    <tr key={m.month}>
                      <td className="font-medium">{MONTHS_LABEL[m.month] || m.month}</td>
                      <td className="text-right">{formatCurrency(m.output_vat)}</td>
                      <td className="text-right">{formatCurrency(m.input_vat)}</td>
                      <td className="text-right font-medium">{formatCurrency(m.output_vat - m.input_vat)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-4 py-3">Total</td>
                    <td className="text-right px-4 py-3">{formatCurrency(vatData.outputVat)}</td>
                    <td className="text-right px-4 py-3">{formatCurrency(vatData.inputVat)}</td>
                    <td className="text-right px-4 py-3">{formatCurrency(vatData.netVat)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'wtax' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="stat-card !p-4"><p className="text-xs text-gray-500">WTax - Compensation</p><p className="text-lg font-bold text-blue-600">{formatCurrency(wtaxData.compensation)}</p></div>
            <div className="stat-card !p-4"><p className="text-xs text-gray-500">Expanded WT (EWT)</p><p className="text-lg font-bold text-purple-600">{formatCurrency(wtaxData.ewt)}</p></div>
            <div className="stat-card !p-4 border-2 border-blue-200"><p className="text-xs text-gray-500">Total Withholding</p><p className="text-lg font-bold">{formatCurrency(wtaxData.totalWithholding)}</p></div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Monthly Withholding Tax</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={wtaxChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="WTax Compensation" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="EWT" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {wtaxData.vendorEwt.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">EWT by Vendor</h3></div>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Vendor</th><th className="hidden sm:table-cell">TIN</th><th className="text-right">Tax Base</th><th className="text-right">Tax Amount</th><th className="text-right hidden sm:table-cell">Transactions</th></tr></thead>
                  <tbody>
                    {wtaxData.vendorEwt.map((v, i) => (
                      <tr key={i}>
                        <td className="font-medium text-sm">{v.vendor}</td>
                        <td className="text-xs text-gray-400 hidden sm:table-cell">{v.tin}</td>
                        <td className="text-right">{formatCurrency(v.tax_base)}</td>
                        <td className="text-right font-medium">{formatCurrency(v.tax_amount)}</td>
                        <td className="text-right text-gray-500 hidden sm:table-cell">{v.transaction_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
