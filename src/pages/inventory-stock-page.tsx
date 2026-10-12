import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Boxes,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Building2,
  PackageCheck,
  Eye,
  ArrowRightLeft,
  X,
  Filter,
  Layers,
  Sparkles,
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

  // Thống kê tổng hợp 3 cột tồn kho + Cảnh báo tồn tối thiểu SN-183
  const summaryStats = useMemo(() => {
    let totalPhysical = 0;
    let totalReserved = 0;
    let totalAvailable = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let belowMinStockCount = 0;

    stockItems.forEach((item) => {
      totalPhysical += item.physicalStock;
      totalReserved += item.reservedStock;
      totalAvailable += item.availableStock;
      if (item.status === 'LOW_STOCK') lowStockCount++;
      if (item.status === 'OUT_OF_STOCK') outOfStockCount++;
      const isBelowMin =
        Boolean(item.isBelowMinStock) ||
        ((item.minStockLevel || 0) > 0 && item.availableStock <= (item.minStockLevel || 0));
      if (isBelowMin) belowMinStockCount++;
    });

    return {
      totalPhysical,
      totalReserved,
      totalAvailable,
      lowStockCount,
      outOfStockCount,
      belowMinStockCount,
      totalSku: stockItems.length,
    };
  }, [stockItems]);

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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Tồn Thực Tế
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {summaryStats.totalPhysical.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-slate-500 ml-1.5 font-medium">sản phẩm trong kho</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Tổng số lượng hàng hóa vật lý thực có</p>
        </div>

        {/* Thẻ 2: Tồn tạm giữ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider whitespace-nowrap">
              Tồn Tạm Giữ
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-700">
              {summaryStats.totalReserved.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-amber-600/80 ml-1.5 font-medium">đã giữ chỗ</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Đang chờ xuất kho cho các đơn hàng đã chốt</p>
        </div>

        {/* Thẻ 3: Tồn khả thi (CÓ THỂ BÁN NGAY) - NỔI BẬT CHÍNH */}
        <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-15">
            <PackageCheck className="w-32 h-32" />
          </div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider block whitespace-nowrap">
                Tồn Khả Thi
              </span>
              <span className="text-[11px] font-medium text-emerald-200 normal-case block">
                (Có thể bán)
              </span>
            </div>
            <div className="p-2 bg-emerald-500/40 text-white rounded-lg backdrop-blur-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 relative z-10">
            <span className="text-3xl font-extrabold tracking-tight">
              {summaryStats.totalAvailable.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-emerald-100 ml-2 font-medium">bán được ngay</span>
          </div>
          <p className="text-xs text-emerald-100/80 mt-2 relative z-10 font-medium">
            = Tồn thực tế - Tồn tạm giữ (Chốt đơn tức thì)
          </p>
        </div>

        {/* Thẻ 4: Cảnh báo tồn kho & Tồn tối thiểu SN-183 */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'BELOW_MIN_STOCK' ? 'ALL' : 'BELOW_MIN_STOCK')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === 'BELOW_MIN_STOCK'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500 shadow-md'
              : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
          }`}
          title="Bấm để lọc nhanh danh sách SKU chạm/dưới mức tồn tối thiểu"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Cảnh Báo Tồn Kho
              </span>
            </div>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">
              {summaryStats.belowMinStockCount > 0 ? summaryStats.belowMinStockCount : (summaryStats.lowStockCount + summaryStats.outOfStockCount)}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              SKU ({summaryStats.belowMinStockCount} dưới tồn tối thiểu, {summaryStats.outOfStockCount} hết hàng)
            </span>
          </div>
          <p className="text-xs text-rose-600/90 mt-2 font-medium">
            {selectedStatus === 'BELOW_MIN_STOCK' ? '✓ Đang lọc cảnh báo (Bấm để xem tất cả)' : 'Bấm để lọc các SKU dưới ngưỡng cần đặt hàng'}
          </p>
        </div>
      </div>

      {/* Banner Cảnh Báo Nhanh Hàng Dưới Tồn Tối Thiểu (SN-183) */}
      {summaryStats.belowMinStockCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-rose-50/90 border border-rose-200 rounded-2xl text-xs text-rose-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0 shadow-inner">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="font-bold text-rose-950 text-sm">
                Cảnh báo đứt hàng &amp; Tồn kho tối thiểu
              </div>
              <p className="text-rose-700 mt-0.5">
                Phát hiện <strong>{summaryStats.belowMinStockCount} SKU</strong> có tồn khả dụng chạm hoặc dưới ngưỡng tối thiểu, cần đặt hàng nhà cung cấp ngay trước khi đứt hàng!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedStatus(selectedStatus === 'BELOW_MIN_STOCK' ? 'ALL' : 'BELOW_MIN_STOCK')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                selectedStatus === 'BELOW_MIN_STOCK'
                  ? 'bg-slate-800 text-white hover:bg-slate-900'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              }`}
            >
              {selectedStatus === 'BELOW_MIN_STOCK' ? 'Đang lọc cảnh báo (Xem tất cả)' : 'Xem các SKU chạm ngưỡng'}
            </button>
          </div>
        </div>
      )}

      {/* Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ô Tìm nhanh theo Mã SKU hoặc Tên sản phẩm */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm nhanh mã SKU hoặc tên sản phẩm..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Lọc theo Kho hàng */}
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
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
            <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
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
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as StockStatusType | 'ALL')}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái tồn</option>
              <option value="BELOW_MIN_STOCK">⚠️ Dưới tồn tối thiểu</option>
              <option value="IN_STOCK">Còn hàng (Dồi dào)</option>
              <option value="OUT_OF_STOCK">Hết hàng (Tồn khả thi = 0)</option>
            </select>
          </div>
        </div>

        {/* Gợi ý / Ghi chú cho Nhân viên kho & Nút Làm mới dữ liệu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-indigo-700 font-medium">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              Mẹo cho Quản lý &amp; Nhân viên kho: Hệ thống tự động cảnh báo khi tồn khả thi chạm hoặc dưới ngưỡng tồn tối thiểu cần đặt hàng.
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span>
              Hiển thị <strong className="text-slate-800 font-semibold">{stockItems.length}</strong> sản phẩm
            </span>
            <button
              onClick={fetchStockData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/90 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Làm mới dữ liệu tồn kho"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Làm mới dữ liệu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bảng Danh Sách Sổ Tồn Kho Minh Bạch 3 Cột + Ngưỡng Tồn Tối Thiểu (SN-180 & SN-183) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-5">Sản Phẩm &amp; SKU</th>
                <th className="py-4 px-4">Kho Bãi &amp; Nhóm Hàng</th>
                <th className="py-4 px-4 text-right bg-blue-50/50 text-blue-900 border-l border-slate-200 whitespace-nowrap">
                  1. Tồn Thực Tế
                </th>
                <th className="py-4 px-4 text-right bg-amber-50/50 text-amber-900 whitespace-nowrap">
                  2. Tồn Tạm Giữ
                </th>
                <th className="py-3 px-5 text-right bg-emerald-100/60 text-emerald-950 font-bold border-r border-slate-200">
                  <div className="whitespace-nowrap">3. Tồn Khả Thi</div>
                  <div className="text-[10px] font-semibold text-emerald-800 normal-case tracking-normal">
                    (Có thể bán)
                  </div>
                </th>
                <th className="py-4 px-4 text-right bg-rose-50/50 text-rose-900 border-r border-slate-200 whitespace-nowrap">
                  Tồn Tối Thiểu
                </th>
                <th className="py-4 px-4 text-center">Đơn Vị Quy Đổi</th>
                <th className="py-4 px-4 min-w-[200px]">Mức An Toàn &amp; Trạng Thái</th>
                <th className="py-4 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-5">
                      <div className="h-4 bg-slate-200 rounded w-40 mb-2"></div>
                      <div className="h-3 bg-slate-100 rounded w-24"></div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-slate-100 rounded w-20"></div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-5 bg-slate-200 rounded w-16 ml-auto"></div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-5 bg-slate-200 rounded w-16 ml-auto"></div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="h-6 bg-slate-200 rounded w-20 ml-auto"></div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-5 bg-slate-200 rounded w-14 ml-auto"></div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-6 bg-slate-200 rounded-full w-20 mx-auto"></div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-8 bg-slate-200 rounded w-16 mx-auto"></div>
                    </td>
                  </tr>
                ))
              ) : stockItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Boxes className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-600">Không tìm thấy sản phẩm tồn kho nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc
                    </p>
                  </td>
                </tr>
              ) : (
                stockItems.map((item) => {
                  const baseUnit = item.baseUnit;
                  const minStock = item.minStockLevel || 0;
                  const available = item.availableStock || 0;
                  const isZero = available <= 0;
                  const hasMin = minStock > 0;
                  const isBelowMin =
                    Boolean(item.isBelowMinStock) || (hasMin && available <= minStock);
                  const shortage = hasMin ? Math.max(0, minStock - available) : 0;
                  const ratioToMin = hasMin ? Math.round((available / minStock) * 100) : 0;
                  const isWarning = hasMin && available > minStock && ratioToMin <= 130;

                  return (
                    <tr
                      key={`${item.sku}-${item.warehouseId || item.warehouse}`}
                      className={`transition-colors group ${
                        isBelowMin
                          ? 'bg-rose-50/50 hover:bg-rose-50/80 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Mã SKU & Tên sản phẩm */}
                      <td className="py-4 px-5">
                        <div className="flex items-start gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                              <Boxes className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                {item.sku}
                              </span>
                              {isBelowMin && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  Hụt tồn ({shortage.toLocaleString('vi-VN')} {baseUnit})
                                </span>
                              )}
                            </div>
                            <h2 className="font-semibold text-slate-900 mt-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                              {item.name}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                              ĐVT cơ sở: <span className="font-medium text-slate-600">{baseUnit}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Kho bãi & Nhóm hàng */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.warehouse}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {item.parentCategory}
                          {item.subCategory ? ` / ${item.subCategory}` : ''}
                        </div>
                      </td>

                      {/* Cột 1: Tồn thực tế */}
                      <td className="py-4 px-4 text-right bg-blue-50/20 border-l border-slate-100 font-semibold text-slate-800">
                        <span className="text-base">{item.physicalStock.toLocaleString('vi-VN')}</span>
                        <span className="text-xs font-normal text-slate-500 ml-1">{baseUnit}</span>
                      </td>

                      {/* Cột 2: Tồn tạm giữ */}
                      <td className="py-4 px-4 text-right bg-amber-50/20 font-semibold text-amber-700">
                        {item.reservedStock > 0 ? (
                          <span className="inline-flex items-center justify-end gap-1">
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-base">{item.reservedStock.toLocaleString('vi-VN')}</span>
                            <span className="text-xs font-normal text-amber-600/80 ml-0.5">{baseUnit}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-normal">0 {baseUnit}</span>
                        )}
                      </td>

                      {/* Cột 3: TỒN KHẢ THI (CÓ THỂ BÁN NGAY) - NỔI BẬT NGHỆ THUẬT */}
                      <td className="py-4 px-5 text-right bg-emerald-50/50 font-bold border-r border-slate-100">
                        <div className={`inline-flex items-center justify-end gap-1.5 px-3 py-1 rounded-xl border shadow-xs ${
                          isBelowMin
                            ? 'bg-rose-100/90 text-rose-950 border-rose-300 ring-1 ring-rose-400/30'
                            : 'bg-emerald-100/80 text-emerald-900 border-emerald-200/80'
                        }`}>
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${isBelowMin ? 'text-rose-600' : 'text-emerald-600'}`} />
                          <span className="text-lg font-extrabold tracking-tight">
                            {item.availableStock.toLocaleString('vi-VN')}
                          </span>
                          <span className={`text-xs font-semibold ${isBelowMin ? 'text-rose-700' : 'text-emerald-700'}`}>{baseUnit}</span>
                        </div>
                      </td>

                      {/* Cột Tồn tối thiểu - chỉ hiển thị, không chỉnh sửa */}
                      <td className="py-4 px-4 text-right bg-rose-50/20 border-r border-slate-100 whitespace-nowrap">
                        {(item.minStockLevel || 0) > 0 ? (
                          <>
                            <span className={`text-base font-bold ${isBelowMin ? 'text-rose-700' : 'text-slate-800'}`}>
                              {(item.minStockLevel || 0).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-xs font-normal text-slate-500 ml-1">{baseUnit}</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Chưa đặt</span>
                        )}
                      </td>

                      {/* Quy đổi đơn vị (Thùng/Lốc/Lon) */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleOpenConversionModal(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition-colors"
                          title="Xem quy đổi số lượng bán theo Thùng/Lốc"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Tính Thùng/Lốc</span>
                        </button>
                      </td>

                      {/* Cột: Mức An Toàn & Trạng Thái Tồn Kho (Stock Safety Health Indicator) */}
                      <td className="py-4 px-4 min-w-[200px]">
                        <div className="space-y-1.5">
                          {/* Hàng 1: Badge tình trạng an toàn & Tỷ lệ % */}
                          <div className="flex items-center justify-between gap-1.5">
                            {isZero ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                Hết hàng (Tồn = 0)
                              </span>
                            ) : isBelowMin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                Thiếu {shortage.toLocaleString('vi-VN')} {baseUnit}
                              </span>
                            ) : isWarning ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Tiệm cận min ({ratioToMin}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                An toàn {hasMin ? `(${ratioToMin}%)` : ''}
                              </span>
                            )}

                            {hasMin && (
                              <span className="text-[10px] font-semibold text-slate-400">
                                Min: {minStock.toLocaleString('vi-VN')}
                              </span>
                            )}
                          </div>

                          {/* Hàng 2: Thanh đo tiến trình mức độ an toàn (Health Bar) */}
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-2xs">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isZero || isBelowMin
                                  ? 'bg-rose-500'
                                  : isWarning
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{
                                width: isZero
                                  ? '0%'
                                  : hasMin
                                  ? `${Math.min(100, Math.max(8, ratioToMin))}%`
                                  : '100%',
                              }}
                            />
                          </div>

                          {/* Hàng 3: Chú thích nhanh & Tỷ lệ chuẩn */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>
                              {isZero
                                ? 'Đã hết hàng hoàn toàn'
                                : isBelowMin
                                ? 'Dưới ngưỡng cần đặt hàng'
                                : isWarning
                                ? 'Sắp chạm mức tối thiểu'
                                : hasMin
                                ? 'Tồn kho vượt ngưỡng min'
                                : 'Chưa đặt mức tối thiểu'}
                            </span>
                            {hasMin && !isZero && (
                              <span
                                className={`font-semibold ${
                                  isBelowMin
                                    ? 'text-rose-600'
                                    : isWarning
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {ratioToMin}%
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenConversionModal(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Tra cứu chi tiết tồn khả dụng"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canEditMinStock && (
                            <button
                              onClick={() => handleOpenMinStockModal(item)}
                              className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors cursor-pointer"
                              title="Khai báo mức tồn tối thiểu cho SKU này"
                            >
                              Tồn tối thiểu
                            </button>
                          )}

                          {canAdjustStock && (
                            <button
                              onClick={() => handleOpenAdjustModal(item)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Điều chỉnh hoặc nhập/xuất kho"
                            >
                              Sổ kho
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
      </div>

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
