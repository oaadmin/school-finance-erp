import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const sy = req.nextUrl.searchParams.get('school_year') || '2025-2026';

  const allocations = db.prepare(`
    SELECT b.id as budget_id, b.budget_name, d.name as department, ec.name as category,
      b.annual_budget,
      bma.month, bma.amount, bma.committed as month_committed, bma.actual as month_actual
    FROM budgets b
    JOIN departments d ON b.department_id = d.id
    JOIN expense_categories ec ON b.category_id = ec.id
    LEFT JOIN budget_monthly_allocations bma ON b.id = bma.budget_id
    WHERE b.school_year = ? AND b.status = 'approved'
    ORDER BY d.name, ec.name, bma.month
  `).all(sy);

  // Group by budget
  const grouped: Record<number, { budget_id: number; budget_name: string; department: string; category: string; annual_budget: number; months: Record<number, { amount: number; committed: number; actual: number }> }> = {};

  (allocations as Array<{ budget_id: number; budget_name: string; department: string; category: string; annual_budget: number; month: number; amount: number; month_committed: number; month_actual: number }>).forEach((row) => {
    if (!grouped[row.budget_id]) {
      grouped[row.budget_id] = {
        budget_id: row.budget_id,
        budget_name: row.budget_name,
        department: row.department,
        category: row.category,
        annual_budget: row.annual_budget,
        months: {},
      };
    }
    if (row.month) {
      grouped[row.budget_id].months[row.month] = {
        amount: row.amount,
        committed: row.month_committed,
        actual: row.month_actual,
      };
    }
  });

  return NextResponse.json(Object.values(grouped));
}

export async function PUT(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const update = db.prepare('UPDATE budget_monthly_allocations SET amount = ? WHERE budget_id = ? AND month = ?');
  const updateBudget = db.prepare('UPDATE budgets SET annual_budget = ?, updated_at = datetime(\'now\') WHERE id = ?');

  if (body.updates && Array.isArray(body.updates)) {
    const transaction = db.transaction(() => {
      for (const u of body.updates) {
        update.run(u.amount, u.budget_id, u.month);
      }
      // Recalculate annual totals
      const budgetIds = [...new Set(body.updates.map((u: { budget_id: number }) => u.budget_id))];
      for (const bid of budgetIds) {
        const total = db.prepare('SELECT SUM(amount) as total FROM budget_monthly_allocations WHERE budget_id = ?')
          .get(bid) as { total: number };
        updateBudget.run(total.total, bid);
      }
    });
    transaction();
  }

  return NextResponse.json({ success: true });
}
