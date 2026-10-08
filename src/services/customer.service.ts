import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import {
  CustomerStatus,
  type Customer,
  type CustomerFilterParams,
  type PaginatedCustomersResponse,
  type CreateDeliveryPointPayload,
  type DeliveryPoint,
  type UpdateDeliveryPointPayload,
} from '../types/customer.types';

export const DEMO_CUSTOMERS_DATA: Customer[] = [
  {
    id: 'cust-001',
    code: 'DL-HN-001',
    name: 'Đại lý Sữa Hà Nội',
    phone: '0987654321',
    address: '123 Giải Phóng, Hai Bà Trưng, Hà Nội',
    region: 'Miền Bắc',
    customerGroup: 'AGENT_LEVEL_1',
    salesRep: { id: 'usr-sale-01', name: 'Nguyễn Văn A' },
    salesRepId: 'usr-sale-01',
    salesRepName: 'Nguyễn Văn A',
    creditLimit: 100000000,
    currentDebt: 45000000,
    maxDebtDays: 30,
    status: CustomerStatus.ACTIVE,
    deliveryPoints: [
      {
        id: 'dp-001-1',
        customerId: 'cust-001',
        name: 'Kho Hai Bà Trưng',
        address: '123 Giải Phóng, Hai Bà Trưng, Hà Nội',
        receiverName: 'Anh Tuấn',
        phone: '0987654321',
        isDefault: true,
      },
    ],
  },
  {
    id: 'cust-002',
    code: 'DL-SGN-001',
    name: 'Cửa Hàng Thực Phẩm Minh Khang',
    phone: '0901234567',
    address: '123 Nguyễn Trãi, Q.1, TP.HCM',
    region: 'Miền Nam',
    customerGroup: 'AGENT_LEVEL_1',
    salesRep: { id: 'usr-sale-01', name: 'Nguyễn Văn A' },
    salesRepId: 'usr-sale-01',
    salesRepName: 'Nguyễn Văn A',
    creditLimit: 50000000,
    currentDebt: 12500000,
    maxDebtDays: 45,
    status: CustomerStatus.ACTIVE,
    deliveryPoints: [
      {
        id: 'dp-002-1',
        customerId: 'cust-002',
        name: 'Kho chính Minh Khang',
        address: '123 Nguyễn Trãi, Q.1, TP.HCM',
        receiverName: 'Anh Minh',
        phone: '0901234567',
        isDefault: true,
      },
    ],
  },
  {
    id: 'cust-003',
    code: 'DL-SGN-002',
    name: 'Đại Lý Thực Phẩm Bảo Châu',
    phone: '0912345678',
    address: '456 Lê Văn Việt, Q.9, TP.HCM',
    region: 'Miền Nam',
    customerGroup: 'AGENT_LEVEL_2',
    salesRep: { id: 'usr-sale-02', name: 'Trần Thị B' },
    salesRepId: 'usr-sale-02',
    salesRepName: 'Trần Thị B',
    creditLimit: 30000000,
    currentDebt: 8000000,
    maxDebtDays: 30,
    status: CustomerStatus.ACTIVE,
    deliveryPoints: [
      {
        id: 'dp-003-1',
        customerId: 'cust-003',
        name: 'Kho Bảo Châu - Q9',
        address: '456 Lê Văn Việt, Q.9, TP.HCM',
        receiverName: 'Chị Châu',
        phone: '0912345678',
        isDefault: true,
      },
    ],
  },
  {
    id: 'cust-004',
    code: 'DL-SGN-003',
    name: 'Tạp Hóa & Sữa Cô Ba',
    phone: '0933456789',
    address: '789 Phan Đăng Lưu, Phú Nhuận, TP.HCM',
    region: 'Miền Nam',
    customerGroup: 'RETAIL',
    salesRep: { id: 'usr-sale-01', name: 'Nguyễn Văn A' },
    salesRepId: 'usr-sale-01',
    salesRepName: 'Nguyễn Văn A',
    creditLimit: 20000000,
    currentDebt: 2000000,
    maxDebtDays: 15,
    status: CustomerStatus.ACTIVE,
    deliveryPoints: [
      {
        id: 'dp-004-1',
        customerId: 'cust-004',
        name: 'Điểm nhận hàng Cô Ba',
        address: '789 Phan Đăng Lưu, Phú Nhuận, TP.HCM',
        receiverName: 'Cô Ba',
        phone: '0933456789',
        isDefault: true,
      },
    ],
  },
  {
    id: 'cust-005',
    code: 'DL-DNG-001',
    name: 'Tổng Đại Lý Bánh Kẹo Sông Hàn',
    phone: '0945678901',
    address: '88 Bạch Đằng, Hải Châu, Đà Nẵng',
    region: 'Miền Trung',
    customerGroup: 'AGENT_LEVEL_1',
    salesRep: { id: 'usr-sale-02', name: 'Trần Thị B' },
    salesRepId: 'usr-sale-02',
    salesRepName: 'Trần Thị B',
    creditLimit: 80000000,
    currentDebt: 72000000,
    maxDebtDays: 30,
    status: CustomerStatus.LOCKED,
    deliveryPoints: [
      {
        id: 'dp-005-1',
        customerId: 'cust-005',
        name: 'Kho trung tâm Sông Hàn',
        address: '88 Bạch Đằng, Hải Châu, Đà Nẵng',
        receiverName: 'Anh Tuấn',
        phone: '0945678901',
        isDefault: true,
      },
    ],
  },
  {
    id: 'cust-006',
    code: 'DL-CTH-001',
    name: 'Đại Lý Phân Phối Tây Đô',
    phone: '0977889900',
    address: '12 Đại lộ Hòa Bình, Ninh Kiều, Cần Thơ',
    region: 'Miền Nam',
    customerGroup: 'AGENT_LEVEL_2',
    salesRep: { id: 'usr-sale-01', name: 'Nguyễn Văn A' },
    salesRepId: 'usr-sale-01',
    salesRepName: 'Nguyễn Văn A',
    creditLimit: 40000000,
    currentDebt: 0,
    maxDebtDays: 30,
    status: CustomerStatus.INACTIVE,
    deliveryPoints: [],
  },
];

