'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { RefreshCw, Play, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface RecurringTemplate {
  id: number;
  template_name: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  is_active: number;
  auto_create: number;
  description: string;
}

const seedTemplates: RecurringTemplate[] = [
  {
    id: 1,
    template_name: 'Monthly Depreciation',
    frequency: 'monthly',
    start_date: '2025-07-01',
    end_date: '2026-06-30',
    is_active: 1,
    auto_create: 1,
    description: 'Automatic monthly depreciation of fixed assets',
  },
  {
    id: 2,
    template_name: 'Monthly Prepaid Insurance Amortization',
    frequency: 'monthly',
    start_date: '2025-07-01',
    end_date: '2026-06-30',
    is_active: 1,
    auto_create: 1,
    description: 'Amortize prepaid insurance monthly',
  },
  {
    id: 3,
    template_name: 'Quarterly Accrued Interest',
    frequency: 'quarterly',
    start_date: '2025-09-30',
    end_date: '2026-06-30',
    is_active: 1,
    auto_create: 0,
    description: 'Accrue interest on long-term loans quarterly',
  },
  {
    id: 4,
    template_name: 'Monthly Salary Accrual',
    frequency: 'monthly',
    start_date: '2025-07-01',
    end_date: null,
    is_active: 1,
    auto_create: 1,
    description: 'Accrue monthly salaries and wages',
  },
];

export default function RecurringJournals() {
  const toastCtx = useToast();
  const [templates] = useState<RecurringTemplate[]>(seedTemplates);

  const handleGenerate = (template: RecurringTemplate) => {
    toastCtx.info(
      `Generate entries for "${template.template_name}"`,
      'This will create journal entries based on the template configuration. This feature will be connected to the API in a future update.'
    );
  };

  const frequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annually: 'Annually',
      weekly: 'Weekly',
    };
    return labels[freq] || freq;
  };

  const frequencyColor = (freq: string) => {
    const colors: Record<string, string> = {
      monthly: 'bg-blue-100 text-blue-700',
      quarterly: 'bg-purple-100 text-purple-700',
      annually: 'bg-green-100 text-green-700',
      weekly: 'bg-amber-100 text-amber-700',
    };
    return colors[freq] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Recurring Journal Templates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage templates for automated journal entry creation
          </p>
        </div>
        <Link
          href="/accounting/journal-entries"
          className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5"
        >
          <RefreshCw size={14} />
          View Journal Entries
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="stat-card !p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Templates</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">
                {templates.length}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-blue-600 sm:hidden" />
              <Calendar size={20} className="text-blue-600 hidden sm:block" />
            </div>
          </div>
        </div>
        <div className="stat-card !p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Active</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600 mt-1">
                {templates.filter((t) => t.is_active).length}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Play size={16} className="text-green-600 sm:hidden" />
              <Play size={20} className="text-green-600 hidden sm:block" />
            </div>
          </div>
        </div>
        <div className="stat-card !p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Auto-Create</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600 mt-1">
                {templates.filter((t) => t.auto_create).length}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="text-purple-600 sm:hidden" />
              <Clock size={20} className="text-purple-600 hidden sm:block" />
            </div>
          </div>
        </div>
        <div className="stat-card !p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Monthly</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-1">
                {templates.filter((t) => t.frequency === 'monthly').length}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <RefreshCw size={16} className="text-blue-600 sm:hidden" />
              <RefreshCw size={20} className="text-blue-600 hidden sm:block" />
            </div>
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Templates</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Frequency</th>
                <th className="hidden sm:table-cell">Start Date</th>
                <th className="hidden sm:table-cell">End Date</th>
                <th>Status</th>
                <th className="hidden sm:table-cell">Auto-Create</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div>
                      <p className="font-medium text-sm">{t.template_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                        {t.description}
                      </p>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${frequencyColor(t.frequency)} text-[10px] sm:text-xs`}
                    >
                      {frequencyLabel(t.frequency)}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell text-sm">
                    {formatDate(t.start_date)}
                  </td>
                  <td className="hidden sm:table-cell text-sm">
                    {t.end_date ? formatDate(t.end_date) : 'No End Date'}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        t.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      } text-[10px] sm:text-xs`}
                    >
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span
                      className={`badge ${
                        t.auto_create
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      } text-[10px] sm:text-xs`}
                    >
                      {t.auto_create ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                      onClick={() => handleGenerate(t)}
                    >
                      <Play size={12} />
                      Generate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
