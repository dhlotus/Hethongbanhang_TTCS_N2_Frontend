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
      const apiOrders = res.data?.data || [];
      const localOrders = this.getLocalOrders();
      // Kết hợp đơn hàng từ API và đơn hàng đã lưu offline
      const mergedMap = new Map<string, Order>();
      for (const o of [...localOrders, ...apiOrders]) {
        mergedMap.set(o.id || o.orderCode, o);
      }
      let combined = Array.from(mergedMap.values());
      if (cleanParams.status) {
        combined = combined.filter((o) => o.status === cleanParams.status);
      }
      if (cleanParams.search) {
        const q = String(cleanParams.search).toLowerCase();
        combined = combined.filter(
          (o) =>
            o.orderCode.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            (o.deliveryPoint?.receiverName && o.deliveryPoint.receiverName.toLowerCase().includes(q)),
        );
      }
      return {
        data: combined,
        total: combined.length,
        page: res.data?.page || 1,
        limit: res.data?.limit || 10,
        totalPages: Math.ceil(combined.length / 10) || 1,
      };
    } catch {
      const localOrders = this.getLocalOrders();
      return { data: localOrders, total: localOrders.length, page: 1, limit: 10, totalPages: 1 };
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
    try {
      const res = await apiClient.post<Order>('/orders', payload);
      this.saveLocalOrder(res.data);
      return res.data;
    } catch (apiError) {
      console.warn('Backend API /orders unavailable, creating order locally:', apiError);
      const customers = await this.getCustomers();
      const customer = customers.find((c) => c.id === payload.customerId);
      const subtotal = payload.lines.reduce(
        (sum, l) => sum + (l.unitPrice || 0) * (l.quantity || 1),
        0,
      );
      const totalDiscount = payload.lines.reduce(
        (sum, l) =>
          sum +
          Math.round(
            ((l.unitPrice || 0) * (l.quantity || 1) * (l.discountPercent || 0)) / 100,
          ),
        0,
      );
      const grandTotal = subtotal - totalDiscount;

      const newOrder: Order = {
        id: `ord-local-${Date.now()}`,
        orderCode: `DH${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(10000 + Math.random() * 90000)}`,
        customerId: payload.customerId,
        customerCode: customer?.code || 'DL-HCM-001',
        customerName: customer?.name || 'Đại Lý Phân Phối',
        customerGroup: customer?.customerGroup || 'AGENT_LEVEL_1',
        deliveryPoint: payload.deliveryPoint,
        deliveryDate: payload.deliveryDate,
        lines: payload.lines.map((l, idx) => ({
          id: `line-${idx}-${Date.now()}`,
          productId: l.productId,
          productSku: l.productSku,
          productName: l.productName,
          unit: l.unit,
          baseUnit: l.baseUnit,
          conversionRate: l.conversionRate,
          quantity: l.quantity,
          baseQuantity: l.quantity * l.conversionRate,
          unitPrice: l.unitPrice,
          listPrice: l.listPrice,
          discountPercent: l.discountPercent,
          lineTotal: Math.round(l.unitPrice * l.quantity * (1 - l.discountPercent / 100)),
          stockAvailable: l.stockAvailable,
        })),
        subtotal,
        totalDiscount,
        grandTotal,
        note: payload.note,
        status: payload.status || 'DRAFT',
        paymentStatus: 'UNPAID',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.saveLocalOrder(newOrder);
      return newOrder;
    }
  },

  /**
   * Cập nhật đơn hàng (Lưu nháp & tiếp tục gõ)
   */
  async updateOrder(id: string, payload: UpdateOrderPayload): Promise<Order> {
    try {
      const res = await apiClient.put<Order>(`/orders/${id}`, payload);
      this.saveLocalOrder(res.data);
      return res.data;
    } catch (apiError) {
      console.warn('Backend API PUT /orders/:id unavailable, updating locally:', apiError);
      const localOrders = this.getLocalOrders();
      const existing = localOrders.find((o) => o.id === id);
      if (existing) {
        if (payload.status) existing.status = payload.status;
        if (payload.deliveryPoint) existing.deliveryPoint = payload.deliveryPoint;
        if (payload.deliveryDate) existing.deliveryDate = payload.deliveryDate;
        if (payload.note !== undefined) existing.note = payload.note;
        if (payload.lines) {
          existing.lines = payload.lines.map((l, idx) => ({
            id: `line-${idx}-${Date.now()}`,
            productId: l.productId,
            productSku: l.productSku,
            productName: l.productName,
            unit: l.unit,
            baseUnit: l.baseUnit,
            conversionRate: l.conversionRate,
            quantity: l.quantity,
            baseQuantity: l.quantity * l.conversionRate,
            unitPrice: l.unitPrice,
            listPrice: l.listPrice,
            discountPercent: l.discountPercent,
            lineTotal: Math.round(l.unitPrice * l.quantity * (1 - l.discountPercent / 100)),
            stockAvailable: l.stockAvailable,
          }));
          existing.subtotal = existing.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
          existing.totalDiscount = existing.lines.reduce(
            (s, l) => s + Math.round((l.unitPrice * l.quantity * l.discountPercent) / 100),
            0,
          );
          existing.grandTotal = existing.subtotal - existing.totalDiscount;
        }
        existing.updatedAt = new Date().toISOString();
        this.saveLocalOrder(existing);
        return existing;
      }
      throw apiError;
    }
  },

  /**
   * Lấy danh sách đơn hàng đã lưu cục bộ
   */
  getLocalOrders(): Order[] {
    try {
      const raw = localStorage.getItem('loha_saved_orders');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Lưu hoặc cập nhật đơn hàng vào danh sách cục bộ
   */
  saveLocalOrder(order: Order): void {
    try {
      const current = this.getLocalOrders();
      const existingIdx = current.findIndex((o) => o.id === order.id || o.orderCode === order.orderCode);
      if (existingIdx >= 0) {
        current[existingIdx] = order;
      } else {
        current.unshift(order);
      }
      localStorage.setItem('loha_saved_orders', JSON.stringify(current));
    } catch (e) {
      console.debug('Không thể lưu order vào localStorage:', e);
    }
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
