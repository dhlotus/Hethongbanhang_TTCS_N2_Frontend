import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Edit2,
  AlertCircle,
  X,
  Warehouse,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Shield,
  Info,
  Copy,
  Check,
  UserX,
  AlertTriangle,
  Store,
  Eye,
  FileSpreadsheet,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { UsersTableSkeleton, UsersMobileCardSkeleton } from '../components/skeletons';
import { ExcelImportModal } from '../components/excel-import-modal';
import { showToast } from '../components/toast';
import { usersService } from '../services/users.service';
import type {
  AssignedCustomerItem,
  CreateUserPayload,
  UpdateUserPayload,
  UserManagementItem,
  UserStatusType,
  UserSummaryStats,
} from '../types/user';
import { USER_ROLES } from '../types/auth';
import { getStoredUser } from '../utils/navigation';
import { resolveAvatarUrl } from '../utils/avatar';

// Lọc bỏ vai trò trong ngoặc khỏi tên hiển thị (ví dụ: "Nguyễn Văn Admin (Quản Trị Viên)" -> "Nguyễn Văn Admin")
const formatCleanName = (fullName: string): string => {
  return (fullName || '').replace(/\s*\([^)]*\)/g, '').trim() || fullName || '—';
};

// Nhãn và màu sắc hiển thị cho 7 vai trò chuẩn
const ROLE_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string; ringClass: string }
> = {
  ADMIN: {
    label: 'Quản trị hệ thống',
    bgClass: 'bg-[var(--color-primary-light)]',
    textClass: 'text-[var(--color-primary)]',
    ringClass: 'ring-[var(--color-primary-subtle)]',
  },
  SALES_MANAGER: {
    label: 'Quản lý kinh doanh',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    ringClass: 'ring-blue-700/20',
  },
  SALES_REP: {
    label: 'Nhân viên kinh doanh',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    ringClass: 'ring-sky-700/20',
  },
  WAREHOUSE_MANAGER: {
    label: 'Quản lý kho',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    ringClass: 'ring-amber-700/20',
  },
  WAREHOUSE_KEEPER: {
    label: 'Thủ kho',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    ringClass: 'ring-orange-700/20',
  },
  ACCOUNTANT: {
    label: 'Kế toán công nợ',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    ringClass: 'ring-emerald-700/20',
  },
  CUSTOMER: {
    label: 'Đại lý B2B',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-700',
    ringClass: 'ring-slate-700/20',
  },
};

const WAREHOUSE_OPTIONS = [
  'Kho Tổng Miền Nam - LOHA WH01',
  'Kho Trung Chuyển Miền Bắc - LOHA WH02',
  'Kho Vận Miền Trung - LOHA WH03',
  'Địa bàn TP. Hồ Chí Minh',
  'Địa bàn Hà Nội & Phía Bắc',
  'Địa bàn Miền Tây',
];

const LOCK_REASON_PRESETS = [
  'Tạm đình chỉ công tác để kiểm tra nội bộ',
  'Nghi vấn vi phạm chính sách bảo mật hệ thống',
  'Yêu cầu đình chỉ từ Ban Giám Đốc',
  'Nhân sự đã nghỉ việc / Chấm dứt hợp đồng',
];

/**
 * Bản đồ ánh xạ Role sang URL Query Parameter slug chuẩn
 * Ví dụ: SALES_REP -> sales, ADMIN -> admin
 */
const ROLE_TO_PARAM_MAP: Record<string, string> = {
  ADMIN: 'admin',
  SALES_REP: 'sales',
  SALES_MANAGER: 'sales_manager',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  WAREHOUSE_KEEPER: 'warehouse_keeper',
  ACCOUNTANT: 'accountant',
  CUSTOMER: 'customer',
};

const getRoleParamSlug = (roleKey: string): string => {
  return ROLE_TO_PARAM_MAP[roleKey] || roleKey.toLowerCase();
};

/**
 * Phân tích tham số role từ URL sang mã vai trò chuẩn hệ thống
 */
const parseRoleParam = (param: string | null): string => {
  if (!param) return '';
  const lower = param.toLowerCase().trim();
  if (lower === 'admin') return 'ADMIN';
  if (lower === 'sales' || lower === 'sales_rep' || lower === 'salerep') return 'SALES_REP';
  if (lower === 'sales_manager' || lower === 'salesmanager') return 'SALES_MANAGER';
  if (lower === 'warehouse_manager' || lower === 'warehousemanager') return 'WAREHOUSE_MANAGER';
  if (lower === 'warehouse_keeper' || lower === 'warehousekeeper' || lower === 'warehouse')
    return 'WAREHOUSE_KEEPER';
  if (lower === 'accountant') return 'ACCOUNTANT';
  if (lower === 'customer') return 'CUSTOMER';
  const upper = param.toUpperCase().trim();
  if (ROLE_CONFIG[upper]) return upper;
  return '';
};

/**
 * Bản đồ ánh xạ Trạng thái sang URL slug
 * Ví dụ: ACTIVE -> active, LOCKED -> locked
 */
const getStatusParamSlug = (status: string): string => {
  if (status === 'ACTIVE') return 'active';
  if (status === 'LOCKED') return 'locked';
  return '';
};

const parseStatusParam = (param: string | null): string => {
  if (!param) return '';
  const lower = param.toLowerCase().trim();
  if (lower === 'active') return 'ACTIVE';
  if (lower === 'locked' || lower === 'lock' || lower === 'inactive') return 'LOCKED';
  const upper = param.toUpperCase().trim();
  if (upper === 'ACTIVE' || upper === 'LOCKED') return upper;
  return '';
};

