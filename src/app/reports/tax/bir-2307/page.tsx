'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import { FileText, Printer, Download, Users, Building2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Payment {
  date: string;
  reference: string;
  description: string;
  gross_amount: number;
  withholding_tax: number;
  atc: string;
}

interface Vendor {
  vendor_id: number;
  vendor_name: string;
  tin: string;
  address: string;
  total_gross: number;
  total_tax: number;
  payments: Payment[];
}

interface PayorInfo {
  name: string;
  tin: string;
  address: string;
}

interface TaxReportData {
  vendors: Vendor[];
  payorInfo: PayorInfo;
  quarter: string;
  year: number;
}

interface PayeeOption {
  id: number;
  name: string;
  tin: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Jan - Mar)', months: ['January', 'February', 'March'], from: '01-01', to: '03-31' },
  { value: 'Q2', label: 'Q2 (Apr - Jun)', months: ['April', 'May', 'June'], from: '04-01', to: '06-30' },
  { value: 'Q3', label: 'Q3 (Jul - Sep)', months: ['July', 'August', 'September'], from: '07-01', to: '09-30' },
  { value: 'Q4', label: 'Q4 (Oct - Dec)', months: ['October', 'November', 'December'], from: '10-01', to: '12-31' },
] as const;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BIR2307Page() {
  // Filters
  const [selectedVendorId, setSelectedVendorId] = useState<number | ''>('');
  const [quarter, setQuarter] = useState(QUARTERS[Math.floor(new Date().getMonth() / 3)].value);
  const [year, setYear] = useState(currentYear);

  // Data
  const [payees, setPayees] = useState<PayeeOption[]>([]);
  const [reportData, setReportData] = useState<TaxReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPayees, setLoadingPayees] = useState(true);

  const formRef = useRef<HTMLDivElement>(null);

  // Fetch payee list on mount
  useEffect(() => {
    setLoadingPayees(true);
    fetch('/api/payees')
      .then((r) => r.json())
      .then((data: unknown) => {
        const list = Array.isArray(data) ? data : [];
        setPayees(
          list.map((p: { id?: number; name?: string; tin?: string }) => ({
            id: Number(p.id || 0),
            name: String(p.name || ''),
            tin: String(p.tin || ''),
          }))
        );
      })
      .catch(() => setPayees([]))
      .finally(() => setLoadingPayees(false));
  }, []);

  // Fetch report data when filters change
  const fetchReport = useCallback(() => {
    if (!selectedVendorId) {
      setReportData(null);
      return;
    }

    const q = QUARTERS.find((qr) => qr.value === quarter)!;
    const dateFrom = `${year}-${q.from}`;
    const dateTo = `${year}-${q.to}`;

    setLoading(true);
    const params = new URLSearchParams({
      type: 'bir-2307',
      vendor_id: String(selectedVendorId),
      quarter,
      date_from: dateFrom,
      date_to: dateTo,
    });

    fetch(`/api/reports/tax?${params}`)
      .then((r) => r.json())
      .then((data: TaxReportData) => setReportData(data))
      .catch(() => setReportData(null))
      .finally(() => setLoading(false));
  }, [selectedVendorId, quarter, year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Derive the selected vendor from reportData
  const selectedVendor =
    reportData?.vendors?.find((v) => v.vendor_id === selectedVendorId) ?? null;
  const payorInfo: PayorInfo = reportData?.payorInfo ?? {
    name: 'OrangeApps Academy',
    tin: '123-456-789-000',
    address: 'Metro Manila, Philippines',
  };

  // Compute monthly breakdown for the form
  const quarterInfo = QUARTERS.find((q) => q.value === quarter)!;

  const monthlyData = quarterInfo.months.map((monthName, idx) => {
    if (!selectedVendor)
      return { month: monthName, atc: '', nature: '', amount: 0, tax: 0 };

    const monthNum = QUARTERS.findIndex((q) => q.value === quarter) * 3 + idx + 1;
    const monthPayments = selectedVendor.payments.filter((p) => {
      const d = new Date(p.date);
      return d.getMonth() + 1 === monthNum && d.getFullYear() === year;
    });

    const amount = monthPayments.reduce((s, p) => s + p.gross_amount, 0);
    const tax = monthPayments.reduce((s, p) => s + p.withholding_tax, 0);
    const atc = monthPayments[0]?.atc ?? '';
    const nature = monthPayments[0]?.description ?? '';

    return { month: monthName, atc, nature, amount, tax };
  });

  const totalAmount = monthlyData.reduce((s, r) => s + r.amount, 0);
  const totalTax = monthlyData.reduce((s, r) => s + r.tax, 0);

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel
  const handleExport = () => {
    if (!selectedVendor) return;

    const rows: Record<string, string | number>[] = monthlyData.map((m) => ({
      Month: m.month as string,
      ATC: m.atc,
      'Nature of Income Payment': m.nature,
      'Amount of Income Payment': m.amount,
      'Tax Withheld': m.tax,
    }));

    rows.push({
      Month: 'TOTAL',
      ATC: '',
      'Nature of Income Payment': '',
      'Amount of Income Payment': totalAmount,
      'Tax Withheld': totalTax,
    });

    const vendorName = selectedVendor.vendor_name.replace(/[^a-zA-Z0-9 ]/g, '');
    exportToExcel(
      rows,
      `BIR-2307_${vendorName}_${quarter}_${year}`,
      `BIR 2307 - ${selectedVendor.vendor_name} - ${quarter} ${year}`
    );
  };

  // All-vendor summary from reportData (for the quick-select list)
  const allVendors = reportData?.vendors ?? [];

  return (
    <>
      {/* Print-only styles: hide everything except the BIR form */}
      <style jsx global>{`
        @media print {
          /* Hide sidebar, header, nav, filters, and everything marked no-print */
          body > *:not(#__next),
          nav,
          header,
          aside,
          footer,
          .no-print {
            display: none !important;
          }
          /* Walk down Next.js wrappers to reach our print root */
          #__next > * {
            display: none !important;
          }
          #__next {
            display: block !important;
          }
          /* The print root itself must be visible */
          #bir-2307-print-root,
          #bir-2307-print-root * {
            visibility: visible !important;
          }
          #bir-2307-print-root {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* ---------------------------------------------------------------- */}
        {/* Page Header                                                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText size={24} className="text-primary-600" />
              BIR Form 2307 Generator
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Generate Certificate of Creditable Tax Withheld at Source
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-xs sm:text-sm"
              onClick={handleExport}
              disabled={!selectedVendor}
            >
              <Download size={16} /> Export to Excel
            </button>
            <button
              className="btn-primary text-xs sm:text-sm"
              onClick={handlePrint}
              disabled={!selectedVendor}
            >
              <Printer size={16} /> Print 2307
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Filters                                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="card no-print">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={18} /> Report Filters
            </h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Vendor */}
              <div>
                <label className="label">Vendor / Payee</label>
                <select
                  className="select-field w-full"
                  value={selectedVendorId}
                  onChange={(e) =>
                    setSelectedVendorId(e.target.value ? Number(e.target.value) : '')
                  }
                  disabled={loadingPayees}
                >
                  <option value="">-- Select Vendor --</option>
                  {payees.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.tin ? ` (${p.tin})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quarter */}
              <div>
                <label className="label">Quarter</label>
                <select
                  className="select-field w-full"
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4')}
                >
                  {QUARTERS.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="label">Year</label>
                <select
                  className="select-field w-full"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Stat Cards                                                       */}
        {/* ---------------------------------------------------------------- */}
        {selectedVendor && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
            <div className="stat-card">
              <div className="text-sm text-gray-500">Total Gross Payments</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalAmount)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {quarter} {year}
              </div>
            </div>
            <div className="stat-card">
              <div className="text-sm text-gray-500">Total Tax Withheld</div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalTax)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {quarter} {year}
              </div>
            </div>
            <div className="stat-card">
              <div className="text-sm text-gray-500">Effective Tax Rate</div>
              <div className="text-2xl font-bold text-gray-900">
                {totalAmount > 0
                  ? ((totalTax / totalAmount) * 100).toFixed(2)
                  : '0.00'}
                %
              </div>
              <div className="text-xs text-gray-400 mt-1">Withholding rate</div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card no-print">
            <div className="card-body text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" />
              <p className="text-gray-400">Loading report data...</p>
            </div>
          </div>
        )}

        {/* Empty states */}
        {!loading && !selectedVendor && selectedVendorId !== '' && (
          <div className="card no-print">
            <div className="card-body text-center py-12 text-gray-400">
              No withholding tax data found for the selected vendor in {quarter}{' '}
              {year}.
            </div>
          </div>
        )}

        {!loading && selectedVendorId === '' && (
          <div className="card no-print">
            <div className="card-body text-center py-12 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 text-gray-300" />
              Select a vendor above to generate BIR Form 2307, or pick one from
              the vendor list below.
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* BIR Form 2307 -- Printable Section                               */}
        {/* ================================================================ */}
        {selectedVendor && !loading && (
          <div id="bir-2307-print-root" ref={formRef}>
            <div
              className="bg-white border border-gray-300 rounded-lg mx-auto"
              style={{ maxWidth: 850, fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
              {/* Form Title */}
              <div className="border-b-2 border-black p-5 text-center">
                <p className="text-[10px] text-gray-500 mb-0.5">
                  Republic of the Philippines
                </p>
                <p className="text-[10px] text-gray-500 mb-1">
                  Department of Finance
                </p>
                <p className="text-xs font-bold text-gray-700 mb-3">
                  BUREAU OF INTERNAL REVENUE
                </p>
                <h2 className="text-lg font-bold tracking-wide">
                  BIR FORM 2307
                </h2>
                <p className="text-sm font-semibold mt-1">
                  Certificate of Creditable Tax Withheld at Source
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  For the {quarter} Quarter, Calendar Year {year}
                </p>
              </div>

              {/* Part I -- Payee Information */}
              <div className="border-b border-gray-300 p-4">
                <h3 className="text-xs font-bold bg-gray-100 px-3 py-1.5 -mx-4 -mt-4 mb-4 border-b border-gray-300 uppercase tracking-wider">
                  Part I &mdash; Payee Information
                </h3>
                <div className="grid grid-cols-12 gap-y-3 text-sm">
                  <div className="col-span-3 text-gray-500 text-xs pt-0.5">
                    1. TIN
                  </div>
                  <div className="col-span-9 font-medium border-b border-dotted border-gray-400 pb-1 font-mono">
                    {selectedVendor.tin || '---'}
                  </div>

                  <div className="col-span-3 text-gray-500 text-xs pt-0.5">
                    2. Payee Name
                  </div>
                  <div className="col-span-9 font-medium border-b border-dotted border-gray-400 pb-1">
                    {selectedVendor.vendor_name}
                  </div>

                  <div className="col-span-3 text-gray-500 text-xs pt-0.5">
                    3. Registered Address
                  </div>
                  <div className="col-span-9 font-medium border-b border-dotted border-gray-400 pb-1">
                    {selectedVendor.address || '---'}
                  </div>
                </div>
              </div>

              {/* Part II -- Payor Information */}
              <div className="border-b border-gray-300 p-4">
                <h3 className="text-xs font-bold bg-gray-100 px-3 py-1.5 -mx-4 -mt-4 mb-4 border-b border-gray-300 uppercase tracking-wider">
                  Part II &mdash; Payor Information
                </h3>
                <div className="grid grid-cols-12 gap-y-3 text-sm">
                  <div className="col-span-3 text-gray-500 text-xs pt-0.5">
                    4. TIN
                  </div>
                  <div className="col-span-9 font-medium border-b border-dotted border-gray-400 pb-1 font-mono">
                    {payorInfo.tin}
                  </div>

                  <div className="col-span-3 text-gray-500 text-xs pt-0.5">
                    5. Payor Name
                  </div>
                  <div className="col-span-9 font-medium border-b border-dotted border-gray-400 pb-1">
                    {payorInfo.name}
                  </div>

                  <div className="col-span-3 text-gray-500 text-xs pt-0.5">
                    6. Registered Address
                  </div>
                  <div className="col-span-9 font-medium border-b border-dotted border-gray-400 pb-1">
                    {payorInfo.address}
                  </div>
                </div>
              </div>

              {/* Part III -- Details of Monthly Income Payments */}
              <div className="p-4">
                <h3 className="text-xs font-bold bg-gray-100 px-3 py-1.5 -mx-4 -mt-4 mb-4 border-b border-gray-300 uppercase tracking-wider">
                  Part III &mdash; Details of Monthly Income Payments and Taxes
                  Withheld
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700">
                          Month
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700">
                          ATC
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700">
                          Nature of Income Payment
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-700">
                          Amount of Income Payment
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-700">
                          Tax Withheld
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((row) => (
                        <tr key={row.month}>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            {row.month}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-xs font-mono">
                            {row.atc || '\u2014'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-xs">
                            {row.nature || '\u2014'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            {formatCurrency(row.tax)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td
                          colSpan={3}
                          className="border border-gray-300 px-3 py-2 text-right text-xs uppercase tracking-wider"
                        >
                          Total
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right">
                          {formatCurrency(totalAmount)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-right">
                          {formatCurrency(totalTax)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signature block */}
                <div className="grid grid-cols-2 gap-8 mt-10 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="border-b border-black mb-1 h-10" />
                    <p className="text-xs text-gray-500">
                      Signature of Payor / Authorized Representative
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{payorInfo.name}</p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-black mb-1 h-10" />
                    <p className="text-xs text-gray-500">Date Signed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* Vendor Tax Withholding Summary List                              */}
        {/* ================================================================ */}
        <div className="card no-print">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} /> Vendor Tax Withholding Summary
            </h2>
            {allVendors.length > 0 && (
              <span className="badge bg-blue-100 text-blue-700">
                {allVendors.length} vendor{allVendors.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="card-body p-0">
            {allVendors.length === 0 && !loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                {selectedVendorId
                  ? 'No vendor data available for this period.'
                  : 'Select a vendor and period above to view the summary.'}
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>TIN</th>
                      <th className="text-right">Total Gross</th>
                      <th className="text-right">Total Tax Withheld</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allVendors.map((v) => (
                      <tr
                        key={v.vendor_id}
                        className={
                          v.vendor_id === selectedVendorId ? 'bg-blue-50' : ''
                        }
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-blue-500" />
                            <span className="font-medium">{v.vendor_name}</span>
                          </div>
                        </td>
                        <td className="text-xs font-mono">
                          {v.tin || '\u2014'}
                        </td>
                        <td className="text-right font-medium">
                          {formatCurrency(v.total_gross)}
                        </td>
                        <td className="text-right font-medium text-red-600">
                          {formatCurrency(v.total_tax)}
                        </td>
                        <td className="text-center">
                          <button
                            className="btn-secondary text-xs inline-flex items-center gap-1"
                            onClick={() => setSelectedVendorId(v.vendor_id)}
                          >
                            <FileText size={14} /> Generate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
