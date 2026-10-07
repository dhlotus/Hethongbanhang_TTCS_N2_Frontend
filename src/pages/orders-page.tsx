import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  FileText,
  Truck,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { ordersService, DEMO_CUSTOMERS } from '../services/orders.service';
import { getStoredUser } from '../utils/navigation';
import type {
  Order,
  OrderLine,
  OrderStatus,
  CustomerOption,
  DeliveryPoint,
} from '../types/order';
import type { Product, ProductUnit } from '../types/products';

// ──────────────────────────────────────────────────────────────────────────
// HELPERS & FORMATTERS
// ──────────────────────────────────────────────────────────────────────────

/** Định dạng tiền tệ VND */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

/** Định dạng ngày DD/MM/YYYY */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

/** Ngày mặc định giao hàng: hôm nay + 3 ngày */
const getDefaultDeliveryDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
};

// ──────────────────────────────────────────────────────────────────────────
// CẤU HÌNH TRẠNG THÁI ĐƠN HÀNG
// ──────────────────────────────────────────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bgClass: string; textClass: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Nháp',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-600',
    icon: <FileText className="w-3 h-3" />,
  },
  PENDING: {
    label: 'Chờ duyệt',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    icon: <Clock className="w-3 h-3" />,
  },
  APPROVED: {
    label: 'Đã duyệt',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  PROCESSING: {
    label: 'Đang soạn',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    icon: <Package className="w-3 h-3" />,
  },
  SHIPPED: {
    label: 'Đã xuất kho',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-700',
    icon: <Truck className="w-3 h-3" />,
  },
  DELIVERED: {
    label: 'Giao thành công',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  CANCELLED: {
    label: 'Đã hủy',
    bgClass: 'bg-red-50',
    textClass: 'text-red-600',
    icon: <X className="w-3 h-3" />,
  },
  RETURNED: {
    label: 'Hoàn hàng',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

/** Badge trạng thái đơn hàng */
const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const cfg = ORDER_STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgClass} ${cfg.textClass}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// COMPONENT: MODAL TẠO ĐƠN HÀNG (SN-39)
// ──────────────────────────────────────────────────────────────────────────

interface CreateOrderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (order: Order) => void;
}

const DRAFT_KEY = 'new-order-modal';

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const [step, setStep] = useState<1 | 2>(1); // 1=Chọn đại lý, 2=Thêm hàng

  // Bước 1: Chọn đại lý
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>(DEMO_CUSTOMERS);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [deliveryPoint, setDeliveryPoint] = useState<Partial<DeliveryPoint>>({});
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());
  const [note, setNote] = useState('');

  // Bước 2: Tìm kiếm và thêm sản phẩm
  const [productQuery, setProductQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Khôi phục nháp
  useEffect(() => {
    if (!open) return;
    const draft = ordersService.getDraft(DRAFT_KEY);
    if (draft?.lines && draft.lines.length > 0) {
      setLines(draft.lines);
      if (draft.customerId) {
        const c = DEMO_CUSTOMERS.find((x) => x.id === draft.customerId);
        if (c) setSelectedCustomer(c);
      }
      if (draft.deliveryDate) setDeliveryDate(draft.deliveryDate);
      if (draft.note) setNote(draft.note);
      showToast('info', 'Đã khôi phục nháp đơn hàng từ lần trước');
    }
  }, [open]);

  // Tự động lưu nháp khi lines thay đổi
  useEffect(() => {
    if (!open || lines.length === 0) return;
    ordersService.saveDraft(DRAFT_KEY, {
      customerId: selectedCustomer?.id,
      deliveryDate,
      note,
      lines,
    });
  }, [lines, selectedCustomer, deliveryDate, note, open]);

  // Tìm kiếm sản phẩm với debounce 400ms
  useEffect(() => {
    if (step !== 2) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await ordersService.searchProducts(productQuery);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [productQuery, step]);

  // Tìm kiếm đại lý
  useEffect(() => {
    const filtered = DEMO_CUSTOMERS.filter(
      (c) =>
        !customerSearch ||
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(customerSearch.toLowerCase()),
    );
    setCustomers(filtered);
  }, [customerSearch]);

  /** Thêm sản phẩm vào dòng hàng */
  const handleAddProduct = useCallback(
    (product: Product) => {
      // Kiểm tra đã có trong danh sách chưa
      if (lines.some((l) => l.productId === product.id)) {
        showToast('warning', `${product.name} đã có trong đơn hàng. Vui lòng điều chỉnh số lượng.`);
        return;
      }

      const defaultUnit = product.baseUnit;
      const newLine: OrderLine = {
        id: `line-${Date.now()}`,
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        unit: defaultUnit,
        baseUnit: product.baseUnit,
        conversionRate: 1,
        quantity: 1,
        baseQuantity: 1,
        unitPrice: product.price,
        listPrice: product.price,
        discountPercent: 0,
        lineTotal: product.price,
        stockAvailable: product.stockQuantity,
      };
      setLines((prev) => [...prev, newLine]);
      setProductQuery('');
    },
    [lines],
  );

  /** Cập nhật số lượng hoặc đơn vị của một dòng hàng */
  const handleUpdateLine = useCallback(
    (
      lineId: string,
      field: 'quantity' | 'unit' | 'discountPercent',
      value: string | number,
      product?: Product,
    ) => {
      setLines((prev) =>
        prev.map((line) => {
          if (line.id !== lineId) return line;

          let updated = { ...line };

          if (field === 'unit' && product) {
            const targetUnit = String(value);
            const productUnit = product.units?.find(
              (u: ProductUnit) => u.unitName === targetUnit,
            );
            const convRate = productUnit?.conversionRate ?? 1;
            updated = {
              ...updated,
              unit: targetUnit,
              conversionRate: convRate,
              baseQuantity: Math.round(updated.quantity * convRate),
            };
          } else if (field === 'quantity') {
            const qty = Math.max(1, Number(value) || 1);
            updated = {
              ...updated,
              quantity: qty,
              baseQuantity: Math.round(qty * updated.conversionRate),
            };
          } else if (field === 'discountPercent') {
            const disc = Math.min(100, Math.max(0, Number(value) || 0));
            const discPrice = updated.listPrice * (1 - disc / 100);
            updated = {
              ...updated,
              discountPercent: disc,
              unitPrice: Math.round(discPrice),
            };
          }

          updated.lineTotal = updated.quantity * updated.unitPrice;
          return updated;
        }),
      );
    },
    [],
  );

  /** Xóa dòng hàng */
  const handleRemoveLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  // Tính tổng đơn hàng
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    for (const l of lines) {
      subtotal += l.quantity * l.listPrice;
      totalDiscount += l.quantity * (l.listPrice - l.unitPrice);
    }
    return { subtotal, totalDiscount, grandTotal: subtotal - totalDiscount };
  }, [lines]);

  /** Submit tạo đơn hàng */
  const handleSubmit = async () => {
    if (!selectedCustomer) {
      showToast('error', 'Vui lòng chọn đại lý trước khi tạo đơn');
      return;
    }
    if (lines.length === 0) {
      showToast('error', 'Vui lòng thêm ít nhất 1 sản phẩm vào đơn hàng');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await ordersService.createOrder({
        customerId: selectedCustomer.id,
        deliveryPoint: Object.keys(deliveryPoint).length > 0 ? deliveryPoint : undefined,
        deliveryDate,
        lines: lines.map((l) => ({
          productId: l.productId,
          productSku: l.productSku,
          productName: l.productName,
          unit: l.unit,
          baseUnit: l.baseUnit,
          conversionRate: l.conversionRate,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          listPrice: l.listPrice,
          discountPercent: l.discountPercent,
          stockAvailable: l.stockAvailable,
        })),
        note,
      });

      ordersService.clearDraft(DRAFT_KEY);
      showToast('success', `Tạo đơn hàng ${created.orderCode} thành công!`);
      onCreated(created);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo đơn hàng';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedCustomer(null);
    setLines([]);
    setCustomerSearch('');
    setProductQuery('');
    setNote('');
    setDeliveryDate(getDefaultDeliveryDate());
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Tạo Đơn Hàng Mới</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bước {step}/2:{' '}
              {step === 1 ? 'Chọn đại lý & thông tin giao hàng' : 'Thêm sản phẩm & xác nhận'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bước chỉ báo */}
        <div className="flex px-5 pt-3 pb-2 gap-2 flex-shrink-0">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Nội dung theo bước */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* ── BƯỚC 1: Chọn đại lý ── */}
          {step === 1 && (
            <>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Tìm kiếm đại lý</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Nhập mã hoặc tên đại lý..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Danh sách đại lý */}
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        if (c.deliveryPoints?.[0]) {
                          setDeliveryPoint(c.deliveryPoints[0]);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedCustomer?.id === c.id
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{c.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {c.code} · {c.phone}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.group === 'AGENT_LEVEL_1'
                              ? 'bg-purple-50 text-purple-700'
                              : c.group === 'AGENT_LEVEL_2'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {c.group === 'AGENT_LEVEL_1'
                            ? 'Đại lý Cấp 1'
                            : c.group === 'AGENT_LEVEL_2'
                            ? 'Đại lý Cấp 2'
                            : 'Bán lẻ'}
                        </span>
                      </div>
                      {c.creditLimit && (
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                          <span>Hạn mức: {formatCurrency(c.creditLimit)}</span>
                          <span>Công nợ: {formatCurrency(c.currentDebt ?? 0)}</span>
                        </div>
                      )}
                    </button>
                  ))}
                  {customers.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-6">
                      Không tìm thấy đại lý phù hợp
                    </p>
                  )}
                </div>
              </div>

              {/* Điểm giao hàng */}
              {selectedCustomer && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700">
                    Điểm giao hàng
                  </label>
                  <input
                    type="text"
                    value={deliveryPoint.address ?? ''}
                    onChange={(e) =>
                      setDeliveryPoint((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="Địa chỉ giao hàng..."
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Ngày giao hàng */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Ngày giao hàng mong muốn
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ghi chú */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Ghi chú</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú đặc biệt cho đơn hàng (tuỳ chọn)..."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {/* ── BƯỚC 2: Thêm sản phẩm ── */}
          {step === 2 && (
            <>
              {/* Tìm kiếm sản phẩm */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Tìm kiếm sản phẩm
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Nhập mã SKU hoặc tên sản phẩm..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {isSearching && (
                    <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                  )}
                </div>

                {/* Kết quả tìm kiếm */}
                {searchResults.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-44 overflow-y-auto">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleAddProduct(p)}
                        disabled={lines.some((l) => l.productId === p.id)}
                        className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-blue-50 border-b border-slate-100 last:border-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800 leading-snug">
                            {p.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {p.sku} · {p.baseUnit} · Tồn: {p.stockQuantity}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-blue-600 shrink-0 ml-3">
                          {formatCurrency(p.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Danh sách dòng hàng */}
              {lines.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có sản phẩm nào. Tìm kiếm và thêm ở trên.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Danh sách hàng ({lines.length} dòng)
                  </p>
                  {lines.map((line) => (
                    <div
                      key={line.id}
                      className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50"
                    >
                      {/* Tên sản phẩm + Xóa */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {line.productName}
                          </p>
                          <p className="text-xs text-slate-500">{line.productSku}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveLine(line.id!)}
                          className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Số lượng + Đơn vị + Chiết khấu */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Số lượng</label>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => handleUpdateLine(line.id!, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Đơn vị</label>
                          <select
                            value={line.unit}
                            onChange={(e) => handleUpdateLine(line.id!, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value={line.baseUnit}>{line.baseUnit}</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Chiết khấu %</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={line.discountPercent}
                            onChange={(e) =>
                              handleUpdateLine(line.id!, 'discountPercent', e.target.value)
                            }
                            className="w-full px-2 py-1.5 text-sm text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Thành tiền */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Đơn giá: {formatCurrency(line.unitPrice)}/{line.unit}
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {formatCurrency(line.lineTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tổng kết đơn hàng */}
              {lines.length > 0 && (
                <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/50 space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Tổng tiền hàng</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Chiết khấu</span>
                    <span>- {formatCurrency(totals.totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-blue-200">
                    <span>Tổng phải thu</span>
                    <span className="text-blue-700">{formatCurrency(totals.grandTotal)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 flex-shrink-0 gap-3">
          <button
            onClick={step === 1 ? handleClose : () => setStep(1)}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {step === 1 ? 'Hủy' : '← Quay lại'}
          </button>

          <div className="flex items-center gap-2">
            {step === 2 && lines.length > 0 && (
              <span className="text-xs text-slate-400 italic">Nháp đã lưu tự động</span>
            )}
            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                disabled={!selectedCustomer}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || lines.length === 0}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors inline-flex items-center gap-2"
              >
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Đang tạo...' : 'Tạo Đơn hàng'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// COMPONENT: TRANG QUẢN LÝ ĐƠN HÀNG (SN-38)
// ──────────────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: OrderStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DRAFT', label: 'Nháp' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'PROCESSING', label: 'Đang soạn' },
  { key: 'DELIVERED', label: 'Giao thành công' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const user = getStoredUser();
  const isSalesRep = user?.roles?.includes('SALES_REP');
  const isSalesManager = user?.roles?.includes('SALES_MANAGER');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersService.getOrders({
        page,
        limit,
        status: statusFilter,
        search: searchTerm || undefined,
      });
      setOrders(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      showToast('error', 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchTerm]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOrderCreated = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setTotal((t) => t + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              Quản lý Đơn hàng
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Tạo và theo dõi đơn hàng bán buôn cho đại lý
            </p>
          </div>
          {(isSalesRep || isSalesManager) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tạo Đơn hàng
            </button>
          )}
        </div>

        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm mã đơn, tên đại lý..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tabs trạng thái — cuộn ngang trên mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key as OrderStatus | 'ALL');
                  setPage(1);
                }}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách đơn hàng */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Đang tải đơn hàng...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="text-sm font-medium">Chưa có đơn hàng nào</p>
              {(isSalesRep || isSalesManager) && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  + Tạo đơn hàng đầu tiên
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Mã đơn
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Đại lý
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Ngày giao
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Tổng phải thu
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">
                            {order.orderCode ?? order.id?.slice(-8)}
                          </p>
                          <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700 font-medium">{order.customerName}</p>
                          <p className="text-xs text-slate-400">{order.customerCode}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(order.deliveryDate)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {formatCurrency(order.grandTotal)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setViewOrder(order)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card */}
              <div className="sm:hidden divide-y divide-slate-100">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setViewOrder(order)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {order.orderCode} · {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-800">
                          {formatCurrency(order.grandTotal)}
                        </p>
                        <div className="mt-1">
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Hiển thị {Math.min((page - 1) * limit + 1, total)}–
              {Math.min(page * limit, total)} / {total} đơn hàng
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-slate-600 font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tạo đơn hàng */}
      <CreateOrderModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleOrderCreated}
      />

      {/* Modal Xem chi tiết đơn hàng */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Chi tiết Đơn hàng
                </h2>
                <p className="text-xs text-slate-500">{viewOrder.orderCode}</p>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Thông tin đại lý */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Đại lý:</span>
                  <span className="font-medium text-slate-800">{viewOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày giao:</span>
                  <span className="text-slate-700">{formatDate(viewOrder.deliveryDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nhân viên KD:</span>
                  <span className="text-slate-700">{viewOrder.salesRepName ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Trạng thái:</span>
                  <OrderStatusBadge status={viewOrder.status} />
                </div>
              </div>

              {/* Danh sách dòng hàng */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  Danh sách hàng
                </div>
                {viewOrder.lines.map((line, i) => (
                  <div
                    key={i}
                    className="px-3 py-2.5 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {line.productName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {line.quantity} {line.unit} × {formatCurrency(line.unitPrice)}
                          {line.discountPercent > 0 && (
                            <span className="ml-1 text-green-600">(-{line.discountPercent}%)</span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 shrink-0">
                        {formatCurrency(line.lineTotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tổng kết */}
              <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền hàng</span>
                  <span>{formatCurrency(viewOrder.subtotal)}</span>
                </div>
                {viewOrder.totalDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Chiết khấu</span>
                    <span>- {formatCurrency(viewOrder.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-100">
                  <span>Tổng phải thu</span>
                  <span className="text-blue-700">{formatCurrency(viewOrder.grandTotal)}</span>
                </div>
              </div>

              {viewOrder.note && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5">
                  <span className="font-medium text-slate-700">Ghi chú: </span>
                  {viewOrder.note}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewOrder(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
