import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  MapPin,
  Lock,
  Unlock,
  Receipt,
  History,
  TrendingUp,
  Target,
  RefreshCw,
  ScrollText,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { salesTargetsService } from '../services/sales-targets.service';
import type {
  SalesTargetDetailResponse,
  ContributingOrder,
  AdjustmentLogItem,
} from '../services/sales-targets.service';

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

const formatDate = (isoString?: string): string => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

const formatDateTime = (isoString?: string): string => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  } catch {
    return isoString;
  }
};

export const SalesTargetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SalesTargetDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'logs'>('orders');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    salesTargetsService
      .getSalesTargetDetail(id)
      .then((res) => {
        setData(res);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Lỗi tải chi tiết chỉ tiêu doanh số';
        showToast('error', msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
        <span className="font-medium text-sm text-slate-600">Đang tải thông tin chi tiết chỉ tiêu...</span>
      </div>
    );
  }

  if (!data || !data.item) {
    return (
      <div className="space-y-4">
        <Link
          to="/sales/targets"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-[var(--color-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại danh sách chỉ tiêu</span>
        </Link>
        <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-center text-slate-500">
          <ScrollText className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-slate-700">Không tìm thấy thông tin chỉ tiêu doanh số</p>
          <p className="text-xs text-slate-400 mt-1">Chỉ tiêu có thể đã bị xóa hoặc bạn không có quyền truy cập.</p>
        </div>
      </div>
    );
  }

  const { item, contributingOrders = [], logs = [] } = data;
  const hasTarget = item.targetAmount > 0;

  return (
    <div className="space-y-5 w-full">
      {/* ── NÚT QUAY LẠI & TIÊU ĐỀ ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Link
            to="/sales/targets"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-[var(--color-primary)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách chỉ tiêu</span>
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {item.targetType === 'EMPLOYEE' ? (
                <Users className="h-6 w-6 text-blue-600 shrink-0" />
              ) : (
                <MapPin className="h-6 w-6 text-emerald-600 shrink-0" />
              )}
              <span>{item.targetName}</span>
            </h1>

            {/* Badge Phạm vi */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                item.targetType === 'EMPLOYEE'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
              }`}
            >
              {item.targetType === 'EMPLOYEE' ? 'Cá nhân nhân viên' : 'Khu vực thị trường'}
            </span>

            {/* Badge Trạng thái kỳ */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                item.isLocked
                  ? 'bg-amber-50 text-amber-800 border-amber-200/70'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
              }`}
            >
              {item.isLocked ? (
                <>
                  <Lock className="h-3 w-3 text-amber-600" />
                  <span>Kỳ đã khóa</span>
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3 text-emerald-600" />
                  <span>Kỳ mở</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/60 self-start sm:self-auto">
          Kỳ áp dụng: <span className="text-slate-900 font-bold">{item.period}</span>
        </div>
      </div>

      {/* ── THẺ KPI TỔNG HỢP GỌN GÀNG, KHÔNG WRAP DƯ THỪA ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Mục tiêu giao */}
        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Mục tiêu giao</span>
            <Target className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums whitespace-nowrap truncate">
            {hasTarget ? formatCurrency(item.targetAmount) : 'Chưa giao'}
          </div>
        </div>

        {/* Card 2: Doanh số thực tế */}
        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Doanh số thực tế</span>
            <TrendingUp className="h-4 w-4 text-indigo-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-indigo-700 tabular-nums whitespace-nowrap truncate">
            {formatCurrency(item.actualAmount)}
          </div>
        </div>

        {/* Card 3: % Hoàn thành */}
        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Tỷ lệ hoàn thành</span>
            {hasTarget && item.completionRate !== null && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  item.completionRate >= 100
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.completionRate >= 80
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {item.statusLabel}
              </span>
            )}
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums whitespace-nowrap truncate">
            {hasTarget && item.completionRate !== null ? `${item.completionRate}%` : '—'}
          </div>
        </div>

        {/* Card 4: Chênh lệch */}
        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Chênh lệch mục tiêu</span>
            <Receipt className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <div
            className={`text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap truncate ${
              !hasTarget
                ? 'text-slate-400'
                : item.isExceeded
                ? 'text-emerald-600'
                : 'text-rose-600'
            }`}
          >
            {hasTarget
              ? item.isExceeded
                ? `+${formatCurrency(item.shortageOrExcess)}`
                : `-${formatCurrency(Math.abs(item.shortageOrExcess))}`
              : '—'}
          </div>
        </div>
      </div>

      {/* ── TAB CHUYỂN ĐỔI BẢNG: ĐƠN HÀNG ĐÓNG GÓP & LỊCH SỬ ĐIỀU CHỈNH ── */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Đơn hàng đóng góp doanh số ({contributingOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Lịch sử điều chỉnh ({logs.length})</span>
        </button>
      </div>

      {/* ── BẢNG DỮ LIỆU ĐỒNG NHẤT VỚI STYLE CỦA NHẬT KÝ HỆ THỐNG ── */}
      {activeTab === 'orders' ? (
        <div className="w-full space-y-3">
          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[700px] table-fixed border-collapse">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[32%]" />
                  <col className="w-[20%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">Mã đơn hàng</th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">Thời gian</th>
                    <th className="px-5 py-3.5 text-left whitespace-nowrap">Khách hàng / Đại lý</th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap">Doanh số (VNĐ)</th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {contributingOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <ScrollText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm text-slate-400 font-normal">
                          Chưa có đơn hàng nào được ghi nhận doanh số trong kỳ này
                        </p>
                      </td>
                    </tr>
                  ) : (
                    contributingOrders.map((ord: ContributingOrder) => (
                      <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-5 py-3.5 text-center whitespace-nowrap font-mono font-semibold text-indigo-700 text-xs">
                          {ord.orderCode}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap text-sm font-medium text-slate-600">
                          {formatDate(ord.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-left whitespace-nowrap font-medium text-slate-900 truncate" title={ord.customerName}>
                          {ord.customerName}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap font-bold text-slate-900 tabular-nums">
                          {formatCurrency(ord.grandTotal)}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (< 640px) */}
          <div className="sm:hidden space-y-2.5 w-full">
            {contributingOrders.length === 0 ? (
              <div className="rounded-xl bg-white border border-slate-200/80 p-6 text-center text-slate-400">
                <ScrollText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs text-slate-400">Chưa có đơn hàng nào phát sinh</p>
              </div>
            ) : (
              contributingOrders.map((ord: ContributingOrder) => (
                <div
                  key={ord.id}
                  className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-indigo-700">{ord.orderCode}</span>
                    <span className="text-slate-400">{formatDate(ord.createdAt)}</span>
                  </div>
                  <div className="font-semibold text-slate-900 text-sm truncate">{ord.customerName}</div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(ord.grandTotal)}</span>
                    <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="w-full space-y-3">
          {/* Desktop Table Lịch sử điều chỉnh */}
          <div className="hidden sm:block rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[700px] table-fixed border-collapse">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[24%]" />
                  <col className="w-[36%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">Thời gian</th>
                    <th className="px-5 py-3.5 text-left whitespace-nowrap">Người điều chỉnh</th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap">Mức điều chỉnh</th>
                    <th className="px-5 py-3.5 text-left whitespace-nowrap">Lý do điều chỉnh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        <History className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm text-slate-400 font-normal">
                          Chưa có lịch sử điều chỉnh nào cho chỉ tiêu này
                        </p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log: AdjustmentLogItem) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-5 py-3.5 text-center whitespace-nowrap text-sm font-medium text-slate-600">
                          {formatDateTime(log.adjustedAt)}
                        </td>
                        <td className="px-5 py-3.5 text-left whitespace-nowrap font-medium text-slate-900">
                          {log.adjustedByName}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap tabular-nums">
                          <span className="line-through text-slate-400 text-xs mr-1.5">{formatCurrency(log.oldAmount)}</span>
                          <span className="font-bold text-indigo-700">{formatCurrency(log.newAmount)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-left text-slate-700 text-xs sm:text-sm">
                          {log.reason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View Lịch sử điều chỉnh (< 640px) */}
          <div className="sm:hidden space-y-2.5 w-full">
            {logs.length === 0 ? (
              <div className="rounded-xl bg-white border border-slate-200/80 p-6 text-center text-slate-400">
                <History className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs text-slate-400">Chưa có lịch sử điều chỉnh nào</p>
              </div>
            ) : (
              logs.map((log: AdjustmentLogItem) => (
                <div
                  key={log.id}
                  className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{log.adjustedByName}</span>
                    <span className="text-slate-400">{formatDateTime(log.adjustedAt)}</span>
                  </div>
                  <div className="text-xs">
                    <span className="line-through text-slate-400 mr-1.5">{formatCurrency(log.oldAmount)}</span>
                    <span className="font-bold text-indigo-700">{formatCurrency(log.newAmount)}</span>
                  </div>
                  <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="font-semibold text-slate-700">Lý do: </span>
                    {log.reason}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
