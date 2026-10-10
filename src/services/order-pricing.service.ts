import { apiClient } from './api';
import type { CustomerGroupType, PriceList } from '../types/price-list';
import type { Product } from '../types/products';

const getApiErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
  const message = response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message;
};

export const orderPricingService = {
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
          (item) => item.startDate <= currentDate && (!item.endDate || item.endDate >= currentDate),
        )
        .sort((first, second) => second.startDate.localeCompare(first.startDate))[0];

      if (!priceList) throw new Error(`Không có bảng giá hiệu lực cho nhóm ${customerGroup}`);
      return priceList;
    } catch (error: unknown) {
      throw new Error(
        getApiErrorMessage(error) ||
          (error instanceof Error ? error.message : 'Không thể tải bảng giá hiệu lực'),
      );
    }
  },

  async calculateDiscount(product: Pick<Product, 'id' | 'sku'>, baseQuantity: number): Promise<number> {
    try {
      const response = await apiClient.post<{ discount: number }>(
        '/api/v1/discount-policies/calculate',
        {
          productId: product.id,
          productSku: product.sku,
          categoryId: '',
          quantity: baseQuantity,
        },
      );
      return response.data.discount;
    } catch (error: unknown) {
      throw new Error(getApiErrorMessage(error) || 'Không thể tính chiết khấu từ hệ thống');
    }
  },
};
