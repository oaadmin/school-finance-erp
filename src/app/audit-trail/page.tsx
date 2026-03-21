'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Shield, Filter, Search, Clock, FileText, CreditCard, PiggyBank } from 'lucide-react';

interface AuditLog {
  id: number; entity_type: string; entity_id: number; action: string;
  old_values: string; new_values: string; performed_by: string;
  ip_address: string; created_at: string;
}

const entityIcons: Record<string, typeof FileText> = {
  disbursement: FileText, payment: CreditCard, budget: PiggyBank,
};

const actionColors: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-purple-100 text-purple-700',
  updated: 'bg-amber-100 text-amber-700',
  voided: 'bg-red-100 text-red-700',
};

export default function AuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (entityFilter) params.set('entity_type', entityFilter);
    fetch(`/api/audit?${params}`).then(r => r.json()).then(setLogs);
  }, [entityFilter]);

  const filtered = search
    ? logs.filter(l => l.performed_by?.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.entity_type.toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-1">Complete history of system actions and changes</p>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search by user or action..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Filter size={14} className="text-gray-400" />
          <select className="select-field w-40" value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="disbursement">Disbursements</option>
            <option value="payment">Payments</option>
            <option value="budget">Budgets</option>
          </select>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {filtered.map(log => {
              const Icon = entityIcons[log.entity_type] || Shield;
              let details = '';
              try {
                const newVals = log.new_values ? JSON.parse(log.new_values) : {};
                const oldVals = log.old_values ? JSON.parse(log.old_values) : {};
                const changes: string[] = [];
                for (const key of Object.keys(newVals)) {
                  if (oldVals[key] !== undefined) {
                    changes.push(`${key}: ${oldVals[key]} → ${newVals[key]}`);
                  } else {
                    changes.push(`${key}: ${newVals[key]}`);
                  }
                }
                details = changes.join(', ');
              } catch { details = ''; }

              return (
                <div key={log.id} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={18} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{log.performed_by || 'System'}</span>
                      <span className={`badge ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>{log.action}</span>
                      <span className="text-sm text-gray-600 capitalize">{log.entity_type}</span>
                      {log.entity_id && <span className="text-xs text-gray-400">#{log.entity_id}</span>}
                    </div>
                    {details && <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-50 rounded px-2 py-1">{details}</p>}
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Clock size={12} /> {formatDate(log.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Shield size={32} className="mx-auto text-gray-300 mb-2" />
                <p>No audit records found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
