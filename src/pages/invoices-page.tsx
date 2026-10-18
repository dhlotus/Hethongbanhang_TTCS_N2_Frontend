import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  ScrollText,
  RefreshCw,
  Eye,
  Plus,
  X,
  RotateCcw,
} from 'lucide-react';
import type { InvoiceItem } from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { Pagination } from '../components/pagination';
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
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

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
    label: 'Thanh toán một phần',
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

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const s = searchParams.get('status') || 'ALL';
    return s === 'PARTIAL' ? 'PARTIALLY_PAID' : s;
  });

  // State Hóa đơn bán hàng
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [totalInvoices, setTotalInvoices] = useState<number>(0);
  const [totalInvoicePages, setTotalInvoicePages] = useState<number>(1);


  // Loading state
  const [loading, setLoading] = useState(false);

  // Hàm cập nhật URL Search Parameters an toàn
  const updateUrlParams = useCallback(
    (newParams: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
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
    [page, limit, searchTerm, statusFilter, setSearchParams]
  );

  // Lắng nghe thay đổi query params trên URL (hỗ trợ nút Back / Forward trình duyệt)
  useEffect(() => {
    const newPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const newLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10);
    const newSearch = searchParams.get('search') || '';
    const rawStatus = searchParams.get('status') || 'ALL';
    const newStatus = rawStatus === 'PARTIAL' ? 'PARTIALLY_PAID' : rawStatus;

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

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

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

  return (
    <div className="space-y-4 w-full">
      {/* ── THANH BỘ LỌC TÌM KIẾM & NÚT PHÁT HÀNH HÓA ĐƠN ── */}
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

        {/* Lọc trạng thái hóa đơn & Nút phát hành hóa đơn */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 focus:border-[var(--color-primary)] cursor-pointer shadow-2xs transition-all"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIALLY_PAID">Thanh toán một phần</option>
            <option value="OVERDUE">Quá hạn</option>
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

          <button
            type="button"
            onClick={() => navigate('/accounting/invoices/create')}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
            title="Phát hành hóa đơn bán hàng từ phiếu thực giao"
          >
            <Plus className="h-4 w-4" />
            <span>Phát hành hóa đơn</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. BẢNG DỮ LIỆU DESKTOP (>= 640px) - ĐỒNG BỘ 100% STYLE AUDIT LOG   */}
      {/* =================================================================== */}
      <div className="hidden sm:block rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden w-full">
        {/* ── BẢNG HÓA ĐƠN BÁN HÀNG (6 CỘT) ── */}
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[28%]" />
            <col className="w-[15%]" />
            <col className="w-[18%]" />
            <col className="w-[13%]" />
            <col className="w-[10%]" />
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
                        onClick={() => navigate(`/accounting/invoices/${inv.id}`)}
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

                    {/* 6. Thao tác: Chỉ để nút Chi tiết ở ngoài (In và PDF có sẵn trong trang Chi tiết) */}
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => navigate(`/accounting/invoices/${inv.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                          title="Xem chi tiết hóa đơn"
                          aria-label="Xem chi tiết"
                        >
                          <Eye className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0" />
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── THANH PHÂN TRANG GẮN LIỀN CHÂN BẢNG DESKTOP (KẾT NỐI BACKEND) ── */}
        {totalInvoices > 0 && (
          <Pagination
            variant="default"
            currentPage={page}
            totalPages={totalInvoicePages}
            totalItems={totalInvoices}
            pageSize={limit}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="hóa đơn"
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
        ) : invoices.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-center text-slate-400">
            <ScrollText className="h-[2rem] w-[2rem] mx-auto mb-[0.5rem] text-slate-300" />
            <p className="text-sm text-slate-400 font-normal">Không tìm thấy</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {invoices.map((inv) => {
              const statusBadge = getInvoiceStatusBadge(inv);

              return (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/accounting/invoices/${inv.id}`)}
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

                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/accounting/invoices/${inv.id}`);
                          }}
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Phân trang cho Mobile */}
        {totalInvoices > 0 && (
          <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden w-full">
            <Pagination
              variant="default"
              currentPage={page}
              totalPages={totalInvoicePages}
              totalItems={totalInvoices}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50]}
              itemLabel="hóa đơn"
              showRecordRange={false}
              showFirstLast={false}
              onPageChange={handlePageChange}
              onPageSizeChange={handleLimitChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};
