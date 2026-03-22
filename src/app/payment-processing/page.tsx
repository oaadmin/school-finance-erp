'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, getStatusColor, getStatusLabel, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { CreditCard, Plus, X, Printer, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface Payment {
  id: number; voucher_number: string; payment_date: string; payment_method: string;
  gross_amount: number; withholding_tax: number; net_amount: number; status: string;
  request_number: string; disbursement_description: string; department_name: string;
  payee_name: string; processed_by_name: string; bank_account: string; check_number: string; reference_number: string;
}

interface ApprovedDisbursement {
  id: number; request_number: string; description: string; amount: number;
  department_name: string; payee_name: string; payment_method: string;
}

export default function PaymentProcessing() {
  const { success, error } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [approved, setApproved] = useState<ApprovedDisbursement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDisb, setSelectedDisb] = useState<ApprovedDisbursement | null>(null);
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    bank_account: 'BDO-001', payment_method: 'bank_transfer',
    check_number: '', reference_number: '',
    gross_amount: 0, withholding_tax: 0, net_amount: 0, notes: '',
  });

  const loadData = () => {
    fetch('/api/payments').then(r => r.json()).then(setPayments);
    fetch('/api/disbursements?status=approved').then(r => r.json()).then(setApproved);
  };

  useEffect(loadData, []);

  const openPayment = (disb: ApprovedDisbursement) => {
    setSelectedDisb(disb);
    const wht = disb.amount * 0.02;
    setForm({
      ...form,
      payment_method: disb.payment_method || 'bank_transfer',
      gross_amount: disb.amount,
      withholding_tax: wht,
      net_amount: disb.amount - wht,
    });
    setShowModal(true);
  };

  const handleProcess = async () => {
    if (!selectedDisb) return;
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, disbursement_id: selectedDisb.id }),
      });
      if (res.ok) {
        const data = await res.json();
        success('Payment Processed', `Payment ${data.voucher_number || ''} for ${selectedDisb.request_number} has been processed.`);
        setShowModal(false);
        setSelectedDisb(null);
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        error('Payment Failed', err.message || err.error || 'Could not process payment. Please try again.');
      }
    } catch (e) {
      error('Payment Failed', 'Network error. Please try again.');
    }
  };

  const totalPaid = payments.reduce((s, p) => s + p.net_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Processing</h1>
          <p className="text-sm text-gray-500 mt-1">Process approved disbursements and manage payments</p>
        </div>
      </div>

      {/* Pending Payments */}
      {approved.length > 0 && (
        <div className="card border-blue-200">
          <div className="card-header bg-blue-50 border-blue-100">
            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
              <DollarSign size={16} /> Ready for Payment ({approved.length})
            </h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request #</th><th>Payee</th><th>Description</th><th>Department</th>
                  <th className="text-right">Amount</th><th>Method</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {approved.map(d => (
                  <tr key={d.id}>
                    <td><Link href={`/disbursements/${d.id}`} className="text-primary-600 hover:underline font-medium">{d.request_number}</Link></td>
                    <td className="font-medium">{d.payee_name || '—'}</td>
                    <td className="max-w-[200px] truncate">{d.description}</td>
                    <td>{d.department_name}</td>
                    <td className="text-right font-medium">{formatCurrency(d.amount)}</td>
                    <td className="capitalize text-xs">{d.payment_method?.replace('_', ' ')}</td>
                    <td>
                      <button className="btn-primary text-xs py-1.5" onClick={() => openPayment(d)}>
                        <CreditCard size={14} /> Process
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Payment History</h3>
          <span className="text-sm text-gray-500">Total Paid: {formatCurrency(totalPaid)}</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Voucher #</th><th>Date</th><th>Request #</th><th>Payee</th>
                <th className="text-right">Gross</th><th className="text-right">Tax</th>
                <th className="text-right">Net Paid</th><th>Method</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.voucher_number}</td>
                  <td>{formatDate(p.payment_date)}</td>
                  <td><Link href={`/disbursements/${p.id}`} className="text-primary-600 hover:underline">{p.request_number}</Link></td>
                  <td>{p.payee_name}</td>
                  <td className="text-right">{formatCurrency(p.gross_amount)}</td>
                  <td className="text-right">{formatCurrency(p.withholding_tax)}</td>
                  <td className="text-right font-medium">{formatCurrency(p.net_amount)}</td>
                  <td className="capitalize text-xs">{p.payment_method?.replace('_', ' ')}</td>
                  <td><span className={`badge ${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span></td>
                  <td><button className="text-gray-400 hover:text-gray-600"><Printer size={14} /></button></td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">No payment records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && selectedDisb && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Process Payment</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium">{selectedDisb.request_number} - {selectedDisb.payee_name}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedDisb.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Payment Date</label>
                  <input className="input-field" type="date" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">Bank Account</label>
                  <select className="select-field" value={form.bank_account} onChange={e => setForm({...form, bank_account: e.target.value})}>
                    <option value="BDO-001">BDO - Operating Account</option>
                    <option value="BPI-001">BPI - Savings Account</option>
                    <option value="METRO-001">Metrobank - Main</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payment Method</label>
                  <select className="select-field" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                {form.payment_method === 'check' && (
                  <div>
                    <label className="label">Check Number</label>
                    <input className="input-field" value={form.check_number} onChange={e => setForm({...form, check_number: e.target.value})} />
                  </div>
                )}
                <div>
                  <label className="label">Reference Number</label>
                  <input className="input-field" value={form.reference_number} onChange={e => setForm({...form, reference_number: e.target.value})} />
                </div>
              </div>
              <hr />
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Gross Amount</span>
                  <input className="input-field w-40 text-right" type="number" value={form.gross_amount}
                    onChange={e => { const g = parseFloat(e.target.value) || 0; setForm({...form, gross_amount: g, net_amount: g - form.withholding_tax}); }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span>Withholding Tax (2%)</span>
                  <input className="input-field w-40 text-right" type="number" value={form.withholding_tax}
                    onChange={e => { const t = parseFloat(e.target.value) || 0; setForm({...form, withholding_tax: t, net_amount: form.gross_amount - t}); }} />
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Amount to Pay</span>
                  <span className="text-green-600">{formatCurrency(form.net_amount)}</span>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleProcess}>
                <CreditCard size={16} /> Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
