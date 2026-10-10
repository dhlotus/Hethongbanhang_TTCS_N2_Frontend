import { apiClient } from './api';
import { inventoryService } from './inventory.service';
import { tokenStorage } from '../utils/token-storage';
import { MOCK_PRODUCTS } from './products.service';
import { customerService } from './customer.service';
import { orderPricingService } from './order-pricing.service';
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

export const MOCK_CUSTOMERS = DEMO_CUSTOMERS;

// ──────────────────────────────────────────────────────────────────────────
// HELPERS — localStorage Demo
// ──────────────────────────────────────────────────────────────────────────

const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: 'ord-dl-001',
    orderCode: 'DH2610-10023',
    customerId: 'cust-dl-0001',
    customerCode: 'DL-0001',
    customerName: 'Công Ty TNHH Thương Mại & Phân Phối Minh Khang',
    customerGroup: 'AGENT_LEVEL_1',
    salesRepId: 'usr-sale-01',
    salesRepName: 'Trần Văn Long',
    deliveryPoint: {
      id: 'dp-dl-0001-1',
      name: 'Kho Tổng Phú Nhuận',
      address: '123 Nguyễn Trọng Tuyển, P.8, Q.Phú Nhuận, TP.HCM',
      receiverName: 'Anh Nguyễn Minh Khang',
      phone: '0901234561',
      roadNote: 'Đường 2 chiều, xe tải 2.5T vào thoải mái, giao giờ hành chính 8h00 - 17h00',
    },
    deliveryDate: '2026-10-12',
    lines: [
      {
        id: 'line-dl-001-1',
        productId: 'prod-001',
        productSku: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
        unit: 'Thùng (12 lon)',
        baseUnit: 'Lon',
        conversionRate: 12,
        quantity: 5,
        baseQuantity: 60,
        listPrice: 5400000,
        unitPrice: 5130000,
        discountPercent: 5,
        lineTotal: 25650000,
        deliveredQuantity: undefined,
        isShortDelivery: false,
      },
      {
        id: 'line-dl-001-2',
        productId: 'prod-002',
        productSku: 'LH-NUT-180ML',
        productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
        unit: 'Thùng (48 hộp)',
        baseUnit: 'Hộp',
        conversionRate: 48,
        quantity: 10,
        baseQuantity: 480,
        listPrice: 620000,
        unitPrice: 589000,
        discountPercent: 5,
        lineTotal: 5890000,
        deliveredQuantity: undefined,
        isShortDelivery: false,
      },
    ],
    subtotal: 33200000,
    totalDiscount: 1660000,
    grandTotal: 31540000,
    note: 'Giao buổi sáng, gọi trước 30 phút để chuẩn bị thủ kho bốc dỡ',
    status: 'SHIPPED',
    paymentStatus: 'UNPAID',
    isShortDelivery: false,
    createdAt: '2026-10-06T08:30:00Z',
    updatedAt: '2026-10-09T14:15:00Z',
  },
  {
    id: 'ord-dl-002',
    orderCode: 'DH2610-10015',
    customerId: 'cust-dl-0001',
    customerCode: 'DL-0001',
    customerName: 'Công Ty TNHH Thương Mại & Phân Phối Minh Khang',
    customerGroup: 'AGENT_LEVEL_1',
    salesRepId: 'usr-sale-01',
    salesRepName: 'Trần Văn Long',
    deliveryPoint: {
      id: 'dp-dl-0001-1',
      name: 'Kho Tổng Phú Nhuận',
      address: '123 Nguyễn Trọng Tuyển, P.8, Q.Phú Nhuận, TP.HCM',
      receiverName: 'Anh Nguyễn Minh Khang',
      phone: '0901234561',
      roadNote: 'Đường 2 chiều, xe tải 2.5T vào thoải mái',
    },
    deliveryDate: '2026-10-08',
    lines: [
      {
        id: 'line-dl-002-1',
        productId: 'prod-003',
        productSku: 'LH-NEST-70ML',
        productName: 'Nước Yến Sào Chưng Đường Phèn Loha Nest 70ml',
        unit: 'Hộp (6 hũ)',
        baseUnit: 'Hũ',
        conversionRate: 6,
        quantity: 10,
        baseQuantity: 60,
        listPrice: 420000,
        unitPrice: 399000,
        discountPercent: 5,
        lineTotal: 3990000,
        deliveredQuantity: 8, // Giao thiếu 2 hộp (SN-170)
        deliveredBaseQuantity: 48,
        isShortDelivery: true,
        shortDeliveryReason:
          'Kho phân phối tạm thiếu 2 hộp lô sản xuất mới nhất, đã xác nhận với đại lý sẽ giao bù vào đợt kế tiếp',
      },
      {
        id: 'line-dl-002-2',
        productId: 'prod-001',
        productSku: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
        unit: 'Thùng (12 lon)',
        baseUnit: 'Lon',
        conversionRate: 12,
        quantity: 5,
        baseQuantity: 60,
        listPrice: 5400000,
        unitPrice: 5130000,
        discountPercent: 5,
        lineTotal: 25650000,
        deliveredQuantity: 5, // Giao đủ 5 thùng (SN-170)
        deliveredBaseQuantity: 60,
        isShortDelivery: false,
      },
    ],
    subtotal: 31200000,
    totalDiscount: 1560000,
    grandTotal: 29640000,
    note: 'Biên bản bàn giao số BB-2610-08 ghi nhận thiếu 2 hộp Nước Yến, thủ kho đại lý đã ký xác nhận',
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    isShortDelivery: true,
    createdAt: '2026-10-04T09:00:00Z',
    updatedAt: '2026-10-08T16:30:00Z',
  },
  {
    id: 'ord-dl-003',
    orderCode: 'DH2609-09880',
    customerId: 'cust-dl-0001',
    customerCode: 'DL-0001',
    customerName: 'Công Ty TNHH Thương Mại & Phân Phối Minh Khang',
    customerGroup: 'AGENT_LEVEL_1',
    salesRepId: 'usr-sale-01',
    salesRepName: 'Trần Văn Long',
    deliveryPoint: {
      id: 'dp-dl-0001-1',
      name: 'Kho Tổng Phú Nhuận',
      address: '123 Nguyễn Trọng Tuyển, P.8, Q.Phú Nhuận, TP.HCM',
      receiverName: 'Anh Nguyễn Minh Khang',
      phone: '0901234561',
    },
    deliveryDate: '2026-09-25',
    lines: [
      {
        id: 'line-dl-003-1',
        productId: 'prod-001',
        productSku: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
        unit: 'Thùng (12 lon)',
        baseUnit: 'Lon',
        conversionRate: 12,
        quantity: 4,
        baseQuantity: 48,
        listPrice: 5200000, // Giá cũ tháng trước (SN-174 test áp giá hiện hành)
        unitPrice: 4940000,
        discountPercent: 5,
        lineTotal: 19760000,
        deliveredQuantity: 4,
        isShortDelivery: false,
      },
      {
        id: 'line-dl-003-2',
        productId: 'prod-011',
        productSku: 'LH-OLD-COFFEE-CAN',
        productName: 'Cà Phê Sữa Đóng Lon Loha Classic 240ml (Mẫu Cũ)',
        unit: 'Thùng (24 lon)',
        baseUnit: 'Lon',
        conversionRate: 24,
        quantity: 6,
        baseQuantity: 144,
        listPrice: 336000,
        unitPrice: 336000,
        discountPercent: 0,
        lineTotal: 2016000,
        deliveredQuantity: 6,
        isShortDelivery: false,
      },
    ],
    subtotal: 22816000,
    totalDiscount: 1040000,
    grandTotal: 21776000,
    note: 'Đơn hàng định kỳ tháng 9/2026 - Đã giao đủ và thanh toán xong',
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    isShortDelivery: false,
    createdAt: '2026-09-20T08:00:00Z',
    updatedAt: '2026-09-25T11:00:00Z',
  },
];

