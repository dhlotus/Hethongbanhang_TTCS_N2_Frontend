import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Trash2,
  Save,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  CreditCard,
  Package,
  FolderTree,
  Building2,
  X,
  RefreshCw,
  Loader2,
  MapPin,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { ordersService } from '../services/orders.service';
import { warehouseService } from '../services/warehouse.service';
import { customersService } from '../services/customers.service';
import { categoriesService } from '../services/categories.service';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import type { Customer, DeliveryPoint as CustomerDeliveryPoint } from '../types/customer.types';
import { tokenStorage } from '../utils/token-storage';
import { orderPricingService } from '../services/order-pricing.service';
import type { PriceList, CustomerGroupType } from '../types/price-list';
import type {
  Order,
  OrderLine,
  CustomerOption,
  DeliveryPoint,
  CustomerDebtStatus,
} from '../types/order';
import type { Product, ProductUnit } from '../types/products';
import type { CategoryTreeNode } from '../types/categories';
import type { AgencyWarehouseDetail } from '../types/warehouse.types';
import { DateInput } from '../components/date-input';

const DRAFT_KEY = 'new-order-page-draft';

/** Phân biệt màu sắc các cấp đại lý */
const getCustomerGroupBadge = (group?: string) => {
  const normalized = (group || '').toUpperCase();
  if (normalized === 'AGENT_LEVEL_1') {
    return {
      label: 'Đại lý Cấp 1',
      badgeClass: 'bg-emerald-200 text-emerald-900 border border-emerald-300 font-semibold shadow-xs',
      cardClass: 'bg-emerald-100/75 border-emerald-300 border-l-4 border-l-emerald-600 hover:bg-emerald-100 hover:border-emerald-400',
    };
  }
  if (normalized === 'AGENT_LEVEL_2') {
    return {
      label: 'Đại lý Cấp 2',
      badgeClass: 'bg-sky-200 text-sky-900 border border-sky-300 font-semibold shadow-xs',
      cardClass: 'bg-sky-100/75 border-sky-300 border-l-4 border-l-sky-600 hover:bg-sky-100 hover:border-sky-400',
    };
  }
  if (normalized === 'WHOLESALE') {
    return {
      label: 'Bán buôn',
      badgeClass: 'bg-teal-200 text-teal-900 border border-teal-300 font-semibold shadow-xs',
      cardClass: 'bg-teal-100/75 border-teal-300 border-l-4 border-l-teal-600 hover:bg-teal-100 hover:border-teal-400',
    };
  }
  if (normalized === 'RETAIL') {
    return {
      label: 'Bán lẻ',
      badgeClass: 'bg-amber-200 text-amber-900 border border-amber-300 font-semibold shadow-xs',
      cardClass: 'bg-amber-100/75 border-amber-300 border-l-4 border-l-amber-600 hover:bg-amber-100 hover:border-amber-400',
    };
  }
  return {
    label: group || 'Đại lý',
    badgeClass: 'bg-slate-200 text-slate-800 border border-slate-300 font-semibold shadow-xs',
    cardClass: 'bg-slate-100/80 border-slate-300 border-l-4 border-l-slate-500 hover:bg-slate-100 hover:border-slate-400',
  };
};

/** Định dạng tiền tệ VND */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

/** Ngày mặc định giao hàng: hôm nay + 3 ngày */
const getDefaultDeliveryDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
};

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

/** Input số lượng sản phẩm nhập tự do chuẩn số */
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
    if (raw === '') {
      setLocalVal('');
      onChangeQty(0);
      return;
    }
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned === '') {
      setLocalVal('');
      onChangeQty(0);
      return;
    }
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

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localVal}
      onChange={handleChange}
      onFocus={(e) => e.target.select()}
      onBlur={handleBlur}
      className={`w-16 px-2 py-1 text-xs text-center border rounded-lg focus:outline-none font-semibold ${
        isError
          ? 'border-rose-400 text-rose-700 bg-rose-50 focus:ring-2 focus:ring-rose-400'
          : 'border-slate-200 text-slate-800 bg-white focus:ring-2 focus:ring-blue-500'
      }`}
      placeholder="1"
    />
  );
};

