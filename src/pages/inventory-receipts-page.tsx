import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  Search,
  Package,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  Lock,
  SlidersHorizontal,
  Building2,
  AlertCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { showToast } from "../components/toast";
import { ModalLayout } from "../components/modal-layout";
import { Pagination } from "../components/pagination";
import { inventoryReceiptsService } from "../services/inventory-receipts.service";
import { productsService } from "../services/products.service";
import type { GoodsReceipt, GoodsReceiptStatus } from "../types/inventory-receipt";
import type { Product } from "../types/products";
import { ConfirmDeleteModal } from "../components/confirm-delete-modal";

const KNOWN_SUPPLIERS_MAP: Record<string, string> = {
  '22222222-0000-0000-0000-000000000001': 'Công ty Cổ phần Nước giải khát LOHA Quốc Tế',
  'ncc-bev-01': 'Công ty Cổ phần Nước giải khát LOHA Quốc Tế',
  'ncc-idp': 'Công ty Cổ phần Sữa Quốc Tế (IDP)',
  '22222222-0000-0000-0000-000000000002': 'Công ty TNHH Khai Thác Khoáng Tinh Khiết Aqua Life',
  'ncc-aqua-02': 'Công ty TNHH Khai Thác Khoáng Tinh Khiết Aqua Life',
  'ncc-nsx': 'Công ty TNHH Nông Sản Xanh Loha',
  '22222222-0000-0000-0000-000000000003': 'Công ty Cổ phần Sữa & Dinh Dưỡng Quốc Tế NutriPlus',
  'ncc-dairy-03': 'Công ty Cổ phần Sữa & Dinh Dưỡng Quốc Tế NutriPlus',
  '22222222-0000-0000-0000-000000000004': 'Nhà máy Bao Bì & Đóng Gói Tân Tiến Phát',
  'ncc-pack-04': 'Nhà máy Bao Bì & Đóng Gói Tân Tiến Phát',
  '22222222-0000-0000-0000-000000000005': 'Hợp tác xã Nông Sản Hữu Cơ Sạch Thảo Mộc Xanh',
  'ncc-old-05': 'Hợp tác xã Nông Sản Hữu Cơ Sạch Thảo Mộc Xanh',
};

const KNOWN_WAREHOUSES_MAP: Record<string, string> = {
  '11111111-0000-0000-0000-000000000001': 'Kho Miền Nam (TP. Hồ Chí Minh)',
  'kho-mn-01': 'Kho Miền Nam (TP. Hồ Chí Minh)',
  '11111111-0000-0000-0000-000000000002': 'Kho Miền Bắc (Hà Nội)',
  'kho-mb-01': 'Kho Miền Bắc (Hà Nội)',
  '11111111-0000-0000-0000-000000000003': 'Kho Miền Tây (Cần Thơ)',
  'kho-west-01': 'Kho Miền Tây (Cần Thơ)',
  '11111111-0000-0000-0000-000000000004': 'Kho Miền Trung (Đà Nẵng)',
  'kho-mt-01': 'Kho Miền Trung (Đà Nẵng)',
};

const getDisplaySupplierName = (receipt?: { supplierName?: string; supplierId?: string } | null): string => {
  if (!receipt) return 'Chưa chọn NCC';
  const name = receipt.supplierName?.trim();
  const isGeneric = !name || name === 'Nhà cung cấp' || name === 'Nhà cung cấp đối tác' || name === 'Chưa chọn NCC' || name === 'Nhà máy Bao Bì & Đóng Gói Loha';
  if (!isGeneric) return name;
  if (receipt.supplierId) {
    const key = receipt.supplierId.toLowerCase().trim();
    if (KNOWN_SUPPLIERS_MAP[key]) return KNOWN_SUPPLIERS_MAP[key];
  }
  return name && name !== 'Nhà cung cấp đối tác' ? name : 'Chưa chọn NCC';
};

