import axios from 'axios';
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
  type CreateCustomerPayload,
  type AssignSalesRepPayload,
  type BulkTransferPayload,
  type BulkTransferResult,
  type CustomerAssignmentHistory,
  type SalesRepOption,
} from '../types/customer.types';
import { matchesSearchTerm, removeVietnameseTones } from '../utils/vietnamese';

export const DEMO_CUSTOMERS_DATA: Customer[] = [
  {
    id: 'cust-001',
    code: 'DL-HCM-001',
    name: 'Cửa Hàng Thực Phẩm Tiêu Dùng Minh Khang',
    phone: '0901234567',
    address: '123 Nguyễn Trọng Tuyển, P.8, Q.Phú Nhuận, TP.HCM',
    region: 'Miền Nam',
    customerGroup: 'AGENT_LEVEL_1',
    salesRep: { id: 'usr-sales-002', name: 'Trần Văn Nam' },
    salesRepId: 'usr-sales-002',
    salesRepName: 'Trần Văn Nam',
    creditLimit: 100000000,
    currentDebt: 24500000,
    maxDebtDays: 30,
    status: CustomerStatus.ACTIVE,
    deliveryPoints: [
      {
        id: 'dp-001-1',
        customerId: 'cust-001',
        name: 'Kho Tổng Phú Nhuận',
        address: '123 Nguyễn Trọng Tuyển, Phường 8, Quận Phú Nhuận, TP.HCM',
        receiverName: 'Anh Nguyễn Minh Khang',
        phone: '0901234567',
        isDefault: true,
      },
      {
        id: 'dp-001-2',
        customerId: 'cust-001',
        name: 'Cửa Hàng Bán Lẻ Chi Nhánh Quận 1',
        address: '45 Lê Thị Riêng, Phường Bến Thành, Quận 1, TP.HCM',
        receiverName: 'Chị Mai Lan',
        phone: '0908765432',
        isDefault: false,
      },
      {
        id: 'dp-001-3',
        customerId: 'cust-001',
        name: 'Kho Trung Chuyển Bình Tân',
        address: '89 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân, TP.HCM',
        receiverName: 'Anh Quốc Hùng',
        phone: '0903334455',
        isDefault: false,
      },
    ],
  },
  {
    id: 'cust-002',
    code: 'DL-HCM-002',
    name: 'Đại Lý Bách Hóa Thực Phẩm Bảo Châu',
    phone: '0912345678',
    address: '456 Lê Văn Việt, P.Tăng Nhơn Phú A, TP.Thủ Đức, TP.HCM',
    region: 'Miền Nam',
    customerGroup: 'AGENT_LEVEL_2',
    salesRep: { id: 'usr-sale-02', name: 'Nguyễn Thị Hằng' },
    salesRepId: 'usr-sale-02',
    salesRepName: 'Nguyễn Thị Hằng',
    creditLimit: 60000000,
    currentDebt: 15200000,
    maxDebtDays: 20,
    status: CustomerStatus.ACTIVE,
    deliveryPoints: [
      {
        id: 'dp-002-1',
        customerId: 'cust-002',
        name: 'Kho Phân Phối Thủ Đức',
        address: '456 Lê Văn Việt, Phường Tăng Nhơn Phú A, TP. Thủ Đức, TP.HCM',
        receiverName: 'Chị Trần Bảo Châu',
        phone: '0912345678',
        isDefault: true,
      },
      {
        id: 'dp-002-2',
        customerId: 'cust-002',
        name: 'Showroom Trưng Bày Đỗ Xuân Hợp',
        address: '12 Đỗ Xuân Hợp, Phường Phước Long B, TP. Thủ Đức, TP.HCM',
        receiverName: 'Anh Lê Thanh Bình',
        phone: '0918889900',
        isDefault: false,
      },
    ],
  },
  {
    id: 'cust-003',
    code: 'DL-HCM-003',
    name: 'Siêu Thị Mini Phương Nam Mart',
    phone: '0923456789',
    address: '789 Hoàng Văn Thụ, P.4, Q.Tân Bình, TP.HCM',
    region: 'Miền Nam',
    customerGroup: 'RETAIL',
    salesRep: { id: 'usr-sales-002', name: 'Trần Văn Nam' },
    salesRepId: 'usr-sales-002',
    salesRepName: 'Trần Văn Nam',
    creditLimit: 30000000,
    currentDebt: 0,
    maxDebtDays: 15,
    status: CustomerStatus.ACTIVE,
    deliveryPoints: [
      {
        id: 'dp-003-1',
        customerId: 'cust-003',
        name: 'Điểm Bán Tân Bình (Mặt Tiền)',
        address: '789 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP.HCM',
        receiverName: 'Chị Đỗ Thu Phương',
        phone: '0923456789',
        isDefault: true,
      },
      {
        id: 'dp-003-2',
        customerId: 'cust-003',
        name: 'Kho Bảo Quản Lạnh Củ Chi',
        address: '105 Tỉnh Lộ 8, Thị trấn Củ Chi, Huyện Củ Chi, TP.HCM',
        receiverName: 'Bác Sáu Hùng',
        phone: '0921112233',
        isDefault: false,
      },
    ],
  },
  {
    id: 'cust-004',
    code: 'DL-HAN-001',
    name: 'Chuỗi Cửa Hàng Tiện Lợi An Phú Mart',
    phone: '0934567890',
    address: '18 Duy Tân, P.Dịch Vọng Hậu, Q.Cầu Giấy, Hà Nội',
    region: 'Miền Bắc',
    customerGroup: 'AGENT_LEVEL_1',
    salesRep: { id: 'usr-sale-03', name: 'Phạm Minh Tuấn' },
    salesRepId: 'usr-sale-03',
    salesRepName: 'Phạm Minh Tuấn',
    creditLimit: 120000000,
    currentDebt: 32000000,
    maxDebtDays: 45,
    status: CustomerStatus.ACTIVE,
    deliveryPoints: [
      {
        id: 'dp-004-1',
        customerId: 'cust-004',
        name: 'Tổng Kho Cầu Giấy',
        address: '18 Duy Tân, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
        receiverName: 'Anh Phạm Minh Tuấn',
        phone: '0934567890',
        isDefault: true,
      },
      {
        id: 'dp-004-2',
        customerId: 'cust-004',
        name: 'Chi Nhánh Phố Huế',
        address: '210 Phố Huế, Phường Phố Huế, Quận Hai Bà Trưng, Hà Nội',
        receiverName: 'Chị Hoàng Mai',
        phone: '0938887766',
        isDefault: false,
      },
    ],
  },
  {
    id: 'cust-005',
    code: 'DL-HCM-004',
    name: 'Công Ty TNHH Thương Mại & Dịch Vụ Hoàng Gia',
    phone: '0945678901',
    address: 'Lô B2 Đường số 3, KCN Tân Tạo, Q.Bình Tân, TP.HCM',
    region: 'Miền Nam',
    customerGroup: 'AGENT_LEVEL_1',
    salesRep: { id: 'usr-sale-02', name: 'Nguyễn Thị Hằng' },
    salesRepId: 'usr-sale-02',
    salesRepName: 'Nguyễn Thị Hằng',
    creditLimit: 200000000,
    currentDebt: 48000000,
    maxDebtDays: 30,
    status: CustomerStatus.ACTIVE,
    deliveryPoints: [
      {
        id: 'dp-005-1',
        customerId: 'cust-005',
        name: 'Tổng Kho KCN Tân Tạo',
        address: 'Lô B2 Đường số 3, KCN Tân Tạo, Phường Tân Tạo A, Quận Bình Tân, TP.HCM',
        receiverName: 'Anh Nguyễn Hoàng',
        phone: '0945678901',
        isDefault: true,
      },
      {
        id: 'dp-005-2',
        customerId: 'cust-005',
        name: 'Showroom Trưng Bày Quận 7',
        address: '56 Nguyễn Thị Thập, Phường Tân Hưng, Quận 7, TP.HCM',
        receiverName: 'Chị Đặng Thúy Vy',
        phone: '0949998877',
        isDefault: false,
      },
    ],
  },
  {
    id: 'cust-006',
    code: 'DL-DNG-001',
    name: 'Đại Lý Thực Phẩm Sông Hàn',
    phone: '0978123456',
    address: '42 Bạch Đằng, P.Hải Châu 1, Q.Hải Châu, Đà Nẵng',
    region: 'Miền Trung',
    customerGroup: 'AGENT_LEVEL_2',
    salesRep: { id: 'usr-sales-002', name: 'Trần Văn Nam' },
    salesRepId: 'usr-sales-002',
    salesRepName: 'Trần Văn Nam',
    creditLimit: 75000000,
    currentDebt: 80000000,
    maxDebtDays: 25,
    status: CustomerStatus.LOCKED,
    deliveryPoints: [
      {
        id: 'dp-006-1',
        customerId: 'cust-006',
        name: 'Điểm Bán Trung Tâm Hải Châu',
        address: '42 Bạch Đằng, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng',
        receiverName: 'Anh Lê Quốc Tuấn',
        phone: '0978123456',
        isDefault: true,
      },
    ],
  },
  {
    id: 'cust-007',
    code: 'DL-CTH-001',
    name: 'Đại Lý Bách Hóa Miền Tây',
    phone: '0966778899',
    address: '15 Trần Văn Khéo, P.Cái Khế, Q.Ninh Kiều, Cần Thơ',
    region: 'Miền Nam',
    customerGroup: 'RETAIL',
    salesRep: { id: 'usr-sale-02', name: 'Nguyễn Thị Hằng' },
    salesRepId: 'usr-sale-02',
    salesRepName: 'Nguyễn Thị Hằng',
    creditLimit: 25000000,
    currentDebt: 0,
    maxDebtDays: 15,
    status: CustomerStatus.INACTIVE,
    deliveryPoints: [
      {
        id: 'dp-007-1',
        customerId: 'cust-007',
        name: 'Cửa hàng Cái Khế',
        address: '15 Trần Văn Khéo, Phường Cái Khế, Quận Ninh Kiều, Cần Thơ',
        receiverName: 'Chị Huỳnh Ánh',
        phone: '0966778899',
        isDefault: true,
      },
    ],
  },
  {
    id: 'cust-008',
    code: 'DL-HN-001',
    name: 'Đại lý Sữa Hà Nội',
    phone: '0987654321',
    address: '123 Giải Phóng, Hai Bà Trưng, Hà Nội',
    region: 'Miền Bắc',
    customerGroup: 'AGENT_LEVEL_1',
    salesRep: { id: 'usr-sale-03', name: 'Phạm Minh Tuấn' },
    salesRepId: 'usr-sale-03',
    salesRepName: 'Phạm Minh Tuấn',
    creditLimit: 100000000,
    currentDebt: 45000000,
    maxDebtDays: 30,
    status: CustomerStatus.ACTIVE,
    deliveryPoints: [
      {
        id: 'dp-008-1',
        customerId: 'cust-008',
        name: 'Kho Phân Phối Giải Phóng',
        address: '123 Giải Phóng, Phường Đồng Tâm, Quận Hai Bà Trưng, Hà Nội',
        receiverName: 'Anh Nguyễn Văn A',
        phone: '0987654321',
        isDefault: true,
      },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────
// PERSISTENT STORAGE SYNC (SN-37, SN-38, SN-31)
// ──────────────────────────────────────────────────────────────────────────

export const CUSTOMERS_STORAGE_KEY = 'loha_customers_data';

export function getStoredCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Customer[];
      }
    }
  } catch {
    // ignore parse error
  }

  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(DEMO_CUSTOMERS_DATA));
  } catch {
    // ignore storage error
  }
  return [...DEMO_CUSTOMERS_DATA];
}

