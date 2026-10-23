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
  ChevronDown,
  X,
  FileSpreadsheet,
  Calendar,
  RotateCcw,
  Layers,
  Filter,
} from 'lucide-react';
import { getStoredUser } from '../utils/navigation';
import { priceListsService } from '../services/price-lists.service';
import { PriceListFormModal } from '../components/price-list-form-modal';
import { PriceListCloneModal } from '../components/price-list-clone-modal';
import { DiscountPolicyFormModal } from '../components/discount-policy-form-modal';
import { discountPoliciesService } from '../services/discount-policies.service';
import type {
  DiscountPolicy,
  CreateDiscountPolicyPayload,
} from '../services/discount-policies.service';
import { showToast } from '../components/toast';
import { PriceListsTableSkeleton, PriceListsMobileCardSkeleton } from '../components/skeletons';
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

export type ActiveTabType =
  | 'BASE'
  | 'DISCOUNT'
  | 'CREATE_PRICE_LIST'
  | 'EDIT_PRICE_LIST'
  | 'CREATE_DISCOUNT'
  | 'EDIT_DISCOUNT';

const TAB_TO_PARAM: Record<ActiveTabType, string> = {
  BASE: 'base',
  DISCOUNT: 'discount',
  CREATE_PRICE_LIST: 'create_price_list',
  EDIT_PRICE_LIST: 'edit_price_list',
  CREATE_DISCOUNT: 'create_discount',
  EDIT_DISCOUNT: 'edit_discount',
};

const PARAM_TO_TAB: Record<string, ActiveTabType> = {
  base: 'BASE',
  discount: 'DISCOUNT',
  base_price: 'BASE',
  policies: 'DISCOUNT',
  create_price_list: 'CREATE_PRICE_LIST',
  edit_price_list: 'EDIT_PRICE_LIST',
  create_discount: 'CREATE_DISCOUNT',
  edit_discount: 'EDIT_DISCOUNT',
};

