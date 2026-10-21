export type StockAdjustmentReason = 'DAMAGED' | 'LOST' | 'EXPIRED' | 'OTHER';
export type StockAdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StockAdjustmentItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  currentStock: number;
  adjustedQuantity: number;
  unitPrice: number;
  lossValue: number;
  reason: StockAdjustmentReason;
  note?: string;
}

export interface StockAdjustment {
  id: string;
  adjustmentCode: string;
  warehouseId: string;
  warehouseName: string;
  reason: StockAdjustmentReason;
  reasonDetail?: string;
  totalLossValue: number;
  status: StockAdjustmentStatus;
  items: StockAdjustmentItem[];
  creatorId: string;
  creatorName: string;
  creatorRole?: string;
  approverId?: string;
  approverName?: string;
  approvedAt?: string;
  rejectReason?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStockAdjustmentItemPayload {
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  currentStock: number;
  adjustedQuantity: number;
  unitPrice: number;
  lossValue: number;
  reason: StockAdjustmentReason;
  note?: string;
}

export interface CreateStockAdjustmentPayload {
  warehouseId?: string;
  warehouseName?: string;
  reason: StockAdjustmentReason;
  reasonDetail?: string;
  totalLossValue: number;
  items: CreateStockAdjustmentItemPayload[];
  note?: string;
}

export interface RejectStockAdjustmentPayload {
  rejectReason: string;
}

export interface QueryStockAdjustmentsParams {
  status?: string;
  reason?: string;
  warehouseId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export const REASON_CONFIG: Record<
  StockAdjustmentReason,
  { label: string; badgeClass: string; color: string }
> = {
  DAMAGED: {
    label: 'Hàng hỏng hóc, bể vỡ',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    color: 'amber',
  },
  LOST: {
    label: 'Hàng thất thoát, mất',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    color: 'rose',
  },
  EXPIRED: {
    label: 'Hàng hết hạn sử dụng (huỷ)',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    color: 'purple',
  },
  OTHER: {
    label: 'Lý do khác',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    color: 'slate',
  },
};

export const STATUS_CONFIG: Record<
  StockAdjustmentStatus,
  { label: string; badgeClass: string }
> = {
  PENDING: {
    label: 'Chờ phê duyệt',
    badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  REJECTED: {
    label: 'Đã từ chối',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};
