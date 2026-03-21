import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const sy = req.nextUrl.searchParams.get('school_year') || '2025-2026';
  const dept = req.nextUrl.searchParams.get('department_id');

  let query = `
    SELECT b.*, d.name as department_name, ec.name as category_name,
      cc.name as cost_center_name, fs.name as fund_source_name,
      (b.annual_budget - b.committed - b.actual) as remaining
    FROM budgets b
    JOIN departments d ON b.department_id = d.id
    JOIN expense_categories ec ON b.category_id = ec.id
    LEFT JOIN cost_centers cc ON b.cost_center_id = cc.id
    LEFT JOIN fund_sources fs ON b.fund_source_id = fs.id
    WHERE b.school_year = ?
  `;
  const params: (string | number)[] = [sy];

  if (dept) {
    query += ' AND b.department_id = ?';
    params.push(Number(dept));
  }

  query += ' ORDER BY d.name, ec.name';

  const budgets = db.prepare(query).all(...params);
  return NextResponse.json(budgets);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const stmt = db.prepare(`
    INSERT INTO budgets (budget_name, school_year, department_id, category_id, cost_center_id,
      fund_source_id, project, campus, annual_budget, budget_owner, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    body.budget_name, body.school_year, body.department_id, body.category_id,
    body.cost_center_id || null, body.fund_source_id || null,
    body.project || null, body.campus || 'Main',
    body.annual_budget, body.budget_owner || null, body.status || 'draft', body.notes || null
  );

  // Create monthly allocations
  const monthlyAmount = body.annual_budget / 12;
  const insertMonthly = db.prepare('INSERT INTO budget_monthly_allocations (budget_id, month, amount) VALUES (?, ?, ?)');
  for (let m = 1; m <= 12; m++) {
    insertMonthly.run(result.lastInsertRowid, m, body.monthly?.[m] ?? monthlyAmount);
  }

  // Audit log
  db.prepare(`INSERT INTO audit_logs (entity_type, entity_id, action, new_values, performed_by)
    VALUES ('budget', ?, 'created', ?, 'System')`).run(
    result.lastInsertRowid, JSON.stringify({ annual_budget: body.annual_budget, status: body.status || 'draft' })
  );

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
