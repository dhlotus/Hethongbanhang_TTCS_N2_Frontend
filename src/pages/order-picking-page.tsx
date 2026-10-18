import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Plus,
  Printer,
  Search,
  Check,
  Building2,
  Layers,
  Filter,
  X,
  Calendar,
  CheckSquare,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { orderPickingService } from '../services/order-picking.service';
import type {
  PickingItemStatus,
  PickingLineItem,
  PickingSheet,
  ShortPickReasonCode,
} from '../types/order-picking.types';
import type { Order } from '../types/order';
import { PickingLineItemCard } from '../components/picking/picking-line-item-card';
import { ShortPickReasonModal } from '../components/picking/short-pick-reason-modal';
import { FefoBatchSelectorModal } from '../components/picking/fefo-batch-selector-modal';
import { CreatePickingSheetModal } from '../components/picking/create-picking-sheet-modal';
import { fefoPickingService } from '../services/fefo-picking.service';
import type { SelectedBatchAllocation } from '../types/fefo-picking.types';
import { showToast } from '../components/toast';

type ActiveViewTab = 'ALL_ORDERS' | 'PICKING_SHEETS';

/**
 * Trang Quản lý Phiếu Soạn Hàng (Wave / Batch Picking)
 * Hiển thị đầy đủ các đơn hàng từ Quản lý đơn hàng, hỗ trợ gom gộp đơn thông minh
 */
