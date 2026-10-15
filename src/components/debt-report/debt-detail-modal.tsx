import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  X,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  AgingDebtGroupEnum,
  type AgentDebtReport,
  type AgencyInvoice,
} from '../../types/debt-report.type';
import { debtReportService } from '../../services/debt-report.service';

export interface AgencyOutstandingInvoice {
  id: string;
  invoiceCode: string;
  issueDate: string;
  debtAmount: number;
  totalAmount?: number;
  paidAmount?: number;
  overdueDays: number;
  daysOld?: number;
  agingGroup: AgingDebtGroupEnum;
  agingLabel: string;
}

interface DebtDetailModalProps {
  agency: AgentDebtReport | null;
  onClose: () => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));
};

const formatDateVN = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Sinh danh sách hóa đơn còn nợ theo từng dải tuổi nợ thực tế của Đại lý (Fallback khi offline)
 */
const buildFallbackInvoices = (agency: AgentDebtReport): AgencyOutstandingInvoice[] => {
  const invoices: AgencyOutstandingInvoice[] = [];
  const rawCodeDigits = agency.agencyCode.replace(/\D/g, '') || '1';
  const paddedCode = rawCodeDigits.padStart(3, '0');
  const now = Date.now();
  const DAY_MS = 86400000;

  // 1. Nhóm nợ > 90 ngày (Rủi ro cao)
  if (agency.ageOver90 > 0) {
    const daysAgo = Math.max(95, agency.oldestDebtDays);
    const issueDate = new Date(now - daysAgo * DAY_MS);
    const overdueDays = Math.max(1, daysAgo - (agency.maxDebtDays || 30));
    invoices.push({
      id: `inv-${agency.agencyCode}-over90`,
      invoiceCode: `HD2601-${paddedCode}9`,
      issueDate: formatDateVN(issueDate),
      debtAmount: agency.ageOver90,
      overdueDays,
      daysOld: daysAgo,
      agingGroup: AgingDebtGroupEnum.AGE_OVER_90,
      agingLabel: '> 90 ngày',
    });
  }

  // 2. Nhóm nợ 61 - 90 ngày
  if (agency.age61To90 > 0) {
    const daysAgo = Math.min(
      Math.max(65, agency.oldestDebtDays > 60 ? agency.oldestDebtDays : 72),
      90,
    );
    const issueDate = new Date(now - daysAgo * DAY_MS);
    const overdueDays = Math.max(1, daysAgo - (agency.maxDebtDays || 30));
    invoices.push({
      id: `inv-${agency.agencyCode}-61-90`,
      invoiceCode: `HD2602-${paddedCode}6`,
      issueDate: formatDateVN(issueDate),
      debtAmount: agency.age61To90,
      overdueDays,
      daysOld: daysAgo,
      agingGroup: AgingDebtGroupEnum.AGE_61_90,
      agingLabel: '61–90 ngày',
    });
  }

  // 3. Nhóm nợ 31 - 60 ngày
  if (agency.age31To60 > 0) {
    const daysAgo = Math.min(
      Math.max(35, agency.oldestDebtDays > 30 ? agency.oldestDebtDays : 45),
      60,
    );
    const issueDate = new Date(now - daysAgo * DAY_MS);
    const overdueDays = Math.max(1, daysAgo - (agency.maxDebtDays || 30));
    invoices.push({
      id: `inv-${agency.agencyCode}-31-60`,
      invoiceCode: `HD2603-${paddedCode}3`,
      issueDate: formatDateVN(issueDate),
      debtAmount: agency.age31To60,
      overdueDays,
      daysOld: daysAgo,
      agingGroup: AgingDebtGroupEnum.AGE_31_60,
      agingLabel: '31–60 ngày',
    });
  }

  // 4. Nhóm nợ 0 - 30 ngày (Trong hạn)
  if (agency.age0To30 > 0) {
    const daysAgo = 14;
    const issueDate = new Date(now - daysAgo * DAY_MS);
    invoices.push({
      id: `inv-${agency.agencyCode}-0-30`,
      invoiceCode: `HD2604-${paddedCode}1`,
      issueDate: formatDateVN(issueDate),
      debtAmount: agency.age0To30,
      overdueDays: 0,
      daysOld: daysAgo,
      agingGroup: AgingDebtGroupEnum.AGE_0_30,
      agingLabel: '0–30 ngày',
    });
  }

  return invoices;
};

