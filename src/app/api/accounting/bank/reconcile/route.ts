import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    const { action, statement_line_id, je_line_id } = body;

    if (!action || !statement_line_id) {
      return NextResponse.json(
        { error: 'action and statement_line_id are required' },
        { status: 400 }
      );
    }

    const line = db.prepare('SELECT * FROM bank_statement_lines WHERE id = ?').get(statement_line_id);
    if (!line) {
      return NextResponse.json({ error: 'Statement line not found' }, { status: 404 });
    }

    switch (action) {
      case 'match': {
        if (!je_line_id) {
          return NextResponse.json({ error: 'je_line_id is required for match action' }, { status: 400 });
        }

        // Check if the JE line is already matched to another statement line
        const alreadyMatched = db.prepare(
          'SELECT id FROM bank_statement_lines WHERE matched_je_line_id = ? AND id != ?'
        ).get(je_line_id, statement_line_id);
        if (alreadyMatched) {
          return NextResponse.json({ error: 'This book entry is already matched to another statement line' }, { status: 409 });
        }

        db.prepare(`
          UPDATE bank_statement_lines
          SET matched_je_line_id = ?, match_status = 'matched', matched_at = datetime('now')
          WHERE id = ?
        `).run(je_line_id, statement_line_id);

        return NextResponse.json({ message: 'Match successful' });
      }

      case 'unmatch': {
        db.prepare(`
          UPDATE bank_statement_lines
          SET matched_je_line_id = NULL, match_status = 'unmatched', matched_at = NULL
          WHERE id = ?
        `).run(statement_line_id);

        return NextResponse.json({ message: 'Unmatch successful' });
      }

      case 'exclude': {
        db.prepare(`
          UPDATE bank_statement_lines
          SET match_status = 'excluded'
          WHERE id = ?
        `).run(statement_line_id);

        return NextResponse.json({ message: 'Line excluded' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use match, unmatch, or exclude' }, { status: 400 });
    }
  } catch (error) {
    console.error('Bank reconcile error:', error);
    return NextResponse.json({ error: 'Failed to process reconciliation action' }, { status: 500 });
  }
}
