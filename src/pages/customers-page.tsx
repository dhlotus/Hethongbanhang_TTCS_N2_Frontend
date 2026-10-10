import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  ShoppingCart,
  CheckCircle2,
  X,
  Filter,
  ShieldCheck,
  AlertCircle,
  UserCheck,
  Lock,
  Unlock,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import { LockAgencyModal } from '../components/lock-agency-modal';
import { Pagination } from '../components/pagination';
import { customerService } from '../services/customer.service';
import type { Customer, CreateCustomerPayload, DeliveryPoint } from '../types/customer.types';

// ──────────────────────────────────────────────────────────────────────────
// QUERY PARAM MAPPINGS CHO BỘ LỌC ĐẠI LÝ (URL STATE MANAGEMENT)
// ──────────────────────────────────────────────────────────────────────────

const REGION_TO_PARAM: Record<string, string> = {
  'Miền Bắc': 'north',
  'Miền Trung': 'central',
  'Miền Nam': 'south',
};

const PARAM_TO_REGION: Record<string, string> = {
  north: 'Miền Bắc',
  central: 'Miền Trung',
  south: 'Miền Nam',
  mien_bac: 'Miền Bắc',
  mien_trung: 'Miền Trung',
  mien_nam: 'Miền Nam',
  'miền bắc': 'Miền Bắc',
  'miền trung': 'Miền Trung',
  'miền nam': 'Miền Nam',
};

const GROUP_TO_PARAM: Record<string, string> = {
  AGENT_LEVEL_1: 'level1',
  AGENT_LEVEL_2: 'level2',
  WHOLESALE: 'wholesale',
  RETAIL: 'retail',
};

const PARAM_TO_GROUP: Record<string, string> = {
  level1: 'AGENT_LEVEL_1',
  level2: 'AGENT_LEVEL_2',
  wholesale: 'WHOLESALE',
  retail: 'RETAIL',
  agent_level_1: 'AGENT_LEVEL_1',
  agent_level_2: 'AGENT_LEVEL_2',
};

const STATUS_TO_PARAM: Record<string, string> = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  INACTIVE: 'inactive',
};

const PARAM_TO_STATUS: Record<string, string> = {
  active: 'ACTIVE',
  locked: 'LOCKED',
  inactive: 'INACTIVE',
};

const parseRegionParam = (param: string | null): string => {
  if (!param) return 'ALL';
  const lower = param.toLowerCase().trim();
  return PARAM_TO_REGION[lower] || 'ALL';
};

const parseGroupParam = (param: string | null): string => {
  if (!param) return 'ALL';
  const lower = param.toLowerCase().trim();
  return PARAM_TO_GROUP[lower] || 'ALL';
};

const parseStatusParam = (param: string | null): string => {
  if (!param) return 'ALL';
  const lower = param.toLowerCase().trim();
  return PARAM_TO_STATUS[lower] || 'ALL';
};

/**
 * Trang Quản lý Đại lý & Hạn mức tín dụng (SN-31, SN-32, SN-37 & Đồng bộ dữ liệu)
 * Tuân thủ triệt để UI_GUIDELINES.md và CODE_CONVENTION.md
 */
