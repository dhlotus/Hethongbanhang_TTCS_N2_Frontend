import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckSquare,
  Package,
  PackagePlus,
  Search,
  Square,
  User,
  X,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { orderPickingService } from '../services/order-picking.service';
import { STANDARD_WAREHOUSES } from '../constants/warehouse.constants';
import type { Order } from '../types/order';
import type { CreatePickingSheetPayload } from '../types/order-picking.types';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';

export const CreatePickingSheetPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    STANDARD_WAREHOUSES[2].id, // Mặc định Kho Miền Nam
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = getStoredUser();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('ADMIN');
  const isManager =
    userRoles.includes('WAREHOUSE_MANAGER') ||
    userRoles.includes('WH_MANAGER') ||
    isAdmin;
  const isKeeper =
    !isManager &&
    (userRoles.includes('WAREHOUSE_KEEPER') ||
      userRoles.includes('WAREHOUSE') ||
      userRoles.includes('WH_KEEPER'));

  // Thủ kho bị khóa cố định vào kho công tác được phân công
  useEffect(() => {
    if (isKeeper && user) {
      const rawWh = (user.warehouseId || user.warehouseCode || user.assignedWarehouse || '').toUpperCase();
      const match = STANDARD_WAREHOUSES.find(
        (w) =>
          w.id.toUpperCase() === rawWh ||
          w.code.toUpperCase() === rawWh ||
          w.name.toUpperCase().includes(rawWh),
      );
      if (match) {
        setSelectedWarehouseId(match.id);
      }
    }
  }, [isKeeper, user]);

  // Tải danh sách đơn hàng đã duyệt sẵn sàng soạn
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await orderPickingService.getEligibleOrdersForPicking();
        setOrders(data);
        // Mặc định không tích chọn đơn nào để người dùng tự chọn
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng đã duyệt';
        showToast('error', msg);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Lọc đơn hàng theo từ khóa tìm kiếm
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

  // Chọn / Bỏ chọn từng đơn hàng
  const handleToggleOrder = (orderId: string) => {
    const targetOrder = orders.find((o: any) => (o.id === orderId || o.orderCode === orderId));
    if ((targetOrder as any)?.isCurrentlyPicking) {
      showToast(
        'warning',
        `Đơn hàng ${targetOrder?.orderCode} đang được xử lý trong phiếu ${(targetOrder as any).currentActivePickingSheet}. Vui lòng hoàn tất phiếu đó trước.`,
      );
      return;
    }
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };

  // Chọn / Bỏ chọn tất cả đơn trong danh sách đã lọc (loại trừ các đơn đang soạn)
  const handleSelectAll = () => {
    const pickableOrders = filteredOrders.filter((o: any) => !o.isCurrentlyPicking);
    if (selectedOrderIds.length >= pickableOrders.length && pickableOrders.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(pickableOrders.map((o) => o.id || o.orderCode || '').filter(Boolean));
    }
  };

  // Danh sách chi tiết các đơn được chọn
  const selectedOrdersData = useMemo(() => {
    return orders.filter((o) => selectedOrderIds.includes(o.id || o.orderCode || ''));
  }, [orders, selectedOrderIds]);

  // Thống kê tổng số dòng và số lượng sản phẩm cần nhặt
  const summaryStats = useMemo(() => {
    const totalLines = selectedOrdersData.reduce((sum, o) => sum + (o.lines?.length || 0), 0);
    const totalQuantity = selectedOrdersData.reduce(
      (sum, o) => sum + (o.lines || []).reduce((lSum, l) => lSum + l.quantity, 0),
      0,
    );
    return { totalLines, totalQuantity };
  }, [selectedOrdersData]);

  // Xử lý tạo phiếu soạn hàng
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
      navigate('/warehouse/picking');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo phiếu soạn hàng';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-36 sm:pb-28 text-slate-900">
      {/* ── 1. HEADER & BREADCRUMB ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/warehouse/picking"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Quay lại danh sách phiếu soạn hàng"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>Tạo phiếu soạn hàng (Gộp nhiều đơn)</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. NỘI DUNG FORM ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Khối 1: Chọn kho xuất hàng phụ trách (Gọn gàng, dễ tương tác, không bị cắt chữ) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {STANDARD_WAREHOUSES.map((wh) => {
              const isSelected = selectedWarehouseId === wh.id;
              const isDisabled = isKeeper && selectedWarehouseId !== wh.id;
              const shortName = wh.name.split('(')[0].trim();
              const location = wh.name.match(/\((.*?)\)/)?.[1] || wh.code;

              return (
                <button
                  key={wh.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={`px-3.5 py-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                      : isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-bold text-xs sm:text-sm block text-slate-900 leading-tight">
                      {shortName}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
                      {location}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Khối 2: Danh sách đơn hàng đã duyệt cần gộp soạn */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Chọn đơn hàng cần gom soạn ({selectedOrderIds.length}/{filteredOrders.length} đơn){' '}
                <span className="text-rose-500">*</span>
              </h2>
            </div>

            {/* Thao tác chọn tất cả */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                {selectedOrderIds.length === filteredOrders.length ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Bỏ chọn tất cả</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-slate-400" />
                    <span>Chọn tất cả ({filteredOrders.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Ô tìm kiếm đơn hàng */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn (DH...), khách hàng, NVKD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[38px] pl-9 pr-8 text-xs sm:text-sm bg-slate-50/60 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bảng danh sách đơn hàng dạng Desktop & Cards trên Mobile */}
          <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
                Đang tải danh sách đơn hàng đã duyệt...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                Không tìm thấy đơn hàng nào phù hợp với bộ lọc
              </div>
            ) : (
              <div>
                {/* 1. Giao diện dạng THẺ (Cards) trên Mobile (< 768px) - Hoàn toàn không cuộn ngang */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredOrders.map((ord) => {
                    const ordId = ord.id || ord.orderCode || '';
                    const isSelected = selectedOrderIds.includes(ordId);
                    const isCurrentlyPicking = Boolean((ord as any)?.isCurrentlyPicking);
                    const activeSheetCode = (ord as any)?.currentActivePickingSheet;
                    const lineCount = ord.lines?.length || 0;
                    const totalQty = (ord.lines || []).reduce((s, l) => s + l.quantity, 0);

                    return (
                      <div
                        key={ordId}
                        onClick={() => handleToggleOrder(ordId)}
                        className={`p-3.5 transition-colors ${
                          isCurrentlyPicking
                            ? 'bg-slate-50/70 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-50/60 ring-1 ring-indigo-500/20'
                            : 'bg-white hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isCurrentlyPicking}
                            onChange={() => handleToggleOrder(ordId)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 disabled:opacity-40 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                                {ord.orderCode}
                              </span>
                              {isCurrentlyPicking && (
                                <span className="inline-flex items-center rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                  Đang soạn: {activeSheetCode}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {ord.deliveryDate || '---'}
                              </span>
                            </div>

                            <div>
                              <p className="font-bold text-slate-900 text-xs sm:text-sm leading-snug break-words">
                                {ord.customerName}
                              </p>
                              {ord.deliveryPoint?.name && (
                                <p className="text-[11px] text-slate-500 break-words mt-0.5">
                                  {ord.deliveryPoint.name}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 flex-wrap gap-2 text-slate-600">
                              <span className="font-semibold text-slate-700">
                                {lineCount} dòng • <strong className="text-indigo-600 font-mono">{totalQty}</strong> món
                              </span>
                              {ord.salesRepName && (
                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {ord.salesRepName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Bảng dạng Table trên Desktop (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs text-left divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="w-12 px-4 py-3 text-center">Chọn</th>
                        <th className="px-4 py-3">Mã đơn hàng</th>
                        <th className="px-4 py-3">Khách hàng / Đại lý</th>
                        <th className="px-4 py-3">Ngày giao dự kiến</th>
                        <th className="px-4 py-3 text-center">Số dòng</th>
                        <th className="px-4 py-3 text-center">Tổng SL</th>
                        <th className="px-4 py-3">NVKD phụ trách</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium bg-white">
                      {filteredOrders.map((ord) => {
                        const ordId = ord.id || ord.orderCode || '';
                        const isSelected = selectedOrderIds.includes(ordId);
                        const isCurrentlyPicking = Boolean((ord as any)?.isCurrentlyPicking);
                        const activeSheetCode = (ord as any)?.currentActivePickingSheet;
                        const lineCount = ord.lines?.length || 0;
                        const totalQty = (ord.lines || []).reduce((s, l) => s + l.quantity, 0);

                        return (
                          <tr
                            key={ordId}
                            onClick={() => handleToggleOrder(ordId)}
                            className={`transition-colors ${
                              isCurrentlyPicking
                                ? 'bg-slate-50/70 opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'bg-indigo-50/50 hover:bg-indigo-50/70 cursor-pointer'
                                : 'hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isCurrentlyPicking}
                                onChange={() => handleToggleOrder(ordId)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 disabled:opacity-40 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                                  {ord.orderCode}
                                </span>
                                {isCurrentlyPicking && (
                                  <span className="inline-flex items-center rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                    Đang soạn: {activeSheetCode}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{ord.customerName}</div>
                              {ord.deliveryPoint?.name && (
                                <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                  {ord.deliveryPoint.name}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{ord.deliveryDate || '---'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-700">
                              {lineCount} dòng
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-indigo-600">
                              {totalQty}
                            </td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>{ord.salesRepName || '---'}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Khối 3: Ghi chú thêm cho thủ kho */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Ghi chú điều phối (Tùy chọn)
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Ưu tiên nhặt đơn xe tải chuyến 10h sáng, kiểm tra kỹ thùng hàng yến..."
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── 3. BOTTOM STICKY ACTION BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,18.25rem)] z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium">
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Đã chọn <strong className="text-indigo-700 font-bold">{selectedOrderIds.length}</strong> đơn hàng
              </span>
            </div>
            <span>•</span>
            <span className="font-semibold text-slate-800">
              {summaryStats.totalLines} dòng hàng
            </span>
            <span>•</span>
            <span className="font-mono font-bold text-indigo-600">
              {summaryStats.totalQuantity} sản phẩm
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => navigate('/warehouse/picking')}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial h-10 px-4 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedOrderIds.length === 0}
              className="flex-1 sm:flex-initial h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>Đang tạo phiếu...</span>
              ) : (
                <>
                  <PackagePlus className="w-4 h-4" />
                  <span>Tạo phiếu soạn hàng</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