/**
 * Lọc danh sách demo trong bộ nhớ
 */
function filterDemoCustomers(
  params: CustomerFilterParams = {},
): PaginatedCustomersResponse {
  let list = [...DEMO_CUSTOMERS_DATA];

  // RBAC Scoping cho chế độ demo / offline
  const currentUser = tokenStorage.getUser();
  if (currentUser?.roles && currentUser.roles.length > 0) {
    const isManagerOrAdmin = currentUser.roles.some((r) => {
      const u = r.toUpperCase();
      return u.includes('ADMIN') || u.includes('MANAGER');
    });
    const isSalesRep = currentUser.roles.some((r) => {
      const u = r.toUpperCase();
      return u.includes('SALES_REP') || u.includes('SALE');
    });

    if (isSalesRep && !isManagerOrAdmin) {
      list = list.filter((c) => {
        if (c.salesRepId === currentUser.id || c.salesRep?.id === currentUser.id) {
          return true;
        }
        return c.salesRepId === 'usr-sale-01' || c.salesRepId === 'usr-sales-002';
      });
    }
  }

  if (params.search) {
    const q = params.search.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q),
    );
  }

  if (params.region) {
    list = list.filter(
      (c) => c.region?.toLowerCase() === params.region?.toLowerCase(),
    );
  }

  if (params.customerGroup) {
    list = list.filter((c) => c.customerGroup === params.customerGroup);
  }

  if (params.salesRepId) {
    list = list.filter(
      (c) => c.salesRepId === params.salesRepId || c.salesRep?.id === params.salesRepId,
    );
  }

  if (params.status) {
    list = list.filter((c) => c.status === params.status);
  }

  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const total = list.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Service Quản lý Đại lý & Tìm kiếm Lọc theo tuyến (SN-37 & SN-31)
 */
