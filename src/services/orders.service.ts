import { apiClient } from './api';
import { inventoryService } from './inventory.service';
import { warehouseService } from './warehouse.service';
import { tokenStorage } from '../utils/token-storage';
import { MOCK_PRODUCTS } from './products.service';
import { customerService, getStoredCustomers } from './customer.service';
import { orderPricingService } from './order-pricing.service';
import { matchesSearchTerm } from '../utils/vietnamese';
import { INITIAL_DEMO_ORDERS } from './demo-orders.data';
import type {
  CreateOrderPayload,
  CustomerDebtStatus,
  CustomerOption,
  DiscontinuedProductItem,
  Order,
  OrderApprovalAction,
  OrderApprovalHistory,
  OrderQueryParams,
  OrderStatus,
  PaginatedOrdersResponse,
  ReorderPayload,
  ReorderPreviewItem,
  ReorderPreviewResponse,
} from '../types/order';
import type { ApproveOrderResponse } from '../types/inventory.types';
import type { Product } from '../types/products';
import type { CustomerGroupType } from '../types/price-list';

/** Key lưu draft đơn hàng vào localStorage */
const DRAFT_ORDERS_KEY = 'loha_draft_orders';
/** Key lưu danh sách đơn hàng demo */
const DEMO_ORDERS_KEY = 'loha_demo_orders';
const DEMO_APPROVAL_HISTORY_KEY = 'loha_demo_order_approval_history';

export const authStorage = tokenStorage;


// ──────────────────────────────────────────────────────────────────────────
// DỮ LIỆU MẪU — Đại lý Demo (SN-38 & SN-37)
// ──────────────────────────────────────────────────────────────────────────

export const DEMO_CUSTOMERS: CustomerOption[] = [
  // 5 Đại lý Cấp 1 (DL-0001 -> DL-0005)
  {
    id: 'cust-dl-0001',
    salesRepId: 'usr-sale-01',
    salesRepName: 'Trần Văn Long',
    code: 'DL-0001',
    name: 'Công Ty TNHH Thương Mại & Phân Phối Minh Khang',
    group: 'AGENT_LEVEL_1',
    phone: '0901234561',
    address: '123 Nguyễn Trọng Tuyển, P.8, Q.Phú Nhuận, TP.HCM',
    creditLimit: 500000000,
    currentDebt: 45000000,
    maxDebtDays: 30,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0001-1',
        name: 'Kho Tổng Phú Nhuận',
        address: '123 Nguyễn Trọng Tuyển, P.8, Q.Phú Nhuận, TP.HCM',
        phone: '0901234561',
        contactPerson: 'Anh Nguyễn Minh Khang',
      },
    ],
  },
  {
    id: 'cust-dl-0002',
    salesRepId: 'usr-sales-002',
    salesRepName: 'Trần Văn Nam',
    code: 'DL-0002',
    name: 'Tổng Đại Lý Phân Phối Thực Phẩm Toàn Cầu',
    group: 'AGENT_LEVEL_1',
    phone: '0901234562',
    address: '456 Lê Văn Sỹ, P.14, Q.3, TP.HCM',
    creditLimit: 400000000,
    currentDebt: 28000000,
    maxDebtDays: 30,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0002-1',
        name: 'Kho Phân Phối Quận 3',
        address: '456 Lê Văn Sỹ, P.14, Q.3, TP.HCM',
        phone: '0901234562',
        contactPerson: 'Chị Lê Thanh Hương',
      },
    ],
  },
  {
    id: 'cust-dl-0003',
    salesRepId: 'usr-sale-01',
    salesRepName: 'Trần Văn Long',
    code: 'DL-0003',
    name: 'Nhà Phân Phối Hàng Tiêu Dùng Hoàng Long',
    group: 'AGENT_LEVEL_1',
    phone: '0901234563',
    address: '789 Quang Trung, P.10, Q.Gò Vấp, TP.HCM',
    creditLimit: 350000000,
    currentDebt: 345000000,
    maxDebtDays: 30,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0003-1',
        name: 'Tổng Kho Gò Vấp',
        address: '789 Quang Trung, P.10, Q.Gò Vấp, TP.HCM',
        phone: '0901234563',
        contactPerson: 'Anh Vũ Hoàng Long',
      },
    ],
  },
  {
    id: 'cust-dl-0004',
    salesRepId: 'usr-sale-02',
    salesRepName: 'Nguyễn Thị Hằng',
    code: 'DL-0004',
    name: 'Công Ty Cổ Phần Thương Mại Miền Đông',
    group: 'AGENT_LEVEL_1',
    phone: '0901234564',
    address: '321 Võ Thị Sáu, P.Võ Thị Sáu, Q.3, TP.HCM',
    creditLimit: 450000000,
    currentDebt: 15000000,
    maxDebtDays: 30,
    overdueAmount: 18000000,
    overdueDays: 45,
    deliveryPoints: [
      {
        id: 'dp-dl-0004-1',
        name: 'Kho Trung Chuyển Võ Thị Sáu',
        address: '321 Võ Thị Sáu, P.Võ Thị Sáu, Q.3, TP.HCM',
        phone: '0901234564',
        contactPerson: 'Anh Đỗ Văn Đông',
      },
    ],
  },
  {
    id: 'cust-dl-0005',
    salesRepId: 'usr-salesmgr-003',
    salesRepName: 'Lê Quản Lý',
    code: 'DL-0005',
    name: 'Nhà Phân Phối Dinh Dưỡng Phương Đông',
    group: 'AGENT_LEVEL_1',
    phone: '0901234565',
    address: '654 Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM',
    creditLimit: 300000000,
    currentDebt: 35000000,
    maxDebtDays: 30,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0005-1',
        name: 'Kho Bình Thạnh',
        address: '654 Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM',
        phone: '0901234565',
        contactPerson: 'Chị Đinh Phương Thảo',
      },
    ],
  },

  // 5 Đại lý Cấp 2 (DL-0006 -> DL-0010)
  {
    id: 'cust-dl-0006',
    salesRepId: 'usr-sale-01',
    salesRepName: 'Trần Văn Long',
    code: 'DL-0006',
    name: 'Đại Lý Bách Hóa Thực Phẩm Bảo Châu',
    group: 'AGENT_LEVEL_2',
    phone: '0912345671',
    address: '456 Lê Văn Việt, P.Tăng Nhơn Phú A, TP.Thủ Đức, TP.HCM',
    creditLimit: 150000000,
    currentDebt: 18000000,
    maxDebtDays: 20,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0006-1',
        name: 'Cửa Hàng Bảo Châu Lê Văn Việt',
        address: '456 Lê Văn Việt, TP.Thủ Đức, TP.HCM',
        phone: '0912345671',
        contactPerson: 'Chị Trần Bảo Châu',
      },
    ],
  },
  {
    id: 'cust-dl-0007',
    salesRepId: 'usr-sales-002',
    salesRepName: 'Trần Văn Nam',
    code: 'DL-0007',
    name: 'Cửa Hàng Bách Hóa Tổng Hợp Khánh An',
    group: 'AGENT_LEVEL_2',
    phone: '0912345672',
    address: '12 Đỗ Xuân Hợp, P.Phước Long B, TP.Thủ Đức, TP.HCM',
    creditLimit: 120000000,
    currentDebt: 9500000,
    maxDebtDays: 20,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0007-1',
        name: 'Showroom Bán Lẻ Khánh An',
        address: '12 Đỗ Xuân Hợp, TP.Thủ Đức, TP.HCM',
        phone: '0912345672',
        contactPerson: 'Anh Lê Khánh An',
      },
    ],
  },
  {
    id: 'cust-dl-0008',
    salesRepId: 'usr-sale-01',
    salesRepName: 'Trần Văn Long',
    code: 'DL-0008',
    name: 'Đại Lý Tiêu Dùng Nhanh Thịnh Vượng',
    group: 'AGENT_LEVEL_2',
    phone: '0912345673',
    address: '88 Nguyễn Oanh, P.7, Q.Gò Vấp, TP.HCM',
    creditLimit: 100000000,
    currentDebt: 12000000,
    maxDebtDays: 20,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0008-1',
        name: 'Điểm Phân Phối Thịnh Vượng Gò Vấp',
        address: '88 Nguyễn Oanh, P.7, Q.Gò Vấp, TP.HCM',
        phone: '0912345673',
        contactPerson: 'Anh Phạm Thịnh Vượng',
      },
    ],
  },
  {
    id: 'cust-dl-0009',
    code: 'DL-0009',
    name: 'Cửa Hàng Bán Buôn Dinh Dưỡng An Bình',
    group: 'AGENT_LEVEL_2',
    phone: '0912345674',
    address: '150 Tân Kỳ Tân Quý, P.Tân Sơn Nhì, Q.Tân Phú, TP.HCM',
    creditLimit: 110000000,
    currentDebt: 14500000,
    maxDebtDays: 20,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0009-1',
        name: 'Kho Hàng Tân Phú',
        address: '150 Tân Kỳ Tân Quý, Q.Tân Phú, TP.HCM',
        phone: '0912345674',
        contactPerson: 'Chị Nguyễn An Bình',
      },
    ],
  },
  {
    id: 'cust-dl-0010',
    code: 'DL-0010',
    name: 'Đại Lý Phân Phối Sỉ Hưng Thịnh',
    group: 'AGENT_LEVEL_2',
    phone: '0912345675',
    address: '205 Lý Thường Kiệt, P.6, Q.Tân Bình, TP.HCM',
    creditLimit: 130000000,
    currentDebt: 22000000,
    maxDebtDays: 20,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0010-1',
        name: 'Kho Sỉ Tân Bình',
        address: '205 Lý Thường Kiệt, Q.Tân Bình, TP.HCM',
        phone: '0912345675',
        contactPerson: 'Anh Huỳnh Hưng Thịnh',
      },
    ],
  },
];

