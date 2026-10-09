import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
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
  AlertTriangle,
  ShieldAlert,
  CreditCard,
  Package,
  FileText,
  Truck,
  Loader2,
  Building2,
  Copy,
  Printer,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { ordersService } from '../services/orders.service';
import { customersService } from '../services/customers.service';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import { OrderPrintModal } from '../components/order-print-modal';
import type { Customer, DeliveryPoint as CustomerDeliveryPoint } from '../types/customer.types';
import {
  discountPoliciesService,
  calculateDiscount,
  type DiscountPolicy,
} from '../services/discount-policies.service';
import { getStoredUser } from '../utils/navigation';
import { Sn40OrderPricingModal } from '../components/sn40-order-pricing-modal';
import type {
  Order,
  OrderLine,
  OrderStatus,
  CustomerOption,
  DeliveryPoint,
  CustomerDebtStatus,
} from '../types/order';
import type { Product, ProductUnit } from '../types/products';

// ──────────────────────────────────────────────────────────────────────────
// QUANTITY INPUT HELPER COMPONENT (SN-28 / SN-38: Pure Numeric & Free Edit)
// ──────────────────────────────────────────────────────────────────────────

interface LineQuantityInputProps {
  value: number;
  onChangeQty: (newQty: number) => void;
}

const LineQuantityInput: React.FC<LineQuantityInputProps> = ({ value, onChangeQty }) => {
  const [localVal, setLocalVal] = useState<string>(() => (value ? String(value) : '1'));

  useEffect(() => {
    const timer = setTimeout(() => {
      const num = parseInt(localVal, 10);
      if (!isNaN(num) && num === value) return;
      setLocalVal(value !== undefined && value !== null ? String(value) : '');
    }, 0);
    return () => clearTimeout(timer);
  }, [value, localVal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Cho phép xóa rỗng ô khi người dùng nhấn Backspace
    if (raw === '') {
      setLocalVal('');
      onChangeQty(0);
      return;
    }
    // Chỉ giữ lại ký tự số (Pure Numeric Input)
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned === '') {
      setLocalVal('');
      onChangeQty(0);
      return;
    }
    // Chuẩn hóa loại bỏ số 0 ở đầu (ví dụ "05" -> "5")
    const formatted = cleaned.length > 1 && cleaned.startsWith('0') ? String(parseInt(cleaned, 10)) : cleaned;
    setLocalVal(formatted);
    const parsed = parseInt(formatted, 10);
    onChangeQty(isNaN(parsed) ? 0 : parsed);
  };

  const handleBlur = () => {
    const parsed = parseInt(localVal, 10);
    if (!localVal || isNaN(parsed) || parsed <= 0) {
      setLocalVal('1');
      onChangeQty(1);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Tự động bôi đen toàn bộ số khi focus để người dùng gõ đè trực tiếp mà không bị nối chuỗi
    e.target.select();
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localVal}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="w-full px-2 py-1.5 text-sm text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 bg-white"
      placeholder="1"
    />
  );
};

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
  PENDING_APPROVAL: {
    label: 'Chờ duyệt hạn mức',
    bgClass: 'bg-amber-100 ring-1 ring-amber-300',
    textClass: 'text-amber-800',
    icon: <AlertTriangle className="w-3 h-3" />,
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
// COMPONENT: MODAL TẠO ĐƠN HÀNG (SN-39)
// ──────────────────────────────────────────────────────────────────────────

interface CreateOrderModalProps {
  open: boolean;
  editingOrder?: Order | null;
  onClose: () => void;
  onCreated?: (order: Order) => void;
  onSaved?: (order: Order) => void;
  initialCustomerId?: string | null;
}

const DRAFT_KEY = 'new-order-modal';

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  open,
  editingOrder: _editingOrder,
  onClose,
  onCreated,
  onSaved: _onSaved,
  initialCustomerId,
}) => {
  const [step, setStep] = useState<1 | 2>(1); // 1=Chọn đại lý, 2=Thêm hàng

  // Bước 1: Chọn đại lý
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [deliveryPoint, setDeliveryPoint] = useState<Partial<DeliveryPoint>>({});
  const [deliveryPoints, setDeliveryPoints] = useState<CustomerDeliveryPoint[]>([]);
  void deliveryPoints;
  const [selectedDeliveryPoint, setSelectedDeliveryPoint] = useState<CustomerDeliveryPoint | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());
  const [note, setNote] = useState('');

  // Bước 2: Tìm kiếm và thêm sản phẩm
  const [productQuery, setProductQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Tải danh sách đại lý (kèm debounce 300ms khi gõ tìm kiếm)
  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const timer = setTimeout(async () => {
      if (isMounted) setIsLoadingCustomers(true);
      try {
        const list = await ordersService.getCustomers(customerSearch);
        if (isMounted) {
          setCustomers(list);
          if (initialCustomerId) {
            const found = list.find((c) => c.id === initialCustomerId);
            if (found) {
              setSelectedCustomer(found);
              if (found.deliveryPoints && found.deliveryPoints.length > 0) {
                setDeliveryPoint(found.deliveryPoints[0]);
              } else {
                setDeliveryPoint({ address: found.address || '' });
              }
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách đại lý:', err);
      } finally {
        if (isMounted) {
          setIsLoadingCustomers(false);
        }
      }
    }, customerSearch ? 300 : 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open, customerSearch, initialCustomerId]);

  // Danh sách chính sách chiết khấu thực tế từ hệ thống (SN-28 / SN-38)
  const [discountPolicies, setDiscountPolicies] = useState<DiscountPolicy[]>([]);

  // Tải chính sách chiết khấu hệ thống khi mở modal
  useEffect(() => {
    if (!open) return;
    discountPoliciesService
      .getPolicies()
      .then((policies) => {
        if (Array.isArray(policies)) {
          setDiscountPolicies(policies);
        }
      })
      .catch(() => {
        // Fallback sang nấc mặc định nếu backend chưa phản hồi
      });
  }, [open]);

  // Trạng thái kiểm soát hạn mức công nợ thời gian thực (Task SN-41)
  const [debtStatus, setDebtStatus] = useState<CustomerDebtStatus | null>(null);
  const [isLoadingDebt, setIsLoadingDebt] = useState<boolean>(false);
  const [showCreditApprovalModal, setShowCreditApprovalModal] = useState<boolean>(false);

  // Khôi phục nháp
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const draft = ordersService.getDraft(DRAFT_KEY);
      if (draft?.lines && draft.lines.length > 0) {
        setLines(draft.lines);
        if (draft.customerId && !initialCustomerId) {
          ordersService.getCustomers().then((list) => {
            const c = list.find((x) => x.id === draft.customerId);
            if (c) {
              setSelectedCustomer(c);
              if (draft.deliveryPoint) {
                setDeliveryPoint(draft.deliveryPoint);
              } else if (c.deliveryPoints?.[0]) {
                setDeliveryPoint(c.deliveryPoints[0]);
              }
            }
          });
        }
        if (draft.deliveryDate) setDeliveryDate(draft.deliveryDate);
        if (draft.note) setNote(draft.note);
        showToast('info', 'Đã khôi phục nháp đơn hàng từ lần trước');
      }
    }, 0);

    return () => clearTimeout(t);
  }, [open, initialCustomerId]);

  // Tự động đồng bộ chiết khấu các dòng hàng hiện tại khi danh sách policies được load
  useEffect(() => {
    if (discountPolicies.length === 0) return;
    const timer = setTimeout(() => {
      setLines((prev) => {
        if (prev.length === 0) return prev;
        return prev.map((line) => {
          const autoDiscount = line.quantity > 0
            ? calculateDiscount(discountPolicies, line.productSku || line.productId, '', line.quantity)
            : 0;
          const discPrice = line.listPrice * (1 - autoDiscount / 100);
          return {
            ...line,
            discountPercent: autoDiscount,
            unitPrice: Math.round(discPrice),
            lineTotal: Math.round(line.quantity * discPrice),
          };
        });
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [discountPolicies]);

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

  // Xử lý khi chọn một Đại lý (SN-31: Đơn hàng chọn điểm giao trong danh sách của đúng đại lý đó)
  const handleSelectCustomer = useCallback(async (c: CustomerOption) => {
    setSelectedCustomer(c);

    try {
      // Lấy danh sách điểm giao hàng chính thức từ backend
      const points = await customersService.getDeliveryPoints(c.id);
      setDeliveryPoints(points);

      // Tự động chọn điểm giao hàng mặc định (SN-31)
      const defaultPoint = points.find((p: CustomerDeliveryPoint) => p.isDefault) || points[0] || null;
      setSelectedDeliveryPoint(defaultPoint);
    } catch {
      // Fallback từ c.deliveryPoints
      const fallbackPoints = (c.deliveryPoints || []) as unknown as CustomerDeliveryPoint[];
      setDeliveryPoints(fallbackPoints);
      const defaultPoint = fallbackPoints.find((p: CustomerDeliveryPoint) => p.isDefault) || fallbackPoints[0] || null;
      setSelectedDeliveryPoint(defaultPoint);
    }
  }, []);

  // Tự động chọn đại lý nếu được điều hướng từ Quản lý đại lý (SN-38 sync)
  useEffect(() => {
    if (open && initialCustomerId && customers.length > 0 && !selectedCustomer) {
      const matched = customers.find((c) => c.id === initialCustomerId);
      if (matched) {
        void handleSelectCustomer(matched);
      }
    }
  }, [open, initialCustomerId, customers, selectedCustomer, handleSelectCustomer]);

  // Modal tạo nhanh đại lý mới khi đang tạo đơn (Đồng bộ sang Quản lý đại lý)
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState({
    name: '',
    phone: '',
    address: '',
    creditLimit: 50000000,
  });
  const [creatingQuickCust, setCreatingQuickCust] = useState(false);

  const handleCreateQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustForm.name.trim() || !quickCustForm.phone.trim() || !quickCustForm.address.trim()) {
      showToast('error', 'Thiếu thông tin', 'Vui lòng điền đủ Tên, SĐT và Địa chỉ đại lý');
      return;
    }
    setCreatingQuickCust(true);
    try {
      const created = await customersService.createCustomer({
        name: quickCustForm.name.trim(),
        phone: quickCustForm.phone.trim(),
        address: quickCustForm.address.trim(),
        creditLimit: Number(quickCustForm.creditLimit) || 50000000,
        customerGroup: 'AGENT_LEVEL_2',
        region: 'Miền Nam',
      });
      showToast(
        'success',
        'Thêm đại lý thành công',
        `Đại lý "${created.name}" đã được thêm và đồng bộ sang Quản lý đại lý!`,
      );
      const opt: CustomerOption = { ...created, group: created.customerGroup };
      setCustomers((prev) => [opt, ...prev]);
      void handleSelectCustomer(opt);
      setIsQuickCustomerModalOpen(false);
      setQuickCustForm({ name: '', phone: '', address: '', creditLimit: 50000000 });
    } catch {
      showToast('error', 'Lỗi tạo đại lý', 'Không thể tạo đại lý mới. Vui lòng thử lại.');
    } finally {
      setCreatingQuickCust(false);
    }
  };

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
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [productQuery, step]);

  // Tự động truy vấn thông tin công nợ thời gian thực khi chọn đại lý (Task SN-41)
  useEffect(() => {
    let active = true;
    if (!selectedCustomer) {
      setDebtStatus(null);
      return;
    }

    const fetchDebt = async () => {
      setIsLoadingDebt(true);
      try {
        const res = await ordersService.getDebtStatus(selectedCustomer.id);
        if (active) setDebtStatus(res);
      } catch {
        if (active) {
          const cLimit = selectedCustomer.creditLimit || 0;
          const cDebt = selectedCustomer.currentDebt || 0;
          setDebtStatus({
            customerId: selectedCustomer.id,
            customerCode: selectedCustomer.code,
            customerName: selectedCustomer.name,
            creditLimit: cLimit,
            currentDebt: cDebt,
            availableLimit: Math.max(0, cLimit - cDebt),
            maxDebtDays: selectedCustomer.maxDebtDays || 30,
            overdueAmount: selectedCustomer.overdueAmount || 0,
            overdueDays: selectedCustomer.overdueDays || 0,
            canCreateOrder: !(
              (selectedCustomer.overdueDays || 0) > (selectedCustomer.maxDebtDays || 30) &&
              (selectedCustomer.overdueAmount || 0) > 0
            ),
          });
        }
      } finally {
        if (active) setIsLoadingDebt(false);
      }
    };

    fetchDebt();
    return () => {
      active = false;
    };
  }, [selectedCustomer]);
  /** Thêm sản phẩm vào dòng hàng */
  const handleAddProduct = useCallback(
    (product: Product) => {
      // Kiểm tra đã có trong danh sách chưa
      if (lines.some((l) => l.productId === product.id)) {
        showToast('warning', `${product.name} đã có trong đơn hàng. Vui lòng điều chỉnh số lượng.`);
        return;
      }

      const defaultUnit = product.baseUnit;
      const initialQty = 1;
      const autoDiscount = calculateDiscount(
        discountPolicies,
        product.sku || product.id,
        '',
        initialQty,
      );
      const discPrice = product.price * (1 - autoDiscount / 100);

      const newLine: OrderLine = {
        id: `line-${Date.now()}`,
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        unit: defaultUnit,
        baseUnit: product.baseUnit,
        conversionRate: 1,
        quantity: initialQty,
        baseQuantity: initialQty,
        unitPrice: Math.round(discPrice),
        listPrice: product.price,
        discountPercent: autoDiscount,
        lineTotal: Math.round(initialQty * discPrice),
        stockAvailable: product.stockQuantity,
      };
      setLines((prev) => [...prev, newLine]);
      setProductQuery('');
    },
    [lines, discountPolicies],
  );

  /** Cập nhật số lượng hoặc đơn vị của một dòng hàng */
  const handleUpdateLine = useCallback(
    (
      lineId: string,
      field: 'quantity' | 'unit',
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
            const rawQty = typeof value === 'number' ? value : (parseInt(String(value), 10) || 0);
            const qty = Math.max(0, rawQty);

            // Tự động tính chiết khấu theo số lượng qua chính sách hệ thống (hỗ trợ > 20%, ví dụ 2500 -> 25%)
            const autoDiscount = qty > 0
              ? calculateDiscount(discountPolicies, updated.productSku || updated.productId, '', qty)
              : 0;
            const discPrice = updated.listPrice * (1 - autoDiscount / 100);

            updated = {
              ...updated,
              quantity: qty,
              baseQuantity: Math.round(qty * updated.conversionRate),
              discountPercent: autoDiscount,
              unitPrice: Math.round(discPrice),
            };
          }

          updated.lineTotal = updated.quantity * updated.unitPrice;
          return updated;
        }),
      );
    },
    [discountPolicies],
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

  /** Submit tạo đơn hàng (Hỗ trợ luồng kiểm soát công nợ SN-41) */
  const handleSubmit = async (forceApproval = false) => {
    if (!selectedCustomer) {
      showToast('error', 'Vui lòng chọn đại lý trước khi tạo đơn');
      return;
    }
    if (lines.length === 0) {
      showToast('error', 'Vui lòng thêm ít nhất 1 sản phẩm vào đơn hàng');
      return;
    }

    // Trường hợp 1 (Hard Block): Chặn tạo đơn nếu nợ quá hạn vượt quá số ngày cho phép
    if (debtStatus && !debtStatus.canCreateOrder) {
      showToast('error', debtStatus.blockReason || 'Đại lý bị khóa tạo đơn do có khoản nợ quá hạn');
      return;
    }

    // Trường hợp 2 (Approval Flow): Nếu tổng đơn + nợ hiện tại vượt hạn mức công nợ
    const currentDebt = debtStatus?.currentDebt ?? (selectedCustomer.currentDebt || 0);
    const creditLimit = debtStatus?.creditLimit ?? (selectedCustomer.creditLimit || 0);
    const projectedDebt = currentDebt + totals.grandTotal;
    const isExceeded = creditLimit > 0 && projectedDebt > creditLimit;

    if (isExceeded && !forceApproval) {
      // Hiển thị modal xác nhận thông minh chuyển sang trạng thái chờ phê duyệt
      setShowCreditApprovalModal(true);
      return;
    }

    setShowCreditApprovalModal(false);
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

      if (created.status === 'PENDING_APPROVAL' || created.isCreditLimitExceeded) {
        showToast(
          'warning',
          `Đơn hàng ${created.orderCode} đã tạo và chuyển trạng thái "Cần phê duyệt" do vượt hạn mức công nợ!`,
        );
        onCreated?.(created);
        handleClose();
      } else if (created.status === 'PENDING_INVENTORY_APPROVAL') {
        setCreatedOrder(created);
        setShowWarningModal(true);
      } else {
        showToast('success', `Tạo đơn hàng ${created.orderCode} thành công!`);
        onCreated?.(created);
        handleClose();
      }
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
    setDebtStatus(null);
    setShowCreditApprovalModal(false);
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
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Tìm kiếm đại lý</label>
                  <button
                    type="button"
                    onClick={() => setIsQuickCustomerModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    title="Thêm đại lý mới và đồng bộ"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm đại lý mới</span>
                  </button>
                </div>
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
                  {isLoadingCustomers ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-xs font-medium">Đang tải danh sách đại lý...</span>
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm">Không tìm thấy đại lý phù hợp</p>
                      {customerSearch && (
                        <p className="text-xs text-slate-400 mt-1">Thử tìm bằng mã hoặc tên khác</p>
                      )}
                    </div>
                  ) : (
                    customers.map((c) => {
                      const isOverdue =
                        (c.overdueDays || 0) > (c.maxDebtDays || 30) && (c.overdueAmount || 0) > 0;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(c);
                            if (c.deliveryPoints?.[0]) {
                              setDeliveryPoint(c.deliveryPoints[0]);
                            } else {
                              setDeliveryPoint({ address: c.address || '' });
                            }
                          }}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            selectedCustomer?.id === c.id
                              ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-400'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                                {isOverdue && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                    <ShieldAlert className="w-3 h-3" /> Nợ quá hạn
                                  </span>
                                )}
                                {c.status === 'LOCKED' && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                                    🔒 ĐÃ KHÓA (SN-36)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {c.code} · {c.phone || 'Chưa có SĐT'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (c.status === 'LOCKED') {
                                    if (confirm(`Bạn có chắc chắn muốn MỞ KHÓA đại lý "${c.name}"?`)) {
                                      try {
                                        await customersService.unlockCustomer(c.id);
                                        showToast('success', `Đã mở khóa đại lý ${c.name}`);
                                        const updated = customers.map((item) =>
                                          item.id === c.id ? { ...item, status: 'ACTIVE' as const, lockReason: undefined } : item
                                        );
                                        setCustomers(updated);
                                        if (selectedCustomer?.id === c.id) {
                                          setSelectedCustomer((prev) => prev ? { ...prev, status: 'ACTIVE', lockReason: undefined } : null);
                                        }
                                      } catch (err: unknown) {
                                        showToast('error', err instanceof Error ? err.message : 'Không thể mở khóa');
                                      }
                                    }
                                  } else {
                                    const reason = window.prompt(`Nhập lý do khóa đại lý "${c.name}" (Bắt buộc - SN-36):`);
                                    if (reason === null) return;
                                    if (!reason.trim()) {
                                      alert('Vui lòng nhập lý do khóa đại lý! Không được để trống.');
                                      return;
                                    }
                                    try {
                                      await customersService.lockCustomer(c.id, reason.trim());
                                      showToast('warning', `Đã khóa đại lý ${c.name}`, `Lý do: ${reason.trim()}`);
                                      const updated = customers.map((item) =>
                                        item.id === c.id ? { ...item, status: 'LOCKED' as const, lockReason: reason.trim() } : item
                                      );
                                      setCustomers(updated);
                                      if (selectedCustomer?.id === c.id) {
                                        setSelectedCustomer((prev) => prev ? { ...prev, status: 'LOCKED', lockReason: reason.trim() } : null);
                                      }
                                    } catch (err: unknown) {
                                      showToast('error', err instanceof Error ? err.message : 'Không thể khóa đại lý');
                                    }
                                  }
                                }}
                                className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                                  c.status === 'LOCKED'
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                                }`}
                                title={c.status === 'LOCKED' ? 'Bấm để mở khóa giao dịch' : 'Bấm để khóa giao dịch (SN-36)'}
                              >
                                {c.status === 'LOCKED' ? '🔓 Mở khóa' : '🔒 Khóa (SN-36)'}
                              </button>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  c.group === 'AGENT_LEVEL_1'
                                    ? 'bg-purple-50 text-purple-700'
                                    : c.group === 'AGENT_LEVEL_2'
                                    ? 'bg-blue-50 text-blue-700'
                                    : c.group === 'RETAIL'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {c.group === 'AGENT_LEVEL_1'
                                  ? 'Đại lý Cấp 1'
                                  : c.group === 'AGENT_LEVEL_2'
                                  ? 'Đại lý Cấp 2'
                                  : c.group === 'RETAIL'
                                  ? 'Bán lẻ'
                                  : c.group || 'Đại lý'}
                              </span>
                            </div>
                          </div>
                          {c.creditLimit !== undefined && (
                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                              <span>Hạn mức: {formatCurrency(c.creditLimit)}</span>
                              <span>Công nợ: {formatCurrency(c.currentDebt ?? 0)}</span>
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Cảnh báo đỏ SN-36 khi chọn Đại lý bị khóa */}
              {selectedCustomer?.status === 'LOCKED' && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm leading-relaxed mb-3">
                  <p className="font-semibold flex items-center gap-1.5 mb-1 text-red-800 text-sm">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    CẢNH BÁO SN-36: Đại lý đang bị KHÓA GIAO DỊCH
                  </p>
                  Đại lý <strong>{selectedCustomer.name}</strong> đang bị khóa giao dịch (Lý do: <em>{selectedCustomer.lockReason || 'Nợ quá hạn/Mất khả năng thanh toán'}</em>). Hệ thống từ chối tạo đơn mới cho đại lý này!
                </div>
              )}

              {/* Widget thông tin công nợ thời gian thực (Task SN-41) */}
              {selectedCustomer && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 transition-all">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[var(--color-primary)]" />
                      <h4 className="text-sm font-semibold text-slate-800">
                        Kiểm Soát Hạn Mức & Công Nợ Đại Lý
                      </h4>
                    </div>
                    {isLoadingDebt ? (
                      <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Đang kiểm tra...
                      </span>
                    ) : debtStatus ? (
                      !debtStatus.canCreateOrder ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Khóa tạo đơn ({debtStatus.overdueDays} ngày quá hạn)
                        </span>
                      ) : debtStatus.currentDebt >= debtStatus.creditLimit ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Hết hạn mức (Cần duyệt)
                        </span>
                      ) : debtStatus.availableLimit < debtStatus.creditLimit * 0.2 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          Sắp chạm trần
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Hạn mức an toàn
                        </span>
                      )
                    ) : null}
                  </div>

                  {debtStatus && (
                    <>
                      {/* 3 Thẻ Metric Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col">
                          <span className="text-xs text-slate-500 font-medium">Hạn mức được cấp</span>
                          <span className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                            {formatCurrency(debtStatus.creditLimit)}
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col">
                          <span className="text-xs text-slate-500 font-medium">Công nợ hiện tại</span>
                          <span className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                            {formatCurrency(debtStatus.currentDebt)}
                          </span>
                        </div>
                        <div
                          className={`p-3 rounded-lg border flex flex-col ${
                            !debtStatus.canCreateOrder
                              ? 'bg-rose-50/70 border-rose-200'
                              : debtStatus.availableLimit < debtStatus.creditLimit * 0.2
                              ? 'bg-amber-50/70 border-amber-200'
                              : 'bg-emerald-50/70 border-emerald-200'
                          }`}
                        >
                          <span className="text-xs text-slate-600 font-medium">Hạn mức khả dụng</span>
                          <span
                            className={`text-sm sm:text-base font-bold mt-0.5 ${
                              !debtStatus.canCreateOrder
                                ? 'text-rose-700'
                                : debtStatus.availableLimit < debtStatus.creditLimit * 0.2
                                ? 'text-amber-800'
                                : 'text-emerald-700'
                            }`}
                          >
                            {formatCurrency(debtStatus.availableLimit)}
                          </span>
                        </div>
                      </div>

                      {/* Thanh phần trăm sử dụng hạn mức */}
                      {debtStatus.creditLimit > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-xs text-slate-500 font-medium">
                            <span>Tỷ lệ sử dụng hạn mức</span>
                            <span className="font-semibold text-slate-700">
                              {Math.round((debtStatus.currentDebt / debtStatus.creditLimit) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                !debtStatus.canCreateOrder
                                  ? 'bg-rose-500'
                                  : debtStatus.currentDebt / debtStatus.creditLimit >= 0.9
                                  ? 'bg-rose-500'
                                  : debtStatus.currentDebt / debtStatus.creditLimit >= 0.7
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((debtStatus.currentDebt / debtStatus.creditLimit) * 100),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Hard Block Banner nếu có nợ quá hạn vượt quá số ngày cho phép */}
                      {!debtStatus.canCreateOrder && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-xs sm:text-sm">
                          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-rose-800">
                              Hệ thống khóa quyền tạo đơn hàng (Hard Block)
                            </p>
                            <p className="mt-0.5 text-rose-700 leading-relaxed">
                              {debtStatus.blockReason ||
                                `Đại lý đang có khoản nợ quá hạn ${debtStatus.overdueDays} ngày (vượt quá ${debtStatus.maxDebtDays} ngày cho phép) với số tiền ${formatCurrency(debtStatus.overdueAmount)}. Vui lòng thu hồi công nợ trước khi tiếp tục.`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Cảnh báo nợ nếu canCreateOrder = true nhưng có warningMessage */}
                      {debtStatus.canCreateOrder && debtStatus.warningMessage && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{debtStatus.warningMessage}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Điểm giao hàng */}
              {selectedCustomer && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">
                      Điểm giao hàng
                    </label>
                    {selectedCustomer.deliveryPoints && selectedCustomer.deliveryPoints.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {selectedCustomer.deliveryPoints.length} điểm đã lưu
                      </span>
                    )}
                  </div>

                  {selectedCustomer.deliveryPoints && selectedCustomer.deliveryPoints.length > 0 && (
                    <select
                      value={deliveryPoint.id ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setDeliveryPoint({ address: '', name: 'Địa chỉ tự nhập' });
                        } else {
                          const dp = selectedCustomer.deliveryPoints?.find((p) => p.id === val);
                          if (dp) {
                            setDeliveryPoint(dp);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {selectedCustomer.deliveryPoints.map((dp) => (
                        <option key={dp.id} value={dp.id}>
                          {dp.name} — {dp.address}
                        </option>
                      ))}
                      <option value="custom">Giao tới địa chỉ khác...</option>
                    </select>
                  )}

                  <input
                    type="text"
                    value={deliveryPoint.address ?? ''}
                    onChange={(e) =>
                      setDeliveryPoint((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="Địa chỉ giao hàng chi tiết..."
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
                          <LineQuantityInput
                            value={line.quantity}
                            onChangeQty={(newQty) => handleUpdateLine(line.id!, 'quantity', newQty)}
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
                            type="text"
                            readOnly
                            disabled
                            value={`${line.discountPercent}%`}
                            title="Mức chiết khấu tự động từ chính sách hệ thống (Read-only, không thể chỉnh sửa)"
                            className="w-full px-2 py-1.5 text-sm text-center font-bold text-emerald-600 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed select-none focus:outline-none"
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

              {/* Khung đối soát công nợ thời gian thực (Task SN-41) */}
              {debtStatus && (
                <div
                  className={`rounded-xl border p-3.5 space-y-2.5 transition-all ${
                    !debtStatus.canCreateOrder
                      ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                      : debtStatus.creditLimit > 0 &&
                        debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                      Kiểm soát hạn mức công nợ sau đơn
                    </span>
                    {!debtStatus.canCreateOrder ? (
                      <span className="text-rose-700 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Chặn tạo đơn (Quá hạn)
                      </span>
                    ) : debtStatus.creditLimit > 0 &&
                      debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit ? (
                      <span className="text-amber-800 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Cần phê duyệt (Vượt hạn mức)
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Trong hạn mức an toàn
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">Hạn mức cấp:</span>
                      <span className="font-semibold">{formatCurrency(debtStatus.creditLimit)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Công nợ hiện tại:</span>
                      <span className="font-semibold">{formatCurrency(debtStatus.currentDebt)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Đơn hàng này:</span>
                      <span className="font-semibold text-blue-700">
                        + {formatCurrency(totals.grandTotal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Dự kiến sau đơn:</span>
                      <span
                        className={`font-bold ${
                          debtStatus.creditLimit > 0 &&
                          debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                            ? 'text-rose-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {formatCurrency(debtStatus.currentDebt + totals.grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Cảnh báo vượt hạn mức công nợ */}
                  {debtStatus.creditLimit > 0 &&
                    debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit && (
                      <div className="pt-2 border-t border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          Đơn hàng khiến tổng công nợ vượt hạn mức{' '}
                          <strong>
                            {formatCurrency(
                              debtStatus.currentDebt + totals.grandTotal - debtStatus.creditLimit,
                            )}
                          </strong>
                          . Hệ thống sẽ tự động chuyển đơn sang trạng thái{' '}
                          <strong className="underline">Cần phê duyệt (Pending Approval)</strong> khi gửi.
                        </p>
                      </div>
                    )}
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
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
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
                disabled={!selectedCustomer || (debtStatus !== null && !debtStatus.canCreateOrder) || selectedCustomer?.status === 'LOCKED'}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
                title={selectedCustomer?.status === 'LOCKED' ? 'Đại lý đang bị KHÓA GIAO DỊCH (SN-36)' : debtStatus && !debtStatus.canCreateOrder ? debtStatus.blockReason : undefined}
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={
                  isSubmitting ||
                  lines.length === 0 ||
                  (debtStatus !== null && !debtStatus.canCreateOrder)
                }
                className={`px-5 py-2 text-sm font-medium text-white rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer ${
                  debtStatus &&
                  debtStatus.creditLimit > 0 &&
                  debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-600/20'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {isSubmitting
                  ? 'Đang xử lý...'
                  : debtStatus &&
                    debtStatus.creditLimit > 0 &&
                    debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                  ? 'Gửi Duyệt Đơn hàng'
                  : 'Tạo Đơn hàng'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Xác nhận gửi duyệt khi vượt hạn mức công nợ (SN-41) */}
      {showCreditApprovalModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col shadow-2xl p-6 relative border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center ring-4 ring-amber-100 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  Đơn hàng vượt hạn mức công nợ
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Khách hàng: <span className="font-semibold text-slate-800">{selectedCustomer?.name}</span> ({selectedCustomer?.code})
                </p>
              </div>
              <button
                onClick={() => setShowCreditApprovalModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bảng đối chiếu số liệu tài chính */}
            <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>Hạn mức công nợ được cấp:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(debtStatus?.creditLimit || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Công nợ hiện tại:</span>
                <span className="font-medium text-slate-800">
                  {formatCurrency(debtStatus?.currentDebt || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Giá trị đơn hàng mới:</span>
                <span className="font-semibold text-blue-700">+ {formatCurrency(totals.grandTotal)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-800">Dự kiến công nợ sau đơn:</span>
                <span className="font-bold text-rose-600">
                  {formatCurrency((debtStatus?.currentDebt || 0) + totals.grandTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-rose-600 font-medium">
                <span>Số tiền vượt hạn mức:</span>
                <span className="font-bold">
                  +{' '}
                  {formatCurrency(
                    Math.max(
                      0,
                      (debtStatus?.currentDebt || 0) + totals.grandTotal - (debtStatus?.creditLimit || 0),
                    ),
                  )}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed mb-5">
              <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Cơ chế kiểm soát công nợ tự động (Task SN-41)
              </p>
              Đơn hàng này khiến tổng công nợ vượt hạn mức cho phép. Hệ thống sẽ ghi nhận đơn ở trạng thái{' '}
              <strong className="text-amber-900 underline">Cần phê duyệt (Pending Approval)</strong> và gửi thông báo tới Kế toán / Quản lý kinh doanh duyệt trước khi soạn hàng. Bạn có muốn tiếp tục gửi đơn?
            </div>

            {/* Hành động */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreditApprovalModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Xem lại đơn hàng
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                Xác nhận gửi duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {showWarningModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl p-6 relative">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                  onCreated?.(createdOrder!);
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
                  onCreated?.(createdOrder!);
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
    </div>

    {/* Modal Quản lý Điểm Giao Hàng của Đại lý (SN-31 & SN-32) */}
    {selectedCustomer && isDeliveryModalOpen && (
      <DeliveryPointModal
        open={isDeliveryModalOpen}
        customer={selectedCustomer as unknown as Customer}
        onClose={() => setIsDeliveryModalOpen(false)}
        onUpdated={(updatedPoints: CustomerDeliveryPoint[], selectedPointId?: string) => {
          setDeliveryPoints(updatedPoints);
          if (selectedPointId) {
            const matched = updatedPoints.find((p: CustomerDeliveryPoint) => p.id === selectedPointId);
            if (matched) setSelectedDeliveryPoint(matched);
          } else if (!selectedDeliveryPoint || !updatedPoints.some((p: CustomerDeliveryPoint) => p.id === selectedDeliveryPoint.id)) {
            setSelectedDeliveryPoint(updatedPoints.find((p: CustomerDeliveryPoint) => p.isDefault) || updatedPoints[0] || null);
          }
        }}
      />
    )}

    {/* Modal Tạo nhanh đại lý mới khi đang tạo đơn (Đồng bộ Quản lý đại lý) */}
    {isQuickCustomerModalOpen && (
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
        <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-md p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
              <h4 className="text-sm font-bold text-slate-900">Thêm Đại Lý Mới Nhanh</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsQuickCustomerModalOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateQuickCustomer} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Tên đại lý *</label>
              <input
                type="text"
                required
                placeholder="VD: Cửa Hàng Bách Hóa Hoa Sen"
                value={quickCustForm.name}
                onChange={(e) => setQuickCustForm({ ...quickCustForm, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Số điện thoại liên hệ *</label>
              <input
                type="tel"
                required
                placeholder="VD: 0988776655"
                value={quickCustForm.phone}
                onChange={(e) => setQuickCustForm({ ...quickCustForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Địa chỉ kinh doanh / kho *</label>
              <input
                type="text"
                required
                placeholder="VD: 45 Nguyễn Huệ, Quận 1, TP.HCM"
                value={quickCustForm.address}
                onChange={(e) => setQuickCustForm({ ...quickCustForm, address: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Hạn mức tín dụng (VNĐ)</label>
              <input
                type="number"
                min="0"
                step="10000000"
                value={quickCustForm.creditLimit}
                onChange={(e) => setQuickCustForm({ ...quickCustForm, creditLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsQuickCustomerModalOpen(false)}
                disabled={creatingQuickCust}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={creatingQuickCust}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {creatingQuickCust ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lưu & Chọn luôn</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// COMPONENT: TRANG QUẢN LÝ ĐƠN HÀNG (SN-38)
// ──────────────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: OrderStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DRAFT', label: 'Nháp' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'PENDING_APPROVAL', label: 'Cần duyệt hạn mức' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'PROCESSING', label: 'Đang soạn' },
  { key: 'DELIVERED', label: 'Giao thành công' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export const OrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCustomerId = searchParams.get('customerId');
  const shouldOpenCreate = searchParams.get('createOrder') === 'true' || !!urlCustomerId;

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
  const [isSn40ModalOpen, setIsSn40ModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [approvingOrder, setApprovingOrder] = useState(false);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [isCloning, setIsCloning] = useState<string | null>(null);

  // Nhận customerId từ URL query param (Đồng bộ từ trang Quản lý đại lý)
  const [initialCustomerId, setInitialCustomerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const cid = searchParams.get('customerId');
    if (cid) {
      setInitialCustomerId(cid);
      setEditingOrder(null);
      setIsCreateModalOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('customerId');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const user = getStoredUser();
  const isAdmin = user?.roles?.includes('ADMIN');
  const isSalesRep = user?.roles?.includes('SALES_REP');
  const isSalesManager = user?.roles?.includes('SALES_MANAGER');

  // Tự động mở modal khi có createOrder hoặc customerId trên URL
  useEffect(() => {
    if (shouldOpenCreate) {
      const t = setTimeout(() => setIsCreateModalOpen(true), 0);
      return () => clearTimeout(t);
    }
  }, [shouldOpenCreate]);

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingOrder(null);
    setInitialCustomerId(undefined);
    if (searchParams.has('createOrder') || searchParams.has('customerId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('createOrder');
      next.delete('customerId');
      setSearchParams(next, { replace: true });
    }
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await ordersService.getOrders({
          page,
          limit,
          status: statusFilter,
          search: searchTerm || undefined,
        });
        if (isMounted) {
          setOrders(res.data);
          setTotal(res.total);
          setTotalPages(res.totalPages);
        }
      } catch {
        if (isMounted) {
          showToast('error', 'Không thể tải danh sách đơn hàng');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [page, limit, statusFilter, searchTerm, refreshKey]);

  const handleOrderCreated = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setTotal((t) => t + 1);
  };

  /** Sao chép một đơn cũ thành đơn mới ở trạng thái Nháp (SN-48) */
  const handleCloneOrder = async (targetOrder: Order): Promise<void> => {
    if (!targetOrder.id) return;
    setIsCloning(targetOrder.id);
    try {
      const cloned = await ordersService.cloneOrder(targetOrder.id);
      showToast(
        'success',
        `Sao chép thành công đơn ${targetOrder.orderCode} thành bản sao mới ${cloned.orderCode}! Bản sao luôn bắt đầu ở trạng thái Nháp. Giá và chiết khấu đã được tính lại theo bảng giá hiện hành.`,
      );
      setRefreshKey((k) => k + 1);
      if (viewOrder?.id === targetOrder.id) {
        setViewOrder(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi sao chép đơn hàng';
      showToast('error', msg);
    } finally {
      setIsCloning(null);
    }
  };

  /** Mở modal in / xuất PDF đơn hàng (SN-47) */
  const handleOpenPrint = (targetOrder: Order): void => {
    setPrintOrder(targetOrder);
  };

  const handleApproveOrder = async (order: Order): Promise<void> => {
    if (!order.id || approvingOrder) return;
    setApprovingOrder(true);
    try {
      const approvedOrder = await ordersService.updateOrderStatus(order.id, 'APPROVED');
      setOrders((current) => current.map((item) => item.id === approvedOrder.id ? approvedOrder : item));
      setViewOrder((current) => current?.id === approvedOrder.id ? approvedOrder : current);
      showToast('success', `Đã duyệt đơn ${approvedOrder.orderCode || ''}`.trim());
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'Không thể duyệt đơn hàng');
    } finally {
      setApprovingOrder(false);
    }
  };

  return (
    <>
      <div className="space-y-6">

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
          {(isSalesRep || isSalesManager || isAdmin) && (
            <div className="flex flex-wrap gap-2">
              {(isSalesRep || isSalesManager) && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tạo Đơn hàng
                </button>
              )}
              <button
                onClick={() => setIsSn40ModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors shadow-sm"
              >
                Tạo đơn tự áp giá · SN-40
              </button>
            </div>
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
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewOrder(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Xem chi tiết đơn hàng"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCloneOrder(order)}
                              disabled={isCloning === order.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 cursor-pointer"
                              title="Sao chép đơn thành đơn mới (SN-48)"
                            >
                              {isCloning === order.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenPrint(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="In / Xuất PDF đơn hàng (SN-47)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card */}
              <div className="sm:hidden divide-y divide-slate-100">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors space-y-2.5"
                  >
                    <div
                      onClick={() => setViewOrder(order)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">
                            {order.orderCode} · {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrency(order.grandTotal)}
                          </p>
                          <div className="mt-1">
                            <OrderStatusBadge status={order.status} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nút hành động nhanh trên di động: Chạm chuẩn Mobile-first (Touch target >= 36-40px) */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setViewOrder(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Chi tiết</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCloneOrder(order)}
                        disabled={isCloning === order.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                        title="Sao chép đơn thành đơn mới (SN-48)"
                      >
                        {isCloning === order.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Sao chép</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPrint(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                        title="In / Xuất PDF (SN-47)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>In / PDF</span>
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
        editingOrder={editingOrder}
        initialCustomerId={initialCustomerId || urlCustomerId}
        onClose={handleCloseCreateModal}
        onSaved={handleOrderCreated}
        onCreated={handleOrderCreated}
      />

      <Sn40OrderPricingModal
        isOpen={isSn40ModalOpen}
        onClose={() => setIsSn40ModalOpen(false)}
        onCreated={handleOrderCreated}
      />

      {/* Modal Xem chi tiết đơn hàng */}
      {viewOrder && typeof document !== 'undefined' && createPortal(
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
                {viewOrder.isCreditLimitExceeded && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2 mt-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Đơn hàng vượt hạn mức công nợ</p>
                      <p className="mt-0.5 text-amber-800">
                        Đơn hàng làm vượt hạn mức {formatCurrency(viewOrder.creditLimitExceededAmount || 0)}. Đang ở trạng thái chờ Quản lý kinh doanh / Kế toán phê duyệt.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {viewOrder.requiresApproval && (viewOrder.approvalReasons?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  <p className="font-semibold">Đơn cần quản lý duyệt</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                    {viewOrder.approvalReasons?.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
              )}

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

              {viewOrder.isCustomerLocked && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed mb-3">
                  <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    CẢNH BÁO SN-36: Đại lý đang bị KHÓA GIAO DỊCH
                  </p>
                  {viewOrder.warningMessage || 'Đại lý của đơn hàng này hiện đang bị khóa giao dịch. Đơn dở vẫn xử lý tiếp nhưng cần cảnh báo trước khi duyệt/xuất kho.'}
                </div>
              )}

              {viewOrder.note && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5">
                  <span className="font-medium text-slate-700">Ghi chú: </span>
                  {viewOrder.note}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCloneOrder(viewOrder)}
                  disabled={isCloning === viewOrder.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                  title="Sao chép đơn cũ thành đơn mới ở trạng thái Nháp (SN-48)"
                >
                  {isCloning === viewOrder.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Sao chép đơn</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPrint(viewOrder)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                  title="In hoặc xuất PDF đơn hàng cho đại lý xem tại chỗ (SN-47)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / Xuất PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {(isAdmin || isSalesManager) && viewOrder.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => void handleApproveOrder(viewOrder)}
                    disabled={approvingOrder}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {approvingOrder ? 'Đang duyệt...' : 'Duyệt đơn'}
                  </button>
                )}
                <button
                  onClick={() => setViewOrder(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal In & Xuất PDF Đơn hàng (SN-47) */}
      <OrderPrintModal
        order={printOrder}
        isOpen={Boolean(printOrder)}
        onClose={() => setPrintOrder(null)}
      />
    </>
  );
};
