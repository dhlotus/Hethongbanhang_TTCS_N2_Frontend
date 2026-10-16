import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Building2,
  DollarSign,
  Bell,
} from 'lucide-react';
import type {
  InvoiceItem,
  DealerDebtSummary,
} from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { InvoiceDetailModal } from '../components/invoice-detail-modal';
import { RecordPaymentModal } from '../components/record-payment-modal';
import { ReminderTestModal } from '../components/reminder-test-modal';
import { showToast } from '../components/toast';

const formatCurrency = (val?: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const PortalDebtPage: React.FC = () => {
  const [summary, setSummary] = useState<DealerDebtSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc & Tìm kiếm
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('DUE_DATE_ASC');

  // Modals
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<InvoiceItem | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceItem | null>(null);
  const [isReminderTestOpen, setIsReminderTestOpen] = useState<boolean>(false);

  // Tải dữ liệu từ backend
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumData, invData] = await Promise.all([
        invoicesService.getMyDebtSummary(),
        invoicesService.getInvoices(),
      ]);
      setSummary(sumData);
      setInvoices(invData);
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu công nợ:', err);
      showToast('error', 'Không thể tải dữ liệu sổ công nợ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lọc và sắp xếp hóa đơn trên giao diện
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    const now = new Date();

    // 1. Tìm kiếm
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (inv) =>
          inv.invoiceCode.toLowerCase().includes(q) ||
          inv.orderCode.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.note?.toLowerCase().includes(q)
      );
    }

    // 2. Lọc trạng thái
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'OVERDUE') {
        result = result.filter(
          (inv) => inv.remainingAmount > 0 && new Date(inv.dueDate) < now
        );
      } else if (statusFilter === 'UPCOMING_3') {
        result = result.filter((inv) => {
          if (inv.remainingAmount <= 0) return false;
          const diffDays = Math.ceil(
            (new Date(inv.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          return diffDays >= 0 && diffDays <= 3;
        });
      } else if (statusFilter === 'UNPAID') {
        result = result.filter((inv) => inv.paidAmount === 0 && inv.status !== 'PAID');
      } else if (statusFilter === 'PARTIAL') {
        result = result.filter((inv) => inv.status === 'PARTIALLY_PAID');
      } else if (statusFilter === 'PAID') {
        result = result.filter((inv) => inv.status === 'PAID');
      }
    }

    // 3. Sắp xếp
    result.sort((a, b) => {
      if (sortBy === 'DUE_DATE_ASC') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'DUE_DATE_DESC') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      if (sortBy === 'AMOUNT_DESC') {
        return b.amount - a.amount;
      }
      if (sortBy === 'REMAINING_DESC') {
        return b.remainingAmount - a.remainingAmount;
      }
      if (sortBy === 'ISSUE_DATE_DESC') {
        return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
      }
      return 0;
    });

    return result;
  }, [invoices, search, statusFilter, sortBy]);

  // Tính số hóa đơn sắp tới hạn trong 3 ngày
  const upcomingInvoicesCount = useMemo(() => {
    const now = new Date();
    return invoices.filter((inv) => {
      if (inv.remainingAmount <= 0) return false;
      const diffDays = Math.ceil(
        (new Date(inv.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays >= 0 && diffDays <= 3;
    }).length;
  }, [invoices]);

  // Helper tính ngày đến hạn
  const getDueBadge = (dueDateStr: string, remainingAmount: number) => {
    if (remainingAmount <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
          Đã tất toán
        </span>
      );
    }
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="h-3 w-3" />
          Quá hạn {Math.abs(diffDays)} ngày
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3" />
          Còn {diffDays} ngày tới hạn
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700">
        Còn {diffDays} ngày
      </span>
    );
  };

  const handleDownloadPdf = async (inv: InvoiceItem) => {
    try {
      showToast('info', `Đang xuất bản in hóa đơn ${inv.invoiceCode}...`);
      await invoicesService.downloadInvoicePdf(inv.id, inv.invoiceCode);
      showToast('success', 'Đã mở bản in hóa đơn thành công');
    } catch {
      showToast('error', 'Không thể tải hóa đơn');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Nút chức năng */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Sổ Công Nợ & Hạn Mức Tín Dụng
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Cổng Đại Lý B2B
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi dư nợ mua buôn, hạn thanh toán hóa đơn và hạn mức tín dụng còn lại để lấy hàng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReminderTestOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-xs"
            title="Kiểm tra tác vụ quét hạn và gửi email nhắc nợ tự động theo SN-208"
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Tác vụ nhắc nợ (SN-208)</span>
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Banner Cảnh Báo nếu có nợ quá hạn hoặc nợ sắp đến hạn trong 3 ngày (SN-208) */}
      {summary && (summary.overdueDebt > 0 || upcomingInvoicesCount > 0) && (
        <div className="space-y-3">
          {summary.overdueDebt > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">
                    Cảnh báo: Bạn có {summary.overdueInvoicesCount} hóa đơn quá hạn thanh toán!
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Tổng tiền nợ quá hạn: <strong>{formatCurrency(summary.overdueDebt)}</strong>. Quý đại lý vui lòng tất toán sớm để tránh gián đoạn việc đặt hàng theo chính sách tín dụng.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusFilter('OVERDUE')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shrink-0 transition-colors"
              >
                Lọc xem hóa đơn quá hạn
              </button>
            </div>
          )}

          {upcomingInvoicesCount > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">
                    Nhắc hạn: Có {upcomingInvoicesCount} hóa đơn sắp đến hạn trong 3 ngày tới (SN-208 A)
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Hệ thống đã chuẩn bị gửi thông báo email tự động. Quý đại lý vui lòng thu xếp thanh toán đúng kỳ hạn.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusFilter('UPCOMING_3')}
                className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg shrink-0 transition-colors"
              >
                Xem hóa đơn đến hạn
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Thẻ KPI Tổng công nợ & Hạn mức tín dụng (SN-207 C) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng công nợ hiện tại */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Tổng dư nợ hiện tại</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
              {formatCurrency(summary?.currentDebt)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Chưa thanh toán:</span>
              <strong className="text-slate-700 font-semibold">{summary?.unpaidInvoicesCount || 0} hóa đơn</strong>
            </p>
          </div>
        </div>

        {/* Thẻ 2: Hạn mức tín dụng được cấp */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Hạn mức tín dụng được cấp</span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-blue-900 font-mono">
              {formatCurrency(summary?.effectiveLimit)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Thời hạn nợ tối đa: <strong className="text-slate-700 font-semibold">{summary?.maxDebtDays || 30} ngày</strong>
              {summary?.temporaryCreditLimit ? (
                <span className="text-indigo-600 ml-1">(+tạm thời {formatCurrency(summary.temporaryCreditLimit)})</span>
              ) : null}
            </p>
          </div>
        </div>

        {/* Thẻ 3: Hạn mức còn lại được mua hàng */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span>Hạn mức còn lại được lấy hàng</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono">
              {formatCurrency(summary?.availableCredit)}
            </div>
            {/* Thanh tiến trình tỷ lệ sử dụng */}
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>Đã dùng: {summary?.debtUsagePercentage || 0}%</span>
                <span>Khả dụng</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (summary?.debtUsagePercentage || 0) >= 90
                      ? 'bg-rose-500'
                      : (summary?.debtUsagePercentage || 0) >= 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, summary?.debtUsagePercentage || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Thẻ 4: Số tiền nợ quá hạn */}
        <div className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between ${
          (summary?.overdueDebt || 0) > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
            <span className={(summary?.overdueDebt || 0) > 0 ? 'text-rose-800 font-semibold' : ''}>
              Tiền nợ quá hạn
            </span>
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
              (summary?.overdueDebt || 0) > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className={`text-xl sm:text-2xl font-bold font-mono ${
              (summary?.overdueDebt || 0) > 0 ? 'text-rose-700' : 'text-slate-800'
            }`}>
              {formatCurrency(summary?.overdueDebt)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {(summary?.overdueInvoicesCount || 0) > 0 ? (
                <span className="text-rose-700 font-semibold">
                  ⚠️ Có {summary?.overdueInvoicesCount} hóa đơn quá hạn nợ
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Không có nợ quá hạn
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Toolbar: Tìm kiếm, Lọc trạng thái, Sắp xếp */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Tìm kiếm */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo số hóa đơn (HD...), mã đơn hàng (DH...), ghi chú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
          />
        </div>

        {/* Lọc trạng thái */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium whitespace-nowrap">
            <Filter className="h-3.5 w-3.5" />
            <span>Trạng thái:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">Tất cả ({invoices.length})</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIAL">Thanh toán một phần</option>
            <option value="UPCOMING_3">⏰ Còn 3 ngày đến hạn</option>
            <option value="OVERDUE">🚨 Quá hạn thanh toán</option>
            <option value="PAID">Đã thanh toán đủ</option>
          </select>
        </div>

        {/* Sắp xếp */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium whitespace-nowrap">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Sắp xếp:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="DUE_DATE_ASC">Hạn thanh toán: Gần nhất trước</option>
            <option value="DUE_DATE_DESC">Hạn thanh toán: Xa nhất trước</option>
            <option value="REMAINING_DESC">Số tiền nợ: Lớn nhất trước</option>
            <option value="AMOUNT_DESC">Tổng tiền: Lớn nhất trước</option>
            <option value="ISSUE_DATE_DESC">Ngày phát hành: Mới nhất</option>
          </select>
        </div>
      </div>

      {/* 5. Bảng danh sách Hóa đơn công nợ (SN-207 A) */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Đang tải danh sách hóa đơn công nợ...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3 shadow-inner">
              <Receipt className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {search || statusFilter !== 'ALL'
                ? 'Không tìm thấy hóa đơn phù hợp'
                : 'Đại lý chưa có hóa đơn hoặc công nợ nào'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.'
                : 'Tất cả các đơn hàng mua buôn của Quý đại lý đều đã được thanh toán hoặc chưa phát sinh hóa đơn tài chính.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse min-w-[940px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Số hóa đơn</th>
                  <th className="py-3 px-4">Đơn hàng gốc</th>
                  <th className="py-3 px-4">Ngày phát hành</th>
                  <th className="py-3 px-4">Hạn thanh toán</th>
                  <th className="py-3 px-4 text-right">Tổng tiền</th>
                  <th className="py-3 px-4 text-right">Đã thanh toán</th>
                  <th className="py-3 px-4 text-right">Còn nợ</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 bg-white">
                {filteredInvoices.map((inv) => {
                  const isOverdue =
                    inv.remainingAmount > 0 && new Date(inv.dueDate) < new Date();

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Số hóa đơn */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForDetail(inv)}
                          className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {inv.invoiceCode}
                        </button>
                      </td>

                      {/* Đơn hàng gốc */}
                      <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                        {inv.orderCode}
                      </td>

                      {/* Ngày phát hành */}
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {formatDate(inv.issueDate)}
                      </td>

                      {/* Hạn thanh toán kèm badge */}
                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-slate-800">
                          {formatDate(inv.dueDate)}
                        </div>
                        <div className="mt-0.5">
                          {getDueBadge(inv.dueDate, inv.remainingAmount)}
                        </div>
                      </td>

                      {/* Tổng tiền */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(inv.amount)}
                      </td>

                      {/* Đã thanh toán */}
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium">
                        {formatCurrency(inv.paidAmount)}
                      </td>

                      {/* Còn nợ */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={inv.remainingAmount > 0 ? (isOverdue ? 'text-rose-600' : 'text-slate-900') : 'text-slate-400'}>
                          {formatCurrency(inv.remainingAmount)}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-4 text-center">
                        {inv.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đã thanh toán đủ
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Quá hạn
                          </span>
                        ) : inv.status === 'PARTIALLY_PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3.5 w-3.5" />
                            Thanh toán 1 phần
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Chưa thanh toán
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForDetail(inv)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Xem chi tiết hóa đơn"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(inv)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Tải / In hóa đơn PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {inv.remainingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceForPayment(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors ml-1"
                              title="Thanh toán nợ hóa đơn này"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Thanh toán</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <InvoiceDetailModal
        invoice={selectedInvoiceForDetail}
        isOpen={Boolean(selectedInvoiceForDetail)}
        onClose={() => setSelectedInvoiceForDetail(null)}
        onOpenPayment={(inv) => {
          setSelectedInvoiceForDetail(null);
          setSelectedInvoiceForPayment(inv);
        }}
      />

      <RecordPaymentModal
        invoice={selectedInvoiceForPayment}
        isOpen={Boolean(selectedInvoiceForPayment)}
        onClose={() => setSelectedInvoiceForPayment(null)}
        onSuccess={() => {
          fetchData();
        }}
      />

      <ReminderTestModal
        isOpen={isReminderTestOpen}
        onClose={() => setIsReminderTestOpen(false)}
        onRefreshDebt={fetchData}
      />
    </div>
  );
};