const getDisplayWarehouseName = (receipt?: { warehouseName?: string; warehouseId?: string } | null): string => {
  if (!receipt) return 'Kho Miền Nam (TP. Hồ Chí Minh)';
  const name = receipt.warehouseName?.trim();
  const isGeneric = !name || name === 'Kho Tổng Miền Nam - LOHA WH01' || name === 'Kho Tổng Miền Nam';
  if (!isGeneric) return name;
  if (receipt.warehouseId) {
    const key = receipt.warehouseId.toLowerCase().trim();
    if (KNOWN_WAREHOUSES_MAP[key]) return KNOWN_WAREHOUSES_MAP[key];
  }
  return name || 'Kho Miền Nam (TP. Hồ Chí Minh)';
};

export const InventoryReceiptsPage: React.FC = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<GoodsReceiptStatus | "ALL">("ALL");

  // Modal xác nhận nhập kho
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [receiptToConfirm, setReceiptToConfirm] = useState<GoodsReceipt | null>(null);

  // Modal xóa phiếu nháp
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<GoodsReceipt | null>(null);

  // Modal xem chi tiết phiếu nhập
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

  // Dropdown Thao tác
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    top: number;
    right: number;
    isDropUp: boolean;
  } | null>(null);

  // Đóng dropdown khi click ra ngoài hoặc scroll
  useEffect(() => {
    const handleCloseMenu = () => {
      setOpenActionMenuId(null);
      setActionMenuAnchor(null);
    };
    window.addEventListener("click", handleCloseMenu);
    window.addEventListener("scroll", handleCloseMenu, true);
    return () => {
      window.removeEventListener("click", handleCloseMenu);
      window.removeEventListener("scroll", handleCloseMenu, true);
    };
  }, []);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryReceiptsService.findAll({
        page,
        limit: pageSize,
        search: searchTerm || undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
      });
      setReceipts(res.data || []);
      const totalCount = res.total || 0;
      setTotal(totalCount);
      const computedTotalPages = Math.ceil(totalCount / pageSize) || res.totalPages || 1;
      setTotalPages(computedTotalPages);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Lỗi khi tải danh sách phiếu nhập");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, selectedStatus]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleConfirmReceipt = async () => {
    if (!receiptToConfirm) return;
    try {
      await inventoryReceiptsService.confirm(receiptToConfirm.id);
      showToast("success", `Xác nhận phiếu nhập kho ${receiptToConfirm.code} thành công! Tồn kho đã được cộng.`);
      setConfirmModalOpen(false);
      fetchReceipts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Lỗi khi xác nhận phiếu nhập");
    }
  };

  const handleDeleteReceipt = async () => {
    if (!receiptToDelete) return;
    try {
      await inventoryReceiptsService.remove(receiptToDelete.id);
      showToast("success", "Xóa phiếu nhập nháp thành công");
      setDeleteModalOpen(false);
      fetchReceipts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Lỗi khi xóa phiếu");
    }
  };

  const handleOpenDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const data = await inventoryReceiptsService.findOne(id);
      setSelectedReceipt(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Không thể tải chi tiết phiếu nhập");
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    productsService
      .getProducts({ limit: 500 })
      .then((res) => {
        const map = new Map<string, Product>();
        (res.data || []).forEach((p) => {
          if (p.id) map.set(p.id, p);
          if (p.uuid) map.set(p.uuid, p);
          if (p.sku) map.set(p.sku.toUpperCase(), p);
        });
        setProductsMap(map);
      })
      .catch(() => {
        // Fallback im lặng nếu offline hoặc có lỗi
      });
  }, []);

  /**
   * Helper kiểm tra chuỗi có phải mã kỹ thuật / ID tạm thời hay không
   */
  const isTechnicalId = (val?: string): boolean => {
    if (!val) return true;
    const trimmed = val.trim();
    if (trimmed.startsWith("unit-") || trimmed.startsWith("row-") || trimmed.startsWith("temp-")) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return true;
    return false;
  };

  /**
   * Tra cứu sản phẩm từ productsMap
   */
  const getProductForItem = (item: { productId?: string; productCode?: string }): Product | undefined => {
    if (item.productId && productsMap.has(item.productId)) {
      return productsMap.get(item.productId);
    }
    if (item.productCode && productsMap.has(item.productCode.toUpperCase())) {
      return productsMap.get(item.productCode.toUpperCase());
    }
    return undefined;
  };

  /**
   * Format tên ĐVT nhập kèm tỷ lệ quy đổi (Ví dụ: "Lốc (x6)" hoặc "Thùng (x24)")
   */
  const formatItemUnitName = (item: {
    productId?: string;
    productCode?: string;
    unitId?: string;
    unitName?: string;
    conversionFactor?: number | string;
  }): string => {
    const factor = Number(item.conversionFactor) || 1;
    let unitDisplayName = "";

    const product = getProductForItem(item);

    // 1. Thử tìm từ danh sách units của product
    if (product && product.units && product.units.length > 0) {
      const matchedUnit = product.units.find(
        (u) =>
          (!isTechnicalId(u.id) && u.id === item.unitId) ||
          (!isTechnicalId(u.unitName) && u.unitName === item.unitName) ||
          Number(u.conversionRate) === factor
      );
      if (matchedUnit && matchedUnit.unitName && !isTechnicalId(matchedUnit.unitName)) {
        unitDisplayName = matchedUnit.unitName;
      } else if (factor === 1 && product.baseUnit && !isTechnicalId(product.baseUnit)) {
        unitDisplayName = product.baseUnit;
      }
    }

    // 2. Thử từ item.unitName nếu không phải id kỹ thuật
    if (!unitDisplayName && item.unitName && !isTechnicalId(item.unitName) && item.unitName !== "ĐVT") {
      unitDisplayName = item.unitName;
    }

    // 3. Thử từ item.unitId nếu không phải id kỹ thuật
    if (!unitDisplayName && item.unitId && !isTechnicalId(item.unitId) && item.unitId !== "ĐVT") {
      unitDisplayName = item.unitId;
    }

    // 4. Fallback thông minh dựa trên factor và thông tin sản phẩm
    if (!unitDisplayName) {
      if (factor === 1) {
        unitDisplayName = product?.baseUnit || "Lon";
      } else if (factor === 6) {
        unitDisplayName = "Lốc";
      } else if (factor === 12) {
        unitDisplayName = "Thùng";
      } else if (factor >= 20 || factor === 24) {
        unitDisplayName = "Thùng";
      } else if (factor > 1) {
        unitDisplayName = "Thùng";
      } else {
        unitDisplayName = product?.baseUnit || "Hộp";
      }
    }

    // Hiển thị kèm tỷ lệ: Ví dụ `Lốc (x6)` hoặc `Thùng (x6)`
    return `${unitDisplayName} (x${factor})`;
  };

  /**
   * Lấy tên ĐVT cơ sở cho cột Quy đổi cơ sở (Ví dụ: "Lon", "Chai", "Hộp" hoặc "ĐVT cơ sở")
   */
  const getBaseUnitName = (item: { productId?: string; productCode?: string; productName?: string }): string => {
    const product = getProductForItem(item);
    if (product?.baseUnit && !isTechnicalId(product.baseUnit)) {
      return product.baseUnit;
    }

    // Suy luận theo tên sản phẩm nếu không tìm thấy trong map
    const name = (item.productName || item.productCode || "").toLowerCase();
    if (name.includes("sữa bột") || name.includes("powder") || name.includes("900g")) return "Lon";
    if (name.includes("sữa hạt") || name.includes("cereal") || name.includes("180ml")) return "Hộp";
    if (name.includes("yến") || name.includes("nest") || name.includes("70ml")) return "Hũ";
    if (name.includes("collagen") || name.includes("nước") || name.includes("trà") || name.includes("chai") || name.includes("lon")) return "Lon";
    if (name.includes("hạt") || name.includes("bột")) return "Gói";

    return "ĐVT cơ sở";
  };

  const handleNavigateToAdjustment = (receipt: GoodsReceipt) => {
    navigate(`/inventory/adjustments?referenceCode=${encodeURIComponent(receipt.code)}&warehouseId=${encodeURIComponent(receipt.warehouseId)}`);
  };

  return (
    <div className="w-full space-y-6">
      {/* Tiêu đề & Nút tạo mới */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Nhập kho hàng hóa
          </h1>
        </div>
        <button
          onClick={() => navigate("/inventory/receipts/create")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-xs px-4 py-2.5 inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Lập phiếu nhập mới
        </button>
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <form onSubmit={handleSearch} className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, số chứng từ, kho nhập..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-sm transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4.5 h-4.5" />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as GoodsReceiptStatus | "ALL");
                setPage(1);
              }}
              className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-600 text-sm min-w-[160px]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Phiếu nháp</option>
              <option value="CONFIRMED">Đã xác nhận</option>
            </select>
            <button
              onClick={fetchReceipts}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bảng danh sách phiếu nhập */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3.5">Mã phiếu</th>
                <th className="px-4 py-3.5">Ngày nhập</th>
                <th className="px-4 py-3.5">Kho nhập</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Chứng từ gốc</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Tổng tiền</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right min-w-[105px]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                    Đang tải danh sách phiếu nhập...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Không tìm thấy phiếu nhập nào phù hợp.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => {
                  const isConfirmed = r.status === 'CONFIRMED';
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm">
                      <td className="p-4">
                        <button
                          onClick={() => handleOpenDetail(r.id)}
                          className="font-semibold text-indigo-600 hover:underline cursor-pointer font-mono"
                        >
                          {r.code}
                        </button>
                      </td>
                      <td className="p-4 text-slate-600 text-xs">
                        {r.receivedAt 
                          ? new Date(r.receivedAt).toLocaleDateString("vi-VN") 
                          : new Date(r.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800 text-xs flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{getDisplayWarehouseName(r)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-700 text-xs font-mono whitespace-nowrap">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono whitespace-nowrap">{r.referenceDocument || '---'}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-medium text-slate-800 text-right whitespace-nowrap">
                        {Number(r.totalCost).toLocaleString("vi-VN")} đ
                      </td>
                      <td className="p-4">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Lock className="w-3 h-3 text-emerald-600" />
                            Đã xác nhận
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Bản nháp
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openActionMenuId === r.id) {
                                setOpenActionMenuId(null);
                                setActionMenuAnchor(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const shouldDropUp = window.innerHeight - rect.bottom < 170;
                                setActionMenuAnchor({
                                  top: shouldDropUp ? rect.top - 4 : rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                  isDropUp: shouldDropUp,
                                });
                                setOpenActionMenuId(r.id);
                              }
                            }}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none whitespace-nowrap shrink-0 ${
                              openActionMenuId === r.id
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs ring-2 ring-indigo-500/10'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300'
                            }`}
                            title="Thao tác"
                          >
                            <span className="whitespace-nowrap">Thao tác</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                                openActionMenuId === r.id ? 'rotate-180 text-indigo-600' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang (Ẩn "Hiển thị 1 - 4 trong số 4 phiếu nhập" theo yêu cầu) */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          itemLabel="phiếu nhập"
          showRecordRange={false}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Dropdown Menu Portal Thao tác */}
      {openActionMenuId && actionMenuAnchor && typeof document !== "undefined" && (() => {
        const r = receipts.find((item) => item.id === openActionMenuId);
        if (!r) return null;
        const isConfirmed = r.status === "CONFIRMED";
        return createPortal(
          <div
            className="fixed w-44 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-[9999] animate-in fade-in zoom-in-95 text-left divide-y divide-slate-100"
            style={{
              top: actionMenuAnchor.isDropUp ? undefined : `${actionMenuAnchor.top}px`,
              bottom: actionMenuAnchor.isDropUp ? `${window.innerHeight - actionMenuAnchor.top}px` : undefined,
              right: `${actionMenuAnchor.right}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setActionMenuAnchor(null);
                  handleOpenDetail(r.id);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-400" />
                <span>Xem chi tiết</span>
              </button>
            </div>

            {!isConfirmed ? (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setActionMenuAnchor(null);
                    setReceiptToConfirm(r);
                    setConfirmModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-emerald-600 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Xác nhận nhập kho</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setActionMenuAnchor(null);
                    setReceiptToDelete(r);
                    setDeleteModalOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Xóa phiếu nháp</span>
                </button>
              </div>
            ) : (
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setActionMenuAnchor(null);
                    handleNavigateToAdjustment(r);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                  <span>Lập phiếu điều chỉnh</span>
                </button>
              </div>
            )}
          </div>,
          document.body,
        );
      })()}

      {/* Modal xác nhận xóa phiếu nháp */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteReceipt}
        title="Xóa phiếu nhập nháp"
        message={`Bạn có chắc chắn muốn xóa phiếu nhập "${receiptToDelete?.code}"? Phiếu nháp chưa ghi sổ và có thể xóa an toàn.`}
      />

      {/* Modal xác nhận ghi sổ nhập kho */}
      <ModalLayout
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Xác nhận phiếu nhập kho"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Xác nhận phiếu nhập {receiptToConfirm?.code}?
          </h3>
          <p className="text-slate-600 text-sm">
            Sau khi xác nhận, toàn bộ hàng hóa sẽ được <strong>cộng trực tiếp vào tồn kho</strong> và <strong>ghi sổ thẻ kho</strong>.
          </p>
          <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 text-left">
            <strong>Lưu ý:</strong> Phiếu đã xác nhận <strong>không thể chỉnh sửa hoặc xóa</strong>. Mọi điều chỉnh sau này phải lập qua phiếu điều chỉnh.
          </div>
          <div className="flex justify-center gap-3 pt-3">
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleConfirmReceipt}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Đồng ý xác nhận
            </button>
          </div>
        </div>
      </ModalLayout>

      {/* Modal xem chi tiết phiếu nhập kho */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200/90 w-full max-w-[95%] sm:max-w-[90%] md:max-w-[58rem] lg:max-w-[68rem] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-3.5 sm:p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-[2.5rem] h-[2.5rem] rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base md:text-lg flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span>Chi tiết phiếu nhập:</span>
                    <span className="font-mono text-indigo-600 font-bold">{selectedReceipt?.code}</span>
                    {selectedReceipt?.status === 'CONFIRMED' ? (
                      <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Đã xác nhận
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Bản nháp
                      </span>
                    )}
                  </h3>
                  <p className="text-[0.6875rem] sm:text-xs text-slate-500 mt-0.5 truncate">
                    Mã chứng từ lưu kho phân hệ Quản lý Kho bãi LOHA SALES
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="p-3.5 sm:p-5 md:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
              {detailLoading ? (
                <div className="p-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                  Đang tải chi tiết phiếu...
                </div>
              ) : selectedReceipt ? (
                <>
                  {/* Băng thông báo theo trạng thái */}
                  {selectedReceipt.status === 'CONFIRMED' ? (
                    <div className="bg-emerald-50/80 border border-emerald-200/90 p-3 sm:p-3.5 rounded-xl flex items-start sm:items-center gap-2.5 text-xs text-emerald-800">
                      <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                      <span>
                        <strong>Phiếu đã xác nhận:</strong> Không thể chỉnh sửa hoặc xóa. Để điều chỉnh số lượng tồn kho do thừa/thiếu, vui lòng lập <em>Phiếu điều chỉnh</em>.
                      </span>
                    </div>
                  ) : (
                    <div className="bg-amber-50/80 border border-amber-200/90 p-3 sm:p-3.5 rounded-xl flex items-start sm:items-center gap-2.5 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                      <span>
                        Phiếu này hiện ở trạng thái <strong>Nháp</strong>. Hàng hóa chưa được cộng vào tồn kho thực tế.
                      </span>
                    </div>
                  )}

                  {/* Thông tin chung: 4 cột căn đều tương đồng nhau */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 text-xs items-start">
                    <div className="min-w-0">
                      <span className="text-slate-400 block mb-1 text-[0.6875rem] font-medium">Kho nhập hàng:</span>
                      <strong 
                        className="text-slate-800 text-xs sm:text-[0.8125rem] font-semibold block break-words leading-snug"
                        title={getDisplayWarehouseName(selectedReceipt)}
                      >
                        {getDisplayWarehouseName(selectedReceipt)}
                      </strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400 block mb-1 text-[0.6875rem] font-medium">Nhà cung cấp:</span>
                      <strong 
                        className="text-slate-800 text-xs sm:text-[0.8125rem] font-semibold block break-words leading-snug text-slate-900"
                        title={getDisplaySupplierName(selectedReceipt)}
                      >
                        {getDisplaySupplierName(selectedReceipt)}
                      </strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400 block mb-1 text-[0.6875rem] font-medium">Số chứng từ gốc:</span>
                      <div className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-slate-200/90 shadow-2xs text-xs whitespace-nowrap">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono whitespace-nowrap" title={selectedReceipt.referenceDocument || '---'}>
                          {selectedReceipt.referenceDocument || '---'}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400 block mb-1 text-[0.6875rem] font-medium">Ngày nhập kho:</span>
                      <strong className="text-slate-800 text-xs sm:text-[0.8125rem] font-mono block leading-snug">
                        {selectedReceipt.receivedAt 
                          ? new Date(selectedReceipt.receivedAt).toLocaleDateString("vi-VN") 
                          : new Date(selectedReceipt.createdAt).toLocaleDateString("vi-VN")}
                      </strong>
                    </div>
                  </div>

                  {/* Bảng chi tiết mặt hàng */}
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="p-3 sm:px-4 sm:py-3 bg-slate-50/90 border-b border-slate-200/80 text-xs font-semibold text-slate-700 flex flex-wrap justify-between items-center gap-2">
                      <span className="font-bold">Danh sách hàng hóa nhập kho ({selectedReceipt.items?.length || 0} SKU)</span>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                        <span className="text-slate-500 font-normal">Tổng tiền:</span>
                        <span className="text-indigo-600 font-mono font-bold">
                          {Number(selectedReceipt.totalCost).toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                    </div>

                    {/* Dạng bảng hiển thị trên Desktop và Tablet */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs divide-y divide-slate-100">
                        <thead>
                          <tr className="bg-slate-100/60 border-b border-slate-200/80 text-slate-600">
                            <th className="p-2.5 w-[5%] text-center font-semibold">STT</th>
                            <th className="p-2.5 w-[27%] text-left font-semibold">Mã SKU / Tên SP</th>
                            <th className="p-2.5 w-[11%] text-center font-semibold">ĐVT nhập</th>
                            <th className="p-2.5 w-[8%] text-right font-semibold">SL kiện</th>
                            <th className="p-2.5 w-[13%] text-right font-semibold">Quy đổi cơ sở</th>
                            <th className="p-2.5 w-[11%] text-right font-semibold">Đơn giá</th>
                            <th className="p-2.5 w-[12%] text-right font-semibold">Thành tiền</th>
                            <th className="p-2.5 w-[13%] text-left font-semibold">Lô / Hạn dùng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/90 font-medium">
                          {selectedReceipt.items?.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-indigo-50/20 transition-colors">
                              <td className="p-2.5 text-center text-slate-400 font-mono text-[0.6875rem]">{idx + 1}</td>
                              <td className="p-2.5 text-left">
                                <div className="font-semibold text-slate-800 text-xs line-clamp-1">
                                  {item.productName || item.productCode || item.productId}
                                </div>
                                <div className="mt-0.5">
                                  <span className="font-mono text-[0.6875rem] font-semibold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-200/60">
                                    {item.productCode}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 text-center font-medium whitespace-nowrap">
                                <span className="font-semibold text-slate-800">{formatItemUnitName(item)}</span>
                              </td>
                              <td className="p-2.5 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                                {Number(item.packageQuantity).toLocaleString("vi-VN")}
                              </td>
                              <td className="p-2.5 text-right font-mono text-indigo-600 font-bold whitespace-nowrap">
                                {Number(item.baseQuantity).toLocaleString("vi-VN")} {getBaseUnitName(item)}
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                                {Number(item.unitCost).toLocaleString("vi-VN")} đ
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                {Number(item.totalCost).toLocaleString("vi-VN")} đ
                              </td>
                              <td className="p-2.5 text-left">
                                {item.batchNumber ? (
                                  <div>
                                    <span className="inline-flex font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[0.6875rem] border border-slate-200/70">
                                      Lô: {item.batchNumber}
                                    </span>
                                    <div className="text-[0.625rem] text-slate-500 mt-1 font-mono leading-tight">
                                      {item.mfgDate && <span>NSX: {new Date(item.mfgDate).toLocaleDateString("vi-VN")} · </span>}
                                      {item.expiryDate && <span>HSD: {new Date(item.expiryDate).toLocaleDateString("vi-VN")}</span>}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[0.6875rem]">Không quản lý lô</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Dạng thẻ hiển thị trên Mobile (Responsive hoàn hảo cho màn hình nhỏ) */}
                    <div className="md:hidden divide-y divide-slate-100 bg-white">
                      {selectedReceipt.items?.map((item, idx) => (
                        <div key={item.id || idx} className="p-3.5 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="font-mono text-[0.6875rem] font-bold text-slate-400 bg-slate-100 w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 text-xs line-clamp-2">
                                  {item.productName || item.productCode || item.productId}
                                </div>
                                <span className="inline-block font-mono text-[0.6875rem] font-semibold text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-200/60 mt-1">
                                  {item.productCode}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                                {Number(item.totalCost).toLocaleString("vi-VN")} đ
                              </div>
                              <div className="text-[0.625rem] text-slate-400 font-mono">
                                {Number(item.unitCost).toLocaleString("vi-VN")} đ / {formatItemUnitName(item)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50/70 rounded-lg text-xs">
                            <div>
                              <span className="text-slate-400 text-[0.6875rem] block">SL nhập:</span>
                              <span className="font-mono font-semibold text-slate-800">
                                {Number(item.packageQuantity).toLocaleString("vi-VN")} {formatItemUnitName(item)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 text-[0.6875rem] block">Quy đổi cơ sở:</span>
                              <span className="font-mono font-bold text-indigo-600">
                                {Number(item.baseQuantity).toLocaleString("vi-VN")} {getBaseUnitName(item)}
                              </span>
                            </div>
                          </div>

                          {item.batchNumber ? (
                            <div className="flex flex-wrap items-center justify-between gap-1 text-[0.6875rem] pt-0.5 text-slate-600">
                              <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
                                Lô: {item.batchNumber}
                              </span>
                              <span className="font-mono text-slate-500 text-[0.625rem]">
                                {item.mfgDate && `NSX: ${new Date(item.mfgDate).toLocaleDateString("vi-VN")} • `}
                                {item.expiryDate && `HSD: ${new Date(item.expiryDate).toLocaleDateString("vi-VN")}`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[0.6875rem] italic">Không quản lý lô</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ghi chú */}
                  {selectedReceipt.notes && (
                    <div className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                      <strong>Ghi chú:</strong> {selectedReceipt.notes}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer Modal */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-wrap justify-end items-center gap-2 sm:gap-2.5 bg-slate-50/50">
              {selectedReceipt?.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    setReceiptToConfirm(selectedReceipt);
                    setConfirmModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 h-[2.375rem] px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Xác nhận nhập kho</span>
                </button>
              )}
              {selectedReceipt?.status === 'CONFIRMED' && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleNavigateToAdjustment(selectedReceipt);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 h-[2.375rem] px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>Lập phiếu điều chỉnh</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 h-[2.375rem] px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
