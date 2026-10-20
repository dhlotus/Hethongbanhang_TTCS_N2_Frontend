import React, { useState } from 'react';
import { Clock, BookOpen } from 'lucide-react';
import { DebtAgingReport } from '../../components/debt-report/debt-aging-report';
import { DebtLedgerStatementView } from '../../components/debt-report/debt-ledger-statement';

/**
 * Trang Quản Lý Công Nợ & Sổ Chi Tiết (SN-230 & SN-231)
 * Tích hợp 2 phân hệ chuyên nghiệp cho Kế toán công nợ:
 * 1. Báo cáo công nợ quá hạn theo tuổi nợ (SN-230)
 * 2. Sổ chi tiết công nợ đại lý (SN-231)
 */
export const DebtReportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'aging' | 'ledger'>('aging');
  const [selectedAgencyForLedger, setSelectedAgencyForLedger] = useState<string>('DL-0001');

  // Điều hướng từ Báo cáo tuổi nợ sang Sổ chi tiết công nợ của đại lý cụ thể
  const handleOpenLedgerForAgency = (agencyIdOrCode: string) => {
    setSelectedAgencyForLedger(agencyIdOrCode);
    setActiveTab('ledger');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-full mx-auto px-1 sm:px-2 py-3 space-y-3.5">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* THANH TAB ĐIỀU HƯỚNG 2 CHỨC NĂNG CÔNG NỢ */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('aging')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-sm sm:text-[15px] font-bold transition-all duration-200 ${
            activeTab === 'aging'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Báo Cáo Tuổi Nợ (SN-230)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-sm sm:text-[15px] font-bold transition-all duration-200 ${
            activeTab === 'ledger'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Sổ Chi Tiết Công Nợ Đại Lý (SN-231)</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* NỘI DUNG TỪNG PHÂN HỆ */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'aging' ? (
        <DebtAgingReport onOpenLedger={handleOpenLedgerForAgency} />
      ) : (
        <DebtLedgerStatementView
          initialAgencyCode={selectedAgencyForLedger}
          onBackToAgingReport={() => setActiveTab('aging')}
        />
      )}
    </div>
  );
};
