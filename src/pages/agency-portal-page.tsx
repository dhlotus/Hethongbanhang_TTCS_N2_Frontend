import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  MapPin,
  Calendar,
  FileText,
  Building2,
  RefreshCw,
  X,
  Sparkles,
  Receipt,
  ArrowRight,
  ArrowLeft,
  Info,
  Check,
  CreditCard,
  Eye,
  XCircle,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Tag,
  Layers,
  FolderKanban,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { ordersService } from '../services/orders.service';
import { orderPricingService } from '../services/order-pricing.service';
import { priceListsService } from '../services/price-lists.service';
import { discountPoliciesService, getApplicablePolicyInfo, type DiscountPolicy } from '../services/discount-policies.service';
import { customerService } from '../services/customer.service';
import { PRODUCT_CATEGORIES } from '../services/products.service';
import { tokenStorage } from '../utils/token-storage';
import { getStoredUser } from '../utils/navigation';
import type { Customer, DeliveryPoint as CustomerDeliveryPoint } from '../types/customer.types';
import type { PriceList, CustomerGroupType } from '../types/price-list';
import type { Product } from '../types/products';
import type { Order, OrderLine, CustomerDebtStatus, CreateOrderPayload, PortalOrderItemPayload } from '../types/order';

/** Định dạng tiền tệ VNĐ chuẩn */
const formatVND = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

/** Loại bỏ hậu tố đơn vị trong ngoặc (Lon, Chai, Hộp...) để tránh lặp với dòng hiển thị đơn vị bên dưới */
const cleanProductName = (name?: string): string => {
  if (!name) return '';
  return name.replace(/\s*\((lon|chai|hộp|gói|thùng|lốc|lon\s*\d*|chai\s*\d*)\)\s*$/i, '').trim();
};

/** Nhãn hiển thị cho Nhóm/Cấp đại lý */
const getGroupBadgeMeta = (group?: string) => {
  switch (group) {
    case 'AGENT_LEVEL_1':
      return {
        label: 'Đại lý Cấp 1',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/10',
      };
    case 'AGENT_LEVEL_2':
      return {
        label: 'Đại lý Cấp 2',
        className: 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/10',
      };
    case 'RETAIL':
    default:
      return {
        label: 'Đại lý Bán lẻ',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/10',
      };
  }
};

/** Cấu trúc một món trong Giỏ hàng của Đại lý */
interface CartItem {
  product: Product;
  quantity: number;
  unit: string;
  unitPrice: number;
  listPrice: number;
  conversionRate: number;
  availableStock: number;
}

