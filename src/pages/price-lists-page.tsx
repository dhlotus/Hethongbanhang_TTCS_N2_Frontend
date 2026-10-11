import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  FileEdit,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
  FileSpreadsheet,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { getStoredUser } from '../utils/navigation';
import { priceListsService } from '../services/price-lists.service';
import { PriceListFormModal } from '../components/price-list-form-modal';
import { PriceListCloneModal } from '../components/price-list-clone-modal';
import { showToast } from '../components/toast';
import { PriceListsTableSkeleton } from '../components/skeletons';
import { ConfirmDeleteModal } from '../components/confirm-delete-modal';
import { DiscountPoliciesTab } from '../components/discount-policies-tab';
import type {
  PriceList,
  CustomerGroupType,
  PriceListStatusType,
  CreatePriceListPayload,
} from '../types/price-list';

// ──────────────────────────────────────────────────────────────────────────
// QUERY PARAM MAPPINGS CHO BẢNG GIÁ & CHIẾT KHẤU (URL STATE MANAGEMENT)
// ──────────────────────────────────────────────────────────────────────────

const CUSTOMER_GROUP_TABS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'Tất cả Nhóm' },
  { key: 'AGENT_LEVEL_1', label: 'Đại lý Cấp 1' },
  { key: 'AGENT_LEVEL_2', label: 'Đại lý Cấp 2' },
  { key: 'RETAIL', label: 'Bán lẻ Niêm yết' },
];

const TAB_TO_PARAM: Record<'BASE' | 'DISCOUNT', string> = {
  BASE: 'base',
  DISCOUNT: 'discount',
};

const PARAM_TO_TAB: Record<string, 'BASE' | 'DISCOUNT'> = {
  base: 'BASE',
  discount: 'DISCOUNT',
  base_price: 'BASE',
  policies: 'DISCOUNT',
};

const parseTabParam = (param: string | null): 'BASE' | 'DISCOUNT' => {
  if (!param) return 'BASE';
  const lower = param.toLowerCase().trim();
  return PARAM_TO_TAB[lower] || 'BASE';
};

const STATUS_TO_PARAM: Record<PriceListStatusType, string> = {
  ACTIVE: 'active',
  DRAFT: 'draft',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
};

const PARAM_TO_STATUS: Record<string, PriceListStatusType> = {
  active: 'ACTIVE',
  draft: 'DRAFT',
  inactive: 'INACTIVE',
  expired: 'EXPIRED',
};

const parseStatusParam = (param: string | null): PriceListStatusType | 'ALL' => {
  if (!param) return 'ALL';
  const lower = param.toLowerCase().trim();
  return PARAM_TO_STATUS[lower] || 'ALL';
};

const GROUP_TO_PARAM: Record<string, string> = {
  AGENT_LEVEL_1: 'level1',
  AGENT_LEVEL_2: 'level2',
  RETAIL: 'retail',
};

const PARAM_TO_GROUP: Record<string, string> = {
  level1: 'AGENT_LEVEL_1',
  level2: 'AGENT_LEVEL_2',
  retail: 'RETAIL',
  agent_level_1: 'AGENT_LEVEL_1',
  agent_level_2: 'AGENT_LEVEL_2',
};

const parseGroupParam = (param: string | null): string => {
  if (!param) return 'ALL';
  const lower = param.toLowerCase().trim();
  return PARAM_TO_GROUP[lower] || 'ALL';
};

