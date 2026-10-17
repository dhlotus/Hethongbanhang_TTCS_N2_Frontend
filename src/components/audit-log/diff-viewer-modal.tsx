import React, { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ModalLayout } from '../modal-layout';
import type { AuditLogItem } from '../../types/audit-log';
import {
  formatAuditDateTime,
  formatAuditUserName,
  resolveEntityCode,
  resolveEntityDisplayName,
} from '../../services/audit-log.service';

interface DiffViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  logItem: AuditLogItem | null;
}

/**
 * TỪ ĐIỂN ÁNH XẠ KEY KỸ THUẬT SANG TÊN TIẾNG VIỆT NGHIỆP VỤ B2B/OMS/WMS (100% TIẾNG VIỆT)
 */
const PROPERTY_LABELS: Record<string, string> = {
  // 1. Kho hàng & Quản lý Tồn kho
  stockQuantity: 'Tồn kho thực tế',
  quantityChange: 'Số lượng điều chỉnh',
  beforeQuantity: 'Tồn kho trước điều chỉnh',
  afterQuantity: 'Tồn kho sau điều chỉnh',
  quantity: 'Số lượng',
  on_hand: 'Tồn kho thực tế',
  available: 'Tồn kho khả dụng',
  allocated: 'Đang giữ chỗ / Chờ giao',
  damaged: 'Hàng hỏng / Hết hạn',
  warehouseLocation: 'Vị trí kệ / Ô kho',
  storageLocation: 'Vị trí lưu trữ',
  warehouseId: 'Mã kho hàng',
  warehouseName: 'Tên kho hàng',
  warehouse: 'Kho hàng',
  lotNumber: 'Số lô sản xuất',
  batchNumber: 'Mã lô hàng',
  expiryDate: 'Hạn sử dụng',
  manufactureDate: 'Ngày sản xuất',
  reason: 'Lý do điều chỉnh kho',
  note: 'Ghi chú điều chỉnh',
  notes: 'Ghi chú bổ sung',
  minStock: 'Định mức tồn tối thiểu',
  maxStock: 'Định mức tồn tối đa',

  // 2. Sản phẩm & Chính sách Giá bán
  sku: 'Mã sản phẩm (SKU)',
  barcode: 'Mã vạch (Barcode)',
  name: 'Tên sản phẩm / Tên đối tượng',
  productName: 'Tên sản phẩm',
  product_name: 'Tên sản phẩm',
  category: 'Ngành hàng / Nhóm hàng',
  categoryName: 'Tên nhóm hàng',
  category_name: 'Tên nhóm hàng',
  parentCategory: 'Nhóm hàng cha',
  subCategory: 'Phân nhóm phụ',
  baseUnit: 'Đơn vị tính cơ sở',
  unit: 'Đơn vị tính',
  packagingSpec: 'Quy cách đóng gói',
  price: 'Giá bán niêm yết',
  unitPrice: 'Giá bán niêm yết',
  costPrice: 'Giá vốn nhập kho',
  margin: 'Biên lợi nhuận',
  discountPercent: 'Tỷ lệ chiết khấu (%)',
  discountAmount: 'Số tiền chiết khấu',
  policyCode: 'Mã chính sách giá',
  policyName: 'Tên chính sách giá',
  minOrderQuantity: 'Số lượng đặt tối thiểu',
  minOrderQty: 'Số lượng đặt tối thiểu',
  vatRate: 'Thuế suất GTGT (%)',
  vat: 'Thuế GTGT',
  taxAmount: 'Tiền thuế GTGT',
  description: 'Mô tả sản phẩm',
  imageUrl: 'Hình ảnh đại diện',
  weight: 'Khối lượng',
  volume: 'Thể tích',

  // 3. Công nợ, Hạn mức & Khách hàng / Đại lý
  customerCode: 'Mã đại lý / Khách hàng',
  customerId: 'Mã định danh khách hàng',
  customerName: 'Tên đại lý / Khách hàng',
  creditLimit: 'Hạn mức công nợ tối đa',
  creditTermDays: 'Thời hạn công nợ (ngày)',
  currentDebt: 'Dư nợ hiện tại',
  remainingCredit: 'Hạn mức khả dụng còn lại',
  debtLimitStatus: 'Trạng thái hạn mức',
  overdueDebt: 'Nợ quá hạn',
  paymentAmount: 'Số tiền thanh toán',
  amountPaid: 'Số tiền đã thanh toán',
  paymentMethod: 'Phương thức thanh toán',
  receiptNumber: 'Số phiếu thu',
  invoiceMatched: 'Hóa đơn đối soát',
  remainingDebt: 'Công nợ còn lại',
  bankAccount: 'Số tài khoản ngân hàng',
  bankName: 'Tên ngân hàng',
  transactionRef: 'Mã giao dịch đối soát',

  // 4. Đơn hàng Bán buôn
  orderId: 'Mã đơn hàng',
  orderCode: 'Mã đơn hàng',
  orderStatus: 'Trạng thái đơn hàng',
  totalAmount: 'Tổng giá trị đơn hàng',
  subTotal: 'Tiền hàng trước thuế',
  shippingFee: 'Phí vận chuyển',
  deliveryAddress: 'Địa chỉ giao hàng',
  deliveryDate: 'Ngày hẹn giao hàng',
  salesPerson: 'Nhân viên kinh doanh',
  salesRepId: 'Mã nhân viên phụ trách',
  orderDate: 'Ngày lập đơn hàng',
  itemsCount: 'Tổng số mặt hàng',

  // 5. Tài khoản & Phân quyền bảo mật
  username: 'Tên đăng nhập',
  full_name: 'Họ và tên',
  fullName: 'Họ và tên',
  email: 'Địa chỉ Email',
  phone: 'Số điện thoại',
  phoneNumber: 'Số điện thoại',
  roles: 'Vai trò phân quyền',
  status: 'Trạng thái tài khoản',
  assignedDistricts: 'Khu vực phụ trách',
  assignedWarehouses: 'Kho hàng phân quyền',
  lockReason: 'Lý do khóa tài khoản',
  isLocked: 'Tình trạng khóa',
  lastLoginAt: 'Đăng nhập gần nhất',

  // 6. Trường hệ thống chung
  createdAt: 'Thời điểm tạo lập',
  created_at: 'Thời điểm tạo lập',
  updatedAt: 'Thời điểm cập nhật',
  updated_at: 'Thời điểm cập nhật',
  deletedAt: 'Thời điểm xóa bỏ',
  deleted_at: 'Thời điểm xóa bỏ',
  ip_address: 'Địa chỉ IP thao tác',
};

