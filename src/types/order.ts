/**
 * Kiểu dữ liệu cho Đơn hàng Bán buôn (SN-38, SN-39 & SN-41)
 */

export type OrderStatus =
  | 'DRAFT' // Nháp
  | 'PENDING' // Chờ duyệt
  | 'PENDING_APPROVAL' // Cần phê duyệt (do vượt hạn mức công nợ - SN-41)
  | 'PENDING_INVENTORY_APPROVAL' // Chờ duyệt do thiếu tồn kho
  | 'APPROVED' // Đã duyệt
  | 'PROCESSING' // Đang xử lý / soạn hàng
  | 'SHIPPED' // Đã xuất kho / giao vận
  | 'DELIVERED' // Giao thành công
  | 'CANCELLED' // Đã hủy
  | 'RETURNED'; // Hoàn hàng

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

/** Một dòng hàng trong đơn hàng */
export interface OrderLine {
  id?: string;
  productId: string;
  productSku: string;
  productName: string;
  unit: string; // Đơn vị gọi hàng (Thùng, Lốc, Lon...)
  baseUnit: string; // Đơn vị cơ sở
  conversionRate: number; // Hệ số quy đổi sang đơn vị cơ sở
  quantity: number; // Số lượng theo unit
  baseQuantity: number; // Số lượng quy về baseUnit = quantity × conversionRate
  unitPrice: number; // Đơn giá theo unit (sau chiết khấu)
  listPrice: number; // Giá niêm yết gốc
  discountPercent: number; // Chiết khấu % theo bảng giá
  lineTotal: number; // Thành tiền = quantity × unitPrice
  stockAvailable?: number; // Tồn khả dụng tham khảo (hiển thị UI)
  minPrice?: number;
  requiresApproval?: boolean;
  availableStock?: number; // Tồn khả dụng (SN-39)
  priceListId?: string;
  notes?: string;
}

/** Alias cho OrderLine phục vụ tính tương thích (SN-38 / SN-39) */
export type OrderItem = OrderLine;

/** Thông tin điểm giao hàng */
export interface DeliveryPoint {
  id?: string;
  name: string;
  address: string;
  phone?: string;
  contactPerson?: string;
  isDefault?: boolean;
}

/** Đơn hàng bán buôn */
export interface Order {
  id?: string;
  orderCode?: string; // Mã đơn hàng tự sinh
  customerId: string; // ID Đại lý / Khách hàng B2B
  customerCode?: string;
  customerName?: string;
  customerGroup?: string; // Nhóm đại lý (AGENT_LEVEL_1, AGENT_LEVEL_2, RETAIL)
  salesRepId?: string; // ID nhân viên kinh doanh phụ trách
  salesRepName?: string;
  deliveryPoint?: DeliveryPoint | Record<string, unknown>;
  deliveryDate?: string; // Ngày giao hàng mong muốn (YYYY-MM-DD)
  lines: OrderLine[];
  items?: OrderItem[]; // Alias danh sách hàng
  subtotal: number; // Tổng tiền hàng trước chiết khấu
  totalDiscount: number; // Tổng chiết khấu
  grandTotal: number; // Tổng phải thu = subtotal - totalDiscount
  note?: string;
  warningNote?: string; // Ghi chú cảnh báo công nợ / tồn kho (SN-41 / SN-39)
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  priceListId?: string; // Bảng giá áp dụng
  isCustomerLocked?: boolean;
  warningMessage?: string;
  requiresApproval?: boolean;
  approvalReasons?: string[];
  isCreditLimitExceeded?: boolean; // Cờ vượt hạn mức công nợ (SN-41)
  creditLimitExceededAmount?: number; // Số tiền vượt hạn mức (VND)
  createdAt?: string;
  updatedAt?: string;
}

/** Payload tạo đơn hàng mới */
export interface CreateOrderPayload {
  customerId: string;
  customerCode?: string;
  customerName?: string;
  customerGroup?: string;
  salesRepId?: string;
  salesRepName?: string;
  deliveryPoint?: Partial<DeliveryPoint> | Record<string, unknown>;
  deliveryDate?: string;
  lines: Omit<OrderLine, 'id' | 'lineTotal' | 'baseQuantity'>[];
  items?: Omit<OrderLine, 'id' | 'lineTotal' | 'baseQuantity'>[];
  note?: string;
  warningNote?: string;
  priceListId?: string;
  status?: OrderStatus;
  isCreditLimitExceeded?: boolean;
  creditLimitExceededAmount?: number;
}

/** Payload cập nhật đơn hàng */
export type UpdateOrderPayload = Partial<CreateOrderPayload> & {
  status?: OrderStatus;
};

/** Kết quả phân trang đơn hàng */
export interface PaginatedOrdersResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Params tìm kiếm đơn hàng */
export interface OrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus | 'ALL';
  customerId?: string;
  salesRepId?: string;
  fromDate?: string;
  toDate?: string;
}

/** Thông tin khách hàng đại lý (dùng trong form tạo đơn) */
export interface CustomerOption {
  id: string;
  code: string;
  name: string;
  group: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  currentDebt?: number;
  status?: string;
  lockReason?: string;
  lockedAt?: string;
  lockedBy?: string;
  maxDebtDays?: number;
  overdueAmount?: number;
  overdueDays?: number;
  deliveryPoints?: DeliveryPoint[];
}

/** Trạng thái công nợ thời gian thực của đại lý (Task SN-41) */
export interface CustomerDebtStatus {
  customerId: string;
  customerCode: string;
  customerName: string;
  creditLimit: number;
  currentDebt: number;
  availableLimit: number;
  maxDebtDays: number;
  overdueAmount: number;
  overdueDays: number;
  canCreateOrder: boolean;
  blockReason?: string;
  warningMessage?: string;
}