export const customerService = {
  /**
   * Lấy danh sách đại lý có hỗ trợ tìm kiếm nhanh & lọc đa tiêu chí phân trang (SN-37)
   */
  async getCustomers(
    params: CustomerFilterParams = {},
  ): Promise<PaginatedCustomersResponse> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      return filterDemoCustomers(params);
    }

    try {
      const res = await apiClient.get<PaginatedCustomersResponse | Customer[]>(
        '/customers',
        { params },
      );

      // Nếu backend trả về mảng trực tiếp (phiên bản cũ)
      if (Array.isArray(res.data)) {
        const total = res.data.length;
        const page = params.page || 1;
        const limit = params.limit || 20;
        return {
          data: res.data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        };
      }

      // Format chuẩn theo PaginatedCustomersResponse (SN-37)
      return res.data;
    } catch {
      // Fallback an toàn khi offline hoặc dev demo
      return filterDemoCustomers(params);
    }
  },

  /**
   * Lấy chi tiết một đại lý theo ID
   */
  async getCustomerById(id: string): Promise<Customer> {
    const token = tokenStorage.getAccessToken();
    if (token?.startsWith('demo-jwt-')) {
      const found = DEMO_CUSTOMERS_DATA.find((c) => c.id === id);
      if (found) return found;
    }

    try {
      const res = await apiClient.get<Customer>(`/customers/${id}`);
      return res.data;
    } catch {
      const found = DEMO_CUSTOMERS_DATA.find((c) => c.id === id);
      if (found) return found;
      throw new Error(`Không tìm thấy đại lý có ID: ${id}`);
    }
  },

  /**
   * Lấy danh sách điểm giao hàng của đại lý (SN-31)
   */
  async getDeliveryPoints(customerId: string): Promise<DeliveryPoint[]> {
    try {
      const res = await apiClient.get<DeliveryPoint[]>(
        `/customers/${customerId}/delivery-points`,
      );
      return res.data;
    } catch {
      const cust = DEMO_CUSTOMERS_DATA.find((c) => c.id === customerId);
      return cust?.deliveryPoints || [];
    }
  },

  /**
   * Thêm điểm giao hàng mới cho đại lý (SN-31)
   */
  async createDeliveryPoint(
    customerId: string,
    payload: CreateDeliveryPointPayload,
  ): Promise<DeliveryPoint> {
    const res = await apiClient.post<DeliveryPoint>(
      `/customers/${customerId}/delivery-points`,
      payload,
    );
    return res.data;
  },

  /**
   * Cập nhật thông tin điểm giao hàng (SN-31)
   */
  async updateDeliveryPoint(
    customerId: string,
    pointId: string,
    payload: UpdateDeliveryPointPayload,
  ): Promise<DeliveryPoint> {
    const res = await apiClient.put<DeliveryPoint>(
      `/customers/${customerId}/delivery-points/${pointId}`,
      payload,
    );
    return res.data;
  },

  /**
   * Đặt 1 điểm giao hàng làm mặc định (SN-31)
   */
  async setDefaultDeliveryPoint(
    customerId: string,
    pointId: string,
  ): Promise<DeliveryPoint> {
    const res = await apiClient.patch<DeliveryPoint>(
      `/customers/${customerId}/delivery-points/${pointId}/default`,
    );
    return res.data;
  },

  /**
   * Xóa điểm giao hàng của đại lý (SN-31)
   */
  async deleteDeliveryPoint(
    customerId: string,
    pointId: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/customers/${customerId}/delivery-points/${pointId}`,
    );
    return res.data;
  },
};

/**
 * Alias cho tương thích ngược
 */
export const customersService = customerService;
