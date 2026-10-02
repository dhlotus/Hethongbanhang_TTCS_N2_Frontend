import React, { useEffect, useCallback, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Clock,
  User,
  Globe,
  Database,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Filter,
  Layers,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import type { AuditLogItem } from "../../types/audit-log";
import { formatAuditDateTime } from "../../services/audit-log.service";

interface DiffViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  logItem: AuditLogItem | null;
}

/**
 * TỪ ĐIỂN ÁNH XẠ KEY KỸ THUẬT SANG TÊN TIẾNG VIỆT NGHIỆP VỤ B2B/OMS/WMS
 */
const PROPERTY_LABELS: Record<string, string> = {
  // 1. Kho hàng & Quản lý Tồn kho (Inventory & Warehouse)
  stockQuantity: "Tồn kho thực tế",
  quantityChange: "Số lượng điều chỉnh",
  beforeQuantity: "Tồn kho trước điều chỉnh",
  afterQuantity: "Tồn kho sau điều chỉnh",
  quantity: "Số lượng",
  on_hand: "Tồn kho thực tế (On-hand)",
  available: "Tồn kho khả dụng (Available)",
  allocated: "Đang giữ chỗ / Chờ giao (Allocated)",
  damaged: "Hàng hỏng / Hết hạn",
  warehouseLocation: "Vị trí kệ / Ô kho",
  storageLocation: "Vị trí lưu trữ",
  warehouseId: "Mã kho hàng",
  warehouseName: "Tên kho hàng",
  warehouse: "Kho hàng",
  lotNumber: "Số lô sản xuất",
  batchNumber: "Mã lô hàng",
  expiryDate: "Hạn sử dụng (EXP)",
  manufactureDate: "Ngày sản xuất (MFG)",
  reason: "Lý do điều chỉnh kho",
  note: "Ghi chú điều chỉnh",
  notes: "Ghi chú bổ sung",
  minStock: "Định mức tồn tối thiểu",
  maxStock: "Định mức tồn tối đa",

  // 2. Sản phẩm & Chính sách Giá bán (Products & Pricing)
  sku: "Mã sản phẩm (SKU)",
  barcode: "Mã vạch (Barcode)",
  name: "Tên sản phẩm / Tên đối tượng",
  productName: "Tên sản phẩm",
  product_name: "Tên sản phẩm",
  category: "Ngành hàng / Nhóm hàng",
  categoryName: "Tên nhóm hàng",
  category_name: "Tên nhóm hàng",
  parentCategory: "Nhóm hàng cha",
  subCategory: "Phân nhóm phụ",
  baseUnit: "Đơn vị tính cơ sở",
  unit: "Đơn vị tính",
  packagingSpec: "Quy cách đóng gói",
  price: "Giá bán niêm yết",
  unitPrice: "Giá bán niêm yết (Đơn giá)",
  costPrice: "Giá vốn nhập kho",
  margin: "Biên lợi nhuận",
  discountPercent: "Tỷ lệ chiết khấu (%)",
  discountAmount: "Số tiền chiết khấu",
  policyCode: "Mã chính sách giá",
  policyName: "Tên chính sách giá",
  minOrderQuantity: "Số lượng đặt tối thiểu",
  minOrderQty: "Số lượng đặt tối thiểu",
  vatRate: "Thuế suất GTGT (%)",
  vat: "Thuế GTGT (VAT)",
  taxAmount: "Tiền thuế GTGT",
  description: "Mô tả sản phẩm",
  imageUrl: "Hình ảnh đại diện",
  weight: "Khối lượng",
  volume: "Thể tích",

  // 3. Công nợ, Hạn mức & Khách hàng / Đại lý (Debt & Customer)
  customerCode: "Mã đại lý / Khách hàng",
  customerId: "Mã định danh khách hàng",
  customerName: "Tên đại lý / Khách hàng",
  creditLimit: "Hạn mức công nợ tối đa",
  creditTermDays: "Thời hạn công nợ (ngày)",
  currentDebt: "Dư nợ hiện tại",
  remainingCredit: "Hạn mức khả dụng còn lại",
  debtLimitStatus: "Trạng thái hạn mức",
  overdueDebt: "Nợ quá hạn",
  paymentAmount: "Số tiền thanh toán",
  amountPaid: "Số tiền đã thanh toán",
  paymentMethod: "Phương thức thanh toán",
  receiptNumber: "Số phiếu thu",
  invoiceMatched: "Hóa đơn đối soát",
  remainingDebt: "Công nợ còn lại",
  bankAccount: "Số tài khoản ngân hàng",
  bankName: "Tên ngân hàng",
  transactionRef: "Mã giao dịch đối soát",

  // 4. Đơn hàng Bán buôn (Orders)
  orderId: "Mã đơn hàng",
  orderCode: "Mã đơn hàng",
  orderStatus: "Trạng thái đơn hàng",
  totalAmount: "Tổng giá trị đơn hàng",
  subTotal: "Tiền hàng trước thuế",
  shippingFee: "Phí vận chuyển",
  deliveryAddress: "Địa chỉ giao hàng",
  deliveryDate: "Ngày hẹn giao hàng",
  salesPerson: "Nhân viên kinh doanh",
  salesRepId: "Mã NVKD phụ trách",
  orderDate: "Ngày lập đơn hàng",
  itemsCount: "Tổng số mặt hàng",

  // 5. Tài khoản & Phân quyền bảo mật (User & Security)
  username: "Tên đăng nhập",
  full_name: "Họ và tên",
  fullName: "Họ và tên",
  email: "Địa chỉ Email",
  phone: "Số điện thoại",
  phoneNumber: "Số điện thoại",
  roles: "Vai trò phân quyền",
  status: "Trạng thái tài khoản / kinh doanh",
  assignedDistricts: "Khu vực / Quận huyện phụ trách",
  assignedWarehouses: "Kho hàng được phân quyền",
  lockReason: "Lý do khóa tài khoản",
  isLocked: "Tình trạng khóa",
  lastLoginAt: "Thời điểm đăng nhập gần nhất",

  // 6. Trường hệ thống chung (Common metadata)
  createdAt: "Thời điểm tạo lập",
  created_at: "Thời điểm tạo lập",
  updatedAt: "Thời điểm cập nhật",
  updated_at: "Thời điểm cập nhật",
  deletedAt: "Thời điểm xóa bỏ",
  deleted_at: "Thời điểm xóa bỏ",
  ip_address: "Địa chỉ IP thao tác",
};

