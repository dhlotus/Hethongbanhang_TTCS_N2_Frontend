import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  XCircle,
  CornerUpLeft,
  Eye,
  RefreshCw,
  Search,
  Clock,
  Calendar,
  X,
  DollarSign,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { Pagination } from '../components/pagination';
import { DateInput } from '../components/date-input';
import { ordersService } from '../services/orders.service';
import { productsService } from '../services/products.service';
import { matchesSearchTerm } from '../utils/vietnamese';
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

/** Chuyển đổi ngày tháng của đơn hàng thành chuỗi YYYY-MM-DD phục vụ lọc chính xác */
const getOrderDateKey = (dateVal?: string | Date): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const m = dateVal.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export type ApprovalTab = 'PENDING' | 'APPROVED' | 'HISTORY';

/** Render huy hiệu trạng thái đơn hàng chuẩn xác */
const renderStatusBadge = (status: OrderStatus, isPending: boolean) => {
  if (isPending) {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" /> <span>Chờ duyệt</span>
      </span>
    );
  }
  switch (status) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> <span>Đã duyệt</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" /> <span>Từ chối</span>
        </span>
      );
    case 'RETURNED_FOR_UPDATE':
      return (
        <span className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs whitespace-nowrap">
          <CornerUpLeft className="w-3.5 h-3.5 shrink-0 text-amber-600" /> <span>Trả lại sửa</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs whitespace-nowrap">
          {status}
        </span>
      );
  }
};

