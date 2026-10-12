import React from 'react';
import { Package, Trash2 } from 'lucide-react';
import type { Product } from '../../types/products';

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
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onItemChange: (index: number, updates: Partial<TransferItemDraft>) => void;
}

/**
 * Component hiển thị danh sách mặt hàng cần điều chuyển kho (SN-181)
 */
export const TransferItemsTable: React.FC<TransferItemsTableProps> = ({
  items,
  products,
  onAddItem,
  onRemoveItem,
  onItemChange,
}) => {
  if (items.length === 0) {
    return (
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
          onClick={onAddItem}
          className="px-3.5 py-1.5 text-xs font-bold text-white bg-[var(--color-primary)] rounded-lg shadow-sm cursor-pointer"
        >
          + Thêm mặt hàng đầu tiên
        </button>
      </div>
    );
  }

  return (
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
                      onChange={(e) => onItemChange(index, { productId: e.target.value })}
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
                      onChange={(e) => onItemChange(index, { unit: e.target.value })}
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
                        onItemChange(index, {
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
                      <div className="text-[10px] text-rose-600 font-bold">Không đủ tồn!</div>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
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
  );
};
