import { apiClient } from './api';

export type CollectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface RouteCollection {
  id: string;
  code: string;
  agencyId: string;
  agencyName: string;
  salesRepId: string;
  salesRepName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  receiptImageUrl: string;
  status: CollectionStatus;
  collectionDate: string;
  note?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  orderCodes?: string[];
  orderIds?: string[];
  orderDetails?: Array<{
    orderId?: string;
    orderCode: string;
    totalAmount: number;
    remainingAmount?: number;
    collectedAmount?: number;
    status?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface EligibleOrderForCollection {
  id: string;
  orderId?: string;
  orderCode: string;
  code?: string;
  invoiceId?: string;
  invoiceCode?: string;
  customerId: string;
  customerName: string;
  status: 'DELIVERED' | 'SHIPPED';
  statusLabel: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  issueDate?: string;
  deliveryDate?: string;
  orderDate?: string;
}

export interface CollectionSummary {
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface ReconciliationRow {
  salesRepId: string;
  salesRepName: string;
  collectionDate: string;
  totalRecords: number;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  fulfillmentRate: number; // Tỷ lệ đã nộp (%)
}

export interface QueryCollectionParams {
  sales_rep_id?: string;
  agency_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
}

export interface QueryReconciliationParams {
  date?: string;
  from_date?: string;
  to_date?: string;
  sales_rep_id?: string;
}

export interface CreateCollectionPayload {
  agency_id: string;
  agency_name?: string;
  amount: number;
  payment_method?: PaymentMethod;
  note?: string;
  collection_date?: string;
  receipt_image_url?: string;
  image?: File;
  order_ids?: string[];
  order_codes?: string[];
  order_details?: any;
}

export const collectionsService = {
  /**
   * Lấy danh sách phiếu thu
   */
  async getCollections(params?: QueryCollectionParams): Promise<{
    data: RouteCollection[];
    summary: CollectionSummary;
  }> {
    const res = await apiClient.get<{
      success: boolean;
      data: RouteCollection[];
      summary: CollectionSummary;
    }>('/collections', { params });
    return {
      data: res.data?.data || [],
      summary: res.data?.summary || {
        totalAmount: 0,
        pendingAmount: 0,
        approvedAmount: 0,
        rejectedAmount: 0,
        totalCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
      },
    };
  },

  /**
   * Lấy chi tiết phiếu thu
   */
  async getCollectionById(id: string): Promise<RouteCollection> {
    const res = await apiClient.get<{ success: boolean; data: RouteCollection }>(`/collections/${id}`);
    return res.data?.data;
  },

  /**
   * Tạo phiếu thu mới (Hỗ trợ multipart FormData hoặc JSON)
   */
  async createCollection(payload: CreateCollectionPayload): Promise<RouteCollection> {
    if (payload.image) {
      const formData = new FormData();
      formData.append('agency_id', payload.agency_id);
      if (payload.agency_name) formData.append('agency_name', payload.agency_name);
      formData.append('amount', String(payload.amount));
      if (payload.payment_method) formData.append('payment_method', payload.payment_method);
      if (payload.note) formData.append('note', payload.note);
      if (payload.collection_date) formData.append('collection_date', payload.collection_date);
      if (payload.order_ids) formData.append('order_ids', JSON.stringify(payload.order_ids));
      if (payload.order_codes) formData.append('order_codes', JSON.stringify(payload.order_codes));
      if (payload.order_details) formData.append('order_details', JSON.stringify(payload.order_details));
      formData.append('image', payload.image);

      const res = await apiClient.post<{ success: boolean; data: RouteCollection }>(
        '/collections',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return res.data?.data;
    }

    const res = await apiClient.post<{ success: boolean; data: RouteCollection }>(
      '/collections',
      payload,
    );
    return res.data?.data;
  },

  /**
   * Lấy danh sách đơn hàng đã giao / đang giao đủ điều kiện thu tiền theo tuyến của đại lý (SN-205)
   */
  async getEligibleOrders(agencyId: string): Promise<EligibleOrderForCollection[]> {
    const res = await apiClient.get<{
      success: boolean;
      data: EligibleOrderForCollection[];
    }>('/collections/eligible-orders', { params: { agency_id: agencyId } });
    return res.data?.data || [];
  },

  /**
   * Kế toán duyệt hoặc từ chối phiếu thu
   */
  async updateStatus(
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; note?: string; rejection_reason?: string },
  ): Promise<RouteCollection> {
    const res = await apiClient.patch<{ success: boolean; data: RouteCollection }>(
      `/collections/${id}/status`,
      payload,
    );
    return res.data?.data;
  },

  /**
   * Lấy dữ liệu Bảng đối chiếu tổng hợp
   */
  async getReconciliation(params?: QueryReconciliationParams): Promise<{
    rows: ReconciliationRow[];
    summary: CollectionSummary;
  }> {
    const res = await apiClient.get<{
      success: boolean;
      data: ReconciliationRow[];
      summary: CollectionSummary;
    }>('/collections/reconciliation', { params });
    return {
      rows: res.data?.data || [],
      summary: res.data?.summary || {
        totalAmount: 0,
        pendingAmount: 0,
        approvedAmount: 0,
        rejectedAmount: 0,
        totalCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
      },
    };
  },
};
