/**
 * Các hàm tiện ích định dạng tiền tệ và thời gian cho Chuyến đi giao hàng (SN-194 / SN-197)
 */

/**
 * Định dạng tiền tệ VNĐ (ví dụ: 125,000,000 ₫)
 */
export function formatVndCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Định dạng ngày giờ thân thiện (ví dụ: 14:30 17/10/2026)
 */
export function formatTripDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

/**
 * Tính toán thời gian quá hạn hoặc thời gian còn lại đến hạn
 */
export function getTripTimingStatus(
  status: string,
  estimatedCompletionTime: string,
): {
  isOverdue: boolean;
  text: string;
  badgeClass: string;
} {
  if (status === 'COMPLETED') {
    return {
      isOverdue: false,
      text: 'Đã hoàn tất',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (status === 'DRAFT') {
    return {
      isOverdue: false,
      text: 'Chưa xuất phát',
      badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    };
  }

  const now = Date.now();
  const est = new Date(estimatedCompletionTime).getTime();
  const isOverdue = !isNaN(est) && now > est;

  if (isOverdue) {
    return {
      isOverdue: true,
      text: 'Quá hạn ETA',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  return {
    isOverdue: false,
    text: 'Đúng tiến độ',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
}
