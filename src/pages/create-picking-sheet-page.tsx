import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckSquare,
  Package,
  Layers,
  Search,
  Square,
  X,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { orderPickingService } from '../services/order-picking.service';
import { STANDARD_WAREHOUSES } from '../constants/warehouse.constants';
import type { Order } from '../types/order';
import type { CreatePickingSheetPayload } from '../types/order-picking.types';
import { showToast } from '../components/toast';

/**
 * Trang Gộp đơn hàng (Wave Picking) thiết kế lại hiện đại, trực quan, hỗ trợ xem trước sản phẩm gom
 */
export const CreatePickingSheetPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PROCESSING'>('ALL');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    STANDARD_WAREHOUSES[2].id, // Mặc định Kho Miền Nam
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tải danh sách đơn hàng từ Quản lý đơn hàng
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await orderPickingService.getAllOrders();
        setOrders(data);

        // Tự động gợi ý 2 đơn đã duyệt đầu tiên
        const approved = data.filter((o) => o.status === 'APPROVED');
        if (approved.length > 0) {
          setSelectedOrderIds(approved.slice(0, 2).map((o) => o.id || o.orderCode || '').filter(Boolean));
        } else if (data.length > 0) {
          setSelectedOrderIds(data.slice(0, 2).map((o) => o.id || o.orderCode || '').filter(Boolean));
        }
      } catch {
        showToast('error', 'Không thể tải danh sách đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Lọc đơn hàng
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCode = o.orderCode?.toLowerCase().includes(q);
        const matchCust = o.customerName?.toLowerCase().includes(q);
        const matchRep = o.salesRepName?.toLowerCase().includes(q);
        if (!matchCode && !matchCust && !matchRep) return false;
      }

      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  // Chọn / Bỏ chọn từng đơn
  const handleToggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };

  // Chọn / Bỏ chọn tất cả
  const handleSelectAll = () => {
    const selectableIds = filteredOrders.map((o) => o.id || o.orderCode || '').filter(Boolean);
    const allSelected = selectableIds.every((id) => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !selectableIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedOrderIds, ...selectableIds]));
      setSelectedOrderIds(merged);
    }
  };

  // Dữ liệu các đơn đã chọn
  const selectedOrdersData = useMemo(() => {
    return orders.filter((o) => selectedOrderIds.includes(o.id || o.orderCode || ''));
  }, [orders, selectedOrderIds]);

  // Tổng hợp sản phẩm gộp theo SKU (Wave Aggregation)
  const aggregatedItems = useMemo(() => {
    const map = new Map<
      string,
      {
        productSku: string;
        productName: string;
        unit: string;
        totalQuantity: number;
        sources: { orderCode: string; quantity: number }[];
      }
    >();

    for (const order of selectedOrdersData) {
      const orderCode = order.orderCode || order.id || 'Đơn';
      for (const line of order.lines || []) {
        const key = `${(line.productSku || line.productId).toUpperCase()}_${(line.unit || 'Đơn vị').toUpperCase()}`;
        const existing = map.get(key);
        if (existing) {
          existing.totalQuantity += line.quantity;
          existing.sources.push({ orderCode, quantity: line.quantity });
        } else {
          map.set(key, {
            productSku: line.productSku,
            productName: line.productName,
            unit: line.unit,
            totalQuantity: line.quantity,
            sources: [{ orderCode, quantity: line.quantity }],
          });
        }
      }
    }

    return Array.from(map.values());
  }, [selectedOrdersData]);

  // Thống kê tổng số lượng
  const totalQuantity = useMemo(() => {
    return aggregatedItems.reduce((sum, it) => sum + it.totalQuantity, 0);
  }, [aggregatedItems]);

  // Xử lý tạo phiếu soạn hàng
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedOrderIds.length === 0) {
      showToast('error', 'Vui lòng chọn ít nhất 1 đơn hàng để gộp phiếu soạn');
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
      showToast(
        'success',
        `Đã tạo phiếu ${created.sheetCode} và gộp thành công ${selectedOrderIds.length} đơn hàng!`,
      );
      navigate('/warehouse/picking');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo phiếu soạn hàng';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 text-slate-900">
      {/* ── 1. HEADER & BREADCRUMB ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/warehouse/picking"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Quay lại danh sách phiếu soạn hàng"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                <Link to="/warehouse/picking" className="hover:text-indigo-600 font-medium">
                  Phiếu soạn hàng
                </Link>
                <span>/</span>
                <span className="font-semibold text-slate-800">Gộp đơn hàng</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>Gộp đơn soạn hàng theo đợt</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. NỘI DUNG FORM 2 CỘT HIỆN ĐẠI ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* CỘT TRÁI (7 CỘT): DANH SÁCH ĐƠN HÀNG */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>1. Chọn đơn hàng từ Quản lý đơn hàng</span>
                  <span className="text-rose-500">*</span>
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                >
                  {filteredOrders.length > 0 &&
                  filteredOrders.every((o) => selectedOrderIds.includes(o.id || o.orderCode || '')) ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Bỏ chọn tất cả</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Chọn tất cả ({filteredOrders.length})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tìm kiếm & Tabs lọc trạng thái */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã đơn (DH...), tên đại lý..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-8.5 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`h-7 px-2.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('APPROVED')}
                    className={`h-7 px-2.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      statusFilter === 'APPROVED'
                        ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Đã duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PROCESSING')}
                    className={`h-7 px-2.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      statusFilter === 'PROCESSING'
                        ? 'bg-white text-purple-700 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Đang soạn
                  </button>
                </div>
              </div>

              {/* Danh sách thẻ đơn hàng */}
              <div className="border border-slate-200/90 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                {loading ? (
                  <div className="p-10 text-center text-xs text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Đang nạp danh sách đơn hàng...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-500 space-y-1">
                    <Package className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-700">Không tìm thấy đơn hàng nào</p>
                  </div>
                ) : (
                  filteredOrders.map((ord) => {
                    const ordId = ord.id || ord.orderCode || '';
                    const isSelected = selectedOrderIds.includes(ordId);
                    const lineCount = ord.lines?.length || 0;
                    const isApproved = ord.status === 'APPROVED';

                    return (
                      <div
                        key={ordId}
                        onClick={() => handleToggleOrder(ordId)}
                        className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-indigo-50/60 hover:bg-indigo-50/80 border-l-3 border-indigo-600'
                            : 'hover:bg-slate-50 bg-white'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {ord.orderCode}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                  isApproved
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : ord.status === 'PROCESSING'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : ord.status === 'PENDING'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {isApproved
                                  ? 'Đã duyệt'
                                  : ord.status === 'PROCESSING'
                                  ? 'Đang soạn'
                                  : ord.status === 'PENDING'
                                  ? 'Chờ duyệt'
                                  : ord.status === 'PENDING_APPROVAL'
                                  ? 'Chờ duyệt hạn mức'
                                  : ord.status === 'DISPATCHED' || ord.status === 'PACKED'
                                  ? 'Đã xuất kho'
                                  : ord.status === 'SHIPPED'
                                  ? 'Đang giao'
                                  : ord.status === 'DELIVERED'
                                  ? 'Giao thành công'
                                  : ord.status === 'CANCELLED'
                                  ? 'Đã hủy'
                                  : 'Chờ duyệt'}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-slate-800">
                              {(ord.grandTotal || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                            {ord.customerName}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Giao: {ord.deliveryDate || 'Trong ngày'}
                            </span>
                            <span>•</span>
                            <span>{lineCount} mặt hàng</span>
                          </div>

                          {ord.lines && ord.lines.length > 0 && (
                            <div className="mt-1.5 text-[11px] text-slate-600 bg-slate-50/80 px-2 py-1 rounded border border-slate-100 truncate">
                              {ord.lines.map((l) => `${l.productName} (${l.quantity} ${l.unit})`).join(' • ')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* CỘT PHẢI (5 CỘT): ĐIỀU KHIỂN & XEM TRƯỚC GỘP */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Chọn kho */}
              <div>
                <span className="text-xs font-bold text-slate-800 block mb-1.5">
                  2. Kho xuất hàng phụ trách <span className="text-rose-500">*</span>
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {STANDARD_WAREHOUSES.map((wh) => {
                    const isSelected = selectedWarehouseId === wh.id;
                    return (
                      <button
                        key={wh.id}
                        type="button"
                        onClick={() => setSelectedWarehouseId(wh.id)}
                        className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold ring-1.5 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span className="text-xs truncate">{wh.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                          {wh.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thống kê gom hàng */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/90 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Tổng quan gom hàng
                </span>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Đơn gộp</span>
                    <span className="text-base font-bold text-indigo-700 font-mono">
                      {selectedOrderIds.length}
                    </span>
                  </div>

                  <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Số SKU</span>
                    <span className="text-base font-bold text-emerald-700 font-mono">
                      {aggregatedItems.length}
                    </span>
                  </div>

                  <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">Tổng số lượng</span>
                    <span className="text-base font-bold text-sky-700 font-mono">
                      {totalQuantity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bản xem trước mặt hàng sau khi gộp */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    3. Mặt hàng sau khi gộp ({aggregatedItems.length} SKU)
                  </span>
                  <span className="text-[10px] text-slate-400">Tự động cộng dồn</span>
                </div>

                <div className="border border-slate-200/90 rounded-xl divide-y divide-slate-100 max-h-[180px] overflow-y-auto">
                  {aggregatedItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Chưa có đơn hàng nào được chọn
                    </div>
                  ) : (
                    aggregatedItems.map((item, idx) => (
                      <div key={item.productSku} className="p-2.5 text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 truncate" title={item.productName}>
                            #{idx + 1} {item.productName}
                          </p>
                          <span className="text-[10px] text-indigo-600 block truncate">
                            Gộp từ {item.sources.length} đơn: {item.sources.map((s) => `${s.orderCode} (${s.quantity})`).join(', ')}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.totalQuantity} {item.unit}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ghi chú lượt soạn (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="VD: Gộp 2 đơn giao buổi sáng khu vực Quận 3..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                />
              </div>

              {/* Nút submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || selectedOrderIds.length === 0}
                  className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang tạo phiếu soạn...</span>
                    </>
                  ) : (
                    <>
                      <span>Xác nhận Gộp & Bắt đầu soạn hàng</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
