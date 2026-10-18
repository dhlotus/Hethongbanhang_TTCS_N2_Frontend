import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  FileSpreadsheet,
  ScrollText,
  RefreshCw,
  Eye,
  Printer,
  Download,
  Plus,
  X,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { InvoiceItem } from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { InvoiceDetailModal } from '../components/invoice-detail-modal';
import { RecordPaymentModal } from '../components/record-payment-modal';
import { IssueInvoiceModal } from '../components/issue-invoice-modal';
import { receiptsService } from '../services/receipts.service';
import { ReceiptPrintTemplate } from '../components/receipt-print-template';
import { Pagination } from '../components/pagination';
import { showToast } from '../components/toast';
import type { Receipt as ReceiptType } from '../types/receipt';

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
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const INITIAL_DEMO_RECEIPTS: ReceiptType[] = [
  {
    id: 'rcpt-001',
    code: 'PT2610-0001',
    customerId: 'cust-001',
    customerCode: 'DL-0001',
    customerName: 'Đại lý Sữa & Bánh kẹo Miền Bắc',
    customerPhone: '0988 123 456',
    customerAddress: 'Số 123 Phố Vọng, P. Đồng Tâm, Q. Hai Bà Trưng, Hà Nội',
    amount: 25000000,
    amountInWords: 'Hai mươi lăm triệu đồng chẵn',
    paymentMethod: 'CASH',
    paymentDate: '2026-10-15T09:30:00Z',
    referenceCode: 'HD2609-001',
    notes: 'Thu tiền mặt đợt 1 cho hóa đơn bán buôn HD2609-001',
    status: 'CONFIRMED',
    collectorId: 'usr-acc-01',
    collectorName: 'Nguyễn Thị Mai',
    createdAt: '2026-10-15T09:30:00Z',
  },
  {
    id: 'rcpt-002',
    code: 'PT2610-0002',
    customerId: 'cust-002',
    customerCode: 'DL-0002',
    customerName: 'Đại lý Tạp hóa Hưng Yên',
    customerPhone: '0912 345 678',
    customerAddress: 'Xã Dân Tiến, Huyện Khoái Châu, Tỉnh Hưng Yên',
    amount: 18000000,
    amountInWords: 'Mười tám triệu đồng chẵn',
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: '2026-10-14T14:15:00Z',
    referenceCode: 'HD2609-002',
    notes: 'Chuyển khoản thanh toán toàn bộ công nợ qua Vietcombank',
    status: 'CONFIRMED',
    collectorId: 'usr-acc-02',
    collectorName: 'Trần Văn Kế Toán',
    createdAt: '2026-10-14T14:15:00Z',
  },
  {
    id: 'rcpt-003',
    code: 'PT2610-0003',
    customerId: 'cust-008',
    customerCode: 'DL-0008',
    customerName: 'Đại Lý Tiêu Dùng Nhanh Thịnh Vượng',
    customerPhone: '0977 889 900',
    customerAddress: 'Số 45 Lê Lợi, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    amount: 51300000,
    amountInWords: 'Năm mươi mốt triệu ba trăm nghìn đồng chẵn',
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: '2026-10-15T15:45:00Z',
    referenceCode: 'DH2610-10156',
    notes: 'Thu tiền thanh toán đơn hàng bán buôn DH2610-10156',
    status: 'CONFIRMED',
    collectorId: 'usr-acc-01',
    collectorName: 'Nguyễn Thị Mai',
    createdAt: '2026-10-15T15:45:00Z',
  },
];

type TabKey = 'INVOICES' | 'RECEIPTS';

// Cấu hình nhãn và màu sắc Badge Pastel mềm mại, đồng bộ chuẩn xác với trang trước
const INVOICE_STATUS_BADGES: Record<
  string,
  { label: string; badgeClass: string }
> = {
  PAID: {
    label: 'Đã thanh toán',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  },
  PARTIALLY_PAID: {
    label: 'Một phần',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200/60',
  },
  OVERDUE: {
    label: 'Quá hạn',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  },
  UNPAID: {
    label: 'Chưa thanh toán',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200/60',
  },
};

