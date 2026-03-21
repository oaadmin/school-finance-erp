'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, getStatusColor, getStatusLabel, formatDate } from '@/lib/utils';
import { FileText, Filter, Download, Plus, Search } from 'lucide-react';
import Link from 'next/link';

interface Disbursement {
  id: number; request_number: string; request_date: string; due_date: string;
  amount: number; status: string; description: string; department_name: string;
  category_name: string; payee_name: string; requested_by_name: string; payment_method: string;
}

export default function DisbursementList() {
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/disbursements?${params}`).then(r => r.json()).then(setDisbursements);
  }, [statusFilter]);

  const filtered = search
    ? disbursements.filter(d =>
        d.request_number.toLowerCase().includes(search.toLowerCase()) ||
        d.description?.toLowerCase().includes(search.toLowerCase()) ||
        d.payee_name?.toLowerCase().includes(search.toLowerCase())
      )
    : disbursements;

  const totalAmount = filtered.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Disbursement Requests</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} requests &middot; Total: {formatCurrency(totalAmount)}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs sm:text-sm"><Download size={16} /> <span className="hidden sm:inline">Export</span></button>
          <Link href="/disbursements/create" className="btn-primary text-xs sm:text-sm"><Plus size={16} /> New Request</Link>
        </div>
      </div>

      <div className="card">
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search requests..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select className="select-field flex-1 sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request #</th><th className="hidden sm:table-cell">Date</th><th className="hidden md:table-cell">Payee</th><th className="hidden lg:table-cell">Description</th>
                <th className="hidden lg:table-cell">Department</th><th className="hidden xl:table-cell">Category</th><th className="text-right">Amount</th>
                <th className="hidden xl:table-cell">Method</th><th>Status</th><th className="hidden md:table-cell">Requested By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/disbursements/${d.id}`} className="text-primary-600 hover:underline font-medium flex items-center gap-1 text-xs sm:text-sm">
                      <FileText size={14} className="hidden sm:block" /> {d.request_number}
                    </Link>
                  </td>
                  <td className="text-gray-500 hidden sm:table-cell">{formatDate(d.request_date)}</td>
                  <td className="font-medium hidden md:table-cell">{d.payee_name || '—'}</td>
                  <td className="max-w-[200px] truncate hidden lg:table-cell">{d.description}</td>
                  <td className="hidden lg:table-cell">{d.department_name}</td>
                  <td className="hidden xl:table-cell">{d.category_name}</td>
                  <td className="text-right font-medium text-xs sm:text-sm">{formatCurrency(d.amount)}</td>
                  <td className="capitalize text-xs hidden xl:table-cell">{d.payment_method?.replace('_', ' ')}</td>
                  <td><span className={`badge ${getStatusColor(d.status)} text-[10px] sm:text-xs`}>{getStatusLabel(d.status)}</span></td>
                  <td className="text-gray-500 hidden md:table-cell">{d.requested_by_name}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">No disbursement requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
