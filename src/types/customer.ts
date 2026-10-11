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
  contactPerson?: string; // Tên người liên hệ (alias)
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
 * Trạng thái hoạt động của Đại lý
 */
export type CustomerStatusType = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

/**
 * Kiểu dữ liệu Đại lý / Khách hàng B2B (SN-31 & SN-35 & SN-38)
 */
export interface Customer {
  id: string;
  code: string;
  name: string;
  taxCode?: string;
  customerGroup: string;
  region: string;
  salesRepId?: string | null;
  salesRepName?: string | null;
  salesRepPhone?: string | null;
  salesRepEmail?: string | null;
  userId?: string | null;
  creditLimit: number;
  currentDebt: number;
  maxDebtDays?: number;
  paymentTerms?: string;
  phone: string;
  email?: string;
  address?: string;
  status: CustomerStatusType | string;
  lockReason?: string | null;
  deliveryPoints: DeliveryPoint[];
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Kiểu dữ liệu Option dùng trong select / dropdown
 */
export interface CustomerOption extends Customer {
  group: string;
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
  fromSalesRep: { id: string; fullName: string; email: string };
  toSalesRep: { id: string; fullName: string; email: string };
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
 * Thông tin Nhân sự Kinh doanh phục vụ gán / chuyển giao địa bàn
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
 * Tham số tìm kiếm & lọc danh sách đại lý
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
