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

export const DEFAULT_DISCOUNT_POLICIES: DiscountPolicy[] = [
  {
    id: 'dp-001',
    code: 'DISC-VOL-01',
    name: 'Chiết khấu mua nhiều giảm giá (Lon)',
    targetType: 'SKU',
    targetId: 'prod-001',
    targetIds: ['prod-001', 'LH-MILK-900G'],
    appliedProductSkus: ['prod-001', 'LH-MILK-900G', 'LH-NUT-180ML', 'LH-NEST-70ML', 'LH-CEREAL-500G', 'LH-WATER-500ML', 'LH-COLLAGEN-50ML'],
    discountType: 'PERCENTAGE',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    tiers: [
      { id: 'tier-1', minQuantity: 10, maxQuantity: 49, discountValue: 2 },
      { id: 'tier-2', minQuantity: 50, maxQuantity: 99, discountValue: 5 },
      { id: 'tier-3', minQuantity: 100, maxQuantity: 2000, discountValue: 10 },
      { id: 'tier-4', minQuantity: 2001, maxQuantity: null, discountValue: 25 },
    ],
  },
  {
    id: 'dp-205133',
    code: 'DP-205133',
    name: 'Chiết khấu sản lượng tháng 10 #1',
    targetType: 'SKU',
    targetId: 'LH-NUT-180ML',
    targetIds: ['LH-NUT-180ML'],
    appliedProductSkus: ['LH-NUT-180ML'],
    discountType: 'PERCENTAGE',
    startDate: '2026-10-08',
    endDate: '2027-10-08',
    status: 'ACTIVE',
    tiers: [
      { id: 'tier-nut-1', minQuantity: 1, maxQuantity: 10, discountValue: 0 },
      { id: 'tier-nut-2', minQuantity: 11, maxQuantity: 100, discountValue: 2 },
      { id: 'tier-nut-3', minQuantity: 101, maxQuantity: 500, discountValue: 5 },
    ],
  },
];

