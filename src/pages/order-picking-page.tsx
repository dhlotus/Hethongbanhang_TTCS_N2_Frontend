import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Plus,
  Printer,
  Search,
  Check,
  Building2,
  Layers,
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
import { CreatePickingSheetModal } from '../components/picking/create-picking-sheet-modal';
import { showToast } from '../components/toast';

export const OrderPickingPage: React.FC = () => {

  // Danh sách phiếu soạn hàng
  const [sheets, setSheets] = useState<PickingSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bộ lọc dòng hàng trong phiếu đang mở
  const [itemStatusFilter, setItemStatusFilter] = useState<'ALL' | PickingItemStatus>('ALL');
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reasonModalItem, setReasonModalItem] = useState<{
    item: PickingLineItem;
    pickedQuantity: number;
  } | null>(null);

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
        item.location.formattedCode.toLowerCase().includes(q);
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
      {/* ── 1. HEADER CHÍNH CỦA TRANG ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  Soạn hàng theo vị trí kho (Picking)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Lộ trình S-Shape tối ưu
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhặt hàng theo đường đi một chiều trong kho • Hỗ trợ gộp nhiều đơn đã duyệt
              </p>
            </div>
          </div>

          {/* Nút hành động đầu trang */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrintSheet}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="In phiếu soạn hàng dạng giấy"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">In phiếu</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo phiếu soạn mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. NỘI DUNG CHÍNH ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* A. Bộ chọn phiếu soạn hàng (Horizontal Tabs / Dropdown) */}
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
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs ring-2 ring-slate-900/10'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{sheet.sheetCode}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-amber-400 text-slate-900 font-extrabold'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {sheet.orderCount} đơn
                </span>
              </button>
            );
          })}
        </div>

        {/* B. Nếu không có phiếu nào */}
        {!activeSheet && !loading && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Chưa có phiếu soạn hàng nào</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy tạo phiếu soạn hàng từ các đơn đã duyệt để hệ thống gom hàng và sắp xếp lộ trình đi lại trong kho tối ưu nhất.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tạo phiếu soạn đầu tiên
            </button>
          </div>
        )}

        {/* C. Thẻ Thông tin tóm tắt & Thanh tiến độ của Phiếu đang mở */}
        {activeSheet && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-base sm:text-lg font-extrabold text-slate-900">
                    {activeSheet.sheetCode}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      activeSheet.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeSheet.status === 'PARTIALLY_COMPLETED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-sky-100 text-sky-800'
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
                className="hidden sm:inline-flex px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Hoàn tất lượt soạn
              </button>
            </div>

            {/* Thanh tiến độ trực quan */}
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
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-linear-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${progressStats.percent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* D. Thanh tìm kiếm & Bộ lọc nhanh dòng hàng */}
        {activeSheet && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Bộ lọc trạng thái (Pills) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setItemStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  itemStatusFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tất cả ({activeSheet.items.length})
              </button>
              <button
                type="button"
                onClick={() => setItemStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  itemStatusFilter === 'PENDING'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Chưa soạn ({activeSheet.items.filter((i) => i.status === 'PENDING').length})
              </button>
              <button
                type="button"
                onClick={() => setItemStatusFilter('PICKED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  itemStatusFilter === 'PICKED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Đã xong ({activeSheet.items.filter((i) => i.status === 'PICKED').length})
              </button>
              <button
                type="button"
                onClick={() => setItemStatusFilter('SHORT_PICKED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  itemStatusFilter === 'SHORT_PICKED'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
                }`}
              >
                Soạn thiếu ({activeSheet.items.filter((i) => i.status === 'SHORT_PICKED').length})
              </button>
            </div>

            {/* Input tìm kiếm mặt hàng */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã SKU, tên SP, vị trí kệ..."
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* E. Danh sách các thẻ dòng hàng theo thứ tự đường đi tối ưu */}
        {activeSheet && (
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
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
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── 3. STICKY BOTTOM BAR TRÊN MOBILE (TỐI ƯU CẦM ĐIỆN THOẠI 1 TAY) ── */}
      {activeSheet && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:hidden shadow-lg flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Tiến độ: {progressStats.percent}%</span>
              <span>{progressStats.pickedLines}/{progressStats.totalLines} dòng</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressStats.percent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCompletePickingSheet}
            disabled={activeSheet.status === 'COMPLETED' || activeSheet.status === 'PARTIALLY_COMPLETED'}
            className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 whitespace-nowrap cursor-pointer shrink-0"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Hoàn tất lượt
          </button>
        </div>
      )}

      {/* ── 4. CÁC MODAL ĐIỀU KHIỂN ── */}
      <CreatePickingSheetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newSheetId) => {
          loadSheets();
          setActiveSheetId(newSheetId);
        }}
      />

      <ShortPickReasonModal
        isOpen={Boolean(reasonModalItem)}
        item={reasonModalItem?.item || null}
        currentPickedQuantity={reasonModalItem?.pickedQuantity || 0}
        onClose={() => setReasonModalItem(null)}
        onConfirm={handleConfirmShortPick}
      />
    </div>
  );
};
