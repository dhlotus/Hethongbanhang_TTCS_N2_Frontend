import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import type {
  CustomerPurchaseHistoryResponse,
  LatestOrderSummary,
} from '../types/order-suggestion.types';

/**
 * Mock data gợi ý lịch sử 3 tháng phục vụ môi trường demo offline (SN-43)
 */
const MOCK_DEMO_SUGGESTIONS: Record<string, CustomerPurchaseHistoryResponse> = {
  'cust-dl-0001': {
    customerId: 'cust-dl-0001',
    customerCode: 'DL-0001',
    customerName: 'Công Ty TNHH Thương Mại & Phân Phối Minh Khang',
    lookbackMonths: 3,
    totalOrdersInPeriod: 3,
    suggestions: [
      {
        productId: 'prod-001',
        sku: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng LOHA Gold 900g',
        unit: 'Thùng (12 lon)',
        baseUnit: 'Lon',
        conversionRate: 12,
        price: 5130000,
        totalQuantity: 19,
        orderCount: 3,
        averageQuantity: 6,
        lastPurchasedAt: '2026-10-06T08:30:00.000Z',
        lastPurchasedQuantity: 5,
      },
      {
        productId: 'prod-002',
        sku: 'LH-NUT-180ML',
        productName: 'Sữa Hạt Óc Chó Yến Mạch LOHA 180ml',
        unit: 'Thùng (48 hộp)',
        baseUnit: 'Hộp',
        conversionRate: 48,
        price: 589000,
        totalQuantity: 37,
        orderCount: 3,
        averageQuantity: 12,
        lastPurchasedAt: '2026-10-06T08:30:00.000Z',
        lastPurchasedQuantity: 10,
      },
      {
        productId: 'prod-003',
        sku: 'LH-NEST-70ML',
        productName: 'Nước Yến Sào Nhân Sâm Thượng Hạng LOHA 70ml',
        unit: 'Hộp (6 hũ)',
        baseUnit: 'Hũ',
        conversionRate: 6,
        price: 399000,
        totalQuantity: 10,
        orderCount: 1,
        averageQuantity: 10,
        lastPurchasedAt: '2026-09-20T10:00:00.000Z',
        lastPurchasedQuantity: 10,
      },
    ],
    latestOrder: {
      orderId: 'ord-001',
      orderCode: 'DH2610-10023',
      customerId: 'cust-dl-0001',
      customerName: 'Công Ty TNHH Thương Mại & Phân Phối Minh Khang',
      deliveryDate: '2026-10-12',
      status: 'APPROVED',
      subtotal: 33200000,
      totalDiscount: 1660000,
      grandTotal: 31540000,
      createdAt: '2026-10-06T08:30:00.000Z',
      note: 'Giao buổi sáng, gọi trước 30 phút để chuẩn bị thủ kho bốc dỡ',
      items: [
        {
          productId: 'prod-001',
          sku: 'LH-MILK-900G',
          productName: 'Sữa Bột Dinh Dưỡng LOHA Gold 900g',
          unit: 'Thùng (12 lon)',
          baseUnit: 'Lon',
          conversionRate: 12,
          quantity: 5,
          unitPrice: 5130000,
          listPrice: 5400000,
          discountPercent: 5,
          lineTotal: 25650000,
        },
        {
          productId: 'prod-002',
          sku: 'LH-NUT-180ML',
          productName: 'Sữa Hạt Óc Chó Yến Mạch LOHA 180ml',
          unit: 'Thùng (48 hộp)',
          baseUnit: 'Hộp',
          conversionRate: 48,
          quantity: 10,
          unitPrice: 589000,
          listPrice: 620000,
          discountPercent: 5,
          lineTotal: 5890000,
        },
      ],
    },
  },
  'cust-dl-0002': {
    customerId: 'cust-dl-0002',
    customerCode: 'DL-0002',
    customerName: 'Tổng Đại Lý Phân Phối Thực Phẩm Toàn Cầu',
    lookbackMonths: 3,
    totalOrdersInPeriod: 2,
    suggestions: [
      {
        productId: 'prod-003',
        sku: 'LH-NEST-70ML',
        productName: 'Nước Yến Sào Nhân Sâm Thượng Hạng LOHA 70ml',
        unit: 'Hộp (6 hũ)',
        baseUnit: 'Hũ',
        conversionRate: 6,
        price: 399000,
        totalQuantity: 50,
        orderCount: 2,
        averageQuantity: 25,
        lastPurchasedAt: '2026-10-07T10:00:00.000Z',
        lastPurchasedQuantity: 20,
      },
      {
        productId: 'prod-004',
        sku: 'LH-CEREAL-500G',
        productName: 'Ngũ Cốc Dinh Dưỡng Hạt Granola LOHA 500g',
        unit: 'Gói',
        baseUnit: 'Gói',
        conversionRate: 1,
        price: 145000,
        totalQuantity: 25,
        orderCount: 1,
        averageQuantity: 25,
        lastPurchasedAt: '2026-09-15T15:00:00.000Z',
        lastPurchasedQuantity: 25,
      },
    ],
    latestOrder: {
      orderId: 'ord-002',
      orderCode: 'DH2610-10045',
      customerId: 'cust-dl-0002',
      customerName: 'Tổng Đại Lý Phân Phối Thực Phẩm Toàn Cầu',
      deliveryDate: '2026-10-15',
      status: 'PENDING',
      subtotal: 8400000,
      totalDiscount: 0,
      grandTotal: 8400000,
      createdAt: '2026-10-07T10:00:00.000Z',
      note: 'Hàng dễ vỡ, bốc dỡ cẩn thận',
      items: [
        {
          productId: 'prod-003',
          sku: 'LH-NEST-70ML',
          productName: 'Nước Yến Sào Nhân Sâm Thượng Hạng LOHA 70ml',
          unit: 'Hộp (6 hũ)',
          baseUnit: 'Hũ',
          conversionRate: 6,
          quantity: 20,
          unitPrice: 420000,
          listPrice: 420000,
          discountPercent: 0,
          lineTotal: 8400000,
        },
      ],
    },
  },
};