export const MOCK_CUSTOMERS = DEMO_CUSTOMERS;

// ──────────────────────────────────────────────────────────────────────────
// HELPERS — localStorage Demo
// ──────────────────────────────────────────────────────────────────────────

// INITIAL_DEMO_ORDERS được import từ ./demo-orders.data (20 đơn hàng đầy đủ)
const DEMO_ORDERS_VERSION_KEY = 'loha_demo_orders_version';
const CURRENT_DEMO_ORDERS_VERSION = 'v2_stock_approval_tests';

export const resetDemoOrdersToDefault = (): Order[] => {
  try {
    saveStoredDemoOrders(INITIAL_DEMO_ORDERS);
    localStorage.setItem(DEMO_ORDERS_VERSION_KEY, CURRENT_DEMO_ORDERS_VERSION);
    window.dispatchEvent(new CustomEvent('loha_orders_updated'));
  } catch {}
  return INITIAL_DEMO_ORDERS;
};

const getStoredDemoOrders = (): Order[] => {
  try {
    const version = localStorage.getItem(DEMO_ORDERS_VERSION_KEY);
    const raw = localStorage.getItem(DEMO_ORDERS_KEY);
    if (raw && version === CURRENT_DEMO_ORDERS_VERSION) {
      const parsed = JSON.parse(raw) as Order[];
      if (parsed.length >= 20) {
        return parsed;
      }
    }
    return resetDemoOrdersToDefault();
  } catch (e) {
    void e;
  }
  return INITIAL_DEMO_ORDERS;
};

const saveStoredDemoOrders = (list: Order[]): void => {
  try {
    localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(list));
  } catch (e) {
    void e;
  }
};


