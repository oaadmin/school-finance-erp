import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const type = req.nextUrl.searchParams.get('type') || 'invoices';

    if (type === 'invoices') {
      const data = db.prepare(`
        SELECT ai.*, c.name as customer_name, c.customer_code
        FROM ar_invoices ai
        LEFT JOIN customers c ON ai.customer_id = c.id
        ORDER BY ai.created_at DESC
      `).all();
      return NextResponse.json(data);
    }

    if (type === 'collections') {
      const data = db.prepare(`
        SELECT ac.*, c.name as customer_name, c.customer_code
        FROM ar_collections ac
        LEFT JOIN customers c ON ac.customer_id = c.id
        ORDER BY ac.created_at DESC
      `).all();
      return NextResponse.json(data);
    }

    if (type === 'customers') {
      const data = db.prepare(`
        SELECT c.*,
          COALESCE(inv.total_receivable, 0) as total_receivable,
          COALESCE(inv.total_balance, 0) as outstanding_balance,
          COALESCE(col.total_collected, 0) as total_collected
        FROM customers c
        LEFT JOIN (
          SELECT customer_id,
            SUM(net_receivable) as total_receivable,
            SUM(balance) as total_balance
          FROM ar_invoices
          WHERE status NOT IN ('cancelled', 'voided')
          GROUP BY customer_id
        ) inv ON c.id = inv.customer_id
        LEFT JOIN (
          SELECT customer_id,
            SUM(amount_received) as total_collected
          FROM ar_collections
          WHERE status NOT IN ('cancelled', 'voided')
          GROUP BY customer_id
        ) col ON c.id = col.customer_id
        ORDER BY c.name
      `).all();
      return NextResponse.json(data);
    }

    if (type === 'aging') {
      const data = db.prepare(`
        SELECT c.id as customer_id, c.customer_code, c.name as customer_name,
          COALESCE(SUM(CASE WHEN julianday('now') - julianday(ai.due_date) <= 0 THEN ai.balance ELSE 0 END), 0) as current_amount,
          COALESCE(SUM(CASE WHEN julianday('now') - julianday(ai.due_date) BETWEEN 1 AND 30 THEN ai.balance ELSE 0 END), 0) as days_30,
          COALESCE(SUM(CASE WHEN julianday('now') - julianday(ai.due_date) BETWEEN 31 AND 60 THEN ai.balance ELSE 0 END), 0) as days_60,
          COALESCE(SUM(CASE WHEN julianday('now') - julianday(ai.due_date) BETWEEN 61 AND 90 THEN ai.balance ELSE 0 END), 0) as days_90,
          COALESCE(SUM(CASE WHEN julianday('now') - julianday(ai.due_date) > 90 THEN ai.balance ELSE 0 END), 0) as over_90,
          COALESCE(SUM(ai.balance), 0) as total
        FROM ar_invoices ai
        JOIN customers c ON ai.customer_id = c.id
        WHERE ai.status NOT IN ('cancelled', 'voided', 'paid')
          AND ai.balance > 0
        GROUP BY c.id
        ORDER BY total DESC
      `).all();
      return NextResponse.json(data);
    }

    if (type === 'soa') {
      const customerId = req.nextUrl.searchParams.get('customer_id');
      if (!customerId) {
        return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
      }

      const customer = db.prepare(`
        SELECT * FROM customers WHERE id = ?
      `).get(Number(customerId));

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      const invoices = db.prepare(`
        SELECT id, invoice_number, invoice_date, due_date, description,
          gross_amount, discount_amount, tax_amount, net_receivable,
          amount_paid, balance, status
        FROM ar_invoices
        WHERE customer_id = ? AND status NOT IN ('cancelled', 'voided')
        ORDER BY invoice_date DESC
      `).all(Number(customerId));

      const collections = db.prepare(`
        SELECT ac.id, ac.receipt_number, ac.collection_date, ac.payment_method,
          ac.amount_received, ac.applied_amount, ac.unapplied_amount, ac.status,
          ac.remarks
        FROM ar_collections ac
        WHERE ac.customer_id = ? AND ac.status NOT IN ('cancelled', 'voided')
        ORDER BY ac.collection_date DESC
      `).all(Number(customerId));

      const summary = db.prepare(`
        SELECT
          COALESCE(SUM(net_receivable), 0) as total_invoiced,
          COALESCE(SUM(amount_paid), 0) as total_paid,
          COALESCE(SUM(balance), 0) as total_balance
        FROM ar_invoices
        WHERE customer_id = ? AND status NOT IN ('cancelled', 'voided')
      `).get(Number(customerId));

      return NextResponse.json({ customer, invoices, collections, summary });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('AR GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch AR data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const type = req.nextUrl.searchParams.get('type') || 'invoices';
    const body = await req.json();
    const year = new Date().getFullYear();

    if (type === 'invoices') {
      // Auto-generate invoice number INV-YYYY-NNNN
      const count = db.prepare(
        `SELECT COUNT(*) as c FROM ar_invoices WHERE invoice_number LIKE ?`
      ).get(`INV-${year}-%`) as { c: number };
      const invoiceNumber = `INV-${year}-${String(count.c + 1).padStart(4, '0')}`;

      const grossAmount = body.gross_amount || 0;
      const discountAmount = body.discount_amount || 0;
      const taxAmount = body.tax_amount || 0;
      const netReceivable = grossAmount - discountAmount + taxAmount;

      const result = db.prepare(`
        INSERT INTO ar_invoices (
          invoice_number, invoice_date, posting_date, due_date,
          customer_id, campus, school_year, semester, description,
          gross_amount, discount_amount, tax_amount, net_receivable,
          amount_paid, balance,
          reference_number, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `).run(
        invoiceNumber,
        body.invoice_date || new Date().toISOString().split('T')[0],
        body.posting_date || body.invoice_date || new Date().toISOString().split('T')[0],
        body.due_date || null,
        body.customer_id || null,
        body.campus || 'Main',
        body.school_year || null,
        body.semester || null,
        body.description || null,
        grossAmount,
        discountAmount,
        taxAmount,
        netReceivable,
        netReceivable,
        body.reference_number || null,
        body.status || 'draft',
        body.created_by || null
      );

      // Insert invoice lines if provided
      if (body.lines && Array.isArray(body.lines)) {
        const insertLine = db.prepare(`
          INSERT INTO ar_invoice_lines (
            invoice_id, fee_code, description, quantity, unit_amount, amount,
            revenue_account_id, department_id, tax_code, discount_type,
            discount_amount, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const line of body.lines) {
          insertLine.run(
            result.lastInsertRowid,
            line.fee_code || null,
            line.description || null,
            line.quantity || 1,
            line.unit_amount || 0,
            line.amount || 0,
            line.revenue_account_id || null,
            line.department_id || null,
            line.tax_code || null,
            line.discount_type || null,
            line.discount_amount || 0,
            line.remarks || null
          );
        }
      }

      return NextResponse.json(
        { id: result.lastInsertRowid, invoice_number: invoiceNumber },
        { status: 201 }
      );
    }

    if (type === 'collections') {
      // Auto-generate receipt number OR-YYYY-NNNN
      const count = db.prepare(
        `SELECT COUNT(*) as c FROM ar_collections WHERE receipt_number LIKE ?`
      ).get(`OR-${year}-%`) as { c: number };
      const receiptNumber = `OR-${year}-${String(count.c + 1).padStart(4, '0')}`;

      const amountReceived = body.amount_received || 0;

      const result = db.prepare(`
        INSERT INTO ar_collections (
          receipt_number, collection_date, customer_id,
          payment_method, bank_account, check_number, reference_number,
          amount_received, applied_amount, unapplied_amount,
          collected_by, status, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        receiptNumber,
        body.collection_date || new Date().toISOString().split('T')[0],
        body.customer_id || null,
        body.payment_method || 'cash',
        body.bank_account || null,
        body.check_number || null,
        body.reference_number || null,
        amountReceived,
        0,
        amountReceived,
        body.collected_by || null,
        body.status || 'draft',
        body.remarks || null
      );

      const collectionId = result.lastInsertRowid;

      // Apply to invoices if allocations provided
      if (body.allocations && Array.isArray(body.allocations)) {
        const insertAllocation = db.prepare(`
          INSERT INTO ar_collection_allocations (collection_id, invoice_id, amount_applied)
          VALUES (?, ?, ?)
        `);
        const updateInvoice = db.prepare(`
          UPDATE ar_invoices
          SET amount_paid = amount_paid + ?,
              balance = balance - ?,
              status = CASE WHEN balance - ? <= 0 THEN 'paid' ELSE status END,
              updated_at = datetime('now')
          WHERE id = ?
        `);

        let totalApplied = 0;
        for (const alloc of body.allocations) {
          const applyAmount = alloc.amount_applied || 0;
          if (applyAmount > 0) {
            insertAllocation.run(collectionId, alloc.invoice_id, applyAmount);
            updateInvoice.run(applyAmount, applyAmount, applyAmount, alloc.invoice_id);
            totalApplied += applyAmount;
          }
        }

        // Update collection applied/unapplied amounts
        db.prepare(`
          UPDATE ar_collections
          SET applied_amount = ?,
              unapplied_amount = amount_received - ?
          WHERE id = ?
        `).run(totalApplied, totalApplied, collectionId);
      }

      return NextResponse.json(
        { id: collectionId, receipt_number: receiptNumber },
        { status: 201 }
      );
    }

    if (type === 'customers') {
      const result = db.prepare(`
        INSERT INTO customers (
          customer_code, customer_type, name, campus, grade_level,
          contact_person, email, phone, billing_address, tin,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        body.customer_code,
        body.customer_type || 'student',
        body.name,
        body.campus || 'Main',
        body.grade_level || null,
        body.contact_person || null,
        body.email || null,
        body.phone || null,
        body.billing_address || null,
        body.tin || null
      );
      return NextResponse.json(
        { id: result.lastInsertRowid, customer_code: body.customer_code },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('AR POST error:', error);
    return NextResponse.json({ error: 'Failed to create AR record' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const type = req.nextUrl.searchParams.get('type') || 'invoices';
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (type === 'customers') {
      db.prepare(`
        UPDATE customers SET customer_code = ?, customer_type = ?, name = ?, campus = ?, grade_level = ?,
          contact_person = ?, email = ?, phone = ?, billing_address = ?, tin = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.customer_code, body.customer_type || 'student', body.name,
        body.campus || 'Main', body.grade_level || null,
        body.contact_person || null, body.email || null, body.phone || null,
        body.billing_address || null, body.tin || null,
        body.id
      );
      return NextResponse.json({ id: body.id });
    }

    if (type === 'invoices') {
      const grossAmount = body.gross_amount || 0;
      const discountAmount = body.discount_amount || 0;
      const taxAmount = body.tax_amount || 0;
      const netReceivable = grossAmount - discountAmount + taxAmount;

      db.prepare(`
        UPDATE ar_invoices SET invoice_date = ?, due_date = ?, customer_id = ?,
          school_year = ?, semester = ?, description = ?,
          gross_amount = ?, discount_amount = ?, tax_amount = ?, net_receivable = ?,
          balance = net_receivable - amount_paid,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.invoice_date || null, body.due_date || null, body.customer_id || null,
        body.school_year || null, body.semester || null, body.description || null,
        grossAmount, discountAmount, taxAmount, netReceivable,
        body.id
      );
      return NextResponse.json({ id: body.id });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('AR PUT error:', error);
    return NextResponse.json({ error: 'Failed to update AR record' }, { status: 500 });
  }
}
