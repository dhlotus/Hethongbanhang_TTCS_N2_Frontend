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
  Trash2,
  Tag,
  Pencil,
  ChevronDown,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import { LockAgencyModal } from '../components/lock-agency-modal';
import { UpdateLimitModal } from '../components/credit-limit/update-limit-modal';
import { Pagination } from '../components/pagination';
import { customerService, getStoredCustomers } from '../services/customer.service';
import type { Customer, CreateCustomerPayload, DeliveryPoint } from '../types/customer.types';
import type { UpdateCreditLimitPayload } from '../types/credit-limit.type';
import { Role } from '../types/auth';
import { tokenStorage } from '../utils/token-storage';

// Danh sách nhân viên kinh doanh phụ trách chuẩn (SN-30 & SN-35)
const SALES_REPS = [
  { id: '', name: '-- Chọn nhân viên phụ trách --', shortName: 'Tất cả người phụ trách' },
  { id: 'usr-sales-002', name: 'Trần Văn Nam (Kinh doanh Miền Bắc)', shortName: 'Trần Văn Nam' },
  { id: 'usr-sale-01', name: 'Trần Văn Long (Kinh doanh Miền Nam)', shortName: 'Trần Văn Long' },
  { id: 'usr-sale-02', name: 'Nguyễn Thị Hằng (Kinh doanh Miền Nam)', shortName: 'Nguyễn Thị Hằng' },
  { id: 'usr-sale-03', name: 'Phạm Minh Tuấn (Kinh doanh Miền Bắc)', shortName: 'Phạm Minh Tuấn' },
];

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
  const initialSalesRep = searchParams.get('salesRepId') || searchParams.get('rep') || 'ALL';
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
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>(initialSalesRep);

  // Phân trang danh sách đại lý (10 - 20 - 50 dòng/trang) - Server-side
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Thống kê KPI toàn hệ thống (không phụ thuộc phân trang từng trang)
  const [activeCount, setActiveCount] = useState<number>(0);
  const [totalCreditLimit, setTotalCreditLimit] = useState<number>(0);
  const [totalCurrentDebt, setTotalCurrentDebt] = useState<number>(0);

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

  // Modal Sửa hạn mức công nợ (SN-34)
  const [isCreditLimitModalOpen, setIsCreditLimitModalOpen] = useState<boolean>(false);
  const [selectedCustomerForCreditLimit, setSelectedCustomerForCreditLimit] = useState<Customer | null>(null);
  const [isCreditLimitSubmitting, setIsCreditLimitSubmitting] = useState<boolean>(false);

  // Modal xác nhận Xóa / Ngừng giao dịch đại lý (SN-30 AC4)
  const [deleteModalCustomer, setDeleteModalCustomer] = useState<Customer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Đóng dropdown thao tác khi click ra ngoài hoặc nhấn phím Escape
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.customer-action-dropdown-container')) {
        setOpenActionMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleDocClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Modal thêm đại lý mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formBannerError, setFormBannerError] = useState<string | null>(null);
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
    salesRepId: '',
  });

  const handleOpenCreateModal = () => {
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
      salesRepId: '',
    });
    setFormErrors({});
    setFormBannerError(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (submitting) return;
    setIsCreateModalOpen(false);
    setFormErrors({});
    setFormBannerError(null);
  };

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
          handleCloseCreateModal();
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
      salesRepId?: string;
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

          // Người phụ trách
          const targetSalesRep =
            updates.salesRepId !== undefined ? updates.salesRepId : selectedSalesRep;
          if (targetSalesRep && targetSalesRep !== 'ALL') {
            next.set('rep', targetSalesRep);
          } else {
            next.delete('rep');
            next.delete('salesRepId');
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
            next.has('rep') ||
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
    [setSearchParams, selectedRegion, selectedGroup, selectedStatus, selectedSalesRep, searchTerm, currentPage]
  );

  // Ref theo dõi request mới nhất để tránh Race Condition khi thao tác lọc hoặc reload nhanh
  const activeRequestRef = useRef<number>(0);
  const isInternalFilterChangeRef = useRef<boolean>(false);

  // Tải danh sách đại lý từ Server-side API theo đầy đủ bộ lọc (SN-37 & Server-Side Pagination)
  const loadCustomers = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      search?: string;
      region?: string;
      customerGroup?: string;
      status?: string;
      salesRepId?: string;
    }) => {
      const currentRequestId = ++activeRequestRef.current;
      try {
        setLoading(true);
        const targetPage = params?.page !== undefined ? params.page : currentPage;
        const targetLimit = params?.limit !== undefined ? params.limit : pageSize;
        const targetSearch = params?.search !== undefined ? params.search : searchTerm;
        const targetRegion = params?.region !== undefined ? params.region : selectedRegion;
        const targetGroup =
          params?.customerGroup !== undefined ? params.customerGroup : selectedGroup;
        const targetStatus = params?.status !== undefined ? params.status : selectedStatus;
        const targetSalesRep =
          params?.salesRepId !== undefined ? params.salesRepId : selectedSalesRep;

        const res = await customerService.getCustomers({
          page: targetPage,
          limit: targetLimit,
          search: targetSearch.trim() || undefined,
          region: targetRegion !== 'ALL' ? targetRegion : undefined,
          customerGroup: targetGroup !== 'ALL' ? targetGroup : undefined,
          status: targetStatus !== 'ALL' ? targetStatus : undefined,
          salesRepId: targetSalesRep !== 'ALL' ? targetSalesRep : undefined,
        });

        // Bỏ qua kết quả cũ nếu đã có request lọc mới hơn được kích hoạt
        if (currentRequestId !== activeRequestRef.current) {
          return;
        }

        const dataList = res.data || [];
        setCustomers(dataList);
        setTotalItems(typeof res.total === 'number' ? res.total : dataList.length);
        setTotalPages(res.totalPages || 1);

        // Cập nhật thống kê KPI toàn diện (không bị phụ thuộc vào số dòng của 1 trang)
        if (typeof res.activeCount === 'number') {
          setActiveCount(res.activeCount);
        } else {
          const stored = getStoredCustomers();
          setActiveCount(stored.filter((c) => c.status === 'ACTIVE').length);
        }

        if (typeof res.totalCreditLimit === 'number') {
          setTotalCreditLimit(res.totalCreditLimit);
        } else {
          const stored = getStoredCustomers();
          setTotalCreditLimit(stored.reduce((sum, c) => sum + (c.creditLimit || 0), 0));
        }

        if (typeof res.totalCurrentDebt === 'number') {
          setTotalCurrentDebt(res.totalCurrentDebt);
        } else {
          const stored = getStoredCustomers();
          setTotalCurrentDebt(stored.reduce((sum, c) => sum + (c.currentDebt || 0), 0));
        }
      } catch {
        if (currentRequestId === activeRequestRef.current) {
          showToast('error', 'Lỗi tải dữ liệu', 'Không thể nạp danh sách đại lý từ hệ thống.');
        }
      } finally {
        if (currentRequestId === activeRequestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentPage, pageSize, searchTerm, selectedRegion, selectedGroup, selectedStatus, selectedSalesRep]
  );

  const handleRegionChange = (newRegion: string) => {
    isInternalFilterChangeRef.current = true;
    setSelectedRegion(newRegion);
    setCurrentPage(1);
    updateUrlParams({ region: newRegion, page: 1 });
    void loadCustomers({ region: newRegion, page: 1 });
  };

  const handleGroupChange = (newGroup: string) => {
    isInternalFilterChangeRef.current = true;
    setSelectedGroup(newGroup);
    setCurrentPage(1);
    updateUrlParams({ group: newGroup, page: 1 });
    void loadCustomers({ customerGroup: newGroup, page: 1 });
  };

  const handleStatusChange = (newStatus: string) => {
    isInternalFilterChangeRef.current = true;
    setSelectedStatus(newStatus);
    setCurrentPage(1);
    updateUrlParams({ status: newStatus, page: 1 });
    void loadCustomers({ status: newStatus, page: 1 });
  };

  const handleSalesRepChange = (newRep: string) => {
    isInternalFilterChangeRef.current = true;
    setSelectedSalesRep(newRep);
    setCurrentPage(1);
    updateUrlParams({ salesRepId: newRep, page: 1 });
    void loadCustomers({ salesRepId: newRep, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    isInternalFilterChangeRef.current = true;
    setCurrentPage(newPage);
    updateUrlParams({ page: newPage });
    void loadCustomers({ page: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    isInternalFilterChangeRef.current = true;
    setPageSize(newSize);
    setCurrentPage(1);
    updateUrlParams({ page: 1 });
    void loadCustomers({ limit: newSize, page: 1 });
  };

  const handleResetFilters = () => {
    isInternalFilterChangeRef.current = true;
    setSearchInput('');
    setSearchTerm('');
    setSelectedGroup('ALL');
    setSelectedStatus('ALL');
    setSelectedRegion('ALL');
    setSelectedSalesRep('ALL');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
    void loadCustomers({
      page: 1,
      search: '',
      region: 'ALL',
      customerGroup: 'ALL',
      status: 'ALL',
      salesRepId: 'ALL',
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
    const urlSalesRep = searchParams.get('rep') || searchParams.get('salesRepId') || 'ALL';
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
    if (urlSalesRep !== selectedSalesRep) {
      setSelectedSalesRep(urlSalesRep);
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
      if (isInternalFilterChangeRef.current) {
        isInternalFilterChangeRef.current = false;
        return;
      }
      void loadCustomers({
        region: urlRegion,
        customerGroup: urlGroup,
        status: urlStatus,
        salesRepId: urlSalesRep,
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
      salesRepId: initialSalesRep !== 'ALL' ? initialSalesRep : undefined,
      page: initialPage,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lắng nghe sự kiện đồng bộ từ Tab khác (qua storage event của browser)
  useEffect(() => {
    const handleSync = () => {
      void loadCustomers();
    };

    window.addEventListener('storage', handleSync);

    return () => {
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

  // Thống kê nhanh KPI toàn bộ hệ thống đại lý (không bị phụ thuộc vào phân trang từng trang)
  const stats = useMemo(() => {
    return {
      total: totalItems,
      active: activeCount,
      totalCredit: totalCreditLimit,
      totalDebt: totalCurrentDebt,
    };
  }, [totalItems, activeCount, totalCreditLimit, totalCurrentDebt]);

  // Kiểm tra có bất kỳ tiêu chí lọc hoặc tìm kiếm nào đang kích hoạt
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.trim() !== '' ||
      selectedRegion !== 'ALL' ||
      selectedGroup !== 'ALL' ||
      selectedStatus !== 'ALL' ||
      selectedSalesRep !== 'ALL'
    );
  }, [searchTerm, selectedRegion, selectedGroup, selectedStatus, selectedSalesRep]);

  // Lấy thông tin bảng giá áp dụng tương ứng với nhóm khách hàng (SN-30 AC3)
  const getPriceListInfo = (group: string) => {
    switch (group) {
      case 'AGENT_LEVEL_1':
        return {
          title: 'Bảng giá Đại lý Cấp 1',
          desc: 'Áp dụng chính sách giá & chiết khấu đại lý Cấp 1 cao nhất',
          color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        };
      case 'AGENT_LEVEL_2':
        return {
          title: 'Bảng giá Đại lý Cấp 2',
          desc: 'Áp dụng bảng giá đại lý phân phối Cấp 2',
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        };
      case 'WHOLESALE':
        return {
          title: 'Bảng giá Bán buôn',
          desc: 'Áp dụng bảng giá sỉ & bán buôn số lượng lớn',
          color: 'text-blue-700 bg-blue-50 border-blue-200',
        };
      case 'RETAIL':
        return {
          title: 'Bảng giá Bán lẻ',
          desc: 'Áp dụng bảng giá bán lẻ tiêu chuẩn',
          color: 'text-amber-700 bg-amber-50 border-amber-200',
        };
      default:
        return {
          title: 'Bảng giá Tiêu chuẩn',
          desc: 'Áp dụng bảng giá mặc định theo hệ thống',
          color: 'text-slate-700 bg-slate-50 border-slate-200',
        };
    }
  };

  // Hàm cảnh báo thông minh cho số điện thoại:
  // - Khi đang nhập: CHỈ cảnh báo khi nhập sai (có chữ, không bắt đầu bằng 0, hoặc nhập thừa > 10 số). Chưa đủ số thì KHÔNG cảnh báo.
  // - Khi bấm Lưu (isSubmitting = true): Nếu trống hoặc thiếu số mới hiển thị cảnh báo.
  const validatePhoneInput = (val: string, isSubmitting = false): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return isSubmitting ? 'Vui lòng nhập số điện thoại liên hệ của đại lý.' : null;
    }

    // Phát hiện người dùng nhập chữ cái hoặc ký tự đặc biệt
    if (/[^\d]/.test(trimmed)) {
      return 'Số điện thoại không được nhập chữ cái hoặc ký tự đặc biệt, chỉ bao gồm các chữ số.';
    }

    // Kiểm tra số bắt đầu bằng 0
    if (!trimmed.startsWith('0')) {
      return 'Số điện thoại phải bắt đầu bằng số 0 (ví dụ: 0988776655).';
    }

    // Kiểm tra nhập thừa (> 10 số) -> cảnh báo ngay cả khi đang gõ
    if (trimmed.length > 10) {
      return `Số điện thoại chỉ được gồm đúng 10 chữ số (bạn đang nhập thừa ${trimmed.length - 10} số).`;
    }

    // Kiểm tra nhập thiếu (< 10 số) -> CHỈ cảnh báo khi bấm Lưu
    if (isSubmitting && trimmed.length < 10) {
      return `Số điện thoại phải gồm đúng 10 chữ số (bạn mới nhập ${trimmed.length}/10 số - còn thiếu ${10 - trimmed.length} số).`;
    }

    return null;
  };

  // Hàm cảnh báo thông minh cho mã số thuế (bắt buộc đúng 12 số):
  // - Khi đang nhập: CHỈ cảnh báo khi nhập sai (có chữ) hoặc nhập thừa (> 12 số). Chưa đủ số hoặc chưa nhập thì KHÔNG cảnh báo.
  // - Khi bấm Lưu (isSubmitting = true): Nếu trống hoặc thiếu số mới hiển thị cảnh báo.
  const validateTaxCodeInput = (val: string, isSubmitting = false): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return isSubmitting ? 'Vui lòng nhập mã số thuế của đại lý (bắt buộc gồm đúng 12 chữ số).' : null;
    }

    // Phát hiện người dùng nhập chữ cái hoặc ký tự đặc biệt
    if (/[^\d]/.test(trimmed)) {
      return 'Mã số thuế không được nhập chữ cái hoặc ký tự đặc biệt, chỉ bao gồm các chữ số.';
    }

    // Kiểm tra nhập thừa (> 12 số) -> cảnh báo ngay cả khi đang gõ
    if (trimmed.length > 12) {
      return `Mã số thuế bắt buộc gồm đúng 12 chữ số (bạn đang nhập thừa ${trimmed.length - 12} số).`;
    }

    // Kiểm tra nhập thiếu (< 12 số) -> CHỈ cảnh báo khi bấm Lưu
    if (isSubmitting && trimmed.length < 12) {
      return `Mã số thuế bắt buộc gồm đúng 12 chữ số (bạn mới nhập ${trimmed.length}/12 số - còn thiếu ${12 - trimmed.length} số).`;
    }

    return null;
  };

  // Xử lý tạo mới đại lý & đồng bộ ngay lập tức (SN-30)
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    // 1. Tên đại lý / Doanh nghiệp
    const cleanName = (formData.name || '').trim();
    if (!cleanName) {
      errors.name = 'Vui lòng nhập tên đại lý hoặc tên doanh nghiệp.';
    }

    // 2. Mã đại lý: Mã tự động sinh bởi hệ thống, không yêu cầu người dùng nhập

    // 3. Mã số thuế: Bắt buộc đúng 12 số (khi lưu kiểm tra đầy đủ)
    const cleanTaxCode = (formData.taxCode || '').trim();
    const taxErr = validateTaxCodeInput(cleanTaxCode, true);
    if (taxErr) {
      errors.taxCode = taxErr;
    }

    // 4. Số điện thoại liên hệ: Bắt đầu bằng 0, đúng 10 số (khi lưu kiểm tra đầy đủ)
    const cleanPhone = (formData.phone || '').trim();
    const phoneErr = validatePhoneInput(cleanPhone, true);
    if (phoneErr) {
      errors.phone = phoneErr;
    }

    // 5. Email liên hệ: Bắt buộc để tự động cấp tài khoản Đại lý B2B
    const cleanEmail = (formData.email || '').trim();
    if (!cleanEmail) {
      errors.email = 'Vui lòng nhập email liên hệ để hệ thống kích hoạt tài khoản đăng nhập Đại lý B2B.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Email liên hệ không đúng định dạng (ví dụ: daily@gmail.com).';
    }

    // 6. Địa chỉ trụ sở
    const cleanAddress = (formData.address || '').trim();
    if (!cleanAddress) {
      errors.address = 'Vui lòng nhập địa chỉ trụ sở / kinh doanh của đại lý.';
    }

    // Nếu có lỗi nhập liệu: hiển thị trực tiếp trên modal, KHÔNG bắn toast ra ngoài
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormBannerError('Vui lòng kiểm tra và hoàn thiện các trường thông tin chưa hợp lệ bên dưới.');
      return;
    }

    setFormErrors({});
    setFormBannerError(null);

    try {
      setSubmitting(true);
      const newCustomer = await customerService.createCustomer({
        name: formData.name.trim(),
        code: formData.code?.trim() || undefined,
        taxCode: cleanTaxCode,
        phone: cleanPhone,
        email: cleanEmail || undefined,
        address: formData.address.trim(),
        region: formData.region || 'Miền Nam',
        customerGroup: formData.customerGroup || 'AGENT_LEVEL_2',
        creditLimit: Number(formData.creditLimit) || 50000000,
        maxDebtDays: Number(formData.maxDebtDays) || 30,
        salesRepId: formData.salesRepId || undefined,
        deliveryPointName: formData.deliveryPointName?.trim() || undefined,
        receiverName: formData.receiverName?.trim() || undefined,
      });

      showToast(
        'success',
        'Thêm đại lý & Kích hoạt tài khoản B2B thành công',
        `Đại lý "${newCustomer.name}" (${newCustomer.code}) đã được tạo. Tài khoản đăng nhập: ${newCustomer.email} (Mật khẩu mặc định: 123456).`
      );

      // Đóng modal và reset form
      handleCloseCreateModal();

      // Tải lại danh sách từ server ở trang 1 để cập nhật dữ liệu đại lý mới
      void loadCustomers({ page: 1 });
    } catch (err: unknown) {
      const respData = (err as any)?.response?.data;
      let errMsg = 'Không thể tạo đại lý mới. Vui lòng kiểm tra lại thông tin.';
      if (respData) {
        if (Array.isArray(respData.message)) {
          errMsg = respData.message.join('; ');
        } else if (typeof respData.message === 'string') {
          errMsg = respData.message;
        } else if (typeof respData.error === 'string') {
          errMsg = respData.error;
        }
      } else if (err instanceof Error) {
        errMsg = err.message;
      }

      // Gắn lỗi chi tiết từ server vào trường tương ứng trên modal
      const newErrMap: Record<string, string> = {};
      const lower = errMsg.toLowerCase();
      if (lower.includes('mã đại lý') || lower.includes('code')) newErrMap.code = errMsg;
      if (lower.includes('mã số thuế') || lower.includes('tax')) newErrMap.taxCode = errMsg;
      if (lower.includes('điện thoại') || lower.includes('phone')) newErrMap.phone = errMsg;
      if (lower.includes('email')) newErrMap.email = errMsg;

      setFormErrors(newErrMap);
      setFormBannerError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal xác nhận xóa đại lý (SN-30 AC4)
  const handleOpenDeleteModal = (customer: Customer) => {
    setDeleteModalCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  // Xác nhận xóa đại lý (chỉ xóa được nếu chưa phát sinh giao dịch) (SN-30 AC4)
  const handleConfirmDelete = async () => {
    if (!deleteModalCustomer) return;
    try {
      setIsDeleting(true);
      await customerService.deleteCustomer(deleteModalCustomer.id);
      showToast(
        'success',
        'Xóa đại lý & Tài khoản B2B thành công',
        `Đã xóa vĩnh viễn hồ sơ đại lý "${deleteModalCustomer.name}" (${deleteModalCustomer.code}) và tài khoản đăng nhập B2B liên kết khỏi hệ thống.`
      );
      setIsDeleteModalOpen(false);
      setDeleteModalCustomer(null);
      void loadCustomers();
    } catch (err: unknown) {
      const errMsg =
        err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.message
          ? (err as any).response.data.message
          : err instanceof Error
          ? err.message
          : 'Không thể xóa đại lý.';
      showToast('error', 'Chặn xóa đại lý', errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Chuyển sang Ngừng giao dịch (INACTIVE) khi đại lý đã phát sinh giao dịch (SN-30 AC4)
  const handleConfirmDeactivate = async () => {
    if (!deleteModalCustomer) return;
    try {
      setIsDeleting(true);
      const updated = await customerService.deactivateCustomer(deleteModalCustomer.id);
      showToast(
        'success',
        'Đã ngừng giao dịch',
        `Đại lý "${updated.name}" đã được chuyển sang trạng thái Ngừng giao dịch (INACTIVE).`
      );
      setIsDeleteModalOpen(false);
      setDeleteModalCustomer(null);
      void loadCustomers();
    } catch (err: unknown) {
      showToast(
        'error',
        'Lỗi cập nhật',
        err instanceof Error ? err.message : 'Không thể ngừng giao dịch đại lý.'
      );
    } finally {
      setIsDeleting(false);
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

  // Mở modal sửa hạn mức công nợ đại lý (SN-34)
  const handleOpenCreditLimitModal = (customer: Customer) => {
    const currentUser = tokenStorage.getUser();
    const rawRoles: string[] = Array.isArray(currentUser?.roles)
      ? currentUser.roles
      : currentUser?.role
      ? [currentUser.role]
      : [];
    const userRoles = rawRoles.map((r) => r.toUpperCase());

    const canEditCreditLimit =
      userRoles.length === 0 ||
      userRoles.some((r) =>
        [
          Role.ACCOUNTANT,
          Role.ACCOUNTANT_DEBT,
          Role.SALES_MANAGER,
          Role.BUSINESS_MANAGER,
          Role.ADMIN,
        ].includes(r as Role) ||
        ['ACCOUNTANT', 'ACCOUNTANT_DEBT', 'SALES_MANAGER', 'BUSINESS_MANAGER', 'ADMIN'].includes(r)
      );

    if (!canEditCreditLimit) {
      showToast(
        'error',
        'Từ chối truy cập',
        'Chỉ Kế toán công nợ (ACCOUNTANT) và Quản lý kinh doanh (SALES_MANAGER) mới có quyền sửa hạn mức công nợ.'
      );
      return;
    }

    setSelectedCustomerForCreditLimit(customer);
    setIsCreditLimitModalOpen(true);
  };

  // Xác nhận cập nhật hạn mức công nợ (SN-34)
  const handleSubmitCreditLimit = async (
    agencyId: string,
    payload: UpdateCreditLimitPayload
  ) => {
    try {
      setIsCreditLimitSubmitting(true);
      await customerService.updateCreditLimit(agencyId, payload);
      showToast(
        'success',
        'Cập nhật hạn mức thành công',
        `Đã cập nhật hạn mức công nợ cho đại lý "${selectedCustomerForCreditLimit?.name || agencyId}" thành ${payload.creditLimit.toLocaleString('vi-VN')} đ (Thời hạn: ${payload.maxDebtDays} ngày).`
      );
      setIsCreditLimitModalOpen(false);
      setSelectedCustomerForCreditLimit(null);
      await loadCustomers();
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Hàng 1: Ô tìm kiếm thông minh + Các nút hành động */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Ô input tìm kiếm & nút reset bộ lọc */}
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo tên đại lý, mã hoặc số điện thoại..."
                className="w-full pl-10 pr-9 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-slate-50/60 hover:bg-white focus:bg-white transition-all placeholder-slate-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                    setCurrentPage(1);
                    updateUrlParams({ search: '', page: 1 });
                    void loadCustomers({ search: '', page: 1 });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                  title="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Nút reset bộ lọc khi có điều kiện lọc đang kích hoạt */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Đặt lại toàn bộ bộ lọc về mặc định"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          {/* 2 nút hành động: Làm mới & Thêm đại lý mới */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Đồng bộ danh sách từ máy chủ"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`}
              />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Thêm đại lý mới</span>
            </button>
          </div>
        </div>

        {/* Hàng 2: Grid 4 dropdown bộ lọc chia đều cân xứng, thẳng hàng tuyệt đối */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Bộ lọc:</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
            {/* 1. Khu vực */}
            <select
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              aria-label="Lọc theo khu vực"
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[var(--color-primary)] cursor-pointer transition-all truncate shadow-2xs"
            >
              <option value="ALL">Tất cả khu vực</option>
              <option value="Miền Nam">Miền Nam</option>
              <option value="Miền Trung">Miền Trung</option>
              <option value="Miền Bắc">Miền Bắc</option>
            </select>

            {/* 2. Phân nhóm */}
            <select
              value={selectedGroup}
              onChange={(e) => handleGroupChange(e.target.value)}
              aria-label="Lọc theo nhóm đại lý"
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[var(--color-primary)] cursor-pointer transition-all truncate shadow-2xs"
            >
              <option value="ALL">Tất cả phân nhóm</option>
              <option value="AGENT_LEVEL_1">Đại lý Cấp 1</option>
              <option value="AGENT_LEVEL_2">Đại lý Cấp 2</option>
              <option value="WHOLESALE">Bán buôn</option>
              <option value="RETAIL">Bán lẻ</option>
            </select>

            {/* 3. Người phụ trách */}
            <select
              value={selectedSalesRep}
              onChange={(e) => handleSalesRepChange(e.target.value)}
              aria-label="Lọc theo người phụ trách"
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[var(--color-primary)] cursor-pointer transition-all truncate shadow-2xs"
            >
              <option value="ALL">Tất cả người phụ trách</option>
              {SALES_REPS.filter((rep) => rep.id).map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.shortName || rep.name}
                </option>
              ))}
              <option value="UNASSIGNED">Chưa phân công</option>
            </select>

            {/* 4. Trạng thái */}
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              aria-label="Lọc theo trạng thái hoạt động"
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[var(--color-primary)] cursor-pointer transition-all truncate shadow-2xs"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Tạm khóa giao dịch</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
          </div>
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
            <div className="overflow-x-auto min-h-[360px]">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead className="bg-slate-50/70 text-slate-500 text-xs uppercase font-semibold border-b border-slate-100 tracking-wide">
                  <tr>
                    <th className="px-4 py-3.5">Mã & Tên Đại Lý</th>
                    <th className="px-4 py-3.5">Liên Hệ</th>
                    <th className="px-4 py-3.5">Phân Nhóm & Phụ Trách</th>
                    <th className="px-4 py-3.5">Hạn Mức & Dư Nợ</th>
                    <th className="px-4 py-3.5">Điểm Giao Hàng</th>
                    <th className="px-4 py-3.5">Trạng Thái</th>
                    <th className="px-4 py-3.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {customers.map((customer, idx) => {
                  const isDropUp =
                    idx >= Math.max(1, customers.length - 2) ||
                    (customers.length > 3 && idx >= Math.floor(customers.length / 2));

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

                      {/* Cột 4: Hạn mức & Công nợ thông minh */}
                      <td className="px-4 py-3.5 min-w-[200px]">
                        {customer.creditLimit > 0 ? (
                          (() => {
                            const debt = customer.currentDebt || 0;
                            const limit = customer.creditLimit;
                            const rawPct = Math.round((debt / limit) * 100);
                            const isOverLimit = debt > limit;
                            const isCritical = rawPct >= 90;
                            const isWarning = rawPct >= 70 && rawPct < 90;
                            const available = Math.max(0, limit - debt);

                            // Phân cấp màu sắc theo 3 ngưỡng an toàn chuẩn UI/UX
                            const barColor = isOverLimit || isCritical
                              ? 'bg-rose-500'
                              : isWarning
                              ? 'bg-amber-500'
                              : 'bg-emerald-500';

                            const textColor = isOverLimit || isCritical
                              ? 'text-rose-600 font-bold'
                              : isWarning
                              ? 'text-amber-700 font-semibold'
                              : 'text-slate-800 font-semibold';

                            const badgeStyle = isOverLimit
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : isCritical
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : isWarning
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                            return (
                              <div className="space-y-1.5">
                                {/* Hàng 1: Dư nợ hiện tại & Huy hiệu % sử dụng */}
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-[11px] text-slate-400 font-medium">Nợ:</span>
                                    <span className={`text-xs sm:text-sm ${textColor}`}>
                                      {formatVnd(debt)}
                                    </span>
                                  </div>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${badgeStyle} shrink-0`}
                                  >
                                    {isOverLimit ? `Vượt trần (${rawPct}%)` : `${rawPct}%`}
                                  </span>
                                </div>

                                {/* Hàng 2: Thanh tiến trình hạn mức trực quan */}
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-2xs">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                    style={{ width: `${Math.min(100, Math.max(0, rawPct))}%` }}
                                  />
                                </div>

                                {/* Hàng 3: Hạn mức tối đa & Số dư nợ còn khả dụng */}
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span title={`Hạn mức: ${formatVnd(limit)}`}>
                                    HM: <strong className="text-slate-600 font-medium">{formatVnd(limit)}</strong>
                                  </span>
                                  <span>
                                    {isOverLimit ? (
                                      <span className="text-rose-600 font-semibold">
                                        Quá: {formatVnd(debt - limit)}
                                      </span>
                                    ) : (
                                      <span>
                                        Còn: <strong className="text-emerald-700 font-medium">{formatVnd(available)}</strong>
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="py-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200/80">
                              Chưa cấp hạn mức
                            </span>
                            {customer.currentDebt > 0 && (
                              <div className="text-xs text-rose-600 font-bold mt-1">
                                Nợ: {formatVnd(customer.currentDebt)}
                              </div>
                            )}
                          </div>
                        )}
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

                      {/* Cột 7: Thao tác (Gom thành 1 nút dropdown) */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="relative inline-block text-left customer-action-dropdown-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === customer.id ? null : customer.id);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none ${
                              openActionMenuId === customer.id
                                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-300'
                            }`}
                            title="Thao tác"
                          >
                            <span>Thao tác</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                                openActionMenuId === customer.id ? 'rotate-180 text-blue-600' : ''
                              }`}
                            />
                          </button>

                          {openActionMenuId === customer.id && (
                            <div
                              className={`absolute right-0 ${
                                isDropUp ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'
                              } w-48 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 text-left divide-y divide-slate-100`}
                            >
                              <div className="py-1">
                                {/* 1. Lên đơn hàng B2B */}
                                <button
                                  type="button"
                                  disabled={customer.status === 'LOCKED'}
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    navigate(`/sales/orders?customerId=${customer.id}`);
                                  }}
                                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors ${
                                    customer.status === 'LOCKED'
                                      ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-50/50'
                                      : 'text-blue-600 hover:bg-blue-50 cursor-pointer font-medium'
                                  }`}
                                  title={
                                    customer.status === 'LOCKED'
                                      ? 'Đại lý đang bị khóa giao dịch, không thể lên đơn!'
                                      : 'Tạo đơn hàng B2B cho đại lý này'
                                  }
                                >
                                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                                  <span>Lên đơn hàng mới</span>
                                </button>

                                {/* 2. Sửa hạn mức công nợ */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleOpenCreditLimitModal(customer);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4 text-amber-600" />
                                  <span>Sửa hạn mức</span>
                                </button>

                                {/* 3. Điểm giao hàng */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleOpenDeliveryPoints(customer);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <MapPin className="w-4 h-4 text-indigo-500" />
                                  <span>Điểm giao hàng ({customer.deliveryPoints?.length || 0})</span>
                                </button>
                              </div>

                              <div className="py-1">
                                {/* 4. Khóa / Mở khóa giao dịch */}
                                {customer.status === 'LOCKED' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      handleOpenUnlockModal(customer);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                                  >
                                    <Unlock className="w-4 h-4 text-emerald-600" />
                                    <span>Mở khóa giao dịch</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      handleOpenLockModal(customer);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                                  >
                                    <Lock className="w-4 h-4 text-amber-600" />
                                    <span>Khóa giao dịch</span>
                                  </button>
                                )}

                                {/* 5. Xóa đại lý */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleOpenDeleteModal(customer);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-500" />
                                  <span>Xóa đại lý</span>
                                </button>
                              </div>
                            </div>
                          )}
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
                handleCloseCreateModal();
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
                  onClick={handleCloseCreateModal}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Đóng modal (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form Fields (Cuộn độc lập bên trong) */}
              <form
                id="create-customer-form"
                onSubmit={handleCreateCustomer}
                noValidate
                className="flex-1 overflow-y-auto p-5 space-y-4"
              >
                {/* Thông báo lỗi tổng quan trên Modal */}
                {formBannerError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold block text-rose-900">Thông tin chưa hợp lệ</span>
                      <span className="text-rose-700 leading-relaxed">{formBannerError}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Tên đại lý */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Tên đại lý / Doanh nghiệp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Công ty TNHH Phân Phối Toàn Cầu"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (formErrors.name) {
                          setFormErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.name;
                            return copy;
                          });
                        }
                      }}
                      className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none transition-colors ${
                        formErrors.name
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{formErrors.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Mã đại lý: Tự sinh, khóa không cho nhập, trỏ chuột hình chuột bình thường */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        Mã đại lý
                      </label>
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                        Tự động sinh
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={formData.code ? formData.code : 'Hệ thống tự động cấp mã khi lưu'}
                      placeholder="Hệ thống tự động cấp mã khi lưu"
                      title="Mã đại lý do hệ thống tự động cấp khi tạo mới"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-mono select-none cursor-default focus:outline-none"
                    />
                  </div>

                  {/* Mã số thuế: Bắt buộc 12 số, cảnh báo thông minh khi sai, đúng hoặc chưa nhập không hiện gì */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Mã số thuế <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập mã số thuế 12 chữ số (VD: 010987654321)"
                      value={formData.taxCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, taxCode: val }));
                        const warn = validateTaxCodeInput(val);
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          if (warn) {
                            copy.taxCode = warn;
                          } else {
                            delete copy.taxCode;
                          }
                          return copy;
                        });
                      }}
                      className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none font-mono transition-colors ${
                        formErrors.taxCode
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15'
                      }`}
                    />
                    {formErrors.taxCode && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{formErrors.taxCode}</span>
                      </p>
                    )}
                  </div>

                  {/* Phân nhóm đại lý & Quyết định bảng giá áp dụng (SN-30 AC3) */}
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

                  {/* Nhân viên kinh doanh phụ trách (SN-30 AC1) */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Người phụ trách
                    </label>
                    <select
                      value={formData.salesRepId || ''}
                      onChange={(e) => setFormData({ ...formData, salesRepId: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 bg-white"
                    >
                      {SALES_REPS.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Thông báo bảng giá áp dụng tương ứng nhóm khách hàng (SN-30 AC3) */}
                  <div className="sm:col-span-2 p-2.5 rounded-lg border bg-blue-50/60 border-blue-100 flex items-start gap-2 text-xs">
                    <Tag className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-blue-900">
                        Bảng giá áp dụng:{' '}
                      </span>
                      <span className="font-bold text-blue-700">
                        {getPriceListInfo(formData.customerGroup || 'AGENT_LEVEL_2').title}
                      </span>
                      <span className="text-slate-500 ml-1">
                        — {getPriceListInfo(formData.customerGroup || 'AGENT_LEVEL_2').desc}
                      </span>
                    </div>
                  </div>

                  {/* Số điện thoại */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Số điện thoại liên hệ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="VD: 0988776655"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, phone: val }));
                        const warn = validatePhoneInput(val);
                        setFormErrors((prev) => {
                          const copy = { ...prev };
                          if (warn) {
                            copy.phone = warn;
                          } else {
                            delete copy.phone;
                          }
                          return copy;
                        });
                      }}
                      className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none transition-colors ${
                        formErrors.phone
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15'
                      }`}
                    />
                    {formErrors.phone && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{formErrors.phone}</span>
                      </p>
                    )}
                  </div>

                  {/* Email: Bắt buộc để tự động cấp tài khoản B2B */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        Email liên hệ <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                        Tự động cấp tài khoản B2B
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="VD: daily@gmail.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (formErrors.email) {
                          setFormErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.email;
                            return copy;
                          });
                        }
                      }}
                      className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none transition-colors ${
                        formErrors.email
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15'
                      }`}
                    />
                    {formErrors.email && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{formErrors.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Địa chỉ trụ sở */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Địa chỉ kinh doanh / trụ sở <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 123 Đường Nguyễn Trãi, Phường 2, Quận 5, TP.HCM"
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value });
                        if (formErrors.address) {
                          setFormErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.address;
                            return copy;
                          });
                        }
                      }}
                      className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none transition-colors ${
                        formErrors.address
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                          : 'border-slate-200 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15'
                      }`}
                    />
                    {formErrors.address && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{formErrors.address}</span>
                      </p>
                    )}
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
                  onClick={handleCloseCreateModal}
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

      {/* ── MODAL XÁC NHẬN XÓA / NGỪNG GIAO DỊCH ĐẠI LÝ (SN-30 AC4) ── */}
      {deleteModalCustomer && isDeleteModalOpen &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) {
                setIsDeleteModalOpen(false);
                setDeleteModalCustomer(null);
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      (deleteModalCustomer.currentDebt || 0) > 0
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    {(deleteModalCustomer.currentDebt || 0) > 0 ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {(deleteModalCustomer.currentDebt || 0) > 0
                        ? 'Chặn xóa đại lý đã phát sinh giao dịch'
                        : 'Xác nhận xóa hồ sơ đại lý'}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {deleteModalCustomer.code} • {deleteModalCustomer.name}
                    </p>
                  </div>
                </div>

                {(deleteModalCustomer.currentDebt || 0) > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1.5">
                      <p className="font-semibold">⚠️ Quy định kế toán công nợ (SN-30):</p>
                      <p>
                        Đại lý này đang có dư nợ{' '}
                        <span className="font-bold text-rose-600">
                          {formatVnd(deleteModalCustomer.currentDebt || 0)}
                        </span>{' '}
                        hoặc đã phát sinh giao dịch trong hệ thống.
                      </p>
                      <p>
                        Hệ thống <strong>không cho phép xóa</strong> đại lý đã phát sinh giao dịch để bảo toàn sổ sách kế toán. Bạn có thể chuyển đại lý sang trạng thái <strong>Ngừng giao dịch</strong> (INACTIVE).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p>
                      Bạn có chắc chắn muốn xóa hồ sơ đại lý{' '}
                      <strong className="text-slate-900">{deleteModalCustomer.name}</strong> không?
                    </p>
                    <p className="text-slate-500">
                      Đại lý chưa phát sinh công nợ. Hành động này đồng nghĩa với việc <strong>xóa vĩnh viễn hồ sơ đại lý cùng tài khoản đăng nhập Đại lý B2B liên kết</strong> khỏi hệ thống.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeleteModalCustomer(null);
                    }}
                    disabled={isDeleting}
                    className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>

                  {(deleteModalCustomer.currentDebt || 0) > 0 ? (
                    <button
                      type="button"
                      onClick={handleConfirmDeactivate}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isDeleting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang cập nhật...</span>
                        </>
                      ) : (
                        <span>Chuyển sang Ngừng giao dịch</span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isDeleting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang xóa...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Xác nhận xóa</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── MODAL SỬA HẠN MỨC CÔNG NỢ (SN-34) ── */}
      <UpdateLimitModal
        isOpen={isCreditLimitModalOpen}
        item={selectedCustomerForCreditLimit}
        onClose={() => {
          setIsCreditLimitModalOpen(false);
          setSelectedCustomerForCreditLimit(null);
        }}
        onSubmit={handleSubmitCreditLimit}
        loading={isCreditLimitSubmitting}
      />
    </div>
  );
};
