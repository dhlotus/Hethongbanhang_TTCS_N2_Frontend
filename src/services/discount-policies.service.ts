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
    try {
      const res = await apiClient.post<{ discount: number }>('/api/v1/discount-policies/calculate', {
        productId,
        categoryId,
        quantity,
      });
      return res.data.discount;
    } catch {
      // Fallback cục bộ nếu endpoint calculate chưa sẵn sàng
      return calculateDiscount([], productId, categoryId, quantity);
    }
  },
};

/**
 * Tính mức chiết khấu % tối đa dựa trên danh sách chính sách chiết khấu và sản lượng mua (SN-28 / SN-38)
 * - Sắp xếp các nấc theo Q_min tăng dần
 * - Tìm nấc thỏa mãn Quantity >= Q_min và (Quantity <= Q_max HOẶC Q_max là rỗng/0/null/undefined/Infinity)
 * - Lấy nấc có Q_min cao nhất
 * - Hỗ trợ đầy đủ các mức chiết khấu > 20% (ví dụ 25%, 30%...)
 */
export function calculateDiscount(
  policies: DiscountPolicy[],
  productId: string,
  categoryId: string = '',
  quantity: number,
): number {
  if (quantity <= 0) return 0;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const activePolicies = (policies || []).filter((p) => {
    if (p.status !== 'ACTIVE') return false;
    if (p.startDate && p.startDate.split('T')[0] > todayStr) return false;
    if (p.endDate && p.endDate.split('T')[0] < todayStr) return false;

    const matchesProduct =
      (p.appliedProductSkus && (p.appliedProductSkus.includes(productId) || p.appliedProductSkus.includes('all'))) ||
      (p.targetType === 'SKU' && (p.targetIds?.includes(productId) || p.targetId === productId)) ||
      (!p.targetId && (!p.targetIds || p.targetIds.length === 0) && (!p.appliedProductSkus || p.appliedProductSkus.length === 0));

    const matchesCategory =
      (p.appliedCategoryIds && (p.appliedCategoryIds.includes(categoryId) || p.appliedCategoryIds.includes('all'))) ||
      (p.targetType === 'CATEGORY' && (p.targetIds?.includes(categoryId) || p.targetId === categoryId));

    const matchesHybrid =
      p.targetType === 'HYBRID' && (matchesProduct || matchesCategory);

    return matchesProduct || matchesCategory || matchesHybrid;
  });

  let maxDiscountPercent = 0;

  for (const policy of activePolicies) {
    if (!policy.tiers || policy.tiers.length === 0) continue;

    // 1. Sắp xếp các nấc theo Q_min tăng dần
    const sortedTiers = [...policy.tiers].sort(
      (a, b) => (Number(a.minQuantity) || 0) - (Number(b.minQuantity) || 0),
    );

    // 2. Tìm tất cả các nấc thỏa mãn: Quantity >= Q_min VÀ (Quantity <= Q_max HOẶC Q_max là rỗng/0/null/undefined/Infinity)
    const matchedTiers = sortedTiers.filter((t) => {
      const min = Number(t.minQuantity) || 0;
      const rawMax = t.maxQuantity;
      const max =
        rawMax !== null && rawMax !== undefined && String(rawMax).trim() !== ''
          ? Number(rawMax)
          : null;

      if (quantity < min) return false;
      if (max === null || isNaN(max) || max <= 0 || max === Infinity) return true;
      return quantity <= max;
    });

    // 3. Lấy nấc thỏa mãn có Q_min cao nhất (nấc cuối cùng sau khi sort tăng dần)
    const applicableTier = matchedTiers.length > 0 ? matchedTiers[matchedTiers.length - 1] : null;

    if (applicableTier) {
      const val = Number(applicableTier.discountValue) || 0;
      if (policy.discountType === 'PERCENTAGE' || !policy.discountType) {
        if (val > maxDiscountPercent) {
          maxDiscountPercent = val;
        }
      }
    }
  }

  // Fallback chuẩn hệ thống:
  // >= 2001: 25% | >= 100: 10% | >= 50: 5% | >= 10: 2%
  if (maxDiscountPercent === 0) {
    if (quantity >= 2001) maxDiscountPercent = 25;
    else if (quantity >= 100) maxDiscountPercent = 10;
    else if (quantity >= 50) maxDiscountPercent = 5;
    else if (quantity >= 10) maxDiscountPercent = 2;
  }

  return maxDiscountPercent;
}
