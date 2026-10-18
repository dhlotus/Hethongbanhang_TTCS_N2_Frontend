import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Pagination } from '../components/pagination';
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Warehouse,
  Boxes,
  X,
  Edit2,
  Trash2,
  Eye,
  FolderTree,
  FileText,
  BookOpen,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { getStoredUser } from '../utils/navigation';
import { STANDARD_WAREHOUSES } from '../constants/warehouse.constants';
import { productsService, PRODUCT_CATEGORIES } from '../services/products.service';
import { categoriesService } from '../services/categories.service';
import { inventoryService } from '../services/inventory.service';
import { ProductFormModal } from '../components/product-form-modal';
import { ProductDetailModal } from '../components/product-detail-modal';
import { ImportProductsModal } from '../components/import-products-modal';
import { ProductPriceHistoryModal } from '../components/product-price-history-modal';
import { showToast } from '../components/toast';
import { ProductsTableSkeleton, ProductsMobileCardSkeleton } from '../components/skeletons';
import type {
  Product,
  ProductStatus,
  ProductCategory,
  AdjustStockPayload,
  CreateProductPayload,
  InventoryTransaction,
} from '../types/products';

// ──────────────────────────────────────────────────────────────────────────
// QUERY PARAM MAPPINGS CHO DANH MỤC SẢN PHẨM (URL STATE MANAGEMENT)
// ──────────────────────────────────────────────────────────────────────────

const STATUS_TO_PARAM: Record<ProductStatus, string> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const PARAM_TO_STATUS: Record<string, ProductStatus> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
};

const parseStatusParam = (param: string | null): ProductStatus | 'ALL' => {
  if (!param) return 'ALL';
  const lower = param.toLowerCase().trim();
  return PARAM_TO_STATUS[lower] || 'ALL';
};

/**
 * Tạo slug chuẩn cho Nhóm hàng Cấp 1 để hiển thị đẹp trên URL (ví dụ c1_milk)
 */
const getCategoryParamSlug = (cat: ProductCategory): string => {
  if (cat.code) {
    return `c1_${cat.code.toLowerCase().replace(/-/g, '_')}`;
  }
  if (cat.id) {
    return cat.id.replace(/^cat-/, 'c1_').replace(/-/g, '_');
  }
  return cat.name;
};

/**
 * Phân tích và truy vết nhóm hàng từ param `category` hoặc `categoryId`
 */
const resolveCategoryFromParam = (
  paramVal: string | null,
  categories: ProductCategory[]
): { parentCategory: string; subCategory: string; categoryId: string } | null => {
  if (!paramVal || paramVal === 'ALL') return null;
  const raw = paramVal.trim();
  const lower = raw.toLowerCase();
  const clean = lower.replace(/^c1_|^c2_|^cat-/, '').replace(/-/g, '_');

  for (const c1 of categories) {
    const c1Code = (c1.code || '').toLowerCase().replace(/-/g, '_');
    const c1Id = (c1.id || '').toLowerCase().replace(/^cat-/, '').replace(/-/g, '_');
    const c1Name = c1.name.toLowerCase();

    // Khớp Cấp 1
    if (
      lower === c1.id.toLowerCase() ||
      lower === (c1.code || '').toLowerCase() ||
      lower === `c1_${c1Code}` ||
      clean === c1Code ||
      clean === c1Id ||
      lower === c1Name ||
      raw === c1.name
    ) {
      return { parentCategory: c1.name, subCategory: 'ALL', categoryId: c1.id };
    }

    // Khớp Cấp 2
    for (const c2 of c1.subCategories || c1.children || []) {
      const c2Code = (c2.code || '').toLowerCase().replace(/-/g, '_');
      const c2Id = (c2.id || '').toLowerCase().replace(/^cat-/, '').replace(/-/g, '_');
      const c2Name = c2.name.toLowerCase();

      if (
        lower === c2.id.toLowerCase() ||
        lower === (c2.code || '').toLowerCase() ||
        clean === c2Code ||
        clean === c2Id ||
        clean === `${c1Code}_${c2Code}` ||
        lower === c2Name ||
        raw === c2.name
      ) {
        return { parentCategory: c1.name, subCategory: c2.name, categoryId: c2.id };
      }
    }
  }

  return null;
};

/**
 * Phân tích nhóm hàng Cấp 2 từ param `subCategory`
 */
const resolveSubCategoryFromParam = (
  subParamVal: string | null,
  parentName: string,
  categories: ProductCategory[]
): string => {
  if (!subParamVal || subParamVal === 'ALL') return 'ALL';
  const parent = categories.find((c) => c.name === parentName);
  if (!parent) return 'ALL';

  const raw = subParamVal.trim();
  const lower = raw.toLowerCase();
  const clean = lower.replace(/^c2_|^cat-/, '').replace(/-/g, '_');

  for (const sub of parent.subCategories || parent.children || []) {
    const subCode = (sub.code || '').toLowerCase().replace(/-/g, '_');
    const subId = (sub.id || '').toLowerCase().replace(/^cat-/, '').replace(/-/g, '_');
    if (
      lower === sub.id.toLowerCase() ||
      lower === (sub.code || '').toLowerCase() ||
      clean === subCode ||
      clean === subId ||
      lower === sub.name.toLowerCase() ||
      raw === sub.name
    ) {
      return sub.name;
    }
  }
  return 'ALL';
};

