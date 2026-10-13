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
} from 'lucide-react';
import { showToast } from '../components/toast';
import { Pagination } from '../components/pagination';
import { ordersService } from '../services/orders.service';
import { warehouseService } from '../services/warehouse.service';
import { customersService } from '../services/customers.service';
import { categoriesService } from '../services/categories.service';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import type { Customer, DeliveryPoint as CustomerDeliveryPoint } from '../types/customer.types';
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
import type { CategoryTreeNode } from '../types/categories';
import type { AgencyWarehouseDetail } from '../types/warehouse.types';
import { DateInput, formatVietnameseDate } from '../components/date-input';
import { OrderSuggestionsPanel } from '../components/order-suggestions-panel';
import type { SuggestedProductItem, LatestOrderItem } from '../types/order-suggestion.types';

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
  const [selectedDeliveryPoint, setSelectedDeliveryPoint] = useState<CustomerDeliveryPoint | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());
  const [note, setNote] = useState('');

  
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
  // Chỉ lấy nhánh cấp 1 chính thức từ Cây sản phẩm, loại bỏ nhóm thử nghiệm/trống
  const rootCategories = useMemo(() => {
    return categoriesTree.filter((cat) => {
      const isLevel1 = cat.level === 1 || !cat.parentId;
      const isActive = cat.status !== 'INACTIVE';
      const isNotTest = !cat.name.toLowerCase().includes('thử nghiệm') &&
        !cat.name.toLowerCase().includes('test') &&
        !cat.name.toLowerCase().includes('(trống)');
      return isLevel1 && isActive && isNotTest;
    });
  }, [categoriesTree]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  void isLoadingTree;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [productQuery, setProductQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phân trang danh sách sản phẩm (chuẩn Pagination như Quản lý đại lý)
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(6);
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

    try {
      const points = await customersService.getDeliveryPoints(c.id);
      setDeliveryPoints(points);
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

  // ── Định giá lại dòng hàng ──
  const quoteOrderLine = useCallback(async (line: OrderLine, priceList: PriceList): Promise<OrderLine> => {
    const item = getPriceListItem(priceList, line, line.listPrice || line.unitPrice || 25000);
    const itemPrice = item ? item.price : (line.listPrice || line.unitPrice || 25000);
    const itemMinPrice = item ? item.minPrice : Math.round(itemPrice * 0.8);

    const conversionRate = line.conversionRate || 1;
    const listPrice = Math.round(itemPrice * conversionRate);
    const minPrice = Math.round(itemMinPrice * conversionRate);
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
  }, [productQuery, selectedCategoryId, selectedCustomer?.id]);

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

  // ── Thêm mặt hàng từ Bảng Gợi ý (Task SN-43) ──
  const handleAddSuggestedItem = useCallback((item: SuggestedProductItem, quantity: number) => {
    if (!selectedCustomer) {
      showToast('error', 'Vui lòng chọn đại lý trước');
      return;
    }
    if (!effectivePriceList) {
      showToast('error', priceListError || 'Chưa có bảng giá hiệu lực cho đại lý này');
      return;
    }

    const qtyToAdd = Math.max(1, quantity || 1);
    const existingIndex = lines.findIndex(
      (l) => l.productId === item.productId || (item.sku && l.productSku.toUpperCase() === item.sku.toUpperCase())
    );

    if (existingIndex >= 0) {
      // Nếu sản phẩm đã có trong giỏ hàng -> tăng số lượng
      const targetLine = lines[existingIndex];
      const newQty = targetLine.quantity + qtyToAdd;
      const updatedLine: OrderLine = {
        ...targetLine,
        quantity: newQty,
        baseQuantity: newQty * (targetLine.conversionRate || 1),
        lineTotal: newQty * targetLine.unitPrice,
      };
      setLines((current) => current.map((l, idx) => idx === existingIndex ? updatedLine : l));
      refreshLinePricing(updatedLine, effectivePriceList);
      showToast('success', `Đã tăng số lượng ${item.productName} (+${qtyToAdd} ${targetLine.unit || item.unit})`);
    } else {
      // Tìm trong danh mục sản phẩm nếu có để lấy unitOptions và category chuẩn
      const foundProduct = searchResults.find(
        (p) => p.id === item.productId || (item.sku && p.sku?.toUpperCase() === item.sku.toUpperCase())
      );

      const fallbackP = item.price || 25000;
      const priceItem = getPriceListItem(
        effectivePriceList,
        { productId: item.productId, productSku: item.sku },
        fallbackP,
      ) || {
        price: fallbackP,
        minPrice: Math.round(fallbackP * 0.8),
      };

      const baseUnit = foundProduct?.baseUnit || item.unit || 'Cái';
      const unitOptions = foundProduct
        ? getAvailableProductUnits(foundProduct)
        : [{ unitName: baseUnit, conversionRate: 1 }];

      const newLine: OrderLine = {
        id: 'line-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        productId: item.productId || (foundProduct ? foundProduct.id : 'p-' + item.sku),
        productSku: item.sku,
        productName: item.productName,
        categoryId: foundProduct?.categoryId || foundProduct?.category || 'ALL',
        category: foundProduct?.category,
        unit: baseUnit,
        baseUnit: baseUnit,
        conversionRate: 1,
        quantity: qtyToAdd,
        baseQuantity: qtyToAdd,
        unitPrice: Math.round(priceItem.price),
        listPrice: Math.round(priceItem.price),
        baseListPrice: priceItem.price,
        minPrice: priceItem.minPrice,
        unitOptions,
        discountPercent: 0,
        lineTotal: Math.round(priceItem.price) * qtyToAdd,
        stockAvailable: foundProduct?.availableStock ?? foundProduct?.stockQuantity ?? 999,
        availableStock: foundProduct?.availableStock ?? foundProduct?.stockQuantity ?? 999,
        pricingLoading: true,
      };

      setLines((current) => [...current, newLine]);
      refreshLinePricing(newLine, effectivePriceList);
      showToast('success', `Đã thêm ${item.productName} (${qtyToAdd} ${baseUnit}) vào giỏ hàng`);
    }
  }, [effectivePriceList, lines, priceListError, refreshLinePricing, searchResults, selectedCustomer]);

  // ── Thêm tất cả mặt hàng gợi ý (Task SN-43) ──
  const handleAddAllSuggestedItems = useCallback((itemsWithQty: Array<{ item: SuggestedProductItem; quantity: number }>) => {
    if (!selectedCustomer) {
      showToast('error', 'Vui lòng chọn đại lý trước');
      return;
    }
    if (!effectivePriceList) {
      showToast('error', priceListError || 'Chưa có bảng giá hiệu lực cho đại lý này');
      return;
    }
    if (!itemsWithQty || itemsWithQty.length === 0) return;

    let updatedLines = [...lines];
    let count = 0;

    itemsWithQty.forEach(({ item, quantity }, idx) => {
      const qtyToAdd = Math.max(1, quantity || 1);
      const existingIndex = updatedLines.findIndex(
        (l) => l.productId === item.productId || (item.sku && l.productSku.toUpperCase() === item.sku.toUpperCase())
      );

      if (existingIndex >= 0) {
        const targetLine = updatedLines[existingIndex];
        const newQty = targetLine.quantity + qtyToAdd;
        const updatedLine: OrderLine = {
          ...targetLine,
          quantity: newQty,
          baseQuantity: newQty * (targetLine.conversionRate || 1),
          lineTotal: newQty * targetLine.unitPrice,
        };
        updatedLines[existingIndex] = updatedLine;
        count++;
      } else {
        const foundProduct = searchResults.find(
          (p) => p.id === item.productId || (item.sku && p.sku?.toUpperCase() === item.sku.toUpperCase())
        );

        const fallbackP = item.price || 25000;
        const priceItem = getPriceListItem(
          effectivePriceList,
          { productId: item.productId, productSku: item.sku },
          fallbackP,
        ) || {
          price: fallbackP,
          minPrice: Math.round(fallbackP * 0.8),
        };

        const baseUnit = foundProduct?.baseUnit || item.unit || 'Cái';
        const unitOptions = foundProduct
          ? getAvailableProductUnits(foundProduct)
          : [{ unitName: baseUnit, conversionRate: 1 }];

        const newLine: OrderLine = {
          id: 'line-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).slice(2, 6),
          productId: item.productId || (foundProduct ? foundProduct.id : 'p-' + item.sku),
          productSku: item.sku,
          productName: item.productName,
          categoryId: foundProduct?.categoryId || foundProduct?.category || 'ALL',
          category: foundProduct?.category,
          unit: baseUnit,
          baseUnit: baseUnit,
          conversionRate: 1,
          quantity: qtyToAdd,
          baseQuantity: qtyToAdd,
          unitPrice: Math.round(priceItem.price),
          listPrice: Math.round(priceItem.price),
          baseListPrice: priceItem.price,
          minPrice: priceItem.minPrice,
          unitOptions,
          discountPercent: 0,
          lineTotal: Math.round(priceItem.price) * qtyToAdd,
          stockAvailable: foundProduct?.availableStock ?? foundProduct?.stockQuantity ?? 999,
          availableStock: foundProduct?.availableStock ?? foundProduct?.stockQuantity ?? 999,
          pricingLoading: true,
        };
        updatedLines.push(newLine);
        count++;
      }
    });

    setLines(updatedLines);
    updatedLines.forEach((l) => refreshLinePricing(l, effectivePriceList));
    showToast('success', `Đã thêm tất cả ${count} mặt hàng gợi ý vào giỏ hàng!`);
  }, [effectivePriceList, lines, priceListError, refreshLinePricing, searchResults, selectedCustomer]);

  // ── 1-Click Reorder đơn hàng gần nhất (Task SN-43 / SN-174) ──
  const handleReorderPreviousOrder = useCallback((items: LatestOrderItem[]) => {
    if (!selectedCustomer) {
      showToast('error', 'Vui lòng chọn đại lý trước');
      return;
    }
    if (!effectivePriceList) {
      showToast('error', priceListError || 'Chưa có bảng giá hiệu lực cho đại lý này');
      return;
    }
    if (!items || items.length === 0) return;

    let addedCount = 0;
    const newLinesToAdd: OrderLine[] = [];

    items.forEach((item, idx) => {
      const isAlreadyAdded = lines.some(
        (l) => l.productId === item.productId || (item.sku && l.productSku.toUpperCase() === item.sku.toUpperCase())
      );
      if (!isAlreadyAdded) {
        const foundProduct = searchResults.find(
          (p) => p.id === item.productId || (item.sku && p.sku?.toUpperCase() === item.sku.toUpperCase())
        );

        const fallbackP = item.unitPrice || 25000;
        const priceItem = getPriceListItem(
          effectivePriceList,
          { productId: item.productId || '', productSku: item.sku },
          fallbackP,
        ) || {
          price: fallbackP,
          minPrice: Math.round(fallbackP * 0.8),
        };

        const qty = Math.max(1, item.quantity || 1);
        const baseUnit = item.unit || foundProduct?.baseUnit || 'Cái';
        const unitOptions = foundProduct
          ? getAvailableProductUnits(foundProduct)
          : [{ unitName: baseUnit, conversionRate: 1 }];

        newLinesToAdd.push({
          id: 'line-' + Date.now() + '-' + idx,
          productId: item.productId || (foundProduct ? foundProduct.id : 'p-' + item.sku),
          productSku: item.sku,
          productName: item.productName,
          categoryId: foundProduct?.categoryId || foundProduct?.category || 'ALL',
          category: foundProduct?.category,
          unit: baseUnit,
          baseUnit: baseUnit,
          conversionRate: 1,
          quantity: qty,
          baseQuantity: qty,
          unitPrice: Math.round(priceItem.price),
          listPrice: Math.round(priceItem.price),
          baseListPrice: priceItem.price,
          minPrice: priceItem.minPrice,
          unitOptions,
          discountPercent: 0,
          lineTotal: Math.round(priceItem.price) * qty,
          stockAvailable: foundProduct?.availableStock ?? foundProduct?.stockQuantity ?? 999,
          availableStock: foundProduct?.availableStock ?? foundProduct?.stockQuantity ?? 999,
          pricingLoading: true,
        });
        addedCount++;
      }
    });

    if (newLinesToAdd.length > 0) {
      setLines((curr) => {
        const next = [...curr, ...newLinesToAdd];
        newLinesToAdd.forEach((l) => refreshLinePricing(l, effectivePriceList));
        return next;
      });
      showToast('success', `Đã thêm nhanh ${addedCount} mặt hàng từ đơn hàng gần nhất!`);
    } else {
      showToast('info', 'Tất cả mặt hàng của đơn cũ đã có trong giỏ hàng.');
    }
  }, [effectivePriceList, lines, priceListError, refreshLinePricing, searchResults, selectedCustomer]);

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
      return l.quantity > available;
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
      {/* ── HEADER THANH ĐIỀU HƯỚNG TRANG ── */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to="/sales/orders"
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            title="Quay lại danh sách đơn hàng"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
              <span className="truncate">{editingOrder ? `Sửa đơn: ${editingOrder.orderCode}` : 'Tạo Đơn Hàng Mới'}</span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                {editingOrder ? 'Đơn nháp' : 'Soạn trực tiếp'}
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate hidden sm:block">
              {isSalesRepOnly ? 'Chọn đại lý được phân công, duyệt cây sản phẩm và kiểm soát công nợ' : 'Chọn đại lý, duyệt cây sản phẩm và tạo đơn bán buôn'}
            </p>
          </div>
        </div>

        {/* Nút hành động trên Header */}
        <div className="flex items-center gap-2 shrink-0">
          {(!editingOrder || editingOrder.status === 'DRAFT') && (
            <button
              type="button"
              onClick={() => handleSubmit(false, true)}
              disabled={isSubmitting || lines.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-40 cursor-pointer"
              title="Lưu tạm đơn nháp để gõ tiếp sau"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Lưu đơn nháp</span>
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
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
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
                ? 'Vượt tồn kho'
                : debtStatus &&
                  debtStatus.creditLimit > 0 &&
                  debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                ? 'Gửi Duyệt'
                : editingOrder
                ? 'Cập nhật'
                : 'Tạo đơn'}
            </span>
          </button>
        </div>
      </div>

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
          <span>1. Đại lý & Giao hàng</span>
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
          <span>2. Chọn hàng & Giỏ</span>
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
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-extrabold flex items-center justify-center text-xs">1</span>
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Thông tin Đại lý & Điểm giao hàng</h3>
            </div>
            {isSalesRepOnly && (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200" title="Chỉ hiển thị đại lý được phân công cho bạn">
                Được phân công ({customers.length})
              </span>
            )}
          </div>

          {/* Phần 1.1: Tìm kiếm và Chọn Đại lý */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Chọn Đại lý đặt hàng</label>
              <span className="text-[11px] text-slate-500">Bấm chọn 1 đại lý để tải thông tin bảng giá & công nợ</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Tìm nhanh theo mã đại lý, tên hoặc số điện thoại..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Danh sách đại lý cuộn hiển thị dạng lưới 3 cột trên Desktop */}
            <div className="max-h-[190px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/40">
              {isLoadingCustomers ? (
                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-xs">Đang tải danh sách đại lý...</span>
                </div>
              ) : customers.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
                  Không tìm thấy đại lý nào phù hợp
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {customers.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    const isLocked = c.status === 'LOCKED';
                    const groupInfo = getCustomerGroupBadge(c.group);

                    return (
                      <div
                        key={c.id}
                        onClick={() => void handleSelectCustomer(c)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/20 shadow-xs'
                            : isLocked
                            ? 'border-rose-300 bg-rose-50/70'
                            : 'border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                              <span className="font-mono font-semibold text-slate-700">{c.code}</span>
                              <span>·</span>
                              <span>{c.phone || 'Chưa có SĐT'}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${groupInfo.badgeClass}`}>
                            {groupInfo.label}
                          </span>
                        </div>
                        {c.address && (
                          <p className="text-[11px] text-slate-500 mt-1 truncate">
                            📍 {c.address}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Phần 1.2: Bảng tóm tắt Đại lý đã chọn (Bảng giá + Kho + Hạn mức công nợ) */}
          {selectedCustomer ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-blue-50/40 border border-blue-200/70 rounded-xl text-xs">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide">Đại lý đang chọn</div>
                <div className="font-bold text-slate-900 text-sm">{selectedCustomer.name}</div>
                <div className="text-slate-600 font-mono text-xs">{selectedCustomer.code} · {selectedCustomer.phone || 'Chưa có SĐT'}</div>
                <div className="text-slate-500 text-[11px] truncate">📍 {selectedCustomer.address || 'Chưa có địa chỉ'}</div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide">Chính sách áp dụng</div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Cấp đại lý:</span>
                  <span className="font-bold text-slate-900">{getCustomerGroupBadge(selectedCustomer.group).label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Bảng giá:</span>
                  <span className="font-bold text-indigo-700 truncate max-w-[170px]">
                    {isLoadingPriceList ? 'Đang tải...' : effectivePriceList ? effectivePriceList.name : (priceListError || 'Bảng giá chuẩn')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Kho phục vụ:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                    {servingWarehouse ? servingWarehouse.warehouseName : 'Kho Tổng'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    Hạn mức công nợ
                  </span>
                  {debtStatus && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${debtStatus.canCreateOrder ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {debtStatus.canCreateOrder ? 'Hợp lệ' : 'Bị khóa nợ'}
                    </span>
                  )}
                </div>
                {debtStatus ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Dư nợ hiện tại:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(debtStatus.currentDebt)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Hạn mức khả dụng:</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(debtStatus.availableLimit)}</span>
                    </div>
                    {debtStatus.creditLimit > 0 && (
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (debtStatus.currentDebt / debtStatus.creditLimit) * 100 > 90
                              ? 'bg-rose-500'
                              : (debtStatus.currentDebt / debtStatus.creditLimit) * 100 > 75
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round((debtStatus.currentDebt / debtStatus.creditLimit) * 100))}%`,
                          }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-slate-400 text-xs py-1">Đang tải trạng thái công nợ...</div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs">
              <span className="text-base">⚠️</span>
              <span><strong>Chưa chọn đại lý:</strong> Vui lòng bấm chọn 1 đại lý ở danh sách trên để tiếp tục bước chọn sản phẩm.</span>
            </div>
          )}

          {/* Phần 1.3: Thông tin Giao hàng & Ngày giao & Ghi chú */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
            {/* Cột A: Điểm giao hàng */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Điểm giao hàng
                </label>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => setIsDeliveryModalOpen(true)}
                    className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
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
                    if (!val || val === 'custom') {
                      setDeliveryPoint({ address: '', name: 'Địa chỉ tự nhập' });
                    } else {
                      const pool = deliveryPoints.length > 0 ? deliveryPoints : (selectedCustomer?.deliveryPoints || []);
                      const dp = pool.find((p) => p.id === val);
                      if (dp) setDeliveryPoint(dp);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Chọn điểm giao đã lưu --</option>
                  {(deliveryPoints.length > 0 ? deliveryPoints : (selectedCustomer?.deliveryPoints || [])).map((dp) => (
                    <option key={dp.id} value={dp.id}>
                      {dp.name} — {dp.address}
                    </option>
                  ))}
                  <option value="custom">Tự nhập địa chỉ khác...</option>
                </select>
              ) : null}
              <input
                type="text"
                value={deliveryPoint.address ?? ''}
                onChange={(e) => setDeliveryPoint((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Địa chỉ giao hàng chi tiết..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Cột B: Ngày giao hàng mong muốn (Ràng buộc KHÔNG ĐƯỢC TRƯỚC NGÀY TẠO ĐƠN) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Ngày giao hàng mong muốn</label>
              <DateInput
                value={deliveryDate}
                onChange={(val) => setDeliveryDate(val)}
                min={todayStr}
                error={deliveryDate && deliveryDate < todayStr ? 'Ngày giao không được trước ngày tạo đơn' : undefined}
                className="w-full text-xs"
              />
              <p className="text-[11px] text-slate-500">Tối thiểu từ ngày hôm nay ({formatVietnameseDate(todayStr)})</p>
            </div>

            {/* Cột C: Ghi chú đơn hàng */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Ghi chú đơn hàng (tuỳ chọn)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú đóng gói hoặc hướng dẫn giao hàng..."
                rows={2}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* PANEL GỢI Ý MẶT HÀNG ĐẠI LÝ THƯỜNG MUA (SN-43)                   */}
        {/* ================================================================= */}
        {selectedCustomer && (
          <OrderSuggestionsPanel
            customerId={selectedCustomer.id}
            customerName={selectedCustomer.name}
            existingProductIds={lines.map((l) => l.productId)}
            existingProductSkus={lines.map((l) => (l.productSku || '').toUpperCase())}
            onAddSuggestedItem={handleAddSuggestedItem}
            onAddAllSuggestedItems={handleAddAllSuggestedItems}
            onReorderPreviousOrder={handleReorderPreviousOrder}
          />
        )}

        {/* ================================================================= */}
        {/* KHỐI 2: DANH SÁCH SẢN PHẨM (CHỈ THÊM ĐƯỢC KHI ĐÃ CHỌN ĐẠI LÝ)   */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 font-extrabold flex items-center justify-center text-xs">2</span>
              <FolderTree className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Danh sách sản phẩm</h3>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Tìm theo SKU hoặc tên sản phẩm..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              {isSearching && (
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500 animate-spin" />
              )}
            </div>
          </div>

          {/* CẢNH BÁO NẾU CHƯA CHỌN ĐẠI LÝ */}
          {!selectedCustomer ? (
            <div className="min-h-[220px] py-14 px-6 bg-slate-50/80 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Chưa thể thêm sản phẩm</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Vui lòng <strong>chọn Đại lý ở Khối 1</strong> bên trên để áp dụng bảng giá hiệu lực và kích hoạt nút thêm hàng vào đơn.
              </p>
            </div>
          ) : (
            <>
              {/* Thanh chọn nhanh Cây nhóm hàng cấp 1 */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategoryId === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  Tất cả nhóm hàng
                </button>
                {rootCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
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

              {/* Lưới danh sách sản phẩm phân trang dạng 2 cột trên Desktop cực kỳ rộng rãi */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/20 p-2">
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
                          className={`p-3.5 rounded-xl border bg-white flex items-center justify-between gap-3 transition-all hover:shadow-xs ${
                            isOutOfStock
                              ? 'border-rose-200 bg-rose-50/30 opacity-75'
                              : isAlreadyAdded
                              ? 'border-blue-200 bg-blue-50/20'
                              : 'border-slate-200/80 hover:border-indigo-300'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                              <span className="text-[10px] font-mono text-slate-500 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">{p.sku}</span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-1.5 text-[11px]">
                              <span className="text-slate-500">ĐVT: <strong>{p.baseUnit}</strong></span>
                              {isOutOfStock ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                  Hết hàng
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  Còn lại {available}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-sm font-extrabold text-blue-700 block">
                                {formatCurrency(itemPrice)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddProduct(p)}
                              disabled={isDisabled}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-w-[76px] flex items-center justify-center cursor-pointer ${
                                isAlreadyAdded
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : isOutOfStock
                                  ? 'bg-rose-100 text-rose-400 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95'
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

              {/* ── THANH PHÂN TRANG GẮN LIỀN CHÂN DANH SÁCH (CHUẨN NHƯ QUẢN LÝ ĐẠI LÝ) ── */}
              {searchResults.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <Pagination
                    variant="default"
                    currentPage={productPage}
                    totalPages={totalProductPages}
                    totalItems={searchResults.length}
                    pageSize={productPageSize}
                    pageSizeOptions={[6, 12, 24]}
                    itemLabel="sản phẩm"
                    showFirstLast={true}
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
        {/* KHỐI 3: GIỎ HÀNG & TỔNG THANH TOÁN (FULL-WIDTH CARD)              */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 font-extrabold flex items-center justify-center text-xs">3</span>
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                Giỏ hàng chi tiết ({lines.length} sản phẩm)
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
            <div className="min-h-[220px] py-14 px-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-2.5">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <span>Chưa có sản phẩm nào trong đơn hàng. Vui lòng bấm "+ Thêm" từ danh sách bên trên.</span>
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
                      const isOver = l.quantity > avail;

                      return (
                        <tr key={l.id} className={`hover:bg-slate-50/70 transition-colors ${isOver ? 'bg-rose-50/60' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{l.productName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{l.productSku}</p>
                            {isOver && (
                              <p className="text-[10px] text-rose-600 font-bold mt-0.5">⚠️ Vượt tồn khả dụng (Còn lại {avail} {l.baseUnit})</p>
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
                            {l.discountPercent > 0 ? `-${l.discountPercent}%` : '0%'}
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

              {/* ── THANH PHÂN TRANG GIỎ HÀNG GẮN LIỀN CHÂN BẢNG (CHUẨN NHƯ QUẢN LÝ ĐẠI LÝ) ── */}
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
                    showFirstLast={true}
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
                  <div className="text-[11px] text-slate-400">Đã bao gồm chính sách giá và chiết khấu bậc thang theo đại lý</div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-semibold uppercase">TỔNG PHẢI THU</div>
                    <div className="text-xl sm:text-2xl font-black text-blue-700">
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
                        className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                        title="Lưu bản nháp để tiếp tục chỉnh sửa sau"
                      >
                        Lưu nháp
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
                      className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-xs cursor-pointer ${
                        hasStockError
                          ? 'bg-rose-400 opacity-60 cursor-not-allowed'
                          : debtStatus &&
                            debtStatus.creditLimit > 0 &&
                            debtStatus.currentDebt + totals.grandTotal > debtStatus.creditLimit
                          ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                          : 'bg-blue-600 hover:bg-blue-700'
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

      {/* Modal Thêm nhanh Đại lý */}
      
      {/* Modal Xác nhận gửi duyệt khi vượt hạn mức công nợ */}
      {showCreditApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-4">
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
                className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit(true, false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
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
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-4">
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
                className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl"
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
