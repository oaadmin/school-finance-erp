'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency, getStatusColor, getStatusLabel, formatDate } from '@/lib/utils';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Send, CreditCard, FileText, Clock, User, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface DisbursementDetail {
  id: number; request_number: string; request_date: string; due_date: string;
  amount: number; status: string; description: string; department_name: string;
  category_name: string; cost_center_name: string; fund_source_name: string;
  payee_name: string; payee_type: string; payee_tin: string; payee_bank: string; payee_bank_account: string;
  requested_by_name: string; requested_by_email: string; payment_method: string;
  currency: string; project: string; current_approver_role: string;
  budget_name: string; budget_total: number; budget_committed: number; budget_actual: number; budget_remaining: number;
  items: Array<{ id: number; description: string; quantity: number; unit_cost: number; amount: number; account_code: string; tax_code: string; remarks: string }>;
  approvals: Array<{ id: number; approver_name: string; approver_role: string; action: string; comments: string; acted_at: string }>;
  payments: Array<{ id: number; voucher_number: string; payment_date: string; payment_method: string; gross_amount: number; withholding_tax: number; net_amount: number; status: string; check_number: string; reference_number: string }>;
  attachments: Array<{ id: number; file_name: string; file_type: string; uploaded_at: string }>;
}

export default function DisbursementDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<DisbursementDetail | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<string | null>(null);
  const [comments, setComments] = useState('');

  const loadData = () => {
    fetch(`/api/disbursements/${id}`).then(r => r.json()).then(setData);
  };

  useEffect(loadData, [id]);

  const handleApprovalAction = async (action: string) => {
    await fetch(`/api/disbursements/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comments, approver_role: data?.current_approver_role, approver_id: 3 }),
    });
    setShowApprovalModal(null);
    setComments('');
    loadData();
  };

  const handleSubmit = async () => {
    await fetch(`/api/disbursements/${id}/submit`, { method: 'POST' });
    loadData();
  };

  if (!data) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const approvalSteps = ['department_head', 'finance_staff', 'finance_manager', 'treasury'];
  const approvalLabels: Record<string, string> = { department_head: 'Department Head', finance_staff: 'Finance Staff', finance_manager: 'Finance Manager', treasury: 'Treasury' };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{data.request_number}</h1>
              <span className={`badge text-xs sm:text-sm ${getStatusColor(data.status)}`}>{getStatusLabel(data.status)}</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">{data.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.status === 'draft' && (
            <button className="btn-primary text-xs sm:text-sm" onClick={handleSubmit}><Send size={16} /> Submit</button>
          )}
          {data.status === 'pending_approval' && (
            <>
              <button className="btn-success text-xs sm:text-sm" onClick={() => setShowApprovalModal('approved')}><CheckCircle size={16} /> Approve</button>
              <button className="btn-warning text-xs sm:text-sm" onClick={() => setShowApprovalModal('returned')}><RotateCcw size={16} /> Return</button>
              <button className="btn-danger text-xs sm:text-sm" onClick={() => setShowApprovalModal('rejected')}><XCircle size={16} /> Reject</button>
            </>
          )}
          {data.status === 'approved' && (
            <Link href={`/payment-processing?disbursement_id=${data.id}`} className="btn-primary text-xs sm:text-sm"><CreditCard size={16} /> Process Payment</Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900">Request Information</h3></div>
            <div className="card-body grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Request Date</span><p className="font-medium">{formatDate(data.request_date)}</p></div>
              <div><span className="text-gray-500">Due Date</span><p className="font-medium">{data.due_date ? formatDate(data.due_date) : '—'}</p></div>
              <div><span className="text-gray-500">Department</span><p className="font-medium">{data.department_name}</p></div>
              <div><span className="text-gray-500">Category</span><p className="font-medium">{data.category_name}</p></div>
              <div><span className="text-gray-500">Cost Center</span><p className="font-medium">{data.cost_center_name || '—'}</p></div>
              <div><span className="text-gray-500">Fund Source</span><p className="font-medium">{data.fund_source_name || '—'}</p></div>
              <div><span className="text-gray-500">Payment Method</span><p className="font-medium capitalize">{data.payment_method?.replace('_', ' ')}</p></div>
              <div><span className="text-gray-500">Project</span><p className="font-medium">{data.project || '—'}</p></div>
              <div><span className="text-gray-500">Requested By</span><p className="font-medium">{data.requested_by_name}</p></div>
              <div><span className="text-gray-500">Total Amount</span><p className="text-xl font-bold text-primary-600">{formatCurrency(data.amount)}</p></div>
            </div>
          </div>

          {/* Payee */}
          {data.payee_name && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Payee Information</h3></div>
              <div className="card-body grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Name</span><p className="font-medium">{data.payee_name}</p></div>
                <div><span className="text-gray-500">Type</span><p className="font-medium capitalize">{data.payee_type}</p></div>
                <div><span className="text-gray-500">TIN</span><p className="font-medium">{data.payee_tin || '—'}</p></div>
                <div><span className="text-gray-500">Bank</span><p className="font-medium">{data.payee_bank || '—'} {data.payee_bank_account || ''}</p></div>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900">Line Items</h3></div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Description</th><th className="text-right">Qty</th><th className="text-right">Unit Cost</th><th className="text-right">Amount</th><th>Account</th><th>Tax</th></tr>
                </thead>
                <tbody>
                  {data.items.map((item, i) => (
                    <tr key={item.id}>
                      <td>{i + 1}</td>
                      <td className="font-medium">{item.description}{item.remarks && <p className="text-xs text-gray-400">{item.remarks}</p>}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.unit_cost)}</td>
                      <td className="text-right font-medium">{formatCurrency(item.amount)}</td>
                      <td>{item.account_code}</td>
                      <td>{item.tax_code}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="text-right font-semibold px-4 py-3">Total:</td>
                    <td className="text-right font-bold text-lg px-4 py-3">{formatCurrency(data.amount)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payments */}
          {data.payments.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900">Payment Records</h3></div>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Voucher #</th><th>Date</th><th>Method</th><th className="text-right">Gross</th><th className="text-right">Tax</th><th className="text-right">Net Paid</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.payments.map(p => (
                      <tr key={p.id}>
                        <td className="font-medium">{p.voucher_number}</td>
                        <td>{formatDate(p.payment_date)}</td>
                        <td className="capitalize">{p.payment_method?.replace('_', ' ')}</td>
                        <td className="text-right">{formatCurrency(p.gross_amount)}</td>
                        <td className="text-right">{formatCurrency(p.withholding_tax)}</td>
                        <td className="text-right font-medium">{formatCurrency(p.net_amount)}</td>
                        <td><span className={`badge ${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Budget Info */}
          {data.budget_name && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-900 text-sm">Budget Information</h3></div>
              <div className="card-body space-y-3">
                <p className="text-sm font-medium">{data.budget_name}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Budget</span><span className="font-medium">{formatCurrency(data.budget_total)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Committed</span><span className="text-amber-600">{formatCurrency(data.budget_committed)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Actual</span><span>{formatCurrency(data.budget_actual)}</span></div>
                  <hr />
                  <div className="flex justify-between"><span className="text-gray-500">Remaining</span><span className={`font-bold ${data.budget_remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(data.budget_remaining)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500">This Request</span><span className="font-bold">{formatCurrency(data.amount)}</span></div>
                  {data.amount > data.budget_remaining && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2 text-xs text-red-700">
                      <AlertTriangle size={14} /> Exceeds available budget
                    </div>
                  )}
                </div>
                <div className="progress-bar h-2">
                  <div className="progress-bar-fill bg-blue-500" style={{ width: `${Math.min((data.budget_actual / data.budget_total) * 100, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-500">{((data.budget_actual / data.budget_total) * 100).toFixed(1)}% utilized</p>
              </div>
            </div>
          )}

          {/* Approval Timeline */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900 text-sm">Approval Workflow</h3></div>
            <div className="card-body">
              <div className="space-y-4">
                {approvalSteps.map((step, i) => {
                  const approval = data.approvals.find(a => a.approver_role === step);
                  const isCurrent = data.current_approver_role === step;
                  const isPast = approval?.action === 'approved';

                  return (
                    <div key={step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isPast ? 'bg-green-100 text-green-600' :
                          isCurrent ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-300' :
                          approval?.action === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {isPast ? <CheckCircle size={16} /> :
                           approval?.action === 'rejected' ? <XCircle size={16} /> :
                           isCurrent ? <Clock size={16} /> :
                           <User size={16} />}
                        </div>
                        {i < approvalSteps.length - 1 && (
                          <div className={`w-0.5 h-8 mt-1 ${isPast ? 'bg-green-300' : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className={`text-sm font-medium ${isCurrent ? 'text-blue-600' : ''}`}>{approvalLabels[step]}</p>
                        {approval && (
                          <>
                            <p className="text-xs text-gray-500">{approval.approver_name} &middot; {formatDate(approval.acted_at)}</p>
                            {approval.comments && <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded p-2">{approval.comments}</p>}
                          </>
                        )}
                        {isCurrent && !approval && <p className="text-xs text-blue-500">Awaiting action</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-900 text-sm">Attachments</h3></div>
            <div className="card-body">
              {data.attachments.length > 0 ? (
                <div className="space-y-2">
                  {data.attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-50">
                      <FileText size={14} className="text-gray-400" />
                      <span>{a.file_name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No attachments</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold capitalize">{showApprovalModal === 'approved' ? 'Approve' : showApprovalModal === 'rejected' ? 'Reject' : 'Return'} Request</h2>
            </div>
            <div className="p-6">
              <label className="label">Comments</label>
              <textarea className="input-field" rows={4} value={comments} onChange={e => setComments(e.target.value)}
                placeholder={`Add ${showApprovalModal === 'approved' ? 'optional' : 'required'} comments...`} />
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowApprovalModal(null)}>Cancel</button>
              <button className={showApprovalModal === 'approved' ? 'btn-success' : showApprovalModal === 'rejected' ? 'btn-danger' : 'btn-warning'}
                onClick={() => handleApprovalAction(showApprovalModal)}>
                Confirm {showApprovalModal === 'approved' ? 'Approval' : showApprovalModal === 'rejected' ? 'Rejection' : 'Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