export const CreateOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: editOrderId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId');

  // Đang chỉnh sửa đơn cũ hay tạo mới
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isLoadingExistingOrder, setIsLoadingExistingOrder] = useState(false);

  // ── 1. Thông tin Đại lý & Đơn hàng ──
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [deliveryPoint, setDeliveryPoint] = useState<Partial<DeliveryPoint>>({});
  const [deliveryPoints, setDeliveryPoints] = useState<CustomerDeliveryPoint[]>([]);
  const [selectedDeliveryPoint, setSelectedDeliveryPoint] = useState<CustomerDeliveryPoint | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());
  const [note, setNote] = useState('');


  // Thêm nhanh đại lý
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState({
    name: '',
    phone: '',
    address: '',
    creditLimit: 50000000,
  });
  const [creatingQuickCust, setCreatingQuickCust] = useState(false);

  // Bảng giá hiệu lực & Kho phục vụ
  const [servingWarehouse, setServingWarehouse] = useState<AgencyWarehouseDetail | null>(null);
  const [effectivePriceList, setEffectivePriceList] = useState<PriceList | null>(null);
  const [isLoadingPriceList, setIsLoadingPriceList] = useState(false);
  const [priceListError, setPriceListError] = useState('');
  const isDemoSession = tokenStorage.getAccessToken()?.startsWith('demo-jwt-') ?? false;

  // Hạn mức công nợ thời gian thực (Task SN-41)
  const [debtStatus, setDebtStatus] = useState<CustomerDebtStatus | null>(null);
  const [isLoadingDebt, setIsLoadingDebt] = useState<boolean>(false);
  void isLoadingDebt;
  const [showCreditApprovalModal, setShowCreditApprovalModal] = useState<boolean>(false);

  // ── 2. Cây danh mục & Sản phẩm ──
  const [categoriesTree, setCategoriesTree] = useState<CategoryTreeNode[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  void isLoadingTree;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [productQuery, setProductQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 3. Dòng hàng đơn hàng (Order Lines) ──
  const [lines, setLines] = useState<OrderLine[]>([]);
  const linesRef = useRef<OrderLine[]>([]);
  linesRef.current = lines;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // ── Tải đơn hàng cũ nếu là chế độ chỉnh sửa /edit/:id ──
  useEffect(() => {
    if (!editOrderId) return;
    setIsLoadingExistingOrder(true);
    ordersService
      .getOrderById(editOrderId)
      .then((ord: Order) => {
        setEditingOrder(ord);
        if (ord.deliveryDate) setDeliveryDate(ord.deliveryDate);
        if (ord.note) setNote(ord.note);
        if (ord.deliveryPoint) {
          setDeliveryPoint(ord.deliveryPoint);
          setSelectedDeliveryPoint(ord.deliveryPoint as CustomerDeliveryPoint);
        }
        if (ord.lines && ord.lines.length > 0) {
          setLines(ord.lines);
        }
        // Nạp thông tin đại lý
        ordersService.getCustomers().then((list) => {
          const found = list.find((c) => c.id === ord.customerId || c.code === ord.customerCode);
          if (found) {
            setSelectedCustomer(found);
          } else {
            setSelectedCustomer({
              id: ord.customerId || '',
              code: ord.customerCode || '',
              name: ord.customerName || 'Đại lý',
              group: ord.customerGroup || 'AGENT_LEVEL_2',
              phone: '',
              address: ord.deliveryPoint?.address || '',
            });
          }
        });
      })
      .catch((err: any) => {
        showToast('error', 'Không tìm thấy đơn hàng cần sửa');
        console.error(err);
      })
      .finally(() => {
        setIsLoadingExistingOrder(false);
      });
  }, [editOrderId]);

  // ── Tải cây nhóm hàng ──
  useEffect(() => {
    setIsLoadingTree(true);
    categoriesService
      .getCategoryTree()
      .then((tree) => {
        setCategoriesTree(tree);
      })
      .catch((err) => {
        console.error('Không thể tải cây nhóm hàng:', err);
      })
      .finally(() => {
        setIsLoadingTree(false);
      });
  }, []);

  // ── Tải danh sách đại lý (debounce 300ms) ──
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (isMounted) setIsLoadingCustomers(true);
      try {
        const list = await ordersService.getCustomers(customerSearch);
        if (isMounted) {
          setCustomers(list);
          if (initialCustomerId && !selectedCustomer && !editOrderId) {
            const found = list.find((c) => c.id === initialCustomerId);
            if (found) {
              void handleSelectCustomer(found);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách đại lý:', err);
      } finally {
        if (isMounted) setIsLoadingCustomers(false);
      }
    }, customerSearch ? 300 : 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [customerSearch, initialCustomerId, editOrderId]);

  // ── Xử lý chọn đại lý ──
  const handleSelectCustomer = useCallback(async (c: CustomerOption) => {
    if (selectedCustomer?.id !== c.id) {
      if (!editingOrder) {
        setLines([]);
      }
      setSearchResults([]);
      setSearchError('');
      ordersService.clearDraft(DRAFT_KEY);
    }
    setSelectedCustomer(c);

    try {
      const points = await customersService.getDeliveryPoints(c.id);
            const defaultPoint = points.find((p: CustomerDeliveryPoint) => p.isDefault) || points[0] || null;
      setSelectedDeliveryPoint(defaultPoint);
      setDeliveryPoint(defaultPoint || { address: c.address || '' });
    } catch {
      const fallbackPoints = (c.deliveryPoints || []) as unknown as CustomerDeliveryPoint[];
      setDeliveryPoints(fallbackPoints);
      const defaultPoint = fallbackPoints.find((p: CustomerDeliveryPoint) => p.isDefault) || fallbackPoints[0] || null;
      setSelectedDeliveryPoint(defaultPoint);
      setDeliveryPoint(defaultPoint || { address: c.address || '' });
    }
  }, [selectedCustomer?.id, editingOrder]);

  // ── Lấy kho phục vụ của đại lý ──
  useEffect(() => {
    if (!selectedCustomer?.id || isDemoSession) return;
    let active = true;
    warehouseService
      .getAgencyDefault(selectedCustomer.id)
      .then((detail) => {
        if (active) setServingWarehouse(detail);
      })
      .catch(() => {
        if (active) setServingWarehouse(null);
      });
    return () => {
      active = false;
    };
  }, [selectedCustomer?.id, isDemoSession]);

  // ── Tải bảng giá hiệu lực theo nhóm đại lý ──
  useEffect(() => {
    if (!selectedCustomer) {
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
            error instanceof Error ? error.message : 'Chưa có bảng giá hiệu lực cho nhóm đại lý này',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingPriceList(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCustomer?.id, selectedCustomer?.group]);

  // ── Định giá lại dòng hàng ──
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
        {
          id: line.productId,
          sku: line.productSku,
          categoryId: line.categoryId || line.category,
        },
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

  useEffect(() => {
    if (!effectivePriceList) return;
    linesRef.current.forEach((line) => refreshLinePricing(line, effectivePriceList));
  }, [effectivePriceList, refreshLinePricing]);

  // ── Kiểm soát công nợ thời gian thực (Task SN-41) ──
  useEffect(() => {
    let active = true;
    if (!selectedCustomer) {
      setDebtStatus(null);
      return;
    }

    setIsLoadingDebt(true);
    ordersService
      .getDebtStatus(selectedCustomer.id)
      .then((res) => {
        if (active) setDebtStatus(res);
      })
      .catch(() => {
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
      })
      .finally(() => {
        if (active) setIsLoadingDebt(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCustomer]);

  // ── Tìm kiếm sản phẩm theo Cây nhóm hàng & Từ khóa (debounce 300ms) ──
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const results = await ordersService.searchProducts(
          productQuery,
          100,
          selectedCustomer?.id,
        );

        // Lọc theo Cây nhóm hàng nếu được chọn
        const filtered =
          selectedCategoryId === 'ALL'
            ? results
            : results.filter(
                (p) =>
                  p.categoryId === selectedCategoryId ||
                  p.category === selectedCategoryId ||
                  p.category?.includes(selectedCategoryId),
              );

        setSearchResults(filtered);
      } catch {
        setSearchResults([]);
        setSearchError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [productQuery, selectedCategoryId, selectedCustomer?.id]);

  // ── Khôi phục nháp từ localStorage nếu tạo mới ──
  useEffect(() => {
    if (editingOrder || editOrderId) return;
    const draft = ordersService.getDraft(DRAFT_KEY);
    if (draft?.lines && draft.lines.length > 0) {
      setLines(draft.lines);
      if (draft.customerId && !initialCustomerId) {
        ordersService.getCustomers().then((list) => {
          const c = list.find((x) => x.id === draft.customerId);
          if (c) {
            void handleSelectCustomer(c);
            if (draft.deliveryPoint) setDeliveryPoint(draft.deliveryPoint);
          }
        });
      }
      if (draft.deliveryDate) setDeliveryDate(draft.deliveryDate);
      if (draft.note) setNote(draft.note);
      showToast('info', 'Đã khôi phục nháp đơn hàng từ phiên làm việc trước');
    }
  }, [editingOrder, editOrderId, initialCustomerId, handleSelectCustomer]);

  // ── Tự động lưu nháp ──
  useEffect(() => {
    if (editingOrder || lines.length === 0) return;
    ordersService.saveDraft(DRAFT_KEY, {
      customerId: selectedCustomer?.id,
      deliveryDate,
      note,
      lines,
    });
  }, [lines, selectedCustomer, deliveryDate, note, editingOrder]);

  // ── Thao tác thêm sản phẩm vào đơn ──
  const handleAddProduct = useCallback((product: Product) => {
    if (!selectedCustomer) {
      showToast('error', 'Vui lòng chọn Đại lý trước khi chọn sản phẩm');
      return;
    }
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
      showToast(
        'error',
        `Sản phẩm ${product.name || product.sku}: Hàng trong kho đã hết (Còn 0 ${product.baseUnit})`,
      );
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
      categoryId: product.categoryId || product.category,
      category: product.category,
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
    refreshLinePricing(line, effectivePriceList);
    showToast('success', `Đã thêm ${product.name} vào đơn`);
  }, [effectivePriceList, lines, priceListError, refreshLinePricing, selectedCustomer]);

  // ── Cập nhật số lượng / ĐVT ──
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
    setLines((current) => current.map((item) => (item.id === lineId ? updated : item)));
    if (effectivePriceList) {
      refreshLinePricing(updated, effectivePriceList);
    }
  }, [effectivePriceList, lines, refreshLinePricing]);

  const handleRemoveLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  // ── Tính tổng đơn hàng ──
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

  // ── Gửi tạo đơn / Cập nhật đơn ──
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
      showToast('error', priceListError || 'Chưa có bảng giá hiệu lực cho đại lý này');
      return;
    }
    if (lines.some((line) => line.pricingLoading || line.pricingError)) {
      showToast('error', 'Vui lòng xử lý xong lỗi giá hoặc chiết khấu trước khi gửi');
      return;
    }

    if (!asDraft) {
      if (hasStockError) {
        showToast('error', 'Một số sản phẩm vượt quá tồn khả dụng trong kho');
        return;
      }
      if (debtStatus && !debtStatus.canCreateOrder) {
        showToast('error', debtStatus.blockReason || 'Đại lý bị khóa tạo đơn do có khoản nợ quá hạn');
        return;
      }
      const currentDebt = debtStatus?.currentDebt ?? (selectedCustomer.currentDebt || 0);
      const creditLimit = debtStatus?.creditLimit ?? (selectedCustomer.creditLimit || 0);
      const projectedDebt = currentDebt + totals.grandTotal;
      const isExceeded = creditLimit > 0 && projectedDebt > creditLimit;

      if (isExceeded && !forceApproval) {
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

      if (editingOrder) {
        const orderId = editingOrder.id || editingOrder.orderCode;
        if (!orderId) throw new Error('Không tìm thấy định danh đơn hàng cần cập nhật');

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
        ordersService.clearDraft(DRAFT_KEY);
        navigate('/sales/orders');
        return;
      }

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
      window.dispatchEvent(new Event('loha_order_created'));

      if (created.status === 'PENDING_APPROVAL' || created.isCreditLimitExceeded || created.requiresApproval) {
        const approvalReason =
          created.approvalReasons?.join('; ') ||
          (created.isCreditLimitExceeded ? 'vượt hạn mức công nợ' : 'giá bán dưới giá sàn');
        showToast('warning', `Đơn hàng ${created.orderCode} đã tạo, cần duyệt: ${approvalReason}.`);
        navigate('/sales/orders');
      } else if (created.status === 'PENDING_INVENTORY_APPROVAL') {
        setCreatedOrder(created);
        setShowWarningModal(true);
      } else {
        showToast('success', `Tạo đơn hàng ${created.orderCode} thành công!`);
        navigate('/sales/orders');
      }
    } catch (err: unknown) {
      const responseMessage = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const msg = Array.isArray(responseMessage)
        ? responseMessage.join('; ')
        : responseMessage || (err instanceof Error ? err.message : 'Không thể tạo đơn hàng');
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tạo nhanh đại lý
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
      showToast('success', 'Thêm đại lý thành công', `Đại lý "${created.name}" đã được thêm!`);
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

  if (isLoadingExistingOrder) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      {/* ── HEADER THANH ĐIỀU HƯỚNG TRANG ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/sales/orders"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Quay lại danh sách đơn hàng"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>{editingOrder ? `Chỉnh sửa Đơn hàng: ${editingOrder.orderCode}` : 'Tạo Đơn Hàng Mới'}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {editingOrder ? 'Đơn nháp' : 'Soạn thảo trực tiếp'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn đại lý, duyệt cây nhóm hàng và tạo đơn bán buôn với kiểm soát công nợ & tồn kho thời gian thực
            </p>
          </div>
        </div>

        {/* Nút hành động trên Header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSubmit(false, true)}
            disabled={isSubmitting || lines.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-40 cursor-pointer"
            title="Lưu tạm đơn nháp để gõ tiếp sau"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span>Lưu đơn nháp</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false, false)}
            disabled={
              isSubmitting ||
              lines.length === 0 ||
              hasStockError ||
              isLoadingPriceList ||
              !effectivePriceList ||
              (debtStatus !== null && !debtStatus.canCreateOrder)
            }
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
              hasStockError
                ? 'bg-rose-400 opacity-60 cursor-not-allowed'
                : debtStatus &&
                  debtStatus.creditLimit > 0 &&
                  debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {isSubmitting
                ? 'Đang gửi...'
                : hasStockError
                ? 'Vượt tồn khả dụng'
                : debtStatus &&
                  debtStatus.creditLimit > 0 &&
                  debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                ? 'Gửi Duyệt Đơn hàng'
                : editingOrder
                ? 'Cập nhật & Gửi đơn'
                : 'Xác nhận Tạo đơn'}
            </span>
          </button>
        </div>
      </div>

      {/* ── BỐ CỤC 2 CỘT CHÍNH (MASTER-DETAIL) GIỐNG TRANG CÂY SẢN PHẨM ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================================================================= */}
        {/* CỘT TRÁI (5 CỘT): ĐẠI LÝ, CÔNG NỢ, ĐỊA CHỈ & THÔNG TIN GIAO HÀNG */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Chọn Đại lý */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Đại lý đặt hàng</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCustomerModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                + Thêm nhanh đại lý
              </button>
            </div>

            {/* Ô tìm kiếm đại lý */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Tìm theo mã hoặc tên đại lý..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Danh sách đại lý cuộn lựa chọn */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {isLoadingCustomers ? (
                <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-xs">Đang tải danh sách đại lý...</span>
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Không tìm thấy đại lý nào phù hợp
                </div>
              ) : (
                customers.map((c) => {
                  const isSelected = selectedCustomer?.id === c.id;
                  const isLocked = c.status === 'LOCKED';
                  const groupInfo = getCustomerGroupBadge(c.group);

                  return (
                    <div
                      key={c.id}
                      onClick={() => void handleSelectCustomer(c)}
                      className={`pt-2 first:pt-0 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/20 shadow-xs'
                          : isLocked
                          ? 'border-rose-300 bg-rose-50/70'
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-xs font-bold leading-snug truncate ${isLocked ? 'text-rose-900' : 'text-slate-900'}`}>
                            {c.name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {c.code} · {c.phone || 'Chưa có SĐT'}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 ${groupInfo.badgeClass}`}>
                          {groupInfo.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Đại lý đã chọn chi tiết */}
            {selectedCustomer && (
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Đại lý đang chọn:</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bảng giá hiệu lực:</span>
                    <span className="font-semibold text-blue-700">
                      {isLoadingPriceList
                        ? 'Đang tải...'
                        : effectivePriceList
                        ? `${effectivePriceList.name} (${effectivePriceList.code})`
                        : priceListError || 'Chưa có'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kho phục vụ:</span>
                    <span className="font-semibold text-slate-800">
                      {isDemoSession
                        ? 'Dữ liệu mẫu'
                        : servingWarehouse
                        ? `${servingWarehouse.warehouseCode} · ${servingWarehouse.warehouseName}`
                        : 'Mặc định'}
                    </span>
                  </div>
                </div>

                {/* Widget Hạn mức & Công nợ (SN-41) */}
                {debtStatus && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        Hạn mức & Dư nợ
                      </span>
                      {debtStatus.creditLimit > 0 && (
                        <span className="text-slate-500">
                          {Math.round((debtStatus.currentDebt / debtStatus.creditLimit) * 100)}% hạn mức
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">Hạn mức</span>
                        <span className="font-bold text-slate-900">{formatCurrency(debtStatus.creditLimit)}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">Dư nợ</span>
                        <span className="font-bold text-slate-900">{formatCurrency(debtStatus.currentDebt)}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">Khả dụng</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(debtStatus.availableLimit)}</span>
                      </div>
                    </div>

                    {/* Thanh % hạn mức */}
                    {debtStatus.creditLimit > 0 && (
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            debtStatus.currentDebt / debtStatus.creditLimit >= 0.9
                              ? 'bg-rose-500'
                              : debtStatus.currentDebt / debtStatus.creditLimit >= 0.7
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round((debtStatus.currentDebt / debtStatus.creditLimit) * 100))}%`,
                          }}
                        />
                      </div>
                    )}

                    {!debtStatus.canCreateOrder && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Đại lý bị khóa tạo đơn (Có nợ quá hạn {debtStatus.overdueDays} ngày)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Thông tin giao hàng & Ghi chú */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Thông tin giao hàng</h3>
            </div>

            {/* Điểm giao hàng */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Điểm giao hàng</label>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => setIsDeliveryModalOpen(true)}
                    className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    + Thêm điểm giao
                  </button>
                )}
              </div>

              {(deliveryPoints.length > 0 || (selectedCustomer?.deliveryPoints && selectedCustomer.deliveryPoints.length > 0)) ? (
                <select
                  value={deliveryPoint.id ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setDeliveryPoint({ address: '', name: 'Địa chỉ tự nhập' });
                    } else {
                      const pool = deliveryPoints.length > 0 ? deliveryPoints : (selectedCustomer?.deliveryPoints || []);
                    const dp = pool.find((p) => p.id === val);
                      if (dp) setDeliveryPoint(dp);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {(deliveryPoints.length > 0 ? deliveryPoints : (selectedCustomer?.deliveryPoints || [])).map((dp) => (
                    <option key={dp.id} value={dp.id}>
                      {dp.name} — {dp.address}
                    </option>
                  ))}
                  <option value="custom">Giao tới địa chỉ khác...</option>
                </select>
              ) : null}

              <input
                type="text"
                value={deliveryPoint.address ?? ''}
                onChange={(e) => setDeliveryPoint((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Địa chỉ giao hàng chi tiết..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Ngày giao hàng mong muốn */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Ngày giao hàng mong muốn</label>
              <DateInput
                value={deliveryDate}
                onChange={(val) => setDeliveryDate(val)}
                className="w-full text-xs"
              />
            </div>

            {/* Ghi chú */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Ghi chú đơn hàng (tuỳ chọn)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú hoặc yêu cầu đóng gói..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CỘT PHẢI (7 CỘT): CÂY SẢN PHẨM & GIỎ HÀNG CHI TIẾT                */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card 3: Cây sản phẩm & Tìm kiếm sản phẩm */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Cây nhóm hàng & Danh mục sản phẩm</h3>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Tìm SKU hoặc tên sản phẩm..."
                  className="w-full pl-8.5 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                {isSearching && (
                  <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-500 animate-spin" />
                )}
              </div>
            </div>

            {/* Thanh chọn nhanh Cây nhóm hàng (Tabs / Tree Badges) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('ALL')}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategoryId === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                }`}
              >
                Tất cả nhóm hàng
              </button>
              {categoriesTree.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategoryId === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  {cat.name}
                  {cat.productCount > 0 && (
                    <span className="ml-1 opacity-75 text-[10px]">({cat.productCount})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Lưới / Danh sách sản phẩm để chọn đưa vào đơn */}
            <div className="border border-slate-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100">
              {searchError && (
                <div className="p-4 text-center text-xs text-rose-600">{searchError}</div>
              )}
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Package className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <span>Không tìm thấy sản phẩm nào phù hợp với bộ lọc cây sản phẩm</span>
                </div>
              ) : (
                searchResults.map((p) => {
                  const available = p.availableStock ?? p.availableQuantity ?? (p.stockQuantity ?? 0);
                  const isOutOfStock = available <= 0;
                  const isAlreadyAdded = lines.some((l) => l.productId === p.id);
                  const priceItem = effectivePriceList
                    ? getPriceListItem(effectivePriceList, { productId: p.id, productSku: p.sku })
                    : undefined;
                  const isDisabled = isAlreadyAdded || isOutOfStock || !priceItem;

                  return (
                    <div
                      key={p.id}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        isOutOfStock
                          ? 'bg-rose-50/50 opacity-80'
                          : isAlreadyAdded
                          ? 'bg-slate-50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                          <span className="text-[10px] font-mono text-slate-500">{p.sku}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px]">
                          <span className="text-slate-500">ĐVT: {p.baseUnit}</span>
                          {isOutOfStock ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                              Hết hàng (Tồn: 0)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Còn hàng ({available})
                            </span>
                          )}
                          <span className="font-bold text-blue-700 ml-auto">
                            {priceItem ? formatCurrency(priceItem.price) : 'Chưa có giá'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        disabled={isDisabled}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          isAlreadyAdded
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : isOutOfStock
                            ? 'bg-rose-100 text-rose-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                        }`}
                      >
                        {isAlreadyAdded ? 'Đã thêm' : '+ Thêm'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 4: Danh sách sản phẩm trong đơn (Giỏ hàng chi tiết) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Sản phẩm trong đơn ({lines.length} mặt hàng)
                </h3>
              </div>
              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLines([])}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                Chưa có sản phẩm nào trong đơn hàng. Vui lòng chọn sản phẩm từ cây danh mục bên trên.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Sản phẩm / SKU</th>
                      <th className="px-2 py-2.5 text-center">ĐVT</th>
                      <th className="px-2 py-2.5 text-center">Số lượng</th>
                      <th className="px-3 py-2.5 text-right">Đơn giá</th>
                      <th className="px-2 py-2.5 text-right">CK (%)</th>
                      <th className="px-3 py-2.5 text-right">Thành tiền</th>
                      <th className="px-2 py-2.5 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {lines.map((l) => {
                      const avail = l.availableStock ?? l.stockAvailable ?? 0;
                      const isOver = l.quantity > avail;

                      return (
                        <tr key={l.id} className={`hover:bg-slate-50/70 transition-colors ${isOver ? 'bg-rose-50/60' : ''}`}>
                          <td className="px-3 py-2.5">
                            <p className="font-bold text-slate-900 truncate max-w-[160px]">{l.productName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{l.productSku}</p>
                            {isOver && (
                              <p className="text-[10px] text-rose-600 font-bold">Vượt tồn kho (Còn {avail})</p>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            {l.unitOptions && l.unitOptions.length > 1 ? (
                              <select
                                value={l.unit}
                                onChange={(e) => handleUpdateLine(l.id!, 'unit', e.target.value)}
                                className="px-1.5 py-1 text-xs border border-slate-200 rounded-md bg-white"
                              >
                                {l.unitOptions.map((opt) => (
                                  <option key={opt.unitName} value={opt.unitName}>
                                    {opt.unitName} (×{opt.conversionRate})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span>{l.unit}</span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateLine(l.id!, 'quantity', Math.max(1, l.quantity - 1))}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <LineQuantityInput
                                value={l.quantity}
                                onChangeQty={(qty) => handleUpdateLine(l.id!, 'quantity', qty)}
                                isError={isOver}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateLine(l.id!, 'quantity', l.quantity + 1)}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                            {formatCurrency(l.unitPrice)}
                          </td>
                          <td className="px-2 py-2.5 text-right text-emerald-700 font-semibold">
                            {l.discountPercent > 0 ? `${l.discountPercent}%` : '0%'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                            {formatCurrency(l.lineTotal)}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(l.id!)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa sản phẩm"
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
            )}

            {/* Tổng kết tài chính */}
            {lines.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng tiền hàng (giá niêm yết):</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Chiết khấu tự động:</span>
                  <span className="font-semibold">-{formatCurrency(totals.totalDiscount)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">TỔNG THANH TOÁN (GRAND TOTAL):</span>
                  <span className="text-base font-extrabold text-blue-700">
                    {formatCurrency(totals.grandTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS HỖ TRỢ ── */}
      {/* Modal Quản lý Điểm Giao Hàng */}
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

      {/* Modal Thêm nhanh đại lý */}
      {isQuickCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
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
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Số điện thoại *</label>
                <input
                  type="text"
                  required
                  placeholder="09xxxxxxxx"
                  value={quickCustForm.phone}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Địa chỉ *</label>
                <input
                  type="text"
                  required
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/TP"
                  value={quickCustForm.address}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingQuickCust}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  {creatingQuickCust && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Thêm đại lý</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận gửi duyệt khi vượt hạn mức công nợ (SN-41) */}
      {showCreditApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center ring-4 ring-amber-100 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Đơn hàng vượt hạn mức công nợ</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đại lý: <strong className="text-slate-800">{selectedCustomer?.name}</strong> ({selectedCustomer?.code})
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Hạn mức được cấp:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(debtStatus?.creditLimit || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dư nợ hiện tại:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(debtStatus?.currentDebt || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Giá trị đơn hàng này:</span>
                <span className="font-bold text-blue-700">+{formatCurrency(totals.grandTotal)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-rose-600">
                <span>Dự kiến vượt hạn mức:</span>
                <span>
                  +{formatCurrency(
                    Math.max(
                      0,
                      (debtStatus?.currentDebt || 0) + totals.grandTotal - (debtStatus?.creditLimit || 0),
                    ),
                  )}
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed">
              Hệ thống sẽ chuyển đơn sang trạng thái <strong>Cần phê duyệt (Pending Approval)</strong> để Kế toán / Quản lý kinh doanh duyệt trước khi soạn hàng.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreditApprovalModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Xem lại đơn
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs flex items-center gap-1.5"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận gửi duyệt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cảnh báo tồn kho */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cảnh báo tồn kho</h3>
              <p className="text-xs text-slate-500 mt-1">
                Đơn hàng <span className="font-bold text-slate-800">{createdOrder?.orderCode}</span> có mặt hàng vượt tồn kho khả dụng và đã được chuyển sang trạng thái chờ phê duyệt tồn kho.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowWarningModal(false);
                navigate('/sales/orders');
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
            >
              Đã hiểu & Về danh sách đơn
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
