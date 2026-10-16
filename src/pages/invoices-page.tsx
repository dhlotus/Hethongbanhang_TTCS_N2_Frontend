import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Receipt,
  Download,
  Eye,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { InvoiceItem } from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { InvoiceDetailModal } from '../components/invoice-detail-modal';
import { RecordPaymentModal } from '../components/record-payment-modal';
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

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<InvoiceItem | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceItem | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoicesService.getInvoices();
      setInvoices(data);
    } catch {
      showToast('error', 'Lỗi tải dữ liệu hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    const now = new Date();

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (inv) =>
          inv.invoiceCode.toLowerCase().includes(q) ||
          inv.orderCode.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'OVERDUE') {
        result = result.filter((inv) => inv.remainingAmount > 0 && new Date(inv.dueDate) < now);
      } else if (statusFilter === 'UNPAID') {
        result = result.filter((inv) => inv.paidAmount === 0 && inv.status !== 'PAID');
      } else if (statusFilter === 'PARTIAL') {
        result = result.filter((inv) => inv.status === 'PARTIALLY_PAID');
      } else if (statusFilter === 'PAID') {
        result = result.filter((inv) => inv.status === 'PAID');
      }
    }

    return result;
  }, [invoices, searchTerm, statusFilter]);

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
      {/* Tiêu đề trang & Nút chức năng */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quản Lý Hóa Đơn & Công Nợ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi danh sách hóa đơn bán hàng, kỳ hạn thanh toán và đối soát công nợ đại lý
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchInvoices}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Thanh bộ lọc (Filter Toolbar) */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Tìm kiếm */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo số hóa đơn, tên đại lý hoặc mã đơn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
          />
        </div>

        {/* Lọc trạng thái */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
            <Filter className="h-3.5 w-3.5" />
            <span>Trạng thái:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">Tất cả trạng thái ({invoices.length})</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIAL">Thanh toán một phần</option>
            <option value="OVERDUE">Quá hạn nợ</option>
            <option value="PAID">Đã thanh toán đủ</option>
          </select>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Đang tải danh sách hóa đơn...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <Receipt className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                Chưa có hóa đơn nào phù hợp
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Hiện tại hệ thống chưa ghi nhận hóa đơn bán hàng hoặc chứng từ công nợ nào
                phù hợp với điều kiện tìm kiếm.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-sm min-w-[940px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Số hóa đơn</th>
                  <th className="py-3 px-4">Đại lý / Khách hàng</th>
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
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForDetail(inv)}
                          className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {inv.invoiceCode}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{inv.customerName}</div>
                        <div className="text-xs font-mono text-slate-500">{inv.orderCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {formatDate(inv.issueDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-slate-800">
                          {formatDate(inv.dueDate)}
                        </div>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                            <AlertTriangle className="h-3 w-3" />
                            Quá hạn
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium">
                        {formatCurrency(inv.paidAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={inv.remainingAmount > 0 ? (isOverdue ? 'text-rose-600' : 'text-slate-900') : 'text-slate-400'}>
                          {formatCurrency(inv.remainingAmount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inv.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đã thanh toán
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Quá hạn
                          </span>
                        ) : inv.status === 'PARTIALLY_PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3.5 w-3.5" />
                            Một phần
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Chưa thanh toán
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForDetail(inv)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(inv)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Tải / In hóa đơn"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {inv.remainingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceForPayment(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors ml-1"
                              title="Ghi nhận thanh toán"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Thu tiền</span>
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
          fetchInvoices();
        }}
      />
    </div>
  );
};
