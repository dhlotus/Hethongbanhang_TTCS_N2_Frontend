import React, { useState, useEffect, useCallback } from "react";
import { AuditFilterBar } from "../components/audit-log/audit-filter-bar";
import { AuditTable } from "../components/audit-log/audit-table";
import { DiffViewerModal } from "../components/audit-log/diff-viewer-modal";
import { showToast } from "../components/toast";
import { auditLogService } from "../services/audit-log.service";
import type {
  AuditLogItem,
  AuditLogQueryParams,
  PaginatedAuditLogsResponse,
} from "../types/audit-log";

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
    } catch {
      showToast("error", "Không thể tải nhật ký hệ thống");
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
    <div className="space-y-4 sm:space-y-5">

      {/* Khu vực Bộ lọc và thao tác (FilterBar) */}
      <AuditFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        totalResults={total}
        onRefresh={loadAuditLogs}
        loading={loading}
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
