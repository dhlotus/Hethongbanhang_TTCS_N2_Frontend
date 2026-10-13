import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  CornerUpLeft,
  Eye,
  RefreshCw,
  Search,
  Clock,
  Calendar,
  X,
  Check,
  DollarSign,
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

/** Chuyển mã nhóm đại lý sang tiếng Việt */
const formatCustomerGroup = (group?: string): string => {
  if (!group) return '';
  const g = group.toUpperCase();
  if (g.includes('LEVEL_1') || g === 'AGENT_LEVEL_1') return 'Đại lý Cấp 1';
  if (g.includes('LEVEL_2') || g === 'AGENT_LEVEL_2') return 'Đại lý Cấp 2';
  if (g.includes('RETAIL')) return 'Khách lẻ';
  return group;
};

/** Chuyển hành động duyệt sang tiếng Việt */
const formatApprovalAction = (action?: string): string => {
  if (!action) return '---';
  switch (action) {
    case 'APPROVE':
      return 'Đã duyệt';
    case 'REJECT':
      return 'Đã từ chối';
    case 'RETURN_FOR_UPDATE':
      return 'Đã trả lại yêu cầu sửa';
    default:
      return action;
  }
};

export const OrderApprovalsPage: React.FC = () => {
  // Danh sách đơn hàng
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Bộ lọc
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
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
        limit: 200,
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

  // Kiểm tra đơn có phải đang ở trạng thái Chờ duyệt hay không (bao gồm PENDING, PENDING_APPROVAL, PENDING_INVENTORY_APPROVAL)
  const isOrderPendingApproval = (order: Order): boolean => {
    return (
      order.status === 'PENDING' ||
      order.status === 'PENDING_APPROVAL' ||
      order.status === 'PENDING_INVENTORY_APPROVAL'
    );
  };

  // Lọc tập đơn theo tab và điều kiện tìm kiếm
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Phân loại theo tab
      if (activeTab === 'HISTORY') {
        const isHistory = ['APPROVED', 'REJECTED', 'RETURNED_FOR_UPDATE'].includes(order.status);
        if (!isHistory) return false;
      } else {
        // Tab Chờ duyệt: hiển thị toàn bộ đơn chờ duyệt
        if (!isOrderPendingApproval(order)) return false;
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

  // Thống kê số lượng
  const stats = useMemo(() => {
    const pendingList = orders.filter(isOrderPendingApproval);
    const pendingCount = pendingList.length;
    const pendingAmount = pendingList.reduce((acc, o) => acc + (o.grandTotal || 0), 0);
    const approvedCount = orders.filter((o) => o.status === 'APPROVED').length;
    const rejectedCount = orders.filter((o) => ['REJECTED', 'RETURNED_FOR_UPDATE'].includes(o.status)).length;
    const totalProcessed = orders.filter((o) =>
      ['APPROVED', 'REJECTED', 'RETURNED_FOR_UPDATE'].includes(o.status)
    ).length;

    return {
      pendingCount,
      pendingAmount,
      approvedCount,
      rejectedCount,
      totalProcessed,
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

  // Xử lý gửi quyết định phê duyệt (Duyệt / Từ chối / Trả lại)
  const handleSubmitDecision = async () => {
    if (!reviewOrder?.id || !decisionAction) return;

    if (decisionAction !== 'APPROVE' && !decisionComment.trim()) {
      showToast('error', 'Vui lòng nhập lý do cụ thể khi Từ chối hoặc Trả lại yêu cầu sửa');
      return;
    }

    setIsSubmitting(true);
    try {
      if (decisionAction === 'APPROVE') {
        await ordersService.approveOrder(reviewOrder.id);
        showToast('success', `Đã duyệt đơn hàng ${reviewOrder.orderCode}. Đã kích hoạt giữ chỗ tồn kho 24 giờ!`);
      } else {
        await ordersService.decideOrder(reviewOrder.id, decisionAction, decisionComment.trim());
        const actionLabel = decisionAction === 'REJECT' ? 'Từ chối' : 'Trả lại cho nhân viên kinh doanh chỉnh sửa';
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
                Danh sách các đơn hàng đang chờ Quản lý kinh doanh xem xét và phê duyệt
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
            title="Làm mới danh sách chờ duyệt"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 4 THẺ CHỈ SỐ NHANH (KPI SUMMARY THUẦN VIỆT) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Số đơn chờ duyệt */}
        <div
          onClick={() => { setActiveTab('PENDING'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'PENDING'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đơn chờ duyệt</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-700">{stats.pendingCount}</span>
            <span className="text-xs text-slate-400 font-medium">đơn</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-600 truncate">
            Cần xem xét xử lý
          </p>
        </div>

        {/* Card 2: Tổng giá trị chờ duyệt */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng tiền chờ duyệt</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-extrabold text-emerald-700 truncate">
              {formatCurrency(stats.pendingAmount)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Toàn bộ đơn chờ duyệt</p>
        </div>

        {/* Card 3: Đã duyệt */}
        <div
          onClick={() => { setActiveTab('HISTORY'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'HISTORY'
              ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-200'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã phê duyệt</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">{stats.approvedCount}</span>
            <span className="text-xs text-slate-400 font-medium">đơn</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700/80 font-medium">Đã chuyển sang giữ hàng</p>
        </div>

        {/* Card 4: Đã từ chối / Trả lại */}
        <div
          onClick={() => { setActiveTab('HISTORY'); setCurrentPage(1); }}
          className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs cursor-pointer hover:border-slate-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Từ chối / Trả lại</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-700">{stats.rejectedCount}</span>
            <span className="text-xs text-slate-400 font-medium">đơn</span>
          </div>
          <p className="mt-1 text-[11px] text-rose-700/80 font-medium">Cần chỉnh sửa hoặc hủy</p>
        </div>
      </div>

      {/* ── BỘ LỌC ĐA TIÊU CHÍ & TABS PHÂN LOẠI ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
        {/* Hàng 1: 2 Tabs rõ ràng */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 text-xs">
          <button
            type="button"
            onClick={() => { setActiveTab('PENDING'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Chờ duyệt ({stats.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('HISTORY'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Lịch sử đã xét duyệt ({stats.totalProcessed})
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

      {/* ── BẢNG DANH SÁCH ĐƠN HÀNG CHỜ DUYỆT (ĐÃ BỎ CỘT VI PHẠM) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs font-semibold">Đang tải danh sách đơn hàng...</p>
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
                : 'Tất cả các đơn hàng đã được xử lý hoặc tự động chuyển tiếp vào quy trình xuất kho.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Mã đơn</th>
                  <th className="px-4 py-3.5">Đại lý</th>
                  <th className="px-3 py-3.5">NVKD / Khu vực</th>
                  <th className="px-3 py-3.5">Ngày giao</th>
                  <th className="px-4 py-3.5 text-right">Tổng phải thu</th>
                  <th className="px-3 py-3.5 text-center">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedOrders.map((order) => {
                  const isPending = isOrderPendingApproval(order);

                  return (
                    <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Mã đơn & Ngày đặt */}
                      <td className="px-4 py-3.5">
                        <span className="font-extrabold text-indigo-700 font-mono text-xs block">
                          {order.orderCode}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(order.createdAt || order.deliveryDate)}
                        </span>
                      </td>

                      {/* Đại lý */}
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900 line-clamp-1" title={order.customerName}>
                          {order.customerName}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {order.customerCode || '---'} {order.customerGroup && `· ${formatCustomerGroup(order.customerGroup)}`}
                        </p>
                      </td>

                      {/* NVKD / Khu vực */}
                      <td className="px-3 py-3.5">
                        <p className="font-semibold text-slate-800">
                          {order.salesRepName || 'Trần Văn Long'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {order.region || 'Miền Nam'}
                        </p>
                      </td>

                      {/* Ngày giao */}
                      <td className="px-3 py-3.5 font-medium text-slate-700">
                        {formatDate(order.deliveryDate)}
                      </td>

                      {/* Tổng phải thu */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatCurrency(order.grandTotal)}
                        </span>
                        {order.totalDiscount > 0 && (
                          <span className="block text-[10px] text-emerald-600 font-semibold">
                            Chiết khấu: -{formatCurrency(order.totalDiscount)}
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
                            {order.status === 'RETURNED_FOR_UPDATE' ? 'Trả lại sửa' : order.status}
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
                              title="Duyệt đơn và giữ chỗ tồn kho 24 giờ"
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
      {/* MODAL THẨM ĐỊNH CHI TIẾT & RA QUYẾT ĐỊNH PHÊ DUYỆT                    */}
      {/* ===================================================================== */}
      {reviewOrder && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                      Hồ sơ thẩm định đơn hàng {reviewOrder.orderCode}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Chờ duyệt
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
                  Dòng hàng ({reviewOrder.lines?.length || 0})
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
                  Kiểm tra công nợ
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

              {/* Tab 1: Danh sách mặt hàng */}
              {activeDetailTab === 'ITEMS' && (
                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5">Sản phẩm / Mã hàng</th>
                          <th className="px-2.5 py-2.5 text-center">Đơn vị</th>
                          <th className="px-2.5 py-2.5 text-center">Số lượng</th>
                          <th className="px-3 py-2.5 text-right">Đơn giá bán</th>
                          <th className="px-3 py-2.5 text-right">Chiết khấu</th>
                          <th className="px-3 py-2.5 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reviewOrder.lines?.map((line, idx) => (
                          <tr key={idx}>
                            <td className="px-3.5 py-2.5">
                              <p className="font-bold text-slate-900">{line.productName}</p>
                              <span className="text-[10px] font-mono text-slate-500">{line.productSku}</span>
                            </td>
                            <td className="px-2.5 py-2.5 text-center font-medium text-slate-600">{line.unit}</td>
                            <td className="px-2.5 py-2.5 text-center font-bold text-slate-900">{line.quantity}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                              {formatCurrency(line.unitPrice)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-emerald-700">
                              {line.discountPercent > 0 ? `${line.discountPercent}%` : '---'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-extrabold text-indigo-700">
                              {formatCurrency(line.lineTotal)}
                            </td>
                          </tr>
                        ))}
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

              {/* Tab 2: Kiểm tra công nợ */}
              {activeDetailTab === 'CREDIT' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[11px] text-slate-500 font-semibold block">Hạn mức nợ tối đa:</span>
                      <span className="text-base font-extrabold text-slate-900 mt-1 block">
                        {formatCurrency(50000000)}
                      </span>
                      <span className="text-[10px] text-slate-400">Thời hạn tối đa 30 ngày</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[11px] text-slate-500 font-semibold block">Dư nợ hiện tại:</span>
                      <span className="text-base font-extrabold text-slate-900 mt-1 block">
                        {formatCurrency(35000000)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Không có nợ quá hạn</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50">
                      <span className="text-[11px] text-indigo-700 font-semibold block">Dự kiến nợ sau đơn này:</span>
                      <span className="text-base font-extrabold text-indigo-800 mt-1 block">
                        {formatCurrency(35000000 + reviewOrder.grandTotal)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Còn lại: {formatCurrency(Math.max(0, 50000000 - (35000000 + reviewOrder.grandTotal)))}
                      </span>
                    </div>
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
                            Hành động: <strong>{formatApprovalAction(h.action)}</strong>
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
                    * Bấm <strong>Duyệt đơn</strong> sẽ tự động kích hoạt giữ chỗ tồn kho 24 giờ.
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
