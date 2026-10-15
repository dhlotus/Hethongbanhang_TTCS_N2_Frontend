import React from 'react';
import { useDebtReport } from '../../hooks/use-debt-report';
import { DebtReportSummaryCards } from '../../components/debt-report/debt-report-summary';
import { DebtReportFilter } from '../../components/debt-report/debt-report-filter';
import { DebtReportTable } from '../../components/debt-report/debt-report-table';

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
    changePage,
    exportExcel,
  } = useDebtReport();

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-3">
      {/* 1. Thanh Widget thống kê 1 dòng mỏng nhẹ (Compact Summary Bar) */}
      <DebtReportSummaryCards summary={summary} loading={loading} />

      {/* 2. Bộ lọc tìm kiếm, chọn nhóm tuổi nợ & Xuất Excel */}
      <DebtReportFilter
        params={params}
        onFilterChange={updateFilters}
        onExportExcel={exportExcel}
        onRefresh={() => fetchDebtReport()}
        exporting={exporting}
        loading={loading}
      />

      {/* 3. Bảng dữ liệu công nợ 6 cột chuẩn quy định */}
      <DebtReportTable
        data={data}
        summary={summary}
        loading={loading}
        page={params.page || 1}
        limit={params.limit || 20}
        total={total}
        totalPages={totalPages}
        selectedAgingGroup={selectedAgingGroup}
        onPageChange={changePage}
      />
    </div>
  );
};
