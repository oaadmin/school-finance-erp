import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const accounts = db.prepare(`
      SELECT ba.*, coa.account_code, coa.account_name as gl_account_name,
        COALESCE((
          SELECT SUM(jel.debit - jel.credit)
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.journal_entry_id = je.id
          WHERE jel.account_id = ba.gl_account_id AND je.status = 'posted'
        ), 0) as book_balance,
        (SELECT COUNT(*) FROM bank_statements WHERE bank_account_id = ba.id) as statement_count,
        (SELECT MAX(period_to) FROM bank_statements WHERE bank_account_id = ba.id) as last_reconciled
      FROM bank_accounts ba
      LEFT JOIN chart_of_accounts coa ON ba.gl_account_id = coa.id
      ORDER BY ba.bank_name
    `).all();
    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Bank accounts error:', error);
    return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    if (!body.account_name || !body.bank_name) {
      return NextResponse.json(
        { error: 'account_name and bank_name are required' },
        { status: 400 }
      );
    }

    const result = db.prepare(`
      INSERT INTO bank_accounts (account_name, bank_name, account_number, gl_account_id, currency, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      body.account_name,
      body.bank_name,
      body.account_number || null,
      body.gl_account_id || null,
      body.currency || 'PHP',
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
    );

    return NextResponse.json(
      { id: result.lastInsertRowid, message: 'Bank account created' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Bank accounts POST error:', error);
    return NextResponse.json({ error: 'Failed to create bank account' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(body.id);
    if (!existing) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    db.prepare(`
      UPDATE bank_accounts
      SET account_name = COALESCE(?, account_name),
          bank_name = COALESCE(?, bank_name),
          account_number = COALESCE(?, account_number),
          gl_account_id = ?,
          currency = COALESCE(?, currency),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      body.account_name || null,
      body.bank_name || null,
      body.account_number || null,
      body.gl_account_id !== undefined ? body.gl_account_id : (existing as { gl_account_id: number | null }).gl_account_id,
      body.currency || null,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : null,
      body.id
    );

    return NextResponse.json({ message: 'Bank account updated successfully' });
  } catch (error) {
    console.error('Bank accounts PUT error:', error);
    return NextResponse.json({ error: 'Failed to update bank account' }, { status: 500 });
  }
}
