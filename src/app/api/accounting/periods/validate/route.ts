import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const periodId = req.nextUrl.searchParams.get('period_id');

    if (!periodId) {
      return NextResponse.json({ error: 'period_id is required' }, { status: 400 });
    }

    const period = db.prepare('SELECT * FROM accounting_periods WHERE id = ?').get(periodId) as any;
    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    const periodStart = period.start_date;
    const periodEnd = period.end_date;

    const unpostedJEs = db.prepare(
      `SELECT COUNT(*) as c FROM journal_entries WHERE status != 'posted' AND entry_date BETWEEN ? AND ?`
    ).get(periodStart, periodEnd) as any;

    const draftBills = db.prepare(
      `SELECT COUNT(*) as c FROM ap_bills WHERE status = 'draft' AND bill_date BETWEEN ? AND ?`
    ).get(periodStart, periodEnd) as any;

    const draftInvoices = db.prepare(
      `SELECT COUNT(*) as c FROM ar_invoices WHERE status = 'draft' AND invoice_date BETWEEN ? AND ?`
    ).get(periodStart, periodEnd) as any;

    const checks = [
      {
        label: 'All journal entries are posted',
        passed: (unpostedJEs?.c || 0) === 0,
        count: unpostedJEs?.c || 0,
        detail: unpostedJEs?.c > 0 ? `${unpostedJEs.c} unposted journal entries` : null,
      },
      {
        label: 'No draft bills pending approval',
        passed: (draftBills?.c || 0) === 0,
        count: draftBills?.c || 0,
        detail: draftBills?.c > 0 ? `${draftBills.c} draft bills` : null,
      },
      {
        label: 'No draft invoices pending',
        passed: (draftInvoices?.c || 0) === 0,
        count: draftInvoices?.c || 0,
        detail: draftInvoices?.c > 0 ? `${draftInvoices.c} draft invoices` : null,
      },
    ];

    const warnings = checks.filter(c => !c.passed).map(c => c.detail).filter(Boolean);

    return NextResponse.json({
      period_id: period.id,
      period_name: period.period_name,
      checks,
      warnings,
      canClose: warnings.length === 0,
    });
  } catch (error) {
    console.error('Period validate error:', error);
    return NextResponse.json({ error: 'Failed to validate period' }, { status: 500 });
  }
}
