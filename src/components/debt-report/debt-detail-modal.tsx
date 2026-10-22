import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  X,
  Phone,
  Calendar,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  CheckCircle2,
  Receipt,
  Scale,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import type {
  AgentDebtReport,
  DebtLedgerStatement,
  QueryDebtLedgerParams,
} from '../../types/debt-report.type';
import { debtReportService } from '../../services/debt-report.service';

interface DebtDetailModalProps {
  agency: AgentDebtReport | null;
  onClose: () => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));
};

const formatMoney = (n?: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' đ';
};

/**
 * Modal Sổ Chi Tiết Công Nợ (SN-231)
 * Đáp ứng trọn vẹn yêu cầu:
 * 1. Liệt kê toàn bộ phát sinh tăng giảm theo thời gian kèm số dư luỹ kế
 * 2. Lọc theo khoảng thời gian
 * 3. Xuất PDF và Excel đối chiếu số dư
 */
export const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
  agency,
  onClose,
}) => {
  // Khoảng thời gian mặc định: Đầu tháng hiện tại đến ngày hôm nay
  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    [now],
  );
  const defaultTo = useMemo(() => now.toISOString().slice(0, 10), [now]);

  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);
  const [statement, setStatement] = useState<DebtLedgerStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Tải dữ liệu phát sinh theo thời gian kèm số dư lũy kế
  useEffect(() => {
    if (!agency) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    const queryParams: QueryDebtLedgerParams = {
      agencyId: agency.agencyCode || agency.agencyId,
      fromDate,
      toDate,
    };

    debtReportService
      .getDebtLedger(queryParams)
      .then((data) => {
        if (isMounted) {
          setStatement(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Lỗi tải sổ chi tiết công nợ:', err);
          setErrorMsg(
            err?.response?.data?.message ||
              'Không thể tải dữ liệu sổ chi tiết. Vui lòng thử lại.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [agency, fromDate, toDate]);

  if (!agency) {
    return null;
  }

  const debtDays = agency.oldestDebtDays ?? 0;
  const isOverdue = agency.isOverdue || debtDays > (agency.maxDebtDays || 30);

  const isDateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    if (toDate && val && val > toDate) {
      setToDate(val);
    }
  };

  const handleToDateChange = (val: string) => {
    if (fromDate && val && val < fromDate) {
      setFromDate(val);
      setToDate(val);
    } else {
      setToDate(val);
    }
  };

  // Xuất file Excel sổ chi tiết công nợ
  const handleExportExcel = async () => {
    if (!agency) return;
    setExportingExcel(true);
    try {
      const params: QueryDebtLedgerParams = {
        agencyId: agency.agencyCode || agency.agencyId,
        fromDate,
        toDate,
      };
      const blob = await debtReportService.exportLedgerToExcel(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `So_Chi_Tiet_Cong_No_${agency.agencyCode}_${fromDate}_den_${toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Không thể xuất file Excel sổ chi tiết. Vui lòng thử lại sau.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Xuất file PDF sổ chi tiết công nợ
  const handleExportPdf = async () => {
    if (!agency) return;
    setExportingPdf(true);
    try {
      const params: QueryDebtLedgerParams = {
        agencyId: agency.agencyCode || agency.agencyId,
        fromDate,
        toDate,
      };
      const blob = await debtReportService.exportLedgerToPdf(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `So_Chi_Tiet_Cong_No_${agency.agencyCode}_${fromDate}_den_${toDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Không thể xuất file PDF sổ chi tiết. Vui lòng thử lại sau.');
    } finally {
      setExportingPdf(false);
    }
  };

  const renderStatusBadge = () => {
    if (agency.remainingDebt === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
          Đã tất toán
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
          Quá hạn
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
        Trong hạn
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header: Tiêu đề Sổ Chi Tiết Công Nợ + Nút Xuất Excel & PDF + Nút Đóng */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80 shadow-2xs">
              <Scale className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-lg tracking-tight">
                  Sổ Chi Tiết Công Nợ
                </h3>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                  {agency.agencyCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {agency.agencyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Xuất Excel (SN-231) */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Xuất Sổ chi tiết công nợ ra file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{exportingExcel ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>

            {/* Nút Xuất PDF (SN-231) */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Xuất Sổ chi tiết công nợ ra file PDF (.pdf)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{exportingPdf ? 'Đang xuất...' : 'Xuất PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ml-1"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Cuộn trơn tru */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* 2. 4 Card Tổng Quan Tài Chính */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Hạn Mức Công Nợ */}
            <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70">
              <p className="text-[11px] text-indigo-700 uppercase font-bold tracking-wider">
                Hạn mức công nợ
              </p>
              <p className="font-mono font-bold text-base sm:text-lg text-indigo-900 mt-1">
                {formatCurrency(agency.creditLimit)}{' '}
                <span className="text-xs font-normal text-indigo-700/70">đ</span>
              </p>
              <div className="mt-0.5 text-[11px] text-indigo-600 font-medium">
                Hạn nợ: {agency.maxDebtDays || 30} ngày
              </div>
            </div>

            {/* Tổng Phải Thu */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">
                Tổng phải thu
              </p>
              <p className="font-mono font-bold text-base sm:text-lg text-slate-800 mt-1">
                {formatCurrency(agency.totalReceivable)}{' '}
                <span className="text-xs font-normal text-slate-500">đ</span>
              </p>
              <div className="mt-0.5 text-[11px] text-slate-500 font-medium">
                Doanh số lũy kế
              </div>
            </div>

            {/* Đã Thanh Toán */}
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
              <p className="text-[11px] text-emerald-700 uppercase font-bold tracking-wider">
                Đã thanh toán
              </p>
              <p className="font-mono font-bold text-base sm:text-lg text-emerald-700 mt-1">
                {formatCurrency(agency.totalPaid)}{' '}
                <span className="text-xs font-normal text-emerald-700/70">đ</span>
              </p>
              <div className="mt-0.5 text-[11px] text-emerald-600 font-medium">
                Tiền đã thu về
              </div>
            </div>

            {/* Dư Nợ Hiện Tại */}
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70">
              <p className="text-[11px] text-amber-700 uppercase font-bold tracking-wider">
                Dư nợ hiện tại
              </p>
              <p className="font-mono font-bold text-base sm:text-lg text-amber-800 mt-1">
                {formatCurrency(agency.remainingDebt)}{' '}
                <span className="text-xs font-normal text-amber-700/70">đ</span>
              </p>
              <div className="mt-0.5 text-[11px] text-amber-700 font-medium">
                {agency.creditLimit > 0
                  ? `Dùng: ${Math.round((agency.remainingDebt / agency.creditLimit) * 100)}% hạn mức`
                  : 'Chưa cấp hạn mức'}
              </div>
            </div>
          </div>

          {/* 3. Khối Thông tin đại lý & Số ngày nợ hiện tại */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium shrink-0">Mã:</span>
                <span className="font-mono font-bold text-indigo-700">{agency.agencyCode}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium shrink-0">Điện thoại:</span>
                <span className="font-mono font-semibold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {agency.phone || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium shrink-0">Khu vực:</span>
                <span className="font-semibold text-slate-700">{agency.region || 'Toàn quốc'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium shrink-0">Tuổi nợ:</span>
                <span className="font-bold font-mono text-slate-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {debtDays} ngày
                </span>
                {renderStatusBadge()}
              </div>
            </div>
          </div>

          {/* 4. Bộ lọc theo khoảng thời gian (SN-231) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Khoảng thời gian đối chiếu phát sinh
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">Từ:</span>
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(e) => handleFromDateChange(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">Đến:</span>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => handleToDateChange(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {isDateRangeInvalid && (
              <div className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Ngày bắt đầu không được lớn hơn ngày kết thúc.
              </div>
            )}
          </div>

          {/* 5. Bảng Liệt Kê Toàn Bộ Phát Sinh Tăng Giảm Theo Thời Gian Kèm Số Dư Luỹ Kế (SN-231) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Chứng từ phát sinh & Số dư lũy kế
              </span>
              {statement && (
                <span className="text-xs font-medium text-slate-500">
                  Số dư đầu kỳ: <strong className="font-mono text-slate-800">{formatMoney(statement.openingBalance)}</strong>
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-500">Đang tải chứng từ và tính số dư lũy kế...</p>
              </div>
            ) : errorMsg ? (
              <div className="py-8 px-4 text-center text-xs font-medium text-rose-600">
                {errorMsg}
              </div>
            ) : statement ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                      <th className="py-2.5 px-3 text-center w-[12%]">Ngày CT</th>
                      <th className="py-2.5 px-3 w-[15%]">Mã chứng từ</th>
                      <th className="py-2.5 px-3 w-[15%]">Loại CT</th>
                      <th className="py-2.5 px-3 w-[28%]">Diễn giải</th>
                      <th className="py-2.5 px-3 text-right w-[10%] text-blue-700">Tăng (+)</th>
                      <th className="py-2.5 px-3 text-right w-[10%] text-emerald-700">Giảm (-)</th>
                      <th className="py-2.5 px-3 text-right w-[10%] text-slate-900 font-bold">Dư lũy kế</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Dòng Số Dư Đầu Kỳ */}
                    <tr className="bg-slate-50/70 font-semibold text-slate-800">
                      <td className="py-2 px-3 text-center font-mono text-slate-600">{statement.period.fromDate}</td>
                      <td className="py-2 px-3">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          ĐẦU KỲ
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">Số dư đầu kỳ</td>
                      <td className="py-2 px-3 text-slate-500 italic">Số dư lũy kế chuyển sang</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">—</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">—</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatMoney(statement.openingBalance)}
                      </td>
                    </tr>

                    {/* Danh sách chứng từ phát sinh */}
                    {statement.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Không có chứng từ phát sinh nào trong khoảng thời gian đã chọn.
                        </td>
                      </tr>
                    ) : (
                      statement.transactions.map((tx) => {
                        const isCancelled = tx.status === 'CANCELLED';

                        return (
                          <tr
                            key={tx.id}
                            className={`hover:bg-indigo-50/20 transition-colors ${
                              isCancelled ? 'bg-slate-50 opacity-60' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center font-mono text-slate-600">{tx.date}</td>
                            <td className="py-2 px-3">
                              <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                                {tx.documentCode}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                                  tx.documentType === 'INVOICE'
                                    ? 'text-blue-700'
                                    : tx.documentType === 'PAYMENT'
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {tx.documentType === 'INVOICE' && <Receipt className="w-3.5 h-3.5 shrink-0" />}
                                {tx.documentType === 'PAYMENT' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                                {tx.documentType === 'RETURN' && <RotateCcw className="w-3.5 h-3.5 shrink-0" />}
                                <span>{tx.documentTypeLabel}</span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              <span className={isCancelled ? 'line-through text-slate-400' : ''}>
                                {tx.description}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-blue-700">
                              {tx.debit > 0 ? formatMoney(tx.debit) : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                              {tx.credit > 0 ? formatMoney(tx.credit) : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                              {formatMoney(tx.runningBalance)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {/* Footer Tổng kết phát sinh */}
                  <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-600">
                        Tổng phát sinh trong kỳ & Số dư cuối kỳ:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-800">
                        {formatMoney(statement.totalDebit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                        {formatMoney(statement.totalCredit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700 bg-rose-50/60">
                        {formatMoney(statement.closingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer: Nút Đóng căn phải */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

