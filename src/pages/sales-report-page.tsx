import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  MapPin,
  Building,
  Package,
  Layers,
  ShieldCheck,
  Eye,
  X,
  RefreshCw,
  Percent,
  TrendingUp,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { salesReportService } from '../services/sales-report.service';
import type {
  MultidimensionalSalesReportResponse,
  SalesReportGroupBy,
  SalesReportRowItem,
} from '../services/sales-report.service';
import { getStoredUser } from '../utils/navigation';

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

const formatNumber = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
};

const GROUP_OPTIONS: { key: SalesReportGroupBy; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'sales_rep', label: 'Nhân viên kinh doanh', icon: Users },
  { key: 'region', label: 'Khu vực địa bàn', icon: MapPin },
  { key: 'customer', label: 'Đại lý / Khách hàng', icon: Building },
  { key: 'category', label: 'Nhóm ngành hàng', icon: Layers },
  { key: 'product', label: 'Mặt hàng (SKU)', icon: Package },
];

const TIME_RANGE_OPTIONS = [
  { key: 'this_month', label: 'Tháng này' },
  { key: 'today', label: 'Hôm nay' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'this_quarter', label: 'Quý này' },
  { key: 'custom', label: 'Tùy chọn ngày' },
];

export const SalesReportPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getStoredUser();
  const roles = user?.roles || [];
  const isSalesManager = roles.includes('SALES_MANAGER');

  // Khôi phục trạng thái từ URL Query Parameters
  const rawGroupBy = searchParams.get('groupBy') as SalesReportGroupBy;
  const initialGroupBy: SalesReportGroupBy =
    rawGroupBy && ['sales_rep', 'region', 'customer', 'category', 'product'].includes(rawGroupBy)
      ? rawGroupBy
      : 'sales_rep';

  const rawTimeRange = searchParams.get('timeRange') || 'this_month';
  const initialTimeRange = ['today', 'this_month', 'last_month', 'this_quarter', 'custom'].includes(rawTimeRange)
    ? rawTimeRange
    : 'this_month';

  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';
  const initialSearch = (searchParams.get('search') || searchParams.get('q') || '').trim();

  const [groupBy, setGroupBy] = useState<SalesReportGroupBy>(initialGroupBy);
  const [timeRange, setTimeRange] = useState<string>(initialTimeRange);
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);

  const [reportData, setReportData] = useState<MultidimensionalSalesReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Modal xem chi tiết phân tích từng dòng
  const [selectedRowDetail, setSelectedRowDetail] = useState<SalesReportRowItem | null>(null);

  // Hàm đồng bộ hai chiều với URL Query Parameters
  const updateUrlParams = useCallback(
    (params: {
      groupBy?: SalesReportGroupBy;
      timeRange?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (params.groupBy !== undefined) {
            if (params.groupBy === 'sales_rep') next.delete('groupBy');
            else next.set('groupBy', params.groupBy);
          }
          if (params.timeRange !== undefined) {
            if (params.timeRange === 'this_month') next.delete('timeRange');
            else next.set('timeRange', params.timeRange);
          }
          if (params.startDate !== undefined) {
            if (params.startDate) next.set('startDate', params.startDate);
            else next.delete('startDate');
          }
          if (params.endDate !== undefined) {
            if (params.endDate) next.set('endDate', params.endDate);
            else next.delete('endDate');
          }
          if (params.search !== undefined) {
            if (params.search.trim()) next.set('search', params.search.trim());
            else {
              next.delete('search');
              next.delete('q');
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Tải báo cáo từ Backend thật
  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        groupBy,
        timeRange,
        startDate: timeRange === 'custom' ? startDate : undefined,
        endDate: timeRange === 'custom' ? endDate : undefined,
        search: searchTerm.trim() || undefined,
      };
      const res = await salesReportService.getMultidimensionalSalesReport(params);
      setReportData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải báo cáo doanh số';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [groupBy, timeRange, startDate, endDate, searchTerm]);

  // Debounce gọi backend khi tìm kiếm
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      updateUrlParams({ search: val });
    }, 350);
  };

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Xuất file Excel
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await salesReportService.exportMultidimensionalSalesExcel({
        groupBy,
        timeRange,
        startDate: timeRange === 'custom' ? startDate : undefined,
        endDate: timeRange === 'custom' ? endDate : undefined,
        search: searchTerm.trim() || undefined,
      });
      showToast('success', 'Đã xuất file Excel báo cáo doanh số thành công');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi xuất file Excel';
      showToast('error', msg);
    } finally {
      setExporting(false);
    }
  };

  const items = reportData?.items || [];
  const summary = reportData?.summary;
  const hasProfitAccess = Boolean(reportData?.hasProfitAccess ?? isSalesManager);

  // Icon theo chiều nhóm hiện tại
  const currentGroupIcon = GROUP_OPTIONS.find((g) => g.key === groupBy)?.icon || Users;
  const CurrentIcon = currentGroupIcon;

  return (
    <div className="space-y-4 sm:space-y-5 w-full animate-in fade-in-50 duration-300">
      {/* ── THANH ĐIỀU KHIỂN & BỘ LỌC TẬP TRUNG ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Hàng 1: Ô tìm kiếm và Nút Xuất Excel */}
        <div className="flex items-center justify-between gap-3">
          {/* 1. Ô tìm kiếm gọi backend thật với debounce */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã đối tượng..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white focus:border-indigo-500 focus:outline-none placeholder:text-slate-400 transition-colors shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  updateUrlParams({ search: '' });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Cụm bên phải: Huy hiệu Biên LN + Nút Xuất Excel */}
          <div className="flex items-center gap-2 shrink-0">
            {hasProfitAccess && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Xem Biên LN: Bật</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="h-10 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg px-4 text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
              title="Xuất dữ liệu báo cáo ra file Excel"
            >
              <FileSpreadsheet className={`h-4 w-4 ${exporting ? 'animate-bounce' : ''}`} />
              <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
          </div>
        </div>

        {/* Hàng 2: 2 hộp select (Chiều phân tích & Khoảng thời gian) */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2.5 border-t border-slate-100">
          {/* Select 1: Chiều phân tích dữ liệu */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Phân tích:</span>
            <select
              value={groupBy}
              onChange={(e) => {
                const val = e.target.value as SalesReportGroupBy;
                setGroupBy(val);
                updateUrlParams({ groupBy: val });
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none cursor-pointer shadow-2xs hover:border-slate-300 transition-colors"
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Select 2: Khoảng thời gian */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Kỳ:</span>
            <select
              value={timeRange}
              onChange={(e) => {
                const val = e.target.value;
                setTimeRange(val);
                updateUrlParams({ timeRange: val });
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none cursor-pointer shadow-2xs hover:border-slate-300 transition-colors"
            >
              {TIME_RANGE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nếu chọn Tùy chọn ngày: hiển thị 2 ô ngày */}
          {timeRange === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  updateUrlParams({ startDate: e.target.value });
                }}
                className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none shadow-2xs"
              />
              <span className="text-xs text-slate-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  updateUrlParams({ endDate: e.target.value });
                }}
                className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none shadow-2xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── 3 THẺ KPI TỔNG QUAN THIẾT KẾ DỄ NHÌN (ĐÃ BỎ CARD THỨ 4) ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: Doanh thu thuần */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Doanh thu thuần kỳ này</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-indigo-700 tracking-tight tabular-nums">
              {formatCurrency(summary.totalCurrentSales)}
            </div>
            <div className="text-xs text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>Kỳ trước: {formatCurrency(summary.totalPreviousSales)}</span>
              {hasProfitAccess && summary.totalGrossProfit !== undefined && (
                <span className="text-emerald-700 font-bold">
                  LN: {summary.totalGrossMarginPercent}%
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Tăng trưởng so cùng kỳ */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Tăng trưởng so cùng kỳ</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-1.5 tabular-nums">
              {summary.totalGrowthRatePercent !== null ? (
                <>
                  <span
                    className={
                      summary.totalGrowthRatePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }
                  >
                    {summary.totalGrowthRatePercent >= 0 ? '+' : ''}
                    {summary.totalGrowthRatePercent}%
                  </span>
                  {summary.totalGrowthRatePercent >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-rose-600 shrink-0" />
                  )}
                </>
              ) : (
                <span className="text-slate-400">0%</span>
              )}
            </div>
            <div className="text-xs text-slate-400 pt-1 border-t border-slate-100">
              Chênh lệch:{' '}
              <strong className={summary.totalDiffAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {summary.totalDiffAmount >= 0 ? '+' : ''}
                {formatCurrency(summary.totalDiffAmount)}
              </strong>
            </div>
          </div>

          {/* Card 3: Sản lượng & Đơn hàng */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Tổng sản lượng xuất bán</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
              {formatNumber(summary.totalQuantity)}
            </div>
            <div className="text-xs text-slate-400 pt-1 border-t border-slate-100">
              Tổng số đơn hàng: <strong className="text-slate-800">{summary.totalOrdersCount} đơn</strong>
            </div>
          </div>
        </div>
      )}

      {/* ── BẢNG DỮ LIỆU ĐÃ TỐI ƯU GỌN GÀNG: BỎ MÃ ĐỐI TƯỢNG, THÊM NÚT CHI TIẾT ĐỂ KHÔNG VỠ GIAO DIỆN ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs w-full">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
            <CurrentIcon className="h-4 w-4 text-indigo-600" />
            <span>Bảng số liệu phân tích theo {reportData?.groupByLabel || 'nhóm'}</span>
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            {items.length} đối tượng phát sinh
          </div>
        </div>

        {loading ? (
          <div className="py-14 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
            <span className="font-medium text-sm text-slate-600">Đang tổng hợp báo cáo doanh số...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">
            Không tìm thấy dữ liệu bán hàng phù hợp với điều kiện lọc đã chọn.
          </div>
        ) : (
          <div>
            {/* 1. Bảng Desktop (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto w-full">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col className="w-[36%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3.5 text-left whitespace-nowrap">Đối tượng</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap">Số đơn</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Sản lượng</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Doanh số kỳ này (VNĐ)</th>
                    <th className="px-3 py-3.5 text-center whitespace-nowrap">Tăng trưởng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {items.map((row) => (
                    <tr
                      key={row.id || row.code}
                      onClick={() => setSelectedRowDetail(row)}
                      className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                      title="Nhấp để xem chi tiết phân tích"
                    >
                      {/* Cột 1: Đối tượng (Tên + sub info nếu có) */}
                      <td className="px-4 py-3.5 text-left whitespace-nowrap">
                        <div className="flex items-center justify-between min-w-0 pr-1">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CurrentIcon className="h-4 w-4 text-indigo-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block truncate" title={row.name}>
                                {row.name}
                              </span>
                              {row.categoryName && groupBy === 'product' && (
                                <span className="text-[11px] text-slate-400 block truncate">{row.categoryName}</span>
                              )}
                            </div>
                          </div>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-indigo-600 flex items-center gap-1 shrink-0 ml-1.5 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/60">
                            <Eye className="h-3 w-3 text-indigo-600" />
                            <span className="hidden md:inline">Chi tiết</span>
                          </span>
                        </div>
                      </td>

                      {/* Cột 2: Số đơn */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap text-slate-700 tabular-nums">
                        {row.ordersCount} đơn
                      </td>

                      {/* Cột 3: Sản lượng */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-semibold text-slate-900 tabular-nums">
                        {formatNumber(row.quantity)} {row.unit || ''}
                      </td>

                      {/* Cột 4: Doanh số kỳ này */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-bold text-indigo-700 tabular-nums">
                        {formatCurrency(row.currentSales)}
                      </td>

                      {/* Cột 5: Tăng trưởng */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        {row.isNewSales ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Mới (+100%)
                          </span>
                        ) : row.growthRatePercent !== null ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                              row.growthRatePercent >= 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            }`}
                          >
                            {row.growthRatePercent >= 0 ? '+' : ''}
                            {row.growthRatePercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Hàng tổng cộng */}
                {summary && (
                  <tfoot>
                    <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-200 text-slate-900 text-xs sm:text-sm">
                      <td className="px-4 py-3.5 text-left">
                        TỔNG CỘNG ({items.length} {reportData?.groupByLabel})
                      </td>
                      <td className="px-3 py-3.5 text-center tabular-nums">
                        {summary.totalOrdersCount} đơn
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {formatNumber(summary.totalQuantity)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-indigo-700">
                        {formatCurrency(summary.totalCurrentSales)}
                      </td>
                      <td className="px-3 py-3.5 text-center tabular-nums text-emerald-700">
                        {summary.totalGrowthRatePercent !== null
                          ? `${summary.totalGrowthRatePercent >= 0 ? '+' : ''}${summary.totalGrowthRatePercent}%`
                          : '0%'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* 2. Giao diện Card Mobile (< 640px) */}
            <div className="sm:hidden divide-y divide-slate-100">
              {items.map((row, index) => (
                <div key={row.id || index} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-400 font-medium">#{index + 1}</div>
                      <div className="text-sm font-bold text-slate-900 truncate" title={row.name}>
                        {row.name}
                      </div>
                      {row.categoryName && (
                        <div className="text-xs text-slate-400 truncate">{row.categoryName}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-indigo-700 tabular-nums">
                        {formatCurrency(row.currentSales)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {row.growthRatePercent !== null ? (
                          <span className={row.growthRatePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {row.growthRatePercent >= 0 ? '+' : ''}
                            {row.growthRatePercent}%
                          </span>
                        ) : (
                          '0%'
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400">Số đơn:</span>{' '}
                      <strong className="text-slate-800">{row.ordersCount} đơn</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Sản lượng:</span>{' '}
                      <strong className="text-slate-800">
                        {formatNumber(row.quantity)} {row.unit || ''}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedRowDetail(row)}
                      className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Xem chi tiết đối tượng</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL CHI TIẾT ĐỐI TƯỢNG (GIÚP BẢNG CHÍNH GỌN GÀNG KHÔNG VỠ GIAO DIỆN) ── */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in-0 duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
              <div>
                <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 mb-1">
                  {reportData?.groupByLabel || 'Nhóm phân tích'}
                </span>
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  {selectedRowDetail.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Mã: {selectedRowDetail.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-slate-400 text-xs block">Doanh số kỳ này</span>
                <span className="font-bold text-indigo-700 text-base block tabular-nums">
                  {formatCurrency(selectedRowDetail.currentSales)}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-slate-400 text-xs block">Doanh số kỳ trước</span>
                <span className="font-bold text-slate-700 text-base block tabular-nums">
                  {formatCurrency(selectedRowDetail.previousSales)}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-slate-400 text-xs block">Chênh lệch tuyệt đối</span>
                <span
                  className={`font-bold text-base block tabular-nums ${
                    selectedRowDetail.diffAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {selectedRowDetail.diffAmount >= 0 ? '+' : ''}
                  {formatCurrency(selectedRowDetail.diffAmount)}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-slate-400 text-xs block">Tỷ lệ tăng trưởng</span>
                <span
                  className={`font-bold text-base block tabular-nums ${
                    selectedRowDetail.growthRatePercent !== null && selectedRowDetail.growthRatePercent >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {selectedRowDetail.isNewSales
                    ? 'Mới (+100%)'
                    : selectedRowDetail.growthRatePercent !== null
                    ? `${selectedRowDetail.growthRatePercent >= 0 ? '+' : ''}${selectedRowDetail.growthRatePercent}%`
                    : '0%'}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-slate-400 text-xs block">Số đơn hàng phát sinh</span>
                <span className="font-semibold text-slate-800 text-base block tabular-nums">
                  {selectedRowDetail.ordersCount} đơn
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-slate-400 text-xs block">Tổng sản lượng xuất</span>
                <span className="font-semibold text-slate-800 text-base block tabular-nums">
                  {formatNumber(selectedRowDetail.quantity)} {selectedRowDetail.unit || ''}
                </span>
              </div>

              {/* Thông tin biên lợi nhuận (Chỉ Quản lý) */}
              {hasProfitAccess && selectedRowDetail.cogs !== undefined && (
                <>
                  <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-emerald-800 text-xs block">Lợi nhuận gộp</span>
                    <span className="font-bold text-emerald-700 text-base block tabular-nums">
                      {formatCurrency(selectedRowDetail.grossProfit || 0)}
                    </span>
                    <span className="text-[11px] text-emerald-600 block">
                      Biên LN: {selectedRowDetail.grossMarginPercent}%
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 text-xs block">Tổng giá vốn (COGS)</span>
                    <span className="font-semibold text-slate-700 text-base block tabular-nums">
                      {formatCurrency(selectedRowDetail.cogs || 0)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRowDetail(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
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
