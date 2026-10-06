import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Lock,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { ModalLayout } from './modal-layout';
import { CurrencyInput } from './currency-input';
import type {
  PriceList,
  PriceListItem,
  CreatePriceListPayload,
  CustomerGroupType,
  PriceListStatusType,
} from '../types/price-list';
import { productsService } from '../services/products.service';
import type { Product } from '../types/products';

interface PriceListFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePriceListPayload) => Promise<void>;
  onClone?: (priceList: PriceList) => void;
  onToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  initialData?: PriceList | null;
  isReadOnly?: boolean;
}

const CUSTOMER_GROUP_OPTIONS: { value: CustomerGroupType; label: string }[] = [
  {
    value: 'AGENT_LEVEL_1',
    label: 'Đại lý Cấp 1 (Nhà phân phối)',
  },
  {
    value: 'AGENT_LEVEL_2',
    label: 'Đại lý Cấp 2 (Bán buôn)',
  },
  {
    value: 'RETAIL',
    label: 'Bán lẻ Niêm yết',
  },
];

const STATUS_OPTIONS: { value: PriceListStatusType; label: string }[] = [
  { value: 'DRAFT', label: 'Bản nháp (Draft)' },
  { value: 'ACTIVE', label: 'Đang hiệu lực (Active)' },
  { value: 'INACTIVE', label: 'Tạm dừng (Inactive)' },
  { value: 'EXPIRED', label: 'Hết hạn (Expired)' },
];