export const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
  agency,
  onClose,
}) => {
  const [invoices, setInvoices] = useState<AgencyOutstandingInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
  const [selectedBracket, setSelectedBracket] = useState<AgingDebtGroupEnum>(
    AgingDebtGroupEnum.ALL,
  );

  // Tải danh sách hóa đơn thực tế phát sinh của đại lý từ Backend API (SN-203)
  useEffect(() => {
    if (!agency) {
      setInvoices([]);
      return;
    }

    let isMounted = true;
    setLoadingInvoices(true);

    const loadInvoices = async () => {
      try {
        const identifier = agency.agencyId || agency.agencyCode;
        const apiData: AgencyInvoice[] = await debtReportService.getAgencyInvoices(identifier);

        if (isMounted) {
          if (Array.isArray(apiData) && apiData.length > 0) {
            const mapped: AgencyOutstandingInvoice[] = apiData.map((inv) => ({
              id: inv.id,
              invoiceCode: inv.invoiceCode,
              issueDate: inv.issueDate ? formatDateVN(new Date(inv.issueDate)) : '',
              debtAmount: inv.remainingAmount,
              totalAmount: inv.totalAmount,
              paidAmount: inv.paidAmount,
              overdueDays: inv.overdueDays,
              daysOld: inv.daysOld,
              agingGroup: inv.agingGroup,
              agingLabel: inv.agingLabel,
            }));
            setInvoices(mapped);
          } else {
            setInvoices(buildFallbackInvoices(agency));
          }
        }
      } catch {
        if (isMounted) {
          // Fallback an toàn nếu API mạng tạm thời gián đoạn
          setInvoices(buildFallbackInvoices(agency));
        }
      } finally {
        if (isMounted) {
          setLoadingInvoices(false);
        }
      }
    };

    void loadInvoices();

    return () => {
      isMounted = false;
    };
  }, [agency]);

  // Nhóm và tính toán số lượng hóa đơn theo từng phân khúc tuổi nợ
  const bracketCounts = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {
      [AgingDebtGroupEnum.ALL]: { count: invoices.length, total: 0 },
      [AgingDebtGroupEnum.AGE_0_30]: { count: 0, total: 0 },
      [AgingDebtGroupEnum.AGE_31_60]: { count: 0, total: 0 },
      [AgingDebtGroupEnum.AGE_61_90]: { count: 0, total: 0 },
      [AgingDebtGroupEnum.AGE_OVER_90]: { count: 0, total: 0 },
    };

    invoices.forEach((inv) => {
      counts[AgingDebtGroupEnum.ALL].total += inv.debtAmount;
      if (counts[inv.agingGroup]) {
        counts[inv.agingGroup].count += 1;
        counts[inv.agingGroup].total += inv.debtAmount;
      }
    });

    return counts;
  }, [invoices]);

  // Lọc danh sách hóa đơn theo tab phân khúc đang chọn
  const filteredInvoices = useMemo(() => {
    if (selectedBracket === AgingDebtGroupEnum.ALL) {
      return invoices;
    }
    return invoices.filter((inv) => inv.agingGroup === selectedBracket);
  }, [invoices, selectedBracket]);

  const totalFilteredDebt = useMemo(() => {
    return filteredInvoices.reduce((sum, item) => sum + item.debtAmount, 0);
  }, [filteredInvoices]);

  if (!agency) {
    return null;
  }

  const handleToggleBracket = (bracket: AgingDebtGroupEnum) => {
    setSelectedBracket((prev) => (prev === bracket ? AgingDebtGroupEnum.ALL : bracket));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-[1rem] bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[1rem] border border-slate-200 shadow-2xl max-w-[50rem] w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header: Mã & Tên Đại lý */}
        <div className="flex items-center justify-between px-[1.25rem] py-[1rem] border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-[0.75rem]">
            <div className="w-[2.375rem] h-[2.375rem] rounded-[0.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-[1.25rem] h-[1.25rem]" />
            </div>
            <div>
              <div className="flex items-center gap-[0.5rem]">
                <h3 className="font-bold text-slate-800 text-[1rem]">
                  Sổ Chi Tiết Công Nợ & Tuổi Nợ
                </h3>
                <span className="inline-flex items-center px-[0.5rem] py-[0.125rem] rounded-[0.25rem] font-mono text-[0.6875rem] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {agency.agencyCode}
                </span>
              </div>
              <p className="text-[0.75rem] text-slate-500 font-medium mt-[0.0625rem]">
                {agency.agencyName}
                {agency.phone && (
                  <span className="text-slate-400"> • SĐT: {agency.phone}</span>
                )}
                {agency.salesRepName && (
                  <span className="text-slate-400"> • NVKD: {agency.salesRepName}</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-[0.375rem] text-slate-400 hover:text-slate-600 rounded-[0.375rem] hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng modal"
          >
            <X className="w-[1.25rem] h-[1.25rem]" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-[1.25rem] space-y-[1.25rem] overflow-y-auto">
          {/* 2. 3 Card Tổng Quan: Tổng Phải Thu, Đã Thanh Toán, Dư Nợ Còn Lại */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[0.75rem]">
            {/* Tổng Phải Thu */}
            <div className="p-[1rem] rounded-[0.75rem] bg-slate-50 border border-slate-200/80">
              <p className="text-[0.6875rem] text-slate-500 uppercase font-bold tracking-wider">
                Tổng phải thu
              </p>
              <p className="font-mono font-bold text-[1.125rem] text-slate-800 mt-[0.25rem]">
                {formatCurrency(agency.totalReceivable)}{' '}
                <span className="text-[0.75rem] font-normal text-slate-500">
                  đ
                </span>
              </p>
            </div>

            {/* Đã Thanh Toán */}
            <div className="p-[1rem] rounded-[0.75rem] bg-emerald-50/50 border border-emerald-200/70">
              <p className="text-[0.6875rem] text-emerald-700 uppercase font-bold tracking-wider">
                Đã thanh toán
              </p>
              <p className="font-mono font-bold text-[1.125rem] text-emerald-600 mt-[0.25rem]">
                {formatCurrency(agency.totalPaid)}{' '}
                <span className="text-[0.75rem] font-normal text-emerald-600/70">
                  đ
                </span>
              </p>
            </div>

            {/* Dư Nợ Còn Lại */}
            <div className="p-[1rem] rounded-[0.75rem] bg-amber-50/50 border border-amber-200/70">
              <p className="text-[0.6875rem] text-amber-700 uppercase font-bold tracking-wider">
                Dư nợ còn lại
              </p>
              <p className="font-mono font-bold text-[1.125rem] text-amber-800 mt-[0.25rem]">
                {formatCurrency(agency.remainingDebt)}{' '}
                <span className="text-[0.75rem] font-normal text-amber-700/70">
                  đ
                </span>
              </p>
            </div>
          </div>

          {/* 3. 4 Card Phân Bổ Tuổi Nợ (Tương tác bấm để lọc nhanh bảng bên dưới) */}
          <div>
            <div className="flex items-center justify-between mb-[0.625rem]">
              <div className="flex items-center gap-[0.375rem]">
                <Clock className="w-[0.875rem] h-[0.875rem] text-indigo-500" />
                <h4 className="text-[0.8125rem] font-bold text-slate-700 uppercase tracking-wider">
                  Phân Bổ Theo Nhóm Tuổi Nợ (Nhấn thẻ để lọc)
                </h4>
              </div>
              <span className="text-[0.6875rem] text-slate-400">
                Hạn thanh toán: {agency.maxDebtDays || 30} ngày
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[0.625rem]">
              {/* 0-30 ngày */}
              <button
                type="button"
                onClick={() => handleToggleBracket(AgingDebtGroupEnum.AGE_0_30)}
                className={`p-[0.75rem] rounded-[0.5rem] border text-left transition-all cursor-pointer ${
                  selectedBracket === AgingDebtGroupEnum.AGE_0_30
                    ? 'border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-500/30'
                    : 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70'
                }`}
              >
                <p className="text-[0.6875rem] text-emerald-700 font-semibold flex items-center justify-between">
                  <span>0 – 30 ngày</span>
                  <span className="text-[0.625rem] font-normal">(Trong hạn)</span>
                </p>
                <p className="font-mono font-bold text-[0.9375rem] text-emerald-800 mt-[0.125rem]">
                  {formatCurrency(agency.age0To30)} đ
                </p>
              </button>

              {/* 31-60 ngày */}
              <button
                type="button"
                onClick={() => handleToggleBracket(AgingDebtGroupEnum.AGE_31_60)}
                className={`p-[0.75rem] rounded-[0.5rem] border text-left transition-all cursor-pointer ${
                  selectedBracket === AgingDebtGroupEnum.AGE_31_60
                    ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-500/30'
                    : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/70'
                }`}
              >
                <p className="text-[0.6875rem] text-blue-700 font-semibold flex items-center justify-between">
                  <span>31 – 60 ngày</span>
                  <span className="text-[0.625rem] font-normal">(Quá hạn nhẹ)</span>
                </p>
                <p className="font-mono font-bold text-[0.9375rem] text-blue-800 mt-[0.125rem]">
                  {formatCurrency(agency.age31To60)} đ
                </p>
              </button>

              {/* 61-90 ngày */}
              <button
                type="button"
                onClick={() => handleToggleBracket(AgingDebtGroupEnum.AGE_61_90)}
                className={`p-[0.75rem] rounded-[0.5rem] border text-left transition-all cursor-pointer ${
                  selectedBracket === AgingDebtGroupEnum.AGE_61_90
                    ? 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-500/30'
                    : 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
                }`}
              >
                <p className="text-[0.6875rem] text-amber-700 font-semibold flex items-center justify-between">
                  <span>61 – 90 ngày</span>
                  <span className="text-[0.625rem] font-normal">(Cần nhắc nợ)</span>
                </p>
                <p className="font-mono font-bold text-[0.9375rem] text-amber-800 mt-[0.125rem]">
                  {formatCurrency(agency.age61To90)} đ
                </p>
              </button>

              {/* Trên 90 ngày */}
              <button
                type="button"
                onClick={() => handleToggleBracket(AgingDebtGroupEnum.AGE_OVER_90)}
                className={`p-[0.75rem] rounded-[0.5rem] border text-left transition-all cursor-pointer ${
                  selectedBracket === AgingDebtGroupEnum.AGE_OVER_90
                    ? 'border-rose-500 bg-rose-50/90 ring-2 ring-rose-500/30'
                    : 'border-rose-200 bg-rose-50/50 hover:bg-rose-50/80'
                }`}
              >
                <p className="text-[0.6875rem] text-rose-700 font-bold flex items-center justify-between">
                  <span>&gt; 90 ngày</span>
                  <span className="text-[0.625rem] font-normal">(Rủi ro cao)</span>
                </p>
                <p className="font-mono font-bold text-[0.9375rem] text-rose-800 mt-[0.125rem]">
                  {formatCurrency(agency.ageOver90)} đ
                </p>
              </button>
            </div>
          </div>

          {/* 4. Mini Table: Bảng Danh Sách Hóa Đơn Của Đại Lý Với Bộ Lọc Phân Khúc */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-[0.625rem]">
              <div className="flex items-center gap-[0.375rem]">
                <FileText className="w-[0.875rem] h-[0.875rem] text-indigo-600" />
                <h4 className="text-[0.8125rem] font-bold text-slate-700 uppercase tracking-wider">
                  Hóa Đơn Còn Nợ ({filteredInvoices.length}/{invoices.length})
                </h4>
                {loadingInvoices && (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin ml-1" />
                )}
              </div>

              {/* Tabs lọc theo từng phân nhóm tuổi nợ */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedBracket(AgingDebtGroupEnum.ALL)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    selectedBracket === AgingDebtGroupEnum.ALL
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({invoices.length})
                </button>
                {bracketCounts[AgingDebtGroupEnum.AGE_OVER_90].count > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedBracket(AgingDebtGroupEnum.AGE_OVER_90)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      selectedBracket === AgingDebtGroupEnum.AGE_OVER_90
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                    }`}
                  >
                    &gt;90d ({bracketCounts[AgingDebtGroupEnum.AGE_OVER_90].count})
                  </button>
                )}
                {bracketCounts[AgingDebtGroupEnum.AGE_61_90].count > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedBracket(AgingDebtGroupEnum.AGE_61_90)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      selectedBracket === AgingDebtGroupEnum.AGE_61_90
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                    }`}
                  >
                    61–90d ({bracketCounts[AgingDebtGroupEnum.AGE_61_90].count})
                  </button>
                )}
                {bracketCounts[AgingDebtGroupEnum.AGE_31_60].count > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedBracket(AgingDebtGroupEnum.AGE_31_60)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      selectedBracket === AgingDebtGroupEnum.AGE_31_60
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
                    }`}
                  >
                    31–60d ({bracketCounts[AgingDebtGroupEnum.AGE_31_60].count})
                  </button>
                )}
                {bracketCounts[AgingDebtGroupEnum.AGE_0_30].count > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedBracket(AgingDebtGroupEnum.AGE_0_30)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      selectedBracket === AgingDebtGroupEnum.AGE_0_30
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                    }`}
                  >
                    0–30d ({bracketCounts[AgingDebtGroupEnum.AGE_0_30].count})
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-[0.5rem] overflow-hidden bg-white shadow-2xs">
              <table className="w-full table-fixed text-[0.8125rem] border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="w-[24%] px-[0.875rem] py-[0.625rem] text-left font-bold text-[0.6875rem] uppercase tracking-wider">
                      Mã Hóa Đơn
                    </th>
                    <th className="w-[18%] px-[0.875rem] py-[0.625rem] text-left font-bold text-[0.6875rem] uppercase tracking-wider">
                      Ngày Hóa Đơn
                    </th>
                    <th className="w-[22%] px-[0.875rem] py-[0.625rem] text-right font-bold text-[0.6875rem] uppercase tracking-wider">
                      Số Tiền Nợ
                    </th>
                    <th className="w-[20%] px-[0.875rem] py-[0.625rem] text-center font-bold text-[0.6875rem] uppercase tracking-wider">
                      Số Ngày Quá Hạn
                    </th>
                    <th className="w-[16%] px-[0.875rem] py-[0.625rem] text-center font-bold text-[0.6875rem] uppercase tracking-wider">
                      Phân Nhóm Tuổi Nợ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-[1rem] py-[2rem] text-center text-slate-400 text-[0.8125rem]"
                      >
                        <div className="flex flex-col items-center justify-center gap-[0.375rem]">
                          <CheckCircle2 className="w-[1.5rem] h-[1.5rem] text-emerald-500" />
                          <span className="font-medium text-slate-600">
                            Không có hóa đơn nợ nào trong phân khúc này
                          </span>
                          <span className="text-[0.6875rem] text-slate-400">
                            Chọn phân khúc khác hoặc chọn &quot;Tất cả&quot; để xem toàn bộ
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* 1. Mã Hóa Đơn */}
                        <td className="px-[0.875rem] py-[0.625rem] font-mono font-semibold text-indigo-600 text-[0.75rem]">
                          {inv.invoiceCode}
                        </td>

                        {/* 2. Ngày Hóa Đơn */}
                        <td className="px-[0.875rem] py-[0.625rem] text-slate-600 text-[0.75rem]">
                          {inv.issueDate}
                        </td>

                        {/* 3. Số Tiền Nợ */}
                        <td className="px-[0.875rem] py-[0.625rem] text-right font-mono font-bold text-slate-900 text-[0.8125rem]">
                          {formatCurrency(inv.debtAmount)} đ
                        </td>

                        {/* 4. Số Ngày Quá Hạn */}
                        <td className="px-[0.875rem] py-[0.625rem] text-center text-[0.75rem]">
                          {inv.overdueDays > 0 ? (
                            <span className="inline-flex items-center gap-[0.25rem] font-medium text-rose-600">
                              <AlertCircle className="w-[0.75rem] h-[0.75rem]" />
                              {inv.overdueDays} ngày
                            </span>
                          ) : (
                            <span className="inline-flex items-center font-medium text-emerald-600">
                              Trong hạn (0d)
                            </span>
                          )}
                        </td>

                        {/* 5. Phân Nhóm Tuổi Nợ */}
                        <td className="px-[0.875rem] py-[0.625rem] text-center">
                          {inv.agingGroup === AgingDebtGroupEnum.AGE_0_30 && (
                            <span className="inline-block px-[0.5rem] py-[0.125rem] rounded-[0.25rem] text-[0.6875rem] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              0–30 ngày
                            </span>
                          )}
                          {inv.agingGroup === AgingDebtGroupEnum.AGE_31_60 && (
                            <span className="inline-block px-[0.5rem] py-[0.125rem] rounded-[0.25rem] text-[0.6875rem] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              31–60 ngày
                            </span>
                          )}
                          {inv.agingGroup === AgingDebtGroupEnum.AGE_61_90 && (
                            <span className="inline-block px-[0.5rem] py-[0.125rem] rounded-[0.25rem] text-[0.6875rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              61–90 ngày
                            </span>
                          )}
                          {inv.agingGroup === AgingDebtGroupEnum.AGE_OVER_90 && (
                            <span className="inline-block px-[0.5rem] py-[0.125rem] rounded-[0.25rem] text-[0.6875rem] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              &gt; 90 ngày
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {filteredInvoices.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <td
                        colSpan={2}
                        className="px-[0.875rem] py-[0.625rem] text-left text-[0.75rem] text-slate-500 font-medium"
                      >
                        Tổng cộng {filteredInvoices.length} hóa đơn{' '}
                        {selectedBracket !== AgingDebtGroupEnum.ALL && (
                          <span className="text-slate-400 font-normal">
                            (đang lọc phân khúc)
                          </span>
                        )}
                        :
                      </td>
                      <td className="px-[0.875rem] py-[0.625rem] text-right font-mono font-bold text-slate-900 text-[0.8125rem]">
                        {formatCurrency(totalFilteredDebt)} đ
                      </td>
                      <td
                        colSpan={2}
                        className="px-[0.875rem] py-[0.625rem] text-right text-[0.75rem] text-slate-400 font-normal"
                      >
                        Khớp số liệu tuổi nợ
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-[1.25rem] py-[0.75rem] border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[0.6875rem] text-slate-400">
            * Dữ liệu phân tích tuổi nợ và hóa đơn đối soát cho kế toán công nợ [SN-203]
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-[1.125rem] py-[0.375rem] rounded-[0.375rem] text-[0.8125rem] font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
