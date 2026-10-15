import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Boxes,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Building2,
  ArrowRightLeft,
  X,
  Filter,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  PackagePlus,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { ModalLayout } from '../components/modal-layout';
import { MinStockModal } from '../components/inventory/min-stock-modal';
import { inventoryService } from '../services/inventory.service';
import { getStoredUser } from '../utils/navigation';
import type {
  StockOverviewItem,
  StockStatusType,
  AdjustStockPayload,
  ProductUnit,
} from '../types/products';
import type { StockBalance } from '../types/inventory.types';

/**
 * Trang Sổ Tồn Kho Theo SKU & Kho (SN-10, EP-04, SN-23, SN-183)
 * Đáp ứng Yêu cầu Người dùng Kho (User Story SN-183):
 * "Là Quản lý kho, tôi muốn được cảnh báo khi tồn xuống dưới mức tối thiểu,
 * để đặt hàng nhà cung cấp trước khi đứt hàng chứ không phải sau."
 *
 * Tính năng chính:
 * 1. Ba cột minh bạch: Tồn thực tế, Tồn tạm giữ (giữ chỗ đơn), Tồn khả thi (Có thể bán = Thực tế - Tạm giữ)
 * 2. Cảnh báo đứt hàng & Tồn kho tối thiểu (SN-183): Khai báo mức tồn tối thiểu theo SKU & Kho
 * 3. Hàng dưới ngưỡng hiển thị nổi bật và liên kết đồng bộ với Dashboard kho
 * 4. Lọc linh hoạt theo Kho hàng, Nhóm hàng sản phẩm, Trạng thái tồn kho (kèm lọc dưới tồn SN-183)
 * 5. Bảng tính quy đổi đơn vị (Thùng / Lốc / Lon) phục vụ chốt đơn B2B cấp tốc
 */
