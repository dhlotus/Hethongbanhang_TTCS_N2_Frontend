import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  Filter,
  RefreshCw,
  Receipt,
  FileSpreadsheet,
  Calendar,
  Printer,
  Download,
  CreditCard,
  Banknote,
} from 'lucide-react';
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

/**
 * Trang Quản lý Hóa đơn, Công nợ & Phiếu thu tiền (SN-209 / Sprint 7)
 */
export const InvoicesPage: React.FC = () => {
  const location = useLocation();

  // Xác định tab mặc định dựa trên URL (/accounting/payments -> RECEIPTS, /accounting/invoices -> INVOICES)
  const isPaymentsRoute = location.pathname.includes('/payments');
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'RECEIPTS'>(
    isPaymentsRoute ? 'RECEIPTS' : 'INVOICES',
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Dữ liệu phiếu thu tiền (SN-209)
  const [receipts, setReceipts] = useState<ReceiptType[]>(INITIAL_DEMO_RECEIPTS);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<ReceiptType | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const reloadReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await receiptsService.getReceipts({ search: searchTerm.trim() || undefined });
      setReceipts(data.length > 0 ? data : INITIAL_DEMO_RECEIPTS);
    } catch {
      setReceipts(INITIAL_DEMO_RECEIPTS);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    let isCurrent = true;
    if (activeTab === 'RECEIPTS') {
      receiptsService
        .getReceipts({ search: searchTerm.trim() || undefined })
        .then((data) => {
          if (isCurrent && data && data.length > 0) {
            setReceipts(data);
          }
        })
        .catch(() => {
          // Giữ demo receipts mặc định
        });
    }
    return () => {
      isCurrent = false;
    };
  }, [activeTab, searchTerm]);

  const handleRefresh = () => {
    if (activeTab === 'RECEIPTS') {
      void reloadReceipts();
    } else {
      setLoading(true);
      setTimeout(() => setLoading(false), 400);
    }
  };

  const handleOpenPrint = (receipt: ReceiptType) => {
    setSelectedReceiptForPrint(receipt);
    setIsPrintModalOpen(true);
  };

  const handleDirectDownloadPdf = async (receipt: ReceiptType) => {
    try {
      showToast('info', `Đang tải file PDF phiếu thu ${receipt.code}...`);
      await receiptsService.downloadReceiptPdf(receipt.id || receipt.code, `phieu-thu-${receipt.code}.pdf`);
      showToast('success', `Đã tải xuống thành công: phieu-thu-${receipt.code}.pdf`);
    } catch {
      // Mở modal in để dùng cơ chế in sang PDF của trình duyệt
      handleOpenPrint(receipt);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang & Nút chức năng */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quản Lý Hóa Đơn & Thu Chi Công Nợ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi hóa đơn bán hàng, phiếu thu tiền đối trừ công nợ đại lý và in chứng từ tại chỗ
          </p>
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

      {/* Tabs chuyển đổi giữa Hóa đơn và Phiếu thu (SN-209) */}
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
          Hóa đơn bán hàng
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
          <span>Phiếu thu tiền & Đối trừ (SN-209)</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-current">
            {receipts.length}
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

        {/* Lọc trạng thái */}
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
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="PENDING">Chờ đối soát</option>
          </select>
        </div>

        {/* Lọc thời gian */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
            <Calendar className="h-3.5 w-3.5" />
            <span>Kỳ hạn:</span>
          </div>
          <select
            defaultValue="ALL_TIME"
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
          >
            <option value="ALL_TIME">Toàn bộ thời gian</option>
            <option value="THIS_MONTH">Tháng này</option>
            <option value="LAST_MONTH">Tháng trước</option>
            <option value="THIS_QUARTER">Quý này</option>
          </select>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* NỘI DUNG TAB: PHIẾU THU TIỀN (SN-209)                                  */}
      {/* ===================================================================== */}
      {activeTab === 'RECEIPTS' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-sm font-medium">Đang tải danh sách phiếu thu...</p>
            </div>
          ) : receipts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Receipt className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">Không tìm thấy phiếu thu phù hợp</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[360px]">
              <table className="w-full text-sm divide-y divide-slate-100">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left w-[16%]">Mã phiếu thu</th>
                    <th className="px-4 py-3 text-left w-[34%]">Đại lý</th>
                    <th className="px-4 py-3 text-right w-[16%]">Số tiền</th>
                    <th className="px-4 py-3 text-center w-[12%]">Hình thức</th>
                    <th className="px-4 py-3 text-left w-[12%]">Người thu</th>
                    <th className="px-4 py-3 text-right w-[10%] min-w-[170px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y divide-slate-100/90 transition-opacity duration-150 ${
                    loading ? 'opacity-60 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-indigo-50/25 transition-colors group">
                      {/* 1. Mã phiếu thu duy nhất: Interactive monospace button badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenPrint(r)}
                          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/60 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs group-hover:border-indigo-300"
                          title={`Xem & In phiếu thu ${r.code}`}
                        >
                          <Receipt className="w-3 h-3 text-indigo-500 group-hover:text-indigo-700 transition-colors" />
                          <span>{r.code}</span>
                        </button>
                      </td>

                      {/* 2. Thông tin đại lý: Tên đại lý + Mã & SĐT */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800 text-sm line-clamp-1" title={r.customerName}>
                          {r.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2 whitespace-nowrap">
                          <span className="font-semibold text-slate-600">{r.customerCode}</span>
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

                      {/* 5. Người thu: Tên người thu gọn gàng */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 text-xs">
                          {r.collectorName}
                        </span>
                      </td>

                      {/* 6. Thao tác in / PDF */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(r)}
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="Mở xem & In phiếu thu"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                            <span>In phiếu</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDirectDownloadPdf(r)}
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                            title="Tải trực tiếp file PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Tải PDF</span>
                          </button>
                        </div>
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
        /* NỘI DUNG TAB: HÓA ĐƠN BÁN HÀNG                                      */
        /* =================================================================== */
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
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
              <tbody>
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                        <Receipt className="h-6 w-6 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Chưa có hóa đơn nào
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Hiện tại hệ thống chưa ghi nhận hóa đơn bán hàng nào phù hợp với điều kiện lọc.
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

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
