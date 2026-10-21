import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Boxes,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Building2,
  ArrowRightLeft,
  Eye,
  FileSpreadsheet,
  X,
  Filter,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  PackagePlus,
  Trash2,
  Wrench,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { ModalLayout } from '../components/modal-layout';
import { MinStockModal } from '../components/inventory/min-stock-modal';
import { Pagination } from '../components/pagination';
import { inventoryService } from '../services/inventory.service';
import { productsService, PRODUCT_CATEGORIES } from '../services/products.service';
import { categoriesService } from '../services/categories.service';
import { apiClient } from '../services/api';
import { STANDARD_WAREHOUSES, type StandardWarehouse } from '../constants/warehouse.constants';
import { getStoredUser } from '../utils/navigation';
import type {
  StockOverviewItem,
  StockStatusType,
  AdjustStockPayload,
  ProductUnit,
  Product,
} from '../types/products';
import type { StockBalance } from '../types/inventory.types';

export const InventoryStockPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [stockItems, setStockItems] = useState<StockOverviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalAlertsCount, setTotalAlertsCount] = useState<number>(0);
  const [warehousesList, setWarehousesList] = useState<StandardWarehouse[]>(STANDARD_WAREHOUSES);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProductSkuForAdjust, setSelectedProductSkuForAdjust] = useState<string>('');
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  useEffect(() => {
    productsService
      .getProducts({ limit: 500, status: 'ACTIVE' })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setAllProducts(res.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiClient
      .get('/warehouses')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const list: StandardWarehouse[] = res.data.map((w: any) => ({
            id: w.id,
            code: w.code,
            name: w.name,
            displayName: w.name && w.code ? `${w.name} (${w.code})` : w.name || w.code,
          }));
          setWarehousesList(list);
        }
      })
      .catch(() => {});
  }, []);

  const user = getStoredUser();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('ADMIN');
  const isManager =
    userRoles.includes('WAREHOUSE_MANAGER') ||
    userRoles.includes('WH_MANAGER') ||
    isAdmin;
  const isKeeper =
    !isManager &&
    (userRoles.includes('WAREHOUSE_KEEPER') ||
      userRoles.includes('WAREHOUSE') ||
      userRoles.includes('WH_KEEPER'));

  // Thủ kho (1 - 1): Xác định duy nhất kho công tác thực tế của thủ kho
  const keeperWarehouseId = useMemo(() => {
    if (!user) return STANDARD_WAREHOUSES[2].id;
    if (user.warehouseId) {
      return user.warehouseId;
    }
    if (user.assignedWarehouseId) {
      return user.assignedWarehouseId;
    }
    const rawWh = (user.warehouseCode || user.assignedWarehouseCode || user.assignedWarehouse || '').toUpperCase();
    const match =
      warehousesList.find((w) => w.id.toUpperCase() === rawWh || w.code.toUpperCase() === rawWh || w.name.toUpperCase().includes(rawWh)) ||
      STANDARD_WAREHOUSES.find(
        (w) =>
          w.code.toUpperCase() === rawWh ||
          w.id.toUpperCase() === rawWh ||
          w.name.toUpperCase().includes(rawWh) ||
          rawWh.includes(w.name.toUpperCase()),
      );
    return match ? match.id : (warehousesList[0]?.id || STANDARD_WAREHOUSES[2].id);
  }, [user, warehousesList]);

  // Bộ lọc kho ban đầu: Thủ kho cố định kho của mình, Quản lý kho / Admin xem Tất cả kho
  const defaultWarehouse = isKeeper ? keeperWarehouseId : 'ALL';

  // Đọc giá trị bộ lọc & phân trang ban đầu từ URL Query Parameters
  const initialSearch = searchParams.get('search') || '';
  const initialWarehouse = searchParams.get('warehouse') || defaultWarehouse;
  const initialCategory = searchParams.get('category') || 'ALL';
  const initialStatus =
    (searchParams.get('status') as StockStatusType) ||
    (searchParams.get('filter') as StockStatusType) ||
    'ALL';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const initialLimit = Math.max(10, parseInt(searchParams.get('limit') || '10', 10) || 10);

  const [searchInput, setSearchInput] = useState<string>(initialSearch);
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(initialWarehouse);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedStatus, setSelectedStatus] = useState<StockStatusType | 'ALL'>(initialStatus);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialLimit);

  // Popup & Modal trạng thái
  const [conversionModalOpen, setConversionModalOpen] = useState<boolean>(false);
  const [selectedItemForConversion, setSelectedItemForConversion] = useState<StockOverviewItem | null>(null);

  // Modal Sửa Mức Tồn Tối Thiểu (SN-183)
  const [editingMinStockItem, setEditingMinStockItem] = useState<StockBalance | null>(null);

  // Modal Xóa Sản Phẩm Khỏi Kho (Yêu cầu mới)
  const [deleteProductModalOpen, setDeleteProductModalOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<{
    item: StockOverviewItem;
    targetWarehouseId: string;
    targetWarehouseName: string;
    hasStock: boolean;
  } | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState<boolean>(false);

  const handleOpenDeleteProductModal = (item: StockOverviewItem) => {
    let targetWhId = selectedWarehouse !== 'ALL' ? selectedWarehouse : (item.warehouseId || '');
    if (!targetWhId) {
      const foundWh = warehousesList.find(
        (w) =>
          w.id === item.warehouseId ||
          w.name === item.warehouse ||
          w.code === (item as any).warehouseCode
      );
      targetWhId = foundWh?.id || '';
    }
    const whObj = warehousesList.find((w) => w.id === targetWhId);
    const targetWhName = whObj?.displayName || whObj?.name || item.warehouse || 'Kho hiện tại';

    const hasStock =
      (item.physicalStock || 0) > 0 ||
      (item.reservedStock || 0) > 0 ||
      (item.availableStock || 0) > 0;

    setProductToDelete({
      item,
      targetWarehouseId: targetWhId,
      targetWarehouseName: targetWhName,
      hasStock,
    });
    setDeleteProductModalOpen(true);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      await inventoryService.removeProductFromWarehouse(
        productToDelete.targetWarehouseId,
        productToDelete.item.sku,
        productToDelete.item.id || (productToDelete.item as any).productId
      );
      showToast(
        'success',
        `Đã xóa sản phẩm "${productToDelete.item.name || productToDelete.item.sku}" khỏi ${productToDelete.targetWarehouseName} thành công`
      );
      setDeleteProductModalOpen(false);
      setProductToDelete(null);
      await fetchStockData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa sản phẩm khỏi kho';
      showToast('error', msg);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Modal Xử lý Sản phẩm lỗi (Đưa sang tồn kho hoặc Tiêu hủy)
  const [processDamagedModalOpen, setProcessDamagedModalOpen] = useState<boolean>(false);
  const [damagedItemToProcess, setDamagedItemToProcess] = useState<StockOverviewItem | null>(null);
  const [damagedAction, setDamagedAction] = useState<'TO_STOCK' | 'DESTROY'>('TO_STOCK');
  const [damagedProcessQty, setDamagedProcessQty] = useState<number>(1);
  const [damagedProcessReason, setDamagedProcessReason] = useState<string>('');
  const [isProcessingDamaged, setIsProcessingDamaged] = useState<boolean>(false);

  const handleOpenProcessDamagedModal = (item: StockOverviewItem) => {
    setDamagedItemToProcess(item);
    setDamagedAction('TO_STOCK');
    const availableDamaged = Number(item.damagedQuantity || item.physicalStock || 1);
    setDamagedProcessQty(availableDamaged);
    setDamagedProcessReason('');
    setProcessDamagedModalOpen(true);
  };

  const handleConfirmProcessDamaged = async () => {
    if (!damagedItemToProcess) return;
    const maxQty = Number(damagedItemToProcess.damagedQuantity || damagedItemToProcess.physicalStock || 0);
    if (damagedProcessQty <= 0) {
      showToast('error', 'Số lượng xử lý phải lớn hơn 0');
      return;
    }
    if (damagedProcessQty > maxQty) {
      showToast('error', `Số lượng xử lý không được vượt quá số lượng lỗi hiện có (${maxQty})`);
      return;
    }
    if (!damagedProcessReason.trim()) {
      showToast('error', 'Vui lòng nhập lý do xử lý');
      return;
    }

    setIsProcessingDamaged(true);
    try {
      const res = await inventoryService.processDamagedStock({
        warehouseId: damagedItemToProcess.warehouseId || selectedWarehouse,
        productId: damagedItemToProcess.productId || (damagedItemToProcess as any).id,
        productSku: damagedItemToProcess.sku,
        batchNumber: damagedItemToProcess.batchNumber || '',
        expiryDate: damagedItemToProcess.expiryDate || undefined,
        action: damagedAction,
        quantity: damagedProcessQty,
        reason: damagedProcessReason.trim(),
      });
      showToast('success', res.message || 'Xử lý sản phẩm lỗi thành công!');
      setProcessDamagedModalOpen(false);
      setDamagedItemToProcess(null);
      await fetchStockData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xử lý hàng lỗi';
      showToast('error', Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsProcessingDamaged(false);
    }
  };

  const [adjustModalOpen, setAdjustModalOpen] = useState<boolean>(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<StockOverviewItem | null>(null);
  const [adjustWarehouseId, setAdjustWarehouseId] = useState<string>('');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [adjustUnit, setAdjustUnit] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustRefCode, setAdjustRefCode] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState<boolean>(false);

  const currentAdjustProduct = useMemo(() => {
    if (selectedItemForAdjust) {
      return {
        sku: selectedItemForAdjust.sku,
        name: selectedItemForAdjust.name,
        baseUnit: selectedItemForAdjust.baseUnit,
        units: selectedItemForAdjust.units || [],
        availableStock: selectedItemForAdjust.availableStock,
        warehouse: selectedItemForAdjust.warehouse,
      };
    }
    const found = allProducts.find((p) => p.sku === selectedProductSkuForAdjust) || allProducts[0];
    if (found) {
      return {
        sku: found.sku,
        name: found.name,
        baseUnit: found.baseUnit,
        units: found.units || [],
        availableStock: 0,
        warehouse: '',
      };
    }
    return null;
  }, [selectedItemForAdjust, selectedProductSkuForAdjust, allProducts]);

  // Danh sách kho áp dụng cho popup điều chỉnh kho (SN-23):
  // - Thủ kho (1-1): Cố định duy nhất 1 kho của mình
  // - Quản lý kho & Admin: Toàn quyền chọn tất cả các kho
  const adjustWarehouseOptions = useMemo(() => {
    if (isKeeper) {
      const match = warehousesList.find((w) => w.id === keeperWarehouseId) || STANDARD_WAREHOUSES.find((w) => w.id === keeperWarehouseId);
      return match ? [match] : [warehousesList[0] || STANDARD_WAREHOUSES[2]];
    }
    return warehousesList.length > 0 ? warehousesList : STANDARD_WAREHOUSES;
  }, [isKeeper, keeperWarehouseId, warehousesList]);

  // Dropdown menu Thao tác
  const [openActionMenuKey, setOpenActionMenuKey] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    top: number;
    right: number;
    isDropUp: boolean;
  } | null>(null);

  // Đóng action dropdown khi click ra ngoài hoặc scroll/resize
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('.inventory-action-portal-menu') &&
        !target.closest('.inventory-action-dropdown-container')
      ) {
        setOpenActionMenuKey(null);
        setActionMenuAnchor(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenActionMenuKey(null);
      setActionMenuAnchor(null);
    };

    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // Phân quyền người dùng:
  // - Tất cả vai trò đều có quyền XEM tồn tối thiểu & cảnh báo đứt hàng SN-183
  // - Quản lý kho, Thủ kho, Admin, Sales Manager có quyền CHỈNH SỬA / KHAI BÁO mức tồn tối thiểu
  const canAdjustStock =
    userRoles.includes('ADMIN') ||
    userRoles.includes('WAREHOUSE_MANAGER') ||
    userRoles.includes('WAREHOUSE_KEEPER') ||
    userRoles.includes('WAREHOUSE') ||
    userRoles.includes('WH_MANAGER');

  const canEditMinStock =
    userRoles.includes('ADMIN') ||
    userRoles.includes('WAREHOUSE_MANAGER') ||
    userRoles.includes('WAREHOUSE_KEEPER') ||
    userRoles.includes('WAREHOUSE') ||
    userRoles.includes('WH_MANAGER') ||
    userRoles.includes('SALES_MANAGER');

  const isInternalChangeRef = useRef(false);

  // Đồng bộ hóa URL Search Params an toàn, giữ nguyên các param khác và không reload trang
  const updateUrlParams = useCallback(
    (updates: {
      search?: string;
      warehouse?: string;
      category?: string;
      status?: string;
      page?: number;
      limit?: number;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, val]) => {
            if (
              val === undefined ||
              val === '' ||
              val === 'ALL' ||
              (key === 'page' && val === 1) ||
              (key === 'limit' && val === 10)
            ) {
              next.delete(key);
            } else {
              next.set(key, String(val));
            }
          });
          if (updates.status !== undefined) {
            next.delete('filter');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const isInitialSearchMount = useRef(true);

  // Debounce tìm kiếm (350ms) để cập nhật URL và nạp dữ liệu
  useEffect(() => {
    if (isInitialSearchMount.current) {
      isInitialSearchMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== searchTerm) {
        setSearchTerm(trimmed);
        setCurrentPage(1);
        updateUrlParams({ search: trimmed, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, searchTerm, updateUrlParams]);

  // Lắng nghe thay đổi searchParams từ URL (khi click từ Dashboard chuyển sang hoặc Back/Forward trên browser)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlWh = searchParams.get('warehouse') || defaultWarehouse;
    const urlCat = searchParams.get('category') || 'ALL';
    const urlStatus =
      (searchParams.get('status') as StockStatusType) ||
      (searchParams.get('filter') as StockStatusType) ||
      'ALL';
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const urlLimit = Math.max(10, parseInt(searchParams.get('limit') || '10', 10) || 10);

    let changed = false;
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setSearchInput(urlSearch);
      changed = true;
    }
    if (urlWh !== selectedWarehouse) {
      setSelectedWarehouse(urlWh);
      changed = true;
    }
    if (urlCat !== selectedCategory) {
      setSelectedCategory(urlCat);
      changed = true;
    }
    if (urlStatus !== selectedStatus) {
      setSelectedStatus(urlStatus);
      changed = true;
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
      changed = true;
    }
    if (urlLimit !== pageSize) {
      setPageSize(urlLimit);
      changed = true;
    }

    if (changed && isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
    }
  }, [searchParams, defaultWarehouse]);

  const handleWarehouseChange = (newWh: string) => {
    isInternalChangeRef.current = true;
    setSelectedWarehouse(newWh);
    setCurrentPage(1);
    updateUrlParams({ warehouse: newWh, page: 1 });
  };

  const handleCategoryChange = (newCat: string) => {
    isInternalChangeRef.current = true;
    setSelectedCategory(newCat);
    setCurrentPage(1);
    updateUrlParams({ category: newCat, page: 1 });
  };

  const handleStatusChange = (newStatus: StockStatusType | 'ALL') => {
    isInternalChangeRef.current = true;
    setSelectedStatus(newStatus);
    setCurrentPage(1);
    updateUrlParams({ status: newStatus, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    isInternalChangeRef.current = true;
    setCurrentPage(newPage);
    updateUrlParams({ page: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    isInternalChangeRef.current = true;
    setPageSize(newSize);
    setCurrentPage(1);
    updateUrlParams({ limit: newSize, page: 1 });
  };

  const handleResetFilters = () => {
    isInternalChangeRef.current = true;
    setSearchInput('');
    setSearchTerm('');
    setSelectedWarehouse(defaultWarehouse);
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.trim() !== '' ||
      (selectedWarehouse !== 'ALL' && selectedWarehouse !== defaultWarehouse) ||
      selectedCategory !== 'ALL' ||
      selectedStatus !== 'ALL'
    );
  }, [searchTerm, selectedWarehouse, defaultWarehouse, selectedCategory, selectedStatus]);

  // Tải dữ liệu tồn kho từ Backend API / Demo
  const fetchStockData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, alerts] = await Promise.all([
        inventoryService.getStockOverview({
          search: searchTerm,
          warehouse: selectedWarehouse,
          category: selectedCategory,
          status: selectedStatus,
        }),
        inventoryService.getLowStockAlerts(selectedWarehouse),
      ]);
      setStockItems(data);
      setTotalAlertsCount(alerts.length);
    } catch {
      showToast('error', 'Không thể tải dữ liệu tồn kho. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedWarehouse, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // Danh sách nhóm hàng cấp 1 bền vững: chỉ lọc theo nhóm hàng cấp 1 (Level 1)
  const [categoryOptions, setCategoryOptions] = useState<string[]>(() =>
    PRODUCT_CATEGORIES.filter((c) => (c.level ? c.level === 1 : true)).map((c) => c.name)
  );

  useEffect(() => {
    // Lấy cây danh mục để chỉ lấy các nhóm hàng cấp 1 (root nodes)
    categoriesService
      .getCategoryTree()
      .then((tree) => {
        if (Array.isArray(tree) && tree.length > 0) {
          const level1Names = tree.map((c) => c.name).filter(Boolean);
          setCategoryOptions((prev) => Array.from(new Set([...prev, ...level1Names])));
        } else {
          return categoriesService.getCategories().then((cats) => {
            if (Array.isArray(cats) && cats.length > 0) {
              const level1Names = cats
                .filter((c) => c.level === 1 || !c.parentId || !c.parent_id)
                .map((c) => c.name)
                .filter(Boolean);
              setCategoryOptions((prev) => Array.from(new Set([...prev, ...level1Names])));
            }
          });
        }
      })
      .catch(() => {});
  }, []);

  // Chỉ bổ sung thêm nếu sản phẩm tồn kho có parentCategory cấp 1
  useEffect(() => {
    if (stockItems.length > 0) {
      setCategoryOptions((prev) => {
        const set = new Set(prev);
        stockItems.forEach((item) => {
          if (item.parentCategory && item.parentCategory.trim()) {
            set.add(item.parentCategory.trim());
          }
        });
        return Array.from(set);
      });
    }
  }, [stockItems]);

  // Thống kê tổng hợp 3 cột tồn kho + Cảnh báo đứt hàng (chỉ đếm hàng sắp đứt, không lấy hàng 0 tồn)
  const summaryStats = useMemo(() => {
    let totalPhysical = 0;
    let totalReserved = 0;
    let totalAvailable = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let nearOutOfStockCount = 0;

    stockItems.forEach((item) => {
      totalPhysical += item.physicalStock;
      totalReserved += item.reservedStock;
      totalAvailable += item.availableStock;
      if (item.status === 'LOW_STOCK') lowStockCount++;
      if (item.status === 'OUT_OF_STOCK') outOfStockCount++;

      // Hàng SẮP ĐỨT: tồn khả dụng còn > 0 nhưng chạm hoặc dưới ngưỡng cảnh báo
      const isNearOutOfStock =
        item.availableStock > 0 &&
        (item.status === 'LOW_STOCK' ||
          Boolean(item.isBelowMinStock) ||
          ((item.minStockLevel || 0) > 0 && item.availableStock <= (item.minStockLevel || 0)));

      if (isNearOutOfStock) nearOutOfStockCount++;
    });

    return {
      totalPhysical,
      totalReserved,
      totalAvailable,
      lowStockCount,
      outOfStockCount,
      nearOutOfStockCount,
      totalSku: stockItems.length,
    };
  }, [stockItems]);

  const totalPages = Math.max(1, Math.ceil(stockItems.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return stockItems.slice(start, start + pageSize);
  }, [stockItems, currentPage, pageSize]);

  // Mở modal cấu hình tồn tối thiểu (SN-183)
  const handleOpenMinStockModal = (item: StockOverviewItem) => {
    setEditingMinStockItem({
      sku: item.sku,
      name: item.name,
      stockQuantity: item.availableStock,
      physicalStockQuantity: item.physicalStock,
      physicalQuantity: item.physicalStock,
      reservedQuantity: item.reservedStock,
      availableQuantity: item.availableStock,
      baseUnit: item.baseUnit,
      units: item.units || [],
      warehouse: item.warehouse || (selectedWarehouse === 'ALL' ? 'Tất cả kho hàng' : 'Kho hàng'),
      warehouseId: item.warehouseId || selectedWarehouse || 'ALL',
      minStockLevel: item.minStockLevel || 0,
      isBelowMinStock: item.isBelowMinStock,
    });
  };

  // Lưu thiết lập tồn tối thiểu theo SKU tại kho (SN-183)
  const handleSaveMinStock = async (balanceItem: StockBalance, newMinStock: number) => {
    try {
      const targetWarehouse = balanceItem.warehouseId || selectedWarehouse || 'ALL';
      await inventoryService.updateMinStockLevel(
        targetWarehouse,
        balanceItem.sku,
        newMinStock,
      );
      setStockItems((prev) =>
        prev.map((it) => {
          if (it.sku.toUpperCase() === balanceItem.sku.toUpperCase()) {
            const isBelow = newMinStock > 0 && it.availableStock <= newMinStock;
            return {
              ...it,
              minStockLevel: newMinStock,
              isBelowMinStock: isBelow,
              status: isBelow ? 'LOW_STOCK' : it.availableStock <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
            };
          }
          return it;
        }),
      );
      window.dispatchEvent(
        new CustomEvent('loha_inventory_updated', {
          detail: { sku: balanceItem.sku, minStockLevel: newMinStock },
        }),
      );
      showToast(
        'success',
        `Đã lưu mức tồn tối thiểu cho ${balanceItem.sku}: ${newMinStock.toLocaleString('vi-VN')} ${balanceItem.baseUnit}`,
      );
      setEditingMinStockItem(null);
    } catch (err: unknown) {
      showToast('error', (err instanceof Error ? err.message : String(err)) || 'Không thể lưu tồn tối thiểu');
    }
  };

  // Mở modal tra cứu quy đổi đơn vị
  const handleOpenConversionModal = (item: StockOverviewItem) => {
    setSelectedItemForConversion(item);
    setConversionModalOpen(true);
  };

  // Mở modal điều chỉnh tồn kho cho sản phẩm đã có
  const handleOpenAdjustModal = (item: StockOverviewItem) => {
    setSelectedItemForAdjust(item);
    setSelectedProductSkuForAdjust(item.sku);
    setAdjustQuantity(10);
    setAdjustUnit(item.baseUnit);
    setAdjustType('IMPORT');
    setAdjustReason('Nhập bổ sung tồn kho');
    setAdjustRefCode(`PNK-${Date.now().toString().slice(-6)}`);

    // Thiết lập kho áp dụng mặc định theo phân quyền
    if (isKeeper) {
      setAdjustWarehouseId(keeperWarehouseId);
    } else if (selectedWarehouse && selectedWarehouse !== 'ALL') {
      setAdjustWarehouseId(selectedWarehouse);
    } else if (item.warehouseId && item.warehouseId !== 'ALL') {
      setAdjustWarehouseId(item.warehouseId);
    } else {
      setAdjustWarehouseId(adjustWarehouseOptions[0]?.id || STANDARD_WAREHOUSES[0].id);
    }

    setAdjustModalOpen(true);
  };

  // Xử lý xuất báo cáo tồn kho ra tệp Excel (.xlsx) gửi kế toán (SN-229 / SN-220)
  const handleExportExcel = async () => {
    if (exportingExcel) return;
    try {
      setExportingExcel(true);
      showToast('info', 'Hệ thống đang trích xuất dữ liệu tồn kho ra Excel...');
      const { blob, fileName } = await inventoryService.exportStockExcel({
        warehouse: selectedWarehouse,
        warehouseId: selectedWarehouse,
        category: selectedCategory,
        status: selectedStatus,
        search: searchTerm,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('success', `Đã xuất báo cáo tồn kho thành công: ${fileName}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xuất Excel thất bại. Vui lòng thử lại sau.';
      showToast('error', msg);
    } finally {
      setExportingExcel(false);
    }
  };
  // Xử lý gửi yêu cầu điều chỉnh tồn kho
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveSku = selectedItemForAdjust?.sku || selectedProductSkuForAdjust;
    if (!effectiveSku) {
      showToast('warning', 'Vui lòng chọn sản phẩm cần nhập/điều chỉnh');
      return;
    }

    if (!adjustWarehouseId) {
      showToast('warning', 'Vui lòng chọn kho áp dụng điều chỉnh');
      return;
    }

    if (adjustQuantity <= 0) {
      showToast('warning', 'Số lượng điều chỉnh phải lớn hơn 0');
      return;
    }

    if (!adjustReason.trim()) {
      showToast('warning', 'Vui lòng nhập lý do điều chỉnh kho');
      return;
    }

    const signedChange = adjustType === 'IMPORT' ? Math.abs(adjustQuantity) : -Math.abs(adjustQuantity);
    const targetWarehouse =
      warehousesList.find((w) => w.id === adjustWarehouseId) ||
      STANDARD_WAREHOUSES.find((w) => w.id === adjustWarehouseId);

    const payload: AdjustStockPayload = {
      productSku: effectiveSku,
      warehouseId: adjustWarehouseId,
      warehouse_id: adjustWarehouseId,
      quantityChange: signedChange,
      unit: adjustUnit,
      reason: adjustReason.trim(),
      referenceCode: adjustRefCode.trim(),
      warehouseLocation: targetWarehouse ? targetWarehouse.name : (selectedItemForAdjust?.warehouse || 'Kho hàng'),
    };

    setIsSubmittingAdjust(true);
    try {
      const res = await inventoryService.adjustStock(payload);
      showToast('success', res.message || 'Điều chỉnh tồn kho thành công!');
      setAdjustModalOpen(false);
      fetchStockData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Điều chỉnh tồn kho thất bại';
      showToast('error', errorMsg);
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">

      {/* Thẻ Thống kê 3 Cột Tồn Kho Minh Bạch */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Thẻ 1: Tồn thực tế */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tồn Thực Tế
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
              {summaryStats.totalPhysical.toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Thẻ 2: Tồn tạm giữ */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tồn Tạm Giữ
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
              {summaryStats.totalReserved.toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        {/* Thẻ 3: Tồn khả dụng */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tồn Khả Dụng
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 tabular-nums">
              {summaryStats.totalAvailable.toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Thẻ 4: Cảnh báo đứt hàng (Click để lọc nhanh) */}
        <div
          onClick={() => handleStatusChange(selectedStatus === 'BELOW_MIN_STOCK' ? 'ALL' : 'BELOW_MIN_STOCK')}
          className={`p-4.5 rounded-2xl border shadow-xs flex items-center justify-between transition-all cursor-pointer ${
            selectedStatus === 'BELOW_MIN_STOCK'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-200 hover:shadow-sm'
          }`}
          title="Bấm để lọc các sản phẩm cảnh báo đứt hàng"
        >
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cảnh Báo Đứt Hàng
            </p>
            <p className="mt-1 text-2xl font-extrabold text-rose-600 tabular-nums">
              {totalAlertsCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── THANH TÌM KIẾM, BỘ LỌC ĐA TIÊU CHÍ & NÚT CHỨC NĂNG ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Hàng 1: Ô tìm kiếm thông minh + Các nút hành động */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Ô input tìm kiếm & nút reset bộ lọc */}
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm nhanh mã SKU hoặc tên sản phẩm..."
                className="w-full pl-10 pr-9 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 hover:bg-white focus:bg-white transition-all placeholder-slate-400 shadow-2xs"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                    setCurrentPage(1);
                    updateUrlParams({ search: '', page: 1 });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                  title="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Nút reset bộ lọc khi có điều kiện lọc đang kích hoạt */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs"
                title="Đặt lại toàn bộ bộ lọc về mặc định"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          {/* Nhóm nút hành động: Xuất Excel & Làm mới */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || loading}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-2xs shadow-emerald-600/20 whitespace-nowrap"
              title="Xuất báo cáo tồn kho ra tệp Excel (.xlsx) chuẩn gửi kế toán"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${exportingExcel ? 'animate-bounce' : ''}`} />
              <span>{exportingExcel ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>

            <button
              type="button"
              onClick={fetchStockData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-2xs whitespace-nowrap"
              title="Làm mới tồn kho"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Hàng 2: Grid 3 dropdown bộ lọc chia đều cân xứng, rộng rãi, không bị co lại */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Bộ lọc:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
            {/* 1. Lọc theo Kho hàng */}
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedWarehouse}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                aria-label="Lọc theo kho hàng"
                className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-7 py-2.5 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all truncate shadow-2xs"
              >
                <option value="ALL">Tất cả kho hàng</option>
                {warehousesList.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.displayName || wh.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Lọc theo Nhóm hàng */}
            <div className="relative">
              <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                aria-label="Lọc theo nhóm hàng"
                className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-7 py-2.5 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all truncate shadow-2xs"
              >
                <option value="ALL">Tất cả nhóm hàng</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Lọc theo Trạng thái tồn kho */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value as StockStatusType | 'ALL')}
                aria-label="Lọc theo trạng thái tồn"
                className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-7 py-2.5 bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all truncate shadow-2xs"
              >
                <option value="ALL">Tất cả trạng thái tồn</option>
                <option value="BELOW_MIN_STOCK">Dưới tồn tối thiểu</option>
                <option value="IN_STOCK">Còn hàng</option>
                <option value="OUT_OF_STOCK">Hết hàng (Tồn khả dụng = 0)</option>
                <option value="DAMAGED">Sản phẩm lỗi</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bảng Danh Sách Sổ Tồn Kho: Dạng Thẻ trên Mobile, Dạng Bảng trên Desktop */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* 1. GIAO DIỆN MOBILE (< 768px): Card View trực quan, 0% cuộn ngang */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-3.5 space-y-3 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-4 bg-slate-200 rounded w-28"></div>
                </div>
                <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="h-12 bg-slate-100 rounded-lg"></div>
                  <div className="h-12 bg-slate-100 rounded-lg"></div>
                  <div className="h-12 bg-slate-100 rounded-lg"></div>
                </div>
              </div>
            ))
          ) : stockItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700 text-sm">
                {selectedWarehouse !== 'ALL'
                  ? 'Kho hàng này hiện chưa có sản phẩm nào'
                  : 'Không tìm thấy sản phẩm tồn kho nào'}
              </p>
            </div>
          ) : (
            paginatedItems.map((item) => {
              const baseUnit = item.baseUnit;
              const itemKey = `m-${item.sku}-${item.warehouseId || item.warehouse}`;
              const isBelowMin = item.isBelowMinStock;
              const isOutOfStock = item.availableStock <= 0;

              return (
                <div key={itemKey} className="p-3.5 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                  {/* Hàng 1: SKU badge + Kho bãi */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      {item.sku}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.warehouse || 'Kho hàng'}</span>
                    </span>
                  </div>

                  {/* Hàng 2: Tên sản phẩm */}
                  <button
                    type="button"
                    onClick={() => handleOpenConversionModal(item)}
                    className="text-left font-bold text-slate-900 text-base leading-snug hover:text-indigo-600 transition-colors block cursor-pointer break-words"
                  >
                    {item.name}
                  </button>

                  {/* Hàng 3: Khối 3 cột tồn kho trực quan */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Tồn thực tế</span>
                      <span className="text-sm font-extrabold text-slate-800 font-mono block mt-0.5">
                        {item.physicalStock.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{baseUnit}</span>
                    </div>

                    <div className="border-x border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Tạm giữ</span>
                      <span className="text-sm font-extrabold text-amber-700 font-mono block mt-0.5">
                        {item.reservedStock.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{baseUnit}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Khả dụng</span>
                      <span
                        className={`text-sm font-extrabold font-mono block mt-0.5 ${
                          isOutOfStock ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {item.availableStock.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{baseUnit}</span>
                    </div>
                  </div>

                  {/* Cảnh báo dưới tồn tối thiểu nếu có */}
                  {isBelowMin && (
                    <div className="flex items-center gap-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>
                        Dưới tồn tối thiểu: {item.availableStock.toLocaleString('vi-VN')} / {item.minStockLevel?.toLocaleString('vi-VN')} {baseUnit}
                      </span>
                    </div>
                  )}

                  {/* Hàng 4: Nhóm nút thao tác lớn (>= 44px touch target) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/warehouse/cards?sku=${item.sku}&warehouseId=${item.warehouseId || ''}`)}
                      className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span>Xem thẻ kho</span>
                    </button>

                    {canEditMinStock ? (
                      <button
                        type="button"
                        onClick={() => handleOpenMinStockModal(item)}
                        className="min-h-[44px] px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 active:bg-indigo-200 text-xs font-semibold text-indigo-700 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                        <span>Sửa tồn min</span>
                      </button>
                    ) : canAdjustStock ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustModal(item)}
                        className="min-h-[44px] px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 active:bg-emerald-200 text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                        <span>Điều chỉnh</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenConversionModal(item)}
                        className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span>Quy đổi ĐVT</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 2. GIAO DIỆN DESKTOP (>= 768px): Bảng Danh Sách 6 Cột */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm divide-y divide-slate-100">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-[30%]">
                  Sản Phẩm &amp; SKU
                </th>
                <th className="px-4 py-3 text-left w-[20%]">
                  Kho Bãi
                </th>
                {selectedStatus === 'DAMAGED' ? (
                  <>
                    <th className="px-4 py-3 text-left w-[20%]">
                      Số Lô
                    </th>
                    <th className="px-4 py-3 text-right w-[18%] text-amber-600">
                      SL Lỗi
                    </th>
                  </>
                ) : selectedStatus === 'BELOW_MIN_STOCK' ? (
                  <>
                    <th className="px-4 py-3 text-right w-[13%]">
                      Tồn Khả Dụng
                    </th>
                    <th className="px-4 py-3 text-right w-[13%]">
                      Tồn Tối Thiểu
                    </th>
                    <th className="px-4 py-3 text-right w-[14%] text-rose-600">
                      Thiếu Hụt
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-right w-[13%]">
                      Tồn Thực Tế
                    </th>
                    <th className="px-4 py-3 text-right w-[13%]">
                      Tồn Tạm Giữ
                    </th>
                    <th className="px-4 py-3 text-right w-[14%]">
                      Tồn Khả Dụng
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-right w-[10%] min-w-[105px]">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3.5">
                      <div className="h-4 bg-slate-200 rounded w-40 mb-2"></div>
                      <div className="h-3 bg-slate-100 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-slate-100 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-4 bg-slate-200 rounded w-20 ml-auto"></div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-7 bg-slate-200 rounded-lg w-20 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : stockItems.length === 0 ? (
                <tr>
                  <td colSpan={selectedStatus === 'DAMAGED' ? 5 : 6} className="py-12 text-center text-slate-400">
                    <Boxes className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-base">
                      {selectedStatus === 'DAMAGED'
                        ? 'Không có sản phẩm lỗi nào tại kho đã chọn'
                        : selectedWarehouse !== 'ALL'
                        ? 'Kho hàng này hiện chưa có sản phẩm nào'
                        : 'Không tìm thấy sản phẩm tồn kho nào'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {selectedStatus === 'DAMAGED'
                        ? 'Tất cả sản phẩm tại kho đều đạt chuẩn chất lượng hoặc đã được xử lý hết.'
                        : 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-xs text-indigo-600 hover:underline font-medium cursor-pointer inline-block mt-2.5"
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const baseUnit = item.baseUnit;
                  const itemKey = `${item.sku}-${item.warehouseId || item.warehouse}`;

                  return (
                    <tr
                      key={itemKey}
                      className="hover:bg-indigo-50/25 transition-colors group"
                    >
                      {/* 1. Sản Phẩm & SKU */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start">
                          <button
                            type="button"
                            onClick={() => handleOpenConversionModal(item)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/60 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs group-hover:border-indigo-300"
                            title={`Xem chi tiết sản phẩm ${item.sku}`}
                          >
                            <Boxes className="w-3 h-3 text-indigo-500 group-hover:text-indigo-700 transition-colors" />
                            <span>{item.sku}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenConversionModal(item)}
                            className="text-left font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-1 text-sm block mt-1.5 cursor-pointer"
                            title={item.name}
                          >
                            {item.name}
                          </button>
                        </div>
                      </td>

                      {/* 2. Kho Bãi */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{item.warehouse}</span>
                        </div>
                      </td>

                      {selectedStatus === 'DAMAGED' ? (
                        <>
                          {/* 3. Số Lô */}
                          <td className="px-4 py-3.5 text-left whitespace-nowrap">
                            {item.batchNumber ? (
                              <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {item.batchNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Không có mã lô</span>
                            )}
                          </td>

                          {/* 4. SL Lỗi */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-amber-600 tabular-nums text-sm">
                              {(item.damagedQuantity || item.physicalStock || 0).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs font-medium text-amber-600 ml-1">{baseUnit}</span>
                          </td>
                        </>
                      ) : selectedStatus === 'BELOW_MIN_STOCK' ? (
                        <>
                          {/* 3. Tồn Khả Dụng (Khi ở bộ lọc Dưới tồn tối thiểu: màu đen bình thường, ví dụ: 102 Túi) */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900 tabular-nums text-sm">
                              {item.availableStock.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs font-normal text-slate-900 ml-1">{baseUnit}</span>
                          </td>

                          {/* 4. Mức Tồn Tối Thiểu (Chỉ hiển thị mức quy định, không chỉnh sửa, màu đen) */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <span className="font-semibold text-slate-900 tabular-nums text-sm">
                              {(item.minStockLevel || 0).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs font-normal text-slate-900 ml-1">{baseUnit}</span>
                          </td>

                          {/* 5. Thiếu Hụt (Hiển thị số lượng thiếu hụt, màu đỏ, ví dụ: 298 Túi) */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-rose-600 tabular-nums text-sm">
                              {Math.max(0, (item.minStockLevel || 0) - item.availableStock).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs font-semibold text-rose-600 ml-1">{baseUnit}</span>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* 3. Tồn Thực Tế */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900 tabular-nums text-sm">
                              {item.physicalStock.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs font-normal text-slate-500 ml-1">{baseUnit}</span>
                          </td>

                          {/* 4. Tồn Tạm Giữ */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            {item.reservedStock > 0 ? (
                              <span className="inline-flex items-center justify-end gap-1 font-semibold text-amber-700 tabular-nums text-sm">
                                <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>{item.reservedStock.toLocaleString('vi-VN')}</span>
                                <span className="text-xs font-normal text-slate-500 ml-0.5">{baseUnit}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs font-normal">0 {baseUnit}</span>
                            )}
                          </td>

                          {/* 5. Tồn Khả Dụng */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900 tabular-nums text-sm">
                              {item.availableStock.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs font-normal text-slate-500 ml-1">{baseUnit}</span>
                          </td>
                        </>
                      )}

                      {/* 6. Thao Tác (Nếu là hàng lỗi: Nút Xử lý, bình thường: Menu Thao tác) */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {selectedStatus === 'DAMAGED' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenProcessDamagedModal(item)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                            title="Xử lý sản phẩm lỗi"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Xử lý</span>
                          </button>
                        ) : (
                          <div className="relative inline-flex items-center justify-end inventory-action-dropdown-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openActionMenuKey === itemKey) {
                                  setOpenActionMenuKey(null);
                                  setActionMenuAnchor(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const shouldDropUp = spaceBelow < 250 && rect.top > 250;
                                  setActionMenuAnchor({
                                    top: shouldDropUp ? rect.top - 4 : rect.bottom + 4,
                                    right: window.innerWidth - rect.right,
                                    isDropUp: shouldDropUp,
                                  });
                                  setOpenActionMenuKey(itemKey);
                                }
                              }}
                              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none whitespace-nowrap shrink-0 ${
                                openActionMenuKey === itemKey
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-500/10'
                                  : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300'
                              }`}
                              title="Thao tác"
                            >
                              <span className="whitespace-nowrap">Thao tác</span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                                  openActionMenuKey === itemKey ? 'rotate-180 text-indigo-600' : ''
                                }`}
                              />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── THANH PHÂN TRANG GẮN LIỀN CHÂN BẢNG (CHUẨN HỆ THỐNG) ── */}
        {stockItems.length > 0 && (
          <Pagination
            variant="default"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={stockItems.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            itemLabel="sản phẩm"
            showRecordRange={false}
            showFirstLast={false}
            onPageChange={(page) => handlePageChange(page)}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      {/* Dropdown Menu Portal Thao tác */}
      {openActionMenuKey && actionMenuAnchor && typeof document !== 'undefined' && (() => {
        const item = stockItems.find(
          (it) => `${it.sku}-${it.warehouseId || it.warehouse}` === openActionMenuKey,
        );
        if (!item) return null;
        return createPortal(
          <div
            className="inventory-action-portal-menu fixed w-52 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-[9999] animate-in fade-in zoom-in-95 text-left divide-y divide-slate-100"
            style={{
              top: actionMenuAnchor.isDropUp ? undefined : `${actionMenuAnchor.top}px`,
              bottom: actionMenuAnchor.isDropUp
                ? `${window.innerHeight - actionMenuAnchor.top}px`
                : undefined,
              right: `${actionMenuAnchor.right}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {/* 1. Xem chi tiết (Có ở tất cả các bộ lọc) */}
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuKey(null);
                  setActionMenuAnchor(null);
                  handleOpenConversionModal(item);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-400" />
                <span>Xem chi tiết</span>
              </button>

              {/* 2. Xem thẻ kho hàng hóa (SN-185) */}
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuKey(null);
                  setActionMenuAnchor(null);
                  navigate(`/inventory/stock-card?sku=${encodeURIComponent(item.sku)}&warehouse=${encodeURIComponent(item.warehouse)}`);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                <span>Xem thẻ kho</span>
              </button>

              {/* 3. Điều chỉnh tồn tối thiểu:
                     - Ẩn nếu chỉ đứng ở bộ lọc "Tất cả kho hàng" (và không chọn Dưới tồn tối thiểu)
                     - Hiển thị nếu đứng ở kho cụ thể HOẶC khi đứng ở cả "Tất cả kho hàng" và "Dưới tồn tối thiểu"
              */}
              {canEditMinStock && (selectedWarehouse !== 'ALL' || selectedStatus === 'BELOW_MIN_STOCK') && (
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuKey(null);
                    setActionMenuAnchor(null);
                    handleOpenMinStockModal(item);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                  <span>Điều chỉnh tồn tối thiểu</span>
                </button>
              )}
            </div>

            {/* 3. Điều chỉnh kho / Sổ kho */}
            {canAdjustStock && (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuKey(null);
                    setActionMenuAnchor(null);
                    handleOpenAdjustModal(item);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <PackagePlus className="w-4 h-4 text-indigo-600" />
                  <span>Điều chỉnh / Sổ kho</span>
                </button>
              </div>
            )}

            {/* 4. Xóa sản phẩm khỏi kho (Chỉ Admin và Quản lý kho) */}
            {(isAdmin || isManager) && (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuKey(null);
                    setActionMenuAnchor(null);
                    handleOpenDeleteProductModal(item);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Xóa sản phẩm khỏi kho</span>
                </button>
              </div>
            )}
          </div>,
          document.body,
        );
      })()}

      {/* MODAL 1: BẢNG TRA CỨU QUY ĐỔI ĐƠN VỊ & CHI TIẾT TỒN KHO */}
      <ModalLayout
        isOpen={conversionModalOpen}
        onClose={() => setConversionModalOpen(false)}
        title={`Chi Tiết Tồn Kho & Quy Đổi Đơn Vị — ${selectedItemForConversion?.sku || ''}`}
        maxWidth="max-w-xl"
      >
        {selectedItemForConversion && (
          <div className="space-y-6 p-1">
            {/* Thẻ Thông tin sản phẩm */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{selectedItemForConversion.name}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>
                    Kho: <strong className="text-slate-700">{selectedItemForConversion.warehouse}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    ĐVT Cơ sở: <strong className="text-slate-700">{selectedItemForConversion.baseUnit}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Khối 3 cột tồn minh bạch */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-center">
                <p className="text-xs text-blue-600 font-medium">Tồn Thực Tế</p>
                <p className="text-lg font-bold text-blue-900 mt-1">
                  {selectedItemForConversion.physicalStock.toLocaleString('vi-VN')}
                </p>
                <p className="text-[11px] text-blue-600/80">{selectedItemForConversion.baseUnit}</p>
              </div>

              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-center">
                <p className="text-xs text-amber-600 font-medium">Tồn Tạm Giữ</p>
                <p className="text-lg font-bold text-amber-900 mt-1">
                  {selectedItemForConversion.reservedStock.toLocaleString('vi-VN')}
                </p>
                <p className="text-[11px] text-amber-600/80">{selectedItemForConversion.baseUnit}</p>
              </div>

              <div className="bg-emerald-100/70 p-3 rounded-xl border border-emerald-200 text-center shadow-xs">
                <p className="text-xs text-emerald-800 font-bold uppercase whitespace-nowrap">Tồn Khả Thi</p>
                <p className="text-[10px] text-emerald-700 font-medium normal-case">(Có thể bán)</p>
                <p className="text-xl font-extrabold text-emerald-950 mt-1">
                  {selectedItemForConversion.availableStock.toLocaleString('vi-VN')}
                </p>
                <p className="text-[11px] text-emerald-800 font-semibold">{selectedItemForConversion.baseUnit}</p>
              </div>
            </div>

            {/* Bảng Quy đổi Đơn vị bán hàng sỉ (Thùng / Lốc / Lon) */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                <span>Số Lượng Bán Được Quy Đổi Theo Đơn Vị Giao Hàng</span>
              </h3>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {/* Dòng đơn vị cơ sở */}
                <div className="p-3.5 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span className="font-semibold text-slate-800 text-sm">
                      {selectedItemForConversion.baseUnit} (Đơn vị cơ sở)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-emerald-700">
                      {selectedItemForConversion.availableStock.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{selectedItemForConversion.baseUnit}</span>
                  </div>
                </div>

                {/* Các đơn vị quy đổi khác (Thùng, Lốc...) */}
                {selectedItemForConversion.units && selectedItemForConversion.units.length > 0 ? (
                  selectedItemForConversion.units
                    .filter((u) => !u.isBaseUnit && u.conversionRate > 1)
                    .map((unit: ProductUnit) => {
                      const convertedAvailable = Math.floor(
                        selectedItemForConversion.availableStock / unit.conversionRate
                      );
                      const remainderBase =
                        selectedItemForConversion.availableStock % unit.conversionRate;

                      return (
                        <div key={unit.unitName} className="p-3.5 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800 text-sm">
                              {unit.unitName}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">
                              (1 {unit.unitName} = {unit.conversionRate} {selectedItemForConversion.baseUnit})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-indigo-700">
                              {convertedAvailable.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs font-medium text-slate-600 ml-1">{unit.unitName}</span>
                            {remainderBase > 0 && (
                              <p className="text-[11px] text-slate-400">
                                Dư lẻ: {remainderBase} {selectedItemForConversion.baseUnit}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Sản phẩm này chưa khai báo đơn vị quy đổi đa cấp (Chỉ bán theo ĐVT cơ sở)
                  </div>
                )}
              </div>
            </div>

            {/* Nút đóng */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setConversionModalOpen(false)}
                className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Đóng tra cứu
              </button>
            </div>
          </div>
        )}
      </ModalLayout>

      {/* MODAL 2: GHI SỔ KHO & ĐIỀU CHỈNH TỒN KHO THEO SẢN PHẨM */}
      <ModalLayout
        isOpen={adjustModalOpen && Boolean(selectedItemForAdjust)}
        onClose={() => setAdjustModalOpen(false)}
        title={`Ghi Sổ Kho & Điều Chỉnh — ${selectedItemForAdjust?.sku || ''}`}
        maxWidth="max-w-lg"
      >
        {currentAdjustProduct && (
          <form onSubmit={handleSubmitAdjustment} className="space-y-4 p-1">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>
                Sản phẩm: <strong className="text-slate-900">{currentAdjustProduct.name}</strong> ({currentAdjustProduct.sku})
              </p>
              <p>
                Tồn khả thi hiện tại:{' '}
                <strong className="text-emerald-700">
                  {currentAdjustProduct.availableStock} {currentAdjustProduct.baseUnit}
                </strong>
                {selectedWarehouse !== 'ALL' && (
                  <span className="text-slate-500 ml-1">
                    (tại {warehousesList.find((w) => w.id === selectedWarehouse)?.displayName || currentAdjustProduct.warehouse})
                  </span>
                )}
                {selectedWarehouse === 'ALL' && (
                  <span className="text-slate-500 ml-1">(Tổng toàn bộ các kho)</span>
                )}
              </p>
            </div>

            {/* Kho áp dụng điều chỉnh */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Kho áp dụng <span className="text-rose-500">*</span>
                </label>
                {isKeeper && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium border border-amber-200">
                    Cố định theo quyền thủ kho (1 - 1)
                  </span>
                )}
              </div>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={adjustWarehouseId}
                  onChange={(e) => setAdjustWarehouseId(e.target.value)}
                  disabled={isKeeper}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                  required
                >
                  {adjustWarehouseOptions.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.displayName || wh.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Biến động số lượng sẽ được ghi nhận trực tiếp vào số dư tồn kho của kho này.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loại nghiệp vụ</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as 'IMPORT' | 'EXPORT')}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="IMPORT">Nhập kho (+)</option>
                  <option value="EXPORT">Xuất kho (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị nhập/xuất</label>
                <select
                  value={adjustUnit || currentAdjustProduct.baseUnit}
                  onChange={(e) => setAdjustUnit(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value={currentAdjustProduct.baseUnit}>
                    {currentAdjustProduct.baseUnit} (Cơ sở)
                  </option>
                  {currentAdjustProduct.units
                    ?.filter((u: any) => !u.isBaseUnit)
                    .map((u: any) => (
                      <option key={u.unitName} value={u.unitName}>
                        {u.unitName} (1 {u.unitName} = {u.conversionRate} {currentAdjustProduct.baseUnit})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng biến động</label>
              <input
                type="number"
                min="1"
                value={adjustQuantity || ''}
                onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                placeholder="Nhập số lượng..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã chứng từ / Phiếu kho</label>
              <input
                type="text"
                value={adjustRefCode}
                onChange={(e) => setAdjustRefCode(e.target.value)}
                placeholder="Ví dụ: PNK-2026-0891"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do điều chỉnh</label>
              <textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ghi rõ lý do nhập/xuất kho..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmittingAdjust}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingAdjust && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Xác nhận ghi sổ kho</span>
              </button>
            </div>
          </form>
        )}
      </ModalLayout>

      {/* Modal Khai Báo & Chỉnh Sửa Tồn Tối Thiểu (SN-183) */}
      {editingMinStockItem && (
        <MinStockModal
          item={editingMinStockItem}
          onClose={() => setEditingMinStockItem(null)}
          onSave={handleSaveMinStock}
        />
      )}

      {/* Modal Xác nhận xóa sản phẩm khỏi kho */}
      {deleteProductModalOpen && productToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            {/* Header */}
            <div className="p-6 pb-4 flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  productToDelete.hasStock
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-amber-50 border-amber-200 text-amber-600'
                }`}
              >
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  {productToDelete.hasStock
                    ? 'Không thể xóa sản phẩm khỏi kho'
                    : 'Xác nhận xóa sản phẩm khỏi kho'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kho áp dụng: <strong className="text-slate-800">{productToDelete.targetWarehouseName}</strong>
                </p>
              </div>
            </div>

            {/* Thông tin sản phẩm */}
            <div className="px-6 py-3 bg-slate-50/80 border-y border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã SKU:</span>
                <span className="font-mono font-bold text-slate-800">{productToDelete.item.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tên sản phẩm:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[220px]">
                  {productToDelete.item.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tồn thực tế:</span>
                <span className="font-bold text-slate-800">
                  {productToDelete.item.physicalStock} {productToDelete.item.baseUnit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tồn tạm giữ (khách):</span>
                <span className="font-bold text-amber-600">
                  {productToDelete.item.reservedStock} {productToDelete.item.baseUnit}
                </span>
              </div>
            </div>

            {/* Cảnh báo chi tiết */}
            <div className="p-6 pt-4 space-y-4">
              {productToDelete.hasStock ? (
                /* TH1: Vẫn còn tồn kho hoặc giữ tồn khách */
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-rose-900">
                    ❌ Không được phép xóa!
                  </p>
                  <p className="text-[11px] leading-relaxed text-rose-700">
                    Sản phẩm hiện vẫn còn tồn kho tại kho này (Tồn thực tế: {productToDelete.item.physicalStock}, Tạm giữ cho khách: {productToDelete.item.reservedStock}).
                  </p>
                  <p className="text-[11px] leading-relaxed text-rose-600">
                    Ràng buộc hệ thống: Bạn phải xuất kho hoặc điều chuyển hết mọi loại tồn về 0 trước khi có thể xóa sản phẩm khỏi kho này.
                  </p>
                </div>
              ) : (
                /* TH2: Hết mọi loại tồn = 0 */
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    ⚠️ Xác nhận xóa sản phẩm khỏi kho
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-700">
                    Sản phẩm đã hết mọi loại tồn (Tồn thực tế = 0, Tồn tạm giữ = 0).
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Sau khi xóa, sản phẩm này sẽ không còn xuất hiện trong danh mục và sổ kho của <strong>{productToDelete.targetWarehouseName}</strong>.
                  </p>
                </div>
              )}

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingProduct}
                  onClick={() => {
                    setDeleteProductModalOpen(false);
                    setProductToDelete(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {productToDelete.hasStock ? 'Đã hiểu' : 'Hủy bỏ'}
                </button>

                {!productToDelete.hasStock && (
                  <button
                    type="button"
                    disabled={isDeletingProduct}
                    onClick={() => void handleConfirmDeleteProduct()}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingProduct ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang xóa...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        <span>Xác nhận xóa khỏi kho</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xử lý sản phẩm lỗi */}
      {processDamagedModalOpen && damagedItemToProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/50">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Xử lý sản phẩm lỗi
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chuyển vào kho bán hàng hoặc tiêu hủy sản phẩm lỗi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProcessDamagedModalOpen(false);
                  setDamagedItemToProcess(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chi tiết sản phẩm lỗi */}
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Sản phẩm:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[260px]">
                  {damagedItemToProcess.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Mã SKU:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                  {damagedItemToProcess.sku}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Kho bãi tiếp nhận:</span>
                <span className="font-semibold text-slate-700">
                  {damagedItemToProcess.warehouse}
                </span>
              </div>
              {damagedItemToProcess.batchNumber ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Số lô hàng:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {damagedItemToProcess.batchNumber}
                    </span>
                  </div>
                  {damagedItemToProcess.expiryDate ? (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Hạn sử dụng (HSD):</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(damagedItemToProcess.expiryDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Số lượng lỗi hiện tại:</span>
                <span className="font-bold text-amber-600 text-sm">
                  {(damagedItemToProcess.damagedQuantity || damagedItemToProcess.physicalStock || 0).toLocaleString('vi-VN')} {damagedItemToProcess.baseUnit}
                </span>
              </div>
            </div>

            {/* Form thao tác */}
            <div className="p-6 space-y-4">
              {/* Chọn nghiệp vụ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chọn nghiệp vụ xử lý *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDamagedAction('TO_STOCK')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      damagedAction === 'TO_STOCK'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                        Đưa sang tồn kho
                      </span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          damagedAction === 'TO_STOCK'
                            ? 'border-indigo-600 bg-indigo-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {damagedAction === 'TO_STOCK' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">
                      Cộng vào kho bán hàng & ghi tăng sổ kho
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDamagedAction('DESTROY')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      damagedAction === 'DESTROY'
                        ? 'border-rose-600 bg-rose-50/70 text-rose-900 ring-2 ring-rose-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        Tiêu hủy
                      </span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          damagedAction === 'DESTROY'
                            ? 'border-rose-600 bg-rose-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {damagedAction === 'DESTROY' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">
                      Xuất hủy hàng hỏng & ghi giảm tồn lỗi
                    </span>
                  </button>
                </div>
              </div>

              {/* Nhập số lượng */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Số lượng xử lý *
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Tối đa: <strong className="text-slate-800">{(damagedItemToProcess.damagedQuantity || damagedItemToProcess.physicalStock || 0)} {damagedItemToProcess.baseUnit}</strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={damagedItemToProcess.damagedQuantity || damagedItemToProcess.physicalStock || 1}
                    value={damagedProcessQty === 0 ? '' : damagedProcessQty}
                    onChange={(e) => {
                      const val = e.target.value;
                      const maxQty = Number(damagedItemToProcess.damagedQuantity || damagedItemToProcess.physicalStock || 1);
                      if (val === '') {
                        setDamagedProcessQty(0);
                      } else {
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                          setDamagedProcessQty(Math.min(maxQty, Math.max(0, num)));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold tabular-nums pr-16"
                    placeholder="Nhập số lượng..."
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500">
                      {damagedItemToProcess.baseUnit}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDamagedProcessQty(Number(damagedItemToProcess.damagedQuantity || damagedItemToProcess.physicalStock || 1))}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition-colors"
                    >
                      Tất cả
                    </button>
                  </div>
                </div>
              </div>

              {/* Nhập lý do */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lý do xử lý *
                </label>
                <textarea
                  rows={3}
                  value={damagedProcessReason}
                  onChange={(e) => setDamagedProcessReason(e.target.value)}
                  placeholder={
                    damagedAction === 'TO_STOCK'
                      ? 'Ví dụ: Hàng đã sửa chữa, đóng gói lại đạt tiêu chuẩn xuất bán...'
                      : 'Ví dụ: Hàng móp vỡ, hư hỏng nặng không thể tái sử dụng, lập biên bản tiêu hủy...'
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessingDamaged}
                  onClick={() => {
                    setProcessDamagedModalOpen(false);
                    setDamagedItemToProcess(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  disabled={isProcessingDamaged || damagedProcessQty <= 0 || !damagedProcessReason.trim()}
                  onClick={() => void handleConfirmProcessDamaged()}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                    damagedAction === 'TO_STOCK'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isProcessingDamaged ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      {damagedAction === 'TO_STOCK' ? (
                        <Boxes size={14} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      <span>
                        {damagedAction === 'TO_STOCK'
                          ? 'Đưa sang tồn kho'
                          : 'Xác nhận tiêu hủy'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
