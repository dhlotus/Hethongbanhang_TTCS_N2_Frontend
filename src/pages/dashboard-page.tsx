import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { DropdownMenu } from '../components/dropdown-menu';
import { LowStockAlertsWidget } from '../components/inventory/low-stock-alerts-widget';
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

import { getStoredUser } from '../utils/navigation';

const VALID_RANGES = ['today', 'this_month', 'this_quarter', 'custom'] as const;
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

  // Đồng bộ hóa khi người dùng bấm nút Lọc ngày tùy chọn
  const handleCustomFilterSubmit = () => {
    if (startDate && endDate) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('range', 'custom');
        next.set('start', startDate);
        next.set('end', endDate);
        return next;
      }, { replace: true });
      fetchData('custom', startDate, endDate);
    }
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
                : timeRange === 'this_quarter'
                ? `Quý ${Math.floor(new Date().getMonth() / 3) + 1}/${new Date().getFullYear()}`
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

        {/* Bên phải: Cụm bộ lọc thời gian & Tải lại dữ liệu */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-start sm:justify-end">
          {timeRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto bg-slate-50/90 p-1.5 rounded-xl border border-slate-200/70">
              <input 
                type="date" 
                className="rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs sm:text-sm text-slate-700 shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none flex-1 sm:flex-initial"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-slate-400 text-xs">-</span>
              <input 
                type="date" 
                className="rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs sm:text-sm text-slate-700 shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none flex-1 sm:flex-initial"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <button 
                onClick={handleCustomFilterSubmit}
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
              >
                Lọc
              </button>
            </div>
          )}

          <DropdownMenu
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer active:scale-95"
              >
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>
                  {timeRange === 'today' ? 'Hôm nay' : timeRange === 'this_month' ? 'Tháng này' : timeRange === 'this_quarter' ? 'Quý này' : 'Tùy chỉnh ngày'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
            }
            items={[
              { key: 'today', label: 'Hôm nay', onClick: () => handleTimeRangeChange('today') },
              { key: 'this_month', label: 'Tháng này', onClick: () => handleTimeRangeChange('this_month') },
              { key: 'this_quarter', label: 'Quý này', onClick: () => handleTimeRangeChange('this_quarter') },
              { key: 'custom', label: 'Tùy chỉnh ngày', onClick: () => handleTimeRangeChange('custom') },
            ]}
          />

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
            className="group block rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs hover:border-orange-300 hover:shadow-md transition-all cursor-pointer"
            title="Bấm để xem danh sách sản phẩm chạm/dưới mức tồn tối thiểu (SN-183)"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-full bg-orange-50 group-hover:bg-orange-100 transition-colors">
                  <AlertTriangle className="h-6.5 w-6.5 text-orange-500" />
                </div>
                <div className="ml-5 w-0 flex-1 min-w-0">
                  <dl>
                    <dt className="truncate text-xs sm:text-sm font-medium text-slate-500 group-hover:text-orange-700 transition-colors">
                      Sản phẩm cảnh báo tồn
                    </dt>
                    <dd className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-orange-600 truncate tabular-nums">
                      {metrics.lowStockAlertCount}
                    </dd>
                  </dl>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
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
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Cảnh báo đứt hàng & Tồn kho tối thiểu</span>
                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                  SN-183
                </span>
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
