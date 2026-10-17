import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // Active view tab: 'SHIPMENTS' (Phiếu xuất kho lẻ) | 'TRIPS' (Chuyến giao hàng & Phân tuyến SN-196)
  const [activeTab, setActiveTab] = useState<'SHIPMENTS' | 'TRIPS'>('SHIPMENTS');

  // Dữ liệu Phiếu xuất kho
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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
            setReadyOrders(res.data);
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

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await shipmentsService.getShipments();
      setShipments(data || []);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Không thể tải danh sách phiếu xuất kho');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      setLoadingTrips(true);
      const data = await deliveryTripsService.getTrips();
      setTrips(data || []);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Không thể tải danh sách chuyến giao hàng');
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
    fetchTrips();
  }, [fetchShipments, fetchTrips]);

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
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi xóa chuyến giao');
    }
  };

  // Lọc danh sách phiếu xuất kho
  const filteredShipments = shipments.filter((item) => {
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchSearch =
      !searchTerm ||
      item.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tripCode?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Lọc danh sách chuyến giao hàng
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchStatus = tripStatusFilter === 'ALL' || t.status === tripStatusFilter;
      const matchArea = tripAreaFilter === 'ALL' || t.routeArea.toLowerCase().includes(tripAreaFilter.toLowerCase());
      const tripCode = t.tripCode || t.code || '';
      const plate = t.vehicleNumber || t.licensePlate || '';
      const matchSearch =
        !tripSearch ||
        tripCode.toLowerCase().includes(tripSearch.toLowerCase()) ||
        t.name.toLowerCase().includes(tripSearch.toLowerCase()) ||
        t.routeArea.toLowerCase().includes(tripSearch.toLowerCase()) ||
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

  // Thống kê nhanh Phiếu xuất kho
  const totalDelivered = shipments.filter((s) => s.status === 'DELIVERED').length;
  const totalShipping = shipments.filter((s) => s.status === 'SHIPPED').length;
  const totalPending = shipments.filter((s) => ['PENDING', 'PICKING', 'PACKED'].includes(s.status)).length;

  // Thống kê nhanh Chuyến giao hàng (SN-196)
  const totalDraftTrips = trips.filter((t) => t.status === 'DRAFT').length;
  const totalAssignedTrips = trips.filter((t) => t.status === 'ASSIGNED').length;
  const totalInTransitTrips = trips.filter((t) => t.status === 'IN_TRANSIT').length;
  const totalCompletedTrips = trips.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Nút hành động */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" />
            Quản lý Xuất kho & Giao hàng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Soạn hàng xuất kho chuẩn FEFO, phân tuyến giao hàng đa điểm và bàn giao phương tiện vận chuyển
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchShipments();
              fetchTrips();
            }}
            className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingTrips ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          {canManageTrips && (
            <button
              onClick={() => setIsCreateTripOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer"
              title="Gom nhiều phiếu xuất vào một chuyến xe phân theo khu vực (SN-196)"
            >
              <Route className="w-3.5 h-3.5" />
              <span>Lập Chuyến Giao Mới</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => navigate('/inventory/shipments/create')}
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Phiếu Lẻ</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs: Phiếu xuất kho vs Chuyến giao hàng SN-196 */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('SHIPMENTS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
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
            {shipments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('TRIPS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
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

      {/* ========================================================================= */}
      {/* TAB 1: DANH SÁCH PHIẾU XUẤT KHO                                           */}
      {/* ========================================================================= */}
      {activeTab === 'SHIPMENTS' && (
        <div className="space-y-4">
          {/* Thống kê nhanh Phiếu xuất kho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Tổng phiếu xuất</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{shipments.length}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Chờ xuất / Soạn hàng</p>
                <p className="text-xl font-bold text-amber-700 mt-0.5">{totalPending}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Đang giao hàng</p>
                <p className="text-xl font-bold text-sky-700 mt-0.5">{totalShipping}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Đã giao thành công</p>
                <p className="text-xl font-bold text-emerald-700 mt-0.5">{totalDelivered}</p>
              </div>
            </div>
          </div>

          {/* Bộ lọc & Tìm kiếm Phiếu xuất */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo mã phiếu, mã đơn, đại lý, mã chuyến..."
                  className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 hover:bg-white transition-colors"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                {['ALL', 'PENDING', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Tất cả' : STATUS_CONFIG[st as Shipment['status']]?.label || st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bảng danh sách phiếu xuất kho */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Mã phiếu</th>
                    <th className="py-3 px-4">Mã đơn hàng</th>
                    <th className="py-3 px-4">Đại lý & Địa chỉ giao</th>
                    <th className="py-3 px-4">Đơn vị vận chuyển & Tuyến</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Đang tải danh sách phiếu xuất kho...
                      </td>
                    </tr>
                  ) : filteredShipments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        Không tìm thấy phiếu xuất kho nào
                      </td>
                    </tr>
                  ) : (
                    filteredShipments.map((item) => {
                      const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                      const StatusIcon = statusInfo.icon;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => navigate(`/inventory/shipments/${item.id}`)}
                              className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline font-mono cursor-pointer text-left block"
                              title="Xem chi tiết phiếu xuất kho và lô hàng"
                            >
                              {item.id}
                            </button>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 font-mono">{item.orderCode}</span>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="font-medium text-slate-800">{item.customerName}</p>
                            {item.receiverName && (
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                {item.receiverName} {item.phone && `(${item.phone})`}
                              </p>
                            )}
                            {item.deliveryAddress && (
                              <p
                                className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate"
                                title={item.deliveryAddress}
                              >
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {item.deliveryAddress}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="text-xs font-semibold text-slate-700">
                              {item.carrierName || 'Tự vận chuyển'}
                            </p>
                            {item.trackingNumber && (
                              <span className="inline-block text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                                Mã: {item.trackingNumber}
                              </span>
                            )}
                            {/* SN-196: Badge hiển thị chuyến giao hàng nếu đã được gom */}
                            {item.tripCode ? (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                  <Route className="w-3 h-3 text-indigo-600 shrink-0" />
                                  Chuyến: {item.tripCode}
                                </span>
                              </div>
                            ) : ['PENDING', 'PICKING', 'PACKED'].includes(item.status) ? (
                              <div className="mt-1">
                                <span className="inline-block text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Chưa gom chuyến xe
                                </span>
                              </div>
                            ) : null}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.text}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusInfo.label}
                            </span>
                            {item.status === 'DELIVERED' && item.deliveredAt && (
                              <div className="text-[10px] text-emerald-600 mt-1 font-medium">
                                {new Date(item.deliveredAt).toLocaleDateString('vi-VN')}{' '}
                                {new Date(item.deliveredAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                            {item.failureReason && item.status === 'PACKED' && (
                              <div
                                className="mt-1 flex items-center justify-center gap-1 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-1.5 py-0.5"
                                title={item.failureReason}
                              >
                                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                <span className="truncate max-w-[130px]">Quay về kho: {item.failureReason}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Nút Xem chi tiết phiếu xuất kho */}
                              <button
                                type="button"
                                onClick={() => navigate(`/inventory/shipments/${item.id}`)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                title="Xem chi tiết phiếu xuất kho & lô hàng FEFO"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                Chi tiết
                              </button>
                              {/* SN-198: Nút Xác nhận giao hàng khi đơn đang giao */}
                              {canUpdateStatus && item.status === 'SHIPPED' && (
                                <button
                                  onClick={() => setDeliveryConfirmShipment(item)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                                  title="Xác nhận kết quả giao hàng (kèm ảnh chứng từ)"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Xác nhận giao
                                </button>
                              )}

                              {/* Nút Xem chứng từ khi đã giao thành công */}
                              {item.status === 'DELIVERED' && (
                                <button
                                  onClick={() => setViewProofShipment(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Xem biên bản giao nhận & ảnh chứng từ"
                                >
                                  <FileImage className="w-3.5 h-3.5 text-slate-500" />
                                  Chứng từ
                                </button>
                              )}

                              {/* Nút Cập nhật trạng thái (Thủ kho / Quản lý kho / Admin) */}
                              {canUpdateStatus && item.status !== 'DELIVERED' && item.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => {
                                    setSelectedShipment(item);
                                    setUpdateStatusVal(item.status);
                                    setUpdateCarrierVal(item.carrierName || '');
                                    setUpdateTrackingVal(item.trackingNumber || '');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                                  title="Cập nhật trạng thái vận chuyển"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Cập nhật
                                </button>
                              )}

                              {/* Nút Hủy / Xóa */}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa phiếu"
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
          availableShipments={shipments}
          onClose={() => setIsCreateTripOpen(false)}
          onCreated={() => {
            setIsCreateTripOpen(false);
            fetchTrips();
            fetchShipments();
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