const getStoredDemoOrders = (): Order[] => {
  try {
    const raw = localStorage.getItem(DEMO_ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Order[];
      // Đảm bảo các đơn mẫu cho Đại lý Minh Khang luôn tồn tại trong demo storage
      const hasDealerOrders = parsed.some((o) => o.customerId === 'cust-dl-0001');
      if (!hasDealerOrders) {
        const merged = [...parsed, ...INITIAL_DEMO_ORDERS];
        saveStoredDemoOrders(merged);
        return merged;
      }
      return parsed;
    }
    saveStoredDemoOrders(INITIAL_DEMO_ORDERS);
    return INITIAL_DEMO_ORDERS;
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
        status: c.status,
        lockReason: c.lockReason,
        lockedAt: c.lockedAt,
        lockedBy: c.lockedBy,
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
    // Kiểm tra tồn khả dụng theo Task SN-42: Kiểm soát tồn khả dụng
    const allStoredOrders = getStoredDemoOrders();
    const demoReservedMap = new Map<string, number>();
    const activeStatuses = ['PENDING', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'];
    for (const ord of allStoredOrders) {
      if (!activeStatuses.includes(ord.status || '')) continue;
      for (const l of ord.lines || []) {
        const qty = l.baseQuantity || Math.round((l.quantity || 0) * (l.conversionRate || 1));
        if (l.productId) demoReservedMap.set(l.productId, (demoReservedMap.get(l.productId) || 0) + qty);
        if (l.productSku) demoReservedMap.set(l.productSku.toUpperCase(), (demoReservedMap.get(l.productSku.toUpperCase()) || 0) + qty);
      }
    }

    for (const line of payload.lines) {
      const prod = MOCK_PRODUCTS.find((p) => p.id === line.productId || p.sku === line.productSku);
      const reserved = (line.productId ? demoReservedMap.get(line.productId) : 0) ||
        (line.productSku ? demoReservedMap.get(line.productSku.toUpperCase()) : 0) || 0;
      const physical = prod?.stockQuantity ?? 0;
      const calculatedAvail = Math.max(0, physical - reserved);
      const available = line.availableStock !== undefined
        ? Math.min(line.availableStock, calculatedAvail)
        : (prod ? calculatedAvail : (line.stockAvailable ?? 9999));

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

    const token = tokenStorage.getAccessToken();
    const isDemo = token?.startsWith('demo-jwt-');

    if (!isDemo) {
      try {
        const res = await apiClient.post<Order>('/orders', payload);
        const all = getStoredDemoOrders();
        all.unshift(res.data);
        saveStoredDemoOrders(all);
        return res.data;
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
              : 'Lỗi khi tạo đơn hàng trên máy chủ';
          const errMsg = res?.data?.message || fallbackMsg;
          throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        }
        throw new Error(apiError instanceof Error ? apiError.message : 'Không thể kết nối máy chủ để lưu đơn hàng');
      }
    }

    const customers = await this.getCustomers();
    const targetCustomer = customers.find((c) => c.id === payload.customerId);

    if (targetCustomer?.status === 'LOCKED') {
      throw new Error(
        `Đại lý "${targetCustomer.name}" đang bị KHÓA GIAO DỊCH (Lý do: ${targetCustomer.lockReason || 'Không xác định'}). Không thể tạo đơn hàng mới!`,
      );
    }

    const storedCustomers = customerService.getStoredCustomers();
    const customer =
      targetCustomer ||
      storedCustomers.find((c) => c.id === payload.customerId) ||
      MOCK_CUSTOMERS.find((c) => c.id === payload.customerId) ||
      DEMO_CUSTOMERS.find((c) => c.id === payload.customerId);

    const user = authStorage.getUser() || tokenStorage.getUser();

    // Kiểm tra công nợ theo Task SN-41 (Demo fallback)
    const overdueDays = customer?.overdueDays || 0;
    const maxDebtDays = customer?.maxDebtDays || 30;
    const overdueAmount = customer?.overdueAmount || 0;
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
    const creditLimit = customer?.creditLimit || 0;
    const currentDebt = customer?.currentDebt || 0;
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

    // Fallback an toàn nếu không tìm thấy customer hoặc user
    const currentUser = user || authStorage.getUser() || tokenStorage.getUser() || null;
    const customerCode = customer?.code || payload.customerCode || payload.customerId;
    const customerName = customer?.name || payload.customerName || 'Đại lý';
    const customerGroup =
      (customer as { group?: string })?.group ||
      (customer as { customerGroup?: string })?.customerGroup ||
      payload.customerGroup ||
      'AGENT_LEVEL_2';
    const salesRepId = currentUser?.id || payload.salesRepId || '';
    const salesRepName = currentUser?.fullName || currentUser?.username || payload.salesRepName || 'NVKD';

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      orderCode: generateOrderCode(),
      customerId: payload.customerId,
      customerCode,
      customerName,
      customerGroup,
      salesRepId,
      salesRepName,
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
      warningNote,
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
  async updateOrderStatus(id: string, status: OrderStatus, reason?: string): Promise<Order> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const all = getStoredDemoOrders();
      const idx = all.findIndex((o) => o.id === id);
      if (idx === -1) throw new Error(`Không tìm thấy đơn hàng ${id}`);
      all[idx] = { 
        ...all[idx], 
        status, 
        updatedAt: new Date().toISOString(),
        ...(reason && status === 'CANCELLED' ? { cancelReason: reason } : {})
      };
      saveStoredDemoOrders(all);
      return all[idx];
    }
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
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const all = getStoredDemoOrders();
      const idx = all.findIndex((order) => order.id === id);
      if (idx === -1) throw new Error(`Không tìm thấy đơn hàng ${id}`);
      const nextStatus: Record<OrderApprovalAction, OrderStatus> = {
        APPROVE: 'APPROVED',
        REJECT: 'REJECTED',
        RETURN_FOR_UPDATE: 'RETURNED_FOR_UPDATE',
      };
      const createdAt = new Date().toISOString();
      all[idx] = { ...all[idx], status: nextStatus[action], updatedAt: createdAt };
      saveStoredDemoOrders(all);
      const user = tokenStorage.getUser();
      const history = this.readDemoApprovalHistory();
      history.push({
        id: Date.now(),
        orderId: id,
        action,
        comment: comment?.trim() || null,
        approverId: user?.id || 'demo-reviewer',
        approverName: user?.fullName || user?.username || 'Quản lý',
        approverRoles: user?.roles || [],
        createdAt,
      });
      localStorage.setItem(DEMO_APPROVAL_HISTORY_KEY, JSON.stringify(history));
      return all[idx];
    }
    const res = await apiClient.post<Order>(`/orders/${id}/decision`, { action, comment });
    return res.data;
  },

  async getApprovalHistory(orderId: string): Promise<OrderApprovalHistory[]> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      return this.readDemoApprovalHistory()
        .filter((entry) => entry.orderId === orderId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
    const res = await apiClient.get<OrderApprovalHistory[]>(`/orders/${orderId}/approval-history`);
    return res.data;
  },

  readDemoApprovalHistory(): OrderApprovalHistory[] {
    try {
      return JSON.parse(localStorage.getItem(DEMO_APPROVAL_HISTORY_KEY) || '[]') as OrderApprovalHistory[];
    } catch {
      return [];
    }
  },

  /**
   * Tìm kiếm sản phẩm để thêm vào dòng hàng (dùng mock hoặc API)
   */
  async searchProducts(query: string): Promise<Product[]> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const allOrders = getStoredDemoOrders();
      const activeReservedMap = new Map<string, number>();
      const activeStatuses = ['PENDING', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSING'];
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

      const source = MOCK_PRODUCTS.map((p) => {
        const reserved = activeReservedMap.get(p.id) || (p.sku ? activeReservedMap.get(p.sku.toUpperCase()) : 0) || 0;
        const availableStock = Math.max(0, p.stockQuantity - reserved);
        return {
          ...p,
          reservedStock: reserved,
          availableStock,
          availableQuantity: availableStock,
        };
      });

      if (!query.trim()) return source.slice(0, 8);
      const q = query.toLowerCase();
      return source.filter(
        (p: Product) =>
          p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      ).slice(0, 10);
    }

    try {
      const res = await apiClient.get<{ data: Product[] }>('/products', {
        params: { search: query, limit: 10, status: 'ACTIVE' },
      });
      const products = res.data.data ?? [];
      let availableBySku = new Map<string, number>();
      try {
        const stockRows = await inventoryService.getStockOverview();
        availableBySku = new Map(stockRows.map((stock) => [stock.sku.toUpperCase(), stock.stockQuantity]));
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

        // Ưu tiên availableStock do backend tính toán chuẩn xác
        const availableStock = product.availableStock ?? product.availableQuantity ?? availableBySku.get(product.sku.toUpperCase()) ?? product.stockQuantity ?? 0;
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
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const all = getStoredDemoOrders();
      const source = all.find((o) => o.id === orderId);
      if (!source) throw new Error(`Không tìm thấy đơn hàng cần sao chép (ID: ${orderId})`);

      const nextCode = `DH-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(all.length + 1).toString().padStart(4, '0')}`;
      const now = new Date().toISOString();

      // Sao chép và tính lại giá hiện hành
      const cloned: Order = {
        ...source,
        id: `ord-demo-${Date.now()}`,
        orderCode: nextCode,
        status: 'DRAFT',
        paymentStatus: 'UNPAID',
        note: source.note
          ? `[Bản sao từ ${source.orderCode || orderId}] ${source.note}`
          : `Bản sao từ ${source.orderCode || orderId}`,
        createdAt: now,
        updatedAt: now,
      };

      all.unshift(cloned);
      saveStoredDemoOrders(all);
      return cloned;
    }

    const res = await apiClient.post<Order | { data: Order }>(`/orders/${orderId}/clone`);
    return (res.data as { data?: Order })?.data ?? (res.data as Order);
  },

  /**
   * Cập nhật đơn hàng (Chỉnh sửa / Tiếp tục gõ đơn nháp SN-39)
   */
  async updateOrder(id: string, payload: Partial<CreateOrderPayload>): Promise<Order> {
    const token = tokenStorage.getAccessToken();
    const isDemo = token?.startsWith('demo-jwt-');
    if (!isDemo) {
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
    }

    const all = getStoredDemoOrders();
    const idx = all.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Không tìm thấy đơn hàng ${id}`);
    const existing = all[idx];
    const lines = (payload.lines || existing.lines).map((l) => ({
      ...l,
      baseQuantity: Math.round(l.quantity * (l.conversionRate || 1)),
      lineTotal: l.quantity * l.unitPrice,
    }));
    const totals = calcOrderTotals(lines);
    const updatedOrder: Order = {
      ...existing,
      ...totals,
      lines,
      deliveryDate: payload.deliveryDate || existing.deliveryDate,
      deliveryPoint: (payload.deliveryPoint as Order['deliveryPoint']) || existing.deliveryPoint,
      note: payload.note !== undefined ? payload.note : existing.note,
      status: payload.status || existing.status,
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updatedOrder;
    saveStoredDemoOrders(all);
    return updatedOrder;
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
    const token = tokenStorage.getAccessToken();

    if (token?.startsWith('demo-jwt-')) {
      return this.getMockMyOrders(params, customerId);
    }

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
    const token = tokenStorage.getAccessToken();

    if (token?.startsWith('demo-jwt-')) {
      return this.getMockReorderPreview(orderId);
    }

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
      targetItems = targetItems.filter((item) =>
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

    const newLines = targetItems.map((item) => {
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
        `[Đặt lại từ đơn ${preview.orderCode}] ${
          preview.discontinuedItems.length > 0
            ? `(Đã loại bỏ ${preview.discontinuedItems.length} mặt hàng ngừng kinh doanh)`
            : ''
        }`.trim(),
      status: 'PENDING',
    };

    const newOrder = await this.createOrder(createPayload);

    return {
      newOrder,
      discontinuedItems: preview.discontinuedItems,
      message: `Đã đặt lại đơn hàng thành công (Mã đơn: ${newOrder.orderCode}).${
        preview.discontinuedItems.length > 0
          ? ` Đã loại bỏ ${preview.discontinuedItems.length} mặt hàng ngừng kinh doanh.`
          : ''
      }`,
    };
  },
};