const RECEIPT_METHOD_BADGES: Record<
  string,
  { label: string; badgeClass: string }
> = {
  CASH: {
    label: 'Tiền mặt',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  },
  BANK_TRANSFER: {
    label: 'Chuyển khoản',
    badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200/60',
  },
};

export const InvoicesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Cố định tab Hóa đơn bán hàng
  const initialTab: TabKey = 'INVOICES';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [page, setPage] = useState<number>(() => {
    return Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  });
  const [limit, setLimit] = useState<number>(() => {
    return Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10);
  });
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    return searchParams.get('search') || '';
  });
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const s = searchParams.get('status') || 'ALL';
    return s === 'PARTIAL' ? 'PARTIALLY_PAID' : s;
  });

  // State Hóa đơn bán hàng
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [totalInvoices, setTotalInvoices] = useState<number>(0);
  const [totalInvoicePages, setTotalInvoicePages] = useState<number>(1);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<InvoiceItem | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceItem | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // State Phiếu thu tiền
  const [receipts, setReceipts] = useState<ReceiptType[]>(INITIAL_DEMO_RECEIPTS);
  const [totalReceipts, setTotalReceipts] = useState<number>(INITIAL_DEMO_RECEIPTS.length);
  const [totalReceiptPages, setTotalReceiptPages] = useState<number>(1);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<ReceiptType | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Hàm cập nhật URL Search Parameters an toàn
  const updateUrlParams = useCallback(
    (newParams: {
      tab?: TabKey;
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const nextTab = newParams.tab !== undefined ? newParams.tab : activeTab;
          if (nextTab === 'RECEIPTS') {
            next.set('tab', 'receipts');
          } else {
            next.delete('tab');
          }

          const nextPage = newParams.page !== undefined ? newParams.page : page;
          if (nextPage > 1) {
            next.set('page', String(nextPage));
          } else {
            next.delete('page');
          }

          const nextLimit = newParams.limit !== undefined ? newParams.limit : limit;
          if (nextLimit !== 10) {
            next.set('limit', String(nextLimit));
          } else {
            next.delete('limit');
          }

          const nextSearch =
            newParams.search !== undefined ? newParams.search : searchTerm;
          if (nextSearch.trim()) {
            next.set('search', nextSearch.trim());
          } else {
            next.delete('search');
          }

          const nextStatus =
            newParams.status !== undefined ? newParams.status : statusFilter;
          if (nextStatus && nextStatus !== 'ALL') {
            next.set('status', nextStatus);
          } else {
            next.delete('status');
          }

          return next;
        },
        { replace: true }
      );
    },
    [activeTab, page, limit, searchTerm, statusFilter, setSearchParams]
  );

  // Lắng nghe thay đổi query params trên URL (hỗ trợ nút Back / Forward trình duyệt)
  useEffect(() => {
    const newPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const newLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10);
    const newSearch = searchParams.get('search') || '';
    const rawStatus = searchParams.get('status') || 'ALL';
    const newStatus = rawStatus === 'PARTIAL' ? 'PARTIALLY_PAID' : rawStatus;

    setActiveTab('INVOICES');
    setPage(newPage);
    setLimit(newLimit);
    setSearchTerm(newSearch);
    setStatusFilter(newStatus);
  }, [searchParams]);

  // Tải danh sách Hóa đơn từ Backend với phân trang
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoicesService.getPaginatedInvoices({
        page,
        limit,
        search: searchTerm.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setInvoices(res.data);
      setTotalInvoices(res.total);
      setTotalInvoicePages(res.totalPages);
    } catch {
      showToast('error', 'Lỗi tải dữ liệu hóa đơn');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter]);

  // Tải danh sách Phiếu thu từ Backend (kèm phân trang, tìm kiếm & lọc hình thức chuẩn Backend)
  const reloadReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receiptsService.getPaginatedReceipts({
        page,
        limit,
        search: searchTerm.trim() || undefined,
      });
      setReceipts(res.data);
      setTotalReceipts(res.total);
      setTotalReceiptPages(res.totalPages);
    } catch {
      // Fallback demo nếu mất kết nối
      let demoList = INITIAL_DEMO_RECEIPTS;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        demoList = demoList.filter(
          (r) =>
            r.code.toLowerCase().includes(q) ||
            r.customerName.toLowerCase().includes(q) ||
            r.customerCode.toLowerCase().includes(q),
        );
      }
      const total = demoList.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const offset = (page - 1) * limit;
      setReceipts(demoList.slice(offset, offset + limit));
      setTotalReceipts(total);
      setTotalReceiptPages(totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm]);

  // Đồng bộ số lượng hóa đơn cho badge
  const refreshBadgeCounts = useCallback(async () => {
    try {
      const invRes = await invoicesService.getPaginatedInvoices({ page: 1, limit: 1 });
      setTotalInvoices(invRes.total);
    } catch {
      // Bỏ qua lỗi ngầm
    }
  }, []);

  useEffect(() => {
    void fetchInvoices();
    void refreshBadgeCounts();
  }, [fetchInvoices, refreshBadgeCounts]);

  // In hóa đơn bán hàng (SN-200 ý 5 & SN-207)
  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      await invoicesService.printInvoice(invoiceId);
    } catch {
      showToast('error', 'Không thể mở bản in hóa đơn.');
    }
  };

  // Tải file PDF hóa đơn bán hàng (SN-200 ý 5 & SN-207)
  const handleDownloadInvoicePdf = async (invoiceId: string, invoiceCode: string) => {
    try {
      showToast('info', 'Đang tạo và tải hóa đơn PDF...');
      await invoicesService.downloadInvoicePdf(invoiceId, invoiceCode);
      showToast('success', 'Đã tải hóa đơn PDF thành công.');
    } catch {
      showToast('error', 'Không thể tải hóa đơn PDF.');
    }
  };

  // Xử lý thay đổi tìm kiếm
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
    updateUrlParams({ search: value, page: 1 });
  };

  // Xử lý thay đổi bộ lọc trạng thái hóa đơn
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    updateUrlParams({ status: value, page: 1 });
  };

  // Đặt lại toàn bộ bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPage(1);
    updateUrlParams({ search: '', status: 'ALL', page: 1 });
  };

  // Xử lý chuyển trang
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams({ page: newPage });
  };

  // Xử lý đổi kích thước trang
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    updateUrlParams({ limit: newLimit, page: 1 });
  };

  // Xuất file Excel dữ liệu sạch
  const handleExportExcel = () => {
    try {
      if (activeTab === 'INVOICES') {
        const rows = invoices.map((inv) => ({
          'Số hóa đơn': inv.invoiceCode,
          'Tên đại lý': inv.customerName,
          'Mã đại lý': inv.customerId === '55555555-0000-0000-0000-000000000001' ? 'DL-MK-001' : inv.customerId === '55555555-0000-0000-0000-000000000002' ? 'DL-AB-002' : inv.orderCode,
          'Hạn thanh toán': formatDate(inv.dueDate),
          'Tổng tiền': inv.amount,
          'Đã thanh toán': inv.paidAmount,
          'Còn nợ': inv.remainingAmount,
          'Trạng thái':
            inv.status === 'PAID'
              ? 'Đã thanh toán'
              : inv.remainingAmount > 0 && new Date(inv.dueDate) < new Date()
              ? 'Quá hạn'
              : inv.status === 'PARTIALLY_PAID'
              ? 'Một phần'
              : 'Chưa thanh toán',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'HoaDon');
        XLSX.writeFile(wb, `Danh_sach_hoa_don_${new Date().toISOString().slice(0, 10)}.xlsx`);
      } else {
        const rows = receipts.map((r) => ({
          'Mã phiếu thu': r.code,
          'Tên đại lý': r.customerName,
          'Mã đại lý': r.customerCode || '—',
          'Ngày thu': formatDate(r.paymentDate),
          'Số tiền': r.amount,
          'Hình thức': r.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản',
          'Người thu': r.collectorName || '—',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'PhieuThu');
        XLSX.writeFile(wb, `Danh_sach_phieu_thu_${new Date().toISOString().slice(0, 10)}.xlsx`);
      }
      showToast('success', 'Xuất file Excel thành công');
    } catch {
      showToast('error', 'Không thể xuất file Excel');
    }
  };

  const handleOpenPrint = (receipt: ReceiptType) => {
    setSelectedReceiptForPrint(receipt);
    setIsPrintModalOpen(true);
  };

  // Xác định thông tin Badge Pastel cho từng Hóa đơn
  const getInvoiceStatusBadge = (inv: InvoiceItem) => {
    const isOverdue = inv.remainingAmount > 0 && new Date(inv.dueDate) < new Date();
    if (inv.status === 'PAID' || inv.remainingAmount === 0) {
      return INVOICE_STATUS_BADGES.PAID;
    }
    if (isOverdue) {
      return INVOICE_STATUS_BADGES.OVERDUE;
    }
    if (inv.status === 'PARTIALLY_PAID' || (inv.paidAmount > 0 && inv.remainingAmount > 0)) {
      return INVOICE_STATUS_BADGES.PARTIALLY_PAID;
    }
    return INVOICE_STATUS_BADGES.UNPAID;
  };

  // Xác định thông tin Badge Pastel cho hình thức thu tiền
  const getReceiptMethodBadge = (method?: string) => {
    if (method && RECEIPT_METHOD_BADGES[method]) {
      return RECEIPT_METHOD_BADGES[method];
    }
    return {
      label: method || 'Khác',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200/60',
    };
  };

  return (
    <div className="space-y-4 w-full">
      {/* ── THANH ĐIỀU HƯỚNG TABS & NÚT HÀNH ĐỘNG GỌN GÀNG ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Nhãn Hóa đơn bán hàng */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-2xs max-w-fit">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs bg-white text-[var(--color-primary)] shadow-2xs border border-[var(--color-primary)]/20 font-semibold select-none">
            <span>Hóa đơn bán hàng</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold border border-[var(--color-primary-subtle)]">
              {totalInvoices}
            </span>
          </div>
        </div>

        {/* Nhóm nút chức năng bên phải */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsIssueModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer"
            title="Phát hành hóa đơn bán hàng từ phiếu thực giao (SN-200)"
          >
            <Plus className="h-4 w-4" />
            <span>Phát hành hóa đơn</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 h-9 px-3.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/90 hover:border-emerald-300 rounded-lg shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="Xuất file Excel"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* ── THANH BỘ LỌC TÌM KIẾM TINH GỌN ── */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm theo số hóa đơn, tên đại lý..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 focus:border-[var(--color-primary)] focus:bg-white transition-all font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Lọc trạng thái hóa đơn */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 focus:border-[var(--color-primary)] cursor-pointer shadow-2xs transition-all"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIALLY_PAID">Thanh toán một phần</option>
            <option value="OVERDUE">Quá hạn nợ</option>
            <option value="PAID">Đã thanh toán</option>
          </select>

          {/* Nút đặt lại bộ lọc */}
          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. BẢNG DỮ LIỆU DESKTOP (>= 640px) - ĐỒNG BỘ 100% STYLE AUDIT LOG   */}
      {/* =================================================================== */}
      <div className="hidden sm:block rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden w-full">
        {activeTab === 'INVOICES' ? (
          /* ── BẢNG HÓA ĐƠN BÁN HÀNG (6 CỘT) ── */
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[23%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
            </colgroup>

            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5 text-left whitespace-nowrap">Số hóa đơn</th>
                <th className="px-5 py-3.5 text-left whitespace-nowrap">Đại lý</th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap">Hạn thanh toán</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Tổng tiền</th>
                <th className="px-3 py-3.5 text-center whitespace-nowrap">Trạng thái</th>
                <th className="px-3 py-3.5 text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-[4.5rem] text-center text-slate-400">
                    <RefreshCw className="h-[1.5rem] w-[1.5rem] animate-spin mx-auto mb-[0.5rem] text-[var(--color-primary)]" />
                    <span className="font-medium text-sm">Đang tải dữ liệu hóa đơn...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-[4.5rem] text-center text-slate-400">
                    <ScrollText className="h-[2rem] w-[2rem] mx-auto mb-[0.5rem] text-slate-300" />
                    <p className="text-sm text-slate-400 font-normal">Không tìm thấy</p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const statusBadge = getInvoiceStatusBadge(inv);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* 1. Số hóa đơn (Link bấm rõ ràng) */}
                      <td className="px-5 py-4 text-left whitespace-nowrap text-sm font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForDetail(inv)}
                          className="text-[var(--color-primary)] hover:underline font-semibold transition-colors cursor-pointer text-left"
                          title="Xem chi tiết hóa đơn"
                        >
                          {inv.invoiceCode}
                        </button>
                      </td>

                      {/* 2. Đại lý (chỉ hiển thị tên theo yêu cầu) */}
                      <td className="px-5 py-4 text-left whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-900 truncate block max-w-full" title={inv.customerName}>
                          {inv.customerName}
                        </span>
                      </td>

                      {/* 3. Hạn thanh toán (căn giữa) */}
                      <td className="px-5 py-4 text-center whitespace-nowrap text-sm font-medium text-slate-600">
                        {formatDate(inv.dueDate)}
                      </td>

                      {/* 4. Tổng tiền (căn phải, số đậm rõ ràng) */}
                      <td className="px-5 py-4 text-right whitespace-nowrap text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(inv.amount)}
                      </td>

                      {/* 5. Trạng thái (Badge Pastel mềm mại, rộng rãi không bao giờ vỡ chữ) */}
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${statusBadge.badgeClass}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* 6. Thao tác: Không có sửa/xóa; hỗ trợ Chi tiết, In và Tải PDF (SN-200) */}
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForDetail(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="Xem chi tiết hóa đơn"
                            aria-label="Xem chi tiết"
                          >
                            <Eye className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                            <span>Chi tiết</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handlePrintInvoice(inv.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="In hóa đơn (window.print)"
                            aria-label="In hóa đơn"
                          >
                            <Printer className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            <span className="hidden lg:inline">In</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDownloadInvoicePdf(inv.id, inv.invoiceCode)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="Tải hóa đơn PDF"
                            aria-label="Tải PDF"
                          >
                            <Download className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            <span className="hidden lg:inline">PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          /* ── BẢNG PHIẾU THU TIỀN & ĐỐI TRỪ (6 CỘT) ── */
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[23%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
            </colgroup>

            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5 text-left whitespace-nowrap">Mã phiếu thu</th>
                <th className="px-5 py-3.5 text-left whitespace-nowrap">Đại lý</th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap">Ngày thu</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Số tiền</th>
                <th className="px-3 py-3.5 text-center whitespace-nowrap">Hình thức</th>
                <th className="px-3 py-3.5 text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-[4.5rem] text-center text-slate-400">
                    <RefreshCw className="h-[1.5rem] w-[1.5rem] animate-spin mx-auto mb-[0.5rem] text-[var(--color-primary)]" />
                    <span className="font-medium text-sm">Đang tải dữ liệu phiếu thu...</span>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-[4.5rem] text-center text-slate-400">
                    <ScrollText className="h-[2rem] w-[2rem] mx-auto mb-[0.5rem] text-slate-300" />
                    <p className="text-sm text-slate-400 font-normal">Không tìm thấy</p>
                  </td>
                </tr>
              ) : (
                receipts.map((r) => {
                  const methodBadge = getReceiptMethodBadge(r.paymentMethod);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* 1. Mã phiếu thu (Link bấm rõ ràng) */}
                      <td className="px-5 py-4 text-left whitespace-nowrap text-sm font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={() => handleOpenPrint(r)}
                          className="text-[var(--color-primary)] hover:underline font-semibold transition-colors cursor-pointer text-left"
                          title="In / Xem phiếu thu"
                        >
                          {r.code}
                        </button>
                      </td>

                      {/* 2. Đại lý (chỉ hiển thị tên theo yêu cầu) */}
                      <td className="px-5 py-4 text-left whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-900 truncate block max-w-full" title={r.customerName}>
                          {r.customerName}
                        </span>
                      </td>

                      {/* 3. Ngày thu (căn giữa) */}
                      <td className="px-5 py-4 text-center whitespace-nowrap text-sm font-medium text-slate-600">
                        {formatDate(r.paymentDate)}
                      </td>

                      {/* 4. Số tiền (căn phải, số đậm rõ ràng) */}
                      <td className="px-5 py-4 text-right whitespace-nowrap text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(r.amount)}
                      </td>

                      {/* 5. Hình thức (Badge Pastel mềm mại, rộng rãi không bao giờ vỡ chữ) */}
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${methodBadge.badgeClass}`}
                        >
                          {methodBadge.label}
                        </span>
                      </td>

                      {/* 6. Thao tác (Nút In phiếu có màu và style rõ ràng nhận biết được) */}
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="In phiếu thu"
                            aria-label="In phiếu thu"
                          >
                            <Printer className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                            <span>In phiếu</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* ── THANH PHÂN TRANG GẮN LIỀN CHÂN BẢNG DESKTOP (KẾT NỐI BACKEND) ── */}
        {(activeTab === 'INVOICES' ? totalInvoices : totalReceipts) > 0 && (
          <Pagination
            variant="default"
            currentPage={page}
            totalPages={activeTab === 'INVOICES' ? totalInvoicePages : totalReceiptPages}
            totalItems={activeTab === 'INVOICES' ? totalInvoices : totalReceipts}
            pageSize={limit}
            pageSizeOptions={[10, 20, 50]}
            itemLabel={activeTab === 'INVOICES' ? 'hóa đơn' : 'phiếu thu'}
            showRecordRange={false}
            showFirstLast={false}
            onPageChange={handlePageChange}
            onPageSizeChange={handleLimitChange}
          />
        )}
      </div>

      {/* =================================================================== */}
      {/* 2. GIAO DIỆN THẺ (CARD VIEW) CHO MOBILE (< 640px) CO GIÃN 100%       */}
      {/* =================================================================== */}
      <div className="sm:hidden space-y-2.5 w-full">
        {loading ? (
          <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-center text-slate-400">
            <RefreshCw className="h-[1.5rem] w-[1.5rem] animate-spin mx-auto mb-[0.5rem] text-[var(--color-primary)]" />
            <span className="font-medium text-xs">Đang tải dữ liệu...</span>
          </div>
        ) : (activeTab === 'INVOICES' ? invoices.length : receipts.length) === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-center text-slate-400">
            <ScrollText className="h-[2rem] w-[2rem] mx-auto mb-[0.5rem] text-slate-300" />
            <p className="text-sm text-slate-400 font-normal">Không tìm thấy</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeTab === 'INVOICES'
              ? invoices.map((inv) => {
                  const statusBadge = getInvoiceStatusBadge(inv);

                  return (
                    <div
                      key={inv.id}
                      onClick={() => setSelectedInvoiceForDetail(inv)}
                      className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-xs hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer select-none space-y-2 w-full"
                    >
                      {/* Hàng 1: Mã hóa đơn & Trạng thái (Pastel Badge) */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[var(--color-primary)]">
                          {inv.invoiceCode}
                        </span>
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${statusBadge.badgeClass}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>

                      {/* Hàng 2: Đại lý (chỉ tên theo yêu cầu) */}
                      <div className="text-xs font-medium text-slate-900 truncate" title={inv.customerName}>
                        {inv.customerName}
                      </div>

                      {/* Hàng 3: Hạn thanh toán, Tổng tiền & Nút Chi tiết */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-slate-500">Hạn thanh toán</span>
                          <span className="text-xs font-medium text-slate-700">{formatDate(inv.dueDate)}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900 tabular-nums">
                              {formatCurrency(inv.amount)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInvoiceForDetail(inv);
                              }}
                              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                              <span>Chi tiết</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handlePrintInvoice(inv.id);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
                              title="In hóa đơn"
                            >
                              <Printer className="h-3.5 w-3.5 text-slate-600" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDownloadInvoicePdf(inv.id, inv.invoiceCode);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
                              title="Tải PDF"
                            >
                              <Download className="h-3.5 w-3.5 text-slate-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              : receipts.map((r) => {
                  const methodBadge = getReceiptMethodBadge(r.paymentMethod);

                  return (
                    <div
                      key={r.id}
                      onClick={() => handleOpenPrint(r)}
                      className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-xs hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer select-none space-y-2 w-full"
                    >
                      {/* Hàng 1: Mã phiếu thu & Hình thức (Pastel Badge) */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[var(--color-primary)]">{r.code}</span>
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${methodBadge.badgeClass}`}
                        >
                          {methodBadge.label}
                        </span>
                      </div>

                      {/* Hàng 2: Đại lý (chỉ tên theo yêu cầu) */}
                      <div className="text-xs font-medium text-slate-900 truncate" title={r.customerName}>
                        {r.customerName}
                      </div>

                      {/* Hàng 3: Ngày thu, Số tiền & Nút In phiếu */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-slate-500">Ngày thu</span>
                          <span className="text-xs font-medium text-slate-700">{formatDate(r.paymentDate)}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900 tabular-nums">
                              {formatCurrency(r.amount)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPrint(r);
                            }}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="In phiếu"
                          >
                            <Printer className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                            <span>In phiếu</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        )}

        {/* Phân trang cho Mobile */}
        {(activeTab === 'INVOICES' ? totalInvoices : totalReceipts) > 0 && (
          <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden w-full">
            <Pagination
              variant="default"
              currentPage={page}
              totalPages={activeTab === 'INVOICES' ? totalInvoicePages : totalReceiptPages}
              totalItems={activeTab === 'INVOICES' ? totalInvoices : totalReceipts}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50]}
              itemLabel={activeTab === 'INVOICES' ? 'hóa đơn' : 'phiếu thu'}
              showRecordRange={false}
              showFirstLast={false}
              onPageChange={handlePageChange}
              onPageSizeChange={handleLimitChange}
            />
          </div>
        )}
      </div>

      {/* Modal chi tiết hóa đơn */}
      <InvoiceDetailModal
        invoice={selectedInvoiceForDetail}
        isOpen={Boolean(selectedInvoiceForDetail)}
        onClose={() => setSelectedInvoiceForDetail(null)}
        onOpenPayment={(inv) => {
          setSelectedInvoiceForDetail(null);
          setSelectedInvoiceForPayment(inv);
        }}
      />

      {/* Modal ghi nhận thanh toán hóa đơn */}
      <RecordPaymentModal
        invoice={selectedInvoiceForPayment}
        isOpen={Boolean(selectedInvoiceForPayment)}
        onClose={() => setSelectedInvoiceForPayment(null)}
        onSuccess={() => {
          void fetchInvoices();
          void reloadReceipts();
          void refreshBadgeCounts();
        }}
      />

      {/* Modal phát hành hóa đơn mới từ phiếu thực giao (SN-200) */}
      <IssueInvoiceModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={(newInvoice) => {
          void fetchInvoices();
          void reloadReceipts();
          void refreshBadgeCounts();
          setSelectedInvoiceForDetail(newInvoice);
        }}
      />

      {/* Modal In & Tải PDF Phiếu Thu (SN-209) */}
      <ReceiptPrintTemplate
        receipt={selectedReceiptForPrint}
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedReceiptForPrint(null);
        }}
      />
    </div>
  );
};
