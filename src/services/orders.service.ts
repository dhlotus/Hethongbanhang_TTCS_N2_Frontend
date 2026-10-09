import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import { MOCK_PRODUCTS } from './products.service';
import { customerService } from './customer.service';
import type {
  CreateOrderPayload,
  CustomerDebtStatus,
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

export const DEMO_CUSTOMERS: CustomerOption[] = [
  // 5 Đại lý Cấp 1 (DL-0001 -> DL-0005)
  {
    id: 'cust-dl-0001',
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

  // 5 Bán lẻ Niêm yết (DL-0011 -> DL-0015)
  {
    id: 'cust-dl-0011',
    code: 'DL-0011',
    name: 'Siêu Thị Mini Phương Nam Mart',
    group: 'RETAIL',
    phone: '0923456781',
    address: '789 Hoàng Văn Thụ, P.4, Q.Tân Bình, TP.HCM',
    creditLimit: 50000000,
    currentDebt: 0,
    maxDebtDays: 15,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0011-1',
        name: 'Điểm Bán Tân Bình (Mặt Tiền)',
        address: '789 Hoàng Văn Thụ, Q.Tân Bình, TP.HCM',
        phone: '0923456781',
        contactPerson: 'Chị Đỗ Thu Phương',
      },
    ],
  },
  {
    id: 'cust-dl-0012',
    code: 'DL-0012',
    name: 'Cửa Hàng Tiện Lợi Xanh Organic',
    group: 'RETAIL',
    phone: '0923456782',
    address: '56 Nguyễn Thị Thập, P.Tân Hưng, Q.7, TP.HCM',
    creditLimit: 40000000,
    currentDebt: 3200000,
    maxDebtDays: 15,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0012-1',
        name: 'Cửa Hàng Quận 7',
        address: '56 Nguyễn Thị Thập, Q.7, TP.HCM',
        phone: '0923456782',
        contactPerson: 'Chị Mai Lan',
      },
    ],
  },
  {
    id: 'cust-dl-0013',
    code: 'DL-0013',
    name: 'Siêu Thị Tiêu Dùng Gia Đình Mart',
    group: 'RETAIL',
    phone: '0923456783',
    address: '102 Hậu Giang, P.6, Q.6, TP.HCM',
    creditLimit: 45000000,
    currentDebt: 0,
    maxDebtDays: 15,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0013-1',
        name: 'Điểm Bán Quận 6',
        address: '102 Hậu Giang, Q.6, TP.HCM',
        phone: '0923456783',
        contactPerson: 'Anh Trần Trọng Gia',
      },
    ],
  },
  {
    id: 'cust-dl-0014',
    code: 'DL-0014',
    name: 'Điểm Bán Lẻ Thực Phẩm Sạch Bình An',
    group: 'RETAIL',
    phone: '0923456784',
    address: '34 Ung Văn Khiêm, P.25, Q.Bình Thạnh, TP.HCM',
    creditLimit: 30000000,
    currentDebt: 1200000,
    maxDebtDays: 15,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0014-1',
        name: 'Cửa Hàng Bình An Bình Thạnh',
        address: '34 Ung Văn Khiêm, Q.Bình Thạnh, TP.HCM',
        phone: '0923456784',
        contactPerson: 'Anh Lý Bình An',
      },
    ],
  },
  {
    id: 'cust-dl-0015',
    code: 'DL-0015',
    name: 'Cửa Hàng Bán Lẻ Dinh Dưỡng Vina Mart',
    group: 'RETAIL',
    phone: '0923456785',
    address: '85 Tô Hiến Thành, P.13, Q.10, TP.HCM',
    creditLimit: 35000000,
    currentDebt: 0,
    maxDebtDays: 15,
    overdueAmount: 0,
    overdueDays: 0,
    deliveryPoints: [
      {
        id: 'dp-dl-0015-1',
        name: 'Cửa Hàng Quận 10',
        address: '85 Tô Hiến Thành, Q.10, TP.HCM',
        phone: '0923456785',
        contactPerson: 'Chị Hoàng Thùy Trang',
      },
    ],
  },
];

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
        maxDebtDays: c.maxDebtDays,
        overdueAmount: (c as unknown as { overdueAmount?: number }).overdueAmount,
        overdueDays: (c as unknown as { overdueDays?: number }).overdueDays,
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
          (c.phone && c.phone.includes(q))
      );
    }
  },

  /**
   * Lấy thông tin & trạng thái công nợ thời gian thực của đại lý (SN-41)
   */
  async getDebtStatus(customerId: string): Promise<CustomerDebtStatus> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const c = DEMO_CUSTOMERS.find((x) => x.id === customerId);
      if (!c) throw new Error('Không tìm thấy thông tin đại lý');
      const creditLimit = c.creditLimit || 0;
      const currentDebt = c.currentDebt || 0;
      const maxDebtDays = c.maxDebtDays || 30;
      const overdueAmount = c.overdueAmount || 0;
      const overdueDays = c.overdueDays || 0;
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
        customerId: c.id,
        customerCode: c.code,
        customerName: c.name,
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
    }

    try {
      const res = await apiClient.get<CustomerDebtStatus>(`/customers/${customerId}/debt-status`);
      return res.data;
    } catch {
      // Fallback nếu không gọi được API
      const c = DEMO_CUSTOMERS.find((x) => x.id === customerId);
      const creditLimit = c?.creditLimit || 0;
      const currentDebt = c?.currentDebt || 0;
      const maxDebtDays = c?.maxDebtDays || 30;
      const overdueAmount = c?.overdueAmount || 0;
      const overdueDays = c?.overdueDays || 0;
      const availableLimit = Math.max(0, creditLimit - currentDebt);
      const canCreateOrder = !(overdueDays > maxDebtDays && overdueAmount > 0);

      return {
        customerId,
        customerCode: c?.code || 'DL-UNKNOWN',
        customerName: c?.name || 'Đại lý',
        creditLimit,
        currentDebt,
        availableLimit,
        maxDebtDays,
        overdueAmount,
        overdueDays,
        canCreateOrder,
        blockReason: !canCreateOrder
          ? `Đại lý đang có khoản nợ quá hạn ${overdueDays} ngày (vượt quá ${maxDebtDays} ngày cho phép). Hệ thống khóa tạo đơn.`
          : undefined,
      };
    }
  },

  /**
   * Lấy danh sách đơn hàng phân trang (SN-38)
   */
  async getOrders(params: OrderQueryParams = {}): Promise<PaginatedOrdersResponse> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const all = getStoredDemoOrders();
      const filtered =
        params.status && params.status !== 'ALL'
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
<<<<<<< HEAD
    try {
      const res = await apiClient.post<Order>('/orders', payload);
      this.saveLocalOrder(res.data);
      return res.data;
    } catch (apiError: any) {
      if (apiError?.response) {
        // Nếu API backend trả về lỗi (như HTTP 400/403 do Đại lý bị KHOÁ GIAO DỊCH), ném lỗi cho UI hiển thị
        const errMsg = apiError.response.data?.message || apiError.message || 'Lỗi khi tạo đơn hàng trên máy chủ';
        throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
      }
      console.warn('Backend API /orders unavailable, creating order locally:', apiError);
      const customers = await this.getCustomers();
      const customer = customers.find((c) => c.id === payload.customerId);

      if (customer?.status === 'LOCKED') {
        throw new Error(
          `Đại lý "${customer.name}" đang bị KHÓA GIAO DỊCH (Lý do: ${customer.lockReason || 'Không xác định'}). Không thể tạo đơn hàng mới!`,
        );
      }

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
=======
    const token = tokenStorage.getAccessToken();
    const isDemo = token?.startsWith('demo-jwt-');
>>>>>>> origin/main

    if (!isDemo) {
      try {
        const res = await apiClient.post<Order>('/orders', payload);
        return res.data;
      } catch {
        // Fallback sang local simulation khi backend chưa sẵn sàng
      }
    }

    const storedCustomers = customerService.getStoredCustomers();
    const customer =
      storedCustomers.find((c) => c.id === payload.customerId) ||
      DEMO_CUSTOMERS.find((c) => c.id === payload.customerId);
    if (!customer) throw new Error('Không tìm thấy thông tin đại lý');

    const user = tokenStorage.getUser();

    // Kiểm tra công nợ theo Task SN-41 (Demo fallback)
    const overdueDays = customer.overdueDays || 0;
    const maxDebtDays = customer.maxDebtDays || 30;
    const overdueAmount = customer.overdueAmount || 0;
    if (payload.status !== 'DRAFT' && overdueDays > maxDebtDays && overdueAmount > 0) {
      throw new Error(
        `Đại lý đang có khoản nợ quá hạn ${overdueDays} ngày (vượt quá ${maxDebtDays} ngày cho phép). Hệ thống tạm khóa quyền tạo đơn hàng mới cho đại lý này.`
      );
    }

    // Tính lineTotal từng dòng
    const lines = payload.lines.map((l) => ({
      ...l,
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      baseQuantity: Math.round(l.quantity * (l.conversionRate || 1)),
      lineTotal: l.quantity * l.unitPrice,
    }));

    const totals = calcOrderTotals(lines);

    // Kiểm tra vượt hạn mức công nợ (SN-41)
    const creditLimit = customer.creditLimit || 0;
    const currentDebt = customer.currentDebt || 0;
    const projectedDebt = currentDebt + totals.grandTotal;
    const isCreditLimitExceeded = creditLimit > 0 && projectedDebt > creditLimit;
    const creditLimitExceededAmount = isCreditLimitExceeded ? projectedDebt - creditLimit : 0;

    let orderStatus: OrderStatus = isCreditLimitExceeded ? 'PENDING_APPROVAL' : 'PENDING';
    if (payload.status === 'DRAFT') {
      orderStatus = 'DRAFT';
    }

    const warningNote = isCreditLimitExceeded
      ? `[SN-41 CẢNH BÁO: Đơn hàng làm tổng công nợ đạt ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(projectedDebt)}, vượt hạn mức ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(creditLimit)}. Chờ phê duyệt]`
      : undefined;

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      orderCode: generateOrderCode(),
      customerId: customer.id,
      customerCode: customer.code,
      customerName: customer.name,
      customerGroup:
        (customer as { group?: string }).group ||
        (customer as { customerGroup?: string }).customerGroup ||
        'AGENT_LEVEL_2',
      salesRepId: user?.id || 'usr-sales-002',
      salesRepName: user?.fullName || user?.username || 'Trần Văn Nam',
      deliveryPoint: payload.deliveryPoint as Order['deliveryPoint'],
      deliveryDate: payload.deliveryDate,
      lines,
      ...totals,
      note: payload.note
        ? warningNote
          ? `${payload.note}\n${warningNote}`
          : payload.note
        : warningNote,
      status: orderStatus,
      paymentStatus: 'UNPAID',
      priceListId: payload.priceListId,
      isCreditLimitExceeded,
      creditLimitExceededAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const all = getStoredDemoOrders();
    all.unshift(newOrder);
    saveStoredDemoOrders(all);
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
        (p: Product) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
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
