import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  FileText,
  Package,
} from 'lucide-react';
import { Button } from '../components/button';
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
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

/** Cấu hình trạng thái hiển thị chuẩn Clean SaaS */
const STATUS_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Bản nháp',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    icon: <FileText className="w-3 h-3" />,
  },
  PENDING: {
    label: 'Chờ duyệt',
    bgClass: 'bg-amber-50 ring-1 ring-amber-300',
    textClass: 'text-amber-800',
    icon: <Clock className="w-3 h-3" />,
  },
  PENDING_APPROVAL: {
    label: 'Chờ duyệt hạn mức',
    bgClass: 'bg-amber-50 ring-1 ring-amber-300',
    textClass: 'text-amber-800',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  APPROVED: {
    label: 'Đã duyệt',
    bgClass: 'bg-blue-50 ring-1 ring-blue-300',
    textClass: 'text-blue-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  PROCESSING: {
    label: 'Đang soạn hàng',
    bgClass: 'bg-purple-50 ring-1 ring-purple-300',
    textClass: 'text-purple-800',
    icon: <Package className="w-3 h-3" />,
  },
  DISPATCHED: {
    label: 'Đã xuất kho',
    bgClass: 'bg-cyan-50 ring-1 ring-cyan-300',
    textClass: 'text-cyan-800',
    icon: <Package className="w-3 h-3" />,
  },
  SHIPPED: {
    label: 'Đang giao',
    bgClass: 'bg-indigo-50 ring-1 ring-indigo-300',
    textClass: 'text-indigo-800',
    icon: <Truck className="w-3 h-3" />,
  },
  DELIVERED: {
    label: 'Giao thành công',
    bgClass: 'bg-emerald-50 ring-1 ring-emerald-300',
    textClass: 'text-emerald-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  COMPLETED: {
    label: 'Hoàn tất đơn hàng',
    bgClass: 'bg-emerald-50 ring-1 ring-emerald-300',
    textClass: 'text-emerald-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  CANCELLED: {
    label: 'Đã hủy',
    bgClass: 'bg-rose-50 ring-1 ring-rose-300',
    textClass: 'text-rose-800',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

/**
 * Trang Cổng Đơn Hàng & Theo Dõi Giao Nhận Dành Cho Đại Lý B2B (SN-170 & SN-174):
 * - SN-170: Danh sách đơn kèm trạng thái, ngày giao dự kiến, tổng tiền; chi tiết số lượng thực giao nếu thiếu; chỉ thấy đơn của chính mình
 * - SN-174: Đặt lại một đơn cũ định kỳ; chọn toàn bộ hoặc một phần dòng hàng; loại bỏ mặt hàng ngừng kinh doanh; áp giá hiện hành
 */
export const PortalOrdersPage: React.FC = () => {
  const location = useLocation();
  const isTrackingRoute = location.pathname.includes('/tracking');

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Modal xem chi tiết
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  // Modal đặt lại đơn (SN-174)
  const [selectedOrderForReorder, setSelectedOrderForReorder] = useState<Order | null>(null);
  // Modal in đơn
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);

  // Menu thao tác dropdown (Hình 1)
  const [actionMenuOrderId, setActionMenuOrderId] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setActionMenuOrderId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
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
        DELIVERED: allOrders.filter((o) => o.status === 'DELIVERED' || o.status === 'COMPLETED').length,
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

  return (
    <div className="space-y-6 pb-12">

      {/* =================================================================== */}
      {/* 2. Thống kê nhanh các chỉ số (KPI Cards - Đồng bộ 6 trạng thái)     */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Tất cả đơn hàng */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('ALL');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40 shadow-xs'
              : 'border-slate-200/90 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tất cả đơn
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{statusCounts.ALL}</div>
        </button>

        {/* 2. Đã duyệt */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('APPROVED');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
            activeTab === 'APPROVED'
              ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 shadow-xs'
              : 'border-blue-200/80 bg-blue-50/20 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              Đã duyệt
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-blue-900">{statusCounts.APPROVED}</div>
        </button>

        {/* 3. Đang soạn hàng */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('PROCESSING');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
            activeTab === 'PROCESSING'
              ? 'border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/50 shadow-xs'
              : 'border-purple-200/80 bg-purple-50/20 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
              Đang soạn
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-purple-900">{statusCounts.PROCESSING}</div>
        </button>

        {/* 4. Đã xuất kho */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('DISPATCHED');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
            activeTab === 'DISPATCHED'
              ? 'border-cyan-600 ring-2 ring-cyan-500/20 bg-cyan-50/50 shadow-xs'
              : 'border-cyan-200/80 bg-cyan-50/20 hover:border-cyan-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider">
              Đã xuất kho
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-cyan-900">{statusCounts.DISPATCHED}</div>
        </button>

        {/* 5. Đang vận chuyển */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('SHIPPED');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
            activeTab === 'SHIPPED'
              ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/50 shadow-xs'
              : 'border-indigo-200/80 bg-indigo-50/20 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              Đang giao tới
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-900">{statusCounts.SHIPPED}</div>
        </button>

        {/* 6. Giao thành công */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('DELIVERED');
            setPage(1);
          }}
          className={`text-left rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
            activeTab === 'DELIVERED'
              ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/50 shadow-xs'
              : 'border-emerald-200/80 bg-emerald-50/20 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Giao thành công
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-900">{statusCounts.DELIVERED}</div>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 3. Thanh tìm kiếm & Tabs lọc trạng thái                              */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Ô tìm kiếm chuẩn UI_GUIDELINES */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã đơn (DH...), tên sản phẩm, người nhận..."
              className="w-full h-[38px] pl-9 pr-12 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Counter & Nút Làm mới chuẩn UI_GUIDELINES */}
          <div className="flex items-center gap-2.5 text-xs text-slate-500 justify-between sm:justify-end">
            <span>
              Hiển thị <strong className="font-bold text-slate-800">{orders.length}</strong> đơn hàng
            </span>
            <button
              type="button"
              onClick={() => {
                void loadOrders();
                void loadStatusCounts();
              }}
              disabled={isLoading}
              title="Làm mới danh sách đơn hàng"
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`}
              />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Tabs lọc nhanh chuẩn UI_GUIDELINES */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          {[
            { id: 'ALL', label: 'Tất cả đơn hàng', count: statusCounts.ALL },
            { id: 'APPROVED', label: 'Đã duyệt', count: statusCounts.APPROVED },
            { id: 'PROCESSING', label: 'Đang soạn hàng', count: statusCounts.PROCESSING },
            { id: 'DISPATCHED', label: 'Đã xuất kho', count: statusCounts.DISPATCHED },
            { id: 'SHIPPED', label: 'Đang vận chuyển', count: statusCounts.SHIPPED },
            { id: 'DELIVERED', label: 'Giao thành công', count: statusCounts.DELIVERED },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
            <p className="text-sm font-medium">Đang tải danh sách đơn hàng của bạn...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mx-auto">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy đơn hàng nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || activeTab !== 'ALL'
                ? 'Không có đơn hàng nào khớp với bộ lọc hiện tại. Thử xóa tìm kiếm hoặc chuyển tab lọc.'
                : 'Bạn chưa có đơn đặt hàng nào trong hệ thống.'}
            </p>
          </div>
        ) : (
          <>
            {/* 4A. TABLE VIEW (Desktop >= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-slate-500 uppercase text-[11px] font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Mã đơn hàng</th>
                    <th className="py-3 px-4">Ngày đặt đơn</th>
                    <th className="py-3 px-4">Ngày giao dự kiến</th>
                    <th className="py-3 px-4">Điểm giao nhận</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Tình trạng giao</th>
                    <th className="py-3 px-4 text-right">Tổng tiền</th>
                    <th className="py-3 px-4 text-center w-36">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const statusMeta = STATUS_CONFIG[order.status] || {
                      label: order.status,
                      bgClass: 'bg-slate-100',
                      textClass: 'text-slate-700',
                      icon: <FileText className="w-3 h-3" />,
                    };

                    const isShort =
                      order.isShortDelivery ||
                      order.lines.some(
                        (l) => l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity,
                      );

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                        onClick={() => setSelectedOrderForDetail(order)}
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-md border border-indigo-200/60 group-hover:bg-indigo-100/80 transition-colors">
                            {order.orderCode || order.id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{formatDate(order.createdAt)}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(order.deliveryDate)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-slate-800 truncate">
                            {order.deliveryPoint?.name || 'Kho nhận đại lý'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {order.deliveryPoint?.address || '—'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}
                          >
                            {statusMeta.icon}
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isShort ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                Giao thiếu hàng
                              </span>
                              <span className="text-[10px] text-rose-700 font-mono">
                                Thực giao: {order.lines.reduce((s, l) => s + (l.deliveredQuantity ?? 0), 0)} / {order.lines.reduce((s, l) => s + l.quantity, 0)}
                              </span>
                            </div>
                          ) : order.status === 'DELIVERED' || order.status === 'COMPLETED' ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Đủ 100%
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {order.lines.reduce((s, l) => s + l.quantity, 0)} sản phẩm
                              </span>
                            </div>
                          ) : order.status === 'SHIPPED' ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Truck className="w-3 h-3 text-indigo-600 animate-pulse" />
                                Đang giao xe
                              </span>
                              <span className="text-[10px] text-indigo-600 font-medium">
                                Xe tới: {order.estimatedDeliveryWindow || (order.deliveryDate ? formatDate(order.deliveryDate) : 'Hôm nay')}
                              </span>
                            </div>
                          ) : order.status === 'DISPATCHED' ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                                <Package className="w-3 h-3 text-cyan-600" />
                                Đã xuất kho
                              </span>
                              <span className="text-[10px] text-cyan-600">Bàn giao xe tải</span>
                            </div>
                          ) : order.status === 'PROCESSING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                              <Package className="w-3 h-3 text-purple-600" />
                              Đang soạn hàng
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              {order.status === 'APPROVED' ? 'Đã duyệt đơn' : 'Chờ xét duyệt'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                          {formatCurrency(order.grandTotal)}
                        </td>
                        <td
                          className="py-3 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOrderId((prev) => (prev === order.id ? null : (order.id || null)));
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer shadow-2xs"
                            >
                              <span>Thao tác</span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {actionMenuOrderId === order.id && (
                              <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOrderId(null);
                                    setSelectedOrderForDetail(order);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Xem chi tiết</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOrderId(null);
                                    setSelectedOrderForReorder(order);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Đặt lại đơn</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4B. CARD VIEW (Mobile < 768px) */}
            <div className="block md:hidden divide-y divide-slate-100 p-2 space-y-2">
              {orders.map((order) => {
                const statusMeta = STATUS_CONFIG[order.status] || {
                  label: order.status,
                  bgClass: 'bg-slate-100',
                  textClass: 'text-slate-700',
                  icon: <FileText className="w-3 h-3" />,
                };
                const isShort =
                  order.isShortDelivery ||
                  order.lines.some(
                    (l) => l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity,
                  );

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-extrabold text-sm text-[var(--color-primary)]">
                        {order.orderCode || order.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}
                      >
                        {statusMeta.icon}
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Ngày giao dự kiến:</span>
                        <span className="font-bold text-slate-900 inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(order.deliveryDate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Tổng tiền:</span>
                        <span className="font-mono font-extrabold text-sm text-slate-900">
                          {formatCurrency(order.grandTotal)}
                        </span>
                      </div>
                    </div>

                    {isShort && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs text-amber-900 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Đơn hàng có dòng giao thiếu!
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedOrderForDetail(order)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        className="flex-1 cursor-pointer"
                      >
                        Chi tiết
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedOrderForReorder(order)}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        className="flex-1 cursor-pointer"
                      >
                        Đặt lại đơn
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* 5. Phân trang                                                    */}
        {/* ================================================================= */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Trang {page} / {totalPages} (Tổng số {total} đơn)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                className="cursor-pointer"
              >
                Trước
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                rightIcon={<ChevronRight className="w-4 h-4" />}
                className="cursor-pointer"
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 6. Modals (Detail, Reorder, Print)                                  */}
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
