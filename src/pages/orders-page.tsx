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
  Edit3,
  XCircle,
  CornerUpLeft,
  History,
  RotateCcw,
  Filter,
  Calendar,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { ordersService } from '../services/orders.service';
import { customersService } from '../services/customers.service';
import { usersService } from '../services/users.service';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import { OrderPrintModal } from '../components/order-print-modal';
import { ReorderModal } from '../components/reorder-modal';
import type { Customer, DeliveryPoint as CustomerDeliveryPoint } from '../types/customer.types';
import { getStoredUser } from '../utils/navigation';
import { orderPricingService } from '../services/order-pricing.service';
import type { PriceList, CustomerGroupType } from '../types/price-list';
import type {
  Order,
  OrderLine,
  OrderStatus,
  OrderApprovalAction,
  OrderApprovalHistory,
  CustomerOption,
  DeliveryPoint,
  CustomerDebtStatus,
} from '../types/order';
import type { Product, ProductUnit } from '../types/products';
import { OrderTimeline } from '../components/order-timeline';
import { CancelOrderModal } from '../components/cancel-order-modal';

const getAvailableProductUnits = (
  product: Product,
): Array<{ unitName: string; conversionRate: number }> => {
  const units = product.units?.map((unit: ProductUnit) => ({
    unitName: unit.unitName,
    conversionRate: unit.conversionRate,
  })) ?? [];
  if (!units.some((unit) => unit.unitName === product.baseUnit)) {
    units.unshift({ unitName: product.baseUnit, conversionRate: 1 });
  }
  return units;
};

const getPriceListItem = (priceList: PriceList, line: Pick<OrderLine, 'productId' | 'productSku'>) =>
  priceList.items.find(
    (item) =>
      item.productId === line.productId ||
      item.productCode.toLowerCase() === line.productSku.toLowerCase(),
  );

// ──────────────────────────────────────────────────────────────────────────
// QUANTITY INPUT HELPER COMPONENT (SN-28 / SN-38: Pure Numeric & Free Edit)
// ──────────────────────────────────────────────────────────────────────────

interface LineQuantityInputProps {
  value: number;
  onChangeQty: (newQty: number) => void;
  isError?: boolean;
}

