import { apiClient } from './api';
import type { CustomerGroupType, PriceList } from '../types/price-list';
import type { Product } from '../types/products';

const getApiErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
  const message = response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message;
};

export interface CalculatedPricingResult {
  listPrice: number;
  unitPrice: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE';
  discountRawValue: number;
  discountPercent: number; // Tối đa 100%
  discountAmountPerUnit: number;
  subtotal: number;
  totalDiscount: number;
  finalAmount: number;
  policyId?: string;
  policyCode?: string;
  policyName?: string;
  displayText: string;
}

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

  /**
   * Tính giá & chiết khấu hợp nhất qua Backend Discount Engine (Single Source of Truth)
   */
  async calculatePricing(
    product: Pick<Product, 'id' | 'sku'> & { name?: string; categoryId?: string; category?: string },
    baseQuantity: number,
    listPrice?: number,
    agencyId?: string,
  ): Promise<CalculatedPricingResult> {
    const categoryId = product.categoryId || product.category || '';
    const productName = (product as { name?: string }).name;
    const safeListPrice = Math.max(0, Number(listPrice) || 0);
    const qty = Math.max(1, Number(baseQuantity) || 1);

    const fallbackLocal = async (): Promise<CalculatedPricingResult> => {
      try {
        const { discountPoliciesService, getApplicablePolicyInfo } = await import(
          './discount-policies.service'
        );
        const policies = await discountPoliciesService.getPolicies();
        const info = getApplicablePolicyInfo(
          policies,
          product.sku || product.id,
          categoryId,
          qty,
          product.sku,
          productName,
          safeListPrice,
        );

        const discountAmount = safeListPrice > 0 ? Math.min(safeListPrice, info.discountAmountPerUnit) : 0;
        const unitPrice = Math.max(0, safeListPrice - discountAmount);

        return {
          listPrice: safeListPrice,
          unitPrice,
          discountType: info.discountType,
          discountRawValue: info.discountRawValue,
          discountPercent: info.discountPercent,
          discountAmountPerUnit: discountAmount,
          subtotal: safeListPrice * qty,
          totalDiscount: discountAmount * qty,
          finalAmount: unitPrice * qty,
          policyId: info.policy?.id,
          policyCode: info.policy?.code,
          policyName: info.policy?.name,
          displayText: info.displayText,
        };
      } catch {
        return {
          listPrice: safeListPrice,
          unitPrice: safeListPrice,
          discountType: 'NONE',
          discountRawValue: 0,
          discountPercent: 0,
          discountAmountPerUnit: 0,
          subtotal: safeListPrice * qty,
          totalDiscount: 0,
          finalAmount: safeListPrice * qty,
          displayText: '0%',
        };
      }
    };

    try {
      const response = await apiClient.post<CalculatedPricingResult & { discount?: number }>(
        '/discount-policies/calculate',
        {
          productId: product.id,
          productSku: product.sku,
          productName,
          categoryId,
          quantity: qty,
          listPrice: safeListPrice,
          agencyId,
        },
      );
      if (response.data && response.data.unitPrice !== undefined) {
        return response.data;
      }
      return await fallbackLocal();
    } catch {
      try {
        const response2 = await apiClient.post<CalculatedPricingResult & { discount?: number }>(
          '/api/v1/discount-policies/calculate',
          {
            productId: product.id,
            productSku: product.sku,
            productName,
            categoryId,
            quantity: qty,
            listPrice: safeListPrice,
            agencyId,
          },
        );
        if (response2.data && response2.data.unitPrice !== undefined) {
          return response2.data;
        }
        return await fallbackLocal();
      } catch {
        return await fallbackLocal();
      }
    }
  },

  async calculateDiscount(
    product: Pick<Product, 'id' | 'sku'> & { name?: string; categoryId?: string; category?: string },
    baseQuantity: number,
    listPrice?: number,
  ): Promise<number> {
    const res = await this.calculatePricing(product, baseQuantity, listPrice);
    return res.discountPercent;
  },
};
