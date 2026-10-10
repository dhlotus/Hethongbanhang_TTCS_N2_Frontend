import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuditFilterBar } from '../components/audit-log/audit-filter-bar';
import { AuditTable } from '../components/audit-log/audit-table';
import { DiffViewerModal } from '../components/audit-log/diff-viewer-modal';
import { showToast } from '../components/toast';
import { auditLogService } from '../services/audit-log.service';
import type {
  AuditLogItem,
  AuditLogQueryParams,
  PaginatedAuditLogsResponse,
  AuditEntityType,
  AuditActionType,
} from '../types/audit-log';

/**
 * Bản đồ ánh xạ Phân hệ nghiệp vụ (Entity) sang URL slug chuẩn
 * Ví dụ: INVENTORY -> inventory, ORDER -> orders
 */
const ENTITY_TO_MODULE_MAP: Record<AuditEntityType, string> = {
  INVENTORY: 'inventory',
  DEBT: 'debt',
  PRICING: 'pricing',
  ORDER: 'orders',
  USER: 'user',
};

/**
 * Phân tích tham số module/entity từ URL sang AuditEntityType
 */
const parseModuleParam = (param: string | null): AuditEntityType | 'ALL' => {
  if (!param || param === 'ALL') return 'ALL';
  const lower = param.toLowerCase().trim();
  if (lower === 'inventory' || lower === 'stock') return 'INVENTORY';
  if (lower === 'debt' || lower === 'credit') return 'DEBT';
  if (lower === 'pricing' || lower === 'price') return 'PRICING';
  if (lower === 'order' || lower === 'orders') return 'ORDER';
  if (lower === 'user' || lower === 'users' || lower === 'account') return 'USER';
  const upper = param.toUpperCase().trim() as AuditEntityType;
  if (['INVENTORY', 'DEBT', 'PRICING', 'ORDER', 'USER'].includes(upper)) {
    return upper;
  }
  return 'ALL';
};

/**
 * Bản đồ ánh xạ Loại hành động (Action) sang URL slug chuẩn
 * Ví dụ: UPDATE -> update, CREATE -> create
 */
const ACTION_TO_PARAM_MAP: Record<AuditActionType, string> = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  CANCEL: 'cancel',
  STOCK_ADJUST: 'stock_adjust',
};

/**
 * Phân tích tham số action từ URL sang AuditActionType
 */
