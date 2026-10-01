export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  baseUnit: string;
  price: number;
  /**
   * Giá vốn nhạy cảm (Cost Price - SN-10):
   * Chỉ tồn tại khi đăng nhập bằng vai trò ADMIN hoặc SALES_MANAGER.
   * Máy chủ backend tự động lọc bỏ đối với SALES_REP, WAREHOUSE_KEEPER, CUSTOMER.
   */
  costPrice?: number;
  /**
   * Biên lợi nhuận nhạy cảm (Margin % - SN-10):
   * Chỉ tồn tại khi đăng nhập bằng vai trò ADMIN hoặc SALES_MANAGER.
   */
  margin?: number;
  stockQuantity: number;
  status: 'ACTIVE' | 'INACTIVE';
  barcode?: string;
  description?: string;
}

export interface AdjustStockPayload {
  productSku: string;
  quantityChange: number;
  reason: string;
  warehouseLocation?: string;
}

export interface StockAdjustmentResponse {
  success: boolean;
  message: string;
  sku: string;
  previousQuantity: number;
  newQuantity: number;
  quantityChange: number;
  reason: string;
  adjustedBy: string;
  timestamp: string;
}