/**
 * TỪ ĐIỂN DỊCH NGHĨA TRẠNG THÁI SANG 100% TIẾNG VIỆT
 */
const VALUE_TRANSLATIONS: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Tạm ngừng hoạt động',
  LOCKED: 'Đã khóa tài khoản',
  UNLOCKED: 'Đang hoạt động',
  PENDING: 'Chờ phê duyệt',
  APPROVED: 'Đã phê duyệt',
  REJECTED: 'Từ chối phê duyệt',
  CANCELLED: 'Đã hủy bỏ',
  CANCELED: 'Đã hủy bỏ',
  DRAFT: 'Bản nháp',
  COMPLETED: 'Hoàn tất thành công',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang vận chuyển',
  DELIVERED: 'Đã giao hàng thành công',
  FAILED: 'Thất bại',

  NORMAL: 'Bình thường',
  WARNING: 'Cảnh báo',
  EXCEEDED: 'Vượt hạn mức',

  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  CASH: 'Tiền mặt',
  DEBT: 'Ghi nhận công nợ',
  COD: 'Thanh toán khi nhận hàng',

  ADMIN: 'Quản trị viên',
  SALES_ADMIN: 'Quản lý kinh doanh',
  SALES_REP: 'Nhân viên kinh doanh',
  WAREHOUSE_STAFF: 'Thủ kho',
  ACCOUNTANT: 'Kế toán',

  true: 'Có (Bật)',
  false: 'Không (Tắt)',
};

const MONEY_KEYS = new Set([
  'price',
  'unitprice',
  'costprice',
  'creditlimit',
  'currentdebt',
  'remainingcredit',
  'paymentamount',
  'amountpaid',
  'remainingdebt',
  'totalamount',
  'subtotal',
  'shippingfee',
  'taxamount',
  'overduedebt',
  'discountamount',
]);