/** Tính tổng đơn hàng từ danh sách dòng hàng */
export const calcOrderTotals = (
  lines: Order['lines']
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
export const generateOrderCode = (): string => {
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
      // Lọc chỉ giữ các đại lý bán buôn (loại bỏ điểm bán lẻ nội bộ RETAIL và showroom/kiosk)
      const validAgencies = list.filter((c) => {
        const isRetailShowroom =
          c.customerGroup === 'RETAIL' ||
          (c.code && /^DL-001[1-5]$/i.test(c.code)) ||
          c.name?.toLowerCase().includes('showroom') ||
          c.name?.toLowerCase().includes('kiosk') ||
          c.name?.toLowerCase().includes('trung tâm trải nghiệm');
        return !isRetailShowroom;
      });

      return validAgencies.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        group: c.customerGroup || 'AGENT_LEVEL_1',
        phone: c.phone,
        address: c.address,
        creditLimit: c.creditLimit,
        currentDebt: c.currentDebt,
        maxDebtDays: c.maxDebtDays,
        overdueAmount: (c as unknown as { overdueAmount?: number }).overdueAmount,
        overdueDays: (c as unknown as { overdueDays?: number }).overdueDays,
        status: c.status,
        lockReason: c.lockReason,
        lockedAt: c.lockedAt,
        salesRepId: c.salesRepId || c.salesRep?.id,
        salesRepName: c.salesRepName || c.salesRep?.name,
        salesRep: c.salesRep,
        deliveryPoints: (c.deliveryPoints || []).map((dp) => ({
          id: dp.id,
          name: dp.name,
          address: dp.address,
          phone: dp.phone,
          contactPerson: dp.receiverName,
        })),
      }));
    } catch {
      const validDemos = DEMO_CUSTOMERS.filter((c) => {
        const isRetailShowroom =
          c.group === 'RETAIL' ||
          (c.code && /^DL-001[1-5]$/i.test(c.code)) ||
          c.name?.toLowerCase().includes('showroom') ||
          c.name?.toLowerCase().includes('kiosk') ||
          c.name?.toLowerCase().includes('trung tâm trải nghiệm');
        return !isRetailShowroom;
      });

      if (!search || !search.trim()) return validDemos;
      const q = search.trim();
      return validDemos.filter(
        (c) =>
          matchesSearchTerm(c.name, q) ||
          matchesSearchTerm(c.code, q) ||
          matchesSearchTerm(c.phone, q)
      );
    }
  },

  /**
 * Lấy thông tin & trạng thái công nợ thời gian thực của đại lý (SN-41 & SN-49)
 */
  async getDebtStatus(customerId: string): Promise<CustomerDebtStatus> {
    try {
      const res = await apiClient.get<CustomerDebtStatus>(`/customers/${customerId}/debt-status`);
      if (res.data && (res.data.creditLimit !== undefined || res.data.availableLimit !== undefined)) {
        return res.data;
      }
    } catch {
      // Fallback cục bộ khi chưa có kết nối API
    }

    const storedCustomers = getStoredCustomers();
    const c =
      storedCustomers.find((x) => x.id === customerId || x.code === customerId) ||
      DEMO_CUSTOMERS.find((x) => x.id === customerId || x.code === customerId) ||
      MOCK_CUSTOMERS.find((x) => x.id === customerId || x.code === customerId);

    const creditLimit = typeof c?.creditLimit === 'number' ? c.creditLimit : 50000000;
    const currentDebt = typeof c?.currentDebt === 'number' ? c.currentDebt : 0;
    const maxDebtDays = typeof c?.maxDebtDays === 'number' ? c.maxDebtDays : 30;
    const overdueAmount = (c as any)?.overdueAmount ?? 0;
    const overdueDays = (c as any)?.overdueDays ?? 0;
    const availableLimit = Math.max(0, creditLimit - currentDebt);
    const canCreateOrder = !(overdueDays > maxDebtDays && overdueAmount > 0);

    let blockReason: string | undefined;
    let warningMessage: string | undefined;

    if (!canCreateOrder) {
      blockReason = `Đại lý đang có khoản nợ quá hạn ${overdueDays} ngày (vượt quá ${maxDebtDays} ngày cho phép) với số tiền ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(overdueAmount)}. Hệ thống tạm khóa quyền tạo đơn hàng mới cho đại lý này.`;
    } else if (overdueAmount > 0) {
      warningMessage = `Đại lý đang có khoản nợ quá hạn ${overdueDays}/${maxDebtDays} ngày (${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(overdueAmount)}). Vui lòng lưu ý đôn đốc thanh toán.`;
    } else if (currentDebt >= creditLimit) {
      warningMessage = `Đại lý đã sử dụng hết hạn mức công nợ được cấp. Đơn hàng mới sẽ được chuyển sang trạng thái chờ phê duyệt.`;
    } else if (availableLimit < creditLimit * 0.2) {
      warningMessage = `Hạn mức công nợ khả dụng của đại lý chỉ còn ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(availableLimit)} (dưới 20%). Lưu ý kiểm tra giá trị đơn hàng.`;
    }

    return {
      customerId: c?.id || customerId,
      customerCode: c?.code || customerId,
      customerName: c?.name || 'Đại lý',
      creditLimit,
      currentDebt,
      availableLimit,
      maxDebtDays,
      overdueAmount,
      overdueDays,
      canCreateOrder,
      blockReason,
      warningMessage,
    };
  },

  /**
   * Lấy danh sách đơn hàng phân trang (SN-38 & SN-46)
   * Kết nối Server-side GET /api/orders trực tiếp, hỗ trợ đầy đủ query parameters
   */
  async getOrders(params: OrderQueryParams = {}): Promise<PaginatedOrdersResponse> {
    const cleanParams: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    };

    if (params.status && params.status !== 'ALL') {
      cleanParams.status = params.status;
    }
    if (params.search && params.search.trim()) {
      cleanParams.search = params.search.trim();
    }
    if (params.customerId) {
      cleanParams.customerId = params.customerId;
    }
    if (params.salesRepId) {
      cleanParams.salesRepId = params.salesRepId;
    }
    if (params.assignedUser) {
      cleanParams.assignedUser = params.assignedUser;
    }
    if (params.region && params.region !== 'ALL') {
      cleanParams.region = params.region;
    }
    if (params.fromDate) {
      cleanParams.fromDate = params.fromDate;
    }
    if (params.toDate) {
      cleanParams.toDate = params.toDate;
    }
    if (params.dateType) {
      cleanParams.dateType = params.dateType;
    }

    try {
      const res = await apiClient.get<PaginatedOrdersResponse | Order[]>('/orders', {
        params: cleanParams,
      });

      if (Array.isArray(res.data)) {
        const total = res.data.length;
        const page = Number(cleanParams.page) || 1;
        const limit = Number(cleanParams.limit) || 10;
        const totalAmount = res.data.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
        return {
          data: res.data,
          total,
          totalAmount,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        };
      }

      const totalAmount =
        res.data?.totalAmount !== undefined
          ? res.data.totalAmount
          : (res.data?.data || []).reduce((sum, o) => sum + (o.grandTotal || 0), 0);

      return {
        data: res.data?.data || [],
        total: typeof res.data?.total === 'number' ? res.data.total : (res.data?.data?.length || 0),
        totalAmount,
        page: res.data?.page || Number(cleanParams.page) || 1,
        limit: res.data?.limit || Number(cleanParams.limit) || 10,
        totalPages: res.data?.totalPages || 1,
      };
    } catch {
      // Fallback lấy từ bộ nhớ cục bộ demo orders khi mất kết nối mạng
      const toDateKey = (val: string | Date | undefined): string => {
        if (!val) return '';
        if (typeof val === 'string') {
          const m = val.match(/^(\d{4}-\d{2}-\d{2})/);
          if (m) return m[1];
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      let list = getStoredDemoOrders();
      if (params.status && params.status !== 'ALL') {
        const st = String(params.status).toUpperCase();
        list = list.filter((o) => o.status?.toUpperCase() === st);
      }
      if (params.customerId && params.customerId !== 'ALL') {
        list = list.filter((o) => o.customerId === params.customerId || o.customerCode === params.customerId);
      }
      if (params.salesRepId && params.salesRepId !== 'ALL') {
        const rep = params.salesRepId.toLowerCase();
        list = list.filter((o) => o.salesRepId === params.salesRepId || o.salesRepName?.toLowerCase().includes(rep));
      }
      if (params.region && params.region !== 'ALL') {
        const reg = params.region.toLowerCase();
        list = list.filter((o) => o.region?.toLowerCase().includes(reg) || o.deliveryPoint?.address?.toLowerCase().includes(reg));
      }
      const fromKey = params.fromDate?.trim();
      const toKey = params.toDate?.trim();
      const dateType = params.dateType || 'CREATED';
      if (fromKey || toKey) {
        list = list.filter((o) => {
          const c = toDateKey(o.createdAt);
          const d = toDateKey(o.deliveryDate);
          const target = dateType === 'DELIVERY' ? d : c;
          if (fromKey && toKey) return Boolean(target && target >= fromKey && target <= toKey);
          if (fromKey) return Boolean(target && target >= fromKey);
          if (toKey) return Boolean(target && target <= toKey);
          return true;
        });
      }
      if (params.search && params.search.trim()) {
        const q = params.search.toLowerCase().trim();
        list = list.filter((o) =>
          o.orderCode?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.salesRepName?.toLowerCase().includes(q)
        );
      }
      const total = list.length;
      const totalAmount = list.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      const page = Math.max(1, Number(params.page) || 1);
      const limit = Math.max(1, Number(params.limit) || 10);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;
      return {
        data: list.slice(start, start + limit),
        total,
        totalAmount,
        page,
        limit,
        totalPages,
      };
    }
  },

  /**
   * Hủy đơn hàng và tự động nhả tồn giữ chỗ vào kho khả dụng (SN-180 & SN-49)
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const finalReason = reason?.trim() || 'Đại lý hủy đơn';
    const token = tokenStorage.getAccessToken();
    const isDemo = token?.startsWith('demo-jwt-');

    if (!isDemo) {
      try {
        const res = await apiClient.post<Order | { data: Order }>(`/orders/${orderId}/cancel`, {
          reason: finalReason,
        });
        const updated = (res.data as { data?: Order })?.data ?? (res.data as Order);
        const all = getStoredDemoOrders();
        const idx = all.findIndex((o) => o.id === orderId || o.orderCode === orderId);
        if (idx !== -1) {
          all[idx] = { ...all[idx], ...updated, status: 'CANCELLED', cancelReason: finalReason };
          saveStoredDemoOrders(all);
        }
        return updated;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
          const errMsg = axiosErr.response?.data?.message;
          if (errMsg) {
            throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
          }
        }
        throw err;
      }
    }

    const all = getStoredDemoOrders();
    const idx = all.findIndex((o) => o.id === orderId || o.orderCode === orderId);
    if (idx === -1) throw new Error(`Không tìm thấy đơn hàng ${orderId}`);

    const existing = all[idx];
    existing.status = 'CANCELLED';
    existing.cancelReason = finalReason;
    existing.reservedUntil = undefined;
    existing.updatedAt = new Date().toISOString();

    all[idx] = existing;
    saveStoredDemoOrders(all);

    try {
      window.dispatchEvent(new CustomEvent('loha_orders_updated', { detail: existing }));
      window.dispatchEvent(new CustomEvent('loha_inventory_updated', { detail: existing }));
    } catch {}

    return existing;
  },

  /**
   * Lấy chi tiết 1 đơn hàng theo ID trực tiếp từ máy chủ (SN-38)
   */
  async getOrderById(id: string): Promise<Order> {
    const token = tokenStorage.getAccessToken();
    const isDemo = token?.startsWith('demo-jwt-');
    if (isDemo) {
      const all = getStoredDemoOrders();
      const found = all.find((o) => o.id === id || o.orderCode === id);
      if (found) return found;
    }
    try {
      const res = await apiClient.get<Order | { data: Order }>(`/orders/${id}`);
      return (res.data as { data?: Order })?.data ?? (res.data as Order);
    } catch (err) {
      const all = getStoredDemoOrders();
      const found = all.find((o) => o.id === id || o.orderCode === id);
      if (found) return found;
      throw err;
    }
  },

  /**
   * Tạo đơn hàng mới (SN-38 & SN-39)
   */
  /**
   * Tạo đơn hàng mới (SN-40)
   * Luôn gửi trực tiếp lên API để Backend DB xác thực tồn kho, công nợ & lưu đơn
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const token = tokenStorage.getAccessToken();
    const isDemo = token?.startsWith('demo-jwt-');

    if (!isDemo) {
      try {
        const res = await apiClient.post<Order>('/orders', payload);
        const all = getStoredDemoOrders();
        all.unshift(res.data);
        saveStoredDemoOrders(all);

        try {
          window.dispatchEvent(new CustomEvent('loha_orders_updated', { detail: res.data }));
          window.dispatchEvent(new CustomEvent('loha_inventory_updated', { detail: res.data }));
        } catch {}

        return res.data;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
          const errMsg = axiosErr.response?.data?.message;
          if (errMsg) {
            throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
          }
        }
        throw err;
      }
    }

    // Demo Mode Validation
    const allStoredOrders = getStoredDemoOrders();
    const demoReservedMap = new Map<string, number>();
    const activeStatuses = ['APPROVED', 'PROCESSING'];
    for (const ord of allStoredOrders) {
      if (!activeStatuses.includes(ord.status || '')) continue;
      for (const l of ord.lines || []) {
        const qty = l.baseQuantity || Math.round((l.quantity || 0) * (l.conversionRate || 1));
        if (l.productId) demoReservedMap.set(l.productId, (demoReservedMap.get(l.productId) || 0) + qty);
        if (l.productSku) demoReservedMap.set(l.productSku.toUpperCase(), (demoReservedMap.get(l.productSku.toUpperCase()) || 0) + qty);
      }
    }

    for (const line of payload.lines || []) {
      const prod = MOCK_PRODUCTS.find((p) => p.id === line.productId || p.sku === line.productSku);
      const reserved = (line.productId ? demoReservedMap.get(line.productId) : 0) ||
        (line.productSku ? demoReservedMap.get(line.productSku.toUpperCase()) : 0) || 0;
      const physical = prod?.stockQuantity ?? 0;
      const available = Math.max(0, physical - reserved);

      const convRate = line.conversionRate > 0 ? line.conversionRate : 1;
      const maxInUnit = convRate > 1 ? Math.floor(available / convRate) : available;
      const unitName = line.unit || line.baseUnit || 'sản phẩm';
      const productName = line.productName || line.productSku;

      if (available <= 0) {
        throw new Error(
          `Sản phẩm ${productName}: Hàng trong kho đã hết / Vượt quá tồn khả dụng (Còn lại 0 ${unitName})`,
        );
      }

      if (line.quantity > maxInUnit) {
        throw new Error(
          `Sản phẩm ${productName} vượt quá tồn khả dụng (Hàng trong kho đã hết / Vượt quá tồn khả dụng: Còn tối đa ${maxInUnit} ${unitName}, Đặt: ${line.quantity})`,
        );
      }
    }

    const lines = (payload.lines || []).map((l) => ({
      ...l,
      baseQuantity: Math.round(l.quantity * (l.conversionRate || 1)),
      lineTotal: l.quantity * l.unitPrice,
    }));
    const totals = calcOrderTotals(lines);
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderCode: `DH2610-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: payload.customerId,
      customerName: 'Đại lý Demo',
      ...totals,
      lines,
      deliveryDate: payload.deliveryDate,
      deliveryPoint: payload.deliveryPoint as Order['deliveryPoint'],
      note: payload.note,
      status: payload.status || 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allStoredOrders.unshift(newOrder);
    saveStoredDemoOrders(allStoredOrders);

    try {
      window.dispatchEvent(new CustomEvent('loha_orders_updated', { detail: newOrder }));
      window.dispatchEvent(new CustomEvent('loha_inventory_updated', { detail: newOrder }));
    } catch {}

    return newOrder;
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
  async updateOrderStatus(id: string, status: OrderStatus, reason?: string): Promise<Order> {
    const payload: any = { status };
    if (reason) payload.reason = reason;
    const res = await apiClient.patch<Order>(`/orders/${id}/status`, payload);
    return res.data;
  },

  /** Submit an approval decision through the dedicated review endpoint. */
  async decideOrder(
    id: string,
    action: OrderApprovalAction,
    comment?: string,
  ): Promise<Order> {
    try {
      const res = await apiClient.post<Order>(`/orders/${id}/decision`, { action, comment });
      if (res.data) {
        const all = getStoredDemoOrders();
        const idx = all.findIndex((order) => order.id === id || order.orderCode === id);
        if (idx !== -1) {
          all[idx] = res.data;
          saveStoredDemoOrders(all);
        }
        try {
          window.dispatchEvent(new CustomEvent('loha_orders_updated', { detail: res.data }));
        } catch { }
      }
      return res.data;
    } catch (apiError: unknown) {
      const errObj = apiError as {
        response?: { status?: number; data?: { message?: string | string[] } };
        message?: string;
      };

      // Fallback cho đơn hàng lưu cục bộ nếu backend trả về 404
      if (errObj?.response?.status === 404) {
        const all = getStoredDemoOrders();
        const idx = all.findIndex((order) => order.id === id || order.orderCode === id);
        if (idx !== -1) {
          const nextStatus: Record<OrderApprovalAction, OrderStatus> = {
            APPROVE: 'APPROVED',
            REJECT: 'REJECTED',
            RETURN_FOR_UPDATE: 'RETURNED_FOR_UPDATE',
          };
          const createdAt = new Date().toISOString();
          all[idx] = { ...all[idx], status: nextStatus[action], updatedAt: createdAt };
          saveStoredDemoOrders(all);
          try {
            window.dispatchEvent(new CustomEvent('loha_orders_updated', { detail: all[idx] }));
          } catch { }
          return all[idx];
        }
      }

      if (errObj?.response?.data?.message) {
        const msg = errObj.response.data.message;
        throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
      throw new Error(errObj?.message || 'Không thể cập nhật quyết định đơn hàng');
    }
  },

  async getApprovalHistory(orderId: string): Promise<OrderApprovalHistory[]> {
    try {
      const res = await apiClient.get<OrderApprovalHistory[]>(`/orders/${orderId}/approval-history`);
      return res.data;
    } catch {
      return this.readDemoApprovalHistory()
        .filter((entry) => entry.orderId === orderId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
  },

  readDemoApprovalHistory(): OrderApprovalHistory[] {
    try {
      return JSON.parse(localStorage.getItem(DEMO_APPROVAL_HISTORY_KEY) || '[]') as OrderApprovalHistory[];
    } catch {
      return [];
    }
  },

  /**
   * Tìm kiếm sản phẩm để thêm vào dòng hàng
   */
  async searchProducts(query: string = '', limit: number = 100, customerId?: string): Promise<Product[]> {
    const token = tokenStorage.getAccessToken();
    const isDemo = token?.startsWith('demo-jwt-');

    if (isDemo) {
      const allOrders = getStoredDemoOrders();
      const activeReservedMap = new Map<string, number>();
      const activeStatuses = ['APPROVED', 'PROCESSING'];
      for (const ord of allOrders) {
        if (!activeStatuses.includes(ord.status || '')) continue;
        for (const line of ord.lines || []) {
          const qty = line.baseQuantity || Math.round((line.quantity || 0) * (line.conversionRate || 1));
          if (line.productId) {
            activeReservedMap.set(line.productId, (activeReservedMap.get(line.productId) || 0) + qty);
          }
          if (line.productSku) {
            const skuKey = line.productSku.toUpperCase();
            activeReservedMap.set(skuKey, (activeReservedMap.get(skuKey) || 0) + qty);
          }
        }
      }

      const q = (query || '').toLowerCase().trim();
      const filtered = MOCK_PRODUCTS.filter(
        (p: Product) => !q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      ).slice(0, limit);

      return filtered.map((product) => {
        const physical = product.stockQuantity ?? 0;
        const reserved = activeReservedMap.get(product.id) || activeReservedMap.get(product.sku.toUpperCase()) || 0;
        const availableStock = Math.max(0, physical - reserved);
        return {
          ...product,
          availableStock,
          availableQuantity: availableStock,
        };
      });
    }

    try {
      const res = await apiClient.get<{ data: Product[] }>('/products', {
        params: { search: query || undefined, limit, status: 'ACTIVE' },
      });
      const products = res.data.data ?? [];
      let warehouseId: string | undefined = undefined;
      try {
        if (customerId) {
          const defaultWh = await warehouseService.getAgencyDefault(customerId);
          warehouseId = defaultWh.warehouseId;
        }
      } catch {}

      let availableBySku = new Map<string, number>();
      try {
        const stockRows = await inventoryService.getStockOverview(warehouseId);
        availableBySku = new Map(
          stockRows.map((stock) => [stock.sku.toUpperCase(), (stock as { availableQuantity?: number; stockQuantity?: number }).availableQuantity ?? stock.stockQuantity]),
        );
      } catch {}

      return products.map((product) => {
        const knownProduct = MOCK_PRODUCTS.find(
          (candidate) => candidate.sku.toUpperCase() === product.sku.toUpperCase(),
        );
        const hasPackagingUnits = (product.units ?? []).some(
          (unit) => unit.conversionRate > 1,
        );
        const units = hasPackagingUnits
          ? product.units
          : knownProduct?.units?.some((unit) => unit.conversionRate > 1)
            ? knownProduct.units
            : product.units;

        const availableStock = availableBySku.get(product.sku.toUpperCase())
          ?? product.availableStock
          ?? product.availableQuantity
          ?? product.stockQuantity
          ?? 0;
        return {
          ...product,
          units,
          availableStock,
          availableQuantity: availableStock,
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * Sao chép một đơn cũ thành đơn mới (SN-48)
   * - Giữ nguyên toàn bộ dòng hàng
   * - Áp lại giá và chiết khấu hiện hành của đại lý
   * - Đơn mới luôn bắt đầu ở trạng thái Nháp (DRAFT)
   */
  async cloneOrder(orderId: string): Promise<Order> {
    try {
      const res = await apiClient.post<Order | { data: Order }>(`/orders/${orderId}/clone`);
      const cloned = (res.data as { data?: Order })?.data ?? (res.data as Order);
      try {
        const all = getStoredDemoOrders();
        saveStoredDemoOrders([cloned, ...all]);
      } catch {}
      return cloned;
    } catch (err: unknown) {
      try {
        return this.cloneMockOrder(orderId);
      } catch {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
          const errMsg = axiosErr.response?.data?.message;
          if (errMsg) {
            throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
          }
        }
        throw err;
      }
    }
  },

  cloneMockOrder(orderId: string): Order {
    const all = getStoredDemoOrders();
    const source = all.find((o) => o.id === orderId || o.orderCode === orderId);
    if (!source) {
      throw new Error(`Không tìm thấy đơn hàng cần sao chép (ID: ${orderId})`);
    }

    // SN-48: Áp lại giá và chiết khấu hiện hành của đại lý, không kế thừa giá cũ
    const customerGroup = (source.customerGroup || 'AGENT_LEVEL_1') as CustomerGroupType;
    const discountRate = customerGroup === 'AGENT_LEVEL_1' ? 5 : customerGroup === 'AGENT_LEVEL_2' ? 3 : 0;

    const newLines: OrderLine[] = (source.lines || []).map((line) => {
      const foundProduct = MOCK_PRODUCTS.find(
        (p) => p.sku?.toUpperCase() === line.productSku?.toUpperCase() || p.id === line.productId
      );
      const convRate = line.conversionRate > 0 ? line.conversionRate : 1;
      const baseCatalogPrice = foundProduct?.price ?? (line.listPrice || 25000);
      const currentListPrice = Math.round(baseCatalogPrice * convRate);
      const currentUnitPrice = Math.round((currentListPrice * (100 - discountRate)) / 100);
      const lineTotal = line.quantity * currentUnitPrice;

      return {
        ...line,
        listPrice: currentListPrice,
        unitPrice: currentUnitPrice,
        discountPercent: discountRate,
        lineTotal,
        isPriceManuallyEdited: false,
      };
    });

    const subtotal = newLines.reduce((sum, l) => sum + (l.listPrice || l.unitPrice) * l.quantity, 0);
    const grandTotal = newLines.reduce((sum, l) => sum + l.lineTotal, 0);
    const totalDiscount = Math.max(0, subtotal - grandTotal);

    const newCode = `DH${new Date().toISOString().slice(2, 4)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(10000 + Math.random() * 90000))}`;
    const newOrder: Order = {
      ...source,
      id: `ord-clone-${Date.now()}`,
      orderCode: newCode,
      status: 'DRAFT',
      lines: newLines,
      subtotal,
      totalDiscount,
      grandTotal,
      note: source.note ? `[Bản sao từ ${source.orderCode || source.id}] ${source.note}` : `Bản sao từ ${source.orderCode || source.id}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedAt: undefined,
      approverId: undefined,
      approverName: undefined,
    };
    saveStoredDemoOrders([newOrder, ...all]);
    try {
      window.dispatchEvent(new CustomEvent('loha_orders_updated', { detail: newOrder }));
    } catch {}
    return newOrder;
  },

  /**
   * Cập nhật đơn hàng (Chỉnh sửa / Tiếp tục gõ đơn nháp SN-39)
   */
  async updateOrder(id: string, payload: Partial<CreateOrderPayload>): Promise<Order> {
    try {
      const res = await apiClient.put<Order | { data: Order }>(`/orders/${id}`, payload);
      const updated = (res.data as { data?: Order })?.data ?? (res.data as Order);
      const all = getStoredDemoOrders();
      const idx = all.findIndex((o) => o.id === id);
      if (idx !== -1) {
        all[idx] = updated;
        saveStoredDemoOrders(all);
      }
      return updated;
    } catch (apiError: unknown) {
      if (
        typeof apiError === 'object' &&
        apiError !== null &&
        'response' in apiError
      ) {
        const res = (apiError as { response?: { data?: { message?: string | string[] } } }).response;
        const fallbackMsg =
          'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Lỗi khi cập nhật đơn hàng';
        const errMsg = res?.data?.message || fallbackMsg;
        throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
      }
      throw new Error(apiError instanceof Error ? apiError.message : 'Không thể kết nối máy chủ để cập nhật đơn hàng');
    }
  },

  /**
   * Duyệt đơn hàng và kích hoạt giữ chỗ tồn kho 24h (SN-180 - Sprint 5)
   * Phân quyền: SALES_MANAGER, ADMIN
   */
  async approveOrder(orderId: string): Promise<ApproveOrderResponse> {
    const token = tokenStorage.getAccessToken();
    const isDemo = token?.startsWith('demo-jwt-');

    if (!isDemo) {
      try {
        const res = await apiClient.post<ApproveOrderResponse>(`/orders/${orderId}/approve`);
        return res.data;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
          const errMsg = axiosErr.response?.data?.message;
          if (errMsg) {
            throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
          }
        }
        throw err;
      }
    }

    const all = getStoredDemoOrders();
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error(`Không tìm thấy đơn hàng ${orderId}`);

    const existing = all[idx];
    const user = tokenStorage.getUser();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    existing.status = 'APPROVED';
    existing.approvedAt = new Date().toISOString();
    existing.approverId = user?.id || 'mgr-demo';
    existing.reservedUntil = expiry;

    all[idx] = existing;
    saveStoredDemoOrders(all);

    return {
      success: true,
      message: 'Đã duyệt đơn và kích hoạt giữ chỗ tồn kho 24 giờ thành công',
      orderId,
      status: 'APPROVED',
      reservedUntil: expiry,
      itemsReserved: existing.lines?.length || 0,
    };
  },



  /**
   * Lấy ID đại lý hiện tại của tài khoản đang đăng nhập (SN-170: Chỉ thấy đơn của chính mình)
   */
  getCurrentDealerCustomerId(): string {
    const user = tokenStorage.getUser();
    if (!user) return 'cust-001';
    // Nếu là tài khoản dealer demo hoặc thông tin đại lý Minh Khang
    if (
      user.username === 'dealer' ||
      user.email?.includes('dealer') ||
      user.email?.includes('daily') ||
      user.roles?.includes('CUSTOMER')
    ) {
      return 'cust-001';
    }
    return 'cust-001';
  },

  /**
   * Lấy danh sách đơn hàng demo cho đại lý (Mock fallback chống đệ quy)
   */
  getMockMyOrders(params: OrderQueryParams = {}, customerId: string): PaginatedOrdersResponse {
    const all = getStoredDemoOrders();
    // BẮT BUỘC CHỈ LỌC ĐƠN CỦA CHÍNH ĐẠI LÝ NÀY (SN-170)
    let customerOrders = all.filter(
      (o) =>
        o.customerId === customerId ||
        o.customerId === 'cust-001' ||
        o.customerId === 'cust-dl-0001'
    );

    if (params.status && params.status !== 'ALL') {
      customerOrders = customerOrders.filter((o) => o.status === params.status);
    }

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      customerOrders = customerOrders.filter(
        (o) =>
          o.orderCode?.toLowerCase().includes(q) ||
          o.lines.some(
            (l) =>
              l.productName.toLowerCase().includes(q) ||
              l.productSku.toLowerCase().includes(q)
          ) ||
          o.deliveryPoint?.receiverName?.toLowerCase().includes(q)
      );
    }

    // Sắp xếp đơn mới nhất lên đầu
    customerOrders.sort(
      (a, b) =>
        new Date(b.createdAt || '').getTime() -
        new Date(a.createdAt || '').getTime()
    );

    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const start = (page - 1) * limit;
    const data = customerOrders.slice(start, start + limit);

    return {
      data,
      total: customerOrders.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(customerOrders.length / limit)),
    };
  },

  /**
   * Lấy danh sách đơn hàng của riêng Đại lý đang đăng nhập (SN-170: Chỉ thấy đơn của chính mình)
   * - Tự động giới hạn dữ liệu theo ID đại lý
   * - Trả về trạng thái, ngày giao dự kiến, tổng tiền, cảnh báo giao thiếu
   */
  async getMyOrders(params: OrderQueryParams = {}): Promise<PaginatedOrdersResponse> {
    const customerId = this.getCurrentDealerCustomerId();

    try {
      const res = await apiClient.get<PaginatedOrdersResponse>(
        '/orders/portal/my-orders',
        { params: { ...params, customerId } }
      );
      return res.data;
    } catch {
      // Fallback lấy dữ liệu offline demo nếu máy chủ chưa mở endpoint hoặc lỗi kết nối
      return this.getMockMyOrders(params, customerId);
    }
  },

  /**
   * Mock tính toán xem trước đặt lại đơn (Mock fallback chống đệ quy)
   */
  async getMockReorderPreview(orderId: string): Promise<ReorderPreviewResponse> {
    const all = getStoredDemoOrders();
    const order = all.find((o) => o.id === orderId);
    if (!order) {
      throw new Error(`Không tìm thấy đơn hàng cần đặt lại (ID: ${orderId})`);
    }

    const availableItems: ReorderPreviewItem[] = [];
    const discontinuedItems: DiscontinuedProductItem[] = [];
    const customerGroup: CustomerGroupType =
      (order.customerGroup as CustomerGroupType) || 'AGENT_LEVEL_1';

    // Lấy bảng giá hiện hành (hoặc bảng giá fallback tiêu chuẩn)
    let currentPriceListItems = new Map<string, { price: number; minPrice?: number }>();
    try {
      const effectivePl = await orderPricingService.getEffectivePriceList(customerGroup);
      if (effectivePl?.items) {
        currentPriceListItems = new Map(
          effectivePl.items.map((i) => [i.productCode.toUpperCase(), { price: i.price, minPrice: i.minPrice }])
        );
      }
    } catch {
      // Fallback dùng bảng giá niêm yết hiện thời trong MOCK_PRODUCTS
    }

    for (const line of order.lines) {
      // 1. Kiểm tra trạng thái sản phẩm
      const foundProduct = MOCK_PRODUCTS.find(
        (p) =>
          p.sku.toUpperCase() === line.productSku.toUpperCase() ||
          p.id === line.productId
      );

      if (foundProduct?.status === 'INACTIVE' || line.productSku === 'LH-OLD-COFFEE-CAN') {
        discontinuedItems.push({
          lineId: line.id,
          productSku: line.productSku,
          productName: line.productName,
          reason: 'Mặt hàng đã ngừng kinh doanh và đã được tự động loại khỏi đơn mới',
        });
        continue;
      }

      // 2. Tính lại giá theo bảng giá hiện hành
      const convRate = line.conversionRate > 0 ? line.conversionRate : 1;
      const catalogPrice = foundProduct?.price ?? line.listPrice;
      const plPriceInfo = currentPriceListItems.get(line.productSku.toUpperCase());
      const effectiveBasePrice = plPriceInfo ? plPriceInfo.price : catalogPrice;
      const currentListPrice = Math.round(effectiveBasePrice * convRate);

      // Chiết khấu đại lý cấp 1 hiện hành (5%)
      const discountRate = customerGroup === 'AGENT_LEVEL_1' ? 5 : 0;
      const currentUnitPrice = Math.round(
        (currentListPrice * (100 - discountRate)) / 100
      );

      availableItems.push({
        lineId: line.id || `line-${Date.now()}-${Math.random()}`,
        productId: line.productId,
        productSku: line.productSku,
        productName: line.productName,
        unit: line.unit,
        baseUnit: line.baseUnit,
        conversionRate: convRate,
        quantity: line.quantity,
        oldUnitPrice: line.unitPrice,
        currentUnitPrice,
        currentListPrice,
        currentDiscountPercent: discountRate,
        isPriceChanged: currentUnitPrice !== line.unitPrice,
      });
    }

    const warningMessage =
      discontinuedItems.length > 0
        ? `Hệ thống đã tự động loại bỏ ${discontinuedItems.length} mặt hàng ngừng kinh doanh khỏi đơn mới.`
        : undefined;

    return {
      orderId: order.id || '',
      orderCode: order.orderCode || '',
      customerId: order.customerId,
      customerName: order.customerName || 'Đại lý',
      customerGroup,
      deliveryPoint: order.deliveryPoint,
      availableItems,
      discontinuedItems,
      warningMessage,
    };
  },

  /**
   * Xem trước dữ liệu đặt lại đơn cũ (SN-174):
   * 1. Quét phát hiện sản phẩm đã ngừng kinh doanh (INACTIVE) và tự động loại bỏ kèm thông báo
   * 2. Áp lại đơn giá và chiết khấu hiện hành theo bảng giá hiện thời của đại lý
   */
  async getReorderPreview(orderId: string): Promise<ReorderPreviewResponse> {
    try {
      const res = await apiClient.get<ReorderPreviewResponse>(
        `/orders/${orderId}/reorder-preview`
      );
      return res.data;
    } catch {
      // Fallback tính toán cục bộ nếu backend chưa sẵn sàng hoặc lỗi mạng
      return this.getMockReorderPreview(orderId);
    }
  },


  async reorder(
    orderId: string,
    payload: ReorderPayload
  ): Promise<{ newOrder: Order; discontinuedItems: DiscontinuedProductItem[]; message: string }> {
    const preview = await this.getReorderPreview(orderId);

    // Lọc các mặt hàng được chọn
    let targetItems = preview.availableItems;
    if (payload.selectedLineIds && payload.selectedLineIds.length > 0) {
      targetItems = targetItems.filter((item: ReorderPreviewItem) =>
        payload.selectedLineIds?.includes(item.lineId)
      );
    }

    if (targetItems.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một mặt hàng khả dụng để đặt lại đơn hàng');
    }

    // Cập nhật số lượng điều chỉnh từ modal nếu có
    const qtyMap = new Map<string, number>();
    if (payload.items && payload.items.length > 0) {
      for (const it of payload.items) {
        qtyMap.set(it.productSku.toUpperCase(), it.quantity);
      }
    }

    const newLines = targetItems.map((item: ReorderPreviewItem) => {
      const qty = qtyMap.get(item.productSku.toUpperCase()) || item.quantity;
      return {
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        unit: item.unit,
        baseUnit: item.baseUnit,
        conversionRate: item.conversionRate,
        quantity: qty,
        unitPrice: item.currentUnitPrice,
        listPrice: item.currentListPrice,
        discountPercent: item.currentDiscountPercent,
      };
    });

    const createPayload: CreateOrderPayload = {
      customerId: preview.customerId,
      deliveryPoint: payload.deliveryPoint || preview.deliveryPoint,
      deliveryDate: payload.deliveryDate,
      lines: newLines,
      note:
        payload.note ||
        `[Đặt lại từ đơn ${preview.orderCode}] ${preview.discontinuedItems.length > 0
            ? `(Đã loại bỏ ${preview.discontinuedItems.length} mặt hàng ngừng kinh doanh)`
            : ''
          }`.trim(),
      status: 'PENDING',
    };

    const newOrder = await this.createOrder(createPayload);

    return {
      newOrder,
      discontinuedItems: preview.discontinuedItems,
      message: `Đã đặt lại đơn hàng thành công (Mã đơn: ${newOrder.orderCode}).${preview.discontinuedItems.length > 0
          ? ` Đã loại bỏ ${preview.discontinuedItems.length} mặt hàng ngừng kinh doanh.`
          : ''
        }`,
    };
  },
};


