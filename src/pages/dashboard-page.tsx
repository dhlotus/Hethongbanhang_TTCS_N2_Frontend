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
  CheckCircle2,
  Clock,
  CalendarDays,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { LowStockAlertsWidget } from '../components/inventory/low-stock-alerts-widget';
import { inventoryService } from '../services/inventory.service';
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
} from 'recharts';
import { apiClient } from '../services/api';

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val);
};

const formatIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatShortDate = (isoStr: string): string => {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return isoStr;
};

import { getStoredUser } from '../utils/navigation';

const VALID_RANGES = ['today', 'this_month', 'custom'] as const;
type TimeRangeType = (typeof VALID_RANGES)[number];

interface DashboardMetrics {
  todaySales: number;
  monthlySales: number;
  pendingOrdersCount: number;
  readyToShipOrdersCount: number;
  totalOverdueDebt: number;
  lowStockAlertCount: number;
  salesGrowthPercent?: number;
  debtGrowthPercent?: number;
}

interface HighRiskAgency {
  customerId: string;
  customerName: string;
  customerCode: string;
  overdueAmount: number;
  salesRepName?: string;
}

interface DashboardOverviewResponse {
  metrics: DashboardMetrics;
  charts: {
    salesTrend: { date: string; value: number }[];
    highRiskAgencies: HighRiskAgency[];
  };
  executiveInsights: string;
  lastUpdated: string;
}

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

  // Khởi tạo state từ URL search params
  const paramRange = searchParams.get('range');
  const initialRange: TimeRangeType = (paramRange && VALID_RANGES.includes(paramRange as TimeRangeType))
    ? (paramRange as TimeRangeType)
    : 'today';

  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<string>(initialRange);
  const [startDate, setStartDate] = useState<string>(searchParams.get('start') || '');
  const [endDate, setEndDate] = useState<string>(searchParams.get('end') || '');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(
    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  );
  const user = getStoredUser();

  const roles = user?.roles || [];
  const isManager = roles.some((r: string) => 
    r === 'ADMIN' || r === 'SALES_MANAGER' || r === 'BUSINESS_MANAGER'
  );
  const isAccountant = roles.some((r: string) => 
    r === 'ACCOUNTANT' || r === 'ACCOUNTANT_DEBT'
  );
  const isWarehouse = roles.some((r: string) => 
    r === 'WAREHOUSE' || r === 'WAREHOUSE_KEEPER' || r === 'WAREHOUSE_MANAGER' || r === 'WH_MANAGER'
  );
  const isSalesRep = roles.includes('SALES_REP');

  const [lowStockCount, setLowStockCount] = useState<number>(0);

  const fetchData = async (overrideRange?: string, overrideStart?: string, overrideEnd?: string) => {
    try {
      setLoading(true);
      const activeRange = overrideRange ?? timeRange;
      const activeStart = overrideStart ?? startDate;
      const activeEnd = overrideEnd ?? endDate;

      const params: Record<string, string> = { timeRange: activeRange };
      if (activeRange === 'custom') {
        if (activeStart) params.startDate = activeStart;
        if (activeEnd) params.endDate = activeEnd;
      }

      const res = await apiClient.get('/dashboard/overview', { params });
      if (res.data && res.data.metrics && res.data.charts) {
        setData(res.data);
      } else {
        setData(null);
      }

      inventoryService.getLowStockAlerts()
        .then((alerts) => setLowStockCount(alerts.length))
        .catch(() => {});

      setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // Khi gặp lỗi hoặc chưa có dữ liệu, trả về null để hiển thị Empty State chuẩn
      setData(null);
      setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setLoading(false);
    }
  };

  // Đồng bộ hóa khi thay đổi lựa chọn khoảng thời gian trên dropdown
  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('range', newRange);
      if (newRange !== 'custom') {
        next.delete('start');
        next.delete('end');
      }
      return next;
    }, { replace: true });
  };

  // Quản lý trạng thái mở/đóng Popover Bộ lọc Thời gian và Ngày tạm thời
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [tempStart, setTempStart] = useState<string>(startDate || formatIsoDate(new Date()));
  const [tempEnd, setTempEnd] = useState<string>(endDate || formatIsoDate(new Date()));
  const timeMenuRef = useRef<HTMLDivElement>(null);

  // Đồng bộ ngày tạm thời mỗi khi mở Popover
  useEffect(() => {
    if (isTimeMenuOpen) {
      setTempStart(startDate || formatIsoDate(new Date()));
      setTempEnd(endDate || formatIsoDate(new Date()));
    }
  }, [isTimeMenuOpen, startDate, endDate]);

  // Tự động đóng Popover khi click ra ngoài hoặc bấm phím Escape
  useEffect(() => {
    if (!isTimeMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (timeMenuRef.current && !timeMenuRef.current.contains(e.target as Node)) {
        setIsTimeMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTimeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTimeMenuOpen]);

  // Xác nhận áp dụng khoảng ngày tùy chọn
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
    fetchData('custom', tempStart, tempEnd);
    setIsTimeMenuOpen(false);
  };

  // Lắng nghe URL Search Params để khôi phục State khi F5, dán link hoặc thao tác Back/Forward của trình duyệt
  useEffect(() => {
    const currentRange = searchParams.get('range');
    const validRange: TimeRangeType = (currentRange && VALID_RANGES.includes(currentRange as TimeRangeType))
      ? (currentRange as TimeRangeType)
      : 'today';

    if (!currentRange) {
      // Nếu chưa có param trên URL, cập nhật URL thành ?range=today để đồng bộ và dễ share link
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('range', 'today');
        return next;
      }, { replace: true });
    }

    if (validRange !== timeRange) {
      setTimeRange(validRange);
    }

    const currentStart = searchParams.get('start') || '';
    const currentEnd = searchParams.get('end') || '';
    if (currentStart !== startDate) setStartDate(currentStart);
    if (currentEnd !== endDate) setEndDate(currentEnd);
  }, [searchParams]);

  // Tự động gọi API lấy dữ liệu khi timeRange thay đổi (với các preset không phải custom)
  useEffect(() => {
    if (timeRange !== 'custom') {
      fetchData(timeRange);
    }
  }, [timeRange]);

  // Bổ sung useEffect tự động reload dữ liệu ngay khi cả startDate và endDate đều có giá trị trong bộ lọc tùy chọn
  useEffect(() => {
    if (timeRange === 'custom' && startDate && endDate) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('range', 'custom');
        next.set('start', startDate);
        next.set('end', endDate);
        return next;
      }, { replace: true });
      fetchData('custom', startDate, endDate);
    }
  }, [timeRange, startDate, endDate]);

  const metrics = data?.metrics || EMPTY_METRICS;
  const charts = data?.charts || { salesTrend: [], highRiskAgencies: [] };
  const salesTrend = charts.salesTrend || [];
  const highRiskAgencies = charts.highRiskAgencies || [];
  const hasSalesData = salesTrend.length > 0 && salesTrend.some((s) => s.value > 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── DASHBOARD ACTION & FILTER TOOLBAR ── */}
      <div className="bg-white p-4 sm:px-6 sm:py-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Bên trái: Trạng thái thời gian thực & Kỳ báo cáo hiện tại */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-semibold border border-emerald-200/70 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Thời gian thực
          </div>
          <div className="flex items-center text-sm text-slate-600 font-medium">
            <span className="text-slate-400 mr-2 hidden sm:inline">Kỳ báo cáo:</span>
            <span className="text-slate-900 font-semibold">
              {timeRange === 'today'
                ? `Hôm nay (${new Date().toLocaleDateString('vi-VN')})`
                : timeRange === 'this_month'
                ? `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`
                : startDate && endDate 
                ? `${startDate} → ${endDate}`
                : 'Tùy chỉnh khoảng ngày'}
            </span>
          </div>
          {lastUpdatedTime && (
            <span className="hidden lg:inline text-xs sm:text-sm text-slate-400 pl-4 border-l border-slate-200 tabular-nums">
              Đồng bộ lúc: {lastUpdatedTime}
            </span>
          )}
        </div>

        {/* Bên phải: Cụm bộ lọc thời gian & Tải lại dữ liệu (Luôn ổn định 1 hàng duy nhất) */}
        <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-start sm:justify-end">
          <div ref={timeMenuRef} className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => setIsTimeMenuOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2.5 bg-white rounded-xl border shadow-2xs px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95 ${
                isTimeMenuOpen
                  ? 'border-indigo-400 ring-2 ring-indigo-500/10 text-indigo-700'
                  : 'border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
              title="Chọn khoảng thời gian báo cáo"
            >
              <Calendar className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="whitespace-nowrap">
                {timeRange === 'today'
                  ? 'Hôm nay'
                  : timeRange === 'this_month'
                  ? 'Tháng này'
                  : startDate && endDate
                  ? `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`
                  : 'Tùy chỉnh ngày'}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  isTimeMenuOpen ? 'rotate-180 text-indigo-600' : ''
                }`}
              />
            </button>

            {isTimeMenuOpen && (
              <div
                role="dialog"
                aria-label="Khoảng thời gian báo cáo"
                className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-2xl animate-in fade-in zoom-in-95 select-none"
              >
                {/* 2 lựa chọn nhanh: Hôm nay / Tháng này (Hiển thị gọn gàng 1 dòng) */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleTimeRangeChange('today');
                      setIsTimeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left cursor-pointer ${
                      timeRange === 'today'
                        ? 'bg-indigo-50/80 text-indigo-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          timeRange === 'today'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs sm:text-sm ${timeRange === 'today' ? 'text-indigo-950 font-bold' : 'text-slate-800 font-semibold'}`}>
                        Hôm nay
                      </span>
                    </div>
                    {timeRange === 'today' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleTimeRangeChange('this_month');
                      setIsTimeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left cursor-pointer ${
                      timeRange === 'this_month'
                        ? 'bg-indigo-50/80 text-indigo-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          timeRange === 'this_month'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs sm:text-sm ${timeRange === 'this_month' ? 'text-indigo-950 font-bold' : 'text-slate-800 font-semibold'}`}>
                        Tháng này
                      </span>
                    </div>
                    {timeRange === 'this_month' && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                </div>

                {/* Phân cách */}
                <div className="my-2 border-t border-slate-100" />

                {/* Khối Tùy chỉnh ngày */}
                <div className="p-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Khoảng ngày tùy chọn</span>
                    </div>
                    {timeRange === 'custom' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                        Đang áp dụng
                      </span>
                    )}
                  </div>

                  {/* Form nhập Từ ngày - Đến ngày */}
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Từ ngày</label>
                      <input
                        type="date"
                        value={tempStart}
                        onChange={(e) => setTempStart(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-xs text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Đến ngày</label>
                      <input
                        type="date"
                        value={tempEnd}
                        min={tempStart}
                        onChange={(e) => setTempEnd(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-xs text-slate-700 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Nút hành động áp dụng duy nhất */}
                  <button
                    type="button"
                    onClick={handleApplyCustomRange}
                    className="w-full py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Áp dụng khoảng ngày
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={() => fetchData()} 
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Tải lại dữ liệu tức thì"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Tải lại</span>
          </button>
        </div>
      </div>

      {/* ── METRICS CARDS (Tối đa hóa khoảng trắng & Cỡ chữ số lớn) ── */}
      <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-50 pointer-events-none' : 'transition-opacity duration-300'}`}>
        {(isManager || isSalesRep) && (
          <>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center">
                <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50">
                  <TrendingUp className="h-6.5 w-6.5 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1 min-w-0">
                  <dl>
                    <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Doanh số hôm nay</dt>
                    <dd className="mt-1.5 flex items-baseline">
                      <span className="truncate text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{formatCurrency(metrics.todaySales)}</span>
                      {metrics.salesGrowthPercent !== undefined && (
                        <span className={`ml-2.5 flex items-baseline text-xs sm:text-sm font-semibold tabular-nums ${metrics.salesGrowthPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {metrics.salesGrowthPercent > 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                          {Math.abs(metrics.salesGrowthPercent)}%
                        </span>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center">
                <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-full bg-green-50">
                  <DollarSign className="h-6.5 w-6.5 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1 min-w-0">
                  <dl>
                    <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Doanh số tháng này</dt>
                    <dd className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate tabular-nums">{formatCurrency(metrics.monthlySales)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </>
        )}

        {(isManager || isAccountant || isSalesRep) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center">
              <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-full bg-yellow-50">
                <ShoppingCart className="h-6.5 w-6.5 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Đơn hàng chờ duyệt</dt>
                  <dd className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate tabular-nums">{metrics.pendingOrdersCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        )}

        {(isManager || isWarehouse) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center">
              <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                <Package className="h-6.5 w-6.5 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Đơn chờ xuất kho</dt>
                  <dd className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate tabular-nums">{metrics.readyToShipOrdersCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        )}

        {(isManager || isAccountant) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center">
              <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
                <Users className="h-6.5 w-6.5 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Tổng công nợ quá hạn</dt>
                  <dd className="mt-1.5 flex items-baseline">
                    <span className="truncate text-2xl sm:text-3xl font-bold tracking-tight text-red-600 tabular-nums">{formatCurrency(metrics.totalOverdueDebt)}</span>
                    {metrics.debtGrowthPercent !== undefined && (
                      <span className={`ml-2.5 flex items-baseline text-xs sm:text-sm font-semibold tabular-nums ${metrics.debtGrowthPercent < 0 ? 'text-green-600' : 'text-red-600'}`} title="So với kỳ trước">
                        {metrics.debtGrowthPercent < 0 ? <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />}
                        {Math.abs(metrics.debtGrowthPercent)}%
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        )}

        {(isManager || isWarehouse) && (
          <Link
            to="/inventory/stock?filter=BELOW_MIN_STOCK"
            className="group block rounded-2xl border border-rose-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
            title="Bấm để xem danh sách sản phẩm chạm/dưới mức tồn tối thiểu"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-full bg-rose-50 group-hover:bg-rose-100 transition-colors">
                  <AlertTriangle className="h-6.5 w-6.5 text-rose-600" />
                </div>
                <div className="ml-5 flex-1 min-w-0">
                  <dl>
                    <dt className="truncate text-xs sm:text-sm font-semibold text-rose-700 group-hover:text-rose-800 transition-colors">
                      Cảnh báo tồn tối thiểu
                    </dt>
                    <dd className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 truncate tabular-nums">
                      {lowStockCount > 0 ? lowStockCount : metrics.lowStockAlertCount}
                    </dd>
                  </dl>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </Link>
        )}
      </div>

      {/* ── CHARTS SECTION (Khoảng cách & Bố cục thoáng mắt) ── */}
      <div className={`grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 ${loading ? 'opacity-50 pointer-events-none' : 'transition-opacity duration-300'}`}>
        {/* Sales Trend Chart */}
        {(isManager || isSalesRep) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs hover:shadow-md transition-all">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Biểu đồ doanh số</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-normal">Biến động doanh thu theo chu kỳ thời gian</p>
              </div>
            </div>
            <div className="h-72 sm:h-80 w-full">
              {hasSalesData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickFormatter={(val: string) => val.slice(8,10) + '/' + val.slice(5,7)} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tickFormatter={(val: number) => (val / 1000000).toFixed(0) + 'M'} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Doanh số']} 
                      labelFormatter={(label: any) => `Ngày: ${label}`}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '13px' }} />
                    <Area type="monotone" dataKey="value" name="Doanh số" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <TrendingUp className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Chưa có dữ liệu kinh doanh trong khoảng thời gian này</p>
                  <p className="text-xs text-slate-400 mt-1">Khi phát sinh đơn hàng, biểu đồ doanh số sẽ hiển thị tại đây</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* High Risk Agencies Chart */}
        {(isManager || isAccountant) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs hover:shadow-md transition-all" id="high-risk">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Top Đại lý rủi ro công nợ cao</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-normal">Xếp hạng các đại lý có số dư nợ quá hạn lớn nhất</p>
              </div>
            </div>
            <div className="h-72 sm:h-80 w-full">
              {highRiskAgencies.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={highRiskAgencies} layout="vertical" margin={{ top: 5, right: 15, left: -5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tickFormatter={(val: number) => (val / 1000000).toFixed(0) + 'M'} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis 
                      dataKey="customerName" 
                      type="category" 
                      width={130} 
                      tickFormatter={(val: string) => (val && val.length > 16 ? val.slice(0, 15) + '…' : val)}
                      tick={{ fill: '#475569', fontSize: 11 }} 
                      tickLine={false} 
                      axisLine={{ stroke: '#e2e8f0' }} 
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Công nợ quá hạn']} 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '13px' }} />
                    <Bar 
                      dataKey="overdueAmount" 
                      name="Công nợ quá hạn" 
                      fill="#fb7185" 
                      radius={[0, 4, 4, 0]} 
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Không có đại lý nợ quá hạn</p>
                  <p className="text-xs text-slate-400 mt-1">Tất cả đại lý đều thanh toán đúng hạn hoặc chưa có dư nợ quá hạn</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── ADDITIONAL DETAILS TABLE FOR HIGH RISK (Khoảng trắng & Dòng thoáng) ── */}
      {(isManager || isAccountant) && highRiskAgencies.length > 0 && (
        <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden ${loading ? 'opacity-50 pointer-events-none' : 'transition-opacity duration-300'}`}>
          <div className="border-b border-slate-200 px-5 sm:px-7 py-4.5 sm:py-5 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Danh sách cần thu hồi công nợ gấp</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-normal">Danh sách các đại lý có số dư nợ quá thời hạn thanh toán quy định</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-red-50 border border-red-200/60 px-3 py-1 text-xs sm:text-sm font-semibold text-red-700 shadow-2xs tabular-nums">
              {highRiskAgencies.length} đại lý
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 sm:px-7 py-3.5 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mã ĐL</th>
                  <th className="px-5 sm:px-7 py-3.5 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tên Đại lý</th>
                  <th className="hidden sm:table-cell px-5 sm:px-7 py-3.5 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">NV Phụ trách</th>
                  <th className="px-5 sm:px-7 py-3.5 sm:py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Dư nợ quá hạn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {highRiskAgencies.map((agency) => (
                  <tr 
                    key={agency.customerId} 
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="whitespace-nowrap px-5 sm:px-7 py-4 sm:py-4.5 text-xs sm:text-sm font-semibold text-indigo-600">
                      {agency.customerCode}
                    </td>
                    <td className="whitespace-nowrap px-5 sm:px-7 py-4 sm:py-4.5 text-xs sm:text-sm font-medium text-slate-900 max-w-[160px] sm:max-w-none truncate">
                      {agency.customerName}
                    </td>
                    <td className="hidden sm:table-cell whitespace-nowrap px-5 sm:px-7 py-4 sm:py-4.5 text-xs sm:text-sm text-slate-500">
                      {agency.salesRepName || '-'}
                    </td>
                    <td className="whitespace-nowrap px-5 sm:px-7 py-4 sm:py-4.5 text-right text-sm sm:text-base font-bold text-red-600 tabular-nums">
                      {formatCurrency(agency.overdueAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── KHỐI CẢNH BÁO TỒN KHO DƯỚI MỨC TỐI THIỂU (SN-183) ── */}
      {(isManager || isWarehouse) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Cảnh báo đứt hàng & Tồn kho tối thiểu
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Các mặt hàng có tồn khả dụng chạm ngưỡng cần đặt hàng nhà cung cấp ngay
              </p>
            </div>
            <Link
              to="/inventory/stock?filter=BELOW_MIN_STOCK"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              <span>Xem toàn bộ sổ tồn</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <LowStockAlertsWidget />
        </div>
      )}
    </div>
  );
};
