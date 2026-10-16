import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  Truck,
  RotateCcw,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Package,
  Plus,
  Printer,
  Copy,
  Check,
  MapPin,
  Phone,
  X,
} from 'lucide-react';
import { Button } from '../components/button';
import { Pagination } from '../components/pagination';
import { showToast } from '../components/toast';
import { ordersService } from '../services/orders.service';
import { CustomerOrderDetailModal } from '../components/customer-order-detail-modal';
import { ReorderModal } from '../components/reorder-modal';
import { OrderPrintModal } from '../components/order-print-modal';
import type { Order, OrderStatus } from '../types/order';

/** Định dạng tiền tệ VND */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

/** Định dạng ngày DD/MM/YYYY */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

/** Cấu hình trạng thái hiển thị chuẩn Clean B2B SaaS (UI_GUIDELINES) */
const STATUS_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Bản nháp',
    bgClass: 'bg-slate-100 ring-1 ring-slate-200/90',
    textClass: 'text-slate-700',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  PENDING: {
    label: 'Chờ duyệt',
    bgClass: 'bg-amber-50 ring-1 ring-amber-300',
    textClass: 'text-amber-800',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  PENDING_APPROVAL: {
    label: 'Chờ duyệt hạn mức',
    bgClass: 'bg-amber-50 ring-1 ring-amber-300',
    textClass: 'text-amber-800',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  APPROVED: {
    label: 'Đã duyệt',
    bgClass: 'bg-blue-50 ring-1 ring-blue-300',
    textClass: 'text-blue-800',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  PROCESSING: {
    label: 'Đang soạn hàng',
    bgClass: 'bg-purple-50 ring-1 ring-purple-300',
    textClass: 'text-purple-800',
    icon: <Package className="w-3.5 h-3.5" />,
  },
  DISPATCHED: {
    label: 'Đã xuất kho',
    bgClass: 'bg-cyan-50 ring-1 ring-cyan-300',
    textClass: 'text-cyan-800',
    icon: <Package className="w-3.5 h-3.5" />,
  },
  SHIPPED: {
    label: 'Đang giao xe',
    bgClass: 'bg-indigo-50 ring-1 ring-indigo-300',
    textClass: 'text-indigo-800',
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  DELIVERED: {
    label: 'Giao thành công',
    bgClass: 'bg-emerald-50 ring-1 ring-emerald-300',
    textClass: 'text-emerald-800',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  COMPLETED: {
    label: 'Hoàn tất đơn',
    bgClass: 'bg-emerald-50 ring-1 ring-emerald-300',
    textClass: 'text-emerald-800',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  CANCELLED: {
    label: 'Đã hủy',
    bgClass: 'bg-rose-50 ring-1 ring-rose-300',
    textClass: 'text-rose-800',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

/** Cấu hình trạng thái thanh toán */
const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string }
> = {
  PAID: {
    label: 'Đã thanh toán',
    bgClass: 'bg-emerald-50 ring-1 ring-emerald-300/80',
    textClass: 'text-emerald-700',
  },
  PARTIAL: {
    label: 'TT một phần',
    bgClass: 'bg-amber-50 ring-1 ring-amber-300/80',
    textClass: 'text-amber-800',
  },
  UNPAID: {
    label: 'Chưa thanh toán',
    bgClass: 'bg-slate-100 ring-1 ring-slate-200',
    textClass: 'text-slate-600',
  },
};

interface DropdownMenuState {
  order: Order;
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

/**
 * Trang Cổng Đơn Hàng & Theo Dõi Giao Nhận Dành Cho Đại Lý B2B (SN-170, SN-174 & SN-199):
 * - SN-170: Danh sách đơn kèm trạng thái, ngày giao dự kiến, tổng tiền, cảnh báo giao thiếu
 * - SN-174: Đặt lại đơn hàng cũ nhanh chóng (1-Click Reorder)
 * - SN-199: Theo dõi lộ trình xe tải vận chuyển thời gian thực
 */
export const PortalOrdersPage: React.FC = () => {
  const location = useLocation();
  const isTrackingRoute = location.pathname.includes('/tracking');

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Accordion mở rộng chi tiết trên Mobile Card
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  // Modal xem chi tiết (SN-170)
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  // Modal đặt lại đơn (SN-174)
  const [selectedOrderForReorder, setSelectedOrderForReorder] = useState<Order | null>(null);
  // Modal in đơn
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);

  // Trạng thái copy mã đơn
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Menu thao tác dropdown (Rendered qua React Portal chống bị che khuất)
  const [dropdownMenu, setDropdownMenu] = useState<DropdownMenuState | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Đóng dropdown khi click ngoài hoặc cuộn trang
  useEffect(() => {
    const handleCloseDropdown = (e: MouseEvent | TouchEvent) => {
      if (
        activeTriggerRef.current &&
        activeTriggerRef.current.contains(e.target as Node)
      ) {
        return;
      }
      setDropdownMenu(null);
    };

    const handleScrollOrResize = () => {
      setDropdownMenu(null);
    };

    window.addEventListener('click', handleCloseDropdown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('click', handleCloseDropdown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // State lưu số lượng tổng quát của từng trạng thái để KPI cards và tabs luôn đồng bộ
  const [statusCounts, setStatusCounts] = useState<{
    ALL: number;
    APPROVED: number;
    PROCESSING: number;
    DISPATCHED: number;
    SHIPPED: number;
    DELIVERED: number;
  }>({
    ALL: 0,
    APPROVED: 0,
    PROCESSING: 0,
    DISPATCHED: 0,
    SHIPPED: 0,
    DELIVERED: 0,
  });

  // Tải thống kê số lượng toàn bộ đơn hàng của đại lý
  const loadStatusCounts = useCallback(async () => {
    try {
      const res = await ordersService.getMyOrders({ limit: 500 });
      const allOrders = res.data || [];
      setStatusCounts({
        ALL: res.total ?? allOrders.length,
        APPROVED: allOrders.filter((o) => o.status === 'APPROVED').length,
        PROCESSING: allOrders.filter((o) => o.status === 'PROCESSING').length,
        DISPATCHED: allOrders.filter((o) => o.status === 'DISPATCHED').length,
        SHIPPED: allOrders.filter((o) => o.status === 'SHIPPED').length,
        DELIVERED: allOrders.filter(
          (o) => o.status === 'DELIVERED' || o.status === 'COMPLETED',
        ).length,
      });
    } catch (e) {
      console.warn('Lỗi tải thống kê trạng thái:', e);
    }
  }, []);

  // Tải danh sách đơn hàng của đại lý (SN-170: Chỉ thấy đơn của chính mình)
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusFilter = activeTab === 'ALL' ? undefined : (activeTab as OrderStatus);

      const res = await ordersService.getMyOrders({
        page,
        limit,
        search: searchTerm.trim() || undefined,
        status: statusFilter,
      });

      setOrders(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Không thể tải danh sách đơn hàng của bạn',
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchTerm, activeTab]);

  useEffect(() => {
    document.title = isTrackingRoute
      ? 'Theo dõi đơn hàng & Giao vận | Cổng Đại Lý LOHA SALES'
      : 'Cổng Đơn hàng Đại lý | LOHA SALES';
    void loadOrders();
    void loadStatusCounts();
  }, [loadOrders, loadStatusCounts, isTrackingRoute]);

  // Handler khi reorder thành công
  const handleReorderSuccess = (_newOrder: Order) => {
    void loadOrders();
    void loadStatusCounts();
  };

  // Toggle dropdown Thao tác với tính toán vị trí portal thông minh
  const handleToggleDropdown = (
    e: React.MouseEvent<HTMLButtonElement>,
    order: Order,
  ) => {
    e.stopPropagation();
    if (dropdownMenu?.order.id === order.id) {
      setDropdownMenu(null);
      activeTriggerRef.current = null;
      return;
    }

    const button = e.currentTarget;
    activeTriggerRef.current = button;
    const rect = button.getBoundingClientRect();

    const menuHeight = 170; // Chiều cao ước lượng của dropdown menu
    const menuWidth = 168; // Chiều rộng cố định
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const placement: 'top' | 'bottom' =
      spaceBelow < menuHeight && spaceAbove > menuHeight ? 'top' : 'bottom';

    const top =
      placement === 'bottom'
        ? rect.bottom + window.scrollY + 4
        : rect.top + window.scrollY - menuHeight - 4;

    // Căn phải theo nút, đảm bảo không tràn mép trái/phải màn hình
    const idealLeft = rect.right + window.scrollX - menuWidth;
    const left = Math.max(8, Math.min(idealLeft, window.innerWidth - menuWidth - 8));

    setDropdownMenu({
      order,
      top,
      left,
      placement,
    });
  };

  // Toggle mở rộng card trên Mobile
  const toggleCardExpanded = (orderId: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Copy mã đơn hàng
  const handleCopyOrderCode = (e: React.MouseEvent, code: string, orderId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedOrderId(orderId);
    showToast('info', `Đã sao chép mã đơn ${code}`);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-12 w-full max-w-full min-w-0">
      {/* =================================================================== */}
      {/* 1. Tiêu đề trang & Thanh công cụ chuẩn LOHA SALES (UI_GUIDELINES)    */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-1 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link
              to="/portal/orders"
              className="hover:text-indigo-600 transition-colors"
            >
              Cổng Đại lý B2B
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-indigo-600 font-bold">Theo dõi đơn hàng</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Theo dõi đơn hàng & Giao vận
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              <Truck className="w-3 h-3 text-indigo-600" />
              Lộ trình xe tải
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tra cứu lộ trình xe tải, tiến độ giao nhận theo thời gian thực và quản lý đơn đặt hàng
          </p>
        </div>

        {/* Nút tác vụ nhanh */}
        <div className="flex items-center gap-2 sm:self-center">
          <Link to="/portal/orders">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="h-[38px] cursor-pointer shadow-xs whitespace-nowrap"
            >
              Đặt hàng mới
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => {
              void loadOrders();
              void loadStatusCounts();
            }}
            disabled={isLoading}
            title="Làm mới danh sách đơn hàng"
            className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'
              }`}
            />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. Thống kê nhanh các chỉ số (KPI Cards - Đồng bộ 6 trạng thái)     */}
      {/* Responsive: 2 cột (mobile) -> 3 cột (tablet) -> 6 cột (desktop)   */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
        {/* 1. Tất cả đơn hàng */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('ALL');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer min-h-[82px] flex flex-col justify-between ${
            activeTab === 'ALL'
              ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/50 shadow-xs'
              : 'border-slate-200/90 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Tất cả đơn
            </span>
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
            {statusCounts.ALL}
          </div>
        </button>

        {/* 2. Đã duyệt */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('APPROVED');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer min-h-[82px] flex flex-col justify-between ${
            activeTab === 'APPROVED'
              ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 shadow-xs'
              : 'border-blue-200/80 bg-blue-50/20 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider truncate">
              Đã duyệt
            </span>
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-blue-900 tabular-nums">
            {statusCounts.APPROVED}
          </div>
        </button>

        {/* 3. Đang soạn hàng */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('PROCESSING');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer min-h-[82px] flex flex-col justify-between ${
            activeTab === 'PROCESSING'
              ? 'border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/50 shadow-xs'
              : 'border-purple-200/80 bg-purple-50/20 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider truncate">
              Đang soạn
            </span>
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 shrink-0">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-purple-900 tabular-nums">
            {statusCounts.PROCESSING}
          </div>
        </button>

        {/* 4. Đã xuất kho */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('DISPATCHED');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer min-h-[82px] flex flex-col justify-between ${
            activeTab === 'DISPATCHED'
              ? 'border-cyan-600 ring-2 ring-cyan-500/20 bg-cyan-50/50 shadow-xs'
              : 'border-cyan-200/80 bg-cyan-50/20 hover:border-cyan-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider truncate">
              Đã xuất kho
            </span>
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 shrink-0">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-cyan-900 tabular-nums">
            {statusCounts.DISPATCHED}
          </div>
        </button>

        {/* 5. Đang vận chuyển */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('SHIPPED');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer min-h-[82px] flex flex-col justify-between ${
            activeTab === 'SHIPPED'
              ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/50 shadow-xs'
              : 'border-indigo-200/80 bg-indigo-50/20 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider truncate">
              Đang giao xe
            </span>
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-indigo-900 tabular-nums">
            {statusCounts.SHIPPED}
          </div>
        </button>

        {/* 6. Giao thành công */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('DELIVERED');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer min-h-[82px] flex flex-col justify-between ${
            activeTab === 'DELIVERED'
              ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/50 shadow-xs'
              : 'border-emerald-200/80 bg-emerald-50/20 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider truncate">
              Giao xong
            </span>
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-emerald-900 tabular-nums">
            {statusCounts.DELIVERED}
          </div>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 3. Thanh tìm kiếm & Tabs lọc trạng thái                              */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Ô tìm kiếm chuẩn UI_GUIDELINES */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã đơn (DH...), tên sản phẩm, điểm nhận, người nhận..."
              className="w-full h-[38px] pl-9 pr-9 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bộ đếm kết quả */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500">
            <span>
              Tìm thấy <strong className="font-bold text-slate-800">{total}</strong> đơn hàng
            </span>
            {searchTerm && (
              <span className="text-[11px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Lọc theo từ khóa
              </span>
            )}
          </div>
        </div>

        {/* Tabs lọc nhanh với khả năng cuộn mượt mà trên Mobile */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          {[
            { id: 'ALL', label: 'Tất cả đơn', count: statusCounts.ALL },
            { id: 'APPROVED', label: 'Đã duyệt', count: statusCounts.APPROVED },
            { id: 'PROCESSING', label: 'Đang soạn', count: statusCounts.PROCESSING },
            { id: 'DISPATCHED', label: 'Đã xuất kho', count: statusCounts.DISPATCHED },
            { id: 'SHIPPED', label: 'Đang giao xe', count: statusCounts.SHIPPED },
            { id: 'DELIVERED', label: 'Giao xong', count: statusCounts.DELIVERED },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. Danh sách đơn hàng: Responsive Table & Mobile Cards              */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium text-slate-600">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mx-auto">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy đơn hàng nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || activeTab !== 'ALL'
                ? 'Không có đơn hàng nào khớp với điều kiện tìm kiếm. Hãy thử xóa từ khóa hoặc chọn trạng thái khác.'
                : 'Bạn chưa có đơn đặt hàng nào trong hệ thống.'}
            </p>
            {(searchTerm || activeTab !== 'ALL') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setActiveTab('ALL');
                  setPage(1);
                }}
                className="mt-2 cursor-pointer"
              >
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* ------------------------------------------------------------- */}
            {/* 4A. BẢNG DỮ LIỆU DESKTOP & TABLET (>= 768px)                  */}
            {/* ------------------------------------------------------------- */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs divide-y divide-slate-100 min-w-[940px]">
                <thead className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4 w-[16%]">Mã đơn & Ngày đặt</th>
                    <th className="py-3 px-4 w-[24%]">Điểm giao nhận</th>
                    <th className="py-3 px-4 w-[18%]">Lộ trình & Dự kiến giao</th>
                    <th className="py-3 px-4 text-center w-[13%]">Trạng thái</th>
                    <th className="py-3 px-4 text-center w-[13%]">Tiến độ giao</th>
                    <th className="py-3 px-4 text-right w-[16%]">Tổng tiền & Thanh toán</th>
                    <th className="py-3 px-4 text-center w-[10%] min-w-[95px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const statusMeta = STATUS_CONFIG[order.status] || {
                      label: order.status,
                      bgClass: 'bg-slate-100 ring-1 ring-slate-200',
                      textClass: 'text-slate-700',
                      icon: <FileText className="w-3.5 h-3.5" />,
                    };

                    const paymentMeta =
                      PAYMENT_STATUS_CONFIG[order.paymentStatus || 'UNPAID'] ||
                      PAYMENT_STATUS_CONFIG.UNPAID;

                    const isShort =
                      order.isShortDelivery ||
                      order.lines.some(
                        (l) =>
                          l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity,
                      );

                    const totalItemsCount = order.lines.reduce((s, l) => s + l.quantity, 0);
                    const deliveredItemsCount = order.lines.reduce(
                      (s, l) => s + (l.deliveredQuantity ?? 0),
                      0,
                    );

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrderForDetail(order)}
                        className="hover:bg-indigo-50/25 transition-colors group cursor-pointer"
                      >
                        {/* 1. Mã đơn & Ngày đặt */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/70 group-hover:bg-indigo-100/90 transition-colors inline-flex items-center gap-1">
                              {order.orderCode || order.id}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              {formatDate(order.createdAt)}
                            </span>
                          </div>
                        </td>

                        {/* 2. Điểm giao nhận */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div
                            className="font-semibold text-slate-800 truncate"
                            title={order.deliveryPoint?.name || 'Kho nhận đại lý'}
                          >
                            {order.deliveryPoint?.name || 'Kho nhận đại lý'}
                          </div>
                          <div
                            className="text-[11px] text-slate-500 truncate mt-0.5"
                            title={order.deliveryPoint?.address || '—'}
                          >
                            {order.deliveryPoint?.address || '—'}
                          </div>
                          {order.deliveryPoint?.contactPerson && (
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 shrink-0" />
                              <span>
                                {order.deliveryPoint.contactPerson}
                                {order.deliveryPoint.phone ? ` • ${order.deliveryPoint.phone}` : ''}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 3. Lộ trình & Ngày giao dự kiến */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded text-[11px]">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              {formatDate(order.deliveryDate)}
                            </span>
                            {order.status === 'SHIPPED' ? (
                              <span className="text-[10px] text-indigo-700 font-medium inline-flex items-center gap-1">
                                <Truck className="w-3 h-3 text-indigo-600 animate-pulse shrink-0" />
                                {order.estimatedDeliveryWindow || 'Xe đang di chuyển'}
                              </span>
                            ) : order.licensePlate ? (
                              <span className="text-[10px] text-slate-500">
                                Xe: {order.licensePlate}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 4. Trạng thái đơn hàng */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}
                          >
                            {statusMeta.icon}
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* 5. Tình trạng giao hàng */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isShort ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                Giao thiếu
                              </span>
                              <span className="text-[10px] text-rose-700 font-mono font-medium">
                                Đã giao: {deliveredItemsCount} / {totalItemsCount}
                              </span>
                            </div>
                          ) : order.status === 'DELIVERED' || order.status === 'COMPLETED' ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                Đủ 100%
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {totalItemsCount} sản phẩm
                              </span>
                            </div>
                          ) : order.status === 'SHIPPED' ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Truck className="w-3 h-3 text-indigo-600 shrink-0 animate-bounce" />
                                Đang giao xe
                              </span>
                              <span className="text-[10px] text-indigo-600 font-medium">
                                Bàn giao vận chuyển
                              </span>
                            </div>
                          ) : order.status === 'DISPATCHED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                              <Package className="w-3 h-3 text-cyan-600 shrink-0" />
                              Đã xuất kho
                            </span>
                          ) : order.status === 'PROCESSING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                              <Package className="w-3 h-3 text-purple-600 shrink-0" />
                              Đang soạn hàng
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              {order.status === 'APPROVED' ? 'Đã duyệt đơn' : 'Chờ xét duyệt'}
                            </span>
                          )}
                        </td>

                        {/* 6. Tổng tiền & Trạng thái thanh toán */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-mono font-extrabold text-slate-900 text-sm tabular-nums">
                              {formatCurrency(order.grandTotal)}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${paymentMeta.bgClass} ${paymentMeta.textClass}`}
                            >
                              {paymentMeta.label}
                            </span>
                          </div>
                        </td>

                        {/* 7. Nút Thao tác Dropdown */}
                        <td
                          className="py-3.5 px-4 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleToggleDropdown(e, order)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-lg transition-all cursor-pointer shadow-2xs group-hover:border-indigo-200"
                            title="Mở menu thao tác"
                          >
                            <span>Thao tác</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                                dropdownMenu?.order.id === order.id ? 'rotate-180 text-indigo-600' : ''
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* 4B. CARD VIEW DÀNH CHO MOBILE (< 768px: 320px - 767px)         */}
            {/* ------------------------------------------------------------- */}
            <div className="block md:hidden divide-y divide-slate-100 p-3 sm:p-4 space-y-3 bg-slate-50/50">
              {orders.map((order) => {
                const statusMeta = STATUS_CONFIG[order.status] || {
                  label: order.status,
                  bgClass: 'bg-slate-100 ring-1 ring-slate-200',
                  textClass: 'text-slate-700',
                  icon: <FileText className="w-3.5 h-3.5" />,
                };

                const paymentMeta =
                  PAYMENT_STATUS_CONFIG[order.paymentStatus || 'UNPAID'] ||
                  PAYMENT_STATUS_CONFIG.UNPAID;

                const isShort =
                  order.isShortDelivery ||
                  order.lines.some(
                    (l) =>
                      l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity,
                  );

                const isExpanded = expandedCardIds.has(order.id || '');
                const totalItemsCount = order.lines.reduce((s, l) => s + l.quantity, 0);
                const deliveredItemsCount = order.lines.reduce(
                  (s, l) => s + (l.deliveredQuantity ?? 0),
                  0,
                );

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3 shadow-2xs hover:border-slate-300 transition-all"
                  >
                    {/* Header Card: Mã đơn + Trạng thái */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50/90 px-2.5 py-1 rounded-md border border-indigo-200/80 truncate">
                          {order.orderCode || order.id}
                        </span>
                        <button
                          type="button"
                          onClick={(e) =>
                            handleCopyOrderCode(e, order.orderCode || order.id || '', order.id || '')
                          }
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                          title="Sao chép mã đơn"
                        >
                          {copiedOrderId === order.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${statusMeta.bgClass} ${statusMeta.textClass}`}
                      >
                        {statusMeta.icon}
                        {statusMeta.label}
                      </span>
                    </div>

                    {/* Hàng 2: Ngày đặt & Ngày giao dự kiến */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-1 border-y border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[11px] mb-0.5">Ngày đặt đơn:</span>
                        <span className="font-semibold text-slate-700 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] mb-0.5">Ngày giao dự kiến:</span>
                        <span className="font-bold text-slate-900 inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                          {formatDate(order.deliveryDate)}
                        </span>
                      </div>
                    </div>

                    {/* Hàng 3: Tổng tiền & Thanh toán */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Tổng tiền đơn hàng:</span>
                        <span className="font-mono font-extrabold text-base text-slate-900 tabular-nums">
                          {formatCurrency(order.grandTotal)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[11px] mb-0.5">Thanh toán:</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${paymentMeta.bgClass} ${paymentMeta.textClass}`}
                        >
                          {paymentMeta.label}
                        </span>
                      </div>
                    </div>

                    {/* Thông báo tình trạng giao nhận đặc biệt */}
                    {isShort ? (
                      <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800 font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <div>Đơn hàng có dòng giao thiếu!</div>
                          <div className="text-[11px] font-mono font-normal text-rose-700">
                            Thực giao: {deliveredItemsCount} / {totalItemsCount} sản phẩm
                          </div>
                        </div>
                      </div>
                    ) : order.status === 'SHIPPED' ? (
                      <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs text-indigo-900 font-semibold flex items-center gap-2">
                        <Truck className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
                        <div>
                          <div>Xe đang giao hàng tới bạn</div>
                          <div className="text-[11px] font-normal text-indigo-700">
                            {order.estimatedDeliveryWindow
                              ? `Dự kiến: ${order.estimatedDeliveryWindow}`
                              : 'Vui lòng chuẩn bị người nhận hàng'}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Nút bật/tắt thông tin mở rộng (Accordion) */}
                    <button
                      type="button"
                      onClick={() => toggleCardExpanded(order.id || '')}
                      className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isExpanded ? 'Thu gọn thông tin' : 'Xem điểm giao & chi tiết'}</span>
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {/* Khung chi tiết mở rộng */}
                    {isExpanded && (
                      <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-2 text-xs animate-in fade-in duration-150">
                        <div>
                          <span className="font-bold text-slate-700 block">Kho nhận:</span>
                          <span className="text-slate-600">
                            {order.deliveryPoint?.name || 'Kho nhận đại lý'}
                          </span>
                          <span className="text-slate-500 block text-[11px] mt-0.5">
                            {order.deliveryPoint?.address || '—'}
                          </span>
                        </div>

                        {order.deliveryPoint?.contactPerson && (
                          <div className="pt-1.5 border-t border-slate-200/60">
                            <span className="font-bold text-slate-700">Người liên hệ: </span>
                            <span className="text-slate-600">
                              {order.deliveryPoint.contactPerson}
                              {order.deliveryPoint.phone ? ` (${order.deliveryPoint.phone})` : ''}
                            </span>
                          </div>
                        )}

                        {order.licensePlate && (
                          <div className="pt-1.5 border-t border-slate-200/60">
                            <span className="font-bold text-slate-700">Phương tiện: </span>
                            <span className="text-slate-600">
                              Biển số {order.licensePlate}
                              {order.driverName ? ` • Tài xế: ${order.driverName}` : ''}
                            </span>
                          </div>
                        )}

                        <div className="pt-1.5 border-t border-slate-200/60">
                          <span className="font-bold text-slate-700 block mb-1">
                            Sản phẩm ({order.lines.length} dòng):
                          </span>
                          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                            {order.lines.map((line, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200/60"
                              >
                                <span className="truncate max-w-[170px] font-medium text-slate-800">
                                  {line.productName}
                                </span>
                                <span className="font-mono font-bold text-slate-700 shrink-0">
                                  x{line.quantity} {line.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hàng nút bấm cảm ứng lớn (Touch targets >= 40px) */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedOrderForDetail(order)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        className="flex-1 h-10 justify-center cursor-pointer text-xs font-semibold"
                      >
                        Chi tiết
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedOrderForReorder(order)}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        className="flex-1 h-10 justify-center cursor-pointer text-xs font-semibold"
                      >
                        Đặt lại đơn
                      </Button>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForPrint(order)}
                        className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300 transition-colors cursor-pointer"
                        title="In đơn hàng"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* 5. Phân trang chuẩn LOHA SALES (UI_GUIDELINES)                     */}
        {/* ================================================================= */}
        {totalPages > 0 && total > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={limit}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="đơn hàng"
            showRecordRange={true}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* =================================================================== */}
      {/* 6. DROPDOWN THAO TÁC RENDER QUA REACT PORTAL                        */}
      {/* (Giải quyết triệt để lỗi bị cắt, che khuất hoặc tràn bảng)           */}
      {/* =================================================================== */}
      {dropdownMenu &&
        createPortal(
          <div
            style={{
              position: 'absolute',
              top: `${dropdownMenu.top}px`,
              left: `${dropdownMenu.left}px`,
              zIndex: 99999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-42 rounded-xl bg-white border border-slate-200/95 shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150 select-none"
          >
            <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {dropdownMenu.order.orderCode || 'Thao tác đơn'}
            </div>

            {/* 1. Xem chi tiết */}
            <button
              type="button"
              onClick={() => {
                const ord = dropdownMenu.order;
                setDropdownMenu(null);
                setSelectedOrderForDetail(ord);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Xem chi tiết</span>
            </button>

            {/* 2. Đặt lại đơn */}
            <button
              type="button"
              onClick={() => {
                const ord = dropdownMenu.order;
                setDropdownMenu(null);
                setSelectedOrderForReorder(ord);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Đặt lại đơn hàng</span>
            </button>

            {/* 3. In phiếu đơn */}
            <button
              type="button"
              onClick={() => {
                const ord = dropdownMenu.order;
                setDropdownMenu(null);
                setSelectedOrderForPrint(ord);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>In đơn hàng</span>
            </button>

            {/* 4. Sao chép mã đơn */}
            <button
              type="button"
              onClick={(e) => {
                const code = dropdownMenu.order.orderCode || dropdownMenu.order.id || '';
                handleCopyOrderCode(e, code, dropdownMenu.order.id || '');
                setDropdownMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Sao chép mã đơn</span>
            </button>
          </div>,
          document.body,
        )}

      {/* =================================================================== */}
      {/* 7. Modals (Detail, Reorder, Print)                                  */}
      {/* =================================================================== */}
      {selectedOrderForDetail && (
        <CustomerOrderDetailModal
          isOpen={Boolean(selectedOrderForDetail)}
          order={selectedOrderForDetail}
          onClose={() => setSelectedOrderForDetail(null)}
          onOpenReorder={(ord) => {
            setSelectedOrderForDetail(null);
            setSelectedOrderForReorder(ord);
          }}
        />
      )}

      {selectedOrderForReorder && (
        <ReorderModal
          isOpen={Boolean(selectedOrderForReorder)}
          order={selectedOrderForReorder}
          onClose={() => setSelectedOrderForReorder(null)}
          onSuccess={handleReorderSuccess}
        />
      )}

      {selectedOrderForPrint && (
        <OrderPrintModal
          isOpen={Boolean(selectedOrderForPrint)}
          order={selectedOrderForPrint}
          onClose={() => setSelectedOrderForPrint(null)}
        />
      )}
    </div>
  );
};
