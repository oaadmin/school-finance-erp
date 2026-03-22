'use client';

import { Download, Filter, Printer } from 'lucide-react';

interface ReportFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onExport?: (format: string) => void;
  children?: React.ReactNode;
}

export default function ReportFilters({ dateFrom, dateTo, onDateFromChange, onDateToChange, onExport, children }: ReportFiltersProps) {
  return (
    <div className="card p-3 sm:p-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">From</label>
            <input type="date" className="input-field text-sm" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">To</label>
            <input type="date" className="input-field text-sm" value={dateTo} onChange={e => onDateToChange(e.target.value)} />
          </div>
        </div>
        {children}
        <div className="flex gap-2 ml-auto">
          <button onClick={() => onExport?.('excel')} className="btn-secondary text-xs"><Download size={14} /> Excel</button>
          <button onClick={() => onExport?.('pdf')} className="btn-secondary text-xs"><Download size={14} /> PDF</button>
          <button onClick={() => window.print()} className="btn-secondary text-xs hidden sm:flex"><Printer size={14} /> Print</button>
        </div>
      </div>
    </div>
  );
}