export function saveStoredCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  } catch {
    // ignore
  }

  try {
    window.dispatchEvent(
      new CustomEvent('loha_customers_updated', {
        detail: customers,
      })
    );
  } catch {
    // ignore in non-browser env
  }
}

export const CUSTOMER_HISTORY_STORAGE_KEY = 'loha_customer_assignment_history';

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
    id: 'usr-sale-01',
    fullName: 'Trần Văn Long (NVKD Miền Nam)',
    username: 'long_tran',
    email: 'long.tran@loha.vn',
    phone: '0907000001',
    role: 'SALES_REP',
    status: 'ACTIVE',
    assignedCustomerCount: 6,
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
  {
    id: 'usr-sale-02',
    fullName: 'Nguyễn Thị Hằng (NVKD Miền Nam)',
    username: 'hangnguyen',
    email: 'hang.nguyen@loha.vn',
    phone: '0945678901',
    role: 'SALES_REP',
    status: 'ACTIVE',
    assignedCustomerCount: 1,
  },
  {
    id: 'usr-sale-03',
    fullName: 'Phạm Minh Tuấn (NVKD Miền Bắc)',
    username: 'tuanpham',
    email: 'tuan.pham@loha.vn',
    phone: '0934567890',
    role: 'SALES_REP',
    status: 'ACTIVE',
    assignedCustomerCount: 1,
  },
];

