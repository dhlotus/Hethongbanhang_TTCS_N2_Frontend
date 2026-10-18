import React, { useRef } from 'react';
import {
  Search,
  FileSpreadsheet,
} from 'lucide-react';
import { showToast } from '../toast';
import {
  AgingDebtGroupEnum,
  AGING_DEBT_GROUP_LABELS,
  type QueryDebtReportParams,
} from '../../types/debt-report.type';

export type DebtStatusFilterType = 'ALL' | 'CURRENT' | 'OVERDUE';

interface DebtReportFilterProps {
  params: QueryDebtReportParams;
  onFilterChange: (newParams: Partial<QueryDebtReportParams>) => void;
  onExportExcel: () => void;
  onRefresh?: () => void;
  exporting: boolean;
  loading: boolean;
  criticalOverdueCount?: number;
}

const TOAST_SESSION_KEY = 'debt_warning_90d_shown';

/**
 * Thanh công cụ tìm kiếm và lọc dữ liệu Sổ công nợ (SN-203)
 * Giữ nguyên Layout 1 dòng duy nhất (Single Row), đồng bộ các dropdown lọc (bỏ icon và màu).
 */
export const DebtReportFilter: React.FC<DebtReportFilterProps> = ({
  params,
  onFilterChange,
  onExportExcel,
  exporting,
  loading,
  criticalOverdueCount = 0,
}) => {
  const hasShownToastRef = useRef<boolean>(false);

  // Xác định trạng thái active hiện tại dựa vào params
  const getActiveStatus = (): DebtStatusFilterType => {
    if (params.debtStatus === 'IN_TERM' || params.isOverdue === false) {
      return 'CURRENT';
    }
    if (
      params.debtStatus === 'OVERDUE' ||
      params.isOverdue === true ||
      params.isOverdueOnly
    ) {
      return 'OVERDUE';
    }
    return 'ALL';
  };

  const activeStatus = getActiveStatus();

  // Hàm bắn Toast cảnh báo ĐÚNG 1 LẦN DUY NHẤT dựa trên thao tác người dùng
  const triggerToastOnce = () => {
    try {
      const alreadyShown = sessionStorage.getItem(TOAST_SESSION_KEY);
      if (alreadyShown || hasShownToastRef.current) return;

      sessionStorage.setItem(TOAST_SESSION_KEY, 'true');
      hasShownToastRef.current = true;

      const count = criticalOverdueCount > 0 ? criticalOverdueCount : 'nhiều';
      showToast(
        'warning',
        `⚠️ Cảnh báo: Phát hiện ${count} đại lý có khoản nợ quá hạn trên 90 ngày. Cần ưu tiên xử lý thu hồi nợ khẩn cấp!`,
      );
    } catch {
      const count = criticalOverdueCount > 0 ? criticalOverdueCount : 'nhiều';
      showToast(
        'warning',
        `⚠️ Cảnh báo: Phát hiện ${count} đại lý có khoản nợ quá hạn trên 90 ngày. Cần ưu tiên xử lý thu hồi nợ khẩn cấp!`,
      );
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      search: e.target.value,
      page: 1,
    });
  };

  const handleAgingGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as AgingDebtGroupEnum;
    onFilterChange({
      agingGroup: val,
    });

    // Chỉ bắn Toast khi người dùng chủ động chọn nhóm tuổi nợ Trên 90 ngày
    if (val === AgingDebtGroupEnum.AGE_OVER_90) {
      triggerToastOnce();
    }
  };

  const handleCustomerGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFilterChange({
      customerGroup: val ? val : undefined,
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextOpt = e.target.value as DebtStatusFilterType;
    if (nextOpt === 'ALL') {
      onFilterChange({
        debtStatus: 'ALL',
        isOverdue: undefined,
        isOverdueOnly: false,
      });
    } else if (nextOpt === 'CURRENT') {
      onFilterChange({
        debtStatus: 'IN_TERM',
        isOverdue: false,
        isOverdueOnly: false,
      });
    } else if (nextOpt === 'OVERDUE') {
      onFilterChange({
        debtStatus: 'OVERDUE',
        isOverdue: true,
        isOverdueOnly: true,
      });
      // Nếu có nợ > 90 ngày thì kích hoạt Toast 1 lần
      if (criticalOverdueCount > 0) {
        triggerToastOnce();
      }
    }
  };

  return (
    <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs font-sans antialiased relative z-30 overflow-visible">
      {/* CÙNG 1 DÒNG DUY NHẤT (Single Row) - Chống rớt dòng */}
      <div className="flex items-center gap-2.5 flex-nowrap w-full overflow-visible">
        {/* 1. Ô tìm kiếm */}
        <div className="relative min-w-[160px] max-w-[240px] flex-1 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã, tên đại lý..."
            value={params.search || ''}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 font-sans text-sm font-medium antialiased bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* 2. Lọc theo Nhóm tuổi nợ */}
        <div className="shrink-0">
          <select
            value={params.agingGroup || AgingDebtGroupEnum.ALL}
            onChange={handleAgingGroupChange}
            className="py-2 px-3 font-sans text-sm font-medium antialiased bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value={AgingDebtGroupEnum.ALL}>Tất cả nhóm tuổi nợ</option>
            <option value={AgingDebtGroupEnum.AGE_0_30}>
              {AGING_DEBT_GROUP_LABELS[AgingDebtGroupEnum.AGE_0_30]}
            </option>
            <option value={AgingDebtGroupEnum.AGE_31_60}>
              {AGING_DEBT_GROUP_LABELS[AgingDebtGroupEnum.AGE_31_60]}
            </option>
            <option value={AgingDebtGroupEnum.AGE_61_90}>
              {AGING_DEBT_GROUP_LABELS[AgingDebtGroupEnum.AGE_61_90]}
            </option>
            <option value={AgingDebtGroupEnum.AGE_OVER_90}>
              {AGING_DEBT_GROUP_LABELS[AgingDebtGroupEnum.AGE_OVER_90]}
            </option>
          </select>
        </div>

        {/* 3. Lọc theo Cấp đại lý / Nhóm đại lý */}
        <div className="shrink-0">
          <select
            value={params.customerGroup || ''}
            onChange={handleCustomerGroupChange}
            className="py-2 px-3 font-sans text-sm font-medium antialiased bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="">Tất cả nhóm đại lý</option>
            <option value="AGENT_LEVEL_1">Đại lý Cấp 1</option>
            <option value="AGENT_LEVEL_2">Đại lý Cấp 2</option>
          </select>
        </div>

        {/* 4. Lọc theo Trạng thái nợ - Bỏ icon và màu để đồng bộ giống nhóm tuổi nợ và nhóm đại lý */}
        <div className="shrink-0">
          <select
            value={activeStatus}
            onChange={handleStatusChange}
            className="py-2 px-3 font-sans text-sm font-medium antialiased bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CURRENT">Nợ trong hạn</option>
            <option value="OVERDUE">Nợ quá hạn</option>
          </select>
        </div>

        {/* Khoảng giãn tự động đẩy nút xuất Excel sang phải */}
        <div className="flex-1 min-w-2" />

        {/* Nút Xuất Excel */}
        <button
          type="button"
          onClick={onExportExcel}
          disabled={exporting || loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-sans text-sm font-medium antialiased rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{exporting ? 'Đang xuất file...' : 'Xuất Excel'}</span>
        </button>
      </div>
    </div>
  );
};