export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Khởi tạo các giá trị lọc ban đầu từ URL Query Parameters
  const initialRegion = parseRegionParam(searchParams.get('region'));
  const initialGroup = parseGroupParam(searchParams.get('group'));
  const initialStatus = parseStatusParam(searchParams.get('status'));
  const initialSearch = searchParams.get('search') || '';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  // State danh sách đại lý & tải dữ liệu
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Bộ lọc & tìm kiếm (Hỗ trợ SN-37 đa tiêu chí & đồng bộ URL)
  const [searchInput, setSearchInput] = useState<string>(initialSearch);
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);

  // Phân trang danh sách đại lý (10 - 20 - 50 dòng/trang) - Server-side
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modal quản lý điểm giao hàng (SN-31 & SN-32)
  const [selectedCustomerForDelivery, setSelectedCustomerForDelivery] = useState<Customer | null>(
    null
  );
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);

  // Modal Khóa / Mở khóa đại lý (SN-36)
  const [lockModalCustomer, setLockModalCustomer] = useState<Customer | null>(null);
  const [lockModalMode, setLockModalMode] = useState<'LOCK' | 'UNLOCK'>('LOCK');
  const [isLockModalOpen, setIsLockModalOpen] = useState<boolean>(false);
  const [isLockSubmitting, setIsLockSubmitting] = useState<boolean>(false);

  // Modal thêm đại lý mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateCustomerPayload>({
    name: '',
    code: '',
    customerGroup: 'AGENT_LEVEL_2',
    phone: '',
    email: '',
    taxCode: '',
    address: '',
    region: 'Miền Nam',
    creditLimit: 50000000,
    maxDebtDays: 30,
    deliveryPointName: '',
    receiverName: '',
  });

  // Khóa cuộn trang nền khi mở Modal Thêm mới đại lý (cố định popup giữa màn hình)
  useEffect(() => {
    if (isCreateModalOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const mainEl = document.querySelector('main');
      const prevMainOverflow = mainEl ? mainEl.style.overflow : '';

      document.body.style.overflow = 'hidden';
      if (mainEl) mainEl.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !submitting) {
          setIsCreateModalOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        if (mainEl) mainEl.style.overflow = prevMainOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isCreateModalOpen, submitting]);

  // Đồng bộ hóa URL Search Params an toàn, giữ nguyên các param khác và không reload trang
  const updateUrlParams = useCallback(
    (updates: {
      region?: string;
      group?: string;
      status?: string;
      search?: string;
      page?: number;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          // Khu vực
          const targetRegion = updates.region !== undefined ? updates.region : selectedRegion;
          if (targetRegion && targetRegion !== 'ALL' && REGION_TO_PARAM[targetRegion]) {
            next.set('region', REGION_TO_PARAM[targetRegion]);
          } else {
            next.delete('region');
          }

          // Phân nhóm
          const targetGroup = updates.group !== undefined ? updates.group : selectedGroup;
          if (targetGroup && targetGroup !== 'ALL' && GROUP_TO_PARAM[targetGroup]) {
            next.set('group', GROUP_TO_PARAM[targetGroup]);
          } else {
            next.delete('group');
          }

          // Trạng thái
          const targetStatus = updates.status !== undefined ? updates.status : selectedStatus;
          if (targetStatus && targetStatus !== 'ALL' && STATUS_TO_PARAM[targetStatus]) {
            next.set('status', STATUS_TO_PARAM[targetStatus]);
          } else {
            next.delete('status');
          }

          // Tìm kiếm
          const targetSearch = updates.search !== undefined ? updates.search : searchTerm;
          const trimmed = targetSearch.trim();
          if (trimmed) {
            next.set('search', trimmed);
          } else {
            next.delete('search');
          }

          // Phân trang
          const targetPage = updates.page !== undefined ? updates.page : currentPage;
          if (
            targetPage > 1 ||
            next.has('region') ||
            next.has('group') ||
            next.has('status') ||
            next.has('search')
          ) {
            next.set('page', String(targetPage));
          } else {
            next.delete('page');
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, selectedRegion, selectedGroup, selectedStatus, searchTerm, currentPage]
  );

  // Tải danh sách đại lý từ Server-side API theo đầy đủ bộ lọc (SN-37 & Server-Side Pagination)
  const loadCustomers = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      search?: string;
      region?: string;
      customerGroup?: string;
      status?: string;
    }) => {
      try {
        setLoading(true);
        const targetPage = params?.page !== undefined ? params.page : currentPage;
        const targetLimit = params?.limit !== undefined ? params.limit : pageSize;
        const targetSearch = params?.search !== undefined ? params.search : searchTerm;
        const targetRegion = params?.region !== undefined ? params.region : selectedRegion;
        const targetGroup =
          params?.customerGroup !== undefined ? params.customerGroup : selectedGroup;
        const targetStatus = params?.status !== undefined ? params.status : selectedStatus;

        const res = await customerService.getCustomers({
          page: targetPage,
          limit: targetLimit,
          search: targetSearch.trim() || undefined,
          region: targetRegion !== 'ALL' ? targetRegion : undefined,
          customerGroup: targetGroup !== 'ALL' ? targetGroup : undefined,
          status: targetStatus !== 'ALL' ? targetStatus : undefined,
        });

        setCustomers(res.data || []);
        setTotalItems(typeof res.total === 'number' ? res.total : (res.data ? res.data.length : 0));
        setTotalPages(res.totalPages || 1);
      } catch {
        showToast('error', 'Lỗi tải dữ liệu', 'Không thể nạp danh sách đại lý từ hệ thống.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize, searchTerm, selectedRegion, selectedGroup, selectedStatus]
  );

  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    setCurrentPage(1);
    updateUrlParams({ region: newRegion, page: 1 });
    void loadCustomers({ region: newRegion, page: 1 });
  };

  const handleGroupChange = (newGroup: string) => {
    setSelectedGroup(newGroup);
    setCurrentPage(1);
    updateUrlParams({ group: newGroup, page: 1 });
    void loadCustomers({ customerGroup: newGroup, page: 1 });
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    setCurrentPage(1);
    updateUrlParams({ status: newStatus, page: 1 });
    void loadCustomers({ status: newStatus, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateUrlParams({ page: newPage });
    void loadCustomers({ page: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    updateUrlParams({ page: 1 });
    void loadCustomers({ limit: newSize, page: 1 });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedGroup('ALL');
    setSelectedStatus('ALL');
    setSelectedRegion('ALL');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
    void loadCustomers({
      page: 1,
      search: '',
      region: 'ALL',
      customerGroup: 'ALL',
      status: 'ALL',
    });
  };

  const isInitialSearchMount = useRef(true);

  // Debounce tìm kiếm (400ms) để gọi Server-side search không spam request
  useEffect(() => {
    if (isInitialSearchMount.current) {
      isInitialSearchMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== searchTerm) {
        setSearchTerm(trimmed);
        setCurrentPage(1);
        updateUrlParams({ search: trimmed, page: 1 });
        void loadCustomers({ search: trimmed, page: 1 });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, searchTerm, updateUrlParams, loadCustomers]);

  // Lắng nghe thay đổi của URL Search Params (khi F5, dán link hoặc Back/Forward trên browser)
  useEffect(() => {
    const urlRegion = parseRegionParam(searchParams.get('region'));
    const urlGroup = parseGroupParam(searchParams.get('group'));
    const urlStatus = parseStatusParam(searchParams.get('status'));
    const urlSearch = searchParams.get('search') || '';
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

    let changed = false;
    if (urlRegion !== selectedRegion) {
      setSelectedRegion(urlRegion);
      changed = true;
    }
    if (urlGroup !== selectedGroup) {
      setSelectedGroup(urlGroup);
      changed = true;
    }
    if (urlStatus !== selectedStatus) {
      setSelectedStatus(urlStatus);
      changed = true;
    }
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setSearchInput(urlSearch);
      changed = true;
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
      changed = true;
    }

    if (changed) {
      void loadCustomers({
        region: urlRegion,
        customerGroup: urlGroup,
        status: urlStatus,
        search: urlSearch,
        page: urlPage,
      });
    }
  }, [searchParams]);

  // Khởi tạo tải dữ liệu lần đầu với các tham số từ URL
  useEffect(() => {
    void loadCustomers({
      search: initialSearch || undefined,
      region: initialRegion,
      customerGroup: initialGroup,
      status: initialStatus,
      page: initialPage,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lắng nghe sự kiện đồng bộ từ Tạo đơn hàng (SN-38) hoặc Tab khác
  useEffect(() => {
    const handleSync = () => {
      void loadCustomers();
    };

    window.addEventListener('loha_customers_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('loha_customers_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadCustomers]);

  // Làm mới dữ liệu từ server
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    showToast(
      'success',
      'Đồng bộ hoàn tất',
      'Dữ liệu đại lý và điểm giao hàng đã được cập nhật mới nhất từ máy chủ.'
    );
  };

  // Thống kê nhanh KPI từ server-side pagination & mảng customers
  const stats = useMemo(() => {
    const total = totalItems;
    const active = customers.filter((c) => c.status === 'ACTIVE').length;
    const totalCredit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    const totalDebt = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
    return { total, active, totalCredit, totalDebt };
  }, [totalItems, customers]);

  // Xử lý tạo mới đại lý & đồng bộ ngay lập tức
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('error', 'Thiếu thông tin', 'Vui lòng nhập tên đại lý hoặc công ty.');
      return;
    }
    if (!formData.phone.trim()) {
      showToast('error', 'Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ của đại lý.');
      return;
    }
    if (!formData.address.trim()) {
      showToast(
        'error',
        'Thiếu thông tin',
        'Vui lòng nhập địa chỉ trụ sở / kinh doanh của đại lý.'
      );
      return;
    }

    try {
      setSubmitting(true);
      const newCustomer = await customerService.createCustomer({
        ...formData,
        code: formData.code?.trim() || undefined,
        creditLimit: Number(formData.creditLimit) || 50000000,
        maxDebtDays: Number(formData.maxDebtDays) || 30,
      });

      showToast(
        'success',
        'Thêm đại lý thành công',
        `Đại lý "${newCustomer.name}" đã được tạo và đồng bộ ngay vào hệ thống!`
      );

      // Đóng modal và reset form
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        code: '',
        customerGroup: 'AGENT_LEVEL_2',
        phone: '',
        email: '',
        taxCode: '',
        address: '',
        region: 'Miền Nam',
        creditLimit: 50000000,
        maxDebtDays: 30,
        deliveryPointName: '',
        receiverName: '',
      });

      // Tải lại danh sách từ server ở trang 1 để cập nhật dữ liệu đại lý mới
      void loadCustomers({ page: 1 });
    } catch {
      showToast('error', 'Lỗi tạo đại lý', 'Không thể tạo đại lý mới. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal khóa giao dịch đại lý (SN-36)
  const handleOpenLockModal = (customer: Customer) => {
    setLockModalCustomer(customer);
    setLockModalMode('LOCK');
    setIsLockModalOpen(true);
  };

  // Mở modal mở khóa giao dịch đại lý (SN-36)
  const handleOpenUnlockModal = (customer: Customer) => {
    setLockModalCustomer(customer);
    setLockModalMode('UNLOCK');
    setIsLockModalOpen(true);
  };

  // Xác nhận khóa đại lý qua Modal (SN-36)
  const handleConfirmLock = async (reason: string) => {
    if (!lockModalCustomer) return;
    try {
      setIsLockSubmitting(true);
      const updated = await customerService.lockCustomer(lockModalCustomer.id, reason.trim());
      showToast(
        'warning',
        'Đã khóa giao dịch',
        `Đại lý "${updated.name}" đã bị khóa giao dịch. Lý do: ${reason.trim()}`
      );
      setIsLockModalOpen(false);
      setLockModalCustomer(null);
      void loadCustomers();
    } catch (err: unknown) {
      showToast(
        'error',
        'Lỗi khóa đại lý',
        err instanceof Error ? err.message : 'Không thể khóa đại lý.'
      );
    } finally {
      setIsLockSubmitting(false);
    }
  };

  // Xác nhận mở khóa đại lý qua Modal (SN-36)
  const handleConfirmUnlock = async () => {
    if (!lockModalCustomer) return;
    try {
      setIsLockSubmitting(true);
      const updated = await customerService.unlockCustomer(lockModalCustomer.id);
      showToast(
        'success',
        'Đã mở khóa giao dịch',
        `Đại lý "${updated.name}" đã được mở khóa và có thể giao dịch bình thường!`
      );
      setIsLockModalOpen(false);
      setLockModalCustomer(null);
      void loadCustomers();
    } catch (err: unknown) {
      showToast(
        'error',
        'Lỗi mở khóa',
        err instanceof Error ? err.message : 'Không thể mở khóa đại lý.'
      );
    } finally {
      setIsLockSubmitting(false);
    }
  };

  // Mở modal điểm giao hàng của đại lý
  const handleOpenDeliveryPoints = (customer: Customer) => {
    setSelectedCustomerForDelivery(customer);
    setIsDeliveryModalOpen(true);
  };

  // Cập nhật lại số điểm giao hàng khi sửa trong DeliveryPointModal
  const handleDeliveryPointsUpdated = (updatedPoints: DeliveryPoint[]) => {
    if (!selectedCustomerForDelivery) return;

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === selectedCustomerForDelivery.id ? { ...c, deliveryPoints: updatedPoints } : c
      )
    );

    setSelectedCustomerForDelivery((prev) =>
      prev ? { ...prev, deliveryPoints: updatedPoints } : null
    );
  };

  // Format tiền tệ VNĐ
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Lấy nhãn phân nhóm đại lý
  const getGroupLabel = (group: string) => {
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
        return 'Đại lý chuẩn';
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER GIỐNG TRANG ĐƠN HÀNG BÁN BUÔN ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Đại lý & Hạn mức nợ
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Quản lý danh sách khách hàng đại lý, theo dõi hạn mức tín dụng và công nợ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            title="Đồng bộ danh sách"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`}
            />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm đại lý mới</span>
          </button>
        </div>
      </div>

      {/* ── THỐNG KÊ NHANH KPI (CARD-BASED UI) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-blue-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Tổng số đại lý</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Đang hoạt động</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0 truncate">
            <p className="text-xs text-slate-500 font-medium">Tổng hạn mức tín dụng</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {formatVnd(stats.totalCredit)}
            </p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0 truncate">
            <p className="text-xs text-slate-500 font-medium">Tổng dư nợ hiện tại</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {formatVnd(stats.totalDebt)}
            </p>
          </div>
        </div>
      </div>

      {/* ── THANH TÌM KIẾM & BỘ LỌC ĐA TIÊU CHÍ (SN-37) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên đại lý, mã hoặc số điện thoại..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Lọc:</span>
          </div>

          <select
            value={selectedRegion}
            onChange={(e) => handleRegionChange(e.target.value)}
            aria-label="Lọc theo khu vực"
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Tất cả khu vực</option>
            <option value="Miền Nam">Miền Nam</option>
            <option value="Miền Trung">Miền Trung</option>
            <option value="Miền Bắc">Miền Bắc</option>
          </select>

          <select
            value={selectedGroup}
            onChange={(e) => handleGroupChange(e.target.value)}
            aria-label="Lọc theo nhóm đại lý"
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Tất cả phân nhóm</option>
            <option value="AGENT_LEVEL_1">Đại lý Cấp 1</option>
            <option value="AGENT_LEVEL_2">Đại lý Cấp 2</option>
            <option value="WHOLESALE">Bán buôn</option>
            <option value="RETAIL">Bán lẻ</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            aria-label="Lọc theo trạng thái hoạt động"
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Tạm khóa</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH ĐẠI LÝ ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-medium">Đang tải danh sách đại lý...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Building2 className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Không tìm thấy đại lý phù hợp với điều kiện lọc</p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead className="bg-slate-50/70 text-slate-500 text-xs uppercase font-semibold border-b border-slate-100 tracking-wide">
                  <tr>
                    <th className="px-4 py-3.5">Mã & Tên Đại Lý</th>
                    <th className="px-4 py-3.5">Liên Hệ</th>
                    <th className="px-4 py-3.5">Phân Nhóm & Phụ Trách</th>
                    <th className="px-4 py-3.5">Hạn Mức & Dư Nợ</th>
                    <th className="px-4 py-3.5">Điểm Giao Hàng (SN-31)</th>
                    <th className="px-4 py-3.5">Trạng Thái</th>
                    <th className="px-4 py-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => {
                  const debtPercent =
                    customer.creditLimit > 0
                      ? Math.min(
                        100,
                        Math.round((customer.currentDebt / customer.creditLimit) * 100)
                      )
                      : 0;

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Cột 1: Mã & Tên Đại lý */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">
                          {customer.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {customer.code} • {customer.region || 'Miền Nam'}
                        </div>
                        {customer.address && (
                          <div
                            className="text-xs text-slate-400 line-clamp-1 mt-0.5"
                            title={customer.address}
                          >
                            {customer.address}
                          </div>
                        )}
                      </td>

                      {/* Cột 2: Liên hệ */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-xs">{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[140px]">{customer.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Cột 3: Phân nhóm & Phụ trách */}
                      <td className="px-4 py-3.5">
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.customerGroup === 'AGENT_LEVEL_1'
                                ? 'bg-indigo-50 text-[var(--color-primary)] border border-indigo-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}
                          >
                            {getGroupLabel(customer.customerGroup)}
                          </span>
                        </div>
                        {(customer.salesRepName || customer.salesRep?.name) && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            <span>{customer.salesRepName || customer.salesRep?.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Cột 4: Hạn mức & Công nợ */}
                      <td className="px-4 py-3.5 min-w-[170px]">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-500">Dư nợ:</span>
                          <span
                            className={`font-semibold ${debtPercent > 80 ? 'text-rose-600 font-bold' : 'text-slate-800'
                              }`}
                          >
                            {formatVnd(customer.currentDebt || 0)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${debtPercent > 80
                                ? 'bg-rose-500'
                                : debtPercent > 50
                                  ? 'bg-amber-500'
                                  : 'bg-[var(--color-primary)]'
                              }`}
                            style={{ width: `${debtPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                          <span>{debtPercent}% hạn mức</span>
                          <span>HM: {formatVnd(customer.creditLimit || 0)}</span>
                        </div>
                      </td>

                      {/* Cột 5: Điểm giao hàng (SN-31 & SN-32) */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDeliveryPoints(customer)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-[var(--color-primary)] hover:border-indigo-200 transition-colors shadow-2xs"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <span>{customer.deliveryPoints?.length || 0} Điểm giao</span>
                        </button>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="px-4 py-3.5">
                        {customer.status === 'LOCKED' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                            title={`Lý do khóa: ${customer.lockReason || 'Không xác định'}`}
                          >
                            <Lock className="w-3 h-3 text-rose-500" />
                            <span>Khóa giao dịch</span>
                          </span>
                        ) : customer.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Tạm dừng
                          </span>
                        )}
                      </td>

                      {/* Cột 7: Thao tác (SN-36: Khóa/Mở khóa giao dịch) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút Khóa / Mở khóa giao dịch (SN-36) */}
                          {customer.status === 'LOCKED' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenUnlockModal(customer)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Mở khóa giao dịch đại lý (SN-36)"
                            >
                              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Mở khóa</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenLockModal(customer)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="Khóa giao dịch đại lý (SN-36)"
                            >
                              <Lock className="w-3.5 h-3.5 text-rose-600" />
                              <span>Khóa</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenDeliveryPoints(customer)}
                            className="p-1.5 text-slate-500 hover:text-[var(--color-primary)] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Quản lý điểm giao hàng (SN-31)"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={customer.status === 'LOCKED'}
                            onClick={() => {
                              navigate(`/sales/orders?customerId=${customer.id}`);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${customer.status === 'LOCKED'
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                                : 'text-[var(--color-primary)] bg-indigo-50 hover:bg-[var(--color-primary)] hover:text-white'
                              }`}
                            title={
                              customer.status === 'LOCKED'
                                ? 'Đại lý đang bị khóa giao dịch, không thể lên đơn!'
                                : 'Tạo đơn hàng B2B cho đại lý này'
                            }
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Lên đơn</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── THANH PHÂN TRANG GẮN LIỀN CHÂN BẢNG (KHÔNG ĐÈ NỘI DUNG) ── */}
          {totalItems > 0 && (
            <Pagination
              variant="default"
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50]}
              itemLabel="đại lý"
              showFirstLast={true}
              onPageChange={(page) => handlePageChange(page)}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}
    </div>

      {/* ── MODAL THÊM ĐẠI LÝ MỚI (CỐ ĐỊNH GIỮA MÀN HÌNH - KHÔNG TRƯỢT) ── */}
      {isCreateModalOpen &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !submitting) {
                setIsCreateModalOpen(false);
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Modal Header (Cố định ở đỉnh popup) */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[var(--color-primary)] flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Thêm Đại Lý Mới</h3>
                    <p className="text-xs text-slate-500">
                      Dữ liệu sẽ đồng bộ ngay lập tức sang Quản lý đại lý & Tạo đơn hàng
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Đóng modal (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form Fields (Cuộn độc lập bên trong) */}
              <form id="create-customer-form" onSubmit={handleCreateCustomer} className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Tên đại lý */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Tên đại lý / Doanh nghiệp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Công ty TNHH Phân Phối Toàn Cầu"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                    />
                  </div>

                  {/* Mã đại lý */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Mã đại lý (tùy chọn)
                    </label>
                    <input
                      type="text"
                      placeholder="Tự sinh nếu để trống (DL-...)"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 font-mono"
                    />
                  </div>

                  {/* Phân nhóm */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Phân nhóm đại lý</label>
                    <select
                      value={formData.customerGroup}
                      onChange={(e) => setFormData({ ...formData, customerGroup: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 bg-white"
                    >
                      <option value="AGENT_LEVEL_1">Đại lý Cấp 1</option>
                      <option value="AGENT_LEVEL_2">Đại lý Cấp 2</option>
                      <option value="WHOLESALE">Bán buôn</option>
                      <option value="RETAIL">Bán lẻ</option>
                    </select>
                  </div>

                  {/* Số điện thoại */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Số điện thoại liên hệ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="VD: 0988776655"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Email liên hệ</label>
                    <input
                      type="email"
                      placeholder="VD: daily@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                    />
                  </div>

                  {/* Địa chỉ trụ sở */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Địa chỉ kinh doanh / trụ sở <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: 123 Đường Nguyễn Trãi, Phường 2, Quận 5, TP.HCM"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                    />
                  </div>

                  {/* Hạn mức tín dụng */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Hạn mức tín dụng (VNĐ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000000"
                      value={formData.creditLimit}
                      onChange={(e) =>
                        setFormData({ ...formData, creditLimit: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                    />
                  </div>

                  {/* Khu vực */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Khu vực địa bàn</label>
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 bg-white"
                    >
                      <option value="Miền Nam">Miền Nam</option>
                      <option value="Miền Trung">Miền Trung</option>
                      <option value="Miền Bắc">Miền Bắc</option>
                    </select>
                  </div>

                  {/* Điểm giao ban đầu */}
                  <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <span>Điểm giao hàng mặc định ban đầu</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Tên điểm giao (VD: Kho chính, Showroom)"
                        value={formData.deliveryPointName}
                        onChange={(e) =>
                          setFormData({ ...formData, deliveryPointName: e.target.value })
                        }
                        className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Người nhận (mặc định lấy theo tên đại lý)"
                        value={formData.receiverName}
                        onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                        className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              </form>

              {/* Modal Footer (Cố định ở đáy popup) */}
              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/60">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  form="create-customer-form"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang lưu & Đồng bộ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lưu đại lý & Đồng bộ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── MODAL QUẢN LÝ ĐIỂM GIAO HÀNG CỦA ĐẠI LÝ (SN-31 & SN-32) ── */}
      {selectedCustomerForDelivery && isDeliveryModalOpen && (
        <DeliveryPointModal
          open={isDeliveryModalOpen}
          customer={selectedCustomerForDelivery}
          onClose={() => {
            setIsDeliveryModalOpen(false);
            setSelectedCustomerForDelivery(null);
          }}
          onUpdated={handleDeliveryPointsUpdated}
        />
      )}

      {/* ── MODAL KHÓA / MỞ KHÓA GIAO DỊCH ĐẠI LÝ (SN-36) ── */}
      <LockAgencyModal
        open={isLockModalOpen}
        mode={lockModalMode}
        customer={lockModalCustomer}
        onClose={() => {
          if (!isLockSubmitting) {
            setIsLockModalOpen(false);
            setLockModalCustomer(null);
          }
        }}
        onConfirmLock={handleConfirmLock}
        onConfirmUnlock={handleConfirmUnlock}
        loading={isLockSubmitting}
      />
    </div>
  );
};
