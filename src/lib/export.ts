'use client';

import { toast } from '@/lib/toast';

/**
 * Export utility functions for generating Excel-compatible CSV files,
 * printable PDF reports, and triggering browser print.
 */

/**
 * Exports an array of objects to a tab-separated CSV file that Excel can open.
 * Includes UTF-8 BOM for proper encoding of currency symbols (e.g. ₱).
 *
 * @param data - Array of objects to export
 * @param filename - Filename without extension
 * @param sheetName - Optional sheet name (included as a header row for context)
 */
export function exportToExcel<T extends object>(
  data: T[],
  filename: string,
  sheetName?: string
): void {
  if (!data || data.length === 0) {
    console.warn('exportToExcel: No data to export.');
    return;
  }

  const headers = Object.keys(data[0] as object);

  const escapeField = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // If the field contains a tab, newline, or double quote, wrap in quotes
    if (str.includes('\t') || str.includes('\n') || str.includes('"')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const lines: string[] = [];

  // Add sheet name as a title row if provided
  if (sheetName) {
    lines.push(sheetName);
    lines.push(''); // blank line separator
  }

  // Header row
  lines.push(headers.map(escapeField).join('\t'));

  // Data rows
  for (const row of data) {
    const values = headers.map((h) => escapeField((row as Record<string, unknown>)[h]));
    lines.push(values.join('\t'));
  }

  const tsvContent = lines.join('\n');

  // UTF-8 BOM so Excel recognises encoding correctly
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + tsvContent], { type: 'text/csv;charset=utf-8;' });

  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Opens a new window with a styled HTML table and triggers print,
 * allowing the user to print or save as PDF.
 *
 * @param title - Report title displayed at the top
 * @param headers - Array of column header strings
 * @param rows - 2D array of cell values (strings)
 * @param filename - Used as the document title (shows in PDF metadata)
 */
export function exportToPDF(
  title: string,
  headers: string[],
  rows: string[][],
  filename: string
): void {
  const headerCells = headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join('');

  const bodyRows = rows
    .map(
      (row) =>
        '<tr>' +
        row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('') +
        '</tr>'
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(filename)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      padding: 20px;
    }

    h1 {
      font-size: 16px;
      text-align: center;
      margin-bottom: 4px;
    }

    .meta {
      text-align: center;
      font-size: 10px;
      color: #555;
      margin-bottom: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    th, td {
      border: 1px solid #999;
      padding: 5px 8px;
      text-align: left;
    }

    th {
      background-color: #f0f0f0;
      font-weight: bold;
      font-size: 11px;
    }

    td {
      font-size: 10.5px;
    }

    /* Right-align columns that look numeric */
    td:nth-child(n+3) {
      text-align: right;
    }

    tr:nth-child(even) {
      background-color: #fafafa;
    }

    @media print {
      body {
        padding: 0;
      }

      tr:nth-child(even) {
        background-color: #fafafa !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      th {
        background-color: #f0f0f0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Generated on ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <table>
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>

  <script>
    window.onload = function () {
      window.print();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Unable to open print window. Please allow popups for this site.');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Triggers the browser's native print dialog for the current page.
 */
export function printReport(): void {
  window.print();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
