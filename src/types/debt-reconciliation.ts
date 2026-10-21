export type ReconciliationStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED';

export interface ReconciliationInvoiceItem {
  code: string;
  date: string;
  amount: number;
  description: string;
}

export interface ReconciliationPaymentItem {
  code: string;
  date: string;
  amount: number;
  method: string;
}

export interface DebtReconciliationReport {
  id: string;
  code: string;
  agencyId: string;
  agencyName: string;
  agencyCode?: string;
  period: string; // VD: '2026-10'
  openingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  closingBalance: number;
  status: ReconciliationStatus;
  disputeNote?: string;
  note?: string;
  createdBy?: string;
  createdByName?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  invoices?: ReconciliationInvoiceItem[];
  payments?: ReconciliationPaymentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationPreview {
  agencyId: string;
  agencyCode?: string;
  agencyName: string;
  period: string;
  openingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  closingBalance: number;
  invoices: ReconciliationInvoiceItem[];
  payments: ReconciliationPaymentItem[];
}

export interface DebtReconciliationSummary {
  totalCount: number;
  pendingCount: number;
  confirmedCount: number;
  disputedCount: number;
  totalClosingBalance: number;
}

export interface PaginatedDebtReconciliationsResult {
  data: DebtReconciliationReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateDebtReconciliationInput {
  agency_id: string;
  period: string;
  note?: string;
}

export interface RespondDebtReconciliationInput {
  status: 'CONFIRMED' | 'DISPUTED';
  dispute_note?: string;
}
