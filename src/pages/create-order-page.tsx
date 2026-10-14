import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Trash2,
  Save,
  AlertTriangle,
  ShieldAlert,
  CreditCard,
  Package,
  FolderTree,
  Building2,
  RefreshCw,
  Loader2,
  MapPin,
  Lock,
  FileText,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { Pagination } from '../components/pagination';
import { ordersService } from '../services/orders.service';
import { warehouseService } from '../services/warehouse.service';
import { customersService } from '../services/customers.service';
import type { DeliveryPoint as CustomerDeliveryPoint } from '../types/customer.types';
import { tokenStorage } from '../utils/token-storage';
import { getStoredUser } from '../utils/navigation';
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
import type { AgencyWarehouseDetail } from '../types/warehouse.types';
import { DateInput } from '../components/date-input';

const DRAFT_KEY = 'new-order-page-draft';

/** Phân biệt màu sắc các cấp đại lý */
const getCustomerGroupBadge = (group?: string) => {
  const normalized = (group || '').toUpperCase();
  if (normalized === 'AGENT_LEVEL_1') {
    return {
      label: 'Đại lý Cấp 1',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold shadow-xs',
      cardClass: 'bg-emerald-50/70 border-emerald-300 border-l-4 border-l-emerald-600 hover:bg-emerald-100/60',
    };
  }
  if (normalized === 'AGENT_LEVEL_2') {
    return {
      label: 'Đại lý Cấp 2',
      badgeClass: 'bg-sky-100 text-sky-800 border border-sky-300 font-semibold shadow-xs',
      cardClass: 'bg-sky-50/70 border-sky-300 border-l-4 border-l-sky-600 hover:bg-sky-100/60',
    };
  }
  if (normalized === 'WHOLESALE') {
    return {
      label: 'Bán buôn',
      badgeClass: 'bg-teal-100 text-teal-800 border border-teal-300 font-semibold shadow-xs',
      cardClass: 'bg-teal-50/70 border-teal-300 border-l-4 border-l-teal-600 hover:bg-teal-100/60',
    };
  }
  if (normalized === 'RETAIL') {
    return {
      label: 'Bán lẻ',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold shadow-xs',
      cardClass: 'bg-amber-50/70 border-amber-300 border-l-4 border-l-amber-600 hover:bg-amber-100/60',
    };
  }
  return {
    label: group || 'Đại lý',
    badgeClass: 'bg-slate-100 text-slate-800 border border-slate-300 font-semibold shadow-xs',
    cardClass: 'bg-slate-50 border-slate-300 border-l-4 border-l-slate-500 hover:bg-slate-100/70',
  };
};

/** Định dạng tiền tệ VND */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

/** Định dạng ngày DD/MM/YYYY */
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

const todayStr = new Date().toISOString().slice(0, 10);

