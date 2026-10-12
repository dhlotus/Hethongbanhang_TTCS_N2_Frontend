import React from 'react';
import {
  Package,
  Layers,
  Tag,
  Warehouse,
  ShieldCheck,
  TrendingUp,
  Boxes,
  Barcode,
  Edit2,
  Clock,
  BookOpen,
} from 'lucide-react';
import { ModalLayout } from './modal-layout';
import type { Product } from '../types/products';

export interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  canViewCostPrice?: boolean;
  canManageProducts?: boolean;
  onEdit?: (product: Product) => void;
  onPriceHistory?: (product: Product) => void;
  onOpenLedger?: (sku: string) => void;
}

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '---';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  canViewCostPrice = false,
  canManageProducts = false,
  onEdit,
  onPriceHistory,
  onOpenLedger,
}) => {
  if (!isOpen || !product) return null;

  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 10;
  const conversionUnits = product.units?.filter((u) => !u.isBaseUnit) || [];

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle={`Mã SKU: ${product.sku} • Chi tiết sản phẩm`}
      icon={<Package className="h-5 w-5 text-blue-600" />}
      maxWidth="max-w-2xl"
      bodyClassName="p-6 space-y-6 text-xs text-slate-700"
      badge={
        product.status === 'ACTIVE' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Đang kinh doanh
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Ngừng kinh doanh
          </span>
        )
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <div className="flex items-center gap-2">
            {onOpenLedger && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLedger(product.sku);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Sổ kho SKU</span>
              </button>
            )}
            {canManageProducts && onPriceHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPriceHistory(product);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Lịch sử giá</span>
              </button>
            )}
            {canManageProducts && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(product);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Sửa sản phẩm</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* 1. Thông tin chung & Ảnh */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
        <div className="h-24 w-24 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Package className="h-10 w-10 text-slate-300" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="font-bold text-slate-900 text-base leading-snug">
            {product.name}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Mã SKU:</span>
              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {product.sku}
              </span>
            </div>
            {product.barcode && (
              <div className="flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Mã vạch:</span>
                <span className="font-mono text-slate-700">{product.barcode}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400">Ngành hàng:</span>
              <span className="font-medium text-slate-700">
                {product.parentCategory || product.category?.split('/')[0]?.trim() || 'Nhóm hàng'}
                {product.category?.includes('/') && ` > ${product.category.split('/').slice(1).join(' > ')}`}
                {product.subCategory && !product.category?.includes('/') && ` > ${product.subCategory}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Giá cả & Tồn kho */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Giá & Tồn kho
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Giá niêm yết */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Giá niêm yết</span>
            </div>
            <div className="font-mono font-bold text-slate-900 text-sm">
              {formatCurrency(product.price)}
            </div>
          </div>

          {/* Tồn kho */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <Warehouse className="w-3.5 h-3.5" />
              <span>Tồn kho</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono font-bold text-slate-900 text-sm">
                {product.stockQuantity.toLocaleString('vi-VN')}
              </span>
              <span className="text-[11px] text-slate-500">{product.baseUnit}</span>
              {isOutOfStock ? (
                <span className="text-[10px] font-bold text-rose-600">(Hết)</span>
              ) : isLowStock ? (
                <span className="text-[10px] font-bold text-amber-600">(Ít)</span>
              ) : null}
            </div>
          </div>

          {/* Giá vốn & Biên LN (Chỉ hiển thị khi có quyền) */}
          {canViewCostPrice && (
            <>
              <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 shadow-2xs">
                <div className="flex items-center gap-1 text-emerald-700 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Giá vốn</span>
                </div>
                <div className="font-mono font-bold text-emerald-900 text-sm">
                  {formatCurrency(product.costPrice)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 shadow-2xs">
                <div className="flex items-center gap-1 text-emerald-700 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Biên lợi nhuận</span>
                </div>
                <div className="font-mono font-bold text-emerald-900 text-sm">
                  {product.margin !== undefined ? `+${product.margin}%` : '---'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Đơn vị tính & Quy cách đóng gói */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Đơn vị tính & Đóng gói
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400">Đơn vị tính cơ sở:</span>
              <div className="font-semibold text-slate-800 mt-0.5">
                {product.baseUnit}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <span className="text-slate-400">Quy cách đóng gói:</span>
              <div className="font-semibold text-slate-800 mt-0.5">
                {product.packagingSpec || 'Chưa thiết lập'}
              </div>
            </div>
          </div>

          {/* Bảng đơn vị quy đổi (nếu có) */}
          {conversionUnits.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-blue-600" />
                <span>Bảng đơn vị quy đổi về ĐVT cơ sở ({product.baseUnit})</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2 font-medium">Đơn vị quy đổi</th>
                    <th className="px-3 py-2 font-medium text-center">Hệ số quy đổi</th>
                    <th className="px-3 py-2 font-medium text-right">Giá bán theo đơn vị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {conversionUnits.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {u.unitName}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600 font-mono">
                        1 {u.unitName} = {u.conversionRate} {product.baseUnit}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">
                        {u.price ? formatCurrency(u.price) : formatCurrency(product.price * u.conversionRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. Mô tả sản phẩm (nếu có) */}
      {product.description && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Mô tả sản phẩm
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        </div>
      )}
    </ModalLayout>
  );
};
