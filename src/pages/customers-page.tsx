import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  X,
  Phone,
  MapPin,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  Truck,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Lock,
  MinusCircle,
} from 'lucide-react';
import { useCustomers } from '../hooks/use-customers';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import { CustomerStatus, type Customer } from '../types/customer.types';
import { getStoredUser } from '../utils/navigation';

/**
 * Định dạng tiền tệ VND
 */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

/**
 * Cấu hình hiển thị Nhóm khách hàng
 */
const CUSTOMER_GROUP_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  AGENT_LEVEL_1: {
    label: 'Đại lý Cấp 1',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  AGENT_LEVEL_2: {
    label: 'Đại lý Cấp 2',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  RETAIL: {
    label: 'Khách sỉ / Lẻ',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

/**
 * Cấu hình hiển thị Trạng thái khách hàng
 */
const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  [CustomerStatus.ACTIVE]: {
    label: 'Đang hoạt động',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  },
  [CustomerStatus.LOCKED]: {
    label: 'Tạm khóa nợ',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <Lock className="w-3.5 h-3.5 text-rose-600" />,
  },
  [CustomerStatus.INACTIVE]: {
    label: 'Ngừng kinh doanh',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: <MinusCircle className="w-3.5 h-3.5 text-slate-500" />,
  },
};

/**
 * Trang Tìm kiếm & Lọc Danh sách Đại lý theo tuyến (SN-37)
 * Tối ưu responsive, giao diện thân thiện trên thiết bị di động khi đứng ngoài đường
 */
export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isManagerOrAdmin = useMemo(() => {
    if (!currentUser?.roles) return false;
    return currentUser.roles.some((r) => {
      const normalized = r.toUpperCase();
      return normalized.includes('ADMIN') || normalized.includes('MANAGER');
    });
  }, [currentUser]);

  const {
    customers,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    searchInput,
    region,
    customerGroup,
    status,
    setSearchInput,
    setRegion,
    setCustomerGroup,
    setStatus,
    setPage,
    resetFilters,
    refresh,
  } = useCustomers(10);

  // State cho Modal Quản lý Điểm Giao Hàng
  const [selectedCustomerForPoints, setSelectedCustomerForPoints] = useState<Customer | null>(null);

  // Bộ lọc mở rộng trên mobile
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  const hasActiveFilters = Boolean(
    searchInput.trim() || region || customerGroup || status,
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HEADER SECTION & TỔNG QUAN                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                    Quản lý Đại lý Tuyến
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {loading ? '...' : `${total} đại lý`}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  {isManagerOrAdmin
                    ? 'Toàn bộ đại lý trên toàn hệ thống phân phối'
                    : 'Danh sách đại lý trong tuyến bán hàng được phân công'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                aria-label="Tải lại dữ liệu"
                className="inline-flex items-center justify-center h-10 px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </button>

              <button
                type="button"
                onClick={() => navigate('/sales/orders')}
                className="inline-flex items-center justify-center h-10 px-4 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-600/20"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Lên đơn hàng
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* 2. THANH TÌM KIẾM NHANH TỐI ƯU CHO MOBILE                      */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5 text-indigo-500" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm nhanh: Mã đại lý, tên hoặc SĐT (VD: 090..., DL-HN)..."
                className="block w-full h-11 sm:h-12 pl-10 pr-10 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/15 transition-all placeholder:text-slate-400 font-medium text-slate-900 shadow-inner"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`sm:hidden inline-flex items-center justify-center h-11 px-4 text-xs font-semibold rounded-xl border transition-all ${
                hasActiveFilters
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <Filter className="w-4 h-4 mr-1.5" />
              Bộ lọc
              {hasActiveFilters && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* 3. BỘ LỌC CHIP NHANH (QUICK FILTER CHIPS)                      */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div
            className={`mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2.5 ${
              showMobileFilters ? 'block' : 'hidden sm:flex'
            }`}
          >
            {/* Lọc Trạng thái */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-slate-400 font-medium whitespace-nowrap mr-1">
                Trạng thái:
              </span>
              <button
                type="button"
                onClick={() => setStatus('')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  status === ''
                    ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setStatus(CustomerStatus.ACTIVE)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  status === CustomerStatus.ACTIVE
                    ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đang hoạt động
              </button>
              <button
                type="button"
                onClick={() => setStatus(CustomerStatus.LOCKED)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  status === CustomerStatus.LOCKED
                    ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tạm khóa nợ
              </button>
              <button
                type="button"
                onClick={() => setStatus(CustomerStatus.INACTIVE)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  status === CustomerStatus.INACTIVE
                    ? 'bg-slate-600 text-white shadow-2xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ngừng kinh doanh
              </button>
            </div>

            {/* Lọc Khu vực & Nhóm đại lý */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium whitespace-nowrap">
                  Khu vực:
                </span>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  aria-label="Lọc theo khu vực địa bàn"
                  className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  <option value="">Tất cả khu vực</option>
                  <option value="Miền Bắc">Miền Bắc</option>
                  <option value="Miền Trung">Miền Trung</option>
                  <option value="Miền Nam">Miền Nam</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium whitespace-nowrap">
                  Nhóm đại lý:
                </span>
                <select
                  value={customerGroup}
                  onChange={(e) => setCustomerGroup(e.target.value)}
                  aria-label="Lọc theo nhóm đại lý"
                  className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  <option value="">Tất cả nhóm</option>
                  <option value="AGENT_LEVEL_1">Đại lý Cấp 1</option>
                  <option value="AGENT_LEVEL_2">Đại lý Cấp 2</option>
                  <option value="RETAIL">Khách sỉ / Lẻ</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium py-1 px-2 rounded-md hover:bg-rose-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. MAIN CONTENT AREA                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        {/* Lỗi cảnh báo nếu có */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* LOADING SKELETON */}
        {loading ? (
          <div className="space-y-4">
            {/* Skeleton Mobile Cards */}
            <div className="grid grid-cols-1 md:hidden gap-3.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs animate-pulse space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-24 bg-slate-200 rounded-md" />
                    <div className="h-5 w-20 bg-slate-200 rounded-full" />
                  </div>
                  <div className="h-5 w-3/4 bg-slate-200 rounded-md" />
                  <div className="h-4 w-1/2 bg-slate-100 rounded-md" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>

            {/* Skeleton Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-slate-100 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        ) : customers.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto my-8 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Không tìm thấy đại lý nào
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {hasActiveFilters
                ? 'Không có đại lý nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.'
                : 'Hiện chưa có dữ liệu đại lý nào trong tuyến của bạn.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 active:scale-95 transition-all"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          /* LIST RESULTS */
          <>
            {/* ───────────────────────────────────────────────────────────── */}
            {/* VIEW A: DẠNG CARD CHO THIẾT BỊ DI ĐỘNG (< 768px)               */}
            {/* Tối ưu một tay vuốt chạm, nút gọi điện thoại trực tiếp        */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:hidden gap-3.5">
              {customers.map((cust) => {
                const groupInfo = CUSTOMER_GROUP_CONFIG[cust.customerGroup] || {
                  label: cust.customerGroup,
                  badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
                };
                const statusInfo = STATUS_CONFIG[cust.status] || {
                  label: cust.status,
                  badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
                  icon: null,
                };
                const debtRatio =
                  cust.creditLimit > 0
                    ? Math.min(100, Math.round((cust.currentDebt / cust.creditLimit) * 100))
                    : 0;

                return (
                  <div
                    key={cust.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-indigo-300 transition-all"
                  >
                    {/* Header Card: Mã & Trạng thái */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {cust.code}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Tên đại lý */}
                    <h2 className="text-base font-bold text-slate-900 leading-snug">
                      {cust.name}
                    </h2>

                    {/* Địa chỉ & Khu vực */}
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {cust.address && (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{cust.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${groupInfo.badgeClass}`}
                        >
                          {groupInfo.label}
                        </span>
                        {cust.region && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {cust.region}
                          </span>
                        )}
                        {(cust.salesRep?.name || cust.salesRepName) && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            {cust.salesRep?.name || cust.salesRepName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hạn mức & Công nợ */}
                    <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">
                          Công nợ / Hạn mức:
                        </span>
                        <span
                          className={`font-bold ${
                            debtRatio >= 90
                              ? 'text-rose-600'
                              : debtRatio >= 70
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {formatCurrency(cust.currentDebt)} / {formatCurrency(cust.creditLimit)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            debtRatio >= 90
                              ? 'bg-rose-500'
                              : debtRatio >= 70
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{ width: `${debtRatio}%` }}
                        />
                      </div>
                    </div>

                    {/* Hành động nhanh: Gọi điện / Điểm giao / Đặt hàng */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <a
                        href={`tel:${cust.phone}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 font-semibold text-xs border border-emerald-200 transition-all shadow-2xs"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        Gọi {cust.phone}
                      </a>

                      <button
                        type="button"
                        onClick={() => setSelectedCustomerForPoints(cust)}
                        className="inline-flex items-center justify-center h-10 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 font-medium text-xs transition-all border border-slate-200/60"
                        title="Xem các điểm giao hàng"
                      >
                        <Truck className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate('/sales/orders')}
                        className="inline-flex items-center justify-center h-10 px-3.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 font-semibold text-xs transition-all shadow-xs shadow-indigo-600/20"
                      >
                        Lên đơn
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* VIEW B: DẠNG BẢNG CHO DESKTOP (>= 768px)                       */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4">Mã Đại lý</th>
                      <th className="py-3 px-4">Tên Đại lý</th>
                      <th className="py-3 px-4">Điện thoại</th>
                      <th className="py-3 px-4">Khu vực / Nhóm</th>
                      <th className="py-3 px-4">Phụ trách</th>
                      <th className="py-3 px-4 text-right">Công nợ / Hạn mức</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((cust) => {
                      const groupInfo = CUSTOMER_GROUP_CONFIG[cust.customerGroup] || {
                        label: cust.customerGroup,
                        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
                      };
                      const statusInfo = STATUS_CONFIG[cust.status] || {
                        label: cust.status,
                        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
                        icon: null,
                      };
                      const debtRatio =
                        cust.creditLimit > 0
                          ? Math.min(100, Math.round((cust.currentDebt / cust.creditLimit) * 100))
                          : 0;

                      return (
                        <tr
                          key={cust.id}
                          className="hover:bg-indigo-50/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                            {cust.code}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {cust.name}
                            </div>
                            {cust.address && (
                              <div className="text-slate-500 text-[11px] truncate max-w-xs mt-0.5">
                                {cust.address}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <a
                              href={`tel:${cust.phone}`}
                              className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              {cust.phone}
                            </a>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-medium border ${groupInfo.badgeClass}`}
                              >
                                {groupInfo.label}
                              </span>
                              {cust.region && (
                                <span className="text-[11px] text-slate-500">
                                  {cust.region}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                            {cust.salesRep?.name || cust.salesRepName || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="font-semibold text-slate-900">
                              {formatCurrency(cust.currentDebt)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Hạn mức: {formatCurrency(cust.creditLimit)}
                            </div>
                            <div className="w-24 ml-auto mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  debtRatio >= 90
                                    ? 'bg-rose-500'
                                    : debtRatio >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-indigo-500'
                                }`}
                                style={{ width: `${debtRatio}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
                            >
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedCustomerForPoints(cust)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium text-xs transition-all border border-slate-200/60"
                                title="Khai báo & Quản lý điểm giao hàng"
                              >
                                <Truck className="w-3.5 h-3.5 text-slate-600" />
                                Điểm giao
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate('/sales/orders')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs transition-all shadow-2xs"
                              >
                                Lên đơn
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 5. PHÂN TRANG (PAGINATION)                                    */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-slate-500">
                Hiển thị{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min((page - 1) * limit + 1, total)}
                </span>{' '}
                -{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(page * limit, total)}
                </span>{' '}
                trên tổng số{' '}
                <span className="font-semibold text-slate-800">{total}</span> đại lý
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Trước
                </button>

                <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md">
                  Trang {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Sau
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. MODAL QUẢN LÝ ĐIỂM GIAO HÀNG (SN-31 & SN-32)                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedCustomerForPoints && (
        <DeliveryPointModal
          open={Boolean(selectedCustomerForPoints)}
          customer={selectedCustomerForPoints}
          onClose={() => setSelectedCustomerForPoints(null)}
          onUpdated={(points) => {
            // Cập nhật lại deliveryPoints cho đại lý đang chọn
            setSelectedCustomerForPoints((prev) =>
              prev ? { ...prev, deliveryPoints: points } : null,
            );
            void refresh();
          }}
        />
      )}
    </div>
  );
};
