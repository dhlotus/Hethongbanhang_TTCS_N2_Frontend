import { apiClient } from './api';
import { MOCK_PRODUCTS } from './products.service';
import type {
  CreateOrderPayload,
  CustomerOption,
  Order,
  OrderQueryParams,
  OrderStatus,
  PaginatedOrdersResponse,
  UpdateOrderPayload,
} from '../types/order';
import type { Product } from '../types/products';
import { customersService } from './customers.service';

/** Key lưu draft đơn hàng vào localStorage */
const DRAFT_ORDERS_KEY = 'loha_draft_orders';

export const ordersService = {
  /**
   * Lấy danh sách đại lý để chọn trong form tạo đơn hàng (SN-38)
   */
  async getCustomers(search?: string): Promise<CustomerOption[]> {
    try {
      const customers = await customersService.getCustomers(search);
      return customers.map((c) => ({
        ...c,
        group: c.customerGroup,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Lấy danh sách đơn hàng phân trang (SN-38)
   */
  async getOrders(params: OrderQueryParams = {}): Promise<PaginatedOrdersResponse> {
    try {
      const cleanParams: Record<string, unknown> = { ...params };
      if (cleanParams.status === 'ALL') {
        delete cleanParams.status;
      }
      const res = await apiClient.get<PaginatedOrdersResponse>('/orders', { params: cleanParams });
      return res.data;
    } catch {
      return { data: [], total: 0, page: 1, limit: 10, totalPages: 1 };
    }
  },

  /**
   * Lấy chi tiết 1 đơn hàng theo ID
   */
  async getOrderById(id: string): Promise<Order> {
    const res = await apiClient.get<Order>(`/orders/${id}`);
    return res.data;
  },

  /**
   * Tạo đơn hàng mới (SN-38 & SN-39)
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const res = await apiClient.post<Order>('/orders', payload);
    return res.data;
  },

  /**
   * Cập nhật đơn hàng (Lưu nháp & tiếp tục gõ)
   */
  async updateOrder(id: string, payload: UpdateOrderPayload): Promise<Order> {
    const res = await apiClient.put<Order>(`/orders/${id}`, payload);
    return res.data;
  },

  /**
   * Lưu nháp đơn hàng vào localStorage (SN-39 — Draft client fallback)
   */
  saveDraft(draftKey: string, draftData: Partial<Order>): void {
    try {
      const raw = localStorage.getItem(DRAFT_ORDERS_KEY);
      const drafts: Record<string, Partial<Order>> = raw ? JSON.parse(raw) : {};
      drafts[draftKey] = { ...draftData, updatedAt: new Date().toISOString() };
      localStorage.setItem(DRAFT_ORDERS_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.debug('Không thể lưu nháp vào localStorage:', error);
    }
  },

  /**
   * Lấy lại nháp đã lưu từ localStorage
   */
  getDraft(draftKey: string): Partial<Order> | null {
    try {
      const raw = localStorage.getItem(DRAFT_ORDERS_KEY);
      if (!raw) return null;
      const drafts: Record<string, Partial<Order>> = JSON.parse(raw);
      return drafts[draftKey] ?? null;
    } catch (error) {
      console.debug('Không thể đọc nháp từ localStorage:', error);
      return null;
    }
  },

  /**
   * Xóa nháp sau khi submit thành công
   */
  clearDraft(draftKey: string): void {
    try {
      const raw = localStorage.getItem(DRAFT_ORDERS_KEY);
      if (!raw) return;
      const drafts: Record<string, Partial<Order>> = JSON.parse(raw);
      delete drafts[draftKey];
      localStorage.setItem(DRAFT_ORDERS_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.debug('Không thể xóa nháp khỏi localStorage:', error);
    }
  },

  /**
   * Cập nhật trạng thái đơn hàng (APPROVED, CANCELLED...)
   */
  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const res = await apiClient.patch<Order>(`/orders/${id}/status`, { status });
    return res.data;
  },

  /**
   * Xóa đơn hàng (chỉ áp dụng đơn Nháp hoặc Đã hủy)
   */
  async deleteOrder(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/orders/${id}`);
    return res.data;
  },

  /**
   * Tìm kiếm sản phẩm để thêm vào dòng hàng
   */
  async searchProducts(query: string): Promise<Product[]> {
    try {
      const res = await apiClient.get<{ data: Product[] }>('/products', {
        params: { search: query, limit: 10, status: 'ACTIVE' },
      });
      if (res.data?.data && res.data.data.length > 0) {
        return res.data.data;
      }
    } catch (error) {
      console.debug('Không thể tìm sản phẩm từ API, sử dụng dữ liệu dự phòng:', error);
    }

    // Fallback nếu server trả rỗng hoặc đang offline
    if (!query.trim()) return MOCK_PRODUCTS.slice(0, 8);
    const q = query.toLowerCase();
    return MOCK_PRODUCTS.filter(
      (p: Product) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    ).slice(0, 10);
  },
};
