import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  const budgetSummary = db.prepare(`
    SELECT
      COALESCE(SUM(annual_budget), 0) as total_budget,
      COALESCE(SUM(committed), 0) as total_committed,
      COALESCE(SUM(actual), 0) as total_actual
    FROM budgets WHERE school_year = '2025-2026' AND status = 'approved'
  `).get() as { total_budget: number; total_committed: number; total_actual: number };

  const remaining = budgetSummary.total_budget - budgetSummary.total_committed - budgetSummary.total_actual;

  const deptSpending = db.prepare(`
    SELECT d.name as department,
      COALESCE(SUM(b.annual_budget), 0) as budget,
      COALESCE(SUM(b.actual), 0) as actual,
      COALESCE(SUM(b.committed), 0) as committed
    FROM budgets b
    JOIN departments d ON b.department_id = d.id
    WHERE b.school_year = '2025-2026' AND b.status = 'approved'
    GROUP BY d.name
    ORDER BY actual DESC
  `).all();

  const monthlyTrend = db.prepare(`
    SELECT bma.month,
      COALESCE(SUM(bma.amount), 0) as budget,
      COALESCE(SUM(bma.actual), 0) as actual
    FROM budget_monthly_allocations bma
    JOIN budgets b ON bma.budget_id = b.id
    WHERE b.school_year = '2025-2026' AND b.status = 'approved'
    GROUP BY bma.month
    ORDER BY bma.month
  `).all();

  const recentDisbursements = db.prepare(`
    SELECT dr.id, dr.request_number, dr.description, dr.amount, dr.status, dr.request_date,
      d.name as department, p.name as payee_name
    FROM disbursement_requests dr
    JOIN departments d ON dr.department_id = d.id
    LEFT JOIN payees p ON dr.payee_id = p.id
    ORDER BY dr.created_at DESC LIMIT 10
  `).all();

  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM disbursement_requests GROUP BY status
  `).all();

  const pendingApprovals = db.prepare(`
    SELECT COUNT(*) as count FROM disbursement_requests WHERE status = 'pending_approval'
  `).get() as { count: number };

  const categorySpending = db.prepare(`
    SELECT ec.name as category,
      COALESCE(SUM(b.annual_budget), 0) as budget,
      COALESCE(SUM(b.actual), 0) as actual
    FROM budgets b
    JOIN expense_categories ec ON b.category_id = ec.id
    WHERE b.school_year = '2025-2026' AND b.status = 'approved'
    GROUP BY ec.name
    ORDER BY actual DESC
  `).all();

  return NextResponse.json({
    summary: {
      total_budget: budgetSummary.total_budget,
      total_committed: budgetSummary.total_committed,
      total_actual: budgetSummary.total_actual,
      remaining,
    },
    deptSpending,
    monthlyTrend,
    recentDisbursements,
    statusCounts,
    pendingApprovals: pendingApprovals.count,
    categorySpending,
  });
}
