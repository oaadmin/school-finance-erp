import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const disbursement = db.prepare(`
    SELECT dr.*, d.name as department_name, ec.name as category_name,
      cc.name as cost_center_name, fs.name as fund_source_name,
      p.name as payee_name, p.type as payee_actual_type, p.tin as payee_tin,
      p.bank_name as payee_bank, p.bank_account_number as payee_bank_account,
      u.full_name as requested_by_name, u.email as requested_by_email,
      b.budget_name, b.annual_budget as budget_total,
      b.committed as budget_committed, b.actual as budget_actual,
      (b.annual_budget - b.committed - b.actual) as budget_remaining
    FROM disbursement_requests dr
    JOIN departments d ON dr.department_id = d.id
    JOIN expense_categories ec ON dr.category_id = ec.id
    LEFT JOIN cost_centers cc ON dr.cost_center_id = cc.id
    LEFT JOIN fund_sources fs ON dr.fund_source_id = fs.id
    LEFT JOIN payees p ON dr.payee_id = p.id
    LEFT JOIN users u ON dr.requested_by = u.id
    LEFT JOIN budgets b ON dr.budget_id = b.id
    WHERE dr.id = ?
  `).get(id);

  if (!disbursement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const items = db.prepare('SELECT * FROM disbursement_items WHERE disbursement_id = ?').all(id);
  const approvals = db.prepare(`
    SELECT da.*, u.full_name as approver_name
    FROM disbursement_approvals da
    LEFT JOIN users u ON da.approver_id = u.id
    WHERE da.disbursement_id = ?
    ORDER BY da.acted_at ASC
  `).all(id);
  const payments = db.prepare('SELECT * FROM disbursement_payments WHERE disbursement_id = ?').all(id);
  const attachments = db.prepare('SELECT * FROM disbursement_attachments WHERE disbursement_id = ?').all(id);

  return NextResponse.json({ ...disbursement as object, items, approvals, payments, attachments });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  const allowedFields = ['due_date', 'payee_id', 'payee_type', 'department_id', 'category_id',
    'cost_center_id', 'fund_source_id', 'budget_id', 'project', 'amount', 'currency',
    'payment_method', 'description', 'status'];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(Number(id));
    db.prepare(`UPDATE disbursement_requests SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return NextResponse.json({ success: true });
}
