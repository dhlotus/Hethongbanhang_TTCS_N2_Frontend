import React from 'react';
import {
  Building2,
  X,
  Phone,
  Calendar,
} from 'lucide-react';
import type { AgentDebtReport } from '../../types/debt-report.type';

interface DebtDetailModalProps {
  agency: AgentDebtReport | null;
  onClose: () => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val || 0));
};

/**
 * Modal Sổ Chi Tiết Công Nợ
 * Hiển thị 4 thẻ KPI công nợ cốt lõi + Thông tin đại lý & số ngày nợ hiện tại.
 */
export const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
  agency,
  onClose,
}) => {
  if (!agency) {
    return null;
  }

  const debtDays = agency.oldestDebtDays ?? 0;
  const isOverdue = agency.isOverdue || debtDays > (agency.maxDebtDays || 30);

  const renderStatusBadge = () => {
    if (agency.remainingDebt === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
          Đã tất toán
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
          Quá hạn
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
        Trong hạn
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header: Chỉ hiển thị tên mục to [Sổ Chi Tiết Công Nợ] */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80 shadow-2xs">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg tracking-tight">
                Sổ Chi Tiết Công Nợ
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* 2. 4 Card Tổng Quan: Hạn mức công nợ, Tổng phải thu, Đã thanh toán, Dư nợ hiện tại */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Hạn Mức Công Nợ */}
            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200/70">
              <p className="text-[11px] text-indigo-700 uppercase font-bold tracking-wider">
                Hạn mức công nợ
              </p>
              <p className="font-mono font-bold text-lg text-indigo-900 mt-1">
                {formatCurrency(agency.creditLimit)}{' '}
                <span className="text-xs font-normal text-indigo-700/70">
                  đ
                </span>
              </p>
              <div className="mt-1 text-[11px] text-indigo-600 font-medium">
                Hạn nợ: {agency.maxDebtDays || 30} ngày
              </div>
            </div>

            {/* Tổng Phải Thu */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">
                Tổng phải thu
              </p>
              <p className="font-mono font-bold text-lg text-slate-800 mt-1">
                {formatCurrency(agency.totalReceivable)}{' '}
                <span className="text-xs font-normal text-slate-500">
                  đ
                </span>
              </p>
              <div className="mt-1 text-[11px] text-slate-500 font-medium">
                Doanh số lũy kế
              </div>
            </div>

            {/* Đã Thanh Toán */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
              <p className="text-[11px] text-emerald-700 uppercase font-bold tracking-wider">
                Đã thanh toán
              </p>
              <p className="font-mono font-bold text-lg text-emerald-700 mt-1">
                {formatCurrency(agency.totalPaid)}{' '}
                <span className="text-xs font-normal text-emerald-700/70">
                  đ
                </span>
              </p>
              <div className="mt-1 text-[11px] text-emerald-600 font-medium">
                Tiền đã thu về
              </div>
            </div>

            {/* Dư Nợ Hiện Tại */}
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70">
              <p className="text-[11px] text-amber-700 uppercase font-bold tracking-wider">
                Dư nợ hiện tại
              </p>
              <p className="font-mono font-bold text-lg text-amber-800 mt-1">
                {formatCurrency(agency.remainingDebt)}{' '}
                <span className="text-xs font-normal text-amber-700/70">
                  đ
                </span>
              </p>
              <div className="mt-1 text-[11px] text-amber-700 font-medium">
                {agency.creditLimit > 0
                  ? `Dùng: ${Math.round((agency.remainingDebt / agency.creditLimit) * 100)}% hạn mức`
                  : 'Chưa cấp hạn mức'}
              </div>
            </div>
          </div>

          {/* 3. Phần bên dưới: Hiển thị Mã đại lý, Tên đại lý, Số điện thoại và Đang nằm trong ngày nợ bao nhiêu */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 sm:p-5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Thông tin đại lý & Số ngày nợ hiện tại</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Mã đại lý */}
              <div className="sm:col-span-2 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">
                  Mã đại lý
                </span>
                <div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-md shadow-2xs whitespace-nowrap">
                    {agency.agencyCode}
                  </span>
                </div>
              </div>

              {/* Tên đại lý (Đủ độ rộng hiển thị trọn vẹn trên 1 dòng duy nhất) */}
              <div className="sm:col-span-5 space-y-1 min-w-0">
                <span className="text-xs text-slate-500 font-medium block">
                  Tên đại lý
                </span>
                <p
                  className="text-sm font-semibold text-slate-800 whitespace-nowrap truncate"
                  title={agency.agencyName}
                >
                  {agency.agencyName}
                </p>
              </div>

              {/* Số điện thoại */}
              <div className="sm:col-span-2 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">
                  Số điện thoại
                </span>
                <p className="text-sm font-semibold text-slate-700 font-mono flex items-center gap-1.5 whitespace-nowrap">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{agency.phone || 'Chưa cập nhật'}</span>
                </p>
              </div>

              {/* Đang nằm trong ngày nợ bao nhiêu */}
              <div className="sm:col-span-3 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">
                  Ngày nợ hiện tại
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-bold font-mono text-slate-900 flex items-center gap-1 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{debtDays} ngày</span>
                  </span>
                  {renderStatusBadge()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
