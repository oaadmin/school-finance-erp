'use client';

import { useState } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, Copy, Check, ExternalLink,
  FileText, Receipt, Building2, Wallet, BarChart3, Shield, Settings,
  PieChart, CreditCard, Layers, Landmark, Users, LayoutDashboard,
  Search, Code2, Zap, Globe, Lock, Server,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────
interface Param {
  name: string;
  type: string;
  required?: boolean;
  default?: string;
  description: string;
}

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  queryParams?: Param[];
  bodyParams?: Param[];
  responseExample?: string;
  notes?: string;
}

interface ApiSection {
  id: string;
  title: string;
  icon: typeof BookOpen;
  color: string;
  description: string;
  baseUrl: string;
  endpoints: Endpoint[];
}

// ─── API Data ───────────────────────────────────────────────
const apiSections: ApiSection[] = [
  {
    id: 'dashboard',
    title: 'Finance Dashboard',
    icon: LayoutDashboard,
    color: 'blue',
    description: 'Overview of budget utilization, spending trends, and disbursement status.',
    baseUrl: '/api/dashboard',
    endpoints: [
      {
        method: 'GET',
        path: '/api/dashboard',
        description: 'Get finance dashboard summary including budget totals, department spending, monthly trends, and recent disbursements.',
        responseExample: `{
  "summary": {
    "total_budget": 6380000,
    "total_committed": 1100000,
    "total_actual": 3115000,
    "remaining": 2165000
  },
  "deptSpending": [
    { "department": "Administration", "budget": 2800000, "actual": 1250000 }
  ],
  "monthlyTrend": [
    { "month": "Jul", "budget": 500000, "actual": 420000 }
  ],
  "recentDisbursements": [...],
  "statusCounts": [{ "status": "paid", "count": 5 }],
  "pendingApprovals": 4,
  "categorySpending": [...]
}`,
      },
    ],
  },
  {
    id: 'acct-dashboard',
    title: 'Accounting Dashboard',
    icon: BookOpen,
    color: 'purple',
    description: 'Accounting overview with AR/AP totals, cash balance, aging summaries, and recent journal entries.',
    baseUrl: '/api/accounting/dashboard',
    endpoints: [
      {
        method: 'GET',
        path: '/api/accounting/dashboard',
        description: 'Get accounting dashboard with receivables, payables, cash balance, aging data, and top expense categories.',
        responseExample: `{
  "totalReceivables": 322500,
  "totalPayables": 301300,
  "cashBalance": 21289525.54,
  "currentMonth": {
    "revenue": 0,
    "expenses": 0,
    "netIncome": 0
  },
  "recentJournalEntries": [
    {
      "id": 1,
      "entry_number": "JE-2025-0001",
      "entry_date": "2025-07-01",
      "description": "Opening balances",
      "total_debit": 53520481.30,
      "total_credit": 53520481.30,
      "status": "posted"
    }
  ],
  "unpostedCount": 0,
  "arAging": { "current": 0, "days_30": 0, "days_60": 0, "days_90": 0, "over_90": 322500 },
  "apAging": { "current": 0, "days_30": 0, "days_60": 0, "days_90": 0, "over_90": 301300 },
  "topExpenseCategories": [
    { "category": "Salaries and Wages", "amount": 0 }
  ],
  "topVendors": []
}`,
      },
    ],
  },
  {
    id: 'ar',
    title: 'Accounts Receivable',
    icon: Receipt,
    color: 'green',
    description: 'Manage student invoices, tuition billing, collections, official receipts, customer accounts, aging, and statements of account.',
    baseUrl: '/api/accounting/ar',
    endpoints: [
      {
        method: 'GET',
        path: '/api/accounting/ar?type=invoices',
        description: 'List all AR invoices/charges with customer details.',
        responseExample: `[
  {
    "id": 1,
    "invoice_number": "INV-2025-0001",
    "invoice_date": "2025-06-15",
    "due_date": "2025-07-15",
    "customer_id": 1,
    "customer_name": "Maria Clara Santos",
    "customer_code": "STU-2025-001",
    "campus": "Main",
    "school_year": "2025-2026",
    "semester": "1st Semester",
    "description": "Tuition Fee - 1st Semester",
    "gross_amount": 85000,
    "discount_amount": 0,
    "tax_amount": 0,
    "net_receivable": 85000,
    "amount_paid": 85000,
    "balance": 0,
    "status": "paid"
  }
]`,
      },
      {
        method: 'GET',
        path: '/api/accounting/ar?type=collections',
        description: 'List all collections / official receipts with customer details.',
        responseExample: `[
  {
    "id": 1,
    "receipt_number": "OR-2025-0001",
    "collection_date": "2025-07-01",
    "customer_id": 1,
    "customer_name": "Maria Clara Santos",
    "customer_code": "STU-2025-001",
    "payment_method": "bank_transfer",
    "amount_received": 85000,
    "applied_amount": 85000,
    "unapplied_amount": 0,
    "status": "posted"
  }
]`,
      },
      {
        method: 'GET',
        path: '/api/accounting/ar?type=customers',
        description: 'List all customer/student accounts with balance summaries.',
        responseExample: `[
  {
    "id": 1,
    "customer_code": "STU-2025-001",
    "customer_type": "student",
    "name": "Maria Clara Santos",
    "campus": "Main",
    "grade_level": "Grade 11",
    "email": "maria.santos@school.edu",
    "total_receivable": 85000,
    "outstanding_balance": 0,
    "total_collected": 85000
  }
]`,
      },
      {
        method: 'GET',
        path: '/api/accounting/ar?type=aging',
        description: 'AR aging report grouped by customer with aging buckets.',
        responseExample: `[
  {
    "customer_id": 5,
    "customer_code": "STU-2025-005",
    "customer_name": "Rafael Reyes",
    "current_amount": 0,
    "days_30": 0,
    "days_60": 0,
    "days_90": 0,
    "over_90": 85000,
    "total": 85000
  }
]`,
      },
      {
        method: 'GET',
        path: '/api/accounting/ar?type=soa&customer_id={id}',
        description: 'Statement of Account for a specific customer. Returns all invoices, collections, and running balance.',
        queryParams: [
          { name: 'customer_id', type: 'integer', required: true, description: 'Customer ID to generate SOA for' },
        ],
        responseExample: `{
  "customer": {
    "id": 1,
    "name": "Maria Clara Santos",
    "customer_code": "STU-2025-001"
  },
  "invoices": [
    {
      "invoice_number": "INV-2025-0001",
      "invoice_date": "2025-06-15",
      "due_date": "2025-07-15",
      "net_receivable": 85000,
      "amount_paid": 85000,
      "balance": 0,
      "status": "paid"
    }
  ],
  "collections": [
    {
      "receipt_number": "OR-2025-0001",
      "collection_date": "2025-07-01",
      "amount_received": 85000,
      "status": "posted"
    }
  ],
  "summary": {
    "total_invoiced": 85000,
    "total_paid": 85000,
    "total_balance": 0
  }
}`,
      },
      {
        method: 'POST',
        path: '/api/accounting/ar?type=invoices',
        description: 'Create a new AR invoice / student charge. Invoice number is auto-generated (INV-YYYY-NNNN). Net receivable = gross - discount + tax.',
        bodyParams: [
          { name: 'customer_id', type: 'integer', required: true, description: 'Customer / student ID' },
          { name: 'invoice_date', type: 'string (YYYY-MM-DD)', required: false, default: 'today', description: 'Invoice date' },
          { name: 'due_date', type: 'string (YYYY-MM-DD)', required: false, description: 'Payment due date' },
          { name: 'school_year', type: 'string', required: false, description: 'e.g. "2025-2026"' },
          { name: 'semester', type: 'string', required: false, description: 'e.g. "1st Semester"' },
          { name: 'campus', type: 'string', required: false, default: 'Main', description: 'Campus / branch' },
          { name: 'description', type: 'string', required: false, description: 'Invoice description' },
          { name: 'gross_amount', type: 'number', required: true, description: 'Total gross amount' },
          { name: 'discount_amount', type: 'number', required: false, default: '0', description: 'Discount / scholarship' },
          { name: 'tax_amount', type: 'number', required: false, default: '0', description: 'Tax amount' },
          { name: 'reference_number', type: 'string', required: false, description: 'External reference' },
          { name: 'status', type: 'string', required: false, default: 'draft', description: 'draft | posted' },
          { name: 'created_by', type: 'string', required: false, description: 'User who created' },
          { name: 'lines', type: 'array', required: false, description: 'Line items (see below)' },
        ],
        notes: `**Line item fields:** fee_code, description, quantity, unit_amount, amount, revenue_account_id, department_id, tax_code, discount_type, discount_amount, remarks`,
        responseExample: `{ "id": 11, "invoice_number": "INV-2025-0011" }`,
      },
      {
        method: 'POST',
        path: '/api/accounting/ar?type=collections',
        description: 'Record a payment / official receipt. Auto-applies to invoices if allocations provided. Updates invoice balance and status automatically.',
        bodyParams: [
          { name: 'customer_id', type: 'integer', required: true, description: 'Customer / student ID' },
          { name: 'collection_date', type: 'string (YYYY-MM-DD)', required: false, default: 'today', description: 'Collection date' },
          { name: 'payment_method', type: 'string', required: false, default: 'cash', description: 'cash | check | bank_transfer | online' },
          { name: 'bank_account', type: 'string', required: false, description: 'Bank account used' },
          { name: 'check_number', type: 'string', required: false, description: 'Check number if applicable' },
          { name: 'reference_number', type: 'string', required: false, description: 'Transaction reference' },
          { name: 'amount_received', type: 'number', required: true, description: 'Total amount received' },
          { name: 'collected_by', type: 'string', required: false, description: 'Cashier / collector name' },
          { name: 'status', type: 'string', required: false, default: 'draft', description: 'draft | posted' },
          { name: 'remarks', type: 'string', required: false, description: 'Notes' },
          { name: 'allocations', type: 'array', required: false, description: 'Invoice allocations [{invoice_id, amount_applied}]' },
        ],
        notes: `**Allocation behavior:** When allocations are provided, each invoice's \`amount_paid\` is increased and \`balance\` is decreased. If balance reaches 0, invoice status is set to "paid".`,
        responseExample: `{ "id": 6, "receipt_number": "OR-2025-0006" }`,
      },
    ],
  },
  {
    id: 'ap',
    title: 'Accounts Payable',
    icon: Building2,
    color: 'red',
    description: 'Manage supplier bills, vendor payments, and AP aging.',
    baseUrl: '/api/accounting/ap',
    endpoints: [
      {
        method: 'GET',
        path: '/api/accounting/ap?type=bills',
        description: 'List all supplier bills with vendor details, amounts, VAT, withholding tax, and payment status.',
        responseExample: `[
  {
    "id": 1,
    "bill_number": "BILL-2025-0001",
    "bill_date": "2025-07-10",
    "due_date": "2025-08-10",
    "vendor_id": 1,
    "vendor_name": "TechSoft Solutions Inc.",
    "vendor_code": "V-001",
    "description": "Microsoft 365 annual subscription",
    "gross_amount": 100000,
    "vat_amount": 12000,
    "withholding_tax": 2000,
    "net_payable": 110000,
    "amount_paid": 110000,
    "balance": 0,
    "status": "paid"
  }
]`,
      },
      {
        method: 'GET',
        path: '/api/accounting/ap?type=payments',
        description: 'List all supplier payment records.',
        responseExample: `[
  {
    "id": 1,
    "vendor_name": "TechSoft Solutions Inc.",
    "vendor_code": "V-001",
    "amount": 110000,
    "status": "completed"
  }
]`,
      },
      {
        method: 'GET',
        path: '/api/accounting/ap?type=aging',
        description: 'AP aging report grouped by vendor with aging buckets.',
        responseExample: `[
  {
    "vendor_id": 4,
    "vendor_code": "V-004",
    "vendor_name": "National Book Store",
    "tin": "006-789-012-000",
    "current_amount": 0,
    "days_30": 0,
    "days_60": 0,
    "days_90": 0,
    "over_90": 171500,
    "total": 171500
  }
]`,
      },
      {
        method: 'POST',
        path: '/api/accounting/ap?type=bills',
        description: 'Create a new supplier bill. Bill number is auto-generated (BILL-YYYY-NNNN). Net payable = gross + VAT - withholding tax.',
        bodyParams: [
          { name: 'vendor_id', type: 'integer', required: true, description: 'Vendor / payee ID' },
          { name: 'bill_date', type: 'string (YYYY-MM-DD)', required: false, default: 'today', description: 'Bill date' },
          { name: 'due_date', type: 'string (YYYY-MM-DD)', required: false, description: 'Payment due date' },
          { name: 'department_id', type: 'integer', required: false, description: 'Department ID' },
          { name: 'campus', type: 'string', required: false, default: 'Main', description: 'Campus / branch' },
          { name: 'description', type: 'string', required: false, description: 'Bill description' },
          { name: 'gross_amount', type: 'number', required: true, description: 'Gross amount' },
          { name: 'vat_amount', type: 'number', required: false, default: '0', description: '12% VAT if applicable' },
          { name: 'withholding_tax', type: 'number', required: false, default: '0', description: 'EWT amount' },
          { name: 'payment_terms', type: 'string', required: false, description: 'e.g. "Net 30"' },
          { name: 'reference_number', type: 'string', required: false, description: 'Supplier invoice reference' },
          { name: 'status', type: 'string', required: false, default: 'draft', description: 'draft | posted' },
          { name: 'lines', type: 'array', required: false, description: 'Line items [{account_id, description, quantity, unit_cost, amount, tax_code}]' },
        ],
        responseExample: `{ "id": 9, "bill_number": "BILL-2025-0009" }`,
      },
    ],
  },
  {
    id: 'coa',
    title: 'Chart of Accounts',
    icon: Layers,
    color: 'indigo',
    description: 'Manage the general ledger account structure with parent-child hierarchy.',
    baseUrl: '/api/accounting/coa',
    endpoints: [
      {
        method: 'GET',
        path: '/api/accounting/coa',
        description: 'List all chart of accounts entries with parent info and child counts.',
        responseExample: `[
  {
    "id": 1,
    "account_code": "1000",
    "account_name": "Cash and Cash Equivalents",
    "account_type": "asset",
    "parent_id": null,
    "parent_code": null,
    "parent_name": null,
    "child_count": 5
  }
]`,
      },
      {
        method: 'POST',
        path: '/api/accounting/coa',
        description: 'Create a new account in the chart of accounts.',
        bodyParams: [
          { name: 'account_code', type: 'string', required: true, description: 'Unique account code (e.g. "1060")' },
          { name: 'account_name', type: 'string', required: true, description: 'Account name' },
          { name: 'account_type', type: 'string', required: true, description: 'asset | liability | equity | revenue | expense' },
          { name: 'parent_id', type: 'integer', required: false, description: 'Parent account ID for hierarchy' },
        ],
        responseExample: `{ "id": 91, "account_code": "1060" }`,
      },
      {
        method: 'PUT',
        path: '/api/accounting/coa',
        description: 'Update an existing account.',
        bodyParams: [
          { name: 'id', type: 'integer', required: true, description: 'Account ID' },
          { name: 'account_code', type: 'string', required: false, description: 'New account code' },
          { name: 'account_name', type: 'string', required: false, description: 'New account name' },
          { name: 'account_type', type: 'string', required: false, description: 'New account type' },
          { name: 'parent_id', type: 'integer', required: false, description: 'New parent account' },
        ],
        responseExample: `{ "message": "Account updated successfully" }`,
      },
    ],
  },
  {
    id: 'budgets',
    title: 'Budget Management',
    icon: PieChart,
    color: 'teal',
    description: 'Create and track annual budgets by department, category, and cost center.',
    baseUrl: '/api/budgets',
    endpoints: [
      {
        method: 'GET',
        path: '/api/budgets',
        description: 'List all budgets with utilization data (committed, actual, remaining).',
        queryParams: [
          { name: 'school_year', type: 'string', required: false, default: '2025-2026', description: 'School year filter' },
          { name: 'department_id', type: 'integer', required: false, description: 'Department filter' },
        ],
        responseExample: `[
  {
    "id": 1,
    "budget_name": "IT Software Budget",
    "school_year": "2025-2026",
    "department_name": "Administration",
    "category_name": "Software & Licenses",
    "annual_budget": 500000,
    "committed": 200000,
    "actual": 150000,
    "remaining": 150000,
    "status": "active"
  }
]`,
      },
      {
        method: 'POST',
        path: '/api/budgets',
        description: 'Create a new budget entry with optional monthly breakdown.',
        bodyParams: [
          { name: 'budget_name', type: 'string', required: true, description: 'Budget name' },
          { name: 'school_year', type: 'string', required: true, description: 'e.g. "2025-2026"' },
          { name: 'department_id', type: 'integer', required: true, description: 'Department ID' },
          { name: 'category_id', type: 'integer', required: true, description: 'Expense category ID' },
          { name: 'annual_budget', type: 'number', required: true, description: 'Total annual budget amount' },
          { name: 'cost_center_id', type: 'integer', required: false, description: 'Cost center ID' },
          { name: 'fund_source_id', type: 'integer', required: false, description: 'Fund source ID' },
          { name: 'campus', type: 'string', required: false, default: 'Main', description: 'Campus' },
          { name: 'budget_owner', type: 'string', required: false, description: 'Responsible person' },
          { name: 'status', type: 'string', required: false, default: 'draft', description: 'draft | active' },
        ],
        responseExample: `{ "id": 10 }`,
      },
      {
        method: 'GET',
        path: '/api/budgets/allocations',
        description: 'Get monthly budget allocations for the spreadsheet view.',
        queryParams: [
          { name: 'school_year', type: 'string', required: false, default: '2025-2026', description: 'School year filter' },
        ],
        responseExample: `[
  {
    "budget_id": 1,
    "budget_name": "IT Software Budget",
    "department": "Administration",
    "category": "Software & Licenses",
    "annual_budget": 500000,
    "months": {
      "7": { "amount": 41667, "committed": 0, "actual": 0 },
      "8": { "amount": 41667, "committed": 0, "actual": 0 }
    }
  }
]`,
      },
      {
        method: 'PUT',
        path: '/api/budgets/allocations',
        description: 'Update monthly budget allocation amounts.',
        bodyParams: [
          { name: 'updates', type: 'array', required: true, description: 'Array of {budget_id, month, amount}' },
        ],
        responseExample: `{ "success": true }`,
      },
    ],
  },
  {
    id: 'disbursements',
    title: 'Disbursement Requests',
    icon: FileText,
    color: 'orange',
    description: 'Create and manage expense/disbursement requests with multi-level approval workflow.',
    baseUrl: '/api/disbursements',
    endpoints: [
      {
        method: 'GET',
        path: '/api/disbursements',
        description: 'List all disbursement requests.',
        queryParams: [
          { name: 'status', type: 'string', required: false, description: 'Filter by status: draft | pending_approval | approved | paid | rejected' },
          { name: 'department_id', type: 'integer', required: false, description: 'Filter by department' },
        ],
        responseExample: `[
  {
    "id": 1,
    "request_number": "DR-2025-0001",
    "request_date": "2025-07-05",
    "department_name": "Administration",
    "category_name": "Software & Licenses",
    "payee_name": "TechSoft Solutions Inc.",
    "requested_by_name": "Roberto Tan",
    "amount": 250000,
    "status": "paid"
  }
]`,
      },
      {
        method: 'POST',
        path: '/api/disbursements',
        description: 'Create a new disbursement request with line items.',
        bodyParams: [
          { name: 'request_date', type: 'string (YYYY-MM-DD)', required: true, description: 'Request date' },
          { name: 'due_date', type: 'string (YYYY-MM-DD)', required: false, description: 'Due date' },
          { name: 'payee_id', type: 'integer', required: false, description: 'Payee / vendor ID' },
          { name: 'payee_type', type: 'string', required: false, default: 'vendor', description: 'vendor | employee | other' },
          { name: 'department_id', type: 'integer', required: true, description: 'Department ID' },
          { name: 'category_id', type: 'integer', required: true, description: 'Expense category ID' },
          { name: 'budget_id', type: 'integer', required: false, description: 'Budget to charge against' },
          { name: 'amount', type: 'number', required: true, description: 'Total request amount' },
          { name: 'payment_method', type: 'string', required: false, default: 'bank_transfer', description: 'Payment method' },
          { name: 'description', type: 'string', required: false, description: 'Description / justification' },
          { name: 'items', type: 'array', required: false, description: 'Line items [{description, quantity, unit_cost, amount}]' },
        ],
        responseExample: `{ "id": 10, "request_number": "DR-2025-0010" }`,
      },
      {
        method: 'GET',
        path: '/api/disbursements/{id}',
        description: 'Get full details of a disbursement request including items, approvals, payments, and attachments.',
        responseExample: `{
  "id": 1,
  "request_number": "DR-2025-0001",
  "amount": 250000,
  "status": "paid",
  "department_name": "Administration",
  "payee_name": "TechSoft Solutions Inc.",
  "budget_name": "IT Software Budget",
  "budget_remaining": 150000,
  "items": [
    { "description": "Annual license", "quantity": 1, "unit_cost": 250000, "amount": 250000 }
  ],
  "approvals": [
    { "approver_role": "department_head", "action": "approved", "acted_at": "2025-07-06" }
  ],
  "payments": [...],
  "attachments": [...]
}`,
      },
      {
        method: 'POST',
        path: '/api/disbursements/{id}/submit',
        description: 'Submit a draft disbursement for approval. Validates budget availability. Blocked if budget is exceeded (configurable).',
        responseExample: `{ "success": true, "status": "pending_approval" }`,
        notes: 'Budget policy: if overspending policy is "block", submission is rejected when request exceeds available budget.',
      },
      {
        method: 'POST',
        path: '/api/disbursements/{id}/approve',
        description: 'Approve, reject, or return a disbursement request. Follows multi-level approval flow.',
        bodyParams: [
          { name: 'action', type: 'string', required: true, description: 'approved | rejected | returned' },
          { name: 'comments', type: 'string', required: false, description: 'Approval comments' },
          { name: 'approver_role', type: 'string', required: true, description: 'department_head | finance_staff | finance_manager | treasury' },
        ],
        notes: 'Approval flow: department_head → finance_staff → finance_manager → treasury. After treasury approval, status becomes "approved".',
        responseExample: `{ "success": true }`,
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payment Processing',
    icon: CreditCard,
    color: 'emerald',
    description: 'Process payments for approved disbursements. Creates journal entries and updates budget utilization.',
    baseUrl: '/api/payments',
    endpoints: [
      {
        method: 'GET',
        path: '/api/payments',
        description: 'List all processed payments with voucher numbers.',
        responseExample: `[
  {
    "id": 1,
    "voucher_number": "PV-2025-0001",
    "disbursement_id": 1,
    "request_number": "DR-2025-0001",
    "payment_date": "2025-07-15",
    "payment_method": "bank_transfer",
    "net_amount": 250000,
    "status": "completed",
    "payee_name": "TechSoft Solutions Inc."
  }
]`,
      },
      {
        method: 'POST',
        path: '/api/payments',
        description: 'Process a payment for an approved disbursement. Generates a payment voucher, creates journal entries (Debit Expense, Credit Cash), and moves budget from committed to actual.',
        bodyParams: [
          { name: 'disbursement_id', type: 'integer', required: true, description: 'Approved disbursement ID' },
          { name: 'payment_date', type: 'string (YYYY-MM-DD)', required: true, description: 'Payment date' },
          { name: 'payment_method', type: 'string', required: true, description: 'cash | check | bank_transfer' },
          { name: 'bank_account', type: 'string', required: false, description: 'Bank account used' },
          { name: 'check_number', type: 'string', required: false, description: 'Check number' },
          { name: 'reference_number', type: 'string', required: false, description: 'Transaction reference' },
          { name: 'gross_amount', type: 'number', required: true, description: 'Gross payment amount' },
          { name: 'withholding_tax', type: 'number', required: false, default: '0', description: 'Withholding tax deducted' },
          { name: 'net_amount', type: 'number', required: true, description: 'Net amount paid' },
        ],
        notes: `**Side effects:** Creates journal entry (JE-YYYY-NNNN), updates disbursement status to "paid", moves budget from committed to actual spending.`,
        responseExample: `{ "id": 6, "voucher_number": "PV-2025-0006" }`,
      },
    ],
  },
  {
    id: 'payees',
    title: 'Vendors / Payees',
    icon: Users,
    color: 'slate',
    description: 'Manage vendor and payee master data with payment history.',
    baseUrl: '/api/payees',
    endpoints: [
      {
        method: 'GET',
        path: '/api/payees',
        description: 'List all vendors/payees with payment summary.',
        queryParams: [
          { name: 'type', type: 'string', required: false, description: 'Filter by type: vendor | employee | other' },
          { name: 'search', type: 'string', required: false, description: 'Search by name or code' },
        ],
        responseExample: `[
  {
    "id": 1,
    "payee_code": "V-001",
    "name": "TechSoft Solutions Inc.",
    "type": "vendor",
    "tin": "001-234-567-000",
    "email": "billing@techsoft.ph",
    "bank_name": "BDO",
    "payment_count": 2,
    "total_paid": 360000,
    "outstanding_count": 0,
    "outstanding_amount": 0
  }
]`,
      },
      {
        method: 'POST',
        path: '/api/payees',
        description: 'Create a new vendor / payee.',
        bodyParams: [
          { name: 'payee_code', type: 'string', required: true, description: 'Unique vendor code' },
          { name: 'name', type: 'string', required: true, description: 'Vendor / payee name' },
          { name: 'type', type: 'string', required: false, default: 'vendor', description: 'vendor | employee | other' },
          { name: 'tin', type: 'string', required: false, description: 'Tax Identification Number' },
          { name: 'email', type: 'string', required: false, description: 'Contact email' },
          { name: 'phone', type: 'string', required: false, description: 'Contact phone' },
          { name: 'address', type: 'string', required: false, description: 'Business address' },
          { name: 'bank_name', type: 'string', required: false, description: 'Bank name' },
          { name: 'bank_account_number', type: 'string', required: false, description: 'Bank account number' },
        ],
        responseExample: `{ "id": 7 }`,
      },
    ],
  },
  {
    id: 'periods',
    title: 'Accounting Periods',
    icon: Landmark,
    color: 'amber',
    description: 'Manage accounting period open/close status for month-end and year-end closing.',
    baseUrl: '/api/accounting/periods',
    endpoints: [
      {
        method: 'GET',
        path: '/api/accounting/periods',
        description: 'List all accounting periods with status.',
        responseExample: `[
  {
    "id": 1,
    "period_name": "June 2025",
    "school_year": "2025-2026",
    "start_date": "2025-06-01",
    "end_date": "2025-06-30",
    "status": "closed",
    "closed_by": "Finance Manager",
    "closed_date": "2025-07-05"
  }
]`,
      },
      {
        method: 'PUT',
        path: '/api/accounting/periods',
        description: 'Close or reopen an accounting period.',
        bodyParams: [
          { name: 'id', type: 'integer', required: true, description: 'Period ID' },
          { name: 'action', type: 'string', required: true, description: 'close | reopen' },
          { name: 'closed_by', type: 'string', required: false, description: 'User performing the action' },
        ],
        responseExample: `{ "message": "Period closed successfully" }`,
      },
    ],
  },
  {
    id: 'reports',
    title: 'Financial Reports',
    icon: BarChart3,
    color: 'cyan',
    description: 'Generate financial statements, budget reports, and accounting reports.',
    baseUrl: '/api/reports',
    endpoints: [
      {
        method: 'GET',
        path: '/api/reports?type=budget-vs-actual',
        description: 'Budget vs Actual report by department/category.',
        queryParams: [
          { name: 'school_year', type: 'string', required: false, default: '2025-2026', description: 'School year' },
          { name: 'department_id', type: 'integer', required: false, description: 'Department filter' },
        ],
        responseExample: `{
  "data": [
    { "budget_name": "IT Software", "department": "Administration", "budget": 500000, "actual": 150000, "variance": 350000 }
  ],
  "totals": { "total_budget": 6380000, "total_actual": 3115000, "total_variance": 3265000 }
}`,
      },
      {
        method: 'GET',
        path: '/api/reports/accounting?type=trial-balance',
        description: 'Trial balance report. Shows all accounts with debit/credit balances.',
        queryParams: [
          { name: 'date_from', type: 'string', required: false, default: '2025-06-01', description: 'Period start' },
          { name: 'date_to', type: 'string', required: false, default: '2026-05-31', description: 'Period end' },
        ],
        responseExample: `{
  "data": [
    { "account_code": "1010", "account_name": "Cash on Hand", "account_type": "asset", "total_debit": 500000, "total_credit": 0, "balance": 500000 }
  ],
  "totals": { "totalDebit": 53520481.30, "totalCredit": 53520481.30, "difference": 0 }
}`,
      },
      {
        method: 'GET',
        path: '/api/reports/accounting?type=balance-sheet',
        description: 'Balance Sheet / Statement of Financial Position.',
        responseExample: `{
  "assets": [{ "account_code": "1010", "account_name": "Cash on Hand", "balance": 500000 }],
  "liabilities": [...],
  "equity": [...],
  "totals": { "totalAssets": 53520481.30, "totalLiabilities": 11337827.88, "totalEquity": 36300000 }
}`,
      },
      {
        method: 'GET',
        path: '/api/reports/accounting?type=income-statement',
        description: 'Income Statement / Profit & Loss.',
        responseExample: `{
  "revenue": [...],
  "costOfServices": [...],
  "expenses": [...],
  "totals": { "totalRevenue": 25800000, "grossProfit": 25800000, "totalExpenses": 19600000, "netIncome": 6200000 }
}`,
      },
      {
        method: 'GET',
        path: '/api/reports/tax?type=vat-summary',
        description: 'VAT summary report with monthly breakdown.',
        responseExample: `{
  "outputVat": 1200000,
  "inputVat": 450000,
  "netVat": 750000,
  "monthly": [{ "month": "Jul 2025", "output_vat": 100000, "input_vat": 37500, "net_vat": 62500 }]
}`,
      },
      {
        method: 'GET',
        path: '/api/reports/tax?type=withholding-tax',
        description: 'Withholding tax summary with vendor breakdown.',
        responseExample: `{
  "ewt": 85000,
  "compensation": 120000,
  "totalWithholding": 205000,
  "vendorEwt": [{ "vendor": "TechSoft Solutions", "ewt": 15000 }]
}`,
      },
    ],
  },
  {
    id: 'approvals',
    title: 'Approval Queue',
    icon: Shield,
    color: 'yellow',
    description: 'Get pending disbursement approvals with budget context.',
    baseUrl: '/api/approvals',
    endpoints: [
      {
        method: 'GET',
        path: '/api/approvals',
        description: 'List all pending disbursement requests awaiting approval, including budget utilization data.',
        responseExample: `[
  {
    "id": 3,
    "request_number": "DR-2025-0003",
    "amount": 85000,
    "department_name": "Academics",
    "payee_name": "National Book Store",
    "status": "pending_approval",
    "budget_name": "Academic Books",
    "budget_total": 1000000,
    "budget_committed": 200000,
    "budget_remaining": 600000
  }
]`,
      },
    ],
  },
  {
    id: 'audit',
    title: 'Audit Trail',
    icon: Shield,
    color: 'gray',
    description: 'View audit logs of all system actions.',
    baseUrl: '/api/audit',
    endpoints: [
      {
        method: 'GET',
        path: '/api/audit',
        description: 'Get audit log entries.',
        queryParams: [
          { name: 'entity_type', type: 'string', required: false, description: 'Filter by module: disbursement | payment | budget | journal_entry' },
          { name: 'limit', type: 'integer', required: false, default: '100', description: 'Max entries to return' },
        ],
        responseExample: `[
  {
    "id": 1,
    "entity_type": "disbursement",
    "entity_id": 1,
    "action": "created",
    "old_values": null,
    "new_values": "{ \\"amount\\": 250000 }",
    "performed_by": "Roberto Tan",
    "created_at": "2025-07-05T10:30:00"
  }
]`,
      },
    ],
  },
  {
    id: 'settings',
    title: 'System Settings',
    icon: Settings,
    color: 'stone',
    description: 'Get and update system settings, plus master data lookups (departments, categories, fund sources, cost centers).',
    baseUrl: '/api/settings',
    endpoints: [
      {
        method: 'GET',
        path: '/api/settings',
        description: 'Get all system settings and master data lookups.',
        responseExample: `{
  "settings": [
    { "id": 1, "key": "school_name", "value": "OrangeApps Academy", "category": "general" },
    { "id": 2, "key": "overspending_policy", "value": "warning", "category": "budget" }
  ],
  "departments": [
    { "id": 1, "name": "Administration" },
    { "id": 2, "name": "Academics" }
  ],
  "categories": [
    { "id": 1, "name": "Software & Licenses" }
  ],
  "fundSources": [
    { "id": 1, "name": "General Fund" }
  ],
  "costCenters": [
    { "id": 1, "name": "Main Campus Operations" }
  ]
}`,
      },
      {
        method: 'PUT',
        path: '/api/settings',
        description: 'Update system settings.',
        bodyParams: [
          { name: 'settings', type: 'array', required: true, description: 'Array of {key, value, category}' },
        ],
        responseExample: `{ "success": true }`,
      },
    ],
  },
];

// ─── Helper Components ──────────────────────────────────────
function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    POST: 'bg-blue-100 text-blue-700 border-blue-200',
    PUT: 'bg-amber-100 text-amber-700 border-amber-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${colors[method] || 'bg-gray-100 text-gray-700'} font-mono`}>
      {method}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Copy">
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 bg-[#1e1e2e]">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-medium">{title}</span>
          <CopyButton text={code} />
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed">
        <code className="text-gray-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}

function ParamTable({ params, title }: { params: Param[]; title: string }) {
  return (
    <div className="mt-3">
      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h5>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-2 font-medium text-gray-600">Parameter</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 hidden sm:table-cell">Default</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map(p => (
              <tr key={p.name} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-primary-700">{p.name}</code>
                  {p.required && <span className="text-red-500 ml-1 text-xs">*</span>}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500 font-mono">{p.type}</td>
                <td className="px-4 py-2 text-xs text-gray-400 hidden sm:table-cell">{p.default || '—'}</td>
                <td className="px-4 py-2 text-xs text-gray-600">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const toggleEndpoint = (key: string) => {
    setExpandedEndpoints(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filtered = search
    ? apiSections.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.endpoints.some(e => e.path.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase()))
      )
    : apiSections;

  const BASE_URL = 'https://school-finance-erp.vercel.app';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Code2 size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">OrangeApps Finance API</h1>
              <p className="text-gray-400 text-sm mt-0.5">School ERP — REST API Documentation</p>
            </div>
          </div>

          <p className="text-gray-300 text-sm sm:text-base max-w-3xl leading-relaxed mt-4">
            Complete REST API reference for integrating with the OrangeApps School Finance ERP system.
            Covers Accounts Receivable, Accounts Payable, Budget Management, Disbursements, Payments,
            General Ledger, and Financial Reporting.
          </p>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {[
              { icon: Globe, label: 'Base URL', value: BASE_URL },
              { icon: Server, label: 'Format', value: 'JSON (REST)' },
              { icon: Zap, label: 'Endpoints', value: `${apiSections.reduce((s, sec) => s + sec.endpoints.length, 0)} endpoints` },
              { icon: Lock, label: 'Auth', value: 'API Key (coming soon)' },
            ].map(info => (
              <div key={info.label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <info.icon size={14} className="text-gray-500" />
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{info.label}</span>
                </div>
                <p className="text-sm font-medium text-gray-200 truncate">{info.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Sidebar Nav */}
        <nav className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-6 space-y-1">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">API Modules</h3>
            {apiSections.map(sec => {
              const Icon = sec.icon;
              return (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === sec.id
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  <span className="truncate">{sec.title}</span>
                  <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                    {sec.endpoints.length}
                  </span>
                </a>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search endpoints, modules, or parameters..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
            />
          </div>

          {/* API Sections */}
          {filtered.map(section => {
            const SectionIcon = section.icon;
            return (
              <section key={section.id} id={section.id} className="scroll-mt-6">
                {/* Section Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 bg-${section.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <SectionIcon size={20} className={`text-${section.color}-600`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Base: {BASE_URL}{section.baseUrl}</p>
                  </div>
                </div>

                {/* Endpoints */}
                <div className="space-y-3">
                  {section.endpoints.map((ep, epIdx) => {
                    const key = `${section.id}-${epIdx}`;
                    const isExpanded = expandedEndpoints[key] || false;
                    return (
                      <div key={key} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                        {/* Endpoint Header */}
                        <button
                          onClick={() => toggleEndpoint(key)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <MethodBadge method={ep.method} />
                          <code className="text-sm font-mono text-gray-700 flex-1 truncate">{ep.path}</code>
                          <span className="text-xs text-gray-400 hidden sm:block max-w-[200px] truncate">{ep.description}</span>
                          {isExpanded
                            ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                            : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                          }
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50 space-y-4">
                            <p className="text-sm text-gray-700">{ep.description}</p>

                            {ep.notes && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
                                <strong>Note:</strong> {ep.notes}
                              </div>
                            )}

                            {/* cURL Example */}
                            <CodeBlock
                              title="cURL Example"
                              code={ep.method === 'GET'
                                ? `curl "${BASE_URL}${ep.path}"`
                                : `curl -X ${ep.method} "${BASE_URL}${ep.path}" \\\n  -H "Content-Type: application/json" \\\n  -d '{ ... }'`
                              }
                            />

                            {ep.queryParams && <ParamTable params={ep.queryParams} title="Query Parameters" />}
                            {ep.bodyParams && <ParamTable params={ep.bodyParams} title="Request Body" />}

                            {ep.responseExample && (
                              <CodeBlock title="Response Example" code={ep.responseExample} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Integration Guide */}
          <section className="border border-gray-200 rounded-xl bg-white shadow-sm p-6 mt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap size={20} className="text-primary-500" />
              Quick Integration Guide
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-sm text-gray-800 mb-2">Enrollment → Billing (AR)</h3>
                <div className="text-xs text-gray-600 space-y-2">
                  <p>1. When a student enrolls, <code className="bg-gray-100 px-1 rounded">POST /api/accounting/ar?type=invoices</code> to create tuition charges.</p>
                  <p>2. Use <code className="bg-gray-100 px-1 rounded">lines[]</code> for itemized fees (tuition, lab, misc).</p>
                  <p>3. Set <code className="bg-gray-100 px-1 rounded">school_year</code> and <code className="bg-gray-100 px-1 rounded">semester</code> for proper tagging.</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-800 mb-2">Cashiering → Collections (AR)</h3>
                <div className="text-xs text-gray-600 space-y-2">
                  <p>1. When a payment is received, <code className="bg-gray-100 px-1 rounded">POST /api/accounting/ar?type=collections</code>.</p>
                  <p>2. Include <code className="bg-gray-100 px-1 rounded">allocations[]</code> to apply against specific invoices.</p>
                  <p>3. The system auto-updates invoice balances and status.</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-800 mb-2">Procurement → Disbursements (AP)</h3>
                <div className="text-xs text-gray-600 space-y-2">
                  <p>1. Create request: <code className="bg-gray-100 px-1 rounded">POST /api/disbursements</code></p>
                  <p>2. Submit for approval: <code className="bg-gray-100 px-1 rounded">POST /api/disbursements/:id/submit</code></p>
                  <p>3. Process payment: <code className="bg-gray-100 px-1 rounded">POST /api/payments</code></p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-800 mb-2">Balance Inquiry</h3>
                <div className="text-xs text-gray-600 space-y-2">
                  <p>1. Student balance: <code className="bg-gray-100 px-1 rounded">GET /api/accounting/ar?type=soa&customer_id=X</code></p>
                  <p>2. Vendor payables: <code className="bg-gray-100 px-1 rounded">GET /api/accounting/ap?type=aging</code></p>
                  <p>3. Budget remaining: <code className="bg-gray-100 px-1 rounded">GET /api/budgets</code></p>
                </div>
              </div>
            </div>
          </section>

          {/* Status Codes */}
          <section className="border border-gray-200 rounded-xl bg-white shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">HTTP Status Codes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[
                { code: '200', label: 'OK', desc: 'Successful GET/PUT', color: 'green' },
                { code: '201', label: 'Created', desc: 'Successful POST', color: 'blue' },
                { code: '400', label: 'Bad Request', desc: 'Invalid parameters', color: 'amber' },
                { code: '404', label: 'Not Found', desc: 'Resource not found', color: 'orange' },
                { code: '500', label: 'Server Error', desc: 'Internal error', color: 'red' },
              ].map(s => (
                <div key={s.code} className={`bg-${s.color}-50 border border-${s.color}-200 rounded-lg px-3 py-2`}>
                  <span className={`text-${s.color}-700 font-bold font-mono`}>{s.code}</span>
                  <span className="text-gray-600 ml-1.5">{s.label}</span>
                  <p className="text-[11px] text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
