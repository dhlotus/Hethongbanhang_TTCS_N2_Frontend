import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  CheckSquare,
  Square,
  PackagePlus,
  Building2,
  Calendar,
  FileText,
} from 'lucide-react';
import { orderPickingService } from '../../services/order-picking.service';
import { STANDARD_WAREHOUSES } from '../../constants/warehouse.constants';
import type { Order } from '../../types/order';
import type { CreatePickingSheetPayload } from '../../types/order-picking.types';
import { showToast } from '../toast';

export interface CreatePickingSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sheetId: string) => void;
}

export const CreatePickingSheetModal: React.FC<CreatePickingSheetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    STANDARD_WAREHOUSES[2].id, // Mặc định Kho Miền Nam
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await orderPickingService.getEligibleOrdersForPicking();
        setOrders(data);
        // Tự động tích chọn 1-2 đơn đầu tiên nếu có để nhân viên kho thao tác nhanh
        if (data.length > 0 && selectedOrderIds.length === 0) {
          const firstIds = data.slice(0, 2).map((o) => o.id || o.orderCode || '').filter(Boolean);
          setSelectedOrderIds(firstIds);
        }
      } catch (err) {
        showToast('error', 'Không thể tải danh sách đơn hàng đã duyệt');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isOpen]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const q = searchTerm.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.orderCode?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.salesRepName?.toLowerCase().includes(q),
    );
  }, [orders, searchTerm]);

  const handleToggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id || o.orderCode || '').filter(Boolean));
    }
  };

  const selectedOrdersData = useMemo(() => {
    return orders.filter((o) => selectedOrderIds.includes(o.id || o.orderCode || ''));
  }, [orders, selectedOrderIds]);

  const summaryStats = useMemo(() => {
    const totalLines = selectedOrdersData.reduce((sum, o) => sum + (o.lines?.length || 0), 0);
    const totalQuantity = selectedOrdersData.reduce(
      (sum, o) => sum + (o.lines || []).reduce((lSum, l) => lSum + l.quantity, 0),
      0,
    );
    return { totalLines, totalQuantity };
  }, [selectedOrdersData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedOrderIds.length === 0) {
      showToast('error', 'Vui lòng chọn ít nhất 1 đơn hàng để tạo lượt soạn hàng');
      return;
    }

    const warehouseObj = STANDARD_WAREHOUSES.find((w) => w.id === selectedWarehouseId);

    try {
      setIsSubmitting(true);
      const payload: CreatePickingSheetPayload = {
        selectedOrderIds,
        warehouseId: selectedWarehouseId,
        warehouseCode: warehouseObj?.code,
        warehouseName: warehouseObj?.name,
        note: note.trim() || undefined,
      };

      const created = await orderPickingService.createPickingSheet(payload);
      showToast('success', `Đã tạo phiếu soạn hàng ${created.sheetCode} thành công!`);
      onSuccess(created.id);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo phiếu soạn hàng';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                Tạo phiếu soạn hàng (Gộp nhiều đơn)
              </h3>
              <p className="text-xs text-slate-500">
                Gom dòng hàng & sắp xếp tự động theo đường đi trong kho
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Chọn Kho xuất hàng */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kho xuất hàng phụ trách <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STANDARD_WAREHOUSES.map((wh) => (
                <button
                  key={wh.id}
                  type="button"
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    selectedWarehouseId === wh.id
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Building2
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      selectedWarehouseId === wh.id ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <span className="font-bold text-xs block">{wh.name}</span>
                    <span className="text-[11px] font-mono text-slate-500">{wh.code}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Ô tìm kiếm & Chọn đơn */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chọn đơn hàng cần soạn ({selectedOrderIds.length}/{filteredOrders.length}){' '}
                <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
              >
                {selectedOrderIds.length === filteredOrders.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" /> Bỏ chọn tất cả
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" /> Chọn tất cả
                  </>
                )}
              </button>
            </div>

            {/* Input tìm kiếm */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã đơn (DH...), tên đại lý..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Danh sách các đơn hàng có thể chọn */}
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
              {loading ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Đang tải danh sách đơn hàng đã duyệt...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Không tìm thấy đơn hàng nào sẵn sàng để soạn
                </div>
              ) : (
                filteredOrders.map((ord) => {
                  const ordId = ord.id || ord.orderCode || '';
                  const isSelected = selectedOrderIds.includes(ordId);
                  return (
                    <div
                      key={ordId}
                      onClick={() => handleToggleOrder(ordId)}
                      className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : 'hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Đã xử lý ở thẻ cha
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                            {ord.orderCode}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            {ord.status === 'APPROVED' ? 'Đã duyệt' : ord.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium truncate mt-0.5">
                          {ord.customerName}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Giao: {ord.deliveryDate || 'Trong ngày'}
                          </span>
                          <span>•</span>
                          <span>{ord.lines?.length || 0} mặt hàng</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Hộp tóm tắt khi gộp nhiều đơn */}
          {selectedOrderIds.length > 0 && (
            <div className="p-3 bg-indigo-50/80 border border-indigo-200/80 rounded-xl text-xs text-indigo-950 flex items-center justify-between">
              <div>
                <p className="font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Đã chọn {selectedOrderIds.length} đơn hàng để gộp
                </p>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Hệ thống sẽ gom các SKU trùng nhau và tự sắp xếp vị trí kệ
                </p>
              </div>
              <div className="text-right">
                <span className="font-bold block text-sm text-indigo-900">
                  {summaryStats.totalQuantity} món
                </span>
                <span className="text-[10px] text-indigo-600">
                  ({summaryStats.totalLines} dòng hàng gộp)
                </span>
              </div>
            </div>
          )}

          {/* Ghi chú lượt soạn */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú lượt soạn hàng (không bắt buộc):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Đợt soạn ca sáng, ưu tiên xe tải 2.5 tấn khu vực Quận 7..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Footer nút bấm */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedOrderIds.length === 0}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <PackagePlus className="w-4 h-4" />
              {isSubmitting ? 'Đang tạo...' : 'Tạo phiếu & Bắt đầu soạn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
