import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const type = req.nextUrl.searchParams.get('type') || 'bills';

    if (type === 'bills') {
      const data = db.prepare(`
        SELECT ab.*, p.name as vendor_name, p.payee_code as vendor_code
        FROM ap_bills ab
        LEFT JOIN payees p ON ab.vendor_id = p.id
        ORDER BY ab.created_at DESC
      `).all();
      return NextResponse.json(data);
    }

    if (type === 'payments') {
      const data = db.prepare(`
        SELECT ap.*, p.name as vendor_name, p.payee_code as vendor_code
        FROM ap_payments ap
        LEFT JOIN payees p ON ap.vendor_id = p.id
        ORDER BY ap.created_at DESC
      `).all();
      return NextResponse.json(data);
    }

    if (type === 'aging') {
      const data = db.prepare(`
        SELECT p.id as vendor_id, p.payee_code as vendor_code, p.name as vendor_name, p.tin,
          COALESCE(SUM(CASE WHEN julianday('now') - julianday(ab.due_date) <= 0 THEN ab.balance ELSE 0 END), 0) as current_amount,
          COALESCE(SUM(CASE WHEN julianday('now') - julianday(ab.due_date) BETWEEN 1 AND 30 THEN ab.balance ELSE 0 END), 0) as days_30,
          COALESCE(SUM(CASE WHEN julianday('now') - julianday(ab.due_date) BETWEEN 31 AND 60 THEN ab.balance ELSE 0 END), 0) as days_60,
          COALESCE(SUM(CASE WHEN julianday('now') - julianday(ab.due_date) BETWEEN 61 AND 90 THEN ab.balance ELSE 0 END), 0) as days_90,
          COALESCE(SUM(CASE WHEN julianday('now') - julianday(ab.due_date) > 90 THEN ab.balance ELSE 0 END), 0) as over_90,
          COALESCE(SUM(ab.balance), 0) as total
        FROM ap_bills ab
        JOIN payees p ON ab.vendor_id = p.id
        WHERE ab.status NOT IN ('cancelled', 'voided', 'paid')
          AND ab.balance > 0
        GROUP BY p.id
        ORDER BY total DESC
      `).all();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('AP GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch AP data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    // Auto-generate bill number BILL-YYYY-NNNN
    const year = new Date().getFullYear();
    const count = db.prepare(
      `SELECT COUNT(*) as c FROM ap_bills WHERE bill_number LIKE ?`
    ).get(`BILL-${year}-%`) as { c: number };
    const billNumber = `BILL-${year}-${String(count.c + 1).padStart(4, '0')}`;

    const grossAmount = body.gross_amount || 0;
    const vatAmount = body.vat_amount || 0;
    const withholdingTax = body.withholding_tax || 0;
    const netPayable = grossAmount + vatAmount - withholdingTax;

    const result = db.prepare(`
      INSERT INTO ap_bills (
        bill_number, bill_date, posting_date, due_date, vendor_id,
        department_id, campus, description,
        gross_amount, vat_amount, withholding_tax, net_payable,
        amount_paid, balance,
        payment_terms, reference_number, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
    `).run(
      billNumber,
      body.bill_date || new Date().toISOString().split('T')[0],
      body.posting_date || body.bill_date || new Date().toISOString().split('T')[0],
      body.due_date || null,
      body.vendor_id || null,
      body.department_id || null,
      body.campus || 'Main',
      body.description || null,
      grossAmount,
      vatAmount,
      withholdingTax,
      netPayable,
      netPayable,
      body.payment_terms || null,
      body.reference_number || null,
      body.status || 'draft',
      body.created_by || null
    );

    // Insert bill lines if provided
    if (body.lines && Array.isArray(body.lines)) {
      const insertLine = db.prepare(`
        INSERT INTO ap_bill_lines (
          bill_id, account_id, description, quantity, unit_cost, amount,
          tax_code, withholding_tax_code, department_id, project, fund_source_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const line of body.lines) {
        insertLine.run(
          result.lastInsertRowid,
          line.account_id || null,
          line.description || null,
          line.quantity || 1,
          line.unit_cost || 0,
          line.amount || 0,
          line.tax_code || null,
          line.withholding_tax_code || null,
          line.department_id || null,
          line.project || null,
          line.fund_source_id || null
        );
      }
    }

    return NextResponse.json(
      { id: result.lastInsertRowid, bill_number: billNumber },
      { status: 201 }
    );
  } catch (error) {
    console.error('AP POST error:', error);
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const grossAmount = body.gross_amount || 0;
    const vatAmount = body.vat_amount || 0;
    const withholdingTax = body.withholding_tax || 0;
    const netPayable = grossAmount + vatAmount - withholdingTax;

    db.prepare(`
      UPDATE ap_bills SET bill_date = ?, due_date = ?, vendor_id = ?,
        department_id = ?, description = ?,
        gross_amount = ?, vat_amount = ?, withholding_tax = ?, net_payable = ?,
        balance = COALESCE(?, 0) - COALESCE(amount_paid, 0),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      body.bill_date || null, body.due_date || null, body.vendor_id || null,
      body.department_id || null, body.description || null,
      grossAmount, vatAmount, withholdingTax, netPayable,
      netPayable,
      body.id
    );

    return NextResponse.json({ id: body.id });
  } catch (error) {
    console.error('AP PUT error:', error);
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 });
  }
}
