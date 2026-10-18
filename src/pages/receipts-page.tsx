import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  ScrollText,
  RefreshCw,
  Printer,
  X,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { receiptsService } from '../services/receipts.service';
import { ReceiptPrintTemplate } from '../components/receipt-print-template';
import { RecordPaymentModal } from '../components/record-payment-modal';
import { Pagination } from '../components/pagination';
import type { Receipt as ReceiptType } from '../types/receipt';

// Dữ liệu mẫu Fallback khi mất kết nối Backend
const INITIAL_DEMO_RECEIPTS: ReceiptType[] = [
  {
    id: 'rcpt-001',
    code: 'PT2610-0001',
    customerId: 'cust-001',
    customerCode: 'DL-0001',
    customerName: 'Đại lý Sữa & Bánh kẹo Miền Bắc',
    amount: 25000000,
    amountInWords: 'Hai mươi lăm triệu đồng chẵn',
    paymentMethod: 'CASH',
    paymentDate: '2026-10-15T09:30:00+07:00',
    referenceCode: 'HD2609-001',
    notes: 'Thu tiền mặt đợt 1 cho hóa đơn bán buôn HD2609-001',
    status: 'CONFIRMED',
    collectorId: 'usr-acc-01',
    collectorName: 'Nguyễn Thị Mai',
    createdAt: '2026-10-15T09:30:00+07:00',
    updatedAt: '2026-10-15T09:30:00+07:00',
  },
  {
    id: 'rcpt-002',
    code: 'PT2610-0002',
    customerId: 'cust-002',
    customerCode: 'DL-0002',
    customerName: 'Đại lý Tạp hóa Hưng Yên',
    amount: 18000000,
    amountInWords: 'Mười tám triệu đồng chẵn',
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: '2026-10-14T14:15:00+07:00',
    referenceCode: 'HD2609-002',
    notes: 'Chuyển khoản thanh toán toàn bộ công nợ qua Vietcombank',
    status: 'CONFIRMED',
    collectorId: 'usr-acc-02',
    collectorName: 'Trần Văn Kế Toán',
    createdAt: '2026-10-14T14:15:00+07:00',
    updatedAt: '2026-10-14T14:15:00+07:00',
  },
  {
    id: 'rcpt-003',
    code: 'PT2610-0003',
    customerId: 'cust-008',
    customerCode: 'DL-0008',
    customerName: 'Đại Lý Tiêu Dùng Nhanh Thịnh Vượng',
    amount: 51300000,
    amountInWords: 'Năm mươi mốt triệu ba trăm nghìn đồng chẵn',
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: '2026-10-15T15:45:00+07:00',
    referenceCode: 'DH2610-10156',
    notes: 'Thu tiền thanh toán đơn hàng bán buôn DH2610-10156',
    status: 'CONFIRMED',
    collectorId: 'usr-acc-01',
    collectorName: 'Nguyễn Thị Mai',
    createdAt: '2026-10-15T15:45:00+07:00',
    updatedAt: '2026-10-15T15:45:00+07:00',
  },
];

