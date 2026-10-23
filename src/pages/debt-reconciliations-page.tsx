import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';
import {
  debtReconciliationService,
} from '../services/debt-reconciliation.service';
import type {
  DebtReconciliationReport,
  DebtReconciliationSummary,
  ReconciliationStatus,
} from '../types/debt-reconciliation';
import { customerService } from '../services/customer.service';
import type { Customer } from '../types/customer.types';
import { Pagination } from '../components/pagination';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';
import { USER_ROLES } from '../types/auth';

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

const formatCreatorName = (name?: string): string => {
  if (!name || name.toLowerCase() === 'accountant') {
    return 'Vũ Mai Hoa';
  }
  if (name.toLowerCase() === 'admin') {
    return 'Quản trị viên';
  }
  return name.replace(/\s*\([^)]*\)/g, '').trim();
};

export const DebtReconciliationsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const roles = (currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])).map((r) =>
    String(r).toUpperCase(),
  );

  const isAdmin = roles.includes(USER_ROLES.ADMIN);
  const isAccountant = roles.includes(USER_ROLES.ACCOUNTANT) || roles.includes('ACCOUNTANT_DEBT');
  const canCreate = isAdmin || isAccountant;

  // Dữ liệu danh sách & KPI
  const [reports, setReports] = useState<DebtReconciliationReport[]>([]);
  const [summary, setSummary] = useState<DebtReconciliationSummary>({
    totalCount: 0,
    pendingCount: 0,
    confirmedCount: 0,
    disputedCount: 0,
    totalClosingBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  // Danh sách đại lý để lọc
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Phân trang
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Modal xem chi tiết
  const [viewingReport, setViewingReport] = useState<DebtReconciliationReport | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Đóng dropdown Thao tác khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenActionId(null);
    };
    if (openActionId) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [openActionId]);

  // Tải danh sách đại lý
  useEffect(() => {
    customerService.getCustomers({ limit: 100 })
      .then((res) => {
        if (res && res.data) setCustomers(res.data);
      })
      .catch((err) => console.error('Lỗi tải danh sách khách hàng:', err));
  }, []);

  // Tải danh sách biên bản & KPI
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resList, resSummary] = await Promise.all([
        debtReconciliationService.getReports({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          agency_id: selectedAgency || undefined,
          period: selectedPeriod === 'ALL' ? undefined : selectedPeriod,
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        }),
        debtReconciliationService.getSummary(),
      ]);

      setReports(resList.data || []);
      setTotalItems(resList.total || 0);
      setSummary(resSummary);
    } catch (err) {
      console.error('Lỗi tải danh sách biên bản đối chiếu:', err);
      showToast('error', 'Không thể tải danh sách biên bản đối chiếu');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, selectedAgency, selectedPeriod, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Xử lý tải PDF
  const handleDownloadPdf = async (e: React.MouseEvent, report: DebtReconciliationReport) => {
    e.stopPropagation();
    try {
      setDownloadingId(report.id);
      await debtReconciliationService.downloadPdf(report.id, report.code);
      showToast('success', `Đã xuất PDF biên bản ${report.code} thành công`);
    } catch (err) {
      console.error('Lỗi xuất PDF:', err);
      showToast('error', 'Lỗi khi tải file PDF biên bản đối chiếu');
    } finally {
      setDownloadingId(null);
    }
  };

  // Xóa biên bản
  const handleDelete = async (e: React.MouseEvent, report: DebtReconciliationReport) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa biên bản đối chiếu ${report.code}?`)) {
      return;
    }
    try {
      await debtReconciliationService.deleteReport(report.id);
      showToast('success', 'Đã xóa biên bản đối chiếu thành công');
      loadData();
      if (viewingReport?.id === report.id) {
        setViewingReport(null);
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Không thể xóa biên bản này');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Thanh nút hành động (Bỏ hình 1, bỏ icon làm mới và dấu cộng trong hình 2) */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => {
            loadData();
          }}
          disabled={loading}
          className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          title="Làm mới dữ liệu"
        >
          <span>Làm mới</span>
        </button>

        {canCreate && (
          <button
            onClick={() => navigate('/accounting/debt-reconciliations/create')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-[0.98] cursor-pointer"
          >
            <span>Lập biên bản mới</span>
          </button>
        )}
      </div>

      {/* 2. Thẻ KPI Thống kê (Đồng bộ 1 màu giống khung Tổng biên bản, bỏ icon, bỏ chữ nhỏ, bỏ khung Tổng nợ chốt kỳ) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng biên bản</span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{summary.totalCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Chờ xác nhận</span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{summary.pendingCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đã xác nhận</span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{summary.confirmedCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Phản hồi lệch</span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">{summary.disputedCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Khung Bộ lọc */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Mã biên bản, tên đại lý..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Chọn đại lý */}
          <div>
            <select
              value={selectedAgency}
              onChange={(e) => {
                setSelectedAgency(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            >
              <option value="">Tất cả đại lý</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Chọn Kỳ đối chiếu */}
          <div>
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            >
              <option value="ALL">Tất cả các kỳ</option>
              <option value="2026-10">Tháng 10/2026</option>
              <option value="2026-09">Tháng 09/2026</option>
            </select>
          </div>

          {/* Chọn Trạng thái */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xác nhận</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="DISPUTED">Phản hồi lệch</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Bảng Danh Sách Biên Bản Đối Chiếu */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className={`overflow-x-auto overscroll-x-contain transition-all duration-200 ${openActionId ? 'pb-44 min-h-[280px]' : ''}`}>
          <table className="w-full min-w-[750px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Mã biên bản</th>
                <th className="py-3 px-4 min-w-[200px]">Đại lý đối chiếu</th>
                <th className="py-3 px-3 text-center">Kỳ</th>
                <th className="py-3 px-4">Người lập</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Đang tải dữ liệu biên bản...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy biên bản đối chiếu nào phù hợp
                  </td>
                </tr>
              ) : (
                reports.map((r) => {
                  const badge = STATUS_BADGES[r.status] || STATUS_BADGES.PENDING;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setViewingReport(r)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-semibold text-indigo-600 whitespace-nowrap align-top">
                        <div className="h-7 flex items-center">{r.code}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 align-top">
                        <div className="h-7 flex items-center leading-none">{r.agencyName}</div>
                        <div className="text-[10px] text-slate-400 font-normal leading-none mt-1 tracking-tight">
                          {r.agencyCode || r.agencyId}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                        <div className="h-7 flex items-center justify-center">
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700">
                            {r.period}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <div className="h-7 flex items-center text-sm font-medium text-slate-800">
                          {formatCreatorName(r.createdByName)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap align-top">
                        <div className="h-7 flex items-center">
                          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap align-top">
                        <div className="h-7 flex items-center justify-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            <span>{badge.label}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap align-top" onClick={(e) => e.stopPropagation()}>
                        <div className="h-7 flex items-center justify-center">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionId(openActionId === r.id ? null : r.id);
                              }}
                              className="inline-flex items-center justify-center gap-1.5 h-7 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer"
                            >
                              <span>Thao tác</span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                          {openActionId === r.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1 z-30 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100 text-left"
                            >
                              <div className="py-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionId(null);
                                    setViewingReport(r);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left cursor-pointer"
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
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left cursor-pointer disabled:opacity-50"
                                >
                                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Xuất PDF</span>
                                </button>
                              </div>

                              {r.status === 'PENDING' && canCreate && (
                                <div className="py-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      setOpenActionId(null);
                                      handleDelete(e, r);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Xóa biên bản</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang chuẩn thu nhỏ gọn gàng (giảm từ 5 điểm về 3 điểm) */}
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
      </div>

      {/* 5. Modal Xem Chi Tiết Biên Bản Đối Chiếu */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800">
                      Biên bản đối chiếu {viewingReport.code}
                    </h3>
                    {(() => {
                      const badge = STATUS_BADGES[viewingReport.status] || STATUS_BADGES.PENDING;
                      const BadgeIcon = badge.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kỳ đối chiếu: <strong className="text-slate-700">{viewingReport.period}</strong> | Lập lúc:{' '}
                    {new Date(viewingReport.createdAt).toLocaleString('vi-VN')}
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

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Cảnh báo Phản hồi lệch nếu có */}
              {viewingReport.status === 'DISPUTED' && viewingReport.disputeNote && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-bold text-rose-800">Nội dung đại lý phản hồi lệch số liệu:</h4>
                    <p className="text-rose-700 mt-1 whitespace-pre-line">{viewingReport.disputeNote}</p>
                    {viewingReport.confirmedBy && (
                      <p className="text-xs text-rose-500 mt-2">
                        Người phản hồi: <strong>{viewingReport.confirmedBy}</strong> - Lúc:{' '}
                        {viewingReport.confirmedAt ? new Date(viewingReport.confirmedAt).toLocaleString('vi-VN') : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Thông tin Đại lý & Kế toán */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 items-start">
                <div className="sm:col-span-8">
                  <span className="text-xs text-slate-500 font-semibold">
                    Đại lý : {viewingReport.agencyCode || viewingReport.agencyId}
                  </span>
                  <p className="text-sm font-bold text-slate-800 mt-1">{viewingReport.agencyName}</p>
                </div>
                <div className="sm:col-span-4">
                  <span className="text-xs text-slate-500 font-semibold">
                    Kế toán phụ trách
                  </span>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {formatCreatorName(viewingReport.createdByName)}
                  </p>
                </div>
              </div>

              {/* 4 Thẻ Số Liệu Đối Chiếu */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Tổng hợp số liệu trong kỳ
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs text-slate-500">1. Dư nợ đầu kỳ</span>
                    <p className="text-base font-bold text-slate-800 mt-1">
                      {formatVND(viewingReport.openingBalance)}
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl">
                    <span className="text-xs text-rose-600 font-medium">2. Mua hàng</span>
                    <p className="text-base font-bold text-rose-700 mt-1">
                      {formatVND(viewingReport.totalInvoiced)}
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                    <span className="text-xs text-emerald-600 font-medium">3. Đã thanh toán</span>
                    <p className="text-base font-bold text-emerald-700 mt-1">
                      {formatVND(viewingReport.totalPaid)}
                    </p>
                  </div>

                  <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl">
                    <span className="text-xs text-indigo-600 font-medium">4. Dư nợ cuối kỳ</span>
                    <p className="text-base font-bold text-indigo-700 mt-1">
                      {formatVND(viewingReport.closingBalance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bảng Kê Hóa Đơn Phát Sinh Trong Kỳ */}
              {viewingReport.invoices && viewingReport.invoices.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Chi tiết đơn hàng mua buôn trong kỳ ({viewingReport.invoices.length})
                    </h4>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                        <tr>
                          <th className="py-2 px-3">Mã đơn hàng</th>
                          <th className="py-2 px-3">Ngày</th>
                          <th className="py-2 px-3">Nội dung</th>
                          <th className="py-2 px-3 text-right">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingReport.invoices.map((inv, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-semibold text-rose-600">{inv.code}</td>
                            <td className="py-2 px-3 text-slate-500">{inv.date}</td>
                            <td className="py-2 px-3 text-slate-700">{inv.description}</td>
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

              {/* Bảng Kê Phiếu Thu / Thanh Toán Trong Kỳ */}
              {viewingReport.payments && viewingReport.payments.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Chi tiết phiếu thu ngân sách đã duyệt ({viewingReport.payments.length})
                    </h4>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                        <tr>
                          <th className="py-2 px-3">Mã phiếu thu</th>
                          <th className="py-2 px-3">Ngày</th>
                          <th className="py-2 px-3">Hình thức</th>
                          <th className="py-2 px-3 text-right">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingReport.payments.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-semibold text-emerald-600">{p.code}</td>
                            <td className="py-2 px-3 text-slate-500">{p.date}</td>
                            <td className="py-2 px-3 text-slate-700">{p.method}</td>
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

              {/* Ghi chú */}
              {viewingReport.note && (
                <div className="text-xs text-slate-500 italic">
                  * Ghi chú biên bản: {viewingReport.note}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <button
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Đóng
              </button>

              <button
                onClick={(e) => handleDownloadPdf(e, viewingReport)}
                disabled={downloadingId === viewingReport.id}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-[0.98]"
              >
                {downloadingId === viewingReport.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>In / Xuất PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
