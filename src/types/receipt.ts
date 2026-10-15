/**
 * Type & Interface Phiếu thu tiền (Receipt / Payment Voucher)
 * Subtask: SN-209 (Parent Story: SN-201 / S7-09 - Sprint 7)
 */

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CHECK';

export type ReceiptStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';

export interface CustomerInfo {
  id: string;
  code: string;
  name: string;
  phone?: string;
  address?: string;
}

export interface CollectorInfo {
  id: string;
  username?: string;
  name: string;
  role?: string;
}

export interface CompanyInfo {
  name: string;
  brand: string;
  address: string;
  phone: string;
  taxCode: string;
  templateCode: string;
}

export interface Receipt {
  id: string;
  code: string;
  receiptCode?: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  amount: number;
  amountInWords?: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceCode?: string;
  notes?: string;
  status: ReceiptStatus;
  collectorId: string;
  collectorName: string;
  collectorUsername?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Dữ liệu in ấn phiếu thu chuẩn hóa (Đảm bảo đủ 5 trường thông tin bắt buộc theo SN-209)
 */
export interface ReceiptPrintData {
  id: string;
  receiptCode: string;
  code: string;
  customerInfo: CustomerInfo;
  amount: number;
  amountFormatted: string;
  amountInWords: string;
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  collectorInfo: CollectorInfo;
  collectorName: string;
  paymentDate: string;
  referenceCode?: string;
  notes?: string;
  status: ReceiptStatus;
  statusLabel: string;
  companyInfo: CompanyInfo;
}
