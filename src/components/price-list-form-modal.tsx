import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
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
  initialData?: PriceList | null;
  isReadOnly?: boolean;
}

const CUSTOMER_GROUP_OPTIONS: { value: CustomerGroupType; label: string; desc: string }[] = [
  {
    value: 'AGENT_LEVEL_1',
    label: 'Đại lý Cấp 1 (Nhà phân phối)',
    desc: 'Bậc chiết khấu cao nhất cho NPP cấp tỉnh/khu vực',
  },
  {
    value: 'AGENT_LEVEL_2',
    label: 'Đại lý Cấp 2 (Bán buôn)',
    desc: 'Áp dụng cho các đại lý bán buôn, cửa hàng lấy số lượng vừa',
  },
  {
    value: 'RETAIL',
    label: 'Bán lẻ Niêm yết',
    desc: 'Giá niêm yết bán lẻ tiêu chuẩn cho người tiêu dùng cuối',
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

  // Kiểm tra bảng giá đã phát sinh đơn hàng hay chưa
  const hasOrders = Boolean(initialData?.hasOrders);
  const effectiveReadOnly = isReadOnly || hasOrders;

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
      alert(`Sản phẩm [${prod.sku}] đã có trong bảng giá.`);
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
      alert('Vui lòng nhập tên bảng giá.');
      return;
    }

    if (!startDate || !endDate) {
      alert('Vui lòng chọn thời gian bắt đầu và kết thúc.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      return;
    }

    if (hasPricingErrors) {
      alert('Vui lòng sửa các lỗi giá bán thấp hơn giá sàn trước khi lưu.');
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
      onClose();
    } catch {
      // Toast xử lý ở component cha
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {initialData
                    ? effectiveReadOnly
                      ? `Chi tiết Bảng giá: ${initialData.name}`
                      : `Chỉnh sửa Bảng giá: ${initialData.name}`
                    : 'Thiết lập Bảng giá & Chiết khấu Mới'}
                </h2>
                {initialData && (
                  <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md bg-slate-100 text-slate-700">
                    v{initialData.version}.0
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {effectiveReadOnly
                  ? 'Bảng giá ở chế độ chỉ đọc do đã phát sinh giao dịch hoặc phân quyền'
                  : 'Cấu hình giá bán theo nhóm khách hàng B2B, ràng buộc giá sàn và thời gian áp dụng'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner cảnh báo vàng khi hasOrders == true */}
        {hasOrders && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-xs">
                <strong className="font-semibold block text-amber-950 sm:inline">
                  Đã phát sinh đơn hàng:
                </strong>{' '}
                Bảng giá này đã phát sinh đơn hàng thực tế nên không thể chỉnh sửa trực tiếp nhằm
                bảo toàn lịch sử hóa đơn.
              </div>
            </div>

            {onClone && initialData && (
              <button
                type="button"
                onClick={() => {
                  onClone(initialData);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Tạo phiên bản mới (Clone Version)</span>
              </button>
            )}
          </div>
        )}

        {/* Body Form cuộn linh hoạt */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Nhóm thông tin chung */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Thông tin chung Bảng giá</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              {/* Mã bảng giá */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Mã định danh</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={effectiveReadOnly || Boolean(initialData)}
                  placeholder="BG-AGENT1-2026"
                  className="w-full px-3.5 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              {/* Nhóm khách hàng áp dụng */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nhóm khách hàng áp dụng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={customerGroup}
                  onChange={(e) => setCustomerGroup(e.target.value as CustomerGroupType)}
                  disabled={effectiveReadOnly}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
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
                  Ngày bắt đầu hiệu lực <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={effectiveReadOnly}
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Ngày kết thúc */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Ngày kết thúc hiệu lực <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={effectiveReadOnly}
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
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
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mô tả / Ghi chú */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Ghi chú & Phạm vi</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={effectiveReadOnly}
                  placeholder="Ghi chú điều kiện thương mại, thời hạn hoặc khu vực ưu đãi..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Nhóm Chi tiết Giá từng sản phẩm & Validation Giá sàn */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Danh sách Sản phẩm & Ma trận Giá bán ({items.length} mặt hàng)
                  </h3>
                  {hasPricingErrors && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      Phát hiện giá bán dưới giá sàn!
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Quy định bất biến: <strong>Giá bán (Price)</strong> bắt buộc phải lớn hơn hoặc bằng{' '}
                  <strong>Giá sàn (Min Price)</strong> để tránh bán phá giá.
                </p>
              </div>

              {!effectiveReadOnly && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadAllProducts}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    + Nạp tất cả SKU
                  </button>

                  <div className="flex items-center gap-1">
                    <select
                      value={selectedProductToAdd}
                      onChange={(e) => setSelectedProductToAdd(e.target.value)}
                      className="px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer max-w-[200px]"
                    >
                      <option value="">-- Chọn sản phẩm thêm --</option>
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
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bảng Dòng Sản phẩm */}
            <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Sản phẩm / SKU</th>
                    <th className="py-2.5 px-3 w-24">Đơn vị</th>
                    <th className="py-2.5 px-3 w-44">
                      Giá sàn (Min Price)
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Mức sàn tối thiểu
                      </span>
                    </th>
                    <th className="py-2.5 px-3 w-48">
                      Giá bán áp dụng
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Giá tính vào đơn
                      </span>
                    </th>
                    {!effectiveReadOnly && <th className="py-2.5 px-3 w-14 text-center">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={effectiveReadOnly ? 5 : 6}
                        className="py-8 text-center text-slate-400 text-xs"
                      >
                        Chưa có sản phẩm nào trong bảng giá này. Nhấn "+ Nạp tất cả SKU" hoặc chọn
                        sản phẩm để thêm dòng giá.
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

                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                              {item.baseUnit || 'Cái'}
                            </span>
                          </td>

                          {/* Ô nhập Giá sàn */}
                          <td className="py-2.5 px-3">
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={item.minPrice}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    item.id,
                                    'minPrice',
                                    Math.max(0, Number(e.target.value) || 0),
                                  )
                                }
                                disabled={effectiveReadOnly}
                                className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 disabled:bg-slate-50"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono pointer-events-none">
                                đ
                              </span>
                            </div>
                          </td>

                          {/* Ô nhập Giá bán + Báo lỗi Realtime */}
                          <td className="py-2.5 px-3">
                            <div>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  step={1000}
                                  value={item.price}
                                  onChange={(e) =>
                                    handleUpdateItem(
                                      item.id,
                                      'price',
                                      Math.max(0, Number(e.target.value) || 0),
                                    )
                                  }
                                  disabled={effectiveReadOnly}
                                  className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border focus:outline-none transition-colors disabled:bg-slate-50 ${
                                    isItemError
                                      ? 'border-rose-400 text-rose-700 bg-rose-50/50 focus:ring-2 focus:ring-rose-200'
                                      : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100'
                                  }`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono pointer-events-none">
                                  đ
                                </span>
                              </div>

                              {isItemError && (
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600 leading-tight">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span>Giá bán &lt; Giá sàn!</span>
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

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {hasPricingErrors ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Vui lòng điều chỉnh các dòng giá bị vi phạm giá sàn trước khi lưu.
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Dữ liệu hợp lệ, sẵn sàng lưu vào hệ thống.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {effectiveReadOnly ? 'Đóng' : 'Hủy bỏ'}
            </button>

            {!effectiveReadOnly && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || hasPricingErrors}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white shadow-xs transition-all cursor-pointer"
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
      </div>
    </div>,
    document.body,
  );
};
