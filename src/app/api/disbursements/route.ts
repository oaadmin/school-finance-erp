import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const status = req.nextUrl.searchParams.get('status');
  const dept = req.nextUrl.searchParams.get('department_id');

  let query = `
    SELECT dr.*, d.name as department_name, ec.name as category_name,
      p.name as payee_name, u.full_name as requested_by_name
    FROM disbursement_requests dr
    JOIN departments d ON dr.department_id = d.id
    JOIN expense_categories ec ON dr.category_id = ec.id
    LEFT JOIN payees p ON dr.payee_id = p.id
    LEFT JOIN users u ON dr.requested_by = u.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (status) {
    query += ' AND dr.status = ?';
    params.push(status);
  }
  if (dept) {
    query += ' AND dr.department_id = ?';
    params.push(Number(dept));
  }

  query += ' ORDER BY dr.created_at DESC';

  const disbursements = db.prepare(query).all(...params);
  return NextResponse.json(disbursements);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const year = new Date().getFullYear();
  const count = db.prepare(`SELECT COUNT(*) as c FROM disbursement_requests WHERE request_number LIKE ?`)
    .get(`DR-${year}-%`) as { c: number };
  const requestNumber = `DR-${year}-${String(count.c + 1).padStart(4, '0')}`;

  const stmt = db.prepare(`
    INSERT INTO disbursement_requests (request_number, request_date, due_date, payee_id, payee_type,
      department_id, category_id, cost_center_id, fund_source_id, budget_id, project,
      amount, currency, payment_method, description, requested_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    requestNumber, body.request_date, body.due_date || null,
    body.payee_id || null, body.payee_type || 'vendor',
    body.department_id, body.category_id,
    body.cost_center_id || null, body.fund_source_id || null,
    body.budget_id || null, body.project || null,
    body.amount, body.currency || 'PHP',
    body.payment_method || 'bank_transfer',
    body.description || null, body.requested_by || 1,
    body.status || 'draft'
  );

  // Insert line items
  if (body.items && Array.isArray(body.items)) {
    const insertItem = db.prepare(`
      INSERT INTO disbursement_items (disbursement_id, description, quantity, unit_cost, amount, account_code, tax_code, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of body.items) {
      insertItem.run(result.lastInsertRowid, item.description, item.quantity || 1,
        item.unit_cost || 0, item.amount || 0, item.account_code || null,
        item.tax_code || null, item.remarks || null);
    }
  }

  // Audit
  db.prepare(`INSERT INTO audit_logs (entity_type, entity_id, action, new_values, performed_by)
    VALUES ('disbursement', ?, 'created', ?, 'System')`).run(
    result.lastInsertRowid, JSON.stringify({ amount: body.amount, status: 'draft' })
  );

  return NextResponse.json({ id: result.lastInsertRowid, request_number: requestNumber }, { status: 201 });
}
