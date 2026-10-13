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
    status: 'INACTIVE',
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
    status: 'INACTIVE',
    tiers: [
      { id: 'tier-nut-1', minQuantity: 1, maxQuantity: 10, discountValue: 0 },
      { id: 'tier-nut-2', minQuantity: 11, maxQuantity: 100, discountValue: 2 },
      { id: 'tier-nut-3', minQuantity: 101, maxQuantity: 500, discountValue: 5 },
    ],
  },
  {
    id: 'dp-1791796552805-kd5az',
    code: 'DP-450101',
    name: 'Chiết khấu tháng 11',
    targetType: 'SKU',
    targetId: 'BEVERAGE, CEREAL, NEST, MILK, SUPP, SUPP_COLLAGEN, SUPP_HERB, CEREAL_NUTS, CEREAL_SPROUT, CARBONATED',
    targetIds: ['BEVERAGE', 'CEREAL', 'NEST', 'MILK', 'SUPP', 'SUPP_COLLAGEN', 'SUPP_HERB', 'CEREAL_NUTS', 'CEREAL_SPROUT', 'CARBONATED'],
    appliedProductSkus: ['BEVERAGE', 'CEREAL', 'NEST', 'MILK', 'SUPP', 'SUPP_COLLAGEN', 'SUPP_HERB', 'CEREAL_NUTS', 'CEREAL_SPROUT', 'CARBONATED'],
    discountType: 'PERCENTAGE',
    startDate: '2026-10-12',
    endDate: '2027-10-12',
    status: 'ACTIVE',
    tiers: [
      { id: 'tier-1791796552805-0awco', minQuantity: 10, maxQuantity: 50, discountValue: 2 },
      { id: 'tier-1791796552805-racu4', minQuantity: 51, maxQuantity: 299, discountValue: 4 },
      { id: 'tier-1791796552805-24d2s', minQuantity: 300, maxQuantity: 999, discountValue: 6 },
      { id: 'tier-1791796552805-17u41', minQuantity: 1000, maxQuantity: null, discountValue: 7 },
    ],
  },
];

export const discountPoliciesService = {
  async getPolicies(): Promise<DiscountPolicy[]> {
    try {
      const res = await apiClient.get<DiscountPolicy[]>('/discount-policies');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      try {
        const res2 = await apiClient.get<DiscountPolicy[]>('/api/v1/discount-policies');
        if (res2.data && Array.isArray(res2.data) && res2.data.length > 0) {
          return res2.data;
        }
      } catch {
        // Fallback cục bộ
      }
    }
    return DEFAULT_DISCOUNT_POLICIES;
  },

  async createPolicy(payload: CreateDiscountPolicyPayload): Promise<DiscountPolicy> {
    try {
      const res = await apiClient.post<DiscountPolicy>('/discount-policies', payload);
      return res.data;
    } catch {
      const res2 = await apiClient.post<DiscountPolicy>('/api/v1/discount-policies', payload);
      return res2.data;
    }
  },

  async updatePolicy(id: string, payload: UpdateDiscountPolicyPayload): Promise<DiscountPolicy> {
    try {
      const res = await apiClient.patch<DiscountPolicy>(`/discount-policies/${id}`, payload);
      return res.data;
    } catch {
      const res2 = await apiClient.patch<DiscountPolicy>(`/api/v1/discount-policies/${id}`, payload);
      return res2.data;
    }
  },

  async deletePolicy(id: string): Promise<void> {
    try {
      await apiClient.delete(`/discount-policies/${id}`);
    } catch {
      await apiClient.delete(`/api/v1/discount-policies/${id}`);
    }
  },

  async calculateDiscount(
    productId: string,
    categoryId: string,
    quantity: number,
    productSku?: string
  ): Promise<number> {
    try {
      const res = await apiClient.post<{ discount: number }>(
        '/discount-policies/calculate',
        {
          productId,
          productSku: productSku || productId,
          categoryId,
          quantity,
        }
      );
      return res.data.discount;
    } catch {
      try {
        const res2 = await apiClient.post<{ discount: number }>(
          '/api/v1/discount-policies/calculate',
          {
            productId,
            productSku: productSku || productId,
            categoryId,
            quantity,
          }
        );
        return res2.data.discount;
      } catch {
        // Fallback: Tải danh sách chính sách từ API (hoặc mặc định) và tính toán cục bộ
        const policies = await this.getPolicies();
        return calculateDiscount(policies, productSku || productId, categoryId, quantity);
      }
    }
  },
};

/**
 * Kiểm tra xem sản phẩm có khớp với phạm vi áp dụng của chính sách hay không
 */
