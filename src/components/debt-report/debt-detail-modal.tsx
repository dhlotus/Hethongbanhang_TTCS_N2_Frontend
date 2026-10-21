import React, { useEffect } from 'react';
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
 * Hiển thị 4 thẻ KPI công nợ cốt lõi + Khối Thông tin đại lý dạng danh sách dòng tối ưu.
 */
export const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
  agency,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
        {/* 1. Header: Tiêu đề Sổ Chi Tiết Công Nợ + Nút đóng X */}
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

          {/* 3. Phần Thông tin: Tối ưu mỗi mục (Mã, Tên, Số điện thoại, Ngày nợ) thành một dòng rõ ràng */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 sm:p-5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>THÔNG TIN</span>
            </h4>

            <div className="divide-y divide-slate-200/70 text-sm">
              {/* Dòng 1: Mã đại lý */}
              <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-2 first:pt-0">
                <span className="sm:col-span-3 text-xs text-slate-500 font-medium">
                  Mã đại lý
                </span>
                <div className="sm:col-span-9">
                  <span className="inline-flex items-center font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-md shadow-2xs">
                    {agency.agencyCode}
                  </span>
                </div>
              </div>

              {/* Dòng 2: Tên đại lý */}
              <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <span className="sm:col-span-3 text-xs text-slate-500 font-medium">
                  Tên đại lý
                </span>
                <p className="sm:col-span-9 font-semibold text-slate-800">
                  {agency.agencyName}
                </p>
              </div>

              {/* Dòng 3: Số điện thoại */}
              <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <span className="sm:col-span-3 text-xs text-slate-500 font-medium">
                  Số điện thoại
                </span>
                <p className="sm:col-span-9 font-semibold text-slate-700 font-mono flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{agency.phone || 'Chưa cập nhật'}</span>
                </p>
              </div>

              {/* Dòng 4: Ngày nợ hiện tại */}
              <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-2 last:pb-0">
                <span className="sm:col-span-3 text-xs text-slate-500 font-medium">
                  Ngày nợ hiện tại
                </span>
                <div className="sm:col-span-9 flex items-center gap-2">
                  <span className="font-bold font-mono text-slate-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{debtDays} ngày</span>
                  </span>
                  {renderStatusBadge()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
