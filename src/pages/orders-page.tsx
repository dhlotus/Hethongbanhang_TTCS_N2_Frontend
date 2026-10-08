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
  MapPin,
  User,
  Phone,
  Edit,
  Save,
  Send,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { ordersService } from '../services/orders.service';
import { customersService } from '../services/customers.service';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import { getStoredUser } from '../utils/navigation';
import type {
  Order,
  OrderLine,
  OrderStatus,
  CustomerOption,
} from '../types/order';
import type { Customer, DeliveryPoint } from '../types/customer';
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
    textClass: 'text-slate-700 font-semibold',
    icon: <FileText className="w-3 h-3" />,
  },
  PENDING: {
    label: 'Chờ duyệt',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    icon: <Clock className="w-3 h-3" />,
  },
  PENDING_INVENTORY_APPROVAL: {
    label: 'Chờ duyệt tồn kho',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    icon: <AlertCircle className="w-3 h-3" />,
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
// COMPONENT: MODAL TẠO & SOẠN ĐƠN HÀNG (SN-38 & SN-39)
// ──────────────────────────────────────────────────────────────────────────

interface CreateOrderModalProps {
  open: boolean;
  editingOrder?: Order | null;
  onClose: () => void;
  onSaved: (order: Order) => void;
}

const LOCAL_DRAFT_KEY = 'new_order_draft';

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  open,
  editingOrder,
  onClose,
  onSaved,
}) => {
  const [step, setStep] = useState<1 | 2>(1); // 1 = Đại lý & Điểm giao, 2 = Thêm dòng hàng

  // Danh sách đại lý lấy từ API
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Đại lý & Điểm giao hàng được chọn (SN-31)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
  const [selectedDeliveryPoint, setSelectedDeliveryPoint] = useState<DeliveryPoint | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // Thông tin giao hàng & ghi chú
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());
  const [note, setNote] = useState('');

  // Bước 2: Danh mục dòng hàng
  const [productQuery, setProductQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Tải danh sách đại lý từ API khi mở modal
  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const data = await ordersService.getCustomers(customerSearch);
      setCustomers(data);
    } catch {
      showToast('error', 'Không thể tải danh sách đại lý');
    } finally {
      setLoadingCustomers(false);
    }
  }, [customerSearch]);

  useEffect(() => {
    if (open) {
      void (async () => {
        await loadCustomers();
      })();
    }
  }, [open, loadCustomers]);

  // Khôi phục dữ liệu: Từ đơn hàng cần soạn tiếp (SN-39) hoặc từ local draft
  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      if (editingOrder) {
        // Chế độ mở lại tiếp tục gõ đơn (SN-39)
        const foundCustomer = customers.find((c) => c.id === editingOrder.customerId);
        if (foundCustomer) {
          setSelectedCustomer(foundCustomer);
          setDeliveryPoints(foundCustomer.deliveryPoints || []);
          if (editingOrder.deliveryPoint?.id) {
            const matchDp = foundCustomer.deliveryPoints?.find(
              (p) => p.id === editingOrder.deliveryPoint?.id,
            );
            setSelectedDeliveryPoint(matchDp || (editingOrder.deliveryPoint as DeliveryPoint));
          } else if (editingOrder.deliveryPoint) {
            setSelectedDeliveryPoint(editingOrder.deliveryPoint as DeliveryPoint);
          }
        } else {
          setSelectedCustomer({
            id: editingOrder.customerId,
            code: editingOrder.customerCode,
            name: editingOrder.customerName,
            group: editingOrder.customerGroup || 'AGENT_LEVEL_1',
            customerGroup: editingOrder.customerGroup || 'AGENT_LEVEL_1',
            creditLimit: 0,
            currentDebt: 0,
            phone: '',
            status: 'ACTIVE',
            deliveryPoints: editingOrder.deliveryPoint ? [editingOrder.deliveryPoint as DeliveryPoint] : [],
          });
          if (editingOrder.deliveryPoint) {
            setSelectedDeliveryPoint(editingOrder.deliveryPoint as DeliveryPoint);
          }
        }

        setDeliveryDate(editingOrder.deliveryDate || getDefaultDeliveryDate());
        setNote(editingOrder.note || '');
        setLines(editingOrder.lines || []);
        setStep(editingOrder.lines && editingOrder.lines.length > 0 ? 2 : 1);
        showToast('info', `Đang tiếp tục soạn đơn hàng ${editingOrder.orderCode}`);
      } else {
        // Kiểm tra local draft nếu không có editingOrder
        const savedDraft = ordersService.getDraft(LOCAL_DRAFT_KEY);
        if (savedDraft?.lines && savedDraft.lines.length > 0) {
          setLines(savedDraft.lines);
          if (savedDraft.deliveryDate) setDeliveryDate(savedDraft.deliveryDate);
          if (savedDraft.note) setNote(savedDraft.note);
        }
      }
    });
  }, [open, editingOrder, customers]);

  // Tự động lưu nháp client khi lines thay đổi (nếu không phải đang chỉnh sửa đơn đã có)
  useEffect(() => {
    if (!open || lines.length === 0 || editingOrder) return;
    ordersService.saveDraft(LOCAL_DRAFT_KEY, {
      customerId: selectedCustomer?.id,
      deliveryPoint: selectedDeliveryPoint || undefined,
      deliveryDate,
      note,
      lines,
    });
  }, [lines, selectedCustomer, selectedDeliveryPoint, deliveryDate, note, open, editingOrder]);

  // Xử lý khi chọn một Đại lý (SN-31: Đơn hàng chọn điểm giao trong danh sách của đúng đại lý đó)
  const handleSelectCustomer = useCallback(async (c: CustomerOption) => {
    setSelectedCustomer(c);

    try {
      // Lấy danh sách điểm giao hàng chính thức từ backend
      const points = await customersService.getDeliveryPoints(c.id);
      setDeliveryPoints(points);

      // Tự động chọn điểm giao hàng mặc định (SN-31)
      const defaultPoint = points.find((p) => p.isDefault) || points[0] || null;
      setSelectedDeliveryPoint(defaultPoint);
    } catch {
      // Fallback từ c.deliveryPoints
      const fallbackPoints = c.deliveryPoints || [];
      setDeliveryPoints(fallbackPoints);
      const defaultPoint = fallbackPoints.find((p) => p.isDefault) || fallbackPoints[0] || null;
      setSelectedDeliveryPoint(defaultPoint);
    }
  }, []);

  // Tìm kiếm sản phẩm (debounce 300ms)
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
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [productQuery, step]);

  /** Thêm sản phẩm vào dòng hàng (SN-38) */
  const handleAddProduct = useCallback(
    (product: Product) => {
      if (lines.some((l) => l.productId === product.id)) {
        showToast('warning', `${product.name} đã có trong đơn. Bạn có thể điều chỉnh số lượng bên dưới.`);
        return;
      }

      const defaultUnit = product.baseUnit;
      const newLine: OrderLine = {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

      setLines((prev) => [newLine, ...prev]);
      setProductQuery('');
      setSearchResults([]);
      showToast('success', `Đã thêm ${product.name}`);
    },
    [lines],
  );

  /** Cập nhật số lượng, đơn vị hoặc chiết khấu của dòng hàng (Live Calculation SN-38) */
  const handleUpdateLine = useCallback(
    (
      lineId: string,
      field: 'quantity' | 'unit' | 'discountPercent',
      value: string | number,
      availableUnits?: ProductUnit[],
    ) => {
      setLines((prev) =>
        prev.map((line) => {
          if (line.id !== lineId) return line;

          let updated = { ...line };

          if (field === 'unit') {
            const selectedUnitName = String(value);
            const foundUnit = availableUnits?.find((u) => u.unitName === selectedUnitName);
            const conv = foundUnit?.conversionRate || 1;
            // Cập nhật giá theo đơn vị quy đổi nếu có, hoặc nhân với tỷ lệ
            const unitListPrice = foundUnit ? line.listPrice * conv : line.listPrice;
            const discount = updated.discountPercent || 0;
            const discountedPrice = Math.round(unitListPrice * (1 - discount / 100));

            updated = {
              ...updated,
              unit: selectedUnitName,
              conversionRate: conv,
              baseQuantity: Math.round(updated.quantity * conv),
              unitPrice: discountedPrice,
              lineTotal: updated.quantity * discountedPrice,
            };
          } else if (field === 'quantity') {
            const qty = Math.max(1, Number(value) || 1);
            
            // Auto calculate discount based on qty (Mock)
            let autoDiscount = 0;
            if (qty >= 100) autoDiscount = 10;
            else if (qty >= 50) autoDiscount = 5;
            else if (qty >= 10) autoDiscount = 2;
            
            const discPrice = updated.listPrice * (1 - autoDiscount / 100);

            updated = {
              ...updated,
              quantity: qty,
              baseQuantity: Math.round(qty * updated.conversionRate),
              discountPercent: autoDiscount,
              unitPrice: Math.round(discPrice),
              lineTotal: Math.round(qty * discPrice),
            };
          } else if (field === 'discountPercent') {
            const disc = Math.min(100, Math.max(0, Number(value) || 0));
            const discountedPrice = Math.round(updated.listPrice * (1 - disc / 100));
            updated = {
              ...updated,
              discountPercent: disc,
              unitPrice: discountedPrice,
              lineTotal: Math.round(updated.quantity * discountedPrice),
            };
          }

          return updated;
        }),
      );
    },
    [],
  );

  /** Xóa 1 dòng hàng */
  const handleRemoveLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  // Tính toán trực tiếp tổng tiền hàng, chiết khấu và tổng phải thu (SN-38 Live Calculation)
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;

    for (const l of lines) {
      const lineList = l.quantity * l.listPrice;
      const lineNet = l.quantity * l.unitPrice;
      subtotal += lineList;
      totalDiscount += Math.max(0, lineList - lineNet);
    }

    return {
      subtotal,
      totalDiscount,
      grandTotal: Math.max(0, subtotal - totalDiscount),
    };
  }, [lines]);

  /** Lưu đơn hàng: status = 'DRAFT' (Lưu nháp SN-39) hoặc 'PENDING' (Tạo đơn hàng chính thức) */
  const handleSaveOrder = async (targetStatus: 'DRAFT' | 'PENDING') => {
    if (!selectedCustomer) {
      showToast('error', 'Vui lòng chọn đại lý trước khi lưu đơn');
      return;
    }
    if (lines.length === 0) {
      showToast('error', 'Vui lòng thêm ít nhất 1 sản phẩm vào đơn hàng');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadLines = lines.map((l) => ({
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
      }));

      const payloadDeliveryPoint = selectedDeliveryPoint
        ? {
            id: selectedDeliveryPoint.id,
            name: selectedDeliveryPoint.name,
            address: selectedDeliveryPoint.address,
            receiverName: selectedDeliveryPoint.receiverName || selectedDeliveryPoint.contactPerson,
            phone: selectedDeliveryPoint.phone,
            roadNote: selectedDeliveryPoint.roadNote,
          }
        : undefined;

      let resultOrder: Order;

      if (editingOrder?.id) {
        // Cập nhật đơn hàng nháp đang có (SN-39)
        resultOrder = await ordersService.updateOrder(editingOrder.id, {
          customerId: selectedCustomer.id,
          deliveryPoint: payloadDeliveryPoint,
          deliveryDate,
          lines: payloadLines,
          note,
          status: targetStatus,
        });
        showToast(
          'success',
          targetStatus === 'DRAFT'
            ? `Đã cập nhật lưu nháp đơn ${resultOrder.orderCode}`
            : `Đã gửi duyệt thành công đơn ${resultOrder.orderCode}!`,
        );
      } else {
        // Tạo đơn hàng mới
        resultOrder = await ordersService.createOrder({
          customerId: selectedCustomer.id,
          deliveryPoint: payloadDeliveryPoint,
          deliveryDate,
          lines: payloadLines,
          note,
          status: targetStatus,
        });
        ordersService.clearDraft(LOCAL_DRAFT_KEY);

        if (resultOrder.status === 'PENDING_INVENTORY_APPROVAL') {
          setCreatedOrder(resultOrder);
          setShowWarningModal(true);
        } else {
          showToast(
            'success',
            targetStatus === 'DRAFT'
              ? `Đã lưu nháp đơn ${resultOrder.orderCode}. Bạn có thể mở lại tiếp tục gõ bất cứ lúc nào!`
              : `Tạo đơn hàng ${resultOrder.orderCode} thành công!`,
          );
        }
      }

      onSaved(resultOrder);
      if (resultOrder.status !== 'PENDING_INVENTORY_APPROVAL') {
        handleClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu đơn hàng';
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedCustomer(null);
    setSelectedDeliveryPoint(null);
    setLines([]);
    setCustomerSearch('');
    setProductQuery('');
    setNote('');
    setDeliveryDate(getDefaultDeliveryDate());
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl w-full max-w-3xl max-h-[96vh] flex flex-col shadow-lg overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 truncate">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)] shrink-0" />
                <span>{editingOrder ? `Tiếp tục gõ đơn: ${editingOrder.orderCode}` : 'Tạo Đơn Hàng Mới'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Bước {step}/2:{' '}
                {step === 1 ? 'Chọn đại lý & Điểm giao hàng (SN-31)' : 'Thêm dòng hàng & Tính tiền trực tiếp (SN-38)'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper indicator */}
          <div className="flex px-3.5 sm:px-6 pt-3 pb-2 gap-2 flex-shrink-0 bg-white">
            <div
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                step >= 1 ? 'bg-[var(--color-primary)]' : 'bg-slate-200'
              }`}
            />
            <div
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                step >= 2 ? 'bg-[var(--color-primary)]' : 'bg-slate-200'
              }`}
            />
          </div>

          {/* Nội dung theo bước (Thân thiện màn hình 360px) */}
          <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-3.5 space-y-4">
            {/* ── BƯỚC 1: Chọn đại lý & Điểm giao hàng (SN-31 & SN-32) ── */}
            {step === 1 && (
              <>
                {/* 1.1 Tìm kiếm & chọn đại lý */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
                      1. Chọn Đại lý B2B *
                    </label>
                    {selectedCustomer && (
                      <span className="text-xs text-[var(--color-primary)] font-medium">
                        Đã chọn: {selectedCustomer.name}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Tìm theo tên đại lý, mã hoặc số điện thoại..."
                      className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-white"
                    />
                  </div>

                  {/* Danh sách đại lý */}
                  <div className="space-y-2 max-h-44 sm:max-h-52 overflow-y-auto pr-0.5">
                    {loadingCustomers ? (
                      <div className="text-center py-6 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-[var(--color-primary)]" />
                        <span className="text-xs">Đang tải danh sách đại lý...</span>
                      </div>
                    ) : customers.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6">
                        Không tìm thấy đại lý phù hợp
                      </p>
                    ) : (
                      customers.map((c) => {
                        const isSelected = selectedCustomer?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              isSelected
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/70 ring-1 ring-[var(--color-primary)] shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug truncate">
                                  {c.name}
                                </p>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                  {c.code} · SĐT: {c.phone || '—'}
                                </p>
                              </div>
                              <span className="shrink-0 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                                {c.group === 'AGENT_LEVEL_1'
                                  ? 'Cấp 1'
                                  : c.group === 'AGENT_LEVEL_2'
                                  ? 'Cấp 2'
                                  : 'Bán lẻ'}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 1.2 Chọn điểm giao hàng của đúng đại lý đó (SN-31 & SN-32) */}
                {selectedCustomer && (
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        2. Điểm giao hàng (SN-31) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsDeliveryModalOpen(true)}
                        className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Quản lý / Khai báo điểm giao
                      </button>
                    </div>

                    {deliveryPoints.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Đại lý chưa có điểm giao hàng nào.</p>
                          <button
                            type="button"
                            onClick={() => setIsDeliveryModalOpen(true)}
                            className="mt-1 text-[var(--color-primary)] hover:underline font-medium"
                          >
                            + Bấm vào đây để khai báo điểm giao hàng đầu tiên
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Dropdown danh sách điểm giao */}
                        <div className="grid grid-cols-1 gap-2">
                          {deliveryPoints.map((dp) => {
                            const isChosen = selectedDeliveryPoint?.id === dp.id;
                            return (
                              <div
                                key={dp.id}
                                onClick={() => setSelectedDeliveryPoint(dp)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  isChosen
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/60 ring-1 ring-[var(--color-primary)] shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs sm:text-sm font-semibold text-slate-800">
                                        {dp.name}
                                      </span>
                                      {dp.isDefault && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                                          Mặc định
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                      <span>{dp.address}</span>
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] sm:text-xs text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3 text-slate-400" />
                                        {dp.receiverName || dp.contactPerson || '—'}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        {dp.phone || '—'}
                                      </span>
                                    </div>
                                    {dp.roadNote && (
                                      <p className="text-[11px] sm:text-xs text-amber-700 mt-1.5 flex items-start gap-1">
                                        <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                        <span>Ghi chú xe tải: {dp.roadNote}</span>
                                      </p>
                                    )}
                                  </div>
                                  <div className="shrink-0 mt-1">
                                    <input
                                      type="radio"
                                      name="selectedDeliveryPoint"
                                      checked={isChosen}
                                      onChange={() => setSelectedDeliveryPoint(dp)}
                                      className="w-4 h-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 1.3 Ngày giao hàng & Ghi chú */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                      Ngày giao mong muốn *
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                      Ghi chú đơn hàng (tuỳ chọn)
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="VD: Giao trước 11h, xuất hóa đơn VAT..."
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-white"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── BƯỚC 2: Thêm dòng hàng & Tính toán tức thời (SN-38) ── */}
            {step === 2 && (
              <>
                {/* 2.1 Tìm kiếm sản phẩm */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[var(--color-primary)]" />
                    Thêm sản phẩm (Tìm theo mã SKU hoặc Tên) *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      placeholder="Gõ mã SKU hoặc tên sản phẩm..."
                      className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-white"
                      autoFocus
                    />
                    {isSearching && (
                      <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-primary)] animate-spin" />
                    )}
                  </div>

                  {/* Kết quả tìm kiếm sản phẩm */}
                  {searchResults.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-md max-h-48 overflow-y-auto bg-white">
                      {searchResults.map((p) => {
                        const isAdded = lines.some((l) => l.productId === p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleAddProduct(p)}
                            disabled={isAdded}
                            className="w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-[var(--color-primary-light)]/50 border-b border-slate-100 last:border-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                                {p.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {p.sku} · ĐVT: {p.baseUnit} · Tồn kho: {p.stockQuantity}
                              </p>
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-[var(--color-primary)] shrink-0">
                              {formatCurrency(p.price)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2.2 Danh sách dòng hàng đã chọn (Tối ưu cực tốt cho màn hình 360px) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Danh sách hàng đã chọn ({lines.length} dòng)
                    </span>
                    {lines.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLines([])}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>

                  {lines.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs sm:text-sm text-slate-500">
                        Chưa có sản phẩm nào trong đơn hàng.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Tìm kiếm mã SKU hoặc tên sản phẩm ở ô phía trên để thêm.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {lines.map((line) => (
                        <div
                          key={line.id}
                          className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2.5"
                        >
                          {/* Header dòng hàng: Tên SP + Nút xóa */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                                {line.productName}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                SKU: {line.productSku} · Giá gốc:{' '}
                                {formatCurrency(line.listPrice)}/{line.unit}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id!)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Xóa dòng này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Bộ điều khiển số lượng, đơn vị, chiết khấu — Co dãn linh hoạt 360px */}
                          <div className="grid grid-cols-3 gap-2">
                            {/* Số lượng */}
                            <div>
                              <label className="text-[11px] font-medium text-slate-600 mb-1 block">
                                Số lượng
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) =>
                                  handleUpdateLine(line.id!, 'quantity', e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-xs sm:text-sm font-semibold text-center border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                              />
                            </div>

                            {/* Đơn vị tính */}
                            <div>
                              <label className="text-[11px] font-medium text-slate-600 mb-1 block">
                                Đơn vị tính
                              </label>
                              <input
                                type="text"
                                value={line.unit}
                                onChange={(e) =>
                                  handleUpdateLine(line.id!, 'unit', e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 text-center"
                              />
                            </div>

                            {/* Chiết khấu % */}
                            <div>
                              <label className="text-[11px] font-medium text-slate-600 mb-1 block">
                                Chiết khấu %
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={line.discountPercent}
                                onChange={(e) =>
                                  handleUpdateLine(
                                    line.id!,
                                    'discountPercent',
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1.5 text-xs sm:text-sm text-center border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                              />
                            </div>
                          </div>

                          {/* Thành tiền dòng hàng */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-xs">
                            <span className="text-slate-500">
                              Đơn giá bán: <span className="font-medium text-slate-700">{formatCurrency(line.unitPrice)}</span>
                            </span>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              Thành tiền: {formatCurrency(line.lineTotal)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2.3 Thẻ tổng kết đơn hàng (Hiển thị tức thì SN-38) */}
                {lines.length > 0 && (
                  <div className="rounded-lg p-3.5 sm:p-4 bg-[var(--color-primary-light)]/50 border border-[var(--color-primary-subtle)] space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                      <span>Tổng tiền hàng:</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(totals.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm text-emerald-700">
                      <span>Tổng chiết khấu:</span>
                      <span className="font-semibold">
                        - {formatCurrency(totals.totalDiscount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base font-bold text-slate-900 pt-2 border-t border-[var(--color-primary-subtle)]">
                      <span>TỔNG PHẢI THU:</span>
                      <span className="text-[var(--color-primary)] text-base sm:text-lg">
                        {formatCurrency(totals.grandTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Modal với các nút hành động (Lưu nháp / Tiếp theo / Hoàn tất) */}
          <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex-shrink-0 gap-2">
            <button
              type="button"
              onClick={step === 1 ? handleClose : () => setStep(1)}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              {step === 1 ? 'Đóng' : '← Quay lại'}
            </button>

            <div className="flex items-center gap-2">
              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!selectedCustomer}
                  className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                >
                  Tiếp theo (Thêm hàng) →
                </button>
              ) : (
                <>
                  {/* Nút Lưu nháp (SN-39) */}
                  <button
                    type="button"
                    onClick={() => handleSaveOrder('DRAFT')}
                    disabled={isSubmitting || lines.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 disabled:opacity-40 rounded-lg transition-colors shadow-sm"
                    title="Lưu nháp để mở lại tiếp tục gõ sau (SN-39)"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-600" />
                    <span>Lưu nháp (DRAFT)</span>
                  </button>

                  {/* Nút Tạo đơn hàng */}
                  <button
                    type="button"
                    onClick={() => handleSaveOrder('PENDING')}
                    disabled={isSubmitting || lines.length === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 rounded-lg transition-colors"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isSubmitting ? 'Đang lưu...' : 'Tạo đơn hàng'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cảnh báo Tồn kho (PR-14) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-lg p-6 relative">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  handleClose();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col items-center text-center space-y-4 pt-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Cảnh báo tồn kho</h3>
                <p className="text-sm text-slate-500">
                  Đơn hàng <span className="font-semibold text-slate-700">{createdOrder?.orderCode}</span> có số lượng vượt quá tồn kho khả dụng. 
                  Đơn hàng đã được ghi nhận với trạng thái chờ phê duyệt tồn kho.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  handleClose();
                }}
                className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quản lý Điểm Giao Hàng của Đại lý (SN-31 & SN-32) */}
      {selectedCustomer && isDeliveryModalOpen && (
        <DeliveryPointModal
          open={isDeliveryModalOpen}
          customer={selectedCustomer as unknown as Customer}
          onClose={() => setIsDeliveryModalOpen(false)}
          onUpdated={(updatedPoints, selectedPointId) => {
            setDeliveryPoints(updatedPoints);
            if (selectedPointId) {
              const matched = updatedPoints.find((p) => p.id === selectedPointId);
              if (matched) setSelectedDeliveryPoint(matched);
            } else if (!selectedDeliveryPoint || !updatedPoints.some((p) => p.id === selectedDeliveryPoint.id)) {
              setSelectedDeliveryPoint(updatedPoints.find((p) => p.isDefault) || updatedPoints[0] || null);
            }
          }}
        />
      )}
    </>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// COMPONENT TRANG QUẢN LÝ ĐƠN HÀNG (SN-38 & SN-39)
// ──────────────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: OrderStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DRAFT', label: 'Nháp (DRAFT)' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'PROCESSING', label: 'Đang soạn' },
  { key: 'SHIPPED', label: 'Đã xuất kho' },
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

  // Trạng thái modal tạo / chỉnh sửa đơn
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const user = getStoredUser();
  const isSalesRep = user?.roles?.includes('SALES_REP') || true;

  // Debounce tìm kiếm
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
    void (async () => {
      await loadOrders();
    })();
  }, [loadOrders]);

  const handleOrderSaved = () => {
    loadOrders();
  };

  const handleOpenCreateModal = () => {
    setEditingOrder(null);
    setIsCreateModalOpen(true);
  };

  const handleContinueDraft = (order: Order) => {
    setEditingOrder(order);
    setIsCreateModalOpen(true);
  };

  return (
    <>
      <div className="space-y-5">
        {/* Tiêu đề & Nút Tạo Đơn Hàng */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-[var(--color-primary)]" />
              Quản lý Đơn hàng B2B (SN-38)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Gõ đơn trực tiếp tại cửa hàng đại lý, lưu nháp và quản lý điểm giao hàng
            </p>
          </div>
          {isSalesRep && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Tạo đơn hàng mới
            </button>
          )}
        </div>

        {/* Thanh tìm kiếm & Tabs lọc trạng thái */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 space-y-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã đơn (DH...), tên đại lý, người nhận..."
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-white"
            />
          </div>

          {/* Tabs trạng thái — cuộn ngang mượt mà trên mobile 360px */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách đơn hàng */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-primary)] mx-auto mb-3" />
              <p className="text-xs sm:text-sm text-slate-500">Đang tải danh sách đơn hàng...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="text-sm font-medium">Chưa có đơn hàng nào phù hợp</p>
              {isSalesRep && (
                <button
                  onClick={handleOpenCreateModal}
                  className="mt-3 text-xs sm:text-sm text-[var(--color-primary)] hover:underline font-medium"
                >
                  + Bấm vào đây để tạo đơn hàng ngay
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Bảng trên Desktop / Tablet */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Mã đơn</th>
                      <th className="px-4 py-3 text-left">Đại lý & Điểm giao</th>
                      <th className="px-4 py-3 text-left">Ngày giao</th>
                      <th className="px-4 py-3 text-right">Tổng phải thu</th>
                      <th className="px-4 py-3 text-center">Trạng thái</th>
                      <th className="px-4 py-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{order.orderCode}</p>
                          <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-800 font-medium">{order.customerName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-xs">
                              {order.deliveryPoint?.name || order.deliveryPoint?.address || 'Tại trụ sở'}
                            </span>
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(order.deliveryDate)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatCurrency(order.grandTotal)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {order.status === 'DRAFT' && (
                              <button
                                onClick={() => handleContinueDraft(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary-light)] hover:bg-[var(--color-primary-subtle)] rounded-lg transition-colors"
                                title="Mở lại tiếp tục gõ đơn (SN-39)"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Gõ tiếp</span>
                              </button>
                            )}
                            <button
                              onClick={() => setViewOrder(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Danh sách Thẻ trên Mobile 360px */}
              <div className="sm:hidden divide-y divide-slate-100">
                {orders.map((order) => (
                  <div key={order.id} className="p-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {order.customerName}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {order.orderCode} · {formatDate(order.createdAt)}
                        </p>
                        {order.deliveryPoint && (
                          <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">
                              {order.deliveryPoint.name || order.deliveryPoint.address}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900">
                          {formatCurrency(order.grandTotal)}
                        </p>
                        <div className="mt-1">
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-slate-100">
                      {order.status === 'DRAFT' && (
                        <button
                          onClick={() => handleContinueDraft(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary-light)] rounded-lg hover:bg-[var(--color-primary-subtle)] transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Tiếp tục gõ
                        </button>
                      )}
                      <button
                        onClick={() => setViewOrder(order)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
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
              <span className="px-2.5 text-slate-700 font-medium">
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

      {/* Modal Tạo & Tiếp tục gõ đơn hàng (SN-38 & SN-39) */}
      <CreateOrderModal
        open={isCreateModalOpen}
        editingOrder={editingOrder}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingOrder(null);
        }}
        onSaved={handleOrderSaved}
      />

      {/* Modal Xem chi tiết đơn hàng */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Chi tiết Đơn hàng
                </h2>
                <p className="text-xs text-slate-500 font-medium">{viewOrder.orderCode}</p>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3.5 space-y-3.5 text-xs sm:text-sm">
              {/* Thông tin đại lý */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Đại lý:</span>
                  <span className="font-semibold text-slate-900">{viewOrder.customerName}</span>
                </div>
                {viewOrder.deliveryPoint && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Điểm giao hàng:</span>
                      <span className="font-medium text-slate-800 text-right max-w-[65%]">
                        {viewOrder.deliveryPoint.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Địa chỉ:</span>
                      <span className="text-slate-700 text-right max-w-[65%]">
                        {viewOrder.deliveryPoint.address}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Người nhận:</span>
                      <span className="text-slate-700">
                        {viewOrder.deliveryPoint.receiverName || viewOrder.deliveryPoint.contactPerson || '—'} · {viewOrder.deliveryPoint.phone || '—'}
                      </span>
                    </div>
                    {viewOrder.deliveryPoint.roadNote && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/50 flex items-start gap-1">
                        <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>Ghi chú xe tải: {viewOrder.deliveryPoint.roadNote}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày giao hàng:</span>
                  <span className="text-slate-800 font-medium">{formatDate(viewOrder.deliveryDate)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Trạng thái:</span>
                  <OrderStatusBadge status={viewOrder.status} />
                </div>
              </div>

              {/* Danh sách dòng hàng */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-slate-100/70 text-[11px] font-semibold text-slate-600 border-b border-slate-200 uppercase tracking-wide">
                  Chi tiết sản phẩm ({viewOrder.lines.length} mặt hàng)
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {viewOrder.lines.map((line, i) => (
                    <div key={i} className="px-3 py-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                            {line.productName}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {line.quantity} {line.unit} × {formatCurrency(line.unitPrice)}
                            {line.discountPercent > 0 && (
                              <span className="ml-1 text-emerald-600 font-medium">
                                (-{line.discountPercent}%)
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0">
                          {formatCurrency(line.lineTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thẻ tổng kết */}
              <div className="p-3 bg-[var(--color-primary-light)]/50 rounded-lg border border-[var(--color-primary-subtle)] space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền hàng:</span>
                  <span>{formatCurrency(viewOrder.subtotal)}</span>
                </div>
                {viewOrder.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Tổng chiết khấu:</span>
                    <span>- {formatCurrency(viewOrder.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm sm:text-base text-slate-900 pt-1.5 border-t border-[var(--color-primary-subtle)]">
                  <span>Tổng phải thu:</span>
                  <span className="text-[var(--color-primary)]">{formatCurrency(viewOrder.grandTotal)}</span>
                </div>
              </div>

              {viewOrder.note && (
                <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                  <span className="font-semibold text-slate-700">Ghi chú: </span>
                  {viewOrder.note}
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
