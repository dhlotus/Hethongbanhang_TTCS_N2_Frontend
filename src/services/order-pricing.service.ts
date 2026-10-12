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

  async calculateDiscount(
    product: Pick<Product, 'id' | 'sku'> & { categoryId?: string; category?: string },
    baseQuantity: number,
  ): Promise<number> {
    const categoryId = product.categoryId || product.category || '';
    try {
      const response = await apiClient.post<{ discount: number }>(
        '/discount-policies/calculate',
        {
          productId: product.id,
          productSku: product.sku,
          categoryId,
          quantity: baseQuantity,
        },
      );
      return response.data.discount;
    } catch {
      try {
        const response2 = await apiClient.post<{ discount: number }>(
          '/api/v1/discount-policies/calculate',
          {
            productId: product.id,
            productSku: product.sku,
            categoryId,
            quantity: baseQuantity,
          },
        );
        return response2.data.discount;
      } catch (error: unknown) {
        // Fallback: Quét danh sách chính sách từ API (hoặc cache), lọc chỉ các mã ACTIVE, so sánh tìm mức ưu đãi tốt nhất
        try {
          const { discountPoliciesService, calculateDiscount: localCalc } = await import(
            './discount-policies.service'
          );
          const policies = await discountPoliciesService.getPolicies();
          return localCalc(policies, product.sku || product.id, categoryId, baseQuantity, product.sku);
        } catch {
          throw new Error(getApiErrorMessage(error) || 'Không thể tính chiết khấu từ hệ thống');
        }
      }
    }
  },
};
