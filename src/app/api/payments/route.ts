import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const payments = db.prepare(`
    SELECT dp.*, dr.request_number, dr.description as disbursement_description,
      dr.department_id, d.name as department_name, p.name as payee_name,
      u.full_name as processed_by_name
    FROM disbursement_payments dp
    JOIN disbursement_requests dr ON dp.disbursement_id = dr.id
    JOIN departments d ON dr.department_id = d.id
    LEFT JOIN payees p ON dr.payee_id = p.id
    LEFT JOIN users u ON dp.processed_by = u.id
    ORDER BY dp.created_at DESC
  `).all();

  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const year = new Date().getFullYear();
  const count = db.prepare(`SELECT COUNT(*) as c FROM disbursement_payments WHERE voucher_number LIKE ?`)
    .get(`PV-${year}-%`) as { c: number };
  const voucherNumber = `PV-${year}-${String(count.c + 1).padStart(4, '0')}`;

  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO disbursement_payments (disbursement_id, voucher_number, payment_date, bank_account,
        payment_method, check_number, reference_number, gross_amount, withholding_tax, net_amount,
        status, notes, processed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.disbursement_id, voucherNumber, body.payment_date, body.bank_account || null,
      body.payment_method, body.check_number || null, body.reference_number || null,
      body.gross_amount, body.withholding_tax || 0, body.net_amount,
      'completed', body.notes || null, body.processed_by || 6
    );

    // Update disbursement status
    db.prepare(`UPDATE disbursement_requests SET status = 'paid', updated_at = datetime('now') WHERE id = ?`)
      .run(body.disbursement_id);

    // Update budget: move from committed to actual
    const disb = db.prepare('SELECT budget_id, amount FROM disbursement_requests WHERE id = ?')
      .get(body.disbursement_id) as { budget_id: number; amount: number } | undefined;

    if (disb?.budget_id) {
      db.prepare(`UPDATE budgets SET
        committed = MAX(0, committed - ?),
        actual = actual + ?,
        updated_at = datetime('now')
        WHERE id = ?`).run(disb.amount, body.net_amount, disb.budget_id);
    }

    // Journal entry
    const jeCount = db.prepare(`SELECT COUNT(*) as c FROM journal_entries`).get() as { c: number };
    const entryNumber = `JE-${year}-${String(jeCount.c + 1).padStart(4, '0')}`;

    const je = db.prepare(`
      INSERT INTO journal_entries (entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit)
      VALUES (?, ?, ?, 'payment', ?, ?, ?)
    `).run(entryNumber, body.payment_date, `Payment for ${voucherNumber}`, result.lastInsertRowid, body.net_amount, body.net_amount);

    // Debit expense, credit cash
    db.prepare('INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit) VALUES (?, 8, ?, ?)')
      .run(je.lastInsertRowid, 'Expense', body.gross_amount);
    if (body.withholding_tax > 0) {
      db.prepare('INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, credit) VALUES (?, 7, ?, ?)')
        .run(je.lastInsertRowid, 'Withholding Tax', body.withholding_tax);
    }
    db.prepare('INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, credit) VALUES (?, 3, ?, ?)')
      .run(je.lastInsertRowid, 'Cash in Bank', body.net_amount);

    // Audit log
    db.prepare(`INSERT INTO audit_logs (entity_type, entity_id, action, new_values, performed_by) VALUES ('payment', ?, 'created', ?, 'Treasury')`)
      .run(result.lastInsertRowid, JSON.stringify({ voucher: voucherNumber, amount: body.net_amount }));

    return { id: result.lastInsertRowid, voucher_number: voucherNumber };
  });

  const result = transaction();
  return NextResponse.json(result, { status: 201 });
}
