import { apiClient } from './api';
import type {
  Customer,
  CreateDeliveryPointPayload,
  DeliveryPoint,
  UpdateDeliveryPointPayload,
  AssignSalesRepPayload,
  BulkTransferPayload,
  BulkTransferResult,
  CustomerAssignmentHistory,
  SalesRepOption,
  RegionSummary,
  CustomerQueryParams,
} from '../types/customer';

const STORAGE_CUSTOMERS_KEY = 'loha_customers_data';
const STORAGE_HISTORY_KEY = 'loha_customer_assignment_history';

/**
 * Danh sách đại lý mẫu ban đầu (phân bố khắp các khu vực, có gán và chưa gán)
 */
export const INITIAL_DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'cust-hcm-001',
    code: 'DL-HCM-001',
    name: 'Đại Lý Cửa Hàng Minh Khang',
    taxCode: '0312345678',
    customerGroup: 'TIER_1',
    region: 'Miền Nam',
    salesRepId: 'usr-sales-002',
    salesRepName: 'Trần Văn Nam',
    salesRepPhone: '0923456789',
    salesRepEmail: 'sales@loha.vn',
    creditLimit: 50000000,
    currentDebt: 12500000,
    maxDebtDays: 30,
    phone: '0901234567',
    email: 'dealer@loha.vn',
    address: '123 Nguyễn Trãi, P. Bến Thành, Quận 1, TP. Hồ Chí Minh',
    status: 'ACTIVE',
    deliveryPoints: [
      {
        id: 'dp-001-1',
        customerId: 'cust-hcm-001',
        name: 'Kho chính Minh Khang',
        address: '123 Nguyễn Trãi, Q.1, TP.HCM',
        receiverName: 'Anh Minh',
        phone: '0901234567',
        isDefault: true,
      },
    ],
  },
  {
    id: 'cust-hn-002',
    code: 'DL-HN-002',
    name: 'Đại Lý Bán Buôn An Bình',
    taxCode: '0109876543',
    customerGroup: 'TIER_1',
    region: 'Miền Bắc',
    salesRepId: 'usr-sales-002',
    salesRepName: 'Trần Văn Nam',
    salesRepPhone: '0923456789',
    salesRepEmail: 'sales@loha.vn',
    creditLimit: 70000000,
    currentDebt: 18000000,
    maxDebtDays: 45,
    phone: '0907000017',
    email: 'daily@loha.vn',
    address: '45 Phố Huế, Q. Hoàn Kiếm, TP. Hà Nội',
    status: 'ACTIVE',
    deliveryPoints: [
      {
        id: 'dp-002-1',
        customerId: 'cust-hn-002',
        name: 'Kho An Bình Hoàn Kiếm',
        address: '45 Phố Huế, Q. Hoàn Kiếm, TP. Hà Nội',
        receiverName: 'Chị Bình',
        phone: '0907000017',
        isDefault: true,
      },
    ],
  },
  {
    id: 'cust-ct-003',
    code: 'DL-CT-003',
    name: 'Tạp Hóa Phân Phối Hưng Thịnh',
    taxCode: '1800112233',
    customerGroup: 'TIER_2',
    region: 'Tây Nam Bộ',
    salesRepId: 'usr-sales-002',
    salesRepName: 'Trần Văn Nam',
    salesRepPhone: '0923456789',
    salesRepEmail: 'sales@loha.vn',
    creditLimit: 30000000,
    currentDebt: 9500000,
    maxDebtDays: 30,
    phone: '0909112233',
    email: 'hungthinh@gmail.com',
    address: '78 Đường 30/4, P. Ninh Kiều, TP. Cần Thơ',
    status: 'ACTIVE',
    deliveryPoints: [],
  },
  {
    id: 'cust-bd-004',
    code: 'DL-BD-004',
    name: 'Đại Lý Phân Phối Thuận Hòa',
    taxCode: '3700223344',
    customerGroup: 'TIER_1',
    region: 'Đông Nam Bộ',
    salesRepId: 'usr-salesmgr-003',
    salesRepName: 'Lê Hoàng Trưởng Phòng',
    salesRepPhone: '0934567890',
    salesRepEmail: 'salesmanager@loha.vn',
    creditLimit: 60000000,
    currentDebt: 5000000,
    maxDebtDays: 30,
    phone: '0918223344',
    email: 'thuanhoa@loha.vn',
    address: '12 Đại lộ Bình Dương, TP. Thủ Dầu Một, Bình Dương',
    status: 'ACTIVE',
    deliveryPoints: [],
  },
  {
    id: 'cust-dn-005',
    code: 'DL-DN-005',
    name: 'Tổng Đại Lý Miền Trung Hải Vân',
    taxCode: '0400556677',
    customerGroup: 'GOLD',
    region: 'Miền Trung',
    salesRepId: 'usr-salesmgr-003',
    salesRepName: 'Lê Hoàng Trưởng Phòng',
    salesRepPhone: '0934567890',
    salesRepEmail: 'salesmanager@loha.vn',
    creditLimit: 100000000,
    currentDebt: 32000000,
    maxDebtDays: 60,
    phone: '0988556677',
    email: 'haivan@loha.vn',
    address: '220 Nguyễn Văn Linh, Q. Hải Châu, TP. Đà Nẵng',
    status: 'ACTIVE',
    deliveryPoints: [],
  },
  {
    id: 'cust-hp-006',
    code: 'DL-HP-006',
    name: 'Siêu Thị Bán Sỉ Sao Biển',
    taxCode: '0200889900',
    customerGroup: 'TIER_2',
    region: 'Miền Bắc',
    salesRepId: null,
    salesRepName: null,
    creditLimit: 40000000,
    currentDebt: 0,
    maxDebtDays: 30,
    phone: '0933889900',
    email: 'saobien@loha.vn',
    address: '15 Lê Hồng Phong, Q. Ngô Quyền, TP. Hải Phòng',
    status: 'ACTIVE',
    deliveryPoints: [],
  },
  {
    id: 'cust-vt-007',
    code: 'DL-VT-007',
    name: 'Chuỗi Bách Hóa Vũng Tàu',
    taxCode: '3500667788',
    customerGroup: 'RETAIL',
    region: 'Đông Nam Bộ',
    salesRepId: null,
    salesRepName: null,
    creditLimit: 25000000,
    currentDebt: 4500000,
    maxDebtDays: 15,
    phone: '0944667788',
    email: 'vungtau@loha.vn',
    address: '88 Ba Cu, P. 4, TP. Vũng Tàu',
    status: 'ACTIVE',
    deliveryPoints: [],
  },
  {
    id: 'cust-gl-008',
    code: 'DL-GL-008',
    name: 'Nhà Phân Phối Tây Nguyên Xanh',
    taxCode: '5900334455',
    customerGroup: 'TIER_1',
    region: 'Miền Trung',
    salesRepId: null,
    salesRepName: null,
    creditLimit: 45000000,
    currentDebt: 12000000,
    maxDebtDays: 30,
    phone: '0966334455',
    email: 'taynguyen@loha.vn',
    address: '102 Hùng Vương, TP. Pleiku, Gia Lai',
    status: 'ACTIVE',
    deliveryPoints: [],
  },
  {
    id: 'cust-tg-009',
    code: 'DL-TG-009',
    name: 'Đại Lý Lương Thực Tiền Giang',
    taxCode: '1200445566',
    customerGroup: 'TIER_2',
    region: 'Tây Nam Bộ',
    salesRepId: null,
    salesRepName: null,
    creditLimit: 35000000,
    currentDebt: 0,
    maxDebtDays: 30,
    phone: '0977445566',
    email: 'tiengiang@loha.vn',
    address: '56 Ấp Bắc, P. 5, TP. Mỹ Tho, Tiền Giang',
    status: 'ACTIVE',
    deliveryPoints: [],
  },
  {
    id: 'cust-hcm-010',
    code: 'DL-HCM-010',
    name: 'Cửa Hàng Bách Hóa Sài Gòn Mới',
    taxCode: '0319887766',
    customerGroup: 'TIER_1',
    region: 'Miền Nam',
    salesRepId: 'usr-sales-002',
    salesRepName: 'Trần Văn Nam',
    salesRepPhone: '0923456789',
    salesRepEmail: 'sales@loha.vn',
    creditLimit: 50000000,
    currentDebt: 8200000,
    maxDebtDays: 30,
    phone: '0908887766',
    email: 'saigonmoi@loha.vn',
    address: '500 Cộng Hòa, P. 13, Q. Tân Bình, TP. Hồ Chí Minh',
    status: 'ACTIVE',
    deliveryPoints: [],
  },
];

