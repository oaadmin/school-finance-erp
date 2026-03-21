import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const disb = db.prepare('SELECT * FROM disbursement_requests WHERE id = ?').get(id) as {
    status: string; budget_id: number; amount: number;
  } | undefined;

  if (!disb) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (disb.status !== 'draft') return NextResponse.json({ error: 'Can only submit drafts' }, { status: 400 });

  // Budget validation
  if (disb.budget_id) {
    const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(disb.budget_id) as {
      annual_budget: number; committed: number; actual: number;
    } | undefined;
    if (budget) {
      const available = budget.annual_budget - budget.committed - budget.actual;
      if (disb.amount > available) {
        // Return warning but still allow (configurable)
        const policy = db.prepare("SELECT value FROM system_settings WHERE key = 'budget_overspend_policy'")
          .get() as { value: string } | undefined;
        if (policy?.value === 'block') {
          return NextResponse.json({
            error: 'Exceeds available budget',
            budget: budget.annual_budget,
            committed: budget.committed,
            actual: budget.actual,
            available,
            requested: disb.amount,
          }, { status: 400 });
        }
      }
    }
  }

  db.prepare(`UPDATE disbursement_requests SET status = 'pending_approval', current_approver_role = 'department_head', updated_at = datetime('now') WHERE id = ?`).run(id);

  // Update budget committed amount
  if (disb.budget_id) {
    db.prepare('UPDATE budgets SET committed = committed + ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(disb.amount, disb.budget_id);
  }

  db.prepare(`INSERT INTO audit_logs (entity_type, entity_id, action, old_values, new_values, performed_by) VALUES ('disbursement', ?, 'submitted', ?, ?, 'System')`)
    .run(id, JSON.stringify({ status: 'draft' }), JSON.stringify({ status: 'pending_approval' }));

  return NextResponse.json({ success: true, status: 'pending_approval' });
}
