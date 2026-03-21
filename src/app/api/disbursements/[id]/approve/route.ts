import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const APPROVAL_FLOW = ['department_head', 'finance_staff', 'finance_manager', 'treasury'];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { action, comments, approver_id, approver_role } = body;

  const disb = db.prepare('SELECT * FROM disbursement_requests WHERE id = ?').get(id) as {
    status: string; current_approver_role: string; budget_id: number; amount: number;
  } | undefined;

  if (!disb) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (disb.status !== 'pending_approval') return NextResponse.json({ error: 'Not pending approval' }, { status: 400 });

  // Record approval action
  db.prepare(`INSERT INTO disbursement_approvals (disbursement_id, approver_id, approver_role, action, comments) VALUES (?, ?, ?, ?, ?)`)
    .run(id, approver_id || null, approver_role, action, comments || null);

  if (action === 'approved') {
    const currentIdx = APPROVAL_FLOW.indexOf(disb.current_approver_role);
    if (currentIdx < APPROVAL_FLOW.length - 1) {
      // Move to next approver
      const nextRole = APPROVAL_FLOW[currentIdx + 1];
      db.prepare(`UPDATE disbursement_requests SET current_approver_role = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(nextRole, id);
    } else {
      // Fully approved
      db.prepare(`UPDATE disbursement_requests SET status = 'approved', current_approver_role = NULL, updated_at = datetime('now') WHERE id = ?`)
        .run(id);
    }
  } else if (action === 'rejected') {
    db.prepare(`UPDATE disbursement_requests SET status = 'rejected', current_approver_role = NULL, updated_at = datetime('now') WHERE id = ?`)
      .run(id);
    // Release committed budget
    if (disb.budget_id) {
      db.prepare('UPDATE budgets SET committed = MAX(0, committed - ?), updated_at = datetime(\'now\') WHERE id = ?')
        .run(disb.amount, disb.budget_id);
    }
  } else if (action === 'returned') {
    db.prepare(`UPDATE disbursement_requests SET status = 'returned', current_approver_role = NULL, updated_at = datetime('now') WHERE id = ?`)
      .run(id);
    if (disb.budget_id) {
      db.prepare('UPDATE budgets SET committed = MAX(0, committed - ?), updated_at = datetime(\'now\') WHERE id = ?')
        .run(disb.amount, disb.budget_id);
    }
  }

  db.prepare(`INSERT INTO audit_logs (entity_type, entity_id, action, new_values, performed_by) VALUES ('disbursement', ?, ?, ?, ?)`)
    .run(id, action, JSON.stringify({ action, comments }), approver_role);

  return NextResponse.json({ success: true });
}
