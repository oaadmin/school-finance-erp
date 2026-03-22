'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, getStatusColor, getStatusLabel, formatDate } from '@/lib/utils';
import { CreditCard, DollarSign, Hash } from 'lucide-react';
import Link from 'next/link';

interface SupplierPayment {
  id: number;
  payment_number: string;
  payment_date: string;
  vendor_name: string;
  payment_method: string;
  gross_amount: number;
  withholding_tax: number;
  net_paid: number;
  status: string;
}

const paymentStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    paid: 'bg-emerald-100 text-emerald-700',
    voided: 'bg-red-100 text-red-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return colors[status] || getStatusColor(status);
};

export default function SupplierPayments() {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);

  useEffect(() => {
    fetch('/api/accounting/ap?type=payments').then(r => r.json()).then(setPayments);
  }, []);

  const totalPaid = payments.reduce((s, p) => s + (p.net_paid || 0), 0);
  const paymentsCount = payments.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Supplier Payments</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage payments to suppliers</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Hash size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Payments Count</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{paymentsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard size={16} /> Payment Records
          </h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment #</th>
                <th className="hidden sm:table-cell">Date</th>
                <th>Vendor</th>
                <th className="hidden md:table-cell">Method</th>
                <th className="text-right hidden sm:table-cell">Gross</th>
                <th className="text-right hidden md:table-cell">WHT</th>
                <th className="text-right">Net Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="font-medium text-xs sm:text-sm">{p.payment_number}</td>
                  <td className="text-gray-500 hidden sm:table-cell">{formatDate(p.payment_date)}</td>
                  <td className="font-medium text-xs sm:text-sm">{p.vendor_name || '\u2014'}</td>
                  <td className="capitalize text-xs hidden md:table-cell">{p.payment_method?.replace('_', ' ')}</td>
                  <td className="text-right hidden sm:table-cell">{formatCurrency(p.gross_amount)}</td>
                  <td className="text-right hidden md:table-cell">{formatCurrency(p.withholding_tax)}</td>
                  <td className="text-right font-medium text-xs sm:text-sm">{formatCurrency(p.net_paid)}</td>
                  <td>
                    <span className={`badge ${paymentStatusColor(p.status)} text-[10px] sm:text-xs`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No payment records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
