import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { debtReportService } from '../services/debt-report.service';
import { toast } from '../components/toast';
import {
  AgingDebtGroupEnum,
  type AgentDebtReport,
  type DebtReportSummary,
  type QueryDebtReportParams,
} from '../types/debt-report.type';

const INITIAL_SUMMARY: DebtReportSummary = {
  totalAgencies: 0,
  totalReceivable: 0,
  totalPaid: 0,
  remainingDebt: 0,
  totalAge0To30: 0,
  totalAge31To60: 0,
  totalAge61To90: 0,
  totalAgeOver90: 0,
  totalOverdueAmount: 0,
  overdueAgenciesCount: 0,
};

/**
 * Lọc bỏ các tham số rỗng hoặc giá trị mặc định để URL và payload API gọn gàng nhất
 */
export const cleanDebtQueryParams = (params: QueryDebtReportParams): Record<string, string> => {
  const result: Record<string, string> = {};

  if (params.search && params.search.trim()) {
    result.search = params.search.trim();
  }
  if (params.debtStatus && params.debtStatus !== 'ALL') {
    result.debtStatus = params.debtStatus;
  }
  if (params.isOverdue !== undefined) {
    result.isOverdue = String(params.isOverdue);
  }
  if (params.isOverdueOnly) {
    result.isOverdueOnly = 'true';
  }
  if (params.agingGroup && params.agingGroup !== AgingDebtGroupEnum.ALL) {
    result.agingGroup = params.agingGroup;
  }
  if (params.customerGroup && params.customerGroup.trim()) {
    result.customerGroup = params.customerGroup.trim();
  }
  if (params.region && params.region.trim()) {
    result.region = params.region.trim();
  }
  if (params.page && params.page > 1) {
    result.page = String(params.page);
  }
  if (params.limit && params.limit !== 20) {
    result.limit = String(params.limit);
  }
  if (params.sortBy && params.sortBy !== 'oldestDebtDays') {
    result.sortBy = params.sortBy;
  }
  if (params.sortOrder && params.sortOrder !== 'desc') {
    result.sortOrder = params.sortOrder;
  }

  return result;
};

/**
 * Chuyển đổi URL search params thành object QueryDebtReportParams có kiểu dữ liệu chuẩn
 */
export const parseDebtQueryParams = (searchParams: URLSearchParams): QueryDebtReportParams => {
  const search = searchParams.get('search') || '';
  const debtStatusRaw = searchParams.get('debtStatus');
  const debtStatus =
    debtStatusRaw === 'IN_TERM' || debtStatusRaw === 'OVERDUE'
      ? debtStatusRaw
      : 'ALL';

  const agingGroupRaw = searchParams.get('agingGroup') as AgingDebtGroupEnum;
  const agingGroup = Object.values(AgingDebtGroupEnum).includes(agingGroupRaw)
    ? agingGroupRaw
    : AgingDebtGroupEnum.ALL;

  const customerGroup = searchParams.get('customerGroup') || undefined;
  const region = searchParams.get('region') || undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20);

  const sortByRaw = searchParams.get('sortBy');
  const allowedSortBy = ['oldestDebtDays', 'remainingDebt', 'overdueAmount', 'agencyName', 'code'] as const;
  const sortBy = allowedSortBy.includes(sortByRaw as (typeof allowedSortBy)[number])
    ? (sortByRaw as (typeof allowedSortBy)[number])
    : 'oldestDebtDays';

  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  const isOverdueParam = searchParams.get('isOverdue');
  const isOverdue =
    isOverdueParam === 'true' ? true : isOverdueParam === 'false' ? false : undefined;
  const isOverdueOnly = searchParams.get('isOverdueOnly') === 'true';

  return {
    search,
    debtStatus,
    agingGroup,
    customerGroup,
    region,
    page,
    limit,
    sortBy,
    sortOrder,
    isOverdue,
    isOverdueOnly,
  };
};

/**
 * Custom hook quản lý trạng thái, dữ liệu và tối ưu hóa query parameters (SN-203)
 */
