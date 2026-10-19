import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  CreditCard,
  Pencil,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  Tag,
  ShoppingCart,
  Lock,
  Unlock,
  AlertCircle,
  RefreshCw,
  Package,
  Warehouse,
  ChevronRight,
  FileText,
  Globe,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import { LockAgencyModal } from '../components/lock-agency-modal';
import { AssignSalesRepModal } from '../components/assign-sales-rep-modal';
import { UpdateLimitModal } from '../components/credit-limit/update-limit-modal';
import { customerService } from '../services/customer.service';
import { ordersService } from '../services/orders.service';
import { warehouseService } from '../services/warehouse.service';
import type { Customer, SalesRepOption } from '../types/customer.types';
import type { UpdateCreditLimitPayload } from '../types/credit-limit.type';
import type { Order } from '../types/order';
import type { AgencyWarehouseDetail } from '../types/warehouse.types';
import { tokenStorage } from '../utils/token-storage';
import { Role } from '../types/auth';

const formatVnd = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const getGroupLabel = (group?: string): string => {
  switch (group) {
    case 'AGENT_LEVEL_1':
      return 'Đại lý Cấp 1';
    case 'AGENT_LEVEL_2':
      return 'Đại lý Cấp 2';
    case 'WHOLESALE':
      return 'Bán buôn';
    case 'RETAIL':
      return 'Bán lẻ';
    default:
      return 'Đại lý Cấp 2';
  }
};

