import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const type = req.nextUrl.searchParams.get('type') || 'vat-summary';
  const dateFrom = req.nextUrl.searchParams.get('date_from') || '2025-06-01';
  const dateTo = req.nextUrl.searchParams.get('date_to') || '2026-05-31';

  if (type === 'vat-summary') {
    const outputVat = db.prepare(`
      SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code = '2210' AND je.entry_date BETWEEN ? AND ?
    `).get(dateFrom, dateTo) as { amount: number };

    const inputVat = db.prepare(`
      SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code = '2220' AND je.entry_date BETWEEN ? AND ?
    `).get(dateFrom, dateTo) as { amount: number };

    // Monthly breakdown
    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', je.entry_date) as month,
        COALESCE(SUM(CASE WHEN coa.account_code = '2210' THEN jel.credit - jel.debit ELSE 0 END), 0) as output_vat,
        COALESCE(SUM(CASE WHEN coa.account_code = '2220' THEN jel.debit - jel.credit ELSE 0 END), 0) as input_vat
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE (coa.account_code = '2210' OR coa.account_code = '2220')
        AND je.entry_date BETWEEN ? AND ?
      GROUP BY month ORDER BY month
    `).all(dateFrom, dateTo);

    return NextResponse.json({
      outputVat: outputVat.amount,
      inputVat: inputVat.amount,
      netVat: outputVat.amount - inputVat.amount,
      monthly,
    });
  }

  if (type === 'withholding-tax') {
    const ewt = db.prepare(`
      SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code = '2120' AND je.entry_date BETWEEN ? AND ?
    `).get(dateFrom, dateTo) as { amount: number };

    const compensation = db.prepare(`
      SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code = '2110' AND je.entry_date BETWEEN ? AND ?
    `).get(dateFrom, dateTo) as { amount: number };

    const monthly = db.prepare(`
      SELECT strftime('%Y-%m', je.entry_date) as month,
        COALESCE(SUM(CASE WHEN coa.account_code = '2110' THEN jel.credit - jel.debit ELSE 0 END), 0) as wtax_compensation,
        COALESCE(SUM(CASE WHEN coa.account_code = '2120' THEN jel.credit - jel.debit ELSE 0 END), 0) as ewt
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code IN ('2110', '2120')
        AND je.entry_date BETWEEN ? AND ?
      GROUP BY month ORDER BY month
    `).all(dateFrom, dateTo);

    // Vendor EWT breakdown
    const vendorEwt = db.prepare(`
      SELECT p.name as vendor, p.tin,
        COALESCE(SUM(dp.withholding_tax), 0) as tax_amount,
        COALESCE(SUM(dp.gross_amount), 0) as tax_base,
        COUNT(*) as transaction_count
      FROM disbursement_payments dp
      JOIN disbursement_requests dr ON dp.disbursement_id = dr.id
      LEFT JOIN payees p ON dr.payee_id = p.id
      WHERE dp.payment_date BETWEEN ? AND ? AND dp.withholding_tax > 0
      GROUP BY p.id ORDER BY tax_amount DESC
    `).all(dateFrom, dateTo);

    return NextResponse.json({
      ewt: ewt.amount,
      compensation: compensation.amount,
      totalWithholding: ewt.amount + compensation.amount,
      monthly,
      vendorEwt,
    });
  }

  if (type === 'bir-financials') {
    // BIR-formatted trial balance
    const trialBalance = db.prepare(`
      SELECT coa.account_code, coa.account_name, coa.account_type,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        AND je.status = 'posted' AND je.entry_date BETWEEN ? AND ?
      GROUP BY coa.id HAVING total_debit > 0 OR total_credit > 0
      ORDER BY coa.account_code
    `).all(dateFrom, dateTo);

    return NextResponse.json({ trialBalance, period: { from: dateFrom, to: dateTo } });
  }

  return NextResponse.json({ error: 'Unknown tax report type' }, { status: 400 });
}
