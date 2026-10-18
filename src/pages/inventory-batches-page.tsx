import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Boxes,
  Check,
  AlertCircle,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { inventoryBatchesService } from '../services/inventory-batches.service';
import type {
  InventoryBatchItem,
  InventoryBatchStats,
  BatchStatus,
  CheckBatchDispatchResult,
} from '../types/inventory-batch.types';
import { Pagination } from '../components/pagination';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';
import { USER_ROLES } from '../types/auth';
import { STANDARD_WAREHOUSES } from '../constants/warehouse.constants';

/**
 * Định dạng ngày dd/mm/yyyy từ chuỗi ISO yyyy-mm-dd
 */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '---';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * Trang Quản lý Lô & Hạn sử dụng theo chuẩn FEFO (SN-184)
 * - Bật/tắt theo dõi lô từng SKU
 * - Hiển thị số lô, NSX, HSD, số lượng tồn còn lại
 * - Cảnh báo cận hạn theo ngưỡng cấu hình linh hoạt (15/30/60/90 ngày)
 * - Chặn xuất lô đã quá hạn trừ khi Quản lý kho xác nhận ghi đè kèm lý do
 */
export const InventoryBatchesPage: React.FC = () => {
  const currentUser = getStoredUser();
  const roles = currentUser?.roles || [];
  const isAdmin = roles.includes(USER_ROLES.ADMIN);
  const isWarehouseManager =
    roles.includes(USER_ROLES.WAREHOUSE_MANAGER) || roles.includes('WH_MANAGER');
  const canOverrideExpired = isAdmin || isWarehouseManager;

  // Dữ liệu danh sách & Thống kê
  const [batches, setBatches] = useState<InventoryBatchItem[]>([]);
  const [stats, setStats] = useState<InventoryBatchStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BatchStatus>('ALL');
  const [thresholdDays, setThresholdDays] = useState<number>(30);
  const [customThresholdInput, setCustomThresholdInput] = useState<string>('30');
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);

  // Phân trang
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal Kiểm tra xuất kho & Ghi đè Quản lý
  const [selectedBatchForDispatch, setSelectedBatchForDispatch] =
    useState<InventoryBatchItem | null>(null);
  const [dispatchQuantity, setDispatchQuantity] = useState<number | string>(10);
  const [managerOverrideReason, setManagerOverrideReason] = useState<string>('');
  const [dispatchCheckResult, setDispatchCheckResult] =
    useState<CheckBatchDispatchResult | null>(null);
  const [isCheckingDispatch, setIsCheckingDispatch] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);



  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    Promise.all([
      inventoryBatchesService.getBatches({
        warehouseId: warehouseFilter === 'ALL' ? undefined : warehouseFilter,
        status: statusFilter,
        search: searchTerm.trim() || undefined,
        expiryThresholdDays: thresholdDays,
        page,
        limit,
      }),
      inventoryBatchesService.getBatchStats(
        warehouseFilter === 'ALL' ? undefined : warehouseFilter,
        thresholdDays,
      ),
    ])
      .then(([listRes, statsRes]) => {
        if (!isCancelled) {
          setBatches(listRes.data || []);
          setTotalItems(listRes.total || 0);
          setTotalPages(listRes.totalPages || 1);
          setStats(statsRes);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          showToast('error', 'Không thể tải danh sách lô hàng. Vui lòng thử lại!');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [warehouseFilter, statusFilter, searchTerm, thresholdDays, page, limit]);

  // Xử lý thay đổi ngưỡng cảnh báo
  const handleApplyThreshold = (days: number) => {
    if (days <= 0 || isNaN(days)) {
      showToast('error', 'Ngưỡng ngày cảnh báo phải là số nguyên dương!');
      return;
    }
    setThresholdDays(days);
    setCustomThresholdInput(String(days));
    setIsEditingThreshold(false);
    setPage(1);
    showToast('info', `Đã cập nhật ngưỡng cảnh báo cận hạn: ${days} ngày`);
  };

  // Mở modal kiểm tra xuất kho cho một lô cụ thể
  const handleOpenDispatchCheck = (batch: InventoryBatchItem) => {
    setSelectedBatchForDispatch(batch);
    setDispatchQuantity(Math.min(10, batch.availableQuantity || 1));
    setManagerOverrideReason('');
    setDispatchCheckResult(null);
    setDispatchError(null);
    setReasonError(null);
  };

  // Thực hiện kiểm tra điều kiện xuất kho
  const handlePerformDispatchCheck = async () => {
    if (!selectedBatchForDispatch) return;
    const qty = typeof dispatchQuantity === 'string' ? parseInt(dispatchQuantity, 10) : dispatchQuantity;
    if (isNaN(qty) || qty <= 0) {
      setDispatchError('Số lượng cần xuất phải lớn hơn 0');
      return;
    }
    if (selectedBatchForDispatch.availableQuantity && qty > selectedBatchForDispatch.availableQuantity) {
      setDispatchError(
        `Số lượng xuất (${qty}) không được vượt quá tồn khả dụng (${selectedBatchForDispatch.availableQuantity})`
      );
      return;
    }

    const isExpired = selectedBatchForDispatch.daysRemaining < 0;

    // Nếu lô đã quá hạn, bắt buộc Quản lý kho phải nhập lý do trước khi bấm xác nhận
    if (isExpired) {
      if (!canOverrideExpired) {
        setDispatchError('Bạn không có quyền Quản lý kho để xuất lô quá hạn.');
        return;
      }

      const trimmedReason = managerOverrideReason.trim();
      if (!trimmedReason) {
        setReasonError('Vui lòng nhập lý do ghi đè của Quản lý kho trước khi xác nhận');
        return;
      }
      if (trimmedReason.length < 5) {
        setReasonError('Lý do ghi đè quá ngắn (vui lòng nhập tối thiểu 5 ký tự)');
        return;
      }
    }

    try {
      setIsCheckingDispatch(true);
      setDispatchError(null);
      setReasonError(null);

      const result = await inventoryBatchesService.checkBatchDispatch({
        batchId: selectedBatchForDispatch.id,
        batchNumber: selectedBatchForDispatch.batchNumber,
        warehouseId: selectedBatchForDispatch.warehouseId,
        quantity: qty,
        managerOverrideReason: managerOverrideReason.trim() || undefined,
      });

      setDispatchCheckResult(result);
      if (result.isOverridden) {
        showToast('warning', 'Quản lý kho đã xác nhận ghi đè xuất lô quá hạn thành công!');
      } else {
        showToast('success', 'Lô hàng đủ điều kiện xuất kho an toàn!');
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        'Lô hàng không đủ điều kiện xuất kho!';
      setDispatchError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsCheckingDispatch(false);
    }
  };

  return (
    <div className="space-y-6">


      {/* 2. KPI Summary Metrics - Thẻ hiển thị số liệu thống kê */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tổng số lô */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Tổng số Lô tồn</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {stats?.totalBatches ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {(stats?.totalQuantity ?? 0).toLocaleString('vi-VN')} đơn vị
            </span>
          </div>
        </div>

        {/* Card 2: Lô an toàn / Hợp lệ */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Còn hạn an toàn</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">
              {stats?.validCount ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              HSD &gt; {thresholdDays} ngày
            </span>
          </div>
        </div>

        {/* Card 3: Lô sắp hết hạn (Cận hạn) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Sắp hết hạn</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-700 tabular-nums">
              {stats?.expiringSoonCount ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              HSD ≤ {thresholdDays} ngày
            </span>
          </div>
        </div>

        {/* Card 4: Lô đã quá hạn (Nguy cơ) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Đã quá hạn (Chặn xuất)</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-700 tabular-nums">
              {stats?.expiredCount ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Quá hạn HSD
            </span>
          </div>
        </div>
      </div>

      {/* 3. Khung Bộ Lọc & Cấu hình Ngưỡng Cảnh Báo (Filter Toolbar) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo Số lô (Batch No), Mã SKU, Tên sản phẩm..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Lọc theo Kho hàng */}
          <div className="relative w-full lg:w-56">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-6 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer truncate"
            >
              <option value="ALL">Tất cả kho lưu trữ</option>
              {STANDARD_WAREHOUSES.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Trạng thái Lô (Thiết kế đồng nhất theo ảnh người dùng yêu cầu) */}
          <div className="relative w-full lg:w-56">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | BatchStatus);
                setPage(1);
              }}
              className="w-full pl-9 pr-6 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer truncate"
            >
              <option value="ALL">Tất cả trạng thái lô</option>
              <option value="VALID">Còn hạn an toàn</option>
              <option value="EXPIRING_SOON">Sắp hết hạn</option>
              <option value="EXPIRED">Đã quá hạn</option>
            </select>
          </div>

        </div>

        {/* Cấu hình Ngưỡng Cảnh Báo Cận Hạn Khai Báo Được (Tiêu chí 3) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Ngưỡng cảnh báo cận hạn:</span>
            
            {/* Các nút bấm chọn nhanh */}
            <div className="flex items-center gap-1.5">
              {[15, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleApplyThreshold(d)}
                  className={`h-7 px-2.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                    thresholdDays === d
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>

            {/* Ô nhập tùy chỉnh số ngày */}
            {isEditingThreshold ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customThresholdInput}
                  onChange={(e) => setCustomThresholdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyThreshold(Number(customThresholdInput));
                    }
                  }}
                  className="w-16 h-7 px-2 text-xs font-mono font-bold text-slate-900 border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleApplyThreshold(Number(customThresholdInput))}
                  className="h-7 px-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md cursor-pointer"
                >
                  Lưu
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingThreshold(true)}
                className="text-[11px] font-medium text-indigo-600 hover:underline cursor-pointer ml-1"
              >
                + Tùy chỉnh ngày
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 4. Bảng Dữ Liệu Lô Hàng (Data Table Fluid) */}
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm divide-y divide-slate-100">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-[28%]">Sản phẩm / SKU</th>
                <th className="px-4 py-3 text-left w-[20%]">Số Lô & Kho lưu trữ</th>
                <th className="px-4 py-3 text-left w-[16%]">NSX / HSD</th>
                <th className="px-4 py-3 text-left w-[14%]">Hạn dùng còn lại</th>
                <th className="px-4 py-3 text-right w-[11%]">Số lượng tồn</th>
                <th className="px-4 py-3 text-right w-[11%] min-w-[110px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Đang tải dữ liệu lô hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <div className="max-w-sm mx-auto py-2">
                      <p className="font-semibold text-slate-700 text-sm">
                        {statusFilter === 'EXPIRED'
                          ? 'Tuyệt vời! Không có lô hàng nào bị quá hạn'
                          : statusFilter === 'EXPIRING_SOON'
                          ? `Không có lô hàng nào sắp hết hạn trong ${thresholdDays} ngày tới`
                          : statusFilter === 'VALID'
                          ? 'Không tìm thấy lô hàng còn hạn an toàn'
                          : 'Không tìm thấy lô hàng nào'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((item) => {
                  const isExpired = item.status === 'EXPIRED' || item.daysRemaining < 0;
                  const isNearExpiry = item.status === 'EXPIRING_SOON';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors group ${
                        isExpired
                          ? 'bg-rose-50/30 hover:bg-rose-50/50'
                          : isNearExpiry
                          ? 'bg-amber-50/20 hover:bg-amber-50/40'
                          : 'hover:bg-indigo-50/25'
                      }`}
                    >
                      {/* Cột 1: Sản phẩm / SKU */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span className="inline-block font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/60">
                            {item.productSku}
                          </span>
                          <div className="font-bold text-slate-900 text-xs line-clamp-1">
                            {item.productName}
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Số Lô & Kho */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="font-mono text-xs font-bold text-slate-800">
                            {item.batchNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.warehouseName}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: NSX / HSD */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-0.5 text-xs">
                          <div className="text-slate-500 text-[11px]">
                            NSX: <span className="font-mono text-slate-700">{formatDate(item.mfgDate)}</span>
                          </div>
                          <div className="font-semibold text-slate-900">
                            HSD: <span className="font-mono font-bold">{formatDate(item.expiryDate)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 4: Hạn dùng còn lại (Days Remaining Badge) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Quá hạn {Math.abs(item.daysRemaining)} ngày</span>
                          </span>
                        ) : isNearExpiry ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Còn {item.daysRemaining} ngày</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Còn {item.daysRemaining} ngày</span>
                          </span>
                        )}
                      </td>

                      {/* Cột 5: Số lượng tồn */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 tabular-nums text-sm font-mono">
                            {item.quantity.toLocaleString('vi-VN')}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Khả dụng: <strong className="text-slate-700 font-mono">{item.availableQuantity}</strong> {item.baseUnit}
                          </div>
                        </div>
                      </td>

                      {/* Cột 6: Thao tác Kiểm tra xuất kho */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenDispatchCheck(item)}
                          className={`inline-flex items-center justify-center gap-1 h-[30px] px-2.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            isExpired
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-white text-indigo-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
                          }`}
                          title="Kiểm tra điều kiện xuất kho"
                        >
                          {isExpired ? (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Ghi đè</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>Kiểm tra</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Phân trang gắn liền đáy Card (UI_GUIDELINES Section 28 & 91) */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={limit}
          showRecordRange={false}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setLimit(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* 5. MODAL KIỂM TRA ĐIỀU KIỆN XUẤT KHO & GHI ĐÈ QUẢN LÝ (SN-184 AC-4) */}
      {selectedBatchForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden space-y-4 p-5 sm:p-6">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {selectedBatchForDispatch.daysRemaining < 0 ? (
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Kiểm tra điều kiện xuất kho
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Lô: {selectedBatchForDispatch.batchNumber} • {selectedBatchForDispatch.productSku}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatchForDispatch(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thông tin sản phẩm & lô */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Sản phẩm:</span>
                <span className="font-bold text-slate-900 text-right line-clamp-1">
                  {selectedBatchForDispatch.productName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kho lưu trữ:</span>
                <span className="font-semibold text-slate-800">
                  {selectedBatchForDispatch.warehouseName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hạn sử dụng:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatDate(selectedBatchForDispatch.expiryDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tồn khả dụng:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {selectedBatchForDispatch.availableQuantity} {selectedBatchForDispatch.baseUnit}
                </span>
              </div>
            </div>

            {/* Cảnh báo nghiêm ngặt nếu lô đã hết hạn (Tiêu chí 4) */}
            {selectedBatchForDispatch.daysRemaining < 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-rose-800 font-bold">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>CẢNH BÁO: LÔ HÀNG ĐÃ QUÁ HẠN SỬ DỤNG</span>
                </div>
                <p className="text-rose-700 leading-relaxed text-[11px]">
                  Lô này đã hết hạn từ ngày{' '}
                  <strong className="font-mono font-bold">
                    {formatDate(selectedBatchForDispatch.expiryDate)}
                  </strong>{' '}
                  (quá hạn {Math.abs(selectedBatchForDispatch.daysRemaining)} ngày).
                  Hệ thống <strong>chặn xuất kho thông thường</strong> để đảm bảo không giao nhầm hàng cho đại lý.
                </p>
              </div>
            )}

            {/* Nhập số lượng xuất */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Số lượng dự kiến xuất ({selectedBatchForDispatch.baseUnit})</span>
                <span className="text-slate-400 font-normal">Tối đa: {selectedBatchForDispatch.availableQuantity}</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={dispatchQuantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const cleanValue = e.target.value.replace(/\D/g, '');
                  if (cleanValue === '') {
                    setDispatchQuantity('');
                    return;
                  }
                  const finalVal = parseInt(cleanValue, 10);
                  const max = selectedBatchForDispatch.availableQuantity || 0;
                  if (max > 0 && finalVal > max) {
                    setDispatchQuantity(max);
                  } else {
                    setDispatchQuantity(finalVal);
                  }
                }}
                placeholder="Nhập số lượng xuất..."
                className="w-full h-[38px] px-3 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              />
            </div>

            {/* Ô nhập Lý do ghi đè của Quản lý kho (chỉ hiển thị khi lô quá hạn) */}
            {selectedBatchForDispatch.daysRemaining < 0 && canOverrideExpired && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>Lý do ghi đè của Quản lý kho</span>
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={managerOverrideReason}
                  onChange={(e) => {
                    setManagerOverrideReason(e.target.value);
                    if (reasonError) setReasonError(null);
                    if (dispatchError) setDispatchError(null);
                  }}
                  placeholder="Bắt buộc nhập lý do: VD: Xuất trả nhà cung cấp, xuất hủy hàng hỏng..."
                  className={`w-full p-2.5 text-xs border rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                    reasonError
                      ? 'border-rose-500 ring-1 ring-rose-200 focus:border-rose-500 focus:ring-rose-200'
                      : 'border-slate-200 focus:ring-indigo-500/10 focus:border-indigo-500'
                  }`}
                />
                {reasonError && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{reasonError}</span>
                  </p>
                )}
              </div>
            )}

            {/* Kết quả kiểm tra xuất */}
            {dispatchCheckResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  dispatchCheckResult.isOverridden
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Xác thực thành công! Đủ điều kiện xuất kho.</span>
                </div>
                {dispatchCheckResult.overrideReason && (
                  <p className="text-[11px]">
                    Lý do ghi đè: <em>{dispatchCheckResult.overrideReason}</em> (Bởi: {dispatchCheckResult.overriddenBy})
                  </p>
                )}
              </div>
            )}

            {/* Lỗi nếu có */}
            {dispatchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
                {dispatchError}
              </div>
            )}

            {/* Actions Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBatchForDispatch(null)}
                className="h-[38px] px-3.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handlePerformDispatchCheck}
                disabled={
                  isCheckingDispatch ||
                  (selectedBatchForDispatch.daysRemaining < 0 && !canOverrideExpired)
                }
                className={`h-[38px] px-4 text-xs font-semibold text-white rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedBatchForDispatch.daysRemaining < 0
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isCheckingDispatch ? (
                  <span>Đang xử lý...</span>
                ) : selectedBatchForDispatch.daysRemaining < 0 ? (
                  <span>Xác nhận ghi đè & Xuất kho</span>
                ) : (
                  <span>Xuất kho</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