const formatCurrency = (val?: number): string => {
  if (val === undefined || val === null) return '---';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val);
};

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  // URL Query Params & State Management
  const [searchParams, setSearchParams] = useSearchParams();

  // Khôi phục giá trị ban đầu từ URL Query Parameters
  const initialSearch = searchParams.get('search') || searchParams.get('sku') || '';
  const initialStatus = parseStatusParam(searchParams.get('status'));
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  // Suy luận nhóm hàng ban đầu từ URL
  const rawCatParam =
    searchParams.get('category') ||
    searchParams.get('categoryId') ||
    searchParams.get('parentCategory');
  const rawSubParam = searchParams.get('subCategory');

  const initialCatResolved = resolveCategoryFromParam(rawCatParam, PRODUCT_CATEGORIES);
  const initialParentCategory = initialCatResolved
    ? initialCatResolved.parentCategory
    : searchParams.get('parentCategory') || 'ALL';
  const initialSubCategory = initialCatResolved
    ? (rawSubParam
        ? resolveSubCategoryFromParam(rawSubParam, initialParentCategory, PRODUCT_CATEGORIES)
        : initialCatResolved.subCategory)
    : searchParams.get('subCategory') || 'ALL';
  const initialCategoryId = initialCatResolved
    ? initialCatResolved.categoryId
    : searchParams.get('categoryId') || 'ALL';

  // Dữ liệu sản phẩm & Phân trang
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Danh mục phân cấp động
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>(PRODUCT_CATEGORIES);

  // Bộ lọc & Tìm kiếm (Debounced)
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId);
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>(initialParentCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(initialSubCategory);
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus | 'ALL'>(initialStatus);

  // Drawer bộ lọc nâng cao cho Mobile & Tablet (< lg)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Modal Thêm / Sửa sản phẩm
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal Xác nhận xóa sản phẩm
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal Nhập từ Excel
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Modal Lịch sử thay đổi giá (SN-29)
  const [priceHistoryModalOpen, setPriceHistoryModalOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<{
    id: string;
    name: string;
    sku?: string;
    price?: number;
  } | null>(null);

  const handleOpenPriceHistory = (product: Product) => {
    setSelectedProductForHistory({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
    });
    setPriceHistoryModalOpen(true);
  };

  // Modal Điều chỉnh tồn kho (Dành cho Thủ kho / Admin - SN-23)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [adjustUnit, setAdjustUnit] = useState<string>('');
  const [quantityChange, setQuantityChange] = useState<number>(1);
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('Kiểm kê định kỳ');
  const [adjusting, setAdjusting] = useState(false);

  // Modal Sổ kho & Lịch sử quy đổi giao dịch (SN-23 AC-2 & AC-3)
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerSku, setLedgerSku] = useState<string | null>(null);
  const [ledgerTransactions, setLedgerTransactions] = useState<InventoryTransaction[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Modal Chi tiết sản phẩm
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  const handleOpenDetailModal = (product: Product) => {
    setSelectedProductForDetail(product);
    setDetailModalOpen(true);
  };

  // Xác định vai trò của người dùng hiện tại
  const user = getStoredUser();
  const userRoles = user?.roles || [];

  // 1. Phân quyền xem Giá vốn & Biên lợi nhuận (Chỉ ADMIN & Quản lý kinh doanh)
  const canViewCostPrice =
    userRoles.includes('ADMIN') ||
    userRoles.includes('SALES_MANAGER') ||
    userRoles.includes('BUSINESS_MANAGER');

  // 2. Phân quyền Thêm / Sửa / Đổi trạng thái sản phẩm (Chỉ ADMIN & Quản lý kinh doanh)
  const canManageProducts =
    userRoles.includes('ADMIN') ||
    userRoles.includes('SALES_MANAGER') ||
    userRoles.includes('BUSINESS_MANAGER');

  // 3. Phân quyền Xóa sản phẩm: Chỉ Admin và Quản lý kinh doanh
  const canDeleteProduct =
    userRoles.includes('ADMIN') ||
    userRoles.includes('SALES_MANAGER') ||
    userRoles.includes('BUSINESS_MANAGER');

  // 3. Phân quyền điều chỉnh tồn kho (Chỉ ADMIN & Nhóm vai trò kho)
  const canAdjustStock =
    userRoles.includes('ADMIN') ||
    userRoles.includes('WAREHOUSE_KEEPER') ||
    userRoles.includes('WAREHOUSE_MANAGER') ||
    userRoles.includes('WAREHOUSE') ||
    userRoles.includes('WH_MANAGER');

  const isAdmin = userRoles.includes('ADMIN');
  const isKeeper =
    (userRoles.includes('WAREHOUSE_KEEPER') ||
      userRoles.includes('WAREHOUSE')) &&
    !isAdmin;
  const isManager =
    (userRoles.includes('WAREHOUSE_MANAGER') ||
      userRoles.includes('WH_MANAGER')) &&
    !isAdmin;

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
    const match = STANDARD_WAREHOUSES.find(
      (w) =>
        w.code.toUpperCase() === rawWh ||
        w.id.toUpperCase() === rawWh ||
        w.name.toUpperCase().includes(rawWh) ||
        rawWh.includes(w.name.toUpperCase()),
    );
    return match ? match.id : STANDARD_WAREHOUSES[2].id;
  }, [user]);

  const [adjustWarehouseId, setAdjustWarehouseId] = useState<string>('');

  const adjustWarehouseOptions = useMemo(() => {
    if (isKeeper) {
      const match = STANDARD_WAREHOUSES.find((w) => w.id === keeperWarehouseId);
      return match ? [match] : [STANDARD_WAREHOUSES[2]];
    }
    if (isManager) {
      const allowedIds =
        user?.warehouseIds && user.warehouseIds.length > 0
          ? user.warehouseIds
          : user?.warehouses && user.warehouses.length > 0
          ? user.warehouses.map((w) => w.id)
          : null;
      if (allowedIds && allowedIds.length > 0) {
        const filtered = STANDARD_WAREHOUSES.filter((w) => allowedIds.includes(w.id));
        if (filtered.length > 0) return filtered;
      }
      return STANDARD_WAREHOUSES;
    }
    return STANDARD_WAREHOUSES;
  }, [isKeeper, isManager, keeperWarehouseId, user]);

  // Tải danh mục phân cấp từ Backend khi mount
  useEffect(() => {
    let isMounted = true;
    categoriesService
      .getCategoryTree()
      .then((tree) => {
        if (isMounted && Array.isArray(tree) && tree.length > 0) {
          const mapTree = (nodes: any[]): ProductCategory[] => {
            return nodes.map((n) => ({
              id: n.id,
              name: n.name,
              code: n.code,
              level: n.level,
              parentId: n.parentId || n.parent_id || null,
              productCount: n.productCount ?? n.product_count ?? 0,
              children: n.children ? mapTree(n.children) : [],
              subCategories: n.children ? mapTree(n.children) : [],
            }));
          };
          setCategoriesList(mapTree(tree));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Cập nhật query parameters an toàn lên URL mà không reload lại toàn bộ trang
  const updateUrlParams = useCallback(
    (updates: {
      parentCategory?: string;
      subCategory?: string;
      status?: ProductStatus | 'ALL';
      search?: string;
      page?: number;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          // 1. Nhóm hàng Cấp 1 (?parentCategory=... & ?category=...)
          const targetParent =
            updates.parentCategory !== undefined ? updates.parentCategory : selectedParentCategory;
          if (targetParent && targetParent !== 'ALL') {
            next.set('parentCategory', targetParent);
            const foundCat = categoriesList.find((c) => c.name === targetParent);
            if (foundCat) {
              next.set('category', getCategoryParamSlug(foundCat));
            } else {
              next.delete('category');
            }
          } else {
            next.delete('category');
            next.delete('categoryId');
            next.delete('parentCategory');
          }

          // 2. Nhóm hàng Cấp 2 (?subCategory=...)
          const targetSub =
            updates.subCategory !== undefined ? updates.subCategory : selectedSubCategory;
          if (targetParent && targetParent !== 'ALL' && targetSub && targetSub !== 'ALL') {
            next.set('subCategory', targetSub);
          } else {
            next.delete('subCategory');
          }

          // 3. Trạng thái kinh doanh (?status=active|inactive)
          const targetStatus = updates.status !== undefined ? updates.status : selectedStatus;
          if (targetStatus && targetStatus !== 'ALL' && STATUS_TO_PARAM[targetStatus]) {
            next.set('status', STATUS_TO_PARAM[targetStatus]);
          } else {
            next.delete('status');
          }

          // 4. Từ khóa tìm kiếm (?search=...)
          const targetSearch = updates.search !== undefined ? updates.search : searchTerm;
          const trimmed = targetSearch.trim();
          if (trimmed) {
            next.set('search', trimmed);
          } else {
            next.delete('search');
            next.delete('sku');
          }

          // 5. Phân trang (?page=...)
          const targetPage = updates.page !== undefined ? updates.page : page;
          if (targetPage > 1) {
            next.set('page', String(targetPage));
          } else {
            next.delete('page');
          }

          return next;
        },
        { replace: true }
      );
    },
    [
      setSearchParams,
      selectedParentCategory,
      selectedSubCategory,
      selectedStatus,
      searchTerm,
      page,
      categoriesList,
    ]
  );

  const isInitialSearchMount = useRef(true);

  // Debounce tìm kiếm 400ms để không gây giật lag và không spam URL history
  useEffect(() => {
    if (isInitialSearchMount.current) {
      isInitialSearchMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== searchTerm) {
        setSearchTerm(trimmed);
        setPage(1);
        updateUrlParams({ search: trimmed, page: 1 });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, searchTerm, updateUrlParams]);

  // Lắng nghe thay đổi của URL Search Params (khi F5, bấm link chia sẻ hoặc Back/Forward trên browser)
  useEffect(() => {
    const parentParam = searchParams.get('parentCategory');
    const subParam = searchParams.get('subCategory');
    const rawCat =
      searchParams.get('category') ||
      searchParams.get('categoryId');

    let resolvedParent = 'ALL';
    let resolvedSub = 'ALL';
    let resolvedCatId = 'ALL';

    if (parentParam && parentParam !== 'ALL') {
      resolvedParent = parentParam;
      if (subParam && subParam !== 'ALL') {
        resolvedSub = subParam;
      }
      const foundParent = categoriesList.find((c) => c.name === parentParam);
      if (foundParent) {
        resolvedCatId = foundParent.id;
        if (resolvedSub !== 'ALL') {
          const foundSub = (foundParent.subCategories || foundParent.children || []).find(
            (s) => s.name === resolvedSub
          );
          if (foundSub) resolvedCatId = foundSub.id;
        }
      }
    } else if (rawCat && rawCat !== 'ALL') {
      const resolved = resolveCategoryFromParam(rawCat, categoriesList);
      if (resolved) {
        resolvedParent = resolved.parentCategory;
        resolvedSub = subParam
          ? resolveSubCategoryFromParam(subParam, resolved.parentCategory, categoriesList)
          : resolved.subCategory;
        resolvedCatId = resolved.categoryId;
      }
    }

    if (resolvedParent !== selectedParentCategory) {
      setSelectedParentCategory(resolvedParent);
    }
    if (resolvedSub !== selectedSubCategory) {
      setSelectedSubCategory(resolvedSub);
    }
    if (resolvedCatId !== selectedCategoryId) {
      setSelectedCategoryId(resolvedCatId);
    }

    const urlStatus = parseStatusParam(searchParams.get('status'));
    if (urlStatus !== selectedStatus) {
      setSelectedStatus(urlStatus);
    }

    const urlSearch = searchParams.get('search') || searchParams.get('sku') || '';
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setSearchInput(urlSearch);
    }

    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    if (urlPage !== page) {
      setPage(urlPage);
    }
  }, [searchParams, categoriesList]);

  // Handlers thay đổi bộ lọc & phân trang
  const handleParentCategoryChange = (newParent: string) => {
    setSelectedParentCategory(newParent);
    setSelectedSubCategory('ALL');
    setSelectedCategoryId('ALL');
    setPage(1);
    updateUrlParams({ parentCategory: newParent, subCategory: 'ALL', page: 1 });
  };

  const handleSubCategoryChange = (newSub: string) => {
    setSelectedSubCategory(newSub);
    setSelectedCategoryId('ALL');
    setPage(1);
    updateUrlParams({ subCategory: newSub, page: 1 });
  };

  const handleStatusChange = (newStatus: ProductStatus | 'ALL') => {
    setSelectedStatus(newStatus);
    setPage(1);
    updateUrlParams({ status: newStatus, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams({ page: newPage });
  };

  // Danh sách Nhóm hàng Cấp 2 tương ứng theo Cấp 1 đang chọn
  const subCategoriesForFilter = useMemo(() => {
    if (selectedParentCategory === 'ALL') return [];
    const found = categoriesList.find((c) => c.name === selectedParentCategory);
    return found?.subCategories || found?.children || [];
  }, [selectedParentCategory, categoriesList]);

  // Đếm số lượng bộ lọc nâng cao đang được kích hoạt (không tính tìm kiếm văn bản)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedParentCategory !== 'ALL') count++;
    if (selectedSubCategory !== 'ALL') count++;
    if (selectedStatus !== 'ALL') count++;
    if (selectedCategoryId !== 'ALL') count++;
    return count;
  }, [selectedParentCategory, selectedSubCategory, selectedStatus, selectedCategoryId]);

  // Đặt lại toàn bộ bộ lọc về mặc định
  const handleResetFilters = useCallback(() => {
    setSelectedParentCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedStatus('ALL');
    setSelectedCategoryId('ALL');
    setSearchInput('');
    setSearchTerm('');
    setPage(1);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Tải danh sách sản phẩm từ Service
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await productsService.getProducts({
        page,
        limit,
        search: searchTerm,
        categoryId: selectedCategoryId !== 'ALL' ? selectedCategoryId : undefined,
        parentCategory: selectedParentCategory !== 'ALL' ? selectedParentCategory : undefined,
        subCategory: selectedSubCategory !== 'ALL' ? selectedSubCategory : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      });

      if ('data' in res && Array.isArray(res.data)) {
        setProducts(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } else if (Array.isArray(res)) {
        setProducts(res);
        setTotal(res.length);
        setTotalPages(Math.ceil(res.length / limit) || 1);
      }
    } catch (err: unknown) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Không thể tải danh sách sản phẩm từ máy chủ'
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    searchTerm,
    selectedCategoryId,
    selectedParentCategory,
    selectedSubCategory,
    selectedStatus,
  ]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Mở modal thêm sản phẩm mới
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormModalOpen(true);
  };

  // Chuyển hướng sang trang riêng chỉnh sửa sản phẩm thay vì mở popup
  const handleOpenEditModal = (p: Product) => {
    navigate(`/catalog/products/${p.id}/edit`);
  };

  // Xử lý submit thêm hoặc sửa sản phẩm
  const handleFormSubmit = async (payload: CreateProductPayload) => {
    try {
      if (editingProduct) {
        await productsService.updateProduct(editingProduct.id, payload);
        showToast('success', 'Cập nhật sản phẩm thành công');
      } else {
        await productsService.createProduct(payload);
        showToast('success', 'Tạo sản phẩm mới thành công');
      }
      setFormModalOpen(false);
      await loadProducts();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi lưu sản phẩm');
    }
  };

  // Mở modal xác nhận xóa
  const handlePromptDelete = (p: Product) => {
    if (!canDeleteProduct) {
      showToast('error', 'Chỉ Admin và Quản lý kinh doanh mới có quyền xóa sản phẩm.');
      return;
    }
    const currentStock = p.stockQuantity ?? 0;
    if (currentStock > 0) {
      showToast(
        'error',
        `Không thể xóa sản phẩm "${p.name}" (${p.sku}) vì kho vẫn còn tồn hàng (${currentStock} ${p.baseUnit || 'đơn vị'}). Vui lòng xuất hết tồn kho hoặc điều chỉnh về 0 trước khi xóa.`
      );
      return;
    }
    setProductToDelete(p);
    setDeleteModalOpen(true);
  };

  // Thực hiện xóa sản phẩm
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await productsService.deleteProduct(productToDelete.id);
      showToast('success', 'Xóa sản phẩm thành công');
      setDeleteModalOpen(false);
      setProductToDelete(null);
      await loadProducts();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Không thể xóa sản phẩm');
    } finally {
      setIsDeleting(false);
    }
  };

  // Mở modal điều chỉnh tồn kho (SN-23)
  const handleOpenAdjustModal = (product: Product) => {
    setSelectedProductForAdjust(product);
    setAdjustUnit(product.baseUnit || 'Lon');
    setQuantityChange(1);
    setReferenceCode(`PK-${Date.now().toString().slice(-6)}`);
    setAdjustReason('Kiểm kê thực tế tại kho');
    setAdjustWarehouseId(isKeeper ? keeperWarehouseId : adjustWarehouseOptions[0]?.id || STANDARD_WAREHOUSES[0].id);
    setAdjustModalOpen(true);
  };

  // Hệ số quy đổi của đơn vị đang chọn trong modal
  const selectedUnitRate = useMemo(() => {
    if (!selectedProductForAdjust) return 1;
    if (!adjustUnit || adjustUnit === selectedProductForAdjust.baseUnit) return 1;
    const found = selectedProductForAdjust.units?.find(
      (u) => u.unitName.toLowerCase() === adjustUnit.toLowerCase()
    );
    return found ? Number(found.conversionRate) : 1;
  }, [selectedProductForAdjust, adjustUnit]);

  // Số lượng cơ sở quy đổi tự động ghi vào sổ kho
  const baseCalculatedChange = useMemo(() => {
    return Number(quantityChange || 0) * selectedUnitRate;
  }, [quantityChange, selectedUnitRate]);

  // Submit điều chỉnh tồn kho quy về ĐVT cơ sở (SN-23 AC-2)
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;

    if (!adjustWarehouseId) {
      showToast('warning', 'Vui lòng chọn kho áp dụng điều chỉnh');
      return;
    }

    try {
      setAdjusting(true);
      const targetWarehouse = STANDARD_WAREHOUSES.find((w) => w.id === adjustWarehouseId);
      const payload: AdjustStockPayload = {
        productSku: selectedProductForAdjust.sku,
        warehouseId: adjustWarehouseId,
        warehouse_id: adjustWarehouseId,
        warehouseLocation: targetWarehouse ? targetWarehouse.name : undefined,
        quantityChange: Number(quantityChange),
        unit: adjustUnit,
        reason: adjustReason,
        referenceCode: referenceCode.trim() || undefined,
      };

      await inventoryService.adjustStock(payload);
      showToast('success', 'Điều chỉnh tồn kho thành công');
      setAdjustModalOpen(false);
      await loadProducts();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể điều chỉnh tồn kho';
      showToast('error', errMsg);
    } finally {
      setAdjusting(false);
    }
  };

  // Mở sổ kho kiểm tra bút toán quy đổi và tính bất biến (SN-23 AC-3)
  const handleOpenLedgerModal = async (sku?: string) => {
    try {
      setLedgerSku(sku || null);
      setLedgerLoading(true);
      setLedgerModalOpen(true);
      const data = await inventoryService.getTransactions(sku);
      setLedgerTransactions(data);
    } catch {
      setLedgerTransactions([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Thanh công cụ lọc, tìm kiếm & Nhóm nút hành động */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3.5">
        {/* A. MOBILE & TABLET (< lg): Chỉ hiển thị Ô tìm kiếm nhanh + Nút "Bộ lọc" mở Drawer */}
        <div className="flex items-center gap-2.5 lg:hidden">
          {/* Ô Tìm kiếm SKU / Tên / Barcode */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo SKU, tên sản phẩm, mã vạch..."
              className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium shadow-2xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                  setPage(1);
                  updateUrlParams({ search: '', page: 1 });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Xóa từ khóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Nút bấm mở Drawer Bộ lọc nâng cao */}
          <button
            type="button"
            id="mobile-filter-drawer-btn"
            onClick={() => setMobileFilterOpen(true)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs shrink-0 ${
              activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <span>Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* B. DESKTOP (>= lg): Lưới các ô lọc mở rộng ngang đầy đủ */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-3">
          {/* Ô Tìm kiếm SKU / Tên / Barcode */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo SKU, tên sản phẩm, mã vạch..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                  setPage(1);
                  updateUrlParams({ search: '', page: 1 });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Xóa từ khóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Nhóm hàng Cấp 1 (Ngành hàng) */}
          <div className="relative">
            <select
              value={selectedParentCategory}
              onChange={(e) => handleParentCategoryChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="ALL">Tất cả Nhóm Cấp 1</option>
              {categoriesList.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Nhóm hàng Cấp 2 (Chủng loại) */}
          <div className="relative">
            <select
              value={selectedSubCategory}
              onChange={(e) => handleSubCategoryChange(e.target.value)}
              disabled={selectedParentCategory === 'ALL' || subCategoriesForFilter.length === 0}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
            >
              <option value="ALL">
                {selectedParentCategory === 'ALL' ? 'Chọn Cấp 1 để lọc Cấp 2' : 'Tất cả Nhóm Cấp 2'}
              </option>
              {subCategoriesForFilter.map((sub) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Trạng thái */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value as ProductStatus | 'ALL')}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="ACTIVE">Đang kinh doanh</option>
              <option value="INACTIVE">Ngừng kinh doanh</option>
            </select>
          </div>
        </div>

        {/* Hàng công cụ hành động & thông tin kết quả (ngay dưới chân các ô lọc / tìm kiếm) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Bên trái: Thông tin tìm thấy & Filter Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-medium bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-lg text-slate-700">
              <Boxes className="h-4 w-4 text-slate-400" />
              <span>
                Tìm thấy: <strong className="text-slate-900">{total}</strong> SKU
              </span>
            </div>

            {activeFilterCount > 0 || searchTerm ? (
              <>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-medium transition-all cursor-pointer"
                  title="Đặt lại toàn bộ bộ lọc"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Đặt lại bộ lọc</span>
                </button>

                {/* Chips hiển thị trực quan các bộ lọc URL đang active */}
                {selectedParentCategory !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">
                    <span>Cấp 1: {selectedParentCategory}</span>
                    <button
                      type="button"
                      onClick={() => handleParentCategoryChange('ALL')}
                      className="hover:text-blue-900 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {selectedSubCategory !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-semibold">
                    <span>Cấp 2: {selectedSubCategory}</span>
                    <button
                      type="button"
                      onClick={() => handleSubCategoryChange('ALL')}
                      className="hover:text-indigo-900 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {selectedStatus !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
                    <span>Trạng thái: {selectedStatus === 'ACTIVE' ? 'Đang KD' : 'Ngừng KD'}</span>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('ALL')}
                      className="hover:text-amber-900 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
                    <span>Tìm: &ldquo;{searchTerm}&rdquo;</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        setSearchTerm('');
                      }}
                      className="hover:text-slate-900 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </>
            ) : null}
          </div>

          {/* Bên phải: 5 nút chức năng chính */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
            <button
              type="button"
              onClick={loadProducts}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all focus:outline-none cursor-pointer whitespace-nowrap"
              title="Làm mới dữ liệu từ server"
            >
              <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            {canManageProducts && (
              <>
                <Link
                  to="/catalog/categories"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 hover:text-indigo-800 transition-all focus:outline-none cursor-pointer whitespace-nowrap"
                  title="Mở giao diện quản lý Cây nhóm hàng đa cấp"
                >
                  <FolderTree className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                  <span>Cây nhóm hàng</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleOpenLedgerModal()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-100 hover:text-blue-800 transition-all focus:outline-none cursor-pointer whitespace-nowrap"
                  title="Xem Sổ kho & Lịch sử quy đổi giao dịch (SN-23)"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                  <span>Sổ kho quy đổi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-100 hover:text-emerald-800 transition-all focus:outline-none cursor-pointer whitespace-nowrap"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>Nhập từ Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] transition-all focus:outline-none cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>Thêm sản phẩm mới</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

          {/* 3. Dữ liệu Sản phẩm (Data Table cho Desktop & Card View thích ứng cho Mobile) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {/* A. BẢNG DỮ LIỆU CHO TABLET & DESKTOP (>=640px) */}
            <div className="hidden sm:block overflow-hidden min-h-[360px]">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[18%]" /> {/* Mã SKU kèm trạng thái */}
                  <col className="w-[45%]" /> {/* Tên sản phẩm */}
                  <col className="w-[12%]" /> {/* Tồn kho */}
                  <col className="w-[14%]" /> {/* Giá niêm yết */}
                  <col className="w-[11%]" /> {/* Thao tác */}
                </colgroup>
                <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5 text-left whitespace-nowrap">Mã SKU</th>
                    <th className="px-4 py-3.5 text-left whitespace-nowrap">Tên sản phẩm</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Tồn kho</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Giá niêm yết</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium bg-white text-xs sm:text-sm">
                  {loading ? (
                    <ProductsTableSkeleton count={6} />
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-14 text-center text-slate-400">
                        <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">
                          Không tìm thấy sản phẩm nào
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc nhóm hàng / trạng thái.
                        </p>
                        {(searchTerm || activeFilterCount > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchInput('');
                              handleResetFilters();
                            }}
                            className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Đặt lại bộ lọc</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/70 transition-colors border-b border-slate-100"
                        >
                          {/* Cột 1: Mã SKU kèm dấu chỉ báo trạng thái */}
                          <td className="px-5 py-4 whitespace-nowrap text-left">
                            <div className="flex items-center gap-2.5">
                              {p.status === 'ACTIVE' ? (
                                <span
                                  className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0"
                                  title="Đang hoạt động"
                                />
                              ) : (
                                <span
                                  className="h-2 w-2 rounded-full bg-slate-400 ring-4 ring-slate-100 shrink-0"
                                  title="Ngừng hoạt động"
                                />
                              )}
                              <span className="font-mono font-bold text-slate-900 tracking-wider text-xs">
                                {p.sku}
                              </span>
                            </div>
                          </td>

                          {/* Cột 2: Tên sản phẩm (Chỉ Ảnh + Tên) */}
                          <td className="px-4 py-4 text-left">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                {p.imageUrl ? (
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    className="h-full w-full object-cover object-center"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package className="h-4.5 w-4.5 text-slate-300" />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(p)}
                                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left leading-snug cursor-pointer line-clamp-1 truncate block max-w-full text-xs sm:text-sm"
                                title={`Xem chi tiết: ${p.name}`}
                              >
                                {p.name}
                              </button>
                            </div>
                          </td>

                          {/* Cột 3: Tồn kho (Chỉ số lượng tồn) */}
                          <td className="px-4 py-4 text-center whitespace-nowrap font-mono tabular-nums text-xs sm:text-sm">
                            <span
                              className={`font-semibold ${
                                p.stockQuantity === 0
                                  ? 'text-rose-600 font-bold'
                                  : p.stockQuantity <= 100
                                    ? 'text-amber-600 font-bold'
                                    : 'text-slate-800'
                              }`}
                            >
                              {p.stockQuantity.toLocaleString('vi-VN')}
                            </span>
                          </td>

                          {/* Cột 4: Giá niêm yết (Chỉ giá tiền) */}
                          <td className="px-4 py-4 text-right whitespace-nowrap font-semibold text-slate-900 font-mono tabular-nums text-xs sm:text-sm">
                            {formatCurrency(p.price)}
                          </td>

                          {/* Cột 5: Thao tác */}
                          <td className="px-3 py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {canManageProducts ? (
                                <Link
                                  to={`/catalog/products/${p.id}/edit`}
                                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                                  title="Chỉnh sửa thông tin sản phẩm"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Sửa</span>
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetailModal(p)}
                                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                                  title="Xem chi tiết sản phẩm"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Chi tiết</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
        </div>

        {/* ===================================================================== */}
        {/* B. GIAO DIỆN THẺ (CARD VIEW) CHO MOBILE (<640px) KHÔNG CẦN CUỘN NGANG */}
        {/* ===================================================================== */}
        <div className="divide-y divide-slate-100 sm:hidden">
          {loading ? (
            <ProductsMobileCardSkeleton count={4} canViewCostPrice={canViewCostPrice} />
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-slate-400 px-4">
              <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">Không tìm thấy sản phẩm nào</p>
              <p className="text-xs text-slate-400 mt-1">
                Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc nhóm hàng / trạng thái.
              </p>
              {(searchTerm || activeFilterCount > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    handleResetFilters();
                  }}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Đặt lại bộ lọc</span>
                </button>
              )}
            </div>
          ) : (
            products.map((p) => {
              const isLowStock = p.stockQuantity <= 100 && p.stockQuantity > 0;
              const isOutOfStock = p.stockQuantity === 0;

              return (
                <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                  {/* Hàng 1: Thumbnail nổi bật + SKU & Trạng thái + Tên + Phân cấp ngành hàng */}
                  <div className="flex items-start gap-3.5">
                    {/* Thumbnail nổi bật */}
                    <div className="h-16 w-16 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover object-center"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="h-7 w-7 text-slate-300" />
                      )}
                    </div>

                    {/* Tiêu đề & Thông tin cơ bản */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 tracking-wider text-xs bg-slate-100 px-2 py-0.5 rounded-md">
                          {p.sku}
                        </span>
                        {p.status === 'ACTIVE' ? (
                          <span
                            className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0 select-none"
                            title="Đang hoạt động"
                          />
                        ) : (
                          <span
                            className="h-2.5 w-2.5 rounded-full bg-slate-400 ring-4 ring-slate-100 shrink-0 select-none"
                            title="Ngừng hoạt động"
                          />
                        )}
                      </div>

                      <h4
                        onClick={() => handleOpenDetailModal(p)}
                        className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 mt-1 cursor-pointer hover:text-blue-600 transition-colors"
                        title={p.name}
                      >
                        {p.name}
                      </h4>

                      {/* Phân cấp danh mục */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[11px]">
                        <span className="rounded-md bg-[var(--color-primary-light)] px-1.5 py-0.5 font-semibold text-[var(--color-primary)] ring-1 ring-inset ring-[var(--color-primary-subtle)] truncate max-w-[140px]">
                          {p.parentCategory || p.category?.split('/')[0]?.trim() || 'Nhóm hàng'}
                        </span>
                        {p.category && p.category.includes('/') ? (
                          <span className="text-slate-400 font-medium truncate max-w-[140px]">
                            ↳{' '}
                            {p.category
                              .split('/')
                              .slice(1)
                              .map((s) => s.trim())
                              .join(' > ')}
                          </span>
                        ) : p.subCategory ? (
                          <span className="text-slate-400 font-medium truncate max-w-[140px]">
                            ↳ {p.subCategory}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Hàng 2: Khung số liệu Giá niêm yết, Tồn kho khả dụng, Quy cách & Giá vốn */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                        Giá niêm yết
                      </span>
                      <div className="font-extrabold text-blue-700 text-sm tracking-tight">
                        {formatCurrency(p.price)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ĐVT: <strong className="text-slate-600 font-semibold">{p.baseUnit}</strong>
                        {p.units && p.units.filter((u) => !u.isBaseUnit).length > 0 && (
                          <span className="text-[10px] text-blue-600 block mt-0.5">
                            Quy đổi:{' '}
                            {p.units
                              .filter((u) => !u.isBaseUnit)
                              .map((u) => `${u.unitName} (x${u.conversionRate})`)
                              .join(', ')}
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                        Tồn kho khả dụng
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 font-extrabold text-sm tracking-tight ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }`}
                        >
                          <Warehouse className="h-3.5 w-3.5" />
                          <span>{p.stockQuantity.toLocaleString('vi-VN')}</span>
                        </span>
                        {isOutOfStock && (
                          <span className="text-[10px] font-bold text-rose-500">(Hết)</span>
                        )}
                        {isLowStock && (
                          <span className="text-[10px] font-bold text-amber-500">(Ít)</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Quy cách:{' '}
                        <span className="text-slate-600 font-medium">
                          {p.packagingSpec || 'Chuẩn'}
                        </span>
                      </span>
                    </div>

                    {/* Hiển thị Giá vốn & Biên LN nếu có quyền */}
                    {canViewCostPrice && (
                      <>
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-medium text-slate-400 block">
                            Giá vốn
                          </span>
                          <span className="font-bold text-slate-700 text-xs tracking-tight">
                            {formatCurrency(p.costPrice)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-medium text-slate-400 block">
                            Biên lợi nhuận
                          </span>
                          {p.margin !== undefined ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                              +{p.margin}%
                            </span>
                          ) : (
                            <span className="text-slate-400">---</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Hàng 3: Các nút thao tác nhanh gọn gàng, vùng chạm thoải mái */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium">Thao tác:</span>
                    <div className="flex items-center gap-2">
                      {/* Xem chi tiết */}
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(p)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
                        title="Xem chi tiết sản phẩm"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        <span>Chi tiết</span>
                      </button>

                      {/* Sửa thông tin */}
                      {canManageProducts && (
                        <Link
                          to={`/catalog/products/${p.id}/edit`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                          title="Sửa thông tin SKU"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Sửa</span>
                        </Link>
                      )}

                      {/* Điều chỉnh tồn kho cho Thủ kho */}
                      {canAdjustStock && (
                        <button
                          type="button"
                          onClick={() => handleOpenAdjustModal(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          title="Điều chỉnh tồn kho"
                        >
                          <Warehouse className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Kho</span>
                        </button>
                      )}

                      {/* Xóa sản phẩm nếu có quyền */}
                      {canDeleteProduct && (
                        <button
                          type="button"
                          onClick={() => handlePromptDelete(p)}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                            (p.stockQuantity ?? 0) > 0
                              ? 'border-slate-200 text-slate-400 hover:bg-slate-50'
                              : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                          }`}
                          title={
                            (p.stockQuantity ?? 0) > 0
                              ? `Sản phẩm còn tồn kho (${p.stockQuantity} ${p.baseUnit || 'đơn vị'})`
                              : 'Xóa sản phẩm khỏi danh mục'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Thanh phân trang chuẩn Clean SaaS đồng bộ hệ thống (gọi backend thật) */}
        {total > 0 && (
          <Pagination
            variant="default"
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={limit}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="sản phẩm"
            showRecordRange={true}
            showFirstLast={true}
            onPageChange={handlePageChange}
            onPageSizeChange={(newLimit) => {
              setLimit(newLimit);
              handlePageChange(1);
            }}
          />
        )}
      </div>

      {/* 4.5. Modal Xem Chi Tiết Sản phẩm (Product Detail Modal) */}
      <ProductDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedProductForDetail(null);
        }}
        product={selectedProductForDetail}
        canViewCostPrice={canViewCostPrice}
        canManageProducts={canManageProducts}
        onEdit={(p) => {
          setDetailModalOpen(false);
          handleOpenEditModal(p);
        }}
        onPriceHistory={(p) => {
          setDetailModalOpen(false);
          handleOpenPriceHistory(p);
        }}
        onOpenLedger={(sku) => {
          setDetailModalOpen(false);
          handleOpenLedgerModal(sku);
        }}
      />

      {/* 5. Modal Thêm / Sửa Sản phẩm (SKU) */}
      <ProductFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingProduct}
        canManageCostPrice={canViewCostPrice}
      />

      {/* 6. Modal Xác nhận xóa sản phẩm */}
      {deleteModalOpen &&
        productToDelete &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[2px] animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteModalOpen(false);
            }}
          >
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-100 animate-modal-in text-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="absolute top-4 right-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-rose-50 border border-rose-100 text-rose-600 shadow-2xs shrink-0">
                  <Trash2 className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Xác nhận Xóa Sản phẩm</h3>
                  <p className="text-xs text-slate-500">
                    Mã SKU:{' '}
                    <span className="font-mono font-bold text-slate-800">
                      {productToDelete.sku}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-600 space-y-2 mb-5">
                <p>
                  Bạn có chắc chắn muốn xóa sản phẩm <strong>"{productToDelete.name}"</strong> khỏi
                  danh mục hàng hóa?
                </p>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2 text-[11px] text-emerald-800 space-y-0.5">
                  <p className="font-semibold flex items-center gap-1">
                    ✓ Kiểm tra ràng buộc: Tồn kho = 0 (Hết hàng)
                  </p>
                  <p className="text-emerald-700">
                    Hệ thống sẽ xác nhận sản phẩm không còn giao dịch nào đang ở trạng thái chờ hoặc đang vận chuyển.
                  </p>
                </div>
                <p className="text-[11px] text-rose-600 font-medium">
                  * Thao tác này sẽ xóa hoàn toàn SKU khỏi danh mục và không thể hoàn tác sau khi xác nhận.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-xs font-semibold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 7. Modal Điều chỉnh tồn kho (Chỉ Thủ kho & Admin) */}
      {adjustModalOpen &&
        selectedProductForAdjust &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[2px] animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAdjustModalOpen(false);
            }}
          >
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-100 z-10 space-y-4 animate-modal-in text-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Điều chỉnh / Nhập Xuất Tồn Kho (SN-23)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Nhập theo Thùng, Lốc — Tự động quy về ĐVT cơ sở để ghi sổ kho
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
                {/* Thẻ thông tin SKU */}
                <div className="rounded-xl bg-slate-50 p-3.5 text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Mã SKU:</span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {selectedProductForAdjust.sku}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tên hàng:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[260px]">
                      {selectedProductForAdjust.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tồn kho hiện tại:</span>
                    <span className="font-extrabold text-blue-700">
                      {selectedProductForAdjust.stockQuantity.toLocaleString('vi-VN')}{' '}
                      {selectedProductForAdjust.baseUnit}
                    </span>
                  </div>
                  {selectedProductForAdjust.units && selectedProductForAdjust.units.length > 0 && (
                    <div className="flex justify-between items-start pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Đơn vị quy đổi:</span>
                      <div className="flex flex-wrap justify-end gap-1 max-w-[260px]">
                        {selectedProductForAdjust.units.map((u) => (
                          <span
                            key={u.unitName}
                            className="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded"
                          >
                            1 {u.unitName} = {u.conversionRate} {selectedProductForAdjust.baseUnit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Kho áp dụng điều chỉnh (Bắt buộc theo chuẩn 4 kho) */}
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
                    <Warehouse className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={adjustWarehouseId}
                      onChange={(e) => setAdjustWarehouseId(e.target.value)}
                      disabled={isKeeper}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                      required
                    >
                      {adjustWarehouseOptions.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Biến động số lượng sẽ được ghi nhận trực tiếp vào số dư tồn kho của kho này.
                  </p>
                </div>

                {/* Hàng chọn Đơn vị tính và Số lượng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Đơn vị tính nhập/xuất <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={adjustUnit}
                      onChange={(e) => setAdjustUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value={selectedProductForAdjust.baseUnit}>
                        {selectedProductForAdjust.baseUnit} (Cơ sở, x1)
                      </option>
                      {selectedProductForAdjust.units
                        ?.filter(
                          (u) =>
                            !u.isBaseUnit &&
                            u.unitName.toLowerCase() !==
                              selectedProductForAdjust.baseUnit.toLowerCase()
                        )
                        .map((u) => (
                          <option key={u.unitName} value={u.unitName}>
                            {u.unitName} (Quy đổi x{u.conversionRate}{' '}
                            {selectedProductForAdjust.baseUnit})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số lượng (+ nhập, - xuất) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={quantityChange}
                      onChange={(e) => setQuantityChange(Number(e.target.value))}
                      placeholder="VD: 5, -2..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Hộp quy đổi trực quan theo thời gian thực (AC-2) */}
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-600">Quy đổi ghi sổ tự động:</span>
                    <span className="font-mono font-bold text-blue-800">
                      {Number(quantityChange) > 0 ? '+' : ''}
                      {quantityChange} {adjustUnit} × {selectedUnitRate} ={' '}
                      <span className="text-blue-900 underline underline-offset-2">
                        {baseCalculatedChange > 0 ? '+' : ''}
                        {baseCalculatedChange} {selectedProductForAdjust.baseUnit}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-medium text-slate-600">
                    <span>Tồn kho sau khi ghi sổ:</span>
                    <span className="font-bold text-slate-900">
                      {selectedProductForAdjust.stockQuantity + baseCalculatedChange}{' '}
                      {selectedProductForAdjust.baseUnit}
                    </span>
                  </div>
                  {selectedProductForAdjust.stockQuantity + baseCalculatedChange < 0 && (
                    <p className="text-[11px] text-rose-600 font-bold bg-rose-50 border border-rose-200 p-2 rounded-lg mt-1">
                      ⚠️ Cảnh báo: Xuất vượt quá tồn hiện tại (
                      {selectedProductForAdjust.stockQuantity} {selectedProductForAdjust.baseUnit}).
                      Nghiệp vụ kho ngăn chặn ghi nhận tồn kho âm!
                    </p>
                  )}
                </div>

                {/* Mã chứng từ / Phiếu kho */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã chứng từ / Phiếu kho (Tham chiếu)
                  </label>
                  <input
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder="Ví dụ: PNK-2026-001, PXK-2026-003..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                  />
                </div>

                {/* Lý do điều chỉnh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lý do ghi sổ (Bắt buộc cho sổ kho) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Ví dụ: Nhập hàng nhà máy theo Thùng, kiểm kê thực tế..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAdjustModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={
                      adjusting || selectedProductForAdjust.stockQuantity + baseCalculatedChange < 0
                    }
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.99] shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {adjusting ? 'Đang ghi sổ...' : 'Xác nhận ghi sổ kho'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* 8. Modal Nhập danh mục từ Excel */}
      {importModalOpen && (
        <ImportProductsModal
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => {
            setImportModalOpen(false);
            showToast('success', 'Nhập danh mục từ Excel thành công');
            loadProducts();
          }}
        />
      )}

      {/* 9. Modal Sổ kho & Lịch sử quy đổi giao dịch (SN-23 AC-2 & AC-3) */}
      {ledgerModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-[2px] animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLedgerModalOpen(false);
            }}
          >
            <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-2xl border border-slate-100 animate-modal-in text-slate-800 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 border border-blue-100 text-blue-600 shadow-2xs">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Sổ Kho & Lịch sử Bút toán Quy đổi Giao dịch (SN-23)
                    </h3>
                    <p className="text-xs text-slate-500">
                      {ledgerSku ? (
                        <>
                          Mã SKU:{' '}
                          <span className="font-mono font-bold text-blue-700">{ledgerSku}</span>
                        </>
                      ) : (
                        'Toàn bộ bút toán phát sinh trong kho'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLedgerModalOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Banner AC-3: Bất biến lịch sử quy đổi */}
              <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">
                    Bảo toàn bất biến (Snapshot Immutability - AC-3):
                  </span>{' '}
                  Hệ thống đóng băng hệ số quy đổi tại thời điểm ghi sổ. Khi thủ kho sửa đổi hệ số
                  quy đổi của SKU (vd: Thùng từ 24 lon lên 30 lon), toàn bộ bút toán lịch sử trước
                  đó không bao giờ bị sai lệch số liệu!
                </div>
              </div>

              {/* Table ledger */}
              <div className="p-5 overflow-y-auto flex-1">
                {ledgerLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span className="font-medium text-xs">Đang tải dữ liệu sổ kho...</span>
                  </div>
                ) : ledgerTransactions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Chưa có bút toán nào được ghi nhận
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Hãy thực hiện thao tác nhập kho hoặc điều chỉnh tồn theo Thùng/Lốc để kiểm tra
                      ghi sổ tự động.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-3 py-2.5">Thời gian</th>
                          <th className="px-3 py-2.5">Mã phiếu</th>
                          <th className="px-3 py-2.5">Hàng hóa (SKU)</th>
                          <th className="px-3 py-2.5 text-center">Loại GD</th>
                          <th className="px-3 py-2.5 text-right">SL Nhập/Xuất</th>
                          <th className="px-3 py-2.5 text-center">Hệ số QĐ</th>
                          <th className="px-3 py-2.5 text-right bg-blue-50/50">Ghi sổ (Cơ sở)</th>
                          <th className="px-3 py-2.5 text-right">Tồn Sau</th>
                          <th className="px-3 py-2.5">Lý do & Người ghi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerTransactions.map((tx) => {
                          const isPositive = (tx.baseQuantityChange ?? 0) >= 0;
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                <div>{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(tx.createdAt).toLocaleTimeString('vi-VN')}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-mono font-semibold text-blue-700 whitespace-nowrap">
                                {tx.referenceCode || tx.id.slice(0, 8)}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="font-mono font-bold text-slate-900 block">
                                  {tx.sku}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate max-w-[160px] block">
                                  {tx.productName}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    tx.transactionType === 'IMPORT'
                                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                                      : tx.transactionType === 'EXPORT'
                                        ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                                        : 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20'
                                  }`}
                                >
                                  {tx.transactionType === 'IMPORT'
                                    ? 'Nhập kho'
                                    : tx.transactionType === 'EXPORT'
                                      ? 'Xuất kho'
                                      : 'Điều chỉnh'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                                {isPositive ? '+' : ''}
                                {tx.inputQuantity}{' '}
                                <span className="text-slate-500 font-normal">{tx.inputUnit}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center font-mono text-slate-600 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-[11px]">
                                  x{tx.conversionRate}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap bg-blue-50/50">
                                <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                                  {isPositive ? '+' : ''}
                                  {tx.baseQuantityChange} {tx.baseUnit}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                                {tx.newStock} {tx.baseUnit}
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-slate-600">
                                <div>{tx.reason}</div>
                                {tx.performedBy && (
                                  <div className="text-[10px] text-slate-400">
                                    Bởi: {tx.performedBy}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs">
                <span className="text-slate-500">
                  Tổng cộng: <strong>{ledgerTransactions.length}</strong> bút toán giao dịch
                </span>
                <button
                  type="button"
                  onClick={() => setLedgerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {/* ========================================================================= */}
      {/* DRAWER / BOTTOM SHEET BỘ LỌC NÂNG CAO CHO MOBILE & TABLET (< lg)         */}
      {/* ========================================================================= */}
      {mobileFilterOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex justify-end">
            {/* Lớp nền mờ click đóng */}
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setMobileFilterOpen(false)}
            />

            {/* Khung Drawer trượt lên từ đáy (Mobile) hoặc từ phải sang (Tablet) */}
            <div className="relative z-10 w-full sm:max-w-md bg-white shadow-2xl flex flex-col max-h-[88vh] sm:max-h-full sm:h-full mt-auto sm:mt-0 rounded-t-3xl sm:rounded-none sm:rounded-l-3xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
              {/* Header Drawer */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl sm:rounded-none sm:rounded-tl-3xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Bộ lọc nâng cao</h3>
                    <p className="text-xs text-slate-500">Phân loại ngành hàng & trạng thái SKU</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Đóng bộ lọc"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nội dung các trường lọc */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                {/* 1. Nhóm hàng Cấp 1 (Ngành hàng) */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Nhóm hàng Cấp 1 (Ngành hàng)
                  </label>
                  <select
                    value={selectedParentCategory}
                    onChange={(e) => handleParentCategoryChange(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="ALL">Tất cả Nhóm Cấp 1</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Nhóm hàng Cấp 2 (Chủng loại) */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Nhóm hàng Cấp 2 (Chủng loại)
                  </label>
                  <select
                    value={selectedSubCategory}
                    onChange={(e) => handleSubCategoryChange(e.target.value)}
                    disabled={
                      selectedParentCategory === 'ALL' || subCategoriesForFilter.length === 0
                    }
                    className="w-full h-11 px-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                  >
                    <option value="ALL">
                      {selectedParentCategory === 'ALL'
                        ? 'Chọn Cấp 1 để lọc Cấp 2'
                        : 'Tất cả Nhóm Cấp 2'}
                    </option>
                    {subCategoriesForFilter.map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Trạng thái kinh doanh */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Trạng thái kinh doanh
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => handleStatusChange(e.target.value as ProductStatus | 'ALL')}
                    className="w-full h-11 px-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="ALL">Tất cả Trạng thái</option>
                    <option value="ACTIVE">Đang kinh doanh</option>
                    <option value="INACTIVE">Ngừng kinh doanh</option>
                  </select>
                </div>

                {/* Đang lọc theo nhánh Cây danh mục */}
                {selectedCategoryId !== 'ALL' && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5">
                      <FolderTree className="h-4 w-4 text-blue-600 shrink-0" />
                      <span>Đang lọc theo nhánh Cây danh mục</span>
                    </div>
                    <p className="text-[11px] text-blue-700">
                      Sản phẩm đang được lọc theo ID danh mục được chọn từ trang Cây nhóm hàng.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId('ALL');
                        updateUrlParams({ parentCategory: 'ALL', subCategory: 'ALL', page: 1 });
                      }}
                      className="inline-flex items-center gap-1 text-xs text-blue-700 underline font-semibold hover:text-blue-900 cursor-pointer pt-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Gỡ bỏ lọc theo cây</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Footer Drawer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/60 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  <span>Đặt lại</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <span>Áp dụng ({total})</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Lịch sử thay đổi giá (SN-29) */}
      <ProductPriceHistoryModal
        isOpen={priceHistoryModalOpen}
        onClose={() => setPriceHistoryModalOpen(false)}
        productId={selectedProductForHistory?.id || ''}
        productName={selectedProductForHistory?.name || ''}
        productSku={selectedProductForHistory?.sku}
        currentPrice={selectedProductForHistory?.price}
      />
    </div>
  );
};
