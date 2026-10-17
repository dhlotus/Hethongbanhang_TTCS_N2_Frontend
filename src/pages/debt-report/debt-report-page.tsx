import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useDebtReport } from '../../hooks/use-debt-report';
import { DebtReportFilter } from '../../components/debt-report/debt-report-filter';
import { DebtReportTable } from '../../components/debt-report/debt-report-table';
import { ConfirmDialog } from '../../components/confirm-dialog';
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

  const [showExportConfirm, setShowExportConfirm] = useState(false);

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

  // Helper kiểm tra chính xác đại lý có nợ quá hạn hay không (Single Source of Truth)
  const isAgencyOverdue = (item: AgentDebtReport) => {
    return (
      item.isOverdue ||
      (item.overdueAmount || 0) > 0 ||
      (item.age31To60 || 0) > 0 ||
      (item.age61To90 || 0) > 0 ||
      (item.ageOver90 || 0) > 0 ||
      (item.oldestDebtDays || 0) > 30
    );
  };

  // Bộ lọc dữ liệu tức thì ở Client-side (Đảm bảo bảng cập nhật ngay lập tức khi đổi bất kỳ bộ lọc nào)
  const displayData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    let filtered = data;

    // 1. Lọc theo trạng thái nợ (Nợ trong hạn / Nợ quá hạn)
    if (params.debtStatus === 'IN_TERM' || params.isOverdue === false) {
      filtered = filtered.filter((item) => !isAgencyOverdue(item));
    } else if (
      params.debtStatus === 'OVERDUE' ||
      params.isOverdue === true ||
      params.isOverdueOnly
    ) {
      filtered = filtered.filter((item) => isAgencyOverdue(item));
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
    // Nếu dữ liệu hiển thị tương ứng toàn bộ dữ liệu trang từ server và không bị filter cục bộ phía client,
    // ưu tiên giữ nguyên summary từ server để đảm bảo tính tổng trên TOÀN BỘ đại lý (tất cả các trang phân trang)
    const isClientNarrowed = displayData.length !== data.length;

    if (!isClientNarrowed && summary && summary.totalAgencies > 0) {
      const totalAgencies = summary.totalAgencies || total;
      const overdueAgenciesCount = summary.overdueAgenciesCount || 0;
      const inTermAgenciesCount =
        summary.inTermAgenciesCount !== undefined
          ? summary.inTermAgenciesCount
          : Math.max(0, totalAgencies - overdueAgenciesCount);

      return {
        ...summary,
        totalAgencies,
        overdueAgenciesCount,
        inTermAgenciesCount,
      };
    }

    // Nếu người dùng lọc cục bộ phía client (VD: gõ tìm kiếm nhanh làm thu hẹp data trang)
    const totalAgencies = displayData.length;
    const totalPaid = displayData.reduce((acc, cur) => acc + (cur.totalPaid || 0), 0);
    const totalReceivable = displayData.reduce((acc, cur) => acc + (cur.totalReceivable || 0), 0);
    const remainingDebt = displayData.reduce((acc, cur) => acc + (cur.remainingDebt || 0), 0);
    const overdueCount = displayData.filter((item) => isAgencyOverdue(item)).length;
    const inTermCount = Math.max(0, totalAgencies - overdueCount);

    return {
      ...summary,
      totalAgencies,
      totalPaid,
      totalReceivable,
      remainingDebt,
      overdueAgenciesCount: overdueCount,
      inTermAgenciesCount: inTermCount,
    };
  }, [summary, displayData, data, total]);

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-3">
      {/* 1. Bộ lọc tìm kiếm, chọn nhóm tuổi nợ & Xuất Excel */}
      <DebtReportFilter
        params={params}
        onFilterChange={updateFilters}
        onExportExcel={() => setShowExportConfirm(true)}
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

      {/* Modal xác nhận xuất file Excel */}
      <ConfirmDialog
        isOpen={showExportConfirm}
        onCancel={() => setShowExportConfirm(false)}
        onConfirm={async () => {
          setShowExportConfirm(false);
          await exportExcel();
        }}
        title="Xác nhận xuất file Excel"
        message={
          <div className="space-y-2.5 text-sm text-slate-600">
            <p>
              Bạn có chắc chắn muốn xuất dữ liệu báo cáo <strong>Sổ công nợ & Phân tích tuổi nợ</strong> ra file Excel (.xlsx) không?
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng số đại lý xuất:</span>
                <span className="font-bold text-slate-800">{displaySummary.totalAgencies} đại lý</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bộ lọc nhóm tuổi nợ:</span>
                <span className="font-semibold text-slate-800">
                  {selectedAgingGroup === AgingDebtGroupEnum.ALL ? 'Tất cả nhóm tuổi nợ' : selectedAgingGroup}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái công nợ:</span>
                <span className="font-semibold text-slate-800">
                  {params.debtStatus === 'IN_TERM'
                    ? 'Nợ trong hạn'
                    : params.debtStatus === 'OVERDUE'
                    ? 'Nợ quá hạn'
                    : 'Tất cả trạng thái'}
                </span>
              </div>
            </div>
          </div>
        }
        confirmText="Xuất file Excel"
        cancelText="Hủy bỏ"
        type="primary"
        customIcon={<FileSpreadsheet className="w-5 h-5 text-emerald-600" />}
        iconBg="bg-emerald-100"
        confirmClassName="!bg-emerald-600 hover:!bg-emerald-700 active:!bg-emerald-800 !text-white"
        isLoading={exporting}
      />
    </div>
  );
};
