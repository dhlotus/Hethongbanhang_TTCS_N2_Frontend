export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Thực thể Nhà Cung Cấp (SN-25)
 */
export interface Supplier {
  id: string;
  code: string;
  name: string;
  taxCode?: string;
  tax_code?: string;
  contactName?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  payment_terms?: string;
  status: SupplierStatus;
  notes?: string;
  hasReceipts?: boolean;
  has_receipts?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface SupplierQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SupplierStatus | 'ALL';
}

export interface PaginatedSuppliersResponse {
  data: Supplier[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateSupplierPayload {
  code?: string;
  name: string;
  taxCode?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  status?: SupplierStatus;
  notes?: string;
}

export interface UpdateSupplierPayload extends Partial<CreateSupplierPayload> {}
