import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollText,
  RefreshCw,
  ShieldCheck,
  Info,
} from "lucide-react";
import { AuditFilterBar } from "../components/audit-log/audit-filter-bar";
import { AuditTable } from "../components/audit-log/audit-table";
import { DiffViewerModal } from "../components/audit-log/diff-viewer-modal";
import { Toast, type ToastType } from "../components/toast";
import { auditLogService } from "../services/audit-log.service";
import type {
  AuditLogItem,
  AuditLogQueryParams,
  PaginatedAuditLogsResponse,
} from "../types/audit-log";
import { getStoredUser } from "../utils/navigation";

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20); // Mặc định 20 dòng/trang
  const [totalPages, setTotalPages] = useState<number>(1);

  // Bộ lọc
  const [filters, setFilters] = useState<AuditLogQueryParams>({
    startDate: "",
    endDate: "",
    userId: "ALL",
    searchUser: "",
    entity: "ALL",
    action: "ALL",
  });

  // Modal xem chi tiết Diff JSON
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);

  // Toast thông báo
  const [toast, setToast] = useState<{
    type: ToastType;
    title?: string;
    message: string;
  } | null>(null);

  const currentUser = getStoredUser();

  // Tải danh sách nhật ký
  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res: PaginatedAuditLogsResponse = await auditLogService.getAuditLogs({
        ...filters,
        page,
        limit,
      });

      setLogs(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      const error = err as Error;
      setToast({
        type: "error",
        title: "Không thể tải nhật ký",
        message: error.message || "Đã xảy ra lỗi khi lấy dữ liệu nhật ký hệ thống.",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Cập nhật bộ lọc
  const handleFilterChange = (newFilters: Partial<AuditLogQueryParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  // Đặt lại bộ lọc về mặc định
  const handleResetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      userId: "ALL",
      searchUser: "",
      entity: "ALL",
      action: "ALL",
    });
    setPage(1);
  };

  // Mở modal xem diff
  const handleViewDiff = (item: AuditLogItem) => {
    setSelectedLog(item);
    setIsDiffModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* 1. Header Banner & Thông báo phân quyền */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-purple-50/70 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-700/10">
                <ScrollText className="h-3.5 w-3.5 text-purple-600" />
                <span>Giám sát & Truy vết Hệ thống (SN-142 / SN-19)</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Chế độ: Quản trị viên (ADMIN) - READ ONLY</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Nhật ký Hệ thống (Audit Logs)
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              Ghi nhận và lưu vết toàn bộ thao tác tác động vào tồn kho, hạn mức công nợ, chính sách giá bán, đơn hàng bán buôn và tài khoản người dùng để phục vụ đối chiếu, truy vết cuối tháng.
            </p>
          </div>

          {/* Nhóm nút hành động (Chỉ có Làm mới - TUYỆT ĐỐI KHÔNG CÓ THÊM/SỬA/XÓA) */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadAuditLogs}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all focus:outline-none cursor-pointer"
              title="Làm mới dữ liệu nhật ký từ máy chủ"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới nhật ký</span>
            </button>
          </div>
        </div>

        {/* Thông báo phân quyền & Trạng thái bảo mật */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 text-slate-600">
            <Info className="h-4 w-4 shrink-0 text-blue-600" />
            <span>
              <strong>Tính toàn vẹn dữ liệu:</strong> Nhật ký được lưu trữ bất biến (Immutable Audit Trail). Mọi điều chỉnh tồn kho cuối tháng đều được truy vết nguồn gốc và người phê duyệt.
            </span>
          </div>

          <span className="text-slate-400 font-mono text-[11px]">
            Đăng nhập: {currentUser?.username} ({currentUser?.roles?.join(", ")})
          </span>
        </div>
      </div>

      {/* 2. Khu vực Bộ lọc (FilterBar) */}
      <AuditFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        totalResults={total}
      />

      {/* 3. Bảng Dữ liệu Nhật ký Hệ thống (AuditTable) */}
      <AuditTable
        logs={logs}
        loading={loading}
        total={total}
        page={page}
        limit={limit}
        totalPages={totalPages}
        onPageChange={setPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        onViewDiff={handleViewDiff}
      />

      {/* 4. Modal So sánh Chi tiết Cấu trúc JSON (DiffViewerModal) */}
      <DiffViewerModal
        isOpen={isDiffModalOpen}
        onClose={() => {
          setIsDiffModalOpen(false);
          setSelectedLog(null);
        }}
        logItem={selectedLog}
      />
    </div>
  );
};