const getPriceListInfo = (group?: string) => {
  switch (group) {
    case 'AGENT_LEVEL_1':
      return {
        title: 'Bảng giá Đại lý Cấp 1',
        desc: 'Áp dụng chính sách giá & chiết khấu đại lý Cấp 1 cao nhất',
        badge: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      };
    case 'AGENT_LEVEL_2':
      return {
        title: 'Bảng giá Đại lý Cấp 2',
        desc: 'Áp dụng bảng giá đại lý phân phối Cấp 2 tiêu chuẩn',
        badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    case 'WHOLESALE':
      return {
        title: 'Bảng giá Bán buôn',
        desc: 'Áp dụng bảng giá sỉ & bán buôn số lượng lớn',
        badge: 'text-blue-700 bg-blue-50 border-blue-200',
      };
    default:
      return {
        title: 'Bảng giá Đại lý Cấp 2',
        desc: 'Áp dụng bảng giá mặc định theo nhóm khách hàng',
        badge: 'text-slate-700 bg-slate-50 border-slate-200',
      };
  }
};

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [servingWarehouse, setServingWarehouse] = useState<AgencyWarehouseDetail | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);

  // Modals state
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState<boolean>(false);
  const [lockModalMode, setLockModalMode] = useState<'LOCK' | 'UNLOCK'>('LOCK');
  const [isLockSubmitting, setIsLockSubmitting] = useState<boolean>(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isCreditLimitModalOpen, setIsCreditLimitModalOpen] = useState<boolean>(false);
  const [isCreditLimitSubmitting, setIsCreditLimitSubmitting] = useState<boolean>(false);

  // Quyền người dùng hiện tại
  const currentUser = tokenStorage.getUser();
  const currentRoles = (currentUser?.roles || []) as Role[];
  const isAdminOrManager =
    currentRoles.includes(Role.ADMIN) || currentRoles.includes(Role.SALES_MANAGER);

  // Tải danh sách nhân viên kinh doanh
  useEffect(() => {
    customerService
      .getAvailableSalesReps()
      .then((reps: SalesRepOption[]) => setSalesReps(reps))
      .catch(() => setSalesReps([]));
  }, []);

  // Tải chi tiết đại lý
  const fetchCustomerDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await customerService.getCustomerById(id);
      setCustomer(data);

      // Tải kho phục vụ
      warehouseService
        .getAgencyDefault(data.id)
        .then((wh) => setServingWarehouse(wh))
        .catch(() => setServingWarehouse(null));

      // Tải danh sách đơn hàng gần đây của đại lý
      setIsLoadingOrders(true);
      ordersService
        .getOrders({ customerId: data.id, limit: 5 })
        .then((res) => {
          const list = Array.isArray(res) ? res : res.data || [];
          setRecentOrders(list.slice(0, 5));
        })
        .catch(() => setRecentOrders([]))
        .finally(() => setIsLoadingOrders(false));
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết đại lý',
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomerDetail();
  }, [fetchCustomerDetail]);

  // Lắng nghe sự kiện đồng bộ dư nợ thời gian thực từ đối chiếu công nợ (SN-206)
  useEffect(() => {
    const handleDebtUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ customerId: string; customerCode?: string; newDebt: number }>;
      if (!customEvent.detail || !customer) return;
      const targetId = customEvent.detail.customerId;
      const targetCode = customEvent.detail.customerCode;
      if (
        customer.id === targetId ||
        customer.code === targetId ||
        (targetCode && customer.code === targetCode)
      ) {
        setCustomer((prev) => (prev ? { ...prev, currentDebt: customEvent.detail.newDebt } : prev));
      }
    };

    window.addEventListener('loha_debt_updated', handleDebtUpdate);
    return () => window.removeEventListener('loha_debt_updated', handleDebtUpdate);
  }, [customer]);

  // Xử lý cập nhật hạn mức tín dụng
  const handleSubmitCreditLimit = async (
    agencyId: string,
    payload: UpdateCreditLimitPayload,
  ) => {
    try {
      setIsCreditLimitSubmitting(true);
      await customerService.updateCreditLimit(agencyId, payload);
      showToast(
        'success',
        'Cập nhật hạn mức thành công',
        `Đã cập nhật hạn mức công nợ cho đại lý "${customer?.name || agencyId}" thành ${payload.creditLimit.toLocaleString('vi-VN')} đ (Thời hạn: ${payload.maxDebtDays} ngày).`,
      );
      setIsCreditLimitModalOpen(false);
      await fetchCustomerDetail();
    } catch (err: unknown) {
      const errMsg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Lỗi cập nhật hạn mức.')
          : err instanceof Error
          ? err.message
          : 'Không thể cập nhật hạn mức công nợ.';
      showToast('error', 'Lỗi cập nhật hạn mức', String(errMsg));
      throw err;
    } finally {
      setIsCreditLimitSubmitting(false);
    }
  };

  // Xử lý xác nhận khóa đại lý
  const handleConfirmLock = async (reason: string) => {
    if (!customer) return;
    try {
      setIsLockSubmitting(true);
      await customerService.lockCustomer(customer.id, reason);
      showToast('success', `Đã khóa giao dịch đại lý ${customer.name}`);
      await fetchCustomerDetail();
      setIsLockModalOpen(false);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Không thể khóa đại lý');
    } finally {
      setIsLockSubmitting(false);
    }
  };

  // Xử lý xác nhận mở khóa đại lý
  const handleConfirmUnlock = async () => {
    if (!customer) return;
    try {
      setIsLockSubmitting(true);
      await customerService.unlockCustomer(customer.id);
      showToast('success', `Đã mở khóa giao dịch cho đại lý ${customer.name}`);
      await fetchCustomerDetail();
      setIsLockModalOpen(false);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Không thể mở khóa đại lý');
    } finally {
      setIsLockSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-slate-200 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 h-64 animate-pulse" />
          <div className="bg-white rounded-xl border border-slate-200 p-6 h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (errorMessage || !customer) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Không tìm thấy đại lý</h3>
        <p className="text-sm text-slate-500">
          {errorMessage || 'Hồ sơ đại lý không tồn tại hoặc bạn không có quyền truy cập.'}
        </p>
        <Link
          to="/sales/customers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách đại lý</span>
        </Link>
      </div>
    );
  }

  const priceInfo = getPriceListInfo(customer.customerGroup);
  const creditLimit = customer.creditLimit || 0;
  const currentDebt = customer.currentDebt || 0;
  const availableCredit = Math.max(0, creditLimit - currentDebt);
  const isOverLimit = creditLimit > 0 && currentDebt > creditLimit;
  const debtUsagePercent = creditLimit > 0 ? Math.round((currentDebt / creditLimit) * 100) : 0;
  const deliveryPointsList = customer.deliveryPoints || [];

  return (
    <div className="space-y-6">
      {/* ── CARD ĐIỀU HƯỚNG TRÊN CÙNG: QUAY LẠI & HÀNH ĐỘNG NHANH ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              to="/sales/customers"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
              title="Quay lại danh sách đại lý"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Chi tiết hồ sơ đại lý</h3>
            </div>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {customer.code}
            </span>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={customer.status === 'LOCKED'}
              onClick={() => navigate(`/sales/orders/create?customerId=${customer.id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer"
              title={customer.status === 'LOCKED' ? 'Đại lý đang bị khóa giao dịch' : 'Tạo đơn hàng mới cho đại lý này'}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Tạo đơn hàng mới</span>
            </button>

            {isAdminOrManager && (
              <button
                type="button"
                onClick={() => {
                  setLockModalMode(customer.status === 'LOCKED' ? 'UNLOCK' : 'LOCK');
                  setIsLockModalOpen(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  customer.status === 'LOCKED'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                {customer.status === 'LOCKED' ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Mở khóa đại lý</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Khóa giao dịch</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={fetchCustomerDetail}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* THÔNG TIN TỔNG QUAN BANNER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">{customer.name}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    customer.customerGroup === 'AGENT_LEVEL_1'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : customer.customerGroup === 'AGENT_LEVEL_2'
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {getGroupLabel(customer.customerGroup)}
                </span>
                {customer.status === 'LOCKED' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <Lock className="w-3 h-3" /> Đang khóa giao dịch
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đang hoạt động
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {customer.status === 'LOCKED' && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900">Đại lý đang bị tạm khóa giao dịch (SN-36)</p>
              <p className="mt-0.5 text-rose-700 leading-relaxed">
                Lý do khóa: {customer.lockReason || 'Chưa cung cấp lý do cụ thể.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── KHỐI 1: HẠN MỨC TÍN DỤNG & CÔNG NỢ ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Hạn mức tín dụng & Dư nợ công nợ
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsCreditLimitModalOpen(true)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Sửa hạn mức</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
            <span className="text-[11px] text-slate-400 font-medium block">Hạn mức tối đa</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatVnd(creditLimit)}
            </span>
          </div>
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
            <span className="text-[11px] text-slate-400 font-medium block">Dư nợ hiện tại</span>
            <span
              className={`text-base font-bold tabular-nums ${
                isOverLimit ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {formatVnd(currentDebt)}
            </span>
          </div>
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
            <span className="text-[11px] text-slate-400 font-medium block">Còn khả dụng</span>
            <span className="text-base font-bold text-emerald-700 tabular-nums">
              {formatVnd(availableCredit)}
            </span>
          </div>
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
            <span className="text-[11px] text-slate-400 font-medium block">Hạn nợ tối đa</span>
            <span className="text-base font-bold text-slate-900">
              {customer.maxDebtDays || 30} ngày
            </span>
          </div>
        </div>

        {creditLimit > 0 && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Tỷ lệ sử dụng hạn mức tín dụng</span>
              <span className={`font-bold ${isOverLimit ? 'text-rose-600' : 'text-slate-700'}`}>
                {isOverLimit ? `Vượt hạn mức (${debtUsagePercent}%)` : `${debtUsagePercent}%`}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverLimit || debtUsagePercent >= 90
                    ? 'bg-rose-500'
                    : debtUsagePercent >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, debtUsagePercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── BỐ CỤC 1 HÀNG DỌC (VERTICAL STACK) CÁC KHỐI CHI TIẾT ── */}
      <div className="space-y-6">
        {/* KHỐI 1: THÔNG TIN ĐẠI LÝ */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Thông tin đại lý</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Mã số thuế */}
            <div className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Mã số thuế (MST)</span>
                <span className="font-mono font-semibold text-slate-800 text-sm">
                  {customer.taxCode || '—'}
                </span>
              </div>
            </div>

            {/* Khu vực */}
            <div className="flex items-start gap-2.5">
              <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Khu vực</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {customer.region || 'Miền Nam'}
                </span>
              </div>
            </div>

            {/* NVKD phụ trách chính */}
            <div className="flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">NVKD phụ trách</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-slate-800">
                    {customer.salesRepName || customer.salesRep?.name || 'Chưa phân công'}
                  </span>
                  {isAdminOrManager && (
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Đổi</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Số điện thoại liên hệ */}
            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Số điện thoại liên hệ</span>
                <span className="font-mono font-semibold text-slate-800 text-sm">
                  {customer.phone || '—'}
                </span>
              </div>
            </div>

            {/* Email liên hệ */}
            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Email liên hệ (Tài khoản B2B)</span>
                <span className="font-medium text-slate-800 break-all">{customer.email || '—'}</span>
              </div>
            </div>

            {/* Chính sách bảng giá */}
            <div className="flex items-start gap-2.5">
              <Tag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Chính sách bảng giá</span>
                <span className={`inline-block font-bold mt-0.5 px-2 py-0.5 rounded text-xs ${priceInfo.badge}`}>
                  {priceInfo.title}
                </span>
              </div>
            </div>

            {/* Địa chỉ trụ sở chính */}
            <div className="flex items-start gap-2.5 sm:col-span-2 lg:col-span-3 pt-2 border-t border-slate-100">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Địa chỉ trụ sở chính</span>
                <span className="font-medium text-slate-800 leading-relaxed">
                  {customer.address || '—'}
                </span>
              </div>
            </div>

            {/* Kho hàng phục vụ mặc định (nếu có) */}
            {servingWarehouse && (
              <div className="flex items-start gap-2.5 sm:col-span-2 lg:col-span-3 pt-2 border-t border-slate-100">
                <Warehouse className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Kho hàng phục vụ mặc định</span>
                  <span className="font-bold text-slate-800">
                    {servingWarehouse.warehouseName} ({servingWarehouse.warehouseCode})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KHỐI 2: ĐIỂM GIAO HÀNG (DELIVERY POINTS) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Điểm giao hàng ({deliveryPointsList.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsDeliveryModalOpen(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Quản lý điểm giao</span>
            </button>
          </div>

          {deliveryPointsList.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Chưa khai báo điểm giao hàng phụ</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Hệ thống sẽ mặc định giao hàng tới trụ sở chính: {customer.address || 'Chưa cập nhật'}
              </p>
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(true)}
                className="mt-2 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                + Thêm điểm giao hàng
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deliveryPointsList.map((dp, idx) => (
                <div
                  key={dp.id || idx}
                  className="p-3.5 text-xs bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{dp.name}</span>
                    {dp.isDefault && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 leading-relaxed">{dp.address}</p>
                  {(dp.receiverName || dp.phone) && (
                    <p className="text-slate-400 text-[11px]">
                      Người nhận: <strong className="text-slate-700">{dp.receiverName || '—'}</strong> • SĐT:{' '}
                      <strong className="font-mono text-slate-700">{dp.phone || '—'}</strong>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KHỐI 3: ĐƠN HÀNG PHÁT SINH GẦN NHẤT */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>Đơn hàng phát sinh gần nhất</span>
            </h3>
            <Link
              to={`/sales/orders?customerId=${customer.id}`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingOrders ? (
            <div className="py-6 text-center text-xs text-slate-400">Đang tải lịch sử đơn hàng...</div>
          ) : recentOrders.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 italic">
              Chưa có đơn hàng nào được ghi nhận cho đại lý này.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((ord) => {
                const orderTotal = ord.grandTotal ?? ord.subtotal ?? 0;
                return (
                  <div key={ord.id || ord.orderCode} className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{ord.orderCode}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {ord.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Ngày tạo: {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block text-sm">
                        {formatVnd(orderTotal)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {ord.lines?.length || 0} sản phẩm
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── TÍCH HỢP CÁC MODAL THAO TÁC ── */}
      {isCreditLimitModalOpen && (
        <UpdateLimitModal
          isOpen={isCreditLimitModalOpen}
          item={customer}
          onClose={() => setIsCreditLimitModalOpen(false)}
          onSubmit={handleSubmitCreditLimit}
          loading={isCreditLimitSubmitting}
        />
      )}

      {isDeliveryModalOpen && (
        <DeliveryPointModal
          open={isDeliveryModalOpen}
          customer={customer}
          onClose={() => setIsDeliveryModalOpen(false)}
          onUpdated={fetchCustomerDetail}
        />
      )}

      {isLockModalOpen && (
        <LockAgencyModal
          open={isLockModalOpen}
          mode={lockModalMode}
          customer={customer}
          onClose={() => setIsLockModalOpen(false)}
          onConfirmLock={handleConfirmLock}
          onConfirmUnlock={handleConfirmUnlock}
          loading={isLockSubmitting}
        />
      )}

      {isAssignModalOpen && (
        <AssignSalesRepModal
          isOpen={isAssignModalOpen}
          customer={customer}
          salesReps={salesReps}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={(updatedCustomer) => {
            setCustomer(updatedCustomer);
            setIsAssignModalOpen(false);
            showToast('success', 'Đã cập nhật nhân viên kinh doanh phụ trách');
          }}
        />
      )}
    </div>
  );
};
