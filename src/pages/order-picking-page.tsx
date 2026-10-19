import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { orderPickingService } from '../services/order-picking.service';
import type {
  PickingItemStatus,
  PickingLineItem,
  PickingSheet,
  ShortPickReasonCode,
} from '../types/order-picking.types';
import { PickingLineItemCard } from '../components/picking/picking-line-item-card';
import { ShortPickReasonModal } from '../components/picking/short-pick-reason-modal';
import { FefoBatchSelectorModal } from '../components/picking/fefo-batch-selector-modal';
import { fefoPickingService } from '../services/fefo-picking.service';
import type { SelectedBatchAllocation } from '../types/fefo-picking.types';
import { showToast } from '../components/toast';

export const OrderPickingPage: React.FC = () => {
  // Danh sách phiếu soạn hàng
  const [sheets, setSheets] = useState<PickingSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bộ lọc dòng hàng trong phiếu đang mở
  const [itemStatusFilter, setItemStatusFilter] = useState<'ALL' | PickingItemStatus>('ALL');
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  // Modal báo lý do soạn thiếu
  const [reasonModalItem, setReasonModalItem] = useState<{
    item: PickingLineItem;
    pickedQuantity: number;
  } | null>(null);
  const [fefoModalItem, setFefoModalItem] = useState<PickingLineItem | null>(null);

  // Tải danh sách phiếu soạn hàng
  const loadSheets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await orderPickingService.getPickingSheets();
      setSheets(data);
      if (data.length > 0 && !activeSheetId) {
        // Mặc định mở phiếu đang trong tiến trình (IN_PROGRESS) đầu tiên hoặc phiếu mới nhất
        const inProgress = data.find((s) => s.status === 'IN_PROGRESS');
        setActiveSheetId(inProgress ? inProgress.id : data[0].id);
      }
    } catch {
      showToast('error', 'Không thể tải danh sách phiếu soạn hàng');
    } finally {
      setLoading(false);
    }
  }, [activeSheetId]);

  useEffect(() => {
    loadSheets();
  }, [loadSheets]);

  // Phiếu soạn hàng đang được chọn làm việc
  const activeSheet = useMemo(() => {
    return sheets.find((s) => s.id === activeSheetId) || null;
  }, [sheets, activeSheetId]);

  // Danh sách dòng hàng đã lọc theo tìm kiếm và trạng thái
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
      showToast('success', 'Đã đánh dấu soạn đủ số lượng');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật dòng hàng';
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
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật dòng hàng';
      showToast('error', msg);
    }
  };

  // Cập nhật số lượng trực tiếp
  const handleUpdateQuantityDirect = async (itemId: string, pickedQty: number) => {
    if (!activeSheet) return;
    try {
      const updatedSheet = await orderPickingService.updateLineItem(activeSheet.id, itemId, {
        pickedQuantity: pickedQty,
      });
      setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật số lượng';
      showToast('error', msg);
    }
  };

  // Xác nhận phân bổ lô theo FEFO (SN-187) và trừ tồn kho các lô đã chọn (Tiêu chí 3)
  const handleConfirmFefoBatches = async (
    selectedBatches: SelectedBatchAllocation[],
    isOverride: boolean,
    overrideReason?: string,
    overrideReasonCode?: string,
  ) => {
    if (!activeSheet || !fefoModalItem) return;
    try {
      // 1. Cập nhật phân bổ lô vào dòng hàng của phiếu soạn
      const updatedSheet = await orderPickingService.updateLineItemBatches(
        activeSheet.id,
        fefoModalItem.id,
        selectedBatches,
        isOverride,
        overrideReason,
        overrideReasonCode,
      );
      setSheets((prev) => prev.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)));

      // 2. Tiêu chí 3: Gọi API / Service trừ tồn của các lô đã chọn
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
      showToast(
        'success',
        completed.status === 'COMPLETED'
          ? 'Chúc mừng! Đã hoàn tất 100% lượt soạn hàng'
          : 'Đã hoàn tất lượt soạn hàng (có ghi nhận mặt hàng thiếu)',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chưa thể hoàn tất phiếu soạn';
      showToast('error', msg);
    }
  };

  // In phiếu soạn hàng cho thủ kho
  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24 sm:pb-12 text-slate-900">
      {/* ── NỘI DUNG CHÍNH (PRINT:HIDDEN ĐỂ KHÔNG BỊ TRỘN LẪN GIAO DIỆN KHI IN) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4 print:hidden">
        {/* A. Thanh điều khiển trên cùng: Bộ chọn lượt soạn + Nút thao tác (In phiếu, Tạo mới) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          {/* Bộ chọn phiếu soạn hàng */}
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
                  className={`h-[38px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span>{sheet.sheetCode}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
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

          {/* Cặp nút hành động: In phiếu & Tạo phiếu soạn mới (Chuyển trang chuyên biệt) */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handlePrintSheet}
              className="h-[38px] px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="In phiếu soạn hàng A4 cho thủ kho"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>In phiếu</span>
            </button>
            <Link
              to="/warehouse/picking/create"
              className="h-[38px] px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              title="Chuyển đến trang tạo phiếu soạn hàng mới"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo phiếu soạn mới</span>
            </Link>
          </div>
        </div>

        {/* B. Nếu không có phiếu nào */}
        {!activeSheet && !loading && (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Chưa có phiếu soạn hàng nào</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy tạo phiếu soạn hàng từ các đơn đã duyệt để hệ thống gom hàng và sắp xếp lộ trình đi lại trong kho tối ưu nhất.
            </p>
            <Link
              to="/warehouse/picking/create"
              className="mt-2 h-[38px] px-4 rounded-lg bg-indigo-600 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tạo phiếu soạn đầu tiên
            </Link>
          </div>
        )}

        {/* C. Thẻ Thông tin tóm tắt & Thanh tiến độ của Phiếu đang mở */}
        {activeSheet && (
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
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {activeSheet.warehouseName}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    Gộp {activeSheet.orderCount} đơn: {activeSheet.sourceOrderCodes.join(', ')}
                  </span>
                  <span>•</span>
                  <span>Người soạn: <strong>{activeSheet.pickerName}</strong></span>
                </div>
              </div>

              {/* Nút Hoàn tất Desktop */}
              <button
                type="button"
                onClick={handleCompletePickingSheet}
                disabled={activeSheet.status === 'COMPLETED' || activeSheet.status === 'PARTIALLY_COMPLETED'}
                className="hidden sm:inline-flex h-[38px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Hoàn tất lượt soạn
              </button>
            </div>

            {/* Thanh tiến độ chuẩn hóa màu sắc (Solid Blue/Green, không gradient lòe loẹt) */}
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
        )}

        {/* D. Thanh tìm kiếm & Dropdown bộ lọc gộp cùng 1 hàng ngang */}
        {activeSheet && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Bộ lọc trạng thái dạng Dropdown Select */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  id="item-status-filter"
                  value={itemStatusFilter}
                  onChange={(e) => setItemStatusFilter(e.target.value as 'ALL' | PickingItemStatus)}
                  className="h-[38px] pl-8 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">Tất cả trạng thái ({activeSheet.items.length})</option>
                  <option value="PENDING">Chưa soạn ({activeSheet.items.filter((i) => i.status === 'PENDING').length})</option>
                  <option value="PICKED">Đã xong ({activeSheet.items.filter((i) => i.status === 'PICKED').length})</option>
                  <option value="SHORT_PICKED">Soạn thiếu ({activeSheet.items.filter((i) => i.status === 'SHORT_PICKED').length})</option>
                </select>
              </div>
            </div>

            {/* Input tìm kiếm mặt hàng (Cùng hàng ngang h-[38px]) */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã SKU, tên SP, vị trí kệ..."
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                className="w-full h-[38px] pl-9 pr-8 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-colors"
              />
              {itemSearchTerm && (
                <button
                  type="button"
                  onClick={() => setItemSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* E. Danh sách các thẻ dòng hàng theo thứ tự đường đi tối ưu */}
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

      {/* ── 3. STICKY BOTTOM BAR TRÊN MOBILE (TỐI ƯU CẦM ĐIỆN THOẠI 1 TAY) ── */}
      {activeSheet && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:hidden shadow-lg flex items-center justify-between gap-3 print:hidden">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Tiến độ: {progressStats.percent}%</span>
              <span>{progressStats.pickedLines}/{progressStats.totalLines} dòng</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progressStats.percent === 100 ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}
                style={{ width: `${progressStats.percent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCompletePickingSheet}
            disabled={activeSheet.status === 'COMPLETED' || activeSheet.status === 'PARTIALLY_COMPLETED'}
            className="h-[38px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 whitespace-nowrap cursor-pointer shrink-0"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Hoàn tất lượt
          </button>
        </div>
      )}

      {/* ── 4. PHIẾU IN SOẠN HÀNG CHUẨN A4 ĐEN TRẮNG CHO THỦ KHO (PRINT:BLOCK) ── */}
      {activeSheet && (
        <div id="picking-print-document" className="hidden print:block p-6 text-black bg-white">
          {/* Header phiếu in */}
          <div className="border-b-2 border-black pb-3 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-lg font-black tracking-tight uppercase">
                  LOHA SALES - HỆ THỐNG QUẢN LÝ KHO & BÁN HÀNG
                </h1>
                <p className="text-xs text-gray-700 mt-0.5">
                  Kho hàng: <strong>{activeSheet.warehouseName}</strong>
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-black">{activeSheet.sheetCode}</div>
                <p className="text-[11px] text-gray-600">
                  Ngày in: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-gray-300 grid grid-cols-3 gap-2 text-xs">
              <div>
                Người soạn: <strong>{activeSheet.pickerName}</strong>
              </div>
              <div>
                Gộp <strong>{activeSheet.orderCount} đơn</strong>: {activeSheet.sourceOrderCodes.join(', ')}
              </div>
              <div className="text-right">
                Tổng cộng: <strong>{activeSheet.items.length} dòng</strong> ({progressStats.totalQty} món)
              </div>
            </div>
          </div>

          {/* Tiêu đề phiếu */}
          <div className="text-center my-4">
            <h2 className="text-base font-black uppercase tracking-wider">
              PHIẾU SOẠN HÀNG THEO VỊ TRÍ
            </h2>
            <p className="text-[11px] text-gray-600 italic mt-0.5">
              * Thứ tự sắp xếp theo lộ trình di chuyển một chiều (S-Shape) tối ưu trong kho
            </p>
          </div>

          {/* Bảng danh sách sản phẩm theo thứ tự đường đi */}
          <table className="w-full text-xs border-collapse border border-black mb-6">
            <thead>
              <tr className="bg-gray-100 text-center font-bold">
                <th className="border border-black p-2 w-10">Bước</th>
                <th className="border border-black p-2 w-10">[✓]</th>
                <th className="border border-black p-2 text-left w-36">Vị trí kệ kho</th>
                <th className="border border-black p-2 text-left w-28">Mã SKU</th>
                <th className="border border-black p-2 text-left">Tên sản phẩm</th>
                <th className="border border-black p-2 text-center w-16">SL cần</th>
                <th className="border border-black p-2 text-center w-16">SL nhặt</th>
                <th className="border border-black p-2 text-left w-36">Đơn phân bổ</th>
              </tr>
            </thead>
            <tbody>
              {activeSheet.items.map((item, index) => (
                <tr key={item.id} className="border border-black">
                  <td className="border border-black p-2 text-center font-mono font-bold">
                    #{item.stepNumber || index + 1}
                  </td>
                  <td className="border border-black p-2 text-center">
                    <div className="w-4 h-4 border border-black mx-auto" />
                  </td>
                  <td className="border border-black p-2 font-mono font-bold">
                    {item.location.formattedCode}
                    <div className="text-[10px] font-normal text-gray-700">
                      Khu {item.location.zone} - Kệ {item.location.rack}
                    </div>
                  </td>
                  <td className="border border-black p-2 font-mono font-semibold">
                    {item.productSku}
                  </td>
                  <td className="border border-black p-2">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    {item.category && (
                      <span className="text-[10px] text-gray-600">Nhóm: {item.category}</span>
                    )}
                  </td>
                  <td className="border border-black p-2 text-center font-bold font-mono text-sm">
                    {item.totalRequiredQuantity} {item.unit}
                  </td>
                  <td className="border border-black p-2 text-center font-mono">
                    {/* Ô trống để nhân viên kho tích hoặc ghi số lượng thực nhặt bằng bút */}
                  </td>
                  <td className="border border-black p-2 text-[10px] text-gray-700">
                    {item.orders.map((o) => `${o.orderCode} (${o.requiredQuantity})`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Chữ ký xác nhận 3 bên */}
          <div className="grid grid-cols-3 gap-4 text-center text-xs mt-8 pt-4">
            <div>
              <p className="font-bold">Người soạn hàng</p>
              <p className="text-[10px] text-gray-500 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="font-semibold">{activeSheet.pickerName}</p>
            </div>
            <div>
              <p className="font-bold">Nhân viên kiểm tra & đóng gói</p>
              <p className="text-[10px] text-gray-500 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
            </div>
            <div>
              <p className="font-bold">Thủ kho / Quản lý kho</p>
              <p className="text-[10px] text-gray-500 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
            </div>
          </div>
        </div>
      )}

      {/* ── 5. MODAL BÁO THIẾU KHO ── */}
      <ShortPickReasonModal
        isOpen={Boolean(reasonModalItem)}
        item={reasonModalItem?.item || null}
        currentPickedQuantity={reasonModalItem?.pickedQuantity || 0}
        onClose={() => setReasonModalItem(null)}
        onConfirm={handleConfirmShortPick}
      />

      <FefoBatchSelectorModal
        isOpen={Boolean(fefoModalItem)}
        warehouseId={activeSheet?.warehouseId || 'wh-main-01'}
        productId={fefoModalItem?.productId || ''}
        productName={fefoModalItem?.productName || ''}
        productSku={fefoModalItem?.productSku || ''}
        unit={fefoModalItem?.unit || 'hộp'}
        requiredQuantity={fefoModalItem?.totalRequiredQuantity || 0}
        currentAllocations={fefoModalItem?.selectedBatches || []}
        onClose={() => setFefoModalItem(null)}
        onConfirm={handleConfirmFefoBatches}
      />
    </div>
  );
};
