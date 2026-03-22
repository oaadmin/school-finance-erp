import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'finance.db')
  : path.join(process.cwd(), 'finance.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      head TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cost_centers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fund_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_code TEXT UNIQUE NOT NULL,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      parent_id INTEGER REFERENCES chart_of_accounts(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'requestor',
      department_id INTEGER REFERENCES departments(id),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_name TEXT NOT NULL,
      school_year TEXT NOT NULL,
      department_id INTEGER NOT NULL REFERENCES departments(id),
      category_id INTEGER NOT NULL REFERENCES expense_categories(id),
      cost_center_id INTEGER REFERENCES cost_centers(id),
      fund_source_id INTEGER REFERENCES fund_sources(id),
      project TEXT,
      campus TEXT DEFAULT 'Main',
      annual_budget REAL NOT NULL DEFAULT 0,
      committed REAL NOT NULL DEFAULT 0,
      actual REAL NOT NULL DEFAULT 0,
      budget_owner TEXT,
      status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget_monthly_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      month INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      committed REAL NOT NULL DEFAULT 0,
      actual REAL NOT NULL DEFAULT 0,
      UNIQUE(budget_id, month)
    );

    CREATE TABLE IF NOT EXISTS payees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payee_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'vendor',
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      tin TEXT,
      bank_name TEXT,
      bank_account_number TEXT,
      bank_branch TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS disbursement_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_number TEXT UNIQUE NOT NULL,
      request_date TEXT NOT NULL,
      due_date TEXT,
      payee_id INTEGER REFERENCES payees(id),
      payee_type TEXT DEFAULT 'vendor',
      department_id INTEGER NOT NULL REFERENCES departments(id),
      category_id INTEGER NOT NULL REFERENCES expense_categories(id),
      cost_center_id INTEGER REFERENCES cost_centers(id),
      fund_source_id INTEGER REFERENCES fund_sources(id),
      budget_id INTEGER REFERENCES budgets(id),
      project TEXT,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'PHP',
      payment_method TEXT DEFAULT 'bank_transfer',
      description TEXT,
      requested_by INTEGER REFERENCES users(id),
      status TEXT DEFAULT 'draft',
      current_approver_role TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS disbursement_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disbursement_id INTEGER NOT NULL REFERENCES disbursement_requests(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_cost REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      account_code TEXT,
      tax_code TEXT,
      remarks TEXT
    );

    CREATE TABLE IF NOT EXISTS disbursement_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disbursement_id INTEGER NOT NULL REFERENCES disbursement_requests(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      file_path TEXT,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS disbursement_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disbursement_id INTEGER NOT NULL REFERENCES disbursement_requests(id) ON DELETE CASCADE,
      approver_id INTEGER REFERENCES users(id),
      approver_role TEXT NOT NULL,
      action TEXT NOT NULL,
      comments TEXT,
      acted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS disbursement_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disbursement_id INTEGER NOT NULL REFERENCES disbursement_requests(id),
      voucher_number TEXT UNIQUE NOT NULL,
      payment_date TEXT NOT NULL,
      bank_account TEXT,
      payment_method TEXT NOT NULL,
      check_number TEXT,
      reference_number TEXT,
      gross_amount REAL NOT NULL,
      withholding_tax REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      status TEXT DEFAULT 'completed',
      proof_of_payment TEXT,
      notes TEXT,
      processed_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_number TEXT UNIQUE NOT NULL,
      entry_date TEXT NOT NULL,
      description TEXT,
      reference_type TEXT,
      reference_id INTEGER,
      total_debit REAL DEFAULT 0,
      total_credit REAL DEFAULT 0,
      status TEXT DEFAULT 'posted',
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journal_entry_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES chart_of_accounts(id),
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      action TEXT NOT NULL,
      old_values TEXT,
      new_values TEXT,
      performed_by TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      category TEXT DEFAULT 'general',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounting_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_name TEXT NOT NULL,
      school_year TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      closed_by TEXT,
      closed_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ap_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT UNIQUE NOT NULL,
      bill_date TEXT NOT NULL,
      posting_date TEXT,
      due_date TEXT,
      vendor_id INTEGER REFERENCES payees(id),
      department_id INTEGER REFERENCES departments(id),
      campus TEXT DEFAULT 'Main',
      description TEXT,
      gross_amount REAL DEFAULT 0,
      vat_amount REAL DEFAULT 0,
      withholding_tax REAL DEFAULT 0,
      net_payable REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      payment_terms TEXT,
      reference_number TEXT,
      journal_entry_id INTEGER REFERENCES journal_entries(id),
      status TEXT DEFAULT 'draft',
      created_by INTEGER REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ap_bill_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL REFERENCES ap_bills(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES chart_of_accounts(id),
      description TEXT,
      quantity REAL DEFAULT 1,
      unit_cost REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      tax_code TEXT,
      withholding_tax_code TEXT,
      department_id INTEGER REFERENCES departments(id),
      project TEXT,
      fund_source_id INTEGER REFERENCES fund_sources(id)
    );

    CREATE TABLE IF NOT EXISTS ap_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_number TEXT UNIQUE NOT NULL,
      payment_date TEXT NOT NULL,
      vendor_id INTEGER REFERENCES payees(id),
      payment_method TEXT DEFAULT 'bank_transfer',
      bank_account TEXT,
      check_number TEXT,
      reference_number TEXT,
      gross_amount REAL DEFAULT 0,
      withholding_tax REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      journal_entry_id INTEGER REFERENCES journal_entries(id),
      status TEXT DEFAULT 'draft',
      processed_by INTEGER REFERENCES users(id),
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ap_payment_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL REFERENCES ap_payments(id) ON DELETE CASCADE,
      bill_id INTEGER NOT NULL REFERENCES ap_bills(id),
      amount_applied REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_code TEXT UNIQUE NOT NULL,
      customer_type TEXT DEFAULT 'student',
      name TEXT NOT NULL,
      campus TEXT DEFAULT 'Main',
      grade_level TEXT,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      billing_address TEXT,
      tin TEXT,
      default_ar_account_id INTEGER REFERENCES chart_of_accounts(id),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ar_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      invoice_date TEXT NOT NULL,
      posting_date TEXT,
      due_date TEXT,
      customer_id INTEGER REFERENCES customers(id),
      campus TEXT DEFAULT 'Main',
      school_year TEXT,
      semester TEXT,
      description TEXT,
      gross_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_receivable REAL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      reference_number TEXT,
      journal_entry_id INTEGER REFERENCES journal_entries(id),
      status TEXT DEFAULT 'draft',
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ar_invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES ar_invoices(id) ON DELETE CASCADE,
      fee_code TEXT,
      description TEXT,
      quantity REAL DEFAULT 1,
      unit_amount REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      revenue_account_id INTEGER REFERENCES chart_of_accounts(id),
      department_id INTEGER REFERENCES departments(id),
      tax_code TEXT,
      discount_type TEXT,
      discount_amount REAL DEFAULT 0,
      remarks TEXT
    );

    CREATE TABLE IF NOT EXISTS ar_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      collection_date TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      payment_method TEXT DEFAULT 'cash',
      bank_account TEXT,
      check_number TEXT,
      reference_number TEXT,
      amount_received REAL DEFAULT 0,
      applied_amount REAL DEFAULT 0,
      unapplied_amount REAL DEFAULT 0,
      journal_entry_id INTEGER REFERENCES journal_entries(id),
      collected_by INTEGER REFERENCES users(id),
      status TEXT DEFAULT 'draft',
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ar_collection_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL REFERENCES ar_collections(id) ON DELETE CASCADE,
      invoice_id INTEGER NOT NULL REFERENCES ar_invoices(id),
      amount_applied REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ar_credit_memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memo_number TEXT UNIQUE NOT NULL,
      memo_date TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      related_invoice_id INTEGER REFERENCES ar_invoices(id),
      reason TEXT,
      amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ap_debit_memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memo_number TEXT UNIQUE NOT NULL,
      memo_date TEXT NOT NULL,
      vendor_id INTEGER REFERENCES payees(id),
      related_bill_id INTEGER REFERENCES ap_bills(id),
      reason TEXT,
      amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recurring_journal_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_name TEXT NOT NULL,
      frequency TEXT DEFAULT 'monthly',
      start_date TEXT,
      end_date TEXT,
      default_description TEXT,
      auto_create INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recurring_journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES recurring_journal_templates(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES chart_of_accounts(id),
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0
    );
  `);

  // Seed data if tables are empty
  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number };
  if (deptCount.count === 0) {
    seedData(db);
  }
}

function seedData(db: Database.Database) {
  // Departments
  const insertDept = db.prepare('INSERT INTO departments (code, name, head) VALUES (?, ?, ?)');
  const depts = [
    ['IT', 'Information Technology', 'Juan Dela Cruz'],
    ['ACAD', 'Academics', 'Maria Santos'],
    ['MAINT', 'Maintenance & Facilities', 'Pedro Reyes'],
    ['ADMIN', 'Administration', 'Ana Garcia'],
    ['FIN', 'Finance', 'Roberto Tan'],
    ['HR', 'Human Resources', 'Elena Cruz'],
    ['STUDENT', 'Student Affairs', 'Carlos Mendoza'],
    ['LIBRARY', 'Library', 'Sofia Lim'],
  ];
  depts.forEach(d => insertDept.run(...d));

  // Expense categories
  const insertCat = db.prepare('INSERT INTO expense_categories (code, name, description) VALUES (?, ?, ?)');
  const cats = [
    ['SW', 'Software & Licenses', 'Software subscriptions and licenses'],
    ['HW', 'Hardware & Equipment', 'Computer hardware and equipment'],
    ['REP', 'Repairs & Maintenance', 'Building and equipment repairs'],
    ['SUP', 'Supplies & Materials', 'Office and classroom supplies'],
    ['BOOKS', 'Books & Publications', 'Textbooks and library acquisitions'],
    ['EVENTS', 'Events & Activities', 'School events and student activities'],
    ['UTIL', 'Utilities', 'Electricity, water, internet services'],
    ['TRAVEL', 'Travel & Transportation', 'Official travel and transportation'],
    ['PROF', 'Professional Services', 'Consulting and professional fees'],
    ['SALARY', 'Salaries & Benefits', 'Employee compensation'],
  ];
  cats.forEach(c => insertCat.run(...c));

  // Cost centers
  const insertCC = db.prepare('INSERT INTO cost_centers (code, name, department_id) VALUES (?, ?, ?)');
  const ccs = [
    ['CC-IT-001', 'IT Operations', 1],
    ['CC-ACAD-001', 'Academic Programs', 2],
    ['CC-MAINT-001', 'Facilities Management', 3],
    ['CC-ADMIN-001', 'General Administration', 4],
    ['CC-FIN-001', 'Financial Operations', 5],
  ];
  ccs.forEach(c => insertCC.run(...c));

  // Fund sources
  const insertFS = db.prepare('INSERT INTO fund_sources (code, name, description) VALUES (?, ?, ?)');
  const fss = [
    ['GF', 'General Fund', 'Main operating fund'],
    ['TF', 'Tuition Fund', 'Revenue from tuition fees'],
    ['SF', 'Special Fund', 'Donations and grants'],
    ['CF', 'Capital Fund', 'Capital expenditure fund'],
    ['MF', 'Maintenance Fund', 'Building maintenance reserve'],
  ];
  fss.forEach(f => insertFS.run(...f));

  // Chart of Accounts - Full Philippine Standard
  const insertCOA = db.prepare('INSERT INTO chart_of_accounts (account_code, account_name, account_type) VALUES (?, ?, ?)');
  const coas = [
    // Assets
    ['1000', 'Cash and Cash Equivalents', 'asset'],
    ['1010', 'Cash on Hand', 'asset'],
    ['1020', 'Cash in Bank - BDO', 'asset'],
    ['1030', 'Cash in Bank - BPI', 'asset'],
    ['1040', 'Cash in Bank - Metrobank', 'asset'],
    ['1050', 'Petty Cash Fund', 'asset'],
    ['1100', 'Accounts Receivable', 'asset'],
    ['1110', 'Tuition Receivable', 'asset'],
    ['1120', 'Other Receivables', 'asset'],
    ['1150', 'Allowance for Doubtful Accounts', 'asset'],
    ['1200', 'Prepaid Expenses', 'asset'],
    ['1210', 'Prepaid Insurance', 'asset'],
    ['1220', 'Prepaid Rent', 'asset'],
    ['1230', 'Prepaid Supplies', 'asset'],
    ['1300', 'Inventories', 'asset'],
    ['1310', 'School Supplies Inventory', 'asset'],
    ['1500', 'Property and Equipment', 'asset'],
    ['1510', 'Land', 'asset'],
    ['1520', 'Buildings', 'asset'],
    ['1530', 'Furniture and Fixtures', 'asset'],
    ['1540', 'Office Equipment', 'asset'],
    ['1550', 'Computer Equipment', 'asset'],
    ['1560', 'Transportation Equipment', 'asset'],
    ['1600', 'Accumulated Depreciation', 'asset'],
    ['1610', 'Accum. Dep. - Buildings', 'asset'],
    ['1620', 'Accum. Dep. - Furniture', 'asset'],
    ['1630', 'Accum. Dep. - Equipment', 'asset'],
    // Liabilities
    ['2000', 'Accounts Payable', 'liability'],
    ['2010', 'Accounts Payable - Trade', 'liability'],
    ['2020', 'Accounts Payable - Others', 'liability'],
    ['2100', 'Withholding Tax Payable', 'liability'],
    ['2110', 'WTax - Compensation', 'liability'],
    ['2120', 'WTax - Expanded', 'liability'],
    ['2130', 'WTax - Final', 'liability'],
    ['2200', 'VAT Payable', 'liability'],
    ['2210', 'Output VAT', 'liability'],
    ['2220', 'Input VAT', 'liability'],
    ['2300', 'SSS Payable', 'liability'],
    ['2310', 'PhilHealth Payable', 'liability'],
    ['2320', 'Pag-IBIG Payable', 'liability'],
    ['2400', 'Accrued Expenses', 'liability'],
    ['2410', 'Accrued Salaries', 'liability'],
    ['2420', 'Accrued Utilities', 'liability'],
    ['2500', 'Unearned Revenue', 'liability'],
    ['2510', 'Unearned Tuition', 'liability'],
    ['2600', 'Loans Payable', 'liability'],
    ['2610', 'Bank Loan - Current', 'liability'],
    ['2700', 'Long-term Liabilities', 'liability'],
    ['2710', 'Bank Loan - Non-current', 'liability'],
    // Equity
    ['3000', 'Fund Balance', 'equity'],
    ['3010', 'Retained Earnings', 'equity'],
    ['3020', 'Current Year Surplus', 'equity'],
    ['3100', 'Capital', 'equity'],
    // Revenue
    ['4000', 'Revenue', 'revenue'],
    ['4010', 'Tuition Fees', 'revenue'],
    ['4020', 'Miscellaneous Fees', 'revenue'],
    ['4030', 'Laboratory Fees', 'revenue'],
    ['4040', 'Library Fees', 'revenue'],
    ['4050', 'Registration Fees', 'revenue'],
    ['4100', 'Other Income', 'revenue'],
    ['4110', 'Interest Income', 'revenue'],
    ['4120', 'Rental Income', 'revenue'],
    ['4130', 'Canteen Income', 'revenue'],
    ['4140', 'Donation Income', 'revenue'],
    // Cost of Services
    ['4500', 'Cost of Services', 'expense'],
    ['4510', 'Teaching Salaries', 'expense'],
    ['4520', 'Teaching Supplies', 'expense'],
    // Operating Expenses
    ['5000', 'Operating Expenses', 'expense'],
    ['5010', 'Salaries and Wages', 'expense'],
    ['5020', 'Employee Benefits', 'expense'],
    ['5030', 'SSS Contributions', 'expense'],
    ['5040', 'PhilHealth Contributions', 'expense'],
    ['5050', 'Pag-IBIG Contributions', 'expense'],
    ['5060', '13th Month Pay', 'expense'],
    ['5100', 'Supplies Expense', 'expense'],
    ['5110', 'Office Supplies', 'expense'],
    ['5120', 'Cleaning Supplies', 'expense'],
    ['5200', 'Repairs & Maintenance', 'expense'],
    ['5210', 'Building Repairs', 'expense'],
    ['5220', 'Equipment Repairs', 'expense'],
    ['5300', 'Utilities Expense', 'expense'],
    ['5310', 'Electricity', 'expense'],
    ['5320', 'Water', 'expense'],
    ['5330', 'Telephone & Internet', 'expense'],
    ['5400', 'Professional Fees', 'expense'],
    ['5410', 'Audit Fees', 'expense'],
    ['5420', 'Legal Fees', 'expense'],
    ['5430', 'Consulting Fees', 'expense'],
    ['5500', 'Software & Licenses', 'expense'],
    ['5600', 'Books & Publications', 'expense'],
    ['5700', 'Events & Activities', 'expense'],
    ['5800', 'Travel & Transportation', 'expense'],
    ['5900', 'Depreciation Expense', 'expense'],
    ['5910', 'Insurance Expense', 'expense'],
    ['5920', 'Taxes and Licenses', 'expense'],
    ['5930', 'Advertising & Marketing', 'expense'],
    ['5940', 'Security Services', 'expense'],
    ['5950', 'Janitorial Services', 'expense'],
    ['5960', 'Bank Charges', 'expense'],
    ['5970', 'Miscellaneous Expense', 'expense'],
  ];
  coas.forEach(c => insertCOA.run(...c));

  // Users
  const insertUser = db.prepare('INSERT INTO users (username, full_name, email, role, department_id) VALUES (?, ?, ?, ?, ?)');
  const users = [
    ['jdelacruz', 'Juan Dela Cruz', 'juan@school.edu', 'department_head', 1],
    ['msantos', 'Maria Santos', 'maria@school.edu', 'department_head', 2],
    ['rtan', 'Roberto Tan', 'roberto@school.edu', 'finance_manager', 5],
    ['ecruz', 'Elena Cruz', 'elena@school.edu', 'finance_staff', 5],
    ['admin', 'System Administrator', 'admin@school.edu', 'administrator', 4],
    ['treasury', 'Treasury Office', 'treasury@school.edu', 'treasury', 5],
    ['preyes', 'Pedro Reyes', 'pedro@school.edu', 'department_head', 3],
    ['agarcia', 'Ana Garcia', 'ana@school.edu', 'requestor', 4],
  ];
  users.forEach(u => insertUser.run(...u));

  // Payees
  const insertPayee = db.prepare(`INSERT INTO payees (payee_code, name, type, contact_person, email, phone, address, tin, bank_name, bank_account_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const payees = [
    ['V-001', 'TechSoft Solutions Inc.', 'vendor', 'James Chua', 'james@techsoft.ph', '09171234567', 'Makati City', '123-456-789-000', 'BDO', '001-2345678-01'],
    ['V-002', 'Office Depot Philippines', 'vendor', 'Lisa Tan', 'lisa@officedepot.ph', '09181234567', 'Quezon City', '234-567-890-000', 'BPI', '002-3456789-01'],
    ['V-003', 'Green Facilities Corp', 'vendor', 'Mark Lopez', 'mark@greenfac.ph', '09191234567', 'Pasig City', '345-678-901-000', 'Metrobank', '003-4567890-01'],
    ['V-004', 'National Book Store', 'vendor', 'Anna Reyes', 'anna@nbs.ph', '09201234567', 'Manila', '456-789-012-000', 'BDO', '004-5678901-01'],
    ['V-005', 'Manila Water Company', 'vendor', 'Customer Service', 'cs@manilawater.ph', '1627', 'Quezon City', '567-890-123-000', 'BPI', '005-6789012-01'],
    ['E-001', 'Juan Dela Cruz', 'employee', '', 'juan@school.edu', '09171111111', '', '111-222-333-000', 'BDO', '010-1111111-01'],
    ['E-002', 'Maria Santos', 'employee', '', 'maria@school.edu', '09172222222', '', '222-333-444-000', 'BPI', '010-2222222-01'],
  ];
  payees.forEach(p => insertPayee.run(...p));

  // Budgets for 2025-2026
  const insertBudget = db.prepare(`INSERT INTO budgets (budget_name, school_year, department_id, category_id, cost_center_id, fund_source_id, project, annual_budget, committed, actual, budget_owner, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const budgets = [
    ['IT Software & Licenses', '2025-2026', 1, 1, 1, 1, 'IT Operations', 500000, 120000, 85000, 'Juan Dela Cruz', 'approved'],
    ['IT Hardware', '2025-2026', 1, 2, 1, 1, 'IT Operations', 800000, 200000, 350000, 'Juan Dela Cruz', 'approved'],
    ['Building Maintenance', '2025-2026', 3, 3, 3, 5, 'Facilities', 300000, 80000, 170000, 'Pedro Reyes', 'approved'],
    ['Academic Books', '2025-2026', 2, 5, 2, 2, 'Curriculum', 1000000, 250000, 400000, 'Maria Santos', 'approved'],
    ['School Events', '2025-2026', 7, 6, null, 1, 'Student Activities', 400000, 100000, 150000, 'Carlos Mendoza', 'approved'],
    ['Office Supplies', '2025-2026', 4, 4, 4, 1, 'Administration', 200000, 30000, 95000, 'Ana Garcia', 'approved'],
    ['Utilities', '2025-2026', 4, 7, 4, 1, 'Operations', 2400000, 200000, 1600000, 'Ana Garcia', 'approved'],
    ['Professional Development', '2025-2026', 6, 9, null, 1, 'HR Programs', 350000, 50000, 120000, 'Elena Cruz', 'approved'],
    ['Library Acquisitions', '2025-2026', 8, 5, null, 2, 'Library', 250000, 45000, 80000, 'Sofia Lim', 'approved'],
    ['Travel & Transport', '2025-2026', 4, 8, 4, 1, 'Administration', 180000, 25000, 65000, 'Ana Garcia', 'approved'],
  ];
  budgets.forEach(b => insertBudget.run(...b));

  // Monthly allocations for each budget
  const insertMonthly = db.prepare('INSERT INTO budget_monthly_allocations (budget_id, month, amount, committed, actual) VALUES (?, ?, ?, ?, ?)');
  const monthlyData = [
    // IT Software - Budget ID 1
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => [1, m, 41667, m <= 3 ? 40000 : 0, m <= 2 ? 42500 : 0]),
    // IT Hardware - Budget ID 2
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => [2, m, 66667, m <= 4 ? 50000 : 0, m <= 5 ? 70000 : 0]),
    // Building Maintenance - Budget ID 3
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => [3, m, 25000, m <= 3 ? 26667 : 0, m <= 6 ? 28333 : 0]),
    // Academic Books - Budget ID 4
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => [4, m, 83333, m <= 3 ? 83333 : 0, m <= 5 ? 80000 : 0]),
    // School Events - Budget ID 5
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map(m => [5, m, 33333, m <= 3 ? 33333 : 0, m <= 4 ? 37500 : 0]),
  ];
  monthlyData.forEach(m => insertMonthly.run(...m));

  // Disbursement requests
  const insertDisbursement = db.prepare(`INSERT INTO disbursement_requests (request_number, request_date, due_date, payee_id, payee_type, department_id, category_id, cost_center_id, budget_id, project, amount, currency, payment_method, description, requested_by, status, current_approver_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const disbursements = [
    ['DR-2025-0001', '2025-07-15', '2025-07-30', 1, 'vendor', 1, 1, 1, 1, 'IT Operations', 45000, 'PHP', 'bank_transfer', 'Annual Microsoft 365 subscription renewal', 1, 'approved', null],
    ['DR-2025-0002', '2025-07-18', '2025-08-01', 2, 'vendor', 4, 4, 4, 6, 'Administration', 12500, 'PHP', 'check', 'Office supplies for Q3', 8, 'pending_approval', 'department_head'],
    ['DR-2025-0003', '2025-07-20', '2025-08-05', 3, 'vendor', 3, 3, 3, 3, 'Facilities', 85000, 'PHP', 'bank_transfer', 'AC unit repair - Main Building', 7, 'paid', null],
    ['DR-2025-0004', '2025-07-22', '2025-08-10', 4, 'vendor', 2, 5, 2, 4, 'Curriculum', 175000, 'PHP', 'check', 'Textbooks for Grade 11-12 SY 2025-2026', 2, 'approved', null],
    ['DR-2025-0005', '2025-07-25', '2025-08-15', null, 'employee', 1, 2, 1, 2, 'IT Operations', 32000, 'PHP', 'bank_transfer', 'Laptop replacement for faculty room', 1, 'pending_approval', 'finance_officer'],
    ['DR-2025-0006', '2025-08-01', '2025-08-20', 5, 'vendor', 4, 7, 4, 7, 'Operations', 48500, 'PHP', 'bank_transfer', 'Water bill - July 2025', 8, 'paid', null],
    ['DR-2025-0007', '2025-08-05', '2025-08-25', 6, 'employee', 1, 8, null, 10, 'Conference', 15000, 'PHP', 'cash', 'Travel reimbursement - EdTech conference', 1, 'draft', null],
    ['DR-2025-0008', '2025-08-08', '2025-08-30', 1, 'vendor', 1, 1, 1, 1, 'IT Operations', 28000, 'PHP', 'bank_transfer', 'Antivirus license renewal', 1, 'pending_approval', 'department_head'],
    ['DR-2025-0009', '2025-08-10', '2025-09-01', 3, 'vendor', 3, 3, 3, 3, 'Facilities', 42000, 'PHP', 'check', 'Plumbing repair - Science Building', 7, 'approved', null],
    ['DR-2025-0010', '2025-08-12', '2025-09-05', 4, 'vendor', 8, 5, null, 9, 'Library', 35000, 'PHP', 'bank_transfer', 'New reference books acquisition', 2, 'pending_approval', 'finance_manager'],
  ];
  disbursements.forEach(d => insertDisbursement.run(...d));

  // Disbursement items
  const insertItem = db.prepare('INSERT INTO disbursement_items (disbursement_id, description, quantity, unit_cost, amount, account_code, tax_code, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const items = [
    [1, 'Microsoft 365 Business Premium - 50 licenses', 50, 900, 45000, '5500', 'VAT-12', 'Annual subscription'],
    [2, 'A4 Bond Paper (ream)', 50, 180, 9000, '5100', 'VAT-12', ''],
    [2, 'Ink Cartridges - HP', 5, 700, 3500, '5100', 'VAT-12', ''],
    [3, 'AC Unit Compressor Replacement', 1, 55000, 55000, '5200', 'VAT-12', 'Main Building 3rd Floor'],
    [3, 'Labor & Installation', 1, 30000, 30000, '5200', 'VAT-12', ''],
    [4, 'Grade 11 STEM Textbooks', 200, 450, 90000, '5600', 'VAT-E', 'Publisher: REX'],
    [4, 'Grade 12 ABM Textbooks', 150, 450, 67500, '5600', 'VAT-E', 'Publisher: REX'],
    [4, 'Teacher Editions', 25, 700, 17500, '5600', 'VAT-E', ''],
    [5, 'Lenovo ThinkPad E14', 2, 16000, 32000, '5500', 'VAT-12', 'Replacement units'],
    [6, 'Water bill - July 2025', 1, 48500, 48500, '5300', 'VAT-E', 'Account: MW-2025-001'],
  ];
  items.forEach(i => insertItem.run(...i));

  // Approvals
  const insertApproval = db.prepare('INSERT INTO disbursement_approvals (disbursement_id, approver_id, approver_role, action, comments, acted_at) VALUES (?, ?, ?, ?, ?, ?)');
  const approvals = [
    [1, 1, 'department_head', 'approved', 'Approved - critical software renewal', '2025-07-16 09:00:00'],
    [1, 4, 'finance_staff', 'approved', 'Budget verified', '2025-07-16 14:00:00'],
    [1, 3, 'finance_manager', 'approved', 'Approved for payment', '2025-07-17 10:00:00'],
    [3, 7, 'department_head', 'approved', 'Urgent repair needed', '2025-07-20 08:00:00'],
    [3, 4, 'finance_staff', 'approved', 'Budget available', '2025-07-20 11:00:00'],
    [3, 3, 'finance_manager', 'approved', 'Approved', '2025-07-21 09:00:00'],
    [3, 6, 'treasury', 'approved', 'Payment processed', '2025-07-22 10:00:00'],
    [4, 2, 'department_head', 'approved', 'Required for new school year', '2025-07-23 09:00:00'],
    [4, 4, 'finance_staff', 'approved', 'Within budget', '2025-07-23 14:00:00'],
    [4, 3, 'finance_manager', 'approved', 'Approved', '2025-07-24 10:00:00'],
    [6, 8, 'department_head', 'approved', 'Regular utility payment', '2025-08-02 09:00:00'],
    [6, 4, 'finance_staff', 'approved', 'Verified', '2025-08-02 11:00:00'],
    [6, 3, 'finance_manager', 'approved', 'Approved', '2025-08-02 14:00:00'],
    [6, 6, 'treasury', 'approved', 'Paid via bank transfer', '2025-08-03 10:00:00'],
  ];
  approvals.forEach(a => insertApproval.run(...a));

  // Payments
  const insertPayment = db.prepare('INSERT INTO disbursement_payments (disbursement_id, voucher_number, payment_date, bank_account, payment_method, check_number, reference_number, gross_amount, withholding_tax, net_amount, status, processed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const payments = [
    [3, 'PV-2025-0001', '2025-07-23', 'BDO-001', 'bank_transfer', null, 'BT-20250723-001', 85000, 1700, 83300, 'completed', 6],
    [6, 'PV-2025-0002', '2025-08-04', 'BDO-001', 'bank_transfer', null, 'BT-20250804-001', 48500, 0, 48500, 'completed', 6],
  ];
  payments.forEach(p => insertPayment.run(...p));

  // Comprehensive Journal Entries for Accounting Reports
  const insertJE = db.prepare(`INSERT INTO journal_entries (entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'posted', 3)`);
  const insertJEL = db.prepare('INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit) VALUES (?, ?, ?, ?, ?)');

  // Helper: find account id by code
  const acctId = (code: string): number => {
    const row = db.prepare('SELECT id FROM chart_of_accounts WHERE account_code = ?').get(code) as { id: number } | undefined;
    return row?.id || 1;
  };

  // Monthly revenue entries (Jul 2025 - Feb 2026)
  const months = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'];
  const tuitionAmounts = [3200000, 3200000, 2800000, 2500000, 2500000, 2000000, 3500000, 3200000];
  const miscAmounts = [450000, 380000, 320000, 280000, 280000, 200000, 500000, 420000];

  let jeSeq = 1;
  months.forEach((month, idx) => {
    const date = `${month}-01`;
    const tuition = tuitionAmounts[idx];
    const misc = miscAmounts[idx];

    // Tuition Revenue
    const je1 = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, date, `Tuition revenue - ${month}`, 'revenue', null, tuition, tuition);
    insertJEL.run(je1.lastInsertRowid, acctId('1020'), 'Cash in Bank - BDO', tuition, 0);
    insertJEL.run(je1.lastInsertRowid, acctId('4010'), 'Tuition Fees', 0, tuition);

    // Misc Fees
    const je2 = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, date, `Miscellaneous fees - ${month}`, 'revenue', null, misc, misc);
    insertJEL.run(je2.lastInsertRowid, acctId('1020'), 'Cash in Bank', misc, 0);
    insertJEL.run(je2.lastInsertRowid, acctId('4020'), 'Misc Fees', 0, misc * 0.4);
    insertJEL.run(je2.lastInsertRowid, acctId('4030'), 'Lab Fees', 0, misc * 0.3);
    insertJEL.run(je2.lastInsertRowid, acctId('4040'), 'Library Fees', 0, misc * 0.15);
    insertJEL.run(je2.lastInsertRowid, acctId('4050'), 'Registration Fees', 0, misc * 0.15);

    // Salary expense
    const salary = 1800000 + Math.round(idx * 20000);
    const je3 = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, `${month}-15`, `Payroll - ${month}`, 'payroll', null, salary, salary);
    insertJEL.run(je3.lastInsertRowid, acctId('5010'), 'Salaries and Wages', salary * 0.7, 0);
    insertJEL.run(je3.lastInsertRowid, acctId('4510'), 'Teaching Salaries', salary * 0.3, 0);
    insertJEL.run(je3.lastInsertRowid, acctId('1020'), 'Cash in Bank - BDO', 0, salary * 0.88);
    insertJEL.run(je3.lastInsertRowid, acctId('2110'), 'WTax - Compensation', 0, salary * 0.05);
    insertJEL.run(je3.lastInsertRowid, acctId('2300'), 'SSS Payable', 0, salary * 0.04);
    insertJEL.run(je3.lastInsertRowid, acctId('2310'), 'PhilHealth Payable', 0, salary * 0.02);
    insertJEL.run(je3.lastInsertRowid, acctId('2320'), 'Pag-IBIG Payable', 0, salary * 0.01);

    // Utilities
    const utilAmounts = [195000, 205000, 210000, 190000, 185000, 175000, 200000, 215000];
    const util = utilAmounts[idx];
    const je4 = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, `${month}-20`, `Utilities - ${month}`, 'expense', null, util, util);
    insertJEL.run(je4.lastInsertRowid, acctId('5310'), 'Electricity', util * 0.6, 0);
    insertJEL.run(je4.lastInsertRowid, acctId('5320'), 'Water', util * 0.2, 0);
    insertJEL.run(je4.lastInsertRowid, acctId('5330'), 'Telephone & Internet', util * 0.2, 0);
    insertJEL.run(je4.lastInsertRowid, acctId('1020'), 'Cash in Bank', 0, util * 0.98);
    insertJEL.run(je4.lastInsertRowid, acctId('2120'), 'EWT', 0, util * 0.02);

    // Supplies & maintenance (VAT-inclusive purchase: gross includes 12% VAT)
    const supplyAmounts = [90000, 95000, 100000, 85000, 88000, 92000, 98000, 105000];
    const supplies = supplyAmounts[idx];
    const supplyVat = Math.round(supplies * 12 / 112);  // VAT component from VAT-inclusive price
    const supplyNet = supplies - supplyVat;               // Net of VAT
    const supplyEwt = Math.round(supplyNet * 0.02);       // 2% EWT on net
    const supplyCash = supplies - supplyEwt;               // Cash paid = gross - EWT
    const supplyTotal = supplyNet + supplyVat;             // = supplies (balanced)
    const je5 = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, `${month}-25`, `Supplies & maintenance - ${month}`, 'expense', null, supplyTotal, supplyTotal);
    insertJEL.run(je5.lastInsertRowid, acctId('5110'), 'Office Supplies', supplyNet * 0.4, 0);
    insertJEL.run(je5.lastInsertRowid, acctId('5120'), 'Cleaning Supplies', supplyNet * 0.2, 0);
    insertJEL.run(je5.lastInsertRowid, acctId('5210'), 'Building Repairs', supplyNet * 0.4, 0);
    insertJEL.run(je5.lastInsertRowid, acctId('2220'), 'Input VAT', supplyVat, 0);
    insertJEL.run(je5.lastInsertRowid, acctId('1020'), 'Cash in Bank', 0, supplyCash);
    insertJEL.run(je5.lastInsertRowid, acctId('2120'), 'EWT', 0, supplyEwt);

    // Professional services (quarterly)
    if (idx % 3 === 0) {
      const profFee = 150000;
      const je6 = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, `${month}-28`, `Professional fees - ${month}`, 'expense', null, profFee, profFee);
      insertJEL.run(je6.lastInsertRowid, acctId('5410'), 'Audit Fees', profFee * 0.5, 0);
      insertJEL.run(je6.lastInsertRowid, acctId('5420'), 'Legal Fees', profFee * 0.3, 0);
      insertJEL.run(je6.lastInsertRowid, acctId('5430'), 'Consulting Fees', profFee * 0.2, 0);
      insertJEL.run(je6.lastInsertRowid, acctId('1020'), 'Cash in Bank', 0, profFee * 0.85);
      insertJEL.run(je6.lastInsertRowid, acctId('2120'), 'EWT - Professional', 0, profFee * 0.15);
    }

    // Depreciation (monthly)
    const depn = 95000;
    const je7 = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, `${month}-30`, `Depreciation - ${month}`, 'adjusting', null, depn, depn);
    insertJEL.run(je7.lastInsertRowid, acctId('5900'), 'Depreciation Expense', depn, 0);
    insertJEL.run(je7.lastInsertRowid, acctId('1610'), 'Accum. Dep. - Buildings', 0, depn * 0.5);
    insertJEL.run(je7.lastInsertRowid, acctId('1620'), 'Accum. Dep. - Furniture', 0, depn * 0.2);
    insertJEL.run(je7.lastInsertRowid, acctId('1630'), 'Accum. Dep. - Equipment', 0, depn * 0.3);

    // Insurance (monthly)
    const ins = 25000;
    const je8 = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, `${month}-30`, `Insurance expense - ${month}`, 'adjusting', null, ins, ins);
    insertJEL.run(je8.lastInsertRowid, acctId('5910'), 'Insurance Expense', ins, 0);
    insertJEL.run(je8.lastInsertRowid, acctId('1210'), 'Prepaid Insurance', 0, ins);

    // Other operating expenses
    const otherAmounts = [135000, 140000, 132000, 128000, 145000, 138000, 142000, 130000];
    const otherExp = otherAmounts[idx];
    const je9 = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, `${month}-28`, `Other operating expenses - ${month}`, 'expense', null, otherExp, otherExp);
    insertJEL.run(je9.lastInsertRowid, acctId('5500'), 'Software & Licenses', otherExp * 0.25, 0);
    insertJEL.run(je9.lastInsertRowid, acctId('5940'), 'Security Services', otherExp * 0.3, 0);
    insertJEL.run(je9.lastInsertRowid, acctId('5950'), 'Janitorial Services', otherExp * 0.2, 0);
    insertJEL.run(je9.lastInsertRowid, acctId('5960'), 'Bank Charges', otherExp * 0.05, 0);
    insertJEL.run(je9.lastInsertRowid, acctId('5970'), 'Miscellaneous', otherExp * 0.2, 0);
    insertJEL.run(je9.lastInsertRowid, acctId('1020'), 'Cash in Bank', 0, otherExp);
  });

  // Opening balance entry
  const jeOB = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, '2025-06-30', 'Opening balances SY 2025-2026', 'opening', null, 50550000, 50550000);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1010'), 'Cash on Hand', 500000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1020'), 'Cash in Bank - BDO', 8500000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1030'), 'Cash in Bank - BPI', 4200000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1050'), 'Petty Cash', 100000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1100'), 'Accounts Receivable', 2500000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1210'), 'Prepaid Insurance', 300000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1230'), 'Prepaid Supplies', 150000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1510'), 'Land', 15000000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1520'), 'Buildings', 12000000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1530'), 'Furniture and Fixtures', 3000000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1550'), 'Computer Equipment', 2500000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1560'), 'Transportation Equipment', 1800000, 0);
  insertJEL.run(jeOB.lastInsertRowid, acctId('1600'), 'Accumulated Depreciation', 0, 4500000);
  insertJEL.run(jeOB.lastInsertRowid, acctId('2000'), 'Accounts Payable', 0, 1800000);
  insertJEL.run(jeOB.lastInsertRowid, acctId('2400'), 'Accrued Expenses', 0, 950000);
  insertJEL.run(jeOB.lastInsertRowid, acctId('2610'), 'Bank Loan - Current', 0, 2000000);
  insertJEL.run(jeOB.lastInsertRowid, acctId('2710'), 'Bank Loan - Non-current', 0, 5000000);
  insertJEL.run(jeOB.lastInsertRowid, acctId('3010'), 'Retained Earnings', 0, 30300000);
  insertJEL.run(jeOB.lastInsertRowid, acctId('3100'), 'Capital', 0, 6000000);
  // Additional: loan payment
  const jeLoan = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, '2025-09-15', 'Quarterly loan payment', 'payment', null, 550000, 550000);
  insertJEL.run(jeLoan.lastInsertRowid, acctId('2610'), 'Bank Loan - Current', 500000, 0);
  insertJEL.run(jeLoan.lastInsertRowid, acctId('5960'), 'Interest Expense', 50000, 0);
  insertJEL.run(jeLoan.lastInsertRowid, acctId('1020'), 'Cash in Bank - BDO', 0, 550000);

  // Equipment purchase
  const jeEquip = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, '2025-10-10', 'Purchase of computer equipment', 'purchase', null, 450000, 450000);
  insertJEL.run(jeEquip.lastInsertRowid, acctId('1550'), 'Computer Equipment', 450000, 0);
  insertJEL.run(jeEquip.lastInsertRowid, acctId('1020'), 'Cash in Bank - BDO', 0, 450000);

  // Interest income
  months.forEach((month, idx) => {
    const interest = 12000 + idx * 500;
    const jeInt = insertJE.run(`JE-2025-${String(jeSeq++).padStart(4, '0')}`, `${month}-30`, `Interest income - ${month}`, 'revenue', null, interest, interest);
    insertJEL.run(jeInt.lastInsertRowid, acctId('1020'), 'Cash in Bank', interest, 0);
    insertJEL.run(jeInt.lastInsertRowid, acctId('4110'), 'Interest Income', 0, interest);
  });

  // Accounting Periods
  const insertPeriod = db.prepare('INSERT INTO accounting_periods (period_name, school_year, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)');
  const periods = [
    ['June 2025', '2025-2026', '2025-06-01', '2025-06-30', 'closed'],
    ['July 2025', '2025-2026', '2025-07-01', '2025-07-31', 'closed'],
    ['August 2025', '2025-2026', '2025-08-01', '2025-08-31', 'closed'],
    ['September 2025', '2025-2026', '2025-09-01', '2025-09-30', 'closed'],
    ['October 2025', '2025-2026', '2025-10-01', '2025-10-31', 'closed'],
    ['November 2025', '2025-2026', '2025-11-01', '2025-11-30', 'closed'],
    ['December 2025', '2025-2026', '2025-12-01', '2025-12-31', 'open'],
    ['January 2026', '2025-2026', '2026-01-01', '2026-01-31', 'open'],
    ['February 2026', '2025-2026', '2026-02-01', '2026-02-28', 'open'],
    ['March 2026', '2025-2026', '2026-03-01', '2026-03-31', 'open'],
    ['April 2026', '2025-2026', '2026-04-01', '2026-04-30', 'open'],
    ['May 2026', '2025-2026', '2026-05-01', '2026-05-31', 'open'],
  ];
  periods.forEach(p => insertPeriod.run(...p));

  // Customers
  const insertCustomer = db.prepare('INSERT INTO customers (customer_code, customer_type, name, campus, grade_level, email, phone, billing_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const customers = [
    ['STU-2025-001', 'student', 'Maria Clara Santos', 'Main', 'Grade 11 - STEM', 'maria.clara@email.com', '09171234567', 'Quezon City'],
    ['STU-2025-002', 'student', 'Jose Rizal Jr.', 'Main', 'Grade 12 - ABM', 'jose.rizal@email.com', '09181234567', 'Makati City'],
    ['STU-2025-003', 'student', 'Andrea Bonifacio', 'Main', 'Grade 11 - HUMSS', 'andrea.b@email.com', '09191234567', 'Pasig City'],
    ['STU-2025-004', 'student', 'Carlos Garcia III', 'Main', 'Grade 12 - STEM', 'carlos.g@email.com', '09201234567', 'Taguig City'],
    ['STU-2025-005', 'student', 'Sofia Reyes', 'Main', 'Grade 11 - ABM', 'sofia.r@email.com', '09211234567', 'Manila'],
    ['CORP-001', 'corporate', 'ABC Corporation (Scholarship Sponsor)', 'Main', null, 'hr@abccorp.ph', '028881234', 'BGC, Taguig'],
    ['CORP-002', 'corporate', 'XYZ Foundation (Grant)', 'Main', null, 'grants@xyz.org', '028885678', 'Ortigas, Pasig'],
    ['PARENT-001', 'parent', 'Mr. & Mrs. Santos', 'Main', null, 'santos.family@email.com', '09271234567', 'Quezon City'],
  ];
  customers.forEach(c => insertCustomer.run(...c));

  // AP Bills
  const insertBill = db.prepare('INSERT INTO ap_bills (bill_number, bill_date, due_date, vendor_id, department_id, description, gross_amount, vat_amount, withholding_tax, net_payable, amount_paid, balance, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const bills = [
    ['BILL-2025-0001', '2025-07-10', '2025-08-10', 1, 1, 'Microsoft 365 annual subscription', 100000, 12000, 2000, 110000, 110000, 0, 'paid'],
    ['BILL-2025-0002', '2025-07-15', '2025-08-15', 2, 4, 'Office supplies Q3', 25000, 3000, 500, 27500, 0, 27500, 'posted'],
    ['BILL-2025-0003', '2025-08-01', '2025-09-01', 3, 3, 'AC repair main building', 85000, 10200, 1700, 93500, 93500, 0, 'paid'],
    ['BILL-2025-0004', '2025-08-20', '2025-09-20', 4, 2, 'Textbooks Grade 11-12', 175000, 0, 3500, 171500, 0, 171500, 'approved'],
    ['BILL-2025-0005', '2025-09-05', '2025-10-05', 5, 4, 'Water bill August 2025', 48500, 0, 0, 48500, 48500, 0, 'paid'],
    ['BILL-2025-0006', '2025-09-15', '2025-10-15', 1, 1, 'Server hosting Q4', 36000, 4320, 720, 39600, 0, 39600, 'posted'],
    ['BILL-2025-0007', '2025-10-01', '2025-11-01', 3, 3, 'Plumbing repair science bldg', 42000, 5040, 840, 46200, 0, 46200, 'posted'],
    ['BILL-2025-0008', '2025-10-15', '2025-11-15', 2, 4, 'Printer ink cartridges', 15000, 1800, 300, 16500, 0, 16500, 'draft'],
  ];
  bills.forEach(b => insertBill.run(...b));

  // AR Invoices
  const insertInvoice = db.prepare('INSERT INTO ar_invoices (invoice_number, invoice_date, due_date, customer_id, school_year, semester, description, gross_amount, discount_amount, net_receivable, amount_paid, balance, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const invoices = [
    ['INV-2025-0001', '2025-06-15', '2025-07-15', 1, '2025-2026', '1st Semester', 'Tuition Fee - 1st Semester', 85000, 0, 85000, 85000, 0, 'paid'],
    ['INV-2025-0002', '2025-06-15', '2025-07-15', 2, '2025-2026', '1st Semester', 'Tuition Fee - 1st Semester', 85000, 0, 85000, 60000, 25000, 'partially_paid'],
    ['INV-2025-0003', '2025-06-15', '2025-07-15', 3, '2025-2026', '1st Semester', 'Tuition Fee - 1st Semester', 85000, 8500, 76500, 76500, 0, 'paid'],
    ['INV-2025-0004', '2025-06-15', '2025-08-15', 4, '2025-2026', '1st Semester', 'Tuition Fee - 1st Semester', 85000, 0, 85000, 42500, 42500, 'partially_paid'],
    ['INV-2025-0005', '2025-06-15', '2025-07-15', 5, '2025-2026', '1st Semester', 'Tuition Fee - 1st Semester', 85000, 0, 85000, 0, 85000, 'overdue'],
    ['INV-2025-0006', '2025-06-15', '2025-07-15', 1, '2025-2026', '1st Semester', 'Miscellaneous Fees', 15000, 0, 15000, 15000, 0, 'paid'],
    ['INV-2025-0007', '2025-06-15', '2025-07-15', 2, '2025-2026', '1st Semester', 'Laboratory Fees', 12000, 0, 12000, 12000, 0, 'paid'],
    ['INV-2025-0008', '2025-06-15', '2025-07-15', 6, '2025-2026', '1st Semester', 'Scholarship Sponsor Billing', 250000, 0, 250000, 250000, 0, 'paid'],
    ['INV-2025-0009', '2025-11-15', '2025-12-15', 1, '2025-2026', '2nd Semester', 'Tuition Fee - 2nd Semester', 85000, 0, 85000, 0, 85000, 'posted'],
    ['INV-2025-0010', '2025-11-15', '2025-12-15', 2, '2025-2026', '2nd Semester', 'Tuition Fee - 2nd Semester', 85000, 0, 85000, 0, 85000, 'posted'],
  ];
  invoices.forEach(i => insertInvoice.run(...i));

  // AR Collections
  const insertCollection = db.prepare('INSERT INTO ar_collections (receipt_number, collection_date, customer_id, payment_method, amount_received, applied_amount, unapplied_amount, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const collections = [
    ['OR-2025-0001', '2025-06-20', 1, 'bank_transfer', 100000, 100000, 0, 'posted', 'Full payment tuition + misc'],
    ['OR-2025-0002', '2025-06-25', 2, 'check', 72000, 72000, 0, 'posted', 'Partial payment'],
    ['OR-2025-0003', '2025-06-22', 3, 'cash', 76500, 76500, 0, 'posted', 'Full payment with scholarship discount'],
    ['OR-2025-0004', '2025-07-10', 4, 'bank_transfer', 42500, 42500, 0, 'posted', 'Installment payment 1 of 2'],
    ['OR-2025-0005', '2025-06-20', 6, 'bank_transfer', 250000, 250000, 0, 'posted', 'ABC Corp scholarship payment'],
    ['OR-2025-0006', '2025-07-15', 1, 'cash', 15000, 15000, 0, 'posted', 'Misc fees payment'],
    ['OR-2025-0007', '2025-07-01', 2, 'bank_transfer', 12000, 12000, 0, 'posted', 'Lab fees payment'],
  ];
  collections.forEach(c => insertCollection.run(...c));

  // Collection allocations
  const insertAlloc = db.prepare('INSERT INTO ar_collection_allocations (collection_id, invoice_id, amount_applied) VALUES (?, ?, ?)');
  const allocs = [
    [1, 1, 85000], [1, 6, 15000],
    [2, 2, 60000], [2, 7, 12000],
    [3, 3, 76500],
    [4, 4, 42500],
    [5, 8, 250000],
    [6, 6, 15000],
    [7, 7, 12000],
  ];
  allocs.forEach(a => insertAlloc.run(...a));

  // Recurring Journal Templates
  const insertTemplate = db.prepare('INSERT INTO recurring_journal_templates (template_name, frequency, start_date, end_date, default_description, auto_create, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const templates = [
    ['Monthly Depreciation', 'monthly', '2025-06-01', '2026-05-31', 'Monthly depreciation of fixed assets', 1, 1],
    ['Monthly Insurance Amortization', 'monthly', '2025-06-01', '2026-05-31', 'Monthly prepaid insurance amortization', 1, 1],
    ['Monthly Security Services', 'monthly', '2025-06-01', '2026-05-31', 'Monthly security service fee', 0, 1],
    ['Quarterly Loan Interest', 'quarterly', '2025-06-01', '2026-05-31', 'Quarterly bank loan interest accrual', 0, 1],
  ];
  templates.forEach(t => insertTemplate.run(...t));

  // Audit logs
  const insertAudit = db.prepare('INSERT INTO audit_logs (entity_type, entity_id, action, old_values, new_values, performed_by) VALUES (?, ?, ?, ?, ?, ?)');
  const audits = [
    ['disbursement', 1, 'created', null, '{"amount": 45000, "status": "draft"}', 'Juan Dela Cruz'],
    ['disbursement', 1, 'submitted', '{"status": "draft"}', '{"status": "pending_approval"}', 'Juan Dela Cruz'],
    ['disbursement', 1, 'approved', '{"status": "pending_approval"}', '{"status": "approved"}', 'Roberto Tan'],
    ['disbursement', 3, 'created', null, '{"amount": 85000, "status": "draft"}', 'Pedro Reyes'],
    ['disbursement', 3, 'paid', '{"status": "approved"}', '{"status": "paid"}', 'Treasury Office'],
    ['budget', 1, 'created', null, '{"annual_budget": 500000}', 'Roberto Tan'],
    ['budget', 3, 'updated', '{"actual": 85000}', '{"actual": 170000}', 'System'],
  ];
  audits.forEach(a => insertAudit.run(...a));

  // System settings
  const insertSetting = db.prepare('INSERT INTO system_settings (key, value, category) VALUES (?, ?, ?)');
  const settings = [
    ['school_name', 'St. Augustine Academy', 'general'],
    ['school_year', '2025-2026', 'general'],
    ['currency', 'PHP', 'finance'],
    ['currency_symbol', '₱', 'finance'],
    ['budget_overspend_policy', 'warning', 'budget'],
    ['approval_threshold_dept_head', '50000', 'approval'],
    ['approval_threshold_finance_manager', '200000', 'approval'],
    ['approval_threshold_treasury', '500000', 'approval'],
    ['withholding_tax_rate', '2', 'finance'],
    ['vat_rate', '12', 'finance'],
    ['fiscal_year_start', '06', 'finance'],
  ];
  settings.forEach(s => insertSetting.run(...s));
}
