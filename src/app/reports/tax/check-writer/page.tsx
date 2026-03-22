'use client';

import { useEffect, useState, useRef } from 'react';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';
import { FileCheck, Printer, DollarSign, Building2, Hash } from 'lucide-react';

interface Payment {
  id: number;
  voucher_number: string;
  payment_date: string;
  payee_name: string;
  gross_amount: number;
  net_amount?: number;
  withholding_tax?: number;
  check_number?: string | null;
  status: string;
  disbursement_description?: string;
  description?: string;
  payment_method: string;
  bank_account?: string;
  reference_number?: string;
}

interface CheckPrintRecord {
  id: number;
  voucher_number: string;
  payee: string;
  amount: number;
  check_number: string;
  bank: string;
  printed_at: string;
}

const BANKS = ['BDO', 'BPI', 'Metrobank', 'Landbank', 'PNB'];

function numberToWords(num: number): string {
  if (num === 0) return 'ZERO PESOS ONLY';

  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const convertGroup = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' ' + convertGroup(n % 100) : '');
  };

  const wholePart = Math.floor(Math.abs(num));
  const centavos = Math.round((Math.abs(num) - wholePart) * 100);

  let result = '';

  if (wholePart >= 1_000_000_000) {
    result += convertGroup(Math.floor(wholePart / 1_000_000_000)) + ' BILLION ';
    const remainder = wholePart % 1_000_000_000;
    if (remainder > 0) {
      if (remainder >= 1_000_000) {
        result += convertGroup(Math.floor(remainder / 1_000_000)) + ' MILLION ';
        const r2 = remainder % 1_000_000;
        if (r2 > 0) {
          if (r2 >= 1_000) {
            result += convertGroup(Math.floor(r2 / 1_000)) + ' THOUSAND ';
            const r3 = r2 % 1_000;
            if (r3 > 0) result += convertGroup(r3);
          } else {
            result += convertGroup(r2);
          }
        }
      } else if (remainder >= 1_000) {
        result += convertGroup(Math.floor(remainder / 1_000)) + ' THOUSAND ';
        const r2 = remainder % 1_000;
        if (r2 > 0) result += convertGroup(r2);
      } else {
        result += convertGroup(remainder);
      }
    }
  } else if (wholePart >= 1_000_000) {
    result += convertGroup(Math.floor(wholePart / 1_000_000)) + ' MILLION ';
    const remainder = wholePart % 1_000_000;
    if (remainder > 0) {
      if (remainder >= 1_000) {
        result += convertGroup(Math.floor(remainder / 1_000)) + ' THOUSAND ';
        const r2 = remainder % 1_000;
        if (r2 > 0) result += convertGroup(r2);
      } else {
        result += convertGroup(remainder);
      }
    }
  } else if (wholePart >= 1_000) {
    result += convertGroup(Math.floor(wholePart / 1_000)) + ' THOUSAND ';
    const remainder = wholePart % 1_000;
    if (remainder > 0) result += convertGroup(remainder);
  } else {
    result += convertGroup(wholePart);
  }

  result = result.trim() + ' PESOS';

  if (centavos > 0) {
    result += ' AND ' + convertGroup(centavos) + '/100';
  } else {
    result += ' ONLY';
  }

  return result;
}

function formatCheckDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

