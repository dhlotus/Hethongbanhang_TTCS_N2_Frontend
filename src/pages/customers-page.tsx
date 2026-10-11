import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Building2,
  UserCheck,
  ArrowRightLeft,
  History,
  Plus,
  Search,
  RefreshCw,
  MapPin,
  AlertCircle,
  Truck,
  Edit3,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Shield,
  Filter,
} from 'lucide-react';
import { customersService } from '../services/customers.service';
import { getStoredUser } from '../utils/navigation';
import { toast } from '../components/toast';
import { AssignSalesRepModal } from '../components/assign-sales-rep-modal';
import { BulkTransferTerritoryModal } from '../components/bulk-transfer-territory-modal';
import { CustomerFormModal } from '../components/customer-form-modal';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import type {
  Customer,
  SalesRepOption,
  CustomerAssignmentHistory,
} from '../types/customer';

const REGIONS_LIST = [
  'Tất cả khu vực',
  'Miền Bắc',
  'Miền Trung',
  'Miền Nam',
  'Đông Nam Bộ',
  'Tây Nam Bộ',
];

/** Định dạng tiền tệ VND */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

/** Định dạng ngày DD/MM/YYYY HH:mm */
const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
};

/** Lấy chữ cái đầu làm avatar */
const getInitials = (name?: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

/**
 * Trang Quản lý Đại lý & Phân công Địa bàn (SN-31, SN-35)
 */
export const CustomersPage: React.FC = () => {
  const currentUser = useMemo(() => getStoredUser(), []);
  const currentUserId = currentUser?.id || '';
  const currentUsername = currentUser?.username || '';
  const currentUserEmail = currentUser?.email || '';

  const isSalesRepOnly = useMemo(() => {
    return (
      currentUser?.role === 'SALES_REP' ||
      (currentUser?.roles?.includes('SALES_REP') &&
        !currentUser?.roles?.includes('SALES_MANAGER') &&
        !currentUser?.roles?.includes('ADMIN'))
    );
  }, [currentUser]);

  const isManagerOrAdmin = useMemo(() => {
    return (
      currentUser?.role === 'SALES_MANAGER' ||
      currentUser?.role === 'ADMIN' ||
      currentUser?.roles?.includes('SALES_MANAGER') ||
      currentUser?.roles?.includes('ADMIN')
    );
  }, [currentUser]);

  // Trạng thái dữ liệu
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'HISTORY'>('CUSTOMERS');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [historyLogs, setHistoryLogs] = useState<CustomerAssignmentHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unassignedCount, setUnassignedCount] = useState<number>(0);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('Tất cả khu vực');
  const [selectedSalesRepFilter, setSelectedSalesRepFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [customerToAssign, setCustomerToAssign] = useState<Customer | null>(null);

  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState<boolean>(false);
  const [bulkTransferPreselectedRepId, setBulkTransferPreselectedRepId] = useState<string>('');

  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isDeliveryPointOpen, setIsDeliveryPointOpen] = useState<boolean>(false);
  const [customerForDeliveryPoint, setCustomerForDeliveryPoint] = useState<Customer | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // TẢI DỮ LIỆU
  // ──────────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Tải danh sách đại lý
      const custRes = await customersService.getCustomers({
        search: searchTerm.trim() || undefined,
        region: selectedRegion !== 'Tất cả khu vực' ? selectedRegion : undefined,
        salesRepId:
          selectedSalesRepFilter === 'UNASSIGNED'
            ? undefined
            : selectedSalesRepFilter !== 'ALL'
            ? selectedSalesRepFilter
            : undefined,
        unassignedOnly: selectedSalesRepFilter === 'UNASSIGNED',
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      // Nếu là Sales Rep: Chỉ hiển thị đại lý mình phụ trách
      let filteredData = custRes.data;
      if (isSalesRepOnly) {
        const uId = currentUserId.toLowerCase();
        const uName = currentUsername.toLowerCase();
        const uEmail = currentUserEmail.toLowerCase();
        filteredData = filteredData.filter((c) => {
          if (!c.salesRepId) return false;
          const sId = c.salesRepId.toLowerCase();
          const sEmail = c.salesRepEmail?.toLowerCase() || '';
          return (
            sId === uId ||
            (uName === 'sales' && (sId === 'usr-sales-002' || sId === 'sales')) ||
            (uId.includes('sales') && sId === 'usr-sales-002') ||
            sId === uName ||
            (uEmail && sEmail === uEmail)
          );
        });
      }

      setCustomers(filteredData);
      setUnassignedCount(custRes.unassignedCount);

      // 2. Tải danh sách nhân sự kinh doanh
      const reps = await customersService.getAvailableSalesReps();
      setSalesReps(reps);

      // 3. Tải lịch sử chuyển giao
      const histRes = await customersService.getAssignmentHistory({
        search: historySearchTerm.trim() || undefined,
      });
      setHistoryLogs(histRes.data);
    } catch (err: unknown) {
      console.error('[CustomersPage] Lỗi tải dữ liệu:', err);
      toast.error('Không thể nạp dữ liệu đại lý');
    } finally {
      setIsLoading(false);
    }
  }, [
    searchTerm,
    selectedRegion,
    selectedSalesRepFilter,
    statusFilter,
    historySearchTerm,
    isSalesRepOnly,
    currentUserId,
    currentUsername,
    currentUserEmail,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thống kê tổng hợp
  const metrics = useMemo(() => {
    const total = customers.length;
    const assigned = customers.filter((c) => Boolean(c.salesRepId)).length;
    const unassigned = customers.filter((c) => !c.salesRepId).length;
    const repsCount = salesReps.length;
    return { total, assigned, unassigned, repsCount };
  }, [customers, salesReps]);

  // Handlers mở modal
  const handleOpenAssignModal = (cust: Customer) => {
    setCustomerToAssign(cust);
    setIsAssignModalOpen(true);
  };

  const handleOpenBulkTransferModal = (repId?: string) => {
    setBulkTransferPreselectedRepId(repId || '');
    setIsBulkTransferOpen(true);
  };

  const handleOpenCreateModal = () => {
    setCustomerToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cust: Customer) => {
    setCustomerToEdit(cust);
    setIsFormModalOpen(true);
  };

  const handleOpenDeliveryPointsModal = (cust: Customer) => {
    setCustomerForDeliveryPoint(cust);
    setIsDeliveryPointOpen(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedRegion('Tất cả khu vực');
    setSelectedSalesRepFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* PHẦN 1: PAGE HEADER & ACTION BUTTONS                                   */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quản lý Đại lý & Phân công Địa bàn
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              SN-31 / SN-35
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Phân công nhân viên kinh doanh phụ trách chính theo đại lý và khu vực, chuyển giao địa bàn hàng loạt
          </p>
        </div>

        {/* Nút hành động chính */}
        {isManagerOrAdmin && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenBulkTransferModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 hover:border-indigo-300 transition-colors shadow-2xs cursor-pointer active:scale-98"
            >
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              <span>Chuyển giao địa bàn hàng loạt</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-all cursor-pointer active:scale-98"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Thêm đại lý mới</span>
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* PHẦN 2: BANNER THÔNG BÁO THEO VAI TRÒ (ROLE-AWARE NOTIFICATION)        */}
      {/* ===================================================================== */}
      {isSalesRepOnly ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-800 text-sm">
          <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">
              Quyền truy cập Nhân viên kinh doanh
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Hệ thống đang áp dụng chính sách phân quyền dữ liệu (SN-35): Bạn chỉ nhìn thấy và chăm sóc các đại lý do bạn phụ trách chính trên địa bàn được phân công.
            </p>
          </div>
        </div>
      ) : unassignedCount > 0 ? (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold text-amber-900">
                Có {unassignedCount} đại lý chưa có nhân viên phụ trách chính!
              </span>
              <p className="text-xs text-amber-700">
                Hãy gán nhân viên kinh doanh để đảm bảo mọi đại lý đều có người chăm sóc và hỗ trợ lên đơn sỉ.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedSalesRepFilter('UNASSIGNED')}
            className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200/70 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
          >
            Lọc đại lý chưa gán
          </button>
        </div>
      ) : null}

      {/* ===================================================================== */}
      {/* PHẦN 3: THẺ CHỈ SỐ TỔNG QUAN (METRIC CARDS)                            */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng đại lý */}
        <div className="p-4.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng số đại lý
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</p>
            <p className="text-2xs text-slate-400 mt-0.5">Trên toàn bộ 5 khu vực</p>
          </div>
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Card 2: Đã phân công */}
        <div className="p-4.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Đã có người chăm sóc
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.assigned}</p>
            <p className="text-2xs text-slate-400 mt-0.5">Đã gán Sales Rep chính</p>
          </div>
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600">
            <UserCheck className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Card 3: Chưa phân công */}
        <div className="p-4.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Chưa phân công
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${
                metrics.unassigned > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              {metrics.unassigned}
            </p>
            <p className="text-2xs text-slate-400 mt-0.5">Cần phân công ngay</p>
          </div>
          <div
            className={`flex items-center justify-center w-11 h-11 rounded-xl ${
              metrics.unassigned > 0
                ? 'bg-amber-50 text-amber-600'
                : 'bg-slate-50 text-slate-400'
            }`}
          >
            <AlertCircle className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Card 4: Nhân sự kinh doanh */}
        <div className="p-4.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nhân sự kinh doanh
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.repsCount}</p>
            <p className="text-2xs text-slate-400 mt-0.5">Đang phụ trách địa bàn</p>
          </div>
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-purple-50 text-purple-600">
            <Users className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PHẦN 4: TABS CHUYỂN ĐỔI (DANH SÁCH ĐẠI LÝ / LỊCH SỬ CHUYỂN GIAO)       */}
      {/* ===================================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'CUSTOMERS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Danh sách đại lý ({customers.length})</span>
        </button>

        {isManagerOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Lịch sử chuyển giao địa bàn ({historyLogs.length})</span>
          </button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: DANH SÁCH ĐẠI LÝ & BỘ LỌC TÌM KIẾM                             */}
      {/* ===================================================================== */}
      {activeTab === 'CUSTOMERS' && (
        <div className="space-y-4">
          {/* Hàng bộ lọc */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Tìm kiếm */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên đại lý, mã đại lý, số điện thoại..."
                className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Lọc Khu vực */}
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-700"
              >
                {REGIONS_LIST.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {/* Lọc Nhân sự (chỉ dành cho Manager/Admin) */}
              {isManagerOrAdmin && (
                <select
                  value={selectedSalesRepFilter}
                  onChange={(e) => setSelectedSalesRepFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-700 max-w-[200px] truncate"
                >
                  <option value="ALL">Tất cả nhân sự phụ trách</option>
                  <option value="UNASSIGNED">Chưa phân công người phụ trách</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.fullName} ({rep.assignedCustomerCount})
                    </option>
                  ))}
                </select>
              )}

              {/* Lọc trạng thái */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-700"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="LOCKED">Tạm khóa</option>
              </select>

              {/* Reset & Refresh */}
              <button
                type="button"
                onClick={handleResetFilters}
                title="Đặt lại bộ lọc"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <Filter className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={loadData}
                title="Làm mới dữ liệu"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bảng Đại lý */}
          <div className="overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/60 text-2xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Đại lý</th>
                    <th className="py-3 px-4">Khu vực địa bàn</th>
                    <th className="py-3 px-4">Nhân viên phụ trách chính (SN-35)</th>
                    <th className="py-3 px-4 text-right">Hạn mức / Dư nợ</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-indigo-600" />
                        Đang nạp danh sách đại lý...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        Không tìm thấy đại lý nào phù hợp với điều kiện tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    customers.map((cust) => {
                      const hasRep = Boolean(cust.salesRepId && cust.salesRepName);

                      return (
                        <tr
                          key={cust.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Cột 1: Đại lý */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs shrink-0 mt-0.5">
                                {cust.code.slice(0, 3)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                    {cust.name}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-2xs font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    {cust.code}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {cust.phone}
                                  </span>
                                  {cust.email && (
                                    <span className="flex items-center gap-1 truncate max-w-[150px]">
                                      <Mail className="w-3 h-3" />
                                      {cust.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cột 2: Khu vực */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                              <MapPin className="w-3 h-3 text-indigo-500" />
                              {cust.region}
                            </span>
                          </td>

                          {/* Cột 3: Nhân viên phụ trách chính */}
                          <td className="py-3.5 px-4">
                            {hasRep ? (
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs shrink-0">
                                  {getInitials(cust.salesRepName)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate">
                                    {cust.salesRepName}
                                  </p>
                                  <p className="text-2xs text-slate-400">
                                    {cust.salesRepPhone || 'Nhân viên thị trường'}
                                  </p>
                                </div>
                                {isManagerOrAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAssignModal(cust)}
                                    title="Đổi nhân viên phụ trách"
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-all cursor-pointer ml-1"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertCircle className="w-3 h-3" />
                                  Chưa phân công
                                </span>
                                {isManagerOrAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAssignModal(cust)}
                                    className="px-2 py-0.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                                  >
                                    Gán ngay
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Cột 4: Hạn mức / Dư nợ */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="text-xs font-medium text-slate-700">
                              {formatCurrency(cust.creditLimit)}
                            </div>
                            <div className="text-2xs text-slate-400 mt-0.5">
                              Dư nợ: <strong className="text-slate-800">{formatCurrency(cust.currentDebt)}</strong>
                            </div>
                          </td>

                          {/* Cột 5: Trạng thái */}
                          <td className="py-3.5 px-4 text-center">
                            {cust.status === 'ACTIVE' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                Tạm khóa
                              </span>
                            )}
                          </td>

                          {/* Cột 6: Thao tác */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Nút điểm giao hàng (SN-31) */}
                              <button
                                type="button"
                                onClick={() => handleOpenDeliveryPointsModal(cust)}
                                title="Khai báo & Quản lý điểm giao hàng (SN-31)"
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5 text-slate-600" />
                                <span>Điểm giao ({cust.deliveryPoints?.length || 0})</span>
                              </button>

                              {/* Nút Phân công / Gán (SN-35) */}
                              {isManagerOrAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal(cust)}
                                  title="Gán người phụ trách chính"
                                  className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              )}

                              {/* Nút Chỉnh sửa */}
                              {isManagerOrAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(cust)}
                                  title="Chỉnh sửa đại lý"
                                  className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4" />
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

      {/* ===================================================================== */}
      {/* TAB 2: LỊCH SỬ CHUYỂN GIAO ĐỊA BÀN (HANDOVER AUDIT LOG - SN-35)        */}
      {/* ===================================================================== */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          {/* Ô tìm kiếm lịch sử */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                placeholder="Tìm lịch sử theo mã đợt, mã đại lý, lý do..."
                className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <span className="text-xs text-slate-500">
              Tổng số bản ghi: <strong className="text-indigo-600">{historyLogs.length}</strong>
            </span>
          </div>

          {/* Bảng Lịch sử */}
          <div className="overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/60 text-2xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Mã đợt / Thời gian</th>
                    <th className="py-3 px-4">Đại lý & Khu vực</th>
                    <th className="py-3 px-4">Nhân sự chuyển giao (Cũ)</th>
                    <th className="py-3 px-4">Nhân sự tiếp nhận (Mới)</th>
                    <th className="py-3 px-4">Lý do chuyển giao</th>
                    <th className="py-3 px-4">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                        <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        Chưa có lịch sử chuyển giao địa bàn nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    historyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {log.transferBatchId}
                          </span>
                          <div className="text-2xs text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(log.createdAt)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{log.customerName}</div>
                          <div className="text-2xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="font-mono">{log.customerCode}</span>
                            <span>•</span>
                            <span>{log.region}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-xs font-medium text-slate-600">
                            {log.fromSalesRepName || '(Chưa phân công)'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <UserCheck className="w-3.5 h-3.5" />
                            {log.toSalesRepName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="text-xs text-slate-700 truncate" title={log.reason}>
                            {log.reason}
                          </div>
                          {log.notes && (
                            <div className="text-2xs text-slate-400 truncate mt-0.5" title={log.notes}>
                              Ghi chú: {log.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                          {log.performedByName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CÁC MODAL NGHIỆP VỤ (SN-31 & SN-35)                                    */}
      {/* ===================================================================== */}

      {/* 1. Modal Gán Người Phụ Trách Chính */}
      <AssignSalesRepModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        customer={customerToAssign}
        salesReps={salesReps}
        onSuccess={() => loadData()}
      />

      {/* 2. Modal Chuyển Giao Địa Bàn Hàng Loạt Khi Nhân Viên Nghỉ */}
      <BulkTransferTerritoryModal
        isOpen={isBulkTransferOpen}
        onClose={() => setIsBulkTransferOpen(false)}
        allCustomers={customers}
        salesReps={salesReps}
        preselectedFromRepId={bulkTransferPreselectedRepId}
        onSuccess={() => loadData()}
      />

      {/* 3. Modal Thêm / Chỉnh Sửa Đại Lý */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        customer={customerToEdit}
        salesReps={salesReps}
        onSuccess={() => loadData()}
      />

      {/* 4. Modal Điểm Giao Hàng Đại Lý (SN-31) */}
      {customerForDeliveryPoint && (
        <DeliveryPointModal
          open={isDeliveryPointOpen}
          customer={customerForDeliveryPoint}
          onClose={() => {
            setIsDeliveryPointOpen(false);
            setCustomerForDeliveryPoint(null);
          }}
          onUpdated={() => loadData()}
        />
      )}
    </div>
  );
};
