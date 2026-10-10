export type ProductStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Cấu trúc thông tin Danh mục / Nhóm hàng sản phẩm (Hỗ trợ Cấp 1, Cấp 2)
 */
export interface ProductCategory {
  id: string;
  name: string;
  code: string;
  level: 1 | 2;
  parentId?: string;
  subCategories?: ProductCategory[];
}

/**
 * Thực thể Sản phẩm / SKU chuẩn hóa hệ thống LOHA SALES (SN-139 & SN-20)
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryId?: string;
  parentCategory?: string; // Nhóm hàng Cấp 1 (VD: Sữa & Chế phẩm sữa)
  subCategory?: string;    // Nhóm hàng Cấp 2 (VD: Sữa hạt dinh dưỡng)
  baseUnit: string;        // ĐVT cơ sở (VD: Lon, Chai, Hộp, Túi, Cái...)
  packagingSpec?: string;  // Quy cách đóng gói (VD: 24 lon/thùng, 12 chai/lốc)
  price: number;           // Giá bán niêm yết
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
  status: ProductStatus;
  imageUrl?: string;
  barcode?: string;
  description?: string;
  hasTransactions?: boolean; // Khóa xóa nếu sản phẩm đã phát sinh giao dịch kho hoặc đơn hàng
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  parentCategory?: string;
  subCategory?: string;
  status?: ProductStatus | 'ALL';
}

export interface PaginatedProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  category: string;
  categoryId?: string;
  parentCategory?: string;
  subCategory?: string;
  baseUnit: string;
  packagingSpec: string;
  price: number;
  costPrice?: number;
  status: ProductStatus;
  imageUrl?: string;
  barcode?: string;
  description?: string;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export type StockStatusType = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface StockOverviewItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  parentCategory: string;
  subCategory?: string;
  physicalStock: number;   // 1. Tồn thực tế
  reservedStock: number;   // 2. Tồn tạm giữ
  availableStock: number;  // 3. Tồn khả thi (Có thể bán = Tồn thực tế - Tồn tạm giữ)
  stockQuantity: number;
  baseUnit: string;
  units: ProductUnit[];
  warehouse: string;
  warehouseId?: string;
  status: StockStatusType;
  imageUrl?: string;
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
