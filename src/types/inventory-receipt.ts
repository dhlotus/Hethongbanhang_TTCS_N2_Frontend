export type GoodsReceiptStatus = 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'CANCELLED';
export type ReceiptType = 'PURCHASE_RECEIPT' | 'TRANSFER_RECEIPT' | 'RETURN_RECEIPT' | 'ADJUSTMENT_RECEIPT';

export interface GoodsReceiptItem {
  id: string;
  receiptId: string;
  productId: string;
  unitId: string;
  packageQuantity: number;
  conversionFactor: number;
  baseQuantity: number;
  unitCost: number;
  totalCost: number;
  batchNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
  locationId?: string;
  notes?: string;
  
  productName?: string;
  productCode?: string;
  unitName?: string;
}

export interface GoodsReceipt {
  id: string;
  code: string;
  warehouseId: string;
  supplierId?: string;
  receiptType: ReceiptType;
  referenceDocument?: string;
  documentUrl?: string;
  status: GoodsReceiptStatus;
  totalCost: number;
  receivedBy?: string;
  receivedAt?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  
  warehouseName?: string;
  supplierName?: string;
  createdByName?: string;
  items?: GoodsReceiptItem[];
}

export interface CreateGoodsReceiptItemDto {
  productId: string;
  unitId: string;
  packageQuantity: number;
  conversionFactor: number;
  unitCost?: number;
  batchNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface CreateGoodsReceiptDto {
  warehouseId: string;
  supplierId?: string;
  referenceDocument?: string;
  receiptDate?: string;
  notes?: string;
  items: CreateGoodsReceiptItemDto[];
}
