import { apiClient } from './api';
import type {
  Supplier,
  SupplierQueryParams,
  PaginatedSuppliersResponse,
  SupplierSummary,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  SupplierStatus,
} from '../types/supplier';

/**
 * Chuẩn hóa đối tượng Supplier để hỗ trợ cả camelCase và snake_case từ Backend
 */
const normalizeSupplier = (raw: Record<string, unknown>): Supplier => {
  return {
    id: String(raw.id || ''),
    code: String(raw.code || ''),
    name: String(raw.name || ''),
    taxCode: (raw.taxCode as string) || (raw.tax_code as string) || undefined,
    tax_code: (raw.taxCode as string) || (raw.tax_code as string) || undefined,
    contactName: (raw.contactName as string) || (raw.contact_name as string) || undefined,
    contact_name: (raw.contactName as string) || (raw.contact_name as string) || undefined,
    phone: (raw.phone as string) || undefined,
    email: (raw.email as string) || undefined,
    address: (raw.address as string) || undefined,
    paymentTerms: (raw.paymentTerms as string) || (raw.payment_terms as string) || undefined,
    payment_terms: (raw.paymentTerms as string) || (raw.payment_terms as string) || undefined,
    status: (raw.status as SupplierStatus) || 'ACTIVE',
    notes: (raw.notes as string) || undefined,
    hasReceipts: Boolean(raw.hasReceipts ?? raw.has_receipts ?? false),
    has_receipts: Boolean(raw.hasReceipts ?? raw.has_receipts ?? false),
    createdAt: (raw.createdAt as string) || (raw.created_at as string),
    created_at: (raw.createdAt as string) || (raw.created_at as string),
    updatedAt: (raw.updatedAt as string) || (raw.updated_at as string),
    updated_at: (raw.updatedAt as string) || (raw.updated_at as string),
  };
};

/**
 * Trích xuất câu thông báo lỗi thân thiện từ phản hồi Axios
 */
const extractErrorMessage = (err: unknown, fallback: string): string => {
  const axiosErr = err as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const serverMsg = axiosErr?.response?.data?.message;
  if (serverMsg) {
    return Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
  }
  return axiosErr?.message || fallback;
};

export const suppliersService = {
  /**
   * Lấy danh sách Nhà cung cấp (phân trang, tìm kiếm, lọc theo trạng thái)
   * Kết nối Server-Side 100%, có kèm summary thống kê toàn hệ thống
   */
  async getSuppliers(params: SupplierQueryParams = {}): Promise<PaginatedSuppliersResponse> {
    const { page = 1, limit = 20, search = '', status = 'ALL' } = params;

    const queryParams: Record<string, string | number> = { page, limit };
    if (search.trim()) queryParams.search = search.trim();
    if (status !== 'ALL') queryParams.status = status;

    const response = await apiClient.get<PaginatedSuppliersResponse>('/suppliers', {
      params: queryParams,
    });

    const items = (response.data?.data || []).map((s) =>
      normalizeSupplier(s as unknown as Record<string, unknown>)
    );

    return {
      data: items,
      total: response.data?.total || items.length,
      page: response.data?.page || page,
      limit: response.data?.limit || limit,
      totalPages: response.data?.totalPages || 1,
      summary: response.data?.summary,
    };
  },

  /**
   * Lấy số liệu thống kê tổng thể Nhà cung cấp toàn hệ thống (Active, Inactive, Đã nhập kho)
   */
  async getSupplierStats(): Promise<SupplierSummary> {
    const response = await apiClient.get<SupplierSummary>('/suppliers/stats');
    return response.data;
  },

  /**
   * Lấy chi tiết Nhà cung cấp theo ID hoặc Mã
   */
  async getSupplierById(idOrCode: string): Promise<Supplier> {
    const response = await apiClient.get<Supplier>(`/suppliers/${idOrCode}`);
    return normalizeSupplier(response.data as unknown as Record<string, unknown>);
  },

  /**
   * Thêm mới Nhà cung cấp
   */
  async createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
    try {
      const response = await apiClient.post<Supplier>('/suppliers', payload);
      return normalizeSupplier(response.data as unknown as Record<string, unknown>);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể thêm mới nhà cung cấp'));
    }
  },

  /**
   * Cập nhật thông tin Nhà cung cấp
   */
  async updateSupplier(id: string, payload: UpdateSupplierPayload): Promise<Supplier> {
    try {
      const response = await apiClient.put<Supplier>(`/suppliers/${id}`, payload);
      return normalizeSupplier(response.data as unknown as Record<string, unknown>);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể cập nhật nhà cung cấp'));
    }
  },

  /**
   * Chuyển đổi trạng thái hoạt động (Active / Inactive)
   */
  async toggleSupplierStatus(id: string, status?: SupplierStatus): Promise<Supplier> {
    try {
      const response = await apiClient.patch<Supplier>(
        `/suppliers/${id}/status`,
        status ? { status } : {}
      );
      return normalizeSupplier(response.data as unknown as Record<string, unknown>);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể cập nhật trạng thái nhà cung cấp'));
    }
  },

  /**
   * Xóa Nhà cung cấp (Bắt buộc kiểm tra ràng buộc Phiếu nhập kho từ Backend)
   */
  async deleteSupplier(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
      }>(`/suppliers/${id}`);
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Không thể xóa nhà cung cấp'));
    }
  },
};
