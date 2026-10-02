import React from "react";
import {
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
  ScrollText,
  ChevronLeft,
  ChevronRight,
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
 * Render trực quan chi tiết thay đổi (Old Value -> New Value)
 * - Nếu thay đổi đơn giản: ~~Giá trị cũ (đỏ)~~ -> **Giá trị mới (xanh lá)**
 * - Nếu nhiều trường: Hiển thị tóm tắt nghiệp vụ xúc tích
 * (Toàn bộ thao tác mở modal được chuẩn hóa duy nhất tại cột Thao tác)
 */
const RenderDiffCell: React.FC<{
  item: AuditLogItem;
}> = ({ item }) => {
  const { old_values, new_values, summary, action } = item;

  // Case 1: Thao tác Tạo mới (Không có giá trị cũ)
  if (action === "CREATE" || !old_values) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0 ring-1 ring-inset ring-emerald-600/10">
          Mới
        </span>
        <span className="font-semibold text-emerald-900 truncate" title={summary}>
          {summary || "Khởi tạo dữ liệu mới vào hệ thống"}
        </span>
      </div>
    );
  }

  // Case 2: Thao tác Xóa dữ liệu (Không có giá trị mới)
  if (action === "DELETE" || !new_values) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md shrink-0 ring-1 ring-inset ring-rose-600/10">
          Đã xóa
        </span>
        <span className="line-through text-rose-600 truncate" title={summary}>
          {summary || "Dữ liệu đã bị xóa khỏi hệ thống"}
        </span>
      </div>
    );
  }

  // Case 3: Thao tác Cập nhật / Duyệt / Điều chỉnh (So sánh Old -> New)
  const oldKeys = Object.keys(old_values);
  const newKeys = Object.keys(new_values);
  const allKeys = Array.from(new Set([...oldKeys, ...newKeys]));

  const diffKeys = allKeys.filter(
    (k) => JSON.stringify(old_values[k]) !== JSON.stringify(new_values[k])
  );

  const isSimpleDiff = diffKeys.length <= 2;

  // Lấy giá trị chuỗi hiển thị gọn gàng
  const formatVal = (v: unknown): string => {
    if (v === null || v === undefined) return "null";
    if (typeof v === "number") {
      if (v >= 1000) {
        return new Intl.NumberFormat("vi-VN").format(v);
      }
      return v.toString();
    }
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "object") return "{...}";
    return String(v);
  };

  if (isSimpleDiff && diffKeys.length > 0) {
    return (
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {diffKeys.map((key) => {
          const oldVal = formatVal(old_values[key]);
          const newVal = formatVal(new_values[key]);
          return (
            <span key={key} className="inline-flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-mono text-[11px]">{key}:</span>
              <span className="line-through text-rose-500 font-medium">{oldVal}</span>
              <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                {newVal}
              </span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-slate-800 font-medium truncate" title={summary}>
        {summary || `Cập nhật ${diffKeys.length} trường dữ liệu`}
      </span>
    </div>
  );
};

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
      {/* Bảng dữ liệu chính */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-44">
                Thời gian
              </th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap min-w-[200px]">
                Người thực hiện
              </th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-center w-36">
                Hành động
              </th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap min-w-[220px]">
                Đối tượng
              </th>
              <th className="px-4 py-3.5 font-semibold min-w-[320px]">
                Chi tiết thay đổi (Old Value → New Value)
              </th>
              <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap w-24">
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

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Cột 1: Thời gian */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-slate-700">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{formatAuditDateTime(log.created_at)}</span>
                      </div>
                    </td>

                    {/* Cột 2: Người thực hiện (Chỉ Họ tên & Vai trò / Chức vụ, không email/IP) */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span
                          className="font-semibold text-slate-900 leading-snug"
                          title={formattedUser}
                        >
                          {formattedUser}
                        </span>
                      </div>
                    </td>

                    {/* Cột 3: Hành động */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeInfo.badgeClass}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${badgeInfo.dotClass}`}
                        />
                        <span>{badgeInfo.label}</span>
                      </span>
                    </td>

                    {/* Cột 4: Đối tượng (Tên nghiệp vụ & Mã SKU/Code thực tế) */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 leading-snug">
                          {displayEntityName}
                        </span>
                        <span className="text-[11px] font-mono text-blue-700 font-semibold mt-0.5">
                          {resolvedCode}
                        </span>
                      </div>
                    </td>

                    {/* Cột 5: Chi tiết thay đổi (Old Value -> New Value) */}
                    <td className="px-4 py-3">
                      <RenderDiffCell item={log} />
                    </td>

                    {/* Cột 6: Thao tác (Read-Only - Chuẩn hóa duy nhất 1 nút mở chi tiết) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
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

      {/* Thanh phân trang chuẩn Clean SaaS (Mặc định 20 dòng / trang) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/40">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            Hiển thị{" "}
            <strong>
              {total === 0 ? 0 : (page - 1) * limit + 1} -{" "}
              {Math.min(page * limit, total)}
            </strong>{" "}
            trong tổng số <strong>{total}</strong> bản ghi nhật ký
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="text-slate-400">Số dòng/trang:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng (Chuẩn)</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>
        </div>

        {/* Nút lùi / tiến trang */}
        <div className="flex items-center gap-2">
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
    </div>
  );
};
