import React from "react";
import {
  Clock,
  Eye,
  RefreshCw,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  User,
  Database,
} from "lucide-react";
import type { AuditLogItem, AuditActionType } from "../../types/audit-log";
import {
  formatAuditDateTime,
  formatUserWithRole,
  resolveEntityCode,
  resolveEntityDisplayName,
} from "../../services/audit-log.service";

interface AuditTableProps {
  logs: AuditLogItem[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onViewDiff: (item: AuditLogItem) => void;
}

// Cấu hình nhãn và màu sắc Badge cho từng loại Hành động
const ACTION_BADGES: Record<
  AuditActionType,
  { label: string; badgeClass: string; dotClass: string }
> = {
  CREATE: {
    label: "Tạo mới",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    dotClass: "bg-emerald-500",
  },
  UPDATE: {
    label: "Cập nhật",
    badgeClass: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/20",
    dotClass: "bg-blue-500",
  },
  DELETE: {
    label: "Xóa dữ liệu",
    badgeClass: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    dotClass: "bg-rose-500",
  },
  CANCEL: {
    label: "Hủy bỏ",
    badgeClass: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    dotClass: "bg-rose-500",
  },
  APPROVE: {
    label: "Phê duyệt",
    badgeClass: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/20",
    dotClass: "bg-purple-500",
  },
  STOCK_ADJUST: {
    label: "Điều chỉnh tồn",
    badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    dotClass: "bg-amber-500",
  },
};

/**
 * Trích xuất tóm tắt nghiệp vụ ngắn gọn cho nhật ký
 */
function getLogSummary(log: AuditLogItem): string {
  if (log.summary && log.summary.trim()) {
    return log.summary.trim();
  }

  if (log.action === "CREATE") return "Khởi tạo dữ liệu mới vào hệ thống";
  if (log.action === "DELETE") return "Xóa bỏ dữ liệu khỏi hệ thống";
  if (log.action === "STOCK_ADJUST") return "Điều chỉnh số lượng tồn kho";
  if (log.action === "APPROVE") return "Phê duyệt giao dịch thành công";
  if (log.action === "CANCEL") return "Hủy bỏ giao dịch";

  if (log.old_values && log.new_values) {
    const diffKeys = Object.keys(log.new_values).filter(
      (k) => JSON.stringify(log.old_values?.[k]) !== JSON.stringify(log.new_values?.[k])
    );
    if (diffKeys.length > 0) {
      return `Cập nhật ${diffKeys.length} trường thông tin`;
    }
  }

  return "Cập nhật dữ liệu hệ thống";
}

export const AuditTable: React.FC<AuditTableProps> = ({
  logs,
  loading,
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onLimitChange,
  onViewDiff,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      {/* ============================================================== */}
      {/* 1. GIAO DIỆN DESKTOP / TABLET (Bảng dữ liệu tinh giản, không scroll) */}
      {/* ============================================================== */}
      <div className="hidden md:block">
        <table className="w-full text-left text-xs text-slate-600 border-collapse">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-36 lg:w-40">
                Thời gian
              </th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">
                Người thực hiện
              </th>
              <th className="px-3.5 py-3.5 font-semibold whitespace-nowrap text-center w-28">
                Hành động
              </th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">
                Đối tượng
              </th>
              <th className="hidden lg:table-cell px-4 py-3.5 font-semibold">
                Nội dung thay đổi
              </th>
              <th className="px-3.5 py-3.5 font-semibold text-center whitespace-nowrap w-24">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <span className="font-medium text-xs">
                    Đang tải dữ liệu nhật ký hệ thống...
                  </span>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <ScrollText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-700 text-sm">
                    Không tìm thấy bản ghi nhật ký nào
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Thử điều chỉnh lại khoảng thời gian hoặc làm trống bộ lọc tìm kiếm.
                  </p>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const badgeInfo = ACTION_BADGES[log.action] || {
                  label: log.action,
                  badgeClass: "bg-slate-100 text-slate-700",
                  dotClass: "bg-slate-400",
                };

                const resolvedCode = resolveEntityCode(log);
                const displayEntityName = resolveEntityDisplayName(
                  log.entity_name,
                  resolvedCode
                );
                const formattedUser = formatUserWithRole(log.user);
                const summaryText = getLogSummary(log);

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Cột 1: Thời gian */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-slate-700">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{formatAuditDateTime(log.created_at)}</span>
                      </div>
                    </td>

                    {/* Cột 2: Người thực hiện (Họ tên & Vai trò) */}
                    <td className="px-4 py-3.5">
                      <span
                        className="font-semibold text-slate-900 leading-snug line-clamp-1"
                        title={formattedUser}
                      >
                        {formattedUser}
                      </span>
                    </td>

                    {/* Cột 3: Hành động */}
                    <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeInfo.badgeClass}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${badgeInfo.dotClass}`}
                        />
                        <span>{badgeInfo.label}</span>
                      </span>
                    </td>

                    {/* Cột 4: Đối tượng */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 leading-snug line-clamp-1">
                          {displayEntityName}
                        </span>
                        <span className="text-[11px] font-mono text-blue-700 font-semibold mt-0.5">
                          {resolvedCode}
                        </span>
                      </div>
                    </td>

                    {/* Cột 5: Nội dung thay đổi tóm tắt (Ẩn trên tablet md để tránh tràn thanh cuộn) */}
                    <td className="hidden lg:table-cell px-4 py-3.5">
                      <span
                        className="text-slate-600 line-clamp-2 leading-relaxed"
                        title={summaryText}
                      >
                        {summaryText}
                      </span>
                    </td>

                    {/* Cột 6: Thao tác (Chi tiết) */}
                    <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewDiff(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                        title="Xem chi tiết so sánh dữ liệu (Audit Diff)"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <span>Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================== */}
      {/* 2. GIAO DIỆN DI ĐỘNG (Mobile Card View - TUYỆT ĐỐI KHÔNG SCROLL NGANG) */}
      {/* ============================================================== */}
      <div className="block md:hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
            <span className="font-medium text-xs">
              Đang tải dữ liệu nhật ký hệ thống...
            </span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-400">
            <ScrollText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">
              Không tìm thấy bản ghi nhật ký nào
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Thử điều chỉnh lại bộ lọc hoặc khoảng thời gian.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 p-3 sm:p-4 space-y-3">
            {logs.map((log) => {
              const badgeInfo = ACTION_BADGES[log.action] || {
                label: log.action,
                badgeClass: "bg-slate-100 text-slate-700",
                dotClass: "bg-slate-400",
              };

              const resolvedCode = resolveEntityCode(log);
              const displayEntityName = resolveEntityDisplayName(
                log.entity_name,
                resolvedCode
              );
              const formattedUser = formatUserWithRole(log.user);
              const summaryText = getLogSummary(log);

              return (
                <div
                  key={log.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                >
                  {/* Hàng 1: Hành động & Thời gian */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeInfo.badgeClass}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${badgeInfo.dotClass}`}
                      />
                      <span>{badgeInfo.label}</span>
                    </span>

                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatAuditDateTime(log.created_at)}</span>
                    </div>
                  </div>

                  {/* Hàng 2: Thông tin chi tiết Người thực hiện & Đối tượng */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-slate-400 text-[11px]">Người thực hiện: </span>
                        <span className="font-semibold text-slate-800">
                          {formattedUser}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Database className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-slate-400 text-[11px]">Đối tượng: </span>
                        <span className="font-medium text-slate-800">{displayEntityName} </span>
                        <span className="font-mono text-blue-700 font-semibold">
                          [{resolvedCode}]
                        </span>
                      </div>
                    </div>

                    {summaryText && (
                      <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 border border-slate-100 leading-relaxed">
                        {summaryText}
                      </div>
                    )}
                  </div>

                  {/* Hàng 3: Nút xem chi tiết thay đổi (To rõ, dễ bấm trên mobile) */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onViewDiff(log)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200/90 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-400" />
                      <span>Xem chi tiết đối chiếu thay đổi</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. THANH PHÂN TRANG (Responsive đa thiết bị) */}
      {/* ============================================================== */}
      <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/40">
        {/* Phân trang cho màn hình lớn (sm trở lên) */}
        <div className="hidden sm:flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              Hiển thị{" "}
              <strong>
                {total === 0 ? 0 : (page - 1) * limit + 1} -{" "}
                {Math.min(page * limit, total)}
              </strong>{" "}
              trong tổng số <strong>{total}</strong> bản ghi
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-slate-400">Số dòng:</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Trước</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsisBefore && (
                        <span className="px-1 text-slate-400 font-bold">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => onPageChange(p)}
                        className={`h-7 min-w-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          page === p
                            ? "bg-blue-600 text-white shadow-2xs shadow-blue-600/30"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Phân trang tinh gọn cho màn hình di động (dưới sm) */}
        <div className="flex sm:hidden flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span>
              Bản ghi <strong>{total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)}</strong> / {total}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Dòng:</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 font-semibold text-slate-700 shadow-2xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Trước</span>
            </button>

            <span className="font-semibold text-slate-700 text-xs">
              Trang {page} / {totalPages || 1}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs text-xs"
            >
              <span>Sau</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

