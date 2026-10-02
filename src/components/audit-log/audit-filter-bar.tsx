import React from "react";
import {
  Calendar,
  Search,
  RotateCcw,
  Layers,
  Activity,
  X,
} from "lucide-react";
import type {
  AuditEntityType,
  AuditActionType,
  AuditLogQueryParams,
} from "../../types/audit-log";
import { AUDIT_ENTITIES } from "../../services/audit-log.service";

interface AuditFilterBarProps {
  filters: AuditLogQueryParams;
  onFilterChange: (newFilters: Partial<AuditLogQueryParams>) => void;
  onReset: () => void;
  totalResults: number;
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  totalResults,
}) => {
  const hasActiveFilters = Boolean(
    filters.startDate ||
      filters.endDate ||
      filters.searchUser ||
      (filters.entity && filters.entity !== "ALL") ||
      (filters.action && filters.action !== "ALL")
  );

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
      {/* Hàng 1: Bộ lọc chính (Thời gian, Phân hệ đối tượng, Loại hành động) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Khoảng thời gian: Từ ngày */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span>Từ ngày</span>
          </label>
          <input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => onFilterChange({ startDate: e.target.value, page: 1 })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          />
        </div>

        {/* 2. Khoảng thời gian: Đến ngày */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span>Đến ngày</span>
          </label>
          <input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => onFilterChange({ endDate: e.target.value, page: 1 })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          />
        </div>

        {/* 3. Đối tượng thao tác (Entity Dropdown) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-purple-600" />
            <span>Đối tượng thao tác</span>
          </label>
          <select
            value={filters.entity || "ALL"}
            onChange={(e) =>
              onFilterChange({
                entity: e.target.value as AuditEntityType | "ALL",
                page: 1,
              })
            }
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="ALL">Tất cả phân hệ nghiệp vụ</option>
            {AUDIT_ENTITIES.map((ent) => (
              <option key={ent.value} value={ent.value}>
                {ent.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Loại hành động (Action Dropdown) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-amber-600" />
            <span>Loại hành động</span>
          </label>
          <select
            value={filters.action || "ALL"}
            onChange={(e) =>
              onFilterChange({
                action: e.target.value as AuditActionType | "ALL",
                page: 1,
              })
            }
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="ALL">Mọi loại hành động</option>
            <option value="CREATE">Tạo mới (CREATE)</option>
            <option value="UPDATE">Cập nhật (UPDATE)</option>
            <option value="DELETE">Xóa dữ liệu (DELETE)</option>
            <option value="APPROVE">Phê duyệt (APPROVE)</option>
            <option value="CANCEL">Hủy thao tác (CANCEL)</option>
            <option value="STOCK_ADJUST">Điều chỉnh tồn (STOCK_ADJUST)</option>
          </select>
        </div>
      </div>

      {/* Hàng 2: Tìm kiếm người dùng / IP và Lọc theo Hành động */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
          {/* Ô tìm kiếm văn bản tự do */}
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={filters.searchUser || ""}
              onChange={(e) =>
                onFilterChange({ searchUser: e.target.value, page: 1 })
              }
              placeholder="Tìm theo tên, email người dùng hoặc IP..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
            />
            {filters.searchUser && (
              <button
                type="button"
                onClick={() => onFilterChange({ searchUser: "", page: 1 })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Nút Reset và Thống kê kết quả */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Xóa bộ lọc</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 font-medium text-slate-500 shrink-0">
            <Activity className="h-4 w-4 text-blue-500" />
            <span>
              Tìm thấy: <strong className="text-slate-900">{totalResults}</strong> nhật ký
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
