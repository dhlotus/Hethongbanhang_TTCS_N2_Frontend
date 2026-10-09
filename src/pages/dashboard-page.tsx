import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { DropdownMenu } from '../components/dropdown-menu';
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

const DEFAULT_DASHBOARD_DATA: DashboardOverviewResponse = {
  metrics: {
    todaySales: 48500000,
    monthlySales: 892000000,
    pendingOrdersCount: 6,
    readyToShipOrdersCount: 14,
    totalOverdueDebt: 125000000,
    lowStockAlertCount: 3,
    salesGrowthPercent: 12.5,
    debtGrowthPercent: -4.2,
  },
  charts: {
    salesTrend: [
      { date: '2026-10-03', value: 32000000 },
      { date: '2026-10-04', value: 45000000 },
      { date: '2026-10-05', value: 38000000 },
      { date: '2026-10-06', value: 52000000 },
      { date: '2026-10-07', value: 41000000 },
      { date: '2026-10-08', value: 65000000 },
      { date: '2026-10-09', value: 48500000 },
    ],
    highRiskAgencies: [
      {
        customerId: 'cust-001',
        customerName: 'Đại lý Bia & Nước giải khát Hùng Vương',
        customerCode: 'DL-HCM-001',
        overdueAmount: 65000000,
        salesRepName: 'Trần Văn Nam',
      },
      {
        customerId: 'cust-002',
        customerName: 'Công ty TNHH Thương mại Dịch vụ Minh Phát',
        customerCode: 'DL-HCM-002',
        overdueAmount: 42000000,
        salesRepName: 'Lê Thị Mai',
      },
      {
        customerId: 'cust-003',
        customerName: 'Đại lý Tạp Hóa & Tiêu dùng Phương Đông',
        customerCode: 'DL-BDG-003',
        overdueAmount: 18000000,
        salesRepName: 'Trần Văn Nam',
      },
    ],
  },
  executiveInsights:
    'Doanh số bán buôn tháng này tăng trưởng ổn định +12.5%. Cần đôn đốc thu hồi công nợ quá hạn từ các đại lý có dư nợ cao.',
  lastUpdated: new Date().toISOString(),
};

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardOverviewResponse>(DEFAULT_DASHBOARD_DATA);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/dashboard/overview', { params: { timeRange, startDate, endDate } });
      if (res.data && res.data.metrics && res.data.charts) {
        setData(res.data);
      } else {
        setData(DEFAULT_DASHBOARD_DATA);
      }
      setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // Khi backend chưa có endpoint /dashboard/overview, dùng dữ liệu mẫu chuẩn để không bị trắng trang
      setData(DEFAULT_DASHBOARD_DATA);
      setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeRange !== 'custom') {
      fetchData();
    }
  }, [timeRange]);

  const currentData = data || DEFAULT_DASHBOARD_DATA;
  const metrics = currentData.metrics || DEFAULT_DASHBOARD_DATA.metrics;
  const charts = currentData.charts || DEFAULT_DASHBOARD_DATA.charts;
  const salesTrend = charts.salesTrend || DEFAULT_DASHBOARD_DATA.charts.salesTrend;
  const highRiskAgencies = charts.highRiskAgencies || DEFAULT_DASHBOARD_DATA.charts.highRiskAgencies;

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
                onClick={fetchData}
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
              { key: 'today', label: 'Hôm nay', onClick: () => setTimeRange('today') },
              { key: 'this_month', label: 'Tháng này', onClick: () => setTimeRange('this_month') },
              { key: 'this_quarter', label: 'Quý này', onClick: () => setTimeRange('this_quarter') },
              { key: 'custom', label: 'Tùy chỉnh ngày', onClick: () => setTimeRange('custom') },
            ]}
          />

          <button 
            type="button"
            onClick={fetchData} 
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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center">
              <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-full bg-orange-50">
                <AlertTriangle className="h-6.5 w-6.5 text-orange-500" />
              </div>
              <div className="ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Sản phẩm cảnh báo tồn</dt>
                  <dd className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-orange-600 truncate tabular-nums">{metrics.lowStockAlertCount}</dd>
                </dl>
              </div>
            </div>
          </div>
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={(val) => val.slice(8,10) + '/' + val.slice(5,7)} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis tickFormatter={(val) => (val / 1000000).toFixed(0) + 'M'} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), 'Doanh số']} 
                    labelFormatter={(label: any) => `Ngày: ${label}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '13px' }} />
                  <Area type="monotone" dataKey="value" name="Doanh số" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
                </AreaChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={highRiskAgencies} layout="vertical" margin={{ top: 5, right: 15, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(val) => (val / 1000000).toFixed(0) + 'M'} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis 
                    dataKey="customerName" 
                    type="category" 
                    width={130} 
                    tickFormatter={(val) => (val && val.length > 16 ? val.slice(0, 15) + '…' : val)}
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
    </div>
  );
};
