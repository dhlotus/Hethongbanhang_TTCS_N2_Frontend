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
      text: 'Đã hoàn tất chuyến',
      badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    };
  }

  if (status === 'DRAFT') {
    return {
      isOverdue: false,
      text: 'Chưa xuất phát',
      badgeClass: 'bg-slate-50 text-slate-700 ring-slate-600/20',
    };
  }

  const now = Date.now();
  const est = new Date(estimatedCompletionTime).getTime();
  const diffMinutes = Math.floor((now - est) / (1000 * 60));

  if (diffMinutes > 0) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}p` : `${mins}p`;
    return {
      isOverdue: true,
      text: `Trễ ${timeStr}`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  const remainingMins = Math.abs(diffMinutes);
  const remainingHours = Math.floor(remainingMins / 60);
  const minsLeft = remainingMins % 60;
  const timeStr = remainingHours > 0 ? `${remainingHours}h ${minsLeft}p` : `${minsLeft}p`;

  return {
    isOverdue: false,
    text: `Còn ${timeStr}`,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  };
}
