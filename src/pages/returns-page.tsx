import React, { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import { returnsService, type ReturnRequest } from '../services/returns.service';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';
import { USER_ROLES } from '../types/auth';
import { matchesSearchTerm } from '../utils/vietnamese';

const STATUS_CONFIG: Record<
  ReturnRequest['status'],
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: 'Chờ duyệt',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: Clock,
  },
  APPROVED: {
    label: 'Đã duyệt (Chờ nhận hàng)',
    bg: 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
    icon: CheckCircle2,
  },
  RECEIVED: {
    label: 'Kho đã nhận hàng hoàn',
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-700',
    icon: Package,
  },
  ADJUSTED: {
    label: 'Đã điều chỉnh công nợ',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: CreditCard,
  },
  REJECTED: {
    label: 'Đã từ chối',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    icon: XCircle,
  },
};

export const ReturnsPage: React.FC = () => {
  const user = getStoredUser();
  const roles = user?.roles || [];
  const isAdmin = roles.includes(USER_ROLES.ADMIN);
  const isSalesManager = roles.includes(USER_ROLES.SALES_MANAGER);
  const isWarehouseManager = roles.includes(USER_ROLES.WAREHOUSE_MANAGER) || roles.includes('WH_MANAGER');
  const isWarehouseKeeper = roles.includes(USER_ROLES.WAREHOUSE_KEEPER) || roles.includes('WAREHOUSE');
  const isAccountant = roles.includes(USER_ROLES.ACCOUNTANT) || roles.includes('ACCOUNTANT_DEBT');

  // Phân quyền theo ma trận Module 8:
  // - Duyệt yêu cầu: Sales Manager, WH Manager, Admin
  const canApprove = isAdmin || isSalesManager || isWarehouseManager;
  // - Nhận hàng vào kho: Warehouse Keeper, WH Manager, Admin
  const canReceive = isAdmin || isWarehouseManager || isWarehouseKeeper;
  // - Điều chỉnh công nợ: Accountant, Sales Manager, Admin
  const canAdjustDebt = isAdmin || isAccountant || isSalesManager;
  // - Tạo yêu cầu: Customer, Sales Rep, Sales Manager, Admin
  const canCreate = true;
  // - Xóa/hủy: Sales Manager, Admin
  const canDelete = isAdmin || isSalesManager;

  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal tạo yêu cầu trả hàng
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrderCode, setNewOrderCode] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newRefundAmount, setNewRefundAmount] = useState<number>(0);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal nhận hàng vào kho
  const [receivingItem, setReceivingItem] = useState<ReturnRequest | null>(null);
  const [warehouseNote, setWarehouseNote] = useState('');
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);

  // Modal điều chỉnh công nợ
  const [adjustingItem, setAdjustingItem] = useState<ReturnRequest | null>(null);
  const [adjustRefundAmount, setAdjustRefundAmount] = useState<number>(0);
  const [accountantNote, setAccountantNote] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await returnsService.getReturns();
      setReturns(data || []);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Không thể tải danh sách phiếu trả hàng & điều chỉnh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Xử lý tạo yêu cầu trả hàng
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCode.trim() || !newCustomerName.trim() || !newReason.trim()) {
      showToast('error', 'Vui lòng nhập đầy đủ Mã đơn, Tên đại lý và Lý do trả hàng');
      return;
    }
    try {
      setIsSubmittingCreate(true);
      await returnsService.createReturn({
        orderCode: newOrderCode.trim(),
        customerName: newCustomerName.trim(),
        reason: newReason.trim(),
        refundAmount: Number(newRefundAmount) || 0,
        status: 'PENDING',
      });
      showToast('success', 'Tạo yêu cầu trả hàng thành công');
      setIsCreateOpen(false);
      setNewOrderCode('');
      setNewCustomerName('');
      setNewReason('');
      setNewRefundAmount(0);
      fetchReturns();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi tạo yêu cầu trả hàng');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Duyệt yêu cầu
  const handleApprove = async (id: string) => {
    try {
      await returnsService.approveReturn(id);
      showToast('success', 'Đã phê duyệt yêu cầu trả hàng');
      fetchReturns();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi duyệt yêu cầu');
    }
  };

  // Nhận hàng vào kho
  const handleReceiveStock = async () => {
    if (!receivingItem) return;
    try {
      setIsSubmittingReceive(true);
      await returnsService.receiveStock(receivingItem.id, warehouseNote);
      showToast('success', `Đã xác nhận nhập kho hàng hoàn cho phiếu ${receivingItem.id}`);
      setReceivingItem(null);
      setWarehouseNote('');
      fetchReturns();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi xác nhận nhận hàng');
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  // Điều chỉnh công nợ
  const handleAdjustDebt = async () => {
    if (!adjustingItem) return;
    try {
      setIsSubmittingAdjust(true);
      await returnsService.adjustDebt(adjustingItem.id, adjustRefundAmount, accountantNote);
      showToast('success', `Đã lập phiếu điều chỉnh công nợ cho phiếu ${adjustingItem.id}`);
      setAdjustingItem(null);
      setAccountantNote('');
      fetchReturns();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi điều chỉnh công nợ');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Xóa / Hủy
  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa yêu cầu trả hàng này?')) return;
    try {
      await returnsService.deleteReturn(id);
      showToast('success', 'Đã xóa phiếu trả hàng');
      fetchReturns();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi xóa phiếu');
    }
  };

  // Lọc dữ liệu
  const filtered = returns.filter((item) => {
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    if (!matchStatus) return false;
    const term = searchTerm.trim();
    if (!term) return true;
    return (
      matchesSearchTerm(item.requestCode, term) ||
      matchesSearchTerm(item.orderCode, term) ||
      matchesSearchTerm(item.customerName, term) ||
      matchesSearchTerm(item.reason, term)
    );
  });

  const totalPending = returns.filter((r) => r.status === 'PENDING').length;
  const totalApproved = returns.filter((r) => r.status === 'APPROVED').length;
  const totalReceived = returns.filter((r) => r.status === 'RECEIVED').length;
  const totalAdjusted = returns.filter((r) => r.status === 'ADJUSTED').length;

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Nút thao tác */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-blue-600" />
            Phiếu Trả hàng & Điều chỉnh Tồn kho
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tiếp nhận yêu cầu trả hàng từ đại lý, xác nhận nhập hàng hoàn và xử lý điều chỉnh công nợ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReturns}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tạo Yêu Cầu Trả Hàng
            </button>
          )}
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Chờ duyệt</p>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{totalPending}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Đã duyệt (Chờ kho nhận)</p>
            <p className="text-xl font-bold text-sky-700 mt-0.5">{totalApproved}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Kho đã nhận hàng hoàn</p>
            <p className="text-xl font-bold text-indigo-700 mt-0.5">{totalReceived}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Đã điều chỉnh công nợ</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{totalAdjusted}</p>
          </div>
        </div>
      </div>

      {/* Tìm kiếm & Bộ lọc trạng thái */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã yêu cầu, mã đơn, đại lý..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 hover:bg-white transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {['ALL', 'PENDING', 'APPROVED', 'RECEIVED', 'ADJUSTED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Tất cả' : STATUS_CONFIG[st as ReturnRequest['status']]?.label || st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng danh sách phiếu trả hàng & điều chỉnh */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã yêu cầu</th>
                <th className="py-3.5 px-4">Đơn hàng gốc</th>
                <th className="py-3.5 px-4">Đại lý & Lý do trả</th>
                <th className="py-3.5 px-4 text-right">Số tiền hoàn / Giảm nợ</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác nghiệp vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải danh sách...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <RotateCcw className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy phiếu trả hàng nào
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-blue-600 font-mono">{item.requestCode || item.id}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{item.orderCode}</span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-medium text-slate-800">{item.customerName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.reason}</p>
                        {item.warehouseNote && (
                          <p className="text-[11px] text-indigo-600 mt-0.5">Kho: {item.warehouseNote}</p>
                        )}
                        {item.accountantNote && (
                          <p className="text-[11px] text-emerald-600 mt-0.5">Kế toán: {item.accountantNote}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {item.refundAmount
                          ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.refundAmount)
                          : '0 đ'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.text}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Nút Duyệt yêu cầu (Sales Manager, WH Manager, Admin) */}
                          {canApprove && item.status === 'PENDING' && (
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                              title="Duyệt yêu cầu trả hàng"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Duyệt
                            </button>
                          )}

                          {/* 2. Nút Nhận hàng vào kho (Warehouse Keeper, WH Manager, Admin) */}
                          {canReceive && item.status === 'APPROVED' && (
                            <button
                              onClick={() => {
                                setReceivingItem(item);
                                setWarehouseNote('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                              title="Xác nhận nhận hàng hoàn vào kho"
                            >
                              <Package className="w-3.5 h-3.5" />
                              Nhập kho hoàn
                            </button>
                          )}

                          {/* 3. Nút Lập phiếu điều chỉnh công nợ (Accountant, Sales Manager, Admin) */}
                          {canAdjustDebt && item.status === 'RECEIVED' && (
                            <button
                              onClick={() => {
                                setAdjustingItem(item);
                                setAdjustRefundAmount(item.refundAmount || 0);
                                setAccountantNote('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                              title="Lập phiếu điều chỉnh công nợ / Hoàn tiền"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Điều chỉnh nợ
                            </button>
                          )}

                          {/* 4. Xóa / Hủy */}
                          {canDelete && item.status === 'PENDING' && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa yêu cầu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nhập kho hàng hoàn */}
      {receivingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Xác nhận Nhập kho Hàng hoàn
            </h3>
            <p className="text-sm text-slate-600">
              Xác nhận đã nhận hàng hoàn từ đại lý <strong>{receivingItem.customerName}</strong> (Đơn hàng:{' '}
              <strong className="text-blue-600">{receivingItem.orderCode}</strong>).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú kiểm tra kho</label>
              <textarea
                rows={3}
                value={warehouseNote}
                onChange={(e) => setWarehouseNote(e.target.value)}
                placeholder="Kiểm tra nguyên vẹn tem niêm phong, số lượng thực nhận..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReceivingItem(null)}
                disabled={isSubmittingReceive}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReceiveStock}
                disabled={isSubmittingReceive}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingReceive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Xác nhận Nhập kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lập phiếu điều chỉnh công nợ */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Điều chỉnh Công nợ / Hoàn tiền
            </h3>
            <p className="text-sm text-slate-600">
              Lập phiếu điều chỉnh giảm công nợ cho đại lý <strong>{adjustingItem.customerName}</strong>.
            </p>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số tiền điều chỉnh giảm (VND) *</label>
                <input
                  type="number"
                  min={0}
                  value={adjustRefundAmount}
                  onChange={(e) => setAdjustRefundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú kế toán</label>
                <textarea
                  rows={3}
                  value={accountantNote}
                  onChange={(e) => setAccountantNote(e.target.value)}
                  placeholder="Ghi giảm trừ vào hóa đơn gốc hoặc phát hành credit memo..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                disabled={isSubmittingAdjust}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAdjustDebt}
                disabled={isSubmittingAdjust}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingAdjust ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Xác nhận Điều chỉnh Nợ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo yêu cầu trả hàng mới */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Tạo Yêu Cầu Trả Hàng Mới
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã đơn hàng gốc *</label>
                <input
                  type="text"
                  required
                  value={newOrderCode}
                  onChange={(e) => setNewOrderCode(e.target.value)}
                  placeholder="Ví dụ: DH2609-09876"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên đại lý / Khách hàng *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Ví dụ: Đại lý Minh Khang"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do trả hàng *</label>
                <textarea
                  required
                  rows={2}
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Mô tả lý do trả hàng (hàng lỗi, cận date, móp méo...)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giá trị yêu cầu hoàn lại (VND)</label>
                <input
                  type="number"
                  min={0}
                  value={newRefundAmount}
                  onChange={(e) => setNewRefundAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmittingCreate}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmittingCreate}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingCreate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Tạo Yêu Cầu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