const getPriceListItem = (
  priceList: PriceList | null | undefined,
  line: Pick<OrderLine, 'productId' | 'productSku'>,
  fallbackPrice?: number,
) => {
  if (priceList?.items) {
    const found = priceList.items.find(
      (item) =>
        item.productId === line.productId ||
        item.productCode.toLowerCase() === line.productSku.toLowerCase(),
    );
    if (found) return found;
  }
  if (fallbackPrice !== undefined && fallbackPrice > 0) {
    return {
      id: `pli-fb-${line.productId}`,
      priceListId: priceList?.id || 'pl-default',
      productId: line.productId,
      productCode: line.productSku,
      productName: line.productSku,
      price: fallbackPrice,
      minPrice: Math.round(fallbackPrice * 0.8),
      baseUnit: 'Cái',
    } as any;
  }
  return undefined;
};

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
      className={`w-14 sm:w-16 px-1.5 py-1 text-xs text-center border rounded-lg focus:outline-none font-semibold ${
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

  // Quản lý tab trên mobile (360px)
  const [mobileTab, setMobileTab] = useState<'CUSTOMER' | 'PRODUCTS'>('CUSTOMER');

  // Đang chỉnh sửa đơn cũ hay tạo mới
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isLoadingExistingOrder, setIsLoadingExistingOrder] = useState(false);

  // ── Phân quyền Người dùng (Memoized để không tạo object mới ở mỗi render) ──
  const currentUser = useMemo(() => getStoredUser(), []);
  const currentUserId = currentUser?.id ?? '';
  const currentUsername = currentUser?.username ?? '';
  const currentFullName = currentUser?.fullName ?? '';

  const isManagerOrAdmin = useMemo(() => {
    return currentUser?.roles?.some((r) => {
      const u = r.toUpperCase();
      return u.includes('ADMIN') || u.includes('MANAGER') || u.includes('ACCOUNTANT') || u.includes('WAREHOUSE');
    }) ?? false;
  }, [currentUser]);

  const isSalesRep = useMemo(() => {
    return currentUser?.roles?.some((r) => {
      const u = r.toUpperCase();
      return u.includes('SALES_REP') || u.includes('SALE');
    }) ?? false;
  }, [currentUser]);

  // Nhân viên kinh doanh thông thường chỉ được xem đại lý được phân công phụ trách
  const isSalesRepOnly = isSalesRep && !isManagerOrAdmin;

  // ── 1. Thông tin Đại lý & Đơn hàng ──
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [deliveryPoint, setDeliveryPoint] = useState<Partial<DeliveryPoint>>({});
  const [deliveryPoints, setDeliveryPoints] = useState<CustomerDeliveryPoint[]>([]);
  const [isCustomDeliveryAddress, setIsCustomDeliveryAddress] = useState(false);
  const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());
  const [note, setNote] = useState('');

  // Danh sách điểm giao hàng khả dụng của đại lý
  const availableDeliveryPoints = useMemo(() => {
    if (deliveryPoints.length > 0) return deliveryPoints;
    if (selectedCustomer?.deliveryPoints && selectedCustomer.deliveryPoints.length > 0) {
      return selectedCustomer.deliveryPoints;
    }
    return [];
  }, [deliveryPoints, selectedCustomer?.deliveryPoints]);

  // Xử lý ghi chú: Tối đa 100 ký tự, cho phép xóa tự do và chặn phím gõ thêm khi đã đầy
  const handleNoteKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // 1. Phím xóa (Backspace, Delete) luôn luôn được phép
    if (e.key === 'Backspace' || e.key === 'Delete') {
      return;
    }

    // 2. Bộ gõ tiếng Việt (Windows Telex VIE TL / Unikey / IME composition):
    // Tuyệt đối không chặn sự kiện Process/229 hoặc isComposing để tránh làm bộ gõ bị hủy và nhảy lùi ký tự
    if (e.nativeEvent.isComposing || e.key === 'Process' || e.keyCode === 229) {
      return;
    }

    // 3. Phím điều hướng & phím chức năng (Ctrl+A, Ctrl+C, Ctrl+Z,...) luôn được phép
    const navKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab', 'Escape'];
    if (navKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // 4. Nếu đã đạt 100 ký tự và không bôi đen ký tự nào để thay thế -> chặn gõ thêm phím cứng
    const input = e.currentTarget;
    const hasSelection = (input.selectionStart ?? 0) !== (input.selectionEnd ?? 0);
    if (note.length >= 100 && !hasSelection) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [note.length]);

  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let val = e.target.value;

    // Luôn khống chế tối đa 100 ký tự
    if (val.length > 100) {
      val = val.slice(0, 100);
      e.target.value = val;
    }

    setNote(val);
  }, []);

  const handleNotePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text') || '';
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const currentVal = input.value;

    // Cắt vừa vặn 100 ký tự khi dán
    const newVal = (currentVal.slice(0, start) + pastedText + currentVal.slice(end)).slice(0, 100);
    e.preventDefault();
    input.value = newVal;
    setNote(newVal);
  }, []);

  // Bảng giá hiệu lực & Kho phục vụ
  const [servingWarehouse, setServingWarehouse] = useState<AgencyWarehouseDetail | null>(null);
  void servingWarehouse;
  const [effectivePriceList, setEffectivePriceList] = useState<PriceList | null>(null);
  const [isLoadingPriceList, setIsLoadingPriceList] = useState(false);
  const [priceListError, setPriceListError] = useState('');
  const isDemoSession = tokenStorage.getAccessToken()?.startsWith('demo-jwt-') ?? false;

  // Hạn mức công nợ thời gian thực (Task SN-41)
  const [debtStatus, setDebtStatus] = useState<CustomerDebtStatus | null>(null);
  const [isLoadingDebt, setIsLoadingDebt] = useState<boolean>(false);
  void isLoadingDebt;
  const [showCreditApprovalModal, setShowCreditApprovalModal] = useState<boolean>(false);

  // ── 2. Sản phẩm & Tìm kiếm ──
  const [productQuery, setProductQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phân trang danh sách sản phẩm (chuẩn Pagination như Quản lý đại lý)
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(12);
  const totalProductPages = Math.max(1, Math.ceil(searchResults.length / productPageSize));
  const pagedSearchResults = useMemo(() => {
    return searchResults.slice((productPage - 1) * productPageSize, productPage * productPageSize);
  }, [searchResults, productPage, productPageSize]);

  // ── 3. Dòng hàng đơn hàng (Order Lines) ──
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [cartPage, setCartPage] = useState(1);
  const [cartPageSize, setCartPageSize] = useState(5);
  const totalCartPages = Math.max(1, Math.ceil(lines.length / cartPageSize));
  const pagedLines = useMemo(() => {
    return lines.slice((cartPage - 1) * cartPageSize, cartPage * cartPageSize);
  }, [lines, cartPage, cartPageSize]);
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
          setIsCustomDeliveryAddress(!ord.deliveryPoint.id && Boolean(ord.deliveryPoint.address));
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


  // ── Tải danh sách đại lý (Chỉ hiển thị đại lý được phân công nếu là NVKD) ──
  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (isMounted) setIsLoadingCustomers(true);
      try {
        const list = await ordersService.getCustomers(customerSearch);
        if (!isMounted) return;

        let visibleList = list;

        // Nếu là Nhân viên kinh doanh: Chỉ lọc các đại lý được phân công cho mình
        if (isSalesRepOnly) {
          visibleList = list.filter((c) => {
            const repId = c.salesRepId || (c as unknown as { salesRep?: { id: string } }).salesRep?.id;
            const repName = c.salesRepName || (c as unknown as { salesRep?: { name: string } }).salesRep?.name;

            // Khớp theo ID tài khoản
            if (repId && (repId === currentUserId || repId === (currentUser as unknown as { userId?: string })?.userId)) {
              return true;
            }
            // Khớp theo Tên hiển thị hoặc username
            if (
              repName &&
              (repName.toLowerCase() === currentFullName.toLowerCase() ||
                repName.toLowerCase() === currentUsername.toLowerCase())
            ) {
              return true;
            }
            // Tài khoản demo NVKD
            if (
              currentUsername.toLowerCase().includes('sale') &&
              (repId === 'usr-sale-01' || repId === 'usr-sales-002')
            ) {
              return true;
            }
            return false;
          });

          // Nếu demo chưa gán đại lý nào, fallback an toàn giữ các đại lý mẫu để không rỗng
          if (visibleList.length === 0 && list.length > 0) {
            visibleList = list.slice(0, 5);
          }
        }

        setCustomers(visibleList);

        // Tự chọn đại lý nếu truyền customerId qua URL (chỉ chạy 1 lần khi load)
        if (initialCustomerId && !editOrderId && !hasAutoSelectedRef.current) {
          const found = visibleList.find((c) => c.id === initialCustomerId) || list.find((c) => c.id === initialCustomerId);
          if (found) {
            hasAutoSelectedRef.current = true;
            void handleSelectCustomer(found);
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
  }, [customerSearch, initialCustomerId, editOrderId, isSalesRepOnly, currentUserId, currentUsername, currentFullName]);

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
    setIsCustomDeliveryAddress(false);
    setIsCustomerSelectorOpen(false);

    try {
      const points = await customersService.getDeliveryPoints(c.id);
      setDeliveryPoints(points);
      const defaultPoint = points.find((p: CustomerDeliveryPoint) => p.isDefault) || points[0] || null;
      setDeliveryPoint(defaultPoint || { address: c.address || '' });
    } catch {
      const fallbackPoints = (c.deliveryPoints || []) as unknown as CustomerDeliveryPoint[];
      setDeliveryPoints(fallbackPoints);
      const defaultPoint = fallbackPoints.find((p: CustomerDeliveryPoint) => p.isDefault) || fallbackPoints[0] || null;
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

  // ── Lấy bảng giá hiệu lực của đại lý ──
  useEffect(() => {
    if (!selectedCustomer) {
      setEffectivePriceList(null);
      setPriceListError('');
      return;
    }

    let active = true;
    setIsLoadingPriceList(true);
    setPriceListError('');

    const customerGroup = (selectedCustomer.group || 'AGENT_LEVEL_1') as CustomerGroupType;
    orderPricingService
      .getEffectivePriceList(customerGroup)
      .then((priceList) => {
        if (active) {
          setEffectivePriceList(priceList);
          setPriceListError('');
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setEffectivePriceList(null);
          setPriceListError(
            err instanceof Error ? err.message : 'Không tìm thấy bảng giá hiệu lực cho đại lý này',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingPriceList(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCustomer]);

  // ── Định giá lại dòng hàng (So sánh chọn chính sách chiết khấu ưu đãi tốt nhất) ──
  const quoteOrderLine = useCallback(async (line: OrderLine, priceList: PriceList): Promise<OrderLine> => {
    const item = getPriceListItem(priceList, line, line.listPrice || line.unitPrice || 25000);
    const itemPrice = item ? item.price : (line.listPrice || line.unitPrice || 25000);
    const itemMinPrice = item ? item.minPrice : Math.round(itemPrice * 0.8);

    const conversionRate = line.conversionRate || 1;
    const listPrice = Math.round(itemPrice * conversionRate);
    const minPrice = Math.round(itemMinPrice * conversionRate);
    try {
      const pricingResult = await orderPricingService.calculatePricing(
        {
          id: line.productId,
          sku: line.productSku,
          name: line.productName,
          categoryId: line.categoryId || line.category,
        },
        Math.round(line.quantity * conversionRate),
        listPrice,
        selectedCustomer?.id,
      );

      const automaticPrice = pricingResult.unitPrice;
      const unitPrice = line.isPriceManuallyEdited
        ? Number(line.manualPrice || line.unitPrice)
        : automaticPrice;

      // Giữ đúng % chiết khấu từ chính sách (VD: mua 10 thì đúng 2%, mua nhiều đúng 4%),
      // tránh lệch do làm tròn số tiền VNĐ. Chỉ tính ngược % khi người dùng tự sửa giá thủ công.
      const discountPercent = line.isPriceManuallyEdited
        ? (listPrice > 0 ? Number((((listPrice - unitPrice) / listPrice) * 100).toFixed(2)) : 0)
        : pricingResult.discountPercent;

      const discountAmountPerUnit = line.isPriceManuallyEdited
        ? Math.max(0, listPrice - unitPrice)
        : pricingResult.discountAmountPerUnit;

      return {
        ...line,
        baseListPrice: item.price,
        listPrice,
        minPrice,
        discountType: pricingResult.discountType,
        discountAmountPerUnit,
        discountDisplayText: pricingResult.displayText,
        discountPercent,
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
  }, [selectedCustomer?.id]);

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

  // ── Tìm kiếm sản phẩm theo Từ khóa (debounce 300ms) ──
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

        setSearchResults(results);
        setProductPage(1);
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
  }, [productQuery, selectedCustomer?.id]);

  // ── Khôi phục nháp từ localStorage nếu tạo mới (chỉ chạy 1 lần khi mount) ──
  const hasRestoredDraftRef = useRef(false);
  useEffect(() => {
    if (editingOrder || editOrderId || hasRestoredDraftRef.current) return;
    hasRestoredDraftRef.current = true;
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
  }, [editingOrder, editOrderId, initialCustomerId]);

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
      setMobileTab('CUSTOMER');
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
    const fallbackP = product.price || 25000;
    const priceItem = getPriceListItem(effectivePriceList, { productId: product.id, productSku: product.sku }, fallbackP) || {
      price: fallbackP,
      minPrice: Math.round(fallbackP * 0.8),
    };

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

  // ── Tính tổng đơn hàng thời gian thực (Subtotal, Total Discount, Grand Total) ──
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    for (const l of lines) {
      const lineListPrice = l.listPrice || l.unitPrice || 0;
      const lineUnitPrice = l.unitPrice || 0;
      subtotal += l.quantity * lineListPrice;
      totalDiscount += Math.max(0, l.quantity * (lineListPrice - lineUnitPrice));
    }
    const grandTotal = Math.max(0, subtotal - totalDiscount);
    return { subtotal, totalDiscount, grandTotal };
  }, [lines]);

  // Kiểm tra tồn khả dụng theo Task SN-42
  const stockErrors = useMemo(() => {
    return lines.filter((l) => {
      const available = l.availableStock ?? l.stockAvailable ?? 0;
      const rate = l.conversionRate || 1;
      const maxOrderQty = Math.floor(available / rate);
      return l.quantity > maxOrderQty;
    });
  }, [lines]);
  const hasStockError = stockErrors.length > 0;

  // ── Gửi tạo đơn / Cập nhật đơn / Lưu nháp ──
  const handleSubmit = async (forceApproval = false, asDraft = false) => {
    if (!selectedCustomer) {
      showToast('error', 'Vui lòng chọn đại lý trước khi tạo đơn');
      setMobileTab('CUSTOMER');
      return;
    }
    if (deliveryDate && deliveryDate < todayStr) {
      showToast('error', 'Ngày giao hàng mong muốn không được trước ngày tạo đơn (hôm nay)');
      return;
    }
    if (lines.length === 0) {
      showToast('error', 'Vui lòng thêm ít nhất 1 sản phẩm vào đơn hàng');
      setMobileTab('PRODUCTS');
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

    // Khi Lưu Nháp (DRAFT): Bỏ qua chặn tồn kho và chặn hạn mức nợ
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

      // ── CHỈNH SỬA ĐƠN HÀNG CŨ ──
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

      // ── TẠO ĐƠN HÀNG MỚI ──
      const created = await ordersService.createOrder({
        customerId: selectedCustomer.id,
        priceListId: effectivePriceList?.id,
        deliveryPoint: Object.keys(deliveryPoint).length > 0 ? deliveryPoint : undefined,
        deliveryDate,
        lines: payloadLines,
        note,
        status: asDraft ? 'DRAFT' : undefined,
        salesRepId: (currentUser as any)?.userId || currentUser?.id,
        salesRepName: currentUser?.fullName || currentUser?.username,
      } as any);

      ordersService.clearDraft(DRAFT_KEY);
      window.dispatchEvent(new Event('loha_order_created'));

      if (asDraft) {
        showToast('success', `Đã lưu đơn hàng nháp ${created.orderCode} thành công!`);
        navigate('/sales/orders');
      } else if (created.status === 'PENDING_APPROVAL' || created.isCreditLimitExceeded || created.requiresApproval) {
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

  
  if (isLoadingExistingOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6 max-w-full overflow-x-hidden p-2 sm:p-4">
      {/* ── SEGMENTED CONTROL TAB CHUYỂN ĐỔI TRÊN MOBILE (360PX) ── */}
      <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMobileTab('CUSTOMER')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'CUSTOMER'
              ? 'bg-white text-blue-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Đại lý & Giao hàng</span>
          {selectedCustomer && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('PRODUCTS')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'PRODUCTS'
              ? 'bg-white text-blue-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Sản phẩm & Giỏ hàng</span>
          {lines.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-bold">
              {lines.length}
            </span>
          )}
        </button>
      </div>

      {/* ── BỐ CỤC HÀNG DỌC LIỀN MẠCH (VERTICAL SINGLE-COLUMN FLOW) ── */}
      <div className="space-y-6">

        {/* ================================================================= */}
        {/* KHỐI 1: THÔNG TIN ĐẠI LÝ & GIAO HÀNG (FULL-WIDTH CARD)           */}
        {/* ================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Link
                to="/sales/orders"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shrink-0 shadow-2xs"
                title="Quay lại danh sách đơn hàng"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </Link>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Thông tin đại lý & giao hàng</h3>
              </div>
              {editingOrder && (
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                  Đang sửa đơn: {editingOrder.orderCode}
                </span>
              )}
            </div>
            {isSalesRepOnly && (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200" title="Chỉ hiển thị đại lý được phân công cho bạn">
                Được phân công ({customers.length})
              </span>
            )}
          </div>

          {/* Phần 1.1: Bảng tóm tắt Đại lý đã chọn (Tự động thu gọn khi đã chọn, có nút Đổi đại lý) */}
          {selectedCustomer ? (
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 min-w-0">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Đại lý đặt hàng</div>
                  <div className="font-bold text-slate-900 text-sm truncate" title={selectedCustomer.name}>{selectedCustomer.name}</div>
                  <div className="text-slate-500 font-mono text-xs">{selectedCustomer.code}</div>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chính sách áp dụng</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-slate-900 truncate">
                      {isLoadingPriceList ? 'Đang tải...' : effectivePriceList ? effectivePriceList.name : (priceListError || 'Bảng giá chuẩn')}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${getCustomerGroupBadge(selectedCustomer.group).badgeClass}`}>
                      {getCustomerGroupBadge(selectedCustomer.group).label}
                    </span>
                  </div>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                      Hạn mức công nợ
                    </span>
                    {debtStatus && (
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${debtStatus.canCreateOrder ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {debtStatus.canCreateOrder ? 'Hợp lệ' : 'Bị khóa nợ'}
                      </span>
                    )}
                  </div>
                  {debtStatus ? (
                    <div className="flex items-center gap-3 text-xs pt-1">
                      <div>
                        <span className="text-slate-500 text-[11px]">Dư nợ: </span>
                        <span className="font-bold text-slate-900">{formatCurrency(debtStatus.currentDebt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px]">Khả dụng: </span>
                        <span className="font-bold text-emerald-700">{formatCurrency(debtStatus.availableLimit)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs py-1">Đang tải trạng thái công nợ...</div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCustomerSelectorOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                title={isCustomerSelectorOpen ? 'Thu gọn danh sách đại lý' : 'Chọn đại lý khác'}
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isCustomerSelectorOpen ? 'Thu gọn' : 'Đổi đại lý'}</span>
              </button>
            </div>
          ) : (
            <div className="py-3 px-4 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg flex items-center justify-center gap-2">
              <Building2 className="w-4 h-4 text-slate-300 shrink-0" />
              <span>Vui lòng chọn đại lý đặt hàng bên dưới</span>
            </div>
          )}

          {/* Phần 1.2: Vùng chọn đại lý (Tự động mở khi chưa chọn, thu gọn khi đã chọn) */}
          {(!selectedCustomer || isCustomerSelectorOpen) && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Tìm nhanh theo mã hoặc tên đại lý..."
                    className="w-full h-[38px] pl-9 pr-4 text-xs border border-slate-200 rounded-lg bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
                <span className="text-xs text-slate-400 font-medium shrink-0">
                  {isLoadingCustomers ? 'Đang tìm kiếm...' : `${customers.length} đại lý`}
                </span>
              </div>

              {/* Danh sách đại lý cuộn hiển thị trực tiếp dạng lưới 3 cột trên Desktop */}
              <div className="max-h-[260px] overflow-y-auto pr-1">
                {isLoadingCustomers ? (
                  <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    <span className="text-xs">Đang tải danh sách đại lý...</span>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-slate-400 text-xs">
                    Không tìm thấy đại lý nào phù hợp
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {customers.map((c) => {
                      const isSelected = selectedCustomer?.id === c.id;
                      const isLocked = c.status === 'LOCKED';
                      const groupInfo = getCustomerGroupBadge(c.group);

                      return (
                        <div
                          key={c.id}
                          onClick={() => void handleSelectCustomer(c)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-xs'
                              : isLocked
                              ? 'border-rose-300 bg-rose-50/70'
                              : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate" title={c.name}>{c.name}</p>
                              <div className="mt-0.5 text-[11px] text-slate-500 font-mono font-semibold">
                                {c.code}
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${groupInfo.badgeClass}`}>
                              {groupInfo.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phần 1.3: Thông tin Giao hàng & Ngày giao & Ghi chú (Canh chỉnh đều hàng ngang, chiều cao chuẩn 38px) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
            {/* Cột A: Điểm giao hàng */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 h-5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Điểm giao hàng</span>
              </label>
              {availableDeliveryPoints.length > 0 ? (
                isCustomDeliveryAddress ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={deliveryPoint.address ?? ''}
                      onChange={(e) => setDeliveryPoint({ address: e.target.value, name: 'Địa chỉ tự nhập' })}
                      placeholder="Nhập địa chỉ giao hàng chi tiết..."
                      className="w-full h-[38px] pl-3 pr-20 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDeliveryAddress(false);
                        if (availableDeliveryPoints.length > 0) {
                          setDeliveryPoint(availableDeliveryPoints[0]);
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Chọn điểm lưu
                    </button>
                  </div>
                ) : (
                  <select
                    value={deliveryPoint.id ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setIsCustomDeliveryAddress(true);
                        setDeliveryPoint({ address: '', name: 'Địa chỉ tự nhập' });
                      } else {
                        const dp = availableDeliveryPoints.find((p) => p.id === val);
                        if (dp) setDeliveryPoint(dp);
                      }
                    }}
                    className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 truncate"
                  >
                    <option value="">-- Chọn điểm giao đã lưu --</option>
                    {availableDeliveryPoints.map((dp) => (
                      <option key={dp.id} value={dp.id}>
                        {dp.name ? `${dp.name} — ${dp.address}` : dp.address}
                      </option>
                    ))}
                    <option value="custom">✏️ Tự nhập địa chỉ khác...</option>
                  </select>
                )
              ) : (
                <input
                  type="text"
                  value={deliveryPoint.address ?? ''}
                  onChange={(e) => setDeliveryPoint((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Địa chỉ giao hàng chi tiết..."
                  className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              )}
            </div>

            {/* Cột B: Ngày giao hàng */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 h-5">
                <span>Ngày giao hàng</span>
              </label>
              <DateInput
                showClear={false}
                value={deliveryDate}
                onChange={(val) => setDeliveryDate(val)}
                min={todayStr}
                error={deliveryDate && deliveryDate < todayStr ? 'Ngày giao không được trước ngày tạo đơn' : undefined}
                className="w-full text-xs"
              />
            </div>

            {/* Cột C: Ghi chú */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 h-5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Ghi chú</span>
              </label>
              <input
                type="text"
                value={note}
                maxLength={100}
                onKeyDown={handleNoteKeyDown}
                onChange={handleNoteChange}
                onPaste={handleNotePaste}
                placeholder="Ghi chú đơn hàng..."
                className="w-full h-[38px] px-3 text-xs border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 rounded-lg transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* KHỐI 2: DANH SÁCH SẢN PHẨM (CHỈ THÊM ĐƯỢC KHI ĐÃ CHỌN ĐẠI LÝ)   */}
        {/* ================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <FolderTree className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Danh sách sản phẩm</h3>
              {lines.length > 0 && (
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  Giỏ hàng: {lines.length} sản phẩm ({formatCurrency(totals.grandTotal)})
                </span>
              )}
            </div>
            <div className="relative w-full sm:w-72 mt-1 sm:mt-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Tìm theo SKU hoặc tên sản phẩm..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              {isSearching && (
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500 animate-spin" />
              )}
            </div>
          </div>

          {/* CẢNH BÁO NẾU CHƯA CHỌN ĐẠI LÝ (RÚT GỌN CHUẨN CARD CUỐI) */}
          {!selectedCustomer ? (
            <div className="min-h-[160px] py-10 px-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-2">
              <Lock className="w-8 h-8 text-slate-300 mx-auto" />
              <span>Chưa chọn đại lý</span>
            </div>
          ) : (
            <>

              {/* Lưới danh sách sản phẩm dạng 2 cột trên Desktop (Phẳng, thoáng đãng) */}
              <div>
                {searchError && (
                  <div className="p-4 text-center text-xs text-rose-600">{searchError}</div>
                )}
                {pagedSearchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
                    <Package className="w-10 h-10 text-slate-300 mb-2" />
                    <span>Không tìm thấy sản phẩm nào trong nhóm này</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pagedSearchResults.map((p) => {
                      const available = p.availableStock ?? p.availableQuantity ?? (p.stockQuantity ?? 0);
                      const isOutOfStock = available <= 0;
                      const isAlreadyAdded = lines.some((l) => l.productId === p.id);
                      const priceItem = getPriceListItem(effectivePriceList, { productId: p.id, productSku: p.sku }, p.price || 25000);
                      const itemPrice = priceItem ? priceItem.price : (p.price || 25000);
                      const isDisabled = isAlreadyAdded || isOutOfStock;

                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-lg border bg-white flex items-center justify-between gap-3 transition-all hover:shadow-xs ${
                            isOutOfStock
                              ? 'border-rose-200 bg-rose-50/30 opacity-75'
                              : isAlreadyAdded
                              ? 'border-indigo-200 bg-indigo-50/20'
                              : 'border-slate-200/80 hover:border-indigo-300'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                              <span className="text-[10px] font-mono text-slate-500 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded-md">{p.sku}</span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-1.5 text-[11px]">
                              <span className="text-slate-500">ĐVT: <strong>{p.baseUnit}</strong></span>
                              {isOutOfStock ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                  Hết hàng
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  Còn lại {available}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-sm font-extrabold text-indigo-700 block">
                                {formatCurrency(itemPrice)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddProduct(p)}
                              disabled={isDisabled}
                              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-w-[76px] flex items-center justify-center cursor-pointer ${
                                isAlreadyAdded
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : isOutOfStock
                                  ? 'bg-rose-100 text-rose-400 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95'
                              }`}
                            >
                              {isAlreadyAdded ? 'Đã thêm' : '+ Thêm'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── THANH PHÂN TRANG GẮN LIỀN CHÂN DANH SÁCH (CHUẨN FOOTER NHƯ QUẢN LÝ ĐƠN HÀNG) ── */}
              {searchResults.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <Pagination
                    variant="default"
                    currentPage={productPage}
                    totalPages={totalProductPages}
                    totalItems={searchResults.length}
                    pageSize={productPageSize}
                    pageSizeOptions={[8, 12, 24]}
                    itemLabel="sản phẩm"
                    showRecordRange={false}
                    showFirstLast={false}
                    onPageChange={(page) => setProductPage(page)}
                    onPageSizeChange={(newSize) => {
                      setProductPageSize(newSize);
                      setProductPage(1);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ================================================================= */}
        {/* KHỐI 3: GIỎ HÀNG & TỔNG THANH TOÁN                                */}
        {/* ================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Giỏ hàng ({lines.length} sản phẩm)
              </h3>
            </div>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={() => setLines([])}
                className="text-xs text-rose-600 hover:underline cursor-pointer font-semibold"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="min-h-[220px] py-14 px-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-2.5">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <span>Chưa có sản phẩm nào trong đơn hàng</span>
            </div>
          ) : (
            <>
              {/* BẢNG GIỎ HÀNG RỘNG RÃI FULL WIDTH */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Sản phẩm / SKU</th>
                      <th className="px-3 py-3 text-center">ĐVT</th>
                      <th className="px-3 py-3 text-center">Số lượng</th>
                      <th className="px-4 py-3 text-right">Đơn giá</th>
                      <th className="px-3 py-3 text-right">CK (%)</th>
                      <th className="px-4 py-3 text-right">Thành tiền</th>
                      <th className="px-3 py-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pagedLines.map((l) => {
                      const avail = l.availableStock ?? l.stockAvailable ?? 0;
                      const rate = l.conversionRate || 1;
                      const maxOrderQty = Math.floor(avail / rate);
                      const isOver = l.quantity > maxOrderQty;

                      return (
                        <tr key={l.id} className={`hover:bg-slate-50/70 transition-colors ${isOver ? 'bg-rose-50/60' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{l.productName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{l.productSku}</p>
                            {isOver && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[10px]">
                                <span className="text-rose-600 font-semibold">
                                  Vượt tồn khả dụng (Còn lại {avail} {l.baseUnit})
                                </span>
                                {maxOrderQty > 0 ? (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateLine(l.id!, 'quantity', maxOrderQty)}
                                      className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer transition-colors inline-flex items-center"
                                      title={`Bấm để điều chỉnh số lượng về mức tồn khả dụng: ${maxOrderQty} ${l.unit}`}
                                    >
                                      Đặt {maxOrderQty} {l.unit}
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic">(Kho đã hết hàng)</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {l.unitOptions && l.unitOptions.length > 1 ? (
                              <select
                                value={l.unit}
                                onChange={(e) => handleUpdateLine(l.id!, 'unit', e.target.value)}
                                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                              >
                                {l.unitOptions.map((opt) => (
                                  <option key={opt.unitName} value={opt.unitName}>
                                    {opt.unitName} (×{opt.conversionRate})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-semibold text-slate-800">{l.unit}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateLine(l.id!, 'quantity', Math.max(1, l.quantity - 1))}
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
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
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {formatCurrency(l.unitPrice)}
                          </td>
                          <td className="px-3 py-3 text-right text-emerald-700 font-bold">
                            {l.discountType === 'FIXED_AMOUNT'
                              ? `-${(l.discountAmountPerUnit || 0).toLocaleString('vi-VN')} đ`
                              : l.discountPercent > 0
                              ? `${l.discountPercent}%`
                              : '0%'}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-900 text-sm">
                            {formatCurrency(l.lineTotal)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(l.id!)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa sản phẩm này"
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

              {/* ── THANH PHÂN TRANG GIỎ HÀNG GẮN LIỀN CHÂN BẢNG (CHUẨN FOOTER NHƯ QUẢN LÝ ĐƠN HÀNG) ── */}
              {lines.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <Pagination
                    variant="default"
                    currentPage={cartPage}
                    totalPages={totalCartPages}
                    totalItems={lines.length}
                    pageSize={cartPageSize}
                    pageSizeOptions={[5, 10, 20]}
                    itemLabel="dòng hàng"
                    showRecordRange={false}
                    showFirstLast={false}
                    onPageChange={(page) => setCartPage(page)}
                    onPageSizeChange={(newSize) => {
                      setCartPageSize(newSize);
                      setCartPage(1);
                    }}
                  />
                </div>
              )}

              {/* KHỐI TỔNG THANH TOÁN VÀ NÚT HÀNH ĐỘNG */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-xs text-slate-600">
                  <div>Tiền hàng (giá niêm yết): <strong className="text-slate-900">{formatCurrency(totals.subtotal)}</strong></div>
                  {totals.totalDiscount > 0 && (
                    <div className="text-emerald-700 font-semibold">
                      Chiết khấu tự động: -{formatCurrency(totals.totalDiscount)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-semibold uppercase">TỔNG PHẢI THU</div>
                    <div className="text-xl sm:text-2xl font-black text-indigo-700">
                      {formatCurrency(totals.grandTotal)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Chỉ hiển thị nút Lưu nháp khi tạo đơn mới hoặc đơn đang ở trạng thái Nháp */}
                    {(!editingOrder || editingOrder.status === 'DRAFT') && (
                      <button
                        type="button"
                        onClick={() => handleSubmit(false, true)}
                        disabled={isSubmitting || lines.length === 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                        title="Lưu bản nháp để tiếp tục chỉnh sửa sau"
                      >
                        <Save className="w-3.5 h-3.5 text-slate-500" />
                        <span>Lưu nháp</span>
                      </button>
                    )}
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
                      className={`px-5 py-2.5 text-xs font-bold text-white rounded-lg transition-all shadow-xs cursor-pointer ${
                        hasStockError
                          ? 'bg-rose-400 opacity-60 cursor-not-allowed'
                          : debtStatus &&
                            debtStatus.creditLimit > 0 &&
                            debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                          ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang gửi...</span>
                        </span>
                      ) : hasStockError ? (
                        'Vượt tồn kho'
                      ) : debtStatus &&
                        debtStatus.creditLimit > 0 &&
                        debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit ? (
                        'Gửi Duyệt'
                      ) : editingOrder ? (
                        'Cập nhật đơn hàng'
                      ) : (
                        'Tạo đơn hàng'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── MODALS HỖ TRỢ ── */}
      {/* Modal Xác nhận gửi duyệt khi vượt hạn mức công nợ */}
      {showCreditApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Vượt Hạn Mức Công Nợ</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tổng đơn hàng ({formatCurrency(totals.grandTotal)}) cộng với dư nợ hiện tại sẽ vượt hạn mức công nợ của đại lý.
                  Đơn hàng sẽ chuyển sang trạng thái <b>Chờ Duyệt Hạn Mức</b> để Quản lý xét duyệt.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreditApprovalModal(false)}
                className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit(true, false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
              >
                {isSubmitting ? 'Đang gửi...' : 'Xác nhận Gửi Duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cảnh báo Chờ duyệt Tồn Kho */}
      {showWarningModal && createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Đơn hàng cần duyệt Tồn kho</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đơn hàng <b>{createdOrder.orderCode}</b> đã được lưu vào hệ thống ở trạng thái{' '}
                  <b>Chờ duyệt Tồn kho</b> do kho không đủ hàng.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowWarningModal(false);
                  navigate('/sales/orders');
                }}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
