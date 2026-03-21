import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const entityType = req.nextUrl.searchParams.get('entity_type');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100');

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: (string | number)[] = [];

  if (entityType) { query += ' AND entity_type = ?'; params.push(entityType); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const logs = db.prepare(query).all(...params);
  return NextResponse.json(logs);
}
