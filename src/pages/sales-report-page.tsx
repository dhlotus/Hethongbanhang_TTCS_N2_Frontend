import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Calendar,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  MapPin,
  Building,
  Package,
  Layers,
  ShieldCheck,
  ChevronDown,
  Info,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { salesReportService } from '../services/sales-report.service';
import type {
  MultidimensionalSalesReportResponse,
  SalesReportGroupBy,
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

export const SalesReportPage: React.FC = () => {
  const user = getStoredUser();
  const roles = user?.roles || [];
  const isSalesManager = roles.includes('SALES_MANAGER');

  const [groupBy, setGroupBy] = useState<SalesReportGroupBy>('sales_rep');
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [reportData, setReportData] = useState<MultidimensionalSalesReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Popover chọn ngày tùy chọn
  const [isCustomDateOpen, setIsCustomDateOpen] = useState<boolean>(false);
  const [tempStart, setTempStart] = useState<string>('');
  const [tempEnd, setTempEnd] = useState<string>('');

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

  useEffect(() => {
    loadReport();
  }, [loadReport]);

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

  const handleApplyCustomDates = () => {
    if (!tempStart || !tempEnd) {
      showToast('error', 'Vui lòng chọn đủ ngày bắt đầu và kết thúc');
      return;
    }
    if (tempStart > tempEnd) {
      showToast('error', 'Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }
    setStartDate(tempStart);
    setEndDate(tempEnd);
    setTimeRange('custom');
    setIsCustomDateOpen(false);
  };

  const items = reportData?.items || [];
  const summary = reportData?.summary;
  const hasProfitAccess = Boolean(reportData?.hasProfitAccess ?? isSalesManager);

  const groupOptions: { key: SalesReportGroupBy; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'sales_rep', label: 'Nhân viên kinh doanh', icon: Users },
    { key: 'region', label: 'Khu vực địa bàn', icon: MapPin },
    { key: 'customer', label: 'Đại lý / Khách hàng', icon: Building },
    { key: 'category', label: 'Nhóm ngành hàng', icon: Layers },
    { key: 'product', label: 'Sản phẩm (SKU)', icon: Package },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── HEADER BÁO CÁO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-indigo-600 shrink-0" />
            <span>Báo cáo doanh số bán hàng nhiều chiều</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Phân tích đa chiều theo Nhân viên, Khu vực, Đại lý, Ngành hàng và Mặt hàng (SKU)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {hasProfitAccess && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Quyền xem Biên lợi nhuận: Đã kích hoạt</span>
            </div>
          )}

          {/* Nút Xuất Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold shadow-xs transition-colors"
            title="Xuất dữ liệu ra file Excel (.xlsx)"
          >
            <FileSpreadsheet className={`h-4 w-4 ${exporting ? 'animate-bounce' : ''}`} />
            <span>{exporting ? 'Đang xuất Excel...' : 'Xuất Excel (.xlsx)'}</span>
          </button>

          {/* Nút Làm mới */}
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── BỘ ĐIỀU KHIỂN: 5 CHIỀU NHÓM & BỘ LỌC THỜI GIAN ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Hàng 1: 5 Tab Chiều nhóm (groupBy) */}
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Chiều phân tích dữ liệu:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {groupOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = groupBy === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setGroupBy(opt.key)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all text-left ${
                    isActive
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/10 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hàng 2: Bộ lọc thời gian & Tìm kiếm */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1">Khoảng thời gian:</span>
            {[
              { key: 'today', label: 'Hôm nay' },
              { key: 'this_month', label: 'Tháng này' },
              { key: 'last_month', label: 'Tháng trước' },
              { key: 'this_quarter', label: 'Quý này' },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setTimeRange(preset.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  timeRange === preset.key
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}

            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsCustomDateOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  timeRange === 'custom'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {timeRange === 'custom' && startDate && endDate
                    ? `${startDate} ~ ${endDate}`
                    : 'Tùy chọn ngày'}
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {isCustomDateOpen && (
                <div className="absolute left-0 mt-2 z-30 w-72 p-3 bg-white border border-slate-200 rounded-xl shadow-xl space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">Khoảng ngày tùy chọn</div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Từ ngày:</label>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={(e) => setTempStart(e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-200 p-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Đến ngày:</label>
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={(e) => setTempEnd(e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-200 p-1.5"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustomDates}
                    className="w-full py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700"
                  >
                    Áp dụng
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ô tìm kiếm theo đối tượng */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Lọc tên hoặc mã..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── THÔNG TIN KỲ BÁO CÁO & SO SÁNH ── */}
      {reportData && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 sm:p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800">Kỳ báo cáo hiện tại:</span>{' '}
              <span className="font-bold text-indigo-700">{reportData.currentRange.label}</span>
              {' • '}
              <span className="font-semibold text-slate-800">Cùng kỳ trước:</span>{' '}
              <span className="font-bold text-slate-700">{reportData.previousRange.label}</span>
            </div>
          </div>
          <div className="text-slate-500">
            Cơ chế: So sánh cùng số ngày đã trôi qua đối với kỳ đang diễn ra
          </div>
        </div>
      )}

      {/* ── THẺ KPI TỔNG QUAN ── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Doanh thu thuần */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-xs font-medium text-slate-500">Doanh thu thuần kỳ này</div>
            <div className="text-lg sm:text-xl font-bold text-indigo-700 mt-1 tabular-nums">
              {formatCurrency(summary.totalCurrentSales)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
              <span>Kỳ trước: {formatCurrency(summary.totalPreviousSales)}</span>
            </div>
          </div>

          {/* Tăng trưởng doanh số */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-xs font-medium text-slate-500">Tăng trưởng so cùng kỳ</div>
            <div className="text-lg sm:text-xl font-bold mt-1 flex items-center gap-1 tabular-nums">
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
            <div className="mt-1 text-[11px] text-slate-400">
              Chênh lệch: {summary.totalDiffAmount >= 0 ? '+' : ''}
              {formatCurrency(summary.totalDiffAmount)}
            </div>
          </div>

          {/* Sản lượng & Số đơn */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-xs font-medium text-slate-500">Tổng sản lượng xuất bán</div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 tabular-nums">
              {formatNumber(summary.totalQuantity)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Tổng số đơn hàng: <span className="font-semibold text-slate-700">{summary.totalOrdersCount} đơn</span>
            </div>
          </div>

          {/* Lợi nhuận gộp & Biên LN (Chỉ hiển thị cho Quản lý) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-xs font-medium text-slate-500">
              {hasProfitAccess ? 'Lợi nhuận gộp / Biên tổng' : 'Phân quyền kinh doanh'}
            </div>
            {hasProfitAccess && summary.totalGrossProfit !== undefined ? (
              <>
                <div className="text-lg sm:text-xl font-bold text-emerald-700 mt-1 tabular-nums">
                  {formatCurrency(summary.totalGrossProfit)}
                </div>
                <div className="mt-1 text-[11px] font-semibold text-emerald-600">
                  Biên LN gộp tổng: {summary.totalGrossMarginPercent}%
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 mt-2">
                Chỉ Quản lý kinh doanh (SALES_MANAGER) mới có quyền xem giá vốn, lợi nhuận gộp và biên lợi nhuận.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BẢNG SỐ LIỆU DOANH SỐ NHIỀU CHIỀU ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-slate-900 text-sm sm:text-base">
            Bảng số liệu chi tiết theo {reportData?.groupByLabel || 'nhóm'}
          </div>
          <div className="text-xs text-slate-400">
            {items.length} nhóm đối tượng phát sinh giao dịch
          </div>
        </div>

        {items.length > 0 ? (
          <div>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                    <th className="py-3 px-3 w-12 text-center">STT</th>
                    <th className="py-3 px-3">Mã đối tượng</th>
                    <th className="py-3 px-4">Tên {reportData?.groupByLabel}</th>
                    {groupBy === 'product' && <th className="py-3 px-3">Đơn vị</th>}
                    <th className="py-3 px-3 text-right">Số đơn</th>
                    <th className="py-3 px-3 text-right">Sản lượng</th>
                    <th className="py-3 px-4 text-right">Doanh số kỳ này (₫)</th>
                    <th className="py-3 px-4 text-right">Doanh số kỳ trước (₫)</th>
                    <th className="py-3 px-4 text-right">Chênh lệch (₫)</th>
                    <th className="py-3 px-3 text-right">Tăng trưởng</th>
                    {hasProfitAccess && (
                      <>
                        <th className="py-3 px-4 text-right">Giá vốn (₫)</th>
                        <th className="py-3 px-4 text-right">Lợi nhuận gộp (₫)</th>
                        <th className="py-3 px-3 text-right">Biên LN (%)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-medium">{index + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{row.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-[240px] truncate" title={row.name}>
                        {row.name}
                        {row.categoryName && groupBy === 'product' && (
                          <div className="text-[11px] text-slate-400 font-normal">{row.categoryName}</div>
                        )}
                      </td>
                      {groupBy === 'product' && <td className="py-3 px-3 text-slate-600">{row.unit || '—'}</td>}
                      <td className="py-3 px-3 text-right tabular-nums text-slate-700">{row.ordersCount}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatNumber(row.quantity)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-indigo-700">
                        {formatCurrency(row.currentSales)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-500">
                        {formatCurrency(row.previousSales)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold">
                        <span className={row.diffAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {row.diffAmount >= 0 ? '+' : ''}
                          {formatCurrency(row.diffAmount)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">
                        {row.isNewSales ? (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                            Mới (+100%)
                          </span>
                        ) : row.growthRatePercent !== null ? (
                          <span className={row.growthRatePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {row.growthRatePercent >= 0 ? '+' : ''}
                            {row.growthRatePercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      {hasProfitAccess && (
                        <>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                            {formatCurrency(row.cogs || 0)}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-bold text-emerald-700">
                            {formatCurrency(row.grossProfit || 0)}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums font-semibold text-emerald-800">
                            {row.grossMarginPercent !== undefined ? `${row.grossMarginPercent}%` : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                {/* Dòng Tổng cộng Grand Total */}
                {summary && (
                  <tfoot>
                    <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={groupBy === 'product' ? 4 : 3} className="py-3.5 px-4 text-center">
                        TỔNG CỘNG
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{summary.totalOrdersCount}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatNumber(summary.totalQuantity)}</td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-indigo-700">
                        {formatCurrency(summary.totalCurrentSales)}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-slate-600">
                        {formatCurrency(summary.totalPreviousSales)}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        <span className={summary.totalDiffAmount >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {summary.totalDiffAmount >= 0 ? '+' : ''}
                          {formatCurrency(summary.totalDiffAmount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums text-emerald-700">
                        {summary.totalGrowthRatePercent !== null ? `+${summary.totalGrowthRatePercent}%` : '0%'}
                      </td>
                      {hasProfitAccess && (
                        <>
                          <td className="py-3.5 px-4 text-right tabular-nums text-slate-700">
                            {formatCurrency(summary.totalCogs || 0)}
                          </td>
                          <td className="py-3.5 px-4 text-right tabular-nums text-emerald-800">
                            {formatCurrency(summary.totalGrossProfit || 0)}
                          </td>
                          <td className="py-3.5 px-3 text-right tabular-nums text-emerald-800">
                            {summary.totalGrossMarginPercent}%
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Mobile Cards View (Tối ưu màn hình hẹp 320px - 1024px) */}
            <div className="lg:hidden divide-y divide-slate-100">
              {items.map((row, index) => (
                <div key={row.id || index} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">#{index + 1} • {row.code}</div>
                      <div className="text-base font-bold text-slate-900 mt-0.5">{row.name}</div>
                      {row.categoryName && (
                        <div className="text-xs text-slate-400">{row.categoryName}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-indigo-700 tabular-nums">
                        {formatCurrency(row.currentSales)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Kỳ trước: {formatCurrency(row.previousSales)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400">Số đơn:</span>{' '}
                      <span className="font-semibold text-slate-800">{row.ordersCount} đơn</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Sản lượng:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {formatNumber(row.quantity)} {row.unit || ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Chênh lệch:</span>{' '}
                      <span className={`font-semibold ${row.diffAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {row.diffAmount >= 0 ? '+' : ''}{formatCurrency(row.diffAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Tăng trưởng:</span>{' '}
                      <span className={`font-bold ${row.growthRatePercent && row.growthRatePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {row.isNewSales ? 'Mới' : `${row.growthRatePercent || 0}%`}
                      </span>
                    </div>
                  </div>

                  {hasProfitAccess && (
                    <div className="flex items-center justify-between text-xs bg-emerald-50/60 border border-emerald-100 p-2 rounded-lg">
                      <div>
                        <span className="text-slate-500">Giá vốn:</span>{' '}
                        <span className="font-semibold text-slate-800">{formatCurrency(row.cogs || 0)}</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-bold">
                          LN: {formatCurrency(row.grossProfit || 0)} ({row.grossMarginPercent}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-sm text-slate-500">
            Không có dữ liệu bán hàng phù hợp với điều kiện lọc đã chọn.
          </div>
        )}
      </div>
    </div>
  );
};