export const InventoryStockPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [stockItems, setStockItems] = useState<StockOverviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc & Tìm kiếm (Đồng bộ query filter từ Dashboard kho: /inventory/stock?filter=BELOW_MIN_STOCK)
  const initialFilter = (searchParams.get('filter') as StockStatusType) || 'ALL';
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<StockStatusType | 'ALL'>(initialFilter);

  // Lắng nghe thay đổi searchParams từ URL (khi click từ Dashboard chuyển sang)
  useEffect(() => {
    const f = searchParams.get('filter');
    if (f === 'BELOW_MIN_STOCK') {
      setSelectedStatus('BELOW_MIN_STOCK');
    }
  }, [searchParams]);

  // Popup & Modal trạng thái
  const [conversionModalOpen, setConversionModalOpen] = useState<boolean>(false);
  const [selectedItemForConversion, setSelectedItemForConversion] = useState<StockOverviewItem | null>(null);

  // Modal Sửa Mức Tồn Tối Thiểu (SN-183)
  const [editingMinStockItem, setEditingMinStockItem] = useState<StockBalance | null>(null);

  const [adjustModalOpen, setAdjustModalOpen] = useState<boolean>(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<StockOverviewItem | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [adjustUnit, setAdjustUnit] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustRefCode, setAdjustRefCode] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState<boolean>(false);

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
  const user = getStoredUser();
  const userRoles = user?.roles || [];
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

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Tải dữ liệu tồn kho từ Backend API / Demo
  const fetchStockData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getStockOverview({
        search: searchTerm,
        warehouse: selectedWarehouse,
        category: selectedCategory,
        status: selectedStatus,
      });
      setStockItems(data);
    } catch {
      showToast('error', 'Không thể tải dữ liệu tồn kho. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedWarehouse, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // Phân trang danh sách tồn kho (10 - 20 - 50 - 100)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset về trang 1 khi thay đổi bộ lọc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedWarehouse, selectedCategory, selectedStatus]);

  // Danh sách các kho hàng duy nhất để hiển thị dropdown
  const warehouseOptions = useMemo(() => {
    const set = new Set<string>();
    stockItems.forEach((item) => {
      if (item.warehouse) set.add(item.warehouse);
    });
    return Array.from(set);
  }, [stockItems]);

  // Danh sách nhóm hàng duy nhất để hiển thị dropdown
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    stockItems.forEach((item) => {
      if (item.parentCategory) set.add(item.parentCategory);
    });
    return Array.from(set);
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
      warehouse: item.warehouse || 'Kho Tổng Miền Nam',
      warehouseId: item.warehouseId || 'WH01',
      minStockLevel: item.minStockLevel || 0,
      isBelowMinStock: item.isBelowMinStock,
    });
  };

  // Lưu thiết lập tồn tối thiểu theo SKU tại kho (SN-183)
  const handleSaveMinStock = async (balanceItem: StockBalance, newMinStock: number) => {
    try {
      await inventoryService.updateMinStockLevel(
        balanceItem.warehouseId || 'WH01',
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

  // Mở modal điều chỉnh tồn kho
  const handleOpenAdjustModal = (item: StockOverviewItem) => {
    setSelectedItemForAdjust(item);
    setAdjustQuantity(10);
    setAdjustUnit(item.baseUnit);
    setAdjustType('IMPORT');
    setAdjustReason('Nhập bổ sung tồn kho từ nhà máy');
    setAdjustRefCode(`PNK-${Date.now().toString().slice(-6)}`);
    setAdjustModalOpen(true);
  };

  // Xử lý gửi yêu cầu điều chỉnh tồn kho
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust) return;

    if (adjustQuantity <= 0) {
      showToast('warning', 'Số lượng điều chỉnh phải lớn hơn 0');
      return;
    }

    if (!adjustReason.trim()) {
      showToast('warning', 'Vui lòng nhập lý do điều chỉnh kho');
      return;
    }

    const signedChange = adjustType === 'IMPORT' ? Math.abs(adjustQuantity) : -Math.abs(adjustQuantity);

    const payload: AdjustStockPayload = {
      productSku: selectedItemForAdjust.sku,
      quantityChange: signedChange,
      unit: adjustUnit,
      reason: adjustReason.trim(),
      referenceCode: adjustRefCode.trim(),
      warehouseLocation: selectedItemForAdjust.warehouse,
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
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

      {/* Thẻ Thống kê 3 Cột Tồn Kho Minh Bạch */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tồn thực tế */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tồn Thực Tế
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
            {summaryStats.totalPhysical.toLocaleString('vi-VN')}
          </div>
        </div>

        {/* Thẻ 2: Tồn tạm giữ */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tồn Tạm Giữ
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
            {summaryStats.totalReserved.toLocaleString('vi-VN')}
          </div>
        </div>

        {/* Thẻ 3: Tồn khả thi (Có thể bán) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tồn Khả Thi (Có thể bán)
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
            {summaryStats.totalAvailable.toLocaleString('vi-VN')}
          </div>
        </div>

        {/* Thẻ 4: Cảnh báo đứt hàng */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cảnh Báo Đứt Hàng
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-600 tabular-nums">
            {summaryStats.nearOutOfStockCount}
          </div>
        </div>
      </div>

      {/* Thanh Bộ Lọc, Tìm Kiếm & Làm Mới (Gọn gàng trên 1 hàng) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 flex-1 min-w-0">
            {/* Ô Tìm nhanh theo Mã SKU hoặc Tên sản phẩm */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm nhanh mã SKU hoặc tên sản phẩm..."
                className="w-full pl-9 pr-7 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Lọc theo Kho hàng */}
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full pl-9 pr-6 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer truncate"
              >
                <option value="ALL">Tất cả kho hàng</option>
                {warehouseOptions.map((wh) => (
                  <option key={wh} value={wh}>
                    {wh}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc theo Nhóm hàng */}
            <div className="relative">
              <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-6 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer truncate"
              >
                <option value="ALL">Tất cả nhóm hàng</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc theo Trạng thái tồn kho */}
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as StockStatusType | 'ALL')}
                className="w-full pl-9 pr-6 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer truncate"
              >
                <option value="ALL">Tất cả trạng thái tồn</option>
                <option value="BELOW_MIN_STOCK">⚠️ Dưới tồn tối thiểu</option>
                <option value="IN_STOCK">Còn hàng (Dồi dào)</option>
                <option value="OUT_OF_STOCK">Hết hàng (Tồn khả thi = 0)</option>
              </select>
            </div>
          </div>

          {/* Nút Làm mới (cùng hàng, bỏ chữ "dữ liệu") */}
          <button
            type="button"
            onClick={fetchStockData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/90 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-2xs shrink-0 self-end lg:self-auto"
            title="Làm mới tồn kho"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Bảng Danh Sách Sổ Tồn Kho 6 Cột Chuẩn Hóa Theo UI Guidelines */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm divide-y divide-slate-100">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-[30%]">
                  Sản Phẩm &amp; SKU
                </th>
                <th className="px-4 py-3 text-left w-[20%]">
                  Kho Bãi
                </th>
                <th className="px-4 py-3 text-right w-[13%]">
                  Tồn Thực Tế
                </th>
                <th className="px-4 py-3 text-right w-[13%]">
                  Tồn Tạm Giữ
                </th>
                <th className="px-4 py-3 text-right w-[14%]">
                  Tồn Khả Dụng
                </th>
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
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Boxes className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-600">Không tìm thấy sản phẩm tồn kho nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc
                    </p>
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
                          <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                            {item.sku}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenConversionModal(item)}
                            className="text-left font-semibold text-slate-800 hover:text-indigo-600 transition-colors line-clamp-1 text-sm block mt-1 cursor-pointer"
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

                      {/* 6. Thao Tác (Dropdown Menu đồng bộ Order Management) */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Phân Trang 10-20-50-100 Dòng */}
        {stockItems.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            {/* Hình 2: Bỏ "mỗi trang " -> Chỉ còn "Số dòng:", bỏ "Hiển thị 1 - 15..." */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Số dòng:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            {/* Hình 4: Các nút phân trang vuông bo nhẹ [<] [1] [2] [3] [4] [>] */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
                title="Trang trước"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - currentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                            currentPage === p
                              ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
                title="Trang sau"
                aria-label="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
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
              {/* 1. Xem chi tiết / Quy đổi đơn vị */}
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuKey(null);
                  setActionMenuAnchor(null);
                  handleOpenConversionModal(item);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                <span>Quy đổi Thùng / Lốc</span>
              </button>

              {/* 2. Cài đặt tồn tối thiểu */}
              {canEditMinStock && (
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
                  <span>Cài đặt tồn tối thiểu</span>
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
          </div>,
          document.body,
        );
      })()}

      {/* MODAL 1: BẢNG TRA CỨU QUY ĐỔI ĐƠN VỊ & TỒN KHẢ THI CHO SALES/THỦ KHO */}
      <ModalLayout
        isOpen={conversionModalOpen}
        onClose={() => setConversionModalOpen(false)}
        title={`Bảng Quy Đổi Số Lượng Có Thể Bán — ${selectedItemForConversion?.sku || ''}`}
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

      {/* MODAL 2: ĐIỀU CHỈNH HOẶC NHẬP/XUẤT KHO TRỰC TIẾP */}
      <ModalLayout
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`Ghi Sổ Kho & Điều Chỉnh Tồn Kho — ${selectedItemForAdjust?.sku || ''}`}
        maxWidth="max-w-lg"
      >
        {selectedItemForAdjust && (
          <form onSubmit={handleSubmitAdjustment} className="space-y-4 p-1">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>
                Sản phẩm: <strong className="text-slate-900">{selectedItemForAdjust.name}</strong>
              </p>
              <p>
                Tồn khả thi hiện tại:{' '}
                <strong className="text-emerald-700">
                  {selectedItemForAdjust.availableStock} {selectedItemForAdjust.baseUnit}
                </strong>
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
                  value={adjustUnit}
                  onChange={(e) => setAdjustUnit(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value={selectedItemForAdjust.baseUnit}>
                    {selectedItemForAdjust.baseUnit} (Cơ sở)
                  </option>
                  {selectedItemForAdjust.units
                    ?.filter((u) => !u.isBaseUnit)
                    .map((u) => (
                      <option key={u.unitName} value={u.unitName}>
                        {u.unitName} (1 {u.unitName} = {u.conversionRate} {selectedItemForAdjust.baseUnit})
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
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmittingAdjust}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
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
    </div>
  );
};
