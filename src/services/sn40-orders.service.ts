import { apiClient } from './api';
import type { Order } from '../types/order';
import type { Product, PaginatedProductsResponse } from '../types/products';
import type { PriceList, CustomerGroupType } from '../types/price-list';

export interface Sn40Customer {
  id: string;
  code: string;
  name: string;
  customerGroup: CustomerGroupType;
  status?: string;
  phone?: string;
  address?: string;
  deliveryPoints?: Array<{
    id: string;
    name: string;
    address: string;
    receiverName?: string;
    phone?: string;
    roadNote?: string;
    isDefault?: boolean;
  }>;
}

export interface Sn40OrderLinePayload {
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  baseUnit: string;
  conversionRate: number;
  quantity: number;
  isPriceManuallyEdited: boolean;
  unitPrice?: number;
}

export interface Sn40CreateOrderPayload {
  customerId: string;
  priceListId: string;
  deliveryDate?: string;
  note?: string;
  lines: Sn40OrderLinePayload[];
}

const getApiErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
  const message = response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message;
};

export const sn40OrdersService = {
  async getCustomers(): Promise<Sn40Customer[]> {
    try {
      const response = await apiClient.get<Sn40Customer[]>('/customers');
      return response.data;
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error) || 'Không thể tải danh sách đại lý từ backend');
    }
  },

  async searchProducts(search: string): Promise<Product[]> {
    try {
      const response = await apiClient.get<PaginatedProductsResponse>('/products', {
        params: { search, status: 'ACTIVE', limit: 10, page: 1 },
      });
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error) || 'Không thể tìm sản phẩm từ backend');
    }
  },

  async getEffectivePriceList(customerGroup: CustomerGroupType): Promise<PriceList> {
    try {
      const response = await apiClient.get<{
        data: PriceList[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>('/price-lists', {
        params: { customerGroup, status: 'ACTIVE', page: 1, limit: 100 },
      });
      const currentDate = new Date().toISOString().slice(0, 10);
      const priceList = response.data.data
        .filter(
          (item) =>
            item.startDate <= currentDate &&
            (!item.endDate || item.endDate >= currentDate),
        )
        .sort((first, second) => second.startDate.localeCompare(first.startDate))[0];

      if (!priceList) {
        throw new Error(`Không có bảng giá hiệu lực cho nhóm ${customerGroup}`);
      }
      return priceList;
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error) || (error instanceof Error ? error.message : 'Không thể tải bảng giá'));
    }
  },

  async calculateDiscount(product: Product, baseQuantity: number): Promise<number> {
    try {
      const response = await apiClient.post<{ discount: number }>(
        '/api/v1/discount-policies/calculate',
        {
          productId: product.id,
          productSku: product.sku,
          // Backend order creation currently applies quantity policies with an empty category ID.
          // Keep this preview aligned with the server-side calculation used when saving.
          categoryId: '',
          quantity: baseQuantity,
        },
      );
      return response.data.discount;
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error) || 'Không thể tính chiết khấu từ backend');
    }
  },

  async createOrder(payload: Sn40CreateOrderPayload): Promise<Order> {
    try {
      const response = await apiClient.post<Order>('/orders', payload);
      return response.data;
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error) || 'Không thể tạo đơn hàng qua backend');
    }
  },
};
