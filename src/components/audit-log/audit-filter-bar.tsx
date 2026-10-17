import React, { useState, useEffect, useRef } from 'react';
import { Search, RotateCcw, X, ArrowRight, Calendar } from 'lucide-react';
import { DateInput } from '../date-input';
import type { AuditEntityType, AuditActionType, AuditLogQueryParams } from '../../types/audit-log';
import { AUDIT_ENTITIES } from '../../services/audit-log.service';

export interface AuditFilterBarProps {
  filters: AuditLogQueryParams;
  onFilterChange: (newFilters: Partial<AuditLogQueryParams>) => void;
  onReset: () => void;
  totalResults?: number;
  loading?: boolean;
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  // Local state cho ô tìm kiếm để người dùng gõ mượt mà không bị giật lag
  const [searchInput, setSearchInput] = useState<string>(filters.searchUser || '');
  const isFirstMount = useRef(true);

  // Đồng bộ khi filters.searchUser thay đổi từ bên ngoài (URL popstate, reset)
  useEffect(() => {
    setSearchInput(filters.searchUser || '');
  }, [filters.searchUser]);

  // Debounce tìm kiếm 350ms trước khi kích hoạt gọi API
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== (filters.searchUser || '').trim()) {
        onFilterChange({ searchUser: trimmed, page: 1 });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const hasActiveFilters = Boolean(
    filters.startDate ||
    filters.endDate ||
    filters.searchUser ||
    (filters.entity && filters.entity !== 'ALL') ||
    (filters.action && filters.action !== 'ALL')
  );

  // Ràng buộc khoảng ngày: Ngày kết thúc không được trước ngày bắt đầu
  const handleStartDateChange = (val: string) => {
    if (val && filters.endDate && val > filters.endDate) {
      // Nếu ngày bắt đầu được chọn sau ngày kết thúc hiện tại, tự động đồng bộ ngày kết thúc
      onFilterChange({ startDate: val, endDate: val, page: 1 });
    } else {
      onFilterChange({ startDate: val, page: 1 });
    }
  };

  const handleEndDateChange = (val: string) => {
    if (val && filters.startDate && val < filters.startDate) {
      // Nếu ngày kết thúc được chọn trước ngày bắt đầu, tự động đồng bộ ngày bắt đầu
      onFilterChange({ startDate: val, endDate: val, page: 1 });
    } else {
      onFilterChange({ endDate: val, page: 1 });
    }
  };

  return (
    <div className="w-full rounded-xl border border-slate-200/90 bg-white p-[0.875rem] sm:p-[1rem] shadow-2xs space-y-[0.75rem]">
      {/* ========================================================================= */}
      {/* 1. HÀNG 1: Ô TÌM KIẾM (NGƯỜI DÙNG / ĐỐI TƯỢNG) + ĐẶT LẠI                   */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-[0.625rem]">
        {/* Ô tìm kiếm người dùng / đối tượng */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-[0.875rem] top-1/2 -translate-y-1/2 h-[1rem] w-[1rem] text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo người dùng, đối tượng..."
            className="w-full pl-[2.5rem] pr-[2.25rem] h-[2.5rem] sm:h-[2.625rem] text-sm rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white placeholder-slate-400 text-slate-800 font-medium focus:bg-white focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                onFilterChange({ searchUser: '', page: 1 });
              }}
              className="absolute right-[0.625rem] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-[0.25rem] rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="h-[1rem] w-[1rem]" />
            </button>
          )}
        </div>

        {/* Nút Đặt lại khi có bộ lọc đang hoạt động */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-[0.375rem] h-[2.5rem] sm:h-[2.625rem] px-[0.875rem] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-rose-600 text-sm font-semibold transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
            title="Đặt lại bộ lọc về mặc định"
          >
            <RotateCcw className="h-[1rem] w-[1rem] text-slate-400" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. HÀNG 2: KHOẢNG THỜI GIAN, LOẠI ĐỐI TƯỢNG VÀ HÀNH ĐỘNG                   */}
      {/* ========================================================================= */}
      {/* Desktop Layout (>= 640px) */}
      <div className="hidden sm:flex items-center gap-[0.75rem] pt-[0.625rem] border-t border-slate-100 flex-wrap">
        {/* Khoảng thời gian: Từ ngày -> Đến ngày (Đã chuyển xuống hàng dưới) */}
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50/60 px-[0.75rem] h-[2.5rem] text-sm focus-within:bg-white focus-within:border-[var(--color-primary)] shrink-0">
          <Calendar className="h-[0.875rem] w-[0.875rem] text-slate-400 mr-[0.5rem] shrink-0" />
          <DateInput
            compact
            value={filters.startDate || ''}
            max={filters.endDate || undefined}
            onChange={handleStartDateChange}
            placeholder="Từ ngày"
            className="w-[5.75rem] text-sm"
          />
          <ArrowRight className="h-[0.875rem] w-[0.875rem] mx-[0.5rem] text-slate-400 shrink-0" />
          <DateInput
            compact
            value={filters.endDate || ''}
            min={filters.startDate || undefined}
            onChange={handleEndDateChange}
            placeholder="Đến ngày"
            className="w-[5.75rem] text-sm"
          />
          {(filters.startDate || filters.endDate) && (
            <button
              type="button"
              onClick={() => onFilterChange({ startDate: '', endDate: '', page: 1 })}
              className="ml-[0.25rem] p-[0.125rem] text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              title="Xóa khoảng ngày"
            >
              <X className="h-[0.75rem] w-[0.75rem]" />
            </button>
          )}
        </div>

        {/* Dropdown Loại đối tượng */}
        <select
          value={filters.entity || 'ALL'}
          onChange={(e) =>
            onFilterChange({
              entity: e.target.value as AuditEntityType | 'ALL',
              page: 1,
            })
          }
          className="w-[13.5rem] h-[2.5rem] px-[0.75rem] text-sm rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white text-slate-700 font-medium focus:bg-white focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] transition-all cursor-pointer truncate"
        >
          <option value="ALL">Tất cả đối tượng</option>
          {AUDIT_ENTITIES.map((ent) => (
            <option key={ent.value} value={ent.value}>
              {ent.label}
            </option>
          ))}
        </select>

        {/* Dropdown Loại hành động */}
        <select
          value={filters.action || 'ALL'}
          onChange={(e) =>
            onFilterChange({
              action: e.target.value as AuditActionType | 'ALL',
              page: 1,
            })
          }
          className="w-[11.5rem] h-[2.5rem] px-[0.75rem] text-sm rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white text-slate-700 font-medium focus:bg-white focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-ring)] transition-all cursor-pointer truncate"
        >
          <option value="ALL">Mọi hành động</option>
          <option value="CREATE">Tạo mới</option>
          <option value="UPDATE">Cập nhật</option>
          <option value="DELETE">Xóa dữ liệu</option>
          <option value="APPROVE">Phê duyệt</option>
          <option value="CANCEL">Hủy bỏ</option>
          <option value="STOCK_ADJUST">Điều chỉnh tồn</option>
        </select>
      </div>

      {/* ========================================================================= */}
      {/* 3. BỘ LỌC CHO MOBILE (< 640px) - CO GIÃN 100%, TUYỆT ĐỐI KHÔNG TRÀN      */}
      {/* ========================================================================= */}
      <div className="flex sm:hidden flex-col gap-[0.5rem] pt-[0.5rem] border-t border-slate-100">
        {/* Khoảng ngày trên Mobile: 2 ô Từ ngày - Đến ngày chia đều 50% */}
        <div className="grid grid-cols-2 gap-[0.5rem] w-full">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 px-[0.625rem] h-[2.5rem]">
            <DateInput
              compact
              value={filters.startDate || ''}
              max={filters.endDate || undefined}
              onChange={handleStartDateChange}
              placeholder="Từ ngày"
              className="w-full text-xs"
            />
          </div>

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 px-[0.625rem] h-[2.5rem]">
            <DateInput
              compact
              value={filters.endDate || ''}
              min={filters.startDate || undefined}
              onChange={handleEndDateChange}
              placeholder="Đến ngày"
              className="w-full text-xs"
            />
          </div>
        </div>

        {/* 2 Dropdown chia đều 50% - 50% */}
        <div className="grid grid-cols-2 gap-[0.5rem] w-full">
          <select
            value={filters.entity || 'ALL'}
            onChange={(e) =>
              onFilterChange({
                entity: e.target.value as AuditEntityType | 'ALL',
                page: 1,
              })
            }
            className="w-full h-[2.5rem] px-[0.625rem] text-xs font-medium rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 focus:bg-white focus:border-[var(--color-primary)] focus:outline-none cursor-pointer truncate"
          >
            <option value="ALL">Tất cả đối tượng</option>
            {AUDIT_ENTITIES.map((ent) => (
              <option key={ent.value} value={ent.value}>
                {ent.label}
              </option>
            ))}
          </select>

          <select
            value={filters.action || 'ALL'}
            onChange={(e) =>
              onFilterChange({
                action: e.target.value as AuditActionType | 'ALL',
                page: 1,
              })
            }
            className="w-full h-[2.5rem] px-[0.625rem] text-xs font-medium rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 focus:bg-white focus:border-[var(--color-primary)] focus:outline-none cursor-pointer truncate"
          >
            <option value="ALL">Mọi hành động</option>
            <option value="CREATE">Tạo mới</option>
            <option value="UPDATE">Cập nhật</option>
            <option value="DELETE">Xóa dữ liệu</option>
            <option value="APPROVE">Phê duyệt</option>
            <option value="CANCEL">Hủy bỏ</option>
            <option value="STOCK_ADJUST">Điều chỉnh tồn</option>
          </select>
        </div>

        {/* Nút Đặt lại trên Mobile */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-[0.25rem] border-t border-slate-100">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-[0.25rem] px-[0.625rem] py-[0.375rem] rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:text-rose-600 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-[0.875rem] h-[0.875rem] text-slate-400" />
              <span>Đặt lại</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
