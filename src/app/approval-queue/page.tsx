'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { CheckSquare, CheckCircle, XCircle, RotateCcw, AlertTriangle, Eye } from 'lucide-react';
import Link from 'next/link';

interface PendingItem {
  id: number; request_number: string; request_date: string; due_date: string;
  amount: number; description: string; department_name: string; category_name: string;
  payee_name: string; requested_by_name: string; current_approver_role: string;
  budget_name: string; budget_total: number; budget_committed: number; budget_actual: number; budget_remaining: number;
}

const roleLabels: Record<string, string> = {
  department_head: 'Department Head', finance_staff: 'Finance Staff',
  finance_manager: 'Finance Manager', treasury: 'Treasury',
};

export default function ApprovalQueue() {
  const { success, error } = useToast();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [actionModal, setActionModal] = useState<{ id: number; action: string } | null>(null);
  const [comments, setComments] = useState('');

  const loadData = () => {
    fetch('/api/approvals').then(r => r.json()).then(setItems);
  };

  useEffect(loadData, []);

  const handleAction = async () => {
    if (!actionModal) return;
    const item = items.find(i => i.id === actionModal.id);
    try {
      const res = await fetch(`/api/disbursements/${actionModal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionModal.action,
          comments,
          approver_role: item?.current_approver_role,
          approver_id: 3,
        }),
      });
      if (res.ok) {
        const actionLabel = actionModal.action === 'approved' ? 'Approved' : actionModal.action === 'rejected' ? 'Rejected' : 'Returned';
        success(`Request ${actionLabel}`, `${item?.request_number || 'Request'} has been ${actionLabel.toLowerCase()}.`);
      } else {
        const err = await res.json().catch(() => ({}));
        error('Action Failed', err.message || err.error || 'Could not process approval action.');
      }
    } catch (e) {
      error('Action Failed', 'Network error. Please try again.');
    }
    setActionModal(null);
    setComments('');
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Approval Queue</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} requests pending approval</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">All Caught Up!</h3>
          <p className="text-sm text-gray-500 mt-1">No pending approval requests at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="card hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/disbursements/${item.id}`} className="text-base sm:text-lg font-semibold text-primary-600 hover:underline">
                        {item.request_number}
                      </Link>
                      <span className="badge bg-amber-100 text-amber-700 text-[10px] sm:text-xs">Pending: {roleLabels[item.current_approver_role]}</span>
                      {item.budget_remaining !== null && item.amount > item.budget_remaining && (
                        <span className="badge bg-red-100 text-red-700 text-[10px] sm:text-xs flex items-center gap-1">
                          <AlertTriangle size={12} /> Over Budget
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <span>Dept: <strong>{item.department_name}</strong></span>
                      <span>Payee: <strong>{item.payee_name || '—'}</strong></span>
                      <span>By: <strong>{item.requested_by_name}</strong></span>
                      <span>{formatDate(item.request_date)}</span>
                    </div>
                    {item.budget_name && (
                      <div className="mt-2 bg-gray-50 rounded-lg p-2 sm:p-3 text-xs hidden sm:block">
                        <span className="font-medium text-gray-700">{item.budget_name}</span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-gray-500">
                          <span>Budget: {formatCurrency(item.budget_total)}</span>
                          <span>Committed: {formatCurrency(item.budget_committed)}</span>
                          <span>Actual: {formatCurrency(item.budget_actual)}</span>
                          <span className={item.budget_remaining < 0 ? 'text-red-600 font-medium' : ''}>
                            Remaining: {formatCurrency(item.budget_remaining)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:ml-4">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(item.amount)}</p>
                    <div className="flex gap-1.5 sm:gap-2">
                      <Link href={`/disbursements/${item.id}`} className="btn-secondary text-xs py-1.5 px-2 sm:px-3">
                        <Eye size={14} /> <span className="hidden sm:inline">View</span>
                      </Link>
                      <button className="btn-success text-xs py-1.5 px-2 sm:px-3" onClick={() => setActionModal({ id: item.id, action: 'approved' })}>
                        <CheckCircle size={14} /> <span className="hidden sm:inline">Approve</span>
                      </button>
                      <button className="btn-warning text-xs py-1.5 px-2" onClick={() => setActionModal({ id: item.id, action: 'returned' })}>
                        <RotateCcw size={14} />
                      </button>
                      <button className="btn-danger text-xs py-1.5 px-2" onClick={() => setActionModal({ id: item.id, action: 'rejected' })}>
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold capitalize">
                {actionModal.action === 'approved' ? 'Approve' : actionModal.action === 'rejected' ? 'Reject' : 'Return'} Request
              </h2>
            </div>
            <div className="p-6">
              <label className="label">Comments</label>
              <textarea className="input-field" rows={4} value={comments} onChange={e => setComments(e.target.value)} />
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => { setActionModal(null); setComments(''); }}>Cancel</button>
              <button className={actionModal.action === 'approved' ? 'btn-success' : actionModal.action === 'rejected' ? 'btn-danger' : 'btn-warning'}
                onClick={handleAction}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
