'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Lock, Unlock, AlertTriangle, CheckCircle, Clock, Calendar, X } from 'lucide-react';

interface Period { id: number; period_name: string; school_year: string; start_date: string; end_date: string; status: string; closed_by: string; closed_date: string; notes: string; }

export default function PeriodClosing() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [actionModal, setActionModal] = useState<{ period: Period; action: string } | null>(null);

  const loadData = () => {
    fetch('/api/accounting/periods').then(r => r.json()).then(setPeriods);
  };
  useEffect(loadData, []);

  const handleAction = async () => {
    if (!actionModal) return;
    await fetch('/api/accounting/periods', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: actionModal.period.id, action: actionModal.action }),
    });
    setActionModal(null);
    loadData();
  };

  const openPeriods = periods.filter(p => p.status === 'open');
  const closedPeriods = periods.filter(p => p.status === 'closed');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Period Closing</h1>
          <p className="text-sm text-gray-500">Manage accounting periods and month-end closing</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="stat-card !p-4"><div className="flex items-center gap-2"><Calendar size={16} className="text-blue-500" /><p className="text-xs text-gray-500">Total Periods</p></div><p className="text-lg font-bold">{periods.length}</p></div>
        <div className="stat-card !p-4"><div className="flex items-center gap-2"><Unlock size={16} className="text-green-500" /><p className="text-xs text-gray-500">Open</p></div><p className="text-lg font-bold text-green-600">{openPeriods.length}</p></div>
        <div className="stat-card !p-4"><div className="flex items-center gap-2"><Lock size={16} className="text-gray-500" /><p className="text-xs text-gray-500">Closed</p></div><p className="text-lg font-bold text-gray-600">{closedPeriods.length}</p></div>
      </div>

      {/* Closing Checklist */}
      <div className="card">
        <div className="card-header bg-amber-50"><h3 className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle size={16} /> Pre-Closing Checklist</h3></div>
        <div className="card-body space-y-2">
          {[
            { label: 'All journal entries are posted', status: true },
            { label: 'No draft bills pending approval', status: true },
            { label: 'No unreconciled collections', status: true },
            { label: 'Bank reconciliation completed', status: false },
            { label: 'Depreciation entries posted', status: true },
            { label: 'Accrual entries posted', status: true },
            { label: 'Trial balance is balanced', status: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              {item.status ? <CheckCircle size={16} className="text-green-500" /> : <Clock size={16} className="text-amber-500" />}
              <span className={`text-sm ${item.status ? 'text-gray-600' : 'text-amber-700 font-medium'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Open Periods */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Unlock size={16} className="text-green-500" /> Open Periods</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Period</th><th>School Year</th><th className="hidden sm:table-cell">Start Date</th><th className="hidden sm:table-cell">End Date</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {openPeriods.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.period_name}</td>
                  <td>{p.school_year}</td>
                  <td className="hidden sm:table-cell">{formatDate(p.start_date)}</td>
                  <td className="hidden sm:table-cell">{formatDate(p.end_date)}</td>
                  <td><span className="badge bg-green-100 text-green-700">Open</span></td>
                  <td><button className="btn-warning text-xs py-1" onClick={() => setActionModal({ period: p, action: 'close' })}><Lock size={12} /> Close</button></td>
                </tr>
              ))}
              {openPeriods.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-gray-500">No open periods</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closed Periods */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Lock size={16} className="text-gray-500" /> Closed Periods</h3></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Period</th><th>School Year</th><th className="hidden sm:table-cell">Start Date</th><th className="hidden sm:table-cell">End Date</th><th>Status</th><th className="hidden sm:table-cell">Closed Date</th><th>Action</th></tr></thead>
            <tbody>
              {closedPeriods.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.period_name}</td>
                  <td>{p.school_year}</td>
                  <td className="hidden sm:table-cell">{formatDate(p.start_date)}</td>
                  <td className="hidden sm:table-cell">{formatDate(p.end_date)}</td>
                  <td><span className="badge bg-gray-100 text-gray-600">Closed</span></td>
                  <td className="text-gray-500 text-xs hidden sm:table-cell">{p.closed_date ? formatDate(p.closed_date) : '—'}</td>
                  <td><button className="btn-secondary text-xs py-1" onClick={() => setActionModal({ period: p, action: 'reopen' })}><Unlock size={12} /> Reopen</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">{actionModal.action === 'close' ? 'Close' : 'Reopen'} Period</h2>
              <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to <strong>{actionModal.action}</strong> the period <strong>{actionModal.period.period_name}</strong>?
              </p>
              {actionModal.action === 'close' && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <AlertTriangle size={14} className="inline mr-1" />
                  Closing a period will prevent any new postings to dates within this period.
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
              <button className={actionModal.action === 'close' ? 'btn-warning' : 'btn-primary'} onClick={handleAction}>
                {actionModal.action === 'close' ? <><Lock size={14} /> Close Period</> : <><Unlock size={14} /> Reopen Period</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