export const INITIAL_DEMO_SALES_REPS: SalesRepOption[] = [
  {
    id: 'usr-sales-002',
    fullName: 'Trần Văn Nam (Nhân Viên Kinh Doanh)',
    username: 'sales',
    email: 'sales@loha.vn',
    phone: '0923456789',
    role: 'SALES_REP',
    status: 'ACTIVE',
    assignedCustomerCount: 4,
  },
  {
    id: 'usr-salesmgr-003',
    fullName: 'Lê Hoàng Trưởng Phòng (Quản Lý Kinh Doanh)',
    username: 'salesmanager',
    email: 'salesmanager@loha.vn',
    phone: '0934567890',
    role: 'SALES_MANAGER',
    status: 'ACTIVE',
    assignedCustomerCount: 2,
  },
];

/**
 * Trình trợ giúp lưu trữ cục bộ (Local Storage Fallback)
 */
const getLocalCustomers = (): Customer[] => {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn('[CustomersService] Không thể đọc cache đại lý:', error);
  }
  localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(INITIAL_DEMO_CUSTOMERS));
  return INITIAL_DEMO_CUSTOMERS;
};

const saveLocalCustomers = (list: Customer[]): void => {
  try {
    localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn('[CustomersService] Không thể lưu cache đại lý:', error);
  }
};

