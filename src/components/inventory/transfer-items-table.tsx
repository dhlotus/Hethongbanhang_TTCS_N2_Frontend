import React from 'react';
import { Package, Trash2 } from 'lucide-react';
import { SearchableProductSelect } from './searchable-product-select';
import type { Product } from '../../types/products';
import type { StockBalance } from '../../types/inventory.types';

export interface TransferItemDraft {
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

interface TransferItemsTableProps {
  items: TransferItemDraft[];
  products: Product[];
  sourceStocks?: StockBalance[];
  onOpenProductSelector?: () => void;
  onRemoveItem: (index: number) => void;
  onItemChange: (index: number, updates: Partial<TransferItemDraft>) => void;
}

/**
 * Component hiển thị danh sách mặt hàng cần điều chuyển kho (SN-181)
 * Thiết kế form bảng theo form bảng quản lý đơn hàng
 */
export const TransferItemsTable: React.FC<TransferItemsTableProps> = ({
  items,
  products,
  sourceStocks = [],
  onOpenProductSelector,
  onRemoveItem,
  onItemChange,
}) => {
  if (items.length === 0) {
    return (
      <div className="min-h-[180px] py-12 px-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-2.5 bg-slate-50/30">
        <Package className="w-10 h-10 text-slate-300 mx-auto" />
        <span className="font-medium text-slate-600">Chưa có sản phẩm nào trong phiếu chuyển kho</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
      <table className="w-full text-xs text-left">
        <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
          <tr>
            <th className="px-3 py-3 text-center w-12">STT</th>
            <th className="px-4 py-3 min-w-[240px]">Sản phẩm / SKU</th>
            <th className="px-3 py-3 text-center min-w-[110px]">ĐVT</th>
            <th className="px-3 py-3 text-center min-w-[130px]">Số lượng</th>
            <th className="px-4 py-3 text-right min-w-[110px]">Quy đổi cơ sở</th>
            <th className="px-4 py-3 text-right min-w-[110px]">Tồn khả dụng</th>
            <th className="px-3 py-3 text-center w-12">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          {items.map((item, index) => {
            const prod = products.find((p) => p.id === item.productId);
            const baseQty = Math.round(item.transferQuantity * item.conversionRate);
            const isOutOfStock = baseQty > item.availableAtSource;

            return (
              <tr
                key={item.productId || index}
                className={`hover:bg-slate-50/70 transition-colors ${
                  isOutOfStock ? 'bg-rose-50/60' : ''
                }`}
              >
                {/* 1. STT */}
                <td className="px-3 py-3 text-center text-slate-400 font-mono text-[11px]">
                  {index + 1}
                </td>

                {/* 2. Sản phẩm & SKU */}
                <td className="px-4 py-3">
                  {item.productId ? (
                    <div>
                      <p className="font-bold text-slate-900 leading-snug">{item.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.sku}</p>
                    </div>
                  ) : (
                    <SearchableProductSelect
                      products={products}
                      selectedProductId={item.productId}
                      sourceStocks={sourceStocks}
                      onSelectProduct={(newProd) => {
                        const defaultUnit =
                          newProd.units?.[0]?.unitName || newProd.baseUnit || 'Đơn vị';
                        const convRate = newProd.units?.[0]?.conversionRate || 1;
                        onItemChange(index, {
                          productId: newProd.id,
                          sku: newProd.sku,
                          name: newProd.name,
                          unit: defaultUnit,
                          conversionRate: convRate,
                          baseUnit: newProd.baseUnit || 'Đơn vị',
                        });
                      }}
                    />
                  )}
                  {isOutOfStock && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[10px]">
                      <span className="text-rose-600 font-semibold">
                        Vượt tồn khả dụng (Còn lại {item.availableAtSource} {item.baseUnit})
                      </span>
                    </div>
                  )}
                </td>

                {/* 3. ĐVT */}
                <td className="px-3 py-3 text-center">
                  {prod?.units && prod.units.length > 1 ? (
                    <select
                      value={item.unit}
                      onChange={(e) => {
                        const newUnit = e.target.value;
                        const unitObj = prod.units?.find((u) => u.unitName === newUnit);
                        onItemChange(index, {
                          unit: newUnit,
                          conversionRate: unitObj?.conversionRate || 1,
                        });
                      }}
                      className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:border-[var(--color-primary)] outline-none font-medium text-slate-700"
                    >
                      {prod.units.map((opt) => (
                        <option key={opt.unitName} value={opt.unitName}>
                          {opt.unitName} (×{opt.conversionRate})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-semibold text-slate-800">{item.unit}</span>
                  )}
                </td>

                {/* 4. Số lượng (Bộ nút stepper - / + chuẩn quản lý đơn hàng) */}
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onItemChange(index, {
                          transferQuantity: Math.max(1, item.transferQuantity - 1),
                        })
                      }
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-colors"
                      title="Giảm số lượng"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.transferQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        onItemChange(index, {
                          transferQuantity: isNaN(val) ? 1 : Math.max(1, val),
                        });
                      }}
                      className={`w-14 text-center text-xs font-bold py-1 border rounded-lg outline-none transition-all ${
                        isOutOfStock
                          ? 'border-rose-400 text-rose-700 bg-rose-50/50 focus:ring-1 focus:ring-rose-400'
                          : 'border-slate-200 text-slate-800 bg-white focus:border-[var(--color-primary)]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onItemChange(index, {
                          transferQuantity: item.transferQuantity + 1,
                        })
                      }
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-colors"
                      title="Tăng số lượng"
                    >
                      +
                    </button>
                  </div>
                </td>

                {/* 5. Quy đổi cơ sở */}
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-slate-800 tabular-nums">{baseQty}</span>{' '}
                  <span className="text-[11px] text-slate-500 font-normal">{item.baseUnit}</span>
                </td>

                {/* 6. Tồn khả dụng */}
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-semibold tabular-nums ${
                      isOutOfStock ? 'text-rose-600 font-bold' : 'text-slate-700'
                    }`}
                  >
                    {item.availableAtSource}
                  </span>{' '}
                  <span className="text-[11px] text-slate-400 font-normal">{item.baseUnit}</span>
                  {isOutOfStock && (
                    <div className="text-[10px] text-rose-600 font-bold mt-0.5">Không đủ tồn!</div>
                  )}
                </td>

                {/* 7. Thao tác xóa */}
                <td className="px-3 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    title="Xóa khỏi danh sách"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
