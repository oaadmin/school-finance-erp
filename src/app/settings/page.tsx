'use client';

import { useEffect, useState } from 'react';
import { Save, Settings as SettingsIcon, School, DollarSign, Shield, Bell } from 'lucide-react';

interface Setting { id: number; key: string; value: string; category: string; }

const settingLabels: Record<string, { label: string; description: string }> = {
  school_name: { label: 'School Name', description: 'Name of the educational institution' },
  school_year: { label: 'Current School Year', description: 'Active fiscal/school year' },
  currency: { label: 'Currency Code', description: 'ISO currency code (e.g., PHP, USD)' },
  currency_symbol: { label: 'Currency Symbol', description: 'Display symbol for currency' },
  budget_overspend_policy: { label: 'Over-Budget Policy', description: 'Action when request exceeds budget (warning/block)' },
  approval_threshold_dept_head: { label: 'Dept Head Threshold', description: 'Max amount for department head approval' },
  approval_threshold_finance_manager: { label: 'Finance Manager Threshold', description: 'Max amount for finance manager approval' },
  approval_threshold_treasury: { label: 'Treasury Threshold', description: 'Max amount for treasury approval' },
  withholding_tax_rate: { label: 'Withholding Tax Rate (%)', description: 'Default withholding tax percentage' },
  vat_rate: { label: 'VAT Rate (%)', description: 'Value Added Tax rate' },
  fiscal_year_start: { label: 'Fiscal Year Start Month', description: 'Month number when fiscal year begins' },
};

const categoryIcons: Record<string, typeof School> = {
  general: School, finance: DollarSign, budget: Shield, approval: Bell,
};

export default function SystemSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setSettings(d.settings));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updates = Object.entries(edits).map(([key, value]) => {
      const orig = settings.find(s => s.key === key);
      return { key, value, category: orig?.category || 'general' };
    });

    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: updates }),
    });

    setSaving(false);
    setSaved(true);
    setEdits({});
    setTimeout(() => setSaved(false), 3000);
    // Reload
    fetch('/api/settings').then(r => r.json()).then(d => setSettings(d.settings));
  };

  const getValue = (key: string) => edits[key] ?? settings.find(s => s.key === key)?.value ?? '';
  const hasEdits = Object.keys(edits).length > 0;

  const categories = [...new Set(settings.map(s => s.category))];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure system-wide financial settings</p>
        </div>
        {(hasEdits || saved) && (
          <button className={`${saved ? 'btn-success' : 'btn-primary'} text-xs sm:text-sm`} onClick={handleSave} disabled={saving || saved}>
            <Save size={16} /> {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {categories.map(cat => {
        const Icon = categoryIcons[cat] || SettingsIcon;
        const catSettings = settings.filter(s => s.category === cat);

        return (
          <div key={cat} className="card">
            <div className="card-header flex items-center gap-2">
              <Icon size={16} className="text-gray-500" />
              <h3 className="font-semibold text-gray-900 capitalize">{cat} Settings</h3>
            </div>
            <div className="card-body space-y-4">
              {catSettings.map(s => {
                const meta = settingLabels[s.key];
                return (
                  <div key={s.key} className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-gray-700">{meta?.label || s.key}</label>
                      {meta?.description && <p className="text-xs text-gray-400">{meta.description}</p>}
                    </div>
                    <div className="w-64">
                      {s.key === 'budget_overspend_policy' ? (
                        <select className="select-field" value={getValue(s.key)}
                          onChange={e => setEdits({...edits, [s.key]: e.target.value})}>
                          <option value="warning">Warning Only</option>
                          <option value="block">Block Submission</option>
                          <option value="override">Allow Finance Override</option>
                        </select>
                      ) : (
                        <input className="input-field" value={getValue(s.key)}
                          onChange={e => setEdits({...edits, [s.key]: e.target.value})} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Shield size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900">Roles & Permissions</h3>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Role</th><th>Description</th><th>Permissions</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Requestor</td>
                  <td>Can create and submit disbursement requests</td>
                  <td className="text-xs text-gray-500">Create, View Own, Submit</td>
                </tr>
                <tr>
                  <td className="font-medium">Department Head</td>
                  <td>Approves requests within their department</td>
                  <td className="text-xs text-gray-500">Approve L1, View Department</td>
                </tr>
                <tr>
                  <td className="font-medium">Finance Staff</td>
                  <td>Validates budget and processes verifications</td>
                  <td className="text-xs text-gray-500">Approve L2, View All, Budget Check</td>
                </tr>
                <tr>
                  <td className="font-medium">Finance Manager</td>
                  <td>Final financial approval authority</td>
                  <td className="text-xs text-gray-500">Approve L3, Budget Manage, Reports</td>
                </tr>
                <tr>
                  <td className="font-medium">Treasury</td>
                  <td>Processes payments and fund releases</td>
                  <td className="text-xs text-gray-500">Approve L4, Process Payment, Void</td>
                </tr>
                <tr>
                  <td className="font-medium">Administrator</td>
                  <td>Full system access and configuration</td>
                  <td className="text-xs text-gray-500">All Permissions</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
