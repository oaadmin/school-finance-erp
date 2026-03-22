import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    // Total receivables
    const totalReceivables = db.prepare(`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM ar_invoices
      WHERE status NOT IN ('cancelled', 'voided')
    `).get() as { total: number };

    // Total payables
    const totalPayables = db.prepare(`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM ap_bills
      WHERE status NOT IN ('cancelled', 'voided')
    `).get() as { total: number };

    // Cash balance (accounts 1010-1050)
    const cashBalance = db.prepare(`
      SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as total
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE je.status = 'posted'
        AND coa.account_code IN ('1010', '1020', '1030', '1040', '1050')
    `).get() as { total: number };

    // Current month revenue, expenses, net income
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    const monthStart = currentMonthStart.toISOString().split('T')[0];
    const nextMonth = new Date(currentMonthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split('T')[0];

    const monthlyRevenue = db.prepare(`
      SELECT COALESCE(SUM(jel.credit - jel.debit), 0) as total
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE je.status = 'posted'
        AND coa.account_type = 'revenue'
        AND je.entry_date >= ? AND je.entry_date < ?
    `).get(monthStart, monthEnd) as { total: number };

    const monthlyExpenses = db.prepare(`
      SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as total
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE je.status = 'posted'
        AND coa.account_type = 'expense'
        AND je.entry_date >= ? AND je.entry_date < ?
    `).get(monthStart, monthEnd) as { total: number };

    // Recent journal entries (last 10)
    const recentJournalEntries = db.prepare(`
      SELECT id, entry_number, entry_date, description, reference_type,
        total_debit, total_credit, status
      FROM journal_entries
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    // Unposted entries count
    const unpostedCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM journal_entries
      WHERE status = 'draft'
    `).get() as { count: number };

    // AR aging summary
    const arAging = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN julianday('now') - julianday(due_date) <= 0 THEN balance ELSE 0 END), 0) as current_amount,
        COALESCE(SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 1 AND 30 THEN balance ELSE 0 END), 0) as days_30,
        COALESCE(SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 31 AND 60 THEN balance ELSE 0 END), 0) as days_60,
        COALESCE(SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 61 AND 90 THEN balance ELSE 0 END), 0) as days_90,
        COALESCE(SUM(CASE WHEN julianday('now') - julianday(due_date) > 90 THEN balance ELSE 0 END), 0) as over_90
      FROM ar_invoices
      WHERE status NOT IN ('cancelled', 'voided', 'paid')
        AND balance > 0
    `).get();

    // AP aging summary
    const apAging = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN julianday('now') - julianday(due_date) <= 0 THEN balance ELSE 0 END), 0) as current_amount,
        COALESCE(SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 1 AND 30 THEN balance ELSE 0 END), 0) as days_30,
        COALESCE(SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 31 AND 60 THEN balance ELSE 0 END), 0) as days_60,
        COALESCE(SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 61 AND 90 THEN balance ELSE 0 END), 0) as days_90,
        COALESCE(SUM(CASE WHEN julianday('now') - julianday(due_date) > 90 THEN balance ELSE 0 END), 0) as over_90
      FROM ap_bills
      WHERE status NOT IN ('cancelled', 'voided', 'paid')
        AND balance > 0
    `).get();

    // Top 5 expense categories
    const topExpenseCategories = db.prepare(`
      SELECT coa.account_name as category,
        COALESCE(SUM(jel.debit - jel.credit), 0) as total
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE je.status = 'posted'
        AND coa.account_type = 'expense'
      GROUP BY coa.id
      HAVING total > 0
      ORDER BY total DESC
      LIMIT 5
    `).all();

    // Top 5 vendors by payment amount
    const topVendors = db.prepare(`
      SELECT p.name as vendor,
        COALESCE(SUM(ap.net_amount), 0) as total_paid
      FROM ap_payments ap
      JOIN payees p ON ap.vendor_id = p.id
      WHERE ap.status = 'completed'
      GROUP BY p.id
      ORDER BY total_paid DESC
      LIMIT 5
    `).all();

    return NextResponse.json({
      totalReceivables: totalReceivables.total,
      totalPayables: totalPayables.total,
      cashBalance: cashBalance.total,
      currentMonth: {
        revenue: monthlyRevenue.total,
        expenses: monthlyExpenses.total,
        netIncome: monthlyRevenue.total - monthlyExpenses.total,
      },
      recentJournalEntries,
      unpostedCount: unpostedCount.count,
      arAging,
      apAging,
      topExpenseCategories,
      topVendors,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
