import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  const pending = db.prepare(`
    SELECT dr.*, d.name as department_name, ec.name as category_name,
      p.name as payee_name, u.full_name as requested_by_name,
      b.budget_name, b.annual_budget as budget_total,
      b.committed as budget_committed, b.actual as budget_actual,
      (b.annual_budget - b.committed - b.actual) as budget_remaining
    FROM disbursement_requests dr
    JOIN departments d ON dr.department_id = d.id
    JOIN expense_categories ec ON dr.category_id = ec.id
    LEFT JOIN payees p ON dr.payee_id = p.id
    LEFT JOIN users u ON dr.requested_by = u.id
    LEFT JOIN budgets b ON dr.budget_id = b.id
    WHERE dr.status = 'pending_approval'
    ORDER BY dr.request_date ASC
  `).all();

  return NextResponse.json(pending);
}
