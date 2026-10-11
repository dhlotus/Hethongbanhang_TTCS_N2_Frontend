/**
 * Enum trạng thái hoạt động của Đại lý / Khách hàng
 */
export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  INACTIVE = 'INACTIVE',
}

/**
 * Kiểu dữ liệu Điểm giao hàng của Đại lý (SN-31 & SN-32)
 */
export interface DeliveryPoint {
  id: string;
  customerId: string;
  name: string;
  address: string;
  ward?: string;
  district?: string;
  province?: string;
  receiverName: string;
  contactPerson?: string;
  phone: string;
  roadNote?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payload thêm điểm giao hàng mới (SN-31)
 */
export interface CreateDeliveryPointPayload {
  name: string;
  address: string;
  receiverName: string;
  phone: string;
  roadNote?: string;
  ward?: string;
  district?: string;
  province?: string;
  isDefault?: boolean;
}

/**
 * Payload cập nhật điểm giao hàng (SN-31)
 */
export type UpdateDeliveryPointPayload = Partial<CreateDeliveryPointPayload>;

/**
 * Thông tin nhân viên kinh doanh phụ trách
 */
export interface CustomerSalesRep {
  id: string;
  name: string;
}

/**
 * Kiểu dữ liệu Đại lý / Khách hàng B2B (SN-37, SN-31 & SN-38)
 * Đồng bộ chuẩn 100% với Backend Customer Entity & DTO
 */
export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address?: string;
  region?: string;
  customerGroup: string;
  salesRep?: CustomerSalesRep;
  salesRepId?: string;
  salesRepName?: string;
  creditLimit: number;
  currentDebt: number;
  maxDebtDays?: number;
  overdueAmount?: number;
  overdueDays?: number;
  status: CustomerStatus | string;
  lockReason?: string;
  lockedAt?: string;
  lockedBy?: string;
  taxCode?: string;
  email?: string;
  deliveryPoints?: DeliveryPoint[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Tham số bộ lọc và tìm kiếm đại lý (SN-37)
 */
export interface CustomerFilterParams {
  search?: string;
  region?: string;
  customerGroup?: string;
  salesRepId?: string;
  status?: CustomerStatus | string;
  page?: number;
  limit?: number;
}

/**
 * Cấu trúc Response phân trang từ Backend GET /api/customers
 */
export interface PaginatedCustomersResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  activeCount?: number;
  totalCreditLimit?: number;
  totalCurrentDebt?: number;
}

/**
 * Alias cho CustomerResponse
 */
export type CustomerResponse = PaginatedCustomersResponse;

/**
 * Kiểu dữ liệu Option dùng trong select / dropdown
 */
export interface CustomerOption extends Customer {
  group: string;
}

/**
 * Payload thêm mới Đại lý (SN-31 & SN-38)
 */
export interface CreateCustomerPayload {
  name: string;
  code?: string;
  customerGroup?: string;
  phone: string;
  email?: string;
  taxCode?: string;
  address: string;
  region?: string;
  creditLimit?: number;
  maxDebtDays?: number;
  deliveryPointName?: string;
  receiverName?: string;
  salesRepId?: string;
  salesRepName?: string;
}
