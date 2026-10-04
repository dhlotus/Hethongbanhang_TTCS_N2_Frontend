import { apiClient } from './api';
import type {
  Supplier,
  SupplierQueryParams,
  PaginatedSuppliersResponse,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  SupplierStatus,
} from '../types/supplier';

/**
 * Danh sách Nhà cung cấp mẫu fallback khi offline
 */
let MOCK_SUPPLIERS: Supplier[] = [
  {
    id: '22222222-0000-0000-0000-000000000001',
    code: 'NCC-BEV-01',
    name: 'Công ty Cổ phần Nước giải khát LOHA Quốc Tế',
    taxCode: '0312345678',
    contactName: 'Ông Đỗ Quốc Tuấn',
    phone: '02838123456',
    email: 'supply@loha.vn',
    address: 'KCN Tân Bình, Tây Thạnh, Tân Phú, TP.HCM',
    paymentTerms: 'NET_45',
    status: 'ACTIVE',
    notes: 'Nhà cung cấp đồ uống và nguyên liệu nước giải khát chính thức',
    hasReceipts: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    code: 'NCC-AQUA-02',
    name: 'Công ty TNHH Khai Thác Khoáng Tinh Khiết Aqua Life',
    taxCode: '0398765432',
    contactName: 'Bà Mai Thị Lan',
    phone: '02723789012',
    email: 'contact@aqualife.vn',
    address: 'Xã Long Hậu, Cần Giuộc, Long An',
    paymentTerms: 'NET_30',
    status: 'ACTIVE',
    notes: 'Chuyên cung cấp nước khoáng thiên nhiên đóng chai các loại',
    hasReceipts: true,
    createdAt: '2026-01-15T09:30:00Z',
    updatedAt: '2026-01-15T09:30:00Z',
  },
  {
    id: '22222222-0000-0000-0000-000000000003',
    code: 'NCC-DAIRY-03',
    name: 'Công ty Cổ phần Sữa & Dinh Dưỡng Quốc Tế NutriPlus',
    taxCode: '0105678912',
    contactName: 'Bà Hoàng Thục Anh',
    phone: '02439876543',
    email: 'order@nutriplus.vn',
    address: 'Số 18 Hoàng Quốc Việt, Cầu Giấy, Hà Nội',
    paymentTerms: 'NET_15',
    status: 'ACTIVE',
    notes: 'Đơn vị sản xuất và phân phối sữa bột công thức, sữa hạt cao cấp',
    hasReceipts: false,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: '22222222-0000-0000-0000-000000000004',
    code: 'NCC-PACK-04',
    name: 'Nhà máy Bao Bì & Đóng Gói Tân Tiến Phát',
    taxCode: '0309876541',
    contactName: 'Ông Lê Thanh Hải',
    phone: '02837654321',
    email: 'kinhdoanh@tantienphat.com.vn',
    address: 'Lô B2 KCN Hiệp Phước, Nhà Bè, TP.HCM',
    paymentTerms: 'COD',
    status: 'ACTIVE',
    notes: 'Cung cấp bao bì thùng carton, màng co lốc và tem nhãn',
    hasReceipts: false,
    createdAt: '2026-02-10T14:15:00Z',
    updatedAt: '2026-02-10T14:15:00Z',
  },
  {
    id: '22222222-0000-0000-0000-000000000005',
    code: 'NCC-OLD-05',
    name: 'Hợp tác xã Nông Sản Hữu Cơ Sạch Thảo Mộc Xanh',
    taxCode: '3701239876',
    contactName: 'Ông Phạm Văn Hùng',
    phone: '02743890123',
    email: 'thaomocxanh.coop@gmail.com',
    address: 'Phường Lái Thiêu, TP. Thuận An, Bình Dương',
    paymentTerms: 'NET_30',
    status: 'INACTIVE',
    notes: 'Tạm ngừng hợp tác do chuyển đổi mô hình cung ứng vùng nguyên liệu',
    hasReceipts: false,
    createdAt: '2026-01-05T07:45:00Z',
    updatedAt: '2026-02-20T16:00:00Z',
  },
];

/**
 * Chuẩn hóa đối tượng Supplier để hỗ trợ cả camelCase và snake_case
 */
