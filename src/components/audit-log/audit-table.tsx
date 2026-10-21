import React, { useState, useEffect } from 'react';
import { Eye, RefreshCw, ScrollText } from 'lucide-react';
import { Pagination } from '../pagination';
import type { AuditLogItem, AuditActionType } from '../../types/audit-log';
import {
  formatAuditDateOnly,
  formatAuditUserName,
  resolveEntityDisplayName,
} from '../../services/audit-log.service';
import { resolveAvatarUrl } from '../../utils/avatar';
import { tokenStorage } from '../../utils/token-storage';
import { getStoredUser } from '../../utils/navigation';

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

// Cấu hình nhãn và màu sắc Badge Pastel mềm mại cho từng loại Hành động
const ACTION_BADGES: Record<
  AuditActionType,
  { label: string; badgeClass: string }
> = {
  CREATE: {
    label: 'Tạo mới',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  },
  UPDATE: {
    label: 'Cập nhật',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200/60',
  },
  DELETE: {
    label: 'Xóa dữ liệu',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  },
  CANCEL: {
    label: 'Hủy bỏ',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200/60',
  },
  APPROVE: {
    label: 'Phê duyệt',
    badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200/60',
  },
  STOCK_ADJUST: {
    label: 'Điều chỉnh tồn',
    badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200/60',
  },
};

/**
 * Component hiển thị Avatar thật của người dùng với fallback chữ cái đầu
 */
