import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const type = req.nextUrl.searchParams.get('type');
  const search = req.nextUrl.searchParams.get('search');

  let query = 'SELECT * FROM payees WHERE 1=1';
  const params: string[] = [];

  if (type) { query += ' AND type = ?'; params.push(type); }
  if (search) { query += ' AND (name LIKE ? OR payee_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY name';
  const payees = db.prepare(query).all(...params);

  // Get payment totals for each payee
  const enriched = (payees as Array<Record<string, unknown>>).map((payee) => {
    const totals = db.prepare(`
      SELECT COUNT(*) as payment_count, COALESCE(SUM(dp.net_amount), 0) as total_paid,
        COUNT(CASE WHEN dr.status = 'approved' THEN 1 END) as outstanding_count,
        COALESCE(SUM(CASE WHEN dr.status = 'approved' THEN dr.amount ELSE 0 END), 0) as outstanding_amount
      FROM disbursement_requests dr
      LEFT JOIN disbursement_payments dp ON dr.id = dp.disbursement_id
      WHERE dr.payee_id = ?
    `).get(payee.id) as Record<string, number>;
    return { ...payee, ...totals };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const result = db.prepare(`
    INSERT INTO payees (payee_code, name, type, contact_person, email, phone, address, tin, bank_name, bank_account_number, bank_branch)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.payee_code, body.name, body.type || 'vendor',
    body.contact_person || null, body.email || null, body.phone || null,
    body.address || null, body.tin || null,
    body.bank_name || null, body.bank_account_number || null, body.bank_branch || null
  );

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  db.prepare(`
    UPDATE payees SET payee_code = ?, name = ?, type = ?, contact_person = ?, email = ?, phone = ?,
      address = ?, tin = ?, bank_name = ?, bank_account_number = ?, bank_branch = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    body.payee_code, body.name, body.type || 'vendor',
    body.contact_person || null, body.email || null, body.phone || null,
    body.address || null, body.tin || null,
    body.bank_name || null, body.bank_account_number || null, body.bank_branch || null,
    body.id
  );

  return NextResponse.json({ id: body.id });
}