export const AgencyPortalPage: React.FC = () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. STATE THÔNG TIN ĐẠI LÝ & TÀI KHOẢN (SN-49: Cách ly dữ liệu theo Token)
  // ──────────────────────────────────────────────────────────────────────────
  const [currentUser] = useState(() => getStoredUser() || tokenStorage.getUser());
  
  // Khởi tạo thông tin đại lý dựa trên token của người dùng đang đăng nhập
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => {
    const list = customerService.getStoredCustomers();
    const user = tokenStorage.getUser() || getStoredUser();
    const matched = list.find(
      (c) =>
        c.id === user?.id ||
        (user?.email && c.email && user.email.toLowerCase() === c.email.toLowerCase()) ||
        (user?.username && c.code && c.code.toLowerCase() === user.username.toLowerCase()) ||
        (user?.email && c.phone && user.email.includes(c.phone))
    );
    return matched || list[0] || null;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. STATE BẢNG GIÁ & SẢN PHẨM HIỆU LỰC (SN-40 & SN-49)
  // ──────────────────────────────────────────────────────────────────────────
  const [discountPolicies, setDiscountPolicies] = useState<DiscountPolicy[]>([]);

  const loadDiscountPolicies = useCallback(async () => {
    try {
      const list = await discountPoliciesService.getPolicies();
      if (list && list.length > 0) {
        setDiscountPolicies(list);
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    void loadDiscountPolicies();
  }, [loadDiscountPolicies]);

  // Lắng nghe cập nhật chính sách chiết khấu thời gian thực
  useEffect(() => {
    const handlePoliciesUpdated = () => {
      void loadDiscountPolicies();
    };
    window.addEventListener('loha_discount_policies_updated', handlePoliciesUpdated);
    window.addEventListener('storage', handlePoliciesUpdated);
    return () => {
      window.removeEventListener('loha_discount_policies_updated', handlePoliciesUpdated);
      window.removeEventListener('storage', handlePoliciesUpdated);
    };
  }, [loadDiscountPolicies]);

  const [products, setProducts] = useState<Product[]>([]);
  const [effectivePriceList, setEffectivePriceList] = useState<PriceList | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedHierarchyCategory, setSelectedHierarchyCategory] = useState<{
    id: string;
    name: string;
    level: 1 | 2 | 3;
    parentName?: string;
    count: number;
  } | null>(null);
  const [categoryLevelTab, setCategoryLevelTab] = useState<'ALL' | 1 | 2 | 3>('ALL');
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const lastCatalogGroupRef = useRef<string>('');

  // ──────────────────────────────────────────────────────────────────────────
  // 3. STATE CÔNG NỢ THỜI GIAN THỰC (SN-41 & SN-49)
  // ──────────────────────────────────────────────────────────────────────────
  const [debtStatus, setDebtStatus] = useState<CustomerDebtStatus | null>(() => {
    const initCust = customerService.getStoredCustomers()[0];
    if (!initCust) return null;
    const cLimit = typeof initCust.creditLimit === 'number' ? initCust.creditLimit : 50000000;
    const cDebt = typeof initCust.currentDebt === 'number' ? initCust.currentDebt : 0;
    return {
      customerId: initCust.id,
      customerCode: initCust.code,
      customerName: initCust.name,
      creditLimit: cLimit,
      currentDebt: cDebt,
      availableLimit: Math.max(0, cLimit - cDebt),
      maxDebtDays: typeof initCust.maxDebtDays === 'number' ? initCust.maxDebtDays : 30,
      overdueAmount: 0,
      overdueDays: 0,
      canCreateOrder: true,
    };
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. STATE GIỎ HÀNG & BOTTOM SHEET (MOBILE-FIRST)
  // ──────────────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<Record<string, CartItem>>(() => {
    try {
      const raw = sessionStorage.getItem('loha_portal_cart');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('loha_portal_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Lắng nghe khi giỏ hàng được cập nhật từ trang Xác nhận đơn hàng
  useEffect(() => {
    const handleCartSync = () => {
      try {
        const raw = sessionStorage.getItem('loha_portal_cart');
        if (raw) {
          setCart(JSON.parse(raw));
        } else {
          setCart({});
        }
      } catch {}
    };
    window.addEventListener('loha_portal_cart_updated', handleCartSync);
    window.addEventListener('storage', handleCartSync);
    return () => {
      window.removeEventListener('loha_portal_cart_updated', handleCartSync);
      window.removeEventListener('storage', handleCartSync);
    };
  }, []);

  const [cartStep, setCartStep] = useState<1 | 2>(1);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [customDeliveryAddress, setCustomDeliveryAddress] = useState<string>('');
  const [selectedDeliveryPoint, setSelectedDeliveryPoint] = useState<CustomerDeliveryPoint | null>(() => {
    const initCust = customerService.getStoredCustomers()[0];
    return initCust?.deliveryPoints?.[0] || null;
  });

  useEffect(() => {
    if (selectedDeliveryPoint?.address) {
      setCustomDeliveryAddress(selectedDeliveryPoint.address);
    } else if (currentCustomer?.address && !customDeliveryAddress) {
      setCustomDeliveryAddress(currentCustomer.address);
    }
  }, [selectedDeliveryPoint, currentCustomer?.address]);
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [orderNote, setOrderNote] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Modal xác nhận sau khi gửi đơn thành công
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  // Điều hướng sang trang Theo dõi đơn hàng (Sidebar)
  const navigate = useNavigate();

  // Modal xem chi tiết đơn hàng
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // Modal xác nhận hủy đơn
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // ──────────────────────────────────────────────────────────────────────────
  // TẢI HỒ SƠ ĐẠI LÝ B2B TỪ TOKEN ĐĂNG NHẬP (CÁCH LY DỮ LIỆU)
  // ──────────────────────────────────────────────────────────────────────────
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);

  const loadCurrentAgencyProfile = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsLoadingProfile(true);
      const user = tokenStorage.getUser() || currentUser;

      // 1. Ưu tiên gọi API lấy profile đại lý tương ứng với Token hiện tại
      try {
        const portalCust = await customerService.getPortalProfile();
        if (portalCust && portalCust.id) {
          setCurrentCustomer(portalCust);
          if (portalCust.deliveryPoints?.length) {
            const defaultDp = portalCust.deliveryPoints.find((dp) => dp.isDefault) || portalCust.deliveryPoints[0];
            setSelectedDeliveryPoint(defaultDp);
          }
          if (isManualRefresh) {
            showToast('success', `Đã đồng bộ thông tin đại lý: ${portalCust.name}`);
          }
          return;
        }
      } catch {
        // Fallback tra cứu cục bộ nếu API portal chưa sẵn sàng
      }

      // 2. Tra cứu cục bộ khớp với người dùng đang đăng nhập
      const list = customerService.getStoredCustomers();
      const matchedCustomer = list.find(
        (c) =>
          c.id === user?.id ||
          (user?.email && c.email && user.email.toLowerCase() === c.email.toLowerCase()) ||
          (user?.username && c.code && c.code.toLowerCase() === user.username.toLowerCase()) ||
          (user?.email && c.phone && user.email.includes(c.phone))
      );

      if (matchedCustomer) {
        setCurrentCustomer(matchedCustomer);
        if (matchedCustomer.deliveryPoints?.length) {
          const defaultDp = matchedCustomer.deliveryPoints.find((dp) => dp.isDefault) || matchedCustomer.deliveryPoints[0];
          setSelectedDeliveryPoint(defaultDp);
        }
      }
      if (isManualRefresh) {
        showToast('info', 'Đã tải thông tin đại lý của bạn');
      }
    } catch (err) {
      console.error('Lỗi tải thông tin đại lý:', err);
    } finally {
      if (isManualRefresh) setIsLoadingProfile(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadCurrentAgencyProfile();
  }, [loadCurrentAgencyProfile]);

  // ──────────────────────────────────────────────────────────────────────────
  // TẢI CÔNG NỢ REAL-TIME CỦA ĐẠI LÝ (SN-41 & SN-49)
  // ──────────────────────────────────────────────────────────────────────────
  const fetchCustomerDebt = useCallback(async (customerId: string) => {
    try {
      const res = await ordersService.getDebtStatus(customerId);
      if (res && res.creditLimit !== undefined) {
        setDebtStatus(res);
        return;
      }
    } catch {
      // Fallback
    }

    if (currentCustomer) {
      const cLimit = typeof currentCustomer.creditLimit === 'number' ? currentCustomer.creditLimit : 50000000;
      const cDebt = typeof currentCustomer.currentDebt === 'number' ? currentCustomer.currentDebt : 0;
      const mDays = typeof currentCustomer.maxDebtDays === 'number' ? currentCustomer.maxDebtDays : 30;
      setDebtStatus({
        customerId: currentCustomer.id,
        customerCode: currentCustomer.code,
        customerName: currentCustomer.name,
        creditLimit: cLimit,
        currentDebt: cDebt,
        availableLimit: Math.max(0, cLimit - cDebt),
        maxDebtDays: mDays,
        overdueAmount: 0,
        overdueDays: 0,
        canCreateOrder: true,
      });
    }
  }, [currentCustomer]);

  useEffect(() => {
    if (currentCustomer?.id) {
      void fetchCustomerDebt(currentCustomer.id);
    }
  }, [currentCustomer?.id, fetchCustomerDebt]);

  // ──────────────────────────────────────────────────────────────────────────
  // TẢI BẢNG GIÁ & SẢN PHẨM KHÔNG CHỚP NHÁY (BACKGROUND SYNC)
  // ──────────────────────────────────────────────────────────────────────────
  const loadCatalogAndPricing = useCallback(
    async (isSilent = false) => {
      if (!currentCustomer) return;

      const group = (currentCustomer.customerGroup || (currentCustomer as unknown as { group?: string }).group || 'AGENT_LEVEL_1') as CustomerGroupType;
      const currentKey = `${currentCustomer.id}-${group}`;

      if (!isSilent && products.length === 0) {
        setIsLoadingCatalog(true);
      }
      setCatalogError('');

      try {
        // 1. Tải bảng giá áp dụng theo Cấp đại lý (SN-40)
        let priceList: PriceList | null = null;
        try {
          priceList = await orderPricingService.getEffectivePriceList(group);
        } catch {
          const res = await priceListsService.getPriceLists({ customerGroup: group, status: 'ACTIVE' });
          const listItems = res.data || (res as unknown as { items?: PriceList[] }).items || [];
          priceList =
            listItems.find((pl: PriceList) => pl.customerGroup === group && pl.status === 'ACTIVE') ||
            listItems.find((pl: PriceList) => pl.customerGroup === group) ||
            listItems[0] ||
            null;
        }
        setEffectivePriceList(priceList);

        // 2. Tải danh sách sản phẩm kèm tồn khả dụng (SN-42) với số lượng đầy đủ
        const prods = await ordersService.searchProducts('', 100);
        if (prods && prods.length > 0) {
          setProducts(prods);
        }
        lastCatalogGroupRef.current = currentKey;
      } catch (err: unknown) {
        setCatalogError((err instanceof Error ? err.message : String(err)) || 'Không thể tải danh mục sản phẩm');
      } finally {
        setIsLoadingCatalog(false);
      }
    },
    [currentCustomer, products.length]
  );

  useEffect(() => {
    if (currentCustomer?.id) {
      const group = (currentCustomer.customerGroup || (currentCustomer as unknown as { group?: string }).group || 'AGENT_LEVEL_1') as CustomerGroupType;
      const key = `${currentCustomer.id}-${group}`;
      if (lastCatalogGroupRef.current !== key) {
        void loadCatalogAndPricing();
      }
    }
  }, [currentCustomer?.id, currentCustomer?.customerGroup, loadCatalogAndPricing]);

  // Lắng nghe sự kiện cập nhật sản phẩm, kho tồn & bảng giá thời gian thực (Hệ thống mở)
  useEffect(() => {
    const handleProductsUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && (detail.id || detail.sku)) {
        setProducts((prev) => {
          const exists = prev.some(
            (p) => p.id === detail.id || (p.sku && p.sku.toUpperCase() === detail.sku?.toUpperCase())
          );
          if (exists) {
            return prev.map((p) =>
              p.id === detail.id || (p.sku && p.sku.toUpperCase() === detail.sku?.toUpperCase())
                ? { ...p, ...detail }
                : p
            );
          }
          return [detail, ...prev];
        });
      }
      void loadCatalogAndPricing(true);
    };

    const handleInventoryUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        const skuKey = detail.sku ? String(detail.sku).toUpperCase() : '';
        const idKey = detail.id ? String(detail.id) : '';
        const newStock = typeof detail.newStock === 'number' ? detail.newStock : detail.stockQuantity;

        if (typeof newStock === 'number') {
          setProducts((prev) =>
            prev.map((p) => {
              const matchSku = p.sku && p.sku.toUpperCase() === skuKey;
              const matchId = p.id === idKey;
              if (matchSku || matchId) {
                return {
                  ...p,
                  stockQuantity: newStock,
                  availableStock: newStock,
                  availableQuantity: newStock,
                };
              }
              return p;
            })
          );
        }
      }
      void loadCatalogAndPricing(true);
    };

    const handleOrdersUpdated = () => {
      void loadCatalogAndPricing(true);
      if (currentCustomer?.id) {
        void fetchCustomerDebt(currentCustomer.id);
      }
    };

    window.addEventListener('loha_products_updated', handleProductsUpdated);
    window.addEventListener('loha_inventory_updated', handleInventoryUpdated);
    window.addEventListener('loha_orders_updated', handleOrdersUpdated);
    window.addEventListener('loha_price_lists_updated', handleProductsUpdated);

    return () => {
      window.removeEventListener('loha_products_updated', handleProductsUpdated);
      window.removeEventListener('loha_inventory_updated', handleInventoryUpdated);
      window.removeEventListener('loha_orders_updated', handleOrdersUpdated);
      window.removeEventListener('loha_price_lists_updated', handleProductsUpdated);
    };
  }, [loadCatalogAndPricing]);

  // Đóng popover gợi ý thông minh khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hủy đơn hàng đang chờ duyệt
  const handleCancelOrder = async () => {
    if (!cancellingOrder?.id) return;
    setIsCancelling(true);
    try {
      await ordersService.cancelOrder(cancellingOrder.id, 'Đại lý chủ động hủy đơn trên Portal');
      showToast('success', `Đã hủy đơn hàng ${cancellingOrder.orderCode || cancellingOrder.id}`);
      setCancellingOrder(null);
      void loadCatalogAndPricing(true);
      if (currentCustomer) void fetchCustomerDebt(currentCustomer.id);
    } catch (err: unknown) {
      showToast('error', (err instanceof Error ? err.message : String(err)) || 'Không thể hủy đơn hàng');
    } finally {
      setIsCancelling(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TÍNH TOÁN BẢNG GIÁ & LỌC DANH MỤC THÔNG MINH
  // ──────────────────────────────────────────────────────────────────────────
  const pricingMap = useMemo(() => {
    const map = new Map<string, { price: number; minPrice: number }>();
    if (!effectivePriceList?.items) return map;

    for (const item of effectivePriceList.items) {
      if (item.productId) map.set(item.productId, { price: item.price, minPrice: item.minPrice });
      if (item.productCode) map.set(item.productCode.toUpperCase(), { price: item.price, minPrice: item.minPrice });
    }
    return map;
  }, [effectivePriceList]);

  // Xây dựng danh mục phân cấp Cấp 1 - Cấp 2 - Cấp 3 linh hoạt
  const hierarchicalCategories = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      level: 1 | 2 | 3;
      parentName?: string;
      count: number;
    }> = [];

    const getCount = (name: string, level: 1 | 2 | 3, id?: string) => {
      return products.filter((p) => {
        if (level === 1) {
          return p.parentCategory === name || p.category?.startsWith(name);
        }
        if (level === 2) {
          return p.subCategory === name || p.category?.includes(name);
        }
        if (level === 3) {
          return (
            (id && p.categoryId === id) ||
            p.category?.includes(name) ||
            p.name.toLowerCase().includes(name.toLowerCase())
          );
        }
        return false;
      }).length;
    };

    for (const catL1 of PRODUCT_CATEGORIES) {
      const c1Count = getCount(catL1.name, 1, catL1.id);
      list.push({
        id: catL1.id,
        name: catL1.name,
        level: 1,
        count: c1Count,
      });

      for (const catL2 of catL1.subCategories || []) {
        const c2Count = getCount(catL2.name, 2, catL2.id);
        list.push({
          id: catL2.id,
          name: catL2.name,
          level: 2,
          parentName: catL1.name,
          count: c2Count,
        });

        for (const catL3 of catL2.subCategories || []) {
          const c3Count = getCount(catL3.name, 3, catL3.id);
          list.push({
            id: catL3.id,
            name: catL3.name,
            level: 3,
            parentName: `${catL1.name} / ${catL2.name}`,
            count: c3Count,
          });
        }
      }
    }

    // Bổ sung các nhóm hàng động nếu có sản phẩm mới do Admin tạo ra
    for (const p of products) {
      if (p.parentCategory && !list.some((c) => c.level === 1 && c.name === p.parentCategory)) {
        list.push({
          id: `dyn-l1-${p.parentCategory}`,
          name: p.parentCategory,
          level: 1,
          count: getCount(p.parentCategory, 1),
        });
      }
      if (p.subCategory && !list.some((c) => c.level === 2 && c.name === p.subCategory)) {
        list.push({
          id: `dyn-l2-${p.subCategory}`,
          name: p.subCategory,
          level: 2,
          parentName: p.parentCategory,
          count: getCount(p.subCategory, 2),
        });
      }
    }

    return list;
  }, [products]);

  // Lọc danh mục hiển thị trong khung chọn theo Cấp độ và Từ khóa tìm kiếm
  const displayedCategories = useMemo(() => {
    return hierarchicalCategories.filter((cat) => {
      if (categoryLevelTab !== 'ALL' && cat.level !== categoryLevelTab) {
        return false;
      }
      if (categorySearchQuery.trim()) {
        const q = categorySearchQuery.trim().toLowerCase();
        const matchName = cat.name.toLowerCase().includes(q);
        const matchParent = cat.parentName ? cat.parentName.toLowerCase().includes(q) : false;
        return matchName || matchParent;
      }
      return true;
    });
  }, [hierarchicalCategories, categoryLevelTab, categorySearchQuery]);

  // Danh mục sản phẩm khả dụng cho đại lý
  const availableCatalog = useMemo(() => {
    return products
      .filter((p) => {
        const hasPrice = pricingMap.size === 0 || pricingMap.has(p.id) || (p.sku && pricingMap.has(p.sku.toUpperCase())) || p.price > 0;
        if (!hasPrice) return false;

        // Lọc theo nhóm phân cấp được chọn
        if (selectedHierarchyCategory) {
          const { level, name, id } = selectedHierarchyCategory;
          if (level === 1) {
            const match =
              p.parentCategory === name ||
              p.category?.startsWith(name) ||
              p.category?.includes(name);
            if (!match) return false;
          } else if (level === 2) {
            const match =
              p.subCategory === name ||
              p.category?.includes(name);
            if (!match) return false;
          } else if (level === 3) {
            const match =
              (p.categoryId && p.categoryId === id) ||
              p.category?.includes(name) ||
              p.name.toLowerCase().includes(name.toLowerCase());
            if (!match) return false;
          }
        } else if (selectedCategory !== 'ALL') {
          const cat = p.category || (p as unknown as { categoryName?: string }).categoryName;
          const parentCat = p.parentCategory || (p as unknown as { parentCategoryId?: string }).parentCategoryId;
          if (p.categoryId !== selectedCategory && parentCat !== selectedCategory && cat !== selectedCategory) {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchSku = p.sku.toLowerCase().includes(q);
          const matchCat =
            (p.category && p.category.toLowerCase().includes(q)) ||
            (p.parentCategory && p.parentCategory.toLowerCase().includes(q));
          return matchName || matchSku || matchCat;
        }

        return true;
      })
      .map((p) => {
        const pricing = pricingMap.get(p.id) || (p.sku ? pricingMap.get(p.sku.toUpperCase()) : undefined);
        const pPrice = p.price ?? (p as unknown as { unitPrice?: number }).unitPrice ?? 0;
        const agencyPrice = pricing?.price || pPrice;
        const retailPrice = pPrice > agencyPrice ? pPrice : agencyPrice;
        const discountPct = retailPrice > agencyPrice ? Math.round(((retailPrice - agencyPrice) / retailPrice) * 100) : 0;
        const availableStock = p.availableStock ?? p.availableQuantity ?? (p.stockQuantity ?? 0);

        return {
          ...p,
          agencyPrice,
          retailPrice,
          discountPct,
          availableStock,
        };
      });
  }, [products, pricingMap, selectedHierarchyCategory, selectedCategory, searchQuery]);

  // Gợi ý thông minh cho ô tìm kiếm
  const smartSuggestions = useMemo(() => {
    if (!isSearchFocused) return { products: [], categories: [], isTrending: false };

    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      const featured = availableCatalog.filter((p) => p.availableStock > 0).slice(0, 4);
      const topCats = hierarchicalCategories.filter((c) => c.count > 0 && c.level <= 2).slice(0, 4);
      return { products: featured, categories: topCats, isTrending: true };
    }

    const matchedProducts = availableCatalog
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.category && p.category.toLowerCase().includes(query))
      )
      .slice(0, 5);

    const matchedCategories = hierarchicalCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        (cat.parentName && cat.parentName.toLowerCase().includes(query))
    ).slice(0, 4);

    return { products: matchedProducts, categories: matchedCategories, isTrending: false };
  }, [isSearchFocused, searchQuery, availableCatalog, hierarchicalCategories]);

  // Đồng bộ giỏ hàng với danh mục sản phẩm và bảng giá thời gian thực
  useEffect(() => {
    if (availableCatalog.length === 0) return;

    setCart((prevCart) => {
      let hasChanges = false;
      const nextCart = { ...prevCart };

      for (const [prodId, cartItem] of Object.entries(nextCart)) {
        const live = availableCatalog.find(
          (p) => p.id === prodId || (p.sku && p.sku.toUpperCase() === cartItem.product.sku?.toUpperCase())
        );

        if (live) {
          const isPriceChanged = cartItem.unitPrice !== live.agencyPrice || cartItem.listPrice !== live.agencyPrice;
          const isStockChanged = cartItem.availableStock !== live.availableStock;
          const isQtyExceeded = cartItem.quantity > live.availableStock;

          if (isPriceChanged || isStockChanged || isQtyExceeded) {
            hasChanges = true;
            nextCart[prodId] = {
              ...cartItem,
              unitPrice: live.agencyPrice,
              listPrice: live.agencyPrice,
              availableStock: live.availableStock,
              quantity: live.availableStock <= 0 ? 0 : Math.min(cartItem.quantity, live.availableStock),
              product: live,
            };
          }
        }
      }

      for (const [prodId, cartItem] of Object.entries(nextCart)) {
        if (cartItem.quantity <= 0) {
          hasChanges = true;
          delete nextCart[prodId];
        }
      }

      return hasChanges ? nextCart : prevCart;
    });
  }, [availableCatalog]);

  // ──────────────────────────────────────────────────────────────────────────
  // TÍNH MỨC CHIẾT KHẤU ĐỒNG BỘ THEO CHÍNH SÁCH SẢN LƯỢNG HỆ THỐNG (SN-28 / SN-49)
  // - Giá niêm yết của đơn hàng luôn lấy từ đúng bảng giá của cấp đại lý đó (agencyPrice)
  // - Nếu sản phẩm đạt nấc chiết khấu sản lượng của hệ thống, giảm tiếp trên đơn giá đại lý
  // - SINGLE SOURCE OF TRUTH: Chống âm tiền, phân biệt rõ ràng FIXED_AMOUNT (VNĐ) và PERCENTAGE (%)
  // ──────────────────────────────────────────────────────────────────────────
  const getItemEffectiveDiscount = useCallback((item: CartItem) => {
    const baseQuantity = Math.max(1, Math.round(item.quantity * (item.conversionRate || 1)));
    const prodSku = item.product.sku || (item.product as unknown as { sku?: string }).sku || '';
    const prodId = item.product.id || '';
    const catId = item.product.categoryId || item.product.category || '';
    const prodName = item.product.name || '';

    // Giá niêm yết của đại lý: lấy từ đúng giá bảng giá của cấp đại lý đó (agencyPrice)
    const basePrice = Math.max(
      0,
      Math.round(
        (item.product as unknown as { agencyPrice?: number })?.agencyPrice ||
          item.unitPrice ||
          item.listPrice ||
          item.product.price ||
          0
      )
    );

    const policyInfo = getApplicablePolicyInfo(
      discountPolicies,
      prodId,
      catId,
      baseQuantity,
      prodSku || prodId,
      prodName,
      basePrice
    );

    const isFixed = policyInfo.discountType === 'FIXED_AMOUNT';
    const effectiveDiscountPercent = policyInfo.policy
      ? policyInfo.discountPercent
      : 0;

    // Chiết khấu tiền mặt trên 1 đơn vị: Không bao giờ lớn hơn Giá gốc của sản phẩm
    const discountAmountPerUnit = policyInfo.policy
      ? Math.min(basePrice, Math.max(0, policyInfo.discountAmountPerUnit))
      : 0;

    // Giá sau CK = Math.max(0, Giá gốc - Giá trị CK) -> Tuyệt đối không âm
    const effectiveUnitPrice = Math.max(0, basePrice - discountAmountPerUnit);

    const itemSubtotal = item.quantity * basePrice;
    const itemGrandTotal = Math.max(0, item.quantity * effectiveUnitPrice);
    const itemDiscountTotal = Math.max(0, itemSubtotal - itemGrandTotal);
    const displayText = policyInfo.displayText || (isFixed ? `Giảm ${policyInfo.discountRawValue.toLocaleString('vi-VN')} đ` : `Giảm ${effectiveDiscountPercent}%`);

    return {
      policyInfo,
      basePrice,
      effectiveDiscountPercent,
      effectiveUnitPrice,
      itemSubtotal,
      itemGrandTotal,
      itemDiscountTotal,
      discountAmountPerUnit,
      displayText,
      isFixed,
    };
  }, [discountPolicies]);

  // ──────────────────────────────────────────────────────────────────────────
  // TỔNG TIỀN GIỎ HÀNG & CÔNG NỢ DỰ KIẾN (SN-41 & SN-49)
  // ──────────────────────────────────────────────────────────────────────────
  const cartTotals = useMemo(() => {
    let totalItems = 0;
    let totalQuantity = 0;
    let grandTotal = 0;
    let listSubtotal = 0;
    let totalDiscount = 0;

    for (const item of Object.values(cart)) {
      totalItems += 1;
      totalQuantity += item.quantity;
      const calc = getItemEffectiveDiscount(item);
      listSubtotal += calc.itemSubtotal;
      grandTotal += calc.itemGrandTotal;
      totalDiscount += calc.itemDiscountTotal;
    }

    const avgDiscountPercent = listSubtotal > 0
      ? Math.round((totalDiscount / listSubtotal) * 100)
      : 0;

    const creditLimit =
      debtStatus?.creditLimit ??
      (typeof currentCustomer?.creditLimit === 'number' ? currentCustomer.creditLimit : 50000000);
    const currentDebt =
      debtStatus?.currentDebt ??
      (typeof currentCustomer?.currentDebt === 'number' ? currentCustomer.currentDebt : 0);
    const availableCredit = Math.max(0, creditLimit - currentDebt);
    const projectedDebt = currentDebt + grandTotal;

    const isExceeded = creditLimit > 0 && projectedDebt > creditLimit;
    const exceededAmount = isExceeded ? projectedDebt - creditLimit : 0;

    return {
      totalItems,
      totalQuantity,
      listSubtotal,
      totalDiscount,
      avgDiscountPercent,
      grandTotal,
      creditLimit,
      currentDebt,
      availableCredit,
      projectedDebt,
      isExceeded,
      exceededAmount,
    };
  }, [cart, debtStatus, currentCustomer, discountPolicies]);

  // ──────────────────────────────────────────────────────────────────────────
  // THAO TÁC GIỎ HÀNG (KIỂM SOÁT TỒN KHẢ DỤNG SN-42)
  // ──────────────────────────────────────────────────────────────────────────
  const handleAddToCart = (product: Product & { agencyPrice: number; availableStock: number; retailPrice: number }) => {
    if (product.availableStock <= 0) {
      showToast('error', `Sản phẩm ${product.name} đã hết hàng trong kho. Không thể thêm vào đơn!`);
      return;
    }

    if (cart[product.id]) {
      showToast('info', `Sản phẩm "${product.name}" đã được chọn. Vui lòng vào Tạo đơn để điều chỉnh số lượng.`);
      return;
    }

    setCart((prev) => ({
      ...prev,
      [product.id]: {
        product,
        quantity: 1,
        unit: product.baseUnit || 'Cái',
        unitPrice: product.agencyPrice,
        listPrice: product.agencyPrice,
        conversionRate: 1,
        availableStock: product.availableStock,
      },
    }));

    showToast('success', `Đã chọn "${product.name}" vào giỏ hàng`);
  };

  const handleCancelSelect = (productId: string, productName?: string) => {
    handleRemoveItem(productId);
    showToast('info', `Đã hủy chọn ${productName ? `"${productName}"` : 'sản phẩm'}`);
  };

  const handleUpdateQuantity = (productId: string, qty: number, allowZero: boolean = false) => {
    const item = cart[productId];
    if (!item) return;

    if (qty <= 0) {
      if (allowZero) {
        setCart((prev) => ({
          ...prev,
          [productId]: {
            ...prev[productId],
            quantity: 0,
          },
        }));
      } else {
        setCart((prev) => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
      }
      return;
    }

    if (qty > item.availableStock) {
      showToast('warning', `Vượt quá tồn khả dụng trong kho! Tối đa: ${item.availableStock} ${item.unit}`);
      qty = item.availableStock;
    }

    setCart((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: qty,
      },
    }));
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ĐIỀU HƯỚNG BƯỚC 1 -> BƯỚC 2 (LINH HOẠT, BẤM QUA LẠI DỄ DÀNG)
  // ──────────────────────────────────────────────────────────────────────────
  const handleProceedToStep2 = () => {
    if (Object.keys(cart).length === 0) {
      showToast('warning', 'Giỏ hàng đang trống! Vui lòng chọn ít nhất 1 sản phẩm trước khi tiếp tục.');
      return;
    }
    setCartStep(2);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // GỬI ĐƠN HÀNG (POST /api/orders) (SN-49)
  // ──────────────────────────────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (!currentCustomer) {
      showToast('error', 'Không xác định được thông tin đại lý!');
      return;
    }

    if (Object.keys(cart).length === 0) {
      showToast('warning', 'Giỏ hàng đang trống. Vui lòng chọn sản phẩm.');
      return;
    }

    if (!customDeliveryAddress.trim() && !selectedDeliveryPoint?.address && !currentCustomer.address) {
      showToast('warning', 'Vui lòng quay lại Bước 1 để nhập địa chỉ giao hàng!');
      setCartStep(1);
      return;
    }

    if (!deliveryDate.trim()) {
      showToast('warning', 'Vui lòng quay lại Bước 1 để chọn ngày giao hàng mong muốn!');
      setCartStep(1);
      return;
    }

    if (currentCustomer.status === 'LOCKED') {
      showToast('error', 'Tài khoản đại lý đang bị khóa giao dịch. Không thể gửi đơn!');
      return;
    }

    for (const item of Object.values(cart)) {
      if (item.quantity > item.availableStock) {
        showToast('error', `Sản phẩm "${item.product.name}" vượt tồn kho (Tối đa: ${item.availableStock}). Vui lòng cập nhật.`);
        return;
      }
    }

    setIsSubmittingOrder(true);
    try {
      const items: PortalOrderItemPayload[] = Object.values(cart).map((item) => {
        const calc = getItemEffectiveDiscount(item);
        return {
          productId: String(item.product.id),
          quantity: Number(item.quantity),
          price: Number(calc.effectiveUnitPrice),
          discountPercent: calc.effectiveDiscountPercent,
          unit: String(item.unit),
        };
      });

      const lines: OrderLine[] = Object.values(cart).map((item) => {
        const calc = getItemEffectiveDiscount(item);
        return {
          productId: item.product.id,
          productSku: item.product.sku,
          productName: item.product.name,
          unit: item.unit,
          baseUnit: item.unit,
          conversionRate: item.conversionRate,
          quantity: item.quantity,
          baseQuantity: item.quantity,
          unitPrice: calc.effectiveUnitPrice,
          listPrice: calc.basePrice,
          discountPercent: calc.effectiveDiscountPercent,
          lineTotal: item.quantity * calc.effectiveUnitPrice,
          stockAvailable: item.availableStock,
          availableStock: item.availableStock,
        };
      });

      const assignedSalesRepId = String(currentCustomer.salesRepId || currentCustomer.salesRep?.id || 'usr-sales-002');
      const salesRepName = String(currentCustomer.salesRepName || currentCustomer.salesRep?.name || 'Trần Văn Nam');

      const warningNote = cartTotals.isExceeded
        ? `[CỔNG ĐẠI LÝ SN-49: Đơn hàng tự phục vụ vượt hạn mức công nợ. Dự kiến nợ: ${formatVND(cartTotals.projectedDebt)} / Hạn mức: ${formatVND(cartTotals.creditLimit)}. Cần duyệt hạn mức]`
        : undefined;

      const finalNote = orderNote.trim() ? (warningNote ? `${orderNote.trim()}\n${warningNote}` : orderNote.trim()) : warningNote;

      const resolvedDeliveryAddress = String(
        customDeliveryAddress.trim() ||
        selectedDeliveryPoint?.address ||
        currentCustomer.address ||
        'Địa chỉ mặc định của đại lý'
      );

      const payload: CreateOrderPayload = {
        customerId: String(currentCustomer.id),
        customerCode: String(currentCustomer.code),
        customerName: String(currentCustomer.name),
        customerGroup: String(currentCustomer.customerGroup || (currentCustomer as unknown as { group?: string }).group || 'AGENT_LEVEL_1'),
        salesRepId: assignedSalesRepId,
        salesRepName,
        assignedSalesRepId,
        createdSource: 'AGENCY_PORTAL',
        status: 'PENDING',
        deliveryAddress: resolvedDeliveryAddress,
        deliveryDate: String(deliveryDate),
        items,
        lines,
        deliveryPoint: selectedDeliveryPoint
          ? {
              id: selectedDeliveryPoint.id,
              name: selectedDeliveryPoint.name,
              address: resolvedDeliveryAddress,
              receiverName: selectedDeliveryPoint.receiverName,
              phone: selectedDeliveryPoint.phone,
            }
          : {
              name: 'Điểm giao hàng',
              address: resolvedDeliveryAddress,
              receiverName: currentCustomer.name,
              phone: currentCustomer.phone,
            },
        note: finalNote,
        priceListId: effectivePriceList?.id,
        isCreditLimitExceeded: cartTotals.isExceeded,
        creditLimitExceededAmount: cartTotals.exceededAmount,
      };

      const created = await ordersService.createOrder(payload);

      showToast('success', `Gửi đơn hàng thành công! Mã đơn: ${created.orderCode || created.id}`);
      setSubmittedOrder(created);
      setCart({});
      setIsCartDrawerOpen(false);
      setCartStep(1);

      void fetchCustomerDebt(currentCustomer.id);
      void loadCatalogAndPricing(true);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi đơn hàng. Vui lòng thử lại!');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const groupBadge = getGroupBadgeMeta(currentCustomer?.customerGroup || (currentCustomer as unknown as { group?: string })?.group);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-28 sm:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        
        {/* ===================================================================== */}
        {/* 1. THẺ THÔNG TIN HẠN MỨC & CÔNG NỢ ĐẠI LÝ REAL-TIME                  */}
        {/* ===================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Card 1: Hạn mức tín dụng */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/60 transition-all hover:bg-slate-50">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Hạn mức tín dụng cấp
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                  {currentCustomer?.maxDebtDays ? `Hạn ${currentCustomer.maxDebtDays} ngày` : '30 ngày'}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {formatVND(cartTotals.creditLimit)}
              </div>
            </div>

            {/* Card 2: Dư nợ hiện tại */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/60 transition-all hover:bg-slate-50">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  Dư nợ hiện tại
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {cartTotals.creditLimit > 0
                    ? `Đã dùng ${Math.min(100, Math.round((cartTotals.currentDebt / cartTotals.creditLimit) * 100))}%`
                    : '---'}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600">
                {formatVND(cartTotals.currentDebt)}
              </div>
              {/* Progress bar */}
              <div className="mt-2.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    cartTotals.creditLimit > 0 && cartTotals.currentDebt / cartTotals.creditLimit > 0.8
                      ? 'bg-rose-500'
                      : cartTotals.creditLimit > 0 && cartTotals.currentDebt / cartTotals.creditLimit > 0.5
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      cartTotals.creditLimit > 0 ? (cartTotals.currentDebt / cartTotals.creditLimit) * 100 : 0
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Card 3: Hạn mức còn lại khả dụng */}
            <div className={`rounded-xl p-4 border transition-all ${
              cartTotals.availableCredit <= 0
                ? 'bg-rose-50/50 border-rose-200'
                : 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/60'
            }`}>
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <CreditCard className={`w-4 h-4 ${cartTotals.availableCredit <= 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                  Hạn mức còn lại khả dụng
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  cartTotals.availableCredit <= 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {cartTotals.availableCredit > 0 ? 'Khả dụng đặt hàng' : 'Hết hạn mức'}
                </span>
              </div>
              <div className={`text-xl sm:text-2xl font-bold tracking-tight ${
                cartTotals.availableCredit <= 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {formatVND(cartTotals.availableCredit)}
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 2. THANH TIÊU ĐỀ & TÌM KIẾM                                           */}
        {/* ===================================================================== */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          {/* Tiêu đề Danh mục đặt hàng */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white shadow-sm text-xs sm:text-sm font-semibold self-start select-none">
            <Package className="w-4 h-4" />
            <span>Danh mục đặt hàng</span>
          </div>

          {/* Ô tìm kiếm có gợi ý thông minh */}
          <div ref={searchContainerRef} className="relative flex-1 sm:max-w-md">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Tìm tên sản phẩm, mã SKU, nhóm hàng..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* FLOATING DROPDOWN GỢI Ý THÔNG MINH */}
              {isSearchFocused && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden max-h-[380px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  {/* Nhóm ngành hàng liên quan */}
                  {smartSuggestions.categories.length > 0 && (
                    <div className="p-3 border-b border-slate-100 bg-slate-50/60">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-indigo-600" />
                        Gợi ý nhóm ngành hàng
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {smartSuggestions.categories.slice(0, 4).map((c) => (
                          <button
                            key={c.id || c.name}
                            type="button"
                            onClick={() => {
                              setSelectedHierarchyCategory(c);
                              setSelectedCategory(c.name);
                              setIsSearchFocused(false);
                              setSearchQuery('');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700 transition-all cursor-pointer"
                          >
                            {c.name} ({c.count})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Danh sách sản phẩm gợi ý */}
                  <div className="p-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        {smartSuggestions.isTrending ? 'Sản phẩm gợi ý nổi bật' : `Sản phẩm khớp (${smartSuggestions.products.length})`}
                      </span>
                      {smartSuggestions.isTrending && (
                        <span className="text-[10px] text-slate-400 font-normal">Sẵn hàng trong kho</span>
                      )}
                    </div>

                    {smartSuggestions.products.length > 0 ? (
                      <div className="space-y-1">
                        {smartSuggestions.products.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
                            onClick={() => {
                              setSearchQuery(item.name);
                              setIsSearchFocused(false);
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-xs overflow-hidden">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 truncate">
                                  {cleanProductName(item.name)}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-slate-600">{item.sku}</span>
                                  <span>•</span>
                                  <span className="text-emerald-600 font-medium">Còn {item.availableStock} {item.baseUnit || 'cái'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <div className="text-xs font-bold text-indigo-700">
                                  {formatVND(item.agencyPrice)}
                                </div>
                                {item.retailPrice > item.agencyPrice && (
                                  <div className="text-[10px] text-slate-400 line-through">
                                    {formatVND(item.retailPrice)}
                                  </div>
                                )}
                              </div>
                              {cart[item.id] ? (
                                <div className="flex items-center gap-1">
                                  <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Đã chọn</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelSelect(item.id, item.name);
                                    }}
                                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                                    title="Hủy chọn"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(item);
                                  }}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-colors border border-indigo-100 cursor-pointer"
                                  title="Thêm vào giỏ"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Không tìm thấy sản phẩm nào khớp với "{searchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* ===================================================================== */}
        {/* 3. DANH MỤC ĐẶT HÀNG (CATALOG)                                        */}
        {/* ===================================================================== */}
        <div className="mb-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Nút bấm Mở / Thu gọn Khung nhóm hàng */}
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
                      isCategoryPickerOpen || selectedHierarchyCategory !== null
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      {!selectedHierarchyCategory
                        ? `Tất cả nhóm hàng (${products.length})`
                        : `[Cấp ${selectedHierarchyCategory.level}] ${selectedHierarchyCategory.name} (${selectedHierarchyCategory.count} SP)`}
                    </span>
                    {isCategoryPickerOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {/* Tag trạng thái khi đang lọc nhóm phân cấp cụ thể */}
                  {selectedHierarchyCategory && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          selectedHierarchyCategory.level === 1
                            ? 'bg-indigo-100 text-indigo-700'
                            : selectedHierarchyCategory.level === 2
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        Cấp {selectedHierarchyCategory.level}
                      </span>
                      <span className="truncate max-w-[220px] font-semibold">
                        {selectedHierarchyCategory.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHierarchyCategory(null);
                          setSelectedCategory('ALL');
                        }}
                        title="Xóa lọc nhóm hàng"
                        className="text-slate-400 hover:text-rose-600 ml-1 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Phía phải: Số lượng hiển thị & Nút Làm mới */}
                <div className="flex items-center gap-2.5 text-xs text-slate-500">
                  <span>
                    <strong className="text-slate-800">{availableCatalog.length}</strong> sản phẩm
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void loadCatalogAndPricing(true);
                      void loadCurrentAgencyProfile(true);
                      if (currentCustomer?.id) void fetchCustomerDebt(currentCustomer.id);
                    }}
                    disabled={isLoadingCatalog || isLoadingProfile}
                    title="Làm mới danh mục sản phẩm & hạn mức nợ"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/80 shadow-2xs disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isLoadingCatalog || isLoadingProfile ? 'animate-spin text-indigo-600' : 'text-slate-500'
                      }`}
                    />
                    <span>Làm mới</span>
                  </button>
                </div>
              </div>

              {/* KHUNG CÁC NHÓM HÀNG ĐỂ CHỌN (PHÂN CẤP CẤP 1 - CẤP 2 - CẤP 3) */}
              {isCategoryPickerOpen && (
                <div className="mt-2.5 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Header của Khung Nhóm Hàng */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        Khung Nhóm Hàng & Ngành Hàng Sản Phẩm
                      </h3>
                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                        (Phân biệt trực quan Cấp 1 - Cấp 2 - Cấp 3 • Bấm chọn để lọc sản phẩm)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCategoryPickerOpen(false)}
                      className="text-xs text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      Thu gọn
                    </button>
                  </div>

                  {/* TOOLBAR: Ô TÌM NHANH NHÓM HÀNG & CÁC TAB LỌC CẤP ĐỘ */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4">
                    {/* Ô tìm nhóm hàng nhanh */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        placeholder="Tìm nhanh ngành hàng, nhóm hàng cấp 1, 2, 3..."
                        className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                      />
                      {categorySearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCategorySearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Bộ lọc tab Cấp độ 1, 2, 3 */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      <button
                        type="button"
                        onClick={() => setCategoryLevelTab('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          categoryLevelTab === 'ALL'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả cấp ({hierarchicalCategories.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryLevelTab(1)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          categoryLevelTab === 1
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                        Cấp 1 • Ngành hàng
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryLevelTab(2)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          categoryLevelTab === 2
                            ? 'bg-sky-600 text-white shadow-2xs'
                            : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Cấp 2 • Nhóm hàng
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryLevelTab(3)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          categoryLevelTab === 3
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        Cấp 3 • Chi tiết
                      </button>
                    </div>
                  </div>

                  {/* Lưới các khung nhóm hàng */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 max-h-[380px] overflow-y-auto p-1">
                    {/* Khung: Tất cả nhóm hàng */}
                    {(categoryLevelTab === 'ALL' || !categoryLevelTab) && !categorySearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHierarchyCategory(null);
                          setSelectedCategory('ALL');
                          setIsCategoryPickerOpen(false);
                        }}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          selectedHierarchyCategory === null
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500'
                            : 'border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Package className="w-4 h-4" />
                          </div>
                          {selectedHierarchyCategory === null && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700 uppercase">
                            Toàn hệ thống
                          </span>
                          <div className="font-bold text-xs sm:text-sm text-slate-900 mt-1 line-clamp-1">
                            Tất cả nhóm hàng
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            {products.length} sản phẩm
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Danh sách các khung nhóm hàng phân cấp Cấp 1, 2, 3 */}
                    {displayedCategories.map((cat) => {
                      const isSelected =
                        selectedHierarchyCategory?.id === cat.id &&
                        selectedHierarchyCategory?.level === cat.level;

                      let badgeBg = 'bg-indigo-100 text-indigo-700 border-indigo-200';
                      let badgeText = 'Cấp 1 • Ngành';
                      let iconElem = <FolderKanban className="w-4 h-4 text-indigo-600" />;

                      if (cat.level === 2) {
                        badgeBg = 'bg-sky-100 text-sky-700 border-sky-200';
                        badgeText = 'Cấp 2 • Nhóm';
                        iconElem = <Layers className="w-4 h-4 text-sky-600" />;
                      } else if (cat.level === 3) {
                        badgeBg = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                        badgeText = 'Cấp 3 • Chi tiết';
                        iconElem = <Tag className="w-4 h-4 text-emerald-600" />;
                      }

                      return (
                        <button
                          key={`${cat.level}-${cat.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedHierarchyCategory(cat);
                            setSelectedCategory(cat.name);
                            setIsCategoryPickerOpen(false);
                          }}
                          className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/80 shadow-sm ring-1 ring-indigo-500'
                              : 'border-slate-200/80 bg-white hover:bg-slate-50/80 hover:border-indigo-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shadow-2xs">
                              {iconElem}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeBg}`}>
                                {badgeText}
                              </span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                            </div>
                          </div>

                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug" title={cat.name}>
                              {cat.name}
                            </div>
                            {cat.parentName && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5" title={cat.parentName}>
                                {cat.level === 2
                                  ? `Thuộc: ${cat.parentName}`
                                  : `Nhánh: ${cat.parentName.split('/').pop()?.trim()}`}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                              <span className="font-bold text-indigo-600">{cat.count}</span> sản phẩm
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Thông báo chính sách giá */}
            <div className="mb-4 bg-indigo-50/70 border border-indigo-100 rounded-xl px-3.5 py-2.5 flex items-center gap-2 text-xs text-indigo-900 font-medium">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Bảng giá đại lý tháng 11/2026</span>
            </div>

            {/* Loading (chỉ hiện khi chưa có sản phẩm nào) */}
            {isLoadingCatalog && products.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">Đang tải danh mục sản phẩm & chính sách giá đại lý...</p>
              </div>
            )}

            {/* Error */}
            {!isLoadingCatalog && catalogError && (
              <div className="bg-rose-50 rounded-2xl p-6 text-center border border-rose-200 text-rose-800">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                <p className="text-sm font-semibold">{catalogError}</p>
              </div>
            )}

            {/* Empty */}
            {!isLoadingCatalog && !catalogError && availableCatalog.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 mb-1">Không tìm thấy sản phẩm phù hợp</h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  {searchQuery ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.' : 'Chưa có sản phẩm nào được cấu hình giá cho nhóm đại lý này.'}
                </p>
              </div>
            )}

            {/* GRID SẢN PHẨM 2 CỘT MOBILE-FIRST */}
            {!isLoadingCatalog && !catalogError && availableCatalog.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {availableCatalog.map((product) => {
                  const inCart = cart[product.id];
                  const isOutOfStock = product.availableStock <= 0;

                  return (
                    <div
                      key={product.id}
                      className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-sm hover:shadow-md ${
                        isOutOfStock ? 'border-slate-200 bg-slate-50/40 opacity-75' : 'border-slate-200/80 hover:border-indigo-300'
                      }`}
                    >
                      {/* Ảnh & Badges */}
                      <div className="relative p-3 bg-white border-b border-slate-100 flex items-center justify-center min-h-[140px] sm:min-h-[160px] overflow-hidden group-hover:bg-slate-50/50 transition-colors">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full max-h-[125px] sm:max-h-[145px] object-contain p-1 group-hover:scale-105 transition-transform duration-300 rounded-xl"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.img-box-fallback');
                              if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                            }}
                          />
                        ) : null}

                        <div
                          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 text-indigo-700 items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200 img-box-fallback ${
                            product.imageUrl ? 'hidden' : 'flex'
                          }`}
                        >
                          <Package className="w-9 h-9 sm:w-11 sm:h-11 text-indigo-600" />
                        </div>

                        {product.discountPct > 0 && (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500 text-white shadow-sm">
                            -{product.discountPct}%
                          </span>
                        )}

                        <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-sm">
                              Hết hàng (Tồn: 0)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                              Kho còn: {product.availableStock} {product.baseUnit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Thông tin */}
                      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between">
                        <div>
                          <div className="text-[10px] font-mono text-slate-400 mb-0.5 uppercase tracking-wide">
                            {product.sku}
                          </div>
                          <h3
                            className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2 leading-snug mb-2 group-hover:text-indigo-600 transition-colors"
                            title={product.name}
                          >
                            {cleanProductName(product.name)}
                          </h3>
                        </div>

                        <div>
                          <div className="mb-3">
                            <div className="text-sm sm:text-base font-bold text-indigo-600 tracking-tight">
                              {formatVND(product.agencyPrice)}
                              <span className="text-[11px] font-normal text-slate-500">/{product.baseUnit || 'sản phẩm'}</span>
                            </div>
                            {product.retailPrice > product.agencyPrice && (
                              <div className="text-[11px] text-slate-400 line-through">
                                {formatVND(product.retailPrice)}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            {inCart && inCart.quantity > 0 ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs select-none"
                                >
                                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                                  <span className="tracking-wide">Đã chọn</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCancelSelect(product.id, product.name)}
                                  className="py-2 px-3 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer shrink-0"
                                  title="Hủy chọn sản phẩm này khỏi giỏ"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Hủy</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddToCart(product)}
                                disabled={isOutOfStock}
                                className={`w-full py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  isOutOfStock
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 active:scale-[0.98]'
                                }`}
                              >
                                {!isOutOfStock && <Plus className="w-4 h-4" />}
                                <span>{isOutOfStock ? 'Hết hàng' : 'Thêm giỏ'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

      {/* ===================================================================== */}
      {/* 5. BOTTOM STICKY BAR - GIỎ HÀNG (MOBILE-FIRST)                         */}
      {/* ===================================================================== */}
      {cartTotals.totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-xl px-4 py-3 pb-safe transition-all animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">
                  {cartTotals.totalQuantity}
                </span>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">
                  {cartTotals.totalItems} mặt hàng ({cartTotals.totalQuantity} sản phẩm)
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {formatVND(cartTotals.grandTotal)}
                </div>
                {cartTotals.isExceeded && (
                  <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Vượt hạn mức (+{formatVND(cartTotals.exceededAmount)})
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/portal/orders/confirm')}
              className="py-2.5 px-5 sm:px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <span>Xem giỏ hàng</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. DRAWER / BOTTOM SHEET XÁC NHẬN GIỎ HÀNG (2 BƯỚC ĐỒNG BỘ NVKD) */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4">
          <div
            className="w-full sm:max-w-2xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Đặt hàng Đại lý (2 Bước)</h2>
                  <p className="text-xs text-slate-500">
                    {cartStep === 1 ? 'Bước 1: Thông tin giao hàng & Công nợ' : 'Bước 2: Bảng số lượng & Chiết khấu'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Tabs */}
            <div className="grid grid-cols-2 border-b border-slate-200/80 bg-slate-100/60 p-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCartStep(1)}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  cartStep === 1
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${cartStep === 1 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  1
                </span>
                <span>Giao hàng & Công nợ</span>
              </button>
              <button
                type="button"
                onClick={() => setCartStep(2)}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  cartStep === 2
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${cartStep === 2 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  2
                </span>
                <span>Số lượng & Chiết khấu ({cartTotals.totalItems})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 max-h-[calc(92vh-230px)]">
              {/* ==================== BƯỚC 1: GIAO HÀNG & CÔNG NỢ ==================== */}
              {cartStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Card Đại lý đăng nhập */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">{currentCustomer?.name}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                        {groupBadge.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-indigo-100/60">
                      <div>Mã đại lý: <strong className="text-slate-800 font-mono">{currentCustomer?.code}</strong></div>
                      <div>Số điện thoại: <strong className="text-slate-800">{currentCustomer?.phone || 'Chưa cập nhật'}</strong></div>
                      <div className="sm:col-span-2 text-indigo-700">
                        Bảng giá áp dụng: <strong>{effectivePriceList?.name || 'Theo nhóm đại lý'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Thẻ Kiểm soát Hạn mức khả dụng */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">Kiểm Soát Hạn Mức Khả Dụng</h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        cartTotals.isExceeded
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {cartTotals.isExceeded ? 'Cần duyệt công nợ' : 'Hạn mức an toàn'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] text-slate-500 font-medium">Hạn mức được cấp</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                          {formatVND(cartTotals.creditLimit)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] text-slate-500 font-medium">Công nợ hiện tại</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                          {formatVND(cartTotals.currentDebt)}
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${
                        cartTotals.availableCredit < cartTotals.creditLimit * 0.2
                          ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                          : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                      }`}>
                        <div className="text-[11px] font-medium text-slate-600">Hạn mức khả dụng</div>
                        <div className="text-xs sm:text-sm font-bold mt-0.5">
                          {formatVND(cartTotals.availableCredit)}
                        </div>
                      </div>
                    </div>

                    {cartTotals.creditLimit > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                          <span>Tỷ lệ sử dụng hạn mức</span>
                          <span className="font-semibold text-slate-700">
                            {Math.round((cartTotals.currentDebt / cartTotals.creditLimit) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              cartTotals.currentDebt >= cartTotals.creditLimit ? 'bg-rose-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.round((cartTotals.currentDebt / cartTotals.creditLimit) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3 Ô INPUT ĐƯỢC MỞ TRẠNG THÁI EDITABLE HOÀN TOÀN (CONTROLLED COMPONENT) */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      Thông tin giao hàng & Ghi chú đơn hàng
                    </div>

                    {/* Ô 1: Địa chỉ giao hàng */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="portal-delivery-address" className="text-xs font-semibold text-slate-700">
                          Địa chỉ giao hàng: <span className="text-rose-500">*</span>
                        </label>
                        {currentCustomer?.deliveryPoints && currentCustomer.deliveryPoints.length > 0 && (
                          <span className="text-[11px] text-indigo-600">
                            {currentCustomer.deliveryPoints.length} điểm đã lưu
                          </span>
                        )}
                      </div>

                      {currentCustomer?.deliveryPoints && currentCustomer.deliveryPoints.length > 0 && (
                        <select
                          value={selectedDeliveryPoint?.id || ''}
                          onChange={(e) => {
                            const found = currentCustomer.deliveryPoints?.find((dp) => dp.id === e.target.value);
                            if (found) {
                              setSelectedDeliveryPoint(found);
                              setCustomDeliveryAddress(found.address);
                            }
                          }}
                          className="w-full text-xs rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-1"
                        >
                          {currentCustomer.deliveryPoints.map((dp) => (
                            <option key={dp.id} value={dp.id}>
                              {dp.name} — {dp.address}
                            </option>
                          ))}
                        </select>
                      )}

                      <input
                        id="portal-delivery-address"
                        type="text"
                        value={customDeliveryAddress}
                        onChange={(e) => setCustomDeliveryAddress(e.target.value)}
                        placeholder="Nhập địa chỉ nhận hàng chi tiết..."
                        className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    {/* Ô 2 & Ô 3: Ngày giao hàng & Ghi chú */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label htmlFor="portal-delivery-date" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Ngày giao hàng mong muốn: <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="portal-delivery-date"
                          type="date"
                          value={deliveryDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="portal-order-note" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          Ghi chú đơn hàng:
                        </label>
                        <input
                          id="portal-order-note"
                          type="text"
                          value={orderNote}
                          onChange={(e) => setOrderNote(e.target.value)}
                          placeholder="Giao giờ hành chính, gọi trước khi giao..."
                          className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== BƯỚC 2: SỐ LƯỢNG & CHIẾT KHẤU ==================== */}
              {cartStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Bảng sản phẩm giỏ hàng:</span>
                    <span className="font-semibold text-indigo-600">{cartTotals.totalItems} sản phẩm ({cartTotals.totalQuantity} món)</span>
                  </div>

                  {/* Bảng giỏ hàng là NƠI DUY NHẤT cho phép nhập/chỉnh số lượng */}
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                    {Object.values(cart).length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Giỏ hàng đang trống. Vui lòng quay lại chọn sản phẩm.
                      </div>
                    ) : (
                      Object.values(cart).map((item) => {
                        const calc = getItemEffectiveDiscount(item);
                        const { policyInfo, basePrice, effectiveDiscountPercent, effectiveUnitPrice } = calc;

                        return (
                          <div key={item.product.id} className="py-3 px-2 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-400 uppercase">{item.product.sku}</span>
                                {calc.isFixed ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    -{formatVND(calc.discountAmountPerUnit)}
                                  </span>
                                ) : effectiveDiscountPercent > 0 ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    -{effectiveDiscountPercent}%
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                    0% CK
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap" title={item.product.name}>
                                <span>{cleanProductName(item.product.name)}</span>
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                  ({item.unit})
                                </span>
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-indigo-600 font-bold font-mono">
                                  {formatVND(effectiveUnitPrice)}
                                  <span className="text-[11px] font-normal text-slate-500">/{item.unit}</span>
                                </span>
                                {basePrice > effectiveUnitPrice && (
                                  <span className="text-[10px] text-slate-400 line-through font-mono">
                                    {formatVND(basePrice)}
                                  </span>
                                )}
                                {calc.isFixed ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    -{formatVND(calc.discountAmountPerUnit)}
                                  </span>
                                ) : effectiveDiscountPercent > 0 ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    -{effectiveDiscountPercent}%
                                  </span>
                                ) : null}
                              </div>
                              {/* Gợi ý nấc chiết khấu tiếp theo nếu có */}
                              {policyInfo.policy && (
                                <div className="mt-1 text-[10.5px] text-indigo-700 bg-indigo-50/80 border border-indigo-100 rounded-lg p-1.5 space-y-0.5">
                                  <div className="font-semibold text-indigo-900 flex items-center gap-1">
                                    <Tag className="w-3 h-3 text-indigo-600 shrink-0" />
                                    {policyInfo.policy.name} ({policyInfo.policy.code})
                                  </div>
                                  {policyInfo.currentTier ? (
                                    <div className="text-emerald-700 font-medium">
                                      ✓ Đang đạt nấc {policyInfo.currentTier.minQuantity} - {policyInfo.currentTier.maxQuantity || '∞'} {item.unit}: <strong className="underline font-bold">{calc.displayText}</strong>
                                    </div>
                                  ) : (
                                    <div className="text-slate-500 font-medium">
                                      Chưa đạt nấc chiết khấu (Đang chọn: {item.quantity} {item.unit})
                                    </div>
                                  )}
                                  {policyInfo.nextTier && (
                                    <div className="text-slate-600 font-medium flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                                      <span>Mua thêm <strong>+{policyInfo.quantityNeededForNext} {item.unit}</strong> để nâng lên nấc <strong>{policyInfo.nextTier.minQuantity}+</strong> ({policyInfo.discountType === 'FIXED_AMOUNT' ? `Giảm ${Number(policyInfo.nextTier.discountValue).toLocaleString('vi-VN')} đ` : `Giảm ${policyInfo.nextTier.discountValue}%`})!</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                                Kho còn: {item.availableStock} {item.unit}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Ô input điều chỉnh số lượng trực tiếp bằng bàn phím */}
                              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.quantity <= 1) {
                                      handleRemoveItem(item.product.id);
                                    } else {
                                      handleUpdateQuantity(item.product.id, item.quantity - 1);
                                    }
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
                                  title="Giảm 1"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={item.quantity}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => {
                                    if (item.quantity === 0 && /^[1-9]$/.test(e.key)) {
                                      e.preventDefault();
                                      const num = Math.min(parseInt(e.key, 10), item.availableStock);
                                      handleUpdateQuantity(item.product.id, num, true);
                                    }
                                  }}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val === '' || val === '0') {
                                      handleUpdateQuantity(item.product.id, 0, true);
                                      return;
                                    }
                                    const num = parseInt(val, 10);
                                    const capped = Math.min(num, item.availableStock);
                                    handleUpdateQuantity(item.product.id, capped, true);
                                  }}
                                  onBlur={() => {
                                    if (item.quantity <= 0) {
                                      handleRemoveItem(item.product.id);
                                    }
                                  }}
                                  className="w-12 text-center text-xs font-bold text-slate-900 focus:outline-none font-mono"
                                  title="Gõ số lượng trực tiếp"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.availableStock}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title="Tăng 1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Đơn vị tính sau cụm điều chỉnh số lượng */}
                              <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-xl shrink-0">
                                {item.unit}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.product.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Xóa khỏi giỏ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* BẢNG KÊ CHI TIẾT CHIẾT KHẤU TỪNG MẶT HÀNG TRONG ĐƠN HÀNG */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] text-slate-500 font-semibold bg-slate-50/70">
                          <th className="py-2.5 px-3 text-left">Tên sản phẩm</th>
                          <th className="py-2.5 px-2 text-right">Giá bán</th>
                          <th className="py-2.5 px-2 text-center">Chiết khấu</th>
                          <th className="py-2.5 px-2 text-right">Giá sau chiết khấu</th>
                          <th className="py-2.5 px-2 text-center">Số lượng</th>
                          <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.values(cart).map((item) => {
                          const calc = getItemEffectiveDiscount(item);
                          const { basePrice, effectiveDiscountPercent, effectiveUnitPrice } = calc;
                          const lineTotal = effectiveUnitPrice * item.quantity;

                          return (
                            <tr key={`discount-table-${item.product.id}`} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="py-2.5 px-3 text-left">
                                <div className="font-semibold text-slate-800 line-clamp-1" title={item.product.name}>
                                  {item.product.name}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono text-slate-500">
                                {basePrice > effectiveUnitPrice ? (
                                  <span className="line-through text-slate-400">{formatVND(basePrice)}</span>
                                ) : (
                                  <span>{formatVND(basePrice)}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold">
                                {calc.isFixed ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                    -{formatVND(calc.discountAmountPerUnit)}
                                  </span>
                                ) : effectiveDiscountPercent > 0 ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                    -{effectiveDiscountPercent}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px] font-medium">0%</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono font-bold text-indigo-600">
                                {formatVND(effectiveUnitPrice)}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {formatVND(lineTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {Object.values(cart).length > 1 && (
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold">
                          <tr>
                            <td colSpan={5} className="py-2.5 px-3 text-left text-slate-800 text-xs sm:text-sm font-bold">
                              Tổng
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 text-xs sm:text-sm">
                              {formatVND(cartTotals.grandTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Tổng kết & Cảnh báo công nợ */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Tổng tiền hàng niêm yết (gốc):</span>
                      <span className="font-mono text-slate-500 line-through">{formatVND(cartTotals.listSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Chiết khấu theo chính sách:</span>
                      <span className="font-bold font-mono">-{formatVND(cartTotals.totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-800 pt-1 border-t border-slate-100 font-bold">
                      <span>Tổng thanh toán:</span>
                      <span className="font-bold text-indigo-600 font-mono text-sm">{formatVND(cartTotals.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                      <span>Hạn mức tín dụng khả dụng:</span>
                      <span className="font-semibold text-slate-900 font-mono">{formatVND(cartTotals.availableCredit)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-800">Dự kiến công nợ sau đơn:</span>
                      <span className={cartTotals.isExceeded ? 'text-rose-600 font-extrabold font-mono' : 'text-slate-900 font-mono'}>
                        {formatVND(cartTotals.projectedDebt)}
                      </span>
                    </div>

                    {cartTotals.isExceeded && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold block mb-0.5 text-amber-800">
                            Cảnh báo: Đơn hàng vượt hạn mức công nợ (+{formatVND(cartTotals.exceededAmount)})
                          </strong>
                          Hệ thống vẫn cho phép bạn gửi đơn hàng này, tuy nhiên đơn sẽ ở trạng thái <strong className="underline">Chờ phê duyệt</strong> và cần Kế toán / Quản lý kinh doanh duyệt trước khi xuất kho.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer điều hướng theo Bước */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
              {cartStep === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsCartDrawerOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Tiếp tục mua hàng
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    disabled={Object.keys(cart).length === 0}
                    className="flex-1 py-3 px-5 rounded-xl text-white text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Tiếp tục: Bảng giỏ hàng & Chiết khấu</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCartStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Quay lại giao hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmitOrder()}
                    disabled={isSubmittingOrder || cartTotals.totalItems === 0}
                    className={`flex-1 py-3 px-5 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                      cartTotals.isExceeded
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isSubmittingOrder ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang gửi đơn hàng...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{cartTotals.isExceeded ? 'Gửi Đơn Chờ Duyệt Hạn Mức' : 'Xác Nhận Gửi Đơn Hàng'}</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. MODAL CHÚC MỪNG GỬI ĐƠN THÀNH CÔNG                                 */}
      {/* ===================================================================== */}
      {submittedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
              Đã Gửi Đơn Hàng Thành Công!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-4">
              Đơn hàng của bạn đã được ghi nhận trên hệ thống và chuyển đến nhân viên kinh doanh phụ trách xác nhận.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-left space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn hàng:</span>
                <span className="font-bold font-mono text-indigo-600 text-sm">{submittedOrder.orderCode || submittedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái:</span>
                <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                  submittedOrder.status === 'PENDING_APPROVAL'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {submittedOrder.status === 'PENDING_APPROVAL' ? 'Cần duyệt hạn mức' : 'Chờ duyệt'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng tiền:</span>
                <span className="font-bold text-slate-900">{formatVND(submittedOrder.grandTotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NVKD hỗ trợ:</span>
                <span className="font-medium text-slate-800">{submittedOrder.salesRepName || 'Trần Văn Nam'}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubmittedOrder(null);
                  navigate('/portal/tracking');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Xem đơn hàng của tôi
              </button>
              <button
                type="button"
                onClick={() => setSubmittedOrder(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Tiếp tục mua hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. MODAL CHI TIẾT ĐƠN HÀNG (VIEWING ORDER DETAILS)                     */}
      {/* ===================================================================== */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Chi tiết đơn #{viewingOrder.orderCode || viewingOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 text-xs">
              {/* Thông tin chung */}
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="font-bold text-indigo-600">{viewingOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày giao dự kiến:</span>
                  <span className="font-medium text-slate-800">{viewingOrder.deliveryDate || 'Tiêu chuẩn'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nơi nhận hàng:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[220px]">
                    {viewingOrder.deliveryPoint?.name || viewingOrder.deliveryPoint?.address || 'Kho mặc định'}
                  </span>
                </div>
              </div>

              {/* Danh sách mặt hàng */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Danh sách mặt hàng đã đặt:</h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {(viewingOrder.lines || []).map((l, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 bg-white">
                      <div>
                        <div className="text-[10px] font-mono text-slate-400">{l.productSku}</div>
                        <div className="font-semibold text-slate-900">{l.productName}</div>
                        <div className="text-slate-500">
                          {l.quantity} {l.unit} × {formatVND(l.unitPrice)}
                        </div>
                      </div>
                      <div className="font-bold text-indigo-600 font-mono">
                        {formatVND(l.lineTotal || l.quantity * l.unitPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tổng tiền */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-900">Tổng tiền thanh toán:</span>
                <span className="text-indigo-600 font-mono text-base">{formatVND(viewingOrder.grandTotal || 0)}</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 9. MODAL XÁC NHẬN HỦY ĐƠN (CONFIRM CANCEL ORDER)                      */}
      {/* ===================================================================== */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Xác nhận hủy đơn hàng?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Bạn có chắc chắn muốn hủy đơn hàng <strong className="text-slate-800 font-mono">{cancellingOrder.orderCode || cancellingOrder.id}</strong> không? Số lượng sản phẩm sẽ được hoàn trả lại tồn kho.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Giữ đơn
              </button>
              <button
                type="button"
                onClick={() => void handleCancelOrder()}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
