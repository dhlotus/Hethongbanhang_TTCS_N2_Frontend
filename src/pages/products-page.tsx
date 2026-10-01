import React, { useEffect, useState } from "react";
import {
  Package,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  TrendingUp,
  Warehouse,
  Boxes,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { productsService } from "../services/products.service";
import { inventoryService } from "../services/inventory.service";
import type { Product, AdjustStockPayload } from "../types/products";

// Dữ liệu mẫu dự phòng khi chưa kết nối mạng
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "prod-001",
    sku: "LH-MILK-900G",
    name: "Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g",
    category: "Sữa Dinh Dưỡng",
    baseUnit: "Lon",
    price: 520000,
    costPrice: 380000,
    margin: 26.92,
    stockQuantity: 340,
    status: "ACTIVE",
    description: "Dòng sữa dinh dưỡng bổ sung Canxi và DHA cho trẻ nhỏ và người lớn tuổi",
  },
  {
    id: "prod-002",
    sku: "LH-NUT-180ML",
    name: "Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml",
    category: "Sữa Dinh Dưỡng",
    baseUnit: "Hộp",
    price: 18000,
    costPrice: 11500,
    margin: 36.11,
    stockQuantity: 1200,
    status: "ACTIVE",
    description: "Sữa hạt thuần chay ít ngọt tốt cho tim mạch",
  },
  {
    id: "prod-003",
    sku: "LH-NEST-70ML",
    name: "Nước Yến Sào Chưng Đường Phèn Loha Nest 70ml",
    category: "Yến Sào & Bổ Dưỡng",
    baseUnit: "Hũ",
    price: 65000,
    costPrice: 42000,
    margin: 35.38,
    stockQuantity: 580,
    status: "ACTIVE",
    description: "Tổ yến thiên nhiên chưng đường phèn thanh mát",
  },
  {
    id: "prod-004",
    sku: "LH-CEREAL-500G",
    name: "Ngũ Cốc Dinh Dưỡng Hạt Mầm Loha Meal 500g",
    category: "Ngũ Cốc Thực Dưỡng",
    baseUnit: "Túi",
    price: 145000,
    costPrice: 95000,
    margin: 34.48,
    stockQuantity: 410,
    status: "ACTIVE",
    description: "Hỗn hợp 12 loại hạt mầm nướng chín nguyên chất",
  },
  {
    id: "prod-005",
    sku: "LH-COLLAGEN-50ML",
    name: "Nước Uống Collagen Đông Trùng Hạ Thảo 50ml",
    category: "Thực Phẩm Chức Năng",
    baseUnit: "Chai",
    price: 85000,
    costPrice: 55000,
    margin: 35.29,
    stockQuantity: 260,
    status: "ACTIVE",
    description: "Collagen thủy phân kết hợp chiết xuất đông trùng",
  },
];

