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
 * Kiểu dữ liệu Đại lý / Khách hàng B2B (SN-31 & SN-38)
 */
export interface Customer {
  id: string;
  code: string;
  name: string;
  taxCode?: string;
  customerGroup: string;
  region?: string;
  salesRepId?: string;
  salesRepName?: string;
  creditLimit: number;
  currentDebt: number;
  maxDebtDays?: number;
  phone: string;
  email?: string;
  address?: string;
  status: string;
  deliveryPoints: DeliveryPoint[];
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
}

