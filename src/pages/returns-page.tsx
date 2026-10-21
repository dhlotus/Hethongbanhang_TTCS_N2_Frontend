import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Eye,
  Warehouse,
  FileText,
  AlertTriangle,
  X,
  FileCheck,
  ChevronDown,
} from 'lucide-react';
import {
  returnsService,
  type ReturnReceipt,
} from '../services/returns.service';
import { warehouseService } from '../services/warehouse.service';
import type { Warehouse as SystemWarehouse } from '../types/warehouse.types';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';
import { USER_ROLES } from '../types/auth';
import { Pagination } from '../components/pagination';

const formatVND = (amount?: number) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 đ';
  return `${amount.toLocaleString('vi-VN')} đ`;
};

const formatDate = (dateStr?: string | Date | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
};

const STATUS_CONFIG: Record<
  ReturnReceipt['status'],
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: 'Chờ duyệt kho',
    bg: 'bg-amber-50 border-amber-200/80',
    text: 'text-amber-700',
    icon: Clock,
  },
  APPROVED: {
    label: 'Đã nhập kho',
    bg: 'bg-emerald-50 border-emerald-200/80',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Đã từ chối',
    bg: 'bg-rose-50 border-rose-200/80',
    text: 'text-rose-700',
    icon: XCircle,
  },
};

