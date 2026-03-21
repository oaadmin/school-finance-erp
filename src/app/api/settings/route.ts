import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM system_settings ORDER BY category, key').all();

  // Also get lookup data
  const departments = db.prepare('SELECT * FROM departments ORDER BY name').all();
  const categories = db.prepare('SELECT * FROM expense_categories ORDER BY name').all();
  const fundSources = db.prepare('SELECT * FROM fund_sources ORDER BY name').all();
  const costCenters = db.prepare('SELECT * FROM cost_centers ORDER BY name').all();

  return NextResponse.json({ settings, departments, categories, fundSources, costCenters });
}

export async function PUT(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const upsert = db.prepare(`
    INSERT INTO system_settings (key, value, category, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  if (body.settings && Array.isArray(body.settings)) {
    for (const s of body.settings) {
      upsert.run(s.key, s.value, s.category || 'general');
    }
  }

  return NextResponse.json({ success: true });
}
