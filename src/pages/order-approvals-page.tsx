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
  AlertCircle,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { Pagination } from '../components/pagination';
import { DateInput } from '../components/date-input';
import { ordersService } from '../services/orders.service';
import { productsService } from '../services/products.service';
import type { Product } from '../types/products';
import type {
  Order,
  OrderStatus,
  OrderApprovalAction,
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



/** Render huy hiệu trạng thái đơn hàng chuẩn xác */
const renderStatusBadge = (status: OrderStatus, isPending: boolean) => {
  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
        <Clock className="w-3.5 h-3.5" /> Chờ duyệt
      </span>
    );
  }
  switch (status) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
          <XCircle className="w-3.5 h-3.5" /> Từ chối
        </span>
      );
    case 'RETURNED_FOR_UPDATE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <CornerUpLeft className="w-3.5 h-3.5" /> Trả lại sửa
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
          {status}
        </span>
      );
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

  // Phân trang chuẩn quản lý đại lý
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal thẩm định chi tiết & ra quyết định
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'ITEMS' | 'CREDIT'>('ITEMS');
  const [decisionComment, setDecisionComment] = useState('');
  const [modalValidationError, setModalValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bộ lọc nhanh theo tình trạng tồn kho khi ở tab Chờ duyệt
  const [stockFilter, setStockFilter] = useState<'ALL' | 'SUFFICIENT' | 'INSUFFICIENT'>('ALL');

  // Dữ liệu sản phẩm & tồn kho khả dụng để kiểm tra đối soát trực tiếp
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map());
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Tải danh mục tồn kho toàn hệ thống để kiểm tra trước cho toàn bộ đơn hàng
  useEffect(() => {
    let active = true;
    setIsLoadingStock(true);
    productsService
      .getProducts({ limit: 100 })
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res.data || [];
        const map = new Map<string, Product>();
        list.forEach((p) => {
          if (p.sku) map.set(p.sku.toUpperCase(), p);
          if (p.id) map.set(p.id, p);
        });
        setProductsMap(map);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingStock(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Hàm kiểm tra nhanh tình trạng tồn kho của một đơn hàng
  const checkOrderStock = (order: Order) => {
    if (!order.lines || order.lines.length === 0) {
      return { isSufficient: true, outOfStockLines: [] };
    }

    const outOfStockLines: Array<{
      productName: string;
      sku: string;
      required: number;
      available: number;
      unit: string;
    }> = [];

    for (const line of order.lines) {
      const sku = (line.productSku || '').trim().toUpperCase();
      const product = productsMap.get(sku) || productsMap.get(line.productId || '');
      const convRate = line.conversionRate > 0 ? line.conversionRate : 1;
      const required = line.baseQuantity || Math.round((line.quantity || 0) * convRate);

      const physical = product?.physicalStock ?? product?.stockQuantity ?? 1000;
      const reserved = product?.reservedStock ?? 0;
      const available = product?.availableStock !== undefined
        ? product.availableStock
        : (physical - reserved);

      if (available < required) {
        outOfStockLines.push({
          productName: line.productName,
          sku,
          required,
          available,
          unit: product?.baseUnit || line.unit || 'Lon',
        });
      }
    }

    return {
      isSufficient: outOfStockLines.length === 0,
      outOfStockLines,
    };
  };

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

      // 4. Lọc theo tình trạng tồn kho khi ở tab Chờ duyệt
      if (activeTab === 'PENDING' && stockFilter !== 'ALL') {
        const stockStatus = checkOrderStock(order);
        if (stockFilter === 'SUFFICIENT' && !stockStatus.isSufficient) return false;
        if (stockFilter === 'INSUFFICIENT' && stockStatus.isSufficient) return false;
      }

      return true;
    });
  }, [orders, activeTab, selectedSalesRep, searchTerm, stockFilter, productsMap]);

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

    // Đếm số đơn chờ duyệt đủ tồn và thiếu tồn
    const pendingStockStatuses = pendingList.map((o) => checkOrderStock(o));
    const pendingSufficientCount = pendingStockStatuses.filter((s) => s.isSufficient).length;
    const pendingInsufficientCount = pendingStockStatuses.filter((s) => !s.isSufficient).length;

    return {
      pendingCount,
      pendingAmount,
      approvedCount,
      rejectedCount,
      totalProcessed,
      pendingSufficientCount,
      pendingInsufficientCount,
    };
  }, [orders, productsMap]);

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

  // Kiểm tra tồn kho cho các dòng hàng của đơn đang thẩm định
  const stockCheckResults = useMemo(() => {
    if (!reviewOrder?.lines) return { outOfStockItems: [], linesStockInfo: [] };

    const linesStockInfo = reviewOrder.lines.map((line) => {
      const sku = (line.productSku || '').trim().toUpperCase();
      const product = productsMap.get(sku) || productsMap.get(line.productId || '');

      const convRate = line.conversionRate > 0 ? line.conversionRate : 1;
      const requiredBase = line.baseQuantity || Math.round((line.quantity || 0) * convRate);

      const physicalStock = product?.physicalStock ?? product?.stockQuantity ?? 1000;
      const reservedStock = product?.reservedStock ?? 0;
      const availableStock = product?.availableStock !== undefined
        ? product.availableStock
        : (physicalStock - reservedStock);
      const isSufficient = availableStock >= requiredBase;

      return {
        line,
        product,
        sku,
        requiredBase,
        physicalStock,
        reservedStock,
        availableStock,
        baseUnit: product?.baseUnit || line.unit || 'Lon',
        isSufficient,
      };
    });

    const outOfStockItems = linesStockInfo.filter((item) => !item.isSufficient);

    return { outOfStockItems, linesStockInfo };
  }, [reviewOrder?.lines, productsMap]);

  // Xử lý gửi quyết định phê duyệt (Duyệt / Từ chối / Trả lại)
  const handleDecisionSubmit = async (action: OrderApprovalAction) => {
    if (!reviewOrder?.id) return;

    // Bắt buộc nhập lý do khi Từ chối hoặc Trả lại yêu cầu sửa
    if (action !== 'APPROVE' && !decisionComment.trim()) {
      setModalValidationError('Vui lòng nhập lý do cụ thể khi Từ chối hoặc Trả lại yêu cầu sửa.');
      return;
    }

    setModalValidationError(null);
    setIsSubmitting(true);
    try {
      if (action === 'APPROVE') {
        await ordersService.approveOrder(reviewOrder.id);
        showToast('success', `Đã duyệt đơn hàng ${reviewOrder.orderCode || ''}.`);
      } else {
        await ordersService.decideOrder(reviewOrder.id, action, decisionComment.trim());
        const actionLabel = action === 'REJECT' ? 'Từ chối' : 'Trả lại cho nhân viên kinh doanh chỉnh sửa';
        showToast('success', `Đã ${actionLabel} đơn hàng ${reviewOrder.orderCode || ''}.`);
      }

      setReviewOrder(null);
      setDecisionComment('');
      setModalValidationError(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi xử lý phê duyệt';
      setModalValidationError(msg);
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

      {/* ── 4 THẺ CHỈ SỐ NHANH (KPI TĨNH, KHÔNG BẤM ĐƯỢC, BỎ CÁC NOTE NHỎ) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Số đơn chờ duyệt */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
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
        </div>

        {/* Card 3: Đã duyệt */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
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
        </div>

        {/* Card 4: Đã từ chối / Trả lại */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
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
        </div>
      </div>

      {/* ── BỘ LỌC ĐA TIÊU CHÍ & TABS PHÂN LOẠI ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
        {/* Hàng 1: 2 Tabs rõ ràng + Lọc nhanh tình trạng tồn kho */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5 text-xs">
          <div className="flex items-center gap-2">
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

          {/* Lọc nhanh theo tình trạng tồn kho khi ở tab Chờ duyệt */}
          {activeTab === 'PENDING' && (
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => { setStockFilter('ALL'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stockFilter === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({stats.pendingCount})
              </button>
              <button
                type="button"
                onClick={() => { setStockFilter('SUFFICIENT'); setCurrentPage(1); }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stockFilter === 'SUFFICIENT'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-100/60'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đủ tồn ({stats.pendingSufficientCount})</span>
              </button>
              <button
                type="button"
                onClick={() => { setStockFilter('INSUFFICIENT'); setCurrentPage(1); }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stockFilter === 'INSUFFICIENT'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:bg-rose-100/60'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Thiếu tồn ({stats.pendingInsufficientCount})</span>
              </button>
            </div>
          )}
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
                  <th className="px-3 py-3.5">NVKD</th>
                  <th className="px-3 py-3.5">Ngày giao</th>
                  <th className="px-4 py-3.5 text-right">Tổng phải thu</th>
                  <th className="px-3 py-3.5 text-center">Trạng thái</th>
                  <th className="px-4 py-3.5 text-center min-w-[210px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedOrders.map((order) => {
                  const isPending = isOrderPendingApproval(order);
                  const stockCheck = checkOrderStock(order);

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
                          {order.customerCode || '---'}
                        </p>
                      </td>

                      {/* NVKD */}
                      <td className="px-3 py-3.5">
                        <p className="font-semibold text-slate-800">
                          {order.salesRepName || 'Trần Văn Long'}
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

                      {/* Trạng thái & Cảnh báo tồn kho trước khi duyệt */}
                      <td className="px-3 py-3.5 text-center">
                        {isPending ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" /> Chờ duyệt
                            </span>
                            {stockCheck.isSufficient ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                title="Kho đủ hàng khả dụng để đáp ứng toàn bộ đơn này"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Đủ tồn kho
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                title={`Không đủ tồn khả dụng: ${stockCheck.outOfStockLines.map((l) => `${l.productName} (còn ${l.available}, cần ${l.required})`).join(', ')}`}
                              >
                                <AlertCircle className="w-2.5 h-2.5 text-rose-600" /> Thiếu tồn ({stockCheck.outOfStockLines.length})
                              </span>
                            )}
                          </div>
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
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewOrder(order);
                              setDecisionComment('');
                              setModalValidationError(null);
                            }}
                            className={`${
                              isPending ? 'w-[96px]' : 'px-3.5'
                            } inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer shrink-0`}
                            title={isPending ? 'Mở hồ sơ thẩm định chi tiết' : 'Xem chi tiết đơn hàng'}
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            <span>{isPending ? 'Thẩm định' : 'Xem chi tiết'}</span>
                          </button>

                          {isPending && (
                            stockCheck.isSufficient ? (
                              <button
                                type="button"
                                onClick={() => void handleQuickApprove(order)}
                                className="w-[90px] inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                                title="Duyệt đơn hàng ngay (kho đủ hàng)"
                              >
                                <Check className="w-3.5 h-3.5 shrink-0" />
                                <span>Duyệt</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={true}
                                className="w-[90px] inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-80 shrink-0"
                                title={`Không thể duyệt: Đơn có ${stockCheck.outOfStockLines.length} mặt hàng thiếu tồn (${stockCheck.outOfStockLines.map((l) => l.productName).join(', ')}). Bấm Thẩm định để xem chi tiết hoặc Trả lại sửa.`}
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>Thiếu tồn</span>
                              </button>
                            )
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

        {/* ── THANH PHÂN TRANG GẮN LIỀN CHÂN BẢNG CHUẨN QUẢN LÝ ĐẠI LÝ ── */}
        {filteredOrders.length > 0 && (
          <Pagination
            variant="default"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="đơn"
            showRecordRange={false}
            showFirstLast={false}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
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
                      {isOrderPendingApproval(reviewOrder) ? 'Hồ sơ thẩm định đơn hàng' : 'Chi tiết đơn hàng'} {reviewOrder.orderCode}
                    </h3>
                    {renderStatusBadge(reviewOrder.status, isOrderPendingApproval(reviewOrder))}
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
              </div>

              {/* Tab 1: Danh sách mặt hàng & Đối soát tồn kho trực tiếp */}
              {activeDetailTab === 'ITEMS' && (
                <div className="space-y-3">
                  {/* Alert cảnh báo tồn kho nếu có sản phẩm không đủ hàng */}
                  {stockCheckResults.outOfStockItems.length > 0 ? (
                    <div className="p-3.5 bg-rose-50/90 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-rose-800">
                          Phát hiện {stockCheckResults.outOfStockItems.length} sản phẩm không đủ tồn khả dụng để duyệt đơn:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                          {stockCheckResults.outOfStockItems.map((item) => (
                            <li key={item.sku}>
                              <strong>{item.line.productName}</strong>: Tồn khả dụng còn <strong>{item.availableStock.toLocaleString('vi-VN')} {item.baseUnit}</strong> (Tồn kho thực tế: {item.physicalStock.toLocaleString('vi-VN')}, Đã giữ cho đơn khác: {item.reservedStock.toLocaleString('vi-VN')}), nhưng đơn này yêu cầu <strong>{item.requiredBase.toLocaleString('vi-VN')} {item.baseUnit}</strong>.
                            </li>
                          ))}
                        </ul>
                        <p className="text-[11px] text-rose-700 pt-0.5">
                          💡 Bạn có thể bấm <strong>Trả lại sửa</strong> để NVKD chỉnh sửa lại số lượng hoặc liên hệ Thủ kho nhập thêm hàng.
                        </p>
                      </div>
                    </div>
                  ) : isOrderPendingApproval(reviewOrder) && !isLoadingStock ? (
                    <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Tồn kho khả dụng đầy đủ cho toàn bộ {reviewOrder.lines?.length || 0} sản phẩm trong đơn. Sẵn sàng phê duyệt!</span>
                    </div>
                  ) : null}

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5">Sản phẩm / Mã hàng</th>
                          <th className="px-2.5 py-2.5 text-center">Đơn vị</th>
                          <th className="px-2.5 py-2.5 text-center">Số lượng</th>
                          <th className="px-3 py-2.5 text-center">Tồn khả dụng</th>
                          <th className="px-3 py-2.5 text-right">Đơn giá bán</th>
                          <th className="px-3 py-2.5 text-right">Chiết khấu</th>
                          <th className="px-3 py-2.5 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reviewOrder.lines?.map((line, idx) => {
                          const itemStock = stockCheckResults.linesStockInfo[idx];

                          return (
                            <tr key={idx}>
                              <td className="px-3.5 py-2.5">
                                <p className="font-bold text-slate-900">{line.productName}</p>
                                <span className="text-[10px] font-mono text-slate-500">{line.productSku}</span>
                              </td>
                              <td className="px-2.5 py-2.5 text-center font-medium text-slate-600">{line.unit}</td>
                              <td className="px-2.5 py-2.5 text-center font-bold text-slate-900">{line.quantity}</td>
                              {/* Cột Tồn khả dụng trực quan */}
                              <td className="px-3 py-2.5 text-center">
                                {isLoadingStock ? (
                                  <span className="text-[10px] text-slate-400">Đang đối soát...</span>
                                ) : itemStock ? (
                                  <div>
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                        itemStock.isSufficient
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}
                                    >
                                      {itemStock.isSufficient ? (
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <AlertCircle className="w-3 h-3 text-rose-600" />
                                      )}
                                      {itemStock.availableStock.toLocaleString('vi-VN')} {itemStock.baseUnit}
                                    </span>
                                    <span className="block text-[10px] text-slate-400 mt-0.5">
                                      Kho: {itemStock.physicalStock.toLocaleString('vi-VN')} · Đã giữ: {itemStock.reservedStock.toLocaleString('vi-VN')}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400">---</span>
                                )}
                              </td>
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

              {/* Khu vực quyết định phê duyệt */}
              {isOrderPendingApproval(reviewOrder) ? (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                  <label className="text-xs font-bold text-slate-800 block">
                    Ý kiến chỉ đạo / Lý do phê duyệt (Bắt buộc khi Từ chối hoặc Trả lại):
                  </label>

                  {/* Thông báo lỗi validation hiển thị ngay trên modal */}
                  {modalValidationError && (
                    <div className="flex items-center gap-2 p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{modalValidationError}</span>
                    </div>
                  )}

                  <textarea
                    value={decisionComment}
                    onChange={(e) => {
                      setDecisionComment(e.target.value);
                      if (modalValidationError) setModalValidationError(null);
                    }}
                    placeholder="Nhập ghi chú phê duyệt hoặc lý do yêu cầu sửa đổi..."
                    rows={2}
                    className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:ring-2 resize-none transition-all ${
                      modalValidationError
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:ring-indigo-200'
                    }`}
                  />

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {/* Nút Từ chối */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleDecisionSubmit('REJECT')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Từ chối</span>
                    </button>

                    {/* Nút Trả lại yêu cầu sửa */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleDecisionSubmit('RETURN_FOR_UPDATE')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                      <span>Trả lại sửa</span>
                    </button>

                    {/* Nút Duyệt đơn (Khóa trước nếu thiếu hàng) */}
                    {stockCheckResults.outOfStockItems.length > 0 ? (
                      <button
                        type="button"
                        disabled={true}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                        title="Đơn này có mặt hàng thiếu tồn kho. Vui lòng bấm 'Trả lại sửa' hoặc 'Từ chối' thay vì duyệt."
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>Không đủ tồn để duyệt</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void handleDecisionSubmit('APPROVE')}
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
                            <span>Duyệt đơn</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Với đơn trong Lịch sử đã xét duyệt: chỉ hiển thị thông tin trạng thái, đóng modal bằng nút X góc trên */
                <div className="flex items-center gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700">
                  <span className="font-semibold text-slate-500">Trạng thái xét duyệt:</span>
                  {renderStatusBadge(reviewOrder.status, false)}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
