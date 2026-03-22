'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import { Download, Filter, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface VATTransaction {
  reference: string;
  date: string;
  entity_name: string;
  tin: string;
  gross_amount?: number;
  vat_amount: number;
  net_payable?: number;
  type: 'purchase' | 'sale';
}

interface MonthlyBreakdown {
  month: string;
  inputVat: number;
  outputVat: number;
  netVat: number;
}

interface VATSummary {
  totalInput: number;
  totalOutput: number;
  netVat: number;
}

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

export default function VATTrackingPage() {
  const [inputVat, setInputVat] = useState<VATTransaction[]>([]);
  const [outputVat, setOutputVat] = useState<VATTransaction[]>([]);
  const [monthly, setMonthly] = useState<MonthlyBreakdown[]>([]);
  const [summary, setSummary] = useState<VATSummary>({ totalInput: 0, totalOutput: 0, netVat: 0 });
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-05-31');
  const [activeTab, setActiveTab] = useState<'monthly' | 'output' | 'input'>('monthly');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/tax/vat-detail?date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.json())
      .then(res => {
        setInputVat(res.inputVat || []);
        setOutputVat(res.outputVat || []);
        setMonthly(res.monthlyBreakdown || []);
        setSummary(res.summary || { totalInput: 0, totalOutput: 0, netVat: 0 });
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load VAT data');
        setLoading(false);
      });
  }, [dateFrom, dateTo]);

  function handleExport() {
    if (activeTab === 'monthly') {
      const rows = monthly.map(m => ({
        'Month': getMonthLabel(m.month),
        'Output VAT': m.outputVat,
        'Input VAT': m.inputVat,
        'Net VAT': m.netVat,
      }));
      if (rows.length === 0) { toast.error('No data to export'); return; }
      exportToExcel(rows, 'vat-monthly-breakdown', 'VAT Monthly Breakdown');
    } else if (activeTab === 'input') {
      const rows = inputVat.map(t => ({
        'Date': t.date,
        'Reference': t.reference,
        'Vendor': t.entity_name,
        'TIN': t.tin || '',
        'Gross Amount': t.gross_amount || 0,
        'VAT Amount': t.vat_amount,
        'Net Payable': t.net_payable || 0,
      }));
      if (rows.length === 0) { toast.error('No data to export'); return; }
      exportToExcel(rows, 'input-vat-detail', 'Input VAT Detail');
    } else {
      const rows = outputVat.map(t => ({
        'Date': t.date,
        'Reference': t.reference,
        'Description': t.entity_name,
        'VAT Amount': t.vat_amount,
      }));
      if (rows.length === 0) { toast.error('No data to export'); return; }
      exportToExcel(rows, 'output-vat-detail', 'Output VAT Detail');
    }
    toast.success('Exported to Excel');
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Scale size={24} className="text-primary-600" /> VAT Tracking
        </h1>
        <p className="text-sm text-gray-500">Value-Added Tax monitoring for BIR compliance</p>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">From</label>
              <input type="date" className="input-field text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">To</label>
              <input type="date" className="input-field text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={handleExport} className="btn-secondary text-xs">
              <Download size={14} /> Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-card !p-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-red-500" />
            <p className="text-xs text-gray-500">Output VAT (Sales)</p>
          </div>
          <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency(summary.totalOutput)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{outputVat.length} transactions</p>
        </div>
        <div className="stat-card !p-4">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-green-500" />
            <p className="text-xs text-gray-500">Input VAT (Purchases)</p>
          </div>
          <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(summary.totalInput)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{inputVat.length} transactions</p>
        </div>
        <div className="stat-card !p-4 border-2 border-blue-200">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-blue-500" />
            <p className="text-xs text-gray-500">Net VAT Payable</p>
          </div>
          <p className={`text-lg font-bold mt-1 ${summary.netVat >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(Math.abs(summary.netVat))}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {summary.netVat >= 0 ? 'Payable to BIR' : 'Excess input VAT (creditable)'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          Monthly Breakdown
        </button>
        <button
          className={`tab-btn ${activeTab === 'output' ? 'active' : ''}`}
          onClick={() => setActiveTab('output')}
        >
          Output VAT ({outputVat.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          Input VAT ({inputVat.length})
        </button>
      </div>

      {/* Monthly Breakdown Tab */}
      {activeTab === 'monthly' && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Monthly VAT Breakdown</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="text-right">Output VAT</th>
                  <th className="text-right">Input VAT</th>
                  <th className="text-right">Net VAT</th>
                  <th className="text-center hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {monthly.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No VAT data for selected period</td></tr>
                ) : (
                  monthly.map(m => (
                    <tr key={m.month}>
                      <td className="font-medium">{getMonthLabel(m.month)}</td>
                      <td className="text-right text-red-600">{formatCurrency(m.outputVat)}</td>
                      <td className="text-right text-green-600">{formatCurrency(m.inputVat)}</td>
                      <td className={`text-right font-medium ${m.netVat >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(Math.abs(m.netVat))}
                      </td>
                      <td className="text-center hidden sm:table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          m.netVat >= 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {m.netVat >= 0 ? 'Payable' : 'Creditable'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {monthly.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-4 py-3">TOTAL</td>
                    <td className="text-right px-4 py-3 text-red-600">{formatCurrency(summary.totalOutput)}</td>
                    <td className="text-right px-4 py-3 text-green-600">{formatCurrency(summary.totalInput)}</td>
                    <td className={`text-right px-4 py-3 ${summary.netVat >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(summary.netVat))}
                    </td>
                    <td className="hidden sm:table-cell"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Output VAT Tab */}
      {activeTab === 'output' && (
        <div className="card">
          <div className="card-header bg-red-50">
            <h3 className="font-semibold text-red-800">Output VAT - Sales Transactions</h3>
          </div>
          <div className="table-container">
            <table className="data-table text-xs sm:text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th className="text-right">VAT Amount</th>
                </tr>
              </thead>
              <tbody>
                {outputVat.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-8">No output VAT transactions found</td></tr>
                ) : (
                  outputVat.map((t, i) => (
                    <tr key={i}>
                      <td className="text-gray-600">{formatDate(t.date)}</td>
                      <td className="font-mono text-xs">{t.reference}</td>
                      <td className="text-gray-700 max-w-[250px] truncate">{t.entity_name}</td>
                      <td className="text-right font-medium text-red-600">{formatCurrency(t.vat_amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {outputVat.length > 0 && (
                <tfoot>
                  <tr className="bg-red-50 font-bold">
                    <td colSpan={3} className="px-4 py-3">Total Output VAT</td>
                    <td className="text-right px-4 py-3 text-red-600">{formatCurrency(summary.totalOutput)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Input VAT Tab */}
      {activeTab === 'input' && (
        <div className="card">
          <div className="card-header bg-green-50">
            <h3 className="font-semibold text-green-800">Input VAT - Purchase Transactions</h3>
          </div>
          <div className="table-container">
            <table className="data-table text-xs sm:text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Vendor</th>
                  <th className="hidden sm:table-cell">TIN</th>
                  <th className="text-right">Gross</th>
                  <th className="text-right">VAT</th>
                  <th className="text-right hidden sm:table-cell">Net</th>
                </tr>
              </thead>
              <tbody>
                {inputVat.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-8">No input VAT transactions found</td></tr>
                ) : (
                  inputVat.map((t, i) => (
                    <tr key={i}>
                      <td className="text-gray-600">{formatDate(t.date)}</td>
                      <td className="font-mono text-xs">{t.reference}</td>
                      <td className="text-gray-700 max-w-[180px] truncate">{t.entity_name}</td>
                      <td className="text-xs text-gray-400 font-mono hidden sm:table-cell">{t.tin || 'N/A'}</td>
                      <td className="text-right">{formatCurrency(t.gross_amount)}</td>
                      <td className="text-right font-medium text-green-600">{formatCurrency(t.vat_amount)}</td>
                      <td className="text-right hidden sm:table-cell">{formatCurrency(t.net_payable)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {inputVat.length > 0 && (
                <tfoot>
                  <tr className="bg-green-50 font-bold">
                    <td colSpan={3} className="px-4 py-3">Total Input VAT</td>
                    <td className="hidden sm:table-cell"></td>
                    <td className="text-right px-4 py-3">
                      {formatCurrency(inputVat.reduce((s, t) => s + (t.gross_amount || 0), 0))}
                    </td>
                    <td className="text-right px-4 py-3 text-green-600">{formatCurrency(summary.totalInput)}</td>
                    <td className="text-right px-4 py-3 hidden sm:table-cell">
                      {formatCurrency(inputVat.reduce((s, t) => s + (t.net_payable || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
