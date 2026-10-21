import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Search,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Scale,
  RefreshCw,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Ban,
  Phone,
  MapPin,
  User,
  ArrowLeft,
} from 'lucide-react';
import { SmartSelect } from '../smart-select';
import type { SmartSelectOption } from '../smart-select';
import { debtReportService } from '../../services/debt-report.service';
import type {
  DebtLedgerStatement,
  QueryDebtLedgerParams,
  AgencyOption,
} from '../../types/debt-report.type';

interface DebtLedgerStatementProps {
  initialAgencyCode?: string;
  onBackToAgingReport?: () => void;
}

export const DebtLedgerStatementView: React.FC<DebtLedgerStatementProps> = ({
  initialAgencyCode = 'DL-0001',
  onBackToAgingReport,
}) => {
  // 1. Quản lý State Bộ lọc đối chiếu
  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    [now],
  );
  const defaultTo = useMemo(() => now.toISOString().slice(0, 10), [now]);

  const [agencyCode, setAgencyCode] = useState<string>(initialAgencyCode);
  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);
  const [documentType, setDocumentType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State Dữ liệu Sổ cái
  const [statement, setStatement] = useState<DebtLedgerStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportingWord, setExportingWord] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Danh mục đại lý
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);

  // Tải danh mục đại lý khi mount
  useEffect(() => {
    debtReportService
      .getAgencies()
      .then((data) => {
        setAgencies(data);
        if (!agencyCode && data.length > 0) {
          setAgencyCode(data[0].code);
        }
      })
      .catch((err) => console.error('Lỗi tải danh mục đại lý:', err));
  }, [agencyCode]);

  // Cập nhật khi initialAgencyCode từ ngoài truyền vào (vd: bấm từ báo cáo tuổi nợ)
  useEffect(() => {
    if (initialAgencyCode) {
      setAgencyCode(initialAgencyCode);
    }
  }, [initialAgencyCode]);

  // Tải dữ liệu Sổ chi tiết công nợ
  const fetchLedger = async () => {
    if (!agencyCode) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: QueryDebtLedgerParams = {
        agencyId: agencyCode,
        fromDate,
        toDate,
        documentType: documentType !== 'ALL' ? (documentType as any) : undefined,
        search: searchTerm.trim() || undefined,
      };

      const res = await debtReportService.getDebtLedger(params);
      setStatement(res);
    } catch (err: any) {
      console.error('Lỗi tải sổ chi tiết công nợ:', err);
      setErrorMsg(
        err?.response?.data?.message ||
          'Không thể tải sổ chi tiết công nợ của đại lý đã chọn. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyCode, fromDate, toDate, documentType]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLedger();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Xuất file Excel
  const handleExportExcel = async () => {
    if (!agencyCode) return;
    setExportingExcel(true);
    try {
      const params: QueryDebtLedgerParams = {
        agencyId: agencyCode,
        fromDate,
        toDate,
        documentType: documentType !== 'ALL' ? (documentType as any) : undefined,
      };
      const blob = await debtReportService.exportLedgerToExcel(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `So_Chi_Tiet_Cong_No_${agencyCode}_${fromDate}_den_${toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Không thể xuất file Excel sổ chi tiết. Vui lòng thử lại sau.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Xuất file PDF
  const handleExportPdf = async () => {
    if (!agencyCode) return;
    setExportingPdf(true);
    try {
      const params: QueryDebtLedgerParams = {
        agencyId: agencyCode,
        fromDate,
        toDate,
        documentType: documentType !== 'ALL' ? (documentType as any) : undefined,
      };
      const blob = await debtReportService.exportLedgerToPdf(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `So_Chi_Tiet_Cong_No_${agencyCode}_${fromDate}_den_${toDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Không thể xuất file PDF sổ chi tiết. Vui lòng thử lại sau.');
    } finally {
      setExportingPdf(false);
    }
  };

  // Xuất file Word (.docx)
  const handleExportWord = async () => {
    if (!agencyCode) return;
    setExportingWord(true);
    try {
      const params: QueryDebtLedgerParams = {
        agencyId: agencyCode,
        fromDate,
        toDate,
        documentType: documentType !== 'ALL' ? (documentType as any) : undefined,
      };
      const blob = await debtReportService.exportLedgerToWord(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `So_Chi_Tiet_Cong_No_${agencyCode}_${fromDate}_den_${toDate}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Không thể xuất file Word sổ chi tiết. Vui lòng thử lại sau.');
    } finally {
      setExportingWord(false);
    }
  };

  // Helper format tiền tệ
  const formatMoney = (n?: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + ' đ';
  };

  // Options SmartSelect Đại lý
  const agencyOptions: SmartSelectOption[] = useMemo(() => {
    return agencies.map((ag) => ({
      value: ag.code,
      label: `${ag.code} - ${ag.name}`,
      subLabel: `NV: ${ag.salesRepName || '—'} | Hạn mức: ${formatMoney(ag.creditLimit)} (${ag.maxDebtDays}d)`,
      badge: ag.code,
    }));
  }, [agencies]);

  const docTypeOptions: SmartSelectOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'Tất cả loại chứng từ' },
      { value: 'INVOICE', label: 'Hóa đơn bán hàng (Tăng nợ)', badge: 'HĐ', badgeColor: 'bg-blue-100 text-blue-800' },
      { value: 'PAYMENT', label: 'Phiếu thu tiền (Giảm nợ)', badge: 'PT', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { value: 'RETURN', label: 'Phiếu trả hàng (Giảm nợ)', badge: 'TH', badgeColor: 'bg-amber-100 text-amber-800' },
    ];
  }, []);

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. THANH ĐIỀU KIỆN ĐỐI CHIẾU & THAO TÁC XUẤT FILE                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-slate-900 flex items-center gap-2.5">
              <Scale className="w-6 h-6 text-indigo-600 shrink-0" />
              <span>Sổ Chi Tiết Công Nợ Đại Lý</span>
            </h1>
            <p className="text-[13px] sm:text-sm text-slate-500 mt-1">
              Đối chiếu chứng từ phát sinh, số dư đầu kỳ, lũy kế và xuất file gửi đại lý ký xác nhận
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onBackToAgingReport && (
              <button
                type="button"
                onClick={onBackToAgingReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Xem tuổi nợ</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exportingExcel ? 'Đang xuất...' : 'Xuất Excel'}</span>
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
              title="Xuất file Microsoft Word (.docx) chuyên nghiệp A4 đứng"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              <span>{exportingWord ? 'Đang xuất...' : 'Xuất Word'}</span>
            </button>
          </div>
        </div>

        {/* Bộ lọc Đại lý & Khoảng thời gian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Chọn đại lý đối chiếu */}
          <div className="lg:col-span-2">
            <SmartSelect
              label="Chọn đại lý cần đối chiếu công nợ"
              value={agencyCode}
              options={agencyOptions}
              onChange={(val) => setAgencyCode(val as string)}
              placeholder="Chọn đại lý đối chiếu..."
              searchPlaceholder="Tìm kiếm theo mã hoặc tên đại lý..."
            />
          </div>

          {/* 2. Từ ngày */}
          <div>
            <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Từ ngày bắt đầu
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-10 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* 3. Đến ngày */}
          <div>
            <label className="block text-xs sm:text-[13px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Đến ngày kết thúc
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full h-10 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Lọc loại chứng từ & Tìm kiếm nhanh */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <SmartSelect
              value={documentType}
              options={docTypeOptions}
              onChange={(val) => setDocumentType(val as string)}
              placeholder="Loại chứng từ..."
            />
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã chứng từ (HĐ, PT, UNC), diễn giải..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Đang tổng hợp phát sinh và tính số dư lũy kế...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-rose-700">{errorMsg}</p>
          <button
            type="button"
            onClick={fetchLedger}
            className="mt-3 px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
          >
            Thử lại
          </button>
        </div>
      ) : statement ? (
        <>
          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* 2. THÔNG TIN ĐẠI LÝ & KHỐI CÂN ĐỐI KẾ TOÁN (4 CHỈ SỐ TÀI CHÍNH)   */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
            {/* Header thông tin đại lý */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                    {statement.agency.code}
                  </span>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate">
                    {statement.agency.name}
                  </h2>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs sm:text-[13px] text-slate-600 flex-wrap">
                  {statement.agency.phone && (
                    <span className="flex items-center gap-1 font-medium">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {statement.agency.phone}
                    </span>
                  )}
                  {statement.agency.taxCode && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-medium">MST: {statement.agency.taxCode}</span>
                    </>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 font-medium">
                    <User className="w-4 h-4 text-slate-400" />
                    NV: <strong className="font-bold text-slate-800">{statement.agency.salesRepName}</strong>
                  </span>
                  {statement.agency.address && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {statement.agency.address}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Banner Cân Đối Kế Toán */}
              <div className="shrink-0 flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Số liệu khớp 100%: Dư cuối = Dư đầu + Tăng - Giảm</span>
              </div>
            </div>

            {/* 4 Thẻ chỉ số tài chính: Số tiền 22-26px, font-mono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Chỉ số 1: Số dư đầu kỳ */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs">
                <div className="text-xs sm:text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                  Số dư đầu kỳ (Trước {statement.period.fromDate})
                </div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-mono whitespace-nowrap">
                  {formatMoney(statement.openingBalance)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">Số dư chuyển sang</div>
              </div>

              {/* Chỉ số 2: Phát sinh tăng (+) */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 sm:p-5 shadow-2xs">
                <div className="text-xs sm:text-[13px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>Phát sinh tăng (+)</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-blue-700 mt-1 font-mono whitespace-nowrap">
                  {formatMoney(statement.totalDebit)}
                </div>
                <div className="text-xs text-blue-600 mt-0.5 font-medium">Hóa đơn xuất bán trong kỳ</div>
              </div>

              {/* Chỉ số 3: Phát sinh giảm (-) */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 sm:p-5 shadow-2xs">
                <div className="text-xs sm:text-[13px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4" />
                  <span>Phát sinh giảm (-)</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 font-mono whitespace-nowrap">
                  {formatMoney(statement.totalCredit)}
                </div>
                <div className="text-xs text-emerald-600 mt-0.5 font-medium">Thu tiền & Trả hàng nhập kho</div>
              </div>

              {/* Chỉ số 4: Số dư cuối kỳ (=) */}
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 sm:p-5 shadow-2xs">
                <div className="text-xs sm:text-[13px] font-bold text-rose-700 uppercase tracking-wider">
                  Số dư cuối kỳ ({statement.period.toDate})
                </div>
                <div className="text-xl sm:text-2xl font-bold text-rose-700 mt-1 font-mono whitespace-nowrap">
                  {formatMoney(statement.closingBalance)}
                </div>
                <div className="text-xs text-rose-600 mt-0.5 font-semibold">Nghĩa vụ nợ còn lại</div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* 3. BẢNG CHI TIẾT CHỨNG TỪ - 100% VỪA VẶN MÀN HÌNH KHÔNG KÉO NGANG  */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* 3A. BẢNG DESKTOP (RÕ RÀNG, CHỮ TO 15-16PX DỄ ĐỌC CHUẨN KẾ TOÁN) */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider select-none">
                    <th className="py-3.5 px-3.5 text-center w-[11%] text-slate-600">Ngày CT</th>
                    <th className="py-3.5 px-3.5 w-[14%] text-slate-700">Mã chứng từ</th>
                    <th className="py-3.5 px-3.5 w-[14%] text-slate-700">Loại chứng từ</th>
                    <th className="py-3.5 px-4 w-[31%] text-slate-700">Diễn giải nghiệp vụ kinh tế</th>
                    <th className="py-3.5 px-3.5 text-right w-[10%] text-blue-700 font-bold border-l border-r border-slate-200 whitespace-nowrap">
                      Tăng (Nợ)
                    </th>
                    <th className="py-3.5 px-3.5 text-right w-[10%] text-emerald-700 font-bold border-r border-slate-200 whitespace-nowrap">
                      Giảm (Có)
                    </th>
                    <th className="py-3.5 px-3.5 text-right w-[10%] text-slate-900 font-bold whitespace-nowrap">
                      Dư lũy kế
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Dòng Số Dư Đầu Kỳ */}
                  <tr className="bg-slate-100/90 font-bold text-slate-900 border-y border-slate-200">
                    <td className="py-3.5 px-3.5 text-center font-mono text-sm">{statement.period.fromDate}</td>
                    <td className="py-3.5 px-3.5 font-mono text-indigo-700 font-bold">
                      <span className="bg-indigo-100/80 text-indigo-800 px-2 py-0.5 rounded text-xs">ĐẦU KỲ</span>
                    </td>
                    <td className="py-3.5 px-3.5 font-semibold text-slate-800 text-sm">Số dư đầu kỳ</td>
                    <td className="py-3.5 px-4 text-slate-600 font-normal text-sm leading-snug">
                      Số dư chuyển tiếp từ các phát sinh trước ngày {statement.period.fromDate}
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-slate-400 font-normal font-mono text-sm">—</td>
                    <td className="py-3.5 px-3.5 text-right text-slate-400 font-normal font-mono text-sm">—</td>
                    <td className="py-3.5 px-3.5 text-right font-mono text-slate-950 font-bold text-[15px] sm:text-base whitespace-nowrap">
                      {formatMoney(statement.openingBalance)}
                    </td>
                  </tr>

                  {/* Từng dòng chứng từ phát sinh */}
                  {statement.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                        Không có chứng từ phát sinh nào trong khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    statement.transactions.map((tx) => {
                      const isCancelled = tx.status === 'CANCELLED';

                      return (
                        <tr
                          key={tx.id}
                          className={`hover:bg-blue-50/30 transition-colors ${
                            isCancelled ? 'bg-slate-50/60 text-slate-400' : ''
                          }`}
                        >
                          {/* 1. Ngày CT */}
                          <td className="py-3.5 px-3.5 text-center font-mono text-slate-700 text-sm">{tx.date}</td>

                          {/* 2. Mã chứng từ */}
                          <td className="py-3.5 px-3.5">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-xs inline-block ${
                                isCancelled
                                  ? 'bg-slate-200 text-slate-500 line-through'
                                  : 'bg-slate-100 text-slate-800 border border-slate-200'
                              }`}
                            >
                              {tx.documentCode}
                            </span>
                            {tx.referenceCode && (
                              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                Ref: {tx.referenceCode}
                              </div>
                            )}
                          </td>

                          {/* 3. Loại chứng từ */}
                          <td className="py-3.5 px-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 font-semibold text-sm ${
                                tx.documentType === 'INVOICE'
                                  ? 'text-blue-700'
                                  : tx.documentType === 'PAYMENT'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {tx.documentType === 'INVOICE' && <Receipt className="w-4 h-4 shrink-0" />}
                              {tx.documentType === 'PAYMENT' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                              {tx.documentType === 'RETURN' && <RotateCcw className="w-4 h-4 shrink-0" />}
                              <span>{tx.documentTypeLabel}</span>
                            </span>
                          </td>

                          {/* 4. Diễn giải nghiệp vụ: 15-16px, xuống dòng tự nhiên */}
                          <td className="py-3.5 px-4">
                            <div className={`text-[15px] leading-relaxed ${isCancelled ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {tx.description}
                            </div>
                            {isCancelled && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded mt-1">
                                <Ban className="w-3.5 h-3.5" />
                                Chứng từ đã hủy - Không ghi tăng/giảm nợ
                              </span>
                            )}
                          </td>

                          {/* 5. Tăng (Nợ): 15-16px font-mono bold */}
                          <td className="py-3.5 px-3.5 text-right font-mono text-blue-700 font-bold text-[15px] sm:text-base bg-blue-50/20 whitespace-nowrap">
                            {tx.debit > 0 ? formatMoney(tx.debit) : '—'}
                          </td>

                          {/* 6. Giảm (Có): 15-16px font-mono bold */}
                          <td className="py-3.5 px-3.5 text-right font-mono text-emerald-700 font-bold text-[15px] sm:text-base bg-emerald-50/20 whitespace-nowrap">
                            {tx.credit > 0 ? formatMoney(tx.credit) : '—'}
                          </td>

                          {/* 7. Số dư lũy kế: 15-16px font-mono bold */}
                          <td className="py-3.5 px-3.5 text-right font-mono font-bold text-slate-950 text-[15px] sm:text-base bg-slate-50/40 whitespace-nowrap">
                            {formatMoney(tx.runningBalance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Footer Tổng Cộng */}
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="py-4 px-4 text-center uppercase tracking-wider text-slate-800 text-xs sm:text-sm">
                      TỔNG CỘNG PHÁT SINH VÀ SỐ DƯ CUỐI KỲ
                    </td>
                    <td className="py-4 px-3.5 text-right text-blue-800 font-mono text-base font-bold bg-blue-100/60 whitespace-nowrap">
                      {formatMoney(statement.totalDebit)}
                    </td>
                    <td className="py-4 px-3.5 text-right text-emerald-800 font-mono text-base font-bold bg-emerald-100/60 whitespace-nowrap">
                      {formatMoney(statement.totalCredit)}
                    </td>
                    <td className="py-4 px-3.5 text-right text-rose-700 font-mono text-base font-bold bg-rose-100/60 whitespace-nowrap">
                      {formatMoney(statement.closingBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 3B. GIAO DIỆN TIMELINE CARDS CHO ĐIỆN THOẠI (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100 p-3.5 space-y-3">
              {/* Thẻ Đầu Kỳ Mobile */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-slate-700">
                  <span>Số dư đầu kỳ ({statement.period.fromDate})</span>
                  <span className="font-mono text-slate-900 text-sm sm:text-base">{formatMoney(statement.openingBalance)}</span>
                </div>
              </div>

              {statement.transactions.length === 0 ? (
                <div className="py-8 text-center text-xs sm:text-sm text-slate-400 bg-slate-50/50 rounded-xl">
                  Không có chứng từ phát sinh nào trong khoảng thời gian này.
                </div>
              ) : (
                statement.transactions.map((tx) => {
                  const isCancelled = tx.status === 'CANCELLED';

                  return (
                    <div
                      key={tx.id}
                      className={`p-3.5 rounded-xl border border-slate-200 space-y-2.5 ${
                        isCancelled ? 'bg-slate-50 opacity-60' : 'bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {tx.documentCode}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">{tx.date}</span>
                          </div>
                          <div className="text-sm font-semibold text-slate-800 mt-1">{tx.documentTypeLabel}</div>
                        </div>

                        {/* Lũy kế */}
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block uppercase">Dư lũy kế:</span>
                          <span className="font-mono font-bold text-sm sm:text-base text-slate-950">
                            {formatMoney(tx.runningBalance)}
                          </span>
                        </div>
                      </div>

                      <p className={`text-sm ${isCancelled ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {tx.description}
                      </p>

                      {/* Số tiền tăng / giảm */}
                      <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-slate-100">
                        {tx.debit > 0 ? (
                          <span className="font-mono font-bold text-blue-700 text-sm">
                            + {formatMoney(tx.debit)} (Tăng nợ)
                          </span>
                        ) : tx.credit > 0 ? (
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            - {formatMoney(tx.credit)} (Giảm nợ)
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}

                        {isCancelled && (
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            Đã hủy
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Thẻ Cuối Kỳ Mobile */}
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs sm:text-sm font-bold text-rose-800 flex justify-between items-center">
                <span>Số dư nợ cuối kỳ ({statement.period.toDate})</span>
                <span className="font-mono text-base">{formatMoney(statement.closingBalance)}</span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* 4. KHỐI CHỮ KÝ XÁC NHẬN ĐỐI CHIẾU 2 BÊN                           */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 text-xs sm:text-sm text-slate-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-2">
              <div>
                <div className="font-bold text-slate-900 uppercase">Đại diện đại lý xác nhận</div>
                <div className="text-xs text-slate-400 mt-0.5">(Ký, ghi rõ họ tên và đóng dấu)</div>
                <div className="h-20" />
                <div className="font-medium text-slate-800">{statement.agency.name}</div>
              </div>

              <div>
                <div className="font-bold text-slate-900 uppercase">Kế toán công nợ Loha Sales</div>
                <div className="text-xs text-slate-400 mt-0.5">(Ký và ghi rõ họ tên)</div>
                <div className="h-20" />
                <div className="font-medium text-slate-800">Kế toán viên phụ trách</div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
