import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const data = db.prepare(`
      SELECT coa.*,
        parent.account_code as parent_code,
        parent.account_name as parent_name,
        (SELECT COUNT(*) FROM chart_of_accounts child WHERE child.parent_id = coa.id) as child_count
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts parent ON coa.parent_id = parent.id
      ORDER BY coa.account_code
    `).all();
    return NextResponse.json(data);
  } catch (error) {
    console.error('COA GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch chart of accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    if (!body.account_code || !body.account_name || !body.account_type) {
      return NextResponse.json(
        { error: 'account_code, account_name, and account_type are required' },
        { status: 400 }
      );
    }

    // Check for duplicate account_code
    const existing = db.prepare(
      `SELECT id FROM chart_of_accounts WHERE account_code = ?`
    ).get(body.account_code);
    if (existing) {
      return NextResponse.json(
        { error: 'Account code already exists' },
        { status: 409 }
      );
    }

    const result = db.prepare(`
      INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_id)
      VALUES (?, ?, ?, ?)
    `).run(
      body.account_code,
      body.account_name,
      body.account_type,
      body.parent_id || null
    );

    return NextResponse.json(
      { id: result.lastInsertRowid, account_code: body.account_code },
      { status: 201 }
    );
  } catch (error) {
    console.error('COA POST error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = db.prepare(
      `SELECT * FROM chart_of_accounts WHERE id = ?`
    ).get(body.id);
    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check for duplicate account_code if changing it
    if (body.account_code) {
      const duplicate = db.prepare(
        `SELECT id FROM chart_of_accounts WHERE account_code = ? AND id != ?`
      ).get(body.account_code, body.id);
      if (duplicate) {
        return NextResponse.json(
          { error: 'Account code already exists' },
          { status: 409 }
        );
      }
    }

    db.prepare(`
      UPDATE chart_of_accounts
      SET account_code = COALESCE(?, account_code),
          account_name = COALESCE(?, account_name),
          account_type = COALESCE(?, account_type),
          parent_id = ?
      WHERE id = ?
    `).run(
      body.account_code || null,
      body.account_name || null,
      body.account_type || null,
      body.parent_id !== undefined ? body.parent_id : (existing as { parent_id: number | null }).parent_id,
      body.id
    );

    return NextResponse.json({ message: 'Account updated successfully' });
  } catch (error) {
    console.error('COA PUT error:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}
