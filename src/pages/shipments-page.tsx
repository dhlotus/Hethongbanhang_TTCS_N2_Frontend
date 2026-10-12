import React, { useEffect, useState, useCallback } from 'react';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  PackageCheck,
  Clock,
  XCircle,
  FileText,
  MapPin,
  User,
  Trash2,
} from 'lucide-react';
import { shipmentsService, type Shipment } from '../services/shipments.service';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';
import { USER_ROLES } from '../types/auth';

const STATUS_CONFIG: Record<
  Shipment['status'],
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: 'Chờ soạn hàng',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: Clock,
  },
  PICKING: {
    label: 'Đang soạn hàng',
    bg: 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
    icon: RefreshCw,
  },
  PACKED: {
    label: 'Đã đóng gói',
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-700',
    icon: PackageCheck,
  },
  SHIPPED: {
    label: 'Đang giao hàng',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    icon: Truck,
  },
  DELIVERED: {
    label: 'Giao thành công',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    icon: XCircle,
  },
};

export const ShipmentsPage: React.FC = () => {
  const user = getStoredUser();
  const roles = user?.roles || [];
  const isAdmin = roles.includes(USER_ROLES.ADMIN);
  const isWarehouseManager = roles.includes(USER_ROLES.WAREHOUSE_MANAGER) || roles.includes('WH_MANAGER');
  const isWarehouseKeeper = roles.includes(USER_ROLES.WAREHOUSE_KEEPER) || roles.includes('WAREHOUSE');

  const canConfirm = isAdmin || isWarehouseManager;
  const canUpdateStatus = isAdmin || isWarehouseManager || isWarehouseKeeper;
  const canCreate = isAdmin || isWarehouseManager || isWarehouseKeeper;
  const canDelete = isAdmin || isWarehouseManager;

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal tạo phiếu xuất mới
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrderCode, setNewOrderCode] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newReceiverName, setNewReceiverName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDeliveryAddress, setNewDeliveryAddress] = useState('');
  const [newCarrierName, setNewCarrierName] = useState('Giao Hàng Nhanh');
  const [newTrackingNumber, setNewTrackingNumber] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal cập nhật trạng thái
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [updateStatusVal, setUpdateStatusVal] = useState<Shipment['status']>('PICKING');
  const [updateTrackingVal, setUpdateTrackingVal] = useState('');
  const [updateCarrierVal, setUpdateCarrierVal] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Xác nhận xuất kho modal
  const [confirmingShipment, setConfirmingShipment] = useState<Shipment | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await shipmentsService.getShipments();
      setShipments(data || []);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Không thể tải danh sách phiếu xuất kho');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Xử lý tạo phiếu xuất
  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCode.trim() || !newCustomerName.trim()) {
      showToast('error', 'Vui lòng nhập Mã đơn hàng và Tên đại lý');
      return;
    }
    try {
      setIsSubmittingCreate(true);
      await shipmentsService.createShipment({
        orderCode: newOrderCode.trim(),
        customerName: newCustomerName.trim(),
        receiverName: newReceiverName.trim() || newCustomerName.trim(),
        phone: newPhone.trim(),
        deliveryAddress: newDeliveryAddress.trim(),
        carrierName: newCarrierName.trim(),
        trackingNumber: newTrackingNumber.trim(),
        status: 'PENDING',
      });
      showToast('success', 'Tạo phiếu xuất kho thành công');
      setIsCreateOpen(false);
      setNewOrderCode('');
      setNewCustomerName('');
      setNewReceiverName('');
      setNewPhone('');
      setNewDeliveryAddress('');
      setNewTrackingNumber('');
      fetchShipments();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi tạo phiếu xuất kho');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Xử lý cập nhật trạng thái
  const handleUpdateStatus = async () => {
    if (!selectedShipment) return;
    try {
      setIsSubmittingStatus(true);
      await shipmentsService.updateStatus(selectedShipment.id, updateStatusVal, {
        carrierName: updateCarrierVal || selectedShipment.carrierName,
        trackingNumber: updateTrackingVal || selectedShipment.trackingNumber,
      });
      showToast('success', `Đã cập nhật trạng thái phiếu ${selectedShipment.id}`);
      setSelectedShipment(null);
      fetchShipments();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Xử lý xác nhận xuất kho / hoàn tất giao hàng
  const handleConfirmShipment = async () => {
    if (!confirmingShipment) return;
    try {
      setIsConfirming(true);
      await shipmentsService.confirmShipment(confirmingShipment.id);
      showToast('success', `Xác nhận xuất kho thành công cho phiếu ${confirmingShipment.id}`);
      setConfirmingShipment(null);
      fetchShipments();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi xác nhận xuất kho');
    } finally {
      setIsConfirming(false);
    }
  };

  // Xử lý xóa / hủy phiếu xuất kho
  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu xuất kho này?')) return;
    try {
      await shipmentsService.deleteShipment(id);
      showToast('success', 'Đã xóa phiếu xuất kho');
      fetchShipments();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi xóa phiếu xuất kho');
    }
  };

  // Lọc dữ liệu
  const filtered = shipments.filter((item) => {
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchSearch =
      !searchTerm ||
      item.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalDelivered = shipments.filter((s) => s.status === 'DELIVERED').length;
  const totalShipping = shipments.filter((s) => s.status === 'SHIPPED').length;
  const totalPending = shipments.filter((s) => ['PENDING', 'PICKING', 'PACKED'].includes(s.status)).length;

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Nút hành động */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            Phiếu xuất kho & Giao hàng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Soạn hàng xuất kho chuẩn theo nguyên tắc FEFO, bàn giao vận chuyển và xác nhận xuất kho
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchShipments}
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
              Tạo Phiếu Xuất
            </button>
          )}
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Tổng phiếu xuất</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{shipments.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Chờ xuất / Soạn hàng</p>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{totalPending}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Đang giao hàng</p>
            <p className="text-xl font-bold text-indigo-700 mt-0.5">{totalShipping}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Đã giao thành công</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{totalDelivered}</p>
          </div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã phiếu, mã đơn, đại lý..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 hover:bg-white transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {['ALL', 'PENDING', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Tất cả' : STATUS_CONFIG[st as Shipment['status']]?.label || st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng danh sách phiếu xuất kho */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã phiếu</th>
                <th className="py-3.5 px-4">Mã đơn hàng</th>
                <th className="py-3.5 px-4">Đại lý & Địa chỉ giao</th>
                <th className="py-3.5 px-4">Đơn vị vận chuyển</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải danh sách phiếu xuất kho...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy phiếu xuất kho nào
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-blue-600 font-mono">{item.id}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{item.orderCode}</span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-medium text-slate-800">{item.customerName}</p>
                        {item.receiverName && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            {item.receiverName} {item.phone && `(${item.phone})`}
                          </p>
                        )}
                        {item.deliveryAddress && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate" title={item.deliveryAddress}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {item.deliveryAddress}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="text-xs font-semibold text-slate-700">{item.carrierName || 'Tự vận chuyển'}</p>
                        {item.trackingNumber && (
                          <span className="inline-block text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                            Mã: {item.trackingNumber}
                          </span>
                        )}
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
                          {/* Nút Xác nhận xuất kho (Quản lý kho / Admin) */}
                          {canConfirm && item.status !== 'DELIVERED' && item.status !== 'CANCELLED' && (
                            <button
                              onClick={() => setConfirmingShipment(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                              title="Xác nhận xuất kho & giao hàng"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Xác nhận xuất kho
                            </button>
                          )}

                          {/* Nút Cập nhật trạng thái (Thủ kho / Quản lý kho / Admin) */}
                          {canUpdateStatus && item.status !== 'DELIVERED' && item.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                setSelectedShipment(item);
                                setUpdateStatusVal(item.status);
                                setUpdateCarrierVal(item.carrierName || '');
                                setUpdateTrackingVal(item.trackingNumber || '');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                              title="Cập nhật trạng thái vận chuyển"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Cập nhật
                            </button>
                          )}

                          {/* Nút Hủy / Xóa */}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa phiếu"
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

      {/* Modal Xác nhận xuất kho */}
      {confirmingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Xác nhận Xuất kho</h3>
            </div>
            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn xác nhận hoàn tất xuất kho cho phiếu{' '}
              <strong className="text-slate-900">{confirmingShipment.id}</strong> (Đơn hàng:{' '}
              <strong className="text-blue-600">{confirmingShipment.orderCode}</strong>)?
            </p>
            <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-500 space-y-1">
              <p>• Đại lý nhận: <strong>{confirmingShipment.customerName}</strong></p>
              <p>• Đơn vị vận chuyển: <strong>{confirmingShipment.carrierName || 'Tự vận chuyển'}</strong></p>
              <p>• Trạng thái sau xác nhận: <strong className="text-emerald-600">Giao thành công (DELIVERED)</strong></p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingShipment(null)}
                disabled={isConfirming}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmShipment}
                disabled={isConfirming}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isConfirming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Xác nhận Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cập nhật trạng thái */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              Cập nhật Trạng thái Xuất kho
            </h3>
            <p className="text-xs text-slate-500">
              Phiếu: <strong>{selectedShipment.id}</strong> — Đơn hàng: <strong>{selectedShipment.orderCode}</strong>
            </p>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái mới</label>
                <select
                  value={updateStatusVal}
                  onChange={(e) => setUpdateStatusVal(e.target.value as Shipment['status'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PENDING">Chờ soạn hàng</option>
                  <option value="PICKING">Đang soạn hàng (FEFO)</option>
                  <option value="PACKED">Đã đóng gói</option>
                  <option value="SHIPPED">Đang giao hàng</option>
                  <option value="DELIVERED">Giao thành công</option>
                  <option value="CANCELLED">Hủy phiếu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị vận chuyển</label>
                <input
                  type="text"
                  value={updateCarrierVal}
                  onChange={(e) => setUpdateCarrierVal(e.target.value)}
                  placeholder="Ví dụ: Giao Hàng Nhanh, Viettel Post..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã vận đơn</label>
                <input
                  type="text"
                  value={updateTrackingVal}
                  onChange={(e) => setUpdateTrackingVal(e.target.value)}
                  placeholder="Ví dụ: TRK-2026-999"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedShipment(null)}
                disabled={isSubmittingStatus}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isSubmittingStatus}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo phiếu xuất kho */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleCreateShipment} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Tạo Phiếu Xuất Kho & Giao Hàng Mới
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã đơn hàng *</label>
                <input
                  type="text"
                  required
                  value={newOrderCode}
                  onChange={(e) => setNewOrderCode(e.target.value)}
                  placeholder="Ví dụ: DH2610-66569"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Người nhận</label>
                <input
                  type="text"
                  value={newReceiverName}
                  onChange={(e) => setNewReceiverName(e.target.value)}
                  placeholder="Tên người nhận hàng"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="0988xxxxxx"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ giao hàng</label>
                <input
                  type="text"
                  value={newDeliveryAddress}
                  onChange={(e) => setNewDeliveryAddress(e.target.value)}
                  placeholder="Địa chỉ kho đại lý..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị vận chuyển</label>
                <input
                  type="text"
                  value={newCarrierName}
                  onChange={(e) => setNewCarrierName(e.target.value)}
                  placeholder="Giao Hàng Nhanh / Viettel Post"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã vận đơn</label>
                <input
                  type="text"
                  value={newTrackingNumber}
                  onChange={(e) => setNewTrackingNumber(e.target.value)}
                  placeholder="TRK-2026-..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
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
                Tạo Phiếu Xuất
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
