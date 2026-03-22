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

  if (type === 'bir-2307') {
    const vendorId = req.nextUrl.searchParams.get('vendor_id');
    const quarter = req.nextUrl.searchParams.get('quarter'); // Q1, Q2, Q3, Q4

    let quarterDateFrom = dateFrom;
    let quarterDateTo = dateTo;
    if (quarter) {
      const year = dateTo.substring(0, 4);
      const quarterMap: Record<string, [string, string]> = {
        Q1: [`${year}-01-01`, `${year}-03-31`],
        Q2: [`${year}-04-01`, `${year}-06-30`],
        Q3: [`${year}-07-01`, `${year}-09-30`],
        Q4: [`${year}-10-01`, `${year}-12-31`],
      };
      if (quarterMap[quarter]) {
        [quarterDateFrom, quarterDateTo] = quarterMap[quarter];
      }
    }

    let vendorFilter = '';
    const params: (string | number)[] = [quarterDateFrom, quarterDateTo];
    if (vendorId) {
      vendorFilter = ' AND p.id = ?';
      params.push(Number(vendorId));
    }

    const vendors = db.prepare(`
      SELECT p.id as vendor_id, p.name as vendor_name, p.tin, p.address, p.type as vendor_type,
        dp.payment_date, dp.voucher_number as reference, dp.gross_amount as income_payment,
        dp.withholding_tax as tax_withheld,
        CASE
          WHEN p.type = 'professional' THEN 'WI010'
          WHEN p.type = 'supplier' THEN 'WI040'
          WHEN p.type = 'employee' THEN 'WC010'
          ELSE 'WI010'
        END as atc
      FROM disbursement_payments dp
      JOIN disbursement_requests dr ON dp.disbursement_id = dr.id
      LEFT JOIN payees p ON dr.payee_id = p.id
      WHERE dp.payment_date BETWEEN ? AND ? AND dp.withholding_tax > 0${vendorFilter}
      ORDER BY p.name, dp.payment_date
    `).all(...params);

    // Group by vendor
    const vendorMap: Record<string, {
      vendor_name: string; tin: string; address: string; atc: string;
      payments: { payment_date: string; reference: string; income_payment: number; tax_withheld: number }[];
      total_income: number; total_tax: number;
    }> = {};
    for (const row of vendors as any[]) {
      const key = row.vendor_id || row.vendor_name;
      if (!vendorMap[key]) {
        vendorMap[key] = {
          vendor_name: row.vendor_name,
          tin: row.tin,
          address: row.address,
          atc: row.atc,
          payments: [],
          total_income: 0,
          total_tax: 0,
        };
      }
      vendorMap[key].payments.push({
        payment_date: row.payment_date,
        reference: row.reference,
        income_payment: row.income_payment,
        tax_withheld: row.tax_withheld,
      });
      vendorMap[key].total_income += row.income_payment;
      vendorMap[key].total_tax += row.tax_withheld;
    }

    return NextResponse.json({
      form: 'BIR 2307',
      period: { from: quarterDateFrom, to: quarterDateTo, quarter },
      vendors: Object.values(vendorMap),
    });
  }

  if (type === 'bir-2550m') {
    const month = req.nextUrl.searchParams.get('month'); // YYYY-MM
    let monthFrom = dateFrom;
    let monthTo = dateTo;
    if (month) {
      monthFrom = `${month}-01`;
      // Last day of month
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      monthTo = `${month}-${String(lastDay).padStart(2, '0')}`;
    }

    const outputVat = db.prepare(`
      SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code = '2210' AND je.entry_date BETWEEN ? AND ?
    `).get(monthFrom, monthTo) as { amount: number };

    const inputVat = db.prepare(`
      SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code = '2220' AND je.entry_date BETWEEN ? AND ?
    `).get(monthFrom, monthTo) as { amount: number };

    // Revenue breakdown for sales amounts
    const salesBreakdown = db.prepare(`
      SELECT coa.account_code, coa.account_name,
        COALESCE(SUM(jel.credit - jel.debit), 0) as amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code LIKE '4%' AND je.entry_date BETWEEN ? AND ?
      GROUP BY coa.id ORDER BY coa.account_code
    `).all(monthFrom, monthTo) as { account_code: string; account_name: string; amount: number }[];

    const totalSales = salesBreakdown.reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      form: 'BIR 2550M',
      period: { month: month || `${monthFrom} to ${monthTo}`, from: monthFrom, to: monthTo },
      taxable_sales: totalSales,
      exempt_sales: 0,
      zero_rated_sales: 0,
      output_vat: outputVat.amount,
      input_vat: inputVat.amount,
      vat_payable: outputVat.amount - inputVat.amount,
      sales_breakdown: salesBreakdown,
    });
  }

  if (type === 'bir-1601e') {
    const month = req.nextUrl.searchParams.get('month'); // YYYY-MM
    let monthFrom = dateFrom;
    let monthTo = dateTo;
    if (month) {
      monthFrom = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      monthTo = `${month}-${String(lastDay).padStart(2, '0')}`;
    }

    const totalEwt = db.prepare(`
      SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code = '2120' AND je.entry_date BETWEEN ? AND ?
    `).get(monthFrom, monthTo) as { amount: number };

    // Breakdown by nature from disbursement payments
    const byNature = db.prepare(`
      SELECT
        CASE
          WHEN p.type = 'professional' THEN 'Professional Fees'
          WHEN p.type = 'rental' THEN 'Rental'
          WHEN p.type = 'contractor' THEN 'Contractor'
          WHEN p.type = 'supplier' THEN 'Supplies/Goods'
          ELSE 'Other'
        END as nature,
        CASE
          WHEN p.type = 'professional' THEN 'WI010'
          WHEN p.type = 'rental' THEN 'WI020'
          WHEN p.type = 'contractor' THEN 'WI030'
          WHEN p.type = 'supplier' THEN 'WI040'
          ELSE 'WI010'
        END as atc,
        COALESCE(SUM(dp.gross_amount), 0) as tax_base,
        COALESCE(SUM(dp.withholding_tax), 0) as tax_withheld
      FROM disbursement_payments dp
      JOIN disbursement_requests dr ON dp.disbursement_id = dr.id
      LEFT JOIN payees p ON dr.payee_id = p.id
      WHERE dp.payment_date BETWEEN ? AND ? AND dp.withholding_tax > 0
      GROUP BY nature ORDER BY nature
    `).all(monthFrom, monthTo);

    return NextResponse.json({
      form: 'BIR 1601-E',
      period: { month: month || `${monthFrom} to ${monthTo}`, from: monthFrom, to: monthTo },
      total_taxes_withheld: totalEwt.amount,
      breakdown_by_nature: byNature,
    });
  }

  if (type === 'bir-0619e') {
    const month = req.nextUrl.searchParams.get('month'); // YYYY-MM
    let monthFrom = dateFrom;
    let monthTo = dateTo;
    if (month) {
      monthFrom = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      monthTo = `${month}-${String(lastDay).padStart(2, '0')}`;
    }

    const totalRemittance = db.prepare(`
      SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code = '2120' AND je.entry_date BETWEEN ? AND ?
    `).get(monthFrom, monthTo) as { amount: number };

    const byAtc = db.prepare(`
      SELECT
        CASE
          WHEN p.type = 'professional' THEN 'WI010'
          WHEN p.type = 'supplier' THEN 'WI040'
          WHEN p.type = 'contractor' THEN 'WI030'
          WHEN p.type = 'employee' THEN 'WC010'
          ELSE 'WI010'
        END as atc,
        CASE
          WHEN p.type = 'professional' THEN 'Professional Fees'
          WHEN p.type = 'supplier' THEN 'Supplies/Goods'
          WHEN p.type = 'contractor' THEN 'Contractor'
          WHEN p.type = 'employee' THEN 'Compensation'
          ELSE 'Other'
        END as description,
        COALESCE(SUM(dp.gross_amount), 0) as tax_base,
        COALESCE(SUM(dp.withholding_tax), 0) as tax_withheld
      FROM disbursement_payments dp
      JOIN disbursement_requests dr ON dp.disbursement_id = dr.id
      LEFT JOIN payees p ON dr.payee_id = p.id
      WHERE dp.payment_date BETWEEN ? AND ? AND dp.withholding_tax > 0
      GROUP BY atc ORDER BY atc
    `).all(monthFrom, monthTo);

    return NextResponse.json({
      form: 'BIR 0619-E',
      period: { month: month || `${monthFrom} to ${monthTo}`, from: monthFrom, to: monthTo },
      total_amount: totalRemittance.amount,
      breakdown_by_atc: byAtc,
    });
  }

  if (type === 'qap') {
    const quarter = req.nextUrl.searchParams.get('quarter'); // Q1, Q2, Q3, Q4
    const year = req.nextUrl.searchParams.get('year') || dateTo.substring(0, 4);

    let qFrom = dateFrom;
    let qTo = dateTo;
    if (quarter) {
      const quarterMap: Record<string, [string, string]> = {
        Q1: [`${year}-01-01`, `${year}-03-31`],
        Q2: [`${year}-04-01`, `${year}-06-30`],
        Q3: [`${year}-07-01`, `${year}-09-30`],
        Q4: [`${year}-10-01`, `${year}-12-31`],
      };
      if (quarterMap[quarter]) {
        [qFrom, qTo] = quarterMap[quarter];
      }
    }

    const payees = db.prepare(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY p.name) as seq_no,
        p.tin,
        p.name as vendor_name,
        CASE
          WHEN p.type = 'professional' THEN 'WI010'
          WHEN p.type = 'supplier' THEN 'WI040'
          WHEN p.type = 'contractor' THEN 'WI030'
          WHEN p.type = 'employee' THEN 'WC010'
          ELSE 'WI010'
        END as atc,
        COALESCE(SUM(dp.gross_amount), 0) as income_payment,
        COALESCE(SUM(dp.withholding_tax), 0) as tax_withheld
      FROM disbursement_payments dp
      JOIN disbursement_requests dr ON dp.disbursement_id = dr.id
      LEFT JOIN payees p ON dr.payee_id = p.id
      WHERE dp.payment_date BETWEEN ? AND ? AND dp.withholding_tax > 0
      GROUP BY p.id ORDER BY p.name
    `).all(qFrom, qTo);

    return NextResponse.json({
      form: 'QAP - Quarterly Alphalist of Payees',
      period: { quarter, year, from: qFrom, to: qTo },
      payees,
      total_income: (payees as any[]).reduce((s, r) => s + r.income_payment, 0),
      total_tax: (payees as any[]).reduce((s, r) => s + r.tax_withheld, 0),
    });
  }

  if (type === 'sawt') {
    const quarter = req.nextUrl.searchParams.get('quarter');
    const year = req.nextUrl.searchParams.get('year') || dateTo.substring(0, 4);

    let sFrom = dateFrom;
    let sTo = dateTo;
    if (quarter) {
      const quarterMap: Record<string, [string, string]> = {
        Q1: [`${year}-01-01`, `${year}-03-31`],
        Q2: [`${year}-04-01`, `${year}-06-30`],
        Q3: [`${year}-07-01`, `${year}-09-30`],
        Q4: [`${year}-10-01`, `${year}-12-31`],
      };
      if (quarterMap[quarter]) {
        [sFrom, sTo] = quarterMap[quarter];
      }
    }

    const summary = db.prepare(`
      SELECT
        CASE
          WHEN p.type = 'professional' THEN 'WI010'
          WHEN p.type = 'supplier' THEN 'WI040'
          WHEN p.type = 'contractor' THEN 'WI030'
          WHEN p.type = 'employee' THEN 'WC010'
          ELSE 'WI010'
        END as atc,
        CASE
          WHEN p.type = 'professional' THEN 'Professional Fees'
          WHEN p.type = 'supplier' THEN 'Supplies/Goods'
          WHEN p.type = 'contractor' THEN 'Contractor'
          WHEN p.type = 'employee' THEN 'Compensation'
          ELSE 'Other'
        END as description,
        COALESCE(SUM(dp.gross_amount), 0) as tax_base,
        CASE
          WHEN p.type = 'professional' THEN 0.10
          WHEN p.type = 'supplier' THEN 0.01
          WHEN p.type = 'contractor' THEN 0.02
          WHEN p.type = 'employee' THEN 0.05
          ELSE 0.10
        END as tax_rate,
        COALESCE(SUM(dp.withholding_tax), 0) as tax_withheld
      FROM disbursement_payments dp
      JOIN disbursement_requests dr ON dp.disbursement_id = dr.id
      LEFT JOIN payees p ON dr.payee_id = p.id
      WHERE dp.payment_date BETWEEN ? AND ? AND dp.withholding_tax > 0
      GROUP BY atc ORDER BY atc
    `).all(sFrom, sTo);

    return NextResponse.json({
      form: 'SAWT - Summary Alphalist of Withholding Taxes',
      period: { quarter, year, from: sFrom, to: sTo },
      summary,
      total_tax_base: (summary as any[]).reduce((s, r) => s + r.tax_base, 0),
      total_tax_withheld: (summary as any[]).reduce((s, r) => s + r.tax_withheld, 0),
    });
  }

  if (type === 'special-journals') {
    const journalType = req.nextUrl.searchParams.get('journal_type');

    if (journalType === 'cash-receipts') {
      const entries = db.prepare(`
        SELECT je.entry_date as date, je.entry_number as or_number,
          jel.description, jel.debit as amount,
          coa.account_code, coa.account_name
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE coa.account_code BETWEEN '1010' AND '1050'
          AND jel.debit > 0
          AND je.entry_date BETWEEN ? AND ?
        ORDER BY je.entry_date, je.entry_number
      `).all(dateFrom, dateTo);

      return NextResponse.json({
        journal: 'Cash Receipts Journal',
        period: { from: dateFrom, to: dateTo },
        entries,
        total: (entries as any[]).reduce((s, r) => s + r.amount, 0),
      });
    }

    if (journalType === 'cash-disbursements') {
      const entries = db.prepare(`
        SELECT je.entry_date as date, je.entry_number as cv_number,
          jel.description, jel.credit as amount,
          coa.account_code, coa.account_name
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE coa.account_code BETWEEN '1010' AND '1050'
          AND jel.credit > 0
          AND je.entry_date BETWEEN ? AND ?
        ORDER BY je.entry_date, je.entry_number
      `).all(dateFrom, dateTo);

      // Try to get check numbers from disbursement_payments if available
      const withChecks = db.prepare(`
        SELECT dp.voucher_number as cv_number, dp.check_number, dp.payment_date as date,
          p.name as payee, dp.net_amount as amount, dr.description
        FROM disbursement_payments dp
        JOIN disbursement_requests dr ON dp.disbursement_id = dr.id
        LEFT JOIN payees p ON dr.payee_id = p.id
        WHERE dp.payment_date BETWEEN ? AND ?
        ORDER BY dp.payment_date, dp.voucher_number
      `).all(dateFrom, dateTo);

      return NextResponse.json({
        journal: 'Cash Disbursements Journal',
        period: { from: dateFrom, to: dateTo },
        entries,
        disbursements: withChecks,
        total: (entries as any[]).reduce((s, r) => s + r.amount, 0),
      });
    }

    if (journalType === 'sales') {
      const entries = db.prepare(`
        SELECT je.entry_date as date, je.entry_number as invoice_number,
          je.description as customer, jel.description,
          jel.credit as amount,
          coa.account_code, coa.account_name
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE coa.account_code LIKE '4%'
          AND jel.credit > 0
          AND je.entry_date BETWEEN ? AND ?
        ORDER BY je.entry_date, je.entry_number
      `).all(dateFrom, dateTo);

      return NextResponse.json({
        journal: 'Sales Journal',
        period: { from: dateFrom, to: dateTo },
        entries,
        total: (entries as any[]).reduce((s, r) => s + r.amount, 0),
      });
    }

    if (journalType === 'purchases') {
      const entries = db.prepare(`
        SELECT je.entry_date as date, je.entry_number as reference,
          je.description, jel.description as line_description,
          jel.debit as amount,
          coa.account_code, coa.account_name
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE (coa.account_code LIKE '5%' OR coa.account_code = '2010')
          AND jel.debit > 0
          AND je.entry_date BETWEEN ? AND ?
        ORDER BY je.entry_date, je.entry_number
      `).all(dateFrom, dateTo);

      return NextResponse.json({
        journal: 'Purchases Journal',
        period: { from: dateFrom, to: dateTo },
        entries,
        total: (entries as any[]).reduce((s, r) => s + r.amount, 0),
      });
    }

    return NextResponse.json({ error: 'Unknown journal_type. Use: cash-receipts, cash-disbursements, sales, purchases' }, { status: 400 });
  }

  return NextResponse.json({ error: 'Unknown tax report type' }, { status: 400 });
}
