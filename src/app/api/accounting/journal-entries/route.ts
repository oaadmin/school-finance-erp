import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const entries = db.prepare(`
    SELECT je.*,
      GROUP_CONCAT(jl.id || '::' || jl.account_id || '::' || COALESCE(a.account_code,'') || '::' || COALESCE(a.account_name,'') || '::' || COALESCE(jl.description,'') || '::' || jl.debit || '::' || jl.credit, '||') as lines_raw
    FROM journal_entries je
    LEFT JOIN journal_entry_lines jl ON jl.journal_entry_id = je.id
    LEFT JOIN chart_of_accounts a ON a.id = jl.account_id
    GROUP BY je.id
    ORDER BY je.entry_date DESC, je.id DESC
  `).all();

  const result = entries.map((e: any) => ({
    ...e,
    lines: e.lines_raw ? e.lines_raw.split('||').map((l: string) => {
      const [id, account_id, account_code, account_name, description, debit, credit] = l.split('::');
      return { id: +id, account_id: +account_id, account_code, account_name, description, debit: +debit, credit: +credit };
    }) : []
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { entry_date, journal_type, description, status, lines } = body;

  if (!entry_date || !description || !lines || lines.length < 2) {
    return NextResponse.json({ error: 'Entry date, description, and at least 2 lines are required' }, { status: 400 });
  }

  // Validate debit = credit
  const totalDebit = lines.reduce((s: number, l: any) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s: number, l: any) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json({ error: `Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}` }, { status: 400 });
  }

  // Generate entry number
  const lastEntry = db.prepare(`SELECT entry_number FROM journal_entries ORDER BY id DESC LIMIT 1`).get() as any;
  let nextNum = 1;
  if (lastEntry?.entry_number) {
    const match = lastEntry.entry_number.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const entry_number = `JE-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

  const postingStatus = status || 'posted';
  const posting_date = postingStatus === 'posted' ? entry_date : null;

  try {
    db.prepare('BEGIN').run();

    const result = db.prepare(`
      INSERT INTO journal_entries (entry_number, entry_date, posting_date, journal_type, description, status, created_by, school_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(entry_number, entry_date, posting_date, journal_type || 'general', description, postingStatus, 'Roberto Tan', '2025-2026');

    const jeId = result.lastInsertRowid;

    const insertLine = db.prepare(`
      INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const line of lines) {
      if (line.account_id && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0)) {
        insertLine.run(jeId, line.account_id, line.description || '', parseFloat(line.debit) || 0, parseFloat(line.credit) || 0);
      }
    }

    db.prepare('COMMIT').run();

    return NextResponse.json({
      id: jeId,
      entry_number,
      status: postingStatus,
      total_debit: totalDebit,
      total_credit: totalCredit
    }, { status: 201 });
  } catch (err: any) {
    db.prepare('ROLLBACK').run();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
