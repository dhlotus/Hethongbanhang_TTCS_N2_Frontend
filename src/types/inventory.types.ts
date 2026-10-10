export interface StockUnit {
  unitName: string;
  conversionRate: number;
  isBaseUnit: boolean;
}

/** Một dòng Sổ tồn theo SKU tại kho (SN-183). */
export interface StockBalance {
  sku: string;
  name: string;
  /** Tồn khả dụng = tồn thực tế - đang giữ cho đơn */
  stockQuantity: number;
  physicalStockQuantity: number;
  reservedQuantity: number;
  baseUnit: string;
  units: StockUnit[];
  warehouse: string;
  warehouseId?: string;
  /** Mức tồn tối thiểu (0 = không cảnh báo) */
  minStockLevel?: number;
  /** stockQuantity <= minStockLevel && minStockLevel > 0 */
  isBelowMinStock?: boolean;
}

export interface LowStockAlert extends StockBalance {
  minStockLevel: number;
  isBelowMinStock: true;
  shortage: number;
}
