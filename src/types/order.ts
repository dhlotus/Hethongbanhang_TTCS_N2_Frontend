/**
 * Kiểu dữ liệu cho Đơn hàng Bán buôn (SN-38, SN-39 & SN-41)
 */

export type OrderStatus =
  | 'DRAFT' // Nháp
  | 'PENDING' // Chờ duyệt
  | 'PENDING_APPROVAL' // Cần phê duyệt (do vượt hạn mức công nợ - SN-41)
  | 'PENDING_INVENTORY_APPROVAL' // Chờ duyệt do thiếu tồn kho
  | 'APPROVED' // Đã duyệt
  | 'REJECTED' // Bị từ chối khi xét duyệt
  | 'RETURNED_FOR_UPDATE' // Trả lại nhân viên kinh doanh để chỉnh sửa
  | 'PROCESSING' // Đang xử lý / soạn hàng
  | 'SHIPPED' // Đã xuất kho / giao vận
  | 'DELIVERED' // Giao thành công
  | 'CANCELLED' // Đã hủy
  | 'RETURNED' // Hoàn hàng
  | 'CLOSED'; // Đã đóng

export type OrderApprovalAction = 'APPROVE' | 'REJECT' | 'RETURN_FOR_UPDATE';

export interface OrderApprovalHistory {
  id: number;
  orderId: string;
  action: OrderApprovalAction;
  comment: string | null;
  approverId: string;
  approverName: string;
  approverRoles: string[];
  createdAt: string;
}

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

/** Một dòng hàng trong đơn hàng */
export interface OrderLine {
  id?: string;
  productId: string;
  productSku: string;
  productName: string;
  categoryId?: string;
  category?: string;
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
  deliveredQuantity?: number; // Số lượng thực tế đã giao (SN-170)
  deliveredBaseQuantity?: number; // Số lượng cơ sở thực tế đã giao
  isShortDelivery?: boolean; // Cờ báo dòng hàng bị giao thiếu
  shortDeliveryReason?: string; // Lý do giao thiếu
  requiresApproval?: boolean;
  availableStock?: number; // Tồn khả dụng (SN-39)
  priceListId?: string;
  assignedSalesRepId?: string;
  createdSource?: string;
  notes?: string;
  baseListPrice?: number;
  unitOptions?: Array<{ unitName: string; conversionRate: number }>;
  isPriceManuallyEdited?: boolean;
  manualPrice?: string;
  pricingLoading?: boolean;
  pricingError?: string;
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
  receiverName?: string;
  roadNote?: string;
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
  assignedSalesRepId?: string;
  createdSource?: string;
  deliveryPoint?: DeliveryPoint;
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
  cancelReason?: string; // Lý do hủy đơn (SN-180, SN-45)
  approverId?: string; // ID người duyệt đơn (SN-180)
  approvedAt?: string; // Thời gian duyệt đơn (SN-180)
  reservedUntil?: string; // Hạn giữ chỗ tồn kho (24h sau duyệt) (SN-180)
  isShortDelivery?: boolean; // Cờ đơn hàng bị giao thiếu (SN-170)
  region?: string; // Khu vực đại lý / đơn hàng (SN-46)
  createdAt?: string;
  updatedAt?: string;
}

export interface PortalOrderItemPayload {
  productId: string;
  quantity: number;
  price: number;
  discountPercent?: number;
  unit?: string;
}

/** Payload tạo đơn hàng mới */
export interface CreateOrderPayload {
  customerId: string;
  customerCode?: string;
  customerName?: string;
  customerGroup?: string;
  salesRepId?: string;
  salesRepName?: string;
  assignedSalesRepId?: string;
  createdSource?: string;
  deliveryPoint?: Partial<DeliveryPoint> | Record<string, unknown>;
  deliveryAddress?: string;
  deliveryDate?: string;
  lines?: Omit<OrderLine, 'id' | 'lineTotal' | 'baseQuantity'>[];
  items?: PortalOrderItemPayload[] | Omit<OrderLine, 'id' | 'lineTotal' | 'baseQuantity'>[];
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
  totalAmount?: number;
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
  assignedUser?: string;
  region?: string;
  fromDate?: string;
  toDate?: string;
  dateType?: 'CREATED' | 'DELIVERY';
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

/** Mặt hàng ngừng kinh doanh khi đặt lại đơn (SN-174) */
export interface DiscontinuedProductItem {
  lineId?: string;
  productSku: string;
  productName: string;
  reason?: string;
}

/** Mặt hàng khả dụng trong bản xem trước đặt lại đơn (SN-174) */
export interface ReorderPreviewItem {
  lineId: string;
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  baseUnit: string;
  conversionRate: number;
  quantity: number;
  oldUnitPrice: number;
  currentUnitPrice: number;
  currentListPrice: number;
  currentDiscountPercent: number;
  isPriceChanged: boolean;
}

/** Dữ liệu xem trước khi đặt lại đơn hàng cũ (SN-174) */
export interface ReorderPreviewResponse {
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerGroup?: string;
  deliveryPoint?: DeliveryPoint;
  availableItems: ReorderPreviewItem[];
  discontinuedItems: DiscontinuedProductItem[];
  warningMessage?: string;
}

/** Payload gửi lên khi đặt lại đơn hàng (SN-174) */
export interface ReorderPayload {
  selectedLineIds?: string[];
  items?: Array<{ productSku: string; quantity: number }>;
  deliveryPoint?: DeliveryPoint;
  deliveryDate?: string;
  note?: string;
}

