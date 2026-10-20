import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { DebtReminderLog } from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { showToast } from './toast';

interface ReminderTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshDebt?: () => void;
}

export const ReminderTestModal: React.FC<ReminderTestModalProps> = ({
  isOpen,
  onClose,
  onRefreshDebt,
}) => {
  const [logs, setLogs] = useState<DebtReminderLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const [isForceRetrying, setIsForceRetrying] = useState<boolean>(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await invoicesService.getReminderLogs();
      setLogs(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const handleTrigger = async (force = false) => {
    try {
      setTriggering(true);
      if (force) setIsForceRetrying(true);

      const res = await invoicesService.triggerReminders(force);
      setLastResult(res);

      if (force) {
        showToast(
          'success',
          'Thử lại cưỡng chế thành công',
          `Gửi thành công ${res.upcomingRemindersSent} nhắc 3 ngày, ${res.overdueRemindersSent} cảnh báo quá hạn (${res.failedCount} lỗi).`,
          8000
        );
      } else {
        showToast(
          'success',
          'Quét định kỳ hoàn tất',
          `${res.upcomingRemindersSent} nhắc 3 ngày, ${res.overdueRemindersSent} quá hạn, ${res.skippedAlreadySent} bỏ qua chống trùng lặp.`,
          6000
        );
      }

      await fetchLogs();
      if (onRefreshDebt) onRefreshDebt();
    } catch (err: any) {
      console.error('[FORCE_RETRY_ERROR_LOG]', {
        name: err.name,
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: err.config,
      });
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const errorMsg = isTimeout
        ? 'Thời gian gửi qua SMTP kéo dài, tác vụ vẫn đang được xử lý và ghi sổ ngầm trong CSDL.'
        : err.response?.data?.message || err.message || 'Lỗi khi kích hoạt nhắc nợ';
      showToast('error', 'Kích hoạt tác vụ thất bại', errorMsg, 6000);
    } finally {
      setTriggering(false);
      setIsForceRetrying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      <div className="relative w-full max-w-4xl my-auto bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]">
        {/* ================================================================= */}
        {/* 1. MODAL HEADER                                                   */}
        {/* ================================================================= */}
        <div className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-b border-slate-200/80 shrink-0">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5 sm:mt-0">
              <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 break-words leading-snug">
                Kiểm Thử & Đối Soát Tác Vụ Nhắc Hạn Tự Động (SN-208)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Kiểm tra cơ chế nhắc trước 3 ngày, nhắc quá hạn, scheduler hàng ngày và chống gửi trùng lặp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Đóng modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* 2. MODAL BODY (SCROLLABLE, KHÔNG TRÀN NGANG)                      */}
        {/* ================================================================= */}
        <div className="p-3.5 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-4 sm:space-y-6">
          {/* Card giới thiệu quy tắc SN-208 */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-indigo-900 text-xs sm:text-sm mb-1">
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Quy tắc vận hành của tác vụ theo chuẩn SN-208:</span>
            </div>
            <p className="leading-relaxed">• <strong>Nhắc trước 3 ngày:</strong> Tự động gửi email & thông báo trong ứng dụng cho các hóa đơn có đúng 3 ngày tới hạn.</p>
            <p className="leading-relaxed">• <strong>Nhắc khi quá hạn:</strong> Gửi email & thông báo cảnh báo mức độ cao, ghi rõ số ngày quá hạn và dư nợ.</p>
            <p className="leading-relaxed">• <strong>Chống gửi trùng trong ngày:</strong> Mỗi hóa đơn chỉ nhận tối đa 1 thông báo cùng loại trong 1 ngày theo múi giờ Việt Nam.</p>
            <p className="leading-relaxed">• <strong>Scheduler Backend:</strong> Chạy nền tự động mỗi ngày (08:00 sáng VN), độc lập hoàn toàn với việc người dùng có mở web hay không.</p>
          </div>

          {/* Action buttons - Sắp xếp theo chiều dọc khi trên mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <button
              id="run-scheduler-btn"
              type="button"
              disabled={triggering}
              onClick={() => handleTrigger(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 h-10 sm:h-[38px] text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${triggering && !isForceRetrying ? 'animate-spin' : ''}`} />
              <span>{triggering && !isForceRetrying ? 'Đang chạy Scheduler...' : 'Kích hoạt chạy Scheduler ngay (Thử nghiệm)'}</span>
            </button>

            <button
              id="force-retry-btn"
              type="button"
              disabled={triggering}
              onClick={() => handleTrigger(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 h-10 sm:h-[38px] text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-300 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              title="Bỏ qua cờ chống trùng để thử nghiệm lại quy trình gửi email & thông báo"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isForceRetrying ? 'animate-spin text-amber-700' : 'text-amber-600'}`} />
              <span>{isForceRetrying ? 'Đang thử lại cưỡng chế...' : 'Thử lại cưỡng chế (Force Retry)'}</span>
            </button>

            <button
              type="button"
              onClick={fetchLogs}
              className="self-end sm:self-auto sm:ml-auto p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Tải lại nhật ký"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Kết quả lần chạy gần nhất */}
          {lastResult && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
              <h4 className="font-bold text-slate-800">Kết quả quét lần chạy vừa thực hiện:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 min-w-0">
                  <span className="text-slate-500 block text-[11px] truncate">Nhắc trước 3 ngày:</span>
                  <p className="text-base font-bold text-amber-600 tabular-nums">{lastResult.upcomingRemindersSent}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 min-w-0">
                  <span className="text-slate-500 block text-[11px] truncate">Cảnh báo quá hạn:</span>
                  <p className="text-base font-bold text-rose-600 tabular-nums">{lastResult.overdueRemindersSent}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 min-w-0">
                  <span className="text-slate-500 block text-[11px] truncate">Bỏ qua (Chống trùng):</span>
                  <p className="text-base font-bold text-slate-700 tabular-nums">{lastResult.skippedAlreadySent}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 min-w-0">
                  <span className="text-slate-500 block text-[11px] truncate">Lỗi gửi email:</span>
                  <p className={`text-base font-bold tabular-nums ${lastResult.failedCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {lastResult.failedCount === 0 ? '0 (Hoàn hảo)' : lastResult.failedCount}
                  </p>
                </div>
              </div>

              {lastResult.details && lastResult.details.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <span className="text-slate-500 font-medium">Chi tiết xử lý từng hóa đơn:</span>
                  <ul className="space-y-1.5 mt-1">
                    {lastResult.details.map((d: any, idx: number) => (
                      <li key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-[11px] p-2 rounded-lg bg-white border border-slate-200/80">
                        <span className="font-mono font-semibold text-slate-800 break-words">
                          {d.invoiceCode} ({d.customerName})
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-500">{d.type === 'UPCOMING_3_DAYS' ? 'Nhắc trước 3 ngày' : 'Quá hạn'}</span>
                          <span className={`px-2 py-0.5 rounded font-semibold ${
                            d.status === 'SENT_SUCCESS' ? 'bg-emerald-50 text-emerald-700' :
                            d.status === 'SKIPPED_ALREADY_SENT' ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {d.status === 'SENT_SUCCESS' ? 'Đã gửi Email' :
                             d.status === 'SKIPPED_ALREADY_SENT' ? 'Bỏ qua (Đã gửi hôm nay)' : 'Lỗi'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Bảng nhật ký thông báo nhắc hạn đã lưu */}
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
              <span>Nhật ký thông báo nhắc hạn đã lưu trữ ({logs.length})</span>
            </h3>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Chưa có lịch sử nhắc nợ nào. Nhấn nút "Kích hoạt chạy Scheduler ngay" ở trên để chạy tác vụ đầu tiên.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                {/* 1. Desktop & Tablet: Bảng truyền thống */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Mã Hóa đơn</th>
                        <th className="py-2.5 px-3">Đại lý nhận</th>
                        <th className="py-2.5 px-3">Loại nhắc nợ</th>
                        <th className="py-2.5 px-3">Email người nhận</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                        <th className="py-2.5 px-3">Thời gian gửi (Giờ VN)</th>
                        <th className="py-2.5 px-3 text-right">Xem Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 bg-white">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{log.invoiceCode}</td>
                          <td className="py-2.5 px-3 text-slate-700">{log.customerName}</td>
                          <td className="py-2.5 px-3">
                            {log.type === 'UPCOMING_3_DAYS' ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
                                <Clock className="h-3 w-3" />
                                Trước hạn 3 ngày
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">
                                <AlertTriangle className="h-3 w-3" />
                                Quá hạn {log.overdueDays ? `${log.overdueDays} ngày` : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{log.recipientEmail}</td>
                          <td className="py-2.5 px-3">
                            {log.status === 'SUCCESS' ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Thành công
                              </span>
                            ) : (
                              <span className="text-rose-600 font-semibold">Thất bại</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {log.previewUrl ? (
                              <a
                                href={log.previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <span>Hòm thư</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2. Mobile: Danh sách thẻ (Card List) rõ ràng, không tràn ngang */}
                <div className="md:hidden divide-y divide-slate-100">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3.5 space-y-2.5 bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] text-slate-500 font-medium shrink-0">HĐ:</span>
                          <span className="font-mono font-bold text-xs text-slate-900 truncate">{log.invoiceCode}</span>
                        </div>
                        {log.status === 'SUCCESS' ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Thành công
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-semibold shrink-0">
                            Thất bại
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block">Đại lý nhận</span>
                        <span className="font-semibold text-xs sm:text-sm text-slate-800 break-words">{log.customerName}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 text-xs pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 text-[11px] shrink-0">Loại nhắc nợ:</span>
                          {log.type === 'UPCOMING_3_DAYS' ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                              <Clock className="h-3 w-3" />
                              Trước hạn 3 ngày
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                              <AlertTriangle className="h-3 w-3" />
                              Quá hạn {log.overdueDays ? `${log.overdueDays} ngày` : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 text-[11px] shrink-0">Email:</span>
                          <span className="font-mono text-xs text-slate-700 break-all">{log.recipientEmail}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 text-[11px] shrink-0">Thời gian gửi:</span>
                          <span className="text-xs text-slate-600">{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>

                      {log.previewUrl && (
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <a
                            href={log.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            <span>Xem hòm thư thử nghiệm</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. MODAL FOOTER                                                   */}
        {/* ================================================================= */}
        <div className="flex items-center justify-end px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 h-9 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