export const useDebtReport = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<AgentDebtReport[]>([]);
  const [summary, setSummary] = useState<DebtReportSummary>(INITIAL_SUMMARY);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Khởi tạo params ban đầu từ URL search params
  const [params, setParams] = useState<QueryDebtReportParams>(() =>
    parseDebtQueryParams(searchParams),
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Đồng bộ params lên URL mỗi khi params thay đổi (sạch sẽ, không tham số rác)
  const syncParamsToUrl = useCallback(
    (newParams: QueryDebtReportParams) => {
      const cleanObj = cleanDebtQueryParams(newParams);
      setSearchParams(cleanObj, { replace: true });
    },
    [setSearchParams],
  );

  const fetchDebtReport = useCallback(
    async (queryOverride?: QueryDebtReportParams) => {
      setLoading(true);
      try {
        const merged = {
          ...params,
          ...queryOverride,
        };

        // Chuẩn hóa query gửi đi API: loại bỏ chuỗi rỗng và giá trị mặc định 'ALL'
        const cleanPayload: QueryDebtReportParams = {
          page: merged.page || 1,
          limit: merged.limit || 20,
          sortBy: merged.sortBy || 'oldestDebtDays',
          sortOrder: merged.sortOrder || 'desc',
        };

        if (merged.search && merged.search.trim()) {
          cleanPayload.search = merged.search.trim();
        }
        if (merged.debtStatus && merged.debtStatus !== 'ALL') {
          cleanPayload.debtStatus = merged.debtStatus;
        }
        if (merged.isOverdue !== undefined) {
          cleanPayload.isOverdue = merged.isOverdue;
        }
        if (merged.isOverdueOnly) {
          cleanPayload.isOverdueOnly = true;
        }
        if (merged.agingGroup && merged.agingGroup !== AgingDebtGroupEnum.ALL) {
          cleanPayload.agingGroup = merged.agingGroup;
        }
        if (merged.customerGroup && merged.customerGroup.trim()) {
          cleanPayload.customerGroup = merged.customerGroup.trim();
        }
        if (merged.region && merged.region.trim()) {
          cleanPayload.region = merged.region.trim();
        }

        const res = await debtReportService.getDebtReport(cleanPayload);
        setData(res.data);
        setSummary(res.summary);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Lỗi khi tải sổ công nợ và tuổi nợ';
        toast.error('Tải dữ liệu thất bại', message);
      } finally {
        setLoading(false);
      }
    },
    [params],
  );

  // Kích hoạt fetch dữ liệu mỗi khi params thay đổi
  useEffect(() => {
    fetchDebtReport();
  }, [fetchDebtReport]);

  const updateFilters = useCallback(
    (newParams: Partial<QueryDebtReportParams>) => {
      setParams((prev) => {
        const next: QueryDebtReportParams = {
          ...prev,
          ...newParams,
          page: 1, // Luôn reset về trang 1 khi lọc
        };

        // Nếu có thay đổi search, debounce việc cập nhật URL để tránh re-render liên tục
        if (newParams.search !== undefined && newParams.search !== prev.search) {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            syncParamsToUrl(next);
          }, 300);
        } else {
          syncParamsToUrl(next);
        }

        return next;
      });
    },
    [syncParamsToUrl],
  );

  const toggleSort = useCallback(
    (column: 'oldestDebtDays' | 'remainingDebt' | 'overdueAmount' | 'agencyName' | 'code') => {
      setParams((prev) => {
        const isSame = prev.sortBy === column;
        const nextOrder: 'asc' | 'desc' = isSame && prev.sortOrder === 'desc' ? 'asc' : 'desc';
        const next: QueryDebtReportParams = {
          ...prev,
          sortBy: column,
          sortOrder: nextOrder,
          page: 1,
        };
        syncParamsToUrl(next);
        return next;
      });
    },
    [syncParamsToUrl],
  );

  const changeAgingGroup = useCallback(
    (group: AgingDebtGroupEnum) => {
      updateFilters({ agingGroup: group });
    },
    [updateFilters],
  );

  const changePage = useCallback(
    (newPage: number) => {
      setParams((prev) => {
        const next: QueryDebtReportParams = {
          ...prev,
          page: newPage,
        };
        syncParamsToUrl(next);
        return next;
      });
    },
    [syncParamsToUrl],
  );

  const changePageSize = useCallback(
    (newPageSize: number) => {
      setParams((prev) => {
        const next: QueryDebtReportParams = {
          ...prev,
          limit: newPageSize,
          page: 1,
        };
        syncParamsToUrl(next);
        return next;
      });
    },
    [syncParamsToUrl],
  );

  const exportExcel = useCallback(async () => {
    setExporting(true);
    try {
      const cleanPayload: QueryDebtReportParams = {
        sortBy: params.sortBy || 'oldestDebtDays',
        sortOrder: params.sortOrder || 'desc',
      };

      if (params.search && params.search.trim()) {
        cleanPayload.search = params.search.trim();
      }
      if (params.debtStatus && params.debtStatus !== 'ALL') {
        cleanPayload.debtStatus = params.debtStatus;
      }
      if (params.agingGroup && params.agingGroup !== AgingDebtGroupEnum.ALL) {
        cleanPayload.agingGroup = params.agingGroup;
      }
      if (params.customerGroup && params.customerGroup.trim()) {
        cleanPayload.customerGroup = params.customerGroup.trim();
      }
      if (params.region && params.region.trim()) {
        cleanPayload.region = params.region.trim();
      }

      const blob = await debtReportService.exportDebtReportToExcel(cleanPayload);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `So_Cong_No_Va_Tuoi_No_${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(
        'Xuất Excel thành công',
        'Báo cáo sổ công nợ và phân tích tuổi nợ đã được tải xuống.',
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Không thể xuất file Excel báo cáo';
      toast.error('Xuất file thất bại', message);
    } finally {
      setExporting(false);
    }
  }, [params]);

  return {
    data,
    summary,
    loading,
    exporting,
    total,
    totalPages,
    params,
    selectedAgingGroup: params.agingGroup || AgingDebtGroupEnum.ALL,
    setSelectedAgingGroup: changeAgingGroup,
    fetchDebtReport,
    updateFilters,
    toggleSort,
    changePage,
    changePageSize,
    exportExcel,
  };
};
