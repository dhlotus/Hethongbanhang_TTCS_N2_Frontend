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
  salesRepPhone?: string;
  salesRepEmail?: string;
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

/**
 * Payload Gán nhân viên phụ trách chính cho đại lý (SN-35)
 */
export interface AssignSalesRepPayload {
  salesRepId: string;
  reason?: string;
  notes?: string;
}

/**
 * Payload Chuyển giao địa bàn hàng loạt khi nhân viên nghỉ (SN-35)
 */
export interface BulkTransferPayload {
  fromSalesRepId: string;
  toSalesRepId: string;
  customerIds?: string[];
  reason: string;
  notes?: string;
}

/**
 * Kết quả sau khi chuyển giao địa bàn hàng loạt (SN-35)
 */
export interface BulkTransferResult {
  transferBatchId: string;
  transferredCount: number;
  fromSalesRep: { id: string; name?: string; fullName?: string; email?: string };
  toSalesRep: { id: string; name?: string; fullName?: string; email?: string };
  reason: string;
  notes?: string;
  transferredCustomers: Array<{
    id: string;
    code: string;
    name: string;
    region: string;
  }>;
  transferredAt: string;
}

/**
 * Thực thể Bản ghi Lịch sử Phân công & Chuyển giao Địa bàn (SN-35)
 */
export interface CustomerAssignmentHistory {
  id: string;
  transferBatchId: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  region: string;
  fromSalesRepId?: string | null;
  fromSalesRepName?: string | null;
  toSalesRepId: string;
  toSalesRepName: string;
  performedById: string;
  performedByName: string;
  reason: string;
  notes?: string;
  createdAt: string;
}

/**
 * Thông tin Nhân sự Kinh doanh phục vụ gán / chuyển giao địa bàn (SN-35)
 */
export interface SalesRepOption {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  assignedCustomerCount: number;
}

/**
 * Thống kê đại lý theo từng khu vực
 */
export interface RegionSummary {
  region: string;
  customerCount: number;
}

/**
 * Tham số tìm kiếm & lọc danh sách đại lý mở rộng
 */
export interface CustomerQueryParams {
  search?: string;
  region?: string;
  salesRepId?: string;
  unassignedOnly?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}