// Định dạng tiền tệ VNĐ
const formatCurrency = (val?: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

// Định dạng ngày theo chuẩn dd/MM/yyyy
const formatDate = (dateVal?: Date | string): string => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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

export const ReceiptsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState<number>(() => {
    return Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  });
  const [limit, setLimit] = useState<number>(() => {
    return Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10);
  });
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    return searchParams.get('search') || '';
  });
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'BANK_TRANSFER'>(() => {
    const m = searchParams.get('method');
    return m === 'CASH' || m === 'BANK_TRANSFER' ? m : 'ALL';
  });

  // State Phiếu thu tiền
  const [receipts, setReceipts] = useState<ReceiptType[]>(INITIAL_DEMO_RECEIPTS);
  const [totalReceipts, setTotalReceipts] = useState<number>(INITIAL_DEMO_RECEIPTS.length);
  const [totalReceiptPages, setTotalReceiptPages] = useState<number>(1);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<ReceiptType | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cập nhật URL Parameters an toàn
  const updateUrlParams = useCallback(
    (newParams: {
      page?: number;
      limit?: number;
      search?: string;
      method?: string;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
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

          const nextMethod =
            newParams.method !== undefined ? newParams.method : methodFilter;
          if (nextMethod && nextMethod !== 'ALL') {
            next.set('method', nextMethod);
          } else {
            next.delete('method');
          }

          return next;
        },
        { replace: true }
      );
    },
    [page, limit, searchTerm, methodFilter, setSearchParams]
  );

  // Lắng nghe thay đổi query params trên URL
  useEffect(() => {
    const newPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const newLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10);
    const newSearch = searchParams.get('search') || '';
    const newMethod = (searchParams.get('method') as 'ALL' | 'CASH' | 'BANK_TRANSFER') || 'ALL';

    setPage(newPage);
    setLimit(newLimit);
    setSearchTerm(newSearch);
    setMethodFilter(newMethod);
  }, [searchParams]);

  // Tải danh sách Phiếu thu từ Backend
  const reloadReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receiptsService.getPaginatedReceipts({
        page,
        limit,
        search: searchTerm.trim() || undefined,
        paymentMethod: methodFilter !== 'ALL' ? methodFilter : undefined,
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
      if (methodFilter !== 'ALL') {
        demoList = demoList.filter((r) => r.paymentMethod === methodFilter);
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
  }, [page, limit, searchTerm, methodFilter]);

  useEffect(() => {
    void reloadReceipts();
  }, [reloadReceipts]);

  // Xử lý mở Modal xem trước & In phiếu thu
  const handleOpenPrint = (receipt: ReceiptType) => {
    setSelectedReceiptForPrint(receipt);
    setIsPrintModalOpen(true);
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
      {/* ── THANH BỘ LỌC TÌM KIẾM TINH GỌN ── */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã phiếu, tên đại lý..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
              updateUrlParams({ search: e.target.value, page: 1 });
            }}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 focus:border-[var(--color-primary)] focus:bg-white transition-all font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setPage(1);
                updateUrlParams({ search: '', page: 1 });
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Lọc hình thức thanh toán */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={methodFilter}
            onChange={(e) => {
              const val = e.target.value as 'ALL' | 'CASH' | 'BANK_TRANSFER';
              setMethodFilter(val);
              setPage(1);
              updateUrlParams({ method: val, page: 1 });
            }}
            className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 focus:border-[var(--color-primary)] cursor-pointer shadow-2xs transition-all"
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="CASH">Tiền mặt</option>
            <option value="BANK_TRANSFER">Chuyển khoản</option>
          </select>

          {/* Nút đặt lại bộ lọc */}
          {(searchTerm || methodFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setMethodFilter('ALL');
                setPage(1);
                updateUrlParams({ search: '', method: 'ALL', page: 1 });
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Đặt lại</span>
            </button>
          )}

          {/* Nút Ghi nhận thanh toán & Đối trừ công nợ (SN-202) */}
          <button
            type="button"
            onClick={() => setIsRecordPaymentOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer shrink-0 ml-auto sm:ml-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Ghi nhận thanh toán & Đối trừ</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. BẢNG DỮ LIỆU DESKTOP (>= 640px)                                  */}
      {/* =================================================================== */}
      <div className="hidden sm:block rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden w-full">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[28%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
          </colgroup>

          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="px-5 py-3.5 text-left">MÃ PHIẾU THU</th>
              <th className="px-5 py-3.5 text-left">ĐẠI LÝ</th>
              <th className="px-5 py-3.5 text-center">NGÀY THU</th>
              <th className="px-5 py-3.5 text-right">SỐ TIỀN</th>
              <th className="px-3 py-3.5 text-center">HÌNH THỨC</th>
              <th className="px-3 py-3.5 text-center">THAO TÁC</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white text-xs">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
                  <span className="font-medium">Đang tải danh sách phiếu thu...</span>
                </td>
              </tr>
            ) : receipts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  <ScrollText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-normal">Không tìm thấy phiếu thu nào phù hợp</p>
                </td>
              </tr>
            ) : (
              receipts.map((r) => {
                const methodBadge = getReceiptMethodBadge(r.paymentMethod);

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => handleOpenPrint(r)}
                  >
                    {/* 1. Mã phiếu thu (Tím đậm nổi bật, font-mono) */}
                    <td className="px-5 py-4 text-left whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPrint(r);
                        }}
                        className="text-xs font-bold text-[var(--color-primary)] font-mono hover:underline cursor-pointer text-left block"
                      >
                        {r.code}
                      </button>
                    </td>

                    {/* 2. Đại lý */}
                    <td className="px-5 py-4 text-left whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-900 truncate block max-w-full" title={r.customerName}>
                        {r.customerName}
                      </span>
                    </td>

                    {/* 3. Ngày thu */}
                    <td className="px-5 py-4 text-center whitespace-nowrap text-sm font-medium text-slate-600">
                      {formatDate(r.paymentDate)}
                    </td>

                    {/* 4. Số tiền */}
                    <td className="px-5 py-4 text-right whitespace-nowrap text-sm font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(r.amount)}
                    </td>

                    {/* 5. Hình thức */}
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${methodBadge.badgeClass}`}
                      >
                        {methodBadge.label}
                      </span>
                    </td>

                    {/* 6. Thao tác */}
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPrint(r);
                          }}
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

        {/* Thanh phân trang */}
        {totalReceipts > 0 && (
          <Pagination
            variant="default"
            currentPage={page}
            totalPages={totalReceiptPages}
            totalItems={totalReceipts}
            pageSize={limit}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="phiếu thu"
            showRecordRange={false}
            showFirstLast={false}
            onPageChange={(newPage) => {
              setPage(newPage);
              updateUrlParams({ page: newPage });
            }}
            onPageSizeChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
              updateUrlParams({ limit: newLimit, page: 1 });
            }}
          />
        )}
      </div>

      {/* =================================================================== */}
      {/* 2. GIAO DIỆN THẺ (CARD VIEW) CHO MOBILE (< 640px)                  */}
      {/* =================================================================== */}
      <div className="sm:hidden space-y-2.5 w-full">
        {loading ? (
          <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-center text-slate-400">
            <RefreshCw className="h-[1.5rem] w-[1.5rem] animate-spin mx-auto mb-[0.5rem] text-[var(--color-primary)]" />
            <span className="font-medium text-xs">Đang tải dữ liệu...</span>
          </div>
        ) : receipts.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-center text-slate-400">
            <ScrollText className="h-[2rem] w-[2rem] mx-auto mb-[0.5rem] text-slate-300" />
            <p className="text-sm text-slate-400 font-normal">Không tìm thấy</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {receipts.map((r) => {
              const methodBadge = getReceiptMethodBadge(r.paymentMethod);

              return (
                <div
                  key={r.id}
                  onClick={() => handleOpenPrint(r)}
                  className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-xs hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer select-none space-y-2 w-full"
                >
                  {/* Hàng 1: Mã phiếu thu & Hình thức */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--color-primary)]">{r.code}</span>
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${methodBadge.badgeClass}`}
                    >
                      {methodBadge.label}
                    </span>
                  </div>

                  {/* Hàng 2: Đại lý */}
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

        {/* Phân trang Mobile */}
        {totalReceipts > 0 && (
          <div className="pt-2">
            <Pagination
              variant="default"
              currentPage={page}
              totalPages={totalReceiptPages}
              totalItems={totalReceipts}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50]}
              itemLabel="phiếu thu"
              showRecordRange={false}
              showFirstLast={false}
              onPageChange={(newPage) => {
                setPage(newPage);
                updateUrlParams({ page: newPage });
              }}
              onPageSizeChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
                updateUrlParams({ limit: newLimit, page: 1 });
              }}
            />
          </div>
        )}
      </div>

      {/* Modal In & Tải PDF Phiếu Thu (SN-209) */}
      <ReceiptPrintTemplate
        receipt={selectedReceiptForPrint}
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedReceiptForPrint(null);
        }}
      />

      {/* Modal Ghi nhận thanh toán & Đối trừ công nợ (SN-202) */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSuccess={() => {
          void reloadReceipts();
        }}
      />
    </div>
  );
};
export default ReceiptsPage;
