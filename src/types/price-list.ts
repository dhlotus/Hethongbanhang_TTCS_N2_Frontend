export type CustomerGroupType = 'AGENT_LEVEL_1' | 'AGENT_LEVEL_2' | 'RETAIL';

export type PriceListStatusType = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface PriceListItem {
  id: string;
  priceListId?: string;
  productId: string;
  productCode: string;
  productName: string;
  price: number;
  minPrice: number;
  baseUnit?: string;
}

export interface PriceList {
  id: string;
  code: string;
  name: string;
  customerGroup: CustomerGroupType;
  startDate: string;
  endDate: string;
  status: PriceListStatusType;
  version: number;
  parentVersionId: string | null;
  hasOrders: boolean;
  items: PriceListItem[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceListPayload {
  code?: string;
  name: string;
  customerGroup: CustomerGroupType;
  startDate: string;
  endDate: string;
  status?: PriceListStatusType;
  description?: string;
  items?: Omit<PriceListItem, 'id' | 'priceListId'>[];
}

export interface UpdatePriceListPayload extends Partial<CreatePriceListPayload> {}

export interface ClonePriceListPayload {
  code?: string;
  name?: string;
}

export interface GetPriceListsParams {
  page?: number;
  limit?: number;
  search?: string;
  customerGroup?: string;
  status?: string;
}

export interface PaginatedPriceListsResponse {
  data: PriceList[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