export const OrderPickingPage: React.FC = () => {
  // Chế độ xem: 'ALL_ORDERS' (Đơn hàng từ QL Đơn hàng) | 'PICKING_SHEETS' (Lượt soạn hàng thực tế)
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('ALL_ORDERS');

  // Danh sách đơn hàng từ Quản lý đơn hàng
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Danh sách phiếu soạn hàng
  const [sheets, setSheets] = useState<PickingSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(true);

  // Bộ lọc dòng hàng trong phiếu đang mở
  const [itemStatusFilter, setItemStatusFilter] = useState<'ALL' | PickingItemStatus>('ALL');
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  // Modal gộp đơn hàng mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Modal báo lý do soạn thiếu & FEFO
  const [reasonModalItem, setReasonModalItem] = useState<{
    item: PickingLineItem;
    pickedQuantity: number;
  } | null>(null);
  const [fefoModalItem, setFefoModalItem] = useState<PickingLineItem | null>(null);

  // 1. Tải toàn bộ đơn hàng từ Quản lý đơn hàng
  const loadAllOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const data = await orderPickingService.getAllOrders();
      setAllOrders(data);
    } catch {
      showToast('error', 'Không thể tải danh sách đơn hàng');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // 2. Tải danh sách phiếu soạn hàng
  const loadSheets = useCallback(async () => {
    try {
      setSheetsLoading(true);
      const data = await orderPickingService.getPickingSheets();
      setSheets(data);
      if (data.length > 0 && !activeSheetId) {
        const inProgress = data.find((s) => s.status === 'IN_PROGRESS');
        setActiveSheetId(inProgress ? inProgress.id : data[0].id);
      }
    } catch {
      showToast('error', 'Không thể tải danh sách phiếu soạn hàng');
    } finally {
      setSheetsLoading(false);
    }
  }, [activeSheetId]);

  useEffect(() => {
    loadAllOrders();
    loadSheets();
  }, [loadAllOrders, loadSheets]);

  // Phiếu soạn hàng đang được chọn làm việc
  const activeSheet = useMemo(() => {
    return sheets.find((s) => s.id === activeSheetId) || null;
  }, [sheets, activeSheetId]);

  // Bộ lọc danh sách đơn hàng theo ô tìm kiếm
  const filteredOrders = useMemo(() => {
    return allOrders.filter((ord) => {
      if (orderSearchTerm.trim()) {
        const q = orderSearchTerm.toLowerCase().trim();
        const matchCode = ord.orderCode?.toLowerCase().includes(q);
        const matchCust = ord.customerName?.toLowerCase().includes(q);
        const matchRep = ord.salesRepName?.toLowerCase().includes(q);
        if (!matchCode && !matchCust && !matchRep) return false;
      }

      return true;
    });
  }, [allOrders, orderSearchTerm]);

  // Chọn / Bỏ chọn từng đơn hàng
  const handleToggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    );
  };

  // Chọn tất cả đơn hợp lệ
  const handleSelectAllOrders = () => {
    const selectable = filteredOrders
      .filter((o) => o.status === 'APPROVED' || o.status === 'PROCESSING' || o.status === 'PENDING')
      .map((o) => o.id || o.orderCode || '')
      .filter(Boolean);

    const allSelected = selectable.every((id) => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !selectable.includes(id)));
    } else {
      setSelectedOrderIds(Array.from(new Set([...selectedOrderIds, ...selectable])));
    }
  };

  // Mở modal gộp đơn với các đơn đã chọn
  const handleOpenGroupModal = () => {
    setIsCreateModalOpen(true);
  };

  // Xử lý tạo phiếu soạn thành công từ modal
  const handleSheetCreatedSuccess = async (sheetId: string) => {
    await loadSheets();
    await loadAllOrders();
    setActiveSheetId(sheetId);
    setActiveTab('PICKING_SHEETS');
    setSelectedOrderIds([]);
  };

  // Danh sách dòng hàng đã lọc trong phiếu soạn
  const filteredItems = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.items.filter((item) => {
      const matchStatus = itemStatusFilter === 'ALL' || item.status === itemStatusFilter;
      const q = itemSearchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.productSku.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.location.formattedCode.toLowerCase().includes(q) ||
        item.location.zone.toLowerCase().includes(q) ||
        item.location.aisle.toLowerCase().includes(q) ||
        item.location.rack.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [activeSheet, itemStatusFilter, itemSearchTerm]);

  // Thống kê tiến độ phiếu soạn hiện tại
  const progressStats = useMemo(() => {
    if (!activeSheet) return { percent: 0, pickedLines: 0, totalLines: 0, pickedQty: 0, totalQty: 0 };
    const totalLines = activeSheet.items.length;
    const pickedLines = activeSheet.items.filter((i) => i.status !== 'PENDING').length;
    const percent = totalLines > 0 ? Math.round((pickedLines / totalLines) * 100) : 0;
    const totalQty = activeSheet.items.reduce((s, i) => s + i.totalRequiredQuantity, 0);
    const pickedQty = activeSheet.items.reduce((s, i) => s + i.totalPickedQuantity, 0);

    return { percent, pickedLines, totalLines, pickedQty, totalQty };
  }, [activeSheet]);

  // Xử lý 1-chạm Soạn đủ toàn bộ
  const handleQuickPickAll = async (itemId: string) => {
    if (!activeSheet) return;
    try {
      const updatedSheet = await orderPickingService.quickPickAllItem(activeSheet.id, itemId);
      setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));
      await loadAllOrders();
      showToast('success', 'Đã đánh dấu soạn đủ số lượng');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật dòng hàng';
      showToast('error', msg);
    }
  };

  // Cập nhật số lượng trực tiếp từ ô nhập hoặc nút +/-
  const handleUpdateQuantityDirect = async (itemId: string, pickedQty: number) => {
    if (!activeSheet) return;
    try {
      const updatedSheet = await orderPickingService.updateLineItem(activeSheet.id, itemId, {
        pickedQuantity: pickedQty,
      });
      setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));
      await loadAllOrders();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật số lượng';
      showToast('error', msg);
    }
  };

  // Mở modal yêu cầu nhập lý do soạn thiếu
  const handleRequestShortPickReason = (item: PickingLineItem, pickedQty: number) => {
    setReasonModalItem({ item, pickedQuantity: pickedQty });
  };

  // Xác nhận lưu lý do soạn thiếu từ modal
  const handleConfirmShortPick = async (
    pickedQuantity: number,
    reasonText: string,
    reasonCode: ShortPickReasonCode,
    notes?: string,
  ) => {
    if (!activeSheet || !reasonModalItem) return;
    try {
      const updatedSheet = await orderPickingService.updateLineItem(
        activeSheet.id,
        reasonModalItem.item.id,
        {
          pickedQuantity,
          shortPickReason: reasonText,
          shortPickReasonCode: reasonCode,
          notes,
        },
      );
      setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));
      showToast('success', `Đã ghi nhận soạn thiếu: ${reasonText}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật số lượng';
      showToast('error', msg);
    }
  };

  // Xác nhận phân bổ lô theo FEFO (SN-187)
  const handleConfirmFefoBatches = async (
    selectedBatches: SelectedBatchAllocation[],
    isOverride: boolean,
    overrideReason?: string,
    overrideReasonCode?: string,
  ) => {
    if (!activeSheet || !fefoModalItem) return;
    try {
      const updatedSheet = await orderPickingService.updateLineItemBatches(
        activeSheet.id,
        fefoModalItem.id,
        selectedBatches,
        isOverride,
        overrideReason,
        overrideReasonCode,
      );
      setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));

      await fefoPickingService.confirmFefoDispatch({
        orderId: activeSheet.sourceOrderIds[0],
        warehouseId: activeSheet.warehouseId,
        productId: fefoModalItem.productId,
        selectedBatches,
        isOverride,
        overrideReason,
        overrideReasonCode,
        notes: `Xuất kho theo phiếu soạn ${activeSheet.sheetCode}`,
      });

      showToast(
        'success',
        isOverride
          ? 'Đã ghi nhận lý do chọn lô khác FEFO và trừ tồn lô xuất thành công!'
          : 'Đã phân bổ lô theo đề xuất FEFO và trừ tồn lô xuất thành công!',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi lưu thông tin lô xuất';
      showToast('error', msg);
    } finally {
      setFefoModalItem(null);
    }
  };

  // Hoàn tất lượt soạn hàng
  const handleCompletePickingSheet = async () => {
    if (!activeSheet) return;
    try {
      const completed = await orderPickingService.completePickingSheet(activeSheet.id);
      setSheets((prev) => prev.map((s) => (s.id === completed.id ? completed : s)));
      await loadAllOrders();
      showToast(
        'success',
        `Hoàn tất soạn đủ! Đã chuyển ${activeSheet.orderCount} đơn gộp (${activeSheet.sourceOrderCodes.join(', ')}) sang "Chờ duyệt"!`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chưa thể hoàn tất phiếu soạn';
      showToast('error', msg);
    }
  };

  // In phiếu soạn
  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 sm:pb-12 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 print:hidden">
        {/* ── 1. PAGE HEADER & CÁC NÚT THAO TÁC ── */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Phiếu soạn hàng
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi toàn bộ đơn hàng cần xuất kho, gộp nhiều đơn theo đợt và nhặt hàng theo vị trí kệ.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadAllOrders();
                loadSheets();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={ordersLoading || sheetsLoading ? 'animate-spin text-indigo-600' : ''} />
              <span>Làm mới</span>
            </button>

            {activeTab === 'PICKING_SHEETS' && activeSheet && (
              <button
                type="button"
                onClick={handlePrintSheet}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                <Printer size={14} className="text-slate-500" />
                <span>In phiếu A4</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenGroupModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Gộp đơn soạn mới</span>
            </button>
          </div>
        </header>

        {/* ── 2. TABS CHUYỂN ĐỔI CHÍNH ── */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('ALL_ORDERS');
                loadAllOrders();
              }}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ALL_ORDERS'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag size={15} />
              <span>1. Đơn hàng từ QL đơn hàng</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'ALL_ORDERS'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {allOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PICKING_SHEETS')}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'PICKING_SHEETS'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers size={15} />
              <span>2. Lượt soạn hàng</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'PICKING_SHEETS'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {sheets.length}
              </span>
            </button>
          </div>
        </div>

        {/* ── 3. NỘI DUNG THEO TAB ── */}
        {activeTab === 'ALL_ORDERS' ? (
          /* ──────── TAB 1: HIỂN THỊ ĐẦY ĐỦ CÁC ĐƠN HÀNG TRONG QUẢN LÝ ĐƠN HÀNG ──────── */
          <div className="space-y-3">
            {/* Thanh tìm kiếm & Nút chọn nhanh */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Ô tìm kiếm */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã đơn hàng (DH...), tên khách hàng, đại lý..."
                  value={orderSearchTerm}
                  onChange={(e) => setOrderSearchTerm(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1.5 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                />
                {orderSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setOrderSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSelectAllOrders}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1 shrink-0 self-end sm:self-center"
              >
                <CheckSquare size={13} />
                <span>Chọn các đơn sẵn sàng soạn</span>
              </button>
            </div>

            {/* Thanh nổi bật khi có đơn được tích chọn để Gộp đơn */}
            {selectedOrderIds.length > 0 && (
              <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {selectedOrderIds.length}
                  </span>
                  <span>Đã chọn {selectedOrderIds.length} đơn hàng sẵn sàng để gộp soạn</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderIds([])}
                    className="px-2.5 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Bỏ chọn
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenGroupModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <span>⚡ Gộp {selectedOrderIds.length} đơn vào phiếu soạn</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Bảng danh sách đơn hàng đầy đủ chuẩn WMS */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-10">Chọn</th>
                      <th className="py-2.5 px-3">Mã đơn</th>
                      <th className="py-2.5 px-3">Khách hàng / Đại lý</th>
                      <th className="py-2.5 px-3">Ngày giao dự kiến</th>
                      <th className="py-2.5 px-3 text-right">Tổng phải thu</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ordersLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                          Đang tải dữ liệu đơn hàng...
                        </td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          Không tìm thấy đơn hàng nào khớp với bộ lọc
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => {
                        const ordId = ord.id || ord.orderCode || '';
                        const isSelected = selectedOrderIds.includes(ordId);
                        const isApproved = ord.status === 'APPROVED';
                        const isProcessing = ord.status === 'PROCESSING';

                        return (
                          <tr
                            key={ordId}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isSelected ? 'bg-indigo-50/50' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleOrder(ordId)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>

                            {/* Mã đơn */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {ord.orderCode}
                              </span>
                            </td>

                            {/* Khách hàng / Đại lý */}
                            <td className="py-2.5 px-3 max-w-[240px]">
                              <div className="font-semibold text-slate-800 truncate" title={ord.customerName}>
                                {ord.customerName}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {ord.deliveryPoint?.name || ord.deliveryPoint?.address || 'Điểm giao kho chính'}
                              </div>
                            </td>

                            {/* Ngày giao */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                              <div className="flex items-center gap-1 text-[11px]">
                                <Calendar size={12} className="text-slate-400" />
                                <span>{ord.deliveryDate || 'Trong ngày'}</span>
                              </div>
                            </td>

                            {/* Tổng tiền */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                              {(ord.grandTotal || 0).toLocaleString('vi-VN')} đ
                            </td>

                            {/* Trạng thái */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  isApproved
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isProcessing
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : ord.status === 'PENDING'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : ord.status === 'PENDING_APPROVAL'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : ord.status === 'PENDING_INVENTORY_APPROVAL'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : ord.status === 'DISPATCHED' || ord.status === 'PACKED'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : ord.status === 'SHIPPED'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : ord.status === 'DELIVERED'
                                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                                    : ord.status === 'CANCELLED'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {isApproved
                                  ? 'Đã duyệt'
                                  : isProcessing
                                  ? 'Đang soạn'
                                  : ord.status === 'PENDING'
                                  ? 'Chờ duyệt'
                                  : ord.status === 'PENDING_APPROVAL'
                                  ? 'Chờ duyệt hạn mức'
                                  : ord.status === 'PENDING_INVENTORY_APPROVAL'
                                  ? 'Chờ duyệt tồn kho'
                                  : ord.status === 'DISPATCHED' || ord.status === 'PACKED'
                                  ? 'Đã xuất kho'
                                  : ord.status === 'SHIPPED'
                                  ? 'Đang giao'
                                  : ord.status === 'DELIVERED'
                                  ? 'Giao thành công'
                                  : ord.status === 'CANCELLED'
                                  ? 'Đã hủy'
                                  : ord.status === 'DRAFT'
                                  ? 'Nháp'
                                  : 'Chờ duyệt'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ──────── TAB 2: LƯỢT SOẠN HÀNG THỰC TẾ (WAVE PICKING) ──────── */
          <div className="space-y-4">
            {/* Bộ chọn lượt soạn */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                  <Layers className="w-3.5 h-3.5" />
                  Lượt soạn:
                </span>
                {sheets.map((sheet) => {
                  const isActive = sheet.id === activeSheetId;
                  const isDone = sheet.status === 'COMPLETED' || sheet.status === 'PARTIALLY_COMPLETED';
                  return (
                    <button
                      key={sheet.id}
                      type="button"
                      onClick={() => setActiveSheetId(sheet.id)}
                      className={`h-[36px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                        isActive
                          ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span>{sheet.sheetCode}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isActive
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sheet.orderCount} đơn
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thông tin tóm tắt & Thanh tiến độ của Phiếu đang mở */}
            {activeSheet ? (
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base sm:text-lg font-extrabold text-slate-900">
                        {activeSheet.sheetCode}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          activeSheet.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : activeSheet.status === 'PARTIALLY_COMPLETED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {activeSheet.status === 'COMPLETED'
                          ? 'Đã hoàn tất 100%'
                          : activeSheet.status === 'PARTIALLY_COMPLETED'
                          ? 'Hoàn tất (Thiếu hàng)'
                          : 'Đang soạn hàng'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {activeSheet.warehouseName}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150">
                        Gộp {activeSheet.orderCount} đơn: {activeSheet.sourceOrderCodes.join(', ')}
                      </span>
                      <span>•</span>
                      <span>Người soạn: <strong>{activeSheet.pickerName}</strong></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompletePickingSheet}
                    className="inline-flex h-[38px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      {activeSheet.status === 'COMPLETED'
                        ? 'Soạn đủ'
                        : 'Hoàn tất lượt soạn'}
                    </span>
                  </button>
                </div>

                {/* Thanh tiến độ */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <span>Tiến độ nhặt hàng:</span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {progressStats.pickedLines}/{progressStats.totalLines} dòng
                      </strong>
                      <span className="text-slate-400 font-normal">
                        ({progressStats.pickedQty}/{progressStats.totalQty} món)
                      </span>
                    </span>
                    <span className="font-mono font-bold text-indigo-600 text-sm">
                      {progressStats.percent}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        progressStats.percent === 100 ? 'bg-emerald-600' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${progressStats.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                Chưa có phiếu soạn hàng nào được chọn
              </div>
            )}

            {/* Tìm kiếm & Lọc dòng hàng */}
            {activeSheet && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center">
                    <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                    <select
                      id="item-status-filter"
                      value={itemStatusFilter}
                      onChange={(e) => setItemStatusFilter(e.target.value as 'ALL' | PickingItemStatus)}
                      className="h-[36px] pl-8 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
                    >
                      <option value="ALL">Tất cả trạng thái ({activeSheet.items.length})</option>
                      <option value="PENDING">Chưa soạn ({activeSheet.items.filter((i) => i.status === 'PENDING').length})</option>
                      <option value="PICKED">Đã xong ({activeSheet.items.filter((i) => i.status === 'PICKED').length})</option>
                      <option value="SHORT_PICKED">Soạn thiếu ({activeSheet.items.filter((i) => i.status === 'SHORT_PICKED').length})</option>
                    </select>
                  </div>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm mã SKU, tên SP, vị trí kệ..."
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    className="w-full h-[36px] pl-9 pr-8 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-colors"
                  />
                  {itemSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setItemSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Danh sách các thẻ dòng hàng nhặt */}
            {activeSheet && (
              <div className="space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                    Không tìm thấy dòng hàng nào phù hợp với bộ lọc
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <PickingLineItemCard
                      key={item.id}
                      item={item}
                      onQuickPickAll={handleQuickPickAll}
                      onRequestShortPickReason={handleRequestShortPickReason}
                      onUpdateQuantityDirect={handleUpdateQuantityDirect}
                      onOpenFefoSelector={(it) => setFefoModalItem(it)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL GỘP ĐƠN HÀNG MỚI (WAVE PICKING) ── */}
      <CreatePickingSheetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleSheetCreatedSuccess}
        preSelectedOrderIds={selectedOrderIds}
      />

      {/* Modal nhập lý do soạn thiếu */}
      {reasonModalItem && (
        <ShortPickReasonModal
          isOpen={Boolean(reasonModalItem)}
          onClose={() => setReasonModalItem(null)}
          onConfirm={handleConfirmShortPick}
          item={reasonModalItem.item}
          currentPickedQuantity={reasonModalItem.pickedQuantity}
        />
      )}

      {/* Modal phân bổ lô theo FEFO */}
      {fefoModalItem && activeSheet && (
        <FefoBatchSelectorModal
          isOpen={Boolean(fefoModalItem)}
          onClose={() => setFefoModalItem(null)}
          onConfirm={handleConfirmFefoBatches}
          productId={fefoModalItem.productId}
          productSku={fefoModalItem.productSku}
          productName={fefoModalItem.productName}
          warehouseId={activeSheet.warehouseId}
          requiredQuantity={fefoModalItem.totalRequiredQuantity}
          unit={fefoModalItem.unit}
        />
      )}
    </div>
  );
};
