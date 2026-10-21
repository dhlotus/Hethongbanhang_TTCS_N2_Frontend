import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  Users,
  DollarSign,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Zap,
  Check,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { showToast } from '../components/toast';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { dashboardService } from '../services/dashboard.service';
import type {
  DashboardOverviewResponse,
  DashboardMetrics,
} from '../services/dashboard.service';

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

const formatShortDate = (isoStr: string): string => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return isoStr;
};

const formatIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const REGION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const EMPTY_METRICS: DashboardMetrics = {
  todaySales: 0,
  monthlySales: 0,
  pendingOrdersCount: 0,
  readyToShipOrdersCount: 0,
  totalOverdueDebt: 0,
  lowStockAlertCount: 0,
};

export const DashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const paramRange = searchParams.get('range') || 'this_month';
  const [timeRange, setTimeRange] = useState<string>(paramRange);
  const [startDate, setStartDate] = useState<string>(searchParams.get('start') || '');
  const [endDate, setEndDate] = useState<string>(searchParams.get('end') || '');

  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadDurationMs, setLoadDurationMs] = useState<number | null>(null);

  // Popover bộ lọc thời gian
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [tempStart, setTempStart] = useState<string>(startDate || formatIsoDate(new Date()));
  const [tempEnd, setTempEnd] = useState<string>(endDate || formatIsoDate(new Date()));
  const timeMenuRef = useRef<HTMLDivElement>(null);

  const fetchData = async (overrideRange?: string, overrideStart?: string, overrideEnd?: string) => {
    const t0 = performance.now();
    try {
      setLoading(true);
      setLoadError(null);

      const activeRange = overrideRange ?? timeRange;
      const activeStart = overrideStart ?? startDate;
      const activeEnd = overrideEnd ?? endDate;

      const params: { timeRange?: string; startDate?: string; endDate?: string } = {
        timeRange: activeRange,
      };
      if (activeRange === 'custom' && activeStart && activeEnd) {
        params.startDate = activeStart;
        params.endDate = activeEnd;
      }

      const res = await dashboardService.getOverview(params);
      setData(res);

      const t1 = performance.now();
      setLoadDurationMs(Math.round(t1 - t0));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu dashboard';
      setLoadError(msg);
      setData(null);
      const t1 = performance.now();
      setLoadDurationMs(Math.round(t1 - t0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(timeRange, startDate, endDate);
  }, [timeRange, startDate, endDate]);

  // Đồng bộ thời gian thực đa phiên (Multi-tab realtime sync & Polling)
  useEffect(() => {
    // 1. Polling dự phòng 15 giây
    const interval = setInterval(() => {
      fetchData(timeRange, startDate, endDate);
    }, 15000);

    // 2. Quay lại tab tự động cập nhật
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchData(timeRange, startDate, endDate);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    // 3. Sự kiện cập nhật đơn hàng hoặc chỉ tiêu trong cùng tab
    const onSync = () => {
      fetchData(timeRange, startDate, endDate);
    };
    window.addEventListener('loha_orders_updated', onSync);
    window.addEventListener('loha_sales_target_sync', onSync);

    // 4. Storage event giữa các phiên khác nhau
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'loha_orders_updated_sync' || e.key === 'loha_sales_target_sync') {
        fetchData(timeRange, startDate, endDate);
      }
    };
    window.addEventListener('storage', onStorage);

    // 5. BroadcastChannel giữa các tab
    let broadcast: BroadcastChannel | null = null;
    try {
      broadcast = new BroadcastChannel('loha_sales_sync');
      broadcast.onmessage = () => {
        fetchData(timeRange, startDate, endDate);
      };
    } catch {}

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('loha_orders_updated', onSync);
      window.removeEventListener('loha_sales_target_sync', onSync);
      window.removeEventListener('storage', onStorage);
      if (broadcast) {
        broadcast.close();
      }
    };
  }, [timeRange, startDate, endDate]);

  // Click outside cho popover
  useEffect(() => {
    if (!isTimeMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (timeMenuRef.current && !timeMenuRef.current.contains(e.target as Node)) {
        setIsTimeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTimeMenuOpen]);

  const handleApplyCustomRange = () => {
    if (!tempStart || !tempEnd) {
      showToast('error', 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc');
      return;
    }
    if (tempStart > tempEnd) {
      showToast('error', 'Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }
    setStartDate(tempStart);
    setEndDate(tempEnd);
    setTimeRange('custom');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('range', 'custom');
      next.set('start', tempStart);
      next.set('end', tempEnd);
      return next;
    }, { replace: true });
    setIsTimeMenuOpen(false);
  };

  const handleTimeRangeSelect = (r: string) => {
    setTimeRange(r);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('range', r);
      if (r !== 'custom') {
        next.delete('start');
        next.delete('end');
      }
      return next;
    }, { replace: true });
    setIsTimeMenuOpen(false);
  };

  const metrics = data?.metrics || EMPTY_METRICS;
  const charts = data?.charts || { salesTrend: [], salesByRegion: [], highRiskAgencies: [] };
  const salesTrend = charts.salesTrend || [];
  const salesByRegion = charts.salesByRegion || [];
  const highRiskAgencies = charts.highRiskAgencies || [];
  const maxOverdueDebt =
    highRiskAgencies.length > 0
      ? Math.max(...highRiskAgencies.map((a) => a.overdueAmount || 0), 1)
      : 1;

  const hasSalesData = salesTrend.length > 0 && salesTrend.some((s) => s.value > 0);
  const hasRegionData = salesByRegion.length > 0 && salesByRegion.some((r) => r.value > 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── TOOLBAR & HEADER CHỈ SỐ ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-1">
        {/* Bên trái: Trạng thái thời gian thực & Kỳ dữ liệu */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-semibold border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Thời gian thực
          </div>

          {loadDurationMs !== null && (
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                loadDurationMs < 2000
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title="Thời gian từ lúc gọi API đến khi hiển thị dữ liệu xong"
            >
              <Zap className="h-3 w-3 shrink-0" />
              <span>{loadDurationMs}ms (Mục tiêu &lt;2s: {loadDurationMs < 2000 ? 'Đạt' : 'Chưa đạt'})</span>
            </div>
          )}

          <div className="flex items-center text-xs sm:text-sm text-slate-600 font-medium">
            <span className="text-slate-400 mr-1.5">Phạm vi:</span>
            <span className="text-slate-900 font-semibold truncate max-w-[240px] sm:max-w-none">
              {data?.scopeInfo?.scopeLabel || 'Toàn hệ thống'}
            </span>
          </div>
        </div>

        {/* Bên phải: Cụm bộ lọc thời gian & Nút làm mới */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-start sm:justify-end flex-wrap">
          <div ref={timeMenuRef} className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => setIsTimeMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 bg-white rounded-lg border border-slate-200/90 shadow-2xs px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Calendar className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                {timeRange === 'today'
                  ? 'Hôm nay'
                  : timeRange === 'this_month'
                  ? 'Tháng này'
                  : timeRange === 'last_month'
                  ? 'Tháng trước'
                  : timeRange === 'this_quarter'
                  ? 'Quý này'
                  : startDate && endDate
                  ? `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`
                  : 'Tùy chọn'}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isTimeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTimeMenuOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="space-y-1 mb-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">Kỳ nhanh</div>
                  {[
                    { key: 'today', label: 'Hôm nay' },
                    { key: 'this_month', label: 'Tháng này' },
                    { key: 'last_month', label: 'Tháng trước' },
                    { key: 'this_quarter', label: 'Quý này' },
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleTimeRangeSelect(preset.key)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        timeRange === preset.key
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{preset.label}</span>
                      {timeRange === preset.key && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">Khoảng ngày</div>
                  <div className="space-y-2 mt-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Từ ngày</label>
                      <input
                        type="date"
                        value={tempStart}
                        onChange={(e) => setTempStart(e.target.value)}
                        className="w-full text-xs rounded-md border border-slate-200 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Đến ngày</label>
                      <input
                        type="date"
                        value={tempEnd}
                        onChange={(e) => setTempEnd(e.target.value)}
                        className="w-full text-xs rounded-md border border-slate-200 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCustomRange}
                      className="w-full mt-2 py-1.5 px-3 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            title="Tải lại dữ liệu thật"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchData()}
            className="text-xs font-bold underline hover:text-rose-900"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── 6 THẺ CHỈ SỐ ĐIỀU HÀNH BÁN HÀNG VÀ KHO (SN-217) ── */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-slate-100">
          {/* THẺ 1: Doanh số hôm nay */}
          <Link
            to="/sales/orders"
            className="p-5 sm:p-6 sm:border-r border-slate-100 hover:bg-indigo-50/20 transition-all group block"
            title="Bấm để xem danh sách đơn hàng"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="ml-3.5 min-w-0 flex-1">
                  <dt className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                    <span>Doanh số hôm nay</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </dt>
                  <dd className="mt-1">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {formatCurrency(metrics.todaySales)}
                    </span>
                  </dd>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">Ghi nhận từ các đơn hợp lệ trong ngày</div>
          </Link>

          {/* THẺ 2: Doanh số tháng này */}
          <Link
            to="/reports/sales"
            className="p-5 sm:p-6 lg:border-r border-slate-100 hover:bg-indigo-50/20 transition-all group block"
            title="Bấm để mở Báo cáo Doanh số chi tiết"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="ml-3.5 min-w-0 flex-1">
                  <dt className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                    <span>Doanh số tháng này</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </dt>
                  <dd className="mt-1 flex items-baseline flex-wrap gap-2">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {formatCurrency(metrics.monthlySales)}
                    </span>
                    {metrics.salesGrowthPercent !== undefined && metrics.monthlySales > 0 && (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums ${
                          metrics.salesGrowthPercent >= 0
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : 'text-rose-700 bg-rose-50 border border-rose-200'
                        }`}
                      >
                        {metrics.salesGrowthPercent >= 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
                        )}
                        {Math.abs(metrics.salesGrowthPercent)}%
                      </span>
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {metrics.prevMonthSamePeriodSales !== undefined && metrics.prevMonthSamePeriodSales > 0
                ? `So với cùng kỳ tháng trước: ${formatCurrency(metrics.prevMonthSamePeriodSales)}`
                : 'Cùng kỳ tháng trước chưa phát sinh số'}
            </div>
          </Link>

          {/* THẺ 3: Số đơn chờ duyệt */}
          <Link
            to="/sales/approvals?tab=PENDING"
            className="p-5 sm:p-6 sm:border-r lg:border-r-0 border-slate-100 hover:bg-amber-50/20 transition-all group block"
            title="Bấm để mở màn hình Phê duyệt đơn hàng"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div className="ml-3.5 min-w-0 flex-1">
                  <dt className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1 group-hover:text-amber-600 transition-colors">
                    <span>Số đơn chờ duyệt</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </dt>
                  <dd className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {metrics.pendingOrdersCount}
                    </span>
                    {metrics.pendingOrdersCount > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                        Cần xử lý
                      </span>
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">Đơn chờ duyệt công nợ và duyệt tồn kho</div>
          </Link>

          {/* THẺ 4: Số đơn chờ xuất kho */}
          <Link
            to="/inventory/issues"
            className="p-5 sm:p-6 border-t border-slate-100 sm:border-r border-slate-100 hover:bg-blue-50/20 transition-all group block"
            title="Bấm để mở danh sách Xuất kho & Giao vận"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Package className="h-6 w-6" />
                </div>
                <div className="ml-3.5 min-w-0 flex-1">
                  <dt className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                    <span>Số đơn chờ xuất</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </dt>
                  <dd className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {metrics.readyToShipOrdersCount}
                    </span>
                    {metrics.readyToShipOrdersCount > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                        Đã duyệt / Soạn hàng
                      </span>
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">Đơn hàng sẵn sàng để xuất kho giao đại lý</div>
          </Link>

          {/* THẺ 5: Tổng công nợ quá hạn */}
          <Link
            to="/accounting/debt"
            className="p-5 sm:p-6 border-t border-slate-100 lg:border-r border-slate-100 hover:bg-rose-50/20 transition-all group block"
            title="Bấm để mở Sổ theo dõi Công nợ đại lý"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-3.5 min-w-0 flex-1">
                  <dt className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1 group-hover:text-rose-600 transition-colors">
                    <span>Tổng công nợ quá hạn</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </dt>
                  <dd className="mt-1">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-rose-700 tabular-nums">
                      {formatCurrency(metrics.totalOverdueDebt)}
                    </span>
                  </dd>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">Tính từ khoản còn phải thu sau hạn thanh toán</div>
          </Link>

          {/* THẺ 6: Số SKU dưới tồn tối thiểu */}
          <Link
            to="/inventory/stock"
            className="p-5 sm:p-6 border-t border-slate-100 hover:bg-rose-50/20 transition-all group block"
            title="Bấm để mở danh sách Tra cứu Tồn kho"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="ml-3.5 min-w-0 flex-1">
                  <dt className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1 group-hover:text-purple-600 transition-colors">
                    <span>Số SKU dưới tồn tối thiểu</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </dt>
                  <dd className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {metrics.lowStockAlertCount}
                    </span>
                    {metrics.lowStockAlertCount > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                        Cần nhập kho
                      </span>
                    )}
                  </dd>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">SKU duy nhất chạm ngưỡng an toàn kho</div>
          </Link>
        </div>
      </div>

      {/* ── 2 BIỂU ĐỒ DOANH SỐ: THEO NGÀY VÀ THEO KHU VỰC (SN-217) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Biểu đồ 1: Doanh số theo ngày trong tháng */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Biểu đồ doanh số theo ngày</span>
                <span className="text-xs font-normal text-slate-400">
                  ({salesTrend.length} mốc phát sinh)
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Dữ liệu thực tế từ các đơn hàng hợp lệ</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {hasSalesData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val: string) => formatShortDate(val)}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tickFormatter={(val: number) => `${(val / 1000000).toFixed(0)}M`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => [
                      `${formatCurrency(Number(value))} (${item.payload.ordersCount} đơn)`,
                      'Doanh số',
                    ]}
                    labelFormatter={(label: any) => `Ngày: ${label}`}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Doanh thu thuần (VNĐ)"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    activeDot={{ r: 5, fill: '#4f46e5' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">Chưa có giao dịch phát sinh trong kỳ này</p>
              </div>
            )}
          </div>
        </div>

        {/* Biểu đồ 2: Doanh số theo khu vực */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Doanh số theo khu vực</span>
                <span className="text-xs font-normal text-slate-400">
                  ({salesByRegion.length} vùng địa bàn)
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Phân bổ doanh số và tỷ trọng theo vùng</p>
            </div>
            <Link
              to="/reports/sales"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Xem chi tiết</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="h-72 w-full">
            {hasRegionData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByRegion} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="region"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tickFormatter={(val: number) => `${(val / 1000000).toFixed(0)}M`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => [
                      `${formatCurrency(Number(value))} (${item.payload.percentage}% - ${item.payload.ordersCount} đơn)`,
                      'Doanh số',
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Bar dataKey="value" name="Doanh số khu vực (VNĐ)" radius={[4, 4, 0, 0]}>
                    {salesByRegion.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <MapPin className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">Chưa có số liệu phân bổ khu vực</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TOP ĐẠI LÝ QUÁ HẠN CÔNG NỢ (SN-217) ── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Danh sách đại lý quá hạn công nợ (Xếp theo số tiền)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tính từ khoản còn phải thu sau thanh toán và ngày đến hạn theo FIFO
              </p>
            </div>
          </div>
          <Link
            to="/accounting/debt"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Mở sổ công nợ</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {highRiskAgencies.length > 0 ? (
          <div className="space-y-3">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3 w-12 text-center">Thứ tự</th>
                    <th className="py-2.5 px-3">Mã đại lý</th>
                    <th className="py-2.5 px-3">Tên đại lý</th>
                    <th className="py-2.5 px-3">Số ngày quá hạn</th>
                    <th className="py-2.5 px-3 text-right">Số tiền còn quá hạn</th>
                    <th className="py-2.5 px-3">Nhân viên phụ trách</th>
                    <th className="py-2.5 px-3 text-center">Mức độ ưu tiên</th>
                    <th className="py-2.5 px-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {highRiskAgencies.map((agency, index) => {
                    const isTop1 = index === 0;
                    return (
                      <tr key={agency.customerId || index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] ${
                              isTop1 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            #{index + 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{agency.customerCode}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[220px] truncate">
                          {agency.customerName}
                        </td>
                        <td className="py-2.5 px-3 text-rose-600 font-semibold">
                          Quá hạn {agency.oldestOverdueDays} ngày
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                          {formatCurrency(agency.overdueAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{agency.salesRepName || '—'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                              agency.priorityLabel === 'Khẩn cấp'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {agency.priorityLabel || 'Cần thu hồi'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Link
                            to={`/accounting/debt?search=${encodeURIComponent(agency.customerCode)}`}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold underline"
                          >
                            Chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Không cuộn ngang) */}
            <div className="md:hidden space-y-2.5">
              {highRiskAgencies.map((agency, index) => {
                const percent = Math.min(
                  Math.max(Math.round(((agency.overdueAmount || 0) / maxOverdueDebt) * 100), 5),
                  100,
                );
                return (
                  <div
                    key={agency.customerId || index}
                    className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-sm text-slate-900 line-clamp-1">
                            {agency.customerName}
                          </div>
                          <div className="text-xs text-slate-500">Mã: {agency.customerCode}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-slate-900 tabular-nums">
                          {formatCurrency(agency.overdueAmount)}
                        </div>
                        <div className="text-[11px] text-rose-600 font-medium">
                          Quá hạn {agency.oldestOverdueDays} ngày
                        </div>
                      </div>
                    </div>

                    {agency.salesRepName && (
                      <div className="text-xs text-slate-500">
                        Phụ trách: <span className="font-medium text-slate-700">{agency.salesRepName}</span>
                      </div>
                    )}

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Mức độ: {agency.priorityLabel || 'Cần thu hồi'}</span>
                      <Link
                        to={`/accounting/debt?search=${encodeURIComponent(agency.customerCode)}`}
                        className="text-indigo-600 font-semibold underline"
                      >
                        Mở sổ nợ →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            Không có đại lý nào bị quá hạn thanh toán trong kỳ báo cáo.
          </div>
        )}
      </div>

      {/* Thông tin cập nhật chân trang */}
      <div className="text-xs text-slate-400 text-right">
        Cập nhật lúc: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString('vi-VN') : '—'}
      </div>
    </div>
  );
};
