import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Package,
  Plus,
  Trash2,
  AlertCircle,
  Warehouse,
  Info,
  Layers,
  Send,
  FileEdit,
} from 'lucide-react';
import { ModalLayout } from '../modal-layout';
import { showToast } from '../toast';
import { warehouseService } from '../../services/warehouse.service';
import { inventoryService } from '../../services/inventory.service';
import { productsService } from '../../services/products.service';
import { internalTransfersService } from '../../services/internal-transfers.service';
import type { Warehouse as WarehouseType } from '../../types/warehouse.types';
import type { StockBalance } from '../../types/inventory.types';
import type { Product } from '../../types/products';
import type { InternalTransfer } from '../../types/internal-transfer.types';

interface TransferItemDraft {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  conversionRate: number;
  baseUnit: string;
  transferQuantity: number;
  availableAtSource: number;
  notes: string;
}

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

  // Tải danh sách kho và sản phẩm ban đầu
  useEffect(() => {
    if (!isOpen) return;

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
        const resolvedProducts = Array.isArray(prodList) ? prodList : (prodList?.data || []);
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

  // Thêm dòng hàng mới
  const handleAddItem = () => {
    if (products.length === 0) return;
    const firstProduct = products[0];
    const stockFound = sourceStocks.find((s) => s.sku.toUpperCase() === firstProduct.sku.toUpperCase());
    const defaultUnit = firstProduct.units?.[0]?.unitName || firstProduct.baseUnit || 'Đơn vị';
    const convRate = firstProduct.units?.[0]?.conversionRate || 1;

    const newItem: TransferItemDraft = {
      productId: firstProduct.id,
      sku: firstProduct.sku,
      name: firstProduct.name,
      unit: defaultUnit,
      conversionRate: convRate,
      baseUnit: firstProduct.baseUnit || 'Đơn vị',
      transferQuantity: 1,
      availableAtSource: stockFound?.availableQuantity ?? 0,
      notes: '',
    };

    setItems((prev) => [...prev, newItem]);
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

      // Nếu thay đổi productId -> tự động cập nhật sku, name, unit, tồn
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

      // Nếu thay đổi unit -> cập nhật lại conversionRate
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
      <div className="p-6 space-y-6">
        {/* KHỐI 1: CHỌN KHO ĐI VÀ KHO ĐẾN */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
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
                onChange={(e) => setFromWarehouseId(e.target.value)}
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

            {/* Kho đến */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kho nhận hàng (Kho thiếu) <span className="text-rose-500">*</span>
              </label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                disabled={loadingInitial}
                className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
              >
                {warehouses
                  .filter((wh) => wh.id !== fromWarehouseId)
                  .map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* KHỐI 2: BẢNG DANH SÁCH MẶT HÀNG CẦN CHUYỂN */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Danh sách hàng hóa điều chuyển
              </h4>
              <p className="text-[11px] text-slate-500">
                Chọn sản phẩm, đơn vị đóng gói và số lượng chuyển từ kho xuất
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm mặt hàng
            </button>
          </div>

          {items.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50">
              <Package className="w-8 h-8 text-slate-400 mx-auto mb-2 stroke-[1.5]" />
              <div className="text-xs font-semibold text-slate-600 mb-1">
                Chưa có mặt hàng nào được chọn
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Nhấn vào nút "Thêm mặt hàng" phía trên để bắt đầu thêm sản phẩm cần chuyển
              </p>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[var(--color-primary)] rounded-lg shadow-sm cursor-pointer"
              >
                + Thêm mặt hàng đầu tiên
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3 min-w-[220px]">Sản phẩm & SKU</th>
                      <th className="py-2.5 px-3 min-w-[120px]">Đơn vị chuyển</th>
                      <th className="py-2.5 px-3 w-32 text-right">SL chuyển</th>
                      <th className="py-2.5 px-3 w-32 text-right">Quy đổi cơ sở</th>
                      <th className="py-2.5 px-3 w-32 text-right">Tồn khả dụng</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {items.map((item, index) => {
                      const prod = products.find((p) => p.id === item.productId);
                      const baseQty = Math.round(item.transferQuantity * item.conversionRate);
                      const isOutOfStock = baseQty > item.availableAtSource;

                      return (
                        <tr
                          key={index}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            isOutOfStock ? 'bg-rose-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={item.productId}
                              onChange={(e) =>
                                handleItemChange(index, { productId: e.target.value })
                              }
                              className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:border-[var(--color-primary)] outline-none"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.sku} - {p.name}
                                </option>
                              ))}
                            </select>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Mã SKU: <span className="font-mono text-slate-600">{item.sku}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={item.unit}
                              onChange={(e) => handleItemChange(index, { unit: e.target.value })}
                              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:border-[var(--color-primary)] outline-none"
                            >
                              {(prod?.units || []).map((u) => (
                                <option key={u.unitName} value={u.unitName}>
                                  {u.unitName} (x{u.conversionRate} {prod?.baseUnit})
                                </option>
                              ))}
                              {(!prod?.units || prod.units.length === 0) && (
                                <option value={item.unit}>{item.unit}</option>
                              )}
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min={1}
                              value={item.transferQuantity}
                              onChange={(e) =>
                                handleItemChange(index, {
                                  transferQuantity: Math.max(1, Number(e.target.value) || 0),
                                })
                              }
                              className={`w-24 text-right text-xs font-bold px-2 py-1.5 border rounded-md outline-none ${
                                isOutOfStock
                                  ? 'border-rose-300 text-rose-700 bg-white focus:ring-1 focus:ring-rose-500'
                                  : 'border-slate-200 text-slate-800 bg-white focus:border-[var(--color-primary)]'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                            <span className="font-bold text-slate-800">{baseQty}</span>{' '}
                            <span className="text-[11px] text-slate-500">{item.baseUnit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`font-semibold ${
                                isOutOfStock ? 'text-rose-600 font-bold' : 'text-slate-700'
                              }`}
                            >
                              {item.availableAtSource}
                            </span>{' '}
                            <span className="text-[11px] text-slate-400">{item.baseUnit}</span>
                            {isOutOfStock && (
                              <div className="text-[10px] text-rose-600 font-bold">
                                Không đủ tồn!
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              title="Xóa dòng"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* DANH SÁCH LỖI NẾU CÓ */}
        {validationErrors.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              Vui lòng hoàn tất các thông tin sau trước khi xuất chuyển:
            </div>
            <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-2">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ModalLayout>
  );
};