/**
 * TỪ ĐIỂN DỊCH NGHĨA TRẠNG THÁI / ENUM SANG TIẾNG VIỆT NGHIỆP VỤ
 */
const VALUE_TRANSLATIONS: Record<string, string> = {
  // Trạng thái tài khoản & sản phẩm
  ACTIVE: "Đang kinh doanh / Đang hoạt động",
  INACTIVE: "Ngừng kinh doanh / Tạm ngưng",
  LOCKED: "Đã khóa tài khoản",
  UNLOCKED: "Đang hoạt động (Đã mở khóa)",
  PENDING: "Chờ phê duyệt",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Từ chối phê duyệt",
  CANCELLED: "Đã hủy bỏ",
  CANCELED: "Đã hủy bỏ",
  DRAFT: "Bản nháp",
  COMPLETED: "Hoàn tất thành công",
  PROCESSING: "Đang xử lý",
  SHIPPED: "Đang vận chuyển",
  DELIVERED: "Đã giao hàng thành công",
  FAILED: "Thất bại",

  // Trạng thái hạn mức & công nợ
  NORMAL: "Bình thường (Trong hạn mức)",
  WARNING: "Cảnh báo (Tiệm cận hạn mức)",
  EXCEEDED: "Vượt hạn mức tối đa cho phép",

  // Phương thức thanh toán
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  CASH: "Tiền mặt",
  DEBT: "Ghi nhận công nợ đại lý",
  COD: "Thanh toán khi nhận hàng (COD)",

  // Vai trò người dùng
  ADMIN: "Quản trị viên (ADMIN)",
  SALES_ADMIN: "Quản lý kinh doanh (Sales Admin)",
  SALES_REP: "Nhân viên kinh doanh",
  WAREHOUSE_STAFF: "Thủ kho",
  ACCOUNTANT: "Kế toán",

  // Boolean
  true: "Có (Kích hoạt)",
  false: "Không (Vô hiệu)",
};

/**
 * Danh sách các key đại diện cho tiền tệ để tự động format VNĐ
 */
