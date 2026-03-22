'use client';

interface PrintOptions {
  title: string;
  subtitle?: string;
  schoolName?: string;
  schoolAddress?: string;
  documentNumber?: string;
  date?: string;
  content: string; // HTML content for the body
}

export function printDocument(opts: PrintOptions) {
  const schoolName = opts.schoolName || 'OrangeApps Academy';
  const schoolAddress = opts.schoolAddress || 'Metro Manila, Philippines';

  const win = window.open('', '_blank');
  if (!win) return;

  win.document.write(`<!DOCTYPE html><html><head><title>${opts.title}</title>
<style>
  @media print { @page { margin: 15mm; size: A4; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.5; }
  .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 18px; color: #1e3a5f; font-weight: 700; letter-spacing: 1px; }
  .header p { font-size: 10px; color: #666; }
  .doc-title { text-align: center; font-size: 14px; font-weight: 700; color: #1e3a5f; margin: 12px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .doc-meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 11px; }
  .doc-meta .label { color: #888; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
  .doc-meta .value { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { background: #f0f4f8; color: #1e3a5f; font-weight: 600; text-align: left; padding: 6px 8px; border-bottom: 2px solid #d0d7de; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e8ecf0; font-size: 11px; }
  tr:nth-child(even) td { background: #fafbfc; }
  .text-right { text-align: right; }
  .total-row td { font-weight: 700; border-top: 2px solid #1e3a5f; border-bottom: none; background: #f0f4f8 !important; }
  .amount { font-family: 'Courier New', monospace; text-align: right; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; }
  .sig-line { width: 200px; text-align: center; }
  .sig-line .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 10px; }
  .sig-line .role { font-size: 9px; color: #666; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(0,0,0,0.03); font-weight: 900; letter-spacing: 10px; z-index: -1; }
  .stamp { display: inline-block; padding: 2px 8px; border: 2px solid; border-radius: 4px; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .stamp.paid { color: #16a34a; border-color: #16a34a; }
  .stamp.voided { color: #dc2626; border-color: #dc2626; }
  .stamp.approved { color: #2563eb; border-color: #2563eb; }
</style></head><body>
<div class="header">
  <h1>${schoolName}</h1>
  <p>${schoolAddress}</p>
</div>
<div class="doc-title">${opts.title}</div>
${opts.subtitle ? `<p style="text-align:center;color:#666;font-size:10px;margin-bottom:12px">${opts.subtitle}</p>` : ''}
<div class="doc-meta">
  ${opts.documentNumber ? `<div><span class="label">Document No.</span><br/><span class="value">${opts.documentNumber}</span></div>` : ''}
  ${opts.date ? `<div><span class="label">Date</span><br/><span class="value">${opts.date}</span></div>` : ''}
</div>
${opts.content}
<div class="footer">
  <div class="sig-line"><div class="line">Prepared By</div><div class="role">Finance Staff</div></div>
  <div class="sig-line"><div class="line">Checked By</div><div class="role">Finance Manager</div></div>
  <div class="sig-line"><div class="line">Approved By</div><div class="role">School Administrator</div></div>
</div>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}
