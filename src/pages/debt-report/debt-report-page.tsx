import React from 'react';
import { Landmark } from 'lucide-react';
import { useDebtReport } from '../../hooks/use-debt-report';
import { DebtReportSummaryCards } from '../../components/debt-report/debt-report-summary';
import { DebtReportFilter } from '../../components/debt-report/debt-report-filter';
import { DebtReportTable } from '../../components/debt-report/debt-report-table';

/**
 * Màn hình Sổ công nợ và Phân tích tuổi nợ đại lý (Ticket SN-203)
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
    fetchDebtReport,
    updateFilters,
    changePage,
    exportExcel,
  } = useDebtReport();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Tiêu đề trang & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Sổ Công Nợ & Phân Tích Tuổi Nợ
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Theo dõi phát sinh công nợ, đối chiếu thu chi và phân loại tuổi nợ quá hạn (Aging Schedule) theo đại lý
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Thẻ tóm tắt chỉ số tài chính */}
      <DebtReportSummaryCards summary={summary} loading={loading} />

      {/* Bộ lọc tìm kiếm & Xuất Excel */}
      <DebtReportFilter
        params={params}
        onFilterChange={updateFilters}
        onExportExcel={exportExcel}
        onRefresh={() => fetchDebtReport()}
        exporting={exporting}
        loading={loading}
      />

      {/* Bảng dữ liệu công nợ kèm dòng tổng cộng ở chân bảng */}
      <DebtReportTable
        data={data}
        summary={summary}
        loading={loading}
        page={params.page || 1}
        limit={params.limit || 20}
        total={total}
        totalPages={totalPages}
        onPageChange={changePage}
      />
    </div>
  );
};
