import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    if (!body.statement_id) {
      return NextResponse.json({ error: 'statement_id is required' }, { status: 400 });
    }

    // Get statement info
    const statement = db.prepare(`
      SELECT bs.*, ba.gl_account_id
      FROM bank_statements bs
      JOIN bank_accounts ba ON bs.bank_account_id = ba.id
      WHERE bs.id = ?
    `).get(body.statement_id) as { id: number; period_from: string; period_to: string; gl_account_id: number } | undefined;

    if (!statement) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    // Get unmatched statement lines
    const unmatchedLines = db.prepare(`
      SELECT * FROM bank_statement_lines
      WHERE statement_id = ? AND match_status = 'unmatched'
    `).all(body.statement_id) as Array<{
      id: number;
      transaction_date: string;
      debit: number;
      credit: number;
    }>;

    // Get all already-matched JE line IDs to exclude them
    const matchedJeLineIds = db.prepare(`
      SELECT matched_je_line_id FROM bank_statement_lines
      WHERE matched_je_line_id IS NOT NULL
    `).all() as Array<{ matched_je_line_id: number }>;
    const excludedIds = new Set(matchedJeLineIds.map(r => r.matched_je_line_id));

    // Get book entries for the period on the same GL account
    const bookEntries = db.prepare(`
      SELECT jel.id, jel.debit, jel.credit, je.entry_date
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_id = ? AND je.entry_date BETWEEN ? AND ? AND je.status = 'posted'
    `).all(statement.gl_account_id, statement.period_from, statement.period_to) as Array<{
      id: number;
      debit: number;
      credit: number;
      entry_date: string;
    }>;

    const updateLine = db.prepare(`
      UPDATE bank_statement_lines
      SET matched_je_line_id = ?, match_status = 'matched', matched_at = datetime('now')
      WHERE id = ?
    `);

    let matched = 0;

    const doAutoMatch = db.transaction(() => {
      for (const line of unmatchedLines) {
        // Bank debit = money out = book credit, bank credit = money in = book debit
        const bankAmount = line.debit > 0 ? line.debit : line.credit;
        const isBankDebit = line.debit > 0;

        // Find matching book entries: amount matches, date within +/-3 days
        const candidates = bookEntries.filter(be => {
          if (excludedIds.has(be.id)) return false;

          // Match bank debit to book credit (money out), bank credit to book debit (money in)
          const bookAmount = isBankDebit ? be.credit : be.debit;
          if (Math.abs(bookAmount - bankAmount) > 0.01) return false;

          // Date within +/- 3 days
          const bankDate = new Date(line.transaction_date).getTime();
          const bookDate = new Date(be.entry_date).getTime();
          const daysDiff = Math.abs(bankDate - bookDate) / (1000 * 60 * 60 * 24);
          return daysDiff <= 3;
        });

        // Only auto-match if exactly one candidate
        if (candidates.length === 1) {
          updateLine.run(candidates[0].id, line.id);
          excludedIds.add(candidates[0].id);
          matched++;
        }
      }
    });

    doAutoMatch();

    const remaining = unmatchedLines.length - matched;

    return NextResponse.json({
      matched,
      unmatched: remaining,
      message: `Auto-matched ${matched} line${matched !== 1 ? 's' : ''}. ${remaining} remaining.`,
    });
  } catch (error) {
    console.error('Auto-reconcile error:', error);
    return NextResponse.json({ error: 'Failed to auto-reconcile' }, { status: 500 });
  }
}