export const PriceListFormModal: React.FC<PriceListFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onClone,
  onToast,
  initialData,
  isReadOnly = false,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [customerGroup, setCustomerGroup] = useState<CustomerGroupType>('AGENT_LEVEL_1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<PriceListStatusType>('ACTIVE');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Kiểm tra bảng giá đã phát sinh đơn hàng hay chưa
  const hasOrders = Boolean(initialData?.hasOrders);
  const effectiveReadOnly = isReadOnly || hasOrders;

  // Xử lý đóng modal với hiệu ứng zoom mượt mà
  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  // Tải danh mục sản phẩm SKU từ hệ thống để hỗ trợ thêm dòng giá
  useEffect(() => {
    let mounted = true;
    productsService
      .getProducts({ limit: 50 })
      .then((res) => {
        if (mounted && res?.data) {
          setAvailableProducts(res.data);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Điền dữ liệu khi mở form (Create / Edit / View)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCode(initialData.code || '');
      setCustomerGroup(initialData.customerGroup || 'AGENT_LEVEL_1');
      setStartDate(initialData.startDate || '');
      setEndDate(initialData.endDate || '');
      setStatus(initialData.status || 'ACTIVE');
      setDescription(initialData.description || '');
      setItems(
        (initialData.items || []).map((it) => ({
          ...it,
          price: Number(it.price) || 0,
          minPrice: Number(it.minPrice) || 0,
        })),
      );
    } else {
      // Khởi tạo mặc định cho bảng giá mới
      setName('');
      setCode(`BG-${Date.now().toString(36).toUpperCase()}`);
      setCustomerGroup('AGENT_LEVEL_1');
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      setStartDate(today);
      setEndDate(nextYear);
      setStatus('DRAFT');
      setDescription('');
      setItems([]);
    }
    setLocalError(null);
    setIsClosing(false);
  }, [initialData, isOpen]);

  // Kiểm tra Realtime Validation: Có sản phẩm nào Giá bán < Giá sàn không?
  const pricingErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    for (const item of items) {
      const price = Number(item.price) || 0;
      const minPrice = Number(item.minPrice) || 0;
      if (price < minPrice) {
        errors[item.id] = `Giá bán (${price.toLocaleString('vi-VN')} đ) không được nhỏ hơn giá sàn (${minPrice.toLocaleString('vi-VN')} đ)`;
      }
    }
    return errors;
  }, [items]);

  const hasPricingErrors = Object.keys(pricingErrors).length > 0;

  // Thêm một sản phẩm vào bảng giá
  const handleAddProduct = () => {
    if (!selectedProductToAdd) return;
    const prod = availableProducts.find((p) => p.id === selectedProductToAdd);
    if (!prod) return;

    // Kiểm tra xem đã có trong danh sách chưa
    if (items.some((it) => it.productId === prod.id || it.productCode === prod.sku)) {
      const msg = `Sản phẩm [${prod.sku}] "${prod.name}" đã có trong bảng giá.`;
      setLocalError(msg);
      onToast?.('warning', 'Sản phẩm đã tồn tại', msg);
      return;
    }

    const defaultPrice = prod.price || 50000;
    const defaultMinPrice = Math.round(defaultPrice * 0.85);

    const newItem: PriceListItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: prod.id,
      productCode: prod.sku,
      productName: prod.name,
      price: defaultPrice,
      minPrice: defaultMinPrice,
      baseUnit: prod.baseUnit || 'Cái',
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedProductToAdd('');
    setLocalError(null);
  };

  // Nạp nhanh tất cả sản phẩm có sẵn
  const handleLoadAllProducts = () => {
    if (availableProducts.length === 0) return;
    const newItems: PriceListItem[] = availableProducts.map((prod, idx) => ({
      id: `temp-all-${idx}-${Date.now()}`,
      productId: prod.id,
      productCode: prod.sku,
      productName: prod.name,
      price: prod.price || 50000,
      minPrice: Math.round((prod.price || 50000) * 0.85),
      baseUnit: prod.baseUnit || 'Cái',
    }));
    setItems(newItems);
    setLocalError(null);
  };

  // Cập nhật giá bán hoặc giá sàn từng dòng
  const handleUpdateItem = (id: string, field: 'price' | 'minPrice', val: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: val };
        }
        return it;
      }),
    );
  };

  // Xóa một dòng sản phẩm
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Xử lý gửi biểu mẫu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveReadOnly) return;

    if (!name.trim()) {
      const msg = 'Vui lòng nhập tên bảng giá.';
      setLocalError(msg);
      onToast?.('warning', 'Thiếu thông tin bắt buộc', msg);
      return;
    }

    if (!startDate || !endDate) {
      const msg = 'Vui lòng chọn thời gian bắt đầu và kết thúc áp dụng.';
      setLocalError(msg);
      onToast?.('warning', 'Thiếu thông tin bắt buộc', msg);
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      const msg = 'Ngày kết thúc áp dụng phải lớn hơn hoặc bằng ngày bắt đầu.';
      setLocalError(msg);
      onToast?.('error', 'Khoảng ngày không hợp lệ', msg);
      return;
    }

    if (items.length === 0) {
      const msg = 'Bảng giá phải có ít nhất một sản phẩm được định giá.';
      setLocalError(msg);
      onToast?.('warning', 'Chưa có sản phẩm', msg);
      return;
    }

    if (hasPricingErrors) {
      const msg = `Phát hiện ${Object.keys(pricingErrors).length} sản phẩm có Giá bán nhỏ hơn Giá sàn. Vui lòng điều chỉnh lại mức giá trước khi lưu.`;
      setLocalError(msg);
      onToast?.('error', 'Vi phạm ràng buộc giá sàn', msg);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        customerGroup,
        startDate,
        endDate,
        status,
        description: description.trim(),
        items: items.map((it) => ({
          productId: it.productId,
          productCode: it.productCode,
          productName: it.productName,
          price: Number(it.price) || 0,
          minPrice: Number(it.minPrice) || 0,
          baseUnit: it.baseUnit,
        })),
      });
      handleClose();
    } catch {
      // Toast xử lý ở component cha
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalBanner = (hasOrders || localError) ? (
    <div className="space-y-3 px-6 pt-4">
      {/* Banner cảnh báo vàng khi hasOrders == true */}
      {hasOrders && (
        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <strong className="font-semibold block text-amber-950 sm:inline">
                Đã phát sinh đơn hàng:
              </strong>{' '}
              Bảng giá này đã có đơn hàng nên không thể chỉnh sửa trực tiếp nhằm bảo toàn chứng từ.
            </div>
          </div>

          {onClone && initialData && (
            <button
              type="button"
              onClick={() => {
                onClone(initialData);
                handleClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Tạo phiên bản mới (Clone Version)</span>
            </button>
          )}
        </div>
      )}

      {/* Banner cảnh báo đỏ khi có lỗi form */}
      {localError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-between gap-3 text-rose-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
            <div className="text-xs font-semibold">{localError}</div>
          </div>
          <button
            type="button"
            onClick={() => setLocalError(null)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  ) : null;

  const modalFooter = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
      <div className="text-xs text-slate-500 font-medium">
        {hasPricingErrors ? (
          <span className="text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            Có {Object.keys(pricingErrors).length} sản phẩm vi phạm ràng buộc giá sàn.
          </span>
        ) : items.length === 0 ? (
          <span className="text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Chưa có sản phẩm nào trong bảng giá này.
          </span>
        ) : (
          <span className="text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Dữ liệu hợp lệ, sẵn sàng lưu vào hệ thống.
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 ml-auto">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {effectiveReadOnly ? 'Đóng' : 'Hủy bỏ'}
        </button>

        {!effectiveReadOnly && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || hasPricingErrors || items.length === 0}
            title={
              hasPricingErrors
                ? `Không thể lưu: Có ${Object.keys(pricingErrors).length} mặt hàng có Giá bán nhỏ hơn Giá sàn`
                : items.length === 0
                ? 'Bảng giá chưa có sản phẩm nào'
                : 'Lưu cấu hình Bảng giá'
            }
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white shadow-xs transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Lưu Bảng giá</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={handleClose}
      title={
        initialData
          ? effectiveReadOnly
            ? `Chi tiết Bảng giá: ${initialData.name}`
            : `Chỉnh sửa Bảng giá: ${initialData.name}`
          : 'Thiết lập Bảng giá mới'
      }
      subtitle={
        initialData
          ? `Mã: ${initialData.code} • Cập nhật giá theo thời vụ và nhóm đối tác`
          : 'Cấu hình đơn giá, giá sàn và thời gian áp dụng'
      }
      icon={<FileSpreadsheet className="w-5 h-5 text-blue-600" />}
      badge={
        initialData ? (
          <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md bg-slate-100 text-slate-700">
            v{initialData.version}.0
          </span>
        ) : undefined
      }
      maxWidth="max-w-4xl"
      banner={modalBanner}
      footer={modalFooter}
      bodyClassName="p-6 space-y-5"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nhóm thông tin cơ bản */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Tên bảng giá */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Tên bảng giá <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={effectiveReadOnly}
                placeholder="Ví dụ: Bảng giá Đại lý Cấp 1 - Q4/2026"
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />
            </div>

            {/* Mã định danh */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Mã bảng giá</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={effectiveReadOnly || Boolean(initialData)}
                placeholder="BG-AGENT1-2026"
                className="w-full px-3 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />
            </div>

            {/* Nhóm khách hàng áp dụng */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Nhóm khách hàng <span className="text-rose-500">*</span>
              </label>
              <select
                value={customerGroup}
                onChange={(e) => setCustomerGroup(e.target.value as CustomerGroupType)}
                disabled={effectiveReadOnly}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 cursor-pointer"
              >
                {CUSTOMER_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ngày bắt đầu */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Ngày bắt đầu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={effectiveReadOnly}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Ngày kết thúc */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Ngày kết thúc <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={effectiveReadOnly}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Trạng thái */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Trạng thái</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PriceListStatusType)}
                disabled={effectiveReadOnly}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ghi chú */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Ghi chú & Phạm vi</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={effectiveReadOnly}
                placeholder="Ghi chú điều kiện thương mại, thời hạn hoặc khu vực..."
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Nhóm Chi tiết Giá từng sản phẩm */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Danh mục sản phẩm ({items.length})
                </h3>
                {hasPricingErrors && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Vi phạm giá sàn
                  </span>
                )}
              </div>

              {!effectiveReadOnly && (
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={handleLoadAllProducts}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Nạp tất cả SKU</span>
                  </button>

                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                    <select
                      value={selectedProductToAdd}
                      onChange={(e) => setSelectedProductToAdd(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 max-w-[220px] cursor-pointer"
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddProduct}
                      disabled={!selectedProductToAdd}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Banner cảnh báo lỗi giá sàn thời gian thực */}
            {hasPricingErrors && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-rose-900 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                  <div className="text-xs">
                    <strong className="font-semibold text-rose-950">Ràng buộc Giá bán & Giá sàn vi phạm:</strong>{' '}
                    Có <strong>{Object.keys(pricingErrors).length}</strong> sản phẩm có Giá bán nhỏ hơn Giá sàn. Nút "Lưu Bảng giá" đã tự động bị khóa để bảo vệ biên lợi nhuận.
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md shrink-0">
                  Yêu cầu Giá bán ≥ Giá sàn
                </span>
              </div>
            )}

            {/* Bảng Dòng Sản phẩm */}
            <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Sản phẩm / SKU</th>
                    <th className="py-2.5 px-3 w-20 text-center">ĐVT</th>
                    <th className="py-2.5 px-3 w-40">Giá sàn (Min Price)</th>
                    <th className="py-2.5 px-3 w-44">Giá bán áp dụng</th>
                    {!effectiveReadOnly && <th className="py-2.5 px-3 w-12 text-center">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={effectiveReadOnly ? 5 : 6}
                        className="py-10 text-center text-slate-400"
                      >
                        <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-slate-600">Chưa có sản phẩm nào trong bảng giá</p>
                        {!effectiveReadOnly && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Bấm &quot;Nạp tất cả SKU&quot; hoặc chọn sản phẩm ở trên để thêm dòng giá
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const errorMsg = pricingErrors[item.id];
                      const isItemError = Boolean(errorMsg);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            isItemError ? 'bg-rose-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 leading-snug">
                              {item.productName}
                            </div>
                            <div className="font-mono text-[11px] text-blue-600">
                              {item.productCode}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                              {item.baseUnit || 'Cái'}
                            </span>
                          </td>

                          {/* Ô nhập Giá sàn */}
                          <td className="py-2.5 px-3">
                            <CurrencyInput
                              value={item.minPrice}
                              onChange={(val) =>
                                handleUpdateItem(
                                  item.id,
                                  'minPrice',
                                  val ?? 0,
                                )
                              }
                              disabled={effectiveReadOnly}
                              placeholder="0"
                              className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 disabled:bg-slate-50"
                            />
                          </td>

                          {/* Ô nhập Giá bán + Báo lỗi Realtime */}
                          <td className="py-2.5 px-3">
                            <div>
                              <CurrencyInput
                                value={item.price}
                                onChange={(val) =>
                                  handleUpdateItem(
                                    item.id,
                                    'price',
                                    val ?? 0,
                                  )
                                }
                                disabled={effectiveReadOnly}
                                placeholder="0"
                                className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border focus:outline-none transition-colors disabled:bg-slate-50 ${
                                  isItemError
                                    ? 'border-rose-500 bg-rose-50/70 text-rose-700 ring-2 ring-rose-200/90 focus:ring-rose-300'
                                    : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100'
                                }`}
                              />

                              {isItemError && (
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-rose-600 leading-tight">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                                  <span>Giá bán &lt; Giá sàn ({item.minPrice.toLocaleString('vi-VN')} đ)!</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Nút xóa dòng */}
                          {!effectiveReadOnly && (
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa dòng sản phẩm này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </form>
    </ModalLayout>
  );
};
