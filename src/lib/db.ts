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

  // Chart of Accounts
  const insertCOA = db.prepare('INSERT INTO chart_of_accounts (account_code, account_name, account_type) VALUES (?, ?, ?)');
  const coas = [
    ['1000', 'Cash and Cash Equivalents', 'asset'],
    ['1010', 'Cash on Hand', 'asset'],
    ['1020', 'Cash in Bank - BDO', 'asset'],
    ['1030', 'Cash in Bank - BPI', 'asset'],
    ['1100', 'Accounts Receivable', 'asset'],
    ['2000', 'Accounts Payable', 'liability'],
    ['2100', 'Withholding Tax Payable', 'liability'],
    ['5000', 'Operating Expenses', 'expense'],
    ['5100', 'Supplies Expense', 'expense'],
    ['5200', 'Repairs & Maintenance Expense', 'expense'],
    ['5300', 'Utilities Expense', 'expense'],
    ['5400', 'Professional Fees', 'expense'],
    ['5500', 'Software & License Expense', 'expense'],
    ['5600', 'Books & Publications', 'expense'],
    ['5700', 'Events Expense', 'expense'],
    ['5800', 'Travel Expense', 'expense'],
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
