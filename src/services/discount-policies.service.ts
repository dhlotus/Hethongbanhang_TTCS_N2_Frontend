import { apiClient } from './api';

export interface DiscountTier {
  id?: string;
  minQuantity: number;
  maxQuantity: number | null;
  discountValue: number;
}

export interface DiscountPolicy {
  id: string;
  code: string;
  name: string;
  targetType: 'SKU' | 'CATEGORY' | 'HYBRID';
  targetId: string;
  targetIds?: string[];
  appliedCategoryIds?: string[];
  appliedProductSkus?: string[];
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'INACTIVE';
  tiers: DiscountTier[];
}

export type CreateDiscountPolicyPayload = Omit<DiscountPolicy, 'id'>;
export type UpdateDiscountPolicyPayload = Partial<CreateDiscountPolicyPayload>;

export const discountPoliciesService = {
  async getPolicies(): Promise<DiscountPolicy[]> {
    const res = await apiClient.get<DiscountPolicy[]>('/api/v1/discount-policies');
    return res.data;
  },

  async createPolicy(payload: CreateDiscountPolicyPayload): Promise<DiscountPolicy> {
    const res = await apiClient.post<DiscountPolicy>('/api/v1/discount-policies', payload);
    return res.data;
  },

  async updatePolicy(id: string, payload: UpdateDiscountPolicyPayload): Promise<DiscountPolicy> {
    const res = await apiClient.patch<DiscountPolicy>(`/api/v1/discount-policies/${id}`, payload);
    return res.data;
  },

  async deletePolicy(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/discount-policies/${id}`);
  },

  async calculateDiscount(productId: string, categoryId: string, quantity: number): Promise<number> {
    const res = await apiClient.post<{ discount: number }>('/api/v1/discount-policies/calculate', {
      productId,
      categoryId,
      quantity,
    });
    return res.data.discount;
  },
};
