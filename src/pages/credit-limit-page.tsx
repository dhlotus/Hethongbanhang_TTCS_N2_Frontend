import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { creditLimitService } from '../services/credit-limit.service';
import type {
  CreditLimitItem,
  CreditLimitStats,
  UpdateCreditLimitPayload,
  UpdateCreditStatusPayload,
} from '../types/credit-limit';
import { CreditStatus } from '../types/credit-limit';
import { CreditLimitStatsCards } from '../components/credit-limit/credit-limit-stats-cards';
import { CreditLimitTable } from '../components/credit-limit/credit-limit-table';
import { CreditLimitUpdateModal } from '../components/credit-limit/credit-limit-update-modal';
import { CreditLimitStatusModal } from '../components/credit-limit/credit-limit-status-modal';
import { CreditLimitHistoryModal } from '../components/credit-limit/credit-limit-history-modal';
import { showToast } from '../components/toast';

/**
 * Trang Khai Báo & Quản Lý Hạn Mức Công Nợ Đại Lý (SN-34)
 */
export const CreditLimitPage: React.FC = () => {
  const [items, setItems] = useState<CreditLimitItem[]>([]);
  const [stats, setStats] = useState<CreditLimitStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Bộ lọc & Phân trang
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<CreditStatus | ''>('');
  const [customerGroupFilter, setCustomerGroupFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Trạng thái các Modal
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<CreditLimitItem | null>(null);
  const [selectedItemForStatus, setSelectedItemForStatus] = useState<CreditLimitItem | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<CreditLimitItem | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);

  // Tải thống kê
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await creditLimitService.getCreditLimitStats();
      setStats(data);
    } catch {
      // Không làm gián đoạn luồng chính
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Tải danh sách hạn mức công nợ
  const fetchCreditLimits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await creditLimitService.getCreditLimits({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        customerGroup: customerGroupFilter || undefined,
        page,
        limit: 10,
      });

      setItems(res.data);
      setTotalPages(res.totalPages);
      setTotalItems(res.total);
    } catch (err: unknown) {
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách hạn mức công nợ.',
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, customerGroupFilter, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCreditLimits();
  }, [fetchCreditLimits]);

  // Xử lý Khai báo / Cập nhật Hạn mức
  const handleUpdateLimit = async (
    customerId: string,
    payload: UpdateCreditLimitPayload,
  ): Promise<void> => {
    try {
      setModalSubmitting(true);
      await creditLimitService.updateCreditLimit(customerId, payload);
      showToast('success', 'Đã cập nhật hạn mức công nợ thành công!');
      setSelectedItemForEdit(null);
      await Promise.all([fetchCreditLimits(), fetchStats()]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Lỗi khi cập nhật hạn mức công nợ.';
      showToast('error', msg);
      throw err;
    } finally {
      setModalSubmitting(false);
    }
  };

  // Xử lý Khóa / Mở khóa Hạn mức
  const handleUpdateStatus = async (
    customerId: string,
    payload: UpdateCreditStatusPayload,
  ): Promise<void> => {
    try {
      setModalSubmitting(true);
      await creditLimitService.updateCreditStatus(customerId, payload);
      showToast(
        'success',
        payload.status === CreditStatus.BLOCKED
          ? 'Đã khóa hạn mức tín dụng của đại lý thành công!'
          : 'Đã mở khóa hạn mức tín dụng của đại lý thành công!',
      );
      setSelectedItemForStatus(null);
      await Promise.all([fetchCreditLimits(), fetchStats()]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Lỗi khi cập nhật trạng thái hạn mức.';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center font-bold">
              <CreditCard className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Khai Báo & Quản Lý Hạn Mức Công Nợ (SN-34)
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Cấu hình hạn mức tín dụng tối đa, thời hạn nợ gối đầu và giám sát tỷ lệ sử dụng công nợ đại lý B2B.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchCreditLimits();
              fetchStats();
            }}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. Thẻ Thống Kê Tổng Quan (Metric Cards)                              */}
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
      {/* 4. Bảng Danh Sách Hạn Mức Công Nợ                                     */}
      {/* ===================================================================== */}
      <CreditLimitTable
        items={items}
        loading={loading}
        onEdit={(item) => setSelectedItemForEdit(item)}
        onToggleStatus={(item) => setSelectedItemForStatus(item)}
        onViewHistory={(item) => setSelectedItemForHistory(item)}
      />

      {/* ===================================================================== */}
      {/* 5. Phân Trang (Pagination)                                            */}
      {/* ===================================================================== */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div>
            Hiển thị <strong>{items.length}</strong> trên tổng số{' '}
            <strong>{totalItems}</strong> đại lý
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. Các Modal Nghiệp Vụ                                                */}
      {/* ===================================================================== */}
      <CreditLimitUpdateModal
        isOpen={Boolean(selectedItemForEdit)}
        item={selectedItemForEdit}
        onClose={() => setSelectedItemForEdit(null)}
        onSubmit={handleUpdateLimit}
        loading={modalSubmitting}
      />

      <CreditLimitStatusModal
        isOpen={Boolean(selectedItemForStatus)}
        item={selectedItemForStatus}
        onClose={() => setSelectedItemForStatus(null)}
        onSubmit={handleUpdateStatus}
        loading={modalSubmitting}
      />

      <CreditLimitHistoryModal
        isOpen={Boolean(selectedItemForHistory)}
        item={selectedItemForHistory}
        onClose={() => setSelectedItemForHistory(null)}
      />
    </div>
  );
};
