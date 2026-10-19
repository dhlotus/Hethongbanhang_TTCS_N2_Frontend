import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  PackageCheck,
  Clock,
  XCircle,
  FileText,
  MapPin,
  User,
  Trash2,
  AlertCircle,
  FileImage,
  Route,
  Printer,
  Phone,
  Send,
  Eye,
  Calendar,
  X,
  ChevronDown,
} from 'lucide-react';
import { shipmentsService, type Shipment } from '../services/shipments.service';
import { deliveryTripsService } from '../services/delivery-trips.service';
import type { DeliveryTrip, DeliveryTripStatus } from '../types/delivery-trip';
import { ordersService } from '../services/orders.service';
import type { Order } from '../types/order';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';
import { USER_ROLES } from '../types/auth';
import { ConfirmDeliveryModal, ViewDeliveryProofModal } from '../components/confirm-delivery-modal';
import { CreateDeliveryTripModal } from '../components/create-delivery-trip-modal';
import { DeliveryTripDetailModal } from '../components/delivery-trip-detail-modal';
import { PrintTripManifestModal } from '../components/print-trip-manifest-modal';
import { Pagination } from '../components/pagination';

const STATUS_CONFIG: Record<
  Shipment['status'],
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: 'Chờ soạn hàng',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: Clock,
  },
  PICKING: {
    label: 'Đang soạn hàng',
    bg: 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
    icon: RefreshCw,
  },
  PACKED: {
    label: 'Đã đóng gói',
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-700',
    icon: PackageCheck,
  },
  SHIPPED: {
    label: 'Đang giao hàng',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    icon: Truck,
  },
  DELIVERED: {
    label: 'Giao thành công',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    icon: XCircle,
  },
};

const TRIP_STATUS_CONFIG: Record<
  DeliveryTripStatus,
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  DRAFT: {
    label: 'Chờ điều xe',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: Clock,
  },
  ASSIGNED: {
    label: 'Đã gán tài xế',
    bg: 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
    icon: Truck,
  },
  IN_TRANSIT: {
    label: 'Đang giao hàng',
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-700',
    icon: Route,
  },
  COMPLETED: {
    label: 'Giao hoàn tất',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    icon: XCircle,
  },
};

