import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  MapPin,
  Package,
  ArrowRight,
  TrendingUp,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { getUserContext } from "../utils/navigation-config";
import { inventoryService } from "../services/inventory.service";
import type { StockBalance } from "../types/inventory.types";
import { MinStockModal } from "../components/inventory/min-stock-modal";
import { Pagination } from "../components/pagination";

type InventoryTab = "stock" | "alerts";

const DEFAULT_WAREHOUSE_ID = "WH01";

interface RoleModulePageProps {
  title: string;
  subtitle: string;
  requiredRole: string;
}

/**
 * Trang hiển thị giao diện phân hệ nghiệp vụ (Card-based UI chuẩn UI_GUIDELINES.md):
 * - Tự động đồng bộ với Role và Ngữ cảnh của người dùng đăng nhập
 * - Hiển thị trạng thái phân quyền, địa bàn/kho trực thuộc
 * - Khung chức năng sạch sẽ, hiện đại, sẵn sàng cho các bảng dữ liệu chuyên sâu
 */
export const RoleModulePage: React.FC<RoleModulePageProps> = ({
  title,
  subtitle,
  requiredRole,
}) => {
  const location = useLocation();
  const user = getStoredUser();
  const context = getUserContext(user);
  const [stockRows, setStockRows] = useState<StockBalance[]>([]);
  const [editingItem, setEditingItem] = useState<StockBalance | null>(null);
  const [activeTab, setActiveTab] = useState<InventoryTab>("stock");
  const [pageSize, setPageSize] = useState<number>(10);
  const [stockPage, setStockPage] = useState<number>(1);
  const [alertPage, setAlertPage] = useState<number>(1);
  const isInventoryPage = location.pathname === "/inventory/stock";

  const reloadStock = (): Promise<void> =>
    inventoryService.getStockOverview().then(setStockRows).catch(() => setStockRows([]));

  useEffect(() => {
    if (!isInventoryPage) return;
    void reloadStock();
  }, [isInventoryPage]);

  const alertRows = stockRows
    .filter((row) => row.isBelowMinStock === true)
    .map((row) => ({ ...row, shortage: (row.minStockLevel ?? 0) - row.stockQuantity }))
    .sort((a, b) => b.shortage - a.shortage);

  const stockTotalPages = Math.max(1, Math.ceil(stockRows.length / pageSize));
  const alertTotalPages = Math.max(1, Math.ceil(alertRows.length / pageSize));
  const safeStockPage = Math.min(stockPage, stockTotalPages);
  const safeAlertPage = Math.min(alertPage, alertTotalPages);
  const pagedStockRows = stockRows.slice((safeStockPage - 1) * pageSize, safeStockPage * pageSize);
  const pagedAlertRows = alertRows.slice((safeAlertPage - 1) * pageSize, safeAlertPage * pageSize);

  const handleSaveMinStock = async (item: StockBalance, value: number): Promise<void> => {
    await inventoryService.updateMinStockLevel(
      item.warehouseId ?? DEFAULT_WAREHOUSE_ID,
      item.sku,
      value,
    );
    await reloadStock();
    setEditingItem(null);
  };

  const handlePageSizeChange = (size: number): void => {
    setPageSize(size);
    setStockPage(1);
    setAlertPage(1);
  };

  const tabClass = (tab: InventoryTab): string =>
    `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
      activeTab === tab
        ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`;

  const editButton = (item: StockBalance): React.ReactElement => (
    <button
      type="button"
      onClick={() => setEditingItem(item)}
      title="Sửa tồn tối thiểu"
      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-blue-600 hover:shadow-sm"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. Header Banner của Phân hệ                                        */}
      {/* =================================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-blue-50/60 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${context.badgeClass}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{context.roleLabel}</span>
              </span>

              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>{context.locationText}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              to="/catalog/products"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
              <Package className="h-4 w-4 text-slate-400" />
              <span>Tra cứu Sản phẩm</span>
            </Link>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. Grid Cards thông tin tổng quan & ngữ cảnh phân hệ                 */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Người dùng & Quyền hạn */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Tài khoản xác thực</p>
              <p className="text-sm font-bold text-slate-800 truncate">
                {context.fullName}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Vai trò hệ thống</span>
            <span className="font-semibold text-slate-700">{context.role}</span>
          </div>
        </div>

        {/* Card 2: Trạng thái kết nối & Kho / Địa bàn */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Trạng thái kết nối</p>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Hoạt động bình thường</span>
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Phạm vi công tác</span>
            <span className="font-semibold text-slate-700 truncate max-w-[170px]" title={context.locationText}>
              {context.locationText}
            </span>
          </div>
        </div>

        {/* Card 3: Phân hệ & Kiến trúc Dynamic Navigation */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Cơ chế điều hướng</p>
              <p className="text-sm font-bold text-slate-800">Điều hướng theo phân quyền</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Thẩm quyền cho phép</span>
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              {requiredRole}
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. Vùng nội dung trống sẵn sàng cho nghiệp vụ (Placeholder)         */}
      {/* =================================================================== */}
      {isInventoryPage ? (
        <div className="space-y-4">
          {/* Tabs dạng viên thuốc */}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setActiveTab("stock")} className={tabClass("stock")}>
              <Package className="h-4 w-4" />
              <span>Kho hàng</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === "stock" ? "bg-white/20" : "bg-white text-slate-500"}`}>
                {stockRows.length}
              </span>
            </button>
            <button type="button" onClick={() => setActiveTab("alerts")} className={tabClass("alerts")}>
              <AlertTriangle className="h-4 w-4" />
              <span>Cảnh báo đứt hàng</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === "alerts" ? "bg-white/20" : alertRows.length > 0 ? "bg-red-100 text-red-600" : "bg-white text-slate-500"}`}>
                {alertRows.length}
              </span>
            </button>
          </div>

          {activeTab === "stock" ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-800">Tồn thực tế và hàng đang giữ cho đơn</h2>
                <p className="mt-1 text-xs text-slate-500">Tồn khả dụng là số lượng có thể tiếp tục bán hoặc xuất kho.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                      <th className="px-5 py-3 text-right font-semibold">Tồn thực tế</th>
                      <th className="px-5 py-3 text-right font-semibold">Đang giữ</th>
                      <th className="px-5 py-3 text-right font-semibold">Khả dụng</th>
                      <th className="px-5 py-3 text-right font-semibold">Tồn tối thiểu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedStockRows.map((item) => (
                      <tr
                        key={item.sku}
                        className={item.isBelowMinStock === true ? "bg-red-50 text-red-600" : "hover:bg-slate-50/70"}
                      >
                        <td className="px-5 py-3">
                          <div className={`font-medium ${item.isBelowMinStock === true ? "text-red-600" : "text-slate-800"}`}>{item.name}</div>
                          <div className="text-xs text-slate-400">{item.sku}</div>
                        </td>
                        <td className={`px-5 py-3 text-right ${item.isBelowMinStock === true ? "text-red-600" : "text-slate-600"}`}>{(item.physicalStockQuantity ?? item.stockQuantity).toLocaleString("vi-VN")} {item.baseUnit}</td>
                        <td className="px-5 py-3 text-right font-medium text-amber-700">{(item.reservedQuantity ?? 0).toLocaleString("vi-VN")} {item.baseUnit}</td>
                        <td className={`px-5 py-3 text-right font-bold ${item.isBelowMinStock === true ? "text-red-600" : "text-emerald-700"}`}>
                          <span className="inline-flex items-center justify-end gap-1.5">
                            {item.isBelowMinStock === true && (
                              <AlertTriangle className="h-4 w-4" aria-label="Dưới mức tồn tối thiểu" />
                            )}
                            <span>{item.stockQuantity.toLocaleString("vi-VN")} {item.baseUnit}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex items-center justify-end gap-2">
                            <span className="font-medium">{(item.minStockLevel ?? 0).toLocaleString("vi-VN")} {item.baseUnit}</span>
                            {editButton(item)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {stockRows.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">Chưa tải được dữ liệu tồn kho.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-xs">
              <div className="border-b border-red-100 bg-red-50 px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-bold text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  SKU sắp đứt hàng
                </h2>
                <p className="mt-1 text-xs text-red-500">Tồn khả dụng ≤ tồn tối thiểu, mã hụt nhiều nhất xếp trên cùng.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                      <th className="px-5 py-3 font-semibold">Kho</th>
                      <th className="px-5 py-3 text-right font-semibold">Khả dụng</th>
                      <th className="px-5 py-3 text-right font-semibold">Tồn tối thiểu</th>
                      <th className="px-5 py-3 text-right font-semibold">Hụt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedAlertRows.map((item) => (
                      <tr key={item.sku} className="hover:bg-red-50/40">
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.sku}</div>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500">{item.warehouse}</td>
                        <td className="px-5 py-3 text-right font-bold text-red-600">{item.stockQuantity.toLocaleString("vi-VN")} {item.baseUnit}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex items-center justify-end gap-2 font-medium text-slate-700">
                            {(item.minStockLevel ?? 0).toLocaleString("vi-VN")} {item.baseUnit}
                            {editButton(item)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600">
                            -{item.shortage.toLocaleString("vi-VN")} {item.baseUnit}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {alertRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-emerald-700">
                          <span className="inline-flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Không có SKU nào dưới mức tồn tối thiểu.
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Thanh phân trang luôn dính ở đáy màn hình */}
          <div className="sticky bottom-3 z-20">
            {activeTab === "stock" ? (
              <Pagination
                variant="floating"
                currentPage={safeStockPage}
                totalPages={stockTotalPages}
                totalItems={stockRows.length}
                pageSize={pageSize}
                itemLabel="sản phẩm"
                onPageChange={setStockPage}
                onPageSizeChange={handlePageSizeChange}
              />
            ) : (
              <Pagination
                variant="floating"
                currentPage={safeAlertPage}
                totalPages={alertTotalPages}
                totalItems={alertRows.length}
                pageSize={pageSize}
                itemLabel="cảnh báo"
                onPageChange={setAlertPage}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>

          <MinStockModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={handleSaveMinStock}
          />
        </div>
      ) : (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 sm:p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs">
          <TrendingUp className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-800">
          Phân hệ {title}
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          Giao diện và điều hướng phân quyền đã được thiết lập thành công theo tiêu chuẩn LOHA SALES.
          Dữ liệu và các biểu mẫu tương tác chi tiết của phân hệ này đã sẵn sàng kết nối.
        </p>
        <div className="mt-5 flex justify-center flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span>Đường dẫn truy cập:</span>
            <code className="font-mono font-bold text-blue-600">{location.pathname}</code>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
