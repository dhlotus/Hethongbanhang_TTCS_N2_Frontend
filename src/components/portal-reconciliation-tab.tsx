import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw,
  X,
  Check,
  Send,
  ShoppingBag,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import { debtReconciliationService } from '../services/debt-reconciliation.service';
import type {
  DebtReconciliationReport,
  ReconciliationStatus,
} from '../types/debt-reconciliation';
import { showToast } from './toast';
import { numberToVietnameseWords } from '../utils/number-to-words';
import { tokenStorage } from '../utils/token-storage';
import { Pagination } from './pagination';

const STATUS_BADGES: Record<
  ReconciliationStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: 'Chờ xác nhận',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  DISPUTED: {
    label: 'Phản hồi lệch',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: AlertTriangle,
  },
};

const formatVND = (val?: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

export const PortalReconciliationTab: React.FC = () => {
  const [reports, setReports] = useState<DebtReconciliationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Xem chi tiết
  const [viewingReport, setViewingReport] = useState<DebtReconciliationReport | null>(null);

  // Modal phản hồi lệch
  const [disputingReport, setDisputingReport] = useState<DebtReconciliationReport | null>(null);
  const [disputeNote, setDisputeNote] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Phân trang
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Dropdown thao tác
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Modal xác nhận khớp số liệu chuyên nghiệp
  const [confirmingReport, setConfirmingReport] = useState<DebtReconciliationReport | null>(null);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handleOutsideClick = () => setOpenActionId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const user = tokenStorage.getUser();
      const agencyId = (user as any)?.agencyId || (user as any)?.customerId;
      const res = await debtReconciliationService.getReports({
        page,
        limit: pageSize,
        agency_id: agencyId || undefined,
      });
      setReports(res.data || []);
      setTotalItems(res.total || 0);
    } catch (err) {
      console.error('Lỗi tải danh sách biên bản:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Xử lý xác nhận khớp số liệu qua Modal
  const handleConfirmSubmit = async () => {
    if (!confirmingReport) return;

    setIsSubmittingConfirm(true);
    try {
      await debtReconciliationService.respond(confirmingReport.id, {
        status: 'CONFIRMED',
      });
      showToast('success', `Đã xác nhận khớp số liệu biên bản ${confirmingReport.code} thành công!`);
      const confirmedId = confirmingReport.id;
      setConfirmingReport(null);
      loadData();
      if (viewingReport?.id === confirmedId) {
        setViewingReport((prev) => prev ? { ...prev, status: 'CONFIRMED' } : null);
      }
    } catch (err: any) {
      console.error('Lỗi xác nhận biên bản:', err);
      showToast('error', err?.response?.data?.message || 'Không thể xác nhận biên bản');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  // Mở modal gửi phản hồi lệch
  const handleOpenDispute = (report: DebtReconciliationReport) => {
    setDisputingReport(report);
    setDisputeNote('');
  };

  // Gửi phản hồi lệch
  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingReport) return;
    if (!disputeNote.trim()) {
      showToast('error', 'Vui lòng nhập nội dung hoặc lý do phát hiện lệch số liệu');
      return;
    }

    setSubmittingDispute(true);
    try {
      await debtReconciliationService.respond(disputingReport.id, {
        status: 'DISPUTED',
        dispute_note: disputeNote.trim(),
      });
      showToast('success', 'Đã gửi phản hồi lệch số liệu tới bộ phận Kế toán thành công!');
      setDisputingReport(null);
      loadData();
      if (viewingReport?.id === disputingReport.id) {
        setViewingReport((prev) => prev ? { ...prev, status: 'DISPUTED', disputeNote: disputeNote.trim() } : null);
      }
    } catch (err: any) {
      console.error('Lỗi gửi phản hồi lệch:', err);
      showToast('error', err?.response?.data?.message || 'Không thể gửi phản hồi lệch');
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Tải PDF
  const handleDownloadPdf = async (e: React.MouseEvent, report: DebtReconciliationReport) => {
    e.stopPropagation();
    try {
      setDownloadingId(report.id);
      await debtReconciliationService.downloadPdf(report.id, report.code);
      showToast('success', `Đã tải PDF biên bản ${report.code}`);
    } catch (err) {
      console.error('Lỗi tải PDF:', err);
      showToast('error', 'Không thể tải file PDF biên bản');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Thanh công cụ phụ */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Biên bản đối chiếu công nợ định kỳ
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Xác nhận số dư nợ định kỳ (tháng/quý) giữa Đại lý và Công ty LOHA SALES
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Danh sách biên bản */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className={`overflow-x-auto transition-all duration-200 ${openActionId ? 'pb-44 min-h-[280px]' : ''}`}>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Mã biên bản</th>
                <th className="py-3 px-3 text-center">Kỳ đối chiếu</th>
                <th className="py-3 px-4 text-right">Dư đầu kỳ</th>
                <th className="py-3 px-4 text-right text-rose-600">Mua hàng</th>
                <th className="py-3 px-4 text-right text-emerald-600">Đã thanh toán</th>
                <th className="py-3 px-4 text-right font-bold text-indigo-700">Dư nợ chốt kỳ</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Đang tải danh sách biên bản đối chiếu...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <FileText className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    Chưa có biên bản đối chiếu nào được phát hành cho đại lý
                  </td>
                </tr>
              ) : (
                reports.map((r) => {
                  const badge = STATUS_BADGES[r.status] || STATUS_BADGES.PENDING;
                  const BadgeIcon = badge.icon;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setViewingReport(r)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-indigo-600 whitespace-nowrap">
                        {r.code}
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700">
                          {r.period}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-700">
                        {formatVND(r.openingBalance)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-medium text-rose-600">
                        {formatVND(r.totalInvoiced)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-medium text-emerald-600">
                        {formatVND(r.totalPaid)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-indigo-700">
                        {formatVND(r.closingBalance)}
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setOpenActionId(openActionId === r.id ? null : r.id)}
                            className="inline-flex items-center justify-center gap-1.5 h-7 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer"
                          >
                            <span>Thao tác</span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          {openActionId === r.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1 z-30 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100 text-left"
                            >
                              {r.status === 'PENDING' ? (
                                <>
                                  <div className="py-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionId(null);
                                        setConfirmingReport(r);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Xác nhận khớp</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionId(null);
                                        handleOpenDispute(r);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Phản hồi lệch</span>
                                    </button>
                                  </div>
                                  <div className="py-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionId(null);
                                        setViewingReport(r);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>Xem chi tiết</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={downloadingId === r.id}
                                      onClick={(e) => {
                                        setOpenActionId(null);
                                        handleDownloadPdf(e, r);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors text-left cursor-pointer disabled:opacity-50"
                                    >
                                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>Tải file PDF</span>
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionId(null);
                                      setViewingReport(r);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Xem chi tiết</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={downloadingId === r.id}
                                    onClick={(e) => {
                                      setOpenActionId(null);
                                      handleDownloadPdf(e, r);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors text-left cursor-pointer disabled:opacity-50"
                                  >
                                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Tải file PDF</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang chuẩn thu nhỏ gọn gàng */}
        {totalItems > 0 && (
          <div className="px-3 py-2 border-t border-slate-200/80 bg-slate-50/50">
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(totalItems / pageSize))}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              showRecordRange={false}
              size="xs"
              className="w-full justify-between"
            />
          </div>
        )}
      </div>

      {/* Modal Xem Chi Tiết Biên Bản */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Biên bản đối chiếu {viewingReport.code}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kỳ: <strong>{viewingReport.period}</strong> | Ngày lập:{' '}
                    {new Date(viewingReport.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Cảnh báo lệch nếu có */}
              {viewingReport.status === 'DISPUTED' && viewingReport.disputeNote && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-bold text-rose-800">Nội dung phản hồi lệch số liệu:</h4>
                    <p className="text-rose-700 mt-1 whitespace-pre-line">{viewingReport.disputeNote}</p>
                  </div>
                </div>
              )}

              {/* 4 Khối số liệu */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500">1. Dư nợ đầu kỳ</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {formatVND(viewingReport.openingBalance)}
                  </p>
                </div>

                <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl">
                  <span className="text-xs text-rose-600 font-medium">2. Mua hàng</span>
                  <p className="text-sm font-bold text-rose-700 mt-1">
                    {formatVND(viewingReport.totalInvoiced)}
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                  <span className="text-xs text-emerald-600 font-medium">3. Đã thanh toán</span>
                  <p className="text-sm font-bold text-emerald-700 mt-1">
                    {formatVND(viewingReport.totalPaid)}
                  </p>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl">
                  <span className="text-xs text-indigo-600 font-medium">4. Dư nợ cuối kỳ</span>
                  <p className="text-sm font-bold text-indigo-700 mt-1">
                    {formatVND(viewingReport.closingBalance)}
                  </p>
                </div>
              </div>

              {/* Đọc tiền bằng chữ */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="text-slate-500 font-medium">Viết bằng chữ: </span>
                <strong className="text-indigo-900">
                  {numberToVietnameseWords(viewingReport.closingBalance)}
                </strong>
              </div>

              {/* Bảng Kê Đơn Hàng & Phiếu Thu */}
              {viewingReport.invoices && viewingReport.invoices.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-rose-600" />
                    Đơn hàng mua buôn trong kỳ
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Mã đơn hàng</th>
                          <th className="py-2 px-3">Ngày</th>
                          <th className="py-2 px-3 text-right">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingReport.invoices.map((inv, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-semibold text-rose-600">{inv.code}</td>
                            <td className="py-2 px-3 text-slate-500">{inv.date}</td>
                            <td className="py-2 px-3 text-right font-medium text-slate-800">
                              {formatVND(inv.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewingReport.payments && viewingReport.payments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    Phiếu thu ngân sách đã duyệt
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Mã phiếu thu</th>
                          <th className="py-2 px-3">Ngày</th>
                          <th className="py-2 px-3 text-right">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingReport.payments.map((p, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-semibold text-emerald-600">{p.code}</td>
                            <td className="py-2 px-3 text-slate-500">{p.date}</td>
                            <td className="py-2 px-3 text-right font-medium text-slate-800">
                              {formatVND(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {viewingReport.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenDispute(viewingReport)}
                      className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
                    >
                      Gửi phản hồi lệch
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReport(viewingReport)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Xác nhận số liệu</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={(e) => handleDownloadPdf(e, viewingReport)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Khớp Số Liệu Chuyên Nghiệp */}
      {confirmingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Xác nhận khớp số liệu công nợ
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mã biên bản: <strong className="text-emerald-700">{confirmingReport.code}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingConfirm && setConfirmingReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition"
                disabled={isSubmittingConfirm}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200/60">
                  <span>Kỳ đối chiếu:</span>
                  <span className="font-semibold text-slate-700 px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                    {confirmingReport.period}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Dư nợ chốt kỳ cần xác nhận:</span>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                    {formatVND(confirmingReport.closingBalance)}
                  </p>
                </div>
                <div className="text-xs text-slate-600 pt-1">
                  <span className="text-slate-400 font-medium">Bằng chữ: </span>
                  <strong className="text-slate-800">
                    {numberToVietnameseWords(confirmingReport.closingBalance)}
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 leading-relaxed">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Quý đại lý xác nhận số liệu mua hàng và thanh toán trong kỳ đã hoàn toàn chính xác. Sau khi xác nhận, biên bản sẽ được chốt chính thức và gửi thông báo tới Kế toán.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-slate-50/80 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmingReport(null)}
                disabled={isSubmittingConfirm}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition disabled:opacity-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmittingConfirm}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingConfirm ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Đồng ý xác nhận khớp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Phản Hồi Lệch */}
      {disputingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold">Phản hồi lệch số liệu ({disputingReport.code})</h3>
              </div>
              <button
                onClick={() => setDisputingReport(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDispute} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Vui lòng mô tả chi tiết các khoản mục lệch (ví dụ: hóa đơn ngày nào bị tính thừa, hoặc phiếu thu nào đã nộp nhưng chưa được hạch toán giảm trừ) để kế toán kiểm tra và xử lý.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nội dung phản hồi sai lệch <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={disputeNote}
                  onChange={(e) => setDisputeNote(e.target.value)}
                  placeholder="Ví dụ: Hóa đơn HD-015 ngày 08/10 bị tính thừa 2 thùng hàng trị giá 1.200.000đ đã lập biên bản trả..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputingReport(null)}
                  disabled={submittingDispute}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingDispute}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition active:scale-[0.98]"
                >
                  {submittingDispute ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Gửi phản hồi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