export const ShipmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const roles = user?.roles || [];
  const isAdmin = roles.includes(USER_ROLES.ADMIN);
  const isWarehouseManager = roles.includes(USER_ROLES.WAREHOUSE_MANAGER) || roles.includes('WH_MANAGER');
  const isWarehouseKeeper = roles.includes(USER_ROLES.WAREHOUSE_KEEPER) || roles.includes('WAREHOUSE');

  const canUpdateStatus = isAdmin || isWarehouseManager || isWarehouseKeeper;
  const canCreate = isAdmin || isWarehouseManager || isWarehouseKeeper;
  const canManageTrips = isAdmin || isWarehouseManager || isWarehouseKeeper;
  const canCancel = isAdmin; // Chỉ Admin mới được hủy phiếu
  const canDelete = isAdmin; // Chỉ Admin mới được xóa phiếu

  const location = useLocation();
  const isIssuesPath = location.pathname.includes('/issues');
  const createShipmentUrl = isIssuesPath ? '/inventory/issues/shipments/create' : '/inventory/shipments/create';
  const getShipmentDetailUrl = (id: string) => isIssuesPath ? `/inventory/issues/shipments/${id}` : `/inventory/shipments/${id}`;

  // Active view tab: 'SHIPMENTS' (Phiếu xuất kho lẻ) | 'TRIPS' (Chuyến giao hàng & Phân tuyến SN-196)
  const [activeTab, setActiveTab] = useState<'SHIPMENTS' | 'TRIPS'>('SHIPMENTS');

  // URL Search Parameters
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const urlLimit = parseInt(searchParams.get('limit') || '10', 10);
  const urlSearch = searchParams.get('search') || '';
  const urlStatus = searchParams.get('status') || 'ALL';

  // Dữ liệu Phiếu xuất kho & Phân trang backend
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>(urlSearch);
  const [searchInput, setSearchInput] = useState<string>(urlSearch);
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);
  const [page, setPage] = useState<number>(urlPage > 0 ? urlPage : 1);
  const [limit, setLimit] = useState<number>(urlLimit > 0 ? urlLimit : 10);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Thống kê tổng quan cho 3 KPI Cards
  const [overviewStats, setOverviewStats] = useState({
    total: 0,
    pending: 0,
    shipping: 0,
  });

  // Dữ liệu Chuyến giao hàng (SN-196)
  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [tripSearch, setTripSearch] = useState('');
  const [tripStatusFilter, setTripStatusFilter] = useState<string>('ALL');
  const [tripAreaFilter, setTripAreaFilter] = useState<string>('ALL');

  // Modals quản lý chuyến giao (SN-196)
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [selectedTripForDetail, setSelectedTripForDetail] = useState<DeliveryTrip | null>(null);
  const [selectedTripForPrint, setSelectedTripForPrint] = useState<DeliveryTrip | null>(null);

  // Modal tạo phiếu xuất mới
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrderCode, setNewOrderCode] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newReceiverName, setNewReceiverName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDeliveryAddress, setNewDeliveryAddress] = useState('');
  const [newCarrierName, setNewCarrierName] = useState('Đội xe nội bộ LOHA');
  const [newTrackingNumber, setNewTrackingNumber] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Validation errors
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [orderCodeError, setOrderCodeError] = useState<string | null>(null);
  const [customerNameError, setCustomerNameError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Danh sách đơn hàng sẵn sàng xuất kho để gợi ý
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);

  // Tải danh sách đơn hàng để gợi ý khi mở modal
  useEffect(() => {
    if (isCreateOpen) {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      setNewTrackingNumber(`TRK-${year}-${randomSuffix}`);

      ordersService
        .getOrders({ limit: 100 })
        .then((res) => {
          if (res?.data) {
            // Lọc chỉ các đơn APPROVED / READY_TO_SHIP và CHƯA CÓ PHIẾU XUẤT KHO
            const activeShippedKeys = new Set(
              allShipments
                .filter((s) => s.status !== 'CANCELLED')
                .flatMap((s) => [s.orderCode?.toUpperCase(), s.orderId?.toUpperCase()])
                .filter(Boolean) as string[]
            );
            const valid = res.data.filter((o) => {
              const oId = (o.id || '').toUpperCase();
              const oCode = (o.orderCode || '').toUpperCase();
              const isValidStatus = (o.status as string) === 'APPROVED' || (o.status as string) === 'READY_TO_SHIP';
              return isValidStatus && !activeShippedKeys.has(oId) && !activeShippedKeys.has(oCode);
            });
            setReadyOrders(valid);
          }
        })
        .catch(() => {
          // Bỏ qua nếu có lỗi mạng
        });
    } else {
      setPhoneError(null);
      setOrderCodeError(null);
      setCustomerNameError(null);
      setAddressError(null);
    }
  }, [isCreateOpen]);

  // Hàm kiểm tra tính hợp lệ của số điện thoại
  const validatePhoneInput = (val: string, isSubmitting = false): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return isSubmitting ? 'Vui lòng nhập số điện thoại người nhận hàng' : null;
    }
    if (/[^\d]/.test(trimmed)) {
      return 'Số điện thoại chỉ được chứa các chữ số (0-9), không chứa chữ hay ký tự đặc biệt';
    }
    if (!trimmed.startsWith('0')) {
      return 'Số điện thoại phải bắt đầu bằng số 0 (ví dụ: 0988xxxxxx)';
    }
    if (trimmed.length > 10) {
      return `Số điện thoại chỉ gồm đúng 10 chữ số (bạn đang nhập thừa ${trimmed.length - 10} số)`;
    }
    if (isSubmitting && trimmed.length < 10) {
      return `Số điện thoại phải gồm đúng 10 chữ số (mới nhập ${trimmed.length}/10 số - còn thiếu ${10 - trimmed.length} số)`;
    }
    if (isSubmitting && !/^(03|05|07|08|09|02)[0-9]{8}$/.test(trimmed)) {
      return 'Đầu số điện thoại không hợp lệ (hỗ trợ các đầu số 03, 05, 07, 08, 09, 02)';
    }
    return null;
  };

  // Xử lý thay đổi mã đơn hàng & tự động điền thông tin nếu khớp
  const handleOrderCodeChange = (codeVal: string) => {
    const upper = codeVal.toUpperCase();
    setNewOrderCode(upper);
    const trimmed = upper.trim();
    if (!trimmed) {
      setOrderCodeError('Vui lòng nhập hoặc chọn Mã đơn hàng');
    } else if (trimmed.length < 4) {
      setOrderCodeError('Mã đơn hàng phải có tối thiểu 4 ký tự');
    } else {
      setOrderCodeError(null);
    }

    const matched = readyOrders.find(
      (o) => o.orderCode?.toUpperCase() === trimmed || o.id?.toUpperCase() === trimmed
    );
    if (matched) {
      if (matched.customerName) {
        setNewCustomerName(matched.customerName);
        setCustomerNameError(null);
      }
      const receiver =
        matched.deliveryPoint?.receiverName ||
        matched.deliveryPoint?.contactPerson ||
        matched.customerName ||
        '';
      if (receiver) setNewReceiverName(receiver);

      const phone =
        matched.deliveryPoint?.phone ||
        (matched as any).phone ||
        (matched as any).customerPhone ||
        '';
      if (phone) {
        setNewPhone(phone);
        setPhoneError(validatePhoneInput(phone, false));
      }

      const addr =
        matched.deliveryPoint?.address ||
        (matched as any).deliveryAddress ||
        (matched as any).shippingAddress ||
        '';
      if (addr) {
        setNewDeliveryAddress(addr);
        setAddressError(null);
      }
    }
  };

  const handleCustomerNameChange = (val: string) => {
    setNewCustomerName(val);
    if (!val.trim()) {
      setCustomerNameError('Vui lòng nhập Tên đại lý / Khách hàng');
    } else if (val.trim().length < 2) {
      setCustomerNameError('Tên đại lý phải có tối thiểu 2 ký tự');
    } else {
      setCustomerNameError(null);
    }
  };

  const handleDeliveryAddressChange = (val: string) => {
    setNewDeliveryAddress(val);
    if (!val.trim()) {
      setAddressError('Vui lòng nhập Địa chỉ giao hàng');
    } else if (val.trim().length < 5) {
      setAddressError('Địa chỉ giao hàng quá ngắn, vui lòng nhập chi tiết');
    } else {
      setAddressError(null);
    }
  };

  // Modal cập nhật trạng thái phiếu lẻ
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [updateStatusVal, setUpdateStatusVal] = useState<Shipment['status']>('PICKING');
  const [updateTrackingVal, setUpdateTrackingVal] = useState('');
  const [updateCarrierVal, setUpdateCarrierVal] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // SN-198: Modal Xác nhận giao hàng kèm ảnh chứng từ
  const [deliveryConfirmShipment, setDeliveryConfirmShipment] = useState<Shipment | null>(null);
  // Modal Xem chứng từ giao hàng POD
  const [viewProofShipment, setViewProofShipment] = useState<Shipment | null>(null);

  // Dropdown Thao tác trên từng dòng (Portal pattern đồng bộ hệ thống)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    top: number;
    right: number;
    isDropUp?: boolean;
  } | null>(null);

  // Đóng dropdown thao tác khi click ra ngoài, cuộn trang hoặc nhấn phím Escape
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (
        !(e.target as HTMLElement).closest('.shipment-action-dropdown-container') &&
        !(e.target as HTMLElement).closest('.shipment-action-portal-menu')
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

  // Đồng bộ searchParams từ URL (hỗ trợ nút Back/Forward của trình duyệt)
  useEffect(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    const l = parseInt(searchParams.get('limit') || '10', 10);
    const s = searchParams.get('search') || '';
    const st = searchParams.get('status') || 'ALL';

    const safeP = p > 0 ? p : 1;
    const safeL = l > 0 ? l : 10;

    setPage((prev) => (prev !== safeP ? safeP : prev));
    setLimit((prev) => (prev !== safeL ? safeL : prev));
    setStatusFilter((prev) => (prev !== st ? st : prev));
    setSearchTerm((prev) => (prev !== s ? s : prev));
    setSearchInput((prev) => (prev !== s ? s : prev));
  }, [searchParams]);

  // Cập nhật Query Parameters trên URL
  const updateQueryParams = useCallback(
    (newParams: { page?: number; limit?: number; search?: string; status?: string }) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newParams.page !== undefined) {
          if (newParams.page > 1) next.set('page', String(newParams.page));
          else next.delete('page');
        }
        if (newParams.limit !== undefined) {
          if (newParams.limit !== 10) next.set('limit', String(newParams.limit));
          else next.delete('limit');
        }
        if (newParams.search !== undefined) {
          const val = newParams.search.trim();
          if (val) next.set('search', val);
          else next.delete('search');
        }
        if (newParams.status !== undefined) {
          if (newParams.status && newParams.status !== 'ALL') next.set('status', newParams.status);
          else next.delete('status');
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  // Debounce tìm kiếm backend thật (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput.trim() !== searchTerm.trim()) {
        updateQueryParams({ search: searchInput, page: 1 });
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput, searchTerm, updateQueryParams]);

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    updateQueryParams({ status: newStatus, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateQueryParams({ page: newPage });
  };

  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit);
    updateQueryParams({ limit: newLimit, page: 1 });
  };

  // 1. Tải toàn bộ danh sách để tính thống kê 3 KPI cards & tab counter
  const fetchOverviewStats = useCallback(async () => {
    try {
      const all = await shipmentsService.getShipments();
      const list = all || [];
      setAllShipments(list);
      const pending = list.filter((s) => ['PENDING', 'PICKING', 'PACKED'].includes(s.status)).length;
      const shipping = list.filter((s) => s.status === 'SHIPPED').length;
      setOverviewStats({
        total: list.length,
        pending,
        shipping,
      });
    } catch {
      // Bỏ qua lỗi mạng nền
    }
  }, []);

  // 2. Tải danh sách phiếu xuất kho phân trang thực tế từ backend
  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await shipmentsService.getPaginatedShipments({
        page,
        limit,
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setShipments(res.data || []);
      setTotalItems(res.total ?? (res.data ? res.data.length : 0));
      setTotalPages(res.totalPages || Math.max(1, Math.ceil((res.total || 0) / limit)));
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Không thể tải danh sách phiếu xuất kho');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter]);

  const fetchTrips = useCallback(async () => {
    try {
      setLoadingTrips(true);
      const data = await deliveryTripsService.getTrips();
      setTrips(data || []);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg && !msg.includes('Cannot GET')) {
        showToast('error', msg);
      }
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  useEffect(() => {
    fetchOverviewStats();
    fetchTrips();
  }, [fetchOverviewStats, fetchTrips]);

  // Xử lý tạo phiếu xuất với đầy đủ validation logic
  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedOrderCode = newOrderCode.trim();
    const orderErr = !trimmedOrderCode
      ? 'Vui lòng nhập hoặc chọn Mã đơn hàng'
      : trimmedOrderCode.length < 4
      ? 'Mã đơn hàng phải có tối thiểu 4 ký tự (ví dụ: DH2610-66569)'
      : null;
    const custErr = !newCustomerName.trim()
      ? 'Vui lòng nhập Tên đại lý / Khách hàng'
      : newCustomerName.trim().length < 2
      ? 'Tên đại lý phải có tối thiểu 2 ký tự'
      : null;
    const phoneErr = validatePhoneInput(newPhone, true);
    const addrErr = !newDeliveryAddress.trim()
      ? 'Vui lòng nhập Địa chỉ giao hàng'
      : newDeliveryAddress.trim().length < 5
      ? 'Địa chỉ giao hàng quá ngắn, vui lòng nhập chi tiết'
      : null;

    setOrderCodeError(orderErr);
    setCustomerNameError(custErr);
    setPhoneError(phoneErr);
    setAddressError(addrErr);

    if (orderErr || custErr || phoneErr || addrErr) {
      showToast('warning', phoneErr || orderErr || custErr || addrErr || 'Vui lòng kiểm tra lại thông tin');
      return;
    }

    const targetKey = trimmedOrderCode.toUpperCase();
    const existing = allShipments.find(
      (s) =>
        (s.orderCode?.toUpperCase() === targetKey || s.orderId?.toUpperCase() === targetKey) &&
        s.status !== 'CANCELLED'
    );
    if (existing) {
      showToast(
        'error',
        `Đơn hàng "${trimmedOrderCode}" đã được lập phiếu xuất kho (${existing.id}). Không thể tạo thêm trùng lặp!`
      );
      return;
    }

    try {
      setIsSubmittingCreate(true);
      await shipmentsService.createShipment({
        orderCode: trimmedOrderCode,
        customerName: newCustomerName.trim(),
        receiverName: newReceiverName.trim() || newCustomerName.trim(),
        phone: newPhone.trim(),
        deliveryAddress: newDeliveryAddress.trim(),
        carrierName: newCarrierName.trim(),
        trackingNumber: newTrackingNumber.trim(),
        status: 'PICKING',
      });
      showToast('success', 'Tạo phiếu xuất kho thành công');
      setIsCreateOpen(false);
      setNewOrderCode('');
      setNewCustomerName('');
      setNewReceiverName('');
      setNewPhone('');
      setNewDeliveryAddress('');
      setNewTrackingNumber('');
      setPhoneError(null);
      setOrderCodeError(null);
      setCustomerNameError(null);
      setAddressError(null);
      fetchShipments();
      fetchOverviewStats();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi tạo phiếu xuất kho');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Xử lý cập nhật trạng thái phiếu lẻ
  const handleUpdateStatus = async () => {
    if (!selectedShipment) return;

    if (updateStatusVal === 'DELIVERED') {
      const current = selectedShipment;
      setSelectedShipment(null);
      setDeliveryConfirmShipment(current);
      return;
    }

    try {
      setIsSubmittingStatus(true);
      await shipmentsService.updateStatus(selectedShipment.id, updateStatusVal, {
        carrierName: updateCarrierVal || selectedShipment.carrierName,
        trackingNumber: updateTrackingVal || selectedShipment.trackingNumber,
      });
      showToast('success', `Đã cập nhật trạng thái phiếu ${selectedShipment.id} và tự động đồng bộ đơn hàng`);
      try {
        window.dispatchEvent(
          new CustomEvent('loha_orders_updated', {
            detail: {
              shipmentId: selectedShipment.id,
              orderCode: selectedShipment.orderCode,
              status: updateStatusVal,
            },
          }),
        );
      } catch {}
      setSelectedShipment(null);
      fetchShipments();
      fetchOverviewStats();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Xử lý xóa phiếu xuất kho
  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu xuất kho này?')) return;
    try {
      await shipmentsService.deleteShipment(id);
      showToast('success', 'Đã xóa phiếu xuất kho');
      fetchShipments();
      fetchOverviewStats();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi xóa phiếu xuất kho');
    }
  };

  // Xử lý xuất phát nhanh chuyến giao (Dispatch Trip)
  const handleQuickDispatchTrip = async (trip: DeliveryTrip) => {
    const code = trip.tripCode || trip.code || '';
    const stopsCount = trip.totalStops || trip.stopsCount || trip.stops?.length || 0;
    if (!window.confirm(`Xác nhận xuất phát chuyến "${trip.name}" (${code})?\nTất cả ${stopsCount} đơn hàng trong chuyến sẽ tự động chuyển sang trạng thái "Đang giao hàng" (SHIPPED).`)) {
      return;
    }
    try {
      await deliveryTripsService.dispatchTrip(trip.id);
      showToast('success', `Chuyến giao ${code} đã chính thức xuất phát`);
      try {
        window.dispatchEvent(new CustomEvent('loha_orders_updated', { detail: { tripCode: code } }));
      } catch {}
      fetchTrips();
      fetchShipments();
      fetchOverviewStats();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Không thể xuất phát chuyến giao');
    }
  };

  // Xử lý xóa chuyến giao
  const handleDeleteTrip = async (trip: DeliveryTrip) => {
    const code = trip.tripCode || trip.code || '';
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chuyến "${trip.name}" (${code})? Các phiếu xuất trong chuyến sẽ được gỡ và quay lại danh sách chờ ghép chuyến.`)) {
      return;
    }
    try {
      await deliveryTripsService.deleteTrip(trip.id);
      showToast('success', `Đã xóa chuyến giao ${code}`);
      fetchTrips();
      fetchShipments();
      fetchOverviewStats();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi xóa chuyến giao');
    }
  };

  // Lọc danh sách chuyến giao hàng
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchStatus = tripStatusFilter === 'ALL' || t.status === tripStatusFilter;
      const matchArea = tripAreaFilter === 'ALL' || (t.routeArea || '').toLowerCase().includes(tripAreaFilter.toLowerCase());
      const tripCode = t.tripCode || t.code || '';
      const plate = t.vehicleNumber || t.licensePlate || '';
      const tripName = t.name || t.tripName || '';
      const matchSearch =
        !tripSearch ||
        tripCode.toLowerCase().includes(tripSearch.toLowerCase()) ||
        tripName.toLowerCase().includes(tripSearch.toLowerCase()) ||
        (t.routeArea || '').toLowerCase().includes(tripSearch.toLowerCase()) ||
        t.driverName?.toLowerCase().includes(tripSearch.toLowerCase()) ||
        plate.toLowerCase().includes(tripSearch.toLowerCase());
      return matchStatus && matchArea && matchSearch;
    });
  }, [trips, tripStatusFilter, tripAreaFilter, tripSearch]);

  // Danh sách các khu vực/tuyến đường duy nhất từ trips để làm bộ lọc
  const routeAreaOptions = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => {
      if (t.routeArea) set.add(t.routeArea);
    });
    return Array.from(set);
  }, [trips]);

  // Thống kê nhanh Chuyến giao hàng (SN-196)
  const totalDraftTrips = trips.filter((t) => t.status === 'DRAFT').length;
  const totalAssignedTrips = trips.filter((t) => t.status === 'ASSIGNED').length;
  const totalInTransitTrips = trips.filter((t) => t.status === 'IN_TRANSIT').length;
  const totalCompletedTrips = trips.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-4">
      {/* Thanh Điều hướng Tabs & Nút Hành động */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2 sm:pb-0">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('SHIPMENTS')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'SHIPMENTS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Danh sách phiếu xuất</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                activeTab === 'SHIPMENTS' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {overviewStats.total}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('TRIPS')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'TRIPS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Route className="w-4 h-4" />
            <span>Chuyến giao hàng & Phân tuyến (SN-196)</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                activeTab === 'TRIPS' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {trips.length}
            </span>
          </button>
        </div>

        {/* 2 Nút thao tác đưa lên ngang hàng thanh Tab để tiết kiệm diện tích */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {canManageTrips && (
            <button
              onClick={() => setIsCreateTripOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 h-[36px] px-3 sm:px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer"
              title="Gom nhiều phiếu xuất vào một chuyến xe phân theo khu vực (SN-196)"
            >
              <Route className="w-3.5 h-3.5" />
              <span>Lập Chuyến Giao Mới</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => navigate(createShipmentUrl)}
              className="inline-flex items-center justify-center gap-1.5 h-[36px] px-3 sm:px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Phiếu Lẻ</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DANH SÁCH PHIẾU XUẤT KHO                                           */}
      {/* ========================================================================= */}
      {activeTab === 'SHIPMENTS' && (
        <div className="space-y-4">
          {/* Thống kê 3 Card (Ẩn card Đã giao thành công) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Tổng phiếu xuất</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{overviewStats.total}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Chờ xuất / Soạn hàng</p>
                <p className="text-xl font-bold text-amber-700 mt-0.5">{overviewStats.pending}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Đang giao hàng</p>
                <p className="text-xl font-bold text-sky-700 mt-0.5">{overviewStats.shipping}</p>
              </div>
            </div>
          </div>

          {/* Bộ lọc & Tìm kiếm Phiếu xuất: Search Input + Select Trạng thái */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Ô tìm kiếm Backend thật */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm theo mã phiếu, mã đơn, đại lý, mã chuyến, số điện thoại..."
                  className="w-full h-[38px] pl-9 pr-8 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 hover:bg-white transition-colors"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      updateQueryParams({ search: '', page: 1 });
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Lọc trạng thái (chuyển từ các nút pill thành Select để gọn gàng) */}
              <div className="w-full sm:w-56 shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full h-[38px] px-3 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer shadow-2xs hover:border-slate-300 transition-all"
                  aria-label="Lọc theo trạng thái xuất kho"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ soạn hàng</option>
                  <option value="PICKING">Đang soạn hàng</option>
                  <option value="PACKED">Đã đóng gói</option>
                  <option value="SHIPPED">Đang giao hàng</option>
                  <option value="DELIVERED">Giao thành công</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bảng danh sách phiếu xuất kho đồng bộ quy tắc bảng LOHA */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3 sm:px-4 w-[20%]">Mã phiếu</th>
                    <th className="py-3 px-3 sm:px-4 w-[18%]">Mã đơn hàng</th>
                    <th className="py-3 px-3 sm:px-4 w-[32%]">Đại lý</th>
                    <th className="py-3 px-3 sm:px-4 w-[18%] text-center">Trạng thái</th>
                    <th className="py-3 px-3 sm:px-4 w-[12%] text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        <span className="text-xs">Đang tải danh sách phiếu xuất kho...</span>
                      </td>
                    </tr>
                  ) : shipments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <p className="font-semibold text-slate-700 text-sm">Không tìm thấy phiếu xuất kho nào</p>
                        {(searchTerm || statusFilter !== 'ALL') && (
                          <p className="text-xs text-slate-400 mt-1">
                            Thử điều chỉnh từ khóa tìm kiếm hoặc chọn "Tất cả trạng thái"
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    shipments.map((item) => {
                      const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                      const StatusIcon = statusInfo.icon;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Mã phiếu: Chỉ hiển thị mã phiếu */}
                          <td className="py-3.5 px-3 sm:px-4">
                            <button
                              type="button"
                              onClick={() => navigate(getShipmentDetailUrl(item.id))}
                              className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline font-mono cursor-pointer text-left truncate block w-full text-xs"
                              title={`Mã phiếu: ${item.id}`}
                            >
                              {item.id}
                            </button>
                          </td>

                          {/* Mã đơn hàng: Chỉ hiển thị mã đơn */}
                          <td className="py-3.5 px-3 sm:px-4">
                            <span className="font-semibold text-slate-800 font-mono text-xs truncate block" title={item.orderCode || '—'}>
                              {item.orderCode || '—'}
                            </span>
                          </td>

                          {/* Đại lý: Chỉ hiển thị tên đại lý */}
                          <td className="py-3.5 px-3 sm:px-4">
                            <span className="font-medium text-slate-800 text-xs truncate block" title={item.customerName || 'Khách lẻ'}>
                              {item.customerName || 'Khách lẻ'}
                            </span>
                          </td>

                          {/* Trạng thái: Chỉ hiển thị badge trạng thái */}
                          <td className="py-3.5 px-3 sm:px-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold border max-w-full ${statusInfo.bg} ${statusInfo.text}`}
                              title={statusInfo.label}
                            >
                              <StatusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                              <span className="truncate">{statusInfo.label}</span>
                            </span>
                          </td>

                          {/* Thao tác: Chỉ 1 nút bấm mở dropdown */}
                          <td className="py-3.5 px-3 sm:px-4 text-right">
                            <div className="relative inline-flex items-center justify-end shipment-action-dropdown-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (openActionMenuId === item.id) {
                                    setOpenActionMenuId(null);
                                    setActionMenuAnchor(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const shouldDropUp = spaceBelow < 250 && rect.top > 250;
                                    setActionMenuAnchor({
                                      top: shouldDropUp ? rect.top - 4 : rect.bottom + 4,
                                      right: window.innerWidth - rect.right,
                                      isDropUp: shouldDropUp,
                                    });
                                    setOpenActionMenuId(item.id);
                                  }
                                }}
                                className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none shrink-0 ${
                                  openActionMenuId === item.id
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-500/10'
                                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300'
                                }`}
                                title="Thao tác"
                              >
                                <span className="hidden sm:inline">Thao tác</span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                                    openActionMenuId === item.id ? 'rotate-180 text-indigo-600' : ''
                                  }`}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Dropdown Menu Portal Thao tác */}
            {openActionMenuId && actionMenuAnchor && typeof document !== 'undefined' && (() => {
              const item = shipments.find((s) => s.id === openActionMenuId);
              if (!item) return null;
              return createPortal(
                <div
                  className="shipment-action-portal-menu fixed w-48 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-[9999] animate-in fade-in zoom-in-95 text-left divide-y divide-slate-100"
                  style={{
                    top: actionMenuAnchor.isDropUp ? undefined : `${actionMenuAnchor.top}px`,
                    bottom: actionMenuAnchor.isDropUp ? `${window.innerHeight - actionMenuAnchor.top}px` : undefined,
                    right: `${actionMenuAnchor.right}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-1">
                    {/* 1. Xem chi tiết */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionMenuId(null);
                        setActionMenuAnchor(null);
                        navigate(getShipmentDetailUrl(item.id));
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                    >
                      <Eye className="w-4 h-4 text-slate-400" />
                      <span>Xem chi tiết</span>
                    </button>

                    {/* 2. Xác nhận giao hàng (khi SHIPPED) */}
                    {canUpdateStatus && item.status === 'SHIPPED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionMenuAnchor(null);
                          setDeliveryConfirmShipment(item);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Xác nhận giao</span>
                      </button>
                    )}

                    {/* 3. Xem chứng từ (khi DELIVERED) */}
                    {item.status === 'DELIVERED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionMenuAnchor(null);
                          setViewProofShipment(item);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                      >
                        <FileImage className="w-4 h-4 text-slate-400" />
                        <span>Xem chứng từ</span>
                      </button>
                    )}

                    {/* 4. Cập nhật trạng thái */}
                    {canUpdateStatus && item.status !== 'DELIVERED' && item.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionMenuAnchor(null);
                          setSelectedShipment(item);
                          setUpdateStatusVal(item.status);
                          setUpdateCarrierVal(item.carrierName || '');
                          setUpdateTrackingVal(item.trackingNumber || '');
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                      >
                        <RefreshCw className="w-4 h-4 text-indigo-500" />
                        <span>Cập nhật trạng thái</span>
                      </button>
                    )}
                  </div>

                  {/* 5. Xóa phiếu (nếu Admin) */}
                  {canDelete && (
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionMenuAnchor(null);
                          handleDelete(item.id);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                        <span>Xóa phiếu</span>
                      </button>
                    </div>
                  )}
                </div>,
                document.body,
              );
            })()}

            {/* ── THANH PHÂN TRANG GẮN LIỀN CHÂN BẢNG (CHUẨN LOHA SALES) ── */}
            {totalItems > 0 && (
              <Pagination
                variant="default"
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={limit}
                pageSizeOptions={[10, 20, 50]}
                itemLabel="phiếu xuất"
                showRecordRange={false}
                showFirstLast={false}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUẢN LÝ CHUYẾN GIAO HÀNG & PHÂN TUYẾN (SN-196)                      */}
      {/* ========================================================================= */}
      {activeTab === 'TRIPS' && (
        <div className="space-y-4">
          {/* Thống kê nhanh Chuyến giao hàng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Tổng chuyến phân tuyến</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{trips.length}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Chờ điều xe / Gán tài xế</p>
                <p className="text-xl font-bold text-amber-700 mt-0.5">
                  {totalDraftTrips} <span className="text-xs text-slate-400 font-normal">({totalAssignedTrips} đã gán)</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Xe đang chạy tuyến</p>
                <p className="text-xl font-bold text-sky-700 mt-0.5">{totalInTransitTrips}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Chuyến hoàn tất</p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">{totalCompletedTrips}</p>
              </div>
            </div>
          </div>

          {/* Bộ lọc & Tìm kiếm Chuyến giao hàng */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={tripSearch}
                    onChange={(e) => setTripSearch(e.target.value)}
                    placeholder="Tìm theo mã chuyến, tên chuyến, tài xế, biển số..."
                    className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 hover:bg-white transition-colors"
                  />
                </div>

                {/* Dropdown lọc theo khu vực / tuyến đường */}
                {routeAreaOptions.length > 0 && (
                  <select
                    value={tripAreaFilter}
                    onChange={(e) => setTripAreaFilter(e.target.value)}
                    className="w-full sm:w-56 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                  >
                    <option value="ALL">Tất cả tuyến đường / khu vực</option>
                    {routeAreaOptions.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                {['ALL', 'DRAFT', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setTripStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      tripStatusFilter === st
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Tất cả trạng thái' : TRIP_STATUS_CONFIG[st as DeliveryTripStatus]?.label || st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bảng danh sách chuyến giao hàng */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Mã & Tên chuyến giao</th>
                    <th className="py-3 px-4">Tuyến đường / Khu vực</th>
                    <th className="py-3 px-4">Tài xế & Phương tiện</th>
                    <th className="py-3 px-4">Điểm dừng (Tiến độ)</th>
                    <th className="py-3 px-4">Thời gian xuất phát</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingTrips ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Đang tải danh sách chuyến giao hàng...
                      </td>
                    </tr>
                  ) : filteredTrips.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <Route className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-slate-600">Chưa có chuyến giao hàng nào</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Bấm nút "Lập Chuyến Giao Mới" để gom các phiếu xuất kho vào chung một chuyến xe
                        </p>
                        {canManageTrips && (
                          <button
                            onClick={() => setIsCreateTripOpen(true)}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Lập chuyến ngay
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredTrips.map((trip) => {
                      const statusInfo = TRIP_STATUS_CONFIG[trip.status] || TRIP_STATUS_CONFIG.DRAFT;
                      const StatusIcon = statusInfo.icon;
                      const completedCount = trip.stops?.filter((s) => s.status === 'DELIVERED').length || 0;
                      const totalStops = trip.totalStops || trip.stopsCount || trip.stops?.length || 0;
                      const progressPct = totalStops > 0 ? Math.round((completedCount / totalStops) * 100) : 0;
                      const tripCode = trip.tripCode || trip.code || '';
                      const plate = trip.vehicleNumber || trip.licensePlate || '';

                      return (
                        <tr key={trip.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Mã & Tên chuyến */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => setSelectedTripForDetail(trip)}
                              className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer block text-left"
                            >
                              {tripCode}
                            </button>
                            <p className="text-xs font-medium text-slate-900 mt-0.5 line-clamp-1">{trip.name}</p>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Tạo ngày: {new Date(trip.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                          </td>

                          {/* Tuyến đường / Khu vực */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex items-start gap-1.5 text-xs font-medium text-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{trip.routeArea}</span>
                            </div>
                          </td>

                          {/* Tài xế & Phương tiện */}
                          <td className="py-3.5 px-4">
                            {trip.driverName ? (
                              <div>
                                <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  {trip.driverName}
                                </p>
                                {trip.driverPhone && (
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                                    <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    {trip.driverPhone}
                                  </p>
                                )}
                                {plate && (
                                  <div className="mt-1">
                                    <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                      {plate} {trip.vehicleType && `• ${trip.vehicleType}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-amber-600 italic bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block">
                                Chưa gán tài xế & xe
                              </span>
                            )}
                          </td>

                          {/* Điểm dừng & Tiến độ */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-700">
                                  {completedCount}/{totalStops} điểm
                                </span>
                                <span className="text-[11px] font-mono text-slate-500">{progressPct}%</span>
                              </div>
                              <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    progressPct === 100
                                      ? 'bg-emerald-500'
                                      : progressPct > 0
                                      ? 'bg-indigo-600'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Thời gian xuất phát */}
                          <td className="py-3.5 px-4">
                            {trip.departureDate ? (
                              <div className="text-xs text-slate-700">
                                <div className="font-medium flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                  {new Date(trip.departureDate).toLocaleDateString('vi-VN')}
                                </div>
                                <div className="text-[11px] text-slate-400 pl-4">
                                  {new Date(trip.departureDate).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.text}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusInfo.label}
                            </span>
                          </td>

                          {/* Thao tác */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Xem chi tiết & Lộ trình */}
                              <button
                                onClick={() => setSelectedTripForDetail(trip)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                                title="Xem chi tiết lộ trình và các điểm dừng"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Chi tiết</span>
                              </button>

                              {/* AC 3: In bảng kê lộ trình điểm giao (Delivery Manifest) */}
                              <button
                                onClick={() => setSelectedTripForPrint(trip)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="In Bảng kê lộ trình & Lệnh điều xe cho tài xế (SN-196 AC 3)"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-500" />
                                <span>In Bảng kê</span>
                              </button>

                              {/* Nút Xuất phát nhanh (nếu đã gán xe và đang chờ chạy) */}
                              {canManageTrips && trip.status === 'ASSIGNED' && (
                                <button
                                  onClick={() => handleQuickDispatchTrip(trip)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                  title="Xuất phát chuyến xe ngay"
                                >
                                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Xuất phát</span>
                                </button>
                              )}

                              {/* Xóa chuyến giao (Chỉ khi DRAFT hoặc CANCELLED) */}
                              {canDelete && ['DRAFT', 'CANCELLED'].includes(trip.status) && (
                                <button
                                  onClick={() => handleDeleteTrip(trip)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa chuyến giao"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cập nhật trạng thái */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              Cập nhật Trạng thái Xuất kho
            </h3>
            <p className="text-xs text-slate-500">
              Phiếu: <strong>{selectedShipment.id}</strong> — Đơn hàng: <strong>{selectedShipment.orderCode}</strong>
            </p>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái mới</label>
                <select
                  value={updateStatusVal}
                  onChange={(e) => setUpdateStatusVal(e.target.value as Shipment['status'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PENDING">Chờ soạn hàng</option>
                  <option value="PICKING">Đang soạn hàng (FEFO)</option>
                  <option value="PACKED">Đã đóng gói</option>
                  <option value="SHIPPED">Đang giao hàng</option>
                  <option value="DELIVERED">Giao thành công</option>
                  {canCancel && <option value="CANCELLED">Hủy phiếu</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị vận chuyển</label>
                <input
                  type="text"
                  value={updateCarrierVal}
                  onChange={(e) => setUpdateCarrierVal(e.target.value)}
                  placeholder="Ví dụ: Giao Hàng Nhanh, Viettel Post..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Mã vận đơn</label>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    Tự động tạo
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={updateTrackingVal}
                  placeholder="TRK-2026-..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100/90 text-slate-600 font-mono cursor-not-allowed select-none focus:outline-none"
                  title="Mã vận đơn được hệ thống tự động sinh và không thể thay đổi"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Mã vận đơn tự động tạo, không thể thay đổi</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedShipment(null)}
                disabled={isSubmittingStatus}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isSubmittingStatus}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo phiếu xuất kho */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleCreateShipment} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Tạo Phiếu Xuất Kho & Giao Hàng Mới
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã đơn hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="ready-orders-datalist"
                  value={newOrderCode}
                  onChange={(e) => handleOrderCodeChange(e.target.value)}
                  placeholder="Ví dụ: DH2610-66569"
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 font-mono text-sm transition-colors ${
                    orderCodeError
                      ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:ring-blue-500 bg-white'
                  }`}
                />
                <datalist id="ready-orders-datalist">
                  {readyOrders.map((o) => (
                    <option key={o.id || o.orderCode} value={o.orderCode || o.id}>
                      {o.customerName ? `${o.customerName} (${o.orderCode})` : o.orderCode}
                    </option>
                  ))}
                </datalist>
                {orderCodeError ? (
                  <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {orderCodeError}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gõ mã hoặc chọn từ danh sách đơn đã duyệt
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đại lý / Khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  placeholder="Ví dụ: Đại lý Minh Khang"
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 text-sm transition-colors ${
                    customerNameError
                      ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:ring-blue-500 bg-white'
                  }`}
                />
                {customerNameError && (
                  <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {customerNameError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Người nhận</label>
                <input
                  type="text"
                  value={newReceiverName}
                  onChange={(e) => setNewReceiverName(e.target.value)}
                  placeholder="Tên người nhận hàng"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={11}
                  value={newPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewPhone(val);
                    setPhoneError(validatePhoneInput(val, false));
                  }}
                  onBlur={() => {
                    setPhoneError(validatePhoneInput(newPhone, true));
                  }}
                  placeholder="0988xxxxxx"
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 text-sm transition-colors ${
                    phoneError
                      ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:ring-blue-500 bg-white'
                  }`}
                />
                {phoneError ? (
                  <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {phoneError}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Đúng 10 chữ số, bắt đầu bằng số 0
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ giao hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDeliveryAddress}
                  onChange={(e) => handleDeliveryAddressChange(e.target.value)}
                  placeholder="Địa chỉ kho đại lý nhận hàng..."
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 text-sm transition-colors ${
                    addressError
                      ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:ring-blue-500 bg-white'
                  }`}
                />
                {addressError && (
                  <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {addressError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị vận chuyển</label>
                <input
                  type="text"
                  list="carrier-suggestions-list"
                  value={newCarrierName}
                  onChange={(e) => setNewCarrierName(e.target.value)}
                  placeholder="Giao Hàng Nhanh / Viettel Post"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <datalist id="carrier-suggestions-list">
                  <option value="Giao Hàng Nhanh (GHN)" />
                  <option value="Viettel Post" />
                  <option value="Giao Hàng Tiết Kiệm (GHTK)" />
                  <option value="VNPost (Bưu Điện)" />
                  <option value="Đội xe giao hàng nội bộ LOHA" />
                </datalist>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Mã vận đơn</label>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    Tự động tạo
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={newTrackingNumber}
                  placeholder="TRK-2026-..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100/90 text-slate-600 font-mono text-sm cursor-not-allowed select-none focus:outline-none"
                  title="Mã vận đơn được hệ thống tự động sinh và không thể thay đổi"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mã vận đơn tự động tạo, không thể thay đổi
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmittingCreate}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmittingCreate}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingCreate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Tạo Phiếu Xuất
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Xác nhận giao hàng SN-198 */}
      {deliveryConfirmShipment && (
        <ConfirmDeliveryModal
          shipment={deliveryConfirmShipment}
          onClose={() => setDeliveryConfirmShipment(null)}
          onDone={(_updated) => {
            setDeliveryConfirmShipment(null);
            fetchShipments();
            fetchOverviewStats();
          }}
        />
      )}

      {/* Modal Xem chứng từ giao hàng POD */}
      {viewProofShipment && (
        <ViewDeliveryProofModal
          shipment={viewProofShipment}
          onClose={() => setViewProofShipment(null)}
        />
      )}

      {/* SN-196: Modal Lập chuyến giao hàng mới gom nhiều phiếu xuất (AC 1 & 2) */}
      {isCreateTripOpen && (
        <CreateDeliveryTripModal
          availableShipments={allShipments}
          onClose={() => setIsCreateTripOpen(false)}
          onCreated={() => {
            setIsCreateTripOpen(false);
            fetchTrips();
            fetchShipments();
            fetchOverviewStats();
          }}
        />
      )}

      {/* SN-196: Modal Chi tiết chuyến giao, Lộ trình & Gán tài xế (AC 2) */}
      {selectedTripForDetail && (
        <DeliveryTripDetailModal
          trip={selectedTripForDetail}
          canManage={canManageTrips}
          onClose={() => setSelectedTripForDetail(null)}
          onUpdated={(updated) => {
            setSelectedTripForDetail(updated);
            fetchTrips();
            fetchShipments();
            fetchOverviewStats();
          }}
        />
      )}

      {/* SN-196: Modal In Bảng kê lộ trình điểm giao / Lệnh điều xe (AC 3) */}
      {selectedTripForPrint && (
        <PrintTripManifestModal
          trip={selectedTripForPrint}
          onClose={() => setSelectedTripForPrint(null)}
        />
      )}
    </div>
  );
};
