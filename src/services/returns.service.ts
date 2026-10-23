import { apiClient } from './api';

export type ReturnConditionType = 'GOOD' | 'DAMAGED';
export type ReturnReceiptStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ReturnReceiptItem {
  id: string;
  returnReceiptId: string;
  productId: string;
  productSku: string;
  productName: string;
  unit?: string;
  batchNumber?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  conditionType: ReturnConditionType;
  subReason?: string | null;
  createdAt: string;
}

export interface ReturnReceipt {
  id: string;
  code: string;
  originalInvoiceId: string;
  originalInvoiceCode?: string;
  agencyId: string;
  agencyCode?: string;
  agencyName?: string;
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  status: ReturnReceiptStatus;
  reason: string;
  totalRefundAmount: number;
  createdBy: string;
  createdByName?: string;
  warehouseManagerId?: string | null;
  warehouseManagerName?: string | null;
  approvedAt?: string | null;
  approvalNote?: string | null;
  createdAt: string;
  updatedAt: string;
  debtAdjustmentCode?: string;
  items?: ReturnReceiptItem[];
}

export interface EligibleInvoice {
  id: string;
  code: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  issueDate: string;
  remainingAmount: number;
}

export interface InvoiceLineDetail {
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  purchasedQuantity: number;
  unitPrice: number;
  alreadyReturnedQuantity: number;
  remainingReturnableQuantity: number;
  availableBatches?: string[];
}

export interface InvoiceDetailsResponse {
  invoice: any;
  lines: InvoiceLineDetail[];
}

export interface CreateReturnReceiptDto {
  original_invoice_id: string;
  agency_id: string;
  warehouse_id?: string;
  reason: string;
  items: Array<{
    product_id: string;
    product_sku?: string;
    product_name?: string;
    unit?: string;
    batch_number?: string;
    quantity: number;
    unit_price?: number;
    condition_type: ReturnConditionType;
    sub_reason?: string;
  }>;
}

export interface ApproveReturnReceiptDto {
  action: 'APPROVE' | 'REJECT';
  note?: string;
}

export interface ReturnReceiptsResponse {
  data: ReturnReceipt[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: {
    totalReceipts?: number;
    totalPending?: number;
    totalApproved?: number;
    totalRefundAmount?: number;
  };
}

// Kiểu dữ liệu tương thích cũ
export type ReturnRequest = ReturnReceipt;

export const returnsService = {
  /**
   * Lấy danh sách phiếu trả hàng (SN-210)
   */
  async getReturnReceipts(params?: {
    status?: string;
    search?: string;
    agencyId?: string;
    warehouseId?: string;
    page?: number;
    limit?: number;
  }): Promise<ReturnReceiptsResponse | ReturnReceipt[]> {
    const res = await apiClient.get<ReturnReceiptsResponse | ReturnReceipt[]>('/return-receipts', { params });
    return res.data;
  },

  /**
   * Chi tiết phiếu trả hàng
   */
  async getReturnReceiptById(id: string): Promise<ReturnReceipt> {
    const res = await apiClient.get<ReturnReceipt>(`/return-receipts/${id}`);
    return res.data;
  },

  /**
   * Tạo mới phiếu trả hàng từ đại lý (SN-210 API 1)
   */
  async createReturnReceipt(data: CreateReturnReceiptDto): Promise<ReturnReceipt> {
    const res = await apiClient.post<ReturnReceipt>('/return-receipts', data);
    return res.data;
  },

  /**
   * Quản lý kho xác nhận nhận hàng / duyệt nhập kho (SN-210 API 2)
   */
  async approveReturnReceipt(id: string, data: ApproveReturnReceiptDto): Promise<ReturnReceipt> {
    const res = await apiClient.patch<ReturnReceipt>(`/return-receipts/${id}/approve`, data);
    return res.data;
  },

  /**
   * Lấy danh sách hóa đơn khả dụng của đại lý
   */
  async getEligibleInvoices(agencyId?: string): Promise<EligibleInvoice[]> {
    const res = await apiClient.get<EligibleInvoice[]>('/return-receipts/eligible-invoices', {
      params: agencyId ? { agencyId } : undefined,
    });
    return res.data;
  },

  /**
   * Lấy chi tiết các dòng sản phẩm và số lượng có thể trả của hóa đơn
   */
  async getInvoiceLines(invoiceId: string): Promise<InvoiceDetailsResponse> {
    const res = await apiClient.get<InvoiceDetailsResponse>(`/return-receipts/invoice-lines/${invoiceId}`);
    return res.data;
  },

  /**
   * Xóa phiếu trả hàng
   */
  async deleteReturnReceipt(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/return-receipts/${id}`);
    return res.data;
  },

  // Alias methods tương thích cũ
  async getReturns(params?: any): Promise<ReturnReceiptsResponse | ReturnReceipt[]> {
    return this.getReturnReceipts(params);
  },
  async getReturnById(id: string): Promise<ReturnReceipt> {
    return this.getReturnReceiptById(id);
  },
  async createReturn(data: any): Promise<ReturnReceipt> {
    return this.createReturnReceipt(data);
  },
  async approveReturn(id: string): Promise<ReturnReceipt> {
    return this.approveReturnReceipt(id, { action: 'APPROVE' });
  },
  async deleteReturn(id: string): Promise<{ success: boolean; message: string }> {
    return this.deleteReturnReceipt(id);
  },
};
