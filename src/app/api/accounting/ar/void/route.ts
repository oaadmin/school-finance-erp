import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { id, type } = await req.json();

    if (type === 'invoice') {
      const invoice = db.prepare('SELECT * FROM ar_invoices WHERE id = ?').get(id) as any;
      if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

      db.prepare(`UPDATE ar_invoices SET status = 'voided', updated_at = datetime('now') WHERE id = ?`).run(id);

      // Create reversing journal entry if original had one
      if (invoice.journal_entry_id) {
        const origJE = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(invoice.journal_entry_id) as any;
        if (origJE) {
          const year = new Date().getFullYear();
          const count = db.prepare("SELECT COUNT(*) as c FROM journal_entries WHERE entry_number LIKE ?").get(`JE-${year}-%`) as any;
          const jeNum = `JE-${year}-${String((count?.c || 0) + 1).padStart(4, '0')}`;

          const je = db.prepare(`INSERT INTO journal_entries (entry_number, entry_date, description, reference_type, total_debit, total_credit, status, created_by) VALUES (?, date('now'), ?, 'reversal', ?, ?, 'posted', 3)`)
            .run(jeNum, `Void: ${invoice.invoice_number} - ${invoice.description || ''}`, origJE.total_debit, origJE.total_credit);

          // Reverse all lines (swap debit/credit)
          const lines = db.prepare('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?').all(invoice.journal_entry_id) as any[];
          const insertLine = db.prepare('INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit) VALUES (?, ?, ?, ?, ?)');
          for (const line of lines) {
            insertLine.run(je.lastInsertRowid, line.account_id, `Reversal: ${line.description || ''}`, line.credit, line.debit);
          }
        }
      }

      return NextResponse.json({ success: true, message: `Invoice ${invoice.invoice_number} voided` });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Void error:', error);
    return NextResponse.json({ error: 'Failed to void record' }, { status: 500 });
  }
}
