import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  Eye,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Package,
  PackageCheck,
  FileText,
  Truck,
  Copy,
  Printer,
  Edit3,
  XCircle,
  CornerUpLeft,
  History,
  Lock,
  ShieldCheck,
  RotateCcw,
  Filter,
  Calendar,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { ordersService } from '../services/orders.service';
import { customerService } from '../services/customer.service';
import { OrderPrintModal } from '../components/order-print-modal';
import { ReorderModal } from '../components/reorder-modal';
import { getStoredUser } from '../utils/navigation';
import { normalizeRole } from '../utils/navigation-config';
import { USER_ROLES } from '../types/auth';
import type {
  Order,
  OrderStatus,
  OrderApprovalAction,
  OrderApprovalHistory,
} from '../types/order';
import { OrderTimeline } from '../components/order-timeline';
import { CancelOrderModal } from '../components/cancel-order-modal';
import { CreateShipmentModal } from '../components/create-shipment-modal';
import { shipmentsService, type Shipment } from '../services/shipments.service';
import { Pagination } from '../components/pagination';
import { DateInput } from '../components/date-input';

// ──────────────────────────────────────────────────────────────────────────
// HELPERS & FORMATTERS
// ──────────────────────────────────────────────────────────────────────────

/** Định dạng tiền tệ VND */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