const normalizeSupplier = (raw: Record<string, unknown>): Supplier => {
  return {
    id: String(raw.id || ''),
    code: String(raw.code || ''),
    name: String(raw.name || ''),
    taxCode: (raw.taxCode as string) || (raw.tax_code as string) || undefined,
    tax_code: (raw.taxCode as string) || (raw.tax_code as string) || undefined,
    contactName:
      (raw.contactName as string) || (raw.contact_name as string) || undefined,
    contact_name:
      (raw.contactName as string) || (raw.contact_name as string) || undefined,
    phone: (raw.phone as string) || undefined,
    email: (raw.email as string) || undefined,
    address: (raw.address as string) || undefined,
    paymentTerms:
      (raw.paymentTerms as string) ||
      (raw.payment_terms as string) ||
      undefined,
    payment_terms:
      (raw.paymentTerms as string) ||
      (raw.payment_terms as string) ||
      undefined,
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

export const suppliersService = {
  /**
   * Lấy danh sách Nhà cung cấp (phân trang, tìm kiếm, lọc)
   */
  async getSuppliers(
    params: SupplierQueryParams = {},
  ): Promise<PaginatedSuppliersResponse> {
    const { page = 1, limit = 20, search = '', status = 'ALL' } = params;

    try {
      const queryParams: Record<string, string | number> = { page, limit };
      if (search.trim()) queryParams.search = search.trim();
      if (status !== 'ALL') queryParams.status = status;

      const response = await apiClient.get<PaginatedSuppliersResponse>(
        '/suppliers',
        { params: queryParams },
      );

      const items = (response.data?.data || []).map((s) =>
        normalizeSupplier(s as unknown as Record<string, unknown>),
      );

      return {
        data: items,
        total: response.data?.total || items.length,
        page: response.data?.page || page,
        limit: response.data?.limit || limit,
        totalPages: response.data?.totalPages || 1,
      };
    } catch {
      // Fallback in-memory
      let filtered = [...MOCK_SUPPLIERS];

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.code.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            (s.taxCode && s.taxCode.toLowerCase().includes(q)) ||
            (s.contactName && s.contactName.toLowerCase().includes(q)) ||
            (s.phone && s.phone.includes(q)) ||
            (s.email && s.email.toLowerCase().includes(q)),
        );
      }

      if (status && status !== 'ALL') {
        filtered = filtered.filter((s) => s.status === status);
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const data = filtered.slice(startIndex, startIndex + limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
      };
    }
  },

  /**
   * Lấy chi tiết Nhà cung cấp theo ID hoặc Mã
   */
  async getSupplierById(idOrCode: string): Promise<Supplier> {
    try {
      const response = await apiClient.get<Supplier>(`/suppliers/${idOrCode}`);
      return normalizeSupplier(
        response.data as unknown as Record<string, unknown>,
      );
    } catch {
      const found = MOCK_SUPPLIERS.find(
        (s) =>
          s.id === idOrCode ||
          s.code.toLowerCase() === idOrCode.toLowerCase(),
      );
      if (!found) throw new Error('Không tìm thấy thông tin nhà cung cấp!');
      return found;
    }
  },

  /**
   * Thêm mới Nhà cung cấp
   */
  async createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
    try {
      const response = await apiClient.post<Supplier>('/suppliers', payload);
      const created = normalizeSupplier(
        response.data as unknown as Record<string, unknown>,
      );
      MOCK_SUPPLIERS.unshift(created);
      return created;
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = axiosErr?.response?.data?.message;
      if (Array.isArray(msg)) {
        throw new Error(msg.join(', '));
      } else if (typeof msg === 'string') {
        throw new Error(msg);
      }
      throw err;
    }
  },

  /**
   * Cập nhật thông tin Nhà cung cấp
   */
  async updateSupplier(
    id: string,
    payload: UpdateSupplierPayload,
  ): Promise<Supplier> {
    try {
      const response = await apiClient.put<Supplier>(
        `/suppliers/${id}`,
        payload,
      );
      const updated = normalizeSupplier(
        response.data as unknown as Record<string, unknown>,
      );
      const idx = MOCK_SUPPLIERS.findIndex((s) => s.id === id);
      if (idx !== -1) {
        MOCK_SUPPLIERS[idx] = updated;
      }
      return updated;
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = axiosErr?.response?.data?.message;
      if (Array.isArray(msg)) {
        throw new Error(msg.join(', '));
      } else if (typeof msg === 'string') {
        throw new Error(msg);
      }
      throw err;
    }
  },

  /**
   * Chuyển đổi trạng thái hoạt động (Active / Inactive)
   */
  async toggleSupplierStatus(
    id: string,
    status?: SupplierStatus,
  ): Promise<Supplier> {
    try {
      const response = await apiClient.patch<Supplier>(
        `/suppliers/${id}/status`,
        status ? { status } : {},
      );
      const updated = normalizeSupplier(
        response.data as unknown as Record<string, unknown>,
      );
      const idx = MOCK_SUPPLIERS.findIndex((s) => s.id === id);
      if (idx !== -1) {
        MOCK_SUPPLIERS[idx] = updated;
      }
      return updated;
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = axiosErr?.response?.data?.message;
      if (typeof msg === 'string') throw new Error(msg);
      throw err;
    }
  },

  /**
   * Xóa Nhà cung cấp (Bắt buộc kiểm tra ràng buộc Phiếu nhập kho)
   */
  async deleteSupplier(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
      }>(`/suppliers/${id}`);
      MOCK_SUPPLIERS = MOCK_SUPPLIERS.filter((s) => s.id !== id);
      return response.data;
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = axiosErr?.response?.data?.message;
      if (typeof msg === 'string') {
        throw new Error(msg);
      } else if (Array.isArray(msg)) {
        throw new Error(msg.join(', '));
      }
      throw err;
    }
  },
};