export function isProductMatchingPolicy(
  policy: DiscountPolicy,
  productId: string,
  categoryId?: string,
  productSku?: string,
  productName?: string
): boolean {
  const targets = new Set<string>();
  (policy.targetIds || []).forEach((t) => targets.add(t.trim().toUpperCase()));
  if (policy.targetId) {
    policy.targetId.split(',').forEach((t) => targets.add(t.trim().toUpperCase()));
  }
  (policy.appliedCategoryIds || []).forEach((t) => targets.add(t.trim().toUpperCase()));
  (policy.appliedProductSkus || []).forEach((t) => targets.add(t.trim().toUpperCase()));

  if (targets.has('ALL') || targets.size === 0) {
    return true;
  }

  const productKeys = new Set<string>();
  if (productId) productKeys.add(productId.trim().toUpperCase());
  if (productSku) productKeys.add(productSku.trim().toUpperCase());
  if (categoryId) productKeys.add(categoryId.trim().toUpperCase());
  if (productName) productKeys.add(productName.trim().toUpperCase());

  // Chuỗi nhận diện đa chiều: SKU + ID + Category + Name
  const searchStr = `${productSku || ''} ${productId || ''} ${categoryId || ''} ${productName || ''}`.toUpperCase();

  if (searchStr.includes('MILK') || searchStr.includes('SỮA')) {
    productKeys.add('MILK');
    productKeys.add('MILK_POWDER');
    productKeys.add('CAT-MILK-POWDER');
    productKeys.add('MILK_READY');
    productKeys.add('MILK_NUT');
    productKeys.add('CAT-MILK-NUT');
  }
  if (
    searchStr.includes('NUT') ||
    searchStr.includes('HẠT') ||
    searchStr.includes('ÓC CHÓ') ||
    searchStr.includes('HẠNH NHÂN') ||
    searchStr.includes('MACCA') ||
    searchStr.includes('ĐẬU')
  ) {
    productKeys.add('MILK_NUT');
    productKeys.add('MILK');
    productKeys.add('CEREAL_NUTS');
    productKeys.add('CEREAL');
    productKeys.add('CAT-MILK-NUT');
    productKeys.add('CAT-CEREAL-NUTS');
  }
  if (searchStr.includes('NEST') || searchStr.includes('YẾN')) {
    productKeys.add('NEST');
    productKeys.add('NEST_READY');
    productKeys.add('NEST_PURE');
    productKeys.add('CAT-NEST-READY');
    productKeys.add('CAT-NEST-PURE');
  }
  if (searchStr.includes('CEREAL') || searchStr.includes('NGŨ CỐC')) {
    productKeys.add('CEREAL');
    productKeys.add('CEREAL_SPROUT');
    productKeys.add('CEREAL_NUTS');
    productKeys.add('CAT-CEREAL-SPROUT');
    productKeys.add('CAT-CEREAL-NUTS');
  }
  if (
    searchStr.includes('COLLAGEN') ||
    searchStr.includes('SUPP') ||
    searchStr.includes('ĐÔNG TRÙNG') ||
    searchStr.includes('THỰC PHẨM CHỨC NĂNG')
  ) {
    productKeys.add('SUPP');
    productKeys.add('SUPP_COLLAGEN');
    productKeys.add('SUPP_HERB');
    productKeys.add('CAT-SUPP-COLLAGEN');
  }
  if (
    searchStr.includes('TEA') ||
    searchStr.includes('WATER') ||
    searchStr.includes('COLA') ||
    searchStr.includes('ORANGE') ||
    searchStr.includes('BEVERAGE') ||
    searchStr.includes('COFFEE') ||
    searchStr.includes('TRÀ') ||
    searchStr.includes('KHOÁNG') ||
    searchStr.includes('NƯỚC') ||
    searchStr.includes('NƯỚC GIẢI KHÁT')
  ) {
    productKeys.add('BEVERAGE');
    productKeys.add('CARBONATED');
    productKeys.add('WATER');
    productKeys.add('TEA_JUICE');
    productKeys.add('COLA_CAN');
    productKeys.add('ORANGE_CAN');
    productKeys.add('PURE_BOTTLE');
    productKeys.add('GREEN_TEA');
  }

  for (const key of productKeys) {
    if (targets.has(key)) return true;
  }

  // Khớp từng từ khóa trong targets nếu xuất hiện trong searchStr (đặc biệt hữu ích với mã ngành)
  for (const target of targets) {
    if (target && target.length >= 3 && searchStr.includes(target)) {
      return true;
    }
  }

  return false;
}

/**
 * Tính mức chiết khấu % tối đa dựa trên danh sách chính sách chiết khấu và sản lượng mua (SN-28 / SN-38)
 * - CHỈ XÉT các chính sách ĐANG HIỆU LỰC (status === 'ACTIVE') và trong thời gian hiệu lực
 * - Bỏ qua hoàn toàn các mã không hiệu lực (INACTIVE)
 * - Nếu nhiều chính sách cùng thỏa mãn sản phẩm, so sánh và chọn chính sách có mức ưu đãi cao nhất (max)
 */
export function calculateDiscount(
  policies: DiscountPolicy[],
  productId: string,
  categoryId: string = '',
  quantity: number,
  productSku?: string,
  productName?: string,
  listPrice?: number
): number {
  const info = getApplicablePolicyInfo(
    policies,
    productId,
    categoryId,
    quantity,
    productSku,
    productName,
    listPrice
  );
  return info.discountPercent;
}

