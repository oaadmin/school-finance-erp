'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, Printer, Download, Filter, Search } from 'lucide-react';
import { printDocument } from '@/lib/print-document';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/components/ui/Toast';

interface WHT2307Transaction {
  reference: string;
  date: string;
  description: string;
  gross: number;
  tax_rate: number;
  wht: number;
}

interface WHT2307 {
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
  tin: string;
  address: string;
  total_gross: number;
  total_wht: number;
  transactions: WHT2307Transaction[];
}

interface Period {
  quarter: string;
  year: string;
  startDate: string;
  endDate: string;
}

interface SchoolInfo {
  name: string;
  tin: string;
  address: string;
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function getATCCode(taxRate: number): string {
  if (taxRate >= 14 && taxRate <= 16) return 'WI010';  // Professional fees
  if (taxRate >= 1 && taxRate <= 3) return 'WC010';    // Contractors
  if (taxRate >= 4 && taxRate <= 6) return 'WI100';    // Rent
  if (taxRate >= 9 && taxRate <= 11) return 'WI010';   // Professional fees (10%)
  return 'WI010'; // Default to professional fees
}

function getATCDescription(atc: string): string {
  const map: Record<string, string> = {
    'WI010': 'Professional/talent fees - Individual',
    'WC010': 'Contractors - Income payments',
    'WI100': 'Rent - Real property',
  };
  return map[atc] || 'Other income payments';
}

export default function BIR2307Page() {
  const [data, setData] = useState<WHT2307[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [quarter, setQuarter] = useState('Q1');
  const [year, setYear] = useState(String(currentYear));
  const [vendorSearch, setVendorSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedVendor, setExpandedVendor] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/tax/bir-2307?quarter=${quarter}&year=${year}`)
      .then(r => r.json())
      .then(res => {
        setData(res.data || []);
        setPeriod(res.period);
        setSchoolInfo(res.schoolInfo);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load BIR 2307 data');
        setLoading(false);
      });
  }, [quarter, year]);

  const filtered = data.filter(v =>
    !vendorSearch ||
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.tin?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.vendor_code?.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const totalGross = filtered.reduce((s, v) => s + v.total_gross, 0);
  const totalWHT = filtered.reduce((s, v) => s + v.total_wht, 0);

  function handleExportExcel() {
    const rows = filtered.flatMap(v =>
      v.transactions.map(t => ({
        'Vendor': v.vendor_name,
        'TIN': v.tin || '',
        'Reference': t.reference,
        'Date': t.date,
        'Description': t.description,
        'Gross Amount': t.gross,
        'Tax Rate (%)': t.tax_rate,
        'Tax Withheld': t.wht,
        'ATC': getATCCode(t.tax_rate),
      }))
    );
    if (rows.length === 0) {
      toast.error('No data to export');
      return;
    }
    exportToExcel(rows, `BIR-2307-${quarter}-${year}`, `BIR 2307 - ${quarter} ${year}`);
    toast.success('Exported to Excel');
  }

  function generate2307(vendor: WHT2307) {
    if (!schoolInfo || !period) return;

    const quarterMonths: Record<string, string> = {
      'Q1': 'January 1 - March 31',
      'Q2': 'April 1 - June 30',
      'Q3': 'July 1 - September 30',
      'Q4': 'October 1 - December 31',
    };

    // Group transactions by ATC
    const byATC: Record<string, { atc: string; desc: string; gross: number; wht: number }> = {};
    vendor.transactions.forEach(t => {
      const atc = getATCCode(t.tax_rate);
      if (!byATC[atc]) {
        byATC[atc] = { atc, desc: getATCDescription(atc), gross: 0, wht: 0 };
      }
      byATC[atc].gross += t.gross;
      byATC[atc].wht += t.wht;
    });

    const atcRows = Object.values(byATC).map(row =>
      `<tr>
        <td style="font-family:monospace;font-weight:600">${row.atc}</td>
        <td>${row.desc}</td>
        <td class="amount">${formatCurrency(row.gross)}</td>
        <td class="amount">${formatCurrency(row.wht)}</td>
      </tr>`
    ).join('');

    const txnRows = vendor.transactions.map(t =>
      `<tr>
        <td>${t.date}</td>
        <td>${t.reference}</td>
        <td>${t.description}</td>
        <td class="amount">${formatCurrency(t.gross)}</td>
        <td style="text-align:center">${t.tax_rate}%</td>
        <td class="amount">${formatCurrency(t.wht)}</td>
      </tr>`
    ).join('');

    const content = `
      <div style="border:2px solid #1e3a5f;padding:16px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <div style="flex:1">
            <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Payor (Withholding Agent)</div>
            <div style="font-weight:700;font-size:13px;margin-top:2px">${schoolInfo.name}</div>
            <div style="font-size:11px;color:#444">${schoolInfo.address}</div>
            <div style="font-size:11px;font-family:monospace;margin-top:4px">TIN: ${schoolInfo.tin}</div>
          </div>
          <div style="flex:1;text-align:right">
            <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Period Covered</div>
            <div style="font-weight:600;font-size:12px;margin-top:2px">${quarterMonths[period.quarter]} ${period.year}</div>
          </div>
        </div>
        <div style="border-top:1px solid #d0d7de;padding-top:12px">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px">Payee (Supplier/Vendor)</div>
          <div style="font-weight:700;font-size:13px;margin-top:2px">${vendor.vendor_name}</div>
          <div style="font-size:11px;color:#444">${vendor.address || 'Address on file'}</div>
          <div style="font-size:11px;font-family:monospace;margin-top:4px">TIN: ${vendor.tin || 'N/A'}</div>
        </div>
      </div>

      <h3 style="font-size:11px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px">
        Schedule of Income Payments and Taxes Withheld
      </h3>
      <table>
        <thead>
          <tr>
            <th style="width:80px">ATC</th>
            <th>Nature of Income Payment</th>
            <th class="text-right" style="width:120px">Amount of Income</th>
            <th class="text-right" style="width:120px">Tax Withheld</th>
          </tr>
        </thead>
        <tbody>
          ${atcRows}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="2" style="font-weight:700">TOTAL</td>
            <td class="amount" style="font-weight:700">${formatCurrency(vendor.total_gross)}</td>
            <td class="amount" style="font-weight:700">${formatCurrency(vendor.total_wht)}</td>
          </tr>
        </tfoot>
      </table>

      <h3 style="font-size:11px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.3px;margin:20px 0 6px">
        Transaction Details
      </h3>
      <table>
        <thead>
          <tr>
            <th style="width:80px">Date</th>
            <th style="width:90px">Reference</th>
            <th>Description</th>
            <th class="text-right" style="width:100px">Gross</th>
            <th style="width:60px;text-align:center">Rate</th>
            <th class="text-right" style="width:100px">WHT</th>
          </tr>
        </thead>
        <tbody>${txnRows}</tbody>
      </table>
    `;

    printDocument({
      title: 'BIR Form 2307',
      subtitle: 'Certificate of Creditable Tax Withheld at Source',
      documentNumber: `2307-${vendor.vendor_code || vendor.vendor_id}-${period.quarter}${period.year}`,
      date: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
      content,
    });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={24} className="text-primary-600" /> BIR Form 2307
          </h1>
          <p className="text-sm text-gray-500">Certificate of Creditable Tax Withheld at Source</p>
        </div>
        <button onClick={handleExportExcel} className="btn-secondary text-xs self-start sm:self-auto">
          <Download size={14} /> Export All to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Quarter</label>
              <select className="input-field text-sm" value={quarter} onChange={e => setQuarter(e.target.value)}>
                {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Year</label>
              <select className="input-field text-sm" value={year} onChange={e => setYear(e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Search Vendor</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input-field text-sm pl-8 w-full"
                placeholder="Search by name, TIN, or code..."
                value={vendorSearch}
                onChange={e => setVendorSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-card !p-4">
          <p className="text-xs text-gray-500">Total Vendors</p>
          <p className="text-lg font-bold text-gray-900">{filtered.length}</p>
        </div>
        <div className="stat-card !p-4">
          <p className="text-xs text-gray-500">Total Gross Amount</p>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(totalGross)}</p>
        </div>
        <div className="stat-card !p-4 border-2 border-blue-200">
          <p className="text-xs text-gray-500">Total Tax Withheld</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totalWHT)}</p>
        </div>
      </div>

      {/* Vendor List */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No withholding tax records found</p>
          <p className="text-sm text-gray-400 mt-1">No bills with withholding tax for {quarter} {year}</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Vendors with Withholding Tax - {quarter} {year}</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payee / Vendor</th>
                  <th className="hidden sm:table-cell">TIN</th>
                  <th className="text-right">Gross Amount</th>
                  <th className="text-right">Tax Withheld</th>
                  <th className="text-right hidden sm:table-cell">Transactions</th>
                  <th className="text-center" style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(vendor => (
                  <tr key={vendor.vendor_id}>
                    <td>
                      <button
                        className="text-left hover:text-primary-600 transition-colors"
                        onClick={() => setExpandedVendor(expandedVendor === vendor.vendor_id ? null : vendor.vendor_id)}
                      >
                        <div className="font-medium text-sm">{vendor.vendor_name}</div>
                        <div className="text-[11px] text-gray-400">{vendor.vendor_code}</div>
                      </button>
                    </td>
                    <td className="text-xs text-gray-500 font-mono hidden sm:table-cell">{vendor.tin || 'N/A'}</td>
                    <td className="text-right font-medium">{formatCurrency(vendor.total_gross)}</td>
                    <td className="text-right font-medium text-red-600">{formatCurrency(vendor.total_wht)}</td>
                    <td className="text-right text-gray-500 hidden sm:table-cell">{vendor.transactions.length}</td>
                    <td className="text-center">
                      <button
                        onClick={() => generate2307(vendor)}
                        className="btn-primary text-[10px] py-1 px-2.5 inline-flex items-center gap-1"
                      >
                        <Printer size={11} /> Generate 2307
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3">TOTAL ({filtered.length} vendors)</td>
                  <td className="hidden sm:table-cell"></td>
                  <td className="text-right px-4 py-3">{formatCurrency(totalGross)}</td>
                  <td className="text-right px-4 py-3 text-red-600">{formatCurrency(totalWHT)}</td>
                  <td className="hidden sm:table-cell"></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Expanded Transaction Detail */}
      {expandedVendor && (() => {
        const vendor = filtered.find(v => v.vendor_id === expandedVendor);
        if (!vendor) return null;
        return (
          <div className="card border-primary-200">
            <div className="card-header bg-primary-50 flex items-center justify-between">
              <h3 className="font-semibold text-primary-800">
                Transaction Details - {vendor.vendor_name}
              </h3>
              <button className="btn-secondary text-xs" onClick={() => setExpandedVendor(null)}>
                Close
              </button>
            </div>
            <div className="table-container">
              <table className="data-table text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th className="hidden sm:table-cell">Description</th>
                    <th className="text-right">Gross</th>
                    <th className="text-center">Rate</th>
                    <th className="text-center hidden sm:table-cell">ATC</th>
                    <th className="text-right">WHT</th>
                  </tr>
                </thead>
                <tbody>
                  {vendor.transactions.map((t, i) => (
                    <tr key={i}>
                      <td className="text-gray-600">{formatDate(t.date)}</td>
                      <td className="font-mono text-xs">{t.reference}</td>
                      <td className="hidden sm:table-cell text-gray-600 max-w-[200px] truncate">{t.description}</td>
                      <td className="text-right">{formatCurrency(t.gross)}</td>
                      <td className="text-center">{t.tax_rate}%</td>
                      <td className="text-center font-mono text-xs hidden sm:table-cell">{getATCCode(t.tax_rate)}</td>
                      <td className="text-right font-medium text-red-600">{formatCurrency(t.wht)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary-50 font-bold">
                    <td colSpan={3} className="px-4 py-2">Total</td>
                    <td className="text-right px-4 py-2">{formatCurrency(vendor.total_gross)}</td>
                    <td></td>
                    <td className="hidden sm:table-cell"></td>
                    <td className="text-right px-4 py-2 text-red-600">{formatCurrency(vendor.total_wht)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