/** Định dạng ngày hiển thị chuẩn Việt Nam: DD/MM/YYYY */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const PriceListsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Khôi phục trạng thái ban đầu từ URL Search Params (F5 / Bookmark / Share Link)
  const initialTab = parseTabParam(searchParams.get('tab'));
  const initialStatus = parseStatusParam(searchParams.get('status'));
  const initialGroup = parseGroupParam(searchParams.get('group'));
  const initialSearch = searchParams.get('search') || '';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  // Tab cấp cao (Bảng giá cơ sở vs Chính sách chiết khấu sản lượng)
  const [activeTab, setActiveTab] = useState<'BASE' | 'DISCOUNT'>(initialTab);

  // Dữ liệu bảng giá & Phân trang
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Bộ lọc & Tìm kiếm (Debounced)
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  const [selectedStatus, setSelectedStatus] = useState<PriceListStatusType | 'ALL'>(initialStatus);

  // Quản lý dropdown thao tác 3 chấm
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPriceList, setEditingPriceList] = useState<PriceList | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [priceListToClone, setPriceListToClone] = useState<PriceList | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [priceListToDelete, setPriceListToDelete] = useState<PriceList | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Phân quyền người dùng
  const user = getStoredUser();
  const userRoles = user?.roles || [];
  const canManage =
    userRoles.includes('ADMIN') ||
    userRoles.includes('SALES_MANAGER') ||
    userRoles.includes('SALES_REP');

  // Đóng dropdown thao tác khi click ra ngoài
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-menu-dropdown-container')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // Cập nhật query parameters an toàn lên URL mà không reload lại toàn bộ trang
  const updateUrlParams = useCallback(
    (updates: {
      tab?: 'BASE' | 'DISCOUNT';
      status?: PriceListStatusType | 'ALL';
      group?: string;
      search?: string;
      page?: number;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          // 1. Tab hiển thị: ?tab=base | ?tab=discount
          const targetTab = updates.tab !== undefined ? updates.tab : activeTab;
          next.set('tab', TAB_TO_PARAM[targetTab]);

          // 2. Trạng thái: ?status=active | draft | expired | inactive
          const targetStatus = updates.status !== undefined ? updates.status : selectedStatus;
          if (targetStatus && targetStatus !== 'ALL' && STATUS_TO_PARAM[targetStatus]) {
            next.set('status', STATUS_TO_PARAM[targetStatus]);
          } else {
            next.delete('status');
          }

          // 3. Phân nhóm khách hàng: ?group=level1 | level2 | retail
          const targetGroup = updates.group !== undefined ? updates.group : selectedGroup;
          if (targetGroup && targetGroup !== 'ALL' && GROUP_TO_PARAM[targetGroup]) {
            next.set('group', GROUP_TO_PARAM[targetGroup]);
          } else {
            next.delete('group');
          }

          // 4. Tìm kiếm: ?search=...
          const targetSearch = updates.search !== undefined ? updates.search : searchTerm;
          const trimmed = targetSearch.trim();
          if (trimmed) {
            next.set('search', trimmed);
          } else {
            next.delete('search');
          }

          // 5. Phân trang: ?page=...
          const targetPage = updates.page !== undefined ? updates.page : page;
          if (targetPage > 1) {
            next.set('page', String(targetPage));
          } else {
            next.delete('page');
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, activeTab, selectedStatus, selectedGroup, searchTerm, page]
  );

  const isInitialSearchMount = useRef(true);

  // Debounce ô tìm kiếm sau 400ms để tránh giật lag và không spam URL
  useEffect(() => {
    if (isInitialSearchMount.current) {
      isInitialSearchMount.current = false;
      return;
    }

    const handler = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== searchTerm) {
        setSearchTerm(trimmed);
        setPage(1);
        updateUrlParams({ search: trimmed, page: 1 });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput, searchTerm, updateUrlParams]);

  // Lắng nghe thay đổi của URL Search Params (khi F5, bấm link chia sẻ hoặc Back/Forward trên browser)
  useEffect(() => {
    const urlTab = parseTabParam(searchParams.get('tab'));
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }

    const urlStatus = parseStatusParam(searchParams.get('status'));
    if (urlStatus !== selectedStatus) {
      setSelectedStatus(urlStatus);
    }

    const urlGroup = parseGroupParam(searchParams.get('group'));
    if (urlGroup !== selectedGroup) {
      setSelectedGroup(urlGroup);
    }

    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setSearchInput(urlSearch);
    }

    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    if (urlPage !== page) {
      setPage(urlPage);
    }
  }, [searchParams, activeTab, selectedStatus, selectedGroup, searchTerm, page]);

  // Chuyển đổi tab hiển thị
  const handleTabChange = (newTab: 'BASE' | 'DISCOUNT') => {
    setActiveTab(newTab);
    updateUrlParams({ tab: newTab });
  };

  // Thay đổi bộ lọc trạng thái
  const handleStatusChange = (newStatus: PriceListStatusType | 'ALL') => {
    setSelectedStatus(newStatus);
    setPage(1);
    updateUrlParams({ status: newStatus, page: 1 });
  };

  // Thay đổi nhóm khách hàng
  const handleGroupChange = (newGroup: string) => {
    setSelectedGroup(newGroup);
    setPage(1);
    updateUrlParams({ group: newGroup, page: 1 });
  };

  // Chuyển trang
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams({ page: newPage });
  };

  // Đặt lại toàn bộ bộ lọc bảng giá
  const handleResetFilters = useCallback(() => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedGroup('ALL');
    setSelectedStatus('ALL');
    setPage(1);
    updateUrlParams({ search: '', status: 'ALL', group: 'ALL', page: 1 });
  }, [updateUrlParams]);

  // Tải danh sách bảng giá từ Service
  const loadPriceLists = useCallback(async () => {
    try {
      setLoading(true);
      const res = await priceListsService.getPriceLists({
        page,
        limit,
        search: searchTerm,
        customerGroup: selectedGroup === 'ALL' ? undefined : selectedGroup,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
      });

      setPriceLists(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch {
      showToast('error', 'Không thể nạp danh sách bảng giá');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedGroup, selectedStatus]);

  useEffect(() => {
    if (activeTab === 'BASE') {
      loadPriceLists();
    }
  }, [loadPriceLists, activeTab]);

  // Thống kê Metrics Header
  const metrics = useMemo(() => {
    const all = priceLists;
    const activeCount = all.filter((p) => p.status === 'ACTIVE').length;
    const expiredCount = all.filter((p) => p.status === 'EXPIRED').length;
    const draftCount = all.filter((p) => p.status === 'DRAFT').length;
    const inactiveCount = all.filter((p) => p.status === 'INACTIVE').length;

    return {
      totalCount: total,
      activeCount,
      expiredCount,
      draftCount,
      inactiveCount,
    };
  }, [priceLists, total]);

  // Mở modal thêm mới
  const handleOpenCreateModal = () => {
    setEditingPriceList(null);
    setIsViewOnly(false);
    setFormModalOpen(true);
  };

  // Mở modal xem chi tiết
  const handleOpenViewModal = (pl: PriceList) => {
    setEditingPriceList(pl);
    setIsViewOnly(true);
    setFormModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (pl: PriceList) => {
    if (pl.hasOrders) {
      showToast('error', 'Không thể chỉnh sửa bảng giá đã phát sinh đơn hàng');
      return;
    }
    setEditingPriceList(pl);
    setIsViewOnly(false);
    setFormModalOpen(true);
  };

  // Mở modal Clone Version
  const handleOpenCloneModal = (pl: PriceList) => {
    setPriceListToClone(pl);
    setCloneModalOpen(true);
  };

  // Thực hiện Clone Version
  const handleConfirmClone = async (source: PriceList, newName: string, newCode: string) => {
    try {
      await priceListsService.clonePriceList(source.id, {
        name: newName,
        code: newCode,
      });

      showToast('success', 'Nhân bản bảng giá thành công');
      await loadPriceLists();
    } catch {
      showToast('error', 'Nhân bản bảng giá thất bại');
      throw new Error('Clone failed');
    }
  };

  // Lưu biểu mẫu thêm mới hoặc sửa
  const handleFormSubmit = async (payload: CreatePriceListPayload) => {
    try {
      if (editingPriceList) {
        await priceListsService.updatePriceList(editingPriceList.id, payload);
        showToast('success', 'Cập nhật bảng giá thành công');
      } else {
        await priceListsService.createPriceList(payload);
        showToast('success', 'Tạo mới bảng giá thành công');
      }
      await loadPriceLists();
    } catch {
      showToast('error', 'Không thể lưu bảng giá');
      throw new Error('Submit failed');
    }
  };

  // Xác nhận xóa bảng giá
  const handlePromptDelete = (pl: PriceList) => {
    if (pl.hasOrders) {
      showToast('error', 'Không thể xóa bảng giá đã phát sinh đơn hàng');
      return;
    }
    setPriceListToDelete(pl);
    setDeleteModalOpen(true);
  };

  // Thực hiện xóa
  const handleConfirmDelete = async () => {
    if (!priceListToDelete) return;
    try {
      setDeleting(true);
      await priceListsService.deletePriceList(priceListToDelete.id);
      showToast('success', 'Xóa bảng giá thành công');
      setDeleteModalOpen(false);
      setPriceListToDelete(null);
      await loadPriceLists();
    } catch {
      showToast('error', 'Không thể xóa bảng giá');
    } finally {
      setDeleting(false);
    }
  };

  // Xuất chi tiết một bảng giá ra tệp CSV (Excel UTF-8 BOM)
  const handleExportPriceList = (pl: PriceList) => {
    try {
      const headers = ['STT', 'Mã SKU', 'Tên sản phẩm', 'ĐVT', 'Giá sàn (VNĐ)', 'Giá bán áp dụng (VNĐ)'];
      const rows = (pl.items || []).map((it, idx) => [
        idx + 1,
        `"${it.productCode}"`,
        `"${(it.productName || '').replace(/"/g, '""')}"`,
        `"${it.baseUnit || 'Cái'}"`,
        it.minPrice ?? 0,
        it.price ?? 0,
      ]);

      const csvContent =
        '\uFEFF' +
        `BẢNG GIÁ: ${pl.name}\r\n` +
        `Mã bảng giá: ${pl.code} | Phiên bản: v${pl.version}.0 | Nhóm khách hàng: ${pl.customerGroup}\r\n` +
        `Thời gian áp dụng: ${pl.startDate} đến ${pl.endDate} | Trạng thái: ${pl.status}\r\n\r\n` +
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bang_Gia_${pl.code}_v${pl.version}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', `Đã xuất bảng giá "${pl.name}" thành công`);
    } catch {
      showToast('error', 'Không thể xuất dữ liệu bảng giá');
    }
  };

  // Xuất toàn bộ danh sách bảng giá ra CSV
  const handleExportAllPriceLists = () => {
    try {
      if (priceLists.length === 0) {
        showToast('warning', 'Không có bảng giá nào để xuất');
        return;
      }

      const headers = ['STT', 'Mã bảng giá', 'Tên bảng giá', 'Nhóm khách hàng', 'Phiên bản', 'Số mặt hàng', 'Từ ngày', 'Đến ngày', 'Trạng thái', 'Đã có đơn'];
      const rows = priceLists.map((p, idx) => [
        idx + 1,
        `"${p.code}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${p.customerGroup}"`,
        `"v${p.version}.0"`,
        p.items?.length || 0,
        `"${p.startDate}"`,
        `"${p.endDate}"`,
        `"${p.status}"`,
        p.hasOrders ? 'Có' : 'Chưa',
      ]);

      const csvContent =
        '\uFEFF' +
        'DANH SÁCH BẢNG GIÁ B2B\r\n' +
        `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Tổng số: ${priceLists.length} bảng giá\r\n\r\n` +
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Danh_Sach_Bang_Gia_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', 'Đã xuất danh sách bảng giá thành công');
    } catch {
      showToast('error', 'Không thể xuất danh sách bảng giá');
    }
  };

  // Render Badge Nhóm khách hàng
  const renderCustomerGroupBadge = (group: CustomerGroupType) => {
    switch (group) {
      case 'AGENT_LEVEL_1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/20">
            Đại lý Cấp 1
          </span>
        );
      case 'AGENT_LEVEL_2':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-700/20">
            Đại lý Cấp 2
          </span>
        );
      case 'RETAIL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-700/20">
            Bán lẻ Niêm yết
          </span>
        );
    }
  };

  // Render Badge Trạng thái
  const renderStatusBadge = (status: PriceListStatusType) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Đang hiệu lực
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Bản nháp
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Tạm dừng
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Đã hết hạn
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* High-level Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 text-sm mb-4">
        <button
          type="button"
          onClick={() => handleTabChange('BASE')}
          className={`px-4 py-2 rounded-t-xl font-semibold transition-all whitespace-nowrap cursor-pointer border-b-2 ${
            activeTab === 'BASE'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Bảng giá Cơ sở
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('DISCOUNT')}
          className={`px-4 py-2 rounded-t-xl font-semibold transition-all whitespace-nowrap cursor-pointer border-b-2 ${
            activeTab === 'DISCOUNT'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Chính sách Chiết khấu sản lượng
        </button>
      </div>

      {activeTab === 'BASE' ? (
        <>
          {/* 2. Metrics Header: Hiển thị linh hoạt theo trạng thái được chọn */}
          <div
            className={`grid gap-4 ${
              selectedStatus === 'ALL' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 max-w-sm'
            }`}
          >
            {/* Card 1: Tổng số bảng giá (Chỉ hiển thị khi chọn Tất cả Trạng thái) */}
            {selectedStatus === 'ALL' && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/10 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {metrics.totalCount}
                  </div>
                  <div className="text-xs font-medium text-slate-500">Tổng số bảng giá</div>
                </div>
              </div>
            )}

            {/* Card 2: Đang hiệu lực */}
            {(selectedStatus === 'ALL' || selectedStatus === 'ACTIVE') && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/10 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-emerald-700 tracking-tight">
                    {metrics.activeCount}
                  </div>
                  <div className="text-xs font-medium text-slate-500">Đang hiệu lực</div>
                </div>
              </div>
            )}

            {/* Card 3: Bản nháp */}
            {(selectedStatus === 'ALL' || selectedStatus === 'DRAFT') && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/10 shrink-0">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-amber-700 tracking-tight">
                    {metrics.draftCount}
                  </div>
                  <div className="text-xs font-medium text-slate-500">Bản nháp</div>
                </div>
              </div>
            )}

            {/* Card 4: Đã hết hạn */}
            {(selectedStatus === 'ALL' || selectedStatus === 'EXPIRED') && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-500/10 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-rose-700 tracking-tight">
                    {metrics.expiredCount}
                  </div>
                  <div className="text-xs font-medium text-slate-500">Đã hết hạn</div>
                </div>
              </div>
            )}

            {/* Card 5: Tạm dừng (nếu lọc riêng INACTIVE) */}
            {selectedStatus === 'INACTIVE' && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/10 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-amber-700 tracking-tight">
                    {metrics.inactiveCount}
                  </div>
                  <div className="text-xs font-medium text-slate-500">Tạm dừng</div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Filter Toolbar: Tabs nhóm khách hàng, Search Box, Dropdown Trạng thái */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-4">
            {/* Tabs Nhóm khách hàng */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 text-xs">
              {CUSTOMER_GROUP_TABS.map((tab) => {
                const isActive = selectedGroup === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleGroupChange(tab.key)}
                    className={`px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Ô Tìm kiếm theo tên / mã */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm theo mã bảng giá, tên bảng giá hoặc ghi chú..."
                  className="w-full pl-9.5 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearchTerm('');
                      setPage(1);
                      updateUrlParams({ search: '', page: 1 });
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Lọc Trạng thái (Việt hóa hoàn toàn, không có từ tiếng Anh trong ngoặc) */}
              <div className="sm:w-44">
                <select
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value as PriceListStatusType | 'ALL')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="ALL">Tất cả Trạng thái</option>
                  <option value="ACTIVE">Đang hiệu lực</option>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="INACTIVE">Tạm dừng</option>
                  <option value="EXPIRED">Đã hết hạn</option>
                </select>
              </div>

              {/* Nút Làm mới */}
              <button
                type="button"
                onClick={loadPriceLists}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shrink-0 disabled:opacity-50"
                title="Tải lại danh sách"
              >
                <RefreshCw
                  className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin text-blue-600' : ''}`}
                />
                <span className="hidden sm:inline">Làm mới</span>
              </button>

              {/* Nút Bỏ lọc nếu có bộ lọc */}
              {(searchTerm || selectedStatus !== 'ALL' || selectedGroup !== 'ALL') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100/60 active:scale-[0.98] transition-all cursor-pointer shrink-0"
                  title="Đặt lại toàn bộ bộ lọc"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
                  <span>Bỏ lọc</span>
                </button>
              )}

              {/* Nút Xuất danh sách bảng giá ra CSV / Excel */}
              <button
                type="button"
                onClick={handleExportAllPriceLists}
                disabled={priceLists.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shrink-0 disabled:opacity-50"
                title="Xuất danh sách bảng giá ra tệp CSV/Excel"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">Xuất danh sách</span>
              </button>

              {/* Nút Thêm mới bảng giá */}
              {canManage && (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm mới bảng giá</span>
                </button>
              )}
            </div>

            {/* Thông tin kết quả tìm kiếm và bộ lọc đang áp dụng */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 font-medium pt-2 border-t border-slate-100 gap-1.5">
              <div>
                Hiển thị <strong className="text-slate-900 font-semibold">{priceLists.length}</strong> /{' '}
                {total} bảng giá
              </div>
              {(searchTerm || selectedStatus !== 'ALL' || selectedGroup !== 'ALL') && (
                <div className="text-[11px] text-blue-600 font-medium">
                  Đang lọc URL: {selectedStatus !== 'ALL' && `Trạng thái: ${selectedStatus} `}
                  {selectedGroup !== 'ALL' && `• Nhóm: ${selectedGroup} `}
                  {searchTerm && `• Từ khóa: "${searchTerm}"`}
                </div>
              )}
            </div>
          </div>

          {/* 4. Table: Danh sách Bảng giá */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div
              className="overflow-auto max-h-[calc(100vh-270px)] relative [scrollbar-width:thin] [scrollbar-color:#E5E7EB_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#E5E7EB] hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}
            >
              <table className="w-full text-left text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="sticky top-0 left-0 z-30 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-12 min-w-12 text-center">
                      STT
                    </th>
                    <th className="sticky top-0 left-12 z-30 bg-slate-50 border-b border-slate-200/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] py-3 px-4 min-w-[180px]">
                      Mã & Phiên bản
                    </th>
                    <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 min-w-[220px]">
                      Tên Bảng giá
                    </th>
                    <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-36">
                      Nhóm áp dụng
                    </th>
                    <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-44">
                      Thời gian hiệu lực
                    </th>
                    <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-32">
                      Trạng thái
                    </th>
                    <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-40 text-center">
                      Ràng buộc Đơn hàng
                    </th>
                    <th className="sticky top-0 right-0 z-30 bg-slate-50 border-b border-slate-200/80 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.08)] py-3 px-4 w-20 min-w-20 text-center">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <PriceListsTableSkeleton count={6} />
                  ) : priceLists.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-slate-400 border-b border-slate-100"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-600 text-sm">
                            Không tìm thấy bảng giá nào
                          </p>
                          <p className="text-xs text-slate-400">
                            Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc nhóm khách hàng
                            / trạng thái.
                          </p>
                          {(searchTerm || selectedGroup !== 'ALL' || selectedStatus !== 'ALL') && (
                            <button
                              type="button"
                              onClick={handleResetFilters}
                              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span>Đặt lại bộ lọc</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    priceLists.map((pl, idx) => {
                      const isLocked = pl.hasOrders;

                      return (
                        <tr key={pl.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* STT */}
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/95 transition-colors border-b border-slate-100 py-3.5 px-4 text-center text-slate-400 font-mono text-[11px] w-12 min-w-12">
                            {(page - 1) * limit + idx + 1}
                          </td>

                          {/* 1. Mã bảng giá & Badge Version (Chỉ hiện badge từ v2 trở đi) */}
                          <td className="sticky left-12 z-10 bg-white group-hover:bg-slate-50/95 transition-colors shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] border-b border-slate-100 py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {pl.code}
                              </span>
                              {pl.version > 1 && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200/60 cursor-help"
                                  title={`Phiên bản v${pl.version}.0 nhân bản từ v${pl.version - 1}.0`}
                                >
                                  v{pl.version}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Tên bảng giá (Chỉ hiển thị duy nhất tên bảng giá) */}
                          <td className="border-b border-slate-100 py-3.5 px-4">
                            <div className="font-semibold text-slate-900 leading-snug">
                              {pl.name}
                            </div>
                          </td>

                          {/* 3. Nhóm áp dụng */}
                          <td className="border-b border-slate-100 py-3.5 px-4">
                            {renderCustomerGroupBadge(pl.customerGroup)}
                          </td>

                          {/* 4. Thời gian hiệu lực: DD/MM/YYYY - DD/MM/YYYY */}
                          <td className="border-b border-slate-100 py-3.5 px-4 text-slate-600 font-medium">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {formatDate(pl.startDate)} - {formatDate(pl.endDate)}
                              </span>
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td className="border-b border-slate-100 py-3.5 px-4">
                            {renderStatusBadge(pl.status)}
                          </td>

                          {/* Ràng buộc đơn hàng */}
                          <td className="border-b border-slate-100 py-3.5 px-4 text-center">
                            {isLocked ? (
                              <div
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold ring-1 ring-inset ring-amber-600/30"
                                title="Bảng giá này đã có đơn hàng. Khóa sửa trực tiếp, hỗ trợ Clone Version."
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Đã có đơn hàng</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-[11px] font-medium ring-1 ring-inset ring-slate-300/40">
                                <Unlock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Chưa có đơn</span>
                              </div>
                            )}
                          </td>

                          {/* 5. Cột Thao tác: Nút 3 chấm ⋮ duy nhất với Smart Dropdown Menu (Dropup) */}
                          <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50/95 transition-colors shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.08)] border-b border-slate-100 py-3.5 px-4 text-center w-20 min-w-20">
                            <div className="relative inline-block text-left action-menu-dropdown-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenuId(openActionMenuId === pl.id ? null : pl.id);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Thao tác"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openActionMenuId === pl.id &&
                                (() => {
                                  // Smart Placement: Mở ngược lên trên nếu dòng ở nửa dưới bảng hoặc 2 dòng cuối
                                  const isDropUp =
                                    idx >= Math.max(1, priceLists.length - 2) ||
                                    (priceLists.length > 3 &&
                                      idx >= Math.floor(priceLists.length / 2));
                                  return (
                                    <div
                                      className={`absolute right-0 ${
                                        isDropUp
                                          ? 'bottom-full mb-1 origin-bottom-right'
                                          : 'top-full mt-1 origin-top-right'
                                      } w-44 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 text-left`}
                                    >
                                      {/* 1. Xem chi tiết */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          handleOpenViewModal(pl);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                      >
                                        <Eye className="w-4 h-4 text-slate-500" />
                                        <span>Xem chi tiết</span>
                                      </button>

                                      {/* 2. Chỉnh sửa */}
                                      {canManage && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionMenuId(null);
                                            handleOpenEditModal(pl);
                                          }}
                                          disabled={isLocked}
                                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors ${
                                            isLocked
                                              ? 'text-slate-300 cursor-not-allowed bg-slate-50/50'
                                              : 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                                          }`}
                                          title={
                                            isLocked
                                              ? 'Bảng giá đã có đơn hàng - Không thể sửa trực tiếp (Vui lòng nhân bản)'
                                              : 'Chỉnh sửa bảng giá'
                                          }
                                        >
                                          <Edit2 className="w-4 h-4 text-amber-500" />
                                          <span>Chỉnh sửa</span>
                                        </button>
                                      )}

                                      {/* 3. Nhân bản */}
                                      {canManage && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionMenuId(null);
                                            handleOpenCloneModal(pl);
                                          }}
                                          className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                        >
                                          <Copy className="w-4 h-4 text-blue-500" />
                                          <span>Nhân bản (Copy)</span>
                                        </button>
                                      )}

                                      {/* 4. Xuất bảng giá (Excel / CSV) */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          handleExportPriceList(pl);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                        title="Xuất chi tiết các mặt hàng của bảng giá ra tệp CSV"
                                      >
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                        <span>Xuất bảng giá</span>
                                      </button>

                                      {/* 5. Xóa */}
                                      {canManage && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionMenuId(null);
                                            handlePromptDelete(pl);
                                          }}
                                          disabled={isLocked}
                                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors ${
                                            isLocked
                                              ? 'text-slate-300 cursor-not-allowed bg-slate-50/50'
                                              : 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                                          }`}
                                          title={
                                            isLocked
                                              ? 'Bảng giá đã có đơn hàng - Không thể xóa để bảo toàn dữ liệu'
                                              : 'Xóa bảng giá'
                                          }
                                        >
                                          <Trash2 className="w-4 h-4 text-rose-500" />
                                          <span>Xóa</span>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 6. Phân trang & Chọn số dòng/trang */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-500">
              <div>
                Hiển thị <strong>{priceLists.length}</strong> trên tổng số <strong>{total}</strong>{' '}
                bảng giá
              </div>

              <div className="flex items-center gap-3">
                {/* Select box chọn số dòng/trang */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Số dòng/trang:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      handlePageChange(1);
                    }}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value={10}>10 dòng/trang</option>
                    <option value={20}>20 dòng (Chuẩn)</option>
                    <option value={50}>50 dòng/trang</option>
                    <option value={100}>100 dòng/trang</option>
                  </select>
                </div>

                {/* Nút chuyển trang */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-2 font-medium">
                    Trang {page} / {totalPages || 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Modal Khai báo & Chỉnh sửa Bảng giá */}
          <PriceListFormModal
            isOpen={formModalOpen}
            onClose={() => setFormModalOpen(false)}
            onSubmit={handleFormSubmit}
            onClone={handleOpenCloneModal}
            onToast={(type, title, message) => showToast(type, title || message)}
            initialData={editingPriceList}
            isReadOnly={isViewOnly}
          />

          {/* 6. Modal Nhân bản Bảng giá (Clone Version) */}
          <PriceListCloneModal
            isOpen={cloneModalOpen}
            onClose={() => setCloneModalOpen(false)}
            onConfirm={handleConfirmClone}
            priceList={priceListToClone}
          />

          {/* 7. Modal Xác nhận Xóa */}
          <ConfirmDeleteModal
            isOpen={deleteModalOpen && Boolean(priceListToDelete)}
            onCancel={() => {
              setDeleteModalOpen(false);
              setPriceListToDelete(null);
            }}
            onConfirm={handleConfirmDelete}
            title="Xác nhận xóa Bảng giá"
            itemName={priceListToDelete?.name}
            itemCode={priceListToDelete?.code}
            message={
              priceListToDelete ? (
                <p>
                  Bạn có chắc chắn muốn xóa bảng giá{' '}
                  <strong className="text-slate-900 font-bold">
                    &quot;{priceListToDelete.name}&quot;
                  </strong>{' '}
                  [{priceListToDelete.code}] không?
                </p>
              ) : undefined
            }
            warningText="Thao tác này mang tính vĩnh viễn và không thể hoàn tác sau khi thực hiện."
            confirmText="Đồng ý xóa"
            cancelText="Hủy bỏ"
            isDeleting={deleting}
          />
        </>
      ) : (
        <DiscountPoliciesTab />
      )}
    </div>
  );
};
