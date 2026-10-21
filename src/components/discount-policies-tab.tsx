import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Search,
  RotateCcw,
  FileSpreadsheet,
  Calendar,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { showToast } from './toast';
import { ConfirmDialog } from './confirm-dialog';
import { discountPoliciesService } from '../services/discount-policies.service';
import type {
  DiscountPolicy,
  CreateDiscountPolicyPayload,
} from '../services/discount-policies.service';
import { DiscountPolicyFormModal } from './discount-policy-form-modal';
import { Pagination } from './pagination';
import { getStoredUser } from '../utils/navigation';
import { tokenStorage } from '../utils/token-storage';

/**
 * Trích xuất thông báo lỗi an toàn không dùng `any` theo CODE_CONVENTION.md
 */
const getErrorMessage = (err: unknown, fallback: string): string => {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
};

/** Định dạng ngày hiển thị chuẩn Việt Nam: DD/MM/YYYY */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export interface DiscountPoliciesTabProps {
  canManage?: boolean;
  onRequestCreate?: () => void;
  onRequestEdit?: (policy: DiscountPolicy, isReadOnly?: boolean) => void;
}

export const DiscountPoliciesTab: React.FC<DiscountPoliciesTabProps> = ({
  canManage: canManageProp,
  onRequestCreate,
  onRequestEdit,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Phân quyền người dùng: Nhân viên kinh doanh (SALES_REP) không có quyền tạo/quản lý chính sách
  // Chỉ ADMIN và SALES_MANAGER có quyền tạo mới, chỉnh sửa, xóa chính sách chiết khấu
  const currentUser = tokenStorage.getUser() || getStoredUser();
  const userRoles = useMemo(() => {
    const roles = currentUser?.roles || [];
    if (currentUser?.role && !roles.includes(currentUser.role)) {
      return [...roles, currentUser.role];
    }
    return roles;
  }, [currentUser]);

  const isAdminOrSalesManager =
    userRoles.includes('ADMIN') || userRoles.includes('SALES_MANAGER');

  const canManage = canManageProp !== undefined ? canManageProp : isAdminOrSalesManager;

  // Dữ liệu & Tải trang
  const [policies, setPolicies] = useState<DiscountPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DiscountPolicy | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<DiscountPolicy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quản lý dropdown thao tác với Portal
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    top: number;
    right: number;
    isDropUp: boolean;
  } | null>(null);

  // Tách biệt URL params: Sử dụng tiền tố 'disc_' để không bị trùng lặp với tab Bảng giá cơ sở
  const urlStatusParam = (searchParams.get('disc_status') || 'ALL').toUpperCase();
  const validStatus =
    urlStatusParam === 'ACTIVE' || urlStatusParam === 'INACTIVE' || urlStatusParam === 'EXPIRED'
      ? urlStatusParam
      : 'ALL';

  const urlSearchParam = searchParams.get('disc_search') || '';

  const [selectedStatus, setSelectedStatus] = useState<string>(validStatus);
  const [searchInput, setSearchInput] = useState<string>(urlSearchParam);
  const [searchTerm, setSearchTerm] = useState<string>(urlSearchParam);

  // Phân trang từ URL Search Params (Hỗ trợ 10 - 20 - 50 dòng/trang)
  const urlPageParam = parseInt(searchParams.get('disc_page') || '1', 10);
  const validPage = Number.isInteger(urlPageParam) && urlPageParam > 0 ? urlPageParam : 1;

  const urlLimitParam = parseInt(searchParams.get('disc_limit') || '10', 10);
  const validLimit = [10, 20, 50].includes(urlLimitParam) ? urlLimitParam : 10;

  const [currentPage, setCurrentPage] = useState<number>(validPage);
  const [pageSize, setPageSize] = useState<number>(validLimit);

  const isInitialSearchMount = useRef(true);

  // Đóng dropdown thao tác khi click ra ngoài, cuộn trang hoặc resize
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (
        !(e.target as HTMLElement).closest('.disc-action-menu-dropdown-container') &&
        !(e.target as HTMLElement).closest('.disc-action-portal-menu')
      ) {
        setOpenActionMenuId(null);
        setActionMenuAnchor(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenActionMenuId(null);
      setActionMenuAnchor(null);
    };
    document.addEventListener('click', handleDocClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('click', handleDocClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // Cập nhật an toàn các Query Params riêng cho tab Chiết khấu lên URL (không reload trang)
  const updateUrlParams = useCallback(
    (updates: { status?: string; search?: string; page?: number; limit?: number }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'discount');

          // Trạng thái chính sách
          const targetStatus = updates.status !== undefined ? updates.status : selectedStatus;
          if (targetStatus && targetStatus !== 'ALL') {
            next.set('disc_status', targetStatus.toLowerCase());
          } else {
            next.delete('disc_status');
          }

          // Từ khóa tìm kiếm
          const targetSearch = updates.search !== undefined ? updates.search : searchTerm;
          const trimmed = targetSearch.trim();
          if (trimmed) {
            next.set('disc_search', trimmed);
          } else {
            next.delete('disc_search');
          }

          // Phân trang
          const targetPage = updates.page !== undefined ? updates.page : currentPage;
          if (targetPage > 1) {
            next.set('disc_page', String(targetPage));
          } else {
            next.delete('disc_page');
          }

          // Số dòng / trang
          const targetLimit = updates.limit !== undefined ? updates.limit : pageSize;
          if (targetLimit !== 10) {
            next.set('disc_limit', String(targetLimit));
          } else {
            next.delete('disc_limit');
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, selectedStatus, searchTerm, currentPage, pageSize]
  );

  // Debounce tìm kiếm (400ms)
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
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, searchTerm, updateUrlParams]);

  // Lắng nghe thay đổi của URL searchParams chỉ khi đang ở tab discount
  useEffect(() => {
    if (searchParams.get('tab') !== 'discount') return;

    const rawStatus = (searchParams.get('disc_status') || 'ALL').toUpperCase();
    const newStatus =
      rawStatus === 'ACTIVE' || rawStatus === 'INACTIVE' || rawStatus === 'EXPIRED'
        ? rawStatus
        : 'ALL';
    if (newStatus !== selectedStatus) {
      setSelectedStatus(newStatus);
    }

    const newSearch = searchParams.get('disc_search') || '';
    if (newSearch !== searchTerm) {
      setSearchTerm(newSearch);
      setSearchInput(newSearch);
    }

    const rawPage = parseInt(searchParams.get('disc_page') || '1', 10);
    const newPage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }

    const rawLimit = parseInt(searchParams.get('disc_limit') || '10', 10);
    const newLimit = [10, 20, 50].includes(rawLimit) ? rawLimit : 10;
    if (newLimit !== pageSize) {
      setPageSize(newLimit);
    }
  }, [searchParams, selectedStatus, searchTerm, currentPage, pageSize]);

  // Nạp danh sách chính sách chiết khấu
  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await discountPoliciesService.getPolicies();
      setPolicies(data);
    } catch (err: unknown) {
      showToast('error', getErrorMessage(err, 'Lỗi khi tải danh sách chính sách chiết khấu'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  // Lắng nghe cập nhật chính sách từ tab chỉnh sửa / tạo mới
  useEffect(() => {
    const handleSync = () => {
      void loadPolicies();
    };
    window.addEventListener('loha_discount_policies_updated', handleSync);
    return () => {
      window.removeEventListener('loha_discount_policies_updated', handleSync);
    };
  }, [loadPolicies]);

  // Lọc dữ liệu hiển thị theo trạng thái và từ khóa tìm kiếm
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      // Bộ lọc Trạng thái
      if (selectedStatus === 'ACTIVE' && p.status !== 'ACTIVE') {
        return false;
      }
      if (selectedStatus === 'INACTIVE' && p.status !== 'INACTIVE') {
        return false;
      }
      if (selectedStatus === 'EXPIRED') {
        if (!p.endDate) return false;
        const isExpired = new Date(p.endDate) < new Date();
        if (!isExpired) return false;
      }

      // Bộ lọc Tìm kiếm
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchCode = p.code?.toLowerCase().includes(q);
        const matchName = p.name?.toLowerCase().includes(q);
        const matchTarget = (p.targetIds?.join(' ') || p.targetId || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchTarget) {
          return false;
        }
      }

      return true;
    });
  }, [policies, selectedStatus, searchTerm]);

  // Phân trang danh sách chính sách chiết khấu (10 - 20 - 50)
  const totalPages = filteredPolicies.length > 0 ? Math.ceil(filteredPolicies.length / pageSize) : 0;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredPolicies.length);

  const paginatedPolicies = useMemo(() => {
    return filteredPolicies.slice(startIndex, endIndex);
  }, [filteredPolicies, startIndex, endIndex]);

  // Điều chỉnh safe page khi lọc danh sách bị giảm số trang
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
      updateUrlParams({ page: totalPages });
    }
  }, [totalPages, currentPage, updateUrlParams]);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      updateUrlParams({ page });
    },
    [updateUrlParams]
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
      updateUrlParams({ limit: size, page: 1 });
    },
    [updateUrlParams]
  );

  const handleOpenCreateModal = () => {
    if (onRequestCreate) {
      onRequestCreate();
    } else {
      setEditingPolicy(null);
      setIsViewOnly(false);
      setIsModalOpen(true);
    }
  };

  const handleOpenEditModal = (policy: DiscountPolicy) => {
    if (onRequestEdit) {
      onRequestEdit(policy, false);
    } else {
      setEditingPolicy(policy);
      setIsViewOnly(false);
      setIsModalOpen(true);
    }
  };

  const handleOpenViewModal = (policy: DiscountPolicy) => {
    if (onRequestEdit) {
      onRequestEdit(policy, true);
    } else {
      setEditingPolicy(policy);
      setIsViewOnly(true);
      setIsModalOpen(true);
    }
  };

  const handleDelete = (policy: DiscountPolicy) => {
    setPolicyToDelete(policy);
  };

  const handleFormSubmit = async (payload: CreateDiscountPolicyPayload, id?: string) => {
    try {
      if (id) {
        await discountPoliciesService.updatePolicy(id, payload);
        showToast('success', 'Cập nhật chính sách thành công');
      } else {
        await discountPoliciesService.createPolicy(payload);
        showToast('success', 'Thêm mới chính sách thành công');
      }
      setIsModalOpen(false);
      await loadPolicies();
      window.dispatchEvent(new Event('loha_discount_policies_updated'));
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Lỗi khi lưu chính sách');
      showToast('error', msg);
      throw err;
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    updateUrlParams({ status, page: 1 });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedStatus('ALL');
    setCurrentPage(1);
    updateUrlParams({ search: '', status: 'ALL', page: 1 });
  };

  // Helper hiển thị nhãn tiếng Việt cho trạng thái
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Đang hiệu lực';
      case 'INACTIVE':
        return 'Tạm dừng';
      case 'EXPIRED':
        return 'Đã hết hạn';
      default:
        return status;
    }
  };

  // Helper hiển thị badge đối tượng áp dụng
  const renderTargetBadge = (policy: DiscountPolicy) => {
    if (
      policy.targetType === 'CATEGORY' ||
      (policy.appliedCategoryIds && policy.appliedCategoryIds.length > 0)
    ) {
      const catCount = policy.appliedCategoryIds?.length || 1;
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/20">
          Nhóm hàng ({catCount})
        </span>
      );
    }
    const skuCount =
      policy.targetIds?.length || policy.appliedProductSkus?.length || 1;
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-700/20">
        Sản phẩm ({skuCount} SKU)
      </span>
    );
  };

  // Helper hiển thị badge loại chiết khấu
  const renderDiscountTypeBadge = (type?: 'PERCENTAGE' | 'FIXED_AMOUNT') => {
    if (type === 'PERCENTAGE' || !type) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20">
          % Phần trăm
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
        Số tiền (VNĐ)
      </span>
    );
  };

  // Helper hiển thị badge trạng thái đồng bộ với Bảng giá cơ sở
  const renderStatusBadge = (status: string, endDate?: string) => {
    const isExpired = endDate && new Date(endDate) < new Date();
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Đã hết hạn
        </span>
      );
    }
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Đang hiệu lực
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Tạm dừng
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Chính sách Chiết khấu theo Sản lượng
          </h2>
        </div>

        {/* Nút Thêm mới chính sách chuẩn UI_GUIDELINES: h-[38px] rounded-lg */}
        {canManage && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Thêm chính sách</span>
          </button>
        )}
      </div>

      {/* 2. Filter Bar: rounded-xl theo UI_GUIDELINES, đã bỏ nút Làm mới, xóa text hiển thị số lượng */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Ô Tìm kiếm */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã chính sách, tên hoặc đối tượng áp dụng..."
              className="w-full h-[38px] pl-9.5 pr-8 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Trạng thái (Việt hóa hoàn toàn) */}
          <div className="sm:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full h-[38px] px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-2xs"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="ACTIVE">Đang hiệu lực</option>
              <option value="INACTIVE">Tạm dừng</option>
              <option value="EXPIRED">Đã hết hạn</option>
            </select>
          </div>

          {/* Nút Xóa bộ lọc nếu có lọc */}
          {(searchTerm || selectedStatus !== 'ALL') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center gap-1.5 h-[38px] rounded-lg border border-rose-200 bg-rose-50/50 px-3.5 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100/60 active:scale-[0.98] transition-all cursor-pointer shrink-0"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
              <span>Bỏ lọc</span>
            </button>
          )}
        </div>

        {/* Thông tin bộ lọc đang áp dụng (Việt hóa hoàn toàn, đã xóa dòng "Hiển thị ... / ...") */}
        {(searchTerm || selectedStatus !== 'ALL') && (
          <div className="flex items-center text-xs text-blue-600 font-medium pt-2 border-t border-slate-100 gap-1.5">
            <span>Đang lọc:</span>
            {selectedStatus !== 'ALL' && (
              <span>Trạng thái: {getStatusLabel(selectedStatus)} • </span>
            )}
            {searchTerm && <span>Từ khóa: &quot;{searchTerm}&quot;</span>}
          </div>
        )}
      </div>

      {/* 3. Bảng dữ liệu chính sách chiết khấu (Định dạng table chuẩn Quản lý đại lý & Bảng giá, không khoảng trắng thừa) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm divide-y divide-slate-100 min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-[15%]">Mã chính sách</th>
                <th className="px-4 py-3 text-left w-[25%]">Tên chính sách</th>
                <th className="px-4 py-3 text-left w-[15%]">Đối tượng áp dụng</th>
                <th className="px-4 py-3 text-left w-[13%]">Loại chiết khấu</th>
                <th className="px-4 py-3 text-left w-[17%]">Thời gian hiệu lực</th>
                <th className="px-4 py-3 text-center w-[10%]">Trạng thái</th>
                {canManage && (
                  <th className="px-4 py-3 text-right w-[10%] min-w-[105px]">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-slate-100/90 transition-opacity duration-150 ${
                loading ? 'opacity-60 pointer-events-none' : 'opacity-100'
              }`}
            >
              {loading ? (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="py-12 text-center text-slate-400 border-b border-slate-100"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-blue-500 animate-pulse" />
                      <p className="font-semibold text-slate-600 text-sm">
                        Đang tải danh sách chính sách chiết khấu...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="py-12 text-center text-slate-400 border-b border-slate-100"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-sm">
                        Không tìm thấy chính sách phù hợp
                      </p>
                      <p className="text-xs text-slate-400">
                        {searchTerm || selectedStatus !== 'ALL'
                          ? 'Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc trạng thái.'
                          : 'Chưa có chính sách chiết khấu sản lượng nào trong hệ thống.'}
                      </p>
                      {(searchTerm || selectedStatus !== 'ALL') && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>Đặt lại bộ lọc</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPolicies.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenViewModal(p)}
                    className="hover:bg-indigo-50/25 transition-colors group cursor-pointer"
                  >
                    {/* 1. Mã chính sách: Monospace badge chuẩn Quản lý đại lý / Bảng giá */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2.5 py-1 rounded-md shadow-2xs group-hover:border-blue-300">
                        <FileSpreadsheet className="w-3 h-3 text-blue-500" />
                        <span>{p.code}</span>
                      </span>
                    </td>

                    {/* 2. Tên chính sách */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 line-clamp-1 text-sm group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </div>
                    </td>

                    {/* 3. Đối tượng áp dụng */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderTargetBadge(p)}
                    </td>

                    {/* 4. Loại chiết khấu */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderDiscountTypeBadge(p.discountType)}
                    </td>

                    {/* 5. Thời gian hiệu lực */}
                    <td className="px-4 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {formatDate(p.startDate)} – {formatDate(p.endDate)}
                        </span>
                      </div>
                    </td>

                    {/* 6. Trạng thái: Pill badge bo tròn đồng bộ với pulse dot */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {renderStatusBadge(p.status, p.endDate)}
                    </td>

                    {/* 7. Thao tác */}
                    {canManage && (
                      <td
                        className="px-4 py-3.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-flex items-center justify-end disc-action-menu-dropdown-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openActionMenuId === p.id) {
                                setOpenActionMenuId(null);
                                setActionMenuAnchor(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const shouldDropUp = spaceBelow < 200 && rect.top > 200;
                                setActionMenuAnchor({
                                  top: shouldDropUp ? rect.top - 4 : rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                  isDropUp: shouldDropUp,
                                });
                                setOpenActionMenuId(p.id);
                              }
                            }}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none whitespace-nowrap shrink-0 ${
                              openActionMenuId === p.id
                                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs ring-2 ring-blue-500/10'
                                : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-300'
                            }`}
                            title="Thao tác"
                          >
                            <span className="whitespace-nowrap">Thao tác</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                                openActionMenuId === p.id ? 'rotate-180 text-blue-600' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dropdown Menu Portal Thao tác */}
        {openActionMenuId && actionMenuAnchor && typeof document !== 'undefined' && (() => {
          const policy = policies.find((item) => item.id === openActionMenuId);
          if (!policy) return null;
          return createPortal(
            <div
              className="disc-action-portal-menu fixed w-48 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-[9999] animate-in fade-in zoom-in-95 text-left divide-y divide-slate-100"
              style={{
                top: actionMenuAnchor.isDropUp ? undefined : `${actionMenuAnchor.top}px`,
                bottom: actionMenuAnchor.isDropUp
                  ? `${window.innerHeight - actionMenuAnchor.top}px`
                  : undefined,
                right: `${actionMenuAnchor.right}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setActionMenuAnchor(null);
                    handleOpenViewModal(policy);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span>Xem chi tiết</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setActionMenuAnchor(null);
                    handleOpenEditModal(policy);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  <span>Chỉnh sửa chính sách</span>
                </button>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setActionMenuAnchor(null);
                    handleDelete(policy);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Xóa chính sách</span>
                </button>
              </div>
            </div>,
            document.body
          );
        })()}

        {/* 4. Phân trang (Pagination) chuẩn Quản lý đại lý & Bảng giá: 10 - 20 - 50 dòng/trang */}
        {filteredPolicies.length > 0 && (
          <Pagination
            variant="default"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredPolicies.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="chính sách"
            showRecordRange={false}
            showFirstLast={false}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      <DiscountPolicyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingPolicy}
        isReadOnly={isViewOnly}
      />

      <ConfirmDialog
        isOpen={Boolean(policyToDelete)}
        onCancel={() => setPolicyToDelete(null)}
        onConfirm={async () => {
          if (!policyToDelete) return;
          setIsDeleting(true);
          try {
            await discountPoliciesService.deletePolicy(policyToDelete.id);
            showToast('success', 'Xóa chính sách thành công');
            setPolicyToDelete(null);
            await loadPolicies();
            window.dispatchEvent(new Event('loha_discount_policies_updated'));
          } catch (err: unknown) {
            showToast('error', getErrorMessage(err, 'Lỗi khi xóa chính sách'));
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Xóa chính sách chiết khấu"
        message={`Bạn có chắc chắn muốn xóa chính sách "${policyToDelete?.name}"? Các đơn hàng tính chiết khấu trong tương lai sẽ không còn áp dụng chính sách này.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