const MONEY_KEYS = new Set([
  "price",
  "unitprice",
  "costprice",
  "creditlimit",
  "currentdebt",
  "remainingcredit",
  "paymentamount",
  "amountpaid",
  "remainingdebt",
  "totalamount",
  "subtotal",
  "shippingfee",
  "taxamount",
  "overduedebt",
  "discountamount",
]);

/**
 * Chuyển đổi tên key kỹ thuật sang tiếng Việt dễ hiểu
 */
function getPropertyLabel(key: string): string {
  if (PROPERTY_LABELS[key]) {
    return PROPERTY_LABELS[key];
  }
  // Nếu key có dạng snake_case hoặc camelCase chưa có trong từ điển
  // Tạo nhãn tiếng Việt gần đúng hoặc định dạng dễ nhìn
  const formatted = key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Định dạng giá trị hiển thị thân thiện với người dùng phổ thông (kế toán, thủ kho)
 */
function formatDisplayValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  // Boolean
  if (typeof value === "boolean") {
    return value ? "Có (Kích hoạt)" : "Không (Tắt)";
  }

  // Number
  if (typeof value === "number") {
    const lowerKey = key.toLowerCase();
    if (MONEY_KEYS.has(lowerKey)) {
      return new Intl.NumberFormat("vi-VN").format(value) + " đ";
    }
    if (lowerKey.includes("percent") || lowerKey.includes("rate") || lowerKey === "margin") {
      return `${value}%`;
    }
    if (value >= 1000 && !lowerKey.includes("id") && !lowerKey.includes("year")) {
      return new Intl.NumberFormat("vi-VN").format(value);
    }
    return value.toString();
  }

  // String
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";

    // Kiểm tra từ điển dịch trạng thái
    if (VALUE_TRANSLATIONS[trimmed]) {
      return VALUE_TRANSLATIONS[trimmed];
    }

    // Kiểm tra định dạng ngày giờ ISO (VD: 2026-10-02T14:00:00.000Z)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
      return formatAuditDateTime(trimmed);
    }

    // Kiểm tra định dạng ngày YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    return trimmed;
  }

  // Array: Hiển thị mảng thành chuỗi phân cách dấu phẩy, dịch từng phần tử nếu là enum
  if (Array.isArray(value)) {
    if (value.length === 0) return "— (Trống)";
    return value
      .map((item) => {
        const itemStr = String(item);
        return VALUE_TRANSLATIONS[itemStr] || itemStr;
      })
      .join(", ");
  }

  // Object: Định dạng các trường bên trong thành danh sách gọn gàng không ngoặc nhọn
  if (typeof value === "object") {
    try {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return "— (Trống)";
      return entries
        .map(([k, v]) => `${getPropertyLabel(k)}: ${formatDisplayValue(k, v)}`)
        .join("; ");
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
  statusType: "MODIFIED" | "ADDED" | "REMOVED" | "UNCHANGED";
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  isOpen,
  onClose,
  logItem,
}) => {
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [onlyShowChanged, setOnlyShowChanged] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [isClosing, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Trích xuất toàn bộ danh sách thuộc tính và xác định trạng thái biến động
  const diffRows = useMemo<DiffRow[]>(() => {
    if (!logItem) return [];

    const oldVals = logItem.old_values || {};
    const newVals = logItem.new_values || {};

    const allKeys = Array.from(
      new Set([...Object.keys(oldVals), ...Object.keys(newVals)])
    );

    return allKeys.map((key) => {
      const hasOld = Object.prototype.hasOwnProperty.call(oldVals, key);
      const hasNew = Object.prototype.hasOwnProperty.call(newVals, key);

      const oldValue = hasOld ? oldVals[key] : undefined;
      const newValue = hasNew ? newVals[key] : undefined;

      const oldFormatted = hasOld ? formatDisplayValue(key, oldValue) : "—";
      const newFormatted = hasNew ? formatDisplayValue(key, newValue) : "—";

      const isAdded = !hasOld && hasNew;
      const isRemoved = hasOld && !hasNew;
      const isChanged =
        JSON.stringify(oldValue) !== JSON.stringify(newValue);

      let statusType: DiffRow["statusType"] = "UNCHANGED";
      if (isAdded) statusType = "ADDED";
      else if (isRemoved) statusType = "REMOVED";
      else if (isChanged) statusType = "MODIFIED";

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

  // Bộ lọc dữ liệu theo tuỳ chọn hiển thị và từ khóa tìm kiếm
  const filteredRows = useMemo(() => {
    let rows = diffRows;

    if (onlyShowChanged) {
      rows = rows.filter((r) => r.isChanged);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.key.toLowerCase().includes(q) ||
          r.oldFormatted.toLowerCase().includes(q) ||
          r.newFormatted.toLowerCase().includes(q)
      );
    }

    return rows;
  }, [diffRows, onlyShowChanged, searchQuery]);

  const changedCount = useMemo(
    () => diffRows.filter((r) => r.isChanged).length,
    [diffRows]
  );

  // Sao chép bảng đối chiếu văn bản trực quan cho kế toán/thủ kho làm báo cáo
  const handleCopySummary = () => {
    if (!logItem) return;

    const lines: string[] = [
      "==================================================",
      "BIÊN BẢN ĐỐI CHIẾU THAY ĐỔI DỮ LIỆU HỆ THỐNG",
      "==================================================",
      `Mã bản ghi nhật ký : ${logItem.id}`,
      `Thời điểm ghi nhận : ${formatAuditDateTime(logItem.created_at)}`,
      `Người thực hiện    : ${logItem.user.full_name} (${logItem.user.email})`,
      `Địa chỉ IP         : ${logItem.user.ip_address}`,
      `Đối tượng tác động : ${logItem.entity_name} [Mã: ${logItem.entity_id}]`,
      `Loại thao tác      : ${logItem.action}`,
      "--------------------------------------------------",
      "CHI TIẾT CÁC THUỘC TÍNH BIẾN ĐỘNG:",
    ];

    const activeRows = diffRows.filter((r) => r.isChanged);
    if (activeRows.length === 0) {
      lines.push("  (Không có thuộc tính nào bị thay đổi)");
    } else {
      activeRows.forEach((row) => {
        let tag = "THAY ĐỔI";
        if (row.isAdded) tag = "THÊM MỚI";
        if (row.isRemoved) tag = "ĐÃ XÓA";

        lines.push(
          `• [${tag}] ${row.label} (${row.key}):`
        );
        lines.push(`    - Trước: ${row.oldFormatted}`);
        lines.push(`    - Sau  : ${row.newFormatted}`);
      });
    }

    lines.push("==================================================");

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (!isOpen || !logItem) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-modal-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs ${
        isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isClosing ? "animate-modal-out" : "animate-modal-in"
        }`}
      >
        {/* 1. Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-2xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="diff-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                >
                  Đối chiếu Thay đổi Dữ liệu (Audit Diff Viewer)
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold ring-1 ring-inset ring-blue-700/10">
                  {logItem.action}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mã bản ghi:{" "}
                <span className="font-mono font-semibold text-slate-700">
                  {logItem.id}
                </span>
                {" • "}
                <span>Đối tượng: <strong>{logItem.entity_name}</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng cửa sổ"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. Banner Thông tin Truy vết (Audit Meta Information) */}
        <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs shrink-0">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium">Người thực hiện:</div>
              <div className="font-semibold text-slate-800 truncate" title={logItem.user.full_name}>
                {logItem.user.full_name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{logItem.user.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs shrink-0">
              <Globe className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium">Địa chỉ IP truy cập:</div>
              <div className="font-mono text-slate-800 font-semibold">{logItem.user.ip_address}</div>
              <div className="text-[10px] text-emerald-600 font-medium">Đã xác thực bảo mật</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium">Thời điểm ghi nhận:</div>
              <div className="font-mono text-slate-800 font-semibold">
                {formatAuditDateTime(logItem.created_at)}
              </div>
              <div className="text-[10px] text-slate-400">Giờ máy chủ (UTC+7)</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs shrink-0">
              <Database className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 font-medium">Mã đối tượng (Target ID):</div>
              <div className="font-mono text-blue-700 font-semibold truncate" title={logItem.entity_id}>
                {logItem.entity_id}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{logItem.entity_name}</div>
            </div>
          </div>
        </div>

        {/* 3. Thanh điều khiển Bộ lọc & Tìm kiếm thuộc tính trong Modal */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Tóm tắt biến động */}
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                changedCount > 0
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {changedCount > 0 ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                  <span>Phát hiện {changedCount} trường thông tin thay đổi</span>
                </>
              ) : (
                <>
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  <span>Không có thuộc tính nào biến động</span>
                </>
              )}
            </div>

            {/* Toggle chỉ hiển thị trường thay đổi */}
            <label className="inline-flex items-center gap-1.5 text-slate-600 font-medium cursor-pointer hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={onlyShowChanged}
                onChange={(e) => setOnlyShowChanged(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Chỉ hiển thị trường thay đổi</span>
            </label>
          </div>

          {/* Ô tìm kiếm thuộc tính */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm trường thông tin..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* 4. Thân Modal: Bảng Đối chiếu Trực quan (Property Comparison Table) */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredRows.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Filter className="h-8 w-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700 text-sm">
                {searchQuery
                  ? "Không tìm thấy trường thông tin nào khớp với tìm kiếm"
                  : onlyShowChanged
                  ? "Không có trường dữ liệu nào bị thay đổi trong bản ghi này"
                  : "Không có dữ liệu thuộc tính"}
              </p>
              <p className="text-xs text-slate-400">
                {onlyShowChanged && (
                  <button
                    type="button"
                    onClick={() => setOnlyShowChanged(false)}
                    className="text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    Bấm vào đây để xem toàn bộ tất cả trường thông tin
                  </button>
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4 w-[28%] min-w-[180px]">
                      Trường thông tin (Thuộc tính)
                    </th>
                    <th className="py-3 px-4 w-[33%] min-w-[200px] border-l border-slate-200">
                      <div className="flex items-center gap-1.5 text-rose-700">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span>Giá trị trước thay đổi (Old Value)</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 w-[33%] min-w-[200px] border-l border-slate-200">
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Giá trị sau thay đổi (New Value)</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center w-[6%] whitespace-nowrap border-l border-slate-200">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => {
                    const isRowChanged = row.isChanged;

                    return (
                      <tr
                        key={row.key}
                        className={`transition-colors ${
                          isRowChanged
                            ? "bg-amber-50/20 hover:bg-amber-50/40"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        {/* Cột 1: Tên tiếng Việt dễ hiểu + Mã key kỹ thuật */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-[13px] leading-snug">
                              {row.label}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400 mt-0.5">
                              {row.key}
                            </span>
                          </div>
                        </td>

                        {/* Cột 2: Giá trị cũ (Old Value) */}
                        <td className="py-3 px-4 align-top border-l border-slate-100">
                          {row.isAdded || !logItem.old_values ? (
                            <span className="text-slate-400 italic text-xs">
                              — (Khởi tạo mới)
                            </span>
                          ) : isRowChanged ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium line-through decoration-rose-400 decoration-1 text-xs">
                              <span>{row.oldFormatted}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">
                              {row.oldFormatted}
                            </span>
                          )}
                        </td>

                        {/* Cột 3: Giá trị mới (New Value) */}
                        <td className="py-3 px-4 align-top border-l border-slate-100">
                          {row.isRemoved || !logItem.new_values ? (
                            <span className="text-rose-500 italic font-medium text-xs">
                              — (Đã xóa khỏi hệ thống)
                            </span>
                          ) : isRowChanged ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs shadow-2xs">
                              <span>{row.newFormatted}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">
                              {row.newFormatted}
                            </span>
                          )}
                        </td>

                        {/* Cột 4: Badge trạng thái biến động */}
                        <td className="py-3 px-3 align-top text-center border-l border-slate-100 whitespace-nowrap">
                          {row.statusType === "ADDED" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Thêm mới
                            </span>
                          )}
                          {row.statusType === "REMOVED" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Đã xóa
                            </span>
                          )}
                          {row.statusType === "MODIFIED" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Thay đổi
                            </span>
                          )}
                          {row.statusType === "UNCHANGED" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
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

          {/* Ghi chú giải thích cho thủ kho / kế toán */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý đối chiếu:</strong> Các giá trị được hiển thị đã được chuyển đổi sang định dạng tiền tệ (VNĐ), ngày tháng và tên tiếng Việt chuẩn hóa. Bạn có thể sử dụng nút <em>"Sao chép bảng đối chiếu"</em> bên dưới để dán vào biên bản kiểm kê hoặc gửi báo cáo quản lý.
            </div>
          </div>
        </div>

        {/* 5. Footer Modal */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            title="Sao chép nội dung so sánh để lập biên bản kiểm kê"
          >
            {copiedText ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Đã sao chép vào bộ nhớ tạm!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-500" />
                <span>Sao chép bảng đối chiếu</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
