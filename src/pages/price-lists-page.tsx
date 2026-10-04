import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BadgePercent,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
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
  GitBranch,
  X,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import { getStoredUser } from '../utils/navigation';
import { priceListsService } from '../services/price-lists.service';
import { PriceListFormModal } from '../components/price-list-form-modal';
import { PriceListCloneModal } from '../components/price-list-clone-modal';
import { Toast, type ToastType } from '../components/toast';
import type {
  PriceList,
  CustomerGroupType,
  PriceListStatusType,
  CreatePriceListPayload,
} from '../types/price-list';

const CUSTOMER_GROUP_TABS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'Tất cả Nhóm' },
  { key: 'AGENT_LEVEL_1', label: 'Đại lý Cấp 1 (NPP)' },
  { key: 'AGENT_LEVEL_2', label: 'Đại lý Cấp 2' },
  { key: 'RETAIL', label: 'Bán lẻ Niêm yết' },
];

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
  } catch {
    return dateStr;
  }
};

export const PriceListsPage: React.FC = () => {
  // Dữ liệu bảng giá & Phân trang
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Bộ lọc & Tìm kiếm (Debounced)
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<PriceListStatusType | 'ALL'>('ALL');

  // Toast thông báo nổi
  const [toast, setToast] = useState<{
    type: ToastType;
    title?: string;
    message: string;
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

  // Phân quyền người dùng
  const user = getStoredUser();
  const userRoles = user?.roles || [];
  const canManage =
    userRoles.includes('ADMIN') ||
    userRoles.includes('SALES_MANAGER') ||
    userRoles.includes('SALES_REP');

  // Debounce ô tìm kiếm sau 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

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
    } catch (err: unknown) {
      const error = err as Error;
      setToast({
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: error.message || 'Không thể nạp danh sách bảng giá.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedGroup, selectedStatus]);

  useEffect(() => {
    loadPriceLists();
  }, [loadPriceLists]);

  // Thống kê Metrics Header (tính toán dựa trên dữ liệu hiện tại hoặc tổng quát)
  const metrics = useMemo(() => {
    const all = priceLists;
    const activeCount = all.filter((p) => p.status === 'ACTIVE').length;
    const expiredCount = all.filter((p) => p.status === 'EXPIRED').length;
    const draftCount = all.filter((p) => p.status === 'DRAFT').length;

    return {
      totalCount: total,
      activeCount,
      expiredCount,
      draftCount,
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
      setToast({
        type: 'warning',
        title: 'Khóa sửa an toàn (SN-27)',
        message: `Bảng giá [${pl.code}] đã phát sinh đơn hàng. Hệ thống khóa sửa trực tiếp để bảo vệ chứng từ, vui lòng sử dụng chức năng "Tạo phiên bản mới (Clone Version)".`,
      });
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
      const cloned = await priceListsService.clonePriceList(source.id, {
        name: newName,
        code: newCode,
      });

      setToast({
        type: 'success',
        title: 'Nhân bản thành công (SN-27)',
        message: `Đã tạo phiên bản mới v${cloned.version}.0: "${cloned.name}" [${cloned.code}] ở trạng thái Bản nháp.`,
      });

      await loadPriceLists();
    } catch (err: unknown) {
      const error = err as Error;
      setToast({
        type: 'error',
        title: 'Nhân bản thất bại',
        message: error.message || 'Không thể tạo phiên bản mới.',
      });
      throw err;
    }
  };

  // Lưu biểu mẫu thêm mới hoặc sửa
  const handleFormSubmit = async (payload: CreatePriceListPayload) => {
    try {
      if (editingPriceList) {
        await priceListsService.updatePriceList(editingPriceList.id, payload);
        setToast({
          type: 'success',
          title: 'Cập nhật thành công',
          message: `Đã lưu thay đổi cho bảng giá "${payload.name}".`,
        });
      } else {
        await priceListsService.createPriceList(payload);
        setToast({
          type: 'success',
          title: 'Tạo mới thành công',
          message: `Đã thêm bảng giá mới "${payload.name}" vào hệ thống.`,
        });
      }
      await loadPriceLists();
    } catch (err: unknown) {
      const error = err as Error;
      setToast({
        type: 'error',
        title: 'Thao tác thất bại',
        message: error.message || 'Không thể lưu bảng giá.',
      });
      throw err;
    }
  };

  // Xác nhận xóa bảng giá
  const handlePromptDelete = (pl: PriceList) => {
    if (pl.hasOrders) {
      setToast({
        type: 'warning',
        title: 'Khóa xóa an toàn (SN-27)',
        message: `Bảng giá [${pl.code}] đã phát sinh đơn hàng trong hệ thống. Không thể xóa để bảo đảm tính toàn vẹn dữ liệu đơn hàng!`,
      });
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
      setToast({
        type: 'success',
        title: 'Đã xóa bảng giá',
        message: `Bảng giá "${priceListToDelete.name}" đã được xóa khỏi hệ thống.`,
      });
      setDeleteModalOpen(false);
      setPriceListToDelete(null);
      await loadPriceLists();
    } catch (err: unknown) {
      const error = err as Error;
      setToast({
        type: 'error',
        title: 'Xóa thất bại',
        message: error.message || 'Không thể xóa bảng giá.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Render Badge Nhóm khách hàng
  const renderCustomerGroupBadge = (group: CustomerGroupType) => {
    switch (group) {
      case 'AGENT_LEVEL_1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/20">
            Đại lý Cấp 1 (NPP)
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
      {/* Toast thông báo nổi */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* 1. Tiêu đề Phân hệ & Thao tác chính */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                <BadgePercent className="h-3.5 w-3.5 text-blue-600" />
                <span>Chính sách Bảng giá & Chiết khấu B2B (SN-27)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
                <GitBranch className="h-3.5 w-3.5 text-purple-600" />
                <span>Quản lý Đa phiên bản & Khóa đơn hàng</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Quản lý Bảng giá & Chiết khấu B2B
            </h1>
            <p className="text-sm text-slate-500 max-w-3xl">
              Cấu hình chính sách giá bán buôn cho Nhà phân phối (Cấp 1), Đại lý (Cấp 2) và Bán lẻ
              niêm yết. Kiểm soát nghiêm ngặt biên giá sàn và bảo toàn dữ liệu khi đã phát sinh đơn
              hàng.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadPriceLists}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            {canManage && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ Thêm mới bảng giá</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Metrics Header: 4 Thẻ chỉ số tổng quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tổng số bảng giá */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
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

        {/* Card 2: Đang hiệu lực */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/10 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-700 tracking-tight">
              {metrics.activeCount}
            </div>
            <div className="text-xs font-medium text-slate-500">Đang hiệu lực (Active)</div>
          </div>
        </div>

        {/* Card 3: Bản nháp */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/10 shrink-0">
            <FileEdit className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-700 tracking-tight">
              {metrics.draftCount}
            </div>
            <div className="text-xs font-medium text-slate-500">Bản nháp (Draft)</div>
          </div>
        </div>

        {/* Card 4: Đã hết hạn */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-500/10 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-rose-700 tracking-tight">
              {metrics.expiredCount}
            </div>
            <div className="text-xs font-medium text-slate-500">Đã hết hạn (Expired)</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar: Tabs nhóm khách hàng, Search Box, Dropdown Trạng thái */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3.5">
        {/* Tabs Nhóm khách hàng */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 text-xs">
          {CUSTOMER_GROUP_TABS.map((tab) => {
            const isActive = selectedGroup === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setSelectedGroup(tab.key);
                  setPage(1);
                }}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ô Tìm kiếm theo tên / mã */}
          <div className="sm:col-span-2 relative">
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
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Trạng thái */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as PriceListStatusType | 'ALL');
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="ACTIVE">Đang hiệu lực (Active)</option>
              <option value="DRAFT">Bản nháp (Draft)</option>
              <option value="INACTIVE">Tạm dừng (Inactive)</option>
              <option value="EXPIRED">Đã hết hạn (Expired)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Table: Danh sách Bảng giá */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4 min-w-[200px]">Mã & Phiên bản</th>
                <th className="py-3 px-4 min-w-[240px]">Tên Bảng giá</th>
                <th className="py-3 px-4 w-40">Nhóm áp dụng</th>
                <th className="py-3 px-4 w-48">Thời gian hiệu lực</th>
                <th className="py-3 px-4 w-36">Trạng thái</th>
                <th className="py-3 px-4 w-44 text-center">Ràng buộc Đơn hàng</th>
                <th className="py-3 px-4 w-36 text-center">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Đang tải danh sách bảng giá...</span>
                    </div>
                  </td>
                </tr>
              ) : priceLists.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                      <span className="text-xs">Không tìm thấy bảng giá nào phù hợp với bộ lọc.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                priceLists.map((pl, idx) => {
                  const isLocked = pl.hasOrders;

                  return (
                    <tr
                      key={pl.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* Mã bảng giá & Badge Version */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {pl.code}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                            v{pl.version}.0
                          </span>
                        </div>
                        {pl.parentVersionId && (
                          <div className="flex items-center gap-1 text-[11px] text-purple-600 mt-0.5">
                            <GitBranch className="w-3 h-3" />
                            <span>Nhân bản từ v{pl.version - 1}.0</span>
                          </div>
                        )}
                      </td>

                      {/* Tên bảng giá & Mô tả */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {pl.name}
                        </div>
                        {pl.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {pl.description}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {pl.items?.length || 0} mặt hàng được định giá
                        </div>
                      </td>

                      {/* Nhóm áp dụng */}
                      <td className="py-3.5 px-4">
                        {renderCustomerGroupBadge(pl.customerGroup)}
                      </td>

                      {/* Thời gian hiệu lực */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {formatDate(pl.startDate)} - {formatDate(pl.endDate)}
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(pl.status)}
                      </td>

                      {/* Ràng buộc đơn hàng */}
                      <td className="py-3.5 px-4 text-center">
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

                      {/* Thao tác (Xem, Sửa, Clone, Xóa) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(pl)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Xem chi tiết bảng giá"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Chỉnh sửa */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(pl)}
                              disabled={isLocked}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLocked
                                  ? 'text-slate-300 cursor-not-allowed opacity-60'
                                  : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer'
                              }`}
                              title={
                                isLocked
                                  ? 'Bảng giá đã có đơn hàng - Không thể sửa trực tiếp'
                                  : 'Chỉnh sửa bảng giá'
                              }
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Clone Version */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleOpenCloneModal(pl)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                              title="Tạo phiên bản mới (Clone Version)"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}

                          {/* Xóa */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handlePromptDelete(pl)}
                              disabled={isLocked}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isLocked
                                  ? 'text-slate-300 cursor-not-allowed opacity-60'
                                  : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                              }`}
                              title={
                                isLocked
                                  ? 'Bảng giá đã có đơn hàng - Không thể xóa'
                                  : 'Xóa bảng giá'
                              }
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Phân trang (Pagination) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-500">
          <div>
            Hiển thị <strong>{priceLists.length}</strong> trên tổng số <strong>{total}</strong> bảng
            giá
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Modal Khai báo & Chỉnh sửa Bảng giá */}
      <PriceListFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        onClone={handleOpenCloneModal}
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
      {deleteModalOpen && priceListToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50 ring-1 ring-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa Bảng giá</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa bảng giá{' '}
              <strong className="text-slate-900 font-semibold">{priceListToDelete.name}</strong> [
              {priceListToDelete.code}] không? Thao tác này không thể hoàn tác sau khi thực hiện.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                {deleting ? 'Đang xóa...' : 'Đồng ý xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
