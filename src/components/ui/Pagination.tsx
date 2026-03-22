'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalItems, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const rangeStart = Math.max(2, currentPage - 1);
      const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{start}</span>-<span className="font-medium">{end}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft size={16} />
        </button>
        {getPageNumbers().map((page, i) =>
          typeof page === 'string' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">...</span>
          ) : (
            <button
              key={page}
              className={`min-w-[32px] h-8 rounded-md text-sm font-medium ${
                page === currentPage
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        )}
        <button
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