function getPropertyLabel(key: string): string {
  if (PROPERTY_LABELS[key]) {
    return PROPERTY_LABELS[key];
  }
  const formatted = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatDisplayValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Có (Bật)' : 'Không (Tắt)';
  }

  if (typeof value === 'number') {
    const lowerKey = key.toLowerCase();
    if (MONEY_KEYS.has(lowerKey)) {
      return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
    }
    if (lowerKey.includes('percent') || lowerKey.includes('rate') || lowerKey === 'margin') {
      return `${value}%`;
    }
    if (value >= 1000 && !lowerKey.includes('id') && !lowerKey.includes('year')) {
      return new Intl.NumberFormat('vi-VN').format(value);
    }
    return value.toString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '—';

    if (VALUE_TRANSLATIONS[trimmed]) {
      return VALUE_TRANSLATIONS[trimmed];
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
      return formatAuditDateTime(trimmed);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '— (Trống)';
    return value
      .map((item) => {
        const itemStr = String(item);
        return VALUE_TRANSLATIONS[itemStr] || itemStr;
      })
      .join(', ');
  }

  if (typeof value === 'object') {
    try {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return '— (Trống)';
      return entries
        .map(([k, v]) => `${getPropertyLabel(k)}: ${formatDisplayValue(k, v)}`)
        .join('; ');
    } catch {
      return JSON.stringify(value);
    }
  }

  return String(value);
}

