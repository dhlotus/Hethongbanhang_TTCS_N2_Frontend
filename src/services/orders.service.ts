import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import { MOCK_PRODUCTS } from './products.service';
import { customerService, DEMO_CUSTOMERS_DATA } from './customer.service';
import type {
  CreateOrderPayload,
  CustomerOption,
  Order,
  OrderQueryParams,
  OrderStatus,
  PaginatedOrdersResponse,
} from '../types/order';
import type { Product } from '../types/products';

/** Key lưu draft đơn hàng vào localStorage */
const DRAFT_ORDERS_KEY = 'loha_draft_orders';
/** Key lưu danh sách đơn hàng demo */
const DEMO_ORDERS_KEY = 'loha_demo_orders';

// ──────────────────────────────────────────────────────────────────────────
// DỮ LIỆU MẪU — Đại lý Demo (SN-38 & SN-37)
// ──────────────────────────────────────────────────────────────────────────

export const DEMO_CUSTOMERS: CustomerOption[] = DEMO_CUSTOMERS_DATA.map((c) => ({
  id: c.id,
  code: c.code,
  name: c.name,
  group: c.customerGroup || 'AGENT_LEVEL_1',
  phone: c.phone,
  address: c.address,
  creditLimit: c.creditLimit,
  currentDebt: c.currentDebt,
  deliveryPoints: (c.deliveryPoints || []).map((dp) => ({
    id: dp.id,
    name: dp.name,
    address: dp.address,
    phone: dp.phone,
    contactPerson: dp.receiverName,
  })),
}));

// ──────────────────────────────────────────────────────────────────────────
// HELPERS — localStorage Demo
// ──────────────────────────────────────────────────────────────────────────

const getStoredDemoOrders = (): Order[] => {
  try {
    const raw = localStorage.getItem(DEMO_ORDERS_KEY);
    if (raw) return JSON.parse(raw) as Order[];
  } catch (e) {
    void e;
  }
  return [];
};

const saveStoredDemoOrders = (list: Order[]): void => {
  try {
    localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(list));
  } catch (e) {
    void e;
  }
};

/** Tính tổng đơn hàng từ danh sách dòng hàng */
const calcOrderTotals = (
  lines: Order['lines'],
): { subtotal: number; totalDiscount: number; grandTotal: number } => {
  let subtotal = 0;
  let totalDiscount = 0;

  for (const line of lines) {
    const listLineTotal = line.quantity * line.listPrice;
    const lineTotal = line.quantity * line.unitPrice;
    subtotal += listLineTotal;
    totalDiscount += listLineTotal - lineTotal;
  }

  return { subtotal, totalDiscount, grandTotal: subtotal - totalDiscount };
};

/** Tạo mã đơn hàng tự động */
const generateOrderCode = (): string => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = Date.now().toString().slice(-5);
  return `DH${yy}${mm}-${seq}`;
};

// ──────────────────────────────────────────────────────────────────────────
// SERVICE
// ──────────────────────────────────────────────────────────────────────────

