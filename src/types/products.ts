export type ProductStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Cấu trúc thông tin Danh mục / Nhóm hàng sản phẩm (Hỗ trợ Cấp 1, Cấp 2)
 */
export interface ProductCategory {
  id: string;
  name: string;
  code: string;
  level: number;
  parentId?: string | null;
  parent_id?: string | null;
  description?: string | null;
  productCount?: number;
  product_count?: number;
  subCategories?: ProductCategory[];
  children?: ProductCategory[];
}

/**
 * Đơn vị tính quy đổi của Sản phẩm (SN-23):
 * Cho phép 1 SKU khai báo nhiều đơn vị: lon, lốc, thùng kèm hệ số quy đổi về đơn vị cơ sở
 */
export interface ProductUnit {
  id?: string;
  unitName: string;
  conversionRate: number; // Hệ số quy đổi về đơn vị cơ sở (e.g. 1 Thùng = 24 Lon -> conversionRate = 24)
  isBaseUnit?: boolean;    // true nếu là đơn vị cơ sở
  barcode?: string;
  price?: number;
  costPrice?: number;
}

/**
 * Thực thể Sản phẩm / SKU chuẩn hóa hệ thống LOHA SALES (SN-139, SN-20 & SN-23)
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryId?: string;
  parentCategory?: string; // Nhóm hàng Cấp 1 (VD: Sữa & Chế phẩm sữa)
  subCategory?: string;    // Nhóm hàng Cấp 2 hoặc Cấp 3 (VD: Sữa bột công thức / Sữa bột cho trẻ em)
  baseUnit: string;        // ĐVT cơ sở (VD: Lon, Chai, Hộp, Túi, Cái...)
  packagingSpec?: string;  // Quy cách đóng gói (VD: 24 lon/thùng, 12 chai/lốc)
  units?: ProductUnit[];   // Danh sách đơn vị tính quy đổi đa cấp (SN-23)
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
  categoryId?: string;
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
  packagingSpec?: string;
  units?: ProductUnit[];
  price: number;
  costPrice?: number;
  stockQuantity?: number;
  status: ProductStatus;
  imageUrl?: string;
  barcode?: string;
  description?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {}

export interface AdjustStockPayload {
  productSku: string;
  quantityChange: number; // Số lượng theo đơn vị gọi hàng (unit)
  unit?: string;          // Đơn vị gọi hàng (lon, lốc, thùng...). Nếu không truyền, mặc định là đơn vị cơ sở
  reason: string;
  referenceCode?: string; // Mã phiếu kho / chứng từ tham chiếu
  warehouseLocation?: string;
}

export interface StockAdjustmentResponse {
  success: boolean;
  message: string;
  sku: string;
  productName?: string;
  inputQuantity?: number;
  inputUnit?: string;
  conversionRate?: number;
  baseQuantityChange?: number;
  baseUnit?: string;
  previousQuantity: number;
  newQuantity: number;
  quantityChange: number;
  reason: string;
  referenceCode?: string;
  adjustedBy: string;
  timestamp: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  transactionType: 'IMPORT' | 'EXPORT' | 'ADJUSTMENT' | 'TRANSFER' | 'ORDER';
  inputQuantity: number;
  inputUnit: string;
  conversionRate: number;     // Snapshot hệ số quy đổi bất biến tại thời điểm phát sinh
  baseQuantityChange: number; // Đã quy về đơn vị cơ sở
  baseUnit: string;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceCode: string;
  warehouse: string;
  performedBy: string;
  createdAt: string;
}

export interface ImportProductItemDto {
  row: number;
  sku: string;
  name: string;
  category: string;
  baseUnit: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  barcode?: string;
  description?: string;
  status: "NEW" | "UPDATE";
  errors: string[];
  isValid: boolean;
}

export interface PreviewImportResult {
  total: number;
  valid: number;
  invalid: number;
  data: ImportProductItemDto[];
}

export interface ConfirmImportResult {
  success: number;
  error: number;
  errorDetails: string[];
}

export interface ProductPriceHistory {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  changedAt: string;
}