const parseTabParam = (param: string | null): ActiveTabType => {
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

  // Tab cấp cao (Bảng giá cơ sở vs Chính sách chiết khấu sản lượng vs Tab Thêm/Sửa)
  const [activeTab, setActiveTab] = useState<ActiveTabType>(initialTab);

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

  // Form states cho Bảng giá và Chính sách Chiết khấu
  const [editingPriceList, setEditingPriceList] = useState<PriceList | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const [editingDiscountPolicy, setEditingDiscountPolicy] = useState<DiscountPolicy | null>(null);
  const [isDiscountViewOnly, setIsDiscountViewOnly] = useState(false);

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
      tab?: ActiveTabType;
      status?: PriceListStatusType | 'ALL';
      group?: string;
      search?: string;
      page?: number;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          // 1. Tab hiển thị: ?tab=base | ?tab=discount | ?tab=create_price_list ...
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
  const handleTabChange = (newTab: ActiveTabType) => {
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

  // Mở tab thêm mới bảng giá
  const handleOpenCreatePriceListTab = () => {
    setEditingPriceList(null);
    setIsViewOnly(false);
    handleTabChange('CREATE_PRICE_LIST');
  };

  // Mở tab xem chi tiết bảng giá
  const handleOpenViewPriceListTab = (pl: PriceList) => {
    setEditingPriceList(pl);
    setIsViewOnly(true);
    handleTabChange('EDIT_PRICE_LIST');
  };

  // Mở tab chỉnh sửa bảng giá
  const handleOpenEditPriceListTab = (pl: PriceList) => {
    if (pl.hasOrders) {
      showToast('error', 'Không thể chỉnh sửa bảng giá đã phát sinh đơn hàng');
      return;
    }
    setEditingPriceList(pl);
    setIsViewOnly(false);
    handleTabChange('EDIT_PRICE_LIST');
  };

  // Đóng tab bảng giá (trở về tab BASE)
  const handleClosePriceListTab = () => {
    setEditingPriceList(null);
    setIsViewOnly(false);
    handleTabChange('BASE');
  };

  // Mở tab thêm mới chính sách chiết khấu
  const handleOpenCreateDiscountTab = () => {
    setEditingDiscountPolicy(null);
    setIsDiscountViewOnly(false);
    handleTabChange('CREATE_DISCOUNT');
  };

  // Mở tab chỉnh sửa / xem chi tiết chính sách chiết khấu
  const handleOpenEditDiscountTab = (policy: DiscountPolicy, viewOnly = false) => {
    setEditingDiscountPolicy(policy);
    setIsDiscountViewOnly(viewOnly);
    handleTabChange('EDIT_DISCOUNT');
  };

  // Đóng tab chính sách chiết khấu (trở về tab DISCOUNT)
  const handleCloseDiscountTab = () => {
    setEditingDiscountPolicy(null);
    setIsDiscountViewOnly(false);
    handleTabChange('DISCOUNT');
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

  // Lưu biểu mẫu thêm mới hoặc sửa bảng giá
  const handleFormSubmit = async (payload: CreatePriceListPayload) => {
    try {
      if (editingPriceList) {
        await priceListsService.updatePriceList(editingPriceList.id, payload);
        showToast('success', 'Cập nhật bảng giá thành công');
      } else {
        await priceListsService.createPriceList(payload);
        showToast('success', 'Tạo mới bảng giá thành công');
      }
      handleClosePriceListTab();
      await loadPriceLists();
    } catch {
      showToast('error', 'Không thể lưu bảng giá');
      throw new Error('Submit failed');
    }
  };

  // Lưu biểu mẫu thêm mới hoặc sửa chính sách chiết khấu
  const handleDiscountFormSubmit = async (payload: CreateDiscountPolicyPayload, id?: string) => {
    try {
      if (id) {
        await discountPoliciesService.updatePolicy(id, payload);
        showToast('success', 'Cập nhật chính sách thành công');
      } else {
        await discountPoliciesService.createPolicy(payload);
        showToast('success', 'Thêm mới chính sách thành công');
      }
      handleCloseDiscountTab();
      window.dispatchEvent(new Event('loha_discount_policies_updated'));
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Lỗi khi lưu chính sách')
          : (err instanceof Error ? err.message : 'Lỗi khi lưu chính sách');
      showToast('error', msg);
      throw err;
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

  // Render Badge Nhóm khách hàng (Đồng bộ Style Pastel mềm mại từ Nhật ký hệ thống)
  const renderCustomerGroupBadge = (group: CustomerGroupType) => {
    switch (group) {
      case 'AGENT_LEVEL_1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
            Đại lý Cấp 1
          </span>
        );
      case 'AGENT_LEVEL_2':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/60">
            Đại lý Cấp 2
          </span>
        );
      case 'RETAIL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            Bán lẻ Niêm yết
          </span>
        );
    }
  };

  // Render Badge Trạng thái (Đồng bộ Style Pastel mềm mại từ Nhật ký hệ thống)
  const renderStatusBadge = (status: PriceListStatusType) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Đang hiệu lực
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Bản nháp
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Tạm dừng
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Đã hết hạn
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* High-level Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-sm mb-4 scrollbar-thin">
        <button
          type="button"
          onClick={() => handleTabChange('BASE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-semibold transition-all whitespace-nowrap cursor-pointer border-b-2 text-xs sm:text-sm ${
            activeTab === 'BASE'
              ? 'border-blue-600 text-blue-600 bg-blue-50/60 shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Bảng giá Cơ sở</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('DISCOUNT')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-semibold transition-all whitespace-nowrap cursor-pointer border-b-2 text-xs sm:text-sm ${
            activeTab === 'DISCOUNT'
              ? 'border-blue-600 text-blue-600 bg-blue-50/60 shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-600 shrink-0" />
          <span>Chính sách Chiết khấu sản lượng</span>
        </button>

        {/* Tab động: Thiết lập Bảng giá mới / Chỉnh sửa Bảng giá */}
        {(activeTab === 'CREATE_PRICE_LIST' || activeTab === 'EDIT_PRICE_LIST') && (
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl font-semibold transition-all whitespace-nowrap border-b-2 text-xs sm:text-sm bg-blue-50/80 border-blue-600 text-blue-700 shadow-2xs animate-in fade-in duration-150"
          >
            {activeTab === 'CREATE_PRICE_LIST' ? (
              <>
                <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Thiết lập Bảng giá mới</span>
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="max-w-[180px] sm:max-w-xs truncate">
                  {isViewOnly ? 'Chi tiết' : 'Chỉnh sửa'}: {editingPriceList?.name || editingPriceList?.code}
                </span>
              </>
            )}
            <button
              type="button"
              onClick={handleClosePriceListTab}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-blue-100/60 transition-colors ml-1 cursor-pointer"
              title="Đóng tab này"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab động: Thêm mới Chính sách / Chỉnh sửa Chính sách */}
        {(activeTab === 'CREATE_DISCOUNT' || activeTab === 'EDIT_DISCOUNT') && (
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl font-semibold transition-all whitespace-nowrap border-b-2 text-xs sm:text-sm bg-purple-50/80 border-purple-600 text-purple-700 shadow-2xs animate-in fade-in duration-150"
          >
            {activeTab === 'CREATE_DISCOUNT' ? (
              <>
                <Plus className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Thêm mới Chính sách</span>
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="max-w-[180px] sm:max-w-xs truncate">
                  {isDiscountViewOnly ? 'Chi tiết' : 'Chỉnh sửa'}: {editingDiscountPolicy?.name || editingDiscountPolicy?.code}
                </span>
              </>
            )}
            <button
              type="button"
              onClick={handleCloseDiscountTab}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-purple-100/60 transition-colors ml-1 cursor-pointer"
              title="Đóng tab này"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {activeTab === 'CREATE_PRICE_LIST' || activeTab === 'EDIT_PRICE_LIST' ? (
        <PriceListFormModal
          mode="tab"
          isOpen={true}
          onClose={handleClosePriceListTab}
          onSubmit={handleFormSubmit}
          onClone={handleOpenCloneModal}
          onToast={(type, title, message) => showToast(type, title || message)}
          initialData={editingPriceList}
          isReadOnly={isViewOnly}
        />
      ) : activeTab === 'CREATE_DISCOUNT' || activeTab === 'EDIT_DISCOUNT' ? (
        <DiscountPolicyFormModal
          mode="tab"
          isOpen={true}
          onClose={handleCloseDiscountTab}
          onSubmit={handleDiscountFormSubmit}
          initialData={editingDiscountPolicy}
          isReadOnly={isDiscountViewOnly}
        />
      ) : activeTab === 'BASE' ? (
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

          {/* 3. Filter Toolbar: Tách biệt rõ ràng Ô tìm kiếm, Nhóm nút chức năng và Các dropdown bộ lọc */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
            {/* HÀNG 1: Ô tìm kiếm rộng rãi + Nhóm nút hành động thao tác (Xuất Excel, Thêm mới) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Ô Tìm kiếm theo tên / mã / ghi chú (Chiếm không gian thoải mái) */}
              <div className="relative flex-1 max-w-xl">
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

              {/* Nhóm các nút chức năng: Tách riêng sang phải, rộng rãi, dễ thao tác */}
              <div className="flex items-center gap-2.5 shrink-0 justify-end">
                {/* Nút Xuất danh sách bảng giá ra Excel */}
                <button
                  type="button"
                  onClick={() => setExportModalConfig({ isOpen: true, type: 'ALL', priceList: null })}
                  disabled={priceLists.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-emerald-700 active:scale-[0.98] transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  title="Xuất danh sách bảng giá ra tệp Excel (.xlsx)"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Xuất danh sách</span>
                </button>

                {/* Nút Thêm mới bảng giá */}
                {canManage && (
                  <button
                    type="button"
                    onClick={handleOpenCreatePriceListTab}
                    className="inline-flex items-center justify-center gap-1.5 h-[38px] rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Thêm mới bảng giá</span>
                  </button>
                )}
              </div>
            </div>

            {/* HÀNG 2: Nhóm các dropdown bộ lọc & Xóa lọc */}
            <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Bộ lọc:</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                {/* Lọc Nhóm khách hàng */}
                <div className="w-full sm:w-56">
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

                {/* Lọc Trạng thái */}
                <div className="w-full sm:w-48">
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
              </div>

              {/* Thông tin bộ lọc đang áp dụng */}
              {(searchTerm || selectedStatus !== 'ALL' || selectedGroup !== 'ALL') && (
                <div className="flex items-center text-xs text-blue-600 font-medium gap-1.5 shrink-0 sm:ml-auto">
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
          </div>

          {/* 4. Table: Danh sách Bảng giá (5 cột chuẩn, không scroll ngang, rộng rãi thoải mái) */}
          <div className="space-y-4 w-full">
            {/* ========================================================================= */}
            {/* 4.1 BẢNG DỮ LIỆU DESKTOP (>= 640px) - TABLE-FIXED 5 CỘT CHUẨN FIGMA      */}
            {/* ========================================================================= */}
            <div className="hidden sm:block rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden w-full">
              <div className="w-full overflow-x-auto">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[34%]" />
                    <col className="w-[18%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                  </colgroup>

                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-3.5 py-3.5 text-left whitespace-nowrap">
                        Mã bảng giá
                      </th>
                      <th className="px-3.5 py-3.5 text-left whitespace-nowrap">
                        Tên bảng giá
                      </th>
                      <th className="px-3.5 py-3.5 text-left whitespace-nowrap">
                        Nhóm áp dụng
                      </th>
                      <th className="px-3.5 py-3.5 text-center whitespace-nowrap">
                        Trạng thái
                      </th>
                      <th className="px-3.5 py-3.5 text-center whitespace-nowrap">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody
                    className={`divide-y divide-slate-100 text-sm transition-opacity duration-150 ${
                      loading ? 'opacity-60 pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    {loading ? (
                      <PriceListsTableSkeleton count={6} />
                    ) : priceLists.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-slate-400"
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
                          <tr
                            key={pl.id}
                            onClick={() => handleOpenViewPriceListTab(pl)}
                            className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                          >
                            {/* 1. Mã bảng giá: Monospace badge sắc nét */}
                            <td className="px-3.5 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2.5 py-1 rounded-md shadow-2xs group-hover:border-blue-300">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span>{pl.code}</span>
                              </span>
                            </td>

                            {/* 2. Tên bảng giá + Badge chỉ báo có đơn (34%, không làm phình bảng) */}
                            <td className="px-3.5 py-3.5 overflow-hidden min-w-0 max-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-semibold text-slate-900 line-clamp-1 text-sm truncate" title={pl.name}>
                                  {pl.name}
                                </span>
                                {isLocked && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0"
                                    title="Bảng giá này đã có đơn hàng"
                                  >
                                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                                    <span>Có đơn</span>
                                  </span>
                                )}
                              </div>
                              
                            </td>

                            {/* 3. Nhóm áp dụng */}
                            <td className="px-3.5 py-3.5 whitespace-nowrap">
                              {renderCustomerGroupBadge(pl.customerGroup)}
                            </td>

                            {/* 4. Trạng thái */}
                            <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                              {renderStatusBadge(pl.status)}
                            </td>

                            {/* 5. Thao tác */}
                            <td className="px-3.5 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="relative inline-flex items-center justify-center action-menu-dropdown-container">
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
                                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none whitespace-nowrap shrink-0 active:scale-95 ${
                                    openActionMenuId === pl.id
                                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs ring-2 ring-blue-500/10'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-300'
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

              {/* Thanh phân trang gắn liền chân bảng Desktop */}
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

            {/* ========================================================================= */}
            {/* 4.2 GIAO DIỆN THẺ (CARD VIEW) CHO MOBILE (< 640px) CO GIÃN 100%           */}
            {/* ========================================================================= */}
            <div className="sm:hidden space-y-2.5 w-full">
              {loading ? (
                <PriceListsMobileCardSkeleton count={4} />
              ) : priceLists.length === 0 ? (
                <div className="rounded-xl bg-white border border-slate-200/80 p-6 text-center text-slate-400">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600 text-sm">
                    Không tìm thấy bảng giá nào
                  </p>
                  {(searchTerm || selectedGroup !== 'ALL' || selectedStatus !== 'ALL') && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Đặt lại bộ lọc</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2.5">
                    {priceLists.map((pl) => {
                      const isLocked = pl.hasOrders;

                      return (
                        <div
                          key={pl.id}
                          onClick={() => handleOpenViewPriceListTab(pl)}
                          className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-xs hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer select-none space-y-2 w-full"
                        >
                          {/* Hàng 1: Mã bảng giá + Trạng thái */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-md">
                              <FileSpreadsheet className="w-3 h-3 text-blue-500" />
                              <span>{pl.code}</span>
                            </span>
                            {renderStatusBadge(pl.status)}
                          </div>

                          {/* Hàng 2: Tên bảng giá */}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-slate-900 truncate">
                                {pl.name}
                              </span>
                              {isLocked && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0"
                                  title="Đã có đơn hàng"
                                >
                                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                                  <span>Có đơn</span>
                                </span>
                              )}
                            </div>
                            
                          </div>

                          {/* Hàng 3: Nhóm áp dụng + Thời gian */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                            <div>{renderCustomerGroupBadge(pl.customerGroup)}</div>
                            <div className="flex items-center gap-1 text-slate-500 font-medium shrink-0">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formatDate(pl.startDate)} – {formatDate(pl.endDate)}</span>
                            </div>
                          </div>

                          {/* Hàng 4: Thao tác & Chi tiết */}
                          <div
                            className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenViewPriceListTab(pl);
                              }}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              <span>Chi tiết</span>
                            </button>

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
                              className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border text-xs font-medium shadow-2xs ${
                                openActionMenuId === pl.id
                                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>Thao tác</span>
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Phân trang Mobile */}
                  {total > 0 && (
                    <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden w-full">
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
                    </div>
                  )}
                </>
              )}
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
                        handleOpenViewPriceListTab(pl);
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
                          handleOpenEditPriceListTab(pl);
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
          </div>

          {/* 5. Modal Nhân bản Bảng giá (Clone Version) */}
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
        <DiscountPoliciesTab
          canManage={canManage}
          onRequestCreate={handleOpenCreateDiscountTab}
          onRequestEdit={handleOpenEditDiscountTab}
        />
      )}
    </div>
  );
};