interface DiffRow {
  key: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  oldFormatted: string;
  newFormatted: string;
  isChanged: boolean;
  isAdded: boolean;
  isRemoved: boolean;
  statusType: 'MODIFIED' | 'ADDED' | 'REMOVED' | 'UNCHANGED';
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  isOpen,
  onClose,
  logItem,
}) => {
  // Trích xuất toàn bộ danh sách thuộc tính và trạng thái biến động
  const diffRows = useMemo<DiffRow[]>(() => {
    if (!logItem) return [];

    const oldVals = logItem.old_values || {};
    const newVals = logItem.new_values || {};

    const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

    return allKeys.map((key) => {
      const hasOld = Object.prototype.hasOwnProperty.call(oldVals, key);
      const hasNew = Object.prototype.hasOwnProperty.call(newVals, key);

      const oldValue = hasOld ? oldVals[key] : undefined;
      const newValue = hasNew ? newVals[key] : undefined;

      const oldFormatted = hasOld ? formatDisplayValue(key, oldValue) : '—';
      const newFormatted = hasNew ? formatDisplayValue(key, newValue) : '—';

      const isAdded = !hasOld && hasNew;
      const isRemoved = hasOld && !hasNew;
      const isChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

      let statusType: DiffRow['statusType'] = 'UNCHANGED';
      if (isAdded) statusType = 'ADDED';
      else if (isRemoved) statusType = 'REMOVED';
      else if (isChanged) statusType = 'MODIFIED';

      return {
        key,
        label: getPropertyLabel(key),
        oldValue,
        newValue,
        oldFormatted,
        newFormatted,
        isChanged,
        isAdded,
        isRemoved,
        statusType,
      };
    });
  }, [logItem]);

  const changedRows = useMemo(() => {
    const changed = diffRows.filter((r) => r.isChanged);
    return changed.length > 0 ? changed : diffRows;
  }, [diffRows]);

  const resolvedCode = useMemo(() => {
    if (!logItem) return '';
    return resolveEntityCode(logItem);
  }, [logItem]);

  const displayEntityName = useMemo(() => {
    if (!logItem) return '';
    return resolveEntityDisplayName(logItem.entity_name, resolvedCode);
  }, [logItem, resolvedCode]);

  const userName = useMemo(() => {
    if (!logItem) return '';
    return formatAuditUserName(logItem.user);
  }, [logItem]);

  const actionLabel = useMemo(() => {
    if (!logItem) return '';
    const map: Record<string, string> = {
      CREATE: 'Tạo mới',
      UPDATE: 'Cập nhật',
      DELETE: 'Xóa dữ liệu',
      APPROVE: 'Phê duyệt',
      CANCEL: 'Hủy bỏ',
      STOCK_ADJUST: 'Điều chỉnh tồn kho',
    };
    return map[logItem.action] || logItem.action;
  }, [logItem]);

  if (!isOpen || !logItem) return null;

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Đối chiếu dữ liệu thay đổi"
      maxWidth="max-w-4xl"
      closeOnOverlayClick={true}
      closeOnEsc={true}
      bodyClassName="p-4 sm:p-6 space-y-4 text-slate-700 text-xs sm:text-sm"
    >
      {/* 1. Dải tóm tắt thông tin tinh gọn (Metadata bar) */}
      <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm">
        <div>
          <span className="text-slate-400 text-xs">Người thực hiện: </span>
          <strong className="text-slate-900 font-semibold">{userName}</strong>
        </div>

        <div>
          <span className="text-slate-400 text-xs">Thời gian: </span>
          <span className="font-mono text-slate-700 font-medium">
            {formatAuditDateTime(logItem.created_at)}
          </span>
        </div>

        <div>
          <span className="text-slate-400 text-xs">Đối tượng: </span>
          <span className="text-slate-900 font-semibold">{displayEntityName}</span>
          {resolvedCode && (
            <span className="font-mono text-[var(--color-primary)] font-semibold ml-1">
              [{resolvedCode}]
            </span>
          )}
        </div>

        <div>
          <span className="text-slate-400 text-xs">Hành động: </span>
          <span className="font-semibold text-slate-800">{actionLabel}</span>
        </div>
      </div>

      {/* 2. Bảng đối chiếu dữ liệu (100% Tiếng Việt) */}
      <div className="flex-1 overflow-hidden">
        {changedRows.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
            <p className="font-semibold text-slate-700 text-sm">
              Không phát hiện trường dữ liệu nào bị thay đổi
            </p>
            <p className="text-xs text-slate-400">
              Dữ liệu trước và sau thao tác hoàn toàn đồng nhất.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[32rem]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-xs">
                  <th className="py-2.5 px-3.5 w-[28%] min-w-[150px]">
                    Trường thông tin
                  </th>
                  <th className="py-2.5 px-3.5 w-[33%] min-w-[170px] border-l border-slate-200 text-rose-700">
                    Giá trị trước
                  </th>
                  <th className="py-2.5 px-3.5 w-[33%] min-w-[170px] border-l border-slate-200 text-emerald-700">
                    Giá trị sau
                  </th>
                  <th className="py-2.5 px-3 text-center w-[6%] whitespace-nowrap border-l border-slate-200">
                    Trạng thái
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {changedRows.map((row) => {
                  const isRowChanged = row.isChanged;

                  return (
                    <tr
                      key={row.key}
                      className={`transition-colors ${
                        isRowChanged
                          ? 'bg-amber-50/20 hover:bg-amber-50/40'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Cột 1: Tên thuộc tính */}
                      <td className="py-2.5 px-3.5 align-top">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-xs sm:text-sm leading-snug">
                            {row.label}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 mt-0.5">
                            {row.key}
                          </span>
                        </div>
                      </td>

                      {/* Cột 2: Giá trị trước */}
                      <td className="py-2.5 px-3.5 align-top border-l border-slate-100">
                        {row.isAdded || !logItem.old_values ? (
                          <span className="text-slate-400 italic text-xs">
                            — (Khởi tạo mới)
                          </span>
                        ) : isRowChanged ? (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-medium line-through decoration-rose-400 text-xs">
                            <span>{row.oldFormatted}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs sm:text-sm">
                            {row.oldFormatted}
                          </span>
                        )}
                      </td>

                      {/* Cột 3: Giá trị sau */}
                      <td className="py-2.5 px-3.5 align-top border-l border-slate-100">
                        {row.isRemoved || !logItem.new_values ? (
                          <span className="text-rose-500 italic font-medium text-xs">
                            — (Đã xóa khỏi hệ thống)
                          </span>
                        ) : isRowChanged ? (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs shadow-2xs">
                            <span>{row.newFormatted}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs sm:text-sm">
                            {row.newFormatted}
                          </span>
                        )}
                      </td>

                      {/* Cột 4: Trạng thái biến động */}
                      <td className="py-2.5 px-3 align-top text-center border-l border-slate-100 whitespace-nowrap">
                        {row.statusType === 'ADDED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Thêm mới
                          </span>
                        )}
                        {row.statusType === 'REMOVED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Đã xóa
                          </span>
                        )}
                        {row.statusType === 'MODIFIED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Thay đổi
                          </span>
                        )}
                        {row.statusType === 'UNCHANGED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500">
                            Không đổi
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModalLayout>
  );
};