export function getStoredHistory(): CustomerAssignmentHistory[] {
  try {
    const raw = localStorage.getItem(CUSTOMER_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let changed = false;
        const cleaned = parsed.map((item: CustomerAssignmentHistory) => {
          const updated = { ...item };
          if (updated.toSalesRepId === 'usr-sale-02' && (updated.toSalesRepName === 'Lê Thị Thu Thảo' || !updated.toSalesRepName)) {
            updated.toSalesRepName = 'Nguyễn Thị Hằng';
            changed = true;
          }
          if (updated.fromSalesRepId === 'usr-sale-02' && (updated.fromSalesRepName === 'Lê Thị Thu Thảo' || !updated.fromSalesRepName)) {
            updated.fromSalesRepName = 'Nguyễn Thị Hằng';
            changed = true;
          }
          if (updated.toSalesRepId === 'usr-salesmgr-003' && updated.toSalesRepName?.includes('Lê Quản Lý')) {
            updated.toSalesRepName = 'Lê Hoàng';
            changed = true;
          }
          if (updated.fromSalesRepId === 'usr-salesmgr-003' && updated.fromSalesRepName?.includes('Lê Quản Lý')) {
            updated.fromSalesRepName = 'Lê Hoàng';
            changed = true;
          }
          return updated;
        });
        if (changed) {
          saveStoredHistory(cleaned);
        }
        return cleaned;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredHistory(history: CustomerAssignmentHistory[]): void {
  try {
    localStorage.setItem(CUSTOMER_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

/**
 * Cập nhật biến động dư nợ thời gian thực cho đại lý và phát sự kiện đồng bộ toàn hệ thống
 */
export function updateStoredCustomerDebt(customerId: string, deltaAmount: number): Customer | null {
  const customers = getStoredCustomers();
  const targetId = String(customerId).toLowerCase().trim();
  const idx = customers.findIndex(
    (c) =>
      c.id.toLowerCase() === targetId ||
      c.code.toLowerCase() === targetId ||
      (c.phone && targetId.includes(c.phone))
  );

  if (idx === -1) return null;

  const current = typeof customers[idx].currentDebt === 'number' ? customers[idx].currentDebt : 0;
  const newDebt = Math.max(0, current + deltaAmount);
  customers[idx] = {
    ...customers[idx],
    currentDebt: newDebt,
  };

  saveStoredCustomers(customers);

  try {
    window.dispatchEvent(
      new CustomEvent('loha_debt_updated', {
        detail: {
          customerId: customers[idx].id,
          customerCode: customers[idx].code,
          newDebt,
          creditLimit: customers[idx].creditLimit,
          availableLimit: Math.max(0, (customers[idx].creditLimit || 0) - newDebt),
        },
      })
    );
  } catch {
    // ignore
  }

  return customers[idx];
}

export function filterDemoCustomers(params: CustomerFilterParams = {}): PaginatedCustomersResponse {
  let list = getStoredCustomers();

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
        return c.salesRepId === currentUser.id || c.salesRep?.id === currentUser.id;
      });
    }
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    list = list.filter(
      (c) =>
        matchesSearchTerm(c.code, q) ||
        matchesSearchTerm(c.name, q) ||
        matchesSearchTerm(c.phone, q) ||
        matchesSearchTerm(c.address, q) ||
        matchesSearchTerm(c.taxCode, q)
    );
  }

  if (params.region && params.region !== 'ALL') {
    const reg = params.region.trim();
    const normReg = removeVietnameseTones(reg);
    list = list.filter((c) => {
      if (!c.region) return false;
      return (
        c.region.toLowerCase() === reg.toLowerCase() ||
        removeVietnameseTones(c.region) === normReg
      );
    });
  }

  if (params.customerGroup && params.customerGroup !== 'ALL') {
    list = list.filter((c) => c.customerGroup === params.customerGroup);
  }

  if (params.salesRepId && params.salesRepId !== 'ALL') {
    if (params.salesRepId === 'UNASSIGNED') {
      list = list.filter((c) => !c.salesRepId || c.salesRepId === '' || c.salesRepId === 'unassigned');
    } else {
      list = list.filter(
        (c) =>
          c.salesRepId === params.salesRepId ||
          c.salesRep?.id === params.salesRepId ||
          ((params.salesRepId === 'usr-sales-002' || params.salesRepId === 'usr-sale-01') &&
            (c.salesRepId === 'usr-sale-01' || c.salesRepId === 'usr-sales-002'))
      );
    }
  }

  if (params.status && params.status !== 'ALL') {
    list = list.filter((c) => c.status === params.status);
  }

  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const total = list.length;
  const activeCount = list.filter((c) => c.status === CustomerStatus.ACTIVE).length;
  const totalCreditLimit = list.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
  const totalCurrentDebt = list.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    activeCount,
    totalCreditLimit,
    totalCurrentDebt,
  };
}

export const customerService = {
  async createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
    const cleanPayload: CreateCustomerPayload = {
      ...payload,
      code: payload.code?.trim() || undefined,
      email: payload.email?.trim() || undefined,
      taxCode: payload.taxCode?.trim(),
      salesRepId: payload.salesRepId || undefined,
      deliveryPointName: payload.deliveryPointName?.trim() || undefined,
      receiverName: payload.receiverName?.trim() || undefined,
    };

    try {
      const res = await apiClient.post<Customer>('/customers', cleanPayload);
      if (res.data) {
        const existingList = getStoredCustomers();
        saveStoredCustomers([res.data, ...existingList.filter((c) => c.id !== res.data.id)]);
      }
      return res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        throw err;
      }

      // Chỉ fallback khi hoàn toàn mất mạng / offline
      const existingList = getStoredCustomers();
      const newCustId = `cust-${Date.now().toString().slice(-6)}`;
      const newCust: Customer = {
        id: newCustId,
        code: cleanPayload.code || `DL-${Date.now().toString().slice(-4)}`,
        name: cleanPayload.name.trim(),
        phone: cleanPayload.phone.trim(),
        address: cleanPayload.address.trim(),
        region: cleanPayload.region || 'Miền Nam',
        customerGroup: cleanPayload.customerGroup || 'AGENT_LEVEL_2',
        creditLimit: Number(cleanPayload.creditLimit) || 50000000,
        currentDebt: 0,
        maxDebtDays: Number(cleanPayload.maxDebtDays) || 30,
        status: CustomerStatus.ACTIVE,
        taxCode: cleanPayload.taxCode,
        email: cleanPayload.email,
        salesRepId: cleanPayload.salesRepId || 'usr-sales-002',
        salesRepName: 'Trần Văn Nam',
        deliveryPoints: [
          {
            id: `dp-${Date.now().toString().slice(-5)}`,
            customerId: newCustId,
            name: cleanPayload.deliveryPointName || 'Kho chính / Trụ sở đại lý',
            address: cleanPayload.address.trim(),
            receiverName: cleanPayload.receiverName || cleanPayload.name.trim(),
            phone: cleanPayload.phone.trim(),
            isDefault: true,
          },
        ],
      };

      saveStoredCustomers([newCust, ...existingList]);
      return newCust;
    }
  },

  async getCustomers(params: CustomerFilterParams = {}): Promise<PaginatedCustomersResponse> {
    const cleanParams: Record<string, string | number> = {
      page: params.page || 1,
      limit: params.limit || 20,
    };

    if (params.search && params.search.trim()) {
      cleanParams.search = params.search.trim();
    }
    if (params.region && params.region !== 'ALL') {
      cleanParams.region = params.region.trim();
    }
    if (params.customerGroup && params.customerGroup !== 'ALL') {
      cleanParams.customerGroup = params.customerGroup.trim();
    }
    if (params.status && (params.status as string) !== 'ALL') {
      cleanParams.status = params.status;
    }
    if (params.salesRepId && params.salesRepId !== 'ALL') {
      cleanParams.salesRepId = params.salesRepId.trim();
    }

    try {
      const res = await apiClient.get<PaginatedCustomersResponse | Customer[]>('/customers', {
        params: cleanParams,
      });

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

      return {
        data: res.data?.data || [],
        total: typeof res.data?.total === 'number' ? res.data.total : (res.data?.data?.length || 0),
        page: res.data?.page || Number(cleanParams.page) || 1,
        limit: res.data?.limit || Number(cleanParams.limit) || 20,
        totalPages: res.data?.totalPages || 1,
        activeCount: res.data?.activeCount,
        totalCreditLimit: res.data?.totalCreditLimit,
        totalCurrentDebt: res.data?.totalCurrentDebt,
      };
    } catch {
      return filterDemoCustomers(params);
    }
  },

  async getCustomerById(id: string): Promise<Customer> {
    try {
      const res = await apiClient.get<Customer>(`/customers/${id}`);
      return res.data;
    } catch {
      const list = getStoredCustomers();
      const found = list.find((c) => c.id === id);
      if (found) return found;
      throw new Error(`Không tìm thấy đại lý có ID: ${id}`);
    }
  },

  /**
   * Lấy hồ sơ của chính Đại lý B2B đang đăng nhập (Cổng B2B - Cách ly dữ liệu)
   */
  async getPortalProfile(): Promise<Customer> {
    const res = await apiClient.get<Customer>('/customers/portal/profile');
    return res.data;
  },

  async getDeliveryPoints(customerId: string): Promise<DeliveryPoint[]> {
    try {
      const res = await apiClient.get<DeliveryPoint[]>(`/customers/${customerId}/delivery-points`);
      return res.data;
    } catch {
      const list = getStoredCustomers();
      const cust = list.find((c) => c.id === customerId);
      return cust?.deliveryPoints || [];
    }
  },

  async createDeliveryPoint(
    customerId: string,
    payload: CreateDeliveryPointPayload
  ): Promise<DeliveryPoint> {
    try {
      const res = await apiClient.post<DeliveryPoint>(
        `/customers/${customerId}/delivery-points`,
        payload
      );
      return res.data;
    } catch {
      const list = getStoredCustomers();
      const custIndex = list.findIndex((c) => c.id === customerId);
      const newPoint: DeliveryPoint = {
        id: `dp-${Date.now().toString().slice(-5)}`,
        customerId,
        name: payload.name.trim(),
        address: payload.address.trim(),
        receiverName: payload.receiverName?.trim() || '',
        phone: payload.phone.trim(),
        roadNote: payload.roadNote,
        ward: payload.ward,
        district: payload.district,
        province: payload.province,
        isDefault: Boolean(payload.isDefault),
      };

      if (custIndex >= 0) {
        const cust = list[custIndex];
        let currentPoints = cust.deliveryPoints ? [...cust.deliveryPoints] : [];
        if (newPoint.isDefault) {
          currentPoints = currentPoints.map((p) => ({ ...p, isDefault: false }));
        } else if (currentPoints.length === 0) {
          newPoint.isDefault = true;
        }
        currentPoints.push(newPoint);
        list[custIndex] = { ...cust, deliveryPoints: currentPoints };
        saveStoredCustomers(list);
      }
      return newPoint;
    }
  },

  async updateDeliveryPoint(
    customerId: string,
    pointId: string,
    payload: UpdateDeliveryPointPayload
  ): Promise<DeliveryPoint> {
    try {
      const res = await apiClient.put<DeliveryPoint>(
        `/customers/${customerId}/delivery-points/${pointId}`,
        payload
      );
      return res.data;
    } catch {
      const list = getStoredCustomers();
      const custIndex = list.findIndex((c) => c.id === customerId);
      let updatedPoint: DeliveryPoint | null = null;
      if (custIndex >= 0) {
        const cust = list[custIndex];
        const points = (cust.deliveryPoints || []).map((p) => {
          if (p.id === pointId) {
            updatedPoint = {
              ...p,
              ...payload,
              name: payload.name ?? p.name,
              address: payload.address ?? p.address,
              receiverName: payload.receiverName ?? p.receiverName,
              phone: payload.phone ?? p.phone,
            };
            return updatedPoint;
          }
          return p;
        });
        if (payload.isDefault) {
          points.forEach((p) => {
            if (p.id !== pointId) p.isDefault = false;
          });
        }
        list[custIndex] = { ...cust, deliveryPoints: points };
        saveStoredCustomers(list);
      }
      if (!updatedPoint) throw new Error('Không tìm thấy điểm giao hàng');
      return updatedPoint;
    }
  },

  async setDefaultDeliveryPoint(customerId: string, pointId: string): Promise<DeliveryPoint> {
    try {
      const res = await apiClient.patch<DeliveryPoint>(
        `/customers/${customerId}/delivery-points/${pointId}/default`
      );
      return res.data;
    } catch {
      const list = getStoredCustomers();
      const custIndex = list.findIndex((c) => c.id === customerId);
      let targetPoint: DeliveryPoint | null = null;
      if (custIndex >= 0) {
        const cust = list[custIndex];
        const points = (cust.deliveryPoints || []).map((p) => {
          if (p.id === pointId) {
            targetPoint = { ...p, isDefault: true };
            return targetPoint;
          }
          return { ...p, isDefault: false };
        });
        list[custIndex] = { ...cust, deliveryPoints: points };
        saveStoredCustomers(list);
      }
      if (!targetPoint) throw new Error('Không tìm thấy điểm giao hàng');
      return targetPoint;
    }
  },

  async deleteDeliveryPoint(
    customerId: string,
    pointId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.delete<{ success: boolean; message: string }>(
        `/customers/${customerId}/delivery-points/${pointId}`
      );
      return res.data;
    } catch {
      const list = getStoredCustomers();
      const custIndex = list.findIndex((c) => c.id === customerId);
      if (custIndex >= 0) {
        const cust = list[custIndex];
        const filtered = (cust.deliveryPoints || []).filter((p) => p.id !== pointId);
        list[custIndex] = { ...cust, deliveryPoints: filtered };
        saveStoredCustomers(list);
      }
      return { success: true, message: 'Đã xóa điểm giao hàng' };
    }
  },

  async lockCustomer(id: string, reason: string): Promise<Customer> {
    try {
      const res = await apiClient.patch<Customer>(`/customers/${id}/lock`, { reason });
      return res.data;
    } catch {
      const list = getStoredCustomers();
      const custIndex = list.findIndex((c) => c.id === id);
      if (custIndex >= 0) {
        list[custIndex] = {
          ...list[custIndex],
          status: CustomerStatus.LOCKED,
          lockReason: reason,
          lockedAt: new Date().toISOString(),
        };
        saveStoredCustomers(list);
        return list[custIndex];
      }
      throw new Error('Không tìm thấy đại lý');
    }
  },

  async unlockCustomer(id: string): Promise<Customer> {
    try {
      const res = await apiClient.patch<Customer>(`/customers/${id}/unlock`);
      return res.data;
    } catch {
      const list = getStoredCustomers();
      const custIndex = list.findIndex((c) => c.id === id);
      if (custIndex >= 0) {
        list[custIndex] = {
          ...list[custIndex],
          status: CustomerStatus.ACTIVE,
          lockReason: undefined,
          lockedAt: undefined,
        };
        saveStoredCustomers(list);
        return list[custIndex];
      }
      throw new Error('Không tìm thấy đại lý');
    }
  },

  /**
   * Xóa hồ sơ đại lý (SN-30 AC4)
   * Chặn xóa nếu đại lý đã có giao dịch hoặc còn công nợ, ném lỗi rõ ràng
   */
  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.delete<{ success: boolean; message: string }>(`/customers/${id}`);
      return res.data;
    } catch (err: unknown) {
      const list = getStoredCustomers();
      const target = list.find((c) => c.id === id);
      if (target) {
        if ((target.currentDebt || 0) > 0) {
          throw new Error(
            `Đại lý "${target.name}" đã phát sinh giao dịch hoặc còn công nợ (${(target.currentDebt || 0).toLocaleString('vi-VN')} đ), không thể xóa. Chỉ được phép chuyển sang trạng thái Ngừng giao dịch.`
          );
        }
        const filtered = list.filter((c) => c.id !== id);
        saveStoredCustomers(filtered);
        return { success: true, message: `Đã xóa đại lý "${target.name}" thành công.` };
      }
      throw err;
    }
  },

  /**
   * Ngừng giao dịch với đại lý (SN-30 AC4: Chuyển sang trạng thái INACTIVE)
   */
  async deactivateCustomer(id: string): Promise<Customer> {
    try {
      const res = await apiClient.patch<Customer>(`/customers/${id}/deactivate`);
      return res.data;
    } catch {
      const list = getStoredCustomers();
      const custIndex = list.findIndex((c) => c.id === id);
      if (custIndex >= 0) {
        list[custIndex] = {
          ...list[custIndex],
          status: CustomerStatus.INACTIVE,
          updatedAt: new Date().toISOString(),
        };
        saveStoredCustomers(list);
        return list[custIndex];
      }
      throw new Error('Không tìm thấy đại lý');
    }
  },

  /**
   * Lấy danh sách nhân sự kinh doanh khả dụng để phân công (SN-35)
   */
  async getAvailableSalesReps(): Promise<SalesRepOption[]> {
    try {
      const res = await apiClient.get<SalesRepOption[]>('/customers/sales-reps');
      return res.data;
    } catch {
      const customers = getStoredCustomers();
      return INITIAL_DEMO_SALES_REPS.map((rep) => ({
        ...rep,
        assignedCustomerCount: customers.filter((c) => c.salesRepId === rep.id).length,
      }));
    }
  },

  /**
   * Phân công nhân viên kinh doanh phụ trách chính cho đại lý (SN-35)
   */
  async assignSalesRep(
    customerId: string,
    payload: AssignSalesRepPayload,
  ): Promise<Customer> {
    try {
      const res = await apiClient.patch<Customer>(
        `/customers/${customerId}/assign-sales-rep`,
        payload,
      );
      return res.data;
    } catch {
      try {
        const res = await apiClient.patch<Customer>(
          `/customers/${customerId}/assign`,
          payload,
        );
        return res.data;
      } catch {
        const list = getStoredCustomers();
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
        list[custIndex].salesRep = {
          id: payload.salesRepId,
          name: rep?.fullName || 'Nhân viên kinh doanh',
        };
        saveStoredCustomers(list);

        const history = getStoredHistory();
        history.unshift({
          id: `hist-${Date.now()}`,
          transferBatchId: `ASSIGN-${Date.now()}`,
          customerId: list[custIndex].id,
          customerCode: list[custIndex].code,
          customerName: list[custIndex].name,
          region: list[custIndex].region || 'Chưa phân vùng',
          fromSalesRepId: prevRepId,
          fromSalesRepName: prevRepName || '(Chưa phân công)',
          toSalesRepId: payload.salesRepId,
          toSalesRepName: rep?.fullName || 'Nhân viên kinh doanh',
          performedById: 'CURRENT_USER',
          performedByName: 'Quản trị viên',
          reason: payload.reason || 'Phân công nhân viên phụ trách chính cho đại lý',
          notes: payload.notes,
          createdAt: new Date().toISOString(),
        });
        saveStoredHistory(history);

        return list[custIndex];
      }
    }
  },

  /**
   * Chuyển giao địa bàn hàng loạt khi nhân viên nghỉ việc (SN-35)
   */
  async bulkTransferTerritory(
    payload: BulkTransferPayload,
  ): Promise<BulkTransferResult> {
    try {
      const res = await apiClient.post<BulkTransferResult>(
        '/customers/bulk-transfer-territory',
        payload,
      );
      return res.data;
    } catch {
      try {
        const res = await apiClient.post<BulkTransferResult>(
          '/customers/bulk-transfer',
          payload,
        );
        return res.data;
      } catch {
        const list = getStoredCustomers();
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
        const history = getStoredHistory();
        const nowStr = new Date().toISOString();

        for (const target of targets) {
          const prevRepName = target.salesRepName;
          target.salesRepId = toRep.id;
          target.salesRepName = toRep.fullName;
          target.salesRepPhone = toRep.phone;
          target.salesRepEmail = toRep.email;
          target.salesRep = { id: toRep.id, name: toRep.fullName };

          history.unshift({
            id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            transferBatchId: batchId,
            customerId: target.id,
            customerCode: target.code,
            customerName: target.name,
            region: target.region || 'Chưa phân vùng',
            fromSalesRepId: fromRep.id,
            fromSalesRepName: prevRepName,
            toSalesRepId: toRep.id,
            toSalesRepName: toRep.fullName,
            performedById: 'CURRENT_USER',
            performedByName: 'Quản trị viên',
            reason: payload.reason,
            notes: payload.notes,
            createdAt: nowStr,
          });
        }

        saveStoredCustomers(list);
        saveStoredHistory(history);

        return {
          transferBatchId: batchId,
          transferredCount: targets.length,
          fromSalesRep: { id: fromRep.id, fullName: fromRep.fullName, email: fromRep.email },
          toSalesRep: { id: toRep.id, fullName: toRep.fullName, email: toRep.email },
          reason: payload.reason,
          notes: payload.notes,
          transferredCustomers: targets.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            region: c.region || 'Chưa phân vùng',
          })),
          transferredAt: nowStr,
        };
      }
    }
  },

  /**
   * Lấy lịch sử phân công và chuyển giao địa bàn (SN-35)
   */
  async getAssignmentHistory(params?: {
    fromSalesRepId?: string;
    toSalesRepId?: string;
    customerId?: string;
    transferBatchId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: CustomerAssignmentHistory[]; total: number }> {
    try {
      const res = await apiClient.get<{
        data: CustomerAssignmentHistory[];
        total: number;
      }>('/customers/assignment-history', { params });
      return res.data;
    } catch {
      let list = getStoredHistory();
      if (params?.customerId) {
        list = list.filter((h) => h.customerId === params.customerId);
      }
      if (params?.transferBatchId) {
        list = list.filter((h) => h.transferBatchId === params.transferBatchId);
      }
      if (params?.fromSalesRepId) {
        list = list.filter((h) => h.fromSalesRepId === params.fromSalesRepId);
      }
      if (params?.toSalesRepId) {
        list = list.filter((h) => h.toSalesRepId === params.toSalesRepId);
      }
      if (params?.startDate) {
        const fromTime = new Date(params.startDate).getTime();
        if (!isNaN(fromTime)) {
          list = list.filter((h) => new Date(h.createdAt).getTime() >= fromTime);
        }
      }
      if (params?.endDate) {
        const toTime = new Date(params.endDate).getTime();
        if (!isNaN(toTime)) {
          list = list.filter((h) => new Date(h.createdAt).getTime() <= toTime);
        }
      }
      if (params?.search && params.search.trim()) {
        const s = params.search.trim().toLowerCase();
        list = list.filter(
          (h) =>
            h.customerName?.toLowerCase().includes(s) ||
            h.customerCode?.toLowerCase().includes(s) ||
            h.reason?.toLowerCase().includes(s) ||
            h.fromSalesRepName?.toLowerCase().includes(s) ||
            h.toSalesRepName?.toLowerCase().includes(s) ||
            (h.transferBatchId && h.transferBatchId.toLowerCase().includes(s)) ||
            (h.performedByName && h.performedByName.toLowerCase().includes(s)),
        );
      }
      return { data: list, total: list.length };
    }
  },

  /**
   * Cập nhật hạn mức công nợ & số ngày nợ tối đa cho đại lý (SN-34)
   * Kèm lý do phục vụ kiểm toán hệ thống (Audit Log)
   */
  async updateCreditLimit(
    customerId: string,
    payload: {
      creditLimit: number;
      maxDebtDays: number;
      reason: string;
      paymentTerms?: string;
      temporaryCreditLimit?: number;
      temporaryLimitExpiry?: string;
      allowOverLimitOrder?: boolean;
    },
  ): Promise<Customer> {
    try {
      const res = await apiClient.put<Customer>(`/credit-limit/${customerId}`, payload);
      const list = getStoredCustomers();
      const custIndex = list.findIndex((c) => c.id === customerId || c.code === customerId);
      if (custIndex >= 0) {
        list[custIndex] = {
          ...list[custIndex],
          creditLimit: payload.creditLimit,
          maxDebtDays: payload.maxDebtDays,
          updatedAt: new Date().toISOString(),
        };
        saveStoredCustomers(list);
      }
      return res.data;
    } catch {
      const list = getStoredCustomers();
      const custIndex = list.findIndex((c) => c.id === customerId || c.code === customerId);
      if (custIndex >= 0) {
        list[custIndex] = {
          ...list[custIndex],
          creditLimit: payload.creditLimit,
          maxDebtDays: payload.maxDebtDays,
          updatedAt: new Date().toISOString(),
        };
        saveStoredCustomers(list);
        return list[custIndex];
      }
      throw new Error('Không tìm thấy đại lý để cập nhật hạn mức');
    }
  },

  /**
   * Đọc danh sách đại lý đã lưu
   */
  getStoredCustomers,
  saveStoredCustomers,
  getStoredHistory,
  saveStoredHistory,
};

export const customersService = customerService;