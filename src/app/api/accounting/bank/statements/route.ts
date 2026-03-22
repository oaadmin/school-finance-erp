import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const statements = db.prepare(`
      SELECT bs.*,
        ba.bank_name, ba.account_name as bank_account_name, ba.account_number,
        (SELECT COUNT(*) FROM bank_statement_lines WHERE statement_id = bs.id) as line_count,
        (SELECT COUNT(*) FROM bank_statement_lines WHERE statement_id = bs.id AND match_status = 'matched') as matched_count,
        (SELECT COUNT(*) FROM bank_statement_lines WHERE statement_id = bs.id AND match_status = 'excluded') as excluded_count
      FROM bank_statements bs
      JOIN bank_accounts ba ON bs.bank_account_id = ba.id
      ORDER BY bs.period_from DESC
    `).all();
    return NextResponse.json(statements);
  } catch (error) {
    console.error('Bank statements error:', error);
    return NextResponse.json({ error: 'Failed to fetch bank statements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    if (!body.bank_account_id || !body.period_from || !body.period_to) {
      return NextResponse.json(
        { error: 'bank_account_id, period_from, and period_to are required' },
        { status: 400 }
      );
    }

    // Check for duplicate statement for same bank and period
    const existing = db.prepare(
      `SELECT id FROM bank_statements WHERE bank_account_id = ? AND period_from = ? AND period_to = ?`
    ).get(body.bank_account_id, body.period_from, body.period_to);
    if (existing) {
      return NextResponse.json(
        { error: 'A statement already exists for this bank account and period' },
        { status: 409 }
      );
    }

    const insertStatement = db.prepare(`
      INSERT INTO bank_statements (bank_account_id, statement_date, file_name, period_from, period_to, opening_balance, closing_balance, status)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, 'draft')
    `);

    const insertLine = db.prepare(`
      INSERT INTO bank_statement_lines (statement_id, transaction_date, description, reference, debit, credit, running_balance, match_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'unmatched')
    `);

    const result = db.transaction(() => {
      const stmtResult = insertStatement.run(
        body.bank_account_id,
        body.file_name || null,
        body.period_from,
        body.period_to,
        body.opening_balance || 0,
        body.closing_balance || 0
      );

      const statementId = stmtResult.lastInsertRowid;

      if (body.lines && Array.isArray(body.lines)) {
        for (const line of body.lines) {
          insertLine.run(
            statementId,
            line.transaction_date,
            line.description || '',
            line.reference || '',
            line.debit || 0,
            line.credit || 0,
            line.running_balance || 0
          );
        }
      }

      return statementId;
    })();

    return NextResponse.json(
      { id: result, message: 'Bank statement imported successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Bank statements POST error:', error);
    return NextResponse.json({ error: 'Failed to import bank statement' }, { status: 500 });
  }
}