export const ordersService = {
  /**
   * Lấy danh sách đại lý để chọn trong form tạo đơn hàng (SN-37 & SN-38)
   */
  async getCustomers(search?: string): Promise<CustomerOption[]> {
    try {
      const res = await customerService.getCustomers({
        search: search?.trim() || undefined,
        limit: 100,
      });

      const list = res?.data || [];
      return list.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        group: c.customerGroup || 'AGENT_LEVEL_1',
        phone: c.phone,
        address: c.address,
        creditLimit: c.creditLimit,
        currentDebt: c.currentDebt,
        deliveryPoints: (c.deliveryPoints || []).map((dp) => ({
          id: dp.id,
          name: dp.name,
          address: dp.address,
          phone: dp.phone,
          contactPerson: dp.receiverName,
        })),
      }));
    } catch {
      if (!search) return DEMO_CUSTOMERS;
      const q = search.toLowerCase().trim();
      return DEMO_CUSTOMERS.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)),
      );
    }
  },

  /**
   * Lấy danh sách đơn hàng phân trang (SN-38)
   */
  async getOrders(params: OrderQueryParams = {}): Promise<PaginatedOrdersResponse> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const all = getStoredDemoOrders();
      const filtered = params.status && params.status !== 'ALL'
        ? all.filter((o) => o.status === params.status)
        : all;

      const page = params.page ?? 1;
      const limit = params.limit ?? 10;
      const start = (page - 1) * limit;
      const data = filtered.slice(start, start + limit);

      return {
        data,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      };
    }

    try {
      const res = await apiClient.get<PaginatedOrdersResponse>('/orders', { params });
      return res.data;
    } catch {
      return { data: [], total: 0, page: 1, limit: 10, totalPages: 1 };
    }
  },

  /**
   * Lấy chi tiết 1 đơn hàng theo ID
   */
  async getOrderById(id: string): Promise<Order> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const all = getStoredDemoOrders();
      const found = all.find((o) => o.id === id);
      if (!found) throw new Error(`Không tìm thấy đơn hàng ${id}`);
      return found;
    }
    const res = await apiClient.get<Order>(`/orders/${id}`);
    return res.data;
  },

  /**
   * Tạo đơn hàng mới (SN-38 & SN-39)
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const customer = DEMO_CUSTOMERS.find((c) => c.id === payload.customerId);
      if (!customer) throw new Error('Không tìm thấy thông tin đại lý');

      const user = tokenStorage.getUser();

      // Tính lineTotal từng dòng
      const lines = payload.lines.map((l) => ({
        ...l,
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        baseQuantity: Math.round(l.quantity * l.conversionRate),
        lineTotal: l.quantity * l.unitPrice,
      }));

      const totals = calcOrderTotals(lines);

      const newOrder: Order = {
        id: `order-${Date.now()}`,
        orderCode: generateOrderCode(),
        customerId: customer.id,
        customerCode: customer.code,
        customerName: customer.name,
        customerGroup: customer.group,
        salesRepId: user?.id,
        salesRepName: user?.fullName || user?.username,
        deliveryPoint: payload.deliveryPoint as Order['deliveryPoint'],
        deliveryDate: payload.deliveryDate,
        lines,
        ...totals,
        note: payload.note,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        priceListId: payload.priceListId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const all = getStoredDemoOrders();
      all.unshift(newOrder);
      saveStoredDemoOrders(all);
      return newOrder;
    }

    const res = await apiClient.post<Order>('/orders', payload);
    return res.data;
  },

  /**
   * Lưu nháp đơn hàng vào localStorage (SN-39 — Draft)
   */
  saveDraft(draftKey: string, draftData: Partial<Order>): void {
    try {
      const raw = localStorage.getItem(DRAFT_ORDERS_KEY);
      const drafts: Record<string, Partial<Order>> = raw ? JSON.parse(raw) : {};
      drafts[draftKey] = { ...draftData, updatedAt: new Date().toISOString() };
      localStorage.setItem(DRAFT_ORDERS_KEY, JSON.stringify(drafts));
    } catch (e) {
      void e;
    }
  },

  /**
   * Lấy lại nháp đã lưu
   */
  getDraft(draftKey: string): Partial<Order> | null {
    try {
      const raw = localStorage.getItem(DRAFT_ORDERS_KEY);
      if (!raw) return null;
      const drafts: Record<string, Partial<Order>> = JSON.parse(raw);
      return drafts[draftKey] ?? null;
    } catch {
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
    } catch (e) {
      void e;
    }
  },

  /**
   * Cập nhật trạng thái đơn hàng (APPROVED, CANCELLED...)
   */
  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const all = getStoredDemoOrders();
      const idx = all.findIndex((o) => o.id === id);
      if (idx === -1) throw new Error(`Không tìm thấy đơn hàng ${id}`);
      all[idx] = { ...all[idx], status, updatedAt: new Date().toISOString() };
      saveStoredDemoOrders(all);
      return all[idx];
    }
    const res = await apiClient.patch<Order>(`/orders/${id}/status`, { status });
    return res.data;
  },

  /**
   * Tìm kiếm sản phẩm để thêm vào dòng hàng (dùng mock hoặc API)
   */
  async searchProducts(query: string): Promise<Product[]> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      if (!query.trim()) return MOCK_PRODUCTS.slice(0, 8);
      const q = query.toLowerCase();
      return MOCK_PRODUCTS.filter(
        (p: Product) =>
          p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      ).slice(0, 10);
    }
    try {
      const res = await apiClient.get<{ data: Product[] }>('/products', {
        params: { search: query, limit: 10, status: 'ACTIVE' },
      });
      return res.data.data ?? [];
    } catch {
      return [];
    }
  },
};
