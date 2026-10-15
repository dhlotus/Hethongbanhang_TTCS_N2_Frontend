import React from 'react';
import {
  Search,
  FileSpreadsheet,
  RotateCw,
  AlertCircle,
  Filter,
} from 'lucide-react';
import {
  AgingDebtGroup,
  AGING_DEBT_GROUP_LABELS,
  type QueryDebtReportParams,
} from '../../types/debt-report.type';

interface DebtReportFilterProps {
  params: QueryDebtReportParams;
  onFilterChange: (newParams: Partial<QueryDebtReportParams>) => void;
  onExportExcel: () => void;
  onRefresh: () => void;
  exporting: boolean;
  loading: boolean;
}

/**
 * Thanh công cụ tìm kiếm và lọc dữ liệu Sổ công nợ (SN-203)
 */
export const DebtReportFilter: React.FC<DebtReportFilterProps> = ({
  params,
  onFilterChange,
  onExportExcel,
  onRefresh,
  exporting,
  loading,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
  };

  const handleOverdueToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ isOverdueOnly: e.target.checked });
  };

  const handleAgingGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFilterChange({
      agingGroup: val ? (val as AgingDebtGroup) : undefined,
    });
  };

  const handleCustomerGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFilterChange({
      customerGroup: val ? val : undefined,
    });
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Nhóm tìm kiếm và lọc */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Ô tìm kiếm từ khóa */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên đại lý, SĐT..."
              value={params.search || ''}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Lọc theo Nhóm tuổi nợ */}
          <div className="flex items-center gap-1.5 text-sm">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={params.agingGroup || ''}
              onChange={handleAgingGroupChange}
              className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              <option value="">Tất cả nhóm tuổi nợ</option>
              <option value={AgingDebtGroup.AGE_0_30}>
                {AGING_DEBT_GROUP_LABELS[AgingDebtGroup.AGE_0_30]}
              </option>
              <option value={AgingDebtGroup.AGE_31_60}>
                {AGING_DEBT_GROUP_LABELS[AgingDebtGroup.AGE_31_60]}
              </option>
              <option value={AgingDebtGroup.AGE_61_90}>
                {AGING_DEBT_GROUP_LABELS[AgingDebtGroup.AGE_61_90]}
              </option>
              <option value={AgingDebtGroup.AGE_OVER_90}>
                {AGING_DEBT_GROUP_LABELS[AgingDebtGroup.AGE_OVER_90]}
              </option>
            </select>
          </div>

          {/* Lọc theo Cấp đại lý */}
          <select
            value={params.customerGroup || ''}
            onChange={handleCustomerGroupChange}
            className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          >
            <option value="">Tất cả cấp đại lý</option>
            <option value="AGENT_LEVEL_1">Đại lý Cấp 1</option>
            <option value="AGENT_LEVEL_2">Đại lý Cấp 2</option>
          </select>

          {/* Lọc riêng nhóm quá hạn (Checkbox nổi bật) */}
          <label
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer select-none transition-colors ${
              params.isOverdueOnly
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <input
              type="checkbox"
              checked={!!params.isOverdueOnly}
              onChange={handleOverdueToggle}
              className="w-4 h-4 rounded-sm text-rose-600 focus:ring-rose-500 focus:ring-offset-0 border-slate-300 cursor-pointer"
            />
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>Lọc riêng nợ quá hạn</span>
          </label>
        </div>

        {/* Nút Xuất Excel & Làm mới */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Làm mới dữ liệu"
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Đang xuất file...' : 'Xuất Excel'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
