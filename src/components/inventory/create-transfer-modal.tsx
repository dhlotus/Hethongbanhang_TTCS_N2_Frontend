import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  AlertCircle,
  Warehouse,
  Info,
  Layers,
  Send,
  FileEdit,
  Boxes,
} from 'lucide-react';
import { ModalLayout } from '../modal-layout';
import { showToast } from '../toast';
import { warehouseService } from '../../services/warehouse.service';
import { inventoryService } from '../../services/inventory.service';
import { productsService } from '../../services/products.service';
import { internalTransfersService } from '../../services/internal-transfers.service';
import { TransferItemsTable } from './transfer-items-table';
import { ProductSelectionModal } from './product-selection-modal';
import type { TransferItemDraft } from './transfer-items-table';
import type { Warehouse as WarehouseType } from '../../types/warehouse.types';
import type { StockBalance } from '../../types/inventory.types';
import type { Product } from '../../types/products';
import type { InternalTransfer } from '../../types/internal-transfer.types';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transfer: InternalTransfer) => void;
}

export const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sourceStocks, setSourceStocks] = useState<StockBalance[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingStocks, setLoadingStocks] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states
  const [fromWarehouseId, setFromWarehouseId] = useState<string>('');
  const [toWarehouseId, setToWarehouseId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<TransferItemDraft[]>([]);
  const [productModalOpen, setProductModalOpen] = useState<boolean>(false);

  // Tải danh sách kho và sản phẩm ban đầu
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setNotes('');
      setProductModalOpen(false);
      return;
    }

    let mounted = true;
    const fetchInit = async () => {
      try {
        setLoadingInitial(true);
        const [whList, prodList] = await Promise.all([
          warehouseService.getWarehouses(),
          productsService.getProducts(),
        ]);

        if (!mounted) return;
        setWarehouses(whList);
        const resolvedProducts = Array.isArray(prodList) ? prodList : prodList?.data || [];
        setProducts(resolvedProducts);

        if (whList.length >= 2) {
          setFromWarehouseId(whList[0].id);
          setToWarehouseId(whList[1].id);
        } else if (whList.length === 1) {
          setFromWarehouseId(whList[0].id);
        }
      } catch {
        showToast('error', 'Không thể tải danh mục kho hàng và sản phẩm');
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    };

    fetchInit();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Khi thay đổi kho xuất, tải tồn kho khả dụng của kho đó
  useEffect(() => {
    if (!fromWarehouseId || !isOpen) return;

    let mounted = true;
    const loadSourceStocks = async () => {
      try {
        setLoadingStocks(true);
        const stocks = await inventoryService.getStockOverview(fromWarehouseId);
        if (!mounted) return;
        setSourceStocks(stocks);

        // Cập nhật lại tồn khả dụng cho các item đã chọn trong bảng
        setItems((prev) =>
          prev.map((item) => {
            const stockFound = stocks.find((s) => s.sku.toUpperCase() === item.sku.toUpperCase());
            return {
              ...item,
              availableAtSource: stockFound?.availableQuantity ?? 0,
            };
          }),
        );
      } catch (err: unknown) {
        console.error('Lỗi tải tồn kho kho xuất:', err);
      } finally {
        if (mounted) setLoadingStocks(false);
      }
    };

    loadSourceStocks();
    return () => {
      mounted = false;
    };
  }, [fromWarehouseId, isOpen]);

  // Thêm hàng loạt sản phẩm được chọn từ modal tìm kiếm sản phẩm (SN-181)
  const handleBatchAddProducts = (selectedProducts: Product[]) => {
    if (!selectedProducts.length) return;

    setItems((prev) => {
      const nextItems: TransferItemDraft[] = [...prev];
      selectedProducts.forEach((product) => {
        const existingIndex = nextItems.findIndex((i) => i.productId === product.id);
        if (existingIndex === -1) {
          const stockFound = sourceStocks.find((s) => s.sku.toUpperCase() === product.sku.toUpperCase());
          const defaultUnit = product.units?.[0]?.unitName || product.baseUnit || 'Đơn vị';
          const convRate = product.units?.[0]?.conversionRate || 1;

          nextItems.push({
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unit: defaultUnit,
            conversionRate: convRate,
            baseUnit: product.baseUnit || 'Đơn vị',
            transferQuantity: 1,
            availableAtSource: stockFound?.availableQuantity ?? stockFound?.stockQuantity ?? 0,
            notes: '',
          });
        }
      });
      return nextItems;
    });

    showToast('success', `Đã thêm ${selectedProducts.length} sản phẩm vào danh sách điều chuyển`);
  };

  // Xóa một dòng hàng
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Cập nhật thông tin dòng hàng
  const handleItemChange = (index: number, updates: Partial<TransferItemDraft>) => {
    setItems((prev) => {
      const clone = [...prev];
      const target = { ...clone[index], ...updates };

      if (updates.productId) {
        const prod = products.find((p) => p.id === updates.productId);
        if (prod) {
          const stockFound = sourceStocks.find((s) => s.sku.toUpperCase() === prod.sku.toUpperCase());
          const unit = prod.units?.[0]?.unitName || prod.baseUnit || 'Đơn vị';
          const convRate = prod.units?.[0]?.conversionRate || 1;
          target.sku = prod.sku;
          target.name = prod.name;
          target.unit = unit;
          target.conversionRate = convRate;
          target.baseUnit = prod.baseUnit || 'Đơn vị';
          target.availableAtSource = stockFound?.availableQuantity ?? 0;
        }
      }

      if (updates.unit) {
        const prod = products.find((p) => p.id === target.productId);
        if (prod) {
          const unitObj = prod.units?.find((u) => u.unitName === updates.unit);
          target.conversionRate = unitObj?.conversionRate || 1;
        }
      }

      clone[index] = target;
      return clone;
    });
  };

  // Danh sách kho nhận khả dụng (loại trừ kho xuất hàng đã chọn - SN-181)
  const availableToWarehouses = useMemo(() => {
    return warehouses.filter((wh) => wh.id !== fromWarehouseId);
  }, [warehouses, fromWarehouseId]);

  // Xử lý khi thay đổi Kho xuất hàng: tự động chuyển kho nhận sang kho khác nếu đang trùng
  const handleFromWarehouseChange = (newFromId: string) => {
    setFromWarehouseId(newFromId);
    if (toWarehouseId === newFromId || !toWarehouseId) {
      const nextWh = warehouses.find((w) => w.id !== newFromId);
      setToWarehouseId(nextWh ? nextWh.id : '');
    }
  };

  // Đảm bảo kho nhận luôn khác kho xuất và luôn trỏ đến kho hợp lệ
  useEffect(() => {
    if (!fromWarehouseId || warehouses.length === 0) return;
    if (toWarehouseId === fromWarehouseId || !toWarehouseId) {
      const nextWh = warehouses.find((w) => w.id !== fromWarehouseId);
      if (nextWh) {
        setToWarehouseId(nextWh.id);
      }
    }
  }, [fromWarehouseId, toWarehouseId, warehouses]);

  // Kiểm tra lỗi kho xuất và kho nhận trùng nhau
  const isDuplicateWarehouse = Boolean(
    fromWarehouseId && toWarehouseId && fromWarehouseId === toWarehouseId,
  );

  // Kiểm tra lỗi validate toàn bộ form
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!fromWarehouseId) errors.push('Vui lòng chọn Kho xuất hàng (Kho đi).');
    if (!toWarehouseId) errors.push('Vui lòng chọn Kho nhận hàng (Kho đến).');
    if (fromWarehouseId && toWarehouseId && fromWarehouseId === toWarehouseId) {
      errors.push('Kho xuất và Kho nhận không được trùng nhau.');
    }
    if (items.length === 0) {
      errors.push('Phiếu chuyển kho phải có ít nhất 1 mặt hàng.');
    }

    items.forEach((item, idx) => {
      if (item.transferQuantity <= 0) {
        errors.push(`Dòng ${idx + 1} (${item.sku}): Số lượng chuyển phải lớn hơn 0.`);
      }
      const baseRequired = Math.round(item.transferQuantity * item.conversionRate);
      if (baseRequired > item.availableAtSource) {
        errors.push(
          `Dòng ${idx + 1} (${item.name}): Vượt tồn khả dụng kho đi (Cần ${baseRequired} ${item.baseUnit}, chỉ còn ${item.availableAtSource} ${item.baseUnit}).`,
        );
      }
    });

    return errors;
  }, [fromWarehouseId, toWarehouseId, items]);

  // Submit tạo phiếu chuyển kho
  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && validationErrors.length > 0) {
      showToast('error', validationErrors[0]);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        fromWarehouseId,
        toWarehouseId,
        notes: notes.trim(),
        isDraft,
        items: items.map((i) => ({
          productId: i.productId,
          unit: i.unit,
          transferQuantity: Number(i.transferQuantity),
          notes: i.notes,
        })),
      };

      const result = await internalTransfersService.createTransfer(payload);
      showToast(
        'success',
        isDraft
          ? `Đã lưu bản nháp phiếu chuyển kho ${result.code}`
          : `Đã xuất chuyển kho thành công phiếu ${result.code}. Hàng đang trên đường!`,
      );
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo phiếu chuyển kho';
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Lập Phiếu Chuyển Kho Nội Bộ"
      subtitle="Điều chuyển hàng hóa từ kho thừa sang kho thiếu — Số liệu kiểm soát chặt chẽ hai đầu"
      icon={<Warehouse className="w-5 h-5 text-[var(--color-primary)]" />}
      maxWidth="max-w-4xl"
      bodyClassName="p-4 sm:p-6 space-y-5 text-slate-700 text-xs"
      banner={
        <div className="bg-amber-50/80 border-b border-amber-200/70 px-6 py-2.5 flex items-start gap-3 text-xs text-amber-800">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-semibold text-amber-900">Quy tắc điều chuyển:</span> Khi bấm xuất chuyển, hàng sẽ được trừ ngay tại <strong>Kho đi</strong> và chuyển sang trạng thái <strong>Đang trên đường</strong>. <strong>Kho đến</strong> chỉ được cộng tồn khi thủ kho nơi nhận kiểm đếm và bấm xác nhận nhận hàng.
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            Tổng: <strong className="text-slate-800 font-semibold">{items.length}</strong> mặt hàng
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting || items.length === 0}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileEdit className="w-3.5 h-3.5 text-slate-500" />
              Lưu bản nháp
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting || validationErrors.length > 0}
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Đang xử lý...' : 'Xuất Chuyển Kho Ngay'}
            </button>
          </div>
        </div>
      }
    >
      {/* KHỐI CẢNH BÁO LỖI NỔI BẬT Ở TRÊN CÙNG */}
      {validationErrors.length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1.5 shadow-2xs animate-in fade-in duration-200">
          <div className="font-bold flex items-center gap-1.5 text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Cảnh báo điều chuyển ({validationErrors.length} lưu ý cần xử lý):</span>
          </div>
          <ul className="list-disc list-inside text-[11px] space-y-1 pl-1 text-rose-700 font-medium">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* KHỐI 1: CHỌN KHO ĐI VÀ KHO ĐẾN */}
      <div className={`p-4 rounded-xl border transition-colors ${
        isDuplicateWarehouse
          ? 'bg-rose-50/40 border-rose-200'
          : 'bg-slate-50/70 border-slate-200/80'
      }`}>
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Tuyến điều chuyển kho
          </div>
          <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
            {/* Kho đi */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kho xuất hàng (Kho thừa) <span className="text-rose-500">*</span>
              </label>
              <select
                value={fromWarehouseId}
                onChange={(e) => handleFromWarehouseChange(e.target.value)}
                disabled={loadingInitial}
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
              {loadingStocks && (
                <div className="text-[11px] text-slate-500 mt-1 italic">
                  Đang kiểm tra sổ tồn kho khả dụng...
                </div>
              )}
            </div>

            {/* Mũi tên chuyển */}
            <div className="md:col-span-1 flex justify-center py-1 md:py-0">
              <div className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Kho đến (Loại trừ kho xuất hàng đã chọn - SN-181) */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kho nhận hàng (Kho thiếu) <span className="text-rose-500">*</span>
              </label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                disabled={loadingInitial || availableToWarehouses.length === 0}
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
              >
                {availableToWarehouses.length === 0 ? (
                  <option value="">(Không có kho nhận khả dụng)</option>
                ) : (
                  availableToWarehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))
                )}
              </select>
              {warehouses.length < 2 && !loadingInitial && (
                <div className="text-[11px] text-amber-600 mt-1 font-medium">
                  Cần ít nhất 2 kho hàng để thực hiện điều chuyển nội bộ.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KHỐI 2: BẢNG DANH SÁCH MẶT HÀNG CẦN CHUYỂN */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Danh sách hàng hóa điều chuyển
              </h4>
              <p className="text-[11px] text-slate-500">
                Tìm kiếm sản phẩm, đơn vị đóng gói và số lượng chuyển từ kho xuất
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setProductModalOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Boxes className="w-4 h-4" />
                <span>+ Chọn sản phẩm chuyển kho</span>
              </button>
            </div>
          </div>

          <TransferItemsTable
            items={items}
            products={products}
            sourceStocks={sourceStocks}
            onOpenProductSelector={() => setProductModalOpen(true)}
            onRemoveItem={handleRemoveItem}
            onItemChange={handleItemChange}
          />
        </div>

        {/* KHỐI 3: GHI CHÚ ĐIỀU CHUYỂN */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú / Mục đích chuyển kho
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ví dụ: Cấp bù tồn kho chi nhánh phục vụ tuần lễ khuyến mãi..."
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* MODAL TÌM KIẾM & CHỌN NHIỀU SẢN PHẨM CÙNG LÚC (SN-181) */}
        <ProductSelectionModal
          isOpen={productModalOpen}
          onClose={() => setProductModalOpen(false)}
          products={products}
          sourceStocks={sourceStocks}
          alreadySelectedProductIds={items.map((i) => i.productId)}
          onConfirmSelect={handleBatchAddProducts}
        />
    </ModalLayout>
  );
};
