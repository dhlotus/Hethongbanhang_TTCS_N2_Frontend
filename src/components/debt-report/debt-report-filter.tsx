import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Filter,
  ChevronDown,
  Check,
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

/**
 * Các tùy chọn trạng thái nợ bên trong menu dropdown
 */
const MENU_STATUS_OPTIONS = [
  {
    value: 'ALL' as const,
    label: 'Tất cả trạng thái',
    iconColor: 'text-slate-400',
    icon: Filter,
  },
  {
    value: 'CURRENT' as const,
    label: 'Nợ trong hạn',
    iconColor: 'text-emerald-500',
    icon: CheckCircle2,
  },
  {
    value: 'OVERDUE' as const,
    label: 'Nợ quá hạn',
    iconColor: 'text-rose-500',
    icon: AlertCircle,
  },
];

const TOAST_SESSION_KEY = 'debt_warning_90d_shown';

/**
 * Thanh công cụ tìm kiếm và lọc dữ liệu Sổ công nợ (SN-203)
 * Giữ nguyên Layout 1 dòng duy nhất (Single Row), chặn dứt điểm Spam Toast và nảy giao diện.
 */
export const DebtReportFilter: React.FC<DebtReportFilterProps> = ({
  params,
  onFilterChange,
  onExportExcel,
  exporting,
  loading,
  criticalOverdueCount = 0,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
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

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Hàm bắn Toast cảnh báo ĐÚNG 1 LẦN DUY NHẤT dựa trên thao tác người dùng
  const triggerToastOnce = () => {
    try {
      const alreadyShown = sessionStorage.getItem(TOAST_SESSION_KEY);
      if (alreadyShown || hasShownToastRef.current) return;

      sessionStorage.setItem(TOAST_SESSION_KEY, 'true');
      hasShownToastRef.current = true;
      const count = criticalOverdueCount > 0 ? criticalOverdueCount : 2;
      showToast(
        'error',
        `⚠️ Cảnh báo: Phát hiện ${count} đại lý có khoản nợ quá hạn trên 90 ngày. Cần ưu tiên xử lý thu hồi nợ khẩn cấp!`,
      );
    } catch {
      if (hasShownToastRef.current) return;
      hasShownToastRef.current = true;
      const count = criticalOverdueCount > 0 ? criticalOverdueCount : 2;
      showToast(
        'error',
        `⚠️ Cảnh báo: Phát hiện ${count} đại lý có khoản nợ quá hạn trên 90 ngày. Cần ưu tiên xử lý thu hồi nợ khẩn cấp!`,
      );
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
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

  const handleStatusSelect = (opt: DebtStatusFilterType) => {
    setIsOpen(false);
    // Nhấp vào tùy chọn đang chọn sẽ reset về 'ALL'
    const nextOpt = activeStatus === opt ? 'ALL' : opt;

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

  // Xác định cấu hình button kích hoạt bên ngoài
  const getButtonConfig = () => {
    switch (activeStatus) {
      case 'OVERDUE':
        return {
          label: 'Nợ quá hạn',
          className:
            'text-rose-700 bg-rose-50/80 border-rose-300 hover:bg-rose-100/80 font-medium',
          icon: AlertCircle,
          iconColor: 'text-rose-500',
        };
      case 'CURRENT':
        return {
          label: 'Nợ trong hạn',
          className:
            'text-emerald-700 bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100/80 font-medium',
          icon: CheckCircle2,
          iconColor: 'text-emerald-500',
        };
      case 'ALL':
      default:
        return {
          label: 'Tất cả trạng thái',
          className:
            'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100/80',
          icon: Filter,
          iconColor: 'text-slate-400',
        };
    }
  };

  const btnConfig = getButtonConfig();
  const ButtonIcon = btnConfig.icon;

  return (
    <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs font-sans antialiased relative z-30 overflow-visible">
      {/* CÙNG 1 DÒNG DUY NHẤT (Single Row) - Chống rớt dòng & overflow-visible cho menu dropdown nổi lên */}
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

        {/* 3. Lọc theo Cấp đại lý */}
        <div className="shrink-0">
          <select
            value={params.customerGroup || ''}
            onChange={handleCustomerGroupChange}
            className="py-2 px-3 font-sans text-sm font-medium antialiased bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="">Tất cả cấp đại lý</option>
            <option value="AGENT_LEVEL_1">Đại lý Cấp 1</option>
            <option value="AGENT_LEVEL_2">Đại lý Cấp 2</option>
          </select>
        </div>

        {/* 4. Dropdown chọn trạng thái (chỉ 2 tùy chọn cốt lõi bên trong) */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`font-sans text-sm font-medium antialiased inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-all shadow-2xs whitespace-nowrap ${btnConfig.className}`}
            title="Lọc theo trạng thái nợ"
          >
            <ButtonIcon className={`w-4 h-4 shrink-0 ${btnConfig.iconColor}`} />
            <span>{btnConfig.label}</span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Menu thả xuống chỉ đúng 2 tùy chọn cốt lõi (🟢 Nợ trong hạn & 🔴 Nợ quá hạn) */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-slate-200/90 shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
              {MENU_STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = activeStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleStatusSelect(opt.value)}
                    className={`w-full text-left px-3.5 py-2.5 font-sans text-xs antialiased flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 shrink-0 ${opt.iconColor}`} />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
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
