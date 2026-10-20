import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  MapPin,
  Calendar,
  FileText,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Check,
  Package,
  Loader2,
  ChevronDown,
  Search,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { ordersService } from '../services/orders.service';
import { orderPricingService } from '../services/order-pricing.service';
import { priceListsService } from '../services/price-lists.service';
import { discountPoliciesService, getApplicablePolicyInfo, type DiscountPolicy } from '../services/discount-policies.service';
import { customerService } from '../services/customer.service';
import { warehouseService } from '../services/warehouse.service';
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

/** Loại bỏ hậu tố đơn vị trong ngoặc (Lon, Chai, Hộp...) để tránh lặp */
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
export interface CartItem {
  product: Product;
  quantity: number;
  unit: string;
  unitPrice: number;
  listPrice: number;
  conversionRate: number;
  availableStock: number;
}

export const PortalOrderConfirmPage: React.FC = () => {
  const navigate = useNavigate();

  // 1. Tải giỏ hàng từ sessionStorage (đồng bộ từ trang Cổng đặt hàng)
  const [cart, setCart] = useState<Record<string, CartItem>>(() => {
    try {
      const raw = sessionStorage.getItem('loha_portal_cart');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  // Tự động lưu giỏ hàng khi có thay đổi
  useEffect(() => {
    try {
      sessionStorage.setItem('loha_portal_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('loha_portal_cart_updated'));
    } catch {}
  }, [cart]);

  // 2. Thông tin Đại lý đang đăng nhập
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => {
    const list = customerService.getStoredCustomers();
    const user = tokenStorage.getUser() || getStoredUser();
    const matched = list.find(
      (c) =>
        c.id === user?.id ||
        (user?.customerId && (c.id === user.customerId || c.code === user.customerId)) ||
        (user?.customerCode && (c.code === user.customerCode || c.id === user.customerCode)) ||
        (user?.agencyId && (c.id === user.agencyId || c.code === user.agencyId)) ||
        (user?.email && c.email && user.email.toLowerCase() === c.email.toLowerCase()) ||
        (user?.username && c.code && c.code.toLowerCase() === user.username.toLowerCase()) ||
        (user?.email && c.phone && user.email.includes(c.phone))
    );
    return matched || list.find((c) => c.id === 'cust-dl-0002') || list[0] || null;
  });

  const groupBadge = getGroupBadgeMeta(currentCustomer?.customerGroup || (currentCustomer as unknown as { group?: string })?.group);

  // 2.1 Kho phục vụ mặc định của Đại lý (SN: 1 Kho - N Đại lý)
  const [servingWarehouse, setServingWarehouse] = useState<{ warehouseId: string; warehouseName: string; warehouseCode: string } | null>(null);

  useEffect(() => {
    if (!currentCustomer?.id) return;
    warehouseService.getAgencyDefault(currentCustomer.id).then((wh) => {
      if (wh) setServingWarehouse(wh);
    }).catch(() => {});
  }, [currentCustomer?.id]);

  // 3. Chính sách chiết khấu & Bảng giá
  const [discountPolicies, setDiscountPolicies] = useState<DiscountPolicy[]>([]);
  const [effectivePriceList, setEffectivePriceList] = useState<PriceList | null>(null);

  useEffect(() => {
    void discountPoliciesService.getPolicies().then((list) => {
      if (list && list.length > 0) setDiscountPolicies(list);
    }).catch(() => {});

    // Đồng bộ thông tin đại lý mới nhất từ API
    void customerService.getPortalProfile().then((profile) => {
      if (profile?.id) setCurrentCustomer(profile);
    }).catch(() => {});
  }, []);

  // Tải đúng bảng giá hiệu lực cho nhóm của đại lý hiện tại (Khắc phục triệt để lỗi gán nhầm bảng giá)
  useEffect(() => {
    if (!currentCustomer) return;
    const group = (currentCustomer.customerGroup || (currentCustomer as unknown as { group?: string })?.group || 'AGENT_LEVEL_1') as CustomerGroupType;

    orderPricingService
      .getEffectivePriceList(group)
      .then((pl) => {
        if (pl) setEffectivePriceList(pl);
      })
      .catch(async () => {
        try {
          const res = await priceListsService.getPriceLists({ customerGroup: group, status: 'ACTIVE' });
          const allLists = res.data || [];
          const matched =
            allLists.find((item) => item.customerGroup === group && item.status === 'ACTIVE') ||
            allLists.find((item) => item.customerGroup === group) ||
            allLists[0];
          if (matched) setEffectivePriceList(matched);
        } catch {}
      });
  }, [currentCustomer]);

  // 3.1 Tải danh mục sản phẩm phục vụ thêm nhanh trực tiếp tại trang theo kho của đại lý
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isAddProductDropdownOpen, setIsAddProductDropdownOpen] = useState<boolean>(false);
  const [productSearchTerm, setProductSearchTerm] = useState<string>('');
  const addProductDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void ordersService.searchProducts('', 100, currentCustomer?.id).then((prods) => {
      if (prods && prods.length > 0) setAvailableProducts(prods);
    }).catch(() => {});
  }, [currentCustomer?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addProductDropdownRef.current && !addProductDropdownRef.current.contains(e.target as Node)) {
        setIsAddProductDropdownOpen(false);
      }
    };
    if (isAddProductDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAddProductDropdownOpen]);

  // 4. Công nợ thời gian thực
  const [debtStatus, setDebtStatus] = useState<CustomerDebtStatus | null>(null);

  useEffect(() => {
    if (!currentCustomer?.id) return;
    ordersService.getDebtStatus(currentCustomer.id).then((debt) => {
      if (debt) setDebtStatus(debt);
    }).catch(() => {
      const cLimit = typeof currentCustomer.creditLimit === 'number' ? currentCustomer.creditLimit : 50000000;
      const cDebt = typeof currentCustomer.currentDebt === 'number' ? currentCustomer.currentDebt : 0;
      setDebtStatus({
        customerId: currentCustomer.id,
        customerCode: currentCustomer.code,
        customerName: currentCustomer.name,
        creditLimit: cLimit,
        currentDebt: cDebt,
        availableLimit: Math.max(0, cLimit - cDebt),
        maxDebtDays: typeof currentCustomer.maxDebtDays === 'number' ? currentCustomer.maxDebtDays : 30,
        overdueAmount: 0,
        overdueDays: 0,
        canCreateOrder: true,
      });
    });
  }, [currentCustomer]);

  useEffect(() => {
    const handleDebtUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!currentCustomer?.id) return;
      if (
        !detail ||
        detail.customerId === currentCustomer.id ||
        detail.customerCode === currentCustomer.code ||
        (detail.customerId && currentCustomer.code && String(detail.customerId).toLowerCase() === currentCustomer.code.toLowerCase())
      ) {
        ordersService.getDebtStatus(currentCustomer.id).then((debt) => {
          if (debt) setDebtStatus(debt);
        }).catch(() => {});
      }
    };
    window.addEventListener('loha_debt_updated', handleDebtUpdate);
    return () => {
      window.removeEventListener('loha_debt_updated', handleDebtUpdate);
    };
  }, [currentCustomer]);

  // 5. Thông tin giao hàng & Ghi chú
  const [selectedDeliveryPoint, setSelectedDeliveryPoint] = useState<CustomerDeliveryPoint | null>(() => {
    const points = currentCustomer?.deliveryPoints || [];
    return points.find((dp) => dp.isDefault) || points[0] || null;
  });

  const [customDeliveryAddress, setCustomDeliveryAddress] = useState<string>(() => {
    if (currentCustomer?.id) {
      try {
        const saved = sessionStorage.getItem(`loha_portal_delivery_address_${currentCustomer.id}`);
        if (saved) return saved;
      } catch {}
    }
    const defaultPoint = currentCustomer?.deliveryPoints?.find((dp) => dp.isDefault) || currentCustomer?.deliveryPoints?.[0];
    return defaultPoint?.address || currentCustomer?.address || '';
  });

  // Đồng bộ điểm giao hàng và địa chỉ khi currentCustomer thay đổi
  useEffect(() => {
    if (!currentCustomer) return;
    const points = currentCustomer.deliveryPoints || [];
    const isPointBelongs = selectedDeliveryPoint && points.some((dp) => dp.id === selectedDeliveryPoint.id);
    if (!isPointBelongs) {
      const defaultPoint = points.find((dp) => dp.isDefault) || points[0] || null;
      setSelectedDeliveryPoint(defaultPoint);

      let savedAddr = '';
      try {
        savedAddr = sessionStorage.getItem(`loha_portal_delivery_address_${currentCustomer.id}`) || '';
      } catch {}

      if (savedAddr) {
        setCustomDeliveryAddress(savedAddr);
      } else if (defaultPoint?.address) {
        setCustomDeliveryAddress(defaultPoint.address);
      } else if (currentCustomer.address) {
        setCustomDeliveryAddress(currentCustomer.address);
      }
    }
  }, [currentCustomer]);

  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('loha_portal_delivery_date');
      if (saved) return saved;
    } catch {}
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });

  const [orderNote, setOrderNote] = useState<string>(() => {
    try {
      return sessionStorage.getItem('loha_portal_order_note') || '';
    } catch {}
    return '';
  });

  // Lưu tạm vào sessionStorage theo ID đại lý để không bị lẫn địa chỉ giữa các đại lý
  useEffect(() => {
    try {
      if (currentCustomer?.id) {
        sessionStorage.setItem(`loha_portal_delivery_address_${currentCustomer.id}`, customDeliveryAddress);
      }
      sessionStorage.setItem('loha_portal_delivery_date', deliveryDate);
      sessionStorage.setItem('loha_portal_order_note', orderNote);
    } catch {}
  }, [currentCustomer?.id, customDeliveryAddress, deliveryDate, orderNote]);

  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // TÍNH TOÁN CHIẾT KHẤU TỪNG MẶT HÀNG
  // ──────────────────────────────────────────────────────────────────────────
  const getItemEffectiveDiscount = useCallback((item: CartItem) => {
    const baseQuantity = item.quantity * (item.conversionRate || 1);
    const prodId = item.product.id || '';
    const catId = item.product.categoryId || '';
    const prodSku = item.product.sku || '';
    const prodName = item.product.name || '';

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
    const effectiveDiscountPercent = policyInfo.policy ? policyInfo.discountPercent : 0;
    const discountAmountPerUnit = policyInfo.policy
      ? Math.min(basePrice, Math.max(0, policyInfo.discountAmountPerUnit))
      : 0;

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
  // TỔNG TIỀN ĐƠN HÀNG & CÔNG NỢ DỰ KIẾN
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
      grandTotal,
      creditLimit,
      currentDebt,
      availableCredit,
      projectedDebt,
      isExceeded,
      exceededAmount,
    };
  }, [cart, debtStatus, currentCustomer, getItemEffectiveDiscount]);

  // ──────────────────────────────────────────────────────────────────────────
  // ĐIỀU CHỈNH SỐ LƯỢNG / XÓA SẢN PHẨM TRONG BẢNG
  // ──────────────────────────────────────────────────────────────────────────
  const handleUpdateQuantity = (productId: string, qty: number, allowZero: boolean = false) => {
    const item = cart[productId];
    if (!item) return;

    if (qty <= 0) {
      if (allowZero) {
        setCart((prev) => ({
          ...prev,
          [productId]: { ...prev[productId], quantity: 0 },
        }));
      } else {
        handleRemoveItem(productId);
      }
      return;
    }

    if (qty > item.availableStock) {
      showToast('warning', `Vượt quá tồn khả dụng trong kho! Tối đa: ${item.availableStock} ${item.unit}`);
      qty = item.availableStock;
    }

    setCart((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], quantity: qty },
    }));
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    showToast('info', 'Đã xóa sản phẩm khỏi đơn đặt');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // BẢNG GIÁ & THÊM SẢN PHẨM MỚI TRỰC TIẾP TỪ DROPDOWN (HÌNH 4)
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

  const getProductPricing = useCallback(
    (p: Product) => {
      const pricing = pricingMap.get(p.id) || (p.sku ? pricingMap.get(p.sku.toUpperCase()) : undefined);
      const pPrice = p.price ?? (p as unknown as { unitPrice?: number }).unitPrice ?? 0;
      const agencyPrice = pricing?.price || pPrice;
      const availableStock = p.availableStock ?? p.availableQuantity ?? (p.stockQuantity ?? 0);
      return { agencyPrice, availableStock };
    },
    [pricingMap]
  );

  const filteredAvailableProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return availableProducts;
    const q = productSearchTerm.trim().toLowerCase();
    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [availableProducts, productSearchTerm]);

  const handleAddNewProduct = (p: Product) => {
    const { agencyPrice, availableStock } = getProductPricing(p);

    if (availableStock <= 0) {
      showToast('error', `Sản phẩm "${p.name}" đã hết hàng trong kho!`);
      return;
    }

    if (cart[p.id]) {
      const currentQty = cart[p.id].quantity;
      if (currentQty >= availableStock) {
        showToast('warning', `Sản phẩm "${p.name}" đã đạt tồn tối đa (${availableStock} ${cart[p.id].unit})`);
        return;
      }
      handleUpdateQuantity(p.id, currentQty + 1);
      showToast('success', `Đã tăng số lượng "${p.name}" lên ${currentQty + 1}`);
    } else {
      setCart((prev) => ({
        ...prev,
        [p.id]: {
          product: p,
          quantity: 1,
          unit: p.baseUnit || 'Cái',
          unitPrice: agencyPrice,
          listPrice: agencyPrice,
          conversionRate: 1,
          availableStock,
        },
      }));
      showToast('success', `Đã thêm "${p.name}" vào đơn đặt hàng`);
    }

    setIsAddProductDropdownOpen(false);
    setProductSearchTerm('');
  };

  /**
   * HỦY ĐƠN VÀ THOÁT: Xóa toàn bộ giỏ hàng, giải phóng lựa chọn và quay về Cổng đặt hàng
   */
  const handleCancelOrder = () => {
    try {
      sessionStorage.removeItem('loha_portal_cart');
      window.dispatchEvent(new Event('loha_portal_cart_updated'));
    } catch {}
    navigate('/portal/orders', { replace: true });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // XỬ LÝ GỬI ĐƠN HÀNG B2B
  // ──────────────────────────────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (!currentCustomer) {
      showToast('error', 'Không xác định được thông tin đại lý!');
      return;
    }

    if (Object.keys(cart).length === 0) {
      showToast('warning', 'Giỏ hàng đang trống. Vui lòng quay lại chọn sản phẩm.');
      return;
    }

    const resolvedDeliveryAddress = String(
      customDeliveryAddress.trim() ||
      selectedDeliveryPoint?.address ||
      currentCustomer.address ||
      ''
    );

    if (!resolvedDeliveryAddress) {
      showToast('warning', 'Vui lòng nhập địa chỉ nhận hàng chi tiết!');
      return;
    }

    if (!deliveryDate.trim()) {
      showToast('warning', 'Vui lòng chọn ngày giao hàng mong muốn!');
      return;
    }

    if (currentCustomer.status === 'LOCKED') {
      showToast('error', 'Tài khoản đại lý đang bị khóa giao dịch. Không thể gửi đơn!');
      return;
    }

    for (const item of Object.values(cart)) {
      if (item.quantity <= 0) {
        showToast('error', `Số lượng sản phẩm "${item.product.name}" phải lớn hơn 0.`);
        return;
      }
      if (item.quantity > item.availableStock) {
        showToast('error', `Sản phẩm "${item.product.name}" vượt tồn khả dụng (${item.availableStock}).`);
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
        ? `[CỔNG ĐẠI LÝ: Đơn hàng tự phục vụ vượt hạn mức công nợ. Dự kiến nợ: ${formatVND(cartTotals.projectedDebt)} / Hạn mức: ${formatVND(cartTotals.creditLimit)}. Cần phê duyệt]`
        : undefined;

      const finalNote = orderNote.trim()
        ? (warningNote ? `${orderNote.trim()}\n${warningNote}` : orderNote.trim())
        : warningNote;

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
        deliveryPoint: (selectedDeliveryPoint &&
          currentCustomer.deliveryPoints?.some((dp) => dp.id === selectedDeliveryPoint.id) &&
          selectedDeliveryPoint.address.trim().toLowerCase() === resolvedDeliveryAddress.trim().toLowerCase())
          ? {
              id: selectedDeliveryPoint.id,
              name: selectedDeliveryPoint.name,
              address: resolvedDeliveryAddress,
              receiverName: selectedDeliveryPoint.receiverName || currentCustomer.name,
              phone: selectedDeliveryPoint.phone || currentCustomer.phone,
            }
          : {
              name: 'Điểm giao tự chỉ định',
              address: resolvedDeliveryAddress,
              receiverName: currentCustomer.name,
              phone: currentCustomer.phone,
            },
        note: finalNote,
        priceListId: effectivePriceList?.id,
        isCreditLimitExceeded: cartTotals.isExceeded,
        creditLimitExceededAmount: cartTotals.exceededAmount,
        warehouseId: servingWarehouse?.warehouseId,
        warehouse_id: servingWarehouse?.warehouseId,
        warehouseName: servingWarehouse?.warehouseName,
        warehouseCode: servingWarehouse?.warehouseCode,
      };

      const created = await ordersService.createOrder(payload);

      showToast('success', `Gửi đơn hàng thành công! Mã đơn: ${created.orderCode || created.id}`);
      setSubmittedOrder(created);
      setCart({});
      sessionStorage.removeItem('loha_portal_cart');
      window.dispatchEvent(new Event('loha_portal_cart_updated'));
      window.dispatchEvent(new CustomEvent('loha_order_created', { detail: created }));
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi đơn hàng. Vui lòng thử lại!');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // NẾU GIỎ HÀNG TRỐNG: TỰ ĐỘNG CHUYỂN VỀ CỔNG ĐẶT HÀNG (TRÁNH MÀN HÌNH TRUNG GIAN DƯ THỪA)
  // ──────────────────────────────────────────────────────────────────────────
  if (Object.keys(cart).length === 0 && !submittedOrder) {
    return <Navigate to="/portal/orders" replace />;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ── THANH ĐIỀU HƯỚNG BREADCRUMB & NÚT QUAY LẠI (GIỐNG HÌNH 3) ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/portal/orders"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shrink-0 shadow-2xs bg-white cursor-pointer"
            title="Quay lại Cổng đặt hàng"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </Link>
          <div className="h-4 w-px bg-slate-300 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Thông tin đại lý & xác nhận đơn hàng
            </h2>
          </div>
        </div>
      </div>

      {/* ── BỐ CỤC KHỐI DỌC TOÀN TRANG (FULL-WIDTH VERTICAL SECTIONS) ── */}
      <div className="space-y-6">

        {/* ================================================================= */}
        {/* KHỐI 1: THÔNG TIN ĐẠI LÝ & KIỂM SOÁT HẠN MỨC CÔNG NỢ               */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Hồ sơ đại lý & Hạn mức tín dụng
              </h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              cartTotals.isExceeded
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {cartTotals.isExceeded ? 'Cảnh báo: Cần duyệt công nợ' : 'Hạn mức khả dụng an toàn'}
            </span>
          </div>

          {/* ── GIAO DIỆN DESKTOP / LAPTOP / PC (GIỮ NGUYÊN 100% CẤU TRÚC & KÍCH THƯỚC BAN ĐẦU) ── */}
          <div className="hidden sm:block space-y-4">
            {/* Chi tiết đại lý */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 border border-slate-200/70 grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500 font-medium block mb-1">Tên doanh nghiệp:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="text-slate-900 text-sm sm:text-base font-semibold">
                    {currentCustomer?.name}
                  </strong>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${groupBadge.className}`}>
                    {groupBadge.label}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium block mb-1">Mã đại lý:</span>
                <strong className="text-slate-900 font-mono text-sm sm:text-base font-semibold block">
                  {currentCustomer?.code}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block mb-1">Số điện thoại:</span>
                <strong className="text-slate-900 text-sm sm:text-base font-semibold block">
                  {currentCustomer?.phone || 'Chưa cập nhật'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block mb-1">Kho xuất hàng phục vụ:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-xs mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  {servingWarehouse?.warehouseName || 'Kho mặc định hệ thống'}
                </span>
              </div>
            </div>

            {/* 3 Thẻ thống kê hạn mức */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="text-xs text-slate-500 font-medium">Hạn mức được cấp</div>
                <div className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-1">
                  {formatVND(cartTotals.creditLimit)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="text-xs text-slate-500 font-medium">Công nợ hiện tại</div>
                <div className="text-sm sm:text-base font-bold text-slate-900 font-mono mt-1">
                  {formatVND(cartTotals.currentDebt)}
                </div>
              </div>
              <div className={`p-3.5 rounded-xl border ${
                cartTotals.availableCredit < cartTotals.creditLimit * 0.2
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              }`}>
                <div className="text-xs font-semibold text-slate-600">Hạn mức khả dụng còn lại</div>
                <div className="text-sm sm:text-base font-bold font-mono mt-1">
                  {formatVND(cartTotals.availableCredit)}
                </div>
              </div>
            </div>
          </div>

          {/* ── GIAO DIỆN MOBILE: 1 KHUNG CHIA 6 Ô (2 CỘT X 3 HÀNG), GÓC BO TRÒN, KHÔNG CÓ THANH TIẾN TRÌNH ── */}
          <div className="block sm:hidden">
            <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 grid grid-cols-2 gap-2">
              {/* Cột 1 - Hàng 1 (Trái): Tên doanh nghiệp */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] text-slate-500 font-medium block">Tên doanh nghiệp:</span>
                <strong className="text-slate-900 text-xs font-semibold block leading-tight mt-1 line-clamp-2" title={currentCustomer?.name}>
                  {currentCustomer?.name}
                </strong>
              </div>

              {/* Cột 2 - Hàng 1 (Phải): Hạn mức được cấp */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] text-slate-500 font-medium block">Hạn mức được cấp</span>
                <strong className="text-slate-900 font-mono text-xs font-bold block mt-1">
                  {formatVND(cartTotals.creditLimit)}
                </strong>
              </div>

              {/* Cột 1 - Hàng 2 (Trái): Mã đại lý */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] text-slate-500 font-medium block">Mã đại lý:</span>
                <strong className="text-slate-900 font-mono text-xs font-semibold block mt-1">
                  {currentCustomer?.code}
                </strong>
              </div>

              {/* Cột 2 - Hàng 2 (Phải): Công nợ hiện tại */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] text-slate-500 font-medium block">Công nợ hiện tại</span>
                <strong className="text-slate-900 font-mono text-xs font-bold block mt-1">
                  {formatVND(cartTotals.currentDebt)}
                </strong>
              </div>

              {/* Cột 1 - Hàng 3 (Trái): Số điện thoại */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] text-slate-500 font-medium block">Số điện thoại:</span>
                <strong className="text-slate-900 text-xs font-semibold block mt-1">
                  {currentCustomer?.phone || 'Chưa cập nhật'}
                </strong>
              </div>

              {/* Cột 2 - Hàng 3 (Phải): Hạn mức khả dụng (Bỏ chữ 'còn lại') */}
              <div className={`p-2.5 rounded-lg border shadow-2xs flex flex-col justify-between ${
                cartTotals.availableCredit < cartTotals.creditLimit * 0.2
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              }`}>
                <span className="text-[11px] font-semibold text-slate-600 block">Hạn mức khả dụng</span>
                <strong className={`font-mono text-xs font-bold block mt-1 ${
                  cartTotals.availableCredit < cartTotals.creditLimit * 0.2 ? 'text-amber-800' : 'text-emerald-700'
                }`}>
                  {formatVND(cartTotals.availableCredit)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* KHỐI 2: THÔNG TIN GIAO HÀNG & GHI CHÚ ĐƠN HÀNG                   */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Thông tin giao hàng & Ghi chú
            </h3>
          </div>

          <div className="space-y-4">
            {/* Địa chỉ giao hàng */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="confirm-delivery-address" className="text-sm font-medium text-slate-700">
                  Địa chỉ nhận hàng: <span className="text-rose-500">*</span>
                </label>
                {currentCustomer?.deliveryPoints && currentCustomer.deliveryPoints.length > 0 && (
                  <span className="text-xs text-indigo-600 font-medium">
                    {currentCustomer.deliveryPoints.length} điểm giao hàng đã lưu
                  </span>
                )}
              </div>

              {currentCustomer?.deliveryPoints && currentCustomer.deliveryPoints.length > 0 && (
                <select
                  value={selectedDeliveryPoint?.id || ''}
                  onChange={(e) => {
                    const pointId = e.target.value;
                    if (!pointId) {
                      setSelectedDeliveryPoint(null);
                      return;
                    }
                    const found = currentCustomer.deliveryPoints?.find((dp) => dp.id === pointId);
                    if (found) {
                      setSelectedDeliveryPoint(found);
                      setCustomDeliveryAddress(found.address);
                    }
                  }}
                  className="w-full text-sm rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-1"
                >
                  {currentCustomer.deliveryPoints.map((dp) => (
                    <option key={dp.id} value={dp.id}>
                      {dp.name} — {dp.address} {dp.isDefault ? '(Mặc định)' : ''}
                    </option>
                  ))}
                  <option value="">Địa chỉ khác / Tự nhập địa chỉ giao hàng</option>
                </select>
              )}

              <input
                id="confirm-delivery-address"
                type="text"
                value={customDeliveryAddress}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomDeliveryAddress(val);
                  if (selectedDeliveryPoint && selectedDeliveryPoint.address.trim().toLowerCase() !== val.trim().toLowerCase()) {
                    setSelectedDeliveryPoint(null);
                  }
                }}
                placeholder="Nhập chi tiết số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                className="w-full text-sm rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            {/* Ngày giao hàng mong muốn & Ghi chú */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="confirm-delivery-date" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ngày giao hàng mong muốn:</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  id="confirm-delivery-date"
                  type="date"
                  value={deliveryDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-order-note" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ghi chú đơn hàng:</span>
                </label>
                <input
                  id="confirm-order-note"
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao 30 phút..."
                  className="w-full text-sm rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* KHỐI 3: DANH SÁCH SẢN PHẨM & BẢNG GIỎ HÀNG                        */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Package className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Chi tiết sản phẩm đặt hàng
              </h3>
            </div>
            <div className="relative shrink-0" ref={addProductDropdownRef}>
              <button
                type="button"
                onClick={() => setIsAddProductDropdownOpen(!isAddProductDropdownOpen)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 sm:gap-2 border transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 ${
                  isAddProductDropdownOpen
                    ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 text-blue-700'
                    : 'border-slate-300 hover:border-blue-500 bg-white text-slate-700'
                }`}
                title="Chọn sản phẩm thêm vào đơn"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Thêm sản phẩm</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isAddProductDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
              </button>

              {/* Menu Dropdown danh sách sản phẩm theo dạng Hình 4 */}
              {isAddProductDropdownOpen && (
                <div className="absolute right-0 mt-1 w-72 sm:w-84 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Tiêu đề xanh đậm chuẩn phong cách Hình 4 */}
                  <div className="bg-blue-600 text-white px-3.5 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs">
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-200" />
                      <span>Danh mục sản phẩm ({filteredAvailableProducts.length})</span>
                    </span>
                    <span className="text-[10px] text-blue-100 font-normal">Bấm chọn để thêm</span>
                  </div>

                  {/* Thanh tìm kiếm nhanh */}
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm nhanh mã SKU, tên..."
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Danh sách các mặt hàng có thể thêm */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {filteredAvailableProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Không tìm thấy sản phẩm phù hợp
                      </div>
                    ) : (
                      filteredAvailableProducts.map((p) => {
                        const { agencyPrice, availableStock } = getProductPricing(p);
                        const isOutOfStock = availableStock <= 0;
                        const inCart = !!cart[p.id];

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (!isOutOfStock) handleAddNewProduct(p);
                            }}
                            className={`px-3.5 py-2.5 text-xs transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
                              isOutOfStock
                                ? 'opacity-40 bg-slate-50 cursor-not-allowed'
                                : inCart
                                ? 'bg-blue-50/60 hover:bg-blue-100/80 text-blue-900'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="font-mono text-[10px] text-slate-400 uppercase">{p.sku}</span>
                                {inCart && (
                                   <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                                     Đã có: {cart[p.id].quantity}
                                   </span>
                                )}
                              </div>
                              <div className="font-semibold text-slate-900 truncate" title={p.name}>
                                {cleanProductName(p.name)}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>
                                  Tồn: <strong className={availableStock > 0 ? 'text-emerald-600' : 'text-rose-500'}>{availableStock}</strong> {p.baseUnit || 'món'}
                                </span>
                                <span>•</span>
                                <span className="font-bold text-blue-600 font-mono">{formatVND(agencyPrice)}</span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {inCart ? (
                                <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                                  +
                                </span>
                              ) : isOutOfStock ? (
                                <span className="text-[10px] text-rose-500 font-semibold">Hết</span>
                              ) : (
                                <span className="w-6 h-6 rounded-md bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors">
                                  <Plus className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bảng sản phẩm */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                  <th className="py-3 px-3 text-left min-w-[150px] sm:min-w-0 whitespace-nowrap">Mã SKU & Sản phẩm</th>
                  <th className="hidden sm:table-cell py-3 px-2 text-center whitespace-nowrap">ĐVT</th>
                  <th className="py-3 px-2 text-right whitespace-nowrap">Đơn giá niêm yết</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">Chiết khấu</th>
                  <th className="py-3 px-2 text-right whitespace-nowrap">Đơn giá sau CK</th>
                  <th className="py-3 px-2 text-center w-36 whitespace-nowrap">Số lượng</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Thành tiền</th>
                  <th className="py-3 px-2 text-center w-12 whitespace-nowrap">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.values(cart).map((item) => {
                  const calc = getItemEffectiveDiscount(item);
                  const { basePrice, effectiveDiscountPercent, effectiveUnitPrice, itemGrandTotal } = calc;

                  return (
                    <tr key={item.product.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono text-[10px] text-slate-400 uppercase">{item.product.sku}</div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm" title={item.product.name}>
                          {cleanProductName(item.product.name)}
                        </div>
                        <div className="hidden sm:block text-[11px] text-slate-500 mt-0.5">
                          Tồn khả dụng: <span className="font-semibold text-emerald-600">{item.availableStock}</span> {item.unit}
                        </div>
                      </td>

                      <td className="hidden sm:table-cell py-3 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                          {item.unit}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-right font-mono text-xs text-slate-600 whitespace-nowrap">
                        {formatVND(basePrice)}
                      </td>

                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        {calc.isFixed ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            -{formatVND(calc.discountAmountPerUnit)}{item.unit ? ` / ${item.unit}` : ''}
                          </span>
                        ) : effectiveDiscountPercent > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            -{effectiveDiscountPercent}%
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                            0%
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-right font-mono text-xs font-bold text-indigo-600 whitespace-nowrap">
                        {formatVND(effectiveUnitPrice)}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <div className="inline-flex items-center border border-slate-200 rounded-xl bg-white shadow-2xs p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
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
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.availableStock}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title="Tăng 1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                        {formatVND(itemGrandTotal)}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Xóa mặt hàng này"
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
        </div>

        {/* ================================================================= */}
        {/* KHỐI 4: TỔNG KẾT THANH TOÁN & THAO TÁC ĐẶT HÀNG                   */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Tổng kết thanh toán & Đối soát công nợ
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Tổng tiền hàng niêm yết:</span>
              <span className="font-mono text-slate-900 font-medium">{formatVND(cartTotals.listSubtotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Chiết khấu theo chính sách:</span>
              <span className="font-bold font-mono">-{formatVND(cartTotals.totalDiscount)}</span>
            </div>
            <div className="flex justify-between text-slate-800 pt-2 border-t border-slate-100 text-base font-bold">
              <span>Tổng thanh toán:</span>
              <span className="text-indigo-600 font-mono text-lg">{formatVND(cartTotals.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100 text-sm">
              <span>Hạn mức tín dụng khả dụng trước đơn:</span>
              <span className="font-semibold text-slate-900 font-mono">{formatVND(cartTotals.availableCredit)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-800">Dự kiến tổng công nợ sau đơn:</span>
              <span className={cartTotals.isExceeded ? 'text-rose-600 font-bold font-mono text-base' : 'text-slate-900 font-mono text-base'}>
                {formatVND(cartTotals.projectedDebt)}
              </span>
            </div>

            {/* Cảnh báo vượt hạn mức nếu có */}
            {cartTotals.isExceeded && (
              <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-0.5 text-amber-800">
                    Cảnh báo: Đơn hàng vượt hạn mức tín dụng (+{formatVND(cartTotals.exceededAmount)})
                  </strong>
                  Hệ thống vẫn cho phép bạn gửi đơn hàng này, tuy nhiên đơn sẽ ở trạng thái <strong className="underline">Chờ phê duyệt</strong> và cần Kế toán / Quản lý kinh doanh duyệt trước khi kho xuất hàng.
                </div>
              </div>
            )}
          </div>

          {/* Các nút hành động thao tác */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleCancelOrder}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-rose-600 hover:border-slate-300 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
              title="Hủy đơn hàng và quay lại Cổng đặt hàng"
            >
              <span>Hủy</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSubmitOrder()}
              disabled={isSubmittingOrder || cartTotals.totalItems === 0}
              className={`py-3 px-7 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                cartTotals.isExceeded
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
              }`}
            >
              {isSubmittingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi đơn hàng...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{cartTotals.isExceeded ? 'Gửi đơn hàng (Chờ duyệt hạn mức)' : 'Xác nhận & Gửi đơn hàng B2B'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* MODAL THÔNG BÁO GỬI ĐƠN HÀNG THÀNH CÔNG                                */}
      {/* ===================================================================== */}
      {submittedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <Check className="w-8 h-8" strokeWidth={3} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Gửi đơn hàng thành công!</h3>
              <p className="text-xs text-slate-500">
                Đơn hàng B2B của bạn đã được tiếp nhận và chuyển đến bộ phận kho vận.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn hàng:</span>
                <span className="font-mono font-bold text-indigo-600">{submittedOrder.orderCode || submittedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng thanh toán:</span>
                <span className="font-mono font-bold text-slate-900">{formatVND(submittedOrder.grandTotal ?? submittedOrder.totalAmount ?? submittedOrder.subtotal ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-bold text-amber-600">
                  {submittedOrder.isCreditLimitExceeded ? 'Chờ phê duyệt hạn mức' : 'Chờ xử lý xuất kho'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Link
                to="/portal/orders"
                onClick={() => setSubmittedOrder(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Đặt đơn mới
              </Link>
              <Link
                to={`/portal/tracking?orderId=${submittedOrder.id}`}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 text-center"
              >
                Xem chi tiết & Theo dõi đơn
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
