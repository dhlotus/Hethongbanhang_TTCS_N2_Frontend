import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronRight,
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

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const navigate = useNavigate();
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
      setData(res.data);
      setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeRange !== 'custom') {
      fetchData();
    }
  }, [timeRange]);

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-white rounded-2xl border border-slate-200/80 shadow-xs"></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200/80 shadow-xs"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 bg-white rounded-2xl border border-slate-200/80 shadow-xs"></div>
          <div className="h-80 bg-white rounded-2xl border border-slate-200/80 shadow-xs"></div>
        </div>
      </div>
    );
  }

  const { metrics, charts } = data || {} as DashboardOverviewResponse;

  return (
    <div className="space-y-6 pb-6">
      {/* ── DASHBOARD ACTION & FILTER TOOLBAR ── */}
      <div className="bg-white p-3.5 sm:px-5 sm:py-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Bên trái: Trạng thái thời gian thực & Kỳ báo cáo hiện tại */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/70 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Thời gian thực
          </div>
          <div className="flex items-center text-xs sm:text-sm text-slate-600 font-medium">
            <span className="text-slate-400 mr-1.5 hidden sm:inline">Kỳ báo cáo:</span>
            <span className="text-slate-800 font-semibold">
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
            <span className="hidden lg:inline text-xs text-slate-400 pl-3 border-l border-slate-200">
              Đồng bộ lúc: {lastUpdatedTime}
            </span>
          )}
        </div>

        {/* Bên phải: Cụm bộ lọc thời gian & Tải lại dữ liệu */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-start sm:justify-end">
          {timeRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto bg-slate-50/90 p-1 rounded-xl border border-slate-200/70">
              <input 
                type="date" 
                className="rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs sm:text-sm text-slate-700 shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none flex-1 sm:flex-initial"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-slate-400 text-xs">-</span>
              <input 
                type="date" 
                className="rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs sm:text-sm text-slate-700 shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none flex-1 sm:flex-initial"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <button 
                onClick={fetchData}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
              >
                Lọc
              </button>
            </div>
          )}

          <DropdownMenu
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 bg-white rounded-xl border border-slate-200/90 shadow-2xs px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer active:scale-95"
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Tải lại dữ liệu tức thì"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Tải lại</span>
          </button>
        </div>
      </div>

      {/* ── METRICS CARDS ── */}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-50 pointer-events-none' : 'transition-opacity duration-300'}`}>
        {(isManager || isSalesRep) && (
          <>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4 w-0 flex-1 min-w-0">
                  <dl>
                    <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Doanh số hôm nay</dt>
                    <dd className="mt-1 flex items-baseline">
                      <span className="truncate text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(metrics.todaySales)}</span>
                      {metrics.salesGrowthPercent !== undefined && (
                        <span className={`ml-2 flex items-baseline text-xs font-semibold ${metrics.salesGrowthPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {metrics.salesGrowthPercent > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                          {Math.abs(metrics.salesGrowthPercent)}%
                        </span>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-50">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4 w-0 flex-1 min-w-0">
                  <dl>
                    <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Doanh số tháng này</dt>
                    <dd className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">{formatCurrency(metrics.monthlySales)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </>
        )}

        {(isManager || isAccountant || isSalesRep) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-50">
                <ShoppingCart className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-4 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Đơn hàng chờ duyệt</dt>
                  <dd className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">{metrics.pendingOrdersCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        )}

        {(isManager || isWarehouse) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                <Package className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-4 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Đơn chờ xuất kho</dt>
                  <dd className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">{metrics.readyToShipOrdersCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        )}

        {(isManager || isAccountant) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
                <Users className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-4 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Tổng công nợ quá hạn</dt>
                  <dd className="mt-1 flex items-baseline">
                    <span className="truncate text-xl sm:text-2xl font-bold tracking-tight text-red-600">{formatCurrency(metrics.totalOverdueDebt)}</span>
                    {metrics.debtGrowthPercent !== undefined && (
                      <span className={`ml-2 flex items-baseline text-xs font-semibold ${metrics.debtGrowthPercent < 0 ? 'text-green-600' : 'text-red-600'}`} title="So với kỳ trước">
                        {metrics.debtGrowthPercent < 0 ? <ArrowDownRight className="h-3 w-3 mr-0.5" /> : <ArrowUpRight className="h-3 w-3 mr-0.5" />}
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
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-50">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-4 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="truncate text-xs sm:text-sm font-medium text-slate-500">Sản phẩm cảnh báo tồn</dt>
                  <dd className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-orange-600 truncate">{metrics.lowStockAlertCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CHARTS SECTION ── */}
      <div className={`grid grid-cols-1 gap-6 lg:grid-cols-2 ${loading ? 'opacity-50 pointer-events-none' : 'transition-opacity duration-300'}`}>
        {/* Sales Trend Chart */}
        {(isManager || isSalesRep) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs hover:shadow-md transition-all">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Biểu đồ doanh số</h2>
                <p className="text-xs text-slate-500 mt-0.5">Biến động doanh thu theo chu kỳ thời gian</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.salesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="value" name="Doanh số" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* High Risk Agencies Chart */}
        {(isManager || isAccountant) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs hover:shadow-md transition-all" id="high-risk">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Top Đại lý rủi ro công nợ cao</h2>
                <p className="text-xs text-slate-500 mt-0.5">Xếp hạng các đại lý có số dư nợ quá hạn lớn nhất</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.highRiskAgencies} layout="vertical" margin={{ top: 5, right: 15, left: -5, bottom: 5 }}>
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
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
                  <Bar 
                    dataKey="overdueAmount" 
                    name="Công nợ quá hạn" 
                    fill="#fb7185" 
                    radius={[0, 4, 4, 0]} 
                    maxBarSize={28}
                    onClick={(data: any) => navigate(`/sales/customers/${data.payload?.customerId || data.customerId}`)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── ADDITIONAL DETAILS TABLE FOR HIGH RISK ── */}
      {(isManager || isAccountant) && charts.highRiskAgencies.length > 0 && (
        <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden ${loading ? 'opacity-50 pointer-events-none' : 'transition-opacity duration-300'}`}>
          <div className="border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap justify-between items-center gap-2 bg-slate-50/50">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Danh sách cần thu hồi công nợ gấp</h3>
              <p className="text-xs text-slate-500 mt-0.5">Nhấp vào từng đại lý để chuyển nhanh sang trang quản lý công nợ chi tiết</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-red-50 border border-red-200/60 px-2.5 py-0.5 text-xs font-semibold text-red-700 shadow-2xs">
              {charts.highRiskAgencies.length} đại lý
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mã ĐL</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tên Đại lý</th>
                  <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">NV Phụ trách</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Dư nợ quá hạn</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {charts.highRiskAgencies.map((agency) => (
                  <tr 
                    key={agency.customerId} 
                    onClick={() => navigate(`/sales/customers/${agency.customerId}`)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="whitespace-nowrap px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-semibold text-indigo-600 group-hover:text-indigo-800">
                      {agency.customerCode}
                    </td>
                    <td className="whitespace-nowrap px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-medium text-slate-900 max-w-[150px] sm:max-w-none truncate">
                      {agency.customerName}
                    </td>
                    <td className="hidden sm:table-cell whitespace-nowrap px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-slate-500">
                      {agency.salesRepName || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 sm:px-6 py-3.5 text-right text-xs sm:text-sm font-bold text-red-600">
                      {formatCurrency(agency.overdueAmount)}
                    </td>
                    <td className="whitespace-nowrap px-4 sm:px-6 py-3.5 text-right text-xs sm:text-sm font-medium text-slate-400 group-hover:text-indigo-600">
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 inline-block group-hover:translate-x-0.5 transition-transform" />
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