const parseActionParam = (param: string | null): AuditActionType | 'ALL' => {
  if (!param || param === 'ALL') return 'ALL';
  const lower = param.toLowerCase().trim();
  if (lower === 'create') return 'CREATE';
  if (lower === 'update') return 'UPDATE';
  if (lower === 'delete') return 'DELETE';
  if (lower === 'approve') return 'APPROVE';
  if (lower === 'cancel') return 'CANCEL';
  if (lower === 'stock_adjust' || lower === 'adjust') return 'STOCK_ADJUST';
  const upper = param.toUpperCase().trim() as AuditActionType;
  if (['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'CANCEL', 'STOCK_ADJUST'].includes(upper)) {
    return upper;
  }
  return 'ALL';
};

/**
 * Kiểm tra và chuẩn hóa chuỗi ngày YYYY-MM-DD
 */
const parseDateParam = (param: string | null): string => {
  if (!param) return '';
  const trimmed = param.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : '';
};

export const AuditLogsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Khôi phục giá trị ban đầu từ URL Query Parameters khi F5, mở trực tiếp hoặc chia sẻ liên kết
  const initialModule = parseModuleParam(
    searchParams.get('module') || searchParams.get('entity')
  );
  const initialAction = parseActionParam(searchParams.get('action'));
  const initialDateFrom = parseDateParam(
    searchParams.get('date_from') || searchParams.get('startDate')
  );
  const initialDateTo = parseDateParam(
    searchParams.get('date_to') || searchParams.get('endDate')
  );
  const initialSearch = (
    searchParams.get('search') ||
    searchParams.get('searchUser') ||
    searchParams.get('q') ||
    ''
  ).trim();
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(initialPage);
  const [limit, setLimit] = useState<number>(20); // Mặc định 20 dòng/trang
  const [totalPages, setTotalPages] = useState<number>(1);

  // Bộ lọc đồng bộ State
  const [filters, setFilters] = useState<AuditLogQueryParams>({
    startDate: initialDateFrom,
    endDate: initialDateTo,
    userId: 'ALL',
    searchUser: initialSearch,
    entity: initialModule,
    action: initialAction,
  });

  // Modal xem chi tiết Diff JSON
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);

  // Lấy logId từ URL Query Parameters
  const activeLogId = searchParams.get('logId');

  // Hàm cập nhật URL search parameters an toàn, tránh re-render toàn bộ trang và không spam history stack
  const updateUrlParams = useCallback(
    (newFilters: Partial<AuditLogQueryParams>, newPage?: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          // Giữ lại logId nếu modal chi tiết đang mở
          const currentLogId = prev.get('logId');
          if (currentLogId) {
            next.set('logId', currentLogId);
          }

          // 1. Phân hệ nghiệp vụ (?module=inventory)
          const targetEntity =
            newFilters.entity !== undefined ? newFilters.entity : filters.entity;
          if (targetEntity && targetEntity !== 'ALL') {
            next.set('module', ENTITY_TO_MODULE_MAP[targetEntity] || targetEntity.toLowerCase());
            next.delete('entity');
          } else {
            next.delete('module');
            next.delete('entity');
          }

          // 2. Loại hành động (?action=update)
          const targetAction =
            newFilters.action !== undefined ? newFilters.action : filters.action;
          if (targetAction && targetAction !== 'ALL') {
            next.set('action', ACTION_TO_PARAM_MAP[targetAction] || targetAction.toLowerCase());
          } else {
            next.delete('action');
          }

          // 3. Từ ngày (?date_from=2026-10-01)
          const targetFrom =
            newFilters.startDate !== undefined ? newFilters.startDate : filters.startDate;
          if (targetFrom) {
            next.set('date_from', targetFrom);
            next.delete('startDate');
          } else {
            next.delete('date_from');
            next.delete('startDate');
          }

          // 4. Đến ngày (?date_to=2026-10-10)
          const targetTo =
            newFilters.endDate !== undefined ? newFilters.endDate : filters.endDate;
          if (targetTo) {
            next.set('date_to', targetTo);
            next.delete('endDate');
          } else {
            next.delete('date_to');
            next.delete('endDate');
          }

          // 5. Từ khóa tìm kiếm (?search=...)
          const targetSearch =
            newFilters.searchUser !== undefined ? newFilters.searchUser : filters.searchUser;
          const trimmedSearch = (targetSearch || '').trim();
          if (trimmedSearch) {
            next.set('search', trimmedSearch);
            next.delete('searchUser');
            next.delete('q');
          } else {
            next.delete('search');
            next.delete('searchUser');
            next.delete('q');
          }

          // 6. Phân trang (?page=...)
          const targetPage = newPage !== undefined ? newPage : page;
          if (targetPage > 1) {
            next.set('page', String(targetPage));
          } else {
            // Giữ param page=1 nếu URL ban đầu đã có hoặc xóa khi trở về trang 1
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
    [filters, page, setSearchParams]
  );

  // Lắng nghe thay đổi của URL search parameters (hỗ trợ nút Back / Forward trên trình duyệt)
  useEffect(() => {
    const urlModule = parseModuleParam(
      searchParams.get('module') || searchParams.get('entity')
    );
    const urlAction = parseActionParam(searchParams.get('action'));
    const urlFrom = parseDateParam(
      searchParams.get('date_from') || searchParams.get('startDate')
    );
    const urlTo = parseDateParam(
      searchParams.get('date_to') || searchParams.get('endDate')
    );
    const urlSearch = (
      searchParams.get('search') ||
      searchParams.get('searchUser') ||
      searchParams.get('q') ||
      ''
    ).trim();
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

    setFilters((prev) => {
      if (
        prev.entity !== urlModule ||
        prev.action !== urlAction ||
        prev.startDate !== urlFrom ||
        prev.endDate !== urlTo ||
        prev.searchUser !== urlSearch
      ) {
        return {
          ...prev,
          entity: urlModule,
          action: urlAction,
          startDate: urlFrom,
          endDate: urlTo,
          searchUser: urlSearch,
        };
      }
      return prev;
    });

    if (urlPage !== page) {
      setPage(urlPage);
    }
  }, [searchParams]);

  // Tự động khôi phục và mở Popup chi tiết khi URL có chứa logId (Reload trang, Back/Forward hoặc Share link)
  useEffect(() => {
    if (!activeLogId) {
      // Khi URL không còn logId (người dùng bấm Back), đóng modal nếu đang mở
      if (isDiffModalOpen) {
        setIsDiffModalOpen(false);
        setSelectedLog(null);
      }
      return;
    }

    // Nếu modal đã mở đúng bản ghi này thì không cần tải lại
    if (selectedLog && selectedLog.id === activeLogId && isDiffModalOpen) {
      return;
    }

    // 1. Kiểm tra nếu bản ghi đã có sẵn trong danh sách logs hiện tại
    const existingItem = logs.find((l) => l.id === activeLogId);
    if (existingItem) {
      setSelectedLog(existingItem);
      setIsDiffModalOpen(true);
      return;
    }

    // 2. Nếu chưa có trong danh sách (khi reload hoặc truy cập link chia sẻ trực tiếp), gọi API lấy chi tiết
    let isSubscribed = true;
    auditLogService
      .getAuditLogById(activeLogId)
      .then((detail) => {
        if (!isSubscribed) return;
        if (detail) {
          setSelectedLog(detail);
          setIsDiffModalOpen(true);
        } else {
          showToast('warning', 'Không tìm thấy chi tiết bản ghi nhật ký');
          // Dọn dẹp logId không hợp lệ khỏi URL nhưng giữ nguyên các bộ lọc
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete('logId');
              return next;
            },
            { replace: true }
          );
        }
      })
      .catch(() => {
        if (!isSubscribed) return;
        showToast('error', 'Không thể tải chi tiết bản ghi nhật ký');
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('logId');
            return next;
          },
          { replace: true }
        );
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeLogId, logs, isDiffModalOpen, selectedLog, setSearchParams]);

  // Tải danh sách nhật ký từ Backend thực tế
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
      showToast('error', 'Không thể tải nhật ký hệ thống');
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Cập nhật bộ lọc kết hợp với đồng bộ URL
  const handleFilterChange = (newFilters: Partial<AuditLogQueryParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
    updateUrlParams(newFilters, 1);
  };

  // Đặt lại bộ lọc về mặc định
  const handleResetFilters = () => {
    const resetValues: AuditLogQueryParams = {
      startDate: '',
      endDate: '',
      userId: 'ALL',
      searchUser: '',
      entity: 'ALL',
      action: 'ALL',
    };
    setFilters(resetValues);
    setPage(1);
    setIsDiffModalOpen(false);
    setSelectedLog(null);
    setSearchParams({}, { replace: true });
  };

  // Chuyển trang
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams({}, newPage);
  };

  // Đổi số dòng hiển thị trên một trang
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    updateUrlParams({}, 1);
  };

  // 1. Mở modal xem diff đồng thời cập nhật logId lên URL
  const handleViewDiff = (item: AuditLogItem) => {
    setSelectedLog(item);
    setIsDiffModalOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('logId', item.id);
        return next;
      },
      { replace: true }
    );
  };

  // 3. Đóng modal và xóa logId khỏi URL, giữ nguyên các tham số lọc hiện tại
  const handleCloseDiff = () => {
    setIsDiffModalOpen(false);
    setSelectedLog(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('logId');
        return next;
      },
      { replace: true }
    );
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
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onViewDiff={handleViewDiff}
      />

      {/* 4. Modal So sánh Chi tiết Cấu trúc JSON (DiffViewerModal) */}
      <DiffViewerModal
        isOpen={isDiffModalOpen}
        onClose={handleCloseDiff}
        logItem={selectedLog}
      />
    </div>
  );
};
