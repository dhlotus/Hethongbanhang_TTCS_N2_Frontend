export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CHECK';

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  invoiceCode: string;
  amount: number;
  previousRemaining: number;
  newRemaining: number;
  allocatedAt: string;
}

export interface Payment {
  id: string;
  code: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  collectorId: string;
  collectorName: string;
  collectorUsername?: string;
  note?: string;
  receiptId?: string;
  receiptCode?: string;
  allocations: PaymentAllocation[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentPayload {
  customerId: string;
  customerCode?: string;
  customerName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  collectorId?: string;
  collectorName?: string;
  note?: string;
  invoiceIds?: string[];
  autoOffsetOldest?: boolean;
}

export interface PaginatedPaymentsResponse {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