export const UsersPage: React.FC = () => {
  const currentAdmin = getStoredUser();
  const [searchParams, setSearchParams] = useSearchParams();

  // Khôi phục giá trị ban đầu từ URL Query Parameters khi tải lại trang hoặc chia sẻ link
  const initialSearch = (searchParams.get('search') || searchParams.get('q') || '').trim();
  const initialRole = parseRoleParam(searchParams.get('role'));
  const initialStatus = parseStatusParam(searchParams.get('status'));
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  // Danh sách và phân trang (Mặc định 20 dòng / trang theo chuẩn SN-13)
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<UserSummaryStats>({
    total: 0,
    active: 0,
    locked: 0,
    pendingReset: 0,
  });

  // Bộ lọc & Tìm kiếm mượt mà có Debounce (350ms)
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState<string>(initialRole);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  // Cập nhật query parameters an toàn lên URL mà không reload lại toàn bộ trang
  const updateUrlParams = useCallback(
    (updates: {
      role?: string;
      status?: string;
      search?: string;
      page?: number;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          // 1. Vai trò (?role=sales)
          const targetRole = updates.role !== undefined ? updates.role : roleFilter;
          if (targetRole) {
            next.set('role', getRoleParamSlug(targetRole));
          } else {
            next.delete('role');
          }

          // 2. Trạng thái (?status=active|locked)
          const targetStatus = updates.status !== undefined ? updates.status : statusFilter;
          if (targetStatus) {
            next.set('status', getStatusParamSlug(targetStatus));
          } else {
            next.delete('status');
          }

          // 3. Từ khóa tìm kiếm (?search=...)
          const targetSearch = updates.search !== undefined ? updates.search : search;
          const trimmedSearch = (targetSearch || '').trim();
          if (trimmedSearch) {
            next.set('search', trimmedSearch);
            next.delete('q');
          } else {
            next.delete('search');
            next.delete('q');
          }

          // 4. Phân trang (?page=...)
          const targetPage = updates.page !== undefined ? updates.page : page;
          if (targetPage > 1) {
            next.set('page', String(targetPage));
          } else {
            if (prev.has('page')) {
              next.set('page', '1');
            } else {
              next.delete('page');
            }
          }

          return next;
        },
        { replace: true }
      );
    },
    [roleFilter, statusFilter, search, page, setSearchParams]
  );

  const isInitialSearchMount = useRef(true);

  // Debounce tìm kiếm 350ms để không gây giật lag và không spam URL history
  useEffect(() => {
    if (isInitialSearchMount.current) {
      isInitialSearchMount.current = false;
      return;
    }

    const handler = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== search) {
        setSearch(trimmed);
        setPage(1);
        updateUrlParams({ search: trimmed, page: 1 });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchInput, search, updateUrlParams]);

  // Lắng nghe thay đổi của URL search parameters (khi F5, bấm link chia sẻ hoặc Back/Forward trên browser)
  useEffect(() => {
    const urlRole = parseRoleParam(searchParams.get('role'));
    const urlStatus = parseStatusParam(searchParams.get('status'));
    const urlSearch = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

    if (urlRole !== roleFilter) {
      setRoleFilter(urlRole);
    }
    if (urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
    if (urlSearch !== search) {
      setSearch(urlSearch);
      setSearchInput(urlSearch);
    }
    if (urlPage !== page) {
      setPage(urlPage);
    }
  }, [searchParams]);

  // Handlers thay đổi bộ lọc
  const handleRoleChange = (newRole: string) => {
    setRoleFilter(newRole);
    setPage(1);
    updateUrlParams({ role: newRole, page: 1 });
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
    updateUrlParams({ status: newStatus, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams({ page: newPage });
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    updateUrlParams({ page: 1 });
  };

  // Đặt lại toàn bộ bộ lọc nhân sự về trạng thái ban đầu
  const handleResetFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Modal Tạo / Chỉnh sửa & Quản lý Lỗi Validate
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserManagementItem | null>(null);
  const [formData, setFormData] = useState<CreateUserPayload>({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    role: USER_ROLES.SALES_REP,
    roles: [USER_ROLES.SALES_REP],
    assignedWarehouse: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Kiểm tra tài khoản đang chỉnh sửa có phải chính Admin đang đăng nhập hay không
  const isEditingCurrentSelf = Boolean(
    editingUser &&
    currentAdmin &&
    (currentAdmin.id === editingUser.id ||
      currentAdmin.username?.toLowerCase() === editingUser.username.toLowerCase() ||
      currentAdmin.email?.toLowerCase() === editingUser.email.toLowerCase())
  );

  // Thao tác chọn / bỏ chọn nhiều vai trò (Multi-role toggle)
  const handleToggleRole = (roleKey: string) => {
    const currentRoles =
      formData.roles && formData.roles.length > 0
        ? [...formData.roles]
        : formData.role
          ? [formData.role]
          : [];
    const isSelected = currentRoles.includes(roleKey);

    // Chặn tuyệt đối tự thu hồi quyền ADMIN của chính mình
    if (isSelected && isEditingCurrentSelf && roleKey === USER_ROLES.ADMIN) {
      showToast('error', 'Không thể tự thu hồi quyền Quản trị');
      return;
    }

    let updatedRoles: string[];
    if (isSelected) {
      updatedRoles = currentRoles.filter((r) => r !== roleKey);
    } else {
      updatedRoles = [...currentRoles, roleKey];
    }

    setFormData((prev) => ({
      ...prev,
      roles: updatedRoles,
      role: updatedRoles[0] || '',
    }));

    clearFieldError('roles');
    clearFieldError('role');
  };

  // Modal Khóa / Mở khóa
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<UserManagementItem | null>(
    null
  );
  const [targetStatus, setTargetStatus] = useState<UserStatusType>('LOCKED');
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [assignedCustomers, setAssignedCustomers] = useState<AssignedCustomerItem[]>([]);
  const [loadingAssignedCustomers, setLoadingAssignedCustomers] = useState(false);

  // Modal Xem chi tiết nhân sự
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserManagementItem | null>(
    null
  );
  const [detailCustomers, setDetailCustomers] = useState<AssignedCustomerItem[]>([]);
  const [loadingDetailCustomers, setLoadingDetailCustomers] = useState(false);

  // Mở modal xem chi tiết nhân sự
  const handleOpenDetailModal = async (user: UserManagementItem) => {
    setSelectedUserForDetail(user);
    setDetailModalOpen(true);
    setDetailCustomers([]);

    const isSales = user.role === 'SALES_REP' || user.roles?.includes('SALES_REP');
    if (isSales) {
      setLoadingDetailCustomers(true);
      try {
        const res = await usersService.getAssignedCustomers(user.id);
        setDetailCustomers(res.customers || []);
      } catch {
        setDetailCustomers([]);
      } finally {
        setLoadingDetailCustomers(false);
      }
    }
  };

  // Tải thống kê số lượng nhân sự toàn hệ thống (không phụ thuộc phân trang limit/page)
  const fetchSummary = useCallback(async () => {
    try {
      const stats = await usersService.getUserSummary();
      if (stats) {
        setSummary(stats);
      }
    } catch {
      // Endpoint fallback
    }
  }, []);

  // Tải danh sách người dùng từ API thật
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await usersService.getUsers({
        page,
        limit,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });

      setUsers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch {
      showToast('error', 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
    fetchSummary();
  }, [fetchUsers, fetchSummary]);

  // Lắng nghe sự kiện avatar-updated (same-tab) hoặc storage (cross-tab) để tự động làm mới bảng
  useEffect(() => {
    const handleAvatarUpdate = () => {
      fetchUsers();
      fetchSummary();
    };

    window.addEventListener('avatar-updated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);

    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, [fetchUsers, fetchSummary]);

  // Sao chép mã cấp vào clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('success', 'Sao chép mã thành công');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Mở Modal tạo mới
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormErrors({});
    setFormData({
      fullName: '',
      username: '',
      email: '',
      phone: '',
      role: USER_ROLES.SALES_REP,
      roles: [USER_ROLES.SALES_REP],
      assignedWarehouse: '',
      password: '',
    });
    setModalOpen(true);
  };

  // Mở Modal chỉnh sửa
  const handleOpenEditModal = (user: UserManagementItem) => {
    setEditingUser(user);
    setFormErrors({});
    const initialRoles =
      user.roles && user.roles.length > 0 ? (user.roles as string[]) : [user.role as string];

    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      role: (user.role as string) || initialRoles[0],
      roles: initialRoles,
      assignedWarehouse: user.assignedWarehouse || '',
      password: '',
    });
    setModalOpen(true);
  };

  // Hàm validate biểu mẫu phía Client (SN-13 & SN-14)
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Họ và tên
    if (!formData.fullName.trim()) {
      errs.fullName = 'Họ và tên nhân sự không được để trống';
    } else if (formData.fullName.trim().length < 2) {
      errs.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
    }

    // 2. Tên đăng nhập (chỉ kiểm tra khi tạo mới)
    if (!editingUser) {
      if (!formData.username.trim()) {
        errs.username = 'Tên đăng nhập không được để trống';
      } else if (formData.username.trim().length < 3) {
        errs.username = 'Tên đăng nhập phải có ít nhất 3 ký tự';
      } else if (!/^[a-zA-Z0-9_.-]+$/.test(formData.username.trim())) {
        errs.username = 'Tên đăng nhập chỉ chứa chữ cái, số, gạch dưới/ngang, không dấu';
      }
    }

    // 3. Email
    if (!formData.email.trim()) {
      errs.email = 'Email công việc không được để trống';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Định dạng email không hợp lệ (VD: nhanvien@loha.vn)';
    }

    // 4. Số điện thoại (chuẩn Việt Nam: 10 chữ số, đầu số 03, 05, 07, 08, 09 hoặc +84)
    if (formData.phone && formData.phone.trim()) {
      const cleanPhone = formData.phone.trim().replace(/[\s.-]+/g, '');
      const vnPhoneRegex = /^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/;
      if (!vnPhoneRegex.test(cleanPhone)) {
        errs.phone =
          'Số điện thoại không hợp lệ (chuẩn SĐT Việt Nam gồm 10 chữ số, ví dụ: 0912345678)';
      }
    }

    // 5. Đa vai trò hệ thống (SN-14)
    const selectedRoles =
      formData.roles && formData.roles.length > 0
        ? formData.roles
        : formData.role
          ? [formData.role]
          : [];
    if (selectedRoles.length === 0) {
      errs.roles = 'Vui lòng chọn ít nhất 1 vai trò trong 7 vai trò hệ thống';
    }

    // Bảo mật Admin: Không thể tự bỏ vai trò ADMIN của chính mình
    if (isEditingCurrentSelf && editingUser) {
      const hadAdmin = (
        editingUser.roles && editingUser.roles.length > 0 ? editingUser.roles : [editingUser.role]
      ).includes(USER_ROLES.ADMIN);

      if (hadAdmin && !selectedRoles.includes(USER_ROLES.ADMIN)) {
        errs.roles = 'Không thể tự thu hồi quyền Quản trị hệ thống (ADMIN) của chính mình';
      }
    }

    // 6. Ràng buộc cứng Kho (Business Validation - SN-14)
    const requiresWarehouse = selectedRoles.some(
      (r) => r === USER_ROLES.WAREHOUSE_KEEPER || r === USER_ROLES.WAREHOUSE_MANAGER
    );
    if (requiresWarehouse && (!formData.assignedWarehouse || !formData.assignedWarehouse.trim())) {
      errs.assignedWarehouse =
        'Nhân sự thuộc vai trò Kho bắt buộc phải được gắn với ít nhất một kho phụ trách cụ thể';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Gửi form Thêm / Sửa
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Vui lòng kiểm tra lại thông tin');
      return;
    }

    try {
      setSubmitting(true);
      const selectedRoles =
        formData.roles && formData.roles.length > 0 ? formData.roles : [formData.role];

      if (editingUser) {
        // Cập nhật người dùng (Đa vai trò & kho)
        const updatePayload: UpdateUserPayload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone?.trim() || '',
          role: selectedRoles[0],
          roles: selectedRoles,
          assignedWarehouse: formData.assignedWarehouse?.trim() || '',
          password: formData.password ? formData.password.trim() : undefined,
        };

        await usersService.updateUser(editingUser.id, updatePayload);
        showToast('success', 'Cập nhật tài khoản thành công');
      } else {
        // Tạo người dùng mới
        await usersService.createUser({
          ...formData,
          fullName: formData.fullName.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          phone: formData.phone?.trim() || '',
          role: selectedRoles[0],
          roles: selectedRoles,
          assignedWarehouse: formData.assignedWarehouse?.trim() || '',
          password: formData.password ? formData.password.trim() : undefined,
        });

        showToast('success', 'Thêm nhân sự mới thành công');
      }

      setModalOpen(false);
      fetchUsers();
      fetchSummary();
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin người dùng.';

      // Nếu máy chủ báo trùng lặp tên đăng nhập hoặc email, highlight lỗi trực tiếp
      if (typeof serverMsg === 'string') {
        if (serverMsg.includes('Tên đăng nhập')) {
          setFormErrors((prev) => ({
            ...prev,
            username: 'Tên đăng nhập này đã được sử dụng trên hệ thống',
          }));
        }
        if (serverMsg.includes('email') || serverMsg.includes('Email')) {
          setFormErrors((prev) => ({
            ...prev,
            email: 'Địa chỉ email này đã được sử dụng trên hệ thống',
          }));
        }
      }

      showToast('error', typeof serverMsg === 'string' ? serverMsg : 'Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở Modal Khóa / Mở khóa (SN-15)
  const handleOpenStatusModal = (user: UserManagementItem, status: UserStatusType) => {
    setSelectedUserForStatus(user);
    setTargetStatus(status);
    setStatusReason(
      status === 'LOCKED' ? '' : `Mở khóa khôi phục quyền truy cập cho nhân sự ${user.fullName}`
    );
    setAssignedCustomers([]);
    setStatusModalOpen(true);

    if (status === 'LOCKED') {
      setLoadingAssignedCustomers(true);
      usersService
        .getAssignedCustomers(user.id)
        .then((res) => {
          setAssignedCustomers(res.customers || []);
        })
        .catch(() => {
          setAssignedCustomers([]);
        })
        .finally(() => {
          setLoadingAssignedCustomers(false);
        });
    }
  };

  // Gửi form Khóa / Mở khóa (SN-15)
  const handleSubmitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForStatus) return;

    if (targetStatus === 'LOCKED' && !statusReason.trim()) {
      showToast('error', 'Vui lòng nhập lý do khóa tài khoản');
      return;
    }

    try {
      setStatusSubmitting(true);
      await usersService.updateUserStatus(selectedUserForStatus.id, {
        status: targetStatus,
        reason: statusReason.trim(),
      });

      if (targetStatus === 'LOCKED') {
        showToast('success', 'Khóa tài khoản thành công');
      } else {
        showToast('success', 'Mở tài khoản thành công');
      }

      setStatusModalOpen(false);
      fetchUsers();
      fetchSummary();
    } catch {
      showToast('error', 'Không thể cập nhật trạng thái');
    } finally {
      setStatusSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. FLOATING TOAST NOTIFICATION (Teleport to document.body, luôn nổi trên Header & Modal) */}
      {/* ========================================================================= */}
      {/* 2. STATS CARDS: THỐNG KÊ NHANH TỔNG QUAN TOÀN HỆ THỐNG                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-5 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Tổng nhân sự</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {summary.total.toLocaleString('vi-VN')}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Đang hoạt động</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-700">
            {summary.active.toLocaleString('vi-VN')}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Đang bị khóa</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-50 text-rose-600">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-rose-600">
            {summary.locked.toLocaleString('vi-VN')}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TOOLBAR: TÌM KIẾM, BỘ LỌC & THAO TÁC HỆ THỐNG                          */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between rounded-xl bg-white p-4 border border-slate-100 shadow-2xs">
        {/* Nhóm tìm kiếm và bộ lọc bên trái */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center flex-1">
          {/* Ô tìm kiếm có debounce mượt mà */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo họ tên, username, email, số điện thoại..."
              className="w-full rounded-md border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setPage(1);
                  updateUrlParams({ search: '', page: 1 });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Bộ lọc vai trò */}
          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-medium text-slate-700 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
          >
            <option value="">Tất cả vai trò (7)</option>
            {Object.keys(ROLE_CONFIG).map((roleKey) => (
              <option key={roleKey} value={roleKey}>
                {ROLE_CONFIG[roleKey].label}
              </option>
            ))}
          </select>

          {/* Bộ lọc trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-medium text-slate-700 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đang bị khóa</option>
          </select>
        </div>

        {/* Nhóm nút hành động bên phải */}
        <div className="flex items-center gap-2 shrink-0 justify-end">
          <button
            type="button"
            onClick={() => {
              fetchUsers();
              fetchSummary();
            }}
            disabled={loading}
            title="Làm mới danh sách"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {/* Nút Import hàng loạt từ Excel (SN-147) */}
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            title="Import nhân sự từ file Excel (.xlsx)"
            className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Import Excel</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-purple-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            <span>Thêm nhân sự mới</span>
          </button>
        </div>
      </div>

      {/* Filter Badges: Hiển thị trực quan các bộ lọc URL đang kích hoạt */}
      {(roleFilter || statusFilter || search) && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs">
          <span className="inline-flex items-center gap-1 text-slate-400 font-medium mr-1 text-[11px]">
            <Tag className="w-3 h-3 text-slate-400" />
            <span>Đang lọc:</span>
          </span>

          {roleFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-semibold">
              <span>Vai trò: {ROLE_CONFIG[roleFilter]?.label || roleFilter}</span>
              <button
                type="button"
                onClick={() => handleRoleChange('')}
                className="hover:text-purple-900 cursor-pointer p-0.5"
                title="Gỡ lọc vai trò"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {statusFilter && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <span>
                Trạng thái: {statusFilter === 'ACTIVE' ? 'Đang hoạt động' : 'Đang bị khóa'}
              </span>
              <button
                type="button"
                onClick={() => handleStatusChange('')}
                className="hover:opacity-75 cursor-pointer p-0.5"
                title="Gỡ lọc trạng thái"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
              <span>Tìm: &ldquo;{search}&rdquo;</span>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setPage(1);
                  updateUrlParams({ search: '', page: 1 });
                }}
                className="hover:text-slate-900 cursor-pointer p-0.5"
                title="Gỡ tìm kiếm"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-semibold underline ml-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DATA TABLE: BẢNG DỮ LIỆU NGƯỜI DÙNG                                    */}
      {/* ========================================================================= */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        {/* ===================================================================== */}
        {/* A. BẢNG DỮ LIỆU GỌN GÀNG CHO TABLET & DESKTOP (KHÔNG CÒN THANH CUỘN)  */}
        {/* ===================================================================== */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Nhân sự</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Số điện thoại</th>
                <th className="px-5 py-3.5">Vai trò</th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap min-w-[120px]">
                  Trạng thái
                </th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap min-w-[120px]">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <UsersTableSkeleton count={6} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Không tìm thấy tài khoản phù hợp
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc vai trò / trạng thái.
                    </p>
                    {(search || roleFilter || statusFilter) && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-semibold border border-[var(--color-primary-subtle)] shadow-2xs transition-all cursor-pointer active:scale-95"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Đặt lại bộ lọc</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrentSelf = Boolean(
                    currentAdmin &&
                    (currentAdmin.id === u.id ||
                      currentAdmin.username?.toLowerCase() === u.username.toLowerCase() ||
                      currentAdmin.email?.toLowerCase() === u.email.toLowerCase())
                  );
                  const userAvatar = isCurrentSelf
                    ? currentAdmin?.avatarUrl || u.avatarUrl
                    : u.avatarUrl;
                  const cleanName = formatCleanName(u.fullName);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Nhân sự: Avatar + Họ tên sạch sẽ (Không role thừa, không ID rườm rà) */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden bg-[var(--color-primary-light)] font-bold text-[var(--color-primary)] text-xs shadow-2xs">
                            {userAvatar ? (
                              <img
                                src={resolveAvatarUrl(userAvatar)}
                                alt={`Ảnh đại diện của ${cleanName}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              cleanName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                            <span className="truncate">{cleanName}</span>
                            {isCurrentSelf && (
                              <span className="rounded-md bg-[var(--color-primary-subtle)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--color-primary)] shrink-0">
                                Bạn
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Số điện thoại */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {u.phone ? (
                          <div className="flex items-center gap-1.5 font-mono text-slate-700 text-xs">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">---</span>
                        )}
                      </td>

                      {/* Vai trò */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {((u.roles && u.roles.length > 0 ? u.roles : [u.role]) as string[]).map(
                            (rKey) => {
                              const config = ROLE_CONFIG[rKey] || {
                                label: rKey,
                                bgClass: 'bg-slate-100',
                                textClass: 'text-slate-700',
                                ringClass: 'ring-slate-700/10',
                              };
                              return (
                                <span
                                  key={rKey}
                                  className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${config.bgClass} ${config.textClass} ${config.ringClass}`}
                                >
                                  {config.label}
                                </span>
                              );
                            }
                          )}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {u.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 whitespace-nowrap">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Hoạt động</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 cursor-help whitespace-nowrap"
                            title={u.lockReason || 'Tài khoản bị khóa bởi Quản trị viên'}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>Bị khóa</span>
                          </span>
                        )}
                      </td>

                      {/* Thao tác (Xem chi tiết, Chỉnh sửa, Khóa/Mở khóa) */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Nút xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(u)}
                            className="btn-icon text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Xem toàn bộ thông tin chi tiết nhân sự"
                            aria-label="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Nút sửa thông tin */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="btn-icon text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Sửa thông tin & Cấp mã đổi mật khẩu"
                            aria-label="Chỉnh sửa"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* Nút Khóa / Mở khóa */}
                          {isCurrentSelf ? (
                            <span
                              className="btn-icon text-slate-300 cursor-not-allowed"
                              title="Bạn không thể tự khóa tài khoản của chính mình"
                            >
                              <Lock className="h-4 w-4" />
                            </span>
                          ) : u.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(u, 'LOCKED')}
                              className="btn-icon text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Khóa tài khoản"
                              aria-label="Khóa tài khoản"
                            >
                              <Lock className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(u, 'ACTIVE')}
                              className="btn-icon text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              title="Mở khóa tài khoản"
                              aria-label="Mở khóa tài khoản"
                            >
                              <Unlock className="h-4 w-4" />
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

        {/* ===================================================================== */}
        {/* B. GIAO DIỆN THẺ (CARD VIEW) CHO MOBILE (<640px) KHÔNG BỊ TRÀN NGANG */}
        {/* ===================================================================== */}
        <div className="divide-y divide-slate-100 sm:hidden">
          {loading ? (
            <UsersMobileCardSkeleton count={4} />
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-slate-400 px-4">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">
                Không tìm thấy tài khoản phù hợp
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc vai trò / trạng thái.
              </p>
              {(search || roleFilter || statusFilter) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-semibold border border-[var(--color-primary-subtle)] shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Đặt lại bộ lọc</span>
                </button>
              )}
            </div>
          ) : (
            users.map((u) => {
              const isCurrentSelf = Boolean(
                currentAdmin &&
                (currentAdmin.id === u.id ||
                  currentAdmin.username?.toLowerCase() === u.username.toLowerCase() ||
                  currentAdmin.email?.toLowerCase() === u.email.toLowerCase())
              );
              const userAvatar = isCurrentSelf
                ? currentAdmin?.avatarUrl || u.avatarUrl
                : u.avatarUrl;
              const cleanName = formatCleanName(u.fullName);

              return (
                <div key={u.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden bg-[var(--color-primary-light)] font-bold text-[var(--color-primary)] text-sm shadow-2xs">
                        {userAvatar ? (
                          <img
                            src={resolveAvatarUrl(userAvatar)}
                            alt={cleanName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          cleanName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                          <span className="truncate">{cleanName}</span>
                          {isCurrentSelf && (
                            <span className="rounded-md bg-[var(--color-primary-subtle)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--color-primary)] shrink-0">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">
                          {u.phone || '---'}
                        </div>
                      </div>
                    </div>

                    {/* Trạng thái */}
                    {u.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>Hoạt động</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span>Bị khóa</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                    {/* Vai trò */}
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {((u.roles && u.roles.length > 0 ? u.roles : [u.role]) as string[]).map(
                        (rKey) => {
                          const config = ROLE_CONFIG[rKey] || {
                            label: rKey,
                            bgClass: 'bg-slate-100',
                            textClass: 'text-slate-700',
                            ringClass: 'ring-slate-700/10',
                          };
                          return (
                            <span
                              key={rKey}
                              className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${config.bgClass} ${config.textClass} ${config.ringClass}`}
                            >
                              {config.label}
                            </span>
                          );
                        }
                      )}
                    </div>

                    {/* Thao tác */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(u)}
                        className="btn-icon text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(u)}
                        className="btn-icon text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {isCurrentSelf ? null : u.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(u, 'LOCKED')}
                          className="btn-icon text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Khóa tài khoản"
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(u, 'ACTIVE')}
                          className="btn-icon text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                          title="Mở khóa tài khoản"
                        >
                          <Unlock className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Phân trang (Mặc định 20 dòng / trang theo chuẩn SN-13) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/30">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              Hiển thị{' '}
              <strong>
                {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)}
              </strong>{' '}
              trong tổng số <strong>{total}</strong> nhân sự
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-slate-400">Số dòng/trang:</span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng (Chuẩn)</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Trước</span>
            </button>

            {/* Các nút bấm số trang */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsisBefore && (
                        <span className="px-1 text-slate-400 font-bold">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`h-7 min-w-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          page === p
                            ? 'bg-purple-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL THÊM / CẬP NHẬT NHÂN SỰ & CẤP MÃ ĐỔI MẬT KHẨU                    */}
      {/* ========================================================================= */}
      {modalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[2px] animate-modal-backdrop-in">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-modal-in">
              {/* Header Modal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)] shadow-2xs">
                    {editingUser ? <Edit2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editingUser ? 'Cập nhật Thông tin Nhân sự' : 'Thêm mới Nhân sự'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {editingUser
                        ? `Mã tài khoản: ${editingUser.id}`
                        : 'Điền đầy đủ thông tin để cấp tài khoản truy cập hệ thống'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body Form (Scrollable) */}
              <form onSubmit={handleSubmitForm} className="p-6 space-y-4 overflow-y-auto">
                {/* Họ tên & SĐT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên nhân sự <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData({ ...formData, fullName: e.target.value });
                        clearFieldError('fullName');
                      }}
                      placeholder="VD: Nguyễn Văn An"
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs transition-all ${
                        formErrors.fullName
                          ? 'border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-rose-50/15'
                          : 'border-slate-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20'
                      }`}
                    />
                    {formErrors.fullName && (
                      <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{formErrors.fullName}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số điện thoại liên hệ (SĐT Việt Nam)
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        clearFieldError('phone');
                      }}
                      placeholder="VD: 0912345678"
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs transition-all ${
                        formErrors.phone
                          ? 'border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-rose-50/15'
                          : 'border-slate-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20'
                      }`}
                    />
                    {formErrors.phone && (
                      <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{formErrors.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Tên đăng nhập & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên đăng nhập (Username) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={Boolean(editingUser)}
                      value={formData.username}
                      onChange={(e) => {
                        setFormData({ ...formData, username: e.target.value });
                        clearFieldError('username');
                      }}
                      placeholder="VD: sales_an"
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs disabled:bg-slate-100 disabled:text-slate-500 transition-all ${
                        formErrors.username
                          ? 'border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-rose-50/15'
                          : 'border-slate-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20'
                      }`}
                    />
                    {formErrors.username && (
                      <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{formErrors.username}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email công việc <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        clearFieldError('email');
                      }}
                      placeholder="VD: an.nguyen@loha.vn"
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs transition-all ${
                        formErrors.email
                          ? 'border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-rose-50/15'
                          : 'border-slate-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20'
                      }`}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{formErrors.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* PHÂN QUYỀN ĐA VAI TRÒ (Multi-role - SN-14) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Vai trò hệ thống (Đa vai trò) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Đã chọn:{' '}
                      <strong className="text-[var(--color-primary)]">
                        {formData.roles?.length || 0}
                      </strong>{' '}
                      vai trò
                    </span>
                  </div>

                  {/* Cảnh báo an toàn khi Admin sửa tài khoản chính mình */}
                  {isEditingCurrentSelf && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-primary-subtle)] bg-[var(--color-primary-light)]/80 p-3 text-xs text-slate-800 shadow-2xs">
                      <Shield className="h-4 w-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Bảo vệ quyền Quản trị viên:</span> Bạn đang
                        chỉnh sửa tài khoản Quản trị của chính mình. Quyền{' '}
                        <strong>Quản trị hệ thống (ADMIN)</strong> được khóa cố định để đảm bảo bạn
                        không bị mất quyền truy cập.
                      </div>
                    </div>
                  )}

                  {/* Danh sách 7 vai trò dạng checkbox/cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.keys(ROLE_CONFIG).map((roleKey) => {
                      const cfg = ROLE_CONFIG[roleKey];
                      const isSelected = (formData.roles || []).includes(roleKey);
                      const isAdminLocked = isEditingCurrentSelf && roleKey === USER_ROLES.ADMIN;

                      return (
                        <div
                          key={roleKey}
                          onClick={() => {
                            if (!isAdminLocked) handleToggleRole(roleKey);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isAdminLocked
                              ? 'bg-[var(--color-primary-light)]/40 border-[var(--color-primary-subtle)] cursor-not-allowed'
                              : isSelected
                                ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] shadow-2xs'
                                : 'bg-white border-slate-200 hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isAdminLocked}
                              onChange={() => {
                                if (!isAdminLocked) handleToggleRole(roleKey);
                              }}
                              className="h-4 w-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary-ring)] border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="truncate">
                              <span className="font-semibold text-slate-800">{cfg.label}</span>
                              <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                                ({roleKey})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {isAdminLocked ? (
                              <span
                                title="Quyền quản trị của chính bạn được bảo vệ"
                                className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary-subtle)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-primary)]"
                              >
                                <Lock className="h-2.5 w-2.5" />
                                Khóa
                              </span>
                            ) : (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cfg.bgClass} ${cfg.textClass} ${cfg.ringClass}`}
                              >
                                {roleKey === USER_ROLES.WAREHOUSE_KEEPER ||
                                roleKey === USER_ROLES.WAREHOUSE_MANAGER
                                  ? 'Kho'
                                  : 'Nhóm'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {formErrors.roles && (
                    <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{formErrors.roles}</span>
                    </p>
                  )}
                </div>

                {/* KHO HOẶC ĐỊA BÀN PHỤ TRÁCH (Ràng buộc động SN-14) */}
                <div>
                  {(() => {
                    const hasWarehouseRole = (formData.roles || []).some(
                      (r) => r === USER_ROLES.WAREHOUSE_KEEPER || r === USER_ROLES.WAREHOUSE_MANAGER
                    );

                    return (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Kho hoặc Địa bàn phụ trách{' '}
                            {hasWarehouseRole ? (
                              <span className="text-rose-500 font-bold">*</span>
                            ) : (
                              <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                            )}
                          </label>
                          {hasWarehouseRole && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Bắt buộc cho vai trò Kho
                            </span>
                          )}
                        </div>

                        <select
                          value={formData.assignedWarehouse}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              assignedWarehouse: e.target.value,
                            });
                            clearFieldError('assignedWarehouse');
                          }}
                          className={`w-full rounded-xl border bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-2 transition-all ${
                            formErrors.assignedWarehouse
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/15'
                              : 'border-slate-200 focus:border-purple-500 focus:ring-purple-500/20'
                          }`}
                        >
                          <option value="">-- Chưa chọn kho / địa bàn --</option>
                          {WAREHOUSE_OPTIONS.map((wh) => (
                            <option key={wh} value={wh}>
                              {wh}
                            </option>
                          ))}
                        </select>

                        {formErrors.assignedWarehouse ? (
                          <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{formErrors.assignedWarehouse}</span>
                          </p>
                        ) : hasWarehouseRole ? (
                          <p className="mt-1 text-[11px] text-amber-700 flex items-center gap-1">
                            <Info className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              Nhân sự thuộc vai trò Thủ kho / Quản lý kho bắt buộc phải gắn với kho
                              phụ trách cụ thể.
                            </span>
                          </p>
                        ) : null}
                      </>
                    );
                  })()}
                </div>

                {editingUser ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Đặt lại mật khẩu mới (Để trống nếu giữ nguyên mật khẩu cũ)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Nhập mật khẩu mới nếu muốn thay đổi (để trống nếu không đổi)..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                ) : (
                  /* Khi Tạo mới nhân sự */
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mật khẩu khởi tạo (Để trống hệ thống sẽ tự động sinh mật khẩu tạm thời an
                      toàn)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mặc định: Loha@2026 (nếu bỏ trống)"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                )}

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    {submitting ? 'Đang lưu...' : editingUser ? 'Lưu cập nhật' : 'Tạo tài khoản'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* 6. MODAL KHÓA / MỞ KHÓA TÀI KHOẢN NHÂN SỰ                                */}
      {/* ========================================================================= */}
      {statusModalOpen &&
        selectedUserForStatus &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[2px] animate-modal-backdrop-in">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-lg border border-slate-100 animate-modal-in">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-2xs ${
                    targetStatus === 'LOCKED'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {targetStatus === 'LOCKED' ? (
                    <UserX className="h-6 w-6" />
                  ) : (
                    <Unlock className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {targetStatus === 'LOCKED'
                      ? 'Xác nhận Khóa tài khoản'
                      : 'Xác nhận Mở khóa tài khoản'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nhân sự: <strong>{selectedUserForStatus.fullName}</strong> (
                    {selectedUserForStatus.username})
                  </p>
                </div>
              </div>

              {targetStatus === 'LOCKED' && (
                <div className="mb-3.5 rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>Cảnh báo bảo mật hệ thống:</span>
                  </div>
                  <p className="leading-relaxed">
                    Khi khóa, toàn bộ phiên làm việc của nhân sự sẽ bị ngắt kết nối ngay lập tức.
                    Mọi phiên đăng nhập hiện tại sẽ bị thu hồi và nhân viên sẽ bị out ra ngay lập
                    tức.
                  </p>
                </div>
              )}

              {/* Cảnh báo Bàn giao Đại lý phụ trách (SN-15) */}
              {targetStatus === 'LOCKED' && (
                <>
                  {loadingAssignedCustomers ? (
                    <div className="mb-3.5 rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-500 flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" />
                      <span>Đang kiểm tra danh sách đại lý phụ trách...</span>
                    </div>
                  ) : assignedCustomers.length > 0 ? (
                    <div className="mb-3.5 rounded-xl bg-amber-50/90 border border-amber-200 p-3.5 text-xs text-amber-900 space-y-2 shadow-2xs">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>Cảnh báo bàn giao đại lý phụ trách:</span>
                      </div>
                      <p className="leading-relaxed">
                        Nhân sự này đang phụ trách{' '}
                        <strong className="text-amber-950 font-bold underline">
                          {assignedCustomers.length} đại lý
                        </strong>
                        . Sau khi khóa, hệ thống khuyến nghị bạn thực hiện chuyển giao địa bàn cho
                        nhân viên kinh doanh khác.
                      </p>
                      <div className="mt-1.5 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {assignedCustomers.map((dealer) => (
                          <div
                            key={dealer.id}
                            className="flex items-center justify-between rounded-lg bg-white/95 border border-amber-200/70 px-2.5 py-1.5 text-[11px] shadow-2xs"
                          >
                            <div className="font-medium text-slate-800 flex items-center gap-1.5 min-w-0">
                              <Store className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                              <span className="font-mono font-bold text-amber-900">
                                {dealer.code}
                              </span>
                              <span className="truncate">- {dealer.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded shrink-0 ml-1.5">
                              {dealer.region}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              <form onSubmit={handleSubmitStatus} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lý do {targetStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder={
                      targetStatus === 'LOCKED'
                        ? 'Nhập lý do cụ thể (Bắt buộc để lưu nhật ký kiểm toán)...'
                        : 'Nhập ghi chú mở khóa...'
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                {/* Gợi ý lý do nhanh khi khóa */}
                {targetStatus === 'LOCKED' && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block mb-1">
                      Gợi ý lý do phổ biến:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {LOCK_REASON_PRESETS.map((preset) => (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => setStatusReason(preset)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStatusModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={
                      statusSubmitting || (targetStatus === 'LOCKED' && !statusReason.trim())
                    }
                    className={`rounded-xl px-5 py-2 text-xs font-semibold text-white transition-all ${
                      targetStatus === 'LOCKED'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    } disabled:opacity-50`}
                  >
                    {statusSubmitting
                      ? 'Đang xử lý...'
                      : targetStatus === 'LOCKED'
                        ? 'Xác nhận Khóa tài khoản'
                        : 'Xác nhận Mở khóa'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================================= */}
      {/* 7. MODAL XEM CHI TIẾT NHÂN SỰ                                             */}
      {/* ========================================================================= */}
      {detailModalOpen &&
        selectedUserForDetail &&
        createPortal(
          <div
            onClick={() => setDetailModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[2px] animate-modal-backdrop-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-modal-in"
            >
              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Profile card */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden bg-gradient-to-tr from-purple-500 to-indigo-600 font-bold text-white text-lg shadow-sm">
                    {selectedUserForDetail.avatarUrl ? (
                      <img
                        src={resolveAvatarUrl(selectedUserForDetail.avatarUrl)}
                        alt={formatCleanName(selectedUserForDetail.fullName)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      formatCleanName(selectedUserForDetail.fullName).charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-slate-900 truncate">
                      {formatCleanName(selectedUserForDetail.fullName)}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {(
                        (selectedUserForDetail.roles && selectedUserForDetail.roles.length > 0
                          ? selectedUserForDetail.roles
                          : [selectedUserForDetail.role]) as string[]
                      ).map((rKey) => {
                        const cfg = ROLE_CONFIG[rKey] || {
                          label: rKey,
                          bgClass: 'bg-slate-100',
                          textClass: 'text-slate-700',
                          ringClass: 'ring-slate-700/10',
                        };
                        return (
                          <span
                            key={rKey}
                            className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${cfg.bgClass} ${cfg.textClass} ${cfg.ringClass}`}
                          >
                            {cfg.label}
                          </span>
                        );
                      })}

                      {selectedUserForDetail.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-600/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Bị khóa
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Tên đăng nhập */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 block">
                      Tên đăng nhập
                    </span>
                    <div className="flex items-center justify-between font-mono font-bold text-slate-800">
                      <span className="truncate">{selectedUserForDetail.username}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(selectedUserForDetail.username)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="Sao chép tên đăng nhập"
                      >
                        {copiedCode === selectedUserForDetail.username ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 block">
                      Địa chỉ Email
                    </span>
                    <div className="flex items-center justify-between font-medium text-slate-800">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate" title={selectedUserForDetail.email}>
                          {selectedUserForDetail.email}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(selectedUserForDetail.email)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0"
                        title="Sao chép email"
                      >
                        {copiedCode === selectedUserForDetail.email ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Số điện thoại */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 block">
                      Số điện thoại
                    </span>
                    <span className="font-mono font-medium text-slate-800 block">
                      {selectedUserForDetail.phone || 'Chưa cập nhật'}
                    </span>
                  </div>

                  {/* Mã ID người dùng */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 block">
                      Mã ID nhân sự
                    </span>
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-700">
                      <span className="truncate">{selectedUserForDetail.id}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(selectedUserForDetail.id)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0"
                        title="Sao chép ID"
                      >
                        {copiedCode === selectedUserForDetail.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Kho / Địa bàn phụ trách */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1 sm:col-span-2">
                    <span className="text-[11px] font-medium text-slate-400 block">
                      Kho / Địa bàn phụ trách
                    </span>
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Warehouse className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        {selectedUserForDetail.assignedWarehouse || 'Chưa phân công địa bàn / kho'}
                      </span>
                    </div>
                  </div>

                  {/* Lý do khóa (nếu tài khoản đang bị khóa) */}
                  {selectedUserForDetail.status === 'LOCKED' &&
                    selectedUserForDetail.lockReason && (
                      <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-1 sm:col-span-2 text-rose-800">
                        <span className="text-[11px] font-semibold text-rose-600 block">
                          Lý do khóa tài khoản
                        </span>
                        <p className="text-xs">{selectedUserForDetail.lockReason}</p>
                      </div>
                    )}

                  {/* Mã cấp đổi mật khẩu (nếu có) */}
                  {selectedUserForDetail.resetCode && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 space-y-1 sm:col-span-2">
                      <span className="text-[11px] font-semibold text-indigo-700 block">
                        Mã cấp đổi mật khẩu tạm thời
                      </span>
                      <div className="flex items-center justify-between font-mono font-bold text-sm text-indigo-900">
                        <span>{selectedUserForDetail.resetCode}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(selectedUserForDetail.resetCode!)}
                          className="rounded p-1 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          title="Sao chép mã"
                        >
                          {copiedCode === selectedUserForDetail.resetCode ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Danh sách đại lý phụ trách nếu là Sales Rep */}
                  {loadingDetailCustomers ? (
                    <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 sm:col-span-2 text-center text-slate-400">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-blue-600" />
                      <span>Đang tải danh sách khách hàng phụ trách...</span>
                    </div>
                  ) : detailCustomers.length > 0 ? (
                    <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2 sm:col-span-2">
                      <span className="text-[11px] font-semibold text-blue-700 block">
                        Đại lý / Khách hàng đang phụ trách ({detailCustomers.length})
                      </span>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {detailCustomers.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white/90 border border-blue-100 shadow-2xs"
                          >
                            <span className="font-semibold text-slate-800 truncate">{c.name}</span>
                            <span className="font-mono text-slate-500 text-[11px] shrink-0">
                              {c.code}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false);
                      handleOpenEditModal(selectedUserForDetail);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                    <span>Chỉnh sửa</span>
                  </button>

                  {/* Khóa / Mở khóa */}
                  {currentAdmin?.id !== selectedUserForDetail.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModalOpen(false);
                        handleOpenStatusModal(
                          selectedUserForDetail,
                          selectedUserForDetail.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
                        selectedUserForDetail.status === 'ACTIVE'
                          ? 'border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-700'
                          : 'border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {selectedUserForDetail.status === 'ACTIVE' ? (
                        <>
                          <Lock className="h-3.5 w-3.5 text-rose-600" />
                          <span>Khóa tài khoản</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Mở khóa</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="rounded-xl bg-slate-200/80 hover:bg-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ================================================================= */}
      {/* EXCEL IMPORT MODAL – SN-147                                        */}
      {/* ================================================================= */}
      {importModalOpen && (
        <ExcelImportModal
          onClose={() => setImportModalOpen(false)}
          onImportSuccess={() => {
            fetchUsers();
            fetchSummary();
          }}
        />
      )}
    </div>
  );
};