const LineQuantityInput: React.FC<LineQuantityInputProps> = ({ value, onChangeQty, isError }) => {
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
      className={`w-full px-2 py-1.5 text-sm text-center border rounded-lg focus:outline-none font-semibold ${
        isError
          ? 'border-rose-400 text-rose-700 bg-rose-50 focus:ring-2 focus:ring-rose-400'
          : 'border-slate-200 text-slate-800 bg-white focus:ring-2 focus:ring-blue-500'
      }`}
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
  REJECTED: {
    label: 'Từ chối',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    icon: <XCircle className="w-3 h-3" />,
  },
  RETURNED_FOR_UPDATE: {
    label: 'Trả lại sửa',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    icon: <CornerUpLeft className="w-3 h-3" />,
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
  CLOSED: {
    label: 'Đã đóng',
    bgClass: 'bg-slate-200',
    textClass: 'text-slate-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
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
  editingOrder,
  onClose,
  onCreated,
  onSaved,
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
  const linesRef = useRef<OrderLine[]>([]);
  linesRef.current = lines;

  const quoteOrderLine = useCallback(async (line: OrderLine, priceList: PriceList): Promise<OrderLine> => {
    const item = getPriceListItem(priceList, line);
    if (!item) {
      return {
        ...line,
        pricingLoading: false,
        pricingError: `SKU ${line.productSku} chưa có giá trong bảng giá hiệu lực`,
      };
    }

    const conversionRate = line.conversionRate || 1;
    const listPrice = Math.round(item.price * conversionRate);
    const minPrice = Math.round(item.minPrice * conversionRate);
    try {
      const discountPercent = await orderPricingService.calculateDiscount(
        { id: line.productId, sku: line.productSku },
        Math.round(line.quantity * conversionRate),
      );
      const automaticPrice = Math.round(listPrice * (1 - discountPercent / 100));
      const unitPrice = line.isPriceManuallyEdited
        ? Number(line.manualPrice || line.unitPrice)
        : automaticPrice;
      return {
        ...line,
        baseListPrice: item.price,
        listPrice,
        minPrice,
        discountPercent: listPrice > 0
          ? Number((((listPrice - unitPrice) / listPrice) * 100).toFixed(2))
          : 0,
        unitPrice,
        lineTotal: line.quantity * unitPrice,
        requiresApproval: unitPrice < minPrice,
        pricingLoading: false,
        pricingError: undefined,
      };
    } catch (error: unknown) {
      return {
        ...line,
        listPrice,
        minPrice,
        pricingLoading: false,
        pricingError: error instanceof Error ? error.message : 'Không thể tính chiết khấu',
      };
    }
  }, []);

  const refreshLinePricing = useCallback((line: OrderLine, priceList: PriceList) => {
    setLines((current) => current.map((item) =>
      item.id === line.id ? { ...item, pricingLoading: true, pricingError: undefined } : item,
    ));
    void quoteOrderLine(line, priceList).then((quotedLine) => {
      setLines((current) => current.map((item) =>
        item.id === quotedLine.id &&
        item.quantity === line.quantity &&
        item.conversionRate === line.conversionRate &&
        item.isPriceManuallyEdited === line.isPriceManuallyEdited
          ? quotedLine
          : item,
      ));
    });
  }, [quoteOrderLine]);

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

  // Bảng giá SN-40 được tải theo khách hàng ngay trong form tạo đơn SN-38.
  const [effectivePriceList, setEffectivePriceList] = useState<PriceList | null>(null);
  const [isLoadingPriceList, setIsLoadingPriceList] = useState(false);
  const [priceListError, setPriceListError] = useState('');

  // Tải bảng giá hiệu lực theo nhóm khách hàng.
  useEffect(() => {
    if (!open || !selectedCustomer) {
      setEffectivePriceList(null);
      setPriceListError('');
      return;
    }

    let active = true;
    setEffectivePriceList(null);
    setPriceListError('');
    setIsLoadingPriceList(true);
    orderPricingService
      .getEffectivePriceList(selectedCustomer.group as CustomerGroupType)
      .then((priceList) => {
        if (active) setEffectivePriceList(priceList);
      })
      .catch((error: unknown) => {
        if (active) {
          setPriceListError(
            error instanceof Error ? error.message : 'No effective price list for this customer',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingPriceList(false);
      });

    return () => {
      active = false;
    };
  }, [open, selectedCustomer?.id, selectedCustomer?.group]);

  useEffect(() => {
    if (!effectivePriceList) return;
    linesRef.current.forEach((line) => refreshLinePricing(line, effectivePriceList));
  }, [effectivePriceList, refreshLinePricing]);

  // Trạng thái kiểm soát hạn mức công nợ thời gian thực (Task SN-41)
  const [debtStatus, setDebtStatus] = useState<CustomerDebtStatus | null>(null);
  const [isLoadingDebt, setIsLoadingDebt] = useState<boolean>(false);
  const [showCreditApprovalModal, setShowCreditApprovalModal] = useState<boolean>(false);

  // Khôi phục nháp hoặc nạp đơn nháp đang chỉnh sửa / gõ tiếp (SN-39)
  useEffect(() => {
    if (!open) return;

    if (editingOrder) {
      setStep(2); // Vào thẳng bước 2 để tiếp tục thêm sản phẩm & gõ tiếp
      setDeliveryDate(editingOrder.deliveryDate || getDefaultDeliveryDate());
      setNote(editingOrder.note || '');
      if (editingOrder.deliveryPoint) {
        setDeliveryPoint(editingOrder.deliveryPoint);
        setSelectedDeliveryPoint(editingOrder.deliveryPoint as CustomerDeliveryPoint);
      }
      if (editingOrder.lines && editingOrder.lines.length > 0) {
        setLines(editingOrder.lines);
      }
      ordersService.getCustomers().then((list) => {
        const found = list.find(
          (c) => c.id === editingOrder.customerId || c.code === editingOrder.customerCode,
        );
        if (found) {
          setSelectedCustomer(found);
        } else {
          setSelectedCustomer({
            id: editingOrder.customerId || '',
            code: editingOrder.customerCode || '',
            name: editingOrder.customerName || 'Đại lý',
            group: editingOrder.customerGroup || 'AGENT_LEVEL_2',
            phone: '',
            address: editingOrder.deliveryPoint?.address || '',
          });
        }
      });
      return;
    }

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
  }, [open, editingOrder, initialCustomerId]);

  // Tự động lưu nháp khi lines thay đổi.
  useEffect(() => {
    if (!open || lines.length === 0 || editingOrder) return;
    ordersService.saveDraft(DRAFT_KEY, {
      customerId: selectedCustomer?.id,
      deliveryDate,
      note,
      lines,
    });
  }, [lines, selectedCustomer, deliveryDate, note, open, editingOrder]);

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
  const handleAddProduct = useCallback((product: Product) => {
    if (!effectivePriceList) {
      showToast('error', priceListError || 'Chưa có bảng giá hiệu lực cho đại lý này');
      return;
    }
    if (lines.some((line) => line.productId === product.id)) {
      showToast('warning', 'Sản phẩm đã có trong đơn hàng');
      return;
    }
    const available = product.availableStock ?? product.availableQuantity ?? product.stockQuantity ?? 0;
    if (available <= 0) {
      showToast('error', `Sản phẩm ${product.name || product.sku}: Hàng trong kho đã hết / Vượt quá tồn khả dụng (Còn lại 0 ${product.baseUnit})`);
      return;
    }
    const priceItem = getPriceListItem(effectivePriceList, { productId: product.id, productSku: product.sku });
    if (!priceItem) {
      showToast('error', 'Sản phẩm này chưa có giá trong bảng giá của đại lý');
      return;
    }

    const line: OrderLine = {
      id: 'line-' + Date.now(),
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      unit: product.baseUnit,
      baseUnit: product.baseUnit,
      conversionRate: 1,
      quantity: 1,
      baseQuantity: 1,
      unitPrice: Math.round(priceItem.price),
      listPrice: Math.round(priceItem.price),
      baseListPrice: priceItem.price,
      minPrice: priceItem.minPrice,
      unitOptions: getAvailableProductUnits(product),
      discountPercent: 0,
      lineTotal: Math.round(priceItem.price),
      stockAvailable: available,
      availableStock: available,
      pricingLoading: true,
    };
    setLines((current) => [...current, line]);
    setProductQuery('');
    refreshLinePricing(line, effectivePriceList);
  }, [effectivePriceList, lines, priceListError, refreshLinePricing]);

  const handleUpdateLine = useCallback((lineId: string, field: 'quantity' | 'unit', value: string | number) => {
    const line = lines.find((item) => item.id === lineId);
    if (!line) return;
    const updated = field === 'unit'
      ? (() => {
          const unit = line.unitOptions?.find((option) => option.unitName === String(value));
          const conversionRate = unit?.conversionRate ?? 1;
          const manualPrice = line.isPriceManuallyEdited
            ? Math.round((Number(line.manualPrice || line.unitPrice) / line.conversionRate) * conversionRate)
            : undefined;
          return {
            ...line,
            unit: String(value),
            conversionRate,
            baseQuantity: Math.round(line.quantity * conversionRate),
            ...(manualPrice !== undefined ? { manualPrice: String(manualPrice), unitPrice: manualPrice } : {}),
          };
        })()
      : (() => {
          const quantity = Math.max(0, Number(value) || 0);
          return { ...line, quantity, baseQuantity: Math.round(quantity * line.conversionRate) };
        })();
    updated.lineTotal = updated.quantity * updated.unitPrice;
    setLines((current) => current.map((item) => item.id === lineId ? updated : item));
    if (effectivePriceList) {
      refreshLinePricing(updated, effectivePriceList);
    }
  }, [effectivePriceList, lines, refreshLinePricing]);

  const handleToggleManualPrice = useCallback((line: OrderLine, enabled: boolean) => {
    const updated = {
      ...line,
      isPriceManuallyEdited: enabled,
      manualPrice: enabled ? String(line.unitPrice) : '',
    };
    setLines((current) => current.map((item) => item.id === line.id ? updated : item));
    if (!enabled && effectivePriceList) refreshLinePricing(updated, effectivePriceList);
  }, [effectivePriceList, refreshLinePricing]);

  const handleManualPriceChange = (line: OrderLine, value: string) => {
    const unitPrice = Number(value) || 0;
    const updated = {
      ...line,
      manualPrice: value,
      unitPrice,
      discountPercent: line.listPrice > 0
        ? Number((((line.listPrice - unitPrice) / line.listPrice) * 100).toFixed(2))
        : 0,
      lineTotal: line.quantity * unitPrice,
      requiresApproval: unitPrice < (line.minPrice ?? 0),
    };
    setLines((current) => current.map((item) => item.id === line.id ? updated : item));
  };

  const handleRemoveLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  /** Đổi nhanh về số lượng tồn khả dụng tối đa (SN-42) */
  const updateLineQuantity = useCallback(
    (lineId?: string, qty: number = 0) => {
      if (!lineId) return;
      handleUpdateLine(lineId, 'quantity', qty);
    },
    [handleUpdateLine],
  );

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

  // Kiểm tra tồn khả dụng theo Task SN-42
  const stockErrors = useMemo(() => {
    return lines.filter((l) => {
      const available = l.availableStock ?? l.stockAvailable ?? 0;
      return l.quantity > available;
    });
  }, [lines]);

  const hasStockError = stockErrors.length > 0;

  /** Submit tạo đơn hàng hoặc Cập nhật đơn nháp (Hỗ trợ luồng kiểm soát công nợ SN-41 & SN-42) */
  const handleSubmit = async (forceApproval = false, asDraft = false) => {
    if (!selectedCustomer) {
      showToast('error', 'Vui lòng chọn đại lý trước khi tạo đơn');
      return;
    }
    if (lines.length === 0) {
      showToast('error', 'Vui lòng thêm ít nhất 1 sản phẩm vào đơn hàng');
      return;
    }
    if (!effectivePriceList) {
      showToast('error', priceListError || 'No effective price list for this customer');
      return;
    }
    if (lines.some((line) => line.pricingLoading || line.pricingError)) {
      showToast('error', 'Resolve price list or discount errors before submitting');
      return;
    }

    const requestedBaseBySku = new Map<string, number>();
    for (const line of lines) {
      const sku = line.productSku.toUpperCase();
      requestedBaseBySku.set(
        sku,
        (requestedBaseBySku.get(sku) ?? 0) + Math.round(line.quantity * line.conversionRate),
      );
    }
    const overStockLine = lines.find((line) => {
      const available = Number(line.stockAvailable);
      return Number.isFinite(available) && (requestedBaseBySku.get(line.productSku.toUpperCase()) ?? 0) > available;
    });
    if (overStockLine && !asDraft) {
      const availableBase = Math.max(0, Number(overStockLine.stockAvailable));
      const maxInUnit = Math.floor(availableBase / Math.max(1, overStockLine.conversionRate));
      showToast(
        'error',
        `SKU ${overStockLine.productSku} vượt tồn khả dụng (${availableBase} ${overStockLine.baseUnit}); tối đa ${maxInUnit} ${overStockLine.unit}.`,
      );
      return;
    }

    // Trường hợp 0 (SN-42): Chặn tạo đơn nếu có sản phẩm vượt quá tồn khả dụng (trừ khi tiếp tục lưu nháp)
    if (!asDraft) {
      const stockExceededLine = lines.find(
        (l) => l.quantity > (l.availableStock ?? l.stockAvailable ?? 0),
      );
      if (stockExceededLine) {
        const stock = stockExceededLine.availableStock ?? stockExceededLine.stockAvailable ?? 0;
        showToast(
          'error',
          `Sản phẩm ${stockExceededLine.productName || stockExceededLine.productSku} vượt quá tồn khả dụng (Tồn kho: ${stock}, Đặt: ${stockExceededLine.quantity})`,
        );
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
    }

    setShowCreditApprovalModal(false);
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
        isPriceManuallyEdited: l.isPriceManuallyEdited ?? false,
        stockAvailable: l.stockAvailable,
        availableStock: l.availableStock ?? l.stockAvailable,
      }));

      // Nếu đang chỉnh sửa / gõ tiếp đơn nháp cũ (SN-39)
      if (editingOrder) {
        const orderId = editingOrder.id || editingOrder.orderCode;
        if (!orderId) {
          throw new Error('Không tìm thấy định danh đơn hàng cần cập nhật');
        }

        const updated = await ordersService.updateOrder(orderId, {
          customerId: selectedCustomer.id,
          deliveryPoint: Object.keys(deliveryPoint).length > 0 ? deliveryPoint : undefined,
          deliveryDate,
          lines: payloadLines,
          note,
          status: asDraft ? 'DRAFT' : 'PENDING',
        });

        showToast(
          'success',
          asDraft
            ? `Đã lưu thay đổi vào đơn nháp ${updated.orderCode || editingOrder.orderCode}!`
            : `Cập nhật và gửi duyệt đơn hàng ${updated.orderCode || editingOrder.orderCode} thành công!`,
        );
        onSaved?.(updated);
        onCreated?.(updated);
        handleClose();
        return;
      }

      // Tạo đơn hàng mới
      const created = await ordersService.createOrder({
        customerId: selectedCustomer.id,
        priceListId: effectivePriceList.id,
        deliveryPoint: Object.keys(deliveryPoint).length > 0 ? deliveryPoint : undefined,
        deliveryDate,
        lines: payloadLines,
        note,
        status: asDraft ? 'DRAFT' : undefined,
      });

      ordersService.clearDraft(DRAFT_KEY);

      if (created.status === 'PENDING_APPROVAL' || created.isCreditLimitExceeded || created.requiresApproval) {
        const approvalReason = created.approvalReasons?.join('; ') ||
          (created.isCreditLimitExceeded ? 'vượt hạn mức công nợ' : 'giá bán dưới giá sàn');
        showToast('warning', '\u0110ơn hàng ' + created.orderCode + ' đã tạo, cần duyệt: ' + approvalReason + '.');
        (editingOrder ? onSaved : onCreated)?.(created);
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
      const responseMessage = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      const msg = Array.isArray(responseMessage)
        ? responseMessage.join('; ')
        : responseMessage || (err instanceof Error ? err.message : 'Không thể tạo đơn hàng');
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

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-3xl flex flex-col rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {editingOrder
                ? `Chỉnh sửa / Gõ tiếp Đơn Nháp (${editingOrder.orderCode})`
                : 'Tạo Đơn Hàng Mới'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bước {step}/2:{' '}
              {step === 1 ? 'Chọn đại lý & thông tin giao hàng' : 'Thêm sản phẩm, cập nhật số lượng & xác nhận'}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
              {selectedCustomer && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-slate-700">
                  <div className="font-semibold">Bảng giá và chiết khấu tự động</div>
                  {isLoadingPriceList ? (
                    <div className="mt-1 text-xs">Đang tải bảng giá theo nhóm đại lý...</div>
                  ) : priceListError ? (
                    <div className="mt-1 text-xs text-rose-700">{priceListError}</div>
                  ) : effectivePriceList ? (
                    <div className="mt-1 text-xs">{effectivePriceList.name} · {effectivePriceList.code}</div>
                  ) : null}
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
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-56 overflow-y-auto">
                    {searchResults.map((p) => {
                      const priceItem = effectivePriceList
                        ? getPriceListItem(effectivePriceList, { productId: p.id, productSku: p.sku })
                        : undefined;
                      const available = p.availableStock ?? p.availableQuantity ?? (p.stockQuantity ?? 0);
                      const isOutOfStock = available <= 0;
                      const isAlreadyAdded = lines.some((l) => l.productId === p.id);
                      const isDisabled = isAlreadyAdded || !priceItem || isLoadingPriceList || isOutOfStock;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddProduct(p)}
                          disabled={isDisabled}
                          title={
                            isOutOfStock
                              ? `Sản phẩm ${p.sku} đã hết hàng trong kho / Vượt quá tồn khả dụng`
                              : isAlreadyAdded
                              ? 'Sản phẩm đã có trong đơn hàng'
                              : !priceItem
                              ? `SKU ${p.sku} chưa có giá trong bảng giá hiệu lực`
                              : undefined
                          }
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors ${
                            isOutOfStock
                              ? 'bg-rose-50/40 opacity-75 cursor-not-allowed'
                              : isDisabled
                              ? 'opacity-40 cursor-not-allowed bg-slate-50/50'
                              : 'hover:bg-blue-50/80 cursor-pointer'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-sm font-medium text-slate-800 leading-snug truncate">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs mt-1">
                              <span className="text-slate-500 font-mono">{p.sku} · {p.baseUnit}</span>
                              {isOutOfStock ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">
                                  Hết hàng (Tồn: 0)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                                  Tồn khả dụng: {available}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-sm font-semibold ${isOutOfStock ? 'text-slate-400 line-through' : 'text-blue-600'}`}>
                              {priceItem ? formatCurrency(priceItem.price) : 'Không có giá hiệu lực'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
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
                  {lines.map((line) => {
                    const available = line.availableStock ?? line.stockAvailable ?? 0;
                    const isExceeded = line.quantity > available;
                    const unitOptions = line.unitOptions?.length
                      ? line.unitOptions
                      : [{ unitName: line.baseUnit, conversionRate: 1 }];
                    return (
                    <div
                      key={line.id}
                      className={`border rounded-xl p-3 space-y-2 transition-all ${
                        isExceeded
                          ? 'border-rose-300 bg-rose-50/60 shadow-xs'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      {/* Tên sản phẩm + Xóa */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {line.productName}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">{line.productSku}</span>
                            <span className="text-slate-300">·</span>
                            <span className={isExceeded ? 'font-semibold text-rose-600' : 'text-slate-500'}>
                              {available <= 0 ? (
                                <span className="font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">Hết hàng (Tồn: 0 {line.baseUnit})</span>
                              ) : (
                                `Tồn khả dụng: ${available} ${line.baseUnit}`
                              )}
                            </span>
                          </div>
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
                            isError={isExceeded}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Đơn vị</label>
                          <select
                            value={line.unit}
                            onChange={(e) => handleUpdateLine(line.id!, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            {unitOptions.map((unit) => (
                              <option key={unit.unitName} value={unit.unitName}>
                                {unit.unitName}
                              </option>
                            ))}
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

                      {/* Thông báo lỗi màu đỏ theo Task SN-42 */}
                      {isExceeded && (
                        <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-lg bg-rose-100/90 border border-rose-300 text-rose-800 text-xs font-semibold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>
                              {available <= 0
                                ? `Sản phẩm ${line.productName}: Hàng trong kho đã hết / Vượt quá tồn khả dụng (Còn lại 0 ${line.baseUnit})`
                                : `Sản phẩm ${line.productName} vượt quá tồn khả dụng (Tồn: ${available}, Đặt: ${line.quantity})`}
                            </span>
                          </div>
                          {available > 0 ? (
                            <button
                              type="button"
                              onClick={() => updateLineQuantity(line.id, available)}
                              className="text-xs text-blue-600 underline font-medium hover:text-blue-800 ml-2 cursor-pointer transition-colors"
                            >
                              Đổi về số lượng tối đa ({available})
                            </button>
                          ) : (
                            <span className="text-xs text-rose-600 italic">
                              (Hết hàng trong kho)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Thành tiền */}
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={line.isPriceManuallyEdited ?? false}
                            onChange={(event) => handleToggleManualPrice(line, event.target.checked)}
                          />
                          {'Ch\u1ec9nh s\u1eeda gi\u00e1 b\u00e1n'}
                        </label>
                        {line.isPriceManuallyEdited && (
                          <input
                            type="number"
                            min="0"
                            value={line.manualPrice ?? line.unitPrice}
                            onChange={(event) => handleManualPriceChange(line, event.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                            aria-label="Gia ban thu cong"
                          />
                        )}
                        {line.pricingLoading && <p className="text-xs text-slate-500">{'\u0110ang t\u00ednh gi\u00e1 v\u00e0 chi\u1ebft kh\u1ea5u...'}</p>}
                        {line.pricingError && <p className="text-xs text-rose-600">{line.pricingError}</p>}
                        {(line.minPrice ?? 0) > 0 && line.unitPrice < (line.minPrice ?? 0) && (
                          <p className="text-xs font-medium text-amber-700">Duoi gia san: can duyet ({formatCurrency(line.minPrice ?? 0)})</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Đơn giá: {formatCurrency(line.unitPrice)}/{line.unit}
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {formatCurrency(line.lineTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
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

              {/* Cảnh báo màu đỏ tổng thể khi vượt tồn khả dụng (SN-42) */}
              {hasStockError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Cảnh báo SN-42: Vượt quá tồn khả dụng ({stockErrors.length} sản phẩm)</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-rose-900 font-medium">
                    {stockErrors.map((errLine) => {
                      const avail = errLine.availableStock ?? errLine.stockAvailable ?? 0;
                      return (
                        <li key={errLine.id} className="flex flex-wrap items-center gap-1.5">
                          <span>
                            Sản phẩm {errLine.productName} vượt quá tồn khả dụng (Tồn: {avail}, Đặt: {errLine.quantity})
                          </span>
                          {avail > 0 && (
                            <button
                              type="button"
                              onClick={() => updateLineQuantity(errLine.id, avail)}
                              className="text-xs text-blue-600 underline font-medium hover:text-blue-800 ml-1 cursor-pointer"
                            >
                              Đổi về số lượng tối đa ({avail})
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-[11px] text-rose-600 italic pt-0.5">
                    Hệ thống khóa nút "Tạo đơn hàng". Vui lòng điều chỉnh lại số lượng đặt.
                  </p>
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
            {step === 2 && lines.length > 0 && !editingOrder && (
              <span className="text-xs text-slate-400 italic">Nháp đã lưu tự động</span>
            )}
            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
disabled={!selectedCustomer || isLoadingPriceList || !effectivePriceList || (debtStatus !== null && !debtStatus.canCreateOrder) || selectedCustomer?.status === 'LOCKED'}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
                title={selectedCustomer?.status === 'LOCKED' ? 'Đại lý đang bị KHÓA GIAO DỊCH (SN-36)' : debtStatus && !debtStatus.canCreateOrder ? debtStatus.blockReason : undefined}
              >
                Tiếp theo →
              </button>
            ) : (
              <>
                {editingOrder ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSubmit(false, true)}
                      disabled={isSubmitting || lines.length === 0}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Lưu tiếp vào Nháp
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmit(false, false)}
                      disabled={
                        isSubmitting ||
                        lines.length === 0 ||
                        hasStockError ||
                        (debtStatus !== null && !debtStatus.canCreateOrder)
                      }
                      className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <span>Cập nhật & Gửi đơn</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={
                      isSubmitting ||
                      lines.length === 0 ||
                      hasStockError ||
                      isLoadingPriceList ||
                      !effectivePriceList ||
                      lines.some((line) => line.pricingLoading || line.pricingError) ||
                      (debtStatus !== null && !debtStatus.canCreateOrder)
                    }
                    className={`px-5 py-2 text-sm font-medium text-white rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer ${
                      hasStockError
                        ? 'bg-rose-400 opacity-60 cursor-not-allowed'
                        : debtStatus &&
                          debtStatus.creditLimit > 0 &&
                          debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-sm shadow-amber-600/20'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {isSubmitting
                      ? 'Đang xử lý...'
                      : hasStockError
                      ? 'Vượt tồn khả dụng'
                      : debtStatus &&
                        debtStatus.creditLimit > 0 &&
                        debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                      ? 'Gửi Duyệt Đơn hàng'
                      : 'Tạo Đơn hàng'}
                  </button>
                )}
              </>
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
    </>,
    document.body
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
  { key: 'RETURNED_FOR_UPDATE', label: 'Trả lại sửa' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Từ chối' },
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
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>(() => {
    const requestedStatus = searchParams.get('status');
    return STATUS_TABS.some((tab) => tab.key === requestedStatus)
      ? requestedStatus as OrderStatus
      : 'ALL';
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ── SN-46: Bộ lọc đa tiêu chí cho Quản lý kinh doanh ──
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Danh sách đại lý & nhân viên kinh doanh cho dropdown lọc
  const [customerOptions, setCustomerOptions] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [salesRepOptions, setSalesRepOptions] = useState<{ id: string; name: string }[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [approvingOrder, setApprovingOrder] = useState(false);
  // Trạng thái hủy đơn hàng (SN-45)
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [decisionAction, setDecisionAction] = useState<OrderApprovalAction | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [approvalHistory, setApprovalHistory] = useState<OrderApprovalHistory[]>([]);
  const [isLoadingApprovalHistory, setIsLoadingApprovalHistory] = useState(false);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [selectedOrderForReorder, setSelectedOrderForReorder] = useState<Order | null>(null);
  const [isCloning, setIsCloning] = useState<string | null>(null);

  const handleReorderSuccess = (_newOrder: Order) => {
    setRefreshKey((key) => key + 1);
  };

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
  const canViewAllRep = isAdmin || isSalesManager;

  // Tải danh sách đại lý cho dropdown bộ lọc
  useEffect(() => {
    ordersService.getCustomers().then((list) => {
      if (Array.isArray(list)) {
        setCustomerOptions(list.map((c) => ({ id: c.id, name: c.name, code: c.code })));
      }
    }).catch(() => {});
  }, []);

  // Tải danh sách nhân viên kinh doanh cho dropdown bộ lọc
  useEffect(() => {
    const defaultReps = [
      { id: 'usr-sales-001', name: 'Nguyễn Văn An (NVKD)' },
      { id: 'usr-sales-002', name: 'Trần Văn Nam (NVKD)' },
      { id: 'usr-sales-003', name: 'Lê Hoàng Trưởng Phòng (QLKD)' },
      { id: 'usr-sales-004', name: 'Phạm Minh Đức (NVKD)' },
    ];
    setSalesRepOptions(defaultReps);

    usersService.getUsers({ limit: 50 }).then((res) => {
      if (res?.data && res.data.length > 0) {
        const reps = res.data
          .filter((u) => u.roles?.includes('SALES_REP') || u.roles?.includes('SALES_MANAGER'))
          .map((u) => ({
            id: u.id,
            name: `${u.fullName} (${u.roles?.includes('SALES_MANAGER') ? 'QLKD' : 'NVKD'})`,
          }));
        if (reps.length > 0) {
          setSalesRepOptions(reps);
        }
      }
    }).catch(() => {});
  }, []);

  const handleCustomerChange = (val: string) => {
    setSelectedCustomerId(val);
    setPage(1);
  };
  const handleSalesRepChange = (val: string) => {
    setSelectedSalesRepId(val);
    setPage(1);
  };
  const handleRegionChange = (val: string) => {
    setSelectedRegion(val);
    setPage(1);
  };
  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    setPage(1);
  };
  const handleToDateChange = (val: string) => {
    setToDate(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setStatusFilter('ALL');
    setSelectedCustomerId('ALL');
    setSelectedSalesRepId('ALL');
    setSelectedRegion('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    searchTerm !== '' ||
    selectedCustomerId !== 'ALL' ||
    (canViewAllRep && selectedSalesRepId !== 'ALL') ||
    selectedRegion !== 'ALL' ||
    fromDate !== '' ||
    toDate !== '';

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

  // Lắng nghe sự kiện đơn hàng thời gian thực toàn hệ thống (Real-time Sync SN-49)
  useEffect(() => {
    const handleOrdersUpdated = () => {
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('loha_orders_updated', handleOrdersUpdated);
    window.addEventListener('storage', handleOrdersUpdated);
    return () => {
      window.removeEventListener('loha_orders_updated', handleOrdersUpdated);
      window.removeEventListener('storage', handleOrdersUpdated);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const effectiveSalesRep = !canViewAllRep
          ? (user?.id || user?.fullName)
          : (selectedSalesRepId !== 'ALL' ? selectedSalesRepId : undefined);

        const res = await ordersService.getOrders({
          page,
          limit,
          status: statusFilter,
          search: searchTerm || undefined,
          customerId: selectedCustomerId !== 'ALL' ? selectedCustomerId : undefined,
          salesRepId: effectiveSalesRep,
          region: selectedRegion !== 'ALL' ? selectedRegion : undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        });
        if (isMounted) {
          setOrders(res.data);
          setTotal(res.total);
          setTotalPages(res.totalPages);
          setTotalAmount(res.totalAmount ?? 0);
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
  }, [
    page,
    limit,
    statusFilter,
    searchTerm,
    selectedCustomerId,
    selectedSalesRepId,
    selectedRegion,
    fromDate,
    toDate,
    refreshKey,
    canViewAllRep,
    user?.id,
    user?.fullName,
  ]);

  useEffect(() => {
    let isMounted = true;
    if (!viewOrder?.id) {
      setApprovalHistory([]);
      return;
    }
    setIsLoadingApprovalHistory(true);
    ordersService.getApprovalHistory(viewOrder.id)
      .then((history) => {
        if (isMounted) setApprovalHistory(history);
      })
      .catch(() => {
        if (isMounted) setApprovalHistory([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingApprovalHistory(false);
      });
    return () => {
      isMounted = false;
    };
  }, [viewOrder?.id]);

  const handleOrderCreated = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setTotal((t) => t + 1);
    setRefreshKey((k) => k + 1);
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

  const submitApprovalDecision = async (
    order: Order,
    action: OrderApprovalAction,
    comment?: string,
  ): Promise<void> => {
    if (!order.id || approvingOrder) return;
    if (action !== 'APPROVE' && !comment?.trim()) return;
    setApprovingOrder(true);
    try {
      const decidedOrder = await ordersService.decideOrder(order.id, action, comment);
      setOrders((current) => current.map((item) => item.id === decidedOrder.id ? decidedOrder : item));
      setViewOrder((current) => current?.id === decidedOrder.id ? decidedOrder : current);
      setRefreshKey((key) => key + 1);
      try {
        setApprovalHistory(await ordersService.getApprovalHistory(order.id));
      } catch {
        // The decision is saved independently; history remains available when its request succeeds.
      }
      const successMessage: Record<OrderApprovalAction, string> = {
        APPROVE: 'Đã duyệt đơn',
        REJECT: 'Đã từ chối đơn',
        RETURN_FOR_UPDATE: 'Đã trả đơn về để chỉnh sửa',
      };
      showToast('success', `${successMessage[action]} ${decidedOrder.orderCode || ''}`.trim());
      setDecisionAction(null);
      setDecisionComment('');
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'Không thể cập nhật quyết định đơn hàng');
    } finally {
      setApprovingOrder(false);
    }
  };

  // SN-45: Xử lý hủy đơn hàng
  const handleCancelOrderSubmit = async (reason: string) => {
    if (!cancelingOrder?.id) return;
    try {
      const updatedOrder = await ordersService.updateOrderStatus(cancelingOrder.id, 'CANCELLED', reason);
      showToast('success', 'Đã hủy đơn hàng và nhả tồn kho thành công');
      setCancelingOrder(null);
      setOrders((current) => current.map((item) => item.id === updatedOrder.id ? updatedOrder : item));
      setViewOrder((current) => current?.id === updatedOrder.id ? updatedOrder : current);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi hủy đơn hàng';
      throw new Error(message);
    }
  };

  const handleApproveOrder = (order: Order): void => {
    void submitApprovalDecision(order, 'APPROVE');
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
              {(isSalesRep || isSalesManager || isAdmin) && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tạo Đơn hàng
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── THỐNG KÊ DOANH SỐ & TỔNG TIỀN ĐANG LỌC (SN-46) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Tổng số đơn hàng */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Số đơn đang lọc</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold text-slate-900">{total}</span>
                <span className="text-xs text-slate-400">đơn</span>
              </div>
            </div>
          </div>

          {/* Card 2: Tổng tiền tập kết quả đang lọc (Tiêu chí then chốt SN-46) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5 bg-gradient-to-br from-white via-white to-emerald-50/40">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-slate-500">Tổng tiền đang lọc</p>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-full">
                  Toàn tập lọc
                </span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5 truncate" title={formatCurrency(totalAmount)}>
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>

          {/* Card 3: Phân quyền & Phạm vi xem */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              canViewAllRep ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {canViewAllRep ? <Building2 className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Phạm vi dữ liệu (RBAC)</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                {canViewAllRep ? 'Toàn công ty' : (user?.fullName || user?.username || 'Cá nhân')}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {canViewAllRep ? 'Quyền: Quản lý kinh doanh' : 'Chỉ xem đơn do bạn phụ trách'}
              </p>
            </div>
          </div>

          {/* Card 4: Tình trạng bộ lọc */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Filter className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Bộ lọc hiện tại</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                  {hasActiveFilters ? 'Đang lọc đa tiêu chí' : 'Mặc định (Tất cả)'}
                </p>
              </div>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* ── BỘ LỌC ĐA TIÊU CHÍ (SN-46) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
          {/* Hàng 1: Ô tìm kiếm + Date Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Ô tìm kiếm từ khóa */}
            <div className="relative md:col-span-6 lg:col-span-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã đơn, tên đại lý, mã đại lý, nhân viên..."
                className="w-full pl-10 pr-9 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 hover:bg-white transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Từ ngày */}
            <div className="md:col-span-3 lg:col-span-3 flex items-center gap-2 bg-slate-50/60 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] text-slate-400 font-medium leading-none">Từ ngày</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  className="w-full text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Đến ngày */}
            <div className="md:col-span-3 lg:col-span-3 flex items-center gap-2 bg-slate-50/60 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] text-slate-400 font-medium leading-none">Đến ngày</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  className="w-full text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Hàng 2: Dropdown Lọc Đại lý, Nhân viên, Khu vực & Nút Reset */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
            {/* Dropdown Đại lý */}
            <div className="min-w-[180px] flex-1 sm:flex-initial">
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                aria-label="Lọc theo đại lý"
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL">🏢 Tất cả đại lý</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown Nhân viên kinh doanh (Khóa nếu SALES_REP, Mở nếu QLKD / Admin) */}
            <div className="min-w-[200px] flex-1 sm:flex-initial">
              <select
                value={canViewAllRep ? selectedSalesRepId : (user?.id || user?.fullName || 'CURRENT_USER')}
                onChange={(e) => handleSalesRepChange(e.target.value)}
                disabled={!canViewAllRep}
                aria-label="Lọc theo nhân viên kinh doanh"
                title={!canViewAllRep ? 'Bạn chỉ có quyền xem đơn do mình phụ trách' : 'Lọc theo nhân viên kinh doanh'}
                className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2 transition-colors focus:outline-none ${
                  !canViewAllRep
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-90'
                    : 'bg-white text-slate-700 border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
              >
                {!canViewAllRep ? (
                  <option value={user?.id || user?.fullName || 'CURRENT_USER'}>
                    👤 {user?.fullName || user?.username || 'Tôi (NVKD)'} (Chỉ xem đơn phụ trách)
                  </option>
                ) : (
                  <>
                    <option value="ALL">👥 Tất cả nhân viên kinh doanh</option>
                    {salesRepOptions.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        👤 {rep.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Dropdown Khu vực */}
            <div className="min-w-[150px] flex-1 sm:flex-initial">
              <select
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
                aria-label="Lọc theo khu vực"
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ALL">📍 Tất cả khu vực</option>
                <option value="Miền Bắc">Miền Bắc</option>
                <option value="Miền Trung">Miền Trung</option>
                <option value="Miền Nam">Miền Nam</option>
                <option value="Đông Nam Bộ">Đông Nam Bộ</option>
                <option value="Tây Nam Bộ">Tây Nam Bộ</option>
              </select>
            </div>

            {/* Nút Đặt lại bộ lọc */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
                title="Đặt lại toàn bộ tiêu chí lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>

          {/* Tabs trạng thái — cuộn ngang trên mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin pt-1">
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Đang tải danh sách đơn hàng...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-25" />
              <p className="text-sm font-medium text-slate-700">
                {hasActiveFilters
                  ? 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc'
                  : 'Chưa có đơn hàng nào'}
              </p>
              {hasActiveFilters ? (
                <>
                  <p className="text-xs text-slate-500">
                    Hãy thử đổi từ khóa tìm kiếm, chọn đại lý khác, nới rộng khoảng thời gian hoặc xóa bộ lọc.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Xóa bộ lọc
                  </button>
                </>
              ) : (
                (isSalesRep || isSalesManager || isAdmin) && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-3 text-sm text-blue-600 hover:underline inline-block"
                  >
                    + Tạo đơn hàng đầu tiên
                  </button>
                )
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
                        NVKD / Khu vực
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
                          {(order.status === 'PENDING_APPROVAL' || order.status === 'PENDING') && (
                            <p className="mt-1 max-w-64 truncate text-xs font-medium text-amber-700" title={order.approvalReasons?.join(' · ') || order.warningNote || 'Cần quản lý xét duyệt'}>
                              Cần duyệt: {order.approvalReasons?.[0] || order.warningNote || 'Chờ quản lý xét duyệt'}
                              {(order.approvalReasons?.length || 0) > 1 ? ` (+${(order.approvalReasons?.length || 1) - 1})` : ''}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700 font-medium">{order.customerName}</p>
                          <p className="text-xs text-slate-400">{order.customerCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-700 font-medium">{order.salesRepName || '—'}</p>
                          <p className="text-xs text-slate-400">
                            {order.region || (order.deliveryPoint?.address?.includes('Hà Nội') ? 'Miền Bắc' : order.deliveryPoint?.address?.includes('Đà Nẵng') ? 'Miền Trung' : 'Miền Nam')}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(order.deliveryDate)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {formatCurrency(order.grandTotal)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <OrderStatusBadge status={order.status} />
                          {(order.isShortDelivery ||
                            order.lines?.some(
                              (l) => l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity,
                            )) && (
                            <span className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-2.5 h-2.5" /> Giao thiếu
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {(order.status === 'DRAFT' || order.status === 'RETURNED_FOR_UPDATE') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingOrder(order);
                                  setIsCreateModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Chỉnh sửa / Gõ tiếp đơn nháp"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
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
                              onClick={() => setSelectedOrderForReorder(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Đặt lại đơn này theo giá hiện hành (SN-174)"
                            >
                              <RotateCcw className="w-4 h-4" />
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
                          <p className="text-xs text-slate-500 mt-0.5">
                            {order.salesRepName ? `NVKD: ${order.salesRepName}` : ''}
                            {order.region ? ` · ${order.region}` : ''}
                          </p>
                          {(order.status === 'PENDING_APPROVAL' || order.status === 'PENDING') && (
                            <p className="mt-1 line-clamp-2 text-xs font-medium text-amber-700">
                              Cần duyệt: {order.approvalReasons?.[0] || order.warningNote || 'Chờ quản lý xét duyệt'}
                              {(order.approvalReasons?.length || 0) > 1 ? ` (+${(order.approvalReasons?.length || 1) - 1})` : ''}
                            </p>
                          )}
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
                      {(order.status === 'DRAFT' || order.status === 'RETURNED_FOR_UPDATE') && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOrder(order);
                            setIsCreateModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                          title="Chỉnh sửa / Gõ tiếp đơn nháp"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Gõ tiếp</span>
                        </button>
                      )}
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
                        onClick={() => setSelectedOrderForReorder(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                        title="Đặt lại đơn (SN-174)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Đặt lại</span>
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

      {/* Modal Xem chi tiết đơn hàng */}
      {viewOrder && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Chi tiết Đơn hàng
                </h2>
                <p className="text-xs text-slate-500">{viewOrder.orderCode}</p>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SN-45: Hiển thị Vòng đời đơn hàng */}
            <div className="border-b border-slate-100 bg-white">
              <OrderTimeline status={viewOrder.status} />
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

              <section className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <History className="w-3.5 h-3.5" />
                  Lịch sử xét duyệt
                  <span className="ml-auto text-[10px] font-normal text-slate-400">Chỉ xem</span>
                </div>
                <div className="p-3 space-y-3">
                  {isLoadingApprovalHistory ? (
                    <p className="text-xs text-slate-400">Đang tải lịch sử...</p>
                  ) : approvalHistory.length === 0 ? (
                    <p className="text-xs text-slate-400">Chưa có quyết định xét duyệt.</p>
                  ) : approvalHistory.map((entry) => {
                    const actionLabel: Record<OrderApprovalAction, string> = {
                      APPROVE: 'Đã duyệt',
                      REJECT: 'Đã từ chối',
                      RETURN_FOR_UPDATE: 'Đã trả lại sửa',
                    };
                    return (
                      <article key={entry.id} className="border-l-2 border-blue-200 pl-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <span className="font-semibold text-slate-700">
                            {actionLabel[entry.action]} · {entry.approverName}
                          </span>
                          <time className="text-slate-400">
                            {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.createdAt))}
                          </time>
                        </div>
                        {entry.comment && <p className="mt-1 whitespace-pre-wrap text-slate-600">{entry.comment}</p>}
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* Cảnh báo Giao thiếu hàng nếu có (SN-170) */}
              {(viewOrder.isShortDelivery ||
                viewOrder.lines.some(
                  (l) => l.deliveredQuantity !== undefined && l.deliveredQuantity < l.quantity,
                )) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Đơn hàng được ghi nhận giao thiếu một số dòng hàng (SN-170)</p>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      Kho vận và nhân viên giao hàng đã ghi nhận chênh lệch số lượng thực giao so với số lượng đặt. Vui lòng đối chiếu với biên bản giao nhận.
                    </p>
                  </div>
                </div>
              )}

              {/* Danh sách dòng hàng */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  Danh sách hàng
                </div>
                {viewOrder.lines.map((line, i) => {
                  const isLineShort =
                    line.isShortDelivery ||
                    (line.deliveredQuantity !== undefined && line.deliveredQuantity < line.quantity);

                  return (
                    <div
                      key={i}
                      className={`px-3 py-2.5 border-b border-slate-100 last:border-0 ${
                        isLineShort ? 'bg-amber-50/40' : ''
                      }`}
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
                          {/* Hiển thị số lượng thực giao nếu có giao thiếu (SN-170) */}
                          {isLineShort && (
                            <div className="mt-1 space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                Thực giao: {line.deliveredQuantity} / {line.quantity} {line.unit} (Thiếu {line.quantity - (line.deliveredQuantity || 0)} {line.unit})
                              </span>
                              {line.shortDeliveryReason && (
                                <p className="text-[11px] text-amber-700 italic">
                                  Lý do: {line.shortDeliveryReason}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-800 shrink-0">
                          {formatCurrency(line.lineTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
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

              {viewOrder.cancelReason && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <span className="font-semibold text-red-800">Lý do hủy: </span>
                  {viewOrder.cancelReason}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ord = viewOrder;
                    setViewOrder(null);
                    setSelectedOrderForReorder(ord);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                  title="Đặt lại đơn hàng này theo bảng giá hiện hành (SN-174)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại đơn</span>
                </button>

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
                {(viewOrder.status === 'DRAFT' || viewOrder.status === 'RETURNED_FOR_UPDATE') && (
                  <button
                    type="button"
                    onClick={() => {
                      const ord = viewOrder;
                      setViewOrder(null);
                      setEditingOrder(ord);
                      setIsCreateModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
                    title="Chỉnh sửa hoặc tiếp tục gõ đơn hàng nháp này"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa / Gõ tiếp</span>
                  </button>
                )}
                {(isAdmin || isSalesManager) &&
                  (viewOrder.status === 'PENDING' || viewOrder.status === 'PENDING_APPROVAL') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApproveOrder(viewOrder)}
                      disabled={approvingOrder}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {approvingOrder ? 'Đang lưu...' : 'Duyệt'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDecisionComment(''); setDecisionAction('REJECT'); }}
                      disabled={approvingOrder}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" /> Từ chối
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDecisionComment(''); setDecisionAction('RETURN_FOR_UPDATE'); }}
                      disabled={approvingOrder}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60 cursor-pointer"
                    >
                      <CornerUpLeft className="h-4 w-4" /> Trả lại sửa
                    </button>
                  </>
                )}
                
                {/* Nút hủy đơn hàng chỉ hiển thị khi đơn chưa xuất kho hoặc đóng/hủy/từ chối */}
                {!['SHIPPED', 'DELIVERED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(viewOrder.status) && (
                  <button
                    type="button"
                    onClick={() => setCancelingOrder(viewOrder)}
                    className="px-4 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
                  >
                    Hủy đơn
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

      {/* Modal Hủy Đơn Hàng (SN-45) */}
      <CancelOrderModal
        isOpen={Boolean(cancelingOrder)}
        orderCode={cancelingOrder?.orderCode || ''}
        onClose={() => setCancelingOrder(null)}
        onConfirm={handleCancelOrderSubmit}
      />

      {/* Modal In & Xuất PDF Đơn hàng (SN-47) */}
      <OrderPrintModal
        order={printOrder}
        isOpen={Boolean(printOrder)}
        onClose={() => setPrintOrder(null)}
      />

      {/* Modal Đặt lại đơn hàng theo giá hiện hành (SN-174) */}
      {selectedOrderForReorder && (
        <ReorderModal
          order={selectedOrderForReorder}
          isOpen={Boolean(selectedOrderForReorder)}
          onClose={() => setSelectedOrderForReorder(null)}
          onSuccess={handleReorderSuccess}
        />
      )}

      {decisionAction && viewOrder && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <form
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              void submitApprovalDecision(viewOrder, decisionAction, decisionComment);
            }}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">
                {decisionAction === 'REJECT' ? 'Từ chối đơn hàng' : 'Trả đơn hàng về chỉnh sửa'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {viewOrder.orderCode} · Ý kiến sẽ được lưu vào lịch sử xét duyệt.
              </p>
            </div>
            <div className="p-5">
              <label htmlFor="approval-comment" className="mb-2 block text-sm font-medium text-slate-700">
                Ý kiến bắt buộc
              </label>
              <textarea
                id="approval-comment"
                autoFocus
                required
                minLength={1}
                maxLength={2000}
                rows={4}
                value={decisionComment}
                onChange={(event) => setDecisionComment(event.target.value)}
                placeholder="Nhập lý do từ chối hoặc nội dung cần chỉnh sửa..."
                className="w-full resize-y rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => { setDecisionAction(null); setDecisionComment(''); }}
                className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >Hủy</button>
              <button
                type="submit"
                disabled={approvingOrder || !decisionComment.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {approvingOrder ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
};
