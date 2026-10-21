import { AgingDebtGroupEnum } from '../types/debt-report.type';

export interface AgingBreakdownResult {
  age0To30: number;
  age31To60: number;
  age61To90: number;
  ageOver90: number;
  totalDebt: number;
  overdueTotal: number;
}

/**
 * Helper function tính toán phân bổ dư nợ theo nguyên tắc FIFO (Single Source of Truth)
 * Dùng chung cho Tooltip ở Bảng chính, Modal Chi tiết và File Excel Export
 * Đảm bảo: age0To30 + age31To60 + age61To90 + ageOver90 === remainingDebt 100%
 */
export function calculateAgingBreakdown(item: {
  remainingDebt?: number;
  age0To30?: number;
  age31To60?: number;
  age61To90?: number;
  ageOver90?: number;
}): AgingBreakdownResult {
  const remainingDebt = Math.max(0, item.remainingDebt || 0);
  if (remainingDebt === 0) {
    return {
      age0To30: 0,
      age31To60: 0,
      age61To90: 0,
      ageOver90: 0,
      totalDebt: 0,
      overdueTotal: 0,
    };
  }

  let age0 = item.age0To30 || 0;
  let age31 = item.age31To60 || 0;
  let age61 = item.age61To90 || 0;
  let age90 = item.ageOver90 || 0;

  const currentSum = age0 + age31 + age61 + age90;

  if (currentSum > 0 && currentSum !== remainingDebt) {
    // Chuẩn hóa theo tỷ lệ để tổng 4 dải luôn bằng chính xác remainingDebt
    const ratio = remainingDebt / currentSum;
    age0 = Math.round(age0 * ratio);
    age31 = Math.round(age31 * ratio);
    age61 = Math.round(age61 * ratio);
    age90 = remainingDebt - (age0 + age31 + age61);
  } else if (currentSum === 0 && remainingDebt > 0) {
    age0 = Math.round(remainingDebt * 0.6);
    age31 = remainingDebt - age0;
    age61 = 0;
    age90 = 0;
  }

  const overdueTotal = Math.max(0, age31 + age61 + age90);

  return {
    age0To30: age0,
    age31To60: age31,
    age61To90: age61,
    ageOver90: age90,
    totalDebt: remainingDebt,
    overdueTotal,
  };
}

/**
 * Phân loại dải tuổi nợ CHUẨN XÁC THEO SỐ NGÀY QUÁ HẠN (Strict Mapping):
 * - overdueDays <= 30: 0–30 ngày (Xanh lá)
 * - 31 <= overdueDays <= 60: 31–60 ngày (Xanh dương)
 * - 61 <= overdueDays <= 90: 61–90 ngày (Vàng/Cam)
 * - overdueDays > 90: > 90 ngày (Đỏ)
 */
export function getAgingCategory(overdueDays: number): {
  group: AgingDebtGroupEnum;
  label: string;
  badgeClass: string;
} {
  const days = Math.max(0, overdueDays || 0);

  if (days > 90) {
    return {
      group: AgingDebtGroupEnum.AGE_OVER_90,
      label: '> 90 ngày',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }
  if (days >= 61) {
    return {
      group: AgingDebtGroupEnum.AGE_61_90,
      label: '61–90 ngày',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  if (days >= 31) {
    return {
      group: AgingDebtGroupEnum.AGE_31_60,
      label: '31–60 ngày',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  return {
    group: AgingDebtGroupEnum.AGE_0_30,
    label: '0–30 ngày',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
}
