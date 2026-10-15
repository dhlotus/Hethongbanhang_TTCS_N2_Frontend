import React from 'react';
import { useDebtReport } from '../../hooks/use-debt-report';
import { DebtReportFilter } from '../../components/debt-report/debt-report-filter';
import { DebtReportTable } from '../../components/debt-report/debt-report-table';
import {
  AgingDebtGroupEnum,
  type AgentDebtReport,
} from '../../types/debt-report.type';

/**
 * Màn hình Sổ công nợ và Phân tích tuổi nợ đại lý (Ticket SN-203)
 * Giao diện tối ưu theo phong cách Compact, đưa bảng dữ liệu lên cao ngay trong tầm nhìn người dùng.
 */
export const DebtReportPage: React.FC = () => {
  const {
    data,
    summary,
    loading,
    exporting,
    total,
    totalPages,
    params,
    selectedAgingGroup,
    fetchDebtReport,
    updateFilters,
    toggleSort,
    changePage,
    changePageSize,
    exportExcel,
  } = useDebtReport();

  const criticalOverdueCount = React.useMemo(() => {
    return data.filter((item) => (item.ageOver90 || 0) > 0).length;
  }, [data]);

  const getAgencyAgingGroup = (item: AgentDebtReport): AgingDebtGroupEnum => {
    if ((item.ageOver90 || 0) > 0 || (item.oldestDebtDays || 0) > 90) {
      return AgingDebtGroupEnum.AGE_OVER_90;
    }
    if ((item.age61To90 || 0) > 0 || (item.oldestDebtDays || 0) > 60) {
      return AgingDebtGroupEnum.AGE_61_90;
    }
    if ((item.age31To60 || 0) > 0 || (item.oldestDebtDays || 0) > 30) {
      return AgingDebtGroupEnum.AGE_31_60;
    }
    return AgingDebtGroupEnum.AGE_0_30;
  };

  // Bộ lọc dữ liệu tức thì ở Client-side (Đảm bảo bảng cập nhật ngay lập tức khi đổi bất kỳ bộ lọc nào)
  const displayData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    let filtered = data;

    // 1. Lọc theo trạng thái nợ (Nợ trong hạn / Nợ quá hạn)
    if (params.debtStatus === 'IN_TERM' || params.isOverdue === false) {
      filtered = filtered.filter((item) => !item.isOverdue && (item.overdueAmount || 0) <= 0);
    } else if (
      params.debtStatus === 'OVERDUE' ||
      params.isOverdue === true ||
      params.isOverdueOnly
    ) {
      filtered = filtered.filter((item) => item.isOverdue || (item.overdueAmount || 0) > 0);
    }

    // 2. Lọc theo nhóm tuổi nợ (0-30, 31-60, 61-90, Trên 90 ngày)
    const activeAging = params.agingGroup || selectedAgingGroup;
    if (activeAging && activeAging !== AgingDebtGroupEnum.ALL) {
      filtered = filtered.filter((item) => getAgencyAgingGroup(item) === activeAging);
    }

    // 3. Lọc theo cấp đại lý
    if (params.customerGroup) {
      filtered = filtered.filter((item) => item.customerGroup === params.customerGroup);
    }

    // 4. Lọc theo từ khóa tìm kiếm
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.agencyCode.toLowerCase().includes(q) ||
          item.agencyName.toLowerCase().includes(q) ||
          (item.phone && item.phone.toLowerCase().includes(q)),
      );
    }

    return filtered;
  }, [data, params, selectedAgingGroup]);

  // Tổng hợp dữ liệu hiển thị chân bảng đồng bộ với bộ lọc hiện tại
  const displaySummary = React.useMemo(() => {
    const totalAgencies = displayData.length;
    const totalPaid = displayData.reduce((acc, cur) => acc + (cur.totalPaid || 0), 0);
    const totalReceivable = displayData.reduce((acc, cur) => acc + (cur.totalReceivable || 0), 0);
    const remainingDebt = displayData.reduce((acc, cur) => acc + (cur.remainingDebt || 0), 0);
    const overdueCount = displayData.filter((item) => item.isOverdue || (item.overdueAmount || 0) > 0).length;
    const inTermCount = totalAgencies - overdueCount;

    return {
      ...summary,
      totalAgencies,
      totalPaid,
      totalReceivable,
      remainingDebt,
      overdueAgenciesCount: overdueCount,
      inTermAgenciesCount: inTermCount,
    };
  }, [summary, displayData]);

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-3">
      {/* 1. Bộ lọc tìm kiếm, chọn nhóm tuổi nợ & Xuất Excel */}
      <DebtReportFilter
        params={params}
        onFilterChange={updateFilters}
        onExportExcel={exportExcel}
        onRefresh={() => fetchDebtReport()}
        exporting={exporting}
        loading={loading}
        criticalOverdueCount={criticalOverdueCount}
      />

      {/* 3. Bảng dữ liệu công nợ 6 cột chuẩn quy định */}
      <DebtReportTable
        data={displayData}
        summary={displaySummary}
        debtStatus={params.debtStatus}
        loading={loading}
        page={params.page || 1}
        limit={params.limit || 20}
        total={displayData.length !== data.length ? displayData.length : total}
        totalPages={
          displayData.length !== data.length
            ? Math.ceil(displayData.length / (params.limit || 20)) || 1
            : totalPages
        }
        selectedAgingGroup={selectedAgingGroup}
        sortBy={params.sortBy}
        sortOrder={params.sortOrder}
        onSort={toggleSort}
        onPageChange={changePage}
        onPageSizeChange={changePageSize}
      />
    </div>
  );
};
