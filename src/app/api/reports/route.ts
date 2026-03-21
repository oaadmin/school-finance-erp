import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const type = req.nextUrl.searchParams.get('type') || 'budget-vs-actual';
  const sy = req.nextUrl.searchParams.get('school_year') || '2025-2026';
  const deptId = req.nextUrl.searchParams.get('department_id');

  if (type === 'budget-vs-actual') {
    let query = `
      SELECT b.id, b.budget_name, d.name as department, ec.name as category,
        b.annual_budget as budget, b.actual, b.committed,
        (b.annual_budget - b.actual) as variance,
        CASE WHEN b.annual_budget > 0
          THEN ROUND((b.actual * 100.0 / b.annual_budget), 1)
          ELSE 0 END as utilization_pct
      FROM budgets b
      JOIN departments d ON b.department_id = d.id
      JOIN expense_categories ec ON b.category_id = ec.id
      WHERE b.school_year = ? AND b.status = 'approved'
    `;
    const params: (string | number)[] = [sy];
    if (deptId) { query += ' AND b.department_id = ?'; params.push(Number(deptId)); }
    query += ' ORDER BY d.name, ec.name';

    const data = db.prepare(query).all(...params);

    // Summary totals
    const totals = db.prepare(`
      SELECT COALESCE(SUM(annual_budget), 0) as total_budget,
        COALESCE(SUM(actual), 0) as total_actual,
        COALESCE(SUM(committed), 0) as total_committed,
        COALESCE(SUM(annual_budget - actual), 0) as total_variance
      FROM budgets WHERE school_year = ? AND status = 'approved'
      ${deptId ? 'AND department_id = ?' : ''}
    `).get(...(deptId ? [sy, Number(deptId)] : [sy]));

    return NextResponse.json({ data, totals });
  }

  if (type === 'monthly-variance') {
    let query = `
      SELECT bma.month,
        SUM(bma.amount) as budget,
        SUM(bma.actual) as actual,
        SUM(bma.amount - bma.actual) as variance
      FROM budget_monthly_allocations bma
      JOIN budgets b ON bma.budget_id = b.id
      WHERE b.school_year = ? AND b.status = 'approved'
    `;
    const params: (string | number)[] = [sy];
    if (deptId) { query += ' AND b.department_id = ?'; params.push(Number(deptId)); }
    query += ' GROUP BY bma.month ORDER BY bma.month';

    const data = db.prepare(query).all(...params);
    return NextResponse.json({ data });
  }

  if (type === 'disbursement-summary') {
    const data = db.prepare(`
      SELECT dr.status, COUNT(*) as count, COALESCE(SUM(dr.amount), 0) as total
      FROM disbursement_requests dr
      WHERE dr.request_date >= '2025-06-01'
      GROUP BY dr.status
    `).all();
    return NextResponse.json({ data });
  }

  if (type === 'dept-spending') {
    const data = db.prepare(`
      SELECT d.name as department,
        COUNT(*) as request_count,
        COALESCE(SUM(dr.amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN dr.status = 'paid' THEN dr.amount ELSE 0 END), 0) as paid_amount
      FROM disbursement_requests dr
      JOIN departments d ON dr.department_id = d.id
      GROUP BY d.name ORDER BY total_amount DESC
    `).all();
    return NextResponse.json({ data });
  }

  if (type === 'vendor-spending') {
    const data = db.prepare(`
      SELECT p.name as vendor, p.payee_code,
        COUNT(*) as request_count,
        COALESCE(SUM(dr.amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN dr.status = 'paid' THEN dr.amount ELSE 0 END), 0) as paid_amount
      FROM disbursement_requests dr
      JOIN payees p ON dr.payee_id = p.id
      GROUP BY p.id ORDER BY total_amount DESC
    `).all();
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
}
