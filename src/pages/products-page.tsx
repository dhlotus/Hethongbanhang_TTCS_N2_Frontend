import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Warehouse,
  Boxes,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  FileText,
  BookOpen,
  Filter,
  RotateCcw,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { productsService, PRODUCT_CATEGORIES } from "../services/products.service";
import { categoriesService } from "../services/categories.service";
import { inventoryService } from "../services/inventory.service";
import { ProductFormModal } from "../components/product-form-modal";
import { ImportProductsModal } from "../components/import-products-modal";
import { showToast } from "../components/toast";
import {
  ProductsTableSkeleton,
  ProductsMobileCardSkeleton,
} from "../components/skeletons";
import type {
  Product,
  ProductStatus,
  ProductCategory,
  AdjustStockPayload,
  CreateProductPayload,
  InventoryTransaction,
} from "../types/products";

const formatCurrency = (val?: number): string => {
  if (val === undefined || val === null) return "---";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(val);
};

export const ProductsPage: React.FC = () => {
  // Dữ liệu sản phẩm & Phân trang
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // URL Query Params (Hỗ trợ mở từ Cây danh mục)
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategoryId = searchParams.get("categoryId");

  // Danh mục phân cấp động
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>(PRODUCT_CATEGORIES);

  // Bộ lọc & Tìm kiếm (Debounced)
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(urlCategoryId || "ALL");
  const [selectedParentCategory, setSelectedParentCategory] = useState("ALL");
  const [selectedSubCategory, setSelectedSubCategory] = useState("ALL");
  const [selectedChildCategory, setSelectedChildCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus | "ALL">("ALL");

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

  // Modal Điều chỉnh tồn kho (Dành cho Thủ kho / Admin - SN-23)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [adjustUnit, setAdjustUnit] = useState<string>("");
  const [quantityChange, setQuantityChange] = useState<number>(1);
  const [referenceCode, setReferenceCode] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("Kiểm kê định kỳ");
  const [adjusting, setAdjusting] = useState(false);

  // Modal Sổ kho & Lịch sử quy đổi giao dịch (SN-23 AC-2 & AC-3)
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerSku, setLedgerSku] = useState<string | null>(null);
  const [ledgerTransactions, setLedgerTransactions] = useState<InventoryTransaction[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Xác định vai trò của người dùng hiện tại
  const user = getStoredUser();
  const userRoles = user?.roles || [];

  // 1. Phân quyền xem Giá vốn & Biên lợi nhuận (Chỉ ADMIN & SALES_MANAGER)
  const canViewCostPrice =
    userRoles.includes("ADMIN") || userRoles.includes("SALES_MANAGER");

  // 2. Phân quyền Thêm / Sửa / Đổi trạng thái sản phẩm (Chỉ ADMIN & SALES_MANAGER)
  const canManageProducts =
    userRoles.includes("ADMIN") || userRoles.includes("SALES_MANAGER");

  // 3. Phân quyền điều chỉnh tồn kho (Chỉ ADMIN & Nhóm vai trò kho)
  const canAdjustStock =
    userRoles.includes("ADMIN") ||
    userRoles.includes("WAREHOUSE_KEEPER") ||
    userRoles.includes("WAREHOUSE_MANAGER") ||
    userRoles.includes("WAREHOUSE") ||
    userRoles.includes("WH_MANAGER");

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

  // Cập nhật selectedCategoryId khi URL query thay đổi
  useEffect(() => {
    if (urlCategoryId) {
      setSelectedCategoryId(urlCategoryId);
    }
  }, [urlCategoryId]);

  // Debounce tìm kiếm sau 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Danh sách Nhóm hàng Cấp 2 tương ứng theo Cấp 1 đang chọn
  const subCategoriesForFilter = useMemo(() => {
    if (selectedParentCategory === "ALL") return [];
    const found = categoriesList.find((c) => c.name === selectedParentCategory);
    return found?.subCategories || [];
  }, [selectedParentCategory, categoriesList]);

  // Danh sách Phân loại con Cấp 3 tương ứng theo Cấp 2 đang chọn
  const childCategoriesForFilter = useMemo(() => {
    if (selectedSubCategory === "ALL") return [];
    const found = subCategoriesForFilter.find((s) => s.name === selectedSubCategory);
    return found?.subCategories || found?.children || [];
  }, [selectedSubCategory, subCategoriesForFilter]);

  // Đếm số lượng bộ lọc nâng cao đang được kích hoạt (không tính tìm kiếm văn bản)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedParentCategory !== "ALL") count++;
    if (selectedSubCategory !== "ALL") count++;
    if (selectedChildCategory !== "ALL") count++;
    if (selectedStatus !== "ALL") count++;
    if (selectedCategoryId !== "ALL") count++;
    return count;
  }, [
    selectedParentCategory,
    selectedSubCategory,
    selectedChildCategory,
    selectedStatus,
    selectedCategoryId,
  ]);

  // Đặt lại toàn bộ bộ lọc về mặc định
  const handleResetFilters = useCallback(() => {
    setSelectedParentCategory("ALL");
    setSelectedSubCategory("ALL");
    setSelectedChildCategory("ALL");
    setSelectedStatus("ALL");
    setSelectedCategoryId("ALL");
    setSearchParams({});
    setPage(1);
  }, [setSearchParams]);

  // Tải danh sách sản phẩm từ Service
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await productsService.getProducts({
        page,
        limit,
        search: searchTerm,
        categoryId: selectedCategoryId !== "ALL" ? selectedCategoryId : (urlCategoryId || undefined),
        parentCategory: selectedParentCategory !== "ALL" ? selectedParentCategory : undefined,
        subCategory:
          selectedChildCategory !== "ALL"
            ? selectedChildCategory
            : selectedSubCategory !== "ALL"
            ? selectedSubCategory
            : undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
      });

      if ("data" in res && Array.isArray(res.data)) {
        setProducts(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } else if (Array.isArray(res)) {
        setProducts(res);
        setTotal(res.length);
        setTotalPages(Math.ceil(res.length / limit) || 1);
      }
    } catch {
      showToast("error", "Không thể tải danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    searchTerm,
    selectedCategoryId,
    urlCategoryId,
    selectedParentCategory,
    selectedSubCategory,
    selectedChildCategory,
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

  // Mở modal sửa sản phẩm
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormModalOpen(true);
  };

  // Xử lý submit thêm hoặc sửa sản phẩm
  const handleFormSubmit = async (payload: CreateProductPayload) => {
    if (editingProduct) {
      await productsService.updateProduct(editingProduct.id, payload);
      showToast("success", "Cập nhật sản phẩm thành công");
    } else {
      await productsService.createProduct(payload);
      showToast("success", "Tạo sản phẩm mới thành công");
    }
    await loadProducts();
  };

  // Bật/tắt trạng thái kinh doanh
  const handleToggleStatus = async (p: Product) => {
    if (!canManageProducts) return;
    const newStatus: ProductStatus = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await productsService.toggleProductStatus(p.id, newStatus);
      showToast(
        "success",
        newStatus === "ACTIVE"
          ? "Kích hoạt kinh doanh sản phẩm thành công"
          : "Chuyển ngừng kinh doanh sản phẩm thành công"
      );
      await loadProducts();
    } catch {
      showToast("error", "Không thể cập nhật trạng thái sản phẩm");
    }
  };

  // Mở modal xác nhận xóa
  const handlePromptDelete = (p: Product) => {
    if (p.hasTransactions) {
      showToast("error", "Không thể xóa sản phẩm đã phát sinh giao dịch");
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
      showToast("success", "Xóa sản phẩm thành công");
      setDeleteModalOpen(false);
      setProductToDelete(null);
      await loadProducts();
    } catch {
      showToast("error", "Không thể xóa sản phẩm");
    } finally {
      setIsDeleting(false);
    }
  };

  // Mở modal điều chỉnh tồn kho (SN-23)
  const handleOpenAdjustModal = (product: Product) => {
    setSelectedProductForAdjust(product);
    setAdjustUnit(product.baseUnit || "Lon");
    setQuantityChange(1);
    setReferenceCode(`PK-${Date.now().toString().slice(-6)}`);
    setAdjustReason("Kiểm kê thực tế tại kho");
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

    try {
      setAdjusting(true);
      const payload: AdjustStockPayload = {
        productSku: selectedProductForAdjust.sku,
        quantityChange: Number(quantityChange),
        unit: adjustUnit,
        reason: adjustReason,
        referenceCode: referenceCode.trim() || undefined,
      };

      await inventoryService.adjustStock(payload);
      showToast("success", "Điều chỉnh tồn kho thành công");
      setAdjustModalOpen(false);
      await loadProducts();
    } catch {
      showToast("error", "Không thể điều chỉnh tồn kho");
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

      {/* 1. Header Banner & RBAC Status Badge */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-blue-50/70 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                <Package className="h-3.5 w-3.5 text-blue-600" />
                <span>Danh mục SKU Hàng hóa (SN-139 / SN-20)</span>
              </span>

              {canViewCostPrice ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Quyền xem Giá vốn & Biên LN: MỞ (SN-10)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  <span>Giá vốn bảo mật máy chủ (SN-10)</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Quản lý Danh mục Sản phẩm & SKU Phân phối
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-2">
              Quản lý mã định danh SKU, phân loại nhóm hàng đa cấp, quy cách đóng gói xuất buôn B2B và kiểm soát an toàn bảo mật giá vốn kinh doanh.
            </p>
          </div>

          {/* Nhóm nút hành động */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={loadProducts}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all focus:outline-none cursor-pointer whitespace-nowrap"
              title="Làm mới dữ liệu từ server"
            >
              <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>

            {canManageProducts && (
              <>
                <Link
                  to="/catalog/categories"
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2.5 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 hover:text-indigo-800 transition-all focus:outline-none cursor-pointer whitespace-nowrap"
                  title="Mở giao diện quản lý Cây nhóm hàng đa cấp"
                >
                  <FolderTree className="h-4 w-4 shrink-0 text-indigo-600" />
                  <span>Cây nhóm hàng</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleOpenLedgerModal()}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-2.5 text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-100 hover:text-blue-800 transition-all focus:outline-none cursor-pointer whitespace-nowrap"
                  title="Xem Sổ kho & Lịch sử quy đổi giao dịch (SN-23)"
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-blue-600" />
                  <span>Sổ kho quy đổi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-100 hover:text-emerald-800 transition-all focus:outline-none cursor-pointer whitespace-nowrap"
                >
                  <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Nhập từ Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] transition-all focus:outline-none cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Thêm sản phẩm mới</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Thông báo quyền hạn người dùng */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
          {canViewCostPrice ? (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                <strong>Chế độ Quản lý:</strong> Tài khoản của bạn được cấp phép xem và thiết lập Giá vốn (Cost Price) cùng Biên lợi nhuận (Margin %).
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                <strong>Bảo mật bí mật kinh doanh:</strong> Cột Giá vốn và Biên lợi nhuận được ẩn tự động ở tầng máy chủ đối với vai trò hiện tại.
              </span>
            </div>
          )}
          <span className="text-slate-400 font-mono text-[11px]">
            Tài khoản: {user?.username} ({userRoles.join(", ")})
          </span>
        </div>
      </div>

      {/* 2. Thanh công cụ lọc & Tìm kiếm (Responsive: Gọn gàng trên Mobile/Tablet, Đầy đủ trên Desktop) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
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
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
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
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter className="h-4 w-4 text-blue-600" />
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
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Nhóm hàng Cấp 1 (Ngành hàng) */}
          <div className="relative">
            <select
              value={selectedParentCategory}
              onChange={(e) => {
                setSelectedParentCategory(e.target.value);
                setSelectedSubCategory("ALL");
                setSelectedChildCategory("ALL");
                setSelectedCategoryId("ALL");
                setPage(1);
              }}
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
              onChange={(e) => {
                setSelectedSubCategory(e.target.value);
                setSelectedChildCategory("ALL");
                setSelectedCategoryId("ALL");
                setPage(1);
              }}
              disabled={selectedParentCategory === "ALL" || subCategoriesForFilter.length === 0}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
            >
              <option value="ALL">
                {selectedParentCategory === "ALL"
                  ? "Chọn Cấp 1 để lọc Cấp 2"
                  : "Tất cả Nhóm Cấp 2"}
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
              onChange={(e) => {
                setSelectedStatus(e.target.value as ProductStatus | "ALL");
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="ACTIVE">Đang kinh doanh</option>
              <option value="INACTIVE">Ngừng kinh doanh</option>
            </select>
          </div>
        </div>

        {/* Lọc Phân loại con Cấp 3 (cho Desktop khi nhóm Cấp 2 có Cấp 3) */}
        {childCategoriesForFilter.length > 0 && (
          <div className="hidden lg:flex items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-indigo-700">Phân loại Cấp 3:</span>
            <div className="relative max-w-xs">
              <select
                value={selectedChildCategory}
                onChange={(e) => {
                  setSelectedChildCategory(e.target.value);
                  setSelectedCategoryId("ALL");
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-indigo-200 bg-white text-indigo-900 font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
              >
                <option value="ALL">Tất cả Phân loại Cấp 3</option>
                {childCategoriesForFilter.map((child) => (
                  <option key={child.id} value={child.name}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Chip hiển thị khi đang lọc theo nhánh Cây từ Trang Cây danh mục (Desktop) */}
        {selectedCategoryId !== "ALL" && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold w-fit">
            <FolderTree className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span>Lọc theo nhánh cây</span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId("ALL");
                setSearchParams({});
              }}
              className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Bỏ lọc theo cây"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Thanh trạng thái bộ lọc đang áp dụng & Tổng kết */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">Bộ lọc đang áp dụng:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-medium text-[11px]">
                Tìm kiếm: "{searchTerm}"
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchInput("")} />
              </span>
            )}
            {selectedParentCategory !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium text-[11px]">
                Cấp 1: {selectedParentCategory}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    setSelectedParentCategory("ALL");
                    setSelectedSubCategory("ALL");
                  }}
                />
              </span>
            )}
            {selectedSubCategory !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-medium text-[11px]">
                Cấp 2: {selectedSubCategory}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSubCategory("ALL")} />
              </span>
            )}
            {selectedStatus !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-[11px]">
                {selectedStatus === "ACTIVE" ? "Đang kinh doanh" : "Ngừng kinh doanh"}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedStatus("ALL")} />
              </span>
            )}
            {!searchTerm &&
              selectedParentCategory === "ALL" &&
              selectedSubCategory === "ALL" &&
              selectedStatus === "ALL" && (
                <span className="text-slate-400 italic">Hiển thị toàn bộ danh mục</span>
              )}
          </div>

          <div className="flex items-center gap-1.5 font-medium shrink-0">
            <Boxes className="h-4 w-4 text-slate-400" />
            <span>
              Tìm thấy: <strong>{total}</strong> SKU sản phẩm
            </span>
          </div>
        </div>
      </div>

      {/* 3. Dữ liệu Sản phẩm (Data Table cho Desktop & Card View thích ứng cho Mobile) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {/* A. BẢNG DỮ LIỆU CHO TABLET & DESKTOP (>=640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-3 py-3 font-semibold text-center w-12 whitespace-nowrap">Ảnh</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Mã SKU</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Tên sản phẩm</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Nhóm hàng</th>
                <th className="px-3 py-3 font-semibold text-center whitespace-nowrap w-16">ĐVT</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Quy cách</th>
                <th className="px-3 py-3 font-semibold text-right whitespace-nowrap">Giá niêm yết</th>
                <th className="px-3 py-3 font-semibold text-right whitespace-nowrap">Tồn kho</th>

                {/* Cột nhạy cảm: Chỉ render nếu canViewCostPrice = TRUE (SN-10) */}
                {canViewCostPrice && (
                  <>
                    <th className="px-3 py-3 font-semibold text-right text-emerald-800 bg-emerald-50/50 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Giá vốn</span>
                      </div>
                    </th>
                    <th className="px-3 py-3 font-semibold text-right text-emerald-800 bg-emerald-50/50 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Biên LN</span>
                      </div>
                    </th>
                  </>
                )}

                <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Trạng thái</th>
                <th className="px-3 py-3 font-semibold text-center whitespace-nowrap w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <ProductsTableSkeleton count={6} canViewCostPrice={canViewCostPrice} />
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={canViewCostPrice ? 12 : 10}
                    className="py-14 text-center text-slate-400"
                  >
                    <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">Không tìm thấy sản phẩm nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc nhóm hàng / trạng thái.
                    </p>
                    {(searchTerm || activeFilterCount > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          handleResetFilters();
                        }}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Đặt lại bộ lọc</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLowStock = p.stockQuantity <= 100 && p.stockQuantity > 0;
                  const isOutOfStock = p.stockQuantity === 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Cột 1: Ảnh Thumbnail */}
                      <td className="px-3 py-2.5 text-center">
                        <div className="h-9 w-9 mx-auto rounded-xl border border-slate-200/90 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-full w-full object-cover object-center"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Package className="h-4.5 w-4.5 text-slate-300" />
                          )}
                        </div>
                      </td>

                      {/* Cột 2: Mã SKU */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 tracking-wider">
                          {p.sku}
                        </span>
                      </td>

                      {/* Cột 3: Tên sản phẩm */}
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900 leading-snug max-w-[240px] truncate" title={p.name}>
                          {p.name}
                        </div>
                      </td>

                      {/* Cột 4: Nhóm hàng */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5 max-w-[220px]">
                          <span className="inline-block w-fit rounded-md bg-[var(--color-primary-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)] ring-1 ring-inset ring-[var(--color-primary-subtle)] truncate">
                            {p.parentCategory || p.category?.split('/')[0]?.trim() || "Nhóm hàng"}
                          </span>
                          {p.category && p.category.includes('/') ? (
                            <span className="text-[11px] text-slate-500 font-medium pl-0.5 truncate" title={p.category}>
                              ↳ {p.category.split('/').slice(1).map((s) => s.trim()).join(' > ')}
                            </span>
                          ) : p.subCategory ? (
                            <span className="text-[11px] text-slate-500 font-medium pl-0.5 truncate">
                              ↳ {p.subCategory}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Cột 5: ĐVT cơ sở & Đơn vị quy đổi (SN-23 AC-1) */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {p.baseUnit}
                          </span>
                          {p.units && p.units.filter((u) => !u.isBaseUnit).length > 0 && (
                            <div className="flex flex-wrap items-center justify-center gap-1 max-w-[130px]" title="Các đơn vị quy đổi về ĐVT cơ sở">
                              {p.units
                                .filter((u) => !u.isBaseUnit)
                                .map((u) => (
                                  <span
                                    key={u.unitName}
                                    className="inline-flex items-center text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200"
                                  >
                                    {u.unitName} (x{u.conversionRate})
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cột 6: Quy cách đóng gói */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                        {p.packagingSpec || "---"}
                      </td>

                      {/* Cột 7: Giá niêm yết */}
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-900 font-mono whitespace-nowrap">
                        {formatCurrency(p.price)}
                      </td>

                      {/* Cột 8: Tồn kho khả dụng */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isOutOfStock
                              ? "text-rose-600"
                              : isLowStock
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          <Warehouse className="h-3.5 w-3.5" />
                          <span>{p.stockQuantity.toLocaleString("vi-VN")}</span>
                        </span>
                        {isOutOfStock && (
                          <span className="ml-1 text-[10px] font-semibold text-rose-500">(Hết)</span>
                        )}
                        {isLowStock && (
                          <span className="ml-1 text-[10px] font-semibold text-amber-500">(Ít)</span>
                        )}
                      </td>

                      {/* CỘT GIÁ VỐN & BIÊN LỢI NHUẬN (Chỉ hiển thị cho ADMIN & SALES_MANAGER) */}
                      {canViewCostPrice && (
                        <>
                          <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-700 bg-emerald-50/20 whitespace-nowrap">
                            {formatCurrency(p.costPrice)}
                          </td>
                          <td className="px-3 py-2.5 text-right bg-emerald-50/20 whitespace-nowrap">
                            {p.margin !== undefined ? (
                              <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 font-mono">
                                +{p.margin}%
                              </span>
                            ) : (
                              "---"
                            )}
                          </td>
                        </>
                      )}

                      {/* Cột 9: Trạng thái */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {p.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Đang kinh doanh</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>Ngừng kinh doanh</span>
                          </span>
                        )}
                      </td>

                      {/* Cột 10: Thao tác */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Sửa thông tin */}
                          {canManageProducts && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(p)}
                              className="btn-icon text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              title="Sửa thông tin SKU"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Bật/Tắt trạng thái */}
                          {canManageProducts && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(p)}
                              className={`btn-icon transition-colors ${
                                p.status === "ACTIVE"
                                  ? "text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                                  : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                              }`}
                              title={
                                p.status === "ACTIVE"
                                  ? "Chuyển sang Ngừng kinh doanh"
                                  : "Kích hoạt Đang kinh doanh"
                              }
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          )}

                          {/* Điều chỉnh tồn kho (Thủ kho / Admin) */}
                          {canAdjustStock && (
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(p)}
                              className="btn-icon text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="Điều chỉnh tồn kho"
                            >
                              <Warehouse className="h-4 w-4" />
                            </button>
                          )}

                          {/* Sổ kho & Lịch sử quy đổi giao dịch (SN-23) */}
                          <button
                            type="button"
                            onClick={() => handleOpenLedgerModal(p.sku)}
                            className="btn-icon text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="Xem Sổ kho & Lịch sử quy đổi của SKU này"
                          >
                            <BookOpen className="h-4 w-4" />
                          </button>

                          {/* Xóa sản phẩm (Có kiểm tra khóa giao dịch) */}
                          {canManageProducts && (
                            <button
                              type="button"
                              onClick={() => handlePromptDelete(p)}
                              className={`btn-icon transition-colors ${
                                p.hasTransactions
                                  ? "text-slate-300 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              }`}
                              title={
                                p.hasTransactions
                                  ? "Sản phẩm đã có giao dịch (Chặn xóa an toàn)"
                                  : "Xóa sản phẩm khỏi danh mục"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
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
                    setSearchInput("");
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
                            (e.target as HTMLElement).style.display = "none";
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
                        {p.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Đang KD</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>Ngừng KD</span>
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 mt-1" title={p.name}>
                        {p.name}
                      </h4>

                      {/* Phân cấp danh mục */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[11px]">
                        <span className="rounded-md bg-[var(--color-primary-light)] px-1.5 py-0.5 font-semibold text-[var(--color-primary)] ring-1 ring-inset ring-[var(--color-primary-subtle)] truncate max-w-[140px]">
                          {p.parentCategory || p.category?.split("/")[0]?.trim() || "Nhóm hàng"}
                        </span>
                        {p.category && p.category.includes("/") ? (
                          <span className="text-slate-400 font-medium truncate max-w-[140px]">
                            ↳ {p.category.split("/").slice(1).map((s) => s.trim()).join(" > ")}
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
                      <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Giá niêm yết</span>
                      <div className="font-extrabold text-blue-700 text-sm tracking-tight">
                        {formatCurrency(p.price)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ĐVT: <strong className="text-slate-600 font-semibold">{p.baseUnit}</strong>
                        {p.units && p.units.filter((u) => !u.isBaseUnit).length > 0 && (
                          <span className="text-[10px] text-blue-600 block mt-0.5">
                            Quy đổi: {p.units.filter((u) => !u.isBaseUnit).map((u) => `${u.unitName} (x${u.conversionRate})`).join(", ")}
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Tồn kho khả dụng</span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 font-extrabold text-sm tracking-tight ${
                            isOutOfStock
                              ? "text-rose-600"
                              : isLowStock
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          <Warehouse className="h-3.5 w-3.5" />
                          <span>{p.stockQuantity.toLocaleString("vi-VN")}</span>
                        </span>
                        {isOutOfStock && <span className="text-[10px] font-bold text-rose-500">(Hết)</span>}
                        {isLowStock && <span className="text-[10px] font-bold text-amber-500">(Ít)</span>}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Quy cách: <span className="text-slate-600 font-medium">{p.packagingSpec || "Chuẩn"}</span>
                      </span>
                    </div>

                    {/* Hiển thị Giá vốn & Biên LN nếu có quyền */}
                    {canViewCostPrice && (
                      <>
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-medium text-slate-400 block">Giá vốn</span>
                          <span className="font-bold text-slate-700 text-xs tracking-tight">
                            {formatCurrency(p.costPrice)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-medium text-slate-400 block">Biên lợi nhuận</span>
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
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                    <span className="text-[11px] text-slate-400 font-medium">Thao tác:</span>
                    <div className="flex items-center gap-1.5">
                      {/* Sửa thông tin */}
                      {canManageProducts && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          title="Sửa thông tin SKU"
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                          <span>Sửa</span>
                        </button>
                      )}

                      {/* Điều chỉnh tồn kho */}
                      {canAdjustStock && (
                        <button
                          type="button"
                          onClick={() => handleOpenAdjustModal(p)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          title="Điều chỉnh tồn kho"
                        >
                          <Warehouse className="h-4 w-4 text-indigo-600" />
                          <span>Kho</span>
                        </button>
                      )}

                      {/* Sổ kho & Lịch sử quy đổi */}
                      <button
                        type="button"
                        onClick={() => handleOpenLedgerModal(p.sku)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-2xs"
                        title="Xem Sổ kho & Lịch sử quy đổi"
                      >
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <span>Sổ</span>
                      </button>

                      {/* Bật / Tắt trạng thái kinh doanh */}
                      {canManageProducts && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 text-xs font-medium ${
                            p.status === "ACTIVE"
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={
                            p.status === "ACTIVE"
                              ? "Chuyển sang Ngừng kinh doanh"
                              : "Kích hoạt Đang kinh doanh"
                          }
                        >
                          <Power className="h-4 w-4" />
                          <span>{p.status === "ACTIVE" ? "Tắt" : "Bật"}</span>
                        </button>
                      )}

                      {/* Xóa sản phẩm */}
                      {canManageProducts && (
                        <button
                          type="button"
                          onClick={() => handlePromptDelete(p)}
                          className={`btn-icon border transition-all cursor-pointer active:scale-95 ${
                            p.hasTransactions
                              ? "border-slate-200 text-slate-300 hover:text-amber-600 hover:bg-amber-50"
                              : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                          }`}
                          title={
                            p.hasTransactions
                              ? "Không thể xóa: SKU đã phát sinh giao dịch xuất/nhập"
                              : "Xóa sản phẩm"
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

        {/* 4. Thanh phân trang chuẩn Clean SaaS (Mặc định 20 dòng / trang) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/40">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              Hiển thị{" "}
              <strong>
                {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)}
              </strong>{" "}
              trong tổng số <strong>{total}</strong> SKU sản phẩm
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-slate-400">Số dòng/trang:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng (Chuẩn)</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Trước</span>
            </button>

            {/* Các nút bấm trang */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - page) <= 1
                )
                .map((p, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsisBefore && (
                        <span className="px-1 text-slate-400 font-bold">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPage(p)}
                        className={`h-7 min-w-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          page === p
                            ? "bg-blue-600 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

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
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[2px] animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteModalOpen(false);
            }}
          >
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg border border-slate-100 animate-modal-in text-slate-800">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="absolute top-4 right-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-rose-50 border border-rose-100 text-rose-600 shrink-0">
                <Trash2 className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận Xóa Sản phẩm
                </h3>
                <p className="text-xs text-slate-500">
                  Mã SKU: <span className="font-mono font-bold text-slate-800">{productToDelete.sku}</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-600 space-y-1 mb-5">
              <p>
                Bạn có chắc chắn muốn xóa sản phẩm <strong>"{productToDelete.name}"</strong> khỏi danh mục hàng hóa?
              </p>
              <p className="text-[11px] text-rose-600 font-medium">
                * Thao tác này không thể hoàn tác sau khi xác nhận.
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
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 7. Modal Điều chỉnh tồn kho (Chỉ Thủ kho & Admin) */}
      {adjustModalOpen &&
        selectedProductForAdjust &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[2px] animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAdjustModalOpen(false);
            }}
          >
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-lg border border-slate-100 z-10 space-y-4 animate-modal-in text-slate-800">
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
                    {selectedProductForAdjust.stockQuantity.toLocaleString("vi-VN")} {selectedProductForAdjust.baseUnit}
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
                      ?.filter((u) => !u.isBaseUnit && u.unitName.toLowerCase() !== selectedProductForAdjust.baseUnit.toLowerCase())
                      .map((u) => (
                        <option key={u.unitName} value={u.unitName}>
                          {u.unitName} (Quy đổi x{u.conversionRate} {selectedProductForAdjust.baseUnit})
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
                    {Number(quantityChange) > 0 ? "+" : ""}{quantityChange} {adjustUnit} × {selectedUnitRate} ={" "}
                    <span className="text-blue-900 underline underline-offset-2">
                      {baseCalculatedChange > 0 ? "+" : ""}{baseCalculatedChange} {selectedProductForAdjust.baseUnit}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between font-medium text-slate-600">
                  <span>Tồn kho sau khi ghi sổ:</span>
                  <span className="font-bold text-slate-900">
                    {selectedProductForAdjust.stockQuantity + baseCalculatedChange} {selectedProductForAdjust.baseUnit}
                  </span>
                </div>
                {selectedProductForAdjust.stockQuantity + baseCalculatedChange < 0 && (
                  <p className="text-[11px] text-rose-600 font-bold bg-rose-50 border border-rose-200 p-2 rounded-lg mt-1">
                    ⚠️ Cảnh báo: Xuất vượt quá tồn hiện tại ({selectedProductForAdjust.stockQuantity} {selectedProductForAdjust.baseUnit}). Nghiệp vụ kho ngăn chặn ghi nhận tồn kho âm!
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
                  disabled={adjusting || (selectedProductForAdjust.stockQuantity + baseCalculatedChange < 0)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.99] shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {adjusting ? "Đang ghi sổ..." : "Xác nhận ghi sổ kho"}
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
            showToast("success", "Nhập danh mục từ Excel thành công");
            loadProducts();
          }}
        />
      )}

      {/* 9. Modal Sổ kho & Lịch sử quy đổi giao dịch (SN-23 AC-2 & AC-3) */}
      {ledgerModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-[2px] animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLedgerModalOpen(false);
            }}
          >
            <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-lg border border-slate-100 animate-modal-in text-slate-800 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 border border-blue-100 text-blue-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Sổ Kho & Lịch sử Bút toán Quy đổi Giao dịch (SN-23)
                    </h3>
                    <p className="text-xs text-slate-500">
                      {ledgerSku ? (
                        <>Mã SKU: <span className="font-mono font-bold text-blue-700">{ledgerSku}</span></>
                      ) : (
                        "Toàn bộ bút toán phát sinh trong kho"
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
                  <span className="font-bold">Bảo toàn bất biến (Snapshot Immutability - AC-3):</span>{" "}
                  Hệ thống đóng băng hệ số quy đổi tại thời điểm ghi sổ. Khi thủ kho sửa đổi hệ số quy đổi của SKU (vd: Thùng từ 24 lon lên 30 lon), toàn bộ bút toán lịch sử trước đó không bao giờ bị sai lệch số liệu!
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
                    <p className="font-semibold text-slate-600 text-sm">Chưa có bút toán nào được ghi nhận</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Hãy thực hiện thao tác nhập kho hoặc điều chỉnh tồn theo Thùng/Lốc để kiểm tra ghi sổ tự động.
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
                                <div>{new Date(tx.createdAt).toLocaleDateString("vi-VN")}</div>
                                <div className="text-[10px] text-slate-400">{new Date(tx.createdAt).toLocaleTimeString("vi-VN")}</div>
                              </td>
                              <td className="px-3 py-2.5 font-mono font-semibold text-blue-700 whitespace-nowrap">
                                {tx.referenceCode || tx.id.slice(0, 8)}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="font-mono font-bold text-slate-900 block">{tx.sku}</span>
                                <span className="text-[11px] text-slate-500 truncate max-w-[160px] block">{tx.productName}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    tx.transactionType === "IMPORT"
                                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                                      : tx.transactionType === "EXPORT"
                                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                                      : "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20"
                                  }`}
                                >
                                  {tx.transactionType === "IMPORT"
                                    ? "Nhập kho"
                                    : tx.transactionType === "EXPORT"
                                    ? "Xuất kho"
                                    : "Điều chỉnh"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                                {isPositive ? "+" : ""}{tx.inputQuantity} <span className="text-slate-500 font-normal">{tx.inputUnit}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center font-mono text-slate-600 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-[11px]">
                                  x{tx.conversionRate}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap bg-blue-50/50">
                                <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                                  {isPositive ? "+" : ""}{tx.baseQuantityChange} {tx.baseUnit}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                                {tx.newStock} {tx.baseUnit}
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-slate-600">
                                <div>{tx.reason}</div>
                                {tx.performedBy && (
                                  <div className="text-[10px] text-slate-400">Bởi: {tx.performedBy}</div>
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
            <div className="relative z-10 w-full sm:max-w-md bg-white shadow-xl flex flex-col max-h-[88vh] sm:max-h-full sm:h-full mt-auto sm:mt-0 rounded-t-3xl sm:rounded-none sm:rounded-l-3xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
              {/* Header Drawer */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl sm:rounded-none sm:rounded-tl-3xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Filter className="h-5 w-5" />
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
                    onChange={(e) => {
                      setSelectedParentCategory(e.target.value);
                      setSelectedSubCategory("ALL");
                      setSelectedChildCategory("ALL");
                      setSelectedCategoryId("ALL");
                      setPage(1);
                    }}
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
                    onChange={(e) => {
                      setSelectedSubCategory(e.target.value);
                      setSelectedChildCategory("ALL");
                      setSelectedCategoryId("ALL");
                      setPage(1);
                    }}
                    disabled={selectedParentCategory === "ALL" || subCategoriesForFilter.length === 0}
                    className="w-full h-11 px-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                  >
                    <option value="ALL">
                      {selectedParentCategory === "ALL"
                        ? "Chọn Cấp 1 để lọc Cấp 2"
                        : "Tất cả Nhóm Cấp 2"}
                    </option>
                    {subCategoriesForFilter.map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Phân loại con Cấp 3 (nếu có) */}
                {childCategoriesForFilter.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-indigo-700 block">
                      Phân loại con Cấp 3
                    </label>
                    <select
                      value={selectedChildCategory}
                      onChange={(e) => {
                        setSelectedChildCategory(e.target.value);
                        setSelectedCategoryId("ALL");
                        setPage(1);
                      }}
                      className="w-full h-11 px-3.5 text-xs rounded-xl border border-indigo-200 bg-white text-indigo-900 font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                    >
                      <option value="ALL">Tất cả Phân loại Cấp 3</option>
                      {childCategoriesForFilter.map((child) => (
                        <option key={child.id} value={child.name}>
                          {child.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 4. Trạng thái kinh doanh */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Trạng thái kinh doanh
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value as ProductStatus | "ALL");
                      setPage(1);
                    }}
                    className="w-full h-11 px-3.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="ALL">Tất cả Trạng thái</option>
                    <option value="ACTIVE">Đang kinh doanh</option>
                    <option value="INACTIVE">Ngừng kinh doanh</option>
                  </select>
                </div>

                {/* Đang lọc theo nhánh Cây danh mục */}
                {selectedCategoryId !== "ALL" && (
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
                        setSelectedCategoryId("ALL");
                        setSearchParams({});
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
    </div>
  );
};
