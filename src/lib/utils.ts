import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, symbol = '₱'): string {
  if (amount == null || isNaN(amount)) return `${symbol}0.00`;
  return `${symbol}${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export function generateRequestNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `DR-${year}-${seq}`;
}

export function generateVoucherNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `PV-${year}-${seq}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    returned: 'bg-orange-100 text-orange-700',
    voided: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    paid: 'Paid',
    rejected: 'Rejected',
    returned: 'Returned',
    voided: 'Voided',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

export function getVarianceStatus(variance: number): { label: string; color: string } {
  if (variance > 0) return { label: 'Under Budget', color: 'text-green-600' };
  if (variance < 0) return { label: 'Over Budget', color: 'text-red-600' };
  return { label: 'On Budget', color: 'text-gray-600' };
}
