'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, Printer, Download, Users, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  id: number;
  customer_code: string;
  name: string;
  campus: string;
  email: string;
  phone: string;
  grade_level: string;
}

interface SOATransaction {
  id: number;
  date: string;
  reference: string;
  description: string;
  charges: number;
  payments: number;
  running_balance: number;
}

interface SOAData {
  customer: Customer;
  transactions: SOATransaction[];
  total_charges: number;
  total_payments: number;
  outstanding_balance: number;
}

export default function StatementOfAccountPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [soaData, setSOAData] = useState<SOAData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/accounting/ar?type=customers').then(r => r.json()).then(setCustomers);
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
      setSOAData(null);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ type: 'soa', customer_id: selectedCustomerId });
    if (asOfDate) params.set('as_of_date', asOfDate);
    fetch(`/api/accounting/ar?${params}`)
      .then(r => r.json())
      .then(setSOAData)
      .finally(() => setLoading(false));
  }, [selectedCustomerId, asOfDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!soaData || !soaData.transactions.length) return;
    const headers = ['Date', 'Reference', 'Description', 'Charges', 'Payments', 'Balance'];
    const rows = soaData.transactions.map(t => [
      t.date, t.reference, t.description,
      t.charges || '', t.payments || '', t.running_balance,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOA_${soaData.customer?.customer_code || 'customer'}_${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Statement of Account</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and view customer statements</p>
        </div>
        {soaData && (
          <div className="flex gap-2">
            <button className="btn-secondary text-xs sm:text-sm" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
            <button className="btn-secondary text-xs sm:text-sm" onClick={handleExportCSV}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-1.5">
              <Users size={14} className="text-gray-400" /> Customer
            </label>
            <select className="select-field" value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}>
              <option value="">Select customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.customer_code} - {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-400" /> As of Date
            </label>
            <input className="input-field" type="date" value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card p-8 text-center text-gray-500">Loading statement...</div>
      )}

      {/* No customer selected */}
      {!selectedCustomerId && !loading && (
        <div className="card p-8 sm:p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Select a customer to generate their statement of account.</p>
        </div>
      )}

      {/* SOA Content */}
      {soaData && !loading && (
        <>
          {/* Customer Info Card */}
          <div className="card p-4 sm:p-6 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Customer Name</p>
                <p className="font-semibold text-gray-900">{soaData.customer?.name || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Customer Code</p>
                <p className="font-semibold text-gray-900">{soaData.customer?.customer_code || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Campus</p>
                <p className="font-semibold text-gray-900">{soaData.customer?.campus || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-semibold text-gray-900">{soaData.customer?.email || '\u2014'}</p>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <FileText size={16} className="text-gray-500" />
              <h3 className="font-semibold text-gray-900">Transactions</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th className="hidden sm:table-cell">Description</th>
                    <th className="text-right">Charges</th>
                    <th className="text-right">Payments</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {soaData.transactions?.map(t => (
                    <tr key={t.id}>
                      <td className="text-gray-500 text-xs sm:text-sm">{formatDate(t.date)}</td>
                      <td className="font-medium text-xs sm:text-sm text-primary-600">{t.reference}</td>
                      <td className="hidden sm:table-cell text-gray-500 text-xs sm:text-sm max-w-[200px] truncate">{t.description}</td>
                      <td className="text-right text-xs sm:text-sm">
                        {t.charges > 0 ? formatCurrency(t.charges) : '\u2014'}
                      </td>
                      <td className="text-right text-xs sm:text-sm text-green-600">
                        {t.payments > 0 ? `(${formatCurrency(t.payments)})` : '\u2014'}
                      </td>
                      <td className={`text-right font-medium text-xs sm:text-sm ${t.running_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(t.running_balance)}
                      </td>
                    </tr>
                  ))}
                  {(!soaData.transactions || soaData.transactions.length === 0) && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No transactions found for this customer</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Account Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total Charges</span>
                <span className="font-medium">{formatCurrency(soaData.total_charges || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total Payments</span>
                <span className="font-medium text-green-600">({formatCurrency(soaData.total_payments || 0)})</span>
              </div>
              <hr />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Outstanding Balance</span>
                <span className={soaData.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(soaData.outstanding_balance || 0)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
