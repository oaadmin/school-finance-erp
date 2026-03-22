import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const data = db.prepare(`
      SELECT * FROM accounting_periods
      ORDER BY start_date DESC
    `).all();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Periods GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch periods' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    const result = db.prepare(`
      INSERT INTO accounting_periods (
        period_name, school_year, start_date, end_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      body.period_name,
      body.school_year,
      body.start_date,
      body.end_date,
      body.status || 'open',
      body.notes || null
    );

    return NextResponse.json(
      { id: result.lastInsertRowid, period_name: body.period_name },
      { status: 201 }
    );
  } catch (error) {
    console.error('Periods POST error:', error);
    return NextResponse.json({ error: 'Failed to create period' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    if (!body.id || !body.action) {
      return NextResponse.json(
        { error: 'id and action (close|reopen) are required' },
        { status: 400 }
      );
    }

    const period = db.prepare(`SELECT * FROM accounting_periods WHERE id = ?`).get(body.id);
    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    if (body.action === 'close') {
      // Before closing, check for issues
      const existing = period as any;
      const periodStart = body.start_date || existing.start_date;
      const periodEnd = body.end_date || existing.end_date;

      const unpostedJEs = db.prepare(`SELECT COUNT(*) as c FROM journal_entries WHERE status != 'posted' AND entry_date BETWEEN ? AND ?`).get(periodStart, periodEnd) as any;
      const draftBills = db.prepare(`SELECT COUNT(*) as c FROM ap_bills WHERE status = 'draft' AND bill_date BETWEEN ? AND ?`).get(periodStart, periodEnd) as any;
      const draftInvoices = db.prepare(`SELECT COUNT(*) as c FROM ar_invoices WHERE status = 'draft' AND invoice_date BETWEEN ? AND ?`).get(periodStart, periodEnd) as any;

      const warnings: string[] = [];
      if (unpostedJEs?.c > 0) warnings.push(`${unpostedJEs.c} unposted journal entries`);
      if (draftBills?.c > 0) warnings.push(`${draftBills.c} draft bills`);
      if (draftInvoices?.c > 0) warnings.push(`${draftInvoices.c} draft invoices`);

      db.prepare(`
        UPDATE accounting_periods
        SET status = 'closed',
            closed_by = ?,
            closed_date = datetime('now')
        WHERE id = ?
      `).run(body.closed_by || 'System', body.id);

      return NextResponse.json({ message: 'Period closed successfully', warnings });
    }

    if (body.action === 'reopen') {
      db.prepare(`
        UPDATE accounting_periods
        SET status = 'open',
            closed_by = NULL,
            closed_date = NULL
        WHERE id = ?
      `).run(body.id);

      return NextResponse.json({ message: 'Period reopened successfully' });
    }

    return NextResponse.json({ error: 'Invalid action. Use close or reopen.' }, { status: 400 });
  } catch (error) {
    console.error('Periods PUT error:', error);
    return NextResponse.json({ error: 'Failed to update period' }, { status: 500 });
  }
}
