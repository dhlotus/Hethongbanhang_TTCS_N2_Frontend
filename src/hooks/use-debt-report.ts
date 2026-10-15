import { useState, useCallback, useEffect } from 'react';
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
 * Custom hook quản lý trạng thái, dữ liệu và dải tuổi nợ lọc sổ công nợ (SN-203)
 */
export const useDebtReport = () => {
  const [data, setData] = useState<AgentDebtReport[]>([]);
  const [summary, setSummary] = useState<DebtReportSummary>(INITIAL_SUMMARY);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedAgingGroup, setSelectedAgingGroup] = useState<AgingDebtGroupEnum>(
    AgingDebtGroupEnum.ALL,
  );
  const [params, setParams] = useState<QueryDebtReportParams>({
    page: 1,
    limit: 20,
    search: '',
    debtStatus: 'ALL',
    isOverdueOnly: false,
    agingGroup: AgingDebtGroupEnum.ALL,
    sortBy: 'oldestDebtDays',
    sortOrder: 'desc',
  });

  const fetchDebtReport = useCallback(
    async (queryOverride?: QueryDebtReportParams) => {
      setLoading(true);
      try {
        const mergedParams = {
          ...params,
          ...queryOverride,
        };
        const effectiveAging =
          mergedParams.agingGroup !== undefined
            ? mergedParams.agingGroup
            : selectedAgingGroup;

        const query: QueryDebtReportParams = {
          ...mergedParams,
          agingGroup:
            effectiveAging !== AgingDebtGroupEnum.ALL
              ? effectiveAging
              : undefined,
          debtStatus:
            mergedParams.debtStatus && mergedParams.debtStatus !== 'ALL'
              ? mergedParams.debtStatus
              : undefined,
        };
        const res = await debtReportService.getDebtReport(query);
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
    [params, selectedAgingGroup],
  );

  useEffect(() => {
    fetchDebtReport();
  }, [fetchDebtReport]);

  const updateFilters = useCallback(
    (newParams: Partial<QueryDebtReportParams>) => {
      if (newParams.agingGroup !== undefined) {
        setSelectedAgingGroup(newParams.agingGroup);
      }
      setParams((prev) => ({
        ...prev,
        ...newParams,
        page: 1, // Reset về trang 1 khi đổi bộ lọc
      }));
    },
    [],
  );

  const toggleSort = useCallback(
    (column: 'oldestDebtDays' | 'remainingDebt' | 'overdueAmount' | 'agencyName' | 'code') => {
      setParams((prev) => {
        const isSame = prev.sortBy === column;
        const nextOrder: 'asc' | 'desc' = isSame && prev.sortOrder === 'desc' ? 'asc' : 'desc';
        return {
          ...prev,
          sortBy: column,
          sortOrder: nextOrder,
          page: 1,
        };
      });
    },
    [],
  );

  const changeAgingGroup = useCallback((group: AgingDebtGroupEnum) => {
    setSelectedAgingGroup(group);
    setParams((prev) => ({
      ...prev,
      agingGroup: group,
      page: 1,
    }));
  }, []);

  const changePage = useCallback((newPage: number) => {
    setParams((prev) => ({
      ...prev,
      page: newPage,
    }));
  }, []);

  const changePageSize = useCallback((newPageSize: number) => {
    setParams((prev) => ({
      ...prev,
      limit: newPageSize,
      page: 1,
    }));
  }, []);

  const exportExcel = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams: QueryDebtReportParams = {
        ...params,
        agingGroup:
          selectedAgingGroup !== AgingDebtGroupEnum.ALL
            ? selectedAgingGroup
            : undefined,
      };
      const blob = await debtReportService.exportDebtReportToExcel(exportParams);
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
  }, [params, selectedAgingGroup]);

  return {
    data,
    summary,
    loading,
    exporting,
    total,
    totalPages,
    params,
    selectedAgingGroup,
    setSelectedAgingGroup: changeAgingGroup,
    fetchDebtReport,
    updateFilters,
    toggleSort,
    changePage,
    changePageSize,
    exportExcel,
  };
};
