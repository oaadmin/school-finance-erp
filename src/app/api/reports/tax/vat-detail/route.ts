import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const dateFrom = req.nextUrl.searchParams.get('date_from') || '2025-06-01';
    const dateTo = req.nextUrl.searchParams.get('date_to') || '2026-05-31';

    // Input VAT from purchases (ap_bills with vat > 0)
    const inputVat = db.prepare(`
      SELECT b.bill_number as reference, b.bill_date as date,
        p.name as entity_name, p.tin,
        b.gross_amount, b.vat_amount, b.net_payable,
        'purchase' as type
      FROM ap_bills b
      LEFT JOIN payees p ON b.vendor_id = p.id
      WHERE b.vat_amount > 0 AND b.status NOT IN ('cancelled', 'voided', 'draft')
        AND b.bill_date BETWEEN ? AND ?
      ORDER BY b.bill_date
    `).all(dateFrom, dateTo);

    // Output VAT from journal entries (account 2210)
    const outputVatAcct = db.prepare(
      "SELECT id FROM chart_of_accounts WHERE account_code = '2210'"
    ).get() as any;

    let outputVat: any[] = [];
    if (outputVatAcct) {
      outputVat = db.prepare(`
        SELECT je.entry_number as reference, je.entry_date as date,
          je.description as entity_name, '' as tin,
          jel.credit as vat_amount,
          'sale' as type
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE jel.account_id = ? AND jel.credit > 0 AND je.status = 'posted'
          AND je.entry_date BETWEEN ? AND ?
        ORDER BY je.entry_date
      `).all(outputVatAcct.id, dateFrom, dateTo);
    }

    const totalInput = (inputVat as any[]).reduce((s, r) => s + (r.vat_amount || 0), 0);
    const totalOutput = (outputVat as any[]).reduce((s, r) => s + (r.vat_amount || 0), 0);

    // Monthly breakdown
    const monthlyInput = db.prepare(`
      SELECT strftime('%Y-%m', b.bill_date) as month,
        SUM(b.vat_amount) as vat_amount,
        COUNT(*) as count
      FROM ap_bills b
      WHERE b.vat_amount > 0 AND b.status NOT IN ('cancelled', 'voided', 'draft')
        AND b.bill_date BETWEEN ? AND ?
      GROUP BY strftime('%Y-%m', b.bill_date)
      ORDER BY month
    `).all(dateFrom, dateTo);

    let monthlyOutput: any[] = [];
    if (outputVatAcct) {
      monthlyOutput = db.prepare(`
        SELECT strftime('%Y-%m', je.entry_date) as month,
          SUM(jel.credit) as vat_amount,
          COUNT(*) as count
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE jel.account_id = ? AND jel.credit > 0 AND je.status = 'posted'
          AND je.entry_date BETWEEN ? AND ?
        GROUP BY strftime('%Y-%m', je.entry_date)
        ORDER BY month
      `).all(outputVatAcct.id, dateFrom, dateTo);
    }

    // Merge monthly data
    const monthSet = new Set<string>();
    (monthlyInput as any[]).forEach(m => monthSet.add(m.month));
    (monthlyOutput as any[]).forEach(m => monthSet.add(m.month));
    const months = Array.from(monthSet).sort();

    const monthlyBreakdown = months.map(month => {
      const inp = (monthlyInput as any[]).find(m => m.month === month);
      const out = (monthlyOutput as any[]).find(m => m.month === month);
      return {
        month,
        inputVat: inp?.vat_amount || 0,
        outputVat: out?.vat_amount || 0,
        netVat: (out?.vat_amount || 0) - (inp?.vat_amount || 0),
      };
    });

    return NextResponse.json({
      inputVat,
      outputVat,
      monthlyBreakdown,
      summary: {
        totalInput,
        totalOutput,
        netVat: totalOutput - totalInput,
      }
    });
  } catch (error) {
    console.error('VAT detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch VAT details' }, { status: 500 });
  }
}
