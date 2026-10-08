/**
 * Kiểu dữ liệu cho Đơn hàng Bán buôn (SN-38 & SN-39)
 */

export type OrderStatus =
  | 'DRAFT'       // Nháp
  | 'PENDING'     // Chờ duyệt
  | 'PENDING_INVENTORY_APPROVAL' // Chờ duyệt do thiếu tồn kho
  | 'APPROVED'    // Đã duyệt
  | 'PROCESSING'  // Đang xử lý / soạn hàng
  | 'SHIPPED'     // Đã xuất kho / giao vận
  | 'DELIVERED'   // Giao thành công
  | 'CANCELLED'   // Đã hủy
  | 'RETURNED';   // Hoàn hàng

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

/** Một dòng hàng trong đơn hàng */
export interface OrderLine {
  id?: string;
  productId: string;
  productSku: string;
  productName: string;
  unit: string;          // Đơn vị gọi hàng (Thùng, Lốc, Lon...)
  baseUnit: string;      // Đơn vị cơ sở
  conversionRate: number; // Hệ số quy đổi sang đơn vị cơ sở
  quantity: number;       // Số lượng theo unit
  baseQuantity: number;   // Số lượng quy về baseUnit = quantity × conversionRate
  unitPrice: number;      // Đơn giá theo unit (sau chiết khấu)
  listPrice: number;      // Giá niêm yết gốc
  discountPercent: number; // Chiết khấu % theo bảng giá
  lineTotal: number;       // Thành tiền = quantity × unitPrice
  stockAvailable?: number; // Tồn khả dụng tham khảo (hiển thị UI)
}

/** Thông tin điểm giao hàng */
export interface DeliveryPoint {
  id?: string;
  name: string;
  address: string;
  phone?: string;
  contactPerson?: string;
}

/** Đơn hàng bán buôn */
export interface Order {
  id?: string;
  orderCode?: string;        // Mã đơn hàng tự sinh
  customerId: string;        // ID Đại lý / Khách hàng B2B
  customerCode: string;
  customerName: string;
  customerGroup?: string;    // Nhóm đại lý (AGENT_LEVEL_1, AGENT_LEVEL_2, RETAIL)
  salesRepId?: string;       // ID nhân viên kinh doanh phụ trách
  salesRepName?: string;
  deliveryPoint?: DeliveryPoint;
  deliveryDate?: string;     // Ngày giao hàng mong muốn (YYYY-MM-DD)
  lines: OrderLine[];
  subtotal: number;          // Tổng tiền hàng trước chiết khấu
  totalDiscount: number;     // Tổng chiết khấu
  grandTotal: number;        // Tổng phải thu = subtotal - totalDiscount
  note?: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  priceListId?: string;      // Bảng giá áp dụng
  createdAt?: string;
  updatedAt?: string;
}

/** Payload tạo đơn hàng mới */
export interface CreateOrderPayload {
  customerId: string;
  deliveryPoint?: Partial<DeliveryPoint>;
  deliveryDate?: string;
  lines: Omit<OrderLine, 'id' | 'lineTotal' | 'baseQuantity'>[];
  note?: string;
  priceListId?: string;
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
  deliveryPoints?: DeliveryPoint[];
}
