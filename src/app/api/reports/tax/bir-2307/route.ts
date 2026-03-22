import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const quarter = req.nextUrl.searchParams.get('quarter') || 'Q1';
    const year = req.nextUrl.searchParams.get('year') || '2025';
    const vendorId = req.nextUrl.searchParams.get('vendor_id');

    // Calculate date range from quarter
    const quarterMap: Record<string, [string, string]> = {
      'Q1': [`${year}-01-01`, `${year}-03-31`],
      'Q2': [`${year}-04-01`, `${year}-06-30`],
      'Q3': [`${year}-07-01`, `${year}-09-30`],
      'Q4': [`${year}-10-01`, `${year}-12-31`],
    };
    const [startDate, endDate] = quarterMap[quarter] || quarterMap['Q1'];

    // Build vendor filter
    const vendorFilter = vendorId ? 'AND b.vendor_id = ?' : '';
    const vendorParams = vendorId ? [vendorId] : [];

    // Get all bills with WHT grouped by vendor
    const vendors = db.prepare(`
      SELECT p.id as vendor_id, p.name as vendor_name, p.payee_code as vendor_code,
        p.tin, p.address,
        SUM(b.gross_amount) as total_gross,
        SUM(b.withholding_tax) as total_wht
      FROM ap_bills b
      JOIN payees p ON b.vendor_id = p.id
      WHERE b.withholding_tax > 0
        AND b.status NOT IN ('cancelled', 'voided', 'draft')
        AND b.bill_date BETWEEN ? AND ?
        ${vendorFilter}
      GROUP BY p.id
      ORDER BY p.name
    `).all(startDate, endDate, ...vendorParams);

    // Get individual transactions per vendor
    const result = (vendors as any[]).map(v => {
      const txns = db.prepare(`
        SELECT bill_number as reference, bill_date as date, description,
          gross_amount as gross,
          CASE WHEN gross_amount > 0 THEN ROUND(withholding_tax * 100.0 / gross_amount, 1) ELSE 0 END as tax_rate,
          withholding_tax as wht
        FROM ap_bills
        WHERE vendor_id = ? AND withholding_tax > 0
          AND status NOT IN ('cancelled', 'voided', 'draft')
          AND bill_date BETWEEN ? AND ?
        ORDER BY bill_date
      `).all(v.vendor_id, startDate, endDate);
      return { ...v, transactions: txns };
    });

    return NextResponse.json({
      data: result,
      period: { quarter, year, startDate, endDate },
      schoolInfo: {
        name: 'OrangeApps Academy',
        tin: '000-123-456-000',
        address: 'Metro Manila, Philippines',
      }
    });
  } catch (error) {
    console.error('BIR 2307 error:', error);
    return NextResponse.json({ error: 'Failed to generate 2307 data' }, { status: 500 });
  }
}