const getLocalHistory = (): CustomerAssignmentHistory[] => {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn('[CustomersService] Không thể đọc cache lịch sử:', error);
  }
  return [];
};

const saveLocalHistory = (list: CustomerAssignmentHistory[]): void => {
  try {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn('[CustomersService] Không thể lưu cache lịch sử:', error);
  }
};

/**
 * Service Quản lý Đại lý & Phân công Địa bàn (SN-31 & SN-35)
 */
export const customersService = {
  /**
   * Lấy danh sách đại lý (có hỗ trợ lọc theo khu vực, nhân sự, tìm kiếm)
   */
  async getCustomers(
    params?: CustomerQueryParams,
  ): Promise<{ data: Customer[]; total: number; unassignedCount: number }> {
    try {
      const res = await apiClient.get<{
        data: Customer[];
        total: number;
        unassignedCount: number;
      }>('/customers', { params });
      return res.data;
    } catch {
      // Fallback cục bộ
      let list = getLocalCustomers();
      if (params?.search) {
        const q = params.search.toLowerCase().trim();
        list = list.filter(
          (c) =>
            c.code.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q),
        );
      }
      if (params?.region && params.region !== 'ALL') {
        list = list.filter((c) => c.region === params.region);
      }
      if (params?.salesRepId) {
        list = list.filter((c) => c.salesRepId === params.salesRepId);
      }
      if (params?.unassignedOnly) {
        list = list.filter((c) => !c.salesRepId);
      }
      const unassignedCount = getLocalCustomers().filter((c) => !c.salesRepId).length;
      return { data: list, total: list.length, unassignedCount };
    }
  },

  /**
   * Lấy chi tiết một đại lý
   */
  async getCustomerById(id: string): Promise<Customer> {
    try {
      const res = await apiClient.get<Customer>(`/customers/${id}`);
      return res.data;
    } catch {
      const found = getLocalCustomers().find((c) => c.id === id);
      if (!found) throw new Error('Không tìm thấy đại lý');
      return found;
    }
  },

  /**
   * Lấy danh sách nhân sự kinh doanh khả dụng
   */
  async getAvailableSalesReps(): Promise<SalesRepOption[]> {
    try {
      const res = await apiClient.get<SalesRepOption[]>('/customers/sales-reps');
      return res.data;
    } catch {
      // Cập nhật số lượng đại lý thực tế trong local storage
      const customers = getLocalCustomers();
      return INITIAL_DEMO_SALES_REPS.map((rep) => ({
        ...rep,
        assignedCustomerCount: customers.filter((c) => c.salesRepId === rep.id).length,
      }));
    }
  },

  /**
   * Lấy danh sách tổng hợp theo khu vực
   */
  async getRegions(): Promise<RegionSummary[]> {
    try {
      const res = await apiClient.get<RegionSummary[]>('/customers/regions');
      return res.data;
    } catch {
      const customers = getLocalCustomers();
      const regions = ['Miền Bắc', 'Miền Trung', 'Miền Nam', 'Đông Nam Bộ', 'Tây Nam Bộ'];
      return regions.map((region) => ({
        region,
        customerCount: customers.filter((c) => c.region === region).length,
      }));
    }
  },

  /**
   * Gán nhân viên phụ trách chính cho đại lý (SN-35)
   */
  async assignSalesRep(
    customerId: string,
    payload: AssignSalesRepPayload,
  ): Promise<Customer> {
    try {
      const res = await apiClient.patch<Customer>(
        `/customers/${customerId}/assign`,
        payload,
      );
      return res.data;
    } catch {
      // Cập nhật cục bộ
      const list = getLocalCustomers();
      const reps = await this.getAvailableSalesReps();
      const rep = reps.find((r) => r.id === payload.salesRepId);
      const custIndex = list.findIndex((c) => c.id === customerId);
      if (custIndex === -1) throw new Error('Không tìm thấy đại lý');

      const prevRepId = list[custIndex].salesRepId;
      const prevRepName = list[custIndex].salesRepName;
      list[custIndex].salesRepId = payload.salesRepId;
      list[custIndex].salesRepName = rep?.fullName || 'Nhân viên kinh doanh';
      list[custIndex].salesRepPhone = rep?.phone;
      list[custIndex].salesRepEmail = rep?.email;
      saveLocalCustomers(list);

      // Ghi lịch sử
      const history = getLocalHistory();
      history.unshift({
        id: `hist-${Date.now()}`,
        transferBatchId: `ASSIGN-${Date.now()}`,
        customerId: list[custIndex].id,
        customerCode: list[custIndex].code,
        customerName: list[custIndex].name,
        region: list[custIndex].region,
        fromSalesRepId: prevRepId,
        fromSalesRepName: prevRepName || '(Chưa phân công)',
        toSalesRepId: payload.salesRepId,
        toSalesRepName: rep?.fullName || 'Nhân viên kinh doanh',
        performedById: 'LOCAL_USER',
        performedByName: 'Quản lý kinh doanh',
        reason: payload.reason || 'Phân công nhân viên phụ trách chính cho đại lý',
        notes: payload.notes,
        createdAt: new Date().toISOString(),
      });
      saveLocalHistory(history);

      return list[custIndex];
    }
  },

  /**
   * Chuyển giao địa bàn hàng loạt khi nhân viên nghỉ (SN-35)
   */
  async bulkTransferTerritory(
    payload: BulkTransferPayload,
  ): Promise<BulkTransferResult> {
    try {
      const res = await apiClient.post<BulkTransferResult>(
        '/customers/bulk-transfer',
        payload,
      );
      return res.data;
    } catch {
      // Cập nhật cục bộ
      const list = getLocalCustomers();
      const reps = await this.getAvailableSalesReps();
      const fromRep = reps.find((r) => r.id === payload.fromSalesRepId);
      const toRep = reps.find((r) => r.id === payload.toSalesRepId);
      if (!fromRep || !toRep) throw new Error('Không tìm thấy thông tin nhân sự kinh doanh');

      let targets = list.filter((c) => c.salesRepId === payload.fromSalesRepId);
      if (payload.customerIds && payload.customerIds.length > 0) {
        const allowed = new Set(payload.customerIds);
        targets = targets.filter((c) => allowed.has(c.id));
      }

      if (targets.length === 0) {
        throw new Error('Không có đại lý nào để chuyển giao');
      }

      const batchId = `BATCH-${Date.now()}`;
      const history = getLocalHistory();
      const nowStr = new Date().toISOString();

      for (const target of targets) {
        const prevRepName = target.salesRepName;
        target.salesRepId = toRep.id;
        target.salesRepName = toRep.fullName;
        target.salesRepPhone = toRep.phone;
        target.salesRepEmail = toRep.email;

        history.unshift({
          id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          transferBatchId: batchId,
          customerId: target.id,
          customerCode: target.code,
          customerName: target.name,
          region: target.region,
          fromSalesRepId: fromRep.id,
          fromSalesRepName: prevRepName,
          toSalesRepId: toRep.id,
          toSalesRepName: toRep.fullName,
          performedById: 'LOCAL_USER',
          performedByName: 'Quản lý kinh doanh',
          reason: payload.reason,
          notes: payload.notes,
          createdAt: nowStr,
        });
      }

      saveLocalCustomers(list);
      saveLocalHistory(history);

      return {
        transferBatchId: batchId,
        transferredCount: targets.length,
        fromSalesRep: { id: fromRep.id, fullName: fromRep.fullName, email: fromRep.email },
        toSalesRep: { id: toRep.id, fullName: toRep.fullName, email: toRep.email },
        reason: payload.reason,
        notes: payload.notes,
        transferredCustomers: targets.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          region: t.region,
        })),
        transferredAt: nowStr,
      };
    }
  },

  /**
   * Lấy lịch sử chuyển giao / phân công địa bàn (SN-35)
   */
  async getAssignmentHistory(params?: {
    search?: string;
    fromSalesRepId?: string;
    toSalesRepId?: string;
  }): Promise<{ data: CustomerAssignmentHistory[]; total: number }> {
    try {
      const res = await apiClient.get<{
        data: CustomerAssignmentHistory[];
        total: number;
      }>('/customers/assignment-history', { params });
      return res.data;
    } catch {
      let list = getLocalHistory();
      if (params?.search) {
        const q = params.search.toLowerCase().trim();
        list = list.filter(
          (h) =>
            h.customerCode.toLowerCase().includes(q) ||
            h.customerName.toLowerCase().includes(q) ||
            h.reason.toLowerCase().includes(q) ||
            h.transferBatchId.toLowerCase().includes(q),
        );
      }
      if (params?.fromSalesRepId) {
        list = list.filter((h) => h.fromSalesRepId === params.fromSalesRepId);
      }
      if (params?.toSalesRepId) {
        list = list.filter((h) => h.toSalesRepId === params.toSalesRepId);
      }
      return { data: list, total: list.length };
    }
  },

  /**
   * Tạo đại lý mới
   */
  async createCustomer(payload: Partial<Customer>): Promise<Customer> {
    try {
      const res = await apiClient.post<Customer>('/customers', payload);
      return res.data;
    } catch {
      const list = getLocalCustomers();
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        code: payload.code || `DL-${Date.now().toString().slice(-4)}`,
        name: payload.name || '',
        customerGroup: payload.customerGroup || 'TIER_1',
        region: payload.region || 'Miền Nam',
        salesRepId: payload.salesRepId || null,
        salesRepName: payload.salesRepName || null,
        creditLimit: payload.creditLimit || 0,
        currentDebt: 0,
        phone: payload.phone || '',
        email: payload.email,
        address: payload.address,
        status: 'ACTIVE',
        deliveryPoints: [],
        createdAt: new Date().toISOString(),
      };
      list.unshift(newCust);
      saveLocalCustomers(list);
      return newCust;
    }
  },

  /**
   * Cập nhật thông tin đại lý
   */
  async updateCustomer(id: string, payload: Partial<Customer>): Promise<Customer> {
    try {
      const res = await apiClient.put<Customer>(`/customers/${id}`, payload);
      return res.data;
    } catch {
      const list = getLocalCustomers();
      const idx = list.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error('Không tìm thấy đại lý');
      list[idx] = { ...list[idx], ...payload, updatedAt: new Date().toISOString() };
      saveLocalCustomers(list);
      return list[idx];
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
      const cust = getLocalCustomers().find((c) => c.id === customerId);
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
    try {
      const res = await apiClient.post<DeliveryPoint>(
        `/customers/${customerId}/delivery-points`,
        payload,
      );
      return res.data;
    } catch {
      const list = getLocalCustomers();
      const cust = list.find((c) => c.id === customerId);
      if (!cust) throw new Error('Không tìm thấy đại lý');
      const newPoint: DeliveryPoint = {
        id: `dp-${Date.now()}`,
        customerId,
        ...payload,
        isDefault: payload.isDefault || cust.deliveryPoints.length === 0,
        createdAt: new Date().toISOString(),
      };
      cust.deliveryPoints.push(newPoint);
      saveLocalCustomers(list);
      return newPoint;
    }
  },

  /**
   * Cập nhật thông tin điểm giao hàng (SN-31)
   */
  async updateDeliveryPoint(
    customerId: string,
    pointId: string,
    payload: UpdateDeliveryPointPayload,
  ): Promise<DeliveryPoint> {
    try {
      const res = await apiClient.put<DeliveryPoint>(
        `/customers/${customerId}/delivery-points/${pointId}`,
        payload,
      );
      return res.data;
    } catch {
      const list = getLocalCustomers();
      const cust = list.find((c) => c.id === customerId);
      if (!cust) throw new Error('Không tìm thấy đại lý');
      const pointIdx = cust.deliveryPoints.findIndex((p) => p.id === pointId);
      if (pointIdx === -1) throw new Error('Không tìm thấy điểm giao hàng');
      cust.deliveryPoints[pointIdx] = {
        ...cust.deliveryPoints[pointIdx],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      saveLocalCustomers(list);
      return cust.deliveryPoints[pointIdx];
    }
  },

  /**
   * Đặt 1 điểm giao hàng làm mặc định (SN-31)
   */
  async setDefaultDeliveryPoint(
    customerId: string,
    pointId: string,
  ): Promise<DeliveryPoint> {
    try {
      const res = await apiClient.patch<DeliveryPoint>(
        `/customers/${customerId}/delivery-points/${pointId}/default`,
      );
      return res.data;
    } catch {
      const list = getLocalCustomers();
      const cust = list.find((c) => c.id === customerId);
      if (!cust) throw new Error('Không tìm thấy đại lý');
      for (const p of cust.deliveryPoints) {
        p.isDefault = p.id === pointId;
      }
      saveLocalCustomers(list);
      const target = cust.deliveryPoints.find((p) => p.id === pointId);
      if (!target) throw new Error('Không tìm thấy điểm giao hàng');
      return target;
    }
  },

  /**
   * Xóa điểm giao hàng của đại lý (SN-31)
   */
  async deleteDeliveryPoint(
    customerId: string,
    pointId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.delete<{ success: boolean; message: string }>(
        `/customers/${customerId}/delivery-points/${pointId}`,
      );
      return res.data;
    } catch {
      const list = getLocalCustomers();
      const cust = list.find((c) => c.id === customerId);
      if (!cust) throw new Error('Không tìm thấy đại lý');
      cust.deliveryPoints = cust.deliveryPoints.filter((p) => p.id !== pointId);
      saveLocalCustomers(list);
      return { success: true, message: 'Đã xóa điểm giao hàng' };
    }
  },
};
