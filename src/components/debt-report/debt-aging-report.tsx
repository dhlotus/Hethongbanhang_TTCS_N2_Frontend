import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Clock,
  Building2,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Users,
  ShieldAlert,
  ArrowUpDown,
  Layers,
  Phone,
  UserCheck,
} from 'lucide-react';
import { SmartSelect } from '../smart-select';
import type { SmartSelectOption } from '../smart-select';
import { debtReportService } from '../../services/debt-report.service';
import {
  AgingDebtGroupEnum,
  DebtPriorityLevelEnum,
  DEBT_PRIORITY_COLORS,
} from '../../types/debt-report.type';
import type {
  AgentDebtReport,
  DebtReportSummary,
  QueryDebtReportParams,
  SalesRepOption,
  AgencyOption,
} from '../../types/debt-report.type';

interface DebtAgingReportProps {
  onOpenLedger: (agencyIdOrCode: string) => void;
}

export const DebtAgingReport: React.FC<DebtAgingReportProps> = ({ onOpenLedger }) => {
  // 1. Quản lý State Bộ lọc
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [asOfDate, setAsOfDate] = useState<string>(todayStr);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>('ALL');
  const [selectedAgingGroup, setSelectedAgingGroup] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<'oldestDebtDays' | 'remainingDebt' | 'overdueAmount' | 'priority'>('oldestDebtDays');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (col: 'oldestDebtDays' | 'remainingDebt' | 'overdueAmount' | 'priority') => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // State Dữ liệu
  const [reportData, setReportData] = useState<AgentDebtReport[]>([]);
  const [summary, setSummary] = useState<DebtReportSummary | null>(null);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportingWord, setExportingWord] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Danh mục Dropdown
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);

  // State mở rộng "Chi tiết tuổi nợ" cho từng dòng (Desktop & Mobile)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [showRepSummary, setShowRepSummary] = useState<boolean>(false);

  // Toggle chi tiết tuổi nợ của 1 đại lý
  const toggleRowDetail = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Mở rộng tất cả / Thu gọn tất cả
  const isAllExpanded = useMemo(() => {
    if (reportData.length === 0) return false;
    return reportData.every((item) => expandedRows[item.agencyId]);
  }, [reportData, expandedRows]);

  const toggleAllDetails = () => {
    if (isAllExpanded) {
      setExpandedRows({});
    } else {
      const nextState: Record<string, boolean> = {};
      reportData.forEach((item) => {
        nextState[item.agencyId] = true;
      });
      setExpandedRows(nextState);
    }
  };

  // 2. Tải danh mục NV kinh doanh & Đại lý
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [repsData, agsData] = await Promise.all([
          debtReportService.getSalesReps().catch(() => []),
          debtReportService.getAgencies().catch(() => []),
        ]);
        setSalesReps(repsData);
        setAgencies(agsData);
      } catch (err) {
        console.error('Không thể tải danh mục bộ lọc:', err);
      }
    };
    loadMetadata();
  }, []);

  // 3. Tải dữ liệu Báo cáo tuổi nợ theo điều kiện lọc
  const fetchReport = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: QueryDebtReportParams = {
        asOfDate,
        agencyId: selectedAgency || undefined,
        salesRepName: selectedSalesRep !== 'ALL' ? selectedSalesRep : undefined,
        agingGroup: selectedAgingGroup !== 'ALL' ? selectedAgingGroup : undefined,
        priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
        search: searchTerm.trim() || undefined,
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder,
      };

      const res = await debtReportService.getDebtReport(params);
      setReportData(res.data);
      setSummary(res.summary);
      setTotalItems(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('Lỗi tải báo cáo tuổi nợ:', err);
      setErrorMsg(err?.response?.data?.message || 'Không thể tải báo cáo công nợ quá hạn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    asOfDate,
    selectedAgency,
    selectedSalesRep,
    selectedAgingGroup,
    selectedPriority,
    pageSize,
    currentPage,
    sortBy,
    sortOrder,
  ]);

  // Xử lý tìm kiếm debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchReport();
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // 4. Xuất Excel báo cáo tuổi nợ
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params: QueryDebtReportParams = {
        asOfDate,
        agencyId: selectedAgency || undefined,
        salesRepName: selectedSalesRep !== 'ALL' ? selectedSalesRep : undefined,
        agingGroup: selectedAgingGroup !== 'ALL' ? selectedAgingGroup : undefined,
        priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
        search: searchTerm.trim() || undefined,
      };

      const blob = await debtReportService.exportDebtReportToExcel(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bao_Cao_Tuoi_No_${asOfDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không thể xuất file Excel. Vui lòng thử lại sau.');
    } finally {
      setExporting(false);
    }
  };

  // 5. Xuất PDF báo cáo tuổi nợ
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const params: QueryDebtReportParams = {
        asOfDate,
        agencyId: selectedAgency || undefined,
        salesRepName: selectedSalesRep !== 'ALL' ? selectedSalesRep : undefined,
        agingGroup: selectedAgingGroup !== 'ALL' ? selectedAgingGroup : undefined,
        priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
        search: searchTerm.trim() || undefined,
      };

      const blob = await debtReportService.exportDebtReportToPdf(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bao_Cao_Tuoi_No_${asOfDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không thể xuất file PDF. Vui lòng thử lại sau.');
    } finally {
      setExportingPdf(false);
    }
  };

  // 6. Xuất Word (.docx) báo cáo tuổi nợ
  const handleExportWord = async () => {
    setExportingWord(true);
    try {
      const params: QueryDebtReportParams = {
        asOfDate,
        agencyId: selectedAgency || undefined,
        salesRepName: selectedSalesRep !== 'ALL' ? selectedSalesRep : undefined,
        agingGroup: selectedAgingGroup !== 'ALL' ? selectedAgingGroup : undefined,
        priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
        search: searchTerm.trim() || undefined,
      };

      const blob = await debtReportService.exportDebtReportToWord(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bao_Cao_Tuoi_No_${asOfDate}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Không thể xuất file Word. Vui lòng thử lại sau.');
    } finally {
      setExportingWord(false);
    }
  };

  // Helper format tiền tệ rõ ràng, không rớt chữ số
  const formatMoney = (val?: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';
  };

  // Chuẩn bị options cho SmartSelect
  const agencyOptions: SmartSelectOption[] = useMemo(() => {
    const allOpt: SmartSelectOption = {
      value: '',
      label: 'Tất cả đại lý',
      subLabel: `Tổng cộng ${agencies.length} đại lý toàn quốc`,
    };
    const mapped = agencies.map((ag) => ({
      value: ag.code,
      label: `${ag.code} - ${ag.name}`,
      subLabel: `SĐT: ${ag.phone || '—'} | NV phụ trách: ${ag.salesRepName || 'Chưa phân công'}`,
      badge: ag.code,
    }));
    return [allOpt, ...mapped];
  }, [agencies]);

  const salesRepOptions: SmartSelectOption[] = useMemo(() => {
    const allOpt: SmartSelectOption = {
      value: 'ALL',
      label: 'Tất cả nhân viên kinh doanh',
    };
    const mapped = salesReps.map((r) => ({
      value: r.name,
      label: r.name,
      subLabel: `Mã NV: ${r.id}`,
    }));
    return [allOpt, ...mapped];
  }, [salesReps]);

  const agingGroupOptions: SmartSelectOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'Tất cả nhóm tuổi nợ' },
      { value: AgingDebtGroupEnum.CURRENT, label: 'Chưa quá hạn (Trong hạn)', badge: '0 ngày' },
      { value: AgingDebtGroupEnum.AGE_1_30, label: 'Quá hạn 1–30 ngày', badge: '1-30d', badgeColor: 'bg-amber-100 text-amber-800' },
      { value: AgingDebtGroupEnum.AGE_31_60, label: 'Quá hạn 31–60 ngày', badge: '31-60d', badgeColor: 'bg-orange-100 text-orange-800' },
      { value: AgingDebtGroupEnum.AGE_61_90, label: 'Quá hạn 61–90 ngày', badge: '61-90d', badgeColor: 'bg-rose-100 text-rose-800' },
      { value: AgingDebtGroupEnum.AGE_OVER_90, label: 'Quá hạn trên 90 ngày', badge: '>90d', badgeColor: 'bg-red-200 text-red-900 font-bold' },
    ];
  }, []);

  const priorityOptions: SmartSelectOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'Tất cả mức ưu tiên' },
      { value: DebtPriorityLevelEnum.CRITICAL, label: 'Khẩn cấp (Ưu tiên số 1)', badgeColor: 'bg-rose-100 text-rose-700' },
      { value: DebtPriorityLevelEnum.HIGH, label: 'Cao (Cần đôn đốc)', badgeColor: 'bg-amber-100 text-amber-700' },
      { value: DebtPriorityLevelEnum.MEDIUM, label: 'Trung bình (Theo dõi)', badgeColor: 'bg-yellow-100 text-yellow-800' },
      { value: DebtPriorityLevelEnum.LOW, label: 'Bình thường (Trong hạn)', badgeColor: 'bg-emerald-100 text-emerald-700' },
      { value: DebtPriorityLevelEnum.SETTLED, label: 'Đã tất toán (Hết nợ)', badgeColor: 'bg-slate-100 text-slate-600' },
    ];
  }, []);

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. THANH CÔNG CỤ BỘ LỌC (Filter Bar) - Tiêu đề 22-26px, Chữ phụ 13-14px */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-slate-900 flex items-center gap-2.5">
              <Clock className="w-6 h-6 text-blue-600 shrink-0" />
              <span>Báo Cáo Công Nợ Quá Hạn Theo Tuổi Nợ</span>
            </h1>
            <p className="text-[13px] sm:text-sm text-slate-500 mt-1">
              Phân tích dải tuổi nợ theo ngày chốt, cảnh báo đại lý ưu tiên thu hồi và đối chiếu chi tiết
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRepSummary(!showRepSummary)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
              title="Xem bảng thống kê công nợ theo từng nhân viên kinh doanh"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>{showRepSummary ? 'Ẩn bảng NV' : 'Xem theo NV'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:opacity-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>{exportingPdf ? 'Đang xuất...' : 'Xuất PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              disabled={exportingWord || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-sm disabled:opacity-50 transition-colors"
              title="Xuất file Microsoft Word (.docx) chuyên nghiệp"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              <span>{exportingWord ? 'Đang xuất...' : 'Xuất Word'}</span>
            </button>
          </div>
        </div>

        {/* Form bộ lọc 5 trường: Chữ label 13-14px, Input 14-15px */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Ngày chốt báo cáo */}
          <div>
            <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Ngày chốt báo cáo
            </label>
            <div className="relative">
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => {
                  setAsOfDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* 2. Đại lý */}
          <div>
            <SmartSelect
              label="Đại lý mua hàng"
              value={selectedAgency}
              options={agencyOptions}
              onChange={(val) => {
                setSelectedAgency(val as string);
                setCurrentPage(1);
              }}
              placeholder="Chọn đại lý..."
              searchPlaceholder="Gõ mã hoặc tên đại lý..."
              allowClear
            />
          </div>

          {/* 3. Nhân viên phụ trách */}
          <div>
            <SmartSelect
              label="Nhân viên phụ trách"
              value={selectedSalesRep}
              options={salesRepOptions}
              onChange={(val) => {
                setSelectedSalesRep(val as string);
                setCurrentPage(1);
              }}
              placeholder="Chọn nhân viên..."
              searchPlaceholder="Tìm theo tên nhân viên..."
            />
          </div>

          {/* 4. Nhóm tuổi nợ */}
          <div>
            <SmartSelect
              label="Nhóm tuổi nợ"
              value={selectedAgingGroup}
              options={agingGroupOptions}
              onChange={(val) => {
                setSelectedAgingGroup(val as string);
                setCurrentPage(1);
              }}
              placeholder="Chọn dải tuổi nợ..."
            />
          </div>

          {/* 5. Mức độ ưu tiên xử lý */}
          <div>
            <SmartSelect
              label="Mức ưu tiên xử lý"
              value={selectedPriority}
              options={priorityOptions}
              onChange={(val) => {
                setSelectedPriority(val as string);
                setCurrentPage(1);
              }}
              placeholder="Chọn mức ưu tiên..."
            />
          </div>
        </div>

        {/* Hàng tìm kiếm nhanh & Số dòng mỗi trang */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm nhanh theo mã ĐL, tên ĐL, số điện thoại..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
            <span>trên tổng {totalItems} đại lý</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. KHỐI THẺ KPI CHỈ SỐ CÔNG NỢ - Hiển thị số tiền trọn vẹn 100% */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Tổng Dư Nợ */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng dư nợ
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-950 mt-2 whitespace-nowrap">
            {formatMoney(summary?.remainingDebt)}
          </div>
          <div className="text-xs sm:text-[13px] text-slate-500 mt-1">
            {summary?.totalAgencies || 0} đại lý có phát sinh nợ
          </div>
        </div>

        {/* Card 2: Nợ Quá Hạn */}
        <div className="bg-white rounded-xl p-4 border border-rose-200 shadow-sm flex flex-col justify-between bg-rose-50/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] font-bold text-rose-700 uppercase tracking-wider">
              Tổng nợ quá hạn
            </span>
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 mt-2 whitespace-nowrap">
            {formatMoney(summary?.totalOverdueAmount)}
          </div>
          <div className="text-xs sm:text-[13px] text-rose-600 font-medium mt-1">
            {summary?.overdueAgenciesCount || 0} đại lý đang quá hạn
          </div>
        </div>

        {/* Card 3: Trong Hạn */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-sm flex flex-col justify-between bg-emerald-50/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] font-bold text-emerald-700 uppercase tracking-wider">
              Nợ chưa quá hạn
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 mt-2 whitespace-nowrap">
            {formatMoney(summary?.totalCurrentInTerm || summary?.totalAge0To30)}
          </div>
          <div className="text-xs sm:text-[13px] text-emerald-600 mt-1">
            {summary?.inTermAgenciesCount || 0} đại lý an toàn
          </div>
        </div>

        {/* Card 4: Đại Lý Khẩn Cấp Cần Xử Lý */}
        <div className="bg-white rounded-xl p-4 border border-red-300 shadow-sm flex flex-col justify-between bg-red-50/40">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-[13px] font-bold text-red-700 uppercase tracking-wider">
              Cần ưu tiên xử lý
            </span>
            <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-red-700 mt-2 whitespace-nowrap">
            {(summary?.criticalAgenciesCount || 0) + (summary?.highPriorityCount || 0)} đại lý
          </div>
          <div className="text-xs sm:text-[13px] text-red-600 mt-1">
            {summary?.criticalAgenciesCount || 0} khẩn cấp, {summary?.highPriorityCount || 0} mức cao
          </div>
        </div>
      </div>

      {/* Bảng phân tích theo Nhân viên phụ trách (Nếu mở) */}
      {showRepSummary && summary?.salesRepSummary && summary.salesRepSummary.length > 0 && (
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm animate-in fade-in duration-200">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3.5 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Tổng Hợp Công Nợ Quá Hạn Theo Nhân Viên Kinh Doanh Phụ Trách</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-3.5">Nhân viên phụ trách</th>
                  <th className="py-3 px-3 text-center">Số đại lý</th>
                  <th className="py-3 px-3.5 text-right">Tổng phải thu</th>
                  <th className="py-3 px-3.5 text-right">Đã thu</th>
                  <th className="py-3 px-3.5 text-right">Còn nợ</th>
                  <th className="py-3 px-3.5 text-right text-rose-600">Nợ quá hạn</th>
                  <th className="py-3 px-3 text-center text-red-600">Khẩn cấp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.salesRepSummary.map((rep) => (
                  <tr key={rep.salesRepName} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3.5 font-medium text-slate-800">{rep.salesRepName}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{rep.agencyCount}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono">{formatMoney(rep.totalReceivable)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-emerald-700">{formatMoney(rep.totalPaid)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-900">{formatMoney(rep.remainingDebt)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-rose-600">
                      {formatMoney(rep.overdueAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {rep.criticalAgenciesCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                          {rep.criticalAgenciesCount} ĐL
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. BẢNG DỮ LIỆU ĐƯỢC THIẾT KẾ LẠI: 5 CỘT CHÍNH - KHÔNG KÉO NGANG!  */}
      {/* Cột: Đại lý | Tổng dư nợ | Nợ quá hạn | Ưu tiên xử lý | Thao tác   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Đang tải và tính toán tuổi nợ...</p>
          </div>
        ) : errorMsg ? (
          <div className="py-12 px-4 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-rose-700">{errorMsg}</p>
            <button
              type="button"
              onClick={fetchReport}
              className="mt-3 px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
            >
              Thử lại
            </button>
          </div>
        ) : reportData.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">Không tìm thấy đại lý nào phù hợp với bộ lọc hiện tại.</p>
            <p className="text-xs text-slate-400 mt-1">Hãy thử xóa bộ lọc hoặc chọn khoảng ngày khác.</p>
          </div>
        ) : (
          <>
            {/* 3A. BẢNG DÀNH CHO MÀN HÌNH MÁY TÍNH (>= 1024px) - 5 CỘT VỪA KHÍT 100% */}
            <div className="hidden lg:block">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-700 uppercase tracking-wider select-none">
                    {/* Cột 1: Đại lý (36%) */}
                    <th className="py-3.5 px-4 w-[36%] text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>Đại lý & Nhân viên</span>
                      </div>
                    </th>

                    {/* Cột 2: Tổng dư nợ (18%) */}
                    <th className="py-3.5 px-4 w-[18%] text-right font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => handleSort('remainingDebt')}
                        className="inline-flex items-center gap-1 hover:text-blue-600 ml-auto transition-colors whitespace-nowrap"
                      >
                        <span>Tổng dư nợ</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </th>

                    {/* Cột 3: Nợ quá hạn (18%) */}
                    <th className="py-3.5 px-4 w-[18%] text-right font-bold text-rose-600">
                      <button
                        type="button"
                        onClick={() => handleSort('overdueAmount')}
                        className="inline-flex items-center gap-1 hover:text-rose-700 ml-auto transition-colors whitespace-nowrap"
                      >
                        <span>Nợ quá hạn</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </th>

                    {/* Cột 4: Ưu tiên xử lý (14%) */}
                    <th className="py-3.5 px-4 w-[14%] text-left font-bold text-slate-700">
                      <button
                        type="button"
                        onClick={() => handleSort('priority')}
                        className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        <span>Ưu tiên xử lý</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </th>

                    {/* Cột 5: Thao tác (14%) */}
                    <th className="py-3.5 px-4 w-[14%] text-center font-bold text-slate-700 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <span>Thao tác</span>
                        <button
                          type="button"
                          onClick={toggleAllDetails}
                          className="text-[11px] text-blue-600 hover:text-blue-800 underline ml-1 font-normal lowercase tracking-normal"
                          title={isAllExpanded ? 'Thu gọn tất cả chi tiết tuổi nợ' : 'Mở rộng tất cả chi tiết tuổi nợ'}
                        >
                          ({isAllExpanded ? 'thu gọn' : 'mở hết'})
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((item) => {
                    const isExpanded = !!expandedRows[item.agencyId];
                    const pColor = DEBT_PRIORITY_COLORS[item.priorityLevel || 'LOW'] || DEBT_PRIORITY_COLORS.LOW;

                    return (
                      <React.Fragment key={item.agencyId}>
                        {/* DÒNG CHÍNH: 5 CỘT GỌN ĐẸP, CHỮ 15-16PX, SỐ TIỀN RÕ RÀNG */}
                        <tr
                          className={`hover:bg-blue-50/30 transition-colors ${
                            isExpanded ? 'bg-blue-50/20' : item.isOverdue ? 'bg-white' : 'bg-slate-50/10'
                          }`}
                        >
                          {/* 1. Đại lý: Tên 15-16px xuống dòng tự nhiên, Dòng phụ 13-14px */}
                          <td className="py-3.5 px-4">
                            <div className="text-[15px] sm:text-base font-bold text-slate-900 leading-snug">
                              {item.agencyName}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-1 text-[13px] text-slate-500">
                              <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {item.agencyCode}
                              </span>
                              {item.phone && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  {item.phone}
                                </span>
                              )}
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1 text-slate-600">
                                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                {item.salesRepName || 'Chưa phân công'}
                                {item.region ? ` (${item.region})` : ''}
                              </span>
                            </div>
                          </td>

                          {/* 2. Tổng dư nợ: 15-16px font-mono bold, căn phải */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[15px] sm:text-base text-slate-900 whitespace-nowrap">
                            {formatMoney(item.remainingDebt)}
                          </td>

                          {/* 3. Nợ quá hạn: 15-16px font-mono bold rose-600, căn phải */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[15px] sm:text-base whitespace-nowrap">
                            {item.overdueAmount > 0 ? (
                              <span className="text-rose-600">{formatMoney(item.overdueAmount)}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">0 đ</span>
                            )}
                          </td>

                          {/* 4. Ưu tiên xử lý: Badge 13-14px + Căn cứ ngắn */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-md text-xs sm:text-[13px] font-bold border ${pColor.bg} ${pColor.border}`}
                            >
                              {item.priorityLabel || 'Bình thường'}
                            </span>
                            <div
                              className="text-xs sm:text-[13px] text-slate-600 mt-1 leading-snug"
                              title={item.priorityReason}
                            >
                              {item.priorityReason || 'Trong hạn thanh toán'}
                            </div>
                          </td>

                          {/* 5. Thao tác: Nút "Chi tiết tuổi nợ" + Nút "Sổ chi tiết" */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              {/* Nút Chi tiết tuổi nợ (Accordion Toggle) */}
                              <button
                                type="button"
                                onClick={() => toggleRowDetail(item.agencyId)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs sm:text-[13px] font-semibold rounded-lg border transition-all ${
                                  isExpanded
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                                title="Bấm để mở/đóng dải 5 nhóm tuổi nợ và điều kiện tín dụng"
                              >
                                <span>Tuổi nợ</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Nút Sổ chi tiết */}
                              <button
                                type="button"
                                onClick={() => onOpenLedger(item.agencyCode || item.agencyId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs sm:text-[13px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-2xs whitespace-nowrap"
                                title="Mở Sổ chi tiết công nợ đại lý (SN-231)"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Sổ chi tiết</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* DÒNG CON MỞ RỘNG: HIỂN THỊ ĐẦY ĐỦ 5 DẢI TUỔI NỢ & CĂN CỨ XỬ LÝ (TỰ XUỐNG HÀNG) */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-y border-slate-200 animate-in fade-in duration-150">
                            <td colSpan={5} className="py-4 px-6">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-600" />
                                    <span>
                                      Phân Bổ Tuổi Nợ & Điều Kiện Tín Dụng — {item.agencyName}
                                    </span>
                                  </h4>
                                  <span className="text-xs text-slate-500">
                                    Quá hạn lâu nhất: <strong className="text-slate-800">{item.oldestDebtDays || 0} ngày</strong>
                                  </span>
                                </div>

                                {/* 6 Ô Thông Tin Dải Tuổi Nợ (Tự xuống hàng theo chiều rộng) */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                  {/* Ô 1: Hạn mức tín dụng */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                                    <span className="text-xs font-semibold text-slate-500 block">
                                      Hạn mức cấp
                                    </span>
                                    <span className="text-[15px] font-mono font-bold text-slate-800 block mt-0.5 whitespace-nowrap">
                                      {formatMoney(item.creditLimit)}
                                    </span>
                                    <span className="text-[11px] text-slate-400 block mt-0.5">
                                      Tối đa {item.maxDebtDays || 30} ngày
                                    </span>
                                  </div>

                                  {/* Ô 2: Chưa quá hạn (Trong hạn) */}
                                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-2xs">
                                    <span className="text-xs font-semibold text-emerald-800 block">
                                      Chưa quá hạn
                                    </span>
                                    <span className="text-[15px] font-mono font-bold text-emerald-900 block mt-0.5 whitespace-nowrap">
                                      {item.currentInTerm > 0 ? formatMoney(item.currentInTerm) : '—'}
                                    </span>
                                    <span className="text-[11px] text-emerald-700 block mt-0.5">
                                      Trong hạn an toàn
                                    </span>
                                  </div>

                                  {/* Ô 3: Quá hạn 1–30 ngày */}
                                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-2xs">
                                    <span className="text-xs font-semibold text-amber-800 block">
                                      Quá hạn 1–30 ngày
                                    </span>
                                    <span className="text-[15px] font-mono font-bold text-amber-900 block mt-0.5 whitespace-nowrap">
                                      {item.age1To30 > 0 ? formatMoney(item.age1To30) : '—'}
                                    </span>
                                    <span className="text-[11px] text-amber-700 block mt-0.5">
                                      Mới quá hạn
                                    </span>
                                  </div>

                                  {/* Ô 4: Quá hạn 31–60 ngày */}
                                  <div className="bg-orange-50/70 p-3 rounded-xl border border-orange-200 shadow-2xs">
                                    <span className="text-xs font-semibold text-orange-800 block">
                                      Quá hạn 31–60 ngày
                                    </span>
                                    <span className="text-[15px] font-mono font-bold text-orange-900 block mt-0.5 whitespace-nowrap">
                                      {item.age31To60 > 0 ? formatMoney(item.age31To60) : '—'}
                                    </span>
                                    <span className="text-[11px] text-orange-700 block mt-0.5">
                                      Cần nhắc nợ
                                    </span>
                                  </div>

                                  {/* Ô 5: Quá hạn 61–90 ngày */}
                                  <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-2xs">
                                    <span className="text-xs font-semibold text-rose-800 block">
                                      Quá hạn 61–90 ngày
                                    </span>
                                    <span className="text-[15px] font-mono font-bold text-rose-900 block mt-0.5 whitespace-nowrap">
                                      {item.age61To90 > 0 ? formatMoney(item.age61To90) : '—'}
                                    </span>
                                    <span className="text-[11px] text-rose-700 block mt-0.5">
                                      Đôn đốc quyết liệt
                                    </span>
                                  </div>

                                  {/* Ô 6: Quá hạn > 90 ngày */}
                                  <div className="bg-red-50/80 p-3 rounded-xl border border-red-300 shadow-2xs">
                                    <span className="text-xs font-bold text-red-900 block">
                                      Quá hạn &gt; 90 ngày
                                    </span>
                                    <span className="text-[15px] font-mono font-bold text-red-950 block mt-0.5 whitespace-nowrap">
                                      {item.ageOver90 > 0 ? formatMoney(item.ageOver90) : '—'}
                                    </span>
                                    <span className="text-[11px] text-red-800 block mt-0.5 font-semibold">
                                      Nguy cơ nợ xấu
                                    </span>
                                  </div>
                                </div>

                                {/* Callout Căn Cứ Ưu Tiên Xử Lý Thực Tế */}
                                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs sm:text-[13px] text-amber-900">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <strong className="font-semibold text-amber-950">
                                      Căn cứ xác định mức ưu tiên xử lý:
                                    </strong>{' '}
                                    <span>{item.priorityReason || 'Trong hạn thanh toán hợp đồng'}</span>
                                    {item.overdueAmount > 0 && (
                                      <span className="block mt-0.5 text-amber-800">
                                        Khuyến nghị hành động:{' '}
                                        {item.priorityLevel === 'CRITICAL'
                                          ? 'Tạm dừng xuất hàng nợ mới, gửi biên bản đối chiếu khẩn và áp dụng biện pháp thu hồi nợ.'
                                          : item.priorityLevel === 'HIGH'
                                          ? 'Liên hệ trực tiếp giám đốc/kế toán đại lý, chốt kế hoạch trả góp trong tuần.'
                                          : 'Nhân viên kinh doanh theo dõi và thông báo đại lý trước ngày đến hạn.'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {/* Footer Chân Bảng: Khớp 5 cột chuẩn xác */}
                {summary && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 text-sm border-t-2 border-slate-300">
                      {/* 1. Tổng số đại lý */}
                      <td className="py-4 px-4 uppercase tracking-wider text-slate-800">
                        Tổng cộng ({summary.totalAgencies} đại lý)
                      </td>

                      {/* 2. Tổng dư nợ */}
                      <td className="py-4 px-4 text-right font-mono text-base font-bold text-slate-950 whitespace-nowrap">
                        {formatMoney(summary.remainingDebt)}
                      </td>

                      {/* 3. Tổng nợ quá hạn */}
                      <td className="py-4 px-4 text-right font-mono text-base font-bold text-rose-600 whitespace-nowrap">
                        {formatMoney(summary.totalOverdueAmount)}
                      </td>

                      {/* 4. Thống kê ưu tiên */}
                      <td className="py-4 px-4 text-xs sm:text-[13px] text-slate-600">
                        <span>{summary.overdueAgenciesCount} đại lý quá hạn</span>
                        <span className="block text-[11px] text-rose-600 font-semibold">
                          ({summary.criticalAgenciesCount} khẩn cấp)
                        </span>
                      </td>

                      {/* 5. Thao tác chân bảng */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={toggleAllDetails}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        >
                          {isAllExpanded ? 'Thu gọn hết' : 'Xem dải tuổi nợ'}
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* 3B. GIAO DIỆN DẠNG THẺ (CARD VIEW) CHO ĐIỆN THOẠI & TABLET (< 1024px) */}
            <div className="lg:hidden divide-y divide-slate-100">
              {reportData.map((item) => {
                const isExpanded = !!expandedRows[item.agencyId];
                const pColor = DEBT_PRIORITY_COLORS[item.priorityLevel || 'LOW'] || DEBT_PRIORITY_COLORS.LOW;

                return (
                  <div key={item.agencyId} className="p-4 space-y-3 bg-white">
                    {/* Header Thẻ: Tên, Mã, Badge Ưu tiên */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {item.agencyCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs font-bold border ${pColor.bg} ${pColor.border}`}
                          >
                            {item.priorityLabel || 'Bình thường'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {item.agencyName}
                        </h3>
                        <div className="text-[13px] text-slate-500 mt-1 flex flex-wrap gap-2">
                          <span>NV: <strong className="text-slate-700 font-medium">{item.salesRepName}</strong></span>
                          {item.phone && <span>• SĐT: {item.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Khối 2 ô số tiền lớn: 15-16px font-mono rõ ràng */}
                    <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs sm:text-sm">
                      <div>
                        <span className="text-slate-500 block text-xs font-medium">Tổng dư nợ:</span>
                        <span className="font-bold text-slate-900 font-mono text-base block mt-0.5 whitespace-nowrap">
                          {formatMoney(item.remainingDebt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-xs font-medium">Nợ quá hạn:</span>
                        <span
                          className={`font-bold font-mono text-base block mt-0.5 whitespace-nowrap ${
                            item.overdueAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          {item.overdueAmount > 0 ? formatMoney(item.overdueAmount) : '0 đ'}
                        </span>
                      </div>
                    </div>

                    {/* Căn cứ ưu tiên */}
                    <div className="text-xs sm:text-[13px] text-slate-600 bg-amber-50/60 border border-amber-100 p-2.5 rounded-lg">
                      <span className="font-semibold text-amber-900">Căn cứ: </span>
                      {item.priorityReason || 'Trong hạn thanh toán'}
                    </div>

                    {/* 2 Nút thao tác to rõ, dễ bấm trên mobile */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => toggleRowDetail(item.agencyId)}
                        className={`w-full py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-colors ${
                          isExpanded
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        <span>{isExpanded ? 'Đóng tuổi nợ' : 'Chi tiết tuổi nợ'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenLedger(item.agencyCode || item.agencyId)}
                        className="w-full py-2.5 px-3 text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Sổ chi tiết</span>
                      </button>
                    </div>

                    {/* Khối dải tuổi nợ chi tiết (Khi mở rộng trên mobile) */}
                    {isExpanded && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs animate-in fade-in duration-150">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 col-span-2">
                          <span className="text-slate-500 block text-[11px]">Hạn mức tín dụng:</span>
                          <span className="font-bold text-slate-900 font-mono text-sm">
                            {formatMoney(item.creditLimit)} (tối đa {item.maxDebtDays || 30} ngày)
                          </span>
                        </div>
                        <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                          <span className="text-emerald-800 block text-[11px] font-medium">Chưa quá hạn:</span>
                          <span className="font-bold text-emerald-950 font-mono text-sm">
                            {item.currentInTerm > 0 ? formatMoney(item.currentInTerm) : '—'}
                          </span>
                        </div>
                        <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                          <span className="text-amber-800 block text-[11px] font-medium">Quá hạn 1–30d:</span>
                          <span className="font-bold text-amber-950 font-mono text-sm">
                            {item.age1To30 > 0 ? formatMoney(item.age1To30) : '—'}
                          </span>
                        </div>
                        <div className="bg-orange-50/70 p-2.5 rounded-lg border border-orange-200">
                          <span className="text-orange-800 block text-[11px] font-medium">Quá hạn 31–60d:</span>
                          <span className="font-bold text-orange-950 font-mono text-sm">
                            {item.age31To60 > 0 ? formatMoney(item.age31To60) : '—'}
                          </span>
                        </div>
                        <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-200">
                          <span className="text-rose-800 block text-[11px] font-medium">Quá hạn 61–90d:</span>
                          <span className="font-bold text-rose-950 font-mono text-sm">
                            {item.age61To90 > 0 ? formatMoney(item.age61To90) : '—'}
                          </span>
                        </div>
                        <div className="bg-red-50/80 p-2.5 rounded-lg border border-red-200 col-span-2">
                          <span className="text-red-900 block text-[11px] font-bold">Quá hạn &gt; 90 ngày:</span>
                          <span className="font-bold text-red-950 font-mono text-sm">
                            {item.ageOver90 > 0 ? formatMoney(item.ageOver90) : '—'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Footer tổng hợp cho Mobile */}
              {summary && (
                <div className="p-4 bg-slate-100 border-t border-slate-200 space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center font-bold text-slate-800 uppercase">
                    <span>Tổng cộng ({summary.totalAgencies} đại lý):</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Tổng dư nợ:</span>
                    <span className="font-mono font-bold text-base text-slate-900">
                      {formatMoney(summary.remainingDebt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-rose-600 font-medium">Tổng nợ quá hạn:</span>
                    <span className="font-mono font-bold text-base text-rose-600">
                      {formatMoney(summary.totalOverdueAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 4. PHÂN TRANG (PAGINATION) - Hoạt động đồng bộ với bộ lọc */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <span className="text-slate-600 font-medium">
              Trang {currentPage} / {totalPages} (Tổng số {totalItems} đại lý)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
              >
                Trước
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pNum = currentPage - 2 + i;
                  if (pNum > totalPages) pNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-9 h-9 rounded-lg font-semibold transition-colors ${
                      currentPage === pNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
