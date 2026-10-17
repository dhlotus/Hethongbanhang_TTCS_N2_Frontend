import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
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
  ChevronDown,
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
import { Pagination } from '../components/pagination';
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

  // Quản lý dropdown thao tác
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    top: number;
    right: number;
    isDropUp: boolean;
  } | null>(null);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPriceList, setEditingPriceList] = useState<PriceList | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [priceListToClone, setPriceListToClone] = useState<PriceList | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [priceListToDelete, setPriceListToDelete] = useState<PriceList | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal xác nhận xuất Excel
  const [exportModalConfig, setExportModalConfig] = useState<{
    isOpen: boolean;
    type: 'ALL' | 'SINGLE';
    priceList?: PriceList | null;
  }>({
    isOpen: false,
    type: 'ALL',
    priceList: null,
  });

  // Phân quyền người dùng: Chỉ ADMIN và SALES_MANAGER có quyền quản trị/tạo mới
  // Nhân viên kinh doanh (SALES_REP) chỉ có quyền xem
  const user = getStoredUser();
  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const canManage =
    userRoles.includes('ADMIN') ||
    userRoles.includes('SALES_MANAGER');

  // Đóng dropdown thao tác khi click ra ngoài, cuộn trang hoặc thay đổi kích thước
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (
        !(e.target as HTMLElement).closest('.action-menu-dropdown-container') &&
        !(e.target as HTMLElement).closest('.action-portal-menu')
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

    // Chỉ đồng bộ state bộ lọc của Bảng giá cơ sở khi đang đứng ở tab BASE
    if (urlTab === 'BASE') {
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
    }
  }, [searchParams, activeTab, selectedStatus, selectedGroup, searchTerm, page]);

  // Chuyển đổi tab hiển thị
  const handleTabChange = (newTab: 'BASE' | 'DISCOUNT') => {
    setActiveTab(newTab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', TAB_TO_PARAM[newTab]);
        return next;
      },
      { replace: true }
    );
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

  // Lắng nghe sự kiện tạo đơn hoặc cập nhật bảng giá thời gian thực để cập nhật Ràng buộc đơn hàng
  useEffect(() => {
    const handleSync = () => {
      if (activeTab === 'BASE') {
        void loadPriceLists();
      }
    };
    window.addEventListener('loha_order_created', handleSync);
    window.addEventListener('loha_price_lists_updated', handleSync);
    return () => {
      window.removeEventListener('loha_order_created', handleSync);
      window.removeEventListener('loha_price_lists_updated', handleSync);
    };
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

  // Helper hiển thị tên tiếng Việt nhóm khách hàng
  const getCustomerGroupName = (group?: CustomerGroupType | string) => {
    switch (group) {
      case 'AGENT_LEVEL_1':
        return 'Đại lý Cấp 1';
      case 'AGENT_LEVEL_2':
        return 'Đại lý Cấp 2';
      case 'RETAIL':
        return 'Bán lẻ Niêm yết';
      case 'WHOLESALE':
        return 'Bán buôn';
      default:
        return group || 'Tất cả Nhóm';
    }
  };

  // Helper hiển thị tên tiếng Việt trạng thái
  const getStatusName = (status: PriceListStatusType) => {
    switch (status) {
      case 'ACTIVE':
        return 'Đang hiệu lực';
      case 'DRAFT':
        return 'Bản nháp';
      case 'INACTIVE':
        return 'Tạm dừng';
      case 'EXPIRED':
        return 'Đã hết hạn';
      default:
        return status;
    }
  };

  // Xuất chi tiết một bảng giá ra tệp Excel (.xlsx)
  const handleExportPriceList = (pl: PriceList) => {
    try {
      const items = pl.items || [];
      const aoaData: (string | number)[][] = [
        ['CHI TIẾT BẢNG GIÁ B2B - LOHA SALES'],
        [`Tên bảng giá: ${pl.name} | Mã: ${pl.code} | Phiên bản: v${pl.version}.0`],
        [
          `Nhóm áp dụng: ${getCustomerGroupName(pl.customerGroup)} | Trạng thái: ${getStatusName(
            pl.status
          )} | Thời gian: ${formatDate(pl.startDate)} – ${formatDate(pl.endDate)} | Tổng số mặt hàng: ${items.length}`,
        ],
        [],
        ['STT', 'Mã SKU', 'Tên sản phẩm', 'ĐVT', 'Giá sàn (VNĐ)', 'Giá bán áp dụng (VNĐ)'],
        ...items.map((it, idx) => [
          idx + 1,
          it.productCode || '',
          it.productName || '',
          it.baseUnit || 'Cái',
          it.minPrice ?? 0,
          it.price ?? 0,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoaData);

      // Cấu hình độ rộng ô cho các cột rõ ràng, chuẩn lưới bảng Excel
      ws['!cols'] = [
        { wch: 8 },  // STT
        { wch: 18 }, // Mã SKU
        { wch: 40 }, // Tên sản phẩm
        { wch: 12 }, // ĐVT
        { wch: 20 }, // Giá sàn (VNĐ)
        { wch: 24 }, // Giá bán áp dụng (VNĐ)
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Bang_Gia_${pl.code}`.slice(0, 31));

      XLSX.writeFile(wb, `Bang_Gia_${pl.code}_v${pl.version}.xlsx`);

      showToast('success', `Đã xuất bảng giá "${pl.name}" ra tệp Excel thành công`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Không thể xuất dữ liệu bảng giá');
    }
  };

  // Xuất toàn bộ danh sách bảng giá ra tệp Excel (.xlsx)
  const handleExportAllPriceLists = () => {
    try {
      if (priceLists.length === 0) {
        showToast('warning', 'Không có bảng giá nào để xuất');
        return;
      }

      const aoaData: (string | number)[][] = [
        ['DANH SÁCH BẢNG GIÁ B2B - LOHA SALES'],
        [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Tổng số: ${priceLists.length} bảng giá`],
        [],
        [
          'STT',
          'Mã bảng giá',
          'Tên bảng giá',
          'Nhóm áp dụng',
          'Phiên bản',
          'Số mặt hàng',
          'Từ ngày',
          'Đến ngày',
          'Trạng thái',
          'Ràng buộc đơn hàng',
        ],
        ...priceLists.map((p, idx) => [
          idx + 1,
          p.code || '',
          p.name || '',
          getCustomerGroupName(p.customerGroup),
          `v${p.version}.0`,
          p.items?.length || 0,
          formatDate(p.startDate),
          formatDate(p.endDate),
          getStatusName(p.status),
          p.hasOrders ? 'Đã có đơn hàng' : 'Chưa có đơn',
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoaData);

      // Cấu hình độ rộng ô cho các cột rõ ràng, chuẩn lưới bảng Excel
      ws['!cols'] = [
        { wch: 8 },  // STT
        { wch: 18 }, // Mã bảng giá
        { wch: 40 }, // Tên bảng giá
        { wch: 22 }, // Nhóm áp dụng
        { wch: 14 }, // Phiên bản
        { wch: 16 }, // Số mặt hàng
        { wch: 16 }, // Từ ngày
        { wch: 16 }, // Đến ngày
        { wch: 20 }, // Trạng thái
        { wch: 22 }, // Ràng buộc đơn hàng
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Bang_Gia');

      XLSX.writeFile(
        wb,
        `Danh_Sach_Bang_Gia_${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      showToast('success', 'Đã xuất danh sách bảng giá ra tệp Excel thành công');
    } catch (err) {
      console.error(err);
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

          {/* 3. Filter Toolbar: Search Box, Dropdown Nhóm khách hàng, Dropdown Trạng thái */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Ô Tìm kiếm theo tên / mã */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm theo mã bảng giá, tên bảng giá hoặc ghi chú..."
                  className="w-full h-[38px] pl-9.5 pr-8 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
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

              {/* Lọc Nhóm khách hàng (Select option) */}
              <div className="sm:w-48">
                <select
                  value={selectedGroup}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full h-[38px] px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-2xs"
                >
                  {CUSTOMER_GROUP_TABS.map((tab) => (
                    <option key={tab.key} value={tab.key}>
                      {tab.key === 'ALL' ? 'Tất cả Nhóm khách hàng' : tab.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lọc Trạng thái (Việt hóa hoàn toàn, không có từ tiếng Anh trong ngoặc) */}
              <div className="sm:w-44">
                <select
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value as PriceListStatusType | 'ALL')}
                  className="w-full h-[38px] px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">Tất cả Trạng thái</option>
                  <option value="ACTIVE">Đang hiệu lực</option>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="INACTIVE">Tạm dừng</option>
                  <option value="EXPIRED">Đã hết hạn</option>
                </select>
              </div>

              {/* Nút Bỏ lọc nếu có bộ lọc */}
              {(searchTerm || selectedStatus !== 'ALL' || selectedGroup !== 'ALL') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center justify-center gap-1.5 h-[38px] rounded-lg border border-rose-200 bg-rose-50/50 px-3.5 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100/60 active:scale-[0.98] transition-all cursor-pointer shrink-0"
                  title="Đặt lại toàn bộ bộ lọc"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
                  <span>Bỏ lọc</span>
                </button>
              )}

              {/* Nút Xuất danh sách bảng giá ra Excel - mở Modal hỏi xác nhận */}
              <button
                type="button"
                onClick={() => setExportModalConfig({ isOpen: true, type: 'ALL', priceList: null })}
                disabled={priceLists.length === 0}
                className="inline-flex items-center justify-center gap-1.5 h-[38px] rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-emerald-700 active:scale-[0.98] transition-all cursor-pointer shrink-0 disabled:opacity-50"
                title="Xuất danh sách bảng giá ra tệp Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">Xuất danh sách</span>
              </button>

              {/* Nút Thêm mới bảng giá */}
              {canManage && (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center justify-center gap-1.5 h-[38px] rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm mới bảng giá</span>
                </button>
              )}
            </div>

            {/* Thông tin bộ lọc đang áp dụng (Việt hóa hoàn toàn) */}
            {(searchTerm || selectedStatus !== 'ALL' || selectedGroup !== 'ALL') && (
              <div className="flex items-center text-xs text-blue-600 font-medium pt-2 border-t border-slate-100 gap-1.5">
                <span>Đang lọc:</span>
                {selectedStatus !== 'ALL' && (
                  <span>Trạng thái: {getStatusName(selectedStatus as PriceListStatusType)} • </span>
                )}
                {selectedGroup !== 'ALL' && (
                  <span>Nhóm: {getCustomerGroupName(selectedGroup)} • </span>
                )}
                {searchTerm && <span>Từ khóa: &quot;{searchTerm}&quot;</span>}
              </div>
            )}
          </div>

          {/* 4. Table: Danh sách Bảng giá */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm divide-y divide-slate-100">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left w-[15%]">
                      Mã bảng giá
                    </th>
                    <th className="px-4 py-3 text-left w-[28%]">
                      Tên bảng giá
                    </th>
                    <th className="px-4 py-3 text-left w-[15%]">
                      Nhóm áp dụng
                    </th>
                    <th className="px-4 py-3 text-left w-[18%]">
                      Thời gian hiệu lực
                    </th>
                    <th className="px-4 py-3 text-center w-[12%]">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-center w-[12%]">
                      Ràng buộc đơn
                    </th>
                    <th className="px-4 py-3 text-right w-[10%] min-w-[105px]">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody
                  className={`divide-y divide-slate-100/90 transition-opacity duration-150 ${
                    loading ? 'opacity-60 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  {loading ? (
                    <PriceListsTableSkeleton count={6} />
                  ) : priceLists.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
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
                    priceLists.map((pl) => {
                      const isLocked = pl.hasOrders;

                      return (
                        <tr key={pl.id} className="hover:bg-indigo-50/25 transition-colors group">
                          {/* 1. Mã bảng giá: Hiển thị badge monospace chuẩn Quản lý đại lý, đã bỏ badge phiên bản */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2.5 py-1 rounded-md shadow-2xs group-hover:border-blue-300">
                              <FileSpreadsheet className="w-3 h-3 text-blue-500" />
                              <span>{pl.code}</span>
                            </span>
                          </td>

                          {/* 2. Tên bảng giá */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-800 line-clamp-1 text-sm">
                              {pl.name}
                            </div>
                            {pl.description && (
                              <div
                                className="text-xs text-slate-400 truncate max-w-sm mt-0.5"
                                title={pl.description}
                              >
                                {pl.description}
                              </div>
                            )}
                          </td>

                          {/* 3. Nhóm áp dụng */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {renderCustomerGroupBadge(pl.customerGroup)}
                          </td>

                          {/* 4. Thời gian hiệu lực: DD/MM/YYYY - DD/MM/YYYY */}
                          <td className="px-4 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {formatDate(pl.startDate)} – {formatDate(pl.endDate)}
                              </span>
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            {renderStatusBadge(pl.status)}
                          </td>

                          {/* Ràng buộc đơn hàng */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            {isLocked ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200/60"
                                title="Bảng giá này đã có đơn hàng. Khóa sửa trực tiếp, hỗ trợ Clone Version."
                              >
                                <Lock className="w-3 h-3 text-amber-600" />
                                <span>Có đơn</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200/60">
                                <Unlock className="w-3 h-3 text-slate-400" />
                                <span>Chưa có</span>
                              </span>
                            )}
                          </td>

                          {/* 5. Cột Thao tác */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="relative inline-flex items-center justify-end action-menu-dropdown-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (openActionMenuId === pl.id) {
                                    setOpenActionMenuId(null);
                                    setActionMenuAnchor(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const shouldDropUp = spaceBelow < 260 && rect.top > 260;
                                    setActionMenuAnchor({
                                      top: shouldDropUp ? rect.top - 4 : rect.bottom + 4,
                                      right: window.innerWidth - rect.right,
                                      isDropUp: shouldDropUp,
                                    });
                                    setOpenActionMenuId(pl.id);
                                  }
                                }}
                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none whitespace-nowrap shrink-0 ${
                                  openActionMenuId === pl.id
                                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs ring-2 ring-blue-500/10'
                                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-300'
                                }`}
                                title="Thao tác"
                              >
                                <span className="whitespace-nowrap">Thao tác</span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                                    openActionMenuId === pl.id ? 'rotate-180 text-blue-600' : ''
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

            {/* Dropdown Menu Portal Thao tác: không bị tràn hay cắt bởi container */}
            {openActionMenuId && actionMenuAnchor && typeof document !== 'undefined' && (() => {
              const pl = priceLists.find((item) => item.id === openActionMenuId);
              if (!pl) return null;
              const isLocked = pl.hasOrders;
              return createPortal(
                <div
                  className="price-list-action-portal-menu action-portal-menu fixed w-52 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-[9999] animate-in fade-in zoom-in-95 text-left divide-y divide-slate-100"
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
                        handleOpenViewModal(pl);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                    >
                      <Eye className="w-4 h-4 text-slate-400" />
                      <span>Xem chi tiết</span>
                    </button>

                    {/* 2. Chỉnh sửa */}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionMenuAnchor(null);
                          handleOpenEditModal(pl);
                        }}
                        disabled={isLocked}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors font-medium ${
                          isLocked
                            ? 'text-slate-300 cursor-not-allowed bg-slate-50/50'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-amber-600 cursor-pointer'
                        }`}
                        title={
                          isLocked
                            ? 'Bảng giá đã có đơn hàng - Không thể sửa trực tiếp (Vui lòng nhân bản)'
                            : 'Chỉnh sửa bảng giá'
                        }
                      >
                        <Edit2
                          className={`w-4 h-4 ${
                            isLocked ? 'text-slate-300' : 'text-amber-500'
                          }`}
                        />
                        <span>Chỉnh sửa</span>
                      </button>
                    )}

                    {/* 3. Nhân bản */}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionMenuAnchor(null);
                          handleOpenCloneModal(pl);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                      >
                        <Copy className="w-4 h-4 text-indigo-500" />
                        <span>Nhân bản (Copy)</span>
                      </button>
                    )}

                    {/* 4. Xuất bảng giá (Excel) */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionMenuId(null);
                        setActionMenuAnchor(null);
                        setExportModalConfig({ isOpen: true, type: 'SINGLE', priceList: pl });
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                      title="Xuất chi tiết các mặt hàng của bảng giá ra tệp Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Xuất bảng giá</span>
                    </button>
                  </div>

                  {/* 5. Xóa */}
                  {canManage && (
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionMenuAnchor(null);
                          handlePromptDelete(pl);
                        }}
                        disabled={isLocked}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors font-medium ${
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
                        <Trash2
                          className={`w-4 h-4 ${
                            isLocked ? 'text-slate-300' : 'text-rose-500'
                          }`}
                        />
                        <span>Xóa bảng giá</span>
                      </button>
                    </div>
                  )}
                </div>,
                document.body
              );
            })()}

            {/* 6. Thanh phân trang gắn liền chân bảng chuẩn Quản lý đại lý */}
            {total > 0 && (
              <Pagination
                variant="default"
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={limit}
                pageSizeOptions={[10, 20, 50]}
                itemLabel="bảng giá"
                showRecordRange={false}
                showFirstLast={false}
                onPageChange={(newPage) => handlePageChange(newPage)}
                onPageSizeChange={(newSize) => {
                  setLimit(newSize);
                  handlePageChange(1);
                }}
              />
            )}
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

          {/* 8. Modal Xác nhận Xuất Excel chuẩn UI_GUIDELINES */}
          {exportModalConfig.isOpen &&
            createPortal(
              <div
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setExportModalConfig({ isOpen: false, type: 'ALL', priceList: null });
                  }
                }}
                className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
              >
                <div
                  className="w-full max-w-md bg-white rounded-xl border border-slate-200/90 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Xác nhận xuất tệp Excel
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {exportModalConfig.type === 'ALL'
                            ? 'Xuất danh sách bảng giá'
                            : 'Xuất chi tiết mặt hàng bảng giá'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExportModalConfig({ isOpen: false, type: 'ALL', priceList: null })}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Đóng"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3.5 rounded-lg border border-slate-100 space-y-1.5">
                    {exportModalConfig.type === 'ALL' ? (
                      <p>
                        Bạn có chắc chắn muốn xuất toàn bộ{' '}
                        <strong className="text-slate-900 font-bold">{priceLists.length}</strong> bảng giá
                        đang hiển thị ra tệp Excel (<span className="font-mono text-emerald-700 font-semibold">.xlsx</span>) không?
                      </p>
                    ) : (
                      <p>
                        Bạn có chắc chắn muốn xuất chi tiết bảng giá{' '}
                        <strong className="text-slate-900 font-bold">&quot;{exportModalConfig.priceList?.name}&quot;</strong>{' '}
                        [<span className="font-mono text-blue-700 font-semibold">{exportModalConfig.priceList?.code}</span>] gồm{' '}
                        <strong className="text-slate-900 font-bold">{exportModalConfig.priceList?.items?.length || 0}</strong> mặt hàng
                        ra tệp Excel (<span className="font-mono text-emerald-700 font-semibold">.xlsx</span>) không?
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400">
                      Tệp Excel sau khi xuất có thể mở trực tiếp bằng Microsoft Excel hoặc Google Trang tính.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setExportModalConfig({ isOpen: false, type: 'ALL', priceList: null })}
                      className="h-[38px] px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-2xs cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const config = exportModalConfig;
                        setExportModalConfig({ isOpen: false, type: 'ALL', priceList: null });
                        if (config.type === 'ALL') {
                          handleExportAllPriceLists();
                        } else if (config.priceList) {
                          handleExportPriceList(config.priceList);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Xác nhận xuất</span>
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
        </>
      ) : (
        <DiscountPoliciesTab canManage={canManage} />
      )}
    </div>
  );
};
