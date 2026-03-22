import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const type = req.nextUrl.searchParams.get('type') || 'trial-balance';
  const dateFrom = req.nextUrl.searchParams.get('date_from') || '2025-06-01';
  const dateTo = req.nextUrl.searchParams.get('date_to') || '2026-05-31';
  const accountCode = req.nextUrl.searchParams.get('account');
  const payeeId = req.nextUrl.searchParams.get('payee_id');

  if (type === 'trial-balance') {
    const data = db.prepare(`
      SELECT coa.account_code, coa.account_name, coa.account_type,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit,
        COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        AND je.status = 'posted'
        AND je.entry_date BETWEEN ? AND ?
      GROUP BY coa.id
      HAVING total_debit > 0 OR total_credit > 0
      ORDER BY coa.account_code
    `).all(dateFrom, dateTo);

    const totalDebit = (data as Array<{total_debit: number}>).reduce((s, r) => s + r.total_debit, 0);
    const totalCredit = (data as Array<{total_credit: number}>).reduce((s, r) => s + r.total_credit, 0);
    return NextResponse.json({ data, totals: { totalDebit, totalCredit, difference: totalDebit - totalCredit } });
  }

  if (type === 'balance-sheet') {
    const types = ['asset', 'liability', 'equity'];
    const result: Record<string, unknown[]> = {};
    for (const t of types) {
      result[t] = db.prepare(`
        SELECT coa.account_code, coa.account_name, coa.account_type,
          COALESCE(SUM(CASE WHEN je.entry_date <= ? THEN jel.debit - jel.credit ELSE 0 END), 0) as current_balance,
          COALESCE(SUM(CASE WHEN je.entry_date <= date(?, '-1 year') THEN jel.debit - jel.credit ELSE 0 END), 0) as previous_balance
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
        WHERE coa.account_type = ?
        GROUP BY coa.id
        HAVING ABS(current_balance) > 0 OR ABS(previous_balance) > 0
        ORDER BY coa.account_code
      `).all(dateTo, dateTo, t);
    }
    // For liabilities/equity, natural balance = credit - debit (negate the debit-credit result)
    const flipSign = (items: unknown[]) => (items as Array<{current_balance: number; previous_balance: number}>).map(i => ({
      ...i,
      current_balance: -i.current_balance,
      previous_balance: -i.previous_balance,
    }));
    result.liability = flipSign(result.liability);
    result.equity = flipSign(result.equity);

    // Calculate current period net income (Revenue - Expenses) to include in Equity
    const netIncomeRow = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN jel.credit - jel.debit ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN jel.debit - jel.credit ELSE 0 END), 0) as net_income
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_type IN ('revenue', 'expense')
        AND je.entry_date <= ?
    `).get(dateTo) as { net_income: number } | undefined;

    const netIncome = netIncomeRow?.net_income || 0;

    // Add net income as a virtual equity line item
    if (Math.abs(netIncome) > 0) {
      (result.equity as Array<Record<string, unknown>>).push({
        account_code: '',
        account_name: 'Current Year Net Income',
        account_type: 'equity',
        current_balance: netIncome,
        previous_balance: 0,
      });
    }

    const sum = (items: unknown[], key: string) => (items as Array<Record<string, number>>).reduce((s, i) => s + (i[key] || 0), 0);
    const totalEquity = sum(result.equity, 'current_balance');
    const totalLiabilities = sum(result.liability, 'current_balance');
    const totalAssets = sum(result.asset, 'current_balance');

    return NextResponse.json({
      assets: result.asset,
      liabilities: result.liability,
      equity: result.equity,
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity,
      },
      asOfDate: dateTo,
    });
  }

  if (type === 'income-statement') {
    const revenue = db.prepare(`
      SELECT coa.account_code, coa.account_name,
        COALESCE(SUM(CASE WHEN je.entry_date BETWEEN ? AND ? THEN jel.credit - jel.debit ELSE 0 END), 0) as current_amount,
        COALESCE(SUM(CASE WHEN je.entry_date BETWEEN date(?, '-1 year') AND date(?, '-1 year') THEN jel.credit - jel.debit ELSE 0 END), 0) as previous_amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      WHERE coa.account_type = 'revenue'
      GROUP BY coa.id HAVING ABS(current_amount) > 0
      ORDER BY coa.account_code
    `).all(dateFrom, dateTo, dateFrom, dateTo);

    const costOfServices = db.prepare(`
      SELECT coa.account_code, coa.account_name,
        COALESCE(SUM(CASE WHEN je.entry_date BETWEEN ? AND ? THEN jel.debit - jel.credit ELSE 0 END), 0) as current_amount,
        COALESCE(SUM(CASE WHEN je.entry_date BETWEEN date(?, '-1 year') AND date(?, '-1 year') THEN jel.debit - jel.credit ELSE 0 END), 0) as previous_amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      WHERE coa.account_code LIKE '45%'
      GROUP BY coa.id HAVING ABS(current_amount) > 0
      ORDER BY coa.account_code
    `).all(dateFrom, dateTo, dateFrom, dateTo);

    const expenses = db.prepare(`
      SELECT coa.account_code, coa.account_name,
        COALESCE(SUM(CASE WHEN je.entry_date BETWEEN ? AND ? THEN jel.debit - jel.credit ELSE 0 END), 0) as current_amount,
        COALESCE(SUM(CASE WHEN je.entry_date BETWEEN date(?, '-1 year') AND date(?, '-1 year') THEN jel.debit - jel.credit ELSE 0 END), 0) as previous_amount
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      WHERE coa.account_code LIKE '5%' AND coa.account_code NOT LIKE '45%'
      GROUP BY coa.id HAVING ABS(current_amount) > 0
      ORDER BY coa.account_code
    `).all(dateFrom, dateTo, dateFrom, dateTo);

    const sumAmt = (items: unknown[]) => (items as Array<{current_amount: number}>).reduce((s, i) => s + i.current_amount, 0);
    const totalRevenue = sumAmt(revenue);
    const totalCOS = sumAmt(costOfServices);
    const totalExpenses = sumAmt(expenses);

    return NextResponse.json({
      revenue, costOfServices, expenses,
      totals: {
        totalRevenue, totalCOS,
        grossProfit: totalRevenue - totalCOS,
        totalExpenses,
        netIncome: totalRevenue - totalCOS - totalExpenses,
      },
      period: { from: dateFrom, to: dateTo },
    });
  }

  if (type === 'cash-flow') {
    // Cash accounts
    const cashAccounts = ['1010', '1020', '1030', '1040', '1050'];
    const cashWhere = cashAccounts.map(c => `coa.account_code = '${c}'`).join(' OR ');

    const operating = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN jel.credit - jel.debit ELSE 0 END), 0) as cash_from_revenue,
        COALESCE(SUM(CASE WHEN coa.account_code LIKE '5%' THEN jel.debit - jel.credit ELSE 0 END), 0) as cash_for_expenses,
        COALESCE(SUM(CASE WHEN coa.account_code LIKE '59%' THEN jel.debit - jel.credit ELSE 0 END), 0) as depreciation
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE je.entry_date BETWEEN ? AND ?
    `).get(dateFrom, dateTo) as { cash_from_revenue: number; cash_for_expenses: number; depreciation: number };

    const investing = db.prepare(`
      SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as equipment_purchases
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code LIKE '15%' AND je.entry_date BETWEEN ? AND ?
    `).get(dateFrom, dateTo) as { equipment_purchases: number };

    const financing = db.prepare(`
      SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as loan_payments
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE (coa.account_code LIKE '26%' OR coa.account_code LIKE '27%') AND je.entry_date BETWEEN ? AND ?
    `).get(dateFrom, dateTo) as { loan_payments: number };

    const netOperating = operating.cash_from_revenue - operating.cash_for_expenses + operating.depreciation;
    const netInvesting = -(investing.equipment_purchases);
    const netFinancing = financing.loan_payments;

    return NextResponse.json({
      operating: { ...operating, net: netOperating },
      investing: { ...investing, net: netInvesting },
      financing: { ...financing, net: netFinancing },
      netCashFlow: netOperating + netInvesting + netFinancing,
      period: { from: dateFrom, to: dateTo },
    });
  }

  if (type === 'general-ledger') {
    let query = `
      SELECT je.entry_date, je.entry_number, je.description as je_description,
        coa.account_code, coa.account_name,
        jel.description, jel.debit, jel.credit
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE je.entry_date BETWEEN ? AND ?
    `;
    const params: (string | number)[] = [dateFrom, dateTo];
    if (accountCode) {
      query += ' AND coa.account_code = ?';
      params.push(accountCode);
    }
    query += ' ORDER BY coa.account_code, je.entry_date, je.id';
    const data = db.prepare(query).all(...params);

    const accounts = db.prepare(`
      SELECT account_code, account_name FROM chart_of_accounts
      WHERE account_code IN (SELECT DISTINCT coa.account_code FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE je.status = 'posted')
      ORDER BY account_code
    `).all();

    return NextResponse.json({ data, accounts });
  }

  if (type === 'subsidiary-ledger') {
    const ledgerType = req.nextUrl.searchParams.get('ledger_type') || 'payables';
    let data;
    if (ledgerType === 'payables') {
      data = db.prepare(`
        SELECT dp.payment_date as date, dp.voucher_number as reference,
          p.name as payee, dr.description,
          dp.gross_amount as debit, 0 as credit, dp.net_amount as amount
        FROM disbursement_payments dp
        JOIN disbursement_requests dr ON dp.disbursement_id = dr.id
        LEFT JOIN payees p ON dr.payee_id = p.id
        WHERE dp.payment_date BETWEEN ? AND ?
        ${payeeId ? 'AND dr.payee_id = ?' : ''}
        ORDER BY dp.payment_date
      `).all(...(payeeId ? [dateFrom, dateTo, payeeId] : [dateFrom, dateTo]));
    } else {
      data = db.prepare(`
        SELECT je.entry_date as date, je.entry_number as reference,
          je.description, jel.debit, jel.credit
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE coa.account_code LIKE '11%' AND je.entry_date BETWEEN ? AND ?
        ORDER BY je.entry_date
      `).all(dateFrom, dateTo);
    }
    return NextResponse.json({ data, ledgerType });
  }

  if (type === 'journal-entries') {
    const status = req.nextUrl.searchParams.get('status');
    let query = `
      SELECT je.id, je.entry_number, je.entry_date, je.description, je.status,
        je.reference_type, je.total_debit, je.total_credit
      FROM journal_entries je
      WHERE je.entry_date BETWEEN ? AND ?
    `;
    const params: (string | number)[] = [dateFrom, dateTo];
    if (status) { query += ' AND je.status = ?'; params.push(status); }
    query += ' ORDER BY je.entry_date DESC, je.id DESC';
    const entries = db.prepare(query).all(...params);

    // Get lines for each entry
    const getLines = db.prepare(`
      SELECT jel.*, coa.account_code, coa.account_name
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE jel.journal_entry_id = ?
    `);
    const data = (entries as Array<{id: number}>).map(e => ({
      ...e,
      lines: getLines.all(e.id),
    }));

    return NextResponse.json({ data });
  }

  if (type === 'expense-schedule') {
    const data = db.prepare(`
      SELECT coa.account_code, coa.account_name,
        COALESCE(SUM(jel.debit - jel.credit), 0) as amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_type = 'expense' AND je.entry_date BETWEEN ? AND ?
      GROUP BY coa.id
      HAVING amount > 0
      ORDER BY amount DESC
    `).all(dateFrom, dateTo);

    const total = (data as Array<{amount: number}>).reduce((s, r) => s + r.amount, 0);
    const withPct = (data as Array<{amount: number}>).map(r => ({ ...r, percentage: total > 0 ? ((r.amount / total) * 100).toFixed(1) : '0' }));
    return NextResponse.json({ data: withPct, total });
  }

  if (type === 'ap-aging') {
    const data = db.prepare(`
      SELECT p.payee_code, p.name as payee, p.tin,
        SUM(CASE WHEN julianday('now') - julianday(dr.due_date) <= 0 THEN dr.amount ELSE 0 END) as current_amount,
        SUM(CASE WHEN julianday('now') - julianday(dr.due_date) BETWEEN 1 AND 30 THEN dr.amount ELSE 0 END) as days_30,
        SUM(CASE WHEN julianday('now') - julianday(dr.due_date) BETWEEN 31 AND 60 THEN dr.amount ELSE 0 END) as days_60,
        SUM(CASE WHEN julianday('now') - julianday(dr.due_date) BETWEEN 61 AND 90 THEN dr.amount ELSE 0 END) as days_90,
        SUM(CASE WHEN julianday('now') - julianday(dr.due_date) > 90 THEN dr.amount ELSE 0 END) as over_90,
        SUM(dr.amount) as total
      FROM disbursement_requests dr
      JOIN payees p ON dr.payee_id = p.id
      WHERE dr.status IN ('approved', 'pending_approval')
      GROUP BY p.id
      HAVING total > 0
      ORDER BY total DESC
    `).all();
    return NextResponse.json({ data });
  }

  if (type === 'ar-aging') {
    // Simulated AR data from receivable accounts
    const data = db.prepare(`
      SELECT coa.account_name as description,
        COALESCE(SUM(jel.debit - jel.credit), 0) as total
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id AND je.status = 'posted'
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_code LIKE '11%' AND je.entry_date BETWEEN ? AND ?
      GROUP BY coa.id
      HAVING total > 0
    `).all(dateFrom, dateTo);
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
}
