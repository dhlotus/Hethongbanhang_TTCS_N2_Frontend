import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  Clock,
  RefreshCw,
  Download,
  Search,
  Warehouse,
  Layers,
  Eye,
  X,
  ChevronRight,
  TrendingUp,
  Info,
  ShieldAlert,
  Boxes,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { Pagination } from '../components/pagination';
import { inventoryReportService } from '../services/inventory-report.service';
import type {
  InventoryTurnoverSkuItem,
  InventoryTurnoverReportResponse,
  TurnoverStatus,
  QueryInventoryReportParams,
} from '../services/inventory-report.service';

const formatCurrency = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const formatNumber = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('vi-VN').format(val);
};

export const InventoryReportPage: React.FC = () => {
  // Report data state
  const [reportData, setReportData] = useState<InventoryTurnoverReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<TurnoverStatus>('ALL');
  const [selectedDays, setSelectedDays] = useState<number>(90);
  const [periodType, setPeriodType] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<QueryInventoryReportParams['sortBy']>('inventoryValue');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Detail Modal state
  const [selectedSku, setSelectedSku] = useState<InventoryTurnoverSkuItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);

  // Fetch report data from API
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params: QueryInventoryReportParams = {
        days: periodType === 'PRESET' ? selectedDays : undefined,
        fromDate: periodType === 'CUSTOM' && fromDate ? fromDate : undefined,
        toDate: periodType === 'CUSTOM' && toDate ? toDate : undefined,
        warehouseId: selectedWarehouseId || undefined,
        categoryId: selectedCategoryId || undefined,
        turnoverStatus: selectedStatus,
        search: searchTerm.trim() || undefined,
        sortBy,
        sortOrder,
      };

      const res = await inventoryReportService.getInventoryReport(params);
      setReportData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu báo cáo';
      showToast('error', 'Không thể tải báo cáo tồn kho & vòng quay hàng', msg);
    } finally {
      setLoading(false);
    }
  }, [
    periodType,
    selectedDays,
    fromDate,
    toDate,
    selectedWarehouseId,
    selectedCategoryId,
    selectedStatus,
    searchTerm,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchReport();
    setCurrentPage(1);
  }, [fetchReport]);

  // Export to Excel handler
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const params: QueryInventoryReportParams = {
        days: periodType === 'PRESET' ? selectedDays : undefined,
        fromDate: periodType === 'CUSTOM' && fromDate ? fromDate : undefined,
        toDate: periodType === 'CUSTOM' && toDate ? toDate : undefined,
        warehouseId: selectedWarehouseId || undefined,
        categoryId: selectedCategoryId || undefined,
        turnoverStatus: selectedStatus,
        search: searchTerm.trim() || undefined,
        sortBy,
        sortOrder,
      };
      await inventoryReportService.exportInventoryReportExcel(params);
      showToast('success', 'Xuất báo cáo Excel thành công', 'File đã được lưu vào máy của bạn.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi xuất file Excel';
      showToast('error', 'Xuất Excel thất bại', msg);
    } finally {
      setExporting(false);
    }
  };

  // Open SKU details
  const handleOpenDetail = (item: InventoryTurnoverSkuItem) => {
    setSelectedSku(item);
    setDetailModalOpen(true);
  };

  // Filtered & Paginated items
  const allItems = useMemo(() => reportData?.items || [], [reportData]);
  const totalItems = allItems.length;

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return allItems.slice(startIndex, startIndex + pageSize);
  }, [allItems, currentPage, pageSize]);

  // Render Status Badge
  const renderStatusBadge = (item: InventoryTurnoverSkuItem) => {
    switch (item.turnoverStatus) {
      case 'DEAD_STOCK':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold px-2.5 py-0.5 rounded-full text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Tồn đọng - Bất động
          </span>
        );
      case 'SLOW_MOVING':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-2.5 py-0.5 rounded-full text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Chậm luân chuyển
          </span>
        );
      case 'FAST_MOVING':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2.5 py-0.5 rounded-full text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Luân chuyển nhanh
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 font-medium px-2.5 py-0.5 rounded-full text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Bình thường
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50/60 min-h-screen">
      {/* ------------------------------------------------------------- */}
      {/* 1. BREADCRUMB & HEADER                                        */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Báo cáo & Phân tích</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-900 font-bold">Báo cáo tồn kho & Vòng quay hàng</span>
          </nav>
          <div className="flex items-center gap-2 pt-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Báo cáo Tồn kho & Vòng quay hàng
            </h1>
            <span className="text-[11px] font-semibold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded-md">
              SN-219
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Theo dõi giá trị tồn theo kho, nhóm hàng và phân tích số ngày tồn (DSI) để phát hiện hàng chậm luân chuyển chôn vốn.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchReport()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP KPI CARDS                                              */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng giá trị tồn */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Tổng giá trị tồn kho</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {formatCurrency(reportData?.summary.totalInventoryValue)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Số lượng vật lý:</span>
            <span className="font-semibold text-slate-800">
              {formatNumber(reportData?.summary.totalPhysicalQuantity)} SP ({reportData?.summary.totalSkus || 0} SKU)
            </span>
          </div>
        </div>

        {/* KPI 2: Vốn chôn hàng chậm luân chuyển */}
        <div className="bg-white rounded-xl border border-rose-200/90 p-4 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-rose-50/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-rose-700">Vốn chôn hàng chậm luân chuyển</p>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-rose-600 mt-1 tabular-nums">
                {formatCurrency(reportData?.summary.slowMovingValue)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-rose-100/60 flex items-center justify-between text-xs">
            <span className="text-rose-600 font-medium">
              {reportData?.summary.slowMovingCount || 0} SKU bị đọng vốn
            </span>
            <span className="font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full text-[11px]">
              {(
                ((reportData?.summary.slowMovingValue || 0) /
                  (reportData?.summary.totalInventoryValue || 1)) *
                100
              ).toFixed(1)}
              % tổng vốn
            </span>
          </div>
        </div>

        {/* KPI 3: Số ngày tồn bình quân DSI */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Số ngày tồn bình quân (DSI)</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {reportData?.summary.averageDaysOfInventory || 0}{' '}
                <span className="text-sm font-semibold text-slate-500">ngày</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Chu kỳ theo dõi:</span>
            <span className="font-semibold text-slate-800">
              {periodType === 'CUSTOM' && (reportData?.fromDate || fromDate)
                ? `${reportData?.fromDate || fromDate} → ${reportData?.toDate || toDate}`
                : `${reportData?.calculationDays || selectedDays} ngày gần nhất`}
            </span>
          </div>
        </div>

        {/* KPI 4: Vòng quay tồn kho (ITR) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Vòng quay tồn kho (ITR)</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {(reportData?.summary.overallTurnoverRate || 0).toFixed(2)}{' '}
                <span className="text-sm font-semibold text-slate-500">vòng/kỳ</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Đánh giá luân chuyển:</span>
            <span
              className={`font-semibold ${
                (reportData?.summary.overallTurnoverRate || 0) >= 1
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {(reportData?.summary.overallTurnoverRate || 0) >= 1 ? 'Ổn định' : 'Chậm / Cần xả'}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. BREAKDOWN CARDS: VALUATION BY WAREHOUSE & CATEGORY         */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Giá trị tồn theo Kho hàng */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Warehouse className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Giá trị tồn theo Kho hàng</h2>
                <p className="text-[11px] text-slate-500">Phân bổ giá trị và cảnh báo đọng vốn tại từng kho</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              {reportData?.valueByWarehouse.length || 0} kho có hàng
            </span>
          </div>

          <div className="space-y-3.5">
            {reportData?.valueByWarehouse.map((w) => (
              <div key={w.id} className="space-y-1.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{w.name}</span>
                    <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/50">
                      {w.code}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(w.totalValue)}</span>
                    <span className="text-[11px] font-semibold text-slate-500 ml-1.5">({w.percentage.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(2, w.percentage))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>
                    {w.skuCount} SKU • {formatNumber(w.totalQuantity)} sản phẩm
                  </span>
                  {w.slowMovingValue > 0 ? (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Vốn đọng: {formatCurrency(w.slowMovingValue)} ({w.slowMovingSkuCount} SKU)
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Không có hàng tồn đọng</span>
                  )}
                </div>
              </div>
            ))}

            {(!reportData?.valueByWarehouse || reportData.valueByWarehouse.length === 0) && (
              <div className="text-center py-6 text-xs text-slate-400">Không có dữ liệu tồn kho</div>
            )}
          </div>
        </div>

        {/* Card 2: Giá trị tồn theo Nhóm hàng */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Giá trị tồn theo Nhóm hàng</h2>
                <p className="text-[11px] text-slate-500">Tỷ trọng vốn lưu kho theo từng phân loại danh mục</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              {reportData?.valueByCategory.length || 0} nhóm hàng
            </span>
          </div>

          <div className="space-y-3.5">
            {reportData?.valueByCategory.map((c) => (
              <div key={c.id} className="space-y-1.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(c.totalValue)}</span>
                    <span className="text-[11px] font-semibold text-slate-500 ml-1.5">({c.percentage.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(2, c.percentage))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>
                    {c.skuCount} SKU • {formatNumber(c.totalQuantity)} sản phẩm
                  </span>
                  {c.slowMovingValue > 0 ? (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Vốn đọng: {formatCurrency(c.slowMovingValue)} ({c.slowMovingSkuCount} SKU)
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Luân chuyển tốt</span>
                  )}
                </div>
              </div>
            ))}

            {(!reportData?.valueByCategory || reportData.valueByCategory.length === 0) && (
              <div className="text-center py-6 text-xs text-slate-400">Không có dữ liệu nhóm hàng</div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. FILTERS & SEARCH BAR                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Ô Tìm kiếm SKU / Tên SP */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo SKU hoặc tên SP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[38px] pl-9 pr-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Kho hàng */}
          <div>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full h-[38px] px-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="">Tất cả kho hàng</option>
              {reportData?.valueByWarehouse.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Nhóm hàng */}
          <div>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full h-[38px] px-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="">Tất cả nhóm ngành hàng</option>
              {reportData?.valueByCategory.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trạng thái Luân chuyển */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as TurnoverStatus)}
              className="w-full h-[38px] px-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">Tất cả tốc độ luân chuyển</option>
              <option value="SLOW_MOVING">⚠️ Chậm luân chuyển (&gt;60 ngày)</option>
              <option value="DEAD_STOCK">🛑 Tồn đọng / Bất động (0 xuất kho)</option>
              <option value="NORMAL">🟢 Bình thường (31 - 60 ngày)</option>
              <option value="FAST_MOVING">⚡ Luân chuyển nhanh (≤30 ngày)</option>
            </select>
          </div>

          {/* Chu kỳ phân tích & Sắp xếp */}
          <div className="flex gap-2">
            <select
              value={periodType === 'CUSTOM' ? 'CUSTOM' : selectedDays}
              onChange={(e) => {
                if (e.target.value === 'CUSTOM') {
                  setPeriodType('CUSTOM');
                  if (!fromDate) {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    setFromDate(d.toISOString().split('T')[0]);
                    setToDate(new Date().toISOString().split('T')[0]);
                  }
                } else {
                  setPeriodType('PRESET');
                  setSelectedDays(Number(e.target.value));
                }
              }}
              className="w-1/2 h-[38px] px-2 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
              title="Chu kỳ tính toán xuất kho"
            >
              <option value={30}>30 ngày</option>
              <option value={60}>60 ngày</option>
              <option value={90}>90 ngày (chuẩn)</option>
              <option value={180}>180 ngày</option>
              <option value="CUSTOM">📅 Tùy chọn ngày...</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as QueryInventoryReportParams['sortBy'])}
              className="w-1/2 h-[38px] px-2 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
              title="Sắp xếp danh sách"
            >
              <option value="inventoryValue">Vốn tồn cao</option>
              <option value="daysOfInventory">Ngày tồn DSI cao</option>
              <option value="physicalQuantity">Số lượng tồn</option>
              <option value="turnoverRate">Vòng quay ITR</option>
            </select>
          </div>
        </div>

        {/* Khung nhập ngày tùy chọn nếu chọn Tùy chọn ngày */}
        {periodType === 'CUSTOM' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
            <span className="font-semibold text-slate-600">Khoảng thời gian:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Từ</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <span className="text-slate-400">Đến</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchReport()}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
            >
              Lọc theo ngày
            </button>
            <button
              type="button"
              onClick={() => {
                setPeriodType('PRESET');
                setSelectedDays(90);
              }}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Quay lại mặc định
            </button>
          </div>
        )}

        {/* Thông tin filter tích cực */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              Đang hiển thị <strong>{allItems.length}</strong> SKU phù hợp. Bấm vào từng dòng để xem chi tiết vốn chôn và giải pháp luân chuyển.
            </span>
          </div>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedWarehouseId('');
              setSelectedCategoryId('');
              setSelectedStatus('ALL');
              setSelectedDays(90);
              setSortBy('inventoryValue');
              setSortOrder('DESC');
            }}
            className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. DATA TABLE: SKU DETAIL & TURNOVER                          */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm divide-y divide-slate-100">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-[24%]">Mã SKU / Tên sản phẩm</th>
                <th className="px-4 py-3 text-left w-[14%]">Kho lưu trữ</th>
                <th className="px-4 py-3 text-right w-[12%]">Tồn vật lý / Khả dụng</th>
                <th className="px-4 py-3 text-right w-[15%]">Giá trị tồn kho (Vốn)</th>
                <th className="px-4 py-3 text-right w-[13%]">Vòng quay & Ngày tồn</th>
                <th className="px-4 py-3 text-center w-[14%]">Trạng thái luân chuyển</th>
                <th className="px-4 py-3 text-center w-[8%] min-w-[70px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <span className="text-xs font-semibold">Đang tổng hợp dữ liệu luân chuyển hàng tồn kho...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-medium text-slate-600">Không tìm thấy sản phẩm phù hợp với bộ lọc</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr
                    key={`${item.productId}-${item.warehouseId}`}
                    onClick={() => handleOpenDetail(item)}
                    className={`hover:bg-indigo-50/25 transition-colors cursor-pointer group ${
                      item.isSlowMoving ? 'bg-rose-50/15' : ''
                    }`}
                  >
                    {/* Cột 1: SKU & Tên SP & Nhóm hàng */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/60">
                            {item.sku}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {item.categoryName}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {item.productName}
                        </p>
                      </div>
                    </td>

                    {/* Cột 2: Kho lưu trữ */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-slate-800 block">
                          {item.warehouseName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {item.warehouseCode}
                        </span>
                      </div>
                    </td>

                    {/* Cột 3: Số lượng tồn */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 tabular-nums">
                          {formatNumber(item.physicalQuantity)}{' '}
                          <span className="text-[11px] font-normal text-slate-500">
                            {item.baseUnit}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Khả dụng:{' '}
                          <span className="font-semibold text-emerald-700">
                            {formatNumber(item.availableQuantity)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 4: Giá vốn & Giá trị tồn kho */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div
                          className={`font-bold tabular-nums text-sm ${
                            item.isSlowMoving ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {formatCurrency(item.inventoryValue)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Giá vốn: {formatCurrency(item.costPrice)}
                        </div>
                      </div>
                    </td>

                    {/* Cột 5: Vòng quay & Ngày tồn */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-end gap-1 font-bold text-slate-900 tabular-nums">
                          {item.daysOfInventory >= 999 ? (
                            <span className="text-rose-600 font-extrabold">&gt;999 ngày</span>
                          ) : (
                            <span
                              className={
                                item.daysOfInventory > 60
                                  ? 'text-rose-600'
                                  : item.daysOfInventory <= 30
                                  ? 'text-emerald-700'
                                  : 'text-slate-800'
                              }
                            >
                              {item.daysOfInventory} ngày (DSI)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                          <span>ITR: {item.turnoverRate.toFixed(2)} vòng</span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 6: Trạng thái luân chuyển */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {renderStatusBadge(item)}
                    </td>

                    {/* Cột 7: Thao tác */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(item);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết phân tích vốn đọng"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Phân trang gắn liền đáy card bảng */}
        {totalItems > 0 && (
          <div className="border-t border-slate-100 p-3 sm:px-4">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50]}
              itemLabel="mặt hàng"
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: SKU DETAIL & CAPITAL OPTIMIZATION RECOMMENDATIONS    */}
      {/* ------------------------------------------------------------- */}
      {detailModalOpen && selectedSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    selectedSku.isSlowMoving
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}
                >
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Phân tích Luân chuyển & Vốn tồn kho
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono text-indigo-700 font-semibold">{selectedSku.sku}</span>
                    <span>•</span>
                    <span>{selectedSku.warehouseName}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Product Info Banner */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium">Tên mặt hàng:</span>
                <p className="text-sm font-bold text-slate-900">{selectedSku.productName}</p>
                <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                  <span>
                    Ngành hàng: <strong>{selectedSku.categoryName}</strong>
                  </span>
                  <span>
                    Đơn vị: <strong>{selectedSku.baseUnit}</strong>
                  </span>
                </div>
              </div>

              {/* Status Warning Banner */}
              {selectedSku.isSlowMoving && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-rose-800">
                      Cảnh báo: Mặt hàng đang chôn vốn chậm luân chuyển!
                    </p>
                    <p className="text-rose-700 leading-relaxed">
                      {selectedSku.holdingCapitalWarning ||
                        `Mặt hàng này đang chôn ${formatCurrency(
                          selectedSku.inventoryValue,
                        )} vốn kho. Số ngày tồn trung bình lên tới ${
                          selectedSku.daysOfInventory >= 999
                            ? '>999 ngày (không phát sinh xuất kho)'
                            : `${selectedSku.daysOfInventory} ngày`
                        }.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70">
                  <span className="text-[11px] text-slate-500">Tồn vật lý</span>
                  <p className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                    {formatNumber(selectedSku.physicalQuantity)} {selectedSku.baseUnit}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Khả dụng: {formatNumber(selectedSku.availableQuantity)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70">
                  <span className="text-[11px] text-slate-500">Vốn tồn kho</span>
                  <p className="text-base font-bold text-rose-600 tabular-nums mt-0.5">
                    {formatCurrency(selectedSku.inventoryValue)}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Giá vốn: {formatCurrency(selectedSku.costPrice)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70">
                  <span className="text-[11px] text-slate-500">Ngày tồn (DSI)</span>
                  <p className="text-base font-bold text-amber-600 tabular-nums mt-0.5">
                    {selectedSku.daysOfInventory >= 999 ? '>999' : selectedSku.daysOfInventory} ngày
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Xuất: {formatNumber(selectedSku.outboundQuantity)} trong {selectedDays}d
                  </span>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70">
                  <span className="text-[11px] text-slate-500">Vòng quay (ITR)</span>
                  <p className="text-base font-bold text-indigo-600 tabular-nums mt-0.5">
                    {selectedSku.turnoverRate.toFixed(2)} vòng
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Tốc độ: {selectedSku.dailyOutbound.toFixed(2)}/ngày
                  </span>
                </div>
              </div>

              {/* Actionable Recommendations to unfreeze capital */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-indigo-900">
                    Đề xuất của Quản lý kho để giải phóng vốn chôn:
                  </h4>
                </div>
                <ul className="text-xs text-indigo-950/80 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>
                    <strong>Khuyến mại xả hàng / Flash Sale:</strong> Phối hợp bộ phận Kinh doanh chạy chính sách chiết khấu kích cầu hoặc bán kèm (Combo) với các sản phẩm bán chạy.
                  </li>
                  <li>
                    <strong>Điều chuyển nội bộ:</strong> Kiểm tra nhu cầu tại các kho chi nhánh khác để luân chuyển, tránh để hàng nằm im tại một điểm kho.
                  </li>
                  <li>
                    <strong>Đàm phán đổi trả Nhà cung cấp:</strong> Đối với lô hàng cận hạn hoặc sản phẩm không còn thị hiếu, kiến nghị hoàn trả hoặc đổi mã hàng mới.
                  </li>
                  <li>
                    <strong>Tạm dừng đặt thêm:</strong> Khóa tạm thời kế hoạch nhập bổ sung cho SKU này cho đến khi mức tồn giảm xuống dưới ngưỡng an toàn.
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="inline-flex items-center justify-center h-[38px] px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-2xs cursor-pointer"
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
