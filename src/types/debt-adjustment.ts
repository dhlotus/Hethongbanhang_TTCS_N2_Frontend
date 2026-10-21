export type DebtAdjustmentStatus = 'POSTED' | 'DRAFT' | 'CANCELLED';

export interface DebtAdjustmentItem {
  productId: string;
  productSku: string;
  productName: string;
  unit?: string;
  quantity: number;
  originalUnitPrice: number; // Đơn giá mua thực tế trên hóa đơn gốc
  lineTotal: number;
  conditionType?: 'GOOD' | 'DAMAGED';
  batchNumber?: string | null;
}

export interface DebtAdjustmentVoucher {
  id: string;
  code: string; // DC-CN-YYMM-XXX
  returnReceiptId: string;
  returnReceiptCode?: string;
  agencyId: string;
  agencyCode?: string;
  agencyName?: string;
  originalInvoiceId: string;
  originalInvoiceCode?: string;
  adjustmentAmount: number; // Tổng số tiền giảm trừ
  reason: string;
  status: DebtAdjustmentStatus; // 'POSTED'
  createdBy: string;
  creatorName?: string;
  slipCreatedBy?: string;
  slipCreatorName?: string;
  slipCreatorUsername?: string;
  slipCreatorDisplayName?: string;
  accountantName?: string;
  accountantUsername?: string;
  accountantDisplayName?: string;
  items?: DebtAdjustmentItem[];
  ledgerEntry?: {
    id?: number | string;
    transaction_type?: string;
    reference_type?: string;
    reference_id?: string;
    debit_amount?: number;
    credit_amount?: number;
    balance_after?: number;
    aging_bucket?: string;
    notes?: string;
    created_at?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingReturnReceipt {
  id: string;
  code: string;
  originalInvoiceId: string;
  originalInvoiceCode: string;
  agencyId: string;
  agencyCode: string;
  agencyName: string;
  totalRefundAmount: number;
  reason: string;
  approvedAt?: string;
  createdAt: string;
  items: Array<{
    productId: string;
    productSku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    conditionType: 'GOOD' | 'DAMAGED';
    unit?: string;
  }>;
}

export interface CreateDebtAdjustmentPayload {
  return_receipt_id: string;
  agency_id?: string;
  original_invoice_id?: string;
  reason?: string;
}

export interface QueryDebtAdjustmentsParams {
  page?: number;
  limit?: number;
  search?: string;
  agency_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface DebtAdjustmentsListResponse {
  data: DebtAdjustmentVoucher[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalAmount: number;
    totalVouchers: number;
  };
}