const UserAvatar: React.FC<{ name: string; avatarUrl?: string | null }> = ({ name, avatarUrl }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const resolved = !imgError && avatarUrl ? resolveAvatarUrl(avatarUrl) : undefined;
  const initial = (name || 'U').charAt(0).toUpperCase();

  if (resolved) {
    return (
      <img
        src={resolved}
        alt={name}
        onError={() => setImgError(true)}
        className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200/80 shadow-2xs"
      />
    );
  }

  return (
    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/80 uppercase">
      {initial}
    </span>
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
  // Đồng bộ thông tin người dùng đang đăng nhập để cập nhật avatar và tên ngay lập tức
  const [currentUser, setCurrentUser] = useState(() => tokenStorage.getUser() || getStoredUser());

  useEffect(() => {
    const handleSync = () => {
      const u = tokenStorage.getUser() || getStoredUser();
      setCurrentUser(u);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('avatar-updated', handleSync);
    window.addEventListener('user-updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('avatar-updated', handleSync);
      window.removeEventListener('user-updated', handleSync);
    };
  }, []);

  const getEffectiveUser = (user?: AuditLogItem['user']) => {
    const fallbackName = formatAuditUserName(user);
    const isMe =
      currentUser &&
      (currentUser.id === user?.id ||
        (user?.email && currentUser.email?.toLowerCase() === user.email.toLowerCase()) ||
        (user?.id && currentUser.username?.toLowerCase() === user.id.toLowerCase()));

    const effectiveName = isMe && currentUser?.fullName ? currentUser.fullName : fallbackName;
    const effectiveAvatar =
      isMe && currentUser?.avatarUrl
        ? currentUser.avatarUrl
        : user?.avatarUrl || user?.avatar_url || null;

    return {
      name: effectiveName,
      avatarUrl: effectiveAvatar,
    };
  };

  return (
    <div className="space-y-[1rem] w-full">
      {/* ========================================================================= */}
      {/* 1. BẢNG DỮ LIỆU DESKTOP (>= 640px) - HIGH FIDELITY FIGMA/DRIBBLE STYLE     */}
      {/* ========================================================================= */}
      <div className="hidden sm:block rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden w-full">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[26%]" />
            <col className="w-[18%]" />
            <col className="w-[24%]" />
            <col className="w-[14%]" />
          </colgroup>

          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3.5 text-center whitespace-nowrap">
                Thời gian
              </th>
              <th className="px-5 py-3.5 text-left whitespace-nowrap">
                Người thực hiện
              </th>
              <th className="px-5 py-3.5 text-center whitespace-nowrap">
                Hành động
              </th>
              <th className="px-5 py-3.5 text-left whitespace-nowrap">
                Đối tượng
              </th>
              <th className="px-5 py-3.5 text-center whitespace-nowrap">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-[4rem] text-center text-slate-400">
                  <RefreshCw className="h-[1.5rem] w-[1.5rem] animate-spin mx-auto mb-[0.5rem] text-[var(--color-primary)]" />
                  <span className="font-medium text-sm">
                    Đang tải dữ liệu nhật ký hệ thống...
                  </span>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-[4.5rem] text-center text-slate-400">
                  <ScrollText className="h-[2rem] w-[2rem] mx-auto mb-[0.5rem] text-slate-300" />
                  <p className="text-sm text-slate-400 font-normal">
                    Không tìm thấy
                  </p>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const badgeInfo = ACTION_BADGES[log.action] || {
                  label: log.action,
                  badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200/60',
                };
                const dateOnly = formatAuditDateOnly(log.created_at);
                const rowUser = getEffectiveUser(log.user);
                const displayEntityName = resolveEntityDisplayName(log.entity_name);

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Cột 1: Thời gian - Centered, sharp font */}
                    <td className="px-5 py-4 text-center whitespace-nowrap text-sm font-medium text-slate-600">
                      {dateOnly}
                    </td>

                    {/* Cột 2: Người thực hiện - Left-aligned with real avatar and name */}
                    <td className="px-5 py-4 text-left whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={rowUser.name} avatarUrl={rowUser.avatarUrl} />
                        <span className="text-sm font-medium text-slate-900 truncate" title={rowUser.name}>
                          {rowUser.name}
                        </span>
                      </div>
                    </td>

                    {/* Cột 3: Hành động - Centered custom status badge with soft pastel background */}
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${badgeInfo.badgeClass}`}
                      >
                        {badgeInfo.label}
                      </span>
                    </td>

                    {/* Cột 4: Đối tượng - Left-aligned text */}
                    <td className="px-5 py-4 text-left whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-800 block" title={displayEntityName}>
                        {displayEntityName}
                      </span>
                      {log.entity_id && !['SYSTEM', 'UNKNOWN', 'SYS-OP-01'].includes(log.entity_id) && (
                        <span className="text-xs text-slate-400 font-mono block mt-0.5" title={log.entity_id}>
                          {log.entity_id}
                        </span>
                      )}
                    </td>

                    {/* Cột 5: Thao tác - Centered action button */}
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => onViewDiff(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-[var(--color-primary)] text-xs font-medium shadow-2xs active:scale-95 transition-all cursor-pointer"
                          title="Xem chi tiết đối chiếu thay đổi"
                          aria-label="Xem chi tiết"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400 group-hover:text-[var(--color-primary)]" />
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── THANH PHÂN TRANG GẮN LIỀN CHÂN BẢNG DESKTOP (KẾT NỐI BACKEND) ── */}
        {total > 0 && (
          <Pagination
            variant="default"
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={limit}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="nhật ký"
            showRecordRange={false}
            showFirstLast={false}
            onPageChange={onPageChange}
            onPageSizeChange={onLimitChange}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. GIAO DIỆN THẺ (CARD VIEW) CHO MOBILE (< 640px) CO GIÃN 100%             */}
      {/* ========================================================================= */}
      <div className="sm:hidden space-y-[0.625rem] w-full">
        {loading ? (
          <div className="rounded-xl bg-white border border-slate-200/80 p-[2rem] text-center text-slate-400">
            <RefreshCw className="h-[1.5rem] w-[1.5rem] animate-spin mx-auto mb-[0.5rem] text-[var(--color-primary)]" />
            <span className="font-medium text-xs">
              Đang tải dữ liệu nhật ký hệ thống...
            </span>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200/80 p-[3rem] text-center text-slate-400">
            <ScrollText className="h-[2rem] w-[2rem] mx-auto mb-[0.5rem] text-slate-300" />
            <p className="text-sm text-slate-400 font-normal">
              Không tìm thấy
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-[0.625rem]">
              {logs.map((log) => {
                const badgeInfo = ACTION_BADGES[log.action] || {
                  label: log.action,
                  badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200/60',
                };
                const dateOnly = formatAuditDateOnly(log.created_at);
                const rowUser = getEffectiveUser(log.user);
                const displayEntityName = resolveEntityDisplayName(log.entity_name);

                return (
                  <div
                    key={log.id}
                    onClick={() => onViewDiff(log)}
                    className="rounded-xl bg-white border border-slate-200/80 p-[0.875rem] shadow-xs hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer select-none space-y-[0.5rem] w-full"
                  >
                    {/* HÀNG 1: Thời gian (chỉ ngày) + Người thực hiện + Badge Hành động Pastel */}
                    <div className="flex items-center justify-between gap-[0.5rem]">
                      <div className="flex items-center gap-[0.5rem] min-w-0">
                        <UserAvatar name={rowUser.name} avatarUrl={rowUser.avatarUrl} />
                        <div className="flex items-center gap-[0.375rem] min-w-0">
                          <span className="text-xs font-medium text-slate-800 truncate" title={rowUser.name}>
                            {rowUser.name}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 font-medium shrink-0">
                            {dateOnly}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${badgeInfo.badgeClass}`}
                      >
                        {badgeInfo.label}
                      </span>
                    </div>

                    {/* HÀNG 2: Phân hệ đối tượng + Nút Chi tiết */}
                    <div className="flex items-center justify-between gap-[0.5rem] pt-[0.375rem] border-t border-slate-100">
                      <div className="min-w-0 flex-1 pr-[0.5rem]">
                        <span className="text-xs font-medium text-slate-700 truncate block">
                          {displayEntityName}
                        </span>
                        {log.entity_id && !['SYSTEM', 'UNKNOWN', 'SYS-OP-01'].includes(log.entity_id) && (
                          <span className="text-[11px] text-slate-400 font-mono truncate block mt-0.5">
                            {log.entity_id}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDiff(log);
                        }}
                        className="inline-flex items-center gap-[0.25rem] h-[1.875rem] px-[0.625rem] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs shrink-0 cursor-pointer"
                        title="Xem chi tiết"
                        aria-label="Xem chi tiết"
                      >
                        <Eye className="h-[0.875rem] w-[0.875rem] text-slate-500" />
                        <span>Chi tiết</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Phân trang Mobile (KẾT NỐI BACKEND) */}
            {total > 0 && (
              <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden w-full">
                <Pagination
                  variant="default"
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={limit}
                  pageSizeOptions={[10, 20, 50]}
                  itemLabel="nhật ký"
                  showRecordRange={false}
                  showFirstLast={false}
                  onPageChange={onPageChange}
                  onPageSizeChange={onLimitChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
