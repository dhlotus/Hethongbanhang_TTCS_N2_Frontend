import React from 'react';
import { Badge, type BadgeVariant } from '../components/badge';

/**
 * Định nghĩa cấu hình trạng thái chuẩn hóa LOHA SALES (UI_GUIDELINES Section 84 & 85)
 * - Tên tiếng Việt ngắn gọn, đúng nghiệp vụ
 * - Màu Semantic thống nhất:
 *   + Success (Xanh lá): Hoạt động, Đã hoàn thành, Đã duyệt, Đang kinh doanh, Đang áp dụng
 *   + Error/Danger (Đỏ): Đã khóa, Đã hủy, Thất bại, Hết hàng, Từ chối, Ngừng kinh doanh
 *   + Warning (Vàng/Cam): Chờ xử lý, Chờ duyệt, Tạm dừng, Cảnh báo
 *   + Info (Xanh dương): Đang giao, Đang xử lý, Đã xác nhận
 *   + Neutral (Xám): Bản nháp, Ngừng hoạt động, Hết hạn, Mặc định
 */
export interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

export const SYSTEM_STATUS_MAP: Record<string, StatusMeta> = {
  // Trạng thái Tài khoản / Người dùng (User / Account)
  ACTIVE: { label: 'Hoạt động', variant: 'success' },
  LOCKED: { label: 'Đã khóa', variant: 'error' },
  INACTIVE: { label: 'Ngừng hoạt động', variant: 'neutral' },
  PENDING: { label: 'Chờ kích hoạt', variant: 'warning' },

  // Trạng thái Đơn hàng (Orders)
  ORDER_PENDING: { label: 'Chờ xử lý', variant: 'warning' },
  ORDER_PROCESSING: { label: 'Đang xử lý', variant: 'info' },
  ORDER_CONFIRMED: { label: 'Đã xác nhận', variant: 'info' },
  ORDER_SHIPPED: { label: 'Đang giao hàng', variant: 'info' },
  ORDER_DELIVERED: { label: 'Đã giao hàng', variant: 'success' },
  ORDER_COMPLETED: { label: 'Đã hoàn thành', variant: 'success' },
  ORDER_CANCELLED: { label: 'Đã hủy', variant: 'error' },

  // Trạng thái Bảng giá / Chính sách chiết khấu (Price Lists / Policies)
  POLICY_ACTIVE: { label: 'Đang áp dụng', variant: 'success' },
  POLICY_DRAFT: { label: 'Bản nháp', variant: 'neutral' },
  POLICY_EXPIRED: { label: 'Hết hạn', variant: 'neutral' },
  POLICY_INACTIVE: { label: 'Tạm dừng', variant: 'warning' },

  // Trạng thái Sản phẩm (Products)
  PRODUCT_ACTIVE: { label: 'Đang kinh doanh', variant: 'success' },
  PRODUCT_INACTIVE: { label: 'Ngừng kinh doanh', variant: 'neutral' },
  PRODUCT_OUT_OF_STOCK: { label: 'Hết hàng', variant: 'error' },

  // Trạng thái Kho / Kiểm kê / Phiếu xuất nhập
  AUDIT_DRAFT: { label: 'Bản nháp', variant: 'neutral' },
  AUDIT_PENDING: { label: 'Chờ duyệt', variant: 'warning' },
  AUDIT_APPROVED: { label: 'Đã duyệt', variant: 'success' },
  AUDIT_REJECTED: { label: 'Từ chối', variant: 'error' },
};

/**
 * Trích xuất meta trạng thái chuẩn từ mã code bất kỳ
 */
export function getStatusMeta(status: string, fallbackLabel?: string): StatusMeta {
  const upper = (status || '').toUpperCase();
  if (SYSTEM_STATUS_MAP[upper]) {
    return SYSTEM_STATUS_MAP[upper];
  }

  // Khớp theo từ khóa thông dụng nếu không đúng key chính xác
  if (
    upper.includes('ACTIVE') ||
    upper.includes('COMPLETED') ||
    upper.includes('APPROVED') ||
    upper.includes('SUCCESS')
  ) {
    return { label: fallbackLabel || 'Hoạt động', variant: 'success' };
  }
  if (
    upper.includes('LOCK') ||
    upper.includes('CANCEL') ||
    upper.includes('REJECT') ||
    upper.includes('ERROR') ||
    upper.includes('FAIL')
  ) {
    return { label: fallbackLabel || 'Đã hủy / Đã khóa', variant: 'error' };
  }
  if (upper.includes('PENDING') || upper.includes('WAIT') || upper.includes('WARN')) {
    return { label: fallbackLabel || 'Chờ xử lý', variant: 'warning' };
  }
  if (upper.includes('PROCESS') || upper.includes('SHIP') || upper.includes('INFO')) {
    return { label: fallbackLabel || 'Đang xử lý', variant: 'info' };
  }

  return { label: fallbackLabel || status || 'Không xác định', variant: 'neutral' };
}

export interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

/**
 * Component hiển thị Badge trạng thái chuẩn hóa toàn hệ thống LOHA SALES (UI_GUIDELINES 84, 85)
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  dot = true,
  className = '',
}) => {
  const meta = getStatusMeta(status, label);

  return (
    <Badge variant={meta.variant} size={size} dot={dot} className={className}>
      {label || meta.label}
    </Badge>
  );
};