export const ReturnsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const user = getStoredUser();
  const rawRoles = user?.roles && user.roles.length > 0 ? user.roles : (user?.role ? [user.role] : []);
  const isAdmin = rawRoles.includes(USER_ROLES.ADMIN);
  const isSalesManager = rawRoles.includes(USER_ROLES.SALES_MANAGER);
  const isWarehouseManager =
    rawRoles.includes(USER_ROLES.WAREHOUSE_MANAGER) || rawRoles.includes('WH_MANAGER');
  const isWarehouseKeeper =
    rawRoles.includes(USER_ROLES.WAREHOUSE_KEEPER) || rawRoles.includes('WAREHOUSE');

  const isAccountant =
    rawRoles.includes(USER_ROLES.ACCOUNTANT) ||
    rawRoles.includes('ACCOUNTANT') ||
    rawRoles.includes('ACCOUNTANT_DEBT') ||
    rawRoles.includes('KETOAN') ||
    Boolean(user?.fullName && user.fullName.toLowerCase().includes('kế toán'));

  const canCreate = !isAccountant && (isAdmin || isSalesManager || rawRoles.includes(USER_ROLES.SALES_REP) || rawRoles.includes(USER_ROLES.CUSTOMER));
  const canApprove = isAdmin || isWarehouseManager || isWarehouseKeeper || isSalesManager;

  // Lấy giá trị ban đầu từ URL query parameters
  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';
  const initialStatus = searchParams.get('status') || 'ALL';
  const initialWarehouse = searchParams.get('warehouse') || 'ALL';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const initialLimit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10);

  const [receipts, setReceipts] = useState<ReturnReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [warehouseFilter, setWarehouseFilter] = useState<string>(initialWarehouse);
  const [warehouses, setWarehouses] = useState<SystemWarehouse[]>([]);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialLimit);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Thống kê toàn tập
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalPending: 0,
    totalApproved: 0,
    totalRefundAmount: 0,
  });

  // Modal xem chi tiết / phê duyệt
  const [detailReceipt, setDetailReceipt] = useState<ReturnReceipt | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Load danh mục kho
  useEffect(() => {
    warehouseService
      .getWarehouses()
      .then((res) => {
        const list: SystemWarehouse[] = Array.isArray(res) ? res : res?.data || [];
        setWarehouses(list.filter((w) => w.status !== 'INACTIVE'));
      })
      .catch(() => {});
  }, []);

  // Debounce tìm kiếm từ khóa
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== searchTerm) {
        setSearchTerm(searchInput);
        setCurrentPage(1);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput, searchTerm]);

  // Đồng bộ trạng thái bộ lọc vào URL search parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    }
    if (statusFilter !== 'ALL') {
      params.set('status', statusFilter);
    }
    if (warehouseFilter !== 'ALL') {
      params.set('warehouse', warehouseFilter);
    }
    if (currentPage > 1) {
      params.set('page', String(currentPage));
    }
    if (pageSize !== 10) {
      params.set('limit', String(pageSize));
    }

    const currentQuery = searchParams.toString();
    const newQuery = params.toString();
    if (currentQuery !== newQuery) {
      setSearchParams(params, { replace: true });
    }
  }, [searchTerm, statusFilter, warehouseFilter, currentPage, pageSize, searchParams, setSearchParams]);

  // Tải dữ liệu từ backend có phân trang & tìm kiếm
  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await returnsService.getReturnReceipts({
        search: searchTerm.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined,
        page: currentPage,
        limit: pageSize,
      });

      if (Array.isArray(res)) {
        setReceipts(res);
        setTotalItems(res.length);
        setTotalPages(Math.max(1, Math.ceil(res.length / pageSize)));
        setStats({
          totalReceipts: res.length,
          totalPending: res.filter((r) => r.status === 'PENDING').length,
          totalApproved: res.filter((r) => r.status === 'APPROVED').length,
          totalRefundAmount: res
            .filter((r) => r.status === 'APPROVED')
            .reduce((sum, r) => sum + Number(r.totalRefundAmount || 0), 0),
        });
      } else if (res && typeof res === 'object') {
        setReceipts(res.data || []);
        setTotalItems(res.total || 0);
        setTotalPages(res.totalPages || 1);
        if (res.summary) {
          setStats({
            totalReceipts: res.summary.totalReceipts ?? res.total ?? 0,
            totalPending: res.summary.totalPending ?? 0,
            totalApproved: res.summary.totalApproved ?? 0,
            totalRefundAmount: res.summary.totalRefundAmount ?? 0,
          });
        }
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Không thể tải danh sách phiếu trả hàng');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, warehouseFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Xử lý duyệt hoặc từ chối phiếu trả hàng
  const handleApproveAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!detailReceipt) return;

    if (action === 'REJECT' && !approvalNote.trim()) {
      showToast('error', 'Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setIsSubmittingApproval(true);
      const res = await returnsService.approveReturnReceipt(detailReceipt.id, {
        action,
        note: approvalNote.trim() || (action === 'APPROVE' ? 'Đã kiểm hàng, khớp số lượng' : 'Từ chối'),
      });

      if (action === 'APPROVE') {
        showToast(
          'success',
          `Duyệt nhập kho thành công cho phiếu ${res.code}! Đã cộng tồn và giảm trừ ${formatVND(res.totalRefundAmount)} công nợ.`,
        );
      } else {
        showToast('info', `Đã từ chối phiếu trả hàng ${res.code}`);
      }

      setDetailReceipt(null);
      setApprovalNote('');
      fetchReceipts();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi xử lý duyệt phiếu trả hàng');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Thẻ thống kê */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Tổng số phiếu
          </span>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.totalReceipts}
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
            Chờ duyệt kho
          </span>
          <div className="text-lg sm:text-2xl font-bold text-amber-700 tabular-nums mt-1">
            {stats.totalPending}
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Đã nhập kho
          </span>
          <div className="text-lg sm:text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {stats.totalApproved}
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
            Tổng tiền hoàn
          </span>
          <div className="text-lg sm:text-2xl font-bold text-indigo-700 tabular-nums truncate mt-1" title={formatVND(stats.totalRefundAmount)}>
            {formatVND(stats.totalRefundAmount)}
          </div>
        </div>
      </div>

      {/* Thanh bộ lọc: Ô tìm kiếm + Select Kho + Select Trạng thái + Nút Lập phiếu */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã phiếu, hóa đơn, tên đại lý, lý do..."
              className="w-full pl-10 pr-9 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/60 hover:bg-white focus:bg-white transition-all placeholder-slate-400"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Nhóm các hộp chọn lọc (Kho + Trạng thái) & Nút Lập phiếu */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
            {/* Lọc trạng thái (Select) */}
            <div className="relative min-w-[150px]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 pl-3 pr-8 text-xs font-medium bg-slate-50/80 hover:bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ duyệt kho</option>
                <option value="APPROVED">Đã nhập kho</option>
                <option value="REJECTED">Đã từ chối</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Lọc kho tiếp nhận */}
            <div className="relative min-w-[160px]">
              <select
                value={warehouseFilter}
                onChange={(e) => {
                  setWarehouseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 pl-3 pr-8 text-xs font-medium bg-slate-50/80 hover:bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
              >
                <option value="ALL">Tất cả kho tiếp nhận</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Nút Lập phiếu trả hàng */}
            {canCreate && (
              <Link
                to="/accounting/returns/create"
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Lập phiếu trả hàng</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Bảng danh sách phiếu trả hàng (Đồng bộ style với Orders / Invoices) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã phiếu</th>
                <th className="py-3 px-4">Hóa đơn gốc</th>
                <th className="py-3 px-4">Đại lý</th>
                <th className="py-3 px-4">Kho tiếp nhận</th>
                <th className="py-3 px-4 text-right">Tổng tiền hoàn</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy phiếu trả hàng nào phù hợp
                  </td>
                </tr>
              ) : (
                receipts.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusConf.icon;

                  return (
                    <tr key={item.id} className="hover:bg-indigo-50/20 transition-colors">
                      {/* Mã phiếu */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-md text-xs border border-indigo-200/60">
                          {item.code}
                        </span>
                      </td>

                      {/* Hóa đơn gốc */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 text-xs">
                        {item.originalInvoiceId || item.originalInvoiceCode || '—'}
                      </td>

                      {/* Đại lý */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 text-xs truncate max-w-[200px]" title={item.agencyName}>
                          {item.agencyName || 'Đại lý'}
                        </div>
                        {item.agencyCode && (
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {item.agencyCode}
                          </div>
                        )}
                      </td>

                      {/* Kho tiếp nhận */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{item.warehouseName || item.warehouseCode || 'Kho Miền Nam'}</span>
                        </span>
                      </td>

                      {/* Tổng tiền hoàn lại */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm tabular-nums">
                        {formatVND(item.totalRefundAmount)}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConf.bg} ${statusConf.text}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusConf.label}</span>
                          </span>
                          {item.status === 'APPROVED' && (
                            item.debtAdjustmentCode ? (
                              <Link
                                to="/accounting/debt-adjustments"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                title={`Chứng từ: ${item.debtAdjustmentCode}`}
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Đã hạch toán</span>
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-amber-50 border-amber-200 text-amber-700">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Chờ hạch toán</span>
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setDetailReceipt(item);
                            setApprovalNote('');
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Xem chi tiết phiếu trả hàng"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="border-t border-slate-200/80">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            showRecordRange={true}
            size="sm"
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* ================= MODAL CHI TIẾT & DUYỆT NHẬP KHO ================= */}
      {detailReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Phiếu {detailReceipt.code}</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        STATUS_CONFIG[detailReceipt.status]?.bg
                      } ${STATUS_CONFIG[detailReceipt.status]?.text}`}
                    >
                      {STATUS_CONFIG[detailReceipt.status]?.label}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hóa đơn gốc: {detailReceipt.originalInvoiceId || detailReceipt.originalInvoiceCode} • Đại lý: {detailReceipt.agencyName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailReceipt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Thông tin chung */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Hóa đơn gốc:</span>
                  <strong className="text-slate-900 font-mono">
                    {detailReceipt.originalInvoiceId || detailReceipt.originalInvoiceCode}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Kho nhận:</span>
                  <strong className="text-slate-900">
                    {detailReceipt.warehouseName || detailReceipt.warehouseCode || 'Kho Miền Nam'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Người lập:</span>
                  <strong className="text-slate-900">{detailReceipt.createdByName || 'NVKD'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Ngày lập:</span>
                  <strong className="text-slate-900">{formatDate(detailReceipt.createdAt)}</strong>
                </div>
              </div>

              {/* Lý do trả hàng */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                <span className="font-bold">Lý do trả hàng: </span>
                {detailReceipt.reason}
              </div>

              {/* Bảng chi tiết sản phẩm */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Chi tiết sản phẩm trả</span>
                  <span className="text-indigo-600 font-mono font-bold">
                    Tổng hoàn: {formatVND(detailReceipt.totalRefundAmount)}
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Sản phẩm</th>
                        <th className="py-2.5 px-2 text-center">ĐVT</th>
                        <th className="py-2.5 px-3 text-center">Số lượng</th>
                        <th className="py-2.5 px-3 text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                        <th className="py-2.5 px-3 text-center">Tình trạng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detailReceipt.items || []).map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{it.productName}</div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {it.productSku} {it.batchNumber ? `• Lô: ${it.batchNumber}` : ''}
                            </div>
                            {it.subReason && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5">{it.subReason}</div>
                            )}
                          </td>

                          <td className="py-2.5 px-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {it.unit || 'Lon'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                            {it.quantity}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatVND(it.unitPrice)}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatVND(it.lineTotal || it.quantity * it.unitPrice)}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {it.conditionType === 'GOOD' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Hàng tốt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3" />
                                Hàng lỗi
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Thông tin duyệt nếu đã duyệt */}
              {detailReceipt.status === 'APPROVED' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 space-y-1.5 text-xs text-emerald-900">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Đã hoàn tất nhập kho & giảm trừ công nợ
                    </div>
                    {detailReceipt.debtAdjustmentCode ? (
                      <Link
                        to="/accounting/debt-adjustments"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-all shrink-0"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Chứng từ: {detailReceipt.debtAdjustmentCode}</span>
                      </Link>
                    ) : (
                      <Link
                        to="/accounting/debt-adjustments"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-all shrink-0"
                      >
                        <span>Lập chứng từ giảm nợ</span>
                      </Link>
                    )}
                  </div>
                  <div>
                    Người duyệt:{' '}
                    <strong>{detailReceipt.warehouseManagerName || 'Quản lý kho'}</strong> • Ngày duyệt:{' '}
                    {formatDate(detailReceipt.approvedAt)}
                  </div>
                  {detailReceipt.approvalNote && (
                    <div>
                      Ghi chú: <em>{detailReceipt.approvalNote}</em>
                    </div>
                  )}
                </div>
              )}

              {/* Thông tin từ chối nếu có */}
              {detailReceipt.status === 'REJECTED' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-800">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Phiếu đã bị từ chối
                  </div>
                  <div>
                    Ghi chú: {detailReceipt.approvalNote || 'Không đạt tiêu chuẩn nhập hàng hoàn'}
                  </div>
                </div>
              )}

              {/* Form phê duyệt kho nếu đang PENDING và user có quyền */}
              {detailReceipt.status === 'PENDING' && canApprove && (
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    Xác nhận nhận hàng & Nhập kho
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ghi chú kiểm hàng:
                    </label>
                    <input
                      type="text"
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      placeholder="Ghi chú xác nhận nhập kho..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isSubmittingApproval}
                      onClick={() => handleApproveAction('REJECT')}
                      className="px-4 py-2 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingApproval}
                      onClick={() => handleApproveAction('APPROVE')}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isSubmittingApproval && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Xác nhận nhập kho
                    </button>
                  </div>
                </div>
              )}

              {/* Thông báo nếu đang PENDING nhưng tài khoản không có quyền duyệt */}
              {detailReceipt.status === 'PENDING' && !canApprove && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-800 mb-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Phiếu đang chờ Quản lý kho duyệt nhận hàng
                  </div>
                  <p className="text-amber-800">
                    Khi Quản lý kho xác nhận nhận hàng, hệ thống sẽ tự động cập nhật tồn kho và giảm trừ công nợ đại lý.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setDetailReceipt(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsPage;