export const orderSuggestionsService = {
  /**
   * Lấy danh sách mặt hàng gợi ý theo lịch sử 3 tháng gần nhất (SN-43 AC1 & AC3)
   */
  async getPurchaseHistorySuggestions(
    customerId: string,
  ): Promise<CustomerPurchaseHistoryResponse> {
    const token = tokenStorage.getAccessToken();
    const isDemo = token?.startsWith('demo-jwt-');

    if (!isDemo) {
      try {
        const res = await apiClient.get<CustomerPurchaseHistoryResponse>(
          `/customers/${customerId}/purchase-history/suggestions`,
        );
        return res.data;
      } catch (err: unknown) {
        // Nếu API trả lỗi 403 Forbidden, ném trực tiếp để giao diện hiển thị cảnh báo phân quyền
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          throw err;
        }
        // Fallback sang demo offline nếu backend chưa khởi động
      }
    }

    // Mock fallback linh hoạt
    const normalizedId = customerId.replace('cust-', 'cust-dl-');
    const matched =
      MOCK_DEMO_SUGGESTIONS[customerId] ||
      MOCK_DEMO_SUGGESTIONS[normalizedId] ||
      MOCK_DEMO_SUGGESTIONS['cust-dl-0001'];

    return {
      ...matched,
      customerId,
    };
  },

  /**
   * Lấy chi tiết đơn hàng thành công gần nhất của đại lý để 1-click reorder (SN-43 AC2 & AC3)
   */
  async getLatestOrder(
    customerId: string,
  ): Promise<LatestOrderSummary | null> {
    const token = tokenStorage.getAccessToken();
    const isDemo = token?.startsWith('demo-jwt-');

    if (!isDemo) {
      try {
        const res = await apiClient.get<LatestOrderSummary | null>(
          `/customers/${customerId}/orders/latest`,
        );
        return res.data;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          throw err;
        }
      }
    }

    const normalizedId = customerId.replace('cust-', 'cust-dl-');
    const matched =
      MOCK_DEMO_SUGGESTIONS[customerId] ||
      MOCK_DEMO_SUGGESTIONS[normalizedId] ||
      MOCK_DEMO_SUGGESTIONS['cust-dl-0001'];

    return matched?.latestOrder || null;
  },
};