export const discountPoliciesService = {
  async getPolicies(): Promise<DiscountPolicy[]> {
    try {
      const res = await apiClient.get<DiscountPolicy[]>('/api/v1/discount-policies');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback cục bộ
    }
    return DEFAULT_DISCOUNT_POLICIES;
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

  async calculateDiscount(
    productId: string,
    categoryId: string,
    quantity: number
  ): Promise<number> {
    try {
      const res = await apiClient.post<{ discount: number }>(
        '/api/v1/discount-policies/calculate',
        {
          productId,
          categoryId,
          quantity,
        }
      );
      return res.data.discount;
    } catch {
      // Fallback cục bộ nếu endpoint calculate chưa sẵn sàng
      return calculateDiscount(DEFAULT_DISCOUNT_POLICIES, productId, categoryId, quantity);
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
  quantity: number
): number {
  if (quantity <= 0) return 0;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const activePolicies = (policies || []).filter((p) => {
    if (p.status !== 'ACTIVE') return false;
    if (p.startDate && p.startDate.split('T')[0] > todayStr) return false;
    if (p.endDate && p.endDate.split('T')[0] < todayStr) return false;

    const matchesProduct =
      (p.appliedProductSkus &&
        (p.appliedProductSkus.includes(productId) || p.appliedProductSkus.includes('all'))) ||
      (p.targetType === 'SKU' && (p.targetIds?.includes(productId) || p.targetId === productId)) ||
      (!p.targetId &&
        (!p.targetIds || p.targetIds.length === 0) &&
        (!p.appliedProductSkus || p.appliedProductSkus.length === 0));

    const matchesCategory =
      (p.appliedCategoryIds &&
        (p.appliedCategoryIds.includes(categoryId) || p.appliedCategoryIds.includes('all'))) ||
      (p.targetType === 'CATEGORY' &&
        (p.targetIds?.includes(categoryId) || p.targetId === categoryId));

    const matchesHybrid = p.targetType === 'HYBRID' && (matchesProduct || matchesCategory);

    return matchesProduct || matchesCategory || matchesHybrid;
  });

  let maxDiscountPercent = 0;

  for (const policy of activePolicies) {
    if (!policy.tiers || policy.tiers.length === 0) continue;

    // 1. Sắp xếp các nấc theo Q_min tăng dần
    const sortedTiers = [...policy.tiers].sort(
      (a, b) => (Number(a.minQuantity) || 0) - (Number(b.minQuantity) || 0)
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

export interface ApplicablePolicyInfo {
  policy: DiscountPolicy | null;
  currentTier: DiscountTier | null;
  discountPercent: number;
  nextTier: DiscountTier | null;
  quantityNeededForNext: number;
}

/**
 * Tìm chính sách chiết khấu và nấc chiết khấu tương ứng với số lượng mua, kèm thông tin nấc tiếp theo để gợi ý
 */
export function getApplicablePolicyInfo(
  policies: DiscountPolicy[],
  productId: string,
  categoryId: string = '',
  quantity: number
): ApplicablePolicyInfo {
  if (quantity <= 0) {
    return {
      policy: null,
      currentTier: null,
      discountPercent: 0,
      nextTier: null,
      quantityNeededForNext: 0,
    };
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const activePolicies = (policies || []).filter((p) => {
    if (p.status !== 'ACTIVE') return false;
    if (p.startDate && p.startDate.split('T')[0] > todayStr) return false;
    if (p.endDate && p.endDate.split('T')[0] < todayStr) return false;

    const matchesProduct =
      (p.appliedProductSkus &&
        (p.appliedProductSkus.includes(productId) ||
          p.appliedProductSkus.includes(productId.toUpperCase()) ||
          p.appliedProductSkus.includes('all'))) ||
      (p.targetType === 'SKU' && (p.targetIds?.includes(productId) || p.targetId === productId)) ||
      (!p.targetId &&
        (!p.targetIds || p.targetIds.length === 0) &&
        (!p.appliedProductSkus || p.appliedProductSkus.length === 0));

    const matchesCategory =
      (p.appliedCategoryIds &&
        (p.appliedCategoryIds.includes(categoryId) || p.appliedCategoryIds.includes('all'))) ||
      (p.targetType === 'CATEGORY' &&
        (p.targetIds?.includes(categoryId) || p.targetId === categoryId));

    const matchesHybrid = p.targetType === 'HYBRID' && (matchesProduct || matchesCategory);

    return matchesProduct || matchesCategory || matchesHybrid;
  });

  for (const policy of activePolicies) {
    if (!policy.tiers || policy.tiers.length === 0) continue;

    const sortedTiers = [...policy.tiers].sort(
      (a, b) => (Number(a.minQuantity) || 0) - (Number(b.minQuantity) || 0)
    );

    let matchedTier: DiscountTier | null = null;
    let nextTier: DiscountTier | null = null;

    for (let i = 0; i < sortedTiers.length; i++) {
      const t = sortedTiers[i];
      const min = Number(t.minQuantity) || 0;
      const rawMax = t.maxQuantity;
      const max =
        rawMax !== null && rawMax !== undefined && String(rawMax).trim() !== ''
          ? Number(rawMax)
          : null;

      const isCurrent =
        quantity >= min && (max === null || isNaN(max) || max <= 0 || max === Infinity || quantity <= max);
      if (isCurrent) {
        matchedTier = t;
        if (i + 1 < sortedTiers.length) {
          nextTier = sortedTiers[i + 1];
        }
        break;
      }
    }

    if (!matchedTier && sortedTiers.length > 0 && quantity < Number(sortedTiers[0].minQuantity)) {
      return {
        policy,
        currentTier: null,
        discountPercent: 0,
        nextTier: sortedTiers[0],
        quantityNeededForNext: Math.max(0, Number(sortedTiers[0].minQuantity) - quantity),
      };
    }

    if (matchedTier) {
      const val = Number(matchedTier.discountValue) || 0;
      const needed = nextTier ? Math.max(0, Number(nextTier.minQuantity) - quantity) : 0;
      return {
        policy,
        currentTier: matchedTier,
        discountPercent: val,
        nextTier,
        quantityNeededForNext: needed,
      };
    }
  }

  // Fallback nếu không có policy cụ thể nhưng có bậc sản lượng chuẩn
  const fallbackPercent = calculateDiscount(policies, productId, categoryId, quantity);
  return {
    policy: activePolicies[0] || null,
    currentTier: null,
    discountPercent: fallbackPercent,
    nextTier: null,
    quantityNeededForNext: 0,
  };
}