const formatCurrency = (val?: number): string => {
  if (val === undefined || val === null) return "---";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(val);
};

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // State cho Modal Điều chỉnh tồn kho
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityChange, setQuantityChange] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>("Kiểm kê định kỳ");
  const [adjusting, setAdjusting] = useState(false);

  // Xác định vai trò của người dùng hiện tại
  const user = getStoredUser();
  const userRoles = user?.roles || [];

  // 1. Phân quyền xem Giá vốn & Biên lợi nhuận (Chỉ ADMIN & SALES_MANAGER)
  const canViewCostPrice =
    userRoles.includes("ADMIN") || userRoles.includes("SALES_MANAGER");

  // 2. Phân quyền điều chỉnh tồn kho (Chỉ ADMIN & WAREHOUSE_KEEPER / WAREHOUSE_MANAGER)
  const canAdjustStock =
    userRoles.includes("ADMIN") ||
    userRoles.includes("WAREHOUSE_KEEPER") ||
    userRoles.includes("WAREHOUSE_MANAGER") ||
    userRoles.includes("WAREHOUSE") ||
    userRoles.includes("WH_MANAGER");

  // 3. Phân quyền thêm sản phẩm (Chỉ ADMIN & SALES_MANAGER)
  const canCreateProduct =
    userRoles.includes("ADMIN") || userRoles.includes("SALES_MANAGER");

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsService.getProducts();
      setProducts(data);
    } catch {
      // Nếu Backend chưa có hoặc có lỗi, áp dụng logic bảo vệ cho fallback
      if (!canViewCostPrice) {
        const sanitized = FALLBACK_PRODUCTS.map((p) => {
          const { costPrice, margin, ...rest } = p;
          return rest as Product;
        });
        setProducts(sanitized);
      } else {
        setProducts(FALLBACK_PRODUCTS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setQuantityChange(10);
    setAdjustReason("Kiểm kê thực tế tại kho");
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      setAdjusting(true);
      const payload: AdjustStockPayload = {
        productSku: selectedProduct.sku,
        quantityChange: Number(quantityChange),
        reason: adjustReason,
      };

      const result = await inventoryService.adjustStock(payload);

      setNotification({
        type: "success",
        message: `Đã điều chỉnh tồn kho cho ${result.sku}: Từ ${result.previousQuantity} -> ${result.newQuantity} (${result.quantityChange > 0 ? "+" : ""}${result.quantityChange})`,
      });

      // Cập nhật lại số lượng trong state sản phẩm
      setProducts((prev) =>
        prev.map((p) =>
          p.sku === selectedProduct.sku
            ? { ...p, stockQuantity: result.newQuantity }
            : p,
        ),
      );

      setAdjustModalOpen(false);
    } catch (err: any) {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message ||
          "Không thể điều chỉnh tồn kho. Vui lòng kiểm tra quyền hạn.",
      });
    } finally {
      setAdjusting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
                <span>Danh mục SKU Hàng hóa (EP-02)</span>
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
              Quản lý Danh mục Sản phẩm & Tồn kho
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              Hệ thống quản lý sản phẩm B2B chuẩn hóa quy đổi đơn vị cơ sở, kiểm
              soát tồn kho khả dụng và bảo mật dữ liệu nhạy cảm theo vai trò nghiệp vụ.
            </p>
          </div>

          {/* Nhóm nút hành động phân quyền */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadProducts}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all focus:outline-none"
              title="Làm mới dữ liệu từ server"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            {canCreateProduct && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-all focus:outline-none"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm sản phẩm</span>
              </button>
            )}
          </div>
        </div>

        {/* Thông báo bảo mật dữ liệu nhạy cảm */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
          {canViewCostPrice ? (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                <strong>Chế độ Quản lý:</strong> Bạn có quyền truy xuất cột Giá
                vốn (Cost Price) và Biên lợi nhuận (%) được cấp phép từ máy chủ.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                <strong>Bảo mật bí mật kinh doanh:</strong> Cột Giá vốn và Biên
                lợi nhuận đã được loại bỏ ở tầng máy chủ (NestJS Interceptor) đối với vai trò hiện tại.
              </span>
            </div>
          )}
          <span className="text-slate-400 font-mono text-[11px]">
            Tài khoản: {user?.username} ({userRoles.join(", ")})
          </span>
        </div>
      </div>

      {/* Thông báo kết quả thao tác */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-xs font-medium border ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Thanh tìm kiếm & Thống kê nhanh */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo SKU, tên sản phẩm, ngành hàng..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-center">
          <Boxes className="h-4 w-4 text-slate-400" />
          <span>
            Tổng cộng: <strong>{filteredProducts.length}</strong> sản phẩm
          </span>
        </div>
      </div>

      {/* 3. Bảng dữ liệu sản phẩm (Card-based Table chuẩn UI_GUIDELINES.md) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Mã SKU</th>
                <th className="px-5 py-3.5 font-semibold">Tên sản phẩm</th>
                <th className="px-5 py-3.5 font-semibold">Ngành hàng</th>
                <th className="px-5 py-3.5 font-semibold text-center">ĐVT Cơ sở</th>
                <th className="px-5 py-3.5 font-semibold text-right">Giá bán niêm yết</th>
                <th className="px-5 py-3.5 font-semibold text-right">Tồn kho khả dụng</th>

                {/* CỘT NHẠY CẢM: Chỉ render khi canViewCostPrice = TRUE (SN-10) */}
                {canViewCostPrice && (
                  <>
                    <th className="px-5 py-3.5 font-semibold text-right text-emerald-800 bg-emerald-50/50">
                      <div className="flex items-center justify-end gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Giá vốn (Cost)</span>
                      </div>
                    </th>
                    <th className="px-5 py-3.5 font-semibold text-right text-emerald-800 bg-emerald-50/50">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Biên LN</span>
                      </div>
                    </th>
                  </>
                )}

                <th className="px-5 py-3.5 font-semibold text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td
                    colSpan={canViewCostPrice ? 9 : 7}
                    className="py-12 text-center text-slate-400"
                  >
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Đang tải danh mục sản phẩm...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={canViewCostPrice ? 9 : 7}
                    className="py-12 text-center text-slate-400"
                  >
                    Không tìm thấy sản phẩm phù hợp với từ khóa
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Mã SKU */}
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      {p.sku}
                    </td>

                    {/* Tên sản phẩm */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">
                        {p.name}
                      </div>
                      {p.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {p.description}
                        </div>
                      )}
                    </td>

                    {/* Ngành hàng */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {p.category}
                      </span>
                    </td>

                    {/* Đơn vị tính */}
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {p.baseUnit}
                      </span>
                    </td>

                    {/* Giá bán niêm yết */}
                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(p.price)}
                    </td>

                    {/* Tồn kho */}
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          p.stockQuantity > 500
                            ? "text-emerald-600"
                            : p.stockQuantity > 100
                            ? "text-blue-600"
                            : "text-amber-600"
                        }`}
                      >
                        <Warehouse className="h-3.5 w-3.5" />
                        <span>{p.stockQuantity.toLocaleString("vi-VN")}</span>
                      </span>
                    </td>

                    {/* CỘT GIÁ VỐN & BIÊN LỢI NHUẬN (Chỉ hiển thị cho ADMIN & SALES_MANAGER) */}
                    {canViewCostPrice && (
                      <>
                        <td className="px-5 py-4 text-right font-mono font-medium text-slate-700 bg-emerald-50/20">
                          {formatCurrency(p.costPrice)}
                        </td>
                        <td className="px-5 py-4 text-right bg-emerald-50/20">
                          {p.margin !== undefined ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              +{p.margin}%
                            </span>
                          ) : (
                            "---"
                          )}
                        </td>
                      </>
                    )}

                    {/* Cột thao tác */}
                    <td className="px-5 py-4 text-center">
                      {canAdjustStock ? (
                        <button
                          type="button"
                          onClick={() => handleOpenAdjustModal(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                        >
                          <Warehouse className="h-3 w-3" />
                          <span>Chỉnh tồn kho</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Chỉ xem
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal Điều chỉnh tồn kho (Chỉ Thủ kho & Admin mới có thể mở) */}
      {adjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setAdjustModalOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Điều chỉnh Tồn kho
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã SKU:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedProduct.sku}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tên hàng:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                    {selectedProduct.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tồn kho hiện tại:</span>
                  <span className="font-bold text-blue-600">
                    {selectedProduct.stockQuantity} {selectedProduct.baseUnit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số lượng thay đổi (+ để tăng, - để giảm)
                </label>
                <input
                  type="number"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tồn mới dự kiến:{" "}
                  <strong>
                    {Math.max(0, selectedProduct.stockQuantity + Number(quantityChange))}
                  </strong>{" "}
                  {selectedProduct.baseUnit}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do điều chỉnh (Bắt buộc cho sổ kho)
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ví dụ: Kiểm kê định kỳ, bù hao hụt..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {adjusting ? "Đang xử lý..." : "Xác nhận điều chỉnh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
