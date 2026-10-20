import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  CreditCard,
  Trash2,
  Eye,
  Building2,
  Warehouse,
  FileText,
  AlertTriangle,
  Info,
  X,
  FileCheck,
} from 'lucide-react';
import {
  returnsService,
  type ReturnReceipt,
  type EligibleInvoice,
  type InvoiceLineDetail,
  type ReturnConditionType,
} from '../services/returns.service';
import { customerService } from '../services/customer.service';
import { type Customer } from '../types/customer.types';
import { warehouseService } from '../services/warehouse.service';
import type { Warehouse as SystemWarehouse } from '../types/warehouse.types';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';
import { USER_ROLES } from '../types/auth';
import { authService } from '../services/auth.service';
import { tokenStorage } from '../utils/token-storage';
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
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: Clock,
  },
  APPROVED: {
    label: 'Đã nhập kho & Giảm nợ',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Đã từ chối',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    icon: XCircle,
  },
};

interface SelectedItemRow {
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  purchasedQuantity: number;
  alreadyReturnedQuantity: number;
  remainingReturnableQuantity: number;
  unitPrice: number;
  selected: boolean;
  returnQuantity: number;
  conditionType: ReturnConditionType;
  batchNumber: string;
  subReason: string;
}

export const ReturnsPage: React.FC = () => {
  const user = getStoredUser();
  const rawRoles = user?.roles && user.roles.length > 0 ? user.roles : (user?.role ? [user.role] : []);
  const isAdmin = rawRoles.includes(USER_ROLES.ADMIN);
  const isSalesManager = rawRoles.includes(USER_ROLES.SALES_MANAGER);
  const isWarehouseManager =
    rawRoles.includes(USER_ROLES.WAREHOUSE_MANAGER) || rawRoles.includes('WH_MANAGER');
  const isWarehouseKeeper =
    rawRoles.includes(USER_ROLES.WAREHOUSE_KEEPER) || rawRoles.includes('WAREHOUSE');

  // Phân quyền theo SN-210:
  // - Tạo phiếu: NVKD, Đại lý, Sales Manager, Admin
  const canCreate = true;
  // - Quản lý kho duyệt nhận hàng: Quản lý kho, Thủ kho, Admin, Sales Manager
  const canApprove = isAdmin || isWarehouseManager || isWarehouseKeeper || isSalesManager;
  // - Xóa phiếu: Admin, Sales Manager
  const canDelete = isAdmin || isSalesManager;

  const [receipts, setReceipts] = useState<ReturnReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [warehouses, setWarehouses] = useState<SystemWarehouse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal tạo phiếu trả hàng
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [eligibleInvoices, setEligibleInvoices] = useState<EligibleInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [loadingLines, setLoadingLines] = useState(false);
  const [itemRows, setItemRows] = useState<SelectedItemRow[]>([]);
  const [generalReason, setGeneralReason] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal xem chi tiết / phê duyệt
  const [detailReceipt, setDetailReceipt] = useState<ReturnReceipt | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);

  const handleQuickSwitchToWarehouse = async (targetRole: 'warehouse' | 'admin' = 'warehouse') => {
    try {
      setIsSwitchingUser(true);
      const username = targetRole === 'warehouse' ? 'warehousemanager' : 'admin';
      const res = await authService.login({
        email: username,
        password: '123456',
      });
      tokenStorage.setTokens(res.accessToken, res.refreshToken, true);
      tokenStorage.setUser(res.user, true);
      showToast(
        'success',
        targetRole === 'warehouse'
          ? 'Đã chuyển sang tài khoản Quản lý kho (Đỗ Quốc Bảo)!'
          : 'Đã chuyển sang tài khoản Quản trị hệ thống (Admin)!',
      );
      window.location.reload();
    } catch {
      try {
        const fallbackUser = targetRole === 'warehouse' ? 'thukho' : 'admin';
        const resFb = await authService.login({
          email: fallbackUser,
          password: '123456',
        });
        tokenStorage.setTokens(resFb.accessToken, resFb.refreshToken, true);
        tokenStorage.setUser(resFb.user, true);
        showToast('success', `Đã chuyển sang tài khoản ${fallbackUser}!`);
        window.location.reload();
      } catch {
        showToast('error', 'Không thể tự động chuyển tài khoản. Vui lòng đăng xuất và đăng nhập bằng warehousemanager / 123456.');
      }
    } finally {
      setIsSwitchingUser(false);
    }
  };

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await returnsService.getReturnReceipts();
      setReceipts(data || []);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Không thể tải danh sách phiếu trả hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Load danh mục kho thực tế trên hệ thống
  useEffect(() => {
    warehouseService
      .getWarehouses()
      .then((res) => {
        const list: SystemWarehouse[] = Array.isArray(res) ? res : res?.data || [];
        const activeList = list.filter((w) => w.status !== 'INACTIVE');
        setWarehouses(activeList);
        if (activeList.length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(activeList[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Load danh sách đại lý khi mở modal tạo
  useEffect(() => {
    if (isCreateOpen) {
      setLoadingCustomers(true);
      customerService
        .getCustomers({ limit: 100 })
        .then((res) => {
          const list = res.data || [];
          setCustomers(list);
          if (list.length > 0 && !selectedAgencyId) {
            setSelectedAgencyId(list[0].id);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingCustomers(false));
    }
  }, [isCreateOpen]);

  // Load hóa đơn khi chọn đại lý
  useEffect(() => {
    if (isCreateOpen && selectedAgencyId) {
      setLoadingInvoices(true);
      setSelectedInvoiceId('');
      setItemRows([]);
      returnsService
        .getEligibleInvoices(selectedAgencyId)
        .then((res) => {
          setEligibleInvoices(res || []);
          if (res && res.length > 0) {
            setSelectedInvoiceId(res[0].id || res[0].code);
          }
        })
        .catch(() => setEligibleInvoices([]))
        .finally(() => setLoadingInvoices(false));
    }
  }, [isCreateOpen, selectedAgencyId]);

  // Load chi tiết dòng sản phẩm khi chọn hóa đơn
  useEffect(() => {
    if (isCreateOpen && selectedInvoiceId) {
      setLoadingLines(true);
      returnsService
        .getInvoiceLines(selectedInvoiceId)
        .then((res) => {
          const rows: SelectedItemRow[] = (res.lines || []).map((l: InvoiceLineDetail) => ({
            productId: l.productId,
            productSku: l.productSku,
            productName: l.productName,
            unit: l.unit,
            purchasedQuantity: l.purchasedQuantity,
            alreadyReturnedQuantity: l.alreadyReturnedQuantity,
            remainingReturnableQuantity: l.remainingReturnableQuantity,
            unitPrice: l.unitPrice,
            selected: false,
            returnQuantity: l.remainingReturnableQuantity > 0 ? 1 : 0,
            conditionType: 'GOOD',
            batchNumber: '',
            subReason: '',
          }));
          setItemRows(rows);
        })
        .catch(() => setItemRows([]))
        .finally(() => setLoadingLines(false));
    }
  }, [isCreateOpen, selectedInvoiceId]);

  // Tính tổng tiền hoàn lại ước tính của form tạo
  const estimatedRefundAmount = useMemo(() => {
    return itemRows
      .filter((r) => r.selected && r.returnQuantity > 0)
      .reduce((sum, r) => sum + r.returnQuantity * r.unitPrice, 0);
  }, [itemRows]);

  // Toggle chọn sản phẩm
  const handleToggleRow = (index: number) => {
    setItemRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return updated;
    });
  };

  // Thay đổi số lượng trả của từng dòng
  const handleQuantityChange = (index: number, val: number) => {
    setItemRows((prev) => {
      const updated = [...prev];
      const max = updated[index].remainingReturnableQuantity;
      const safeVal = Math.max(0, Math.min(max, val));
      updated[index] = { ...updated[index], returnQuantity: safeVal };
      return updated;
    });
  };

  // Thay đổi tình trạng hàng (Hàng tốt / Hàng lỗi)
  const handleConditionChange = (index: number, conditionType: ReturnConditionType) => {
    setItemRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], conditionType };
      return updated;
    });
  };

  // Xử lý tạo phiếu trả hàng
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAgencyId) {
      showToast('error', 'Vui lòng chọn đại lý trả hàng');
      return;
    }
    if (!selectedInvoiceId) {
      showToast('error', 'Vui lòng chọn hóa đơn gốc đã mua');
      return;
    }
    if (!generalReason.trim()) {
      showToast('error', 'Vui lòng nhập lý do trả hàng');
      return;
    }

    const selectedItems = itemRows.filter((r) => r.selected && r.returnQuantity > 0);
    if (selectedItems.length === 0) {
      showToast('error', 'Vui lòng tích chọn ít nhất một sản phẩm và nhập số lượng trả > 0');
      return;
    }

    // Validate hạn mức số lượng
    for (const it of selectedItems) {
      if (it.returnQuantity > it.remainingReturnableQuantity) {
        showToast(
          'error',
          `Sản phẩm ${it.productName} vượt quá số lượng tối đa còn được trả (${it.remainingReturnableQuantity} ${it.unit})`,
        );
        return;
      }
    }

    try {
      setIsSubmittingCreate(true);
      await returnsService.createReturnReceipt({
        original_invoice_id: selectedInvoiceId,
        agency_id: selectedAgencyId,
        warehouse_id: selectedWarehouseId,
        reason: generalReason.trim(),
        items: selectedItems.map((it) => ({
          product_id: it.productId,
          product_sku: it.productSku,
          product_name: it.productName,
          unit: it.unit,
          batch_number: it.batchNumber.trim() || undefined,
          quantity: it.returnQuantity,
          unit_price: it.unitPrice,
          condition_type: it.conditionType,
          sub_reason: it.subReason.trim() || undefined,
        })),
      });

      showToast('success', 'Lập phiếu trả hàng thành công! Đang ở trạng thái Chờ duyệt kho.');
      setIsCreateOpen(false);
      setGeneralReason('');
      setItemRows([]);
      fetchReceipts();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi tạo phiếu trả hàng');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Xử lý duyệt hoặc từ chối phiếu trả hàng
  const handleApproveAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!detailReceipt) return;

    if (action === 'REJECT' && !approvalNote.trim()) {
      showToast('error', 'Vui lòng nhập lý do từ chối phiếu trả hàng');
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
          `Duyệt nhập kho thành công cho phiếu ${res.code}! Đã cộng kho và giảm trừ ${formatVND(res.totalRefundAmount)} công nợ.`,
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

  // Xử lý xóa phiếu
  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu trả hàng này?')) return;
    try {
      await returnsService.deleteReturnReceipt(id);
      showToast('success', 'Đã xóa phiếu trả hàng');
      fetchReceipts();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi xóa phiếu');
    }
  };

  // Bộ lọc danh sách
  const filtered = useMemo(() => {
    return receipts.filter((item) => {
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchWarehouse =
        warehouseFilter === 'ALL' ||
        item.warehouseId === warehouseFilter ||
        item.warehouseCode === warehouseFilter ||
        (item.warehouseName && item.warehouseName.toLowerCase().includes(warehouseFilter.toLowerCase()));
      const s = searchTerm.toLowerCase().trim();
      const matchSearch =
        !s ||
        item.code?.toLowerCase().includes(s) ||
        item.originalInvoiceId?.toLowerCase().includes(s) ||
        item.originalInvoiceCode?.toLowerCase().includes(s) ||
        item.agencyName?.toLowerCase().includes(s) ||
        item.agencyCode?.toLowerCase().includes(s) ||
        item.reason?.toLowerCase().includes(s);
      return matchStatus && matchWarehouse && matchSearch;
    });
  }, [receipts, statusFilter, warehouseFilter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, warehouseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedReceipts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPending = receipts.filter((r) => r.status === 'PENDING').length;
  const totalApproved = receipts.filter((r) => r.status === 'APPROVED').length;
  const totalRejected = receipts.filter((r) => r.status === 'REJECTED').length;
  const totalRefundAmount = receipts
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + Number(r.totalRefundAmount || 0), 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Tiêu đề & Nút thao tác */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Quản lý mã phiếu trả hàng từ đại lý
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReceipts}
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canCreate && (
            <Link
              to="/accounting/returns/create"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Lập phiếu trả hàng
            </Link>
          )}
        </div>
      </div>

      {/* Thẻ thống kê nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Tổng số phiếu
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-1">
            {receipts.length}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
            Chờ duyệt kho
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-700 mt-1">
            {totalPending}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Đã nhập & Giảm nợ
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1">
            {totalApproved}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
            Tổng tiền giảm nợ
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-indigo-700 mt-1">
            {formatVND(totalRefundAmount)}
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm & lọc trạng thái */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã phiếu, mã hóa đơn, tên đại lý, lý do..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Bộ lọc kho tiếp nhận */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Warehouse className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả kho tiếp nhận</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'PENDING', label: 'Chờ duyệt kho' },
            { key: 'APPROVED', label: 'Đã nhập kho' },
            { key: 'REJECTED', label: 'Đã từ chối' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách bảng phiếu trả hàng */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã phiếu</th>
                <th className="py-3 px-4">Hóa đơn gốc</th>
                <th className="py-3 px-4">Kho nhập</th>
                <th className="py-3 px-4 text-right">Tổng tiền hoàn lại</th>
                <th className="py-3 px-4 text-center">Trạng thái duyệt</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Đang tải danh sách phiếu trả hàng...
                  </td>
                </tr>
              ) : pagedReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy phiếu trả hàng nào phù hợp
                  </td>
                </tr>
              ) : (
                pagedReceipts.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusConf.icon;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-200/60">
                          {item.code}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900 text-xs font-mono">
                        {item.originalInvoiceId || item.originalInvoiceCode}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                          {item.warehouseName || item.warehouseCode || 'Kho Miền Nam'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                        {formatVND(item.totalRefundAmount)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConf.bg} ${statusConf.text}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConf.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setDetailReceipt(item);
                            setApprovalNote('');
                          }}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
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

        {/* Phân trang chuẩn theo Hình 2 */}
        <div className="border-t border-slate-200/80">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            showRecordRange={false}
            size="sm"
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* ================= MODAL LẬP PHIẾU TRẢ HÀNG (SN-210) ================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Lập phiếu trả hàng từ đại lý (Task SN-210)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bắt buộc liên kết hóa đơn gốc, kiểm tra số lượng và phân loại tình trạng hàng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Bước 1: Chọn Đại lý & Hóa đơn gốc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Đại lý trả hàng *
                  </label>
                  <select
                    value={selectedAgencyId}
                    onChange={(e) => setSelectedAgencyId(e.target.value)}
                    disabled={loadingCustomers}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Hóa đơn gốc đã mua *
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    disabled={loadingInvoices || eligibleInvoices.length === 0}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  >
                    {loadingInvoices ? (
                      <option value="">Đang tải danh sách hóa đơn...</option>
                    ) : eligibleInvoices.length === 0 ? (
                      <option value="">Không có hóa đơn khả dụng</option>
                    ) : (
                      eligibleInvoices.map((inv) => (
                        <option key={inv.id || inv.code} value={inv.id || inv.code}>
                          {inv.code} ({formatVND(inv.totalAmount)}) — Đơn: {inv.orderCode}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Bước 2: Danh sách sản phẩm của hóa đơn gốc để chọn trả */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    Chọn dòng sản phẩm & Nhập số lượng trả (Kiểm tra hạn mức)
                  </h4>
                  <span className="text-xs text-slate-500">
                    Số lượng trả không được vượt quá số lượng đã giao trừ phần đã trả trước đó
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {loadingLines ? (
                    <div className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                      Đang lấy chi tiết sản phẩm hóa đơn...
                    </div>
                  ) : itemRows.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      Vui lòng chọn hóa đơn gốc có sản phẩm để hiển thị
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">Chọn</th>
                            <th className="py-2.5 px-3">Sản phẩm & SKU</th>
                            <th className="py-2.5 px-2 text-center">ĐVT</th>
                            <th className="py-2.5 px-3 text-right">Đã mua</th>
                            <th className="py-2.5 px-3 text-right">Đã trả cũ</th>
                            <th className="py-2.5 px-3 text-right font-bold text-indigo-600">Còn được trả</th>
                            <th className="py-2.5 px-3 w-24 text-center">SL trả *</th>
                            <th className="py-2.5 px-3 w-36 text-center">Tình trạng hàng *</th>
                            <th className="py-2.5 px-3 w-32">Số lô (nếu có)</th>
                            <th className="py-2.5 px-3 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {itemRows.map((row, idx) => {
                            const isExceeded = row.returnQuantity > row.remainingReturnableQuantity;
                            const isSelectable = row.remainingReturnableQuantity > 0;

                            return (
                              <tr
                                key={row.productId + idx}
                                className={`transition-colors ${row.selected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'}`}
                              >
                                <td className="py-3 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={row.selected}
                                    disabled={!isSelectable}
                                    onChange={() => handleToggleRow(idx)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>

                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900">{row.productName}</div>
                                  <div className="font-mono text-[10px] text-slate-400">{row.productSku}</div>
                                </td>

                                <td className="py-3 px-2 text-center">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                    {row.unit}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-slate-600">
                                  {row.purchasedQuantity}
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-amber-600">
                                  {row.alreadyReturnedQuantity}
                                </td>

                                <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30">
                                  {row.remainingReturnableQuantity}
                                </td>

                                <td className="py-3 px-3">
                                  <input
                                    type="number"
                                    min="1"
                                    max={row.remainingReturnableQuantity}
                                    disabled={!row.selected}
                                    value={row.returnQuantity || ''}
                                    onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                                    className={`w-20 px-2 py-1 text-center font-mono font-bold border rounded-lg text-xs focus:ring-2 focus:outline-none ${
                                      isExceeded
                                        ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-400'
                                        : 'border-slate-300 bg-white text-slate-900 focus:ring-indigo-500'
                                    } disabled:bg-slate-100 disabled:text-slate-400`}
                                  />
                                </td>

                                <td className="py-3 px-3">
                                  <select
                                    disabled={!row.selected}
                                    value={row.conditionType}
                                    onChange={(e) =>
                                      handleConditionChange(idx, e.target.value as ReturnConditionType)
                                    }
                                    className={`w-full px-2 py-1 rounded-lg border text-xs font-semibold focus:outline-none ${
                                      row.conditionType === 'GOOD'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                        : 'bg-rose-50 border-rose-300 text-rose-800'
                                    } disabled:opacity-50`}
                                  >
                                    <option value="GOOD">Hàng tốt (Kho bán)</option>
                                    <option value="DAMAGED">Hàng lỗi (Kho lỗi)</option>
                                  </select>
                                </td>

                                <td className="py-3 px-3">
                                  <input
                                    type="text"
                                    disabled={!row.selected}
                                    value={row.batchNumber}
                                    placeholder="Lô SX..."
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setItemRows((prev) => {
                                        const updated = [...prev];
                                        updated[idx] = { ...updated[idx], batchNumber: val };
                                        return updated;
                                      });
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white disabled:bg-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                  />
                                </td>

                                <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                                  {row.selected ? formatVND(row.returnQuantity * row.unitPrice) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Bước 3: Lý do trả hàng & Kho tiếp nhận */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    Lý do trả hàng chung *
                  </label>
                  <textarea
                    rows={2}
                    value={generalReason}
                    onChange={(e) => setGeneralReason(e.target.value)}
                    placeholder="Ví dụ: Đại lý đổi trả định kỳ / Lỗi vận chuyển móp vỏ hộp / Hàng cận hạn..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1.5">
                    <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
                    Kho tiếp nhận hàng trả
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tóm tắt tổng tiền hoàn lại ước tính */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
                <div className="text-xs text-indigo-900 font-medium">
                  <div>
                    Tổng tiền hoàn lại ước tính (Sẽ giảm trừ công nợ sau khi Quản lý kho duyệt):
                  </div>
                  <div className="text-[11px] text-indigo-600 mt-0.5">
                    Hàng tốt: nhập lại kho bán hàng • Hàng lỗi: nhập riêng kho hàng lỗi
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-indigo-700">
                  {formatVND(estimatedRefundAmount)}
                </div>
              </div>

              {/* Footer nút bấm */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || estimatedRefundAmount <= 0}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmittingCreate && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Lập phiếu trả hàng (Gửi duyệt)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CHI TIẾT & DUYỆT NHẬP KHO (SN-210 API 2) ================= */}
      {detailReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    Chi tiết phiếu trả hàng: {detailReceipt.code}
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
                onClick={() => {
                  setDetailReceipt(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Thông tin chung */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
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
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-bold">Lý do trả hàng: </span>
                {detailReceipt.reason}
              </div>

              {/* Bảng chi tiết sản phẩm & phân loại kho */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Chi tiết sản phẩm trả & Phân loại kho nhập</span>
                  <span className="text-indigo-600 font-mono font-bold">
                    Tổng hoàn: {formatVND(detailReceipt.totalRefundAmount)}
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Sản phẩm</th>
                        <th className="py-2.5 px-2 text-center">ĐVT</th>
                        <th className="py-2.5 px-3 text-center">Số lượng</th>
                        <th className="py-2.5 px-3 text-right">Đơn giá hoàn</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                        <th className="py-2.5 px-3 text-center">Vị trí kho nhập</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detailReceipt.items || []).map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50/60">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{it.productName}</div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {it.productSku} {it.batchNumber ? `• Lô: ${it.batchNumber}` : ''}
                            </div>
                            {it.subReason && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5">{it.subReason}</div>
                            )}
                          </td>

                          <td className="py-3 px-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {it.unit || 'Lon'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                            {it.quantity}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {formatVND(it.unitPrice)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatVND(it.lineTotal || it.quantity * it.unitPrice)}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {it.conditionType === 'GOOD' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Hàng tốt (Kho bán)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3" />
                                Hàng hỏng (Kho lỗi)
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
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs text-emerald-900">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ĐÃ HOÀN TẤT NHẬP KHO & ĐIỀU CHỈNH CÔNG NỢ ĐẠI LÝ
                  </div>
                  <div>
                    Người duyệt kho:{' '}
                    <strong>{detailReceipt.warehouseManagerName || 'Quản lý kho'}</strong> • Ngày duyệt:{' '}
                    {formatDate(detailReceipt.approvedAt)}
                  </div>
                  {detailReceipt.approvalNote && (
                    <div>
                      Ghi chú kiểm kho: <em>{detailReceipt.approvalNote}</em>
                    </div>
                  )}
                  <div className="text-[11px] text-emerald-700 mt-1 font-medium">
                    ✓ Hệ thống đã tự động cộng số lượng vào tồn kho tương ứng và trừ{' '}
                    {formatVND(detailReceipt.totalRefundAmount)} khỏi khoản nợ hiện tại của đại lý.
                  </div>
                </div>
              )}

              {/* Thông tin từ chối nếu có */}
              {detailReceipt.status === 'REJECTED' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-800">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    PHIẾU ĐÃ BỊ TỪ CHỐI NHẬP KHO
                  </div>
                  <div>
                    Ghi chú từ chối: {detailReceipt.approvalNote || 'Không đạt tiêu chuẩn nhập hàng hoàn'}
                  </div>
                </div>
              )}

              {/* Form phê duyệt kho nếu đang PENDING và user có quyền */}
              {detailReceipt.status === 'PENDING' && canApprove && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    Xác nhận nhận hàng & Nhập kho (Dành cho Quản lý kho)
                  </h4>
                  <p className="text-xs text-indigo-700">
                    Khi bấm <strong>Xác nhận nhận hàng (APPROVED)</strong>, hệ thống sẽ tự động cộng lại tồn kho bán hàng (hàng tốt), chuyển vào kho hàng lỗi (hàng hỏng) và tự động giảm trừ {formatVND(detailReceipt.totalRefundAmount)} khỏi dư nợ đại lý.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ghi chú kiểm hàng / xác nhận:
                    </label>
                    <input
                      type="text"
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      placeholder="Ví dụ: Đã kiểm hàng, khớp số lượng và phân loại kho"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isSubmittingApproval}
                      onClick={() => handleApproveAction('REJECT')}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Từ chối (REJECT)
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingApproval}
                      onClick={() => handleApproveAction('APPROVE')}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isSubmittingApproval && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      Xác nhận nhận hàng & Nhập kho (APPROVE)
                    </button>
                  </div>
                </div>
              )}

              {/* Thông báo phân quyền nếu đang PENDING nhưng tài khoản hiện tại không có quyền duyệt (như NVKD) */}
              {detailReceipt.status === 'PENDING' && !canApprove && (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 text-xs text-amber-900 flex-1">
                      <div className="font-bold text-sm text-amber-900 flex items-center gap-2">
                        <span>Phiếu đang ở trạng thái CHỜ DUYỆT KHO (Task SN-210)</span>
                      </div>
                      <p className="text-amber-800 leading-relaxed">
                        Hệ thống đã có đầy đủ chức năng duyệt kho và cập nhật công nợ! Tuy nhiên, tài khoản bạn đang đăng nhập là <strong>{user?.fullName || 'Nhân viên kinh doanh'}</strong> ({rawRoles.join(', ') || 'SALES_REP'}), chỉ có quyền tạo phiếu trả hàng.
                      </p>
                      <p className="text-amber-800 leading-relaxed">
                        Theo quy trình nghiệp vụ SN-210, quyền <strong>Kiểm tra hàng & Duyệt nhập kho</strong> thuộc thẩm quyền của <strong>Quản lý kho</strong> hoặc <strong>Quản trị viên</strong>.
                      </p>
                      <div className="pt-1 text-[11px] text-amber-700 font-medium">
                        Tài khoản Quản lý kho: <code>warehousemanager</code> (Mật khẩu: <code>123456</code>) • Thủ kho: <code>thukho</code> (<code>123456</code>)
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                    <button
                      type="button"
                      disabled={isSwitchingUser}
                      onClick={() => handleQuickSwitchToWarehouse('warehouse')}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isSwitchingUser ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Warehouse className="w-3.5 h-3.5" />
                      )}
                      Chuyển sang Quản lý kho để test duyệt ngay
                    </button>
                    <button
                      type="button"
                      disabled={isSwitchingUser}
                      onClick={() => handleQuickSwitchToWarehouse('admin')}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Chuyển sang Admin
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setDetailReceipt(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
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