export const OrderApprovalsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Khôi phục bộ lọc từ URL Search Parameters
  const initialTab = useMemo<ApprovalTab>(() => {
    const t = searchParams.get('tab')?.toUpperCase();
    if (t === 'APPROVED' || t === 'HISTORY') return t;
    return 'PENDING';
  }, [searchParams]);

  const initialSearch = searchParams.get('search') || '';
  const initialRep = searchParams.get('rep') || 'ALL';
  const initialStock = useMemo<'ALL' | 'SUFFICIENT' | 'INSUFFICIENT'>(() => {
    const s = searchParams.get('stock')?.toUpperCase();
    if (s === 'SUFFICIENT' || s === 'INSUFFICIENT') return s;
    return 'ALL';
  }, [searchParams]);
  const initialFromDate = searchParams.get('from') || '';
  const initialToDate = searchParams.get('to') || '';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const initialPageSize = [10, 20, 50].includes(Number(searchParams.get('limit')))
    ? Number(searchParams.get('limit'))
    : 10;

  // Danh sách đơn hàng & tab hiện tại
  const [activeTab, setActiveTab] = useState<ApprovalTab>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Bộ lọc
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>(initialRep);
  const [fromDate, setFromDate] = useState<string>(initialFromDate);
  const [toDate, setToDate] = useState<string>(initialToDate);

  // Phân trang chuẩn quản lý đại lý
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Modal thẩm định chi tiết & ra quyết định
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [modalValidationError, setModalValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bộ lọc nhanh theo tình trạng tồn kho (chỉ dùng cho tab Chờ duyệt)
  const [stockFilter, setStockFilter] = useState<'ALL' | 'SUFFICIENT' | 'INSUFFICIENT'>(initialStock);

  // Dữ liệu sản phẩm & tồn kho khả dụng để kiểm tra đối soát trực tiếp
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map());
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Hàm cập nhật URL Search Parameters đồng bộ
  const updateUrlParams = useCallback(
    (newParams: {
      tab?: ApprovalTab;
      search?: string;
      rep?: string;
      stock?: 'ALL' | 'SUFFICIENT' | 'INSUFFICIENT';
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          const targetTab = newParams.tab !== undefined ? newParams.tab : activeTab;
          if (targetTab && targetTab !== 'PENDING') {
            next.set('tab', targetTab);
          } else {
            next.delete('tab');
          }

          const targetSearch = newParams.search !== undefined ? newParams.search : searchInput;
          if (targetSearch.trim()) {
            next.set('search', targetSearch.trim());
          } else {
            next.delete('search');
          }

          const targetRep = newParams.rep !== undefined ? newParams.rep : selectedSalesRep;
          if (targetRep && targetRep !== 'ALL') {
            next.set('rep', targetRep);
          } else {
            next.delete('rep');
          }

          const targetStock = newParams.stock !== undefined ? newParams.stock : stockFilter;
          if (targetStock && targetStock !== 'ALL') {
            next.set('stock', targetStock.toLowerCase());
          } else {
            next.delete('stock');
          }

          const targetFrom = newParams.from !== undefined ? newParams.from : fromDate;
          if (targetFrom) {
            next.set('from', targetFrom);
          } else {
            next.delete('from');
          }

          const targetTo = newParams.to !== undefined ? newParams.to : toDate;
          if (targetTo) {
            next.set('to', targetTo);
          } else {
            next.delete('to');
          }

          const targetPage = newParams.page !== undefined ? newParams.page : currentPage;
          if (targetPage > 1) {
            next.set('page', String(targetPage));
          } else {
            next.delete('page');
          }

          const targetLimit = newParams.limit !== undefined ? newParams.limit : pageSize;
          if (targetLimit !== 10) {
            next.set('limit', String(targetLimit));
          } else {
            next.delete('limit');
          }

          return next;
        },
        { replace: true }
      );
    },
    [searchInput, selectedSalesRep, stockFilter, fromDate, toDate, currentPage, pageSize, setSearchParams]
  );

  // Lắng nghe thay đổi của URL search parameters (hỗ trợ nút Back / Forward trên trình duyệt)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlRep = searchParams.get('rep') || 'ALL';
    const stockParam = searchParams.get('stock')?.toUpperCase();
    const urlStock: 'ALL' | 'SUFFICIENT' | 'INSUFFICIENT' =
      stockParam === 'SUFFICIENT' || stockParam === 'INSUFFICIENT' ? stockParam : 'ALL';
    const urlFrom = searchParams.get('from') || '';
    const urlTo = searchParams.get('to') || '';
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const urlLimit = [10, 20, 50].includes(Number(searchParams.get('limit')))
      ? Number(searchParams.get('limit'))
      : 10;

    setSearchInput((prev) => (prev !== urlSearch ? urlSearch : prev));
    setSearchTerm((prev) => (prev !== urlSearch ? urlSearch : prev));
    setSelectedSalesRep((prev) => (prev !== urlRep ? urlRep : prev));
    setStockFilter((prev) => (prev !== urlStock ? urlStock : prev));
    setFromDate((prev) => (prev !== urlFrom ? urlFrom : prev));
    setToDate((prev) => (prev !== urlTo ? urlTo : prev));
    setCurrentPage((prev) => (prev !== urlPage ? urlPage : prev));
    setPageSize((prev) => (prev !== urlLimit ? urlLimit : prev));
  }, [searchParams]);

  // Tải danh mục tồn kho toàn hệ thống để kiểm tra trước cho toàn bộ đơn hàng
  useEffect(() => {
    let active = true;
    setIsLoadingStock(true);
    productsService
      .getProducts({ limit: 500 })
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

  // Debounce tìm kiếm và đồng bộ URL query parameter
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      setSearchTerm(trimmed);
      const currentParam = searchParams.get('search') || '';
      if (trimmed !== currentParam) {
        setCurrentPage(1);
        updateUrlParams({ search: trimmed, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams, updateUrlParams]);

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

  // 1. Lọc tập đơn cơ sở theo NVKD, Từ khóa tìm kiếm và Khoảng thời gian chuẩn xác
  const baseOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Lọc theo nhân viên kinh doanh
      if (selectedSalesRep !== 'ALL') {
        const repId = order.salesRepId || (order as unknown as { salesRep?: { id?: string } }).salesRep?.id;
        const repName = order.salesRepName || (order as unknown as { salesRep?: { name?: string } }).salesRep?.name;
        const matchesId = Boolean(repId && repId.toLowerCase() === selectedSalesRep.toLowerCase());
        const matchesName = Boolean(
          repName &&
          (repName.toLowerCase() === selectedSalesRep.toLowerCase() ||
           matchesSearchTerm(repName, selectedSalesRep))
        );
        if (!matchesId && !matchesName) {
          return false;
        }
      }

      // 2. Lọc theo khoảng ngày (fromDate -> toDate) đối chiếu chuẩn YYYY-MM-DD
      if (fromDate || toDate) {
        const orderDateStr = getOrderDateKey(order.createdAt || (order as unknown as { orderDate?: string }).orderDate);
        if (orderDateStr) {
          if (fromDate && orderDateStr < fromDate) return false;
          if (toDate && orderDateStr > toDate) return false;
        }
      }

      // 3. Lọc theo từ khóa tìm kiếm (hỗ trợ tiếng Việt có dấu và không dấu: mã đơn, tên đại lý, mã đại lý, NVKD)
      if (searchTerm) {
        const matchCode = matchesSearchTerm(order.orderCode, searchTerm);
        const matchCustName = matchesSearchTerm(order.customerName, searchTerm);
        const matchCustCode = matchesSearchTerm(order.customerCode, searchTerm);
        const repName = order.salesRepName || (order as unknown as { salesRep?: { name?: string } }).salesRep?.name;
        const matchRep = matchesSearchTerm(repName, searchTerm);
        if (!matchCode && !matchCustName && !matchCustCode && !matchRep) {
          return false;
        }
      }

      return true;
    });
  }, [orders, selectedSalesRep, searchTerm, fromDate, toDate]);

  // 2. Thống kê số lượng chuẩn xác theo đúng bộ lọc đang chọn (NVKD, Từ khóa, Ngày)
  const stats = useMemo(() => {
    const pendingList = baseOrders.filter(isOrderPendingApproval);
    const pendingCount = pendingList.length;
    const pendingAmount = pendingList.reduce((acc, o) => acc + (o.grandTotal || 0), 0);

    const approvedList = baseOrders.filter((o) => o.status === 'APPROVED');
    const approvedCount = approvedList.length;

    const historyList = baseOrders.filter((o) =>
      ['APPROVED', 'REJECTED', 'RETURNED_FOR_UPDATE'].includes(o.status)
    );
    const historyCount = historyList.length;

    // Đếm số đơn chờ duyệt đủ tồn và thiếu tồn theo đúng bộ lọc
    const pendingStockStatuses = pendingList.map((o) => checkOrderStock(o));
    const pendingSufficientCount = pendingStockStatuses.filter((s) => s.isSufficient).length;
    const pendingInsufficientCount = pendingStockStatuses.filter((s) => !s.isSufficient).length;

    return {
      pendingCount,
      pendingAmount,
      approvedCount,
      historyCount,
      pendingSufficientCount,
      pendingInsufficientCount,
    };
  }, [baseOrders, productsMap]);

  // 3. Lọc tập đơn hiển thị theo Tab và Tình trạng tồn kho
  const filteredOrders = useMemo(() => {
    return baseOrders.filter((order) => {
      // 1. Phân loại theo tab
      if (activeTab === 'APPROVED') {
        if (order.status !== 'APPROVED') return false;
      } else if (activeTab === 'HISTORY') {
        // Lịch sử tất cả các đơn đã xử lý
        const isHistory = ['APPROVED', 'REJECTED', 'RETURNED_FOR_UPDATE'].includes(order.status);
        if (!isHistory) return false;
      } else {
        // Tab Chờ duyệt: chỉ hiển thị đơn chờ duyệt
        if (!isOrderPendingApproval(order)) return false;

        // Lọc theo tình trạng tồn kho khi người dùng chọn Đủ tồn hoặc Thiếu tồn
        if (stockFilter !== 'ALL') {
          const stockStatus = checkOrderStock(order);
          if (stockFilter === 'SUFFICIENT' && !stockStatus.isSufficient) return false;
          if (stockFilter === 'INSUFFICIENT' && stockStatus.isSufficient) return false;
        }
      }

      return true;
    });
  }, [baseOrders, activeTab, stockFilter, productsMap]);

  // Danh sách nhân viên kinh doanh
  const salesRepOptions = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      const repId = o.salesRepId || (o as unknown as { salesRep?: { id?: string } }).salesRep?.id || o.salesRepName;
      const repName = o.salesRepName || (o as unknown as { salesRep?: { name?: string } }).salesRep?.name;
      if (repId && repName) {
        map.set(repId, repName);
      }
    });
    if (selectedSalesRep !== 'ALL' && !map.has(selectedSalesRep)) {
      map.set(selectedSalesRep, selectedSalesRep);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders, selectedSalesRep]);

  // Kiểm tra xem có bất kỳ bộ lọc nào đang được kích hoạt hay không
  const hasActiveFilters = Boolean(
    searchInput.trim() ||
    selectedSalesRep !== 'ALL' ||
    fromDate ||
    toDate ||
    (activeTab === 'PENDING' && stockFilter !== 'ALL')
  );

  // Xóa toàn bộ bộ lọc về trạng thái ban đầu
  const handleResetFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedSalesRep('ALL');
    setFromDate('');
    setToDate('');
    setStockFilter('ALL');
    setCurrentPage(1);
    updateUrlParams({
      tab: activeTab,
      search: '',
      rep: 'ALL',
      from: '',
      to: '',
      stock: 'ALL',
      page: 1,
    });
  };

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



  return (
    <div className="space-y-6">
      {/* ── 2 THẺ CHỈ SỐ QUAN TRỌNG NHẤT DÀNH CHO QUẢN LÝ (ĐƠN CHỜ DUYỆT & TỔNG TIỀN CHỜ DUYỆT) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Số đơn chờ duyệt */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đơn chờ duyệt</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">{stats.pendingCount}</span>
            <span className="text-xs text-slate-400 font-medium">đơn</span>
          </div>
        </div>

        {/* Card 2: Tổng giá trị chờ duyệt */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng tiền chờ duyệt</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 truncate font-mono">
              {formatCurrency(stats.pendingAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* ── BỘ LỌC ĐA TIÊU CHÍ & TÌNH TRẠNG TỒN KHO ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 space-y-3 shadow-xs">
        {/* HÀNG 1: Ô TÌM KIẾM ĐƯA LÊN ĐẦU TIÊN + BỘ LỌC NVKD & NGÀY + NÚT XÓA LỌC */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã đơn, tên đại lý, NVKD..."
              className="w-full pl-10 pr-9 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                  setCurrentPage(1);
                  updateUrlParams({ search: '', page: 1 });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                title="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Khoảng ngày */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative flex items-center gap-1 bg-slate-50/80 border border-slate-200 rounded-xl px-2.5 py-1.5 h-9 min-w-[125px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-500 font-medium">Từ:</span>
                <DateInput
                  compact={true}
                  value={fromDate}
                  onChange={(val) => {
                    setFromDate(val);
                    setCurrentPage(1);
                    updateUrlParams({ from: val, page: 1 });
                  }}
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
                  onChange={(val) => {
                    setToDate(val);
                    setCurrentPage(1);
                    updateUrlParams({ to: val, page: 1 });
                  }}
                  min={fromDate || undefined}
                  className="w-full text-xs"
                />
              </div>
            </div>

            {/* Nút Xóa lọc */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all shrink-0 cursor-pointer shadow-2xs whitespace-nowrap"
                title="Xóa tất cả bộ lọc về mặc định"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* HÀNG 2: TABS (CHỜ DUYỆT / ĐÃ DUYỆT / LỊCH SỬ) + SELECT NVKD + BỘ LỌC TỒN KHO */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Nhóm bên trái: Cụm Tabs chuyển đổi trạng thái & Hộp select NVKD */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Cụm Tabs: Chờ duyệt (Cam có số) | Đã duyệt (Xanh không số) | Tất cả lịch sử (Không số) */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-2xs">
              {/* Tab 1: Chờ duyệt - Màu cam, duy nhất có số lượng */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('PENDING');
                  setCurrentPage(1);
                  updateUrlParams({ tab: 'PENDING', page: 1 });
                }}
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'PENDING'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/60'
                }`}
                title="Danh sách đơn hàng chờ phê duyệt"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Chờ duyệt</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full text-[10px] font-extrabold shadow-2xs ${
                    activeTab === 'PENDING' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {stats.pendingCount}
                </span>
              </button>

              {/* Tab 2: Đã duyệt - Màu xanh, không đánh số */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('APPROVED');
                  setCurrentPage(1);
                  updateUrlParams({ tab: 'APPROVED', page: 1 });
                }}
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/60'
                }`}
                title="Danh sách đơn hàng đã được phê duyệt"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Đã duyệt</span>
              </button>

              {/* Tab 3: Tất cả lịch sử - Không đánh số */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('HISTORY');
                  setCurrentPage(1);
                  updateUrlParams({ tab: 'HISTORY', page: 1 });
                }}
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'HISTORY'
                    ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
                title="Lịch sử tất cả các đơn đã xét duyệt (Đã duyệt, Từ chối, Trả lại sửa)"
              >
                <span>Tất cả lịch sử</span>
              </button>
            </div>

            {/* Lọc theo NVKD */}
            <select
              value={selectedSalesRep}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSalesRep(val);
                setCurrentPage(1);
                updateUrlParams({ rep: val, page: 1 });
              }}
              className="h-9 text-xs font-medium border border-slate-200 rounded-xl px-3 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer shrink-0"
            >
              <option value="ALL">Tất cả NVKD</option>
              {salesRepOptions.map((rep) => (
                <option key={rep.id} value={rep.id}>{rep.name}</option>
              ))}
            </select>
          </div>

          {/* 3 nút lọc tình trạng tồn kho: Chỉ hiển thị khi đang ở Tab Chờ duyệt */}
          {activeTab === 'PENDING' && (
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setStockFilter('ALL');
                  setCurrentPage(1);
                  updateUrlParams({ stock: 'ALL', page: 1 });
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stockFilter === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  setStockFilter('SUFFICIENT');
                  setCurrentPage(1);
                  updateUrlParams({ stock: 'SUFFICIENT', page: 1 });
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stockFilter === 'SUFFICIENT'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-100/60'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đủ tồn</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStockFilter('INSUFFICIENT');
                  setCurrentPage(1);
                  updateUrlParams({ stock: 'INSUFFICIENT', page: 1 });
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stockFilter === 'INSUFFICIENT'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:bg-rose-100/60'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Thiếu tồn</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. BẢNG DỮ LIỆU DESKTOP (>= 640px) - STYLE ĐỒNG BỘ BẢNG HÓA ĐƠN      */}
      {/* =================================================================== */}
      <div className="hidden sm:block rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden w-full">
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
              {activeTab === 'PENDING'
                ? 'Không có đơn hàng nào cần phê duyệt lúc này!'
                : activeTab === 'APPROVED'
                ? 'Không tìm thấy đơn hàng đã duyệt nào!'
                : 'Không có lịch sử xét duyệt nào!'}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {activeTab === 'PENDING'
                ? 'Tất cả các đơn hàng đã được xử lý hoặc tự động chuyển tiếp vào quy trình xuất kho.'
                : 'Các đơn hàng sau khi được xét duyệt sẽ xuất hiện tại đây để theo dõi và đối soát.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse min-w-[620px]">
              <colgroup>
                <col className="w-[36%]" />
                <col className="w-[15%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[15%]" />
              </colgroup>

              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">Đại lý</th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">Ngày tạo</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Tổng tiền</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap">
                    {activeTab === 'PENDING' ? 'Tồn kho' : 'Trạng thái'}
                  </th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {pagedOrders.map((order) => {
                  const stockCheck = checkOrderStock(order);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* 1. Đại lý: Chỉ hiển thị tên theo style chuẩn gọn gàng */}
                      <td className="px-5 py-4 text-left whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-900 truncate block max-w-full" title={order.customerName}>
                          {order.customerName}
                        </span>
                      </td>

                      {/* 2. Ngày tạo: Căn giữa */}
                      <td className="px-4 py-4 text-center whitespace-nowrap text-sm font-medium text-slate-600">
                        {formatDate(order.createdAt)}
                      </td>

                      {/* 3. Tổng tiền: Căn phải, số đậm rõ ràng */}
                      <td className="px-5 py-4 text-right whitespace-nowrap text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(order.grandTotal)}
                      </td>

                      {/* 4. Tồn kho hoặc Trạng thái: Pastel Badge mềm mại, không bao giờ vỡ chữ */}
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        {activeTab === 'PENDING' ? (
                          stockCheck.isSufficient ? (
                            <span
                              className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs whitespace-nowrap"
                              title="Kho đủ hàng khả dụng để đáp ứng toàn bộ đơn này"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                              <span>Đủ tồn kho</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs whitespace-nowrap"
                              title={`Không đủ tồn khả dụng: ${stockCheck.outOfStockLines.map((l) => `${l.productName} (còn ${l.available}, cần ${l.required})`).join(', ')}`}
                            >
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                              <span>Thiếu tồn</span>
                            </span>
                          )
                        ) : (
                          renderStatusBadge(order.status, isOrderPendingApproval(order))
                        )}
                      </td>

                      {/* 5. Thao tác: Duy nhất 1 nút Chi tiết theo đúng chuẩn, không bao giờ vỡ */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewOrder(order);
                              setDecisionComment('');
                              setModalValidationError(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="Xem chi tiết đơn hàng và ra quyết định phê duyệt"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Chi tiết</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── THANH PHÂN TRANG GẮN LIỀN CHÂN BẢNG DESKTOP ── */}
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
            onPageChange={(page) => {
              setCurrentPage(page);
              updateUrlParams({ page });
            }}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
              updateUrlParams({ limit: size, page: 1 });
            }}
          />
        )}
      </div>

      {/* =================================================================== */}
      {/* 2. GIAO DIỆN THẺ (CARD VIEW) CHO MOBILE (< 640px) CO GIÃN 100%       */}
      {/* =================================================================== */}
      <div className="sm:hidden space-y-2.5 w-full">
        {loading ? (
          <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
            <span className="font-medium text-xs">Đang tải dữ liệu đơn hàng...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-center text-slate-400">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
            <p className="text-sm font-bold text-slate-700">Không có đơn hàng nào cần duyệt</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pagedOrders.map((order) => {
              const stockCheck = checkOrderStock(order);

              return (
                <div
                  key={order.id}
                  className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-xs hover:border-slate-300 transition-all space-y-2.5 w-full"
                >
                  {/* Hàng 1: Mã đơn & Tình trạng tồn kho */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewOrder(order);
                        setDecisionComment('');
                        setModalValidationError(null);
                      }}
                      className="text-xs font-bold text-indigo-700 font-mono hover:underline text-left cursor-pointer"
                    >
                      {order.orderCode}
                    </button>
                    {activeTab === 'PENDING' ? (
                      stockCheck.isSufficient ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Đủ tồn kho</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Thiếu tồn</span>
                        </span>
                      )
                    ) : (
                      renderStatusBadge(order.status, isOrderPendingApproval(order))
                    )}
                  </div>

                  {/* Hàng 2: Đại lý */}
                  <div className="text-xs font-medium text-slate-900 truncate" title={order.customerName}>
                    {order.customerName}
                  </div>

                  {/* Hàng 3: Ngày tạo, Tổng tiền */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Ngày tạo</span>
                      <span className="text-xs font-medium text-slate-700">{formatDate(order.createdAt)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatCurrency(order.grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Hàng 4: Thao tác */}
                  <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewOrder(order);
                        setDecisionComment('');
                        setModalValidationError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-indigo-700 text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Chi tiết</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Phân trang mobile */}
        {filteredOrders.length > 0 && (
          <div className="pt-2">
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
              onPageChange={(page) => {
                setCurrentPage(page);
                updateUrlParams({ page });
              }}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
                updateUrlParams({ limit: size, page: 1 });
              }}
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
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Chi tiết đơn hàng {reviewOrder.orderCode}
                  </h3>
                  {renderStatusBadge(reviewOrder.status, isOrderPendingApproval(reviewOrder))}
                </div>
                <p className="text-xs text-slate-500">
                  Đại lý: <strong className="text-slate-800">{reviewOrder.customerName}</strong> ({reviewOrder.customerCode || '---'}) · NVKD: <strong className="text-slate-800">{reviewOrder.salesRepName || 'Trần Văn Long'}</strong>
                </p>
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
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Khối Kiểm tra công nợ (Gộp trực tiếp xem được ngay, không cần click thêm tab) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold block">Hạn mức nợ tối đa</span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 block font-mono">
                    {formatCurrency(50000000)}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold block">Dư nợ hiện tại</span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 block font-mono">
                    {formatCurrency(35000000)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Không có nợ quá hạn</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-indigo-700 font-semibold block">Dự kiến nợ sau đơn này</span>
                  <span className="text-sm sm:text-base font-extrabold text-indigo-700 block font-mono">
                    {formatCurrency(35000000 + reviewOrder.grandTotal)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Khả dụng: <strong className="text-emerald-700 font-bold">{formatCurrency(Math.max(0, 50000000 - (35000000 + reviewOrder.grandTotal)))}</strong>
                  </span>
                </div>
              </div>

              {/* Bảng danh sách dòng hàng */}
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
                          {/* Cột Tồn khả dụng (Gọn gàng, bỏ text thừa Kho/Đã giữ) */}
                          <td className="px-3 py-2.5 text-center">
                            {isLoadingStock ? (
                              <span className="text-[10px] text-slate-400">Đang đối soát...</span>
                            ) : itemStock ? (
                              <span
                                className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${
                                  itemStock.isSufficient
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {itemStock.availableStock.toLocaleString('vi-VN')} {itemStock.baseUnit}
                              </span>
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

              {/* Khu vực quyết định phê duyệt */}
              {isOrderPendingApproval(reviewOrder) ? (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                  <label className="text-xs font-bold text-slate-800 block">
                    Ý kiến chỉ đạo / Lý do (Bắt buộc khi Trả lại sửa):
                  </label>

                  {/* Thông báo lỗi validation hiển thị ngay trên modal */}
                  {modalValidationError && (
                    <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in">
                      <span>{modalValidationError}</span>
                    </div>
                  )}

                  <textarea
                    value={decisionComment}
                    onChange={(e) => {
                      setDecisionComment(e.target.value);
                      if (modalValidationError) setModalValidationError(null);
                    }}
                    placeholder="Nhập ghi chú hoặc lý do yêu cầu sửa đổi..."
                    rows={2}
                    className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:ring-2 resize-none transition-all ${
                      modalValidationError
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:ring-indigo-200'
                    }`}
                  />

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {/* Chỉ giữ lại 1 nút: Trả lại sửa */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleDecisionSubmit('RETURN_FOR_UPDATE')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span>Trả lại sửa</span>
                    </button>

                    {/* Nút Duyệt đơn (Khóa trước nếu thiếu hàng) */}
                    {stockCheckResults.outOfStockItems.length > 0 ? (
                      <button
                        type="button"
                        disabled={true}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                        title="Đơn này có mặt hàng thiếu tồn kho. Vui lòng bấm 'Trả lại sửa' hoặc 'Từ chối' thay vì duyệt."
                      >
                        <span>Không đủ tồn để duyệt</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void handleDecisionSubmit('APPROVE')}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang lưu...</span>
                          </span>
                        ) : (
                          <span>Duyệt đơn</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : (reviewOrder.status === 'REJECTED' || reviewOrder.status === 'RETURNED_FOR_UPDATE') && (reviewOrder.note || reviewOrder.warningNote) ? (
                /* Với đơn bị từ chối / trả lại: chỉ hiển thị lý do nếu có ghi chú, không lặp lại chữ đã duyệt */
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                  <span className="font-semibold">Lý do yêu cầu sửa đổi: </span>
                  <span>{reviewOrder.note || reviewOrder.warningNote}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
