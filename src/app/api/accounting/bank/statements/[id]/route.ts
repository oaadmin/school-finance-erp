import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const statement = db.prepare(`
      SELECT bs.*,
        ba.bank_name, ba.account_name as bank_account_name, ba.account_number,
        ba.gl_account_id, coa.account_code as gl_account_code, coa.account_name as gl_account_name
      FROM bank_statements bs
      JOIN bank_accounts ba ON bs.bank_account_id = ba.id
      LEFT JOIN chart_of_accounts coa ON ba.gl_account_id = coa.id
      WHERE bs.id = ?
    `).get(id);

    if (!statement) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    const lines = db.prepare(`
      SELECT bsl.*,
        jel.description as matched_je_description,
        je.entry_number as matched_je_number,
        je.entry_date as matched_je_date
      FROM bank_statement_lines bsl
      LEFT JOIN journal_entry_lines jel ON bsl.matched_je_line_id = jel.id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE bsl.statement_id = ?
      ORDER BY bsl.transaction_date, bsl.id
    `).all(id);

    // Get book entries (journal entry lines) for the same GL account and period
    const stmt = statement as { gl_account_id: number; period_from: string; period_to: string };
    const bookEntries = db.prepare(`
      SELECT jel.id, jel.journal_entry_id, jel.account_id, jel.description, jel.debit, jel.credit,
        je.entry_number, je.entry_date, je.description as je_description, je.status,
        (SELECT bsl.id FROM bank_statement_lines bsl WHERE bsl.matched_je_line_id = jel.id LIMIT 1) as matched_statement_line_id
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_id = ? AND je.entry_date BETWEEN ? AND ? AND je.status = 'posted'
      ORDER BY je.entry_date, jel.id
    `).all(stmt.gl_account_id, stmt.period_from, stmt.period_to);

    return NextResponse.json({ statement, lines, bookEntries });
  } catch (error) {
    console.error('Bank statement GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch statement' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await req.json();

    const existing = db.prepare('SELECT * FROM bank_statements WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    if (body.status === 'reconciled') {
      db.prepare(`
        UPDATE bank_statements
        SET status = 'reconciled', reconciled_by = ?, reconciled_at = datetime('now')
        WHERE id = ?
      `).run(body.reconciled_by || 'System', id);
      return NextResponse.json({ message: 'Reconciliation completed' });
    }

    if (body.status === 'draft') {
      db.prepare(`
        UPDATE bank_statements
        SET status = 'draft', reconciled_by = NULL, reconciled_at = NULL
        WHERE id = ?
      `).run(id);
      return NextResponse.json({ message: 'Reconciliation reopened' });
    }

    // General update
    db.prepare(`
      UPDATE bank_statements
      SET status = COALESCE(?, status),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(body.status || null, body.notes || null, id);

    return NextResponse.json({ message: 'Statement updated' });
  } catch (error) {
    console.error('Bank statement PUT error:', error);
    return NextResponse.json({ error: 'Failed to update statement' }, { status: 500 });
  }
}
