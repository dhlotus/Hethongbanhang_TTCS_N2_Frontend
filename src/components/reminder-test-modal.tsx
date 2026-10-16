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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl my-8 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kiểm Thử & Đối Soát Tác Vụ Nhắc Hạn Tự Động (SN-208)
              </h2>
              <p className="text-xs text-slate-500">
                Kiểm tra cơ chế nhắc trước 3 ngày, nhắc quá hạn, scheduler hàng ngày và chống gửi trùng lặp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Card giới thiệu quy tắc SN-208 */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm mb-1">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span>Quy tắc vận hành của tác vụ theo chuẩn SN-208:</span>
            </div>
            <p>• <strong>Nhắc trước 3 ngày:</strong> Tự động gửi email & thông báo trong ứng dụng cho các hóa đơn có đúng 3 ngày tới hạn.</p>
            <p>• <strong>Nhắc khi quá hạn:</strong> Gửi email & thông báo cảnh báo mức độ cao, ghi rõ số ngày quá hạn và dư nợ.</p>
            <p>• <strong>Chống gửi trùng trong ngày:</strong> Mỗi hóa đơn chỉ nhận tối đa 1 thông báo cùng loại trong 1 ngày theo múi giờ Việt Nam.</p>
            <p>• <strong>Scheduler Backend:</strong> Chạy nền tự động mỗi ngày (08:00 sáng VN), độc lập hoàn toàn với việc người dùng có mở web hay không.</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="run-scheduler-btn"
              type="button"
              disabled={triggering}
              onClick={() => handleTrigger(false)}
              className="inline-flex items-center gap-2 px-4 h-[38px] text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${triggering && !isForceRetrying ? 'animate-spin' : ''}`} />
              <span>{triggering && !isForceRetrying ? 'Đang chạy Scheduler...' : 'Kích hoạt chạy Scheduler ngay (Thử nghiệm)'}</span>
            </button>

            <button
              id="force-retry-btn"
              type="button"
              disabled={triggering}
              onClick={() => handleTrigger(true)}
              className="inline-flex items-center gap-2 px-3.5 h-[38px] text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-300 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              title="Bỏ qua cờ chống trùng để thử nghiệm lại quy trình gửi email & thông báo"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isForceRetrying ? 'animate-spin text-amber-700' : 'text-amber-600'}`} />
              <span>{isForceRetrying ? 'Đang thử lại cưỡng chế...' : 'Thử lại cưỡng chế (Force Retry)'}</span>
            </button>

            <button
              type="button"
              onClick={fetchLogs}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-auto"
              title="Tải lại nhật ký"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Kết quả lần chạy gần nhất */}
          {lastResult && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <h4 className="font-bold text-slate-800">Kết quả quét lần chạy vừa thực hiện:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-500">Nhắc trước 3 ngày:</span>
                  <p className="text-base font-bold text-amber-600">{lastResult.upcomingRemindersSent}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-500">Cảnh báo quá hạn:</span>
                  <p className="text-base font-bold text-rose-600">{lastResult.overdueRemindersSent}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-500">Bỏ qua (Chống trùng):</span>
                  <p className="text-base font-bold text-slate-700">{lastResult.skippedAlreadySent}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-slate-500">Lỗi gửi email:</span>
                  <p className={`text-base font-bold ${lastResult.failedCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {lastResult.failedCount === 0 ? '0 (Hoàn hảo)' : lastResult.failedCount}
                  </p>
                </div>
              </div>

              {lastResult.details && lastResult.details.length > 0 && (
                <div className="mt-3 space-y-1">
                  <span className="text-slate-500 font-medium">Chi tiết xử lý từng hóa đơn:</span>
                  <ul className="space-y-1 mt-1">
                    {lastResult.details.map((d: any, idx: number) => (
                      <li key={idx} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-white border border-slate-100">
                        <span className="font-mono font-semibold text-slate-800">{d.invoiceCode} ({d.customerName})</span>
                        <div className="flex items-center gap-2">
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

          {/* Bảng lịch sử gửi nhắc nợ đã lưu */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
              <span>Nhật ký thông báo nhắc hạn đã lưu trữ ({logs.length})</span>
            </h3>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Chưa có lịch sử nhắc nợ nào. Nhấn nút "Kích hoạt chạy Scheduler ngay" ở trên để chạy tác vụ đầu tiên.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold">
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
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-50 border-t border-slate-200/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-[38px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
