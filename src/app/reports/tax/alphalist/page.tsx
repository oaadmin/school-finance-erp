'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import { FileSpreadsheet, Download, Printer, Users, FileText, Hash } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QAPRow {
  seq_no: number;
  tin: string;
  vendor_name: string;
  atc: string;
  income_payment: number;
  tax_withheld: number;
}

interface QAPData {
  payees: QAPRow[];
  total_income: number;
  total_tax: number;
  form?: string;
  period?: Record<string, unknown>;
}

interface SAWTRow {
  atc: string;
  description: string;
  tax_base: number;
  tax_rate: number;
  tax_withheld: number;
}

interface SAWTData {
  summary: SAWTRow[];
  total_base: number;
  total_tax: number;
  form?: string;
  period?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Jan - Mar)' },
  { value: 'Q2', label: 'Q2 (Apr - Jun)' },
  { value: 'Q3', label: 'Q3 (Jul - Sep)' },
  { value: 'Q4', label: 'Q4 (Oct - Dec)' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AlphalistPage() {
  const [activeTab, setActiveTab] = useState<'qap' | 'sawt'>('qap');
  const [quarter, setQuarter] = useState(QUARTERS[Math.floor(new Date().getMonth() / 3)].value);
  const [year, setYear] = useState(currentYear);

  const [qapData, setQapData] = useState<QAPData | null>(null);
  const [sawtData, setSawtData] = useState<SAWTData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    const qapFetch = fetch(`/api/reports/tax?type=qap&quarter=${quarter}&year=${year}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);

    const sawtFetch = fetch(`/api/reports/tax?type=sawt&quarter=${quarter}&year=${year}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);

    Promise.all([qapFetch, sawtFetch]).then(([qap, sawt]) => {
      setQapData(qap);
      setSawtData(sawt);
      setLoading(false);
      if (!qap && !sawt) setError('Failed to load alphalist data for this period.');
    });
  }, [quarter, year]);

  // ---------------------------------------------------------------------------
  // Export handlers
  // ---------------------------------------------------------------------------

  function handleExportQAPExcel() {
    if (!qapData) return;
    const rows = (qapData.payees || []).map(r => ({
      'Seq No': r.seq_no,
      'TIN': r.tin,
      'Registered Name': r.vendor_name,
      'ATC': r.atc,
      'Income Payment': r.income_payment,
      'Tax Withheld': r.tax_withheld,
    }));
    exportToExcel(rows, `QAP_${quarter}_${year}`, `QAP Alphalist - ${quarter} ${year}`);
  }

  function handleExportQAPCSV() {
    if (!qapData) return;
    const header = 'SEQ,TIN,NAME,ATC,INCOME,TAX';
    const lines = (qapData.payees || []).map(r =>
      `${r.seq_no},${r.tin},"${r.vendor_name}",${r.atc},${(r.income_payment ?? 0).toFixed(2)},${(r.tax_withheld ?? 0).toFixed(2)}`
    );
    const csv = [header, ...lines].join('\n');
    downloadFile(csv, `QAP_${quarter}_${year}.csv`, 'text/csv');
  }

  function handleExportQAPDAT() {
    if (!qapData) return;
    // BIR DAT format: pipe-delimited
    const payees = qapData.payees || [];
    const lines = payees.map(r =>
      `D${r.atc}|${r.tin}|${r.vendor_name}|${(r.income_payment ?? 0).toFixed(2)}|${(r.tax_withheld ?? 0).toFixed(2)}`
    );
    // Add control record
    const totalIncome = (qapData.total_income || 0).toFixed(2);
    const totalTax = (qapData.total_tax || 0).toFixed(2);
    const control = `C${payees.length}|${totalIncome}|${totalTax}`;
    const dat = [...lines, control].join('\r\n');
    downloadFile(dat, `QAP_${quarter}_${year}.dat`, 'application/octet-stream');
  }

  function handleExportSAWT() {
    if (!sawtData) return;
    const rows = (sawtData.summary || []).map(r => ({
      'ATC': r.atc,
      'Description': r.description,
      'Tax Base': r.tax_base,
      'Tax Rate (%)': (r.tax_rate * 100).toFixed(2),
      'Tax Withheld': r.tax_withheld,
    }));
    exportToExcel(rows, `SAWT_${quarter}_${year}`, `SAWT Summary - ${quarter} ${year}`);
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
            <FileSpreadsheet size={24} className="text-primary-600" />
            Alphalist of Payees (QAP) &amp; SAWT
          </h1>
          <p className="text-sm text-gray-500">Quarterly Alphalist of Payees and Summary Alphalist of Withholding Taxes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-primary text-xs sm:text-sm">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card no-print">
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Quarter</label>
              <select
                className="select-field w-full"
                value={quarter}
                onChange={e => setQuarter(e.target.value)}
              >
                {QUARTERS.map(q => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <select
                className="select-field w-full"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card">
          <div className="card-body text-center py-12 text-gray-400">{error}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 no-print">
        <button
          className={`tab-btn ${activeTab === 'qap' ? 'active' : ''}`}
          onClick={() => setActiveTab('qap')}
        >
          <Users size={14} className="inline mr-1" />
          QAP - Alphalist of Payees
          {qapData && (
            <span className="badge bg-blue-100 text-blue-700 ml-2 text-[10px]">{(qapData.payees || []).length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'sawt' ? 'active' : ''}`}
          onClick={() => setActiveTab('sawt')}
        >
          <FileText size={14} className="inline mr-1" />
          SAWT - Summary
          {sawtData && (
            <span className="badge bg-purple-100 text-purple-700 ml-2 text-[10px]">{(sawtData.summary || []).length}</span>
          )}
        </button>
      </div>

      {/* QAP Tab */}
      {activeTab === 'qap' && qapData && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
            <div className="stat-card !p-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-500" />
                <p className="text-xs text-gray-500">Total Payees</p>
              </div>
              <p className="text-lg font-bold text-gray-900 mt-1">{(qapData.payees || []).length}</p>
            </div>
            <div className="stat-card !p-4">
              <div className="flex items-center gap-2">
                <Hash size={16} className="text-green-500" />
                <p className="text-xs text-gray-500">Total Income Payments</p>
              </div>
              <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(qapData.total_income || 0)}</p>
            </div>
            <div className="stat-card !p-4 border-2 border-red-200">
              <div className="flex items-center gap-2">
                <Hash size={16} className="text-red-500" />
                <p className="text-xs text-gray-500">Total Tax Withheld</p>
              </div>
              <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency(qapData.total_tax || 0)}</p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 no-print">
            <button onClick={handleExportQAPExcel} className="btn-secondary text-xs">
              <Download size={14} /> Export Excel
            </button>
            <button onClick={handleExportQAPCSV} className="btn-secondary text-xs">
              <Download size={14} /> Export as CSV
              <span className="text-[10px] text-gray-400 ml-1">(BIR eFPS)</span>
            </button>
            <button onClick={handleExportQAPDAT} className="btn-secondary text-xs">
              <Download size={14} /> Export as DAT
              <span className="text-[10px] text-gray-400 ml-1">(BIR format)</span>
            </button>
          </div>

          {/* QAP Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Quarterly Alphalist of Payees - {quarter} {year}</h3>
            </div>
            <div className="table-container">
              <table className="data-table text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="w-12">Seq#</th>
                    <th>TIN</th>
                    <th>Registered Name</th>
                    <th>ATC</th>
                    <th className="text-right">Income Payment</th>
                    <th className="text-right">Tax Withheld</th>
                  </tr>
                </thead>
                <tbody>
                  {(qapData.payees || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-400 py-8">
                        No payee records for this quarter
                      </td>
                    </tr>
                  ) : (
                    (qapData.payees || []).map((row, i) => (
                      <tr key={i}>
                        <td className="text-center text-gray-500">{row.seq_no}</td>
                        <td className="font-mono text-xs">{row.tin}</td>
                        <td className="font-medium max-w-[200px] truncate">{row.vendor_name}</td>
                        <td>
                          <span className="badge bg-gray-100 text-gray-700 text-xs">{row.atc}</span>
                        </td>
                        <td className="text-right">{formatCurrency(row.income_payment)}</td>
                        <td className="text-right font-medium text-red-600">{formatCurrency(row.tax_withheld)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {(qapData.payees || []).length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={4} className="px-4 py-3 text-right">TOTALS</td>
                      <td className="text-right px-4 py-3">{formatCurrency(qapData.total_income || 0)}</td>
                      <td className="text-right px-4 py-3 text-red-600">{formatCurrency(qapData.total_tax || 0)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* SAWT Tab */}
      {activeTab === 'sawt' && sawtData && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
            <div className="stat-card !p-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-500" />
                <p className="text-xs text-gray-500">ATC Codes</p>
              </div>
              <p className="text-lg font-bold text-purple-600 mt-1">{(sawtData.summary || []).length}</p>
            </div>
            <div className="stat-card !p-4">
              <div className="flex items-center gap-2">
                <Hash size={16} className="text-green-500" />
                <p className="text-xs text-gray-500">Total Tax Base</p>
              </div>
              <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(sawtData.total_base || 0)}</p>
            </div>
            <div className="stat-card !p-4 border-2 border-red-200">
              <div className="flex items-center gap-2">
                <Hash size={16} className="text-red-500" />
                <p className="text-xs text-gray-500">Total Tax Withheld</p>
              </div>
              <p className="text-lg font-bold text-red-600 mt-1">{formatCurrency(sawtData.total_tax || 0)}</p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 no-print">
            <button onClick={handleExportSAWT} className="btn-secondary text-xs">
              <Download size={14} /> Export Excel
            </button>
          </div>

          {/* SAWT Summary Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Summary Alphalist of Withholding Taxes - {quarter} {year}</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ATC</th>
                    <th>Description</th>
                    <th className="text-right">Tax Base</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Tax Withheld</th>
                  </tr>
                </thead>
                <tbody>
                  {(sawtData.summary || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-8">
                        No SAWT records for this quarter
                      </td>
                    </tr>
                  ) : (
                    (sawtData.summary || []).map((row, i) => (
                      <tr key={i}>
                        <td>
                          <span className="badge bg-purple-100 text-purple-700 font-mono text-xs">{row.atc}</span>
                        </td>
                        <td className="font-medium">{row.description}</td>
                        <td className="text-right">{formatCurrency(row.tax_base)}</td>
                        <td className="text-right text-gray-500">{(row.tax_rate * 100).toFixed(1)}%</td>
                        <td className="text-right font-medium text-red-600">{formatCurrency(row.tax_withheld)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {(sawtData.summary || []).length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={2} className="px-4 py-3">TOTALS</td>
                      <td className="text-right px-4 py-3">{formatCurrency(sawtData.total_base || 0)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="text-right px-4 py-3 text-red-600">{formatCurrency(sawtData.total_tax || 0)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