export interface ApplicablePolicyInfo {
  policy: DiscountPolicy | null;
  currentTier: DiscountTier | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE';
  discountRawValue: number;
  discountPercent: number; // Chuẩn hóa từ 0 đến 100%
  discountAmountPerUnit: number; // Tiền giảm trên 1 đơn vị, tối đa bằng listPrice
  nextTier: DiscountTier | null;
  quantityNeededForNext: number;
  displayText: string;
}

/**
 * Tìm chính sách chiết khấu và nấc chiết khấu tương ứng với số lượng mua, kèm thông tin nấc tiếp theo để gợi ý
 * - Lọc chỉ các chính sách ACTIVE
 * - Xử lý dứt điểm 2 loại chiết khấu: FIXED_AMOUNT (Tiền mặt) và PERCENTAGE (Phần trăm)
 * - Chống âm giá và chuẩn hóa % không vượt quá 100%
 */
export function getApplicablePolicyInfo(
  policies: DiscountPolicy[],
  productId: string,
  categoryId: string = '',
  quantity: number,
  productSku?: string,
  productName?: string,
  listPrice?: number
): ApplicablePolicyInfo {
  const safeListPrice = Math.max(0, Number(listPrice) || 0);

  if (quantity <= 0) {
    return {
      policy: null,
      currentTier: null,
      discountType: 'NONE',
      discountRawValue: 0,
      discountPercent: 0,
      discountAmountPerUnit: 0,
      nextTier: null,
      quantityNeededForNext: 0,
      displayText: '0%',
    };
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const activePolicies = (policies || []).filter((p) => {
    if (p.status !== 'ACTIVE') return false;
    if (p.startDate && p.startDate.split('T')[0] > todayStr) return false;
    if (p.endDate && p.endDate.split('T')[0] < todayStr) return false;

    return isProductMatchingPolicy(p, productId, categoryId, productSku, productName);
  });

  let bestResult: ApplicablePolicyInfo = {
    policy: null,
    currentTier: null,
    discountType: 'NONE',
    discountRawValue: 0,
    discountPercent: 0,
    discountAmountPerUnit: 0,
    nextTier: null,
    quantityNeededForNext: 0,
    displayText: '0%',
  };

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

    if (matchedTier) {
      const rawVal = Math.max(0, Number(matchedTier.discountValue) || 0);
      const isFixed = policy.discountType === 'FIXED_AMOUNT';
      const needed = nextTier ? Math.max(0, Number(nextTier.minQuantity) - quantity) : 0;

      let discountAmount = 0;
      let percent = 0;
      let display = '';

      if (isFixed) {
        // FIXED_AMOUNT: Số tiền giảm tối đa là Giá gốc của sản phẩm
        discountAmount = safeListPrice > 0 ? Math.min(safeListPrice, rawVal) : rawVal;
        percent = safeListPrice > 0 ? Math.min(100, Math.round((discountAmount / safeListPrice) * 100)) : 0;
        display = `Giảm ${rawVal.toLocaleString('vi-VN')} đ`;
      } else {
        // PERCENTAGE: Tối đa 100%
        percent = Math.min(100, rawVal);
        discountAmount = safeListPrice > 0 ? Math.round((safeListPrice * percent) / 100) : 0;
        display = `Giảm ${percent}%`;
      }

      // So sánh chọn chính sách có mức giảm tiền mặt lớn nhất
      const currentComparison = safeListPrice > 0 ? discountAmount : (isFixed ? rawVal : (percent / 100) * 100000);
      const bestComparison =
        safeListPrice > 0
          ? bestResult.discountAmountPerUnit
          : bestResult.discountType === 'FIXED_AMOUNT'
          ? bestResult.discountRawValue
          : (bestResult.discountPercent / 100) * 100000;

      if (currentComparison > bestComparison || !bestResult.policy) {
        bestResult = {
          policy,
          currentTier: matchedTier,
          discountType: isFixed ? 'FIXED_AMOUNT' : 'PERCENTAGE',
          discountRawValue: rawVal,
          discountPercent: percent,
          discountAmountPerUnit: discountAmount,
          nextTier,
          quantityNeededForNext: needed,
          displayText: display,
        };
      }
    } else if (sortedTiers.length > 0 && quantity < Number(sortedTiers[0].minQuantity)) {
      if (!bestResult.policy && !bestResult.nextTier) {
        const firstTier = sortedTiers[0];
        const isFixed = policy.discountType === 'FIXED_AMOUNT';
        const rawVal = Number(firstTier.discountValue) || 0;
        bestResult = {
          policy,
          currentTier: null,
          discountType: isFixed ? 'FIXED_AMOUNT' : 'PERCENTAGE',
          discountRawValue: 0,
          discountPercent: 0,
          discountAmountPerUnit: 0,
          nextTier: firstTier,
          quantityNeededForNext: Math.max(0, Number(firstTier.minQuantity) - quantity),
          displayText: isFixed ? `Giảm ${rawVal.toLocaleString('vi-VN')} đ` : `Giảm ${rawVal}%`,
        };
      }
    }
  }

  return bestResult;
}
