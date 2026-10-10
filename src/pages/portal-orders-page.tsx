import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Building2,
  ChevronLeft,
  ChevronRight,
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
import { tokenStorage } from '../utils/token-storage';


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
  const [activeTab, setActiveTab] = useState<string>(isTrackingRoute ? 'SHIPPED' : 'ALL');

  // Modal xem chi tiết
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  // Modal đặt lại đơn (SN-174)
  const [selectedOrderForReorder, setSelectedOrderForReorder] = useState<Order | null>(null);
  // Modal in đơn
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);

  const currentUser = tokenStorage.getUser();

  // Tải danh sách đơn hàng của đại lý (SN-170: Chỉ thấy đơn của chính mình)
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      let statusFilter: OrderStatus | 'ALL' | undefined;
      if (activeTab === 'SHORT_DELIVERY' || activeTab === 'ALL') {
        statusFilter = 'ALL';
      } else {
        statusFilter = activeTab as OrderStatus;
      }

      const res = await ordersService.getMyOrders({
        page,
        limit,
        search: searchTerm.trim() || undefined,
        status: statusFilter,
      });

      let filteredList = res.data;
      if (activeTab === 'SHORT_DELIVERY') {
        filteredList = filteredList.filter(
          (o) =>
            o.isShortDelivery ||
            o.lines.some(
              (l) => l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity,
            ),
        );
      }

      setOrders(filteredList);
      setTotal(activeTab === 'SHORT_DELIVERY' ? filteredList.length : res.total);
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
  }, [loadOrders, isTrackingRoute]);

  // Thống kê nhanh theo trạng thái
  const summaryMetrics = useMemo(() => {
    const totalCount = orders.length;
    const shippingCount = orders.filter((o) => o.status === 'SHIPPED').length;
    const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
    const shortDeliveryCount = orders.filter(
      (o) =>
        o.isShortDelivery ||
        o.lines.some((l) => l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity),
    ).length;

    const nearestDelivery = orders
      .filter((o) => o.status === 'SHIPPED' && o.deliveryDate)
      .sort(
        (a, b) =>
          new Date(a.deliveryDate || '').getTime() - new Date(b.deliveryDate || '').getTime(),
      )[0]?.deliveryDate;

    return {
      totalCount,
      shippingCount,
      deliveredCount,
      shortDeliveryCount,
      nearestDelivery,
    };
  }, [orders]);

  // Handler khi reorder thành công
  const handleReorderSuccess = (_newOrder: Order) => {
    void loadOrders();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* =================================================================== */}
      {/* 1. Header Banner Phân hệ Đại lý                                      */}
      {/* =================================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-indigo-50/70 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)] text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              Đại lý Cấp 1 • Phân phối Độc quyền
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isTrackingRoute ? 'Theo Dõi Đơn Hàng & Lộ Trình Giao Nhận' : 'Cổng Quản Lý Đơn Hàng & Đặt Lại Định Kỳ'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
              Tra cứu tiến độ vận chuyển hàng hóa, đối chiếu số lượng thực giao và đặt lại các đơn hàng quen thuộc chỉ trong vài giây.
            </p>
          </div>

          {/* Thẻ tóm tắt thông tin đại lý */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-xs">
              <span className="text-slate-400 block font-medium">Đại lý sở hữu:</span>
              <span className="font-bold text-slate-800 text-sm">
                {currentUser?.fullName || 'Đại Lý Cửa Hàng Minh Khang'}
              </span>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => void loadOrders()}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
              className="cursor-pointer"
            >
              Làm mới
            </Button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. Thống kê nhanh các chỉ số (KPI Cards)                             */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tổng đơn hàng */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng số đơn
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{total}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Tất cả đơn của đại lý</p>
        </div>

        {/* Đang vận chuyển */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Đang giao tới
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-900">
            {summaryMetrics.shippingCount}
          </div>
          <p className="text-[11px] text-indigo-700 mt-0.5">
            {summaryMetrics.nearestDelivery
              ? `Dự kiến sớm nhất: ${formatDate(summaryMetrics.nearestDelivery)}`
              : 'Xe tải đang vận chuyển'}
          </p>
        </div>

        {/* Đã giao thành công */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Giao hoàn tất
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-900">
            {summaryMetrics.deliveredCount}
          </div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Đã bàn giao kho nhận</p>
        </div>

        {/* Đơn có dòng giao thiếu (SN-170) */}
        <div
          onClick={() => setActiveTab('SHORT_DELIVERY')}
          className={`rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
            summaryMetrics.shortDeliveryCount > 0
              ? 'border-amber-300 bg-amber-50/60 text-amber-900 ring-1 ring-amber-300/60'
              : 'border-slate-200/80 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Có dòng giao thiếu</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold">{summaryMetrics.shortDeliveryCount}</div>
          <p className="text-[11px] mt-0.5 opacity-90">
            {summaryMetrics.shortDeliveryCount > 0
              ? 'Bấm để lọc xem đơn thiếu hàng'
              : 'Không có đơn nào thiếu'}
          </p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. Thanh tìm kiếm & Tabs lọc trạng thái                              */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã đơn (DH...), tên sản phẩm, người nhận..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Xóa
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 text-right">
            Hiển thị <span className="font-bold text-slate-800">{orders.length}</span> đơn hàng
          </div>
        </div>

        {/* Tabs lọc nhanh */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          {[
            { id: 'ALL', label: 'Tất cả đơn hàng' },
            { id: 'SHIPPED', label: 'Đang vận chuyển' },
            { id: 'PROCESSING', label: 'Đang soạn hàng' },
            { id: 'DELIVERED', label: 'Giao thành công' },
            { id: 'SHORT_DELIVERY', label: '⚠️ Có giao thiếu hàng (SN-170)' },
            { id: 'PENDING', label: 'Chờ xét duyệt' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. Danh sách đơn hàng: Responsive Table & Mobile Cards              */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-sm font-medium">Đang tải danh sách đơn hàng của bạn...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto">
              <ShoppingCart className="w-7 h-7" />
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
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          <span className="text-[var(--color-primary)] group-hover:underline">
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3 h-3" />
                              Giao thiếu hàng
                            </span>
                          ) : order.status === 'DELIVERED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Đủ 100%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              {order.status === 'SHIPPED' ? 'Đang vận chuyển' : 'Chờ xuất kho'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                          {formatCurrency(order.grandTotal)}
                        </td>
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForDetail(order)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors cursor-pointer"
                              title="Xem chi tiết đơn hàng"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForReorder(order)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] hover:text-white transition-all cursor-pointer shadow-2xs"
                              title="Đặt lại đơn này (SN-174)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Đặt lại</span>
                            </button>
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
              Trang {page} / {totalPages}
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
