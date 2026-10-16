import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  Filter,
  RefreshCw,
  Receipt,
  FileSpreadsheet,
  Printer,
  CreditCard,
  Banknote,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';
import type { InvoiceItem } from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { InvoiceDetailModal } from '../components/invoice-detail-modal';
import { RecordPaymentModal } from '../components/record-payment-modal';
import { receiptsService } from '../services/receipts.service';
import { ReceiptPrintTemplate } from '../components/receipt-print-template';
import { showToast } from '../components/toast';
import type { Receipt as ReceiptType, PaymentMethod } from '../types/receipt';

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

const getPaymentMethodBadge = (method?: PaymentMethod | string) => {
  switch (method) {
    case 'CASH':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tiền mặt</span>
        </span>
      );
    case 'BANK_TRANSFER':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
          <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
          <span>Chuyển khoản</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200/60">
          <span>{method || 'Khác'}</span>
        </span>
      );
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

export const InvoicesPage: React.FC = () => {
  const location = useLocation();

  // Tab chuyển đổi
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (location.pathname.includes('payments')) {
      return 'RECEIPTS';
    }
    return 'RECEIPTS';
  });

  // State Hóa đơn bán hàng
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<InvoiceItem | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceItem | null>(null);

  // State Phiếu thu tiền
  const [receipts, setReceipts] = useState<ReceiptType[]>(INITIAL_DEMO_RECEIPTS);
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'BANK_TRANSFER'>('ALL');
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<ReceiptType | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // State chung
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Load danh sách hóa đơn từ API
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoicesService.getInvoices();
      setInvoices(data);
    } catch {
      showToast('error', 'Lỗi tải dữ liệu hóa đơn');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load danh sách phiếu thu từ API
  const reloadReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await receiptsService.getReceipts();
      if (Array.isArray(data) && data.length > 0) {
        setReceipts(data);
      } else {
        setReceipts(INITIAL_DEMO_RECEIPTS);
      }
    } catch {
      setReceipts(INITIAL_DEMO_RECEIPTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const [invData, recData] = await Promise.allSettled([
          invoicesService.getInvoices(),
          receiptsService.getReceipts(),
        ]);
        if (!active) return;
        if (invData.status === 'fulfilled') {
          setInvoices(invData.value);
        }
        if (recData.status === 'fulfilled' && Array.isArray(recData.value) && recData.value.length > 0) {
          setReceipts(recData.value);
        }
      } catch {
        // demo fallback
      }
    };
    void loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  // Bộ lọc Hóa đơn
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

  // Bộ lọc Phiếu thu
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCode = r.code?.toLowerCase().includes(q);
        const matchCust = r.customerName?.toLowerCase().includes(q);
        const matchCustCode = r.customerCode?.toLowerCase().includes(q);
        const matchCollector = r.collectorName?.toLowerCase().includes(q);
        if (!matchCode && !matchCust && !matchCustCode && !matchCollector) {
          return false;
        }
      }

      if (methodFilter !== 'ALL' && r.paymentMethod !== methodFilter) {
        return false;
      }

      return true;
    });
  }, [receipts, searchTerm, methodFilter]);

  const handleRefresh = () => {
    if (activeTab === 'RECEIPTS') {
      void reloadReceipts();
    } else {
      void fetchInvoices();
    }
  };

  const handleDownloadInvoicePdf = async (inv: InvoiceItem) => {
    try {
      showToast('info', `Đang xuất bản in hóa đơn ${inv.invoiceCode}...`);
      await invoicesService.downloadInvoicePdf(inv.id, inv.invoiceCode);
      showToast('success', 'Đã mở bản in hóa đơn thành công');
    } catch {
      showToast('error', 'Không thể tải hóa đơn');
    }
  };

  const handleOpenPrint = (receipt: ReceiptType) => {
    setSelectedReceiptForPrint(receipt);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang & Nút chức năng */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quản Lý Hóa Đơn & Thu Chi Công Nợ
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 h-[36px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-[36px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Tabs chuyển đổi giữa Hóa đơn và Phiếu thu */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('INVOICES')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'INVOICES'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          Hóa đơn bán hàng ({invoices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('RECEIPTS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'RECEIPTS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Phiếu thu tiền & Đối trừ</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-current">
            {filteredReceipts.length}
          </span>
        </button>
      </div>

      {/* Thanh bộ lọc (Filter Toolbar) */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Tìm kiếm */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'RECEIPTS'
                ? 'Tìm theo mã phiếu thu, tên đại lý, mã đại lý, người thu tiền...'
                : 'Tìm theo số hóa đơn, tên đại lý hoặc mã khách hàng...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50"
          />
        </div>

        {/* Lọc phù hợp với từng tab */}
        {activeTab === 'RECEIPTS' ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
              <Filter className="h-3.5 w-3.5" />
              <span>Hình thức:</span>
            </div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as 'ALL' | 'CASH' | 'BANK_TRANSFER')}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              <option value="ALL">Tất cả hình thức</option>
              <option value="CASH">Tiền mặt</option>
              <option value="BANK_TRANSFER">Chuyển khoản</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
              <Filter className="h-3.5 w-3.5" />
              <span>Trạng thái:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái ({invoices.length})</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PARTIAL">Thanh toán một phần</option>
              <option value="OVERDUE">Quá hạn nợ</option>
              <option value="PAID">Đã thanh toán đủ</option>
            </select>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* NỘI DUNG CHÍNH DỰA THEO TAB                                         */}
      {/* =================================================================== */}
      {activeTab === 'RECEIPTS' ? (
        /* =================================================================== */
        /* TAB: PHIẾU THU TIỀN                                                 */
        /* =================================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Đang tải danh sách phiếu thu...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                  <Receipt className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  Không tìm thấy phiếu thu nào
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Không có phiếu thu nào phù hợp với bộ lọc tìm kiếm.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[360px]">
              <table className="w-full text-sm divide-y divide-slate-100">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left w-[15%]">Mã phiếu thu</th>
                    <th className="px-4 py-3 text-left w-[35%]">Đại lý</th>
                    <th className="px-4 py-3 text-right w-[15%]">Số tiền</th>
                    <th className="px-4 py-3 text-center w-[12%]">Hình thức</th>
                    <th className="px-4 py-3 text-left w-[13%]">Người thu</th>
                    <th className="px-4 py-3 text-right w-[10%] min-w-[105px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y divide-slate-100/90 transition-opacity duration-150 ${
                    loading ? 'opacity-60 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  {filteredReceipts.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-indigo-50/25 transition-colors group"
                    >
                      {/* 1. Mã duy nhất: Interactive monospace button badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenPrint(r)}
                          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/60 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs group-hover:border-indigo-300"
                          title={`Xem & in phiếu thu ${r.code}`}
                        >
                          <Receipt className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-700 transition-colors" />
                          <span>{r.code}</span>
                        </button>
                      </td>

                      {/* 2. Thông tin đại lý: Tên đại lý + Mã & SĐT */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPrint(r)}
                          className="text-left font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-1 text-sm cursor-pointer block max-w-full"
                          title={r.customerName}
                        >
                          {r.customerName}
                        </button>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                          <span>{r.customerCode}</span>
                          {r.customerPhone && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span>{r.customerPhone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 3. Số tiền: Tabular nums rõ ràng, căn phải */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className="font-bold tabular-nums text-sm text-emerald-700">
                          {formatCurrency(r.amount)}
                        </span>
                      </td>

                      {/* 4. Hình thức thu: Pill badge bo tròn */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {getPaymentMethodBadge(r.paymentMethod)}
                      </td>

                      {/* 5. Người thu: Tên người thu kèm icon tinh tế */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{r.collectorName || '—'}</span>
                        </div>
                      </td>

                      {/* 6. Thao tác: Nút In phiếu */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenPrint(r)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors cursor-pointer shadow-2xs hover:border-indigo-300"
                          title="In phiếu thu"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          <span>In phiếu</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* =================================================================== */
        /* TAB: HÓA ĐƠN BÁN HÀNG                                               */
        /* =================================================================== */
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
                              onClick={() => handleDownloadInvoicePdf(inv)}
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
      )}

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
