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
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { productsService, PRODUCT_CATEGORIES } from "../services/products.service";
import { categoriesService } from "../services/categories.service";
import { inventoryService } from "../services/inventory.service";
import { ProductFormModal } from "../components/product-form-modal";
import { Toast, type ToastType } from "../components/toast";
import type {
  Product,
  ProductStatus,
  ProductCategory,
  AdjustStockPayload,
  CreateProductPayload,
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

  // Toast thông báo nổi góc màn hình
  const [toast, setToast] = useState<{
    type: ToastType;
    title?: string;
    message: string;
  } | null>(null);

  // Modal Thêm / Sửa sản phẩm
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal Xác nhận xóa sản phẩm
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal Điều chỉnh tồn kho (Dành cho Thủ kho / Admin)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [quantityChange, setQuantityChange] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>("Kiểm kê định kỳ");
  const [adjusting, setAdjusting] = useState(false);

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
    } catch (err: unknown) {
      const error = err as Error;
      setToast({
        type: "error",
        title: "Tải danh mục thất bại",
        message: error.message || "Không thể tải danh sách sản phẩm từ máy chủ.",
      });
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
      setToast({
        type: "success",
        title: "Cập nhật thành công",
        message: `Đã lưu các thay đổi cho sản phẩm [${payload.sku} - ${payload.name}].`,
      });
    } else {
      await productsService.createProduct(payload);
      setToast({
        type: "success",
        title: "Tạo sản phẩm thành công",
        message: `Đã thêm sản phẩm mới [${payload.sku} - ${payload.name}] vào danh mục.`,
      });
    }
    await loadProducts();
  };

  // Bật/tắt trạng thái kinh doanh
  const handleToggleStatus = async (p: Product) => {
    if (!canManageProducts) return;
    const newStatus: ProductStatus = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await productsService.toggleProductStatus(p.id, newStatus);
      setToast({
        type: "success",
        title: newStatus === "ACTIVE" ? "Đã kích hoạt kinh doanh" : "Đã chuyển ngừng kinh doanh",
        message: `Sản phẩm [${p.sku}] hiện đang ở trạng thái: ${
          newStatus === "ACTIVE" ? "Đang kinh doanh" : "Ngừng kinh doanh"
        }.`,
      });
      await loadProducts();
    } catch (err: unknown) {
      const error = err as Error;
      setToast({
        type: "error",
        title: "Thao tác thất bại",
        message: error.message || "Không thể cập nhật trạng thái sản phẩm.",
      });
    }
  };

  // Mở modal xác nhận xóa
  const handlePromptDelete = (p: Product) => {
    if (p.hasTransactions) {
      setToast({
        type: "warning",
        title: "Khóa xóa an toàn (SN-139)",
        message: `Sản phẩm [${p.sku}] đã có phát sinh giao dịch kho/đơn hàng. Hệ thống chặn xóa để bảo đảm dữ liệu kế toán, bạn chỉ có thể chuyển sang trạng thái Ngừng kinh doanh!`,
      });
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
      setToast({
        type: "success",
        title: "Đã xóa sản phẩm",
        message: `Sản phẩm [${productToDelete.sku}] đã được xóa vĩnh viễn khỏi danh mục.`,
      });
      setDeleteModalOpen(false);
      setProductToDelete(null);
      await loadProducts();
    } catch (err: unknown) {
      const error = err as Error;
      setToast({
        type: "error",
        title: "Xóa thất bại",
        message: error.message || "Không thể xóa sản phẩm.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Mở modal điều chỉnh tồn kho
  const handleOpenAdjustModal = (product: Product) => {
    setSelectedProductForAdjust(product);
    setQuantityChange(10);
    setAdjustReason("Kiểm kê thực tế tại kho");
    setAdjustModalOpen(true);
  };

  // Submit điều chỉnh tồn kho
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;

    try {
      setAdjusting(true);
      const payload: AdjustStockPayload = {
        productSku: selectedProductForAdjust.sku,
        quantityChange: Number(quantityChange),
        reason: adjustReason,
      };

      const result = await inventoryService.adjustStock(payload);

      setToast({
        type: "success",
        title: "Điều chỉnh tồn thành công",
        message: `Đã điều chỉnh tồn kho cho ${result.sku}: Từ ${result.previousQuantity} -> ${result.newQuantity} (${result.quantityChange > 0 ? "+" : ""}${result.quantityChange})`,
      });

      setAdjustModalOpen(false);
      await loadProducts();
    } catch (err: unknown) {
      const error = err as Error & { response?: { data?: { message?: string } } };
      setToast({
        type: "error",
        title: "Điều chỉnh thất bại",
        message:
          error.response?.data?.message ||
          error.message ||
          "Không thể điều chỉnh tồn kho. Vui lòng kiểm tra quyền hạn.",
      });
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast thông báo trượt mượt mà từ góc phải */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

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
            <p className="text-sm text-slate-500 max-w-2xl">
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

      {/* 2. Thanh công cụ lọc & Tìm kiếm (Search with Debounce, Categories Cấp 1, Cấp 2, Status) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Lọc Phân loại con Cấp 3 (nếu nhóm Cấp 2 có Cấp 3) */}
          {childCategoriesForFilter.length > 0 && (
            <div className="relative">
              <select
                value={selectedChildCategory}
                onChange={(e) => {
                  setSelectedChildCategory(e.target.value);
                  setSelectedCategoryId("ALL");
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-200 bg-white text-indigo-900 font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
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

          {/* Chip hiển thị khi đang lọc theo nhánh Cây từ Trang Cây danh mục */}
          {selectedCategoryId !== "ALL" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-medium text-[11px]">
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

      {/* 3. Bảng dữ liệu Sản phẩm (Data Table chuẩn Clean SaaS) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
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
                <tr>
                  <td
                    colSpan={canViewCostPrice ? 12 : 10}
                    className="py-14 text-center text-slate-400"
                  >
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span className="font-medium text-xs">Đang tải danh mục SKU sản phẩm...</span>
                  </td>
                </tr>
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
                          <span className="inline-block w-fit rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-700/10 truncate">
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

                      {/* Cột 5: ĐVT cơ sở */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {p.baseUnit}
                        </span>
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
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
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
                              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
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
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Điều chỉnh tồn kho"
                            >
                              <Warehouse className="h-4 w-4" />
                            </button>
                          )}

                          {/* Xóa sản phẩm (Có kiểm tra khóa giao dịch) */}
                          {canManageProducts && (
                            <button
                              type="button"
                              onClick={() => handlePromptDelete(p)}
                              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
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
                            ? "bg-blue-600 text-white shadow-2xs shadow-blue-600/30"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteModalOpen(false);
            }}
          >
          <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-modal-in text-slate-800">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="absolute top-4 right-4 rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 shadow-2xs shrink-0">
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
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-xs font-semibold text-white shadow-xs cursor-pointer disabled:opacity-50"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-modal-backdrop-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAdjustModalOpen(false);
            }}
          >
          <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 z-10 space-y-4 animate-modal-in text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Điều chỉnh Tồn kho Thực tế
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3.5 text-xs space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã SKU:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedProductForAdjust.sku}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tên hàng:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[220px]">
                    {selectedProductForAdjust.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tồn kho hiện tại:</span>
                  <span className="font-bold text-blue-600">
                    {selectedProductForAdjust.stockQuantity} {selectedProductForAdjust.baseUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quy cách:</span>
                  <span className="font-medium text-slate-700">
                    {selectedProductForAdjust.packagingSpec || "---"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số lượng thay đổi (+ để tăng, - để giảm) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-bold"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tồn mới sau điều chỉnh:{" "}
                  <strong className="text-blue-600">
                    {Math.max(0, selectedProductForAdjust.stockQuantity + Number(quantityChange))}
                  </strong>{" "}
                  {selectedProductForAdjust.baseUnit}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do điều chỉnh (Bắt buộc cho sổ kho) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ví dụ: Kiểm kê định kỳ, bù hao hụt vận chuyển..."
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
                  disabled={adjusting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.99] shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {adjusting ? "Đang xử lý..." : "Xác nhận điều chỉnh"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
