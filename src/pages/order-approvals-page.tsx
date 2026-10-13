import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CornerUpLeft,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  Clock,
  User,
  Calendar,
  X,
  TrendingDown,
  Info,
  Check,
  ShoppingBag,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { Pagination } from '../components/pagination';
import { DateInput } from '../components/date-input';
import { ordersService } from '../services/orders.service';
import type {
  Order,
  OrderApprovalAction,
  OrderApprovalHistory,
} from '../types/order';

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const formatDate = (isoString?: string): string => {
  if (!isoString) return '---';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return isoString;
  }
};

type FilterExceptionType = 'ALL' | 'CREDIT_LIMIT' | 'BELOW_FLOOR_PRICE' | 'PORTAL_ORDER' | 'HISTORY';

export const OrderApprovalsPage: React.FC = () => {
  // Danh sách đơn hàng
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Bộ lọc
  const [activeTab, setActiveTab] = useState<FilterExceptionType>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal thẩm định chi tiết & ra quyết định
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'ITEMS' | 'CREDIT' | 'HISTORY'>('ITEMS');
  const [decisionAction, setDecisionAction] = useState<OrderApprovalAction | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lịch sử phê duyệt của đơn
  const [approvalHistory, setApprovalHistory] = useState<OrderApprovalHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Lắng nghe sự kiện cập nhật đơn hàng realtime
  useEffect(() => {
    const handleUpdate = () => setRefreshKey((k) => k + 1);
    window.addEventListener('loha_orders_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('loha_orders_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Tải danh sách đơn hàng
  useEffect(() => {
    let active = true;
    setLoading(true);

    ordersService
      .getOrders({
        page: 1,
        limit: 100, // Lấy toàn bộ tập đơn để phân loại ngoại lệ
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })
      .then((res) => {
        if (active) {
          setOrders(res.data || []);
        }
      })
      .catch(() => {
        if (active) showToast('error', 'Không thể tải danh sách đơn hàng chờ duyệt');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey, fromDate, toDate]);

  // Tải lịch sử duyệt khi mở modal thẩm định
  useEffect(() => {
    let active = true;
    if (!reviewOrder?.id) {
      setApprovalHistory([]);
      return;
    }
    setIsLoadingHistory(true);
    ordersService
      .getApprovalHistory(reviewOrder.id)
      .then((history) => {
        if (active) setApprovalHistory(history || []);
      })
      .catch(() => {
        if (active) setApprovalHistory([]);
      })
      .finally(() => {
        if (active) setIsLoadingHistory(false);
      });

    return () => {
      active = false;
    };
  }, [reviewOrder?.id]);

  // Phân loại đơn theo các tiêu chí ngoại lệ (S4-05)
  const isOrderPendingApproval = (order: Order): boolean => {
    return (
      order.status === 'PENDING_APPROVAL' ||
      order.status === 'PENDING_INVENTORY_APPROVAL' ||
      (order.status === 'PENDING' && (Boolean(order.requiresApproval) || Boolean(order.isCreditLimitExceeded)))
    );
  };

  const isOrderCreditLimitViolation = (order: Order): boolean => {
    return Boolean(
      order.isCreditLimitExceeded ||
      order.creditLimitExceededAmount ||
      (order.warningNote && order.warningNote.toLowerCase().includes('hạn mức')) ||
      order.approvalReasons?.some((r) => r.toLowerCase().includes('hạn mức'))
    );
  };

  const isOrderFloorPriceViolation = (order: Order): boolean => {
    return Boolean(
      order.lines?.some((l) => l.requiresApproval || (l.minPrice && l.unitPrice < l.minPrice)) ||
      (order.warningNote && order.warningNote.toLowerCase().includes('giá sàn')) ||
      order.approvalReasons?.some((r) => r.toLowerCase().includes('giá sàn'))
    );
  };

  const isOrderFromPortal = (order: Order): boolean => {
    return Boolean(
      order.createdSource === 'AGENCY_PORTAL' ||
      order.createdSource === 'PORTAL' ||
      order.orderCode?.startsWith('DH-PORTAL') ||
      order.note?.toLowerCase().includes('portal')
    );
  };

  // Lọc tập đơn theo tab và điều kiện tìm kiếm
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Phân loại theo tab ngoại lệ
      if (activeTab === 'HISTORY') {
        const isHistory = ['APPROVED', 'REJECTED', 'RETURNED_FOR_UPDATE'].includes(order.status);
        if (!isHistory) return false;
      } else {
        // Mặc định các tab khác chỉ hiển thị đơn CẦN DUYỆT
        if (!isOrderPendingApproval(order)) return false;

        if (activeTab === 'CREDIT_LIMIT' && !isOrderCreditLimitViolation(order)) return false;
        if (activeTab === 'BELOW_FLOOR_PRICE' && !isOrderFloorPriceViolation(order)) return false;
        if (activeTab === 'PORTAL_ORDER' && !isOrderFromPortal(order)) return false;
      }

      // 2. Lọc theo nhân viên kinh doanh
      if (selectedSalesRep !== 'ALL') {
        if (order.salesRepId !== selectedSalesRep && order.salesRepName !== selectedSalesRep) {
          return false;
        }
      }

      // 3. Lọc theo từ khóa tìm kiếm
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchCode = order.orderCode?.toLowerCase().includes(q);
        const matchCust = order.customerName?.toLowerCase().includes(q) || order.customerCode?.toLowerCase().includes(q);
        const matchRep = order.salesRepName?.toLowerCase().includes(q);
        if (!matchCode && !matchCust && !matchRep) return false;
      }

      return true;
    });
  }, [orders, activeTab, selectedSalesRep, searchTerm]);

  // Thống kê số lượng các nhóm ngoại lệ
  const stats = useMemo(() => {
    const pendingPool = orders.filter(isOrderPendingApproval);
    const totalPendingCount = pendingPool.length;
    const totalPendingAmount = pendingPool.reduce((acc, o) => acc + (o.grandTotal || 0), 0);
    const creditCount = pendingPool.filter(isOrderCreditLimitViolation).length;
    const priceCount = pendingPool.filter(isOrderFloorPriceViolation).length;
    const portalCount = pendingPool.filter(isOrderFromPortal).length;
    const processedCount = orders.filter((o) =>
      ['APPROVED', 'REJECTED', 'RETURNED_FOR_UPDATE'].includes(o.status)
    ).length;

    return {
      totalPendingCount,
      totalPendingAmount,
      creditCount,
      priceCount,
      portalCount,
      processedCount,
    };
  }, [orders]);

  // Danh sách nhân viên kinh doanh
  const salesRepOptions = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      if (o.salesRepName) map.set(o.salesRepId || o.salesRepName, o.salesRepName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  // Phân trang danh sách hiển thị
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Xử lý gửi quyết định phê duyệt (Duyệt / Từ chối / Trả lại) (S4-05)
  const handleSubmitDecision = async () => {
    if (!reviewOrder?.id || !decisionAction) return;

    if (decisionAction !== 'APPROVE' && !decisionComment.trim()) {
      showToast('error', 'Vui lòng nhập lý do cụ thể khi Từ chối hoặc Trả lại yêu cầu sửa');
      return;
    }

    setIsSubmitting(true);
    try {
      if (decisionAction === 'APPROVE') {
        // Duyệt đơn và kích hoạt giữ chỗ tồn kho 24 giờ (SN-180 & S5-06)
        await ordersService.approveOrder(reviewOrder.id);
        showToast('success', `Đã duyệt đơn ${reviewOrder.orderCode}. Đã kích hoạt giữ chỗ tồn kho 24h!`);
      } else {
        // Từ chối hoặc Trả lại yêu cầu sửa
        await ordersService.decideOrder(reviewOrder.id, decisionAction, decisionComment.trim());
        const actionLabel = decisionAction === 'REJECT' ? 'Từ chối' : 'Trả lại cho NVKD chỉnh sửa';
        showToast('success', `Đã ${actionLabel} đơn hàng ${reviewOrder.orderCode}`);
      }

      setReviewOrder(null);
      setDecisionAction(null);
      setDecisionComment('');
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi xử lý phê duyệt';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Duyệt nhanh trực tiếp từ bảng danh sách
  const handleQuickApprove = async (order: Order) => {
    if (!order.id) return;
    try {
      await ordersService.approveOrder(order.id);
      showToast('success', `Đã duyệt đơn ${order.orderCode || ''}. Tồn kho đã được giữ chỗ!`);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể duyệt đơn';
      showToast('error', msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TIÊU ĐỀ TRANG & NÚT LÀM MỚI ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Phê duyệt đơn hàng
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Hàng đợi thẩm định và phê duyệt các đơn hàng ngoại lệ: vi phạm giá sàn, vượt hạn mức nợ hoặc đơn đặt qua Portal (Mã S4-05)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Làm mới hàng đợi phê duyệt"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 4 THẺ CHỈ SỐ NHANH (KPI SUMMARY) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tổng đơn chờ duyệt */}
        <div
          onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'ALL'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cần duyệt khẩn cấp</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-700">{stats.totalPendingCount}</span>
            <span className="text-xs text-slate-400 font-medium">đơn</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-600 truncate">
            Tổng giá trị: {formatCurrency(stats.totalPendingAmount)}
          </p>
        </div>

        {/* Card 2: Vượt hạn mức nợ */}
        <div
          onClick={() => { setActiveTab('CREDIT_LIMIT'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'CREDIT_LIMIT'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Vượt hạn mức nợ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700">{stats.creditCount}</span>
            <span className="text-xs text-slate-400 font-medium">đơn</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-800/80 font-medium">Cần kiểm tra công nợ</p>
        </div>

        {/* Card 3: Bán dưới giá sàn */}
        <div
          onClick={() => { setActiveTab('BELOW_FLOOR_PRICE'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'BELOW_FLOOR_PRICE'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Dưới giá sàn tối thiểu</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-700">{stats.priceCount}</span>
            <span className="text-xs text-slate-400 font-medium">đơn</span>
          </div>
          <p className="mt-1 text-[11px] text-rose-800/80 font-medium">Vi phạm biên lợi nhuận</p>
        </div>

        {/* Card 4: Đơn Portal tự đặt */}
        <div
          onClick={() => { setActiveTab('PORTAL_ORDER'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'PORTAL_ORDER'
              ? 'bg-sky-50/70 border-sky-300 ring-2 ring-sky-200'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đại lý tự đặt (Portal)</span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-sky-700">{stats.portalCount}</span>
            <span className="text-xs text-slate-400 font-medium">đơn</span>
          </div>
          <p className="mt-1 text-[11px] text-sky-800/80 font-medium">Cần xác nhận đơn mới</p>
        </div>
      </div>

      {/* ── BỘ LỌC ĐA TIÊU CHÍ & TABS PHÂN LOẠI ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
        {/* Hàng 1: Tabs phân loại ngoại lệ */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs border-b border-slate-100 pb-2.5">
          <button
            type="button"
            onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tất cả chờ duyệt ({stats.totalPendingCount})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('CREDIT_LIMIT'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'CREDIT_LIMIT'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Vượt hạn mức nợ ({stats.creditCount})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('BELOW_FLOOR_PRICE'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'BELOW_FLOOR_PRICE'
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Dưới giá sàn ({stats.priceCount})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('PORTAL_ORDER'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'PORTAL_ORDER'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Đơn từ Cổng Đại lý ({stats.portalCount})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('HISTORY'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ml-auto ${
              activeTab === 'HISTORY'
                ? 'bg-slate-800 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Lịch sử đã xét duyệt ({stats.processedCount})
          </button>
        </div>

        {/* Hàng 2: Tìm kiếm + Lọc NVKD + Khoảng ngày */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã đơn, tên đại lý, mã đại lý, nhân viên kinh doanh..."
              className="w-full pl-10 pr-9 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Lọc theo NVKD */}
            <select
              value={selectedSalesRep}
              onChange={(e) => { setSelectedSalesRep(e.target.value); setCurrentPage(1); }}
              className="text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              <option value="ALL">Tất cả NVKD</option>
              {salesRepOptions.map((rep) => (
                <option key={rep.id} value={rep.id}>{rep.name}</option>
              ))}
            </select>

            {/* Khoảng ngày */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center gap-1 bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 h-9 min-w-[125px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-500 font-medium">Từ:</span>
                <DateInput
                  compact={true}
                  value={fromDate}
                  onChange={(val) => { setFromDate(val); setCurrentPage(1); }}
                  max={toDate || undefined}
                  className="w-full text-xs"
                />
              </div>

              <div className="relative flex items-center gap-1 bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 h-9 min-w-[125px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-500 font-medium">Đến:</span>
                <DateInput
                  compact={true}
                  value={toDate}
                  onChange={(val) => { setToDate(val); setCurrentPage(1); }}
                  min={fromDate || undefined}
                  className="w-full text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH ĐƠN HÀNG CHỜ DUYỆT ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs font-semibold">Đang tải hàng đợi phê duyệt...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {activeTab === 'HISTORY'
                ? 'Chưa có lịch sử phê duyệt đơn hàng nào'
                : 'Không có đơn hàng nào cần phê duyệt lúc này!'}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {activeTab === 'HISTORY'
                ? 'Các đơn sau khi được Quản lý Duyệt, Từ chối hoặc Trả lại sẽ được lưu vết tại đây.'
                : 'Tất cả các đơn hàng hợp lệ đã được tự động duyệt hoặc chuyển tiếp vào quy trình xuất kho.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Mã đơn & Ngày tạo</th>
                  <th className="px-4 py-3.5">Đại lý</th>
                  <th className="px-3 py-3.5">NVKD phụ trách</th>
                  <th className="px-4 py-3.5">Lý do vi phạm ngoại lệ (S4-05)</th>
                  <th className="px-4 py-3.5 text-right">Tổng tiền đơn</th>
                  <th className="px-3 py-3.5 text-center">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedOrders.map((order) => {
                  const isCreditIssue = isOrderCreditLimitViolation(order);
                  const isPriceIssue = isOrderFloorPriceViolation(order);
                  const isPortal = isOrderFromPortal(order);
                  const isPending = isOrderPendingApproval(order);

                  return (
                    <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Mã đơn & Ngày tạo */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-indigo-700 font-mono text-xs">
                            {order.orderCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Ngày tạo: {formatDate(order.deliveryDate || '')}
                        </p>
                      </td>

                      {/* Đại lý */}
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900 line-clamp-1" title={order.customerName}>
                          {order.customerName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Mã: {order.customerCode || '---'} {order.customerGroup && `· ${order.customerGroup}`}
                        </p>
                      </td>

                      {/* NVKD */}
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          {order.salesRepName || 'Trần Văn Long'}
                        </span>
                      </td>

                      {/* Lý do vi phạm ngoại lệ */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {isCreditIssue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <ShieldAlert className="w-3 h-3 text-amber-600" />
                              Vượt hạn mức nợ {order.creditLimitExceededAmount ? `(+${formatCurrency(order.creditLimitExceededAmount)})` : ''}
                            </span>
                          )}
                          {isPriceIssue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <TrendingDown className="w-3 h-3 text-rose-600" />
                              Bán dưới giá sàn tối thiểu
                            </span>
                          )}
                          {isPortal && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                              <ShoppingBag className="w-3 h-3 text-sky-600" />
                              Đại lý tự đặt qua Cổng Portal
                            </span>
                          )}
                          {!isCreditIssue && !isPriceIssue && !isPortal && (
                            <span className="text-[11px] text-slate-500">
                              {order.warningNote || order.note || 'Yêu cầu quản lý thẩm định'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tổng tiền đơn */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatCurrency(order.grandTotal)}
                        </span>
                        {order.totalDiscount > 0 && (
                          <span className="block text-[10px] text-emerald-600 font-semibold">
                            CK: -{formatCurrency(order.totalDiscount)}
                          </span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-3 py-3.5 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            <Clock className="w-3 h-3" /> Chờ duyệt
                          </span>
                        ) : order.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Đã duyệt
                          </span>
                        ) : order.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3" /> Từ chối
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {order.status}
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewOrder(order);
                              setDecisionAction(null);
                              setDecisionComment('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                            title="Mở hồ sơ thẩm định chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Thẩm định</span>
                          </button>

                          {isPending && (
                            <button
                              type="button"
                              onClick={() => void handleQuickApprove(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                              title="Duyệt đơn nhanh và giữ chỗ tồn kho 24h"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Duyệt</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        {filteredOrders.length > pageSize && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredOrders.length)} trong tổng số {filteredOrders.length} đơn
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL THẨM ĐỊNH CHI TIẾT & RA QUYẾT ĐỊNH PHÊ DUYỆT (S4-05)            */}
      {/* ===================================================================== */}
      {reviewOrder && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                      Hồ sơ thẩm định đơn hàng {reviewOrder.orderCode}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Chờ Quản lý duyệt
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đại lý: <strong>{reviewOrder.customerName}</strong> ({reviewOrder.customerCode || '---'}) · NVKD: <strong>{reviewOrder.salesRepName || 'Trần Văn Long'}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReviewOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Cảnh báo vi phạm nổi bật */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Nguyên nhân đơn hàng chuyển sang Chờ duyệt (Ngoại lệ S4-05):</span>
                </div>
                <div className="space-y-1 text-xs text-amber-800 pl-6">
                  {isOrderCreditLimitViolation(reviewOrder) && (
                    <p className="flex items-center gap-1.5 font-medium">
                      • <strong>Vượt hạn mức nợ:</strong> Tổng giá trị đơn hàng ({formatCurrency(reviewOrder.grandTotal)}) cộng với dư nợ hiện tại vượt quá hạn mức công nợ cho phép của đại lý.
                    </p>
                  )}
                  {isOrderFloorPriceViolation(reviewOrder) && (
                    <p className="flex items-center gap-1.5 font-medium">
                      • <strong>Bán dưới giá sàn:</strong> Có dòng sản phẩm được áp đơn giá thấp hơn giá sàn tối thiểu trong bảng giá hiệu lực.
                    </p>
                  )}
                  {isOrderFromPortal(reviewOrder) && (
                    <p className="flex items-center gap-1.5 font-medium">
                      • <strong>Đơn từ Cổng Đại lý (Portal):</strong> Đơn hàng do đại lý tự khởi tạo trên mạng, yêu cầu xác nhận trước khi lập lệnh giữ hàng.
                    </p>
                  )}
                  {reviewOrder.warningNote && (
                    <p className="italic text-slate-600 mt-1">Ghi chú vi phạm: "{reviewOrder.warningNote}"</p>
                  )}
                </div>
              </div>

              {/* Tabs chuyển đổi nội dung thẩm định */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('ITEMS')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDetailTab === 'ITEMS'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Dòng hàng & So khớp giá sàn ({reviewOrder.lines?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('CREDIT')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDetailTab === 'CREDIT'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Đối soát Hạn mức công nợ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('HISTORY')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    activeDetailTab === 'HISTORY'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Lịch sử xét duyệt ({approvalHistory.length})
                </button>
              </div>

              {/* Tab 1: Danh sách mặt hàng & So khớp giá sàn */}
              {activeDetailTab === 'ITEMS' && (
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5">Sản phẩm / SKU</th>
                          <th className="px-2.5 py-2.5 text-center">ĐVT</th>
                          <th className="px-2.5 py-2.5 text-center">Số lượng</th>
                          <th className="px-3 py-2.5 text-right">Đơn giá bán</th>
                          <th className="px-3 py-2.5 text-right">Giá sàn tối thiểu</th>
                          <th className="px-3 py-2.5 text-right">Thành tiền</th>
                          <th className="px-3 py-2.5 text-center">Đánh giá giá sàn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reviewOrder.lines?.map((line, idx) => {
                          const isBelowFloor = Boolean(line.minPrice && line.unitPrice < line.minPrice);
                          return (
                            <tr key={idx} className={isBelowFloor ? 'bg-rose-50/50' : ''}>
                              <td className="px-3.5 py-2.5">
                                <p className="font-bold text-slate-900">{line.productName}</p>
                                <span className="text-[10px] font-mono text-slate-500">{line.productSku}</span>
                              </td>
                              <td className="px-2.5 py-2.5 text-center font-medium text-slate-600">{line.unit}</td>
                              <td className="px-2.5 py-2.5 text-center font-bold text-slate-900">{line.quantity}</td>
                              <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                                {formatCurrency(line.unitPrice)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-600">
                                {line.minPrice ? formatCurrency(line.minPrice) : '---'}
                              </td>
                              <td className="px-3 py-2.5 text-right font-extrabold text-indigo-700">
                                {formatCurrency(line.lineTotal)}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {isBelowFloor ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    <TrendingDown className="w-3 h-3" /> Dưới sàn
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                    <Check className="w-3 h-3" /> Hợp lệ
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Tổng kết tiền */}
                  <div className="flex justify-end gap-6 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500">Tiền hàng: </span>
                      <strong className="text-slate-800">{formatCurrency(reviewOrder.subtotal)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Chiết khấu: </span>
                      <strong className="text-emerald-700">-{formatCurrency(reviewOrder.totalDiscount)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Tổng thanh toán: </span>
                      <strong className="text-base text-indigo-700 font-extrabold">{formatCurrency(reviewOrder.grandTotal)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Đối soát Hạn mức công nợ */}
              {activeDetailTab === 'CREDIT' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[11px] text-slate-500 font-semibold block">Hạn mức nợ tối đa:</span>
                      <span className="text-base font-extrabold text-slate-900 mt-1 block">
                        {formatCurrency(50000000)}
                      </span>
                      <span className="text-[10px] text-slate-400">Tối đa 30 ngày nợ</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[11px] text-slate-500 font-semibold block">Dư nợ hiện tại:</span>
                      <span className="text-base font-extrabold text-slate-900 mt-1 block">
                        {formatCurrency(35000000)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Chưa có nợ quá hạn</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50">
                      <span className="text-[11px] text-rose-600 font-semibold block">Dự kiến nợ sau đơn này:</span>
                      <span className="text-base font-extrabold text-rose-700 mt-1 block">
                        {formatCurrency(35000000 + reviewOrder.grandTotal)}
                      </span>
                      <span className="text-[10px] text-rose-700 font-bold">
                        Vượt hạn mức: +{formatCurrency(Math.max(0, (35000000 + reviewOrder.grandTotal) - 50000000))}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      Quy tắc nghiệp vụ kiểm soát vốn (Mục 6.3):
                    </p>
                    <p className="mt-1 text-blue-700">
                      Đại lý chưa có khoản nợ quá hạn nghiêm trọng. Quản lý có thể chấp thuận duyệt ngoại lệ nếu đại lý cam kết thanh toán đợt hàng trước trong tuần này.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Lịch sử xét duyệt */}
              {activeDetailTab === 'HISTORY' && (
                <div className="space-y-3">
                  {isLoadingHistory ? (
                    <div className="p-8 text-center text-slate-400 text-xs">Đang tải lịch sử...</div>
                  ) : approvalHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Chưa có lịch sử xét duyệt trước đó cho đơn hàng này.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {approvalHistory.map((h) => (
                        <div key={h.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">
                              {h.approverName} ({h.approverRoles?.join(', ') || 'Quản lý'})
                            </span>
                            <span className="text-[11px] text-slate-400">{formatDate(h.createdAt)}</span>
                          </div>
                          <p className="text-slate-600">
                            Hành động: <strong>{h.action}</strong>
                          </p>
                          {h.comment && (
                            <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-100 italic">
                              "{h.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Khu vực quyết định phê duyệt */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                <label className="text-xs font-bold text-slate-800 block">
                  Ý kiến chỉ đạo / Lý do phê duyệt (Bắt buộc khi Từ chối hoặc Trả lại):
                </label>
                <textarea
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  placeholder="Nhập ghi chú phê duyệt hoặc lý do yêu cầu sửa đổi..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <span className="text-[11px] text-slate-500">
                    * Bấm <strong>Duyệt đơn</strong> sẽ tự động kích hoạt giữ chỗ tồn kho 24h.
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Nút Từ chối */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setDecisionAction('REJECT');
                        void handleSubmitDecision();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Từ chối</span>
                    </button>

                    {/* Nút Trả lại yêu cầu sửa */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setDecisionAction('RETURN_FOR_UPDATE');
                        void handleSubmitDecision();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                      <span>Trả lại sửa</span>
                    </button>

                    {/* Nút Duyệt đơn & Giữ tồn kho */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setDecisionAction('APPROVE');
                        void handleSubmitDecision();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Duyệt đơn & Giữ tồn kho</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