/** Định dạng ngày DD/MM/YYYY */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// CẤU HÌNH TRẠNG THÁI ĐƠN HÀNG
// ──────────────────────────────────────────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bgClass: string; textClass: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Nháp',
    bgClass: 'bg-slate-100 border border-slate-200/70',
    textClass: 'text-slate-600',
    icon: <FileText className="w-3 h-3" />,
  },
  PENDING: {
    label: 'Chờ duyệt',
    bgClass: 'bg-amber-50 border border-amber-200/70',
    textClass: 'text-amber-700',
    icon: <Clock className="w-3 h-3" />,
  },
  PENDING_APPROVAL: {
    label: 'Chờ duyệt hạn mức',
    bgClass: 'bg-amber-50 border border-amber-200/70',
    textClass: 'text-amber-800',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  PENDING_INVENTORY_APPROVAL: {
    label: 'Chờ duyệt tồn kho',
    bgClass: 'bg-rose-50 border border-rose-200/70',
    textClass: 'text-rose-700',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  APPROVED: {
    label: 'Đã duyệt',
    bgClass: 'bg-indigo-50 border border-indigo-200/80',
    textClass: 'text-indigo-700',
    icon: <Lock className="w-3 h-3 text-indigo-600" />,
  },
  REJECTED: {
    label: 'Từ chối',
    bgClass: 'bg-red-50 border border-red-200/70',
    textClass: 'text-red-700',
    icon: <XCircle className="w-3 h-3" />,
  },
  RETURNED_FOR_UPDATE: {
    label: 'Trả lại sửa',
    bgClass: 'bg-orange-50 border border-orange-200/70',
    textClass: 'text-orange-700',
    icon: <CornerUpLeft className="w-3 h-3" />,
  },
  PROCESSING: {
    label: 'Đang soạn',
    bgClass: 'bg-purple-50 border border-purple-200/70',
    textClass: 'text-purple-700',
    icon: <Package className="w-3 h-3" />,
  },
  PACKED: {
    label: 'Đã đóng gói',
    bgClass: 'bg-indigo-50 border border-indigo-200/80',
    textClass: 'text-indigo-700',
    icon: <PackageCheck className="w-3 h-3 text-indigo-600" />,
  },
  DISPATCHED: {
    label: 'Đã xuất kho',
    bgClass: 'bg-cyan-50 border border-cyan-200/70',
    textClass: 'text-cyan-700',
    icon: <Package className="w-3 h-3" />,
  },
  SHIPPED: {
    label: 'Đang giao',
    bgClass: 'bg-indigo-50 border border-indigo-200/70',
    textClass: 'text-indigo-700',
    icon: <Truck className="w-3 h-3" />,
  },
  DELIVERED: {
    label: 'Giao thành công',
    bgClass: 'bg-emerald-50 border border-emerald-200/70',
    textClass: 'text-emerald-700',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  COMPLETED: {
    label: 'Hoàn tất',
    bgClass: 'bg-emerald-50 border border-emerald-200/70',
    textClass: 'text-emerald-700',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  CANCELLED: {
    label: 'Đã hủy',
    bgClass: 'bg-rose-50 border border-rose-200/70',
    textClass: 'text-rose-600',
    icon: <X className="w-3 h-3" />,
  },
  RETURNED: {
    label: 'Hoàn hàng',
    bgClass: 'bg-orange-50 border border-orange-200/70',
    textClass: 'text-orange-700',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  CLOSED: {
    label: 'Đã đóng',
    bgClass: 'bg-slate-100 border border-slate-200/70',
    textClass: 'text-slate-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

/** Badge trạng thái đơn hàng */
interface OrderStatusBadgeProps {
  status: OrderStatus;
  reservedUntil?: string;
}

const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, reservedUntil }) => {
  const cfg = ORDER_STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bgClass} ${cfg.textClass}`}
      title={
        status === 'APPROVED' && reservedUntil
          ? `Đã duyệt (Hạn giữ chỗ tồn kho: ${formatDate(reservedUntil)})`
          : undefined
      }
    >
      {cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
};
const STATUS_TABS: { key: OrderStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'PROCESSING', label: 'Đang soạn' },
  { key: 'PACKED', label: 'Đã đóng gói' },
  { key: 'SHIPPED', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Giao thành công' },
  { key: 'DRAFT', label: 'Nháp' },
  { key: 'PENDING_APPROVAL', label: 'Cần duyệt hạn mức' },
  { key: 'RETURNED_FOR_UPDATE', label: 'Trả lại sửa' },
  { key: 'REJECTED', label: 'Từ chối' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export const OrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlCustomerId = searchParams.get('customerId');
  const [filterCustomerName, setFilterCustomerName] = useState<string>('');
  const shouldOpenCreate = searchParams.get('createOrder') === 'true';

  useEffect(() => {
    if (urlCustomerId) {
      customerService
        .getCustomerById(urlCustomerId)
        .then((c) => setFilterCustomerName(c.name || c.code || ''))
        .catch(() => setFilterCustomerName(''));
    } else {
      setFilterCustomerName('');
    }
  }, [urlCustomerId]);

  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';
  const initialStatus = (() => {
    const requestedStatus = searchParams.get('status');
    return STATUS_TABS.some((tab) => tab.key === requestedStatus)
      ? (requestedStatus as OrderStatus | 'ALL')
      : 'ALL';
  })();
  const initialRegion = searchParams.get('region') || 'ALL';
  const initialFromDate = searchParams.get('fromDate') || '';
  const initialToDate = searchParams.get('toDate') || '';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const initialLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(initialLimit);

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>(initialStatus);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  // Bộ lọc
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);
  const [fromDate, setFromDate] = useState<string>(initialFromDate);
  const [toDate, setToDate] = useState<string>(initialToDate);

  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const urlOrderId = searchParams.get('orderId') || searchParams.get('id');

  // Tự động mở modal chi tiết đơn hàng khi click từ chuông thông báo
  useEffect(() => {
    if (urlOrderId) {
      ordersService
        .getOrderById(urlOrderId)
        .then((ord) => {
          if (ord) setViewOrder(ord);
        })
        .catch(() => {});
    }
  }, [urlOrderId]);

  const [orderShipment, setOrderShipment] = useState<Shipment | null>(null);
  const [approvingOrder, setApprovingOrder] = useState(false);
  // Trạng thái hủy đơn hàng (SN-45)
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [decisionAction, setDecisionAction] = useState<OrderApprovalAction | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [approvalHistory, setApprovalHistory] = useState<OrderApprovalHistory[]>([]);
  const [isLoadingApprovalHistory, setIsLoadingApprovalHistory] = useState(false);
  // Khởi tạo trực tiếp từ cache để khi F5 tải lại trang thì modal In / Xuất PDF xuất hiện ngay lập tức
  const [printOrder, setPrintOrder] = useState<Order | null>(() => {
    try {
      const cached = sessionStorage.getItem('loha_active_print_order_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.id || parsed.orderCode)) return parsed;
      }
    } catch {}
    return null;
  });
  const [selectedOrderForReorder, setSelectedOrderForReorder] = useState<Order | null>(null);
  const [isCloning, setIsCloning] = useState<string | null>(null);
  // Soạn phiếu xuất kho & giao hàng từ đơn đang xem
  const [isCreateShipmentOpen, setIsCreateShipmentOpen] = useState(false);
  const [orderForShipment, setOrderForShipment] = useState<Order | null>(null);

  // SN-180: Duyệt giữ chỗ tồn kho & Nhả tồn kho tự động
  const [approvingOrderModal, setApprovingOrderModal] = useState<Order | null>(null);
  const [cancellingOrderModal, setCancellingOrderModal] = useState<Order | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    top: number;
    right: number;
    isDropUp: boolean;
  } | null>(null);

  // Đóng dropdown menu thao tác khi click ra ngoài, cuộn trang hoặc nhấn phím Escape
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (
        !(e.target as HTMLElement).closest('.order-action-dropdown-container') &&
        !(e.target as HTMLElement).closest('.order-action-portal-menu')
      ) {
        setOpenActionMenuId(null);
        setActionMenuAnchor(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenActionMenuId(null);
        setActionMenuAnchor(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenActionMenuId(null);
      setActionMenuAnchor(null);
    };

    document.addEventListener('click', handleDocClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('click', handleDocClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  const handleReorderSuccess = (_newOrder: Order) => {
    setRefreshKey((key) => key + 1);
  };

  const user = getStoredUser();
  const isAdmin = user?.roles?.includes('ADMIN');
  const isSalesRep = user?.roles?.includes('SALES_REP');
  const isSalesManager = user?.roles?.includes('SALES_MANAGER');
  const isAccountant = user?.roles?.includes('ACCOUNTANT');
  const isWarehouse = user?.roles?.includes('WAREHOUSE_MANAGER') || user?.roles?.includes('WAREHOUSE_KEEPER');
  const primaryRole = normalizeRole(user?.roles?.[0] || user?.role);
  const userRoleString = (user?.role || user?.roles?.[0] || '').toString().toLowerCase();
  const isWarehouseManager =
    !isAdmin &&
    (primaryRole === USER_ROLES.WAREHOUSE_MANAGER ||
      user?.roles?.includes('WAREHOUSE_MANAGER') ||
      user?.roles?.includes('WH_MANAGER') ||
      user?.role === 'WAREHOUSE_MANAGER' ||
      user?.role === 'WH_MANAGER' ||
      userRoleString.includes('quản lý kho') ||
      userRoleString.includes('quanlykho'));
  // Kế toán, Quản lý kho, Thủ kho, Quản lý kinh doanh và Admin đều có quyền xem đơn toàn công ty
  const canViewAllRep = isAdmin || isSalesManager || isAccountant || isWarehouse;

  const handleRegionChange = (val: string) => {
    setSelectedRegion(val);
    setPage(1);
  };
  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    if (val && toDate && val > toDate) {
      setToDate(val);
    }
    setPage(1);
  };
  const handleToDateChange = (val: string) => {
    if (val && fromDate && val < fromDate) {
      showToast('warning', 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu');
      setToDate(fromDate);
      setPage(1);
      return;
    }
    setToDate(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setStatusFilter('ALL');
    setSelectedRegion('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
    if (urlCustomerId) {
      searchParams.delete('customerId');
      setSearchParams(searchParams);
    }
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    searchTerm !== '' ||
    selectedRegion !== 'ALL' ||
    fromDate !== '' ||
    toDate !== '' ||
    !!urlCustomerId;

  // Đồng bộ trạng thái bộ lọc & phân trang vào URL query parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    }
    if (statusFilter !== 'ALL') {
      params.set('status', statusFilter);
    }
    if (selectedRegion !== 'ALL') {
      params.set('region', selectedRegion);
    }
    if (fromDate) {
      params.set('fromDate', fromDate);
    }
    if (toDate) {
      params.set('toDate', toDate);
    }
    if (page > 1) {
      params.set('page', String(page));
    }
    if (limit !== 10) {
      params.set('limit', String(limit));
    }
    if (urlCustomerId) {
      params.set('customerId', urlCustomerId);
    }

    const currentQuery = searchParams.toString();
    const newQuery = params.toString();
    if (currentQuery !== newQuery) {
      setSearchParams(params, { replace: true });
    }
  }, [searchTerm, statusFilter, selectedRegion, fromDate, toDate, page, limit, urlCustomerId, searchParams, setSearchParams]);

  // Đồng bộ từ URL ngược lại state khi người dùng dùng nút Back/Forward của trình duyệt
  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q') || '';
    if (q !== searchTerm) {
      setSearchInput(q);
      setSearchTerm(q);
    }
    const s = searchParams.get('status');
    const validStatus = STATUS_TABS.some((tab) => tab.key === s) ? (s as OrderStatus | 'ALL') : 'ALL';
    if (validStatus !== statusFilter) {
      setStatusFilter(validStatus);
    }
    const r = searchParams.get('region') || 'ALL';
    if (r !== selectedRegion) {
      setSelectedRegion(r);
    }
    const fd = searchParams.get('fromDate') || '';
    if (fd !== fromDate) {
      setFromDate(fd);
    }
    const td = searchParams.get('toDate') || '';
    if (td !== toDate) {
      setToDate(td);
    }
    const p = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    if (p !== page) {
      setPage(p);
    }
    const l = Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10);
    if (l !== limit) {
      setLimit(l);
    }
  }, [searchParams]);

  // Tự động chuyển hướng sang trang tạo đơn khi có createOrder hoặc customerId trên URL
  useEffect(() => {
    if (shouldOpenCreate) {
      navigate(urlCustomerId ? `/sales/orders/create?customerId=${urlCustomerId}` : '/sales/orders/create', { replace: true });
    }
  }, [shouldOpenCreate, urlCustomerId, navigate]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [refreshKey, setRefreshKey] = useState(0);

  // Lắng nghe sự kiện đơn hàng thời gian thực toàn hệ thống (Real-time Sync SN-49)
  useEffect(() => {
    const handleOrdersUpdated = () => {
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('loha_orders_updated', handleOrdersUpdated);
    window.addEventListener('storage', handleOrdersUpdated);
    return () => {
      window.removeEventListener('loha_orders_updated', handleOrdersUpdated);
      window.removeEventListener('storage', handleOrdersUpdated);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const effectiveSalesRep = !canViewAllRep
          ? (user?.id || user?.fullName)
          : undefined;

        const res = await ordersService.getOrders({
          page,
          limit,
          status: statusFilter,
          search: searchTerm || undefined,
          customerId: urlCustomerId || undefined,
          salesRepId: effectiveSalesRep,
          region: selectedRegion !== 'ALL' ? selectedRegion : undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        });
        if (isMounted) {
          setOrders(res.data);
          setTotal(res.total);
          setTotalPages(res.totalPages);
          setTotalAmount(res.totalAmount ?? 0);
        }
      } catch {
        if (isMounted) {
          showToast('error', 'Không thể tải danh sách đơn hàng');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsInitialLoading(false);
        }
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    page,
    limit,
    statusFilter,
    searchTerm,
    urlCustomerId,
    selectedRegion,
    fromDate,
    toDate,
    refreshKey,
    canViewAllRep,
    user?.id,
    user?.fullName,
  ]);

  // Khôi phục modal In / Xuất PDF khi người dùng ấn F5 hoặc truy cập qua URL có query ?printOrderId=...
  useEffect(() => {
    const printId = searchParams.get('printOrderId') || searchParams.get('print');
    if (!printId || printOrder) return;

    const found = orders.find((o) => o.id === printId || o.orderCode === printId);
    if (found) {
      setPrintOrder(found);
      return;
    }

    ordersService
      .getOrderById(printId)
      .then((ord) => {
        if (ord) setPrintOrder(ord);
      })
      .catch(() => {});
  }, [searchParams, orders, printOrder]);

  useEffect(() => {
    let isMounted = true;
    if (!viewOrder?.id) {
      setApprovalHistory([]);
      setOrderShipment(null);
      return;
    }
    setIsLoadingApprovalHistory(true);
    ordersService.getApprovalHistory(viewOrder.id)
      .then((history) => {
        if (isMounted) setApprovalHistory(history);
      })
      .catch(() => {
        if (isMounted) setApprovalHistory([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingApprovalHistory(false);
      });

    // Tải thông tin phiếu xuất kho / giao vận gắn liền với đơn hàng này
    shipmentsService
      .getShipments(viewOrder.orderCode ? { orderCode: viewOrder.orderCode } : undefined)
      .then((list) => {
        if (isMounted) {
          const matched = (list || []).find(
            (s) => s.orderCode === viewOrder.orderCode || s.orderId === viewOrder.id,
          );
          setOrderShipment(matched || null);

          // Tự động đồng bộ trạng thái hiển thị của đơn nếu phiếu xuất đã cập nhật
          if (matched) {
            let syncStatus: OrderStatus | null = null;
            if (matched.status === 'PICKING') syncStatus = 'PROCESSING';
            else if (matched.status === 'PACKED') syncStatus = 'PACKED';
            else if (matched.status === 'SHIPPED') syncStatus = 'SHIPPED';
            else if (matched.status === 'DELIVERED') syncStatus = 'DELIVERED';
            else if (matched.status === 'CANCELLED' && viewOrder.status !== 'APPROVED') syncStatus = 'APPROVED';
            else if (matched.status === 'PENDING' && viewOrder.status === 'APPROVED') syncStatus = 'PROCESSING';

            if (syncStatus && syncStatus !== viewOrder.status) {
              setViewOrder((prev) => (prev ? { ...prev, status: syncStatus! } : null));
            }
          }
        }
      })
      .catch(() => {
        if (isMounted) setOrderShipment(null);
      });

    return () => {
      isMounted = false;
    };
  }, [viewOrder?.id, viewOrder?.orderCode]);

  
  /** Sao chép một đơn cũ thành đơn mới ở trạng thái Nháp (SN-48) */
  const handleCloneOrder = async (targetOrder: Order): Promise<void> => {
    if (!targetOrder.id) return;
    setIsCloning(targetOrder.id);
    try {
      const cloned = await ordersService.cloneOrder(targetOrder.id);
      showToast(
        'success',
        `Sao chép thành công đơn ${targetOrder.orderCode} thành bản sao mới ${cloned.orderCode}! Bản sao luôn bắt đầu ở trạng thái Nháp. Giá và chiết khấu đã được tính lại theo bảng giá hiện hành.`,
      );
      if (statusFilter !== 'ALL' && statusFilter !== 'DRAFT') {
        setStatusFilter('ALL');
      }
      setSearchInput('');
      setSearchTerm('');
      setPage(1);
      setRefreshKey((k) => k + 1);
      if (viewOrder?.id === targetOrder.id) {
        setViewOrder(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi sao chép đơn hàng';
      showToast('error', msg);
    } finally {
      setIsCloning(null);
    }
  };

  /** Mở modal in / xuất PDF đơn hàng (SN-47) và lưu URL/Session để F5 không bị mất */
  const handleOpenPrint = (targetOrder: Order): void => {
    setPrintOrder(targetOrder);
    try {
      const code = targetOrder.orderCode || targetOrder.id || '';
      sessionStorage.setItem('loha_active_print_order_id', code);
      sessionStorage.setItem('loha_active_print_order_data', JSON.stringify(targetOrder));
    } catch {}
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('printOrderId', targetOrder.orderCode || targetOrder.id || '');
      return next;
    }, { replace: true });
  };

  /** Đóng modal in / xuất PDF và dọn dẹp URL, cache */
  const handleClosePrint = (): void => {
    setPrintOrder(null);
    try {
      sessionStorage.removeItem('loha_active_print_order_id');
      sessionStorage.removeItem('loha_active_print_order_data');
    } catch {}
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('printOrderId');
      next.delete('print');
      return next;
    }, { replace: true });
  };

  const submitApprovalDecision = async (
    order: Order,
    action: OrderApprovalAction,
    comment?: string,
  ): Promise<void> => {
    if (!order.id || approvingOrder) return;
    if (action !== 'APPROVE' && !comment?.trim()) return;
    setApprovingOrder(true);
    try {
      const decidedOrder = await ordersService.decideOrder(order.id, action, comment);
      setOrders((current) => current.map((item) => item.id === decidedOrder.id ? decidedOrder : item));
      setViewOrder((current) => current?.id === decidedOrder.id ? decidedOrder : current);
      setRefreshKey((key) => key + 1);
      try {
        setApprovalHistory(await ordersService.getApprovalHistory(order.id));
      } catch {
        // The decision is saved independently; history remains available when its request succeeds.
      }
      const successMessage: Record<OrderApprovalAction, string> = {
        APPROVE: 'Đã duyệt đơn',
        REJECT: 'Đã từ chối đơn',
        RETURN_FOR_UPDATE: 'Đã trả đơn về để chỉnh sửa',
      };
      showToast('success', `${successMessage[action]} ${decidedOrder.orderCode || ''}`.trim());
      setDecisionAction(null);
      setDecisionComment('');
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'Không thể cập nhật quyết định đơn hàng');
    } finally {
      setApprovingOrder(false);
    }
  };

  // SN-45: Xử lý hủy đơn hàng
  const handleCancelOrderSubmit = async (reason: string) => {
    if (!cancelingOrder?.id) return;
    try {
      const updatedOrder = await ordersService.updateOrderStatus(cancelingOrder.id, 'CANCELLED', reason);
      showToast('success', 'Đã hủy đơn hàng và nhả tồn kho thành công');
      setCancelingOrder(null);
      setOrders((current) => current.map((item) => item.id === updatedOrder.id ? updatedOrder : item));
      setViewOrder((current) => current?.id === updatedOrder.id ? updatedOrder : current);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi hủy đơn hàng';
      throw new Error(message);
    }
  };

  const handleApproveOrder = (order: Order): void => {
    setApprovingOrderModal(order);
  };

  /** Xác nhận duyệt đơn và kích hoạt giữ chỗ tồn kho 24h (SN-180) */
  const handleConfirmApprove = async (order: Order): Promise<void> => {
    if (!order.id || isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const res = await ordersService.approveOrder(order.id);
      showToast('success', res.message || 'Đã duyệt đơn và giữ chỗ tồn kho 24 giờ thành công!');
      setApprovingOrderModal(null);
      setRefreshKey((k) => k + 1);
      if (viewOrder?.id === order.id) {
        setViewOrder({
          ...viewOrder,
          status: 'APPROVED',
          reservedUntil: res.reservedUntil,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi duyệt đơn và giữ chỗ tồn kho';
      showToast('error', msg);
    } finally {
      setIsProcessingAction(false);
    }
  };

  /** Xác nhận hủy đơn và tự động nhả tồn giữ chỗ (SN-180) */
  const handleConfirmCancel = async (order: Order): Promise<void> => {
    if (!order.id || isProcessingAction) return;
    if (!cancelReasonInput.trim()) {
      showToast('error', 'Vui lòng nhập lý do hủy đơn hàng');
      return;
    }
    setIsProcessingAction(true);
    try {
      const cancelled = await ordersService.cancelOrder(order.id, cancelReasonInput.trim());
      showToast('success', `Đã hủy đơn ${order.orderCode || ''}. Toàn bộ tồn kho giữ chỗ đã được hoàn lại!`);
      setCancellingOrderModal(null);
      setCancelReasonInput('');
      setRefreshKey((k) => k + 1);
      if (viewOrder?.id === order.id) {
        setViewOrder(cancelled);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi hủy đơn hàng';
      showToast('error', msg);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <>
      <div className="space-y-6">

        {/* ── THỐNG KÊ DOANH SỐ & TỔNG TIỀN ĐANG LỌC (SN-46) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Card 1: Tổng số đơn hàng */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex items-center">
            <div className="w-12 h-12 rounded-lg bg-indigo-50/80 text-indigo-600 border border-indigo-100/60 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="ml-4 w-0 flex-1 min-w-0">
              <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Số đơn đang lọc</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{total}</span>
                <span className="text-xs text-slate-400 font-medium">đơn</span>
              </dd>
            </div>
          </div>

          {/* Card 2: Tổng tiền tập kết quả đang lọc (Tiêu chí then chốt SN-46) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex items-center">
            <div className="w-12 h-12 rounded-lg bg-emerald-50/80 text-emerald-600 border border-emerald-100/60 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="ml-4 w-0 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Tổng tiền đang lọc</dt>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/50">
                  Toàn tập lọc
                </span>
              </div>
              <dd className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate tabular-nums" title={formatCurrency(totalAmount)}>
                {formatCurrency(totalAmount)}
              </dd>
            </div>
          </div>
        </div>

        {/* ── BỘ LỌC ĐA TIÊU CHÍ & HÀNH ĐỘNG (SN-46) ── */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 space-y-3.5 shadow-xs">
          {/* Hàng 1: Ô tìm kiếm + Khoảng ngày + Nhóm nút hành động */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            {/* Ô tìm kiếm từ khóa */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã đơn, tên đại lý, mã đại lý, nhân viên..."
                className="w-full pl-10 pr-9 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/60 hover:bg-white focus:bg-white transition-all placeholder-slate-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                  title="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Bộ lọc từ ngày - đến ngày */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              {/* Ô Từ ngày (chuẩn dd/mm/yyyy) */}
              <div className="relative flex items-center gap-1.5 bg-slate-50/80 hover:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all shadow-2xs h-9 min-w-[130px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
                <span className="text-[11px] text-slate-500 whitespace-nowrap font-medium pointer-events-none">Từ:</span>
                <DateInput
                  compact={true}
                  value={fromDate}
                  onChange={handleFromDateChange}
                  max={toDate || undefined}
                  placeholder="dd/mm/yyyy"
                  className="w-full text-xs"
                  title="Chọn ngày bắt đầu (dd/mm/yyyy)"
                />
                {fromDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFromDateChange('');
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors ml-0.5 cursor-pointer z-10"
                    title="Xóa ngày bắt đầu"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Ô Đến ngày (chuẩn dd/mm/yyyy, min = fromDate) */}
              <div className={`relative flex items-center gap-1.5 bg-slate-50/80 hover:bg-white border rounded-lg px-2.5 py-1.5 transition-all shadow-2xs h-9 min-w-[130px] ${
                fromDate && toDate && toDate < fromDate
                  ? 'border-rose-400 ring-2 ring-rose-100'
                  : 'border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10'
              }`}>
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
                <span className="text-[11px] text-slate-500 whitespace-nowrap font-medium pointer-events-none">Đến:</span>
                <DateInput
                  compact={true}
                  value={toDate}
                  onChange={handleToDateChange}
                  min={fromDate || undefined}
                  placeholder="dd/mm/yyyy"
                  className="w-full text-xs"
                  title="Chọn ngày kết thúc (dd/mm/yyyy)"
                />
                {toDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToDateChange('');
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors ml-0.5 cursor-pointer z-10"
                    title="Xóa ngày kết thúc"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Cụm nút hành động: Làm mới & Tạo đơn hàng (trên màn hình lớn >= xl) */}
            <div className="flex items-center gap-2 shrink-0 self-end xl:self-auto">
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                title="Làm mới danh sách đơn hàng"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 shrink-0 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`}
                />
                <span className="hidden sm:inline">Làm mới</span>
              </button>

              {(isWarehouse || isAdmin) && (
                <button
                  type="button"
                  onClick={() => navigate('/warehouse/picking')}
                  className="hidden xl:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                  title="Soạn hàng theo vị trí kho từ đơn đã duyệt"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Phiếu soạn hàng</span>
                </button>
              )}

              {(isSalesRep || isSalesManager || isAdmin) && (
                <button
                  type="button"
                  onClick={() => navigate('/sales/orders/create')}
                  className="hidden xl:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                  title="Tạo đơn hàng bán buôn mới"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Tạo Đơn hàng</span>
                </button>
              )}
            </div>
          </div>

          {/* Hàng 2: Bộ lọc (Trạng thái, Khu vực) & Nút Reset + Nút Tạo đơn hàng trên màn hình nhỏ */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Bộ lọc:</span>
              </div>

              {/* 1. Dropdown Trạng thái đơn hàng */}
              <div className="w-full sm:w-48 md:w-52">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as OrderStatus | 'ALL');
                    setPage(1);
                  }}
                  aria-label="Lọc theo trạng thái đơn hàng"
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
                >
                  {STATUS_TABS.map((tab) => (
                    <option key={tab.key} value={tab.key}>
                      {tab.key === 'ALL' ? 'Tất cả trạng thái' : tab.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Dropdown Khu vực */}
              <div className="w-full sm:w-40 md:w-44">
                <select
                  value={selectedRegion}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  aria-label="Lọc theo khu vực"
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
                >
                  <option value="ALL">Tất cả khu vực</option>
                  <option value="Miền Bắc">Miền Bắc</option>
                  <option value="Miền Trung">Miền Trung</option>
                  <option value="Miền Nam">Miền Nam</option>
                </select>
              </div>

              {urlCustomerId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs max-w-xs truncate" title={filterCustomerName ? `Đang lọc theo đại lý: ${filterCustomerName}` : undefined}>
                  <span className="truncate">Đại lý: {filterCustomerName || urlCustomerId}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.delete('customerId');
                      setSearchParams(next);
                    }}
                    className="p-0.5 hover:bg-indigo-100 rounded-full cursor-pointer transition-colors shrink-0"
                    title="Bỏ lọc theo đại lý"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Nút Đặt lại bộ lọc */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-all shrink-0 cursor-pointer shadow-2xs"
                  title="Đặt lại toàn bộ tiêu chí lọc"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xóa lọc</span>
                </button>
              )}
            </div>

            {/* Nút Tạo đơn hàng xuất hiện ở dòng thứ 2 trên màn hình nhỏ (< xl) */}
            {(isSalesRep || isSalesManager || isAdmin) && (
              <div className="xl:hidden shrink-0 pt-1 sm:pt-0">
                <button
                  type="button"
                  onClick={() => navigate('/sales/orders/create')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                  title="Tạo đơn hàng bán buôn mới"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Tạo Đơn hàng</span>
                </button>
              </div>
            )}
          </div>

          {/* Hàng 3: Thanh Tab nhanh trạng thái đơn hàng (Quick Status Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2.5 border-t border-slate-100 no-scrollbar">
            {STATUS_TABS.map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {tab.key === 'PACKED' && <PackageCheck className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Danh sách đơn hàng */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">

          {isInitialLoading && loading && orders.length === 0 ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Đang tải danh sách đơn hàng...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-25 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">
                {hasActiveFilters
                  ? 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc'
                  : 'Chưa có đơn hàng nào'}
              </p>
              {hasActiveFilters ? (
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hãy thử đổi từ khóa tìm kiếm hoặc nới rộng khoảng thời gian.
                </p>
              ) : (
                (isSalesRep || isSalesManager || isAdmin) && (
                  <button
                    onClick={() => navigate('/sales/orders/create')}
                    className="mt-3 text-sm text-indigo-600 hover:underline inline-block font-semibold"
                  >
                    + Tạo đơn hàng đầu tiên
                  </button>
                )
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table: Tối ưu chuẩn 6 cột, cuộn ngang mượt mà trên tablet */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm divide-y divide-slate-100">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left w-[18%]">
                        Mã đơn
                      </th>
                      <th className="px-4 py-3 text-left w-[32%]">
                        Đại lý
                      </th>
                      <th className="px-4 py-3 text-left w-[14%]">
                        Ngày giao
                      </th>
                      <th className="px-4 py-3 text-right w-[16%]">
                        Tổng phải thu
                      </th>
                      <th className="px-4 py-3 text-center w-[10%]">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-right w-[10%] min-w-[105px]">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y divide-slate-100/90 transition-opacity duration-150 ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                    {orders.map((order) => {
                      return (
                        <tr key={order.id} className="hover:bg-indigo-50/25 transition-colors group">
                          {/* 1. Mã đơn: Interactive monospace badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setViewOrder(order)}
                              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/60 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs group-hover:border-indigo-300"
                              title={`Xem chi tiết đơn ${order.orderCode ?? order.id}`}
                            >
                              <FileText className="w-3 h-3 text-indigo-500 group-hover:text-indigo-700 transition-colors" />
                              <span>{order.orderCode ?? order.id?.slice(-8)}</span>
                            </button>
                          </td>

                          {/* 2. Đại lý: Typography đẹp, click để xem */}
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => setViewOrder(order)}
                              className="text-left font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-1 text-sm cursor-pointer block max-w-full"
                              title={order.customerName}
                            >
                              {order.customerName}
                            </button>
                          </td>

                          {/* 3. Ngày giao: Clean badge với icon Calendar */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              {formatDate(order.deliveryDate)}
                            </span>
                          </td>

                          {/* 4. Tổng phải thu: Tabular figures, bold, crisp alignment */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900 tabular-nums text-sm">
                              {formatCurrency(order.grandTotal)}
                            </span>
                          </td>

                          {/* 5. Trạng thái */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <OrderStatusBadge status={order.status} reservedUntil={order.reservedUntil} />
                            {(order.isShortDelivery ||
                              order.lines?.some(
                                (l) => l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity,
                              )) && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-500" /> Giao thiếu
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 6. Thao tác: Giữ chữ "Thao tác" không bao giờ bị nhảy dòng */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="relative inline-flex items-center justify-end order-action-dropdown-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (openActionMenuId === order.id) {
                                    setOpenActionMenuId(null);
                                    setActionMenuAnchor(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const shouldDropUp = spaceBelow < 280 && rect.top > 280;
                                    setActionMenuAnchor({
                                      top: shouldDropUp ? rect.top - 4 : rect.bottom + 4,
                                      right: window.innerWidth - rect.right,
                                      isDropUp: shouldDropUp,
                                    });
                                    setOpenActionMenuId(order.id ?? null);
                                  }
                                }}
                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none whitespace-nowrap shrink-0 ${
                                  openActionMenuId === order.id
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-500/10'
                                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300'
                                }`}
                                title="Thao tác"
                              >
                                <span className="whitespace-nowrap">Thao tác</span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                                    openActionMenuId === order.id ? 'rotate-180 text-indigo-600' : ''
                                  }`}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Dropdown Menu Portal Thao tác */}
              {openActionMenuId && actionMenuAnchor && typeof document !== 'undefined' && (() => {
                const order = orders.find((o) => o.id === openActionMenuId);
                if (!order) return null;
                return createPortal(
                  <div
                    className="order-action-portal-menu fixed w-48 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-[9999] animate-in fade-in zoom-in-95 text-left divide-y divide-slate-100"
                    style={{
                      top: actionMenuAnchor.isDropUp ? undefined : `${actionMenuAnchor.top}px`,
                      bottom: actionMenuAnchor.isDropUp ? `${window.innerHeight - actionMenuAnchor.top}px` : undefined,
                      right: `${actionMenuAnchor.right}px`,
                    }}
                  >
                    <div className="py-1">
                      {/* 1. Xem chi tiết */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionMenuAnchor(null);
                          setViewOrder(order);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                        <span>Xem chi tiết</span>
                      </button>

                      {/* 2. Chỉnh sửa đơn nháp / trả lại */}
                      {!isWarehouseManager && (order.status === 'DRAFT' || order.status === 'RETURNED_FOR_UPDATE') && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionMenuId(null);
                            setActionMenuAnchor(null);
                            navigate(`/sales/orders/edit/${order.id}`);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                        >
                          <Edit3 className="w-4 h-4 text-indigo-600" />
                          <span>Chỉnh sửa đơn</span>
                        </button>
                      )}

                      {/* 3. Duyệt đơn hàng */}
                      {!isWarehouseManager && (isAdmin || isSalesManager) &&
                        (order.status === 'PENDING' ||
                          order.status === 'PENDING_APPROVAL' ||
                          order.status === 'DRAFT' ||
                          order.status === 'PENDING_INVENTORY_APPROVAL') && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              setActionMenuAnchor(null);
                              setApprovingOrderModal(order);
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Duyệt đơn hàng</span>
                          </button>
                        )}
                    </div>

                    <div className="py-1">
                      {/* 4. In / Xuất PDF */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionMenuAnchor(null);
                          handleOpenPrint(order);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-slate-400" />
                        <span>In / Xuất PDF</span>
                      </button>

                      {/* 5. Sao chép đơn */}
                      {!isWarehouseManager && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionMenuId(null);
                            setActionMenuAnchor(null);
                            void handleCloneOrder(order);
                          }}
                          disabled={isCloning === order.id}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isCloning === order.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                          <span>Sao chép đơn</span>
                        </button>
                      )}

                      {/* 6. Đặt lại đơn này */}
                      {!isWarehouseManager && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionMenuId(null);
                            setActionMenuAnchor(null);
                            setSelectedOrderForReorder(order);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4 text-slate-400" />
                          <span>Đặt lại đơn hàng</span>
                        </button>
                      )}
                    </div>

                    {/* 7. Hủy đơn */}
                    {!isWarehouseManager &&
                      order.status !== 'CANCELLED' &&
                      order.status !== 'DELIVERED' &&
                      order.status !== 'SHIPPED' &&
                      order.status !== 'APPROVED' &&
                      order.status !== 'PROCESSING' &&
                      order.status !== 'PACKED' &&
                      order.status !== 'DISPATCHED' && (
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              setActionMenuAnchor(null);
                              setCancellingOrderModal(order);
                              setCancelReasonInput('');
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                          >
                            <XCircle className="w-4 h-4 text-rose-500" />
                            <span>Hủy đơn hàng</span>
                          </button>
                        </div>
                      )}
                  </div>,
                  document.body
                );
              })()}

              {/* Mobile Card */}
              <div className={`sm:hidden divide-y divide-slate-100 transition-opacity duration-150 ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors space-y-2.5"
                  >
                    <div
                      onClick={() => setViewOrder(order)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">
                            {order.orderCode} · {formatDate(order.createdAt)}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {order.salesRepName ? `NVKD: ${order.salesRepName}` : ''}
                            {order.region ? ` · ${order.region}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrency(order.grandTotal)}
                          </p>
                          <div className="mt-1">
                            <OrderStatusBadge status={order.status} reservedUntil={order.reservedUntil} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nút hành động nhanh trên di động: Chạm chuẩn Mobile-first (Touch target >= 36-40px) */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      {!isWarehouseManager && (isAdmin || isSalesManager) &&
                        (order.status === 'PENDING' ||
                          order.status === 'PENDING_APPROVAL' ||
                          order.status === 'DRAFT' ||
                          order.status === 'PENDING_INVENTORY_APPROVAL') && (
                          <button
                            type="button"
                            onClick={() => setApprovingOrderModal(order)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Duyệt</span>
                          </button>
                        )}
                      {!isWarehouseManager &&
                        order.status !== 'CANCELLED' &&
                        order.status !== 'DELIVERED' &&
                        order.status !== 'SHIPPED' &&
                        order.status !== 'APPROVED' &&
                        order.status !== 'PROCESSING' &&
                        order.status !== 'PACKED' &&
                        order.status !== 'DISPATCHED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingOrderModal(order);
                              setCancelReasonInput('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Hủy</span>
                          </button>
                        )}
                      {!isWarehouseManager && (order.status === 'DRAFT' || order.status === 'RETURNED_FOR_UPDATE') && (
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/sales/orders/edit/${order.id}`);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                          title="Chỉnh sửa / Gõ tiếp đơn nháp"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Gõ tiếp</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setViewOrder(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Chi tiết</span>
                      </button>
                      {!isWarehouseManager && (
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForReorder(order)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                          title="Đặt lại đơn (SN-174)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Đặt lại</span>
                        </button>
                      )}
                      {!isWarehouseManager && (
                        <button
                          type="button"
                          onClick={() => void handleCloneOrder(order)}
                          disabled={isCloning === order.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                          title="Sao chép đơn thành đơn mới (SN-48)"
                        >
                          {isCloning === order.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>Sao chép</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenPrint(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                        title="In / Xuất PDF (SN-47)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>In / PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Thanh phân trang gắn liền chân bảng LOHA SALES */}
              {total > 0 && (
                <Pagination
                  variant="default"
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={limit}
                  pageSizeOptions={[10, 20, 50]}
                  itemLabel="đơn hàng"
                  showRecordRange={false}
                  showFirstLast={false}
                  onPageChange={(p) => setPage(p)}
                  onPageSizeChange={(sz) => {
                    setLimit(sz);
                    setPage(1);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      

      {/* Modal Xem chi tiết đơn hàng */}
      {viewOrder && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Chi tiết Đơn hàng
                </h2>
                <p className="text-xs text-slate-500">{viewOrder.orderCode}</p>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SN-45: Hiển thị Vòng đời đơn hàng */}
            <div className="border-b border-slate-100 bg-white">
              <OrderTimeline status={viewOrder.status} shipmentStatus={orderShipment?.status} />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Thông tin đại lý */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Đại lý:</span>
                  <span className="font-medium text-slate-800">{viewOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày giao:</span>
                  <span className="text-slate-700">{formatDate(viewOrder.deliveryDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nhân viên KD:</span>
                  <span className="text-slate-700">{viewOrder.salesRepName ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Trạng thái:</span>
                  <OrderStatusBadge status={viewOrder.status} reservedUntil={viewOrder.reservedUntil} />
                </div>
                {viewOrder.status === 'APPROVED' && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs flex items-start gap-2 mt-2">
                    <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-indigo-950">Đơn đã duyệt & Đang giữ chỗ tồn kho</p>
                      <p className="mt-0.5 text-indigo-800">
                        Toàn bộ số lượng hàng trong đơn đã được giữ chỗ an toàn. Tồn khả dụng của sản phẩm đã bị trừ để tránh bán mất cho khách khác.
                        {viewOrder.reservedUntil && (
                          <span className="block mt-1 font-semibold text-indigo-900">
                            Hạn giữ chỗ: {formatDate(viewOrder.reservedUntil)} (Tự động nhả tồn sau 24h nếu chưa xuất kho).
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {viewOrder.status === 'PROCESSING' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-start gap-2 mt-2">
                    <Package className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-purple-950">Đơn hàng đang soạn kho (FEFO)</p>
                      <p className="mt-0.5 text-purple-800">
                        Kho vận đang soạn hàng theo nguyên tắc First-Expired, First-Out (FEFO) và tiến hành đóng gói để bàn giao vận chuyển.
                      </p>
                    </div>
                  </div>
                )}
                {viewOrder.status === 'PACKED' && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs flex items-start gap-2 mt-2">
                    <PackageCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-indigo-950">Đơn hàng đã đóng gói hoàn tất</p>
                      <p className="mt-0.5 text-indigo-800">
                        Kho vận đã hoàn tất đóng gói và dán mã vận đơn. Đơn hàng sẵn sàng bàn giao cho đơn vị vận chuyển.
                      </p>
                    </div>
                  </div>
                )}
                {viewOrder.status === 'SHIPPED' && (
                  <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-900 text-xs flex items-start gap-2 mt-2">
                    <Truck className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-cyan-950">Đơn hàng đã xuất kho & Đang giao hàng</p>
                      <p className="mt-0.5 text-cyan-800">
                        Hàng hóa đã được xuất khỏi kho và bàn giao cho đơn vị vận chuyển để giao tới đại lý.
                      </p>
                    </div>
                  </div>
                )}
                {viewOrder.status === 'DELIVERED' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2 mt-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-950">Đơn hàng đã giao thành công</p>
                      <p className="mt-0.5 text-emerald-800">
                        Đại lý đã tiếp nhận đủ hàng hóa và hoàn tất quy trình giao nhận xuất kho.
                      </p>
                    </div>
                  </div>
                )}
                {viewOrder.status === 'CANCELLED' && viewOrder.cancelReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2 mt-2">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-950">Đơn hàng đã bị hủy</p>
                      <p className="mt-0.5 text-rose-800">
                        Lý do hủy: <span className="font-semibold text-rose-900">{viewOrder.cancelReason}</span>. Tồn kho giữ chỗ (nếu có) đã được tự động hoàn lại vào kho khả dụng.
                      </p>
                    </div>
                  </div>
                )}
                {viewOrder.isCreditLimitExceeded && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2 mt-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Đơn hàng vượt hạn mức công nợ</p>
                      <p className="mt-0.5 text-amber-800">
                        Đơn hàng làm vượt hạn mức {formatCurrency(viewOrder.creditLimitExceededAmount || 0)}. Đang ở trạng thái chờ Quản lý kinh doanh / Kế toán phê duyệt.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {viewOrder.requiresApproval && (viewOrder.approvalReasons?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  <p className="font-semibold">Đơn cần quản lý duyệt</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                    {viewOrder.approvalReasons?.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
              )}

              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <History className="w-3.5 h-3.5" />
                  Lịch sử xét duyệt
                  <span className="ml-auto text-[10px] font-normal text-slate-400">Chỉ xem</span>
                </div>
                <div className="p-3 space-y-3">
                  {isLoadingApprovalHistory ? (
                    <p className="text-xs text-slate-400">Đang tải lịch sử...</p>
                  ) : approvalHistory.length === 0 ? (
                    <p className="text-xs text-slate-400">Chưa có quyết định xét duyệt.</p>
                  ) : approvalHistory.map((entry) => {
                    const actionLabel: Record<OrderApprovalAction, string> = {
                      APPROVE: 'Đã duyệt',
                      REJECT: 'Đã từ chối',
                      RETURN_FOR_UPDATE: 'Đã trả lại sửa',
                    };
                    return (
                      <article key={entry.id} className="border-l-2 border-blue-200 pl-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <span className="font-semibold text-slate-700">
                            {actionLabel[entry.action]} · {entry.approverName}
                          </span>
                          <time className="text-slate-400">
                            {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.createdAt))}
                          </time>
                        </div>
                        {entry.comment && <p className="mt-1 whitespace-pre-wrap text-slate-600">{entry.comment}</p>}
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* Thông tin Phiếu xuất kho & Vận chuyển giao hàng (Đồng bộ thời gian thực) */}
              {orderShipment && (
                <section className="rounded-xl border border-blue-200 bg-blue-50/40 overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-blue-100/70 border-b border-blue-200 text-xs font-bold text-blue-900">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-700" />
                      <span>Phiếu Xuất Kho & Vận Chuyển</span>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                      {orderShipment.id}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Trạng thái xuất kho:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          orderShipment.status === 'DELIVERED'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : orderShipment.status === 'SHIPPED'
                            ? 'bg-purple-50 border-purple-200 text-purple-700'
                            : orderShipment.status === 'PACKED'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : orderShipment.status === 'PICKING'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : orderShipment.status === 'CANCELLED'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        {orderShipment.status === 'DELIVERED'
                          ? 'Giao thành công'
                          : orderShipment.status === 'SHIPPED'
                          ? 'Đang giao hàng'
                          : orderShipment.status === 'PACKED'
                          ? 'Đã đóng gói'
                          : orderShipment.status === 'PICKING'
                          ? 'Đang soạn hàng (FEFO)'
                          : orderShipment.status === 'CANCELLED'
                          ? 'Đã hủy phiếu'
                          : 'Chờ soạn hàng'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Đơn vị vận chuyển:</span>
                      <span className="font-medium text-slate-800">{orderShipment.carrierName || 'Tự vận chuyển'}</span>
                    </div>

                    {orderShipment.trackingNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Mã vận đơn:</span>
                        <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 text-xs shadow-2xs">
                          {orderShipment.trackingNumber}
                        </span>
                      </div>
                    )}

                    {orderShipment.receiverName && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Người nhận hàng:</span>
                        <span className="font-medium text-slate-800">
                          {orderShipment.receiverName} {orderShipment.phone ? `(${orderShipment.phone})` : ''}
                        </span>
                      </div>
                    )}

                    {orderShipment.deliveryAddress && (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Địa chỉ giao:</span>
                        <span className="text-slate-800 text-right font-medium">{orderShipment.deliveryAddress}</span>
                      </div>
                    )}

                    {orderShipment.updatedAt && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-blue-100">
                        <span>Cập nhật gần nhất:</span>
                        <time>{formatDate(orderShipment.updatedAt)}</time>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Cảnh báo Giao thiếu hàng nếu có (SN-170) */}
              {(viewOrder.isShortDelivery ||
                viewOrder.lines.some(
                  (l) => l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity,
                )) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Đơn hàng được ghi nhận giao thiếu một số dòng hàng (SN-170)</p>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      Kho vận và nhân viên giao hàng đã ghi nhận chênh lệch số lượng thực giao so với số lượng đặt. Vui lòng đối chiếu với biên bản giao nhận.
                    </p>
                  </div>
                </div>
              )}

              {/* Danh sách dòng hàng */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  Danh sách hàng
                </div>
                {viewOrder.lines.map((line, i) => {
                  const isLineShort =
                    line.isShortDelivery ||
                    (line.deliveredQuantity !== undefined && line.deliveredQuantity < line.quantity);

                  return (
                    <div
                      key={i}
                      className={`px-3 py-2.5 border-b border-slate-100 last:border-0 ${
                        isLineShort ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {line.productName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {line.quantity} {line.unit} × {formatCurrency(line.unitPrice)}
                            {line.discountPercent > 0 && (
                              <span className="ml-1 text-green-600">(-{line.discountPercent}%)</span>
                            )}
                          </p>
                          {/* Hiển thị số lượng thực giao nếu có giao thiếu (SN-170) */}
                          {isLineShort && (
                            <div className="mt-1 space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                Thực giao: {line.deliveredQuantity} / {line.quantity} {line.unit} (Thiếu {line.quantity - (line.deliveredQuantity || 0)} {line.unit})
                              </span>
                              {line.shortDeliveryReason && (
                                <p className="text-[11px] text-amber-700 italic">
                                  Lý do: {line.shortDeliveryReason}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-800 shrink-0">
                          {formatCurrency(line.lineTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tổng kết */}
              <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền hàng</span>
                  <span>{formatCurrency(viewOrder.subtotal)}</span>
                </div>
                {viewOrder.totalDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Chiết khấu</span>
                    <span>- {formatCurrency(viewOrder.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-100">
                  <span>Tổng phải thu</span>
                  <span className="text-blue-700">{formatCurrency(viewOrder.grandTotal)}</span>
                </div>
              </div>

              {viewOrder.isCustomerLocked && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed mb-3">
                  <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    CẢNH BÁO SN-36: Đại lý đang bị KHÓA GIAO DỊCH
                  </p>
                  {viewOrder.warningMessage || 'Đại lý của đơn hàng này hiện đang bị khóa giao dịch. Đơn dở vẫn xử lý tiếp nhưng cần cảnh báo trước khi duyệt/xuất kho.'}
                </div>
              )}

              {viewOrder.note && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5">
                  <span className="font-medium text-slate-700">Ghi chú: </span>
                  {viewOrder.note}
                </div>
              )}

              {viewOrder.cancelReason && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <span className="font-semibold text-red-800">Lý do hủy: </span>
                  {viewOrder.cancelReason}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {!isWarehouseManager && (
                  <button
                    type="button"
                    onClick={() => {
                      const ord = viewOrder;
                      setViewOrder(null);
                      setSelectedOrderForReorder(ord);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                    title="Đặt lại đơn hàng này theo bảng giá hiện hành (SN-174)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại đơn</span>
                  </button>
                )}

                {!isWarehouseManager && (
                  <button
                    type="button"
                    onClick={() => void handleCloneOrder(viewOrder)}
                    disabled={isCloning === viewOrder.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                    title="Sao chép đơn cũ thành đơn mới ở trạng thái Nháp (SN-48)"
                  >
                    {isCloning === viewOrder.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Sao chép đơn</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenPrint(viewOrder)}
                  className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                  title="In hoặc xuất PDF đơn hàng cho đại lý xem tại chỗ (SN-47)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / Xuất PDF</span>
                </button>

                {/* Nút Soạn phiếu chỉ xuất hiện khi đơn Đã duyệt và chưa trong quá trình đang soạn hoặc trở lên */}
                {viewOrder.status === 'APPROVED' && (!orderShipment || orderShipment.status === 'CANCELLED') && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderForShipment(viewOrder);
                      setIsCreateShipmentOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                    title="Soạn phiếu xuất kho & giao hàng cho đơn hàng đang xem"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Soạn phiếu</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isWarehouseManager && (viewOrder.status === 'DRAFT' || viewOrder.status === 'RETURNED_FOR_UPDATE') && (
                  <button
                    type="button"
                    onClick={() => {
                      const ordId = viewOrder.id;
                      setViewOrder(null);
                      navigate(`/sales/orders/edit/${ordId}`);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
                    title="Chỉnh sửa hoặc tiếp tục gõ đơn hàng nháp này"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa / Gõ tiếp</span>
                  </button>
                )}
                {!isWarehouseManager && (isAdmin || isSalesManager) &&
                  (viewOrder.status === 'PENDING' || viewOrder.status === 'PENDING_APPROVAL') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApproveOrder(viewOrder)}
                      disabled={approvingOrder}
                      className="inline-flex items-center justify-center gap-2 h-[38px] rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {approvingOrder ? 'Đang lưu...' : 'Duyệt'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDecisionComment(''); setDecisionAction('REJECT'); }}
                      disabled={approvingOrder}
                      className="inline-flex items-center justify-center gap-2 h-[38px] rounded-lg border border-rose-200 bg-rose-50 px-3.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" /> Từ chối
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDecisionComment(''); setDecisionAction('RETURN_FOR_UPDATE'); }}
                      disabled={approvingOrder}
                      className="inline-flex items-center justify-center gap-2 h-[38px] rounded-lg border border-amber-200 bg-amber-50 px-3.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60 cursor-pointer"
                    >
                      <CornerUpLeft className="h-4 w-4" /> Trả lại sửa
                    </button>
                  </>
                )}
                {!isWarehouseManager && !['APPROVED', 'PROCESSING', 'PACKED', 'DISPATCHED', 'SHIPPED', 'DELIVERED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(viewOrder.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancellingOrderModal(viewOrder);
                      setCancelReasonInput('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Hủy đơn hàng và tự động nhả tồn giữ chỗ (SN-180)"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Hủy đơn</span>
                  </button>
                )}
                <button
                  onClick={() => setViewOrder(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Hủy Đơn Hàng (SN-45) */}
      <CancelOrderModal
        isOpen={Boolean(cancelingOrder)}
        orderCode={cancelingOrder?.orderCode || ''}
        onClose={() => setCancelingOrder(null)}
        onConfirm={handleCancelOrderSubmit}
      />

      {/* Modal In & Xuất PDF Đơn hàng (SN-47) */}
      <OrderPrintModal
        order={printOrder}
        isOpen={Boolean(printOrder)}
        onClose={handleClosePrint}
      />

      {/* Modal Soạn Phiếu Xuất Kho & Giao Hàng Mới */}
      <CreateShipmentModal
        isOpen={isCreateShipmentOpen}
        onClose={() => {
          setIsCreateShipmentOpen(false);
          setOrderForShipment(null);
        }}
        order={orderForShipment}
        onSuccess={(created) => {
          setRefreshKey((k) => k + 1);
          if (viewOrder && (viewOrder.orderCode === created.orderCode || viewOrder.id === created.orderId)) {
            setViewOrder((prev) => (prev ? { ...prev, status: 'PROCESSING' } : null));
            setOrderShipment(created);
          }
        }}
      />

      {/* Modal Xác nhận Duyệt Đơn & Giữ chỗ Tồn kho (SN-180) */}
      {approvingOrderModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-4 ring-indigo-100">
                <Lock className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  Xác nhận Duyệt đơn & Giữ chỗ Tồn kho
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Đơn hàng: <span className="font-semibold text-slate-800">{approvingOrderModal.orderCode}</span> · Đại lý: <span className="font-semibold text-slate-800">{approvingOrderModal.customerName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApprovingOrderModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cảnh báo ACID Transaction */}
            <div className="my-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                Cơ chế giữ chỗ tự động (ACID Transaction):
              </div>
              <p className="text-indigo-800">
                Ngay khi bấm duyệt, hệ thống sẽ <strong>giữ chỗ toàn bộ hàng hóa</strong> trong đơn trong <strong>24 giờ</strong>. Tồn khả dụng sẽ bị trừ tương ứng để chắc chắn hàng đã chốt không bị bán mất cho khách khác.
              </p>
            </div>

            {/* Danh sách dòng hàng giữ chỗ */}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-600">
                Mặt hàng sẽ được giữ chỗ:
              </div>
              {approvingOrderModal.lines.map((line, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-slate-800 truncate">{line.productName}</p>
                    <p className="text-[11px] text-slate-400">{line.productSku}</p>
                  </div>
                  <span className="shrink-0 font-bold text-indigo-700">
                    {line.quantity} {line.unit}
                    {line.conversionRate > 1 && ` (${line.baseQuantity} ${line.baseUnit})`}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setApprovingOrderModal(null)}
                disabled={isProcessingAction}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmApprove(approvingOrderModal)}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {isProcessingAction ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang giữ chỗ...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Xác nhận Duyệt & Giữ chỗ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Xác nhận Hủy Đơn Hàng & Nhả Tồn Kho (SN-180) */}
      {cancellingOrderModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-4 ring-rose-100">
                <XCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  Xác nhận Hủy Đơn Hàng
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Đơn hàng: <span className="font-semibold text-slate-800">{cancellingOrderModal.orderCode}</span> ({cancellingOrderModal.customerName})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancellingOrderModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thông báo nhả tồn tự động */}
            <div className="my-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <Clock className="h-4 w-4 text-amber-700" />
                Cơ chế nhả tồn kho tự động:
              </div>
              <p className="text-amber-800">
                Toàn bộ số lượng hàng hóa đang được giữ chỗ cho đơn này (nếu đã duyệt) sẽ được <strong>TỰ ĐỘNG HOÀN LẠI VÀO KHO KHẢ DỤNG</strong> ngay khi đơn hủy.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cancel-reason-input" className="block text-xs font-bold text-slate-700">
                Lý do hủy đơn hàng <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="cancel-reason-input"
                autoFocus
                required
                rows={3}
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="Nhập lý do hủy (ví dụ: Khách đổi ý không lấy hàng, trùng đơn...)..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setCancellingOrderModal(null)}
                disabled={isProcessingAction}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmCancel(cancellingOrderModal)}
                disabled={isProcessingAction || !cancelReasonInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {isProcessingAction ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang hủy...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Xác nhận Hủy Đơn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Đặt lại đơn hàng theo giá hiện hành (SN-174) */}
      {selectedOrderForReorder && (
        <ReorderModal
          order={selectedOrderForReorder}
          isOpen={Boolean(selectedOrderForReorder)}
          onClose={() => setSelectedOrderForReorder(null)}
          onSuccess={handleReorderSuccess}
        />
      )}

      {decisionAction && viewOrder && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <form
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              void submitApprovalDecision(viewOrder, decisionAction, decisionComment);
            }}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">
                {decisionAction === 'REJECT' ? 'Từ chối đơn hàng' : 'Trả đơn hàng về chỉnh sửa'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {viewOrder.orderCode} · Ý kiến sẽ được lưu vào lịch sử xét duyệt.
              </p>
            </div>
            <div className="p-5">
              <label htmlFor="approval-comment" className="mb-2 block text-sm font-medium text-slate-700">
                Ý kiến bắt buộc
              </label>
              <textarea
                id="approval-comment"
                autoFocus
                required
                minLength={1}
                maxLength={2000}
                rows={4}
                value={decisionComment}
                onChange={(event) => setDecisionComment(event.target.value)}
                placeholder="Nhập lý do từ chối hoặc nội dung cần chỉnh sửa..."
                className="w-full resize-y rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => { setDecisionAction(null); setDecisionComment(''); }}
                className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >Hủy</button>
              <button
                type="submit"
                disabled={approvingOrder || !decisionComment.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {approvingOrder ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
};
