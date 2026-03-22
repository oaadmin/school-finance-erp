'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import ReportFilters from '@/components/reports/ReportFilters';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface CashFlowData {
  operating: { cash_from_revenue: number; cash_for_expenses: number; depreciation: number; net: number };
  investing: { equipment_purchases: number; net: number };
  financing: { loan_payments: number; net: number };
  netCashFlow: number;
}

export default function CashFlowStatement() {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [dateFrom, setDateFrom] = useState('2025-06-01');
  const [dateTo, setDateTo] = useState('2026-02-28');

  useEffect(() => {
    fetch(`/api/reports/accounting?type=cash-flow&date_from=${dateFrom}&date_to=${dateTo}`)
      .then(r => r.json()).then(setData);
  }, [dateFrom, dateTo]);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const FlowSection = ({ title, items, net, color, icon: Icon }: { title: string; items: { label: string; amount: number }[]; net: number; color: string; icon: typeof ArrowUpRight }) => (
    <div className="card">
      <div className={`card-header ${color}`}>
        <div className="flex items-center gap-2">
          <Icon size={16} />
          <h3 className="font-semibold">{title}</h3>
        </div>
      </div>
      <div className="card-body space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm py-1">
            <span className="text-gray-600">{item.label}</span>
            <span className={`font-medium ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {item.amount >= 0 ? '' : '('}{formatCurrency(Math.abs(item.amount))}{item.amount < 0 ? ')' : ''}
            </span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>Net Cash from {title.split(' ')[0]}</span>
          <span className={net >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(net)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cash Flow Statement</h1>
        <p className="text-sm text-gray-500">Cash inflows and outflows by activity</p>
      </div>

      <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card !p-4"><p className="text-xs text-gray-500">Operating</p><p className={`text-lg font-bold ${data.operating.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.operating.net)}</p></div>
        <div className="stat-card !p-4"><p className="text-xs text-gray-500">Investing</p><p className={`text-lg font-bold ${data.investing.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.investing.net)}</p></div>
        <div className="stat-card !p-4"><p className="text-xs text-gray-500">Financing</p><p className={`text-lg font-bold ${data.financing.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.financing.net)}</p></div>
        <div className="stat-card !p-4 border-2 border-blue-200"><p className="text-xs text-gray-500">Net Cash Flow</p><p className={`text-lg font-bold ${data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.netCashFlow)}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <FlowSection title="Operating Activities" color="bg-green-50" icon={ArrowUpRight}
          items={[
            { label: 'Cash received from operations', amount: data.operating.cash_from_revenue },
            { label: 'Cash paid for expenses', amount: -data.operating.cash_for_expenses },
            { label: 'Add back: Depreciation', amount: data.operating.depreciation },
          ]} net={data.operating.net} />

        <FlowSection title="Investing Activities" color="bg-blue-50" icon={Minus}
          items={[
            { label: 'Purchase of equipment', amount: data.investing.net },
          ]} net={data.investing.net} />

        <FlowSection title="Financing Activities" color="bg-purple-50" icon={ArrowDownRight}
          items={[
            { label: 'Loan payments', amount: data.financing.net },
          ]} net={data.financing.net} />
      </div>
    </div>
  );
}
