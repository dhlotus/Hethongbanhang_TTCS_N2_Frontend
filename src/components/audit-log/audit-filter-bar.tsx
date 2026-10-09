import React, { useMemo } from 'react';
import {
  Calendar,
  Search,
  RotateCcw,
  Layers,
  Activity,
  X,
  RefreshCw,
  ArrowRight,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { DateInput, formatVietnameseDate } from '../date-input';
import type { AuditEntityType, AuditActionType, AuditLogQueryParams } from '../../types/audit-log';
import { AUDIT_ENTITIES } from '../../services/audit-log.service';

export interface AuditFilterBarProps {
  filters: AuditLogQueryParams;
  onFilterChange: (newFilters: Partial<AuditLogQueryParams>) => void;
  onReset: () => void;
  totalResults: number;
  onRefresh?: () => void;
  loading?: boolean;
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  totalResults,
  onRefresh,
  loading = false,
}) => {
  const hasActiveFilters = Boolean(
    filters.startDate ||
    filters.endDate ||
    filters.searchUser ||
    (filters.entity && filters.entity !== 'ALL') ||
    (filters.action && filters.action !== 'ALL')
  );

  // Kiểm tra logic khoảng ngày hợp lệ
  const isDateRangeInvalid = Boolean(
    filters.startDate && filters.endDate && filters.endDate < filters.startDate
  );

  // Helper format YYYY-MM-DD theo giờ địa phương
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Xác định preset ngày hiện tại đang được kích hoạt
  const activePreset = useMemo(() => {
    if (!filters.startDate && !filters.endDate) return 'all';

    const todayStr = formatLocalDate(new Date());
    if (filters.startDate === todayStr && filters.endDate === todayStr) {
      return 'today';
    }

    const end7 = new Date();
    const start7 = new Date();
    start7.setDate(end7.getDate() - 7);
    if (
      filters.startDate === formatLocalDate(start7) &&
      filters.endDate === formatLocalDate(end7)
    ) {
      return '7days';
    }

    const end30 = new Date();
    const start30 = new Date();
    start30.setDate(end30.getDate() - 30);
    if (
      filters.startDate === formatLocalDate(start30) &&
      filters.endDate === formatLocalDate(end30)
    ) {
      return '30days';
    }

    return 'custom';
  }, [filters.startDate, filters.endDate]);

  // Áp dụng preset ngày
  const handleApplyPreset = (preset: 'today' | '7days' | '30days' | 'all') => {
    if (preset === 'all') {
      onFilterChange({ startDate: '', endDate: '', page: 1 });
      return;
    }

    const today = new Date();
    const todayStr = formatLocalDate(today);

    if (preset === 'today') {
      onFilterChange({ startDate: todayStr, endDate: todayStr, page: 1 });
    } else if (preset === '7days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      onFilterChange({
        startDate: formatLocalDate(past),
        endDate: todayStr,
        page: 1,
      });
    } else if (preset === '30days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      onFilterChange({
        startDate: formatLocalDate(past),
        endDate: todayStr,
        page: 1,
      });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all space-y-4">
      {/* Hàng 1: Ô tìm kiếm thông minh + Các nút hành động (Làm mới, Đặt lại, Badge kết quả) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Ô tìm kiếm thông minh */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={filters.searchUser || ''}
            onChange={(e) => onFilterChange({ searchUser: e.target.value, page: 1 })}
            placeholder="Tìm theo tên người dùng, đối tượng hoặc nội dung thay đổi..."
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white placeholder-slate-400 text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {filters.searchUser && (
            <button
              type="button"
              onClick={() => onFilterChange({ searchUser: '', page: 1 })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Cụm hành động bên phải */}
        <div className="flex items-center gap-2.5 justify-end shrink-0">
          {/* Badge số lượng kết quả */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200/60 text-slate-600 text-xs font-medium">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>
              Tìm thấy: <strong className="text-slate-900 font-semibold">{totalResults}</strong>
            </span>
          </div>

          {/* Nút đặt lại khi có lọc */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200/80 bg-rose-50/60 hover:bg-rose-100/80 text-rose-700 text-xs font-semibold transition-all cursor-pointer"
              title="Đặt lại tất cả bộ lọc về mặc định"
            >
              <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
              <span>Đặt lại</span>
            </button>
          )}

          {/* Nút làm mới dữ liệu */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-blue-600 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Làm mới dữ liệu nhật ký từ máy chủ"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-slate-500 ${
                  loading ? 'animate-spin text-blue-600' : ''
                }`}
              />
              <span className="hidden sm:inline">Làm mới nhật ký</span>
              <span className="sm:hidden">Làm mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Hàng 2: Bộ lọc chi tiết (Khoảng ngày & Chọn nhanh, Phân hệ nghiệp vụ, Loại hành động) */}
      <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Khoảng ngày & Phím tắt chọn nhanh */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Ô chọn khoảng ngày liên kết */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div
              className={`inline-flex items-center rounded-xl border px-3 py-1.5 transition-all ${
                isDateRangeInvalid
                  ? 'border-rose-400 bg-rose-50/80 text-rose-900 ring-2 ring-rose-200'
                  : 'border-slate-200/90 bg-slate-50/60 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'
              }`}
            >
              <Calendar
                className={`h-3.5 w-3.5 mr-2 shrink-0 ${
                  isDateRangeInvalid ? 'text-rose-500' : 'text-blue-600'
                }`}
              />

              {/* Từ ngày */}
              <DateInput
                compact
                value={filters.startDate || ''}
                max={filters.endDate || undefined}
                onChange={(val) => onFilterChange({ startDate: val, page: 1 })}
                placeholder="Từ ngày"
                title="Từ ngày (dd/mm/yyyy)"
                className="min-w-[80px]"
              />

              <ArrowRight
                className={`h-3 w-3 mx-1.5 shrink-0 ${
                  isDateRangeInvalid ? 'text-rose-400' : 'text-slate-400'
                }`}
              />

              {/* Đến ngày */}
              <DateInput
                compact
                value={filters.endDate || ''}
                min={filters.startDate || undefined}
                onChange={(val) => onFilterChange({ endDate: val, page: 1 })}
                placeholder="Đến ngày"
                title="Đến ngày (dd/mm/yyyy)"
                className="min-w-[80px]"
              />

              {(filters.startDate || filters.endDate) && (
                <button
                  type="button"
                  onClick={() => onFilterChange({ startDate: '', endDate: '', page: 1 })}
                  className="ml-1.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Xóa khoảng ngày"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Thông báo lỗi đỏ nếu ngày kết thúc < ngày bắt đầu */}
            {isDateRangeInvalid && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>
                  Đến ngày ({formatVietnameseDate(filters.endDate)}) trước Từ ngày (
                  {formatVietnameseDate(filters.startDate)})
                </span>
              </div>
            )}
          </div>

          {/* Quick preset chips */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => handleApplyPreset('today')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all text-xs cursor-pointer whitespace-nowrap ${
                activePreset === 'today'
                  ? 'bg-white text-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('7days')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all text-xs cursor-pointer whitespace-nowrap ${
                activePreset === '7days'
                  ? 'bg-white text-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('30days')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all text-xs cursor-pointer whitespace-nowrap ${
                activePreset === '30days'
                  ? 'bg-white text-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all text-xs cursor-pointer whitespace-nowrap ${
                activePreset === 'all'
                  ? 'bg-white text-blue-600 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>

        {/* Các Dropdown chọn Phân hệ nghiệp vụ & Loại hành động */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Phân hệ nghiệp vụ */}
          <div className="relative min-w-[200px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <select
              value={filters.entity || 'ALL'}
              onChange={(e) =>
                onFilterChange({
                  entity: e.target.value as AuditEntityType | 'ALL',
                  page: 1,
                })
              }
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
            >
              <option value="ALL">Tất cả phân hệ nghiệp vụ</option>
              {AUDIT_ENTITIES.map((ent) => (
                <option key={ent.value} value={ent.value}>
                  {ent.label}
                </option>
              ))}
            </select>
          </div>

          {/* Loại hành động */}
          <div className="relative min-w-[180px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <select
              value={filters.action || 'ALL'}
              onChange={(e) =>
                onFilterChange({
                  action: e.target.value as AuditActionType | 'ALL',
                  page: 1,
                })
              }
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
            >
              <option value="ALL">Mọi loại hành động</option>
              <option value="CREATE">Tạo mới (CREATE)</option>
              <option value="UPDATE">Cập nhật (UPDATE)</option>
              <option value="DELETE">Xóa (DELETE)</option>
              <option value="APPROVE">Phê duyệt (APPROVE)</option>
              <option value="CANCEL">Hủy bỏ (CANCEL)</option>
              <option value="STOCK_ADJUST">Điều chỉnh tồn (STOCK_ADJUST)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