export default function CheckWriter() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedBank, setSelectedBank] = useState('BDO');
  const [checkNumber, setCheckNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [topMargin, setTopMargin] = useState(5);
  const [leftMargin, setLeftMargin] = useState(5);
  const [printHistory, setPrintHistory] = useState<CheckPrintRecord[]>([]);
  const checkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/payments?payment_method=check')
      .then(r => r.json())
      .then((data) => {
        setPayments(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, []);

  const openCheckPreview = (payment: Payment) => {
    setSelectedPayment(payment);
    setCheckNumber(payment.check_number ?? '');
    setShowModal(true);
  };

  const handlePrintCheck = () => {
    if (!selectedPayment) return;

    const record: CheckPrintRecord = {
      id: Date.now(),
      voucher_number: selectedPayment.voucher_number,
      payee: selectedPayment.payee_name || '',
      amount: selectedPayment.net_amount ?? selectedPayment.gross_amount ?? 0,
      check_number: checkNumber,
      bank: selectedBank,
      printed_at: new Date().toISOString(),
    };
    setPrintHistory(prev => [record, ...prev]);

    const printContent = checkRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=400');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Check</title>
        <style>
          @page {
            size: 8.5in 3.5in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: ${topMargin}mm ${leftMargin}mm;
            font-family: 'Courier New', monospace;
          }
          .check-container {
            width: 8in;
            height: 3in;
            border: 1px solid #999;
            padding: 12px 20px;
            position: relative;
            box-sizing: border-box;
          }
          .check-bank {
            font-size: 14px;
            font-weight: bold;
            color: #1a365d;
            margin-bottom: 8px;
          }
          .check-number {
            position: absolute;
            top: 12px;
            right: 20px;
            font-size: 12px;
            color: #666;
          }
          .check-date {
            text-align: right;
            font-size: 12px;
            margin-bottom: 10px;
          }
          .check-date span {
            border-bottom: 1px solid #333;
            padding: 0 8px;
          }
          .check-payee {
            font-size: 12px;
            margin-bottom: 8px;
          }
          .check-payee-label {
            font-size: 9px;
            color: #666;
          }
          .check-payee-name {
            border-bottom: 1px solid #333;
            font-weight: bold;
            font-size: 13px;
            padding: 0 4px;
            display: inline-block;
            min-width: 400px;
          }
          .check-amount-box {
            position: absolute;
            top: 68px;
            right: 20px;
            border: 2px solid #333;
            padding: 4px 10px;
            font-weight: bold;
            font-size: 14px;
            min-width: 120px;
            text-align: right;
          }
          .check-words {
            font-size: 11px;
            margin: 8px 0;
            border-bottom: 1px solid #333;
            padding-bottom: 4px;
            min-height: 16px;
            line-height: 1.4;
          }
          .check-words-label {
            font-size: 9px;
            color: #666;
          }
          .check-memo {
            font-size: 10px;
            margin-top: 16px;
          }
          .check-memo-label {
            font-size: 9px;
            color: #666;
          }
          .check-memo-value {
            border-bottom: 1px solid #333;
            display: inline-block;
            min-width: 300px;
            padding: 0 4px;
          }
          .check-account {
            position: absolute;
            bottom: 12px;
            left: 20px;
            font-size: 10px;
            color: #888;
            letter-spacing: 1px;
          }
          .check-signature-line {
            position: absolute;
            bottom: 20px;
            right: 20px;
            border-top: 1px solid #333;
            width: 180px;
            text-align: center;
            font-size: 9px;
            color: #666;
            padding-top: 2px;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const maskedAccount = accountNumber
    ? '****' + accountNumber.slice(-4)
    : '****0000';

  const pendingChecks = payments.filter(p =>
    p.payment_method === 'check' && ['pending', 'approved', 'pending_approval'].includes(p.status)
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck size={24} /> Check Writer
          </h1>
          <p className="text-sm text-gray-500">Print checks on pre-formatted Philippine bank check paper</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-card !p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg"><Hash size={16} className="text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Check Payments</p>
              <p className="text-lg font-bold text-gray-900">{payments.length}</p>
            </div>
          </div>
        </div>
        <div className="stat-card !p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg"><FileCheck size={16} className="text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Pending Checks</p>
              <p className="text-lg font-bold text-amber-600">{pendingChecks.length}</p>
            </div>
          </div>
        </div>
        <div className="stat-card !p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg"><DollarSign size={16} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Amount</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(payments.reduce((s, p) => s + (p.net_amount ?? p.gross_amount ?? 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 size={16} /> Check Payments
          </h3>
          <span className="badge bg-blue-100 text-blue-700 text-xs">{payments.length} payments</span>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <table className="data-table text-xs sm:text-sm">
              <thead>
                <tr>
                  <th>Voucher #</th>
                  <th>Date</th>
                  <th>Payee</th>
                  <th className="text-right">Amount</th>
                  <th>Check #</th>
                  <th>Status</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No check payments found.
                    </td>
                  </tr>
                ) : (
                  payments.map(payment => (
                    <tr key={payment.id}>
                      <td className="font-mono text-xs">{payment.voucher_number}</td>
                      <td className="whitespace-nowrap">{payment.payment_date}</td>
                      <td className="font-medium">{payment.payee_name || ''}</td>
                      <td className="text-right font-mono">{formatCurrency(payment.net_amount ?? payment.gross_amount ?? 0)}</td>
                      <td className="font-mono text-xs">{payment.check_number ?? '-'}</td>
                      <td>
                        <span className={`badge text-xs ${getStatusColor(payment.status)}`}>
                          {getStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn-primary text-xs py-1 px-3 inline-flex items-center gap-1"
                          onClick={() => openCheckPreview(payment)}
                        >
                          <Printer size={12} /> Write Check
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Print History */}
      {printHistory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2">
              <Printer size={16} /> Check Print History
            </h3>
          </div>
          <div className="table-container">
            <table className="data-table text-xs sm:text-sm">
              <thead>
                <tr>
                  <th>Voucher #</th>
                  <th>Payee</th>
                  <th className="text-right">Amount</th>
                  <th>Check #</th>
                  <th>Bank</th>
                  <th>Printed At</th>
                </tr>
              </thead>
              <tbody>
                {printHistory.map(record => (
                  <tr key={record.id}>
                    <td className="font-mono text-xs">{record.voucher_number}</td>
                    <td className="font-medium">{record.payee}</td>
                    <td className="text-right font-mono">{formatCurrency(record.amount)}</td>
                    <td className="font-mono text-xs">{record.check_number}</td>
                    <td>{record.bank}</td>
                    <td className="whitespace-nowrap text-xs text-gray-500">
                      {new Date(record.printed_at).toLocaleString('en-PH')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Check Preview Modal */}
      {showModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileCheck size={20} /> Check Preview
              </h2>
              <button
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Check Configuration */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bank</label>
                  <select
                    className="select-field w-full"
                    value={selectedBank}
                    onChange={e => setSelectedBank(e.target.value)}
                  >
                    {BANKS.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Check Number</label>
                  <input
                    type="text"
                    className="select-field w-full"
                    placeholder="e.g., 0001234"
                    value={checkNumber}
                    onChange={e => setCheckNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
                  <input
                    type="text"
                    className="select-field w-full"
                    placeholder="Enter account number"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                  />
                </div>
                <div className="text-xs text-gray-500 flex items-end pb-2">
                  Masked: {maskedAccount}
                </div>
              </div>

              {/* Alignment Controls */}
              <div className="flex gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Top Margin (mm)</label>
                  <input
                    type="number"
                    className="select-field w-24"
                    value={topMargin}
                    onChange={e => setTopMargin(Number(e.target.value))}
                    min={0}
                    max={50}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Left Margin (mm)</label>
                  <input
                    type="number"
                    className="select-field w-24"
                    value={leftMargin}
                    onChange={e => setLeftMargin(Number(e.target.value))}
                    min={0}
                    max={50}
                  />
                </div>
                <p className="text-xs text-gray-400 pb-2">Adjust margins for printer alignment on pre-formatted checks.</p>
              </div>

              {/* Check Preview */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 overflow-x-auto">
                <div ref={checkRef}>
                  <div className="check-container" style={{
                    width: '8in',
                    height: '3in',
                    border: '1px solid #bbb',
                    padding: '12px 20px',
                    position: 'relative',
                    fontFamily: "'Courier New', monospace",
                    backgroundColor: '#fffff8',
                    boxSizing: 'border-box',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}>
                    {/* Bank Name */}
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a365d', marginBottom: '8px' }}>
                      {selectedBank}
                    </div>

                    {/* Check Number */}
                    <div style={{ position: 'absolute', top: '12px', right: '20px', fontSize: '12px', color: '#666' }}>
                      No. {checkNumber || '________'}
                    </div>

                    {/* Date */}
                    <div style={{ textAlign: 'right', fontSize: '12px', marginBottom: '10px' }}>
                      Date: <span style={{ borderBottom: '1px solid #333', padding: '0 8px' }}>
                        {formatCheckDate(selectedPayment.payment_date)}
                      </span>
                    </div>

                    {/* Pay To */}
                    <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '9px', color: '#666' }}>PAY TO THE ORDER OF </span>
                      <span style={{
                        borderBottom: '1px solid #333',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        padding: '0 4px',
                        display: 'inline-block',
                        minWidth: '400px',
                      }}>
                        {selectedPayment.payee_name || ''}
                      </span>
                    </div>

                    {/* Amount Box */}
                    <div style={{
                      position: 'absolute',
                      top: '68px',
                      right: '20px',
                      border: '2px solid #333',
                      padding: '4px 10px',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      minWidth: '120px',
                      textAlign: 'right',
                    }}>
                      {formatCurrency(selectedPayment.net_amount ?? selectedPayment.gross_amount ?? 0)}
                    </div>

                    {/* Amount in Words */}
                    <div style={{ fontSize: '9px', color: '#666' }}>AMOUNT IN WORDS:</div>
                    <div style={{
                      fontSize: '11px',
                      borderBottom: '1px solid #333',
                      paddingBottom: '4px',
                      minHeight: '16px',
                      lineHeight: '1.4',
                      marginBottom: '4px',
                      maxWidth: '70%',
                    }}>
                      {numberToWords(selectedPayment.net_amount ?? selectedPayment.gross_amount ?? 0)}
                    </div>

                    {/* Memo */}
                    <div style={{ fontSize: '10px', marginTop: '16px' }}>
                      <span style={{ fontSize: '9px', color: '#666' }}>MEMO/FOR: </span>
                      <span style={{
                        borderBottom: '1px solid #333',
                        display: 'inline-block',
                        minWidth: '300px',
                        padding: '0 4px',
                      }}>
                        {selectedPayment.disbursement_description || selectedPayment.description || selectedPayment.voucher_number}
                      </span>
                    </div>

                    {/* Account Number */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '20px',
                      fontSize: '10px',
                      color: '#888',
                      letterSpacing: '1px',
                    }}>
                      {maskedAccount}
                    </div>

                    {/* Signature Line */}
                    <div style={{
                      position: 'absolute',
                      bottom: '20px',
                      right: '20px',
                      borderTop: '1px solid #333',
                      width: '180px',
                      textAlign: 'center',
                      fontSize: '9px',
                      color: '#666',
                      paddingTop: '2px',
                    }}>
                      Authorized Signature
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary text-sm flex items-center gap-1.5"
                  onClick={handlePrintCheck}
                >
                  <Printer size={14} /> Print Check
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
