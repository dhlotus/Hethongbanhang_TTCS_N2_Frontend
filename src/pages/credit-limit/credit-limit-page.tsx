import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { creditLimitService } from '../../services/credit-limit.service';
import type {
  CreditLimit,
  CreditLimitStats,
  UpdateCreditLimitPayload,
  UpdateCreditStatusPayload,
} from '../../types/credit-limit.type';
import { CreditStatus } from '../../types/credit-limit.type';
import { Role } from '../../types/auth';
import { CreditLimitStatsCards } from '../../components/credit-limit/credit-limit-stats-cards';
import { CreditLimitTable } from '../../components/credit-limit/credit-limit-table';
import { UpdateLimitModal } from '../../components/credit-limit/update-limit-modal';
import { CreditLimitStatusModal } from '../../components/credit-limit/credit-limit-status-modal';
import { CreditLimitHistoryModal } from '../../components/credit-limit/credit-limit-history-modal';
import { Pagination } from '../../components/pagination';
import { showToast } from '../../components/toast';
import { getStoredUser } from '../../utils/navigation';

/**
 * Trang Khai Báo & Quản Lý Hạn Mức Công Nợ Đại Lý (SN-34)
 * Màn hình danh sách hạn mức công nợ đại lý
 */
export const CreditLimitPage: React.FC = () => {
  const [items, setItems] = useState<CreditLimit[]>([]);
  const [stats, setStats] = useState<CreditLimitStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Bộ lọc & Phân trang
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<CreditStatus | ''>('');
  const [customerGroupFilter, setCustomerGroupFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Trạng thái các Modal
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<CreditLimit | null>(null);
  const [selectedItemForStatus, setSelectedItemForStatus] = useState<CreditLimit | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<CreditLimit | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);

  // Phân quyền RBAC (SN-34): Chỉ Kế toán công nợ hoặc Quản lý kinh doanh mới có quyền sửa
  const canEditCreditLimit = useMemo(() => {
    const user = getStoredUser();
    const userRoles: string[] = Array.isArray(user?.roles)
      ? user.roles
      : user?.role
        ? [user.role]
        : [];

    return (
      userRoles.includes(Role.ACCOUNTANT_DEBT) ||
      userRoles.includes(Role.ACCOUNTANT) ||
      userRoles.includes(Role.BUSINESS_MANAGER) ||
      userRoles.includes(Role.SALES_MANAGER) ||
      userRoles.includes(Role.ADMIN)
    );
  }, []);

  // Tải thống kê
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await creditLimitService.getCreditLimitStats();
      setStats(data);
    } catch (err: unknown) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Không thể tải số liệu thống kê hạn mức.'
      );
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Helper trích xuất thông báo lỗi thân thiện (SN-34)
  const getFriendlyCreditLimitErrorMessage = (err: unknown): string => {
    const defaultMsg = 'Lý do chưa rõ ràng. Vui lòng mô tả cụ thể hơn (tối thiểu 10 ký tự).';
    if (!err) return defaultMsg;
    const anyErr = err as any;
    const status = anyErr?.response?.status || anyErr?.statusCode;

    // Khi API cập nhật trả về HTTP Status 400, KHÔNG hiển thị chuỗi kỹ thuật "Request failed with status code 400"
    if (
      status === 400 ||
      (typeof anyErr?.message === 'string' &&
        (anyErr.message.includes('400') || anyErr.message.includes('status code 400')))
    ) {
      return defaultMsg;
    }

    const serverMsg = anyErr?.response?.data?.message;
    if (typeof serverMsg === 'string' && serverMsg.trim() && !serverMsg.includes('status code')) {
      return serverMsg;
    }
    if (err instanceof Error && err.message && !err.message.includes('status code')) {
      return err.message;
    }
    return defaultMsg;
  };

  // Tải danh sách hạn mức công nợ (Hỗ trợ giữ nguyên trang hiện tại)
  const fetchCreditLimits = useCallback(async (targetPage?: number) => {
    try {
      setLoading(true);
      const currentPageToFetch = typeof targetPage === 'number' ? targetPage : page;
      const res = await creditLimitService.getCreditLimits({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        customerGroup: customerGroupFilter || undefined,
        page: currentPageToFetch,
        limit,
      });

      setItems(res.data);
      setTotalPages(res.totalPages);
      setTotalItems(res.total);
      if (res.totalPages > 0 && currentPageToFetch > res.totalPages) {
        setPage(res.totalPages);
      }
    } catch (err: unknown) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Không thể tải danh sách hạn mức công nợ.'
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, customerGroupFilter, page, limit]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCreditLimits();
  }, [fetchCreditLimits]);

  // Xử lý Cập nhật Hạn mức (Giữ nguyên trang hiện tại, thông báo lỗi thân thiện)
  const handleUpdateLimit = async (
    agencyId: string,
    payload: UpdateCreditLimitPayload
  ): Promise<void> => {
    try {
      setModalSubmitting(true);
      await creditLimitService.updateCreditLimit(agencyId, payload);
      showToast('success', 'Đã cập nhật hạn mức công nợ đại lý thành công!');
      setSelectedItemForEdit(null);
      // Giữ nguyên trang hiện tại (page), KHÔNG reset về Trang 1
      await Promise.all([fetchCreditLimits(page), fetchStats()]);
    } catch (err: unknown) {
      const msg = getFriendlyCreditLimitErrorMessage(err);
      showToast('error', msg);
      throw err;
    } finally {
      setModalSubmitting(false);
    }
  };

  // Xử lý Khóa / Mở khóa Hạn mức (Giữ nguyên trang hiện tại)
  const handleUpdateStatus = async (
    agencyId: string,
    payload: UpdateCreditStatusPayload
  ): Promise<void> => {
    try {
      setModalSubmitting(true);
      await creditLimitService.updateCreditStatus(agencyId, payload);
      showToast(
        'success',
        payload.status === CreditStatus.BLOCKED
          ? 'Đã khóa hạn mức tín dụng của đại lý thành công!'
          : 'Đã mở khóa hạn mức tín dụng của đại lý thành công!'
      );
      setSelectedItemForStatus(null);
      // Giữ nguyên trang hiện tại (page), KHÔNG reset về Trang 1
      await Promise.all([fetchCreditLimits(page), fetchStats()]);
    } catch (err: unknown) {
      const msg = getFriendlyCreditLimitErrorMessage(err);
      showToast('error', msg);
      throw err;
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* 1. Header Trang                                                       */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-end gap-2.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        {!canEditCreditLimit && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span>
              Chế độ chỉ xem (Chỉ Kế toán công nợ / Quản lý kinh doanh mới có quyền chỉnh sửa)
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            fetchCreditLimits(page);
            fetchStats();
          }}
          disabled={loading}
          className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 2. Thẻ Thống Kê Tổng Quan                                             */}
      {/* ===================================================================== */}
      <CreditLimitStatsCards stats={stats} loading={statsLoading} />

      {/* ===================================================================== */}
      {/* 3. Thanh Tìm Kiếm & Bộ Lọc                                            */}
      {/* ===================================================================== */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Ô tìm kiếm */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên đại lý, mã số, SĐT..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] bg-slate-50/50"
          />
        </div>

        {/* Các bộ lọc dropdown */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lọc theo:</span>
          </div>

          {/* Lọc Trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as CreditStatus | '');
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] text-slate-700"
          >
            <option value="">Tất cả trạng thái</option>
            <option value={CreditStatus.NORMAL}>An toàn (Dưới 80%)</option>
            <option value={CreditStatus.WARNING}>Cảnh báo (80% - 100%)</option>
            <option value={CreditStatus.EXCEEDED}>Vượt trần (&gt; 100%)</option>
            <option value={CreditStatus.BLOCKED}>Bị khóa công nợ</option>
          </select>

          {/* Lọc Nhóm Đại lý */}
          <select
            value={customerGroupFilter}
            onChange={(e) => {
              setCustomerGroupFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] text-slate-700"
          >
            <option value="">Tất cả nhóm</option>
            <option value="AGENT_LEVEL_1">Đại lý cấp 1</option>
            <option value="AGENT_LEVEL_2">Đại lý cấp 2</option>
            <option value="RETAIL">Bán lẻ / Siêu thị mini</option>
          </select>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. Bảng Danh Sách Hạn Mức Công Nợ (Ẩn/Disable nút Sửa nếu thiếu quyền) */}
      {/* ===================================================================== */}
      <CreditLimitTable
        items={items}
        loading={loading}
        canEdit={canEditCreditLimit}
        onEdit={(item) => setSelectedItemForEdit(item)}
        onToggleStatus={(item) => setSelectedItemForStatus(item)}
        onViewHistory={(item) => setSelectedItemForHistory(item)}
      />

      {/* ===================================================================== */}
      {/* 5. Phân Trang (Pagination)                                            */}
      {/* ===================================================================== */}
      {totalItems > 0 && (
        <Pagination
          variant="default"
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={limit}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="đại lý"
          showFirstLast={true}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setLimit(newSize);
            setPage(1);
          }}
        />
      )}

      {/* ===================================================================== */}
      {/* 6. Form Modal Cập Nhật Hạn Mức (UpdateLimitModal - SN-34)               */}
      {/* ===================================================================== */}
      <UpdateLimitModal
        isOpen={Boolean(selectedItemForEdit)}
        item={selectedItemForEdit}
        onClose={() => setSelectedItemForEdit(null)}
        onSubmit={handleUpdateLimit}
        loading={modalSubmitting}
      />

      {/* ===================================================================== */}
      {/* 7. Modal Khóa / Mở Khóa                                               */}
      {/* ===================================================================== */}
      <CreditLimitStatusModal
        isOpen={Boolean(selectedItemForStatus)}
        item={selectedItemForStatus}
        onClose={() => setSelectedItemForStatus(null)}
        onSubmit={handleUpdateStatus}
        loading={modalSubmitting}
      />

      {/* ===================================================================== */}
      {/* 8. Modal Xem Lịch Sử Thay Đổi (CreditLimitLog)                         */}
      {/* ===================================================================== */}
      <CreditLimitHistoryModal
        isOpen={Boolean(selectedItemForHistory)}
        item={selectedItemForHistory}
        onClose={() => setSelectedItemForHistory(null)}
      />
    </div>
  );
};
